# Scorecard Editor - Edit Button Integration Analysis

**Date:** December 1, 2025  
**Status:** Analysis Complete  
**Purpose:** Evaluate entrance points to Scorecard Editor and plan Edit button integration

---

## 📋 Executive Summary

The Scorecard Editor (`scorecard_editor.html`) currently mentions several "other ways" to access it at the bottom of the page, but most of these locations **do not have Edit buttons** to navigate to the editor. This analysis identifies all locations where Edit buttons should be added and creates an implementation plan.

**Key Findings:**
- ✅ Scorecard Editor has void/delete functionality but permissions may be too restrictive
- ❌ Most scorecard display locations lack Edit buttons to navigate to editor
- 🎯 Need to add Edit buttons with FontAwesome icons to 6+ locations
- 🔧 Need to evaluate and potentially relax void/delete permissions for coaches

---

## 🔍 Current State Analysis

### Scorecard Editor Features

**Location:** `scorecard_editor.html`  
**URL Format:** `scorecard_editor.html?id={roundArcherId}&mode=coach`  
**Solo Match Format:** `scorecard_editor.html?match={soloMatchId}&mode=coach`

**Current Capabilities:**
- ✅ View/edit individual scorecards (ranking rounds)
- ✅ View/edit solo matches (sets-based format)
- ✅ Lock/unlock/void actions
- ✅ Delete functionality
- ✅ Verification history display
- ✅ Score editing with bottom sheet keypad
- ✅ Coach authentication required

**Void/Delete Permissions:**
- **Void:** Currently allows voiding from any status (VER, PENDING, COMP)
- **Delete:** Currently restricted to unlocked/abandoned cards only
- **Current Restriction:** Delete button may not appear for locked/verified cards

**Mentioned Entrance Points (Lines 96-102):**
The editor mentions these ways to find scorecard IDs:
1. **From Pivot View:** `archer_results_pivot.html` - "click on a score"
2. **From Archer History:** `archer_history.html` - "select an archer"
3. **From Data Admin:** `api/data_admin.php` - "search the database"
4. **Direct URL:** Manual URL entry with `?id={round_archer_id}&mode=coach`

---

## 📍 Locations That Need Edit Buttons

### 1. Results Page (`results.html`)

**Current State:**
- Displays scorecards in leaderboard format
- Clicking a scorecard opens a **view-only modal** (`ScorecardView.showScorecardModal`)
- No Edit button present
- Coach authentication: Not checked

**What's Needed:**
- Add Edit button to scorecard modal (coach-only)
- Add Edit button to scorecard list items (coach-only, optional)
- Button should link to: `scorecard_editor.html?id={roundArcherId}&mode=coach`

**Implementation:**
- File: `results.html` (lines 269-326)
- Function: `showArcherScorecard()`
- Component: `ScorecardView.showScorecardModal()` - needs enhancement

**Button Location:**
- Inside modal footer (alongside Close button)
- Only show if coach is authenticated

---

### 2. Archer History (`archer_history.html`)

**Current State:**
- Displays scorecard history in list format
- Clicking opens **view-only modal** for ranking rounds
- Clicking opens **SoloMatchView modal** for solo matches
- No Edit button present
- Coach authentication: Available via `getAuthHeaders()`

**What's Needed:**
- Add Edit button to ranking round modal (coach-only)
- Add Edit button to solo match modal (coach-only)
- Add Edit button directly to list items (coach-only, optional)
- Ranking rounds: `scorecard_editor.html?id={roundArcherId}&mode=coach`
- Solo matches: `scorecard_editor.html?match={soloMatchId}&mode=coach`

**Implementation:**
- File: `archer_history.html` (lines 287-297, 353-414, 416-486)
- Functions: `showRoundScorecard()`, `showSoloMatchScorecard()`
- Components: `ScorecardView`, `SoloMatchView` - need enhancements

**Button Location:**
- Inside modals (footer)
- Optional: Inline with list items (right side, coach-only)

---

### 3. Archer Results Pivot (`archer_results_pivot.html`)

**Current State:**
- Displays pivot table of scores across multiple rounds
- Clicking a score cell opens **view-only modal** (`ScorecardView.showScorecardModal`)
- No Edit button present
- Coach authentication: Not checked

**What's Needed:**
- Add Edit button to scorecard modal (coach-only)
- Button should link to: `scorecard_editor.html?id={roundArcherId}&mode=coach`

