#!/usr/bin/env python3
"""
Injects NEW_ACTIVITIES into:
  1. backend/activities.py       — Python list
  2. src/data/activities.ts      — TypeScript array
  3. docs/index.html             — inline JavaScript in standalone HTML
"""
import sys, os, re

sys.path.insert(0, os.path.dirname(__file__))
from generate_activities import NEW_ACTIVITIES

REPO = os.path.join(os.path.dirname(__file__), "..")

# ── helpers ───────────────────────────────────────────────────────────────────

def js_str(s):
    """Escape a Python string for use inside a single-quoted JS string."""
    return s.replace("\\", "\\\\").replace("'", "\\'")

def py_list_repr(lst):
    return "[" + ", ".join(repr(x) for x in lst) + "]"

def activity_to_js_block(a):
    aid = js_str(a["id"])
    atitle = js_str(a["title"])
    asummary = js_str(a["summary"])
    atimeNeeded = js_str(a["timeNeeded"])
    adistType = a["distanceType"]
    abestFor = js_str(a["bestFor"])
    aeffort = a["effortLevel"]
    aindoor = a["indoorOutdoor"]
    aplanNotes = js_str(a["planningNotes"])
    acostMin = a["estimatedCostMin"]
    acostMax = a["estimatedCostMax"]

    lines = ["  {"]
    lines.append(f"    id: '{aid}', title: '{atitle}',")
    lines.append(f"    summary: '{asummary}',")
    vibes = "[" + ", ".join(f"'{v}'" for v in a["vibes"]) + "]"
    lines.append(f"    vibes: {vibes}, estimatedCostMin: {acostMin}, estimatedCostMax: {acostMax},")
    lines.append(f"    timeNeeded: '{atimeNeeded}', distanceType: '{adistType}',")
    lines.append(f"    bestFor: '{abestFor}', effortLevel: '{aeffort}', indoorOutdoor: '{aindoor}',")
    if not a["warnings"]:
        lines.append("    warnings: [],")
    else:
        warn_parts = []
        for w in a["warnings"]:
            wtype = w["type"]
            wreason = js_str(w["reason"])
            warn_parts.append(f"{{ type: '{wtype}', reason: '{wreason}' }}")
        lines.append("    warnings: [")
        for wp in warn_parts:
            lines.append(f"      {wp},")
        lines.append("    ],")
    lines.append(f"    planningNotes: '{aplanNotes}',")
    lines.append("  },")
    return "\n".join(lines)

def activity_to_py_block(a):
    def pystr(s):
        return repr(s)
    lines = ["    {"]
    lines.append(f"        \"id\": {pystr(a['id'])}, \"title\": {pystr(a['title'])},")
    lines.append(f"        \"summary\": {pystr(a['summary'])},")
    lines.append(f"        \"vibes\": {a['vibes']}, \"estimatedCostMin\": {a['estimatedCostMin']}, \"estimatedCostMax\": {a['estimatedCostMax']},")
    lines.append(f"        \"timeNeeded\": {pystr(a['timeNeeded'])}, \"distanceType\": {pystr(a['distanceType'])},")
    lines.append(f"        \"bestFor\": {pystr(a['bestFor'])}, \"effortLevel\": {pystr(a['effortLevel'])}, \"indoorOutdoor\": {pystr(a['indoorOutdoor'])},")
    if not a["warnings"]:
        lines.append('        "warnings": [],')
    else:
        lines.append('        "warnings": [')
        for w in a["warnings"]:
            lines.append(f"            {{\"type\": {pystr(w['type'])}, \"reason\": {pystr(w['reason'])}}},")
        lines.append("        ],")
    lines.append(f"        \"planningNotes\": {pystr(a['planningNotes'])},")
    lines.append("    },")
    return "\n".join(lines)

# ── 1. backend/activities.py ──────────────────────────────────────────────────

py_path = os.path.join(REPO, "backend", "activities.py")
with open(py_path, "r") as f:
    py_content = f.read()

