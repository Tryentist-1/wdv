# Release Notes - v1.0.1 (Build 20260221)

## Overview
This release focuses on refining the Swiss bracket logic to support team competitions and improving the fairness of pairings through position-based tie-breaking. It also resolves a critical bug in the roster import process.

## Key Changes

### 🛡️ Bracket & Pairing Logic
- **Generic Swiss Standings**: The `recalculate_swiss_bracket_standings` function is now bracket-type agnostic, handling both Solo and Team brackets.
* **Team Swiss Support**: Standardized team match win detection and standings updates.
- **Fair Swiss Pairings**:
    - **Tie-breaker**: Added `seed_position` to the Swiss pairing sort order. Archers/Teams with better initial seeding are prioritized when points and wins are tied.
    - **School Balancing**: Modified the pairing algorithm to prioritize matching opponents from different schools.
    - **Rematch Avoidance**: Added logic to avoid matches between previously played opponents whenever possible.
- **Bale Persistence**: Rounds now automatically detect and reuse the bale range from previous rounds in the same bracket.

### 🐛 Bug Fixes
- **Roster Import SQL Error**: Fixed a crash during roster import where the system attempted to insert a string (e.g., "S1") into an integer column (`seed_position`). The system now automatically sanitizes these values by extracting the numeric portion.

## Files Modified
- `api/index.php`: Refactored standings and pairing logic; fixed import sanitization.
- `version.json`: Bumped version to 1.0.1.
- `01-SESSION_QUICK_START.md`: Added status update.

## Deployment Notes
- Standard FTP deployment via `npm run deploy`.
- Safe to deploy while event is in progress (bracket logic applies to new round generation).
