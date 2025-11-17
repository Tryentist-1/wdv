# Ranking Round: Bugs & Feature Requests

> **⚠️ DEPRECATED - ARCHIVED November 17, 2025**
> 
> **Reason:** Bug/feature list from October development - likely resolved in current codebase
> 
> This file is kept for historical reference only. Check current issue tracker for active bugs/features.

---

**Date**: October 21, 2025  
**Status**: Active Development  
**Priority**: High

---

## 🐛 **Critical Bugs**

### Bug 1: Page Reload Breaks Buttons
**Status**: 🔴 Open  
**Priority**: Critical  
**Reported**: Oct 21, 2025

**Description**:
- When scoring is in progress and user reloads the page
- All buttons stop working (no clicks registered)
- No errors thrown in console or UI
- App appears functional but is unresponsive

**Steps to Reproduce**:
1. Start scoring for a bale
2. Enter some scores
3. Reload the page (browser refresh)
4. Try to click any button
5. Observe: No response, no errors

**Expected Behavior**:
- Page reload should restore state and all buttons should work
- OR show clear error/prompt to restart

**Impact**: High - Users lose all scoring progress if they accidentally refresh

---

### Bug 2: Event Name Not Reliably Displayed
**Status**: 🔴 Open  
**Priority**: Medium  
**Reported**: Oct 21, 2025

**Description**:
- Event name at top of page doesn't consistently appear
- Sometimes blank, sometimes shows "QR Event" or old event
- Inconsistent across different entry methods (QR, manual code, event selection)

**Expected Behavior**:
- Event name should always be visible at top
- Should match the actual connected event
- Should persist across page navigation

**Impact**: Medium - Users don't know which event they're connected to

---

### Bug 3: Sync Status Not Reliably Displayed
**Status**: 🔴 Open  
**Priority**: Medium  
**Reported**: Oct 21, 2025

**Description**:
- Sync status indicator (⟳ column) doesn't consistently show
- Sometimes missing entirely
- Sometimes shows but doesn't update properly

**Expected Behavior**:
- Sync status should always be visible when Live Updates is enabled
- Should show: Pending (⟳), Synced (✓), or Failed (✗)
- Should update in real-time as scores are posted

**Impact**: Medium - Users can't tell if their scores are being saved to server

---

### Bug 4: "Enter Coach ID" Prompt Blocks Archers
**Status**: 🔴 Open  
**Priority**: High  
**Reported**: Oct 21, 2025

**Description**:
- Prompt appears asking for "coach ID" to enable live scoring
- Archers don't have coach ID
- Requires coach intervention to dismiss or enter
- Blocks workflow unnecessarily

**Context**:
- This was partially fixed earlier (removed blocking prompt on 401)
- But prompt may still appear in other scenarios
- Archers should be able to score independently without any coach credentials

**Expected Behavior**:
- Archers should never be prompted for coach credentials
- Live Updates should either:
  - Work automatically if event has it enabled
  - Be silently disabled if not available
  - Never block the user with prompts

**Impact**: High - Breaks independent archer workflow

---

## ✨ **Feature Requests**

### Feature 1: Reassign/Remove Archers from Bales
**Status**: 🟡 Planned  
**Priority**: High  
**Reported**: Oct 21, 2025

**Use Case**:
- Archer doesn't show up to event
- Archer needs to move to different bale
- Last-minute division changes
- Need to adjust pre-assigned bales on the fly

**Current Limitation**:
- Pre-assigned bales are loaded from server
- No UI to modify assignments after loading
- Can only switch to manual mode (loses all assignments)

**Proposed Solution**:
1. Add "Edit Bale" button on setup screen
2. Show list of all archers with current assignments
3. Allow:
   - Remove archer from bale (checkbox to exclude)
   - Reassign archer to different bale (dropdown)
   - Add archer from master list
4. Save changes to local state
5. Optional: Sync changes back to server

**UI Mockup**:
```
┌─────────────────────────────────────┐
│ Pre-Assigned Bale 1                 │
│ [Edit Assignments]                  │
├─────────────────────────────────────┤
│ ☑ Eric S. (A) - BVAR               │
│ ☑ Bryce G. (B) - BVAR              │
│ ☐ Kyan S. (C) - BVAR (no-show)     │ ← Unchecked = removed
│ ☑ Landon H. (D) - BVAR             │
│                                     │
│ [Save Changes] [Cancel]             │
└─────────────────────────────────────┘
```

**Impact**: High - Essential for real-world event management

