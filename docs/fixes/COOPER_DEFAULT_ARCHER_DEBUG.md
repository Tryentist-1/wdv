# Cooper Default Archer Bug - Diagnosis

**Date:** November 28, 2025  
**Issue:** Starting from clean slate, ending up on Cooper's scorecard with empty round  
**Status:** 🔍 INVESTIGATING

---

## Symptom

When clicking a round from index.html (fresh start, no prior data):
1. Get "No Event Code Stored Anywhere" warning
2. End up on a **scorecard modal** showing Cooper with empty Round 1
3. Like Cooper is a default archer

---

## Possible Causes

### 1. Old localStorage Data
Even though you "deleted event data", there might be:
- `localStorage.current_bale_session` with Cooper's ID
- `localStorage.ranking_round_300_state` with Cooper in archers array
- Archer cookie set to Cooper's ID

### 2. Sample Data Being Loaded
There's a `loadSampleData()` function that creates test archers, but it's only called when clicking "Sample" button in reset modal.

### 3. Default Archer Selection
When `state.archers` is populated but no specific archer is selected, the system might default to the first archer (which could be Cooper).

### 4. Archer Cookie Persistence
The archer cookie (`archerId`) might still have Cooper's ID from a previous session.

---

## Diagnostic Steps

### Step 1: Check localStorage
```javascript
// In browser console
console.log('=== localStorage Contents ===');
console.log('current_bale_session:', localStorage.getItem('current_bale_session'));
console.log('ranking_round_300_state:', localStorage.getItem('ranking_round_300_state'));
console.log('event_entry_code:', localStorage.getItem('event_entry_code'));

// Check for any event-related keys
Object.keys(localStorage).forEach(key => {
    if (key.includes('event') || key.includes('archer') || key.includes('round')) {
        console.log(key, ':', localStorage.getItem(key));
    }
});
```

### Step 2: Check Cookies
```javascript
// In browser console
console.log('=== Cookies ===');
console.log(document.cookie);

// Check archer cookie specifically
const archerCookie = document.cookie.split(';').find(c => c.includes('archerId'));
console.log('Archer cookie:', archerCookie);
```

### Step 3: Check state.archers
```javascript
// In browser console (after page loads)
console.log('=== state.archers ===');
console.log(state.archers);
console.log('First archer:', state.archers[0]);
```

### Step 4: Check URL Parameters
```
When you click the link from index.html, what is the full URL?
Expected: ranking_round_300.html?event=X&round=Y&archer=terry-id
Actual: ???
```

---

## Most Likely Cause

Based on the symptoms, I believe the issue is:

**The archer cookie still has Cooper's ID from a previous session.**

When you:
1. Click a round from index.html
2. URL doesn't have `archer=` parameter (or has wrong ID)
3. System uses `getArcherCookie()` which returns Cooper's ID
4. Loads Cooper's data instead of Terry's

---

## The Fix

### Fix 1: Clear ALL Browser Data (Immediate)

```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
document.cookie.split(";").forEach(c => {
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
location.reload();
```

### Fix 2: Update Archer Cookie When URL Has Archer ID (Code Fix)

In `handleDirectLink()`, add:

```javascript
async function handleDirectLink(eventId, roundId, archerId) {
    try {
        console.log('[handleDirectLink] Loading round:', { eventId, roundId, archerId });

        // CRITICAL: Update archer cookie to match URL parameter
        // This ensures we don't use stale cookie data
        const currentCookie = getArcherCookie();
        if (currentCookie !== archerId) {
            console.log('[handleDirectLink] Updating archer cookie from', currentCookie, 'to', archerId);
            setArcherCookie(archerId);
        }

        // ... rest of function
    }
}
```

### Fix 3: Validate Archer in Round (Already Implemented)

The code already checks if the archer is in the round:

```javascript
const archerData = baleData.archers.find(a =>
    a.archerId === archerId ||
    a.id === archerId ||
    a.archer_id === archerId
);

if (!archerData) {
    console.error('[handleDirectLink] ❌ Archer not found in bale data');
    alert('You are not assigned to this round.');
    return false;
}
```

This should prevent loading the wrong archer's data.

---

## Questions to Answer

1. **What is the full URL when you click the round from index.html?**
   - Does it include `&archer=terry-id`?
   - Or is it missing the archer parameter?

2. **What does the console show?**
   - Look for `[handleDirectLink] Loading round:` log
   - What archer ID is shown?

3. **What is in localStorage?**
   - Run the diagnostic commands above
   - Share the output

4. **What is the archer cookie value?**
   - Check `document.cookie`
   - Look for `archerId=...`

---

## Temporary Workaround

Until we fix the root cause:

1. **Always clear browser data before testing:**
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   document.cookie.split(";").forEach(c => {
       document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
   });
   ```

2. **Or manually set the archer cookie:**
   ```javascript
   // Set to Terry's ID
   setArcherCookie('3edd0f5d-8f17-4e4f-ac72-e5c04d9899b1');
   ```

---

## Next Steps

1. Run diagnostic commands and share output
2. Check the URL when clicking from index.html
3. Implement Fix 2 (update archer cookie in handleDirectLink)
4. Test again

---

**Status:** Awaiting diagnostic information  
**Priority:** P0 - Critical bug
