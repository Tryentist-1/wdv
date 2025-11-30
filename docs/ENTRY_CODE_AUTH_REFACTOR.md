# Entry Code Authentication Refactor - Analysis and Fix

**Date:** November 28, 2025  
**Issue:** Entry code not properly stored/retrieved during resume, causing 401 Unauthorized errors  
**Status:** 🔍 ANALYSIS → 🔧 FIX NEEDED

---

## Problem Analysis

### Current Failure Scenario

From the screenshot, the console shows:
```
[LiveUpdates] No coach key or entry code available; request may fail.
Live Updates unauthorized
Failed to load resource: 401 (Unauthorized)
```

### Root Cause

**Entry code is not being saved with the bale session**, causing it to be unavailable during resume.

**Flow:**
```
1. User enters event via QR code or manual entry
   - Entry code stored in localStorage.event_entry_code ✅
   
2. User starts scoring
   - saveCurrentBaleSession() called
   - Saves: roundId, baleNumber, archerIds, division
   - ❌ Does NOT save entry code!
   
3. User reloads page
   - restoreCurrentBaleSession() called
   - Tries to get entry code from:
     a. localStorage.event_entry_code (may be cleared)
     b. event:{eventId}:meta.entryCode (may not exist)
   - ❌ Entry code not found → 401 Unauthorized
```

### Multiple Entry Code Storage Locations

The code currently stores entry codes in **3 different places**:

1. **`localStorage.event_entry_code`** - Global entry code (single value)
2. **`localStorage.event:{eventId}:meta`** - Event metadata with entryCode
3. **`current_bale_session`** - Session data (❌ currently missing entryCode)

**Problem:** These can get out of sync, especially when:
- User clears cache
- User switches events
- User resumes on different device

---

## Proposed Solution

### Strategy: Store Entry Code in Bale Session

**Principle:** The bale session should be **self-contained** and include everything needed to resume.

### Changes Needed

#### 1. Save Entry Code with Bale Session

**File:** `js/ranking_round_300.js`  
**Function:** `saveCurrentBaleSession()` (line 677)

**Current:**
```javascript
const session = {
    archerId: archerId,
    eventId: state.activeEventId || state.selectedEventId,
    roundId: roundId,
    baleNumber: state.baleNumber,
    currentEnd: state.currentEnd,
    assignmentMode: state.assignmentMode,
    lastSaved: new Date().toISOString(),
    archerIds: state.archers.map(a => a.id),
    divisionCode: state.divisionCode,
    divisionRoundId: state.divisionRoundId
    // ❌ Missing: entryCode
};
```

**Fixed:**
```javascript
const session = {
    archerId: archerId,
    eventId: state.activeEventId || state.selectedEventId,
    roundId: roundId,
    baleNumber: state.baleNumber,
    currentEnd: state.currentEnd,
    assignmentMode: state.assignmentMode,
    lastSaved: new Date().toISOString(),
    archerIds: state.archers.map(a => a.id),
    divisionCode: state.divisionCode,
    divisionRoundId: state.divisionRoundId,
    // ✅ CRITICAL FIX: Include entry code for authentication on resume
    entryCode: getEventEntryCode()
};
```

#### 2. Use Saved Entry Code During Restore

**File:** `js/ranking_round_300.js`  
**Function:** `restoreCurrentBaleSession()` (line 774-782)

**Current:**
```javascript
// Get event entry code for authentication
const entryCode = localStorage.getItem('event_entry_code') ||
    (state.activeEventId ? (JSON.parse(localStorage.getItem(`event:${state.activeEventId}:meta`) || '{}').entryCode) : null);

if (!entryCode) {
    console.warn('[Phase 0 Session] No entry code found, cannot restore session');
    localStorage.removeItem('current_bale_session');
    return false;
}
```

**Fixed:**
```javascript
// Get event entry code for authentication
// Priority: 1) Saved in session, 2) Global storage, 3) Event meta
const entryCode = session.entryCode ||
    localStorage.getItem('event_entry_code') ||
    (session.eventId ? (JSON.parse(localStorage.getItem(`event:${session.eventId}:meta`) || '{}').entryCode) : null);

if (!entryCode) {
    console.error('[Phase 0 Session] ❌ No entry code found, cannot restore session');
    console.error('[Phase 0 Session] Debug:', {
        sessionEntryCode: session.entryCode,
        globalEntryCode: localStorage.getItem('event_entry_code'),
        eventId: session.eventId,
        hasEventMeta: !!localStorage.getItem(`event:${session.eventId}:meta`)
    });
    localStorage.removeItem('current_bale_session');
    return false;
}

// ✅ Save entry code globally for other components
localStorage.setItem('event_entry_code', entryCode);
console.log('[Phase 0 Session] ✅ Using entry code for authentication');
```

#### 3. Improve getEventEntryCode() Function

**File:** `js/ranking_round_300.js`  
**Function:** `getEventEntryCode()` (line 455)