---

### Feature 2: Visual "Scoring Started" Indicator
**Status**: 🟡 Planned  
**Priority**: Medium  
**Reported**: Oct 21, 2025

**Description**:
- Need prominent visual indicator that scoring has begun
- Should be obvious to all archers on the bale
- Should differentiate from setup/planning state

**Proposed Solution**:
1. Change page header color when scoring starts
   - Setup: Blue header
   - Scoring: Green/Orange header
2. Add badge/banner:
   ```
   ┌──────────────────────────────────┐
   │ 🎯 SCORING IN PROGRESS - Bale 1  │
   │    End 3 of 10                   │
   └──────────────────────────────────┘
   ```
3. Disable "Setup" button during scoring
4. Show progress indicator (End X of Y)

**Impact**: Medium - Improves UX and prevents confusion

---

### Feature 3: Auto-Resume Scoring on App Reopen
**Status**: 🟡 Planned  
**Priority**: High  
**Reported**: Oct 21, 2025

**Current Behavior**:
- Some auto-resume logic exists
- Not 100% reliable
- Sometimes goes back to setup screen

**Desired Behavior**:
- If archer closes app mid-scoring
- When they reopen: automatically resume at exact spot
- Should restore:
  - Event context
  - Bale number
  - Current end number
  - All entered scores
  - Current view (scoring view)

**Technical Notes**:
- Already saving to localStorage
- Need to improve init() logic to prioritize resume
- Check both:
  - Local in-progress data (localStorage)
  - Server synced data (if available)

**Impact**: High - Essential for real-world usage (interruptions are common)

---

## 🎨 **UX Improvements**

### UX-1: Rename "Scoring" to "Start Scoring" (Setup Page)
**Status**: 🟡 Planned  
**Priority**: Low  
**Reported**: Oct 21, 2025

**Current**: Button says "Scoring"  
**Desired**: Button says "Start Scoring"

**Location**: Setup view, after archers are selected

**Rationale**: More clear and actionable

---

### UX-2: Rename "Scoring" to "Start Scoring" (Score Cards)
**Status**: 🟡 Planned  
**Priority**: Low  
**Reported**: Oct 21, 2025

**Current**: Button says "Scoring"  
**Desired**: Button says "Start Scoring"

**Location**: Individual archer card view

**Rationale**: Consistency with setup page

---

### UX-3: Rename Bottom Navigation Buttons
**Status**: 🟡 Planned  
**Priority**: Low  
**Reported**: Oct 21, 2025

**Current**:
- Left button: "← E" or similar
- Right button: "E →" or similar

**Desired**:
- Left button: "Last End" or "← Previous"
- Right button: "Next End" or "Next →"

**Location**: Scoring view, bottom navigation

**Rationale**: More descriptive and user-friendly

---

## 📋 **Implementation Priority**

### Phase 1: Critical Fixes (Do First)
1. ✅ Bug 1: Fix page reload breaking buttons
2. ✅ Bug 4: Remove coach ID prompts for archers

### Phase 2: High-Priority Features
3. ✅ Feature 3: Improve auto-resume reliability
4. ✅ Feature 1: Add reassign/remove archers functionality

### Phase 3: Medium-Priority Fixes
5. ✅ Bug 2: Fix event name display
6. ✅ Bug 3: Fix sync status display
7. ✅ Feature 2: Add visual scoring indicator

### Phase 4: UX Polish
8. ✅ UX-1, UX-2: Rename buttons to "Start Scoring"
9. ✅ UX-3: Rename bottom navigation buttons

---

## 🧪 **Testing Checklist**

After implementing fixes, verify:

- [ ] Reload page during scoring - buttons still work
- [ ] Event name always visible and correct
- [ ] Sync status always visible and updating
- [ ] No coach ID prompts for archers
- [ ] Can reassign archers from pre-assigned bales
- [ ] Can remove no-show archers
- [ ] Visual indicator when scoring starts
- [ ] Close/reopen app resumes to exact spot
- [ ] All buttons say "Start Scoring"
- [ ] Bottom buttons say "Next End" / "Last End"

---

## 📝 **Notes**

- Many of these issues likely stem from state management complexity
- Consider refactoring state handling for better reliability
- Auto-resume logic should be bulletproof (most critical feature)
- Archer independence is key - no coach intervention needed

---

**Last Updated**: October 21, 2025  
**Total Issues**: 10 (4 bugs, 3 features, 3 UX improvements)  
**Status**: Ready for implementation

