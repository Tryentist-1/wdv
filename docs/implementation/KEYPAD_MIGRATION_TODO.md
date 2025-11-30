# Keypad Migration Implementation TODO

**Date:** November 2025  
**Status:** Planning  
**Priority:** HIGH - Critical field focus functionality must be preserved

---

## 🎯 Goal

Migrate all keypad implementations to the new improved 4x3 layout with:
- No spacing between buttons (edge-to-edge)
- No navigation buttons (prev/next removed)
- M button: light gray (gray-200) with black text
- CLOSE button: Left side, cancel styling
- CLEAR button: Right side, VOID styling
- Preserve all critical field focus functionality

---

## ⚠️ CRITICAL: Field Focus Functionality

**DO NOT BREAK THESE FEATURES:**

### 1. Focus Tracking
- `keypad.currentlyFocusedInput` - Must track the currently focused input
- Set when input receives focus event
- Used by all keypad button handlers

### 2. Focus Event Listeners
- Inputs must have `focus` event listeners that call `showKeypadForInput(input)`
- Touch/click handlers must trigger focus on mobile
- `readonly` attribute must be set to prevent keyboard

### 3. Auto-Advance After Score Entry
- After entering a score value, automatically move to next input
- Must re-query DOM to find updated input list
- Must handle edge cases (last input, cleared input)

### 4. Focus Navigation (REMOVED - No longer needed)
- ~~Prev/Next buttons~~ - **REMOVING** these in new layout
- Auto-advance handles navigation automatically

### 5. Keypad Visibility
- Keypad shows when input is focused
- Keypad hides when CLOSE is clicked
- `keypad-visible` class on body for styling

### 6. Input State Management
- Inputs must be `readonly` to prevent keyboard
- `inputmode="none"` for mobile
- Touch/click handlers to trigger focus

---

## 📋 Implementation TODO List

### Phase 1: Pre-Migration Setup (CRITICAL)

- [ ] **Create Git Tag: "Keypad Stable Rollback"**
  - Tag current production state before any changes
  - Command: `git tag -a "keypad-stable-rollback" -m "Stable keypad state before 4x3 layout migration"`
  - Verify tag: `git tag -l "keypad-stable-rollback"`

- [ ] **Document Current Keypad Behavior**
  - [ ] Test focus tracking in Ranking Round 300
  - [ ] Test focus tracking in Solo Card
  - [ ] Test focus tracking in Team Card
  - [ ] Test auto-advance functionality
  - [ ] Test keypad visibility
  - [ ] Screenshot/record current behavior

- [ ] **Create Test Checklist**
  - [ ] Focus on input → keypad appears
  - [ ] Enter score → auto-advances to next input
  - [ ] Enter score on last input → keypad closes
  - [ ] Click CLEAR → clears value, stays on same input
  - [ ] Click CLOSE → keypad closes, input loses focus
  - [ ] Touch input on mobile → keypad appears
  - [ ] Multiple rapid taps → no focus issues

---

### Phase 2: Ranking Round 300 Migration

**File:** `js/ranking_round_300.js`

- [ ] **Update `renderKeypad()` function** (lines ~2672-2704)
  - [ ] Change layout from 4x4 to 4x3
  - [ ] Remove prev/next navigation buttons
  - [ ] Update button order: X, 10, 9, M | 8, 7, 6, 5 | 4, 3, 2, 1 | CLOSE, CLEAR
  - [ ] Remove `gap-2`, use `gap-0` with border dividers
  - [ ] Update M button: `bg-gray-200 text-black`
  - [ ] Update CLOSE button: Left side, `bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white`
  - [ ] Update CLEAR button: Right side, `bg-danger-light dark:bg-danger-dark text-danger-dark dark:text-white`
  - [ ] Keep all `data-value` and `data-action` attributes
  - [ ] Keep `keypad-btn` class for event handlers

- [ ] **Verify `handleKeypadClick()` function** (lines ~2752-2811)
  - [ ] Ensure `keypad.currentlyFocusedInput` is still used
  - [ ] Remove prev/next action handlers (no longer needed)
  - [ ] Keep clear action handler
  - [ ] Keep close action handler
  - [ ] Keep auto-advance logic after score entry
  - [ ] Test focus navigation still works

- [ ] **Verify `attachKeypadHandlers()` function** (lines ~2715-2750)
  - [ ] Ensure focus event listeners still attached
  - [ ] Ensure touch/click handlers still work
  - [ ] Ensure `showKeypadForInput()` still called

- [ ] **Test Focus Functionality**
  - [ ] Focus on input → keypad appears
  - [ ] Enter score → auto-advances to next
  - [ ] Enter score on last input → keypad closes
  - [ ] Click CLEAR → clears, stays focused
  - [ ] Click CLOSE → keypad closes
  - [ ] Mobile touch → keypad appears

---

### Phase 3: Solo Card Migration

**File:** `js/solo_card.js`

