# Release Notes — Build 20260218192007

**Date:** 2026-02-18  
**Version:** 1.0.0 (Build 20260218192007)

---

## Summary

This release adds the **"Your Bale" section** to the Archer Window, making it easy for archers to see their exact bale, line, and target assignment at a glance — without navigating to the scorecard. It also fixes a critical 500 error on the `/v1/archers/{id}/bracket-assignments` API endpoint that was blocking the feature.

---

## New Feature: "Your Bale" Section on Archer Window

### What it does
A new **"Your Bale"** card appears on the Archer Window (`index.html`) whenever an archer has an active match with a bale assignment. The card shows:

- **Bale number** — prominently displayed in a blue header bar
- **Line** (Line 1 A/B or Line 2 C/D) and wave (if assigned)
- **Your target** — highlighted with a blue border ("A — YOU" for solo, team name for team matches)
- **Opponent's target** and name (or "Opponent Team" for team matches)
- **Match context** — event name and round at the bottom
- Tapping the card navigates directly to the match scorecard

### What's covered
- **Solo Swiss matches** — shows individual target letter (A or B)
- **Team Swiss matches** — shows your team name vs opponent team, no spurious target letter when not applicable
- **Elimination bracket matches** — future-ready (handled via same assignment data)
- **Multiple bale assignments** — all render as separate cards

### Data source
Re-uses data already fetched by the `/v1/archers/{id}/bracket-assignments` API — **no new API calls** required.

---

## Bug Fixes

### `/v1/archers/{id}/bracket-assignments` — 500 Internal Server Error (Critical)
Two invalid column references in the team matches supplementary query caused a `500 Internal Server Error` for all archers:

- **`b.side`** — column does not exist in the `brackets` table. Removed.
- **`tmt_self.swiss_wins`, `tmt_self.swiss_losses`, `tmt_self.swiss_points`** — columns do not exist in `team_match_teams`. Removed (these values are `null` for team bale display, which doesn't need win/loss records).

### Team bale assignments not appearing in "Your Bale" section
The `bracketAssignments.forEach` loop in `loadOpenAssignments()` only handled `bracket_type === 'SOLO'` assignments. Team bracket assignments (`bracket_type === 'TEAM'`) were silently dropped. 

**Fix:** Added a `TEAM` branch that:
1. Finds the matching team assignment already in the `assignments` array (added from history API with sets progress)
2. **Merges** `bale_number`, `line_number`, and `wave` from the bracket-assignments API onto it
3. Edge case fallback: if no existing match is found, pushes a new team entry directly

---

## Files Changed

| File | Changes |
|------|---------|
| `index.html` | Added `#bale-section` HTML; `renderBaleSection()` function; TEAM branch in `bracketAssignments.forEach`; polished bale card for team matches (team name instead of "? — YOU") |
| `api/index.php` | Removed `b.side`, `tmt_self.swiss_wins/losses/points` from bracket-assignments team query |
| `version.json` | Build timestamp updated to `20260218192007` |

---

## Developer Notes

### PHP Opcode Cache
After editing `api/index.php`, always restart PHP-FPM:
```bash
docker compose restart php
```

### How bale data flows
```
history API (/v1/archers/:id/history)
  → team/solo match entry (sets progress, opponent name)
  
bracket-assignments API (/v1/archers/:id/bracket-assignments)
  → bale_number, line_number, wave, my_target, opp_target
  
JS merges both → renderBaleSection() displays the card
```

---

## Testing

- Verified solo bale assignment (Caleb Croft — Bale 1, Line 1, Target B vs Johnathan Kelleher)
- Verified team bale assignment (Brandon Garcia — Bale 11, Line 1, WDV-M-VAR-T1 vs BHS-M-VAR-T1)
- Verified section hidden when no bale assigned (Kyan Shimazu — 200 OK, empty assignments)
- Verified API returns 200 OK with correct data after fix
