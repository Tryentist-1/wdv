# Live Sync Flow for New Rounds

**Date:** December 1, 2025  
**Status:** Analysis Complete  
**Issue:** Understanding how Live Sync works when creating a new round from scratch

---

## Flow Overview

### Scenario 1: Clicking "Ranking Round" from index.html

**Step 1: Navigation**
- User clicks "Ranking Round" link → navigates to `ranking_round_300.html` (no URL parameters)
- `init()` function runs

**Step 2: Initialization**
- Checks for URL parameters (none in this case)
- Checks for existing session (`current_bale_session`) - if found, shows resume dialog
- If no session, shows event selection modal

**Step 3: Event Selection**
- User selects event from dropdown OR enters event code
- `handleEventSelection()` is called (line 527)
- Calls `loadEventById(eventId, event.name, event.entryCode || '')` (line 540)

**Step 4: Loading Event Data**
- `loadEventById()` fetches event snapshot from `/v1/events/{eventId}/snapshot`
- Tries to get entry code from:
  1. Parameter passed in (`event.entryCode` - might be empty if `/events/recent` doesn't return codes)
  2. Event snapshot response (`eventData.event?.entry_code`)
  3. localStorage (saved from previous session)
- **Saves entry code to localStorage** (lines 5804-5805):
  ```javascript
  if (finalEntryCode) {
      localStorage.setItem('event_entry_code', finalEntryCode);
      localStorage.setItem(`event:${eventId}:meta`, JSON.stringify({...entryCode: finalEntryCode}));
  }
  ```

**Step 5: User Setup**
- User selects division
- User selects archers (manual mode) OR selects bale (pre-assigned mode)
- User clicks "Start Scoring" button

**Step 6: Starting Scoring**
- `ensureLiveRoundReady({ promptForCode: true })` is called (line 6881)
- Checks for entry code:
  1. `getEventEntryCode()` - checks localStorage
  2. If not found AND no coach key → prompts user (line 5072-5089)
- Creates new round via `LiveUpdates.ensureRound()` (line 5192-5193)
- POST `/v1/rounds` with:
  - `roundType: 'R300'`
  - `date: today`
  - `division: state.selectedDivision`
  - `gender, level: from archers`
  - `eventId: state.activeEventId || null`
- **Round creation requires auth:**
  - If `eventId !== null` → requires entry code or coach key
  - If `eventId === null` (standalone) → no auth required

**Step 7: Live Sync Enabled**
- Round ID stored in `LiveUpdates._state.roundId`
- Archers registered via `LiveUpdates.ensureArcher()`
- Scores sync automatically when entered

---

### Scenario 2: Clicking "New Round" Button

**Step 1: User Action**
- User clicks "New Round" button in resume dialog
- `handleNewRound()` is called (line 1095)
- Clears `current_bale_session` from localStorage
- Shows event selection modal

**Step 2-7: Same as Scenario 1**
- Follows same flow from event selection onwards

---

## Entry Code Sources

### When Entry Code is Available

1. **From Event Selection** (if `/events/recent` returns it)
   - `event.entryCode` passed to `loadEventById()`
   - Saved to localStorage

2. **From Event Snapshot** (if API returns it)
   - `eventData.event?.entry_code` extracted
   - Saved to localStorage

3. **From Previous Session**
   - `localStorage.getItem('event_entry_code')`
   - `localStorage.getItem('event:{eventId}:meta').entryCode`

4. **User Prompt** (fallback)
   - If no entry code found and no coach key
   - `prompt('Enter Event Code to enable Live Sync:')` (line 5073)
   - User manually enters code

---

## Potential Issues

### Issue 1: Entry Code Not in `/events/recent` Response
**Problem:** The `/events/recent` endpoint might not return entry codes for security reasons.

**Current Behavior:**
- `handleEventSelection()` calls `loadEventById()` with empty entry code
- `loadEventById()` tries to get it from snapshot or localStorage
- If not found, user will be prompted when starting scoring

**Impact:** User might see prompt even after selecting an event

### Issue 2: Event Snapshot Doesn't Include Entry Code
**Problem:** Event snapshot might be public and not include entry code.

**Current Behavior:**
- Falls back to localStorage
- If not in localStorage, prompts user

**Impact:** User might see prompt even after selecting an event

### Issue 3: Standalone Rounds
**Problem:** Standalone rounds don't require entry code for round creation.

**Current Behavior:**
- `eventId === null` → no auth required for POST `/v1/rounds`
- Entry code not needed for round creation
- But might be needed for other operations

**Impact:** Standalone rounds work without entry code

---

## Recommendations

### Fix 1: Ensure Entry Code is Saved When Event is Selected
**Current:** Entry code is saved in `loadEventById()` (lines 5804-5805)

**Status:** ✅ Already implemented

### Fix 2: Check Entry Code Before Prompting
**Current:** `ensureLiveRoundReady()` checks `getEventEntryCode()` which looks in:
1. `localStorage.getItem('event_entry_code')`
2. Event metadata: `event:{eventId}:meta`
3. Bale session: `current_bale_session`

**Status:** ✅ Already implemented

### Fix 3: Improve Entry Code Discovery
**Enhancement:** When event is selected, try to fetch entry code from:
1. Event metadata (already done)
2. Event snapshot response (already done)
3. **NEW:** Query `/v1/events/{eventId}` if available (might return entry code)

**Status:** ⚠️ Could be improved

---

## Summary

**For NEW rounds:**
1. Entry code should be saved when event is selected (via `loadEventById()`)
2. Entry code is checked before prompting (via `getEventEntryCode()`)
3. If not found, user is prompted (expected behavior for first-time access)
4. Once entered, entry code is saved for future use

**The flow is working as designed**, but entry codes might not always be available from the API endpoints, which is why the prompt exists as a fallback.

