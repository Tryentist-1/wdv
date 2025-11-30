## Sprint: Verify Scorecards (Branch: `feature/verify-scorecards`)

> **⚠️ Status Workflow Reference:**  
> For the authoritative status workflow documentation, see:  
> **[SCORECARD_STATUS_WORKFLOW.md](SCORECARD_STATUS_WORKFLOW.md)**
> 
> This document contains sprint-specific implementation details.  
> The master reference should be consulted for current status definitions.

### Overview
Goal: provide coaches/refs a structured workflow to verify paper scorecards against digital records, lock cards, and mark rounds as complete or voided. Work builds on the new data hygiene tooling and keeps production results clean.

### Personas
- **Coach / Ref** (authorized via passcode `wdva26` or configured value) – performs verification, locking, and closing of bales/rounds.
- **Archer** – submits scores; can no longer edit once their card is locked.

### User Stories

#### Story 1 – Bale Verification Console
*As an authorized coach/ref I want to view all scorecards in a bale at once so I can cross-check digital and paper cards before sign-off.*

- Passcode protected (same mechanism as other admin tools).
- Shows list of archers for the selected bale with totals, last sync, and lock status.
- “Refresh” button forces re-fetch; unsynced cards clearly flagged.

#### Story 2 – Validate / Lock Individual Scorecards
*As a coach/ref I want to mark a card as verified and lock it so the data cannot change after paperwork is signed.*

- “Validate” button only active when card is complete.
- On click: confirm, set `locked = 1`, record `verified_by`, `verified_at`, append to `lock_history`.
- Locked cards become read-only; other app surfaces show “Verified ✅”.

#### Story 3 – Unlock for Corrections
*As a coach/ref I want to unlock a card if an error is found so I can correct the data.*

- Passcode gate reused.
- Unlock clears the lock flag and appends an entry to `lock_history`.
- UI displays “Unlocked by Coach/Ref” for audit clarity.

#### Story 4 – Bale-Level Lock All + Sync Check
*As a ref I want to lock all cards in a bale at once after verifying them so I can finish quickly.*

- “Lock All” button requires every card to be either complete or explicitly marked “missing/void”.
- Pressing it triggers a sync refresh, then locks all eligible cards.
- Leaderboard gets `VER` badge for locked cards (void cards hidden unless filtered).

#### Story 5 – Verify & Close Round / Void Incomplete Cards
*As a coach I want to close a round so results can filter to only verified cards.*

- “Verify and Close Round” action locks all completed cards and marks incomplete ones as `VOID`.
- Round `status` values used:
  - `Not Started`
  - `In Progress`
  - `Completed`
  - `Voided`
- Leaderboards and results default to showing verified cards; add filter toggle to reveal `VOID`.

### Out of Scope / Future Enhancements
- Round status manual overrides (not needed per current requirement).
- Notifications when a round closes (could be added later).
- Deeper audit log UI (lock_history JSON available for future visualization).

### Tasks / Implementation Notes
- Extend `round_archers` with `locked` boolean, `lock_history` JSON (or equivalent), optional `notes`.
- Update `results.html` API rendering to show `VER` badges and allow filtering.
- Add verification console UI (likely under `coach.html` or new admin page).
- Extend results snapshot API payload to include `locked`, `card_status` (`VER`, `VOID`), `round_status`.
- Ensure locking applies only to event-backed scorecards (practice/solo rounds remain editable even if synced to history).
- Add Playwright covers for:
  - Lock/Unlock flow
  - Bale-level lock all
  - Verify & Close round (ensuring VOID cards hidden by default)
- Update QA checklist to include new verification workflow.

### Branch Management / Testing
- Working branch: `feature/verify-scorecards`
- Once local tests pass and manual QA verified, merge -> `main` -> deploy -> production smoke.