**Implementation:**
- File: `archer_results_pivot.html`
- Component: `ScorecardView.showScorecardModal()` - needs enhancement

**Button Location:**
- Inside modal footer

---

### 4. Coach Verification Modal (`js/coach.js`)

**Current State:**
- Displays scorecards in verification table
- Has "Lock All" and "Unlock" buttons
- Has "This Bale" and "ALL Bales" verification buttons
- **No Edit button** to navigate to Scorecard Editor
- Coach authentication: Already authenticated

**What's Needed:**
- Add Edit button to each scorecard row in verification table
- Button should link to: `scorecard_editor.html?id={roundArcherId}&mode=coach`
- Button should link to: `scorecard_editor.html?match={soloMatchId}&mode=coach` for solo matches

**Implementation:**
- File: `js/coach.js`
- Function: `renderVerificationTable()` or similar
- Location: In verification table, per-row actions

**Button Location:**
- Add column "Actions" to verification table
- FontAwesome edit icon: `<i class="fas fa-edit"></i>`

---

### 5. ScorecardView Modal Component (`js/scorecard_view.js`)

**Current State:**
- Reusable modal component used by multiple pages
- View-only display
- No Edit button
- No coach authentication check

**What's Needed:**
- Add Edit button to modal footer (coach-only)
- Make component aware of scorecard type (ranking round vs solo match)
- Pass through `roundArcherId` or `soloMatchId` to enable editing

**Implementation:**
- File: `js/scorecard_view.js`
- Function: `showScorecardModal(archerData, roundData, options)`
- Add `options.editUrl` parameter
- Add coach authentication check

**Button Location:**
- Modal footer (alongside Close button)

---

### 6. SoloMatchView Modal Component (`js/solo_match_view.js`)

**Current State:**
- Displays solo match details in modal
- Has "Remake Match" button (navigates to `solo_card.html`)
- No Edit button to navigate to Scorecard Editor
- Coach authentication: Not checked

**What's Needed:**
- Add Edit button alongside "Remake Match"
- Button should link to: `scorecard_editor.html?match={soloMatchId}&mode=coach`

**Implementation:**
- File: `js/solo_match_view.js`
- Function: `showMatchModal(matchData, options)`
- Add Edit button to modal footer

**Button Location:**
- Modal footer (alongside "Remake Match" button)

---

### 7. Unified Scorecard List Component (`js/unified_scorecard_list.js`)

**Current State:**
- Reusable list component used by multiple pages
- Clickable items trigger `onItemClick` callback
- No Edit buttons
- No coach authentication awareness

**What's Needed:**
- Optional: Add Edit button column to list items (coach-only)
- Or: Enhance `onItemClick` to check for coach + modifier key (long press, etc.)
- Add coach authentication check capability

**Implementation:**
- File: `js/unified_scorecard_list.js`
- Function: `createItem(item, index, options)`
- Add `options.showEditButton` boolean
- Add `options.onEditClick` callback

**Button Location:**
- Optional column at end of row (coach-only)

---

## 🔧 Void/Delete Permission Evaluation

### Current Restrictions

**Void Button:**
- ✅ Available from any status (VER, PENDING, COMP)
- ✅ Logged in verification history
- ⚠️ May need coach-only restriction

**Delete Button:**
- ❌ Only available for unlocked cards
- ❌ Hidden when `card_status === 'VER'` or `locked === true`
- ❌ Cannot delete verified cards

### User Requirements

**Goal:** Allow coaches to remove half-started and user-abandoned scorecards

**Half-Started Scorecards:**
- Cards with some scores but not completed
- Status: Usually PENDING
- Current: Can delete if unlocked ✅
- Issue: May be locked if part of verified bale ❌

**User-Abandoned Scorecards:**
- Cards created but never used
- Status: PENDING or VOID
- Current: Can delete if unlocked ✅
- Issue: May be locked ❌

### Proposed Changes

**Option A: Coach Override (Recommended)**
- Allow coaches to delete/void **any** card regardless of status
- Add confirmation dialog: "This card is verified/locked. Are you sure?"
- Log action in verification history with coach name

**Option B: Separate "Force Delete" Button**
- Add "Force Delete" button for coaches (red, destructive styling)
- Only visible when regular Delete is hidden
- Requires additional confirmation

**Option C: Unlock + Delete Workflow**
- Allow coaches to unlock any card
- Then allow delete as normal
- Two-step process

