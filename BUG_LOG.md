# Bug Log

| # | Bug | Where | Cause | Fix | Status |
|---|-----|-------|-------|-----|--------|
| 1 | Vote button showed "Vote (0)" instead of plain "Vote" when no votes cast | `ActivityCard.tsx` | Template string evaluated `voteCount ? ...` — 0 is falsy | Changed condition to `voteCount !== undefined && voteCount > 0` | Fixed |
| 2 | Dark mode not applied on first render if OS preference is dark | `App.tsx` | `useEffect` runs after render, so `document.documentElement` class was missing on first paint | Added initial class application via useState initializer reading `window.matchMedia` | Fixed |
| 3 | Typing in constraint fields on GroupMode setup step also matched the textarea on entry step (test confusion) | `GroupMode.tsx` | Multiple `<input>` elements exist on setup step vs single `<textarea>` on entry | Tests correctly target `getByRole('textbox')` for the textarea and field-specific queries for inputs | Non-issue (test structure) |
| 4 | `rankActivities` returned fewer than 3 results if activity pool was smaller than 3 | `mockPlanner.ts` | `slice(0, 3)` on a pool smaller than 3 | Activity database has 20 entries so always returns 3; noted as edge case to handle in Phase 2 | Known / low risk |

---

## Known Issues / Future Fixes

- **Group codes are local-only.** Codes like `VP-4821` exist only in the current browser session. Real persistence requires Phase 2 (Supabase/Firebase).
- **No multi-user voting simulation.** In the demo, only one "user" votes per session. Multi-user voting requires a real backend.
- **Improved plan uses placeholder nearby options.** The three nearby options (`Local park or green space`, etc.) are generic placeholders. Real nearby places require Phase 4 (Google Maps/Places API).
- **Weather warnings are static.** Warning badges are based on activity type, not real weather. Phase 5 will add live weather API checks.
- **Budget keyword parsing is limited.** The mock parser catches `$15` and keywords like `cheap` but may miss unusual phrasing. Phase 3 OpenAI integration will replace this entirely.
- **No back-navigation within modes.** Clicking "VibePlan" in the header resets to homepage, but there's no "back" button within Group Mode steps. Consider adding step breadcrumbs in Phase 2.
