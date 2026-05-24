"""Python port of src/lib/mockPlanner.ts — same scoring logic, same output shape."""
import re
from .activities import ACTIVITIES
from .logger import get_logger

log = get_logger("vibeplan.planner")

BUDGET_KW: dict[str, int] = {
    "free": 0, "cheap": 10, "low": 10, "broke": 5,
    "$5": 5, "$10": 10, "$15": 15, "$20": 20, "$25": 25, "$30": 30, "$50": 50,
}
VIBE_KW: dict[str, str] = {
    "chill": "chill", "relax": "chill", "lowkey": "chill", "calm": "chill", "easy": "chill",
    "random": "random-adventure", "adventure": "random-adventure", "spontaneous": "random-adventure",
    "active": "active", "sporty": "active", "energetic": "active",
    "creative": "creative", "artsy": "creative",
    "social": "social", "hangout": "social",
}
DIST_KW: dict[str, int] = {
    "walking": 5, "nearby": 10, "close": 10,
    "10 min": 10, "15 min": 15, "20 min": 20, "25 min": 25, "30 min": 30,
}
DIST_ORDER: dict[str, int] = {
    "walking": 5, "nearby": 10, "short-drive": 25, "road-trip": 60,
}


def parse_prompt(raw: str) -> dict:
    log.debug("parse_prompt | input=%r", raw)
    lower = raw.lower()
    budget: int | None = None
    distance_minutes: int | None = None
    vibes: list[str] = []

    dollar_matches = re.findall(r"\$(\d+)", lower)
    if dollar_matches:
        budget = max(int(v) for v in dollar_matches)
        log.debug("parse_prompt | budget extracted from $ sign: %d", budget)

    if budget is None:
        for kw, val in BUDGET_KW.items():
            if kw in lower:
                budget = val
                log.debug("parse_prompt | budget extracted from keyword %r: %d", kw, val)
                break

    min_match = re.search(r"(\d+)\s*min", lower)
    if min_match:
        distance_minutes = int(min_match.group(1))
        log.debug("parse_prompt | distance_minutes from 'X min': %d", distance_minutes)

    if distance_minutes is None:
        for kw, val in DIST_KW.items():
            if kw in lower:
                distance_minutes = val
                log.debug("parse_prompt | distance_minutes from keyword %r: %d", kw, val)
                break

    for kw, vibe in VIBE_KW.items():
        if kw in lower and vibe not in vibes:
            vibes.append(vibe)

    group_match = re.search(r"(\d+)\s*people", lower)
    group_size = int(group_match.group(1)) if group_match else None

    result = {
        "budget": budget,
        "distanceMinutes": distance_minutes,
        "vibes": vibes,
        "groupSize": group_size,
        "rawText": raw,
    }
    log.info("parse_prompt | result: budget=%s dist=%s vibes=%s groupSize=%s",
             budget, distance_minutes, vibes, group_size)
    return result


def _budget_score(activity: dict, budget: int | None) -> int:
    if budget is None:
        return 10
    if activity["estimatedCostMax"] <= budget:
        return 20
    if activity["estimatedCostMin"] <= budget:
        return 5
    return -20


def _distance_score(activity: dict, max_minutes: int | None) -> int:
    am = DIST_ORDER.get(activity["distanceType"], 30)
    if max_minutes is None:
        return 10
    if am <= max_minutes:
        return 15
    if am <= max_minutes * 1.3:
        return 5
    return -15


def _vibe_score(activity: dict, vibes: list[str]) -> int:
    if not vibes:
        return 10
    return sum(15 for v in vibes if v in activity["vibes"])


def _warning_penalty(activity: dict) -> int:
    return len(activity["warnings"]) * -3


