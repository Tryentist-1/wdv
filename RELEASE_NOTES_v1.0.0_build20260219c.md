# Release Notes - v1.0.0 Build 20260219c

**Date:** February 19, 2026
**Type:** Bug Fix / Critical Update

## 🐛 Bug Fixes & Improvements

### Swiss Bracket Bale Assignments
- **Persisted Bale Grouping:** Fixed an issue where generating a new Swiss round would reset the bracket's starting bale to 1.
- **Dynamic Bale Calculation:** The `generate-round` API endpoint now queries the database (`solo_matches` or `team_matches`) for the minimum bale assigned in previous rounds for that specific bracket.
- **Improved UX:** It guarantees that distinct groups (e.g. JV vs Varsity) will remain on their historically assigned group of bales rather than overlapping on bale 1 on subsequent round generation.

## 📁 Files Changed
- `api/index.php`
- `version.json`
