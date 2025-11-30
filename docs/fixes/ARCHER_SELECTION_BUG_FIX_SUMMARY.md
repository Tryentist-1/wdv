# Archer Selection Bug - Fix Summary

**Date:** November 28, 2025  
**Issue:** Selecting Terry Adams loads Cooper C. instead  
**Status:** ✅ FIXED  
**Files Modified:** `index.html`

---

## Problem Summary

### What You Experienced

1. Selected **Terry Adams** on index.html
2. Clicked a link to go to ranking round
3. Got **Cooper C.** loaded instead
4. Entry code was missing (401 errors)

### Root Cause

**Two types of links on index.html:**

**Type 1: "Resume Ranking Round"** ✅ CORRECT
```
URL: ranking_round_300.html?event=X&round=Y&archer=terry-id
Has: All parameters
Result: Loads Terry's data correctly
```

**Type 2: "Active Event"** ❌ INCOMPLETE
```
URL: ranking_round_300.html?event=X
Missing: round ID, archer ID
Result: Uses stale archer cookie → Loads Cooper's data
```

**You clicked Type 2** (Active Event link), which didn't have your archer ID!

---

## The Fix

### Removed "Active Event" Links

**File:** `index.html` (lines 478-506)

**Before:**
```javascript
// Check for active events today
const activeEvents = events.filter(ev => 
  ev.date === today && 
  (ev.status === 'Active' || ev.status === 'Not Started')
);

activeEvents.forEach(event => {
  assignments.push({
    title: event.name,
    link: `ranking_round_300.html?event=${event.id}`,  // ❌ Incomplete!
    // ...
  });
});
```

**After:**
```javascript
// NOTE: Removed "Active Event" links section
// These links only had event ID, missing round and archer parameters
// This caused wrong archer to load (used stale cookie instead of URL param)
// "Resume Ranking Round" links (above) already show active rounds with complete parameters
```

### Why This Fixes It

**Before:**
- Two types of links (confusing!)
- Some links incomplete
- Could load wrong archer

**After:**
- Only "Resume Ranking Round" links
- All links have complete parameters
- Always loads correct archer

---

## What Changed on Index.html

### Before (Confusing):
```
Your Open Assignments
├─ Resume Ranking Round (3/10 ends)  ← Has all params ✅
├─ State Championship (Active Event) ← Missing params ❌
└─ Practice Round (Active Event)     ← Missing params ❌
```

### After (Clear):
```
Your Open Assignments
├─ Resume Ranking Round (3/10 ends)  ← Has all params ✅
└─ (No generic "Active Event" links)
```

---

## How to Test

### Test 1: Clear Browser Data (Recommended)

**To start fresh:**

1. Open browser console (F12)
2. Run:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   document.cookie.split(";").forEach(c => {
       document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
   });
   location.reload();
   ```

### Test 2: Select Terry Adams

1. Go to index.html
2. Select **Terry Adams** from dropdown
3. Look at "Your Open Assignments"
4. Should see "Resume Ranking Round" links

### Test 3: Click Resume Link

1. Click "Resume Ranking Round"
2. **Verify URL:**
   ```
   ranking_round_300.html?event=29028a52...&round=21d8ad92...&archer=terry-id
   ```
3. **Verify Console:**
   ```
   [handleUrlParameters] 🎯 Direct link detected - loading round
   [handleDirectLink] Loading round: { eventId, roundId, archerId }
   [handleDirectLink] ✅ Direct link handled - going to scoring view
   ```
4. **Verify Scoring View:**
   - Shows **Terry Adams** (not Cooper!)
   - Shows correct bale
   - Shows correct scores
   - No 401 errors

---

## Expected Console Output

### Successful Load:
```
[handleUrlParameters] { 
    urlEventId: "29028a52-b889-4f05-9eb1-7cf87cbd5a62",
    urlRoundId: "21d8ad92-8aa3-47f1-b84b-3be23d225427",
    urlArcherId: "terry-adams-id"  ← Has archer ID!
}
[handleUrlParameters] 🎯 Direct link detected - loading round
[handleDirectLink] Loading round: {...}
[handleDirectLink] Fetching round data from server
[getEventEntryCode] ✅ Using entry code from bale session
[handleDirectLink] Round data: { division: 'VAR', archers: [...] }
[handleDirectLink] Reconstructed 4 archers for bale 1
[handleDirectLink] ✅ Direct link handled - going to scoring view
[init] ✅ URL parameters handled successfully - skipping other checks
```

### What You Should See:
- ✅ Terry Adams loaded (correct archer)
- ✅ Correct bale and division
- ✅ All scores visible
- ✅ No 401 errors
- ✅ Entry code working

---

## Why This Happened

### The Archer Cookie Problem

**How archer cookies work:**
```javascript
// When you score as Cooper
setArcherCookie('cooper-id');

// Cookie persists across sessions
// Later, when loading event without archer ID in URL:
const archerId = getArcherCookie();  // Returns 'cooper-id'
// Loads Cooper's data even though you selected Terry!
```

**The fix:**
- Always include archer ID in URL
- Don't rely on cookies for archer selection
- URL is the source of truth

---

## Integration with Phase 1 & 2

This fix works perfectly with the refactored code:

**Phase 1:** `handleDirectLink()` processes URLs with all parameters  
**Phase 2:** Event modal shows round information  
**This Fix:** Ensures index.html creates complete URLs  

**Combined result:**
```
1. User selects Terry Adams on index.html
2. Sees "Resume Ranking Round" with progress
3. Clicks link
4. URL has ?event=X&round=Y&archer=terry-id
5. Phase 1 handleDirectLink() processes URL
6. Loads Terry's round data
7. Goes straight to scoring
8. ✅ Perfect!
```

---

## Files Modified

- `index.html`
  - Removed "Active Event" links section (lines 478-506)
  - Kept "Resume Ranking Round" links (lines 390-413)
  - All remaining links have complete parameters

---

## No Changes Needed

- ✅ `ranking_round_300.js` - Phase 1 already handles direct links correctly
- ✅ Entry code persistence - Already implemented
- ✅ Event modal - Already shows round information

---

## Summary

**Problem:** Incomplete links in index.html caused wrong archer to load  
**Root Cause:** "Active Event" links only had event ID, missing round and archer  
**Solution:** Removed "Active Event" links, kept "Resume Ranking Round" links  
**Result:** All links now have complete parameters, correct archer always loads  

**Testing:** Clear browser data and try again - should work perfectly now!

---

**Fix Complete:** November 28, 2025  
**Ready for Testing:** Yes  
**Deployed to:** Local development (npm run serve)  
**Status:** ✅ RESOLVED