# Check which IDs already exist
existing_ids = set(re.findall(r'"id":\s*"([^"]+)"', py_content))
to_add = [a for a in NEW_ACTIVITIES if a["id"] not in existing_ids]
print(f"backend/activities.py: {len(existing_ids)} existing, adding {len(to_add)} new")

if to_add:
    new_blocks = "\n".join(activity_to_py_block(a) for a in to_add)
    # Insert before the closing bracket of ACTIVITIES list
    py_content = py_content.rstrip()
    if py_content.endswith("]"):
        py_content = py_content[:-1].rstrip()
        if py_content.endswith(","):
            py_content = py_content + "\n"
        else:
            py_content = py_content + ",\n"
        py_content = py_content + new_blocks + "\n]\n"
    with open(py_path, "w") as f:
        f.write(py_content)
    print(f"  ✓ backend/activities.py updated")

# ── 2. src/data/activities.ts ─────────────────────────────────────────────────

ts_path = os.path.join(REPO, "src", "data", "activities.ts")
with open(ts_path, "r") as f:
    ts_content = f.read()

existing_ts_ids = set(re.findall(r"id: '([^']+)'", ts_content))
to_add_ts = [a for a in NEW_ACTIVITIES if a["id"] not in existing_ts_ids]
print(f"src/data/activities.ts: {len(existing_ts_ids)} existing, adding {len(to_add_ts)} new")

if to_add_ts:
    new_blocks = "\n".join(activity_to_js_block(a) for a in to_add_ts)
    # Find closing ]; of the array
    last_bracket = ts_content.rfind("];")
    if last_bracket != -1:
        ts_content = ts_content[:last_bracket] + new_blocks + "\n];\n"
    with open(ts_path, "w") as f:
        f.write(ts_content)
    print(f"  ✓ src/data/activities.ts updated")

# ── 3. docs/index.html ────────────────────────────────────────────────────────

html_path = os.path.join(REPO, "docs", "index.html")
with open(html_path, "r") as f:
    html_content = f.read()

# Find activities array in the script — look for the closing ];
# The JS array ends with "];" on its own line
existing_html_ids = set(re.findall(r"id: '([^']+)'", html_content))
to_add_html = [a for a in NEW_ACTIVITIES if a["id"] not in existing_html_ids]
print(f"docs/index.html: {len(existing_html_ids)} existing, adding {len(to_add_html)} new")

if to_add_html:
    new_blocks = "\n".join(activity_to_js_block(a) for a in to_add_html)
    # Find the activities array closing ]; — it comes before the // ── Mock Planner ── comment
    marker = "  // ── Mock Planner ──"
    if marker in html_content:
        idx = html_content.index(marker)
        # Find the ]; just before this marker
        before = html_content[:idx]
        last_semi = before.rfind("];")
        if last_semi != -1:
            html_content = html_content[:last_semi] + new_blocks + "\n];\n\n" + html_content[idx:]
    with open(html_path, "w") as f:
        f.write(html_content)
    print(f"  ✓ docs/index.html updated")

# ── also update vibeplan-standalone.html ─────────────────────────────────────

standalone_path = os.path.join(REPO, "vibeplan-standalone.html")
with open(standalone_path, "r") as f:
    standalone_content = f.read()

existing_standalone_ids = set(re.findall(r"id: '([^']+)'", standalone_content))
to_add_standalone = [a for a in NEW_ACTIVITIES if a["id"] not in existing_standalone_ids]
print(f"vibeplan-standalone.html: {len(existing_standalone_ids)} existing, adding {len(to_add_standalone)} new")

if to_add_standalone:
    new_blocks = "\n".join(activity_to_js_block(a) for a in to_add_standalone)
    marker = "  // ── Mock Planner ──"
    if marker in standalone_content:
        idx = standalone_content.index(marker)
        before = standalone_content[:idx]
        last_semi = before.rfind("];")
        if last_semi != -1:
            standalone_content = standalone_content[:last_semi] + new_blocks + "\n];\n\n" + standalone_content[idx:]
    with open(standalone_path, "w") as f:
        f.write(standalone_content)
    print(f"  ✓ vibeplan-standalone.html updated")

print("\nDone. Run: python3 tests/test_functions.py to verify.")
