# Archer Selection Issue - Root Cause & Fix

**Date:** November 28, 2025  
**Issue:** Clicking links from index.html loads wrong archer  
**Root Cause:** IDENTIFIED ✅  
**Status:** 🔧 FIX READY

---

## Root Cause Identified

### The Problem

There are **two different types of links** on index.html:

**Type 1: Resume Ranking Round** (Line 408) ✅ CORRECT
```javascript
link: `ranking_round_300.html?event=${round.event_id}&round=${round.round_id}&archer=${archerId}`
```
- Has all parameters
- Works correctly with Phase 1 handleDirectLink()
- Goes straight to scoring

**Type 2: Active Event** (Line 497) ❌ INCOMPLETE
```javascript
link: `ranking_round_300.html?event=${event.id}`
```
- Only has event ID
- Missing round and archer
- Falls back to archer cookie
- **This is what you clicked!**

---

## Why You Got Cooper Instead of Terry

### What Happened:

1. **You clicked "Active Event"** (not "Resume Ranking Round")
   - Link: `ranking_round_300.html?event=29028a52...`
   - Missing: `&round=...&archer=...`

2. **ranking_round_300.html loaded**
   - Saw `?event=X` (no round, no archer)
   - Called `loadEventById(eventId, '', '')`
   - Loaded event from server

3. **Event loaded successfully**
   - Assignment mode: "pre-assigned"
   - Has bale assignments

4. **Tried to find archer**
   - No archer ID in URL
   - Called `getArcherCookie()`
   - **Cookie had Cooper's ID from previous session**
   - Loaded Cooper's bale instead of Terry's

---

## The Fix

### Option 1: Don't Show "Active Event" Links (Recommended)

**Problem:** "Active Event" links are confusing and incomplete.

**Solution:** Only show "Resume Ranking Round" links (which have all parameters).

**Change in index.html (line 485-502):**

**Before:**
```javascript
// Find active events for today
const activeEvents = events.filter(ev => 
  ev.date === today && 
  (ev.status === 'Active' || ev.status === 'Not Started')
);

activeEvents.forEach(event => {
  assignments.push({
    type: 'event',
    title: event.name,
    link: `ranking_round_300.html?event=${event.id}`,  // ❌ Incomplete
    // ...
  });
});
```

**After:**
```javascript
// Don't show generic "Active Event" links
// Only show "Resume Ranking Round" links (which have round IDs)
// This prevents confusion and ensures correct archer is loaded

// Remove this entire block (lines 480-506)
```

**Rationale:**
- "Resume Ranking Round" links already show active rounds
- They have complete information (event, round, archer)
- They work correctly with Phase 1 handleDirectLink()
- No need for duplicate "Active Event" links

---

### Option 2: Fix "Active Event" Links to Include Archer

**If you want to keep "Active Event" links:**

**Change line 497:**

**Before:**
```javascript
link: `ranking_round_300.html?event=${event.id}`,
```

**After:**
```javascript
link: `ranking_round_300.html?event=${event.id}&archer=${archerId}`,
```

**But this still has problems:**
- No round ID (can't use handleDirectLink)
- Will show event modal or setup view
- User has to select bale manually
- Not as good as "Resume Ranking Round"

---

### Option 3: Clear Archer Cookie on Event Load (Defensive)

**Add to ranking_round_300.js to prevent wrong archer:**

**In `loadEventById()` function:**

```javascript
async function loadEventById(eventId, eventName, entryCode) {
    try {
        console.log('[loadEventById] Starting:', { eventId, eventName, entryCode });
        
        // DEFENSIVE: If loading event without archer ID in URL,
        // and we're in pre-assigned mode, warn about potential mismatch
        const urlArcherId = urlParams.get('archer');
        const cookieArcherId = getArcherCookie();
        
        if (!urlArcherId && cookieArcherId) {
            console.warn('[loadEventById] ⚠️ No archer in URL, but cookie exists');
            console.warn('[loadEventById] Cookie archer:', cookieArcherId);
            console.warn('[loadEventById] This may load the wrong archer\'s data!');
        }
        
        // ... rest of function
    }
}
```

---

## Recommended Solution

**Implement Option 1: Remove "Active Event" Links**

**Why:**
1. ✅ Eliminates confusion
2. ✅ "Resume Ranking Round" already shows active rounds
3. ✅ All links will have complete parameters
4. ✅ No chance of loading wrong archer
5. ✅ Simpler, cleaner UI

**Steps:**
1. Remove lines 480-506 in index.html (Active Events section)
2. Keep lines 390-413 (Resume Ranking Round section)
3. Test with Terry Adams

---

## Testing After Fix

### Test 1: Resume Ranking Round
1. Go to index.html
2. Select Terry Adams
3. See "Resume Ranking Round" link
4. Click it
5. **Verify:** URL has `?event=X&round=Y&archer=terry-id`
6. **Verify:** Loads Terry's scorecard (not Cooper's)

### Test 2: No Active Event Links
1. Go to index.html
2. **Verify:** No generic "Active Event" links shown
3. **Verify:** Only "Resume Ranking Round" links (with progress)

### Test 3: Entry Code Persistence
1. Resume round
2. **Verify:** No 401 errors
3. **Verify:** Entry code loaded from session

---

## Quick Fix for Right Now

**To fix immediately without code changes:**

1. **Clear browser data:**
   ```javascript
   // In browser console
   localStorage.clear();
   sessionStorage.clear();
   document.cookie.split(";").forEach(c => {
       document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
   });
   location.reload();
   ```

2. **Select Terry Adams again**

3. **Look for "Resume Ranking Round"** (not "Active Event")

4. **Click "Resume Ranking Round"**
   - This link has all parameters
   - Will load Terry's data correctly

---

## Summary

**Problem:** You clicked "Active Event" link which only has event ID  
**Result:** System used Cooper's archer cookie instead of Terry's ID  
**Solution:** Remove "Active Event" links, only use "Resume Ranking Round" links  
**Benefit:** All links will have complete parameters and load correct archer  

**Files to modify:**
- `index.html` - Remove lines 480-506 (Active Events section)

**No changes needed to:**
- `ranking_round_300.js` - Phase 1 already handles direct links correctly
- Entry code persistence - Already implemented in Phase 1 & 2

The issue is not with the refactored code - it's with incomplete links in index.html!
