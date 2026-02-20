# Release Notes v1.0.0 - Live Action HUD Beta

**Release Date:** February 19, 2026  
**Version:** 1.0.0  
**Build:** 20260219154036 (And Sub-Builds)  
**Deployment:** Production (FTP)  
**Git Branch:** `main`  
**Type:** Feature Release

## 🎯 Overview

Introduced the "Live Action HUD," a spectator-facing, auto-refreshing dashboard that displays all Solo and Team matches for a given event. It includes dynamic status indicators (Live, Pending, Verified), a robust OR-logic search, and click-through scorecards specifically designed to keep parents informed without risking accidental data edits.

## ✨ Major Features

### Live Action HUD (Beta)
**NEW:** Dedicated spectator dashboard for event matches.

- ✅ **Unified Match Display** – Aggregates and displays both Solo and Team matches.
  - **Why:** Spectators needed a single place to see what's happening across all bales.
  - **How:** Fetches `/v1/events/{id}/solo-matches` and `/v1/events/{id}/team-matches` in parallel, normalizes the data, and renders derived UI states.
  - **Impact:** Eliminates the need for parents to hunt down match PINs or look over shoulders.
  - **Files:** `live_action.html`, `js/live_action.js`

- ✅ **Click-to-View Scorecards** – HUD cards are clickable links.
  - **Why:** Parents want to see the exact arrow scores that make up the Set Points.
  - **How:** Wraps match cards in `href="solo_card.html?match={id}"` (or `team_card`). Because no match PIN is provided, it defaults to a read-only viewer mode.
  - **Impact:** Deep-links to granular data without compromising database integrity.
  - **Files:** `js/live_action.js`

- ✅ **Unlocked Read APIs** – Spectator API access.
  - **Why:** Previously, only coaches with API keys could fetch match lists.
  - **How:** Removed `require_api_key()` from `GET /v1/solo-matches/:id` and `GET /v1/team-matches/:id` (and the event-wide match lists).
  - **Impact:** Enables the HUD and the click-to-view scorecards to function publicly. (POST/PATCH edits remain locked).
  - **Files:** `api/index.php`

### Enhanced Client-Side Search
**ENHANCED:** Upgraded search functionality for easier filtering.

- ✅ **OR-Logic Search with Roster Support** – Search multiple terms at once.
  - **Why:** Parents often want to search for multiple kids (e.g., "Liana Brody") or their school abbreviation (e.g., "BJV").
  - **How:** Splits the `searchTerm` by space and uses `.some()` against an aggregated string that now includes individual `team_match_archers` names.
  - **Impact:** Massively improves search flexibility and accuracy.
  - **Files:** `js/live_action.js`

- ✅ **Team Roster Subtitles** – Visible comma-separated team lists.
  - **Why:** Team names like "WDV-F-VAR-T3" don't tell a parent if their kid is shooting.
  - **How:** Injected a line-clamped, comma-separated string of archer names underneath the team name on the HUD cards.
  - **Impact:** Immediate visibility into who is actively competing on a team bale.
  - **Files:** `js/live_action.js`

## 📦 Files Changed

**Key Files:**
- `live_action.html` – New frontend HTML structure.
- `js/live_action.js` – New frontend logic (fetching, filtering, rendering, auto-refresh).
- `api/index.php` – Read-only API key bypasses for GET match endpoints.
- `version.json` – Timestamp updates.