**Enhanced:**
```javascript
function getEventEntryCode() {
    try {
        // Priority 1: Global entry code
        let code = localStorage.getItem('event_entry_code') || '';
        if (code) {
            console.log('[getEventEntryCode] Using global entry code');
            return code;
        }
        
        // Priority 2: Current bale session
        const sessionData = localStorage.getItem('current_bale_session');
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                if (session.entryCode) {
                    console.log('[getEventEntryCode] Using entry code from bale session');
                    return session.entryCode;
                }
            } catch (e) {
                console.warn('[getEventEntryCode] Could not parse bale session');
            }
        }
        
        // Priority 3: Event metadata from latest session
        let latestKey = null; let latestTs = 0; let stateObj = null;
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('rankingRound300_')) {
                const suffix = k.substring('rankingRound300_'.length);
                const ts = Date.parse(suffix) || 0;
                if (ts >= latestTs) { latestTs = ts; latestKey = k; }
            }
        }
        if (latestKey) {
            stateObj = JSON.parse(localStorage.getItem(latestKey) || '{}');
        }
        const eventId = (stateObj && (stateObj.activeEventId || stateObj.selectedEventId)) || state.activeEventId || state.selectedEventId;
        if (eventId) {
            const metaRaw = localStorage.getItem(`event:${eventId}:meta`);
            if (metaRaw) {
                const meta = JSON.parse(metaRaw);
                if (meta.entryCode) {
                    console.log('[getEventEntryCode] Using entry code from event meta');
                    return meta.entryCode;
                }
            }
        }
        
        console.warn('[getEventEntryCode] ⚠️ No entry code found in any storage location');
    } catch (e) {
        console.error('[getEventEntryCode] Error:', e);
    }
    return '';
}
```

---

## Additional Improvements

### 4. Ensure Entry Code is Saved on Event Load

When loading an event (via QR code or manual entry), ensure entry code is saved in ALL locations:

```javascript
// When event is loaded successfully
function saveEntryCodeEverywhere(eventId, entryCode) {
    if (!entryCode) return;
    
    try {
        // 1. Global storage
        localStorage.setItem('event_entry_code', entryCode);
        
        // 2. Event metadata
        const metaKey = `event:${eventId}:meta`;
        const existingMeta = JSON.parse(localStorage.getItem(metaKey) || '{}');
        existingMeta.entryCode = entryCode;
        localStorage.setItem(metaKey, JSON.stringify(existingMeta));
        
        // 3. Current bale session (if exists)
        const sessionData = localStorage.getItem('current_bale_session');
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                session.entryCode = entryCode;
                localStorage.setItem('current_bale_session', JSON.stringify(session));
            } catch (e) {}
        }
        
        console.log('[saveEntryCode] ✅ Entry code saved to all locations');
    } catch (e) {
        console.error('[saveEntryCode] Error:', e);
    }
}
```

### 5. Add Entry Code Validation

Before making API calls, validate entry code exists:

```javascript
function validateEntryCode() {
    const code = getEventEntryCode();
    if (!code) {
        console.error('[validateEntryCode] ❌ No entry code available');
        alert('Event entry code is missing. Please reconnect to the event.');
        return false;
    }
    return true;
}
```

---

## Testing Plan

### Test 1: Normal Flow
1. Enter event via QR code
2. Start scoring, score 3 ends
3. Reload page
4. **Verify:** Resume works without prompting for entry code
5. **Verify:** Console shows `✅ Using entry code for authentication`

### Test 2: Cache Cleared
1. Enter event, start scoring
2. Clear `localStorage.event_entry_code` only
3. Reload page
4. **Verify:** Resume still works (uses entry code from bale session)

### Test 3: Cross-Device
1. Device A: Enter event, start scoring
2. Device B: Enter same event with same entry code
3. Device B: Resume session
4. **Verify:** Works without re-entering entry code

### Test 4: Entry Code Validation
1. Manually corrupt entry code in localStorage
2. Try to resume
3. **Verify:** Clear error message
4. **Verify:** Doesn't fail silently

---

## Implementation Priority

**High Priority:**
1. ✅ Save entry code in bale session (Fix #1)
2. ✅ Use saved entry code during restore (Fix #2)

**Medium Priority:**
3. ✅ Improve getEventEntryCode() with logging (Fix #3)
4. ✅ Save entry code everywhere on event load (Fix #4)

**Low Priority:**
5. ⚠️ Add entry code validation (Fix #5)

---

## Summary

**Root Cause:** Entry code not saved with bale session  
**Solution:** Save entry code in `current_bale_session` and use it during restore  
**Benefits:**
- ✅ Self-contained session (can resume without external dependencies)
- ✅ Works across cache clears
- ✅ Better debugging with console logs
- ✅ Fallback chain for maximum resilience

**Files to Modify:**
- `js/ranking_round_300.js` (3 functions)

**Breaking Changes:** None (additive only)
