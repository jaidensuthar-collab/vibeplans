# Test Report

**Date:** May 22, 2026
**Version:** 0.1.0 (Phase 1 MVP Demo)
**Test Runner:** Vitest + React Testing Library

---

## Automated Test Results

### mockPlanner.test.ts — 8 tests

| Test | Result |
|------|--------|
| parsePrompt: extracts budget from dollar amount | PASS |
| parsePrompt: extracts distance from minutes | PASS |
| parsePrompt: extracts chill vibe | PASS |
| parsePrompt: returns empty vibes if none found | PASS |
| rankActivities: returns exactly 3 results | PASS |
| rankActivities: prefers free/cheap activities when budget is $5 | PASS |
| rankActivities: top result has a rankingReason string | PASS |
| rankActivities: promotes chill-tagged activities when vibe is chill | PASS |

### groupUtils.test.ts — 7 tests

| Test | Result |
|------|--------|
| generateGroupCode: matches VP-XXXX format | PASS |
| createGroup: creates group with a code and empty votes | PASS |
| addVote: adds a vote | PASS |
| addVote: replaces existing vote from same member | PASS |
| getVoteCounts: counts votes per activity | PASS |
| getWinningActivityId: returns activity with most votes | PASS |
| getWinningActivityId: returns undefined when no votes | PASS |

### ActivityCard.test.tsx — 6 tests

| Test | Result |
|------|--------|
| renders activity title | PASS |
| renders rank number | PASS |
| renders ranking reason | PASS |
| calls onVote when Vote button clicked | PASS |
| shows voted state with count | PASS |
| does not render vote button when onVote not provided | PASS |

### ChatMode.test.tsx — 5 tests

| Test | Result |
|------|--------|
| shows error when submitted with empty input | PASS |
| shows error when input is too short | PASS |
| shows top 3 results after valid input | PASS |
| populates textarea when suggestion chip is clicked | PASS |
| clears error after valid submission | PASS |

### GroupMode.test.tsx — 5 tests

| Test | Result |
|------|--------|
| shows error when create group clicked without prompt | PASS |
| shows group code after creating group | PASS |
| shows voting panel after proceeding past setup | PASS |
| shows improve button after voting | PASS |
| shows improved plan card after improve button clicked | PASS |

---

## Total: 31 tests — 31 PASS, 0 FAIL

---

## Manual Test Checklist

### Homepage

| Check | Result |
|-------|--------|
| App name "VibePlan" displays prominently | PASS |
| Tagline "Find the vibe. Make the plan." visible | PASS |
| Chat Mode card renders and is clickable | PASS |
| Group Mode card renders and is clickable | PASS |
| Dark mode toggle visible in header | PASS |

### Chat Mode

| Check | Result |
|-------|--------|
| Textarea accepts input | PASS |
| Empty submit shows friendly error | PASS |
| Short submit (< 5 chars) shows error | PASS |
| Suggestion chips populate textarea on click | PASS |
| Valid prompt shows 3 ranked activity cards | PASS |
| Each card shows title, cost, time, distance | PASS |
| Warning badges render with correct colors | PASS |
| Ranking reason text shows on each card | PASS |

### Group Mode

| Check | Result |
|-------|--------|
| Empty submit shows error | PASS |
| Valid prompt generates VP-XXXX code | PASS |
| Constraint fields are optional and skip-able | PASS |
| "See Top Ideas & Vote" shows 3 activity cards with vote buttons | PASS |
| Clicking vote highlights the voted card | PASS |
| Vote count increments on the voted card | PASS |
| Winner card shows 👑 Winner label | PASS |
| "Improve Winning Plan" button appears after voting | PASS |
| ImprovedPlanCard shows polished plan, nearby options, backup plan | PASS |
| "Start Over" resets to entry step | PASS |

### Dark Mode

| Check | Result |
|-------|--------|
| Toggle switches between light and dark | PASS |
| Homepage dark mode looks correct | PASS |
| Chat Mode dark mode looks correct | PASS |
| Group Mode dark mode looks correct | PASS |
| Activity cards dark mode — backgrounds, text, borders | PASS |
| Warning badges dark mode colors correct | PASS |
| Input fields dark mode readable | PASS |

### Mobile Layout (375px)

| Check | Result |
|-------|--------|
| Homepage fits single column, no overflow | PASS |
| Chat Mode textarea full width | PASS |
| Suggestion chips wrap correctly | PASS |
| Activity cards full width, readable | PASS |
| Group Mode inputs full width | PASS |
| Buttons have enough touch target height (py-3) | PASS |
| Header doesn't overflow | PASS |

---

## Known Failing Scenarios

- Typing `free` without a dollar sign sometimes doesn't rank free activities first if another keyword overrides budget. Low priority — Phase 3 OpenAI fix.
- Very long activity titles could overflow card on narrow screens. No activities currently have long titles.

---

## Notes

- All tests were run with `npm run test` in the `vibeplan/` directory after running `npm install`.
- Mock AI test results are deterministic because the activity pool is fixed and sorting is stable.
- Group voting tests simulate a single user only (multi-user requires Phase 2 backend).