- [ ] **Update `renderKeypad()` function** (lines ~535-538)
  - [ ] Change from legacy CSS classes to Tailwind
  - [ ] Update to 4x3 layout matching Ranking Round
  - [ ] Remove prev/next buttons
  - [ ] Update button styling to match new design
  - [ ] Keep all `data-value` and `data-action` attributes

- [ ] **Verify `handleKeypadClick()` function** (lines ~540-596)
  - [ ] Remove prev/next handlers (lines ~549-557)
  - [ ] Keep auto-advance logic (lines ~576-595)
  - [ ] Keep clear/close handlers
  - [ ] Ensure `keypad.currentlyFocusedInput` still used

- [ ] **Verify Focus Event Listeners** (lines ~1008-1010)
  - [ ] Ensure `focusin` event listener still works
  - [ ] Ensure `keypad.currentlyFocusedInput` is set

- [ ] **Update HTML** (`solo_card.html`)
  - [ ] Add Tailwind CSS CDN if not present
  - [ ] Update keypad container classes if needed

- [ ] **Test Focus Functionality**
  - [ ] All same tests as Ranking Round
  - [ ] Verify solo match specific behavior

---

### Phase 4: Team Card Migration

**File:** `js/team_card.js`

- [ ] **Update `renderKeypad()` function** (lines ~487-490)
  - [ ] Change from legacy CSS classes to Tailwind
  - [ ] Update to 4x3 layout matching Ranking Round
  - [ ] Remove prev/next buttons
  - [ ] Update button styling to match new design
  - [ ] Keep all `data-value` and `data-action` attributes

- [ ] **Verify `handleKeypadClick()` function** (lines ~492-505)
  - [ ] Remove prev/next handlers (lines ~498-499)
  - [ ] Keep auto-advance logic (lines ~504)
  - [ ] Keep clear/close handlers
  - [ ] Ensure `keypad.currentlyFocusedInput` still used

- [ ] **Verify Focus Event Listeners** (lines ~888-890)
  - [ ] Ensure `focusin` event listener still works
  - [ ] Ensure `keypad.currentlyFocusedInput` is set

- [ ] **Update HTML** (`team_card.html`)
  - [ ] Add Tailwind CSS CDN if not present
  - [ ] Update keypad container classes if needed

- [ ] **Test Focus Functionality**
  - [ ] All same tests as Ranking Round
  - [ ] Verify team match specific behavior

---

### Phase 5: Scorecard Editor Migration

**File:** `scorecard_editor.html`

- [ ] **Update Keypad Modal** (lines ~217-231)
  - [ ] Change from 4x3 with gaps to 4x3 no gaps
  - [ ] Update M button: `bg-gray-200 text-black`
  - [ ] Update CLOSE button: Left side, cancel styling
  - [ ] Update CLEAR button: Right side, VOID styling
  - [ ] Keep all `onclick` handlers
  - [ ] Keep all `data-value` attributes

- [ ] **Verify Modal Functions**
  - [ ] `editScore()` - Opens modal, sets focus
  - [ ] `setScore()` - Sets value, closes modal
  - [ ] `clearScore()` - Clears value
  - [ ] `closeScoreModal()` - Closes modal

- [ ] **Test Focus Functionality**
  - [ ] Click score cell → modal opens
  - [ ] Enter score → value set, modal closes
  - [ ] Click CLEAR → clears value
  - [ ] Click CLOSE → modal closes

---

### Phase 6: Table Dark Mode Text Fixes

**Files:** All files that render tables

- [ ] **Ranking Round 300** (`js/ranking_round_300.js`)
  - [ ] Find all table rendering functions
  - [ ] Add `dark:text-white` to cells with `bg-gray-100`, `bg-gray-200`, etc.
  - [ ] Add `dark:text-white` to archer name cells
  - [ ] Add `dark:text-white` to end number cells

- [ ] **Scorecard Editor** (`scorecard_editor.html`)
  - [ ] Update `renderScorecardTable()` function
  - [ ] Add `dark:text-white` to all gray background cells
  - [ ] Add `dark:text-white` to end number cells

- [ ] **Solo Card** (`js/solo_card.js`)
  - [ ] Find table rendering functions
  - [ ] Add dark mode text colors

- [ ] **Team Card** (`js/team_card.js`)
  - [ ] Find table rendering functions
  - [ ] Add dark mode text colors

---

### Phase 7: Testing & Verification

- [ ] **Local Testing**
  - [ ] Test Ranking Round 300 keypad
  - [ ] Test Solo Card keypad
  - [ ] Test Team Card keypad
  - [ ] Test Scorecard Editor keypad
  - [ ] Test on mobile device (iPhone/Android)
  - [ ] Test dark mode on all modules
  - [ ] Test table dark mode text visibility

