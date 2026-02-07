# Bug Report: Solo Match Locking & Persistence

## Description
The Solo Match locking mechanism is functional but requires further robustification. Specifically, ensuring that the match state (Completed/Verified) and `locked` status persist correctly across all reload scenarios (hash navigation, browser refresh, cache clearing) is critical.

## Current Status
- **Partial Fix:** `hydrateSoloMatch` now attempts to set `state.locked` based on `cardStatus` ('COMPLETED', 'VERIFIED', etc.).
- **Issue:** On some reloads, especially via hash (`#matchId=...`), the state might revert to "In Progress" or lose the `shootOffWinner` derived data if not explicitly persisted or re-calculated correctly from the API response.
- **Shoot-off Persistence:** The API response does not explicitly return `shoot_off_winner` on the top-level match object in some cases, requiring client-side derivation from archer `winner` flags.

## Reproduction Steps
1. Start user A vs user B match.
2. Complete match with a tie and shoot-off.
3. Reload page using the `#matchId=UUID` hash.
4. Observe if "Match Complete" modal/state is restored or if it reverts to scoring view.
5. Check if scores are effectively locked (try editing via console or removing `readonly` attribute).

## Planned Fixes
- Ensure API returns `shoot_off_winner` and `locked` status reliably.
- robustify `hydrateSoloMatch` to handle all status variations ('COMP', 'COMPLETED', 'VER').
- Add server-side validation to reject score updates for locked matches (API layer).
