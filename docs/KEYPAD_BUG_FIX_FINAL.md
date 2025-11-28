# Keypad Bug Fix - Final Solution

**Date:** November 27, 2025  
**Status:** ✅ FIXED  
**Root Cause:** Inline `style.display` overriding Tailwind `hidden` class

---

## The Bug

The keypad wasn't appearing when clicking on score inputs. The issue was introduced during the Tailwind CSS migration (commit e2a3180).

### Root Cause

**Incompatible visibility methods:**
- `renderKeypad()` set: `keypad.element.style.display = 'none';` (inline style)
- `showKeypadForInput()` tried: `keypad.element.classList.remove('hidden');` (CSS class)

**Why this failed:**
Inline styles (`style.display`) have higher specificity than CSS classes. When you set `style.display = 'none'`, removing the `hidden` class does nothing because the inline style overrides it.

---

## The Fix

**Use Tailwind's `hidden` class consistently:**

### Change 1: Remove inline style from `renderKeypad()` (Line 2957)

**Before:**
```javascript
function renderKeypad() {
    if (!keypad.element) {
        console.error('Keypad element not found!');
        return;
    }

    // Ensure keypad has proper styling and is initially hidden
    keypad.element.style.display = 'none';  // ❌ BREAKS TAILWIND
    
    keypad.element.innerHTML = `...`;
}
```

**After:**
```javascript
function renderKeypad() {
    if (!keypad.element) {
        console.error('Keypad element not found!');
        return;
    }

    // CRITICAL FIX: Don't set inline style.display - it overrides Tailwind's hidden class
    // The HTML already has class="hidden" - we'll use classList.add/remove('hidden') to control visibility
    
    keypad.element.innerHTML = `...`;
}
```

### Change 2: Use classList in `showKeypadForInput()` (Line 2995)

**Already correct:**
```javascript
function showKeypadForInput(input) {
    if (!input) return;
    keypad.currentlyFocusedInput = input;
    if (keypad.element) {
        keypad.element.classList.remove('hidden');  // ✅ CORRECT
    }
    document.body.classList.add('keypad-visible');
}
```

### Change 3: Use classList in close action (Line 3057)

**Before:**
```javascript
if (action === 'close') {
    keypad.element.style.display = 'none';  // ❌ INCONSISTENT
    document.body.classList.remove('keypad-visible');
    input.blur();
    return;
}
```

**After:**
```javascript
if (action === 'close') {
    keypad.element.classList.add('hidden');  // ✅ CONSISTENT
    document.body.classList.remove('keypad-visible');
    keypad.currentlyFocusedInput = null;
    input.blur();
    return;
}
```

---

## How It Works Now

1. **HTML** (ranking_round_300.html line 331):
   ```html
   <div id="keypad" class="... hidden"></div>
   ```
   Keypad starts hidden via Tailwind's `hidden` class

2. **renderKeypad()** (Line 2951):
   - Populates keypad HTML
   - Does NOT set inline styles
   - Keypad remains hidden via CSS class

3. **User clicks score input** → `focus` event → `showKeypadForInput()`:
   - Removes `hidden` class
   - Keypad becomes visible

4. **User clicks CLOSE** → `handleKeypadClick()`:
   - Adds `hidden` class back
   - Keypad becomes hidden

---

## Why This Bug Existed

The Tailwind migration (commit e2a3180) attempted to use Tailwind's `hidden` class but left one line of legacy code:

```javascript
keypad.element.style.display = 'none';  // Legacy code from pre-Tailwind
```

This single line broke the entire keypad because inline styles override CSS classes.

---

## Testing

1. Open the app
2. Select an event and bale
3. Start scoring
4. **Click on a score input**
5. ✅ Keypad should appear
6. **Click a score button (e.g., "10")**
7. ✅ Score should be entered
8. ✅ Keypad should auto-advance to next input
9. **Click "CLOSE"**
10. ✅ Keypad should disappear

---

## Related Fixes

This session also fixed:
1. **Division Resume Bug** - Division now correctly loaded from round/event
2. **Authentication Bug** - Removed `require_api_key()` from score submission endpoint

All three fixes are needed for the app to work properly.

---

**Files Modified:**
- `js/ranking_round_300.js` (Lines 2957, 2995, 3057)

**Breaking Changes:** None  
**Backward Compatibility:** Full
