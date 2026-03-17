# Ranking Round Bug: Next/Prev End Double-Fires, Skipping 2 Ends

**Date:** 2026-03-17  
**Page/Module:** `ranking_round_300.html` / `js/ranking_round_300.js`  
**Severity:** High  
**Status:** ✅ Fixed

---

## 🐛 Bug Description

When a scorer taps "Next End" during a Ranking Round 300, the app advances **2 ends** instead of 1. The
same applies to "← Back" — it goes back 2 ends. This leaves one end permanently inaccessible with no
way to navigate back to it.

**User Impact:**
- Scorer starts End 1, taps "Next End" → lands on End 3 (End 2 is skipped)
- Tapping "← Back" from End 3 goes back to End 1 (skipping End 2 again)
- End 2 is orphaned — no way to reach it
- Missing scores cannot be entered, breaking the round

---

## 🔍 Steps to Reproduce

1. Open a Ranking Round 300 scorecard with archers added
2. Enter scores for End 1
3. Tap "Next End"
4. **Observe:** App lands on End 3 (skipped End 2)
5. **Expected:** App should land on End 2

---

## 🔍 Root Cause Analysis

### The Problem

The `#next-end-btn` and `#prev-end-btn` buttons had **two simultaneous click handlers** attached,
causing `changeEnd()` to fire twice per tap.

### Code Flow

**Handler 1** — Delegated body listener in `wireCoreHandlers()` (line ~699):
```javascript
document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('#sync-end-btn, #prev-end-btn, #next-end-btn, ...');
    // ...
    case 'next-end-btn':
        e.preventDefault();
        changeEnd(1);   // ← fires once
        break;
});
```

**Handler 2** — Direct `onclick` in `init()` (lines ~7582–7588):
```javascript
if (scoringControls.prevEndBtn) {
    scoringControls.prevEndBtn.onclick = () => changeEnd(-1);  // ← fires again
}
if (scoringControls.nextEndBtn) {
    scoringControls.nextEndBtn.onclick = () => changeEnd(1);   // ← fires again
}
```

### Why This Happens

When a user clicks "Next End":
1. The button's `onclick` property fires → `changeEnd(1)` → end goes from N to N+1
2. The click event bubbles up to `document.body`
3. The delegated listener fires → `changeEnd(1)` again → end goes from N+1 to N+2

Result: 2 ends skipped per tap.

The comment in `renderScoringView()` at line ~3918 even documented the correct intent:
```javascript
// Clicks handled by delegated footer handler in wireCoreHandlers
```
...but the duplicate `onclick` was added in `init()` anyway, overriding that intent.

This was **not** a device-side issue (not incomplete cache, not PWA data). The duplicate binding
is present in the production JS file.

---

## ✅ Solution

### Fix Strategy

Remove the duplicate `onclick` bindings for `prevEndBtn` and `nextEndBtn` from `init()`. The
delegated body listener in `wireCoreHandlers()` is the correct single handler.

### Implementation

**File:** `js/ranking_round_300.js`  
**Location:** Inside `init()`, lines ~7582–7588 (before the fix)

**Removed:**
```javascript
if (scoringControls.prevEndBtn) {
    scoringControls.prevEndBtn.textContent = 'Last End';
    scoringControls.prevEndBtn.onclick = () => changeEnd(-1);
}
if (scoringControls.nextEndBtn) {
    scoringControls.nextEndBtn.textContent = 'Next End';
    scoringControls.nextEndBtn.onclick = () => changeEnd(1);
}
```

**Replaced with explanatory comment:**
```javascript
// Prev/Next End clicks are handled by the delegated footer handler in wireCoreHandlers().
// Do NOT add onclick here — that would double-fire changeEnd() and skip 2 ends per tap.
```

---

## 🧪 Testing Plan

### Test Cases

1. **Primary Fix Test**
   - Open Ranking Round 300, add archers, enter End 1 scores
   - Tap "Next End" → should land on End 2 (not End 3)
   - Tap "Next End" again → should land on End 3
   - Tap "← Back" → should return to End 2

2. **Boundary Tests**
   - On End 1: "← Back" should be a no-op (already at first end)
   - On End 10: "Next End" should be a no-op (already at last end)

3. **Regression Tests**
   - "Sync End" still works
   - "Complete Round" still works
   - Navigating to individual card view still works
   - Score entry still saves correctly per end

4. **Mobile Testing** ⚠️ **CRITICAL**
   - Test on iPhone — confirm single tap advances exactly 1 end
   - Confirm "← Back" moves exactly 1 end back

### Test Devices
- iPhone (Safari) - Primary (this is where the issue was reported)
- Desktop - Regression check

---

## 📋 Implementation Checklist

- [x] Root cause identified
- [x] Fix implemented
- [ ] Code tested locally
- [ ] Mobile device tested
- [ ] Regression tests passed
- [ ] Documentation updated
- [ ] Ready for deployment

---

## 🔗 Related

- Module: `js/ranking_round.js` (360-round) — does **not** have this issue (no double binding)
- Comment in `renderScoringView()` at line ~3918 already documented the correct intent

---

**Status:** ✅ Fixed  
**Priority:** High  
**Fix Applied:** 2026-03-17 — Removed duplicate `onclick` bindings in `init()`  
**Files Changed:** `js/ranking_round_300.js`