### Recommendation: **Option A** (Coach Override)

**Rationale:**
- Simplest workflow for coaches
- Single button, clear intent
- Proper logging and confirmation
- Matches user requirement: "allow coaches more ability"

**Implementation:**
- File: `scorecard_editor.html`
- Function: Delete button handler (around line 1200-1300)
- Change: Remove status check for coach users
- Add: Extra confirmation dialog for verified/locked cards

---

## 📐 Implementation Plan

### Phase 1: Void/Delete Permission Updates

**Goal:** Allow coaches to void/delete any scorecard regardless of status

**Tasks:**
1. Update Delete button visibility logic in `scorecard_editor.html`
   - Remove restriction that hides button for locked/verified cards
   - Show button for coaches in all cases
2. Update Delete handler to allow coach override
   - Remove status check in delete API call
   - Add confirmation: "This card is verified/locked. Delete anyway?"
3. Update Void handler (if needed)
   - Ensure coaches can void from any status
   - Add confirmation for verified cards
4. Test with various card statuses
   - PENDING cards
   - VERIFIED cards
   - VOID cards
   - Locked cards

**Files to Modify:**
- `scorecard_editor.html` (lines 686-690, 1200-1300)

**Estimated Effort:** 2-3 hours

---

### Phase 2: Edit Button - ScorecardView Component

**Goal:** Add Edit button to reusable ScorecardView modal

**Tasks:**
1. Add coach authentication check to `ScorecardView.showScorecardModal()`
   - Check for `localStorage.getItem('coach_api_key')` or similar
2. Add `options.editUrl` parameter to modal function
3. Add Edit button to modal footer
   - FontAwesome icon: `<i class="fas fa-edit"></i>`
   - Only visible for coaches
4. Update all callers to pass `editUrl`
   - `results.html`
   - `archer_history.html`
   - `archer_results_pivot.html`

**Files to Modify:**
- `js/scorecard_view.js`
- `results.html`
- `archer_history.html`
- `archer_results_pivot.html`

**Estimated Effort:** 3-4 hours

---

### Phase 3: Edit Button - SoloMatchView Component

**Goal:** Add Edit button to SoloMatchView modal

**Tasks:**
1. Add coach authentication check to `SoloMatchView.showMatchModal()`
2. Add Edit button to modal footer
   - FontAwesome icon: `<i class="fas fa-edit"></i>`
   - Link: `scorecard_editor.html?match={soloMatchId}&mode=coach`
3. Update caller: `archer_history.html`

**Files to Modify:**
- `js/solo_match_view.js`
- `archer_history.html`

**Estimated Effort:** 1-2 hours

---

### Phase 4: Edit Button - Coach Verification Modal

**Goal:** Add Edit button to each scorecard in verification table

**Tasks:**
1. Add "Actions" column to verification table
2. Add Edit button with FontAwesome icon per row
3. Link to Scorecard Editor with correct parameters
   - Ranking rounds: `?id={roundArcherId}&mode=coach`
   - Solo matches: `?match={soloMatchId}&mode=coach`
4. Update table layout to accommodate new column

**Files to Modify:**
- `js/coach.js` (verification table rendering)

**Estimated Effort:** 2-3 hours

---

### Phase 5: Optional - Edit Button in List Items

**Goal:** Add inline Edit buttons to scorecard lists (optional enhancement)

**Tasks:**
1. Enhance `UnifiedScorecardList` component
   - Add `showEditButton` option
   - Add `onEditClick` callback
   - Add coach authentication check
2. Add Edit button column to list items
   - FontAwesome icon: `<i class="fas fa-edit"></i>`
   - Only visible for coaches
3. Update pages that use UnifiedScorecardList
   - `results.html` (optional)
   - `archer_history.html` (optional)
   - `index.html` (optional)

**Files to Modify:**
- `js/unified_scorecard_list.js`
- `results.html` (optional)
- `archer_history.html` (optional)

**Estimated Effort:** 3-4 hours (optional)

---

## 🎨 UI/UX Design

### Edit Button Styling

**Standard Edit Button:**
```html
<button class="px-3 py-2 bg-primary hover:bg-primary-dark text-white rounded font-semibold transition-colors min-h-[44px] flex items-center gap-2">
  <i class="fas fa-edit"></i>
  <span>Edit</span>
</button>
```