- [ ] **Focus Functionality Tests**
  - [ ] Focus tracking works correctly
  - [ ] Auto-advance works after score entry
  - [ ] CLEAR button maintains focus
  - [ ] CLOSE button closes keypad
  - [ ] Mobile touch triggers focus
  - [ ] No focus loss issues

- [ ] **Visual Tests**
  - [ ] Keypad buttons have no gaps
  - [ ] M button is light gray with black text
  - [ ] CLOSE button on left, cancel styling
  - [ ] CLEAR button on right, VOID styling
  - [ ] Dark mode text is visible on all backgrounds

---

### Phase 8: Production Deployment

- [ ] **Pre-Deployment Checklist**
  - [ ] All tests pass locally
  - [ ] Focus functionality verified
  - [ ] Dark mode verified
  - [ ] Mobile tested
  - [ ] Git tag "keypad-stable-rollback" created

- [ ] **Deploy to Production**
  - [ ] Deploy via `DeployFTP.sh --remote-backup`
  - [ ] Purge Cloudflare cache
  - [ ] Verify production deployment

- [ ] **Post-Deployment Verification**
  - [ ] Test keypad on production
  - [ ] Test focus functionality on production
  - [ ] Test dark mode on production
  - [ ] Monitor for any issues

- [ ] **Rollback Plan Ready**
  - [ ] Document rollback procedure
  - [ ] Test rollback procedure locally
  - [ ] Keep rollback tag available

---

## 🔄 Rollback Procedure

If critical issues are found after deployment:

### Quick Rollback (Git Tag)

```bash
# 1. Checkout the stable rollback tag
git checkout keypad-stable-rollback

# 2. Deploy the previous version
./DeployFTP.sh --remote-backup

# 3. Purge Cloudflare cache
./test_cloudflare.sh

# 4. Verify rollback
# Test keypad functionality on production
```

### Full Rollback (Backup Restore)

If git rollback doesn't work:

```bash
# 1. Restore from remote backup created during deployment
cd deploy_backups
tar -xzf remote_backup_YYYYMMDD_HHMMSS.tar.gz

# 2. Upload restored files via FTP
# (Use DeployFTP.sh or manual FTP client)

# 3. Purge Cloudflare cache
./test_cloudflare.sh
```

---

## 📝 Keypad Layout Reference

### New 4x3 Layout (No Gaps)

```
┌─────┬─────┬─────┬─────┐
│  X  │ 10  │  9  │  M  │
├─────┼─────┼─────┼─────┤
│  8  │  7  │  6  │  5  │
├─────┼─────┼─────┼─────┤
│  4  │  3  │  2  │  1  │
├─────┴─────┴─────┴─────┤
│   CLOSE   │   CLEAR   │
└───────────────────────┘
```

### Button Styling

- **X, 10, 9:** `bg-score-gold text-black`
- **8, 7:** `bg-score-red text-white`
- **6, 5:** `bg-score-blue text-white`
- **4, 3:** `bg-score-black text-white`
- **2, 1:** `bg-score-white text-black`
- **M:** `bg-gray-200 text-black`
- **CLOSE:** `bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white` (left, col-span-2)
- **CLEAR:** `bg-danger-light dark:bg-danger-dark text-danger-dark dark:text-white` (right, col-span-2)

### Grid Classes

```html
<div class="grid grid-cols-4 gap-0 w-full">
  <!-- Buttons with border-r and border-b for dividers -->
  <!-- Last button in row: no border-r -->
  <!-- Last row: no border-b -->
</div>
```

---

## ⚠️ Critical Warnings

1. **DO NOT remove `keypad.currentlyFocusedInput`** - This is essential for all keypad functionality
2. **DO NOT remove focus event listeners** - Keypad won't appear without them
3. **DO NOT break auto-advance logic** - Users rely on automatic navigation
4. **DO NOT change `data-value` or `data-action` attributes** - Event handlers depend on these
5. **DO NOT remove `keypad-btn` class** - Event handlers use `.closest('.keypad-btn')`
6. **TEST ON MOBILE** - Focus behavior is different on touch devices

---

## 📚 Reference Files

- **Standard Implementation:** `style-guide.html` (keypad section)
- **Ranking Round:** `js/ranking_round_300.js` (lines ~2672-2811)
- **Solo Card:** `js/solo_card.js` (lines ~535-596)
- **Team Card:** `js/team_card.js` (lines ~487-505)
- **Scorecard Editor:** `scorecard_editor.html` (lines ~209-242)

---

## ✅ Success Criteria

Migration is complete when:

- [ ] All keypads use new 4x3 layout
- [ ] No gaps between buttons
- [ ] M button is light gray with black text
- [ ] CLOSE on left, CLEAR on right
- [ ] Focus functionality works perfectly
- [ ] Auto-advance works correctly
- [ ] Dark mode text is visible
- [ ] Mobile tested and working
- [ ] Production deployed and verified
- [ ] Rollback plan documented and tested

---

**Last Updated:** November 2025  
**Status:** Ready for Implementation

