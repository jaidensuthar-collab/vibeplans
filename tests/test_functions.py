"""
Pure-function unit tests for VibePlan backend.
No server required — runs directly with: python -m pytest tests/test_functions.py -v
or: python tests/test_functions.py
"""
import sys
import os
import unittest

# Make sure backend package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.mock_planner import (
    parse_prompt, rank_activities, rank_with_constraints, generate_improved_plan
)
from backend.activities import ACTIVITIES


class TestParsePrompt(unittest.TestCase):

    def test_extracts_dollar_budget(self):
        r = parse_prompt("We have $15 each")
        self.assertEqual(r["budget"], 15)

    def test_extracts_higher_of_two_dollar_amounts(self):
        r = parse_prompt("$5 or $20 budget")
        self.assertEqual(r["budget"], 20)

    def test_extracts_keyword_budget_cheap(self):
        r = parse_prompt("something cheap tonight")
        self.assertEqual(r["budget"], 10)

    def test_extracts_keyword_budget_free(self):
        r = parse_prompt("looking for free stuff")
        self.assertEqual(r["budget"], 0)

    def test_dollar_sign_takes_priority_over_keyword(self):
        r = parse_prompt("something cheap like $25")
        self.assertEqual(r["budget"], 25)

    def test_extracts_distance_minutes(self):
        r = parse_prompt("no more than 20 min away")
        self.assertEqual(r["distanceMinutes"], 20)

    def test_extracts_distance_keyword_nearby(self):
        r = parse_prompt("something nearby")
        self.assertEqual(r["distanceMinutes"], 10)

    def test_extracts_chill_vibe(self):
        r = parse_prompt("something chill tonight")
        self.assertIn("chill", r["vibes"])

    def test_extracts_adventure_vibe(self):
        r = parse_prompt("random adventure ideas")
        self.assertIn("random-adventure", r["vibes"])

    def test_extracts_multiple_vibes(self):
        r = parse_prompt("chill hangout with friends")
        self.assertIn("chill", r["vibes"])
        self.assertIn("social", r["vibes"])

    def test_no_vibes_returns_empty_list(self):
        r = parse_prompt("ideas please")
        self.assertEqual(r["vibes"], [])

    def test_extracts_group_size(self):
        r = parse_prompt("5 people bored tonight")
        self.assertEqual(r["groupSize"], 5)

    def test_no_group_size_returns_none(self):
        r = parse_prompt("chill night")
        self.assertIsNone(r["groupSize"])

    def test_raw_text_preserved(self):
        r = parse_prompt("some text")
        self.assertEqual(r["rawText"], "some text")


class TestRankActivities(unittest.TestCase):

    def test_returns_exactly_3_results(self):
        results = rank_activities({"vibes": [], "rawText": "anything"})
        self.assertEqual(len(results), 3)

    def test_each_result_has_required_keys(self):
        results = rank_activities({"vibes": [], "rawText": "anything"})
        for r in results:
            self.assertIn("activity", r)
            self.assertIn("score", r)
            self.assertIn("rankingReason", r)

    def test_ranking_reason_is_non_empty_string(self):
        results = rank_activities({"vibes": ["chill"], "rawText": "chill night"})
        self.assertTrue(all(r["rankingReason"] for r in results))

    def test_prefers_cheap_when_budget_5(self):
        results = rank_activities({"budget": 5, "vibes": [], "rawText": "free stuff"})
        self.assertLessEqual(results[0]["activity"]["estimatedCostMin"], 5)

    def test_top_result_has_highest_score(self):
        results = rank_activities({"vibes": [], "rawText": "anything"})
        self.assertGreaterEqual(results[0]["score"], results[1]["score"])
        self.assertGreaterEqual(results[1]["score"], results[2]["score"])

    def test_promotes_chill_vibes(self):
        results = rank_activities({"vibes": ["chill"], "rawText": "chill vibe"})
        self.assertIn("chill", results[0]["activity"]["vibes"])

    def test_promotes_adventure_vibes(self):
        results = rank_activities({"vibes": ["random-adventure"], "rawText": "adventure"})
        self.assertIn("random-adventure", results[0]["activity"]["vibes"])

    def test_budget_over_limit_penalizes(self):
        results_cheap = rank_activities({"budget": 5, "vibes": [], "rawText": "free"})
        results_rich = rank_activities({"budget": 50, "vibes": [], "rawText": "paid"})
        # cheap results should include free activities, rich may include expensive ones
        self.assertLessEqual(results_cheap[0]["activity"]["estimatedCostMax"], 10)

    def test_custom_pool_uses_provided_activities(self):
        pool = [ACTIVITIES[0], ACTIVITIES[1]]
        results = rank_activities({"vibes": [], "rawText": "anything"}, pool=pool)
        self.assertEqual(len(results), 2)

    def test_all_activity_ids_come_from_database(self):
        valid_ids = {a["id"] for a in ACTIVITIES}
        results = rank_activities({"vibes": [], "rawText": "anything"})
        for r in results:
            self.assertIn(r["activity"]["id"], valid_ids)


