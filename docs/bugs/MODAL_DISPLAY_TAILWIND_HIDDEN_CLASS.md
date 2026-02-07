# Modal Display Bug: Tailwind `hidden` Class Issue

**Date Discovered:** 2026-02-07  
**Status:** 🟡 Partially Fixed  
**Priority:** Medium  
**Affects:** All modals in coach.html

---

## Problem

Modals in `coach.html` have `class="hidden"` which uses Tailwind's CSS with `!important`:

```css
.hidden {
  display: none !important;
}
```

JavaScript code attempts to show modals using:

```javascript
modal.style.display = 'flex';
```

This **does not work** because inline styles cannot override `!important` declarations. The modal remains hidden.

---

## Affected Modals

All modals in `coach.html` use `class="hidden"`:

1. ✅ **coach-auth-modal** - FIXED (critical, was blocking app)
2. ❓ **create-event-modal** - Uses `style.display` (line ~452)
3. ❓ **add-archers-modal** - Uses `style.display` (line ~1470)
4. ❓ **assignment-mode-modal** - Uses `style.display` (line ~1563)
5. ❓ **import-summary-modal** - Uses `style.display` (line ~1873)
6. ❓ **edit-event-modal** - Uses `style.display` (line ~2434)
7. ❓ **qr-code-modal** - Uses `style.display` (line ~2560)
8. ❓ **create-bracket-modal** - Uses `style.display` (line ~2652)
9. ❓ **edit-bracket-modal** - Uses `style.display` (line ~2815)
10. ❓ **verify-modal** - Uses `style.display` (line ~1140)
11. ✅ **manage-roster-modal** - FIXED (uses classList)
12. ✅ **import-source-modal** - FIXED (uses classList)
13. ✅ **add-archer-modal** - FIXED (uses classList)

---

## Solution

### Helper Functions (Already Added)

```javascript
/**
 * Shows a modal by removing 'hidden' class and adding 'flex' class
 */
function showModal(modalOrId) {
  const modal = typeof modalOrId === 'string' 
    ? document.getElementById(modalOrId) 
    : modalOrId;
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

/**
 * Hides a modal by removing 'flex' class and adding 'hidden' class
 */
function hideModal(modalOrId) {
  const modal = typeof modalOrId === 'string' 
    ? document.getElementById(modalOrId) 
    : modalOrId;
  if (modal) {
    modal.classList.remove('flex');
    modal.classList.add('hidden');
  }
}
```

### Required Changes

Replace all instances of:

```javascript
// BAD (doesn't work with Tailwind hidden class)
modal.style.display = 'flex';
modal.style.display = 'none';

// GOOD (works with Tailwind)
showModal(modal);
hideModal(modal);
```

---

## Why It Wasn't Caught Earlier

1. **Auth Modal** was the first modal users see - it blocked the entire app
2. Other modals may work if:
   - They were never given the `hidden` class initially
   - They remove the class somewhere else in the code
   - They're rarely used

---

## Testing Plan

1. **Manual Test Each Modal:**
   - Create Event modal
   - Add Archers modal
   - Edit Event modal
   - QR Code modal
   - Create Bracket modal
   - Edit Bracket modal
   - Verify modal
   - Import Summary modal
   - Assignment Mode modal

2. **Expected Behavior:**
   - Modal should appear when triggered
   - Modal should overlay the page
   - Modal should close when clicking close/cancel

3. **If Broken:**
   - Modal stays hidden
   - Background overlay might appear
   - Console shows no errors (this is a CSS issue)

---

## Implementation Strategy

### Option 1: Global Find/Replace (Risky)
- Replace all 30+ instances at once
- Could break working code
- Hard to test all scenarios

### Option 2: Incremental Fix (Recommended)
- Fix modals as they're reported broken
- Test each modal individually
- Lower risk of breaking working features

### Option 3: Automated Script
- Create script to find all `modal.style.display` calls
- Generate fix patches
- Review and apply

---

## Related Issues

- **Fixed:** Auth modal (commit d543c9e)
- **Fixed:** Roster modals (commit d543c9e)

---

## Next Steps

1. **Test each modal manually** to confirm if broken
2. **Fix high-priority modals** first (Create Event, Edit Event)
3. **Update remaining modals** incrementally
4. **Add automated test** to catch this pattern in future

---

## Prevention

### Code Review Checklist
- [ ] Check if modal has `hidden` class in HTML
- [ ] Use `showModal()`/`hideModal()` helpers instead of `style.display`
- [ ] Add JSDoc comments to modal functions
- [ ] Test modal show/hide on actual page

### Future Pattern
All new modals should:
1. Use `hidden` class in HTML
2. Use `showModal()`/`hideModal()` helpers in JavaScript
3. Never use `style.display` directly

---

**Last Updated:** 2026-02-07  
**Fixed By:** Assistant (Crash Recovery Session)
