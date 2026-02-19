# Release Notes - v1.0.0 (Build 20260219)

**Date:** February 19, 2026
**Status:** Deployed to Production

## Overview
This update introduces comprehensive final preparations for the LA test event, including critical enhancements to the bracket presentation layers, deep-linking integration, ties handling, and ease-of-use functionalities for tournament directors. 

## 🛠 Features & Improvements

### Event Dashboard & Coach Controls
* **Verify Button Automation**: Added a green "Verify" button exclusively to the Coach view on the `event_dashboard.html`. Clicking this immediately launches the `coach.html` Verify Scorecards modal via enhanced URL parameter listeners.
* **Streamlined QR Codes**: Revised the overarching coach event-list QR Code generation to direct users straight towards the new `event_dashboard.html` rather than the legacy setup pages, completely removing the artificial entry code checks for public facing displays.

### Brackets & Leaderboards
* **Win Percentage Driven Standings**: Rebuilt the backend SQL queries returning bracket results to order teams and individuals initially via absolute win percentage `(wins / (wins+losses))` before falling backwards to points and point differentials. 
* **Dynamic Refresh Limits**: Pulled the default leaderboard automatic refresh polling on `bracket_results.html` back to 15 seconds from 5 seconds.
* **Shoot-off Resolution Points**: Changed the maximum set accumulation constraints across the API `solo_match_sets` and `team_match_sets` to accurately absorb and inject the 1-point shoot-off breakers (e.g. 5-6 instead of tied 5-5).
* **Enhanced Visual Clarity**: Winner rows in match breakdowns are now unmistakably emphasized with a solid green backing (`bg-green-100` / `bg-green-900/40`), removing ambiguity. 
* **Granular Target Alignment**: Included the physical bale grouping onto the Tgt designations inside the round detail listings (`[Bale]-[Target]`).

### Navigation & UX
* **Pending Match Resolution Links**: Repaired a hard-coded mapping blindspot where Elimination Pending Matches were unclickable from the archer's home console. The backend actively scans `solo_matches` mapping dynamic IDs directly to the front-end interface, generating successful deep links instantly.
* **Match Verification Transparency**: Substituted the generic "Complete" nomenclature with an affirming "Verified" green badge everywhere traversing the results portal whenever a match reaches `VRFD` or `VER` authorization.

## 🐛 Bug Fixes
* Fixed missing link paths to elimination matchups.
* Allowed `bale_number` interpolation into deeper match renders gracefully.
* Re-ordered local UI rendering arguments for clearer results views.
