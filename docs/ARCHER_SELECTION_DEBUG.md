# Archer Selection Debug - Issue Analysis

**Date:** November 28, 2025  
**Issue:** Selecting Terry Adams loads wrong archer (Cooper C.)  
**Status:** 🔍 INVESTIGATING

---

## Observed Symptoms

From the screenshots:

### Screenshot 1: Setup View
```
- Selected: Terry Adams (COA • VAR)
- Bale: 1
- 1/4 archers selected
- Console shows: "Event loaded successfully, UI refreshed"
```

### Screenshot 2: Scoring View
```
- Shows: Cooper C. (A) on Bale 1
- Console shows:
  - "Loaded event from localStorage"
  - "Pre-assigned mode: 1 archers on bale 1 (OPEN, roundId: 21d8ad92-8aa3-47f1-b84b-3be23d225427)"
  - "Found API match for: Cooper Colinsky"
  - "Loading 3 ends for Cooper Colinsky"
```

---

## Root Cause Analysis

### Issue 1: Archer Cookie Mismatch

**Problem:** The archer cookie is set to Cooper's ID, not Terry's ID.

**Evidence from console:**
```javascript
[handleUrlParameters] { 
    urlEventId: "29028a52-b889-4f05-9eb1-7cf87cbd5a62",
    urlRoundId: null,
    urlArcherId: null  // ← No archer ID in URL
}
```

**What's happening:**
1. User selects Terry Adams on index.html
2. Clicks "Ranking Round" 
3. URL doesn't include `archer=` parameter
4. `ranking_round_300.html` loads
5. Uses `getArcherCookie()` which returns Cooper's ID (from previous session)
6. Loads Cooper's data instead of Terry's

### Issue 2: Entry Code Not Found

**Console shows:**
```
POST https://tryentist.com/wdv/api/v1/archers/bulk_upsert 401 (Unauthorized)
Live Updates unauthorized
```

**Problem:** Entry code is missing or incorrect for this event.

**Why:**
- Event was loaded from localStorage
- Entry code may have been cleared
- Or entry code is for a different event

### Issue 3: Round History vs Direct Link

**From console:**
```
[loadEventById] Received event data: { ... }
Event loaded from URL - bypassing event modal
```

**Problem:** The URL has `event=` but no `round=` or `archer=` parameters.

**Expected URL format:**
```
ranking_round_300.html?event=29028a52...&round=21d8ad92...&archer=terry-adams-id
```

**Actual URL:**
```
ranking_round_300.html?event=29028a52...
```

---

## Why This Happens

### Scenario: Clicking "Ranking Round" from Index.html

**Current flow:**
```
1. User on index.html as Terry Adams
2. Clicks "Ranking Round" link
3. Link format: ranking_round_300.html?event={eventId}
   ❌ Missing: &round={roundId}&archer={archerId}
4. ranking_round_300.html loads
5. No URL archer ID → Uses getArcherCookie()
6. Cookie has Cooper's ID (from previous session)
7. Loads Cooper's data
```

**Expected flow:**
```
1. User on index.html as Terry Adams
2. Clicks "Resume Ranking Round" (from open assignments)
3. Link format: ranking_round_300.html?event={eventId}&round={roundId}&archer={archerId}
   ✅ Has all parameters
4. handleDirectLink() processes URL
5. Loads Terry's round data
6. Shows Terry's scorecard
```

---

## Solutions

### Solution 1: Fix Index.html Links (Recommended)

**Problem:** The "Ranking Round" link doesn't include round and archer IDs.

**Fix:** Update index.html to include all parameters when linking to ranking rounds.

**Before:**
```html
<a href="ranking_round_300.html?event={eventId}">Ranking Round</a>
```

**After:**
```html
<a href="ranking_round_300.html?event={eventId}&round={roundId}&archer={archerId}">
    Resume Ranking Round
</a>
```

**Where to fix:** `index.html` - in the "Open Assignments" section

---

### Solution 2: Clear Stale Archer Cookie

**Problem:** Archer cookie persists across sessions, causing wrong archer to load.

**Fix:** Add archer cookie validation or clear on logout.

**Add to ranking_round_300.js:**
```javascript
// In handleUrlParameters() or init()
function validateArcherCookie() {
    const urlArcherId = urlParams.get('archer');
    const cookieArcherId = getArcherCookie();
    
    if (urlArcherId && urlArcherId !== cookieArcherId) {
        console.warn('[validateArcherCookie] URL archer differs from cookie');
        console.warn('  URL:', urlArcherId);
        console.warn('  Cookie:', cookieArcherId);
        console.warn('  Using URL archer (more specific)');
        
        // Update cookie to match URL
        setArcherCookie(urlArcherId);
    }
}
```