def rank_activities(prompt: dict, pool: list[dict] | None = None) -> list[dict]:
    if pool is None:
        pool = ACTIVITIES

    budget = prompt.get("budget")
    distance = prompt.get("distanceMinutes")
    vibes: list[str] = prompt.get("vibes", [])

    log.debug("rank_activities | pool_size=%d budget=%s distance=%s vibes=%s",
              len(pool), budget, distance, vibes)

    scored = []
    for a in pool:
        b = _budget_score(a, budget)
        d = _distance_score(a, distance)
        v = _vibe_score(a, vibes)
        w = _warning_penalty(a)
        score = 50 + b + d + v + w
        log.debug("rank_activities | %-35s score=%3d (budget=%+d dist=%+d vibe=%+d warn=%+d)",
                  a["id"], score, b, d, v, w)

        reasons: list[str] = []
        if budget is not None and a["estimatedCostMax"] <= budget:
            reasons.append(f"fits your ${budget} budget")
        if distance is not None and DIST_ORDER.get(a["distanceType"], 30) <= distance:
            reasons.append("within your drive limit")
        matched_vibes = [v for v in vibes if v in a["vibes"]]
        if matched_vibes:
            reasons.append(f"matches {', '.join(matched_vibes)} vibe")
        if a["effortLevel"] == "low":
            reasons.append("easy to coordinate")
        if not reasons:
            reasons.append("solid all-around option")

        scored.append({
            "activity": a,
            "score": score,
            "rankingReason": f"Ranked because it {', '.join(reasons)}.",
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    top3 = scored[:3]
    log.info("rank_activities | top3: %s (scores: %s)",
             [r["activity"]["id"] for r in top3],
             [r["score"] for r in top3])
    return top3


def rank_with_constraints(raw_prompt: str, constraints: list[dict]) -> list[dict]:
    log.info("rank_with_constraints | prompt=%r constraints=%d", raw_prompt, len(constraints))
    base = parse_prompt(raw_prompt)

    budgets = [c["maxBudget"] for c in constraints if c.get("maxBudget") is not None]
    distances = [c["maxDistanceMinutes"] for c in constraints if c.get("maxDistanceMinutes") is not None]

    if budgets:
        base_budget = base.get("budget")
        merged_budget = min(*budgets, base_budget) if base_budget is not None else min(budgets)
        log.debug("rank_with_constraints | budget merged: group_min=%d prompt=%s → %d",
                  min(budgets), base_budget, merged_budget)
        base["budget"] = merged_budget

    if distances:
        base_dist = base.get("distanceMinutes")
        merged_dist = min(*distances, base_dist) if base_dist is not None else min(distances)
        log.debug("rank_with_constraints | distance merged: group_min=%d prompt=%s → %d",
                  min(distances), base_dist, merged_dist)
        base["distanceMinutes"] = merged_dist

    return rank_activities(base)


def generate_improved_plan(ranked: dict, constraints: list[dict]) -> dict:
    activity = ranked["activity"]
    log.info("generate_improved_plan | activity=%s constraints=%d",
             activity["id"], len(constraints))

    min_budgets = [c["maxBudget"] for c in constraints if c.get("maxBudget") is not None]
    if min_budgets:
        budget_note = f"under ${min(min_budgets)} per person"
    else:
        budget_note = f"around ${activity['estimatedCostMax']} per person"

    drive_limit = "15 minutes" if activity["distanceType"] == "nearby" else "25 minutes"
    polished = (
        f"Meet up and head out for {activity['title'].lower()}. "
        f"Keep costs {budget_note} and stay within {drive_limit} of your starting point. "
        f"Plan for {activity['timeNeeded']} \u2014 {activity['summary'].lower()}"
    )

    backup = (
        "If weather turns bad, switch to a coffee shop, board game night, or car playlist drive instead."
        if activity["indoorOutdoor"] == "outdoor"
        else "If the main spot is full or closed, pick the next closest option on the list."
    )

    plan = {
        "activityTitle": activity["title"],
        "polishedPlan": polished,
        "nearbyOptions": [
            "Local park or green space",
            "Nearby shopping center or strip",
            "Scenic outdoor spot or overlook",
        ],
        "backupPlan": backup,
    }
    log.debug("generate_improved_plan | polishedPlan=%r", polished[:80])
    return plan