**Icon-Only Edit Button (for tight spaces):**
```html
<button class="p-2 text-primary hover:bg-primary/10 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" title="Edit Scorecard">
  <i class="fas fa-edit"></i>
</button>
```

### Mobile-First Considerations

- **Touch Targets:** Minimum 44px × 44px
- **Spacing:** Adequate gap between buttons
- **Visibility:** Icons should be clearly visible in dark mode
- **Accessibility:** Include `title` attributes for icon-only buttons

### Coach Authentication Check

**Pattern:**
```javascript
function isCoach() {
  return !!(
    localStorage.getItem('coach_api_key') || 
    localStorage.getItem('coach_passcode') ||
    getCookie('coach_auth')
  );
}
```

---

## ✅ Success Criteria

### Phase 1: Void/Delete Permissions
- ✅ Coaches can delete verified/locked scorecards
- ✅ Confirmation dialog appears for verified cards
- ✅ Action logged in verification history
- ✅ Delete button visible for all card statuses (coach-only)

### Phase 2-4: Edit Buttons
- ✅ Edit buttons appear in all identified locations
- ✅ Buttons only visible for coaches
- ✅ Buttons navigate correctly to Scorecard Editor
- ✅ Buttons use FontAwesome edit icon
- ✅ Buttons work on mobile devices (44px touch targets)

### Phase 5: Optional Enhancements
- ✅ Inline Edit buttons in scorecard lists (if implemented)
- ✅ Consistent styling across all locations

---

## 🚨 Potential Issues & Considerations

### 1. Coach Authentication State
**Issue:** Need consistent way to check if user is coach  
**Solution:** Create shared `isCoach()` function in `js/common.js`

### 2. Scorecard ID Availability
**Issue:** Some views may not have `roundArcherId` available  
**Solution:** Fetch from API when needed, or pass through modal data

### 3. Solo Match Support
**Issue:** Scorecard Editor needs to support both ranking rounds and solo matches  
**Solution:** Already supports both via URL parameters (`?id=` vs `?match=`)

### 4. Mobile Layout
**Issue:** Edit buttons may clutter mobile interface  
**Solution:** Use icon-only buttons, hide labels on small screens

### 5. Backward Compatibility
**Issue:** Changes to components may break existing code  
**Solution:** Make new parameters optional, add fallbacks

---

## 📚 Related Documentation

- **Scorecard Editor:** `scorecard_editor.html`
- **Scorecard Status Workflow:** `docs/features/ranking-rounds/SCORECARD_STATUS_WORKFLOW.md`
- **Verification Analysis:** `docs/features/solo-matches/SOLO_MATCH_VERIFICATION_ANALYSIS.md`
- **Coach Console:** `coach.html`, `js/coach.js`

---

## 📝 Implementation Checklist

### Phase 1: Void/Delete Permissions
- [ ] Update Delete button visibility logic
- [ ] Add coach override to Delete handler
- [ ] Add confirmation dialog for verified cards
- [ ] Test with PENDING cards
- [ ] Test with VERIFIED cards
- [ ] Test with locked cards

### Phase 2: ScorecardView Edit Button
- [ ] Add coach check to `ScorecardView.showScorecardModal()`
- [ ] Add `options.editUrl` parameter
- [ ] Add Edit button to modal footer
- [ ] Update `results.html` to pass `editUrl`
- [ ] Update `archer_history.html` to pass `editUrl`
- [ ] Update `archer_results_pivot.html` to pass `editUrl`

### Phase 3: SoloMatchView Edit Button
- [ ] Add coach check to `SoloMatchView.showMatchModal()`
- [ ] Add Edit button to modal footer
- [ ] Update `archer_history.html` caller

### Phase 4: Coach Verification Modal
- [ ] Add "Actions" column to verification table
- [ ] Add Edit button per row
- [ ] Link correctly for ranking rounds
- [ ] Link correctly for solo matches
- [ ] Update table layout

### Phase 5: Optional - List Item Edit Buttons
- [ ] Enhance `UnifiedScorecardList` component
- [ ] Add Edit button option
- [ ] Update pages that use component (optional)

### Testing
- [ ] Test Edit buttons on all pages
- [ ] Test coach authentication checks
- [ ] Test mobile responsiveness
- [ ] Test void/delete with various card statuses
- [ ] Test navigation from Edit buttons

---

**Document Owner:** Development Team  
**Last Updated:** January 21, 2025  
**Next Review:** After Phase 1 implementation