---

### Solution 3: Add Entry Code to Round Data

**Problem:** Entry code is lost when resuming rounds.

**Fix:** Already implemented in Phase 1 & 2!

**Verify it's working:**
```javascript
// Check console for:
[handleDirectLink] Fetching round data from server
[getEventEntryCode] ✅ Using entry code from bale session
```

**If not working:**
- Entry code may not be in `current_bale_session`
- Need to save entry code when starting round

---

## Immediate Debugging Steps

### Step 1: Check Archer Cookie

**Open browser console on index.html:**
```javascript
// Check current archer cookie
document.cookie.split(';').find(c => c.includes('archer'))

// Expected: "archerId=terry-adams-id"
// Actual: "archerId=cooper-id" ← Wrong!
```

### Step 2: Check URL Parameters

**When clicking "Ranking Round", check URL:**
```
Expected: ?event=X&round=Y&archer=Z
Actual:   ?event=X  ← Missing round and archer!
```

### Step 3: Check Local Storage

**Open browser console:**
```javascript
// Check current bale session
JSON.parse(localStorage.getItem('current_bale_session'))

// Should show:
{
    archerId: "terry-adams-id",  // ← Should be Terry
    roundId: "21d8ad92...",
    baleNumber: 1,
    entryCode: "ABC123"  // ← Should have entry code
}
```

### Step 4: Check Round History API

**Check what the server returns:**
```javascript
// In browser console on index.html
const archerId = getArcherCookie();
fetch(`/api/v1/archers/${archerId}/history`)
    .then(r => r.json())
    .then(data => console.log('Round history:', data));

// Should show Terry's rounds, not Cooper's
```

---

## Quick Fix: Clear All Data

**To reset and start fresh:**

1. **Open browser console**
2. **Clear all storage:**
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   document.cookie.split(";").forEach(c => {
       document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
   });
   ```
3. **Reload page**
4. **Select Terry Adams again**
5. **Try again**

---

## Long-Term Fix: Update Index.html

**Location:** `index.html` - "Open Assignments" section

**Find:**
```javascript
assignments.push({
    title: round.event_name,
    subtitle: `${round.division} • ${round.ends_completed}/10 ends`,
    link: `ranking_round_300.html?event=${round.event_id}`,  // ❌ Missing params
    // ...
});
```

**Replace with:**
```javascript
assignments.push({
    title: round.event_name,
    subtitle: `${round.division} • ${round.ends_completed}/10 ends`,
    link: `ranking_round_300.html?event=${round.event_id}&round=${round.round_id}&archer=${archerId}`,  // ✅ All params
    // ...
});
```

---

## Console Commands for Debugging

**Check current state:**
```javascript
// 1. Check archer cookie
console.log('Archer cookie:', getArcherCookie());

// 2. Check current bale session
console.log('Bale session:', JSON.parse(localStorage.getItem('current_bale_session') || '{}'));

// 3. Check event entry code
console.log('Entry code:', localStorage.getItem('event_entry_code'));

// 4. Check state
console.log('State:', state);
```

**Force set correct archer:**
```javascript
// Set archer cookie to Terry's ID
setArcherCookie('terry-adams-id');  // Replace with actual ID

// Clear current session
localStorage.removeItem('current_bale_session');

// Reload
location.reload();
```

---

## Expected vs Actual Flow

### Expected (Working):
```
index.html (Terry selected)
  ↓
Click "Resume Ranking Round"
  ↓
URL: ?event=X&round=Y&archer=terry-id
  ↓
handleDirectLink() processes URL
  ↓
Loads Terry's round data
  ↓
Shows Terry's scorecard ✅
```

### Actual (Broken):
```
index.html (Terry selected)
  ↓
Click "Ranking Round"
  ↓
URL: ?event=X  ← Missing params
  ↓
Uses getArcherCookie() → Returns Cooper's ID
  ↓
Loads Cooper's round data
  ↓
Shows Cooper's scorecard ❌
```

---

## Next Steps

1. **Immediate:** Clear browser data and try again
2. **Short-term:** Check index.html link format
3. **Long-term:** Update index.html to include all URL parameters

Would you like me to:
1. Check the index.html code to see how links are generated?
2. Create a fix for the link generation?
3. Add better archer validation to prevent this issue?