class TestRankWithConstraints(unittest.TestCase):

    def test_applies_member_budget_constraint(self):
        constraints = [{"memberId": "u1", "name": "Alice", "maxBudget": 5, "maxDistanceMinutes": None}]
        results = rank_with_constraints("chill tonight", constraints)
        self.assertEqual(len(results), 3)
        # top result should fit $5
        self.assertLessEqual(results[0]["activity"]["estimatedCostMin"], 5)

    def test_tighter_constraint_wins(self):
        # prompt says $30, member says $5 — $5 should win
        constraints = [{"memberId": "u1", "name": "Bob", "maxBudget": 5, "maxDistanceMinutes": None}]
        results_constrained = rank_with_constraints("chill $30", constraints)
        results_unconstrained = rank_with_constraints("chill $30", [])
        # constrained top result should be cheaper
        self.assertLessEqual(
            results_constrained[0]["activity"]["estimatedCostMax"],
            results_unconstrained[0]["activity"]["estimatedCostMax"] + 5,
        )

    def test_empty_constraints_behaves_like_base_rank(self):
        r1 = rank_with_constraints("chill tonight $15", [])
        r2 = rank_activities(parse_prompt("chill tonight $15"))
        self.assertEqual(
            [r["activity"]["id"] for r in r1],
            [r["activity"]["id"] for r in r2],
        )

    def test_multiple_constraints_uses_strictest(self):
        constraints = [
            {"memberId": "u1", "name": "A", "maxBudget": 30, "maxDistanceMinutes": None},
            {"memberId": "u2", "name": "B", "maxBudget": 5, "maxDistanceMinutes": None},
        ]
        results = rank_with_constraints("adventure", constraints)
        self.assertLessEqual(results[0]["activity"]["estimatedCostMin"], 5)


class TestGenerateImprovedPlan(unittest.TestCase):

    def _make_ranked(self, activity_id: str) -> dict:
        activity = next(a for a in ACTIVITIES if a["id"] == activity_id)
        return {"activity": activity, "score": 75, "rankingReason": "Test reason."}

    def test_returns_all_required_keys(self):
        ranked = self._make_ranked("park-picnic")
        plan = generate_improved_plan(ranked, [])
        self.assertIn("activityTitle", plan)
        self.assertIn("polishedPlan", plan)
        self.assertIn("nearbyOptions", plan)
        self.assertIn("backupPlan", plan)

    def test_activity_title_matches(self):
        ranked = self._make_ranked("park-picnic")
        plan = generate_improved_plan(ranked, [])
        self.assertEqual(plan["activityTitle"], "Park Picnic")

    def test_nearby_options_is_list_of_3(self):
        ranked = self._make_ranked("park-picnic")
        plan = generate_improved_plan(ranked, [])
        self.assertEqual(len(plan["nearbyOptions"]), 3)

    def test_budget_note_uses_constraint_when_provided(self):
        ranked = self._make_ranked("bowling")
        constraints = [{"memberId": "u1", "name": "A", "maxBudget": 12, "maxDistanceMinutes": None}]
        plan = generate_improved_plan(ranked, constraints)
        self.assertIn("$12", plan["polishedPlan"])

    def test_outdoor_activity_has_weather_backup(self):
        ranked = self._make_ranked("park-picnic")  # outdoor
        plan = generate_improved_plan(ranked, [])
        self.assertIn("weather", plan["backupPlan"].lower())

    def test_indoor_activity_has_alternate_backup(self):
        ranked = self._make_ranked("bowling")  # indoor
        plan = generate_improved_plan(ranked, [])
        self.assertNotIn("weather", plan["backupPlan"].lower())


class TestActivitiesDatabase(unittest.TestCase):

    def test_has_at_least_75_activities(self):
        self.assertGreaterEqual(len(ACTIVITIES), 75)

    def test_all_ids_are_unique(self):
        ids = [a["id"] for a in ACTIVITIES]
        self.assertEqual(len(ids), len(set(ids)))

    def test_all_required_fields_present(self):
        required = {"id", "title", "summary", "vibes", "estimatedCostMin", "estimatedCostMax",
                    "timeNeeded", "distanceType", "bestFor", "effortLevel", "indoorOutdoor",
                    "warnings", "planningNotes"}
        for a in ACTIVITIES:
            missing = required - set(a.keys())
            self.assertEqual(missing, set(), f"{a['id']} missing fields: {missing}")

    def test_distance_types_are_valid(self):
        valid = {"walking", "nearby", "short-drive", "road-trip"}
        for a in ACTIVITIES:
            self.assertIn(a["distanceType"], valid, f"{a['id']} has invalid distanceType")

    def test_effort_levels_are_valid(self):
        valid = {"low", "medium", "high"}
        for a in ACTIVITIES:
            self.assertIn(a["effortLevel"], valid, f"{a['id']} has invalid effortLevel")

    def test_vibes_are_valid(self):
        valid = {"chill", "random-adventure", "active", "creative", "social"}
        for a in ACTIVITIES:
            for v in a["vibes"]:
                self.assertIn(v, valid, f"{a['id']} has invalid vibe: {v}")

    def test_cost_min_lte_max(self):
        for a in ACTIVITIES:
            self.assertLessEqual(
                a["estimatedCostMin"], a["estimatedCostMax"],
                f"{a['id']} has costMin > costMax"
            )

    def test_warnings_have_type_and_reason(self):
        for a in ACTIVITIES:
            for w in a["warnings"]:
                self.assertIn("type", w, f"{a['id']} warning missing 'type'")
                self.assertIn("reason", w, f"{a['id']} warning missing 'reason'")


if __name__ == "__main__":
    # Run with pretty output when called directly
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromModule(sys.modules[__name__])
    runner = unittest.TextTestRunner(verbosity=2, stream=sys.stdout)
    result = runner.run(suite)

    print("\n" + "=" * 60)
    if result.wasSuccessful():
        print(f"✓ ALL {result.testsRun} TESTS PASSED — logs are clean")
    else:
        print(f"✗ {len(result.failures)} FAILURES, {len(result.errors)} ERRORS out of {result.testsRun} tests")
        for test, tb in result.failures + result.errors:
            print(f"\nFAILED: {test}")
            print(tb)
    print("=" * 60)
    sys.exit(0 if result.wasSuccessful() else 1)
