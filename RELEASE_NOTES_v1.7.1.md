# Release Notes v1.7.1 - Scorecard Status Standardization

**Release Date:** December 2025  
**Version:** 1.7.1  
**Deployment:** Production (FTP)  
**Git Branch:** `main`  
**Type:** Incremental Release (Bug Fixes & Standardization)

## 🎯 Overview

This incremental release standardizes scorecard status displays across all modules to match the master workflow document. All status badges and text now consistently use the short codes (PEND/COMP/VER/VOID) and ensure status consistency between list views and detailed card views.

## 🐛 Bug Fixes

### Status Display Consistency
- ✅ **Fixed status mismatch in archer_history.html** – Card view now shows correct status matching the list view
  - Added `cardStatus` field to `archerData` when displaying scorecard modals
  - Prioritizes `round.card_status` from history API, falls back to scorecard API data
  - Fixes issue where list showed "COMP" but card view showed "PEND"

- ✅ **Removed invalid "LOCK" status** – Eliminated non-standard status from all modules
  - Removed from `archer_history.html` status logic
  - Removed from `js/unified_scorecard_list.js` status rendering
  - All modules now use only: PEND, COMP, VER, VOID

- ✅ **Standardized status text across all modules**
  - Changed "PENDING" → "PEND" in `scorecard_view.js` and `scorecard_editor.html`
  - Changed "COMPLETED" → "COMP" in `scorecard_editor.html`
  - Updated `index.html` Active Rounds status logic to match master document
  - All status displays now use short codes per master document standard

### Scorecard Editor Improvements
- ✅ **Added default Home footer** – Scorecard editor now has consistent footer navigation
  - Matches footer style from other pages
  - Fixed positioning with proper z-index

## 📋 Status Workflow Standardization

All modules now follow the master document workflow (`docs/SCORECARD_STATUS_WORKFLOW.md`):

**Status Flow:** `PENDING` → `COMP` → `VER` → `VOID`

**Status Display:**
- **PEND** (PENDING) - Yellow/Warning - Card in progress
- **COMP** (COMPLETED) - Blue/Primary - Card finished, awaiting verification
- **VER** (VERIFIED) - Green/Success - Card verified and locked
- **VOID** - Red/Danger - Card marked invalid

**Modules Updated:**
- ✅ `archer_history.html` - List view and card view status
- ✅ `results.html` - Already correct, verified
- ✅ `index.html` - Active Rounds status logic
- ✅ `scorecard_editor.html` - Status badge display
- ✅ `js/scorecard_view.js` - Common card component status badge
- ✅ `js/unified_scorecard_list.js` - Unified list status rendering

## 🔧 Technical Changes

### Files Modified
- `archer_history.html` - Fixed cardStatus passing, removed LOCK status
- `js/scorecard_view.js` - Changed PENDING to PEND
- `js/unified_scorecard_list.js` - Removed LOCK status, improved logic
- `scorecard_editor.html` - Changed PENDING/COMPLETED to PEND/COMP, added footer
- `index.html` - Updated Active Rounds status logic

### API Compatibility
- No API changes required
- All changes are frontend display logic only
- Backward compatible with existing data

## ✅ Testing Checklist

- [x] Status displays correctly in archer_history.html list
- [x] Status badge matches between list and card view
- [x] All modules use consistent status codes
- [x] No invalid "LOCK" status appears anywhere
- [x] Scorecard editor footer displays correctly
- [x] Active Rounds status logic works correctly

## 📚 Documentation Updates

- ✅ Updated `docs/SCORECARD_STATUS_WORKFLOW.md` with v1.1 changes
- ✅ All status displays now documented and standardized

## 🚀 Deployment Notes

**Pre-Deployment:**
- No database migrations required
- No API changes
- Frontend-only changes

**Post-Deployment:**
- Verify status displays in all modules
- Check that card views match list views
- Confirm no "LOCK" status appears anywhere

## 🔗 Related Documentation

- [SCORECARD_STATUS_WORKFLOW.md](docs/SCORECARD_STATUS_WORKFLOW.md) - Master status workflow reference
- [RANKING_ROUND_STATUS_WORKFLOW.md](docs/RANKING_ROUND_STATUS_WORKFLOW.md) - Ranking round specific details

---

**Previous Release:** [v1.7.0](RELEASE_NOTES_v1.7.0.md) - Event Dashboard Phase 1

