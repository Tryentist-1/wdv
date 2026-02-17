# Team Scorecard UX and Complete Flow (Feb 2026)

**Date:** 2026-02-16  
**Scope:** `team_card.html`, `js/team_card.js`, `api/index.php`, CSS

## Summary

- **Mobile layout:** Stacked 8-column team scorecard (no horizontal scroll).
- **Header:** Event/Bracket/Bale + match score in left/right corners.
- **Score colors:** A3/A4 use standard score colors (archer-pair-alt only when cell empty).
- **Match Over:** Modal when winner is determined; scoring locked; Complete button enabled.
- **Complete:** API completion check uses `team_match_sets` (see [TEAM_MATCH_COMPLETE_API_SETS_SOURCE_OF_TRUTH.md](../bugs/TEAM_MATCH_COMPLETE_API_SETS_SOURCE_OF_TRUTH.md)).

## Header

- **Left:** T1 match score (live).
- **Center:** "Team 1 vs Team 2" plus Event • Bracket • Bale (when available).
- **Right:** T2 match score (live).
- Event/Bracket names come from `state.events` / `state.brackets` or from `GET /v1/team-matches/:id` (`event_name`, `bracket_name`).

## Score Table

- **Layout:** 8 columns — Team | A1–A6 | Tot. Two rows per end (T1, T2), then summary row (End N | Pts: x - y) and optional end divider.
- **Team row colors:** T1 = blue tint, T2 = amber tint (`css/tokens.css`, `css/score-colors.css`).
- **Archer grouping:** A3/A4 get `archer-pair-alt` only when the cell is empty so score colors (gold/red/blue, etc.) always show; A1/A3/A5 get `archer-group-start` border.

## Match Over and Complete

- When a winner is determined (5+ set points or shoot-off winner), UI shows "Match Over: Team X Wins!", adds `match-over-locked` (score inputs `pointer-events: none`), and shows **Match Over** modal once.
- Modal offers "Complete Match" (opens Complete confirmation) and "Close".
- **Complete** button is enabled as soon as `isMatchComplete()` is true; `updateCompleteMatchButton()` runs after score changes and after judge-call.
- Backend: `PATCH /v1/team-matches/:id/status` with `cardStatus: 'COMP'` considers the match complete when `team_match_sets` shows a team with `running_points` ≥ 5 (or shoot-off logic).

## Files Touched

| Area        | Files |
|------------|--------|
| API        | `api/index.php` (GET team match + event_name/bracket_name; PATCH status completion from team_match_sets) |
| Frontend   | `team_card.html`, `js/team_card.js` |
| Styles     | `css/tokens.css`, `css/score-colors.css` (already used by stacked layout) |
| Style guide| `tests/components/style-guide.html` (team scorecard section) |

## References

- [TEAM_MATCH_COMPLETE_API_SETS_SOURCE_OF_TRUTH.md](../bugs/TEAM_MATCH_COMPLETE_API_SETS_SOURCE_OF_TRUTH.md)
- [TEAM_MATCH_ARROWS_4_6_DROPPED.md](../bugs/TEAM_MATCH_ARROWS_4_6_DROPPED.md) (2 arrows per archer)
- `.cursor/rules/mobile-first-principles.mdc`, `tailwind-styling.mdc`
