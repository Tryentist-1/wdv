# Release Notes v1.9.1

**Release Date:** December 2, 2025  
**Status:** ✅ Production Ready  
**Branch:** `feature/scorecard-editor-edit-buttons` → `main`

---

## 🎯 Minor Release: Scorecard Editor Edit Button Integration

This release adds Edit buttons throughout the application, making it easier for coaches to navigate to the Scorecard Editor from any scorecard display location. Also includes enhanced void/delete permissions for coaches.

---

## ✨ Key Features

### Scorecard Editor Edit Button Integration
- **Edit buttons added to all scorecard display locations:**
  - Results page (`results.html`) - Edit button in scorecard modal
  - Archer History (`archer_history.html`) - Edit buttons in ranking round and solo match modals
  - Archer Results Pivot (`archer_results_pivot.html`) - Edit button in scorecard modal
  - Coach Verification Modal (`js/coach.js`) - Edit buttons in verification table rows
  
- **Coach-only visibility:** Edit buttons only appear when coach is authenticated
- **Consistent styling:** All Edit buttons use FontAwesome edit icon and match design system
- **Proper URL generation:** Automatically generates correct editor URLs with `?id={roundArcherId}` or `?match={soloMatchId}`

### Enhanced Void/Delete Permissions
- **Coach override:** Coaches can now delete or void any scorecard regardless of status
- **Extra confirmation:** Verified/locked cards require additional confirmation before deletion
- **Improved UX:** Delete option always visible in modal for coaches, even for verified cards

---

## 🐛 Bug Fixes

### Scorecard Editor
- ✅ Fixed delete button not appearing for verified/locked cards (coach-only)
- ✅ Fixed restrictive delete permissions preventing coaches from cleaning up abandoned cards

### Component Enhancements
- ✅ Added FontAwesome CDN link to `archer_results_pivot.html` for Edit button icons
- ✅ Improved coach authentication checks across ScorecardView and SoloMatchView components

---

## 📁 Files Modified

### Core Components
- `scorecard_editor.html` - Enhanced void/delete permissions, added `checkIsCoach()` helper
- `js/scorecard_view.js` - Added Edit button to modal footer, added `isCoach()` helper
- `js/solo_match_view.js` - Added Edit button to modal footer, added `isCoach()` helper

### Pages Updated
- `results.html` - Passes `editUrl` to ScorecardView modal
- `archer_history.html` - Passes `editUrl` for ranking rounds and solo matches
- `archer_results_pivot.html` - Passes `editUrl`, added FontAwesome CDN link
- `js/coach.js` - Added Edit buttons to verification table for ranking rounds and solo matches

### Documentation
- `docs/features/scorecard-editor/SCORECARD_EDITOR_EDIT_BUTTON_ANALYSIS.md` - Analysis document
- `docs/features/scorecard-editor/SCORECARD_EDITOR_EDIT_BUTTONS_IMPLEMENTATION.md` - Implementation summary

---

## 🎨 UI/UX Improvements

### Edit Button Implementation
- **Standard Edit Button:** Primary-colored button with FontAwesome edit icon
- **Mobile-friendly:** 44px minimum touch targets for mobile devices
- **Consistent placement:** Modal footer (alongside Close button) or actions column
- **Icon-only option:** Compact version for tight spaces in verification table

### User Experience
- **Seamless navigation:** One-click access to Scorecard Editor from any scorecard view
- **Coach control:** Coaches have full control over scorecard deletion/voiding
- **Clear confirmation:** Extra warnings for verified/locked cards prevent accidental deletion

---

## 🔧 Technical Details

### Coach Authentication Pattern
Consistent `isCoach()` helper function checks:
- `localStorage.getItem('coach_passcode')`
- `localStorage.getItem('coach_api_key')`
- `getCookie('coach_auth')`

### URL Formats
- **Ranking rounds:** `scorecard_editor.html?id={roundArcherId}&mode=coach`
- **Solo matches:** `scorecard_editor.html?match={soloMatchId}&mode=coach`

---

## ✅ Testing Performed

- ✅ Edit buttons appear correctly in all locations (coach-only)
- ✅ Edit buttons navigate to correct Scorecard Editor URLs
- ✅ Void/delete permissions work for all card statuses (coach override)
- ✅ Confirmation dialogs appear for verified/locked cards
- ✅ FontAwesome icons load correctly on all pages
- ✅ Mobile-responsive touch targets (44px minimum)
- ✅ No lint errors

---

## 📊 Statistics

- **Total Files Modified:** 7
- **Total Commits:** 7
- **Edit Buttons Added:** 6 locations
- **Components Enhanced:** 2 (ScorecardView, SoloMatchView)
- **Pages Updated:** 4

---

## 🚨 Known Limitations

1. **Team Matches:** Scorecard Editor does not yet support team matches, so Edit buttons are only added for solo matches in verification table
2. **Missing IDs:** Some views may not have `roundArcherId` available - Edit button gracefully degrades (doesn't appear)

---

## 📚 Related Documentation

- **Analysis:** `docs/features/scorecard-editor/SCORECARD_EDITOR_EDIT_BUTTON_ANALYSIS.md`
- **Implementation:** `docs/features/scorecard-editor/SCORECARD_EDITOR_EDIT_BUTTONS_IMPLEMENTATION.md`

---

**Previous Release:** [v1.9.0](RELEASE_NOTES_v1.9.0.md) - Universal Data Synchronization Strategy

