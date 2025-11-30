# Bug Report - Fresh Round Testing

**Date:** November 28, 2025  
**Test Scenario:** Fresh event, new round, assigned archers  
**Status:** 🐛 MULTIPLE BUGS FOUND

---

## Test Flow

1. ✅ Created new test round
2. ✅ Assigned all archers
3. ✅ Logged in as Terry Adams
4. ✅ Saw assigned round in "Manual Setup" list
5. ❌ **BUG 1:** Clicked round → "No Event Code Stored Anywhere"
6. ❌ **BUG 2:** Ended up on Cooper's card (wrong archer!)
7. ✅ Went to Setup, selected Terry
8. ✅ Started scoring, created 4 ends
9. ✅ Went back to index.html, saw "4/10 ends"
10. ✅ Clicked resume
11. ⚠️ **BUG 3:** Got "No Event Code" error again
12. ✅ But actually loaded correct scorecard (Terry)
13. ✅ Shows "Synced"
14. ❌ **BUG 4:** Score cells have no color (CSS regression)

---

## Bug 1: "No Event Code Stored Anywhere"

### Symptom
When clicking a round from index.html (first time, not started), get error:
```
⚠️ No event code stored anywhere
```

### Root Cause
When loading a round from index.html for the first time, the entry code is not in:
- `localStorage.event_entry_code`
- `current_bale_session.entryCode`
- `event:{eventId}:meta.entryCode`

### Why This Happens
The round was created on the server, but the entry code was never saved to the client's localStorage.

### Expected Flow
1. User creates round on server (or coach assigns them)
2. User clicks link from index.html
3. Link should include entry code: `?event=X&round=Y&archer=Z&code=ABC`
4. OR: User should be prompted for entry code

### Current Flow
1. User clicks link: `?event=X&round=Y&archer=Z` (no code!)
2. `handleDirectLink()` tries to get entry code
3. No entry code found anywhere
4. Shows warning but continues anyway
5. API call fails with 401 if code is required

### Fix Options

**Option 1: Prompt for entry code if missing**
```javascript
if (!entryCode) {
    console.warn('[handleDirectLink] No entry code found');
    const userCode = prompt('Please enter the event code:');
    if (!userCode) {
        alert('Event code is required to load this round.');
        return false;
    }
    entryCode = userCode;
    // Save it everywhere
    localStorage.setItem('event_entry_code', entryCode);
    // ... save to event meta ...
}
```

**Option 2: Show event modal if missing**
```javascript
if (!entryCode) {
    console.warn('[handleDirectLink] No entry code found - showing modal');
    showEventModal();
    return false;
}
```

**Option 3: Include entry code in index.html links**
```javascript
// In index.html loadOpenAssignments()
link: `ranking_round_300.html?event=${round.event_id}&round=${round.round_id}&archer=${archerId}&code=${entryCode}`
```

**Recommended: Option 3** - Include entry code in links

---

## Bug 2: Wrong Archer Loaded (Cooper instead of Terry)

### Symptom
Clicked round for Terry Adams, got Cooper's scorecard.

### Root Cause
Same as before - archer cookie issue.

### Why This Still Happens
Even though we fixed index.html to include archer ID in URL, the issue persists because:
1. URL has correct archer ID
2. `handleDirectLink()` finds correct archer
3. But somewhere in the flow, the archer cookie is being used instead

### Debug Steps Needed
1. Check console logs for the exact flow
2. Verify URL has correct archer ID
3. Check if `handleDirectLink()` finds correct archer
4. Check if `state.archers` is correctly populated
5. Check which archer is shown in scoring view

### Possible Causes
1. `renderView()` uses archer cookie instead of URL param
2. `state.archers` is populated but wrong archer is selected
3. Archer selection logic in scoring view uses cookie

---

## Bug 3: "No Event Code" Error on Resume (But Works)

### Symptom
Clicking "Resume" shows error:
```
⚠️ No event code stored anywhere
```
But the scorecard actually loads correctly!

### Root Cause
The warning is shown even though the entry code is found later in the fallback chain.

### Why This Happens
```javascript
let entryCode = getEventEntryCode();
if (!entryCode) {
    console.warn('⚠️ No event code stored anywhere');  // ← Shows warning
    // But then tries event meta...
    const metaRaw = localStorage.getItem(`event:${eventId}:meta`);
    if (metaRaw) {
        const meta = JSON.parse(metaRaw);
        entryCode = meta.entryCode || '';  // ← Actually finds it here!
    }
}
```

### Fix
Move the warning to AFTER all fallback attempts:
```javascript
let entryCode = getEventEntryCode();
if (!entryCode) {
    // Try event meta
    const metaRaw = localStorage.getItem(`event:${eventId}:meta`);
    if (metaRaw) {
        const meta = JSON.parse(metaRaw);
        entryCode = meta.entryCode || '';
    }
}

// Only warn if STILL not found
if (!entryCode) {
    console.warn('⚠️ No event code stored anywhere');
}
```

---

## Bug 4: Score Cell Colors Lost (CSS Regression)

### Symptom
Score cells in the scorecard have no background colors.

### Expected
- X/10/9: Gold background
- 8/7: Red background
- 6/5: Blue background
- 4/3: Black background
- 2/1: White background
- M: White background

### Actual
All cells have white/gray background (no color).

### Root Cause
Yesterday's fix for score colors was in a different file or got overwritten.

### Files to Check
1. `js/ranking_round_300.js` - `renderScoringView()` or similar
2. `css/` files - Tailwind classes
3. Score cell rendering logic

### Fix Needed
Re-apply the score color classes from yesterday's fix.

---

## Priority

### Critical (P0) - Blocks Usage
1. ❌ **Bug 2:** Wrong archer loaded on first click
   - **Impact:** User can't score for themselves
   - **Workaround:** Go to Setup and manually select archer
   - **Fix:** Debug archer selection flow

### High (P1) - Poor UX
2. ⚠️ **Bug 1:** "No Event Code" error on first load
   - **Impact:** Confusing error message
   - **Workaround:** User can continue anyway (if localhost)
   - **Fix:** Include entry code in links OR prompt user

3. ⚠️ **Bug 4:** Score cell colors missing
   - **Impact:** Poor visual feedback
   - **Workaround:** None (cosmetic issue)
   - **Fix:** Re-apply color classes

### Low (P2) - Cosmetic
4. ℹ️ **Bug 3:** Warning shown but works
   - **Impact:** Confusing console log
   - **Workaround:** Ignore warning
   - **Fix:** Move warning to after fallback attempts

---

## Recommended Fix Order

1. **Fix Bug 2 first** (wrong archer) - Most critical
2. **Fix Bug 1** (entry code) - Include in links
3. **Fix Bug 4** (colors) - Re-apply CSS
4. **Fix Bug 3** (warning) - Move warning

---

## Testing Checklist

After fixes:
- [ ] Create new round with assigned archers
- [ ] Log in as Terry Adams
- [ ] Click round from index.html
- [ ] **Verify:** No "No Event Code" error
- [ ] **Verify:** Terry's scorecard loads (not Cooper's)
- [ ] **Verify:** Score cells have correct colors
- [ ] Score 4 ends
- [ ] Go back to index.html
- [ ] Click "Resume"
- [ ] **Verify:** No warnings
- [ ] **Verify:** Terry's scorecard loads
- [ ] **Verify:** 4 ends visible with correct colors

---

## TODO

- [ ] Fix Bug 2: Wrong archer loaded
- [ ] Fix Bug 1: Entry code not saved/included
- [ ] Fix Bug 4: Score cell colors (CSS regression)
- [ ] Fix Bug 3: Warning message timing
- [ ] Add entry code to index.html links
- [ ] Test full flow end-to-end

---

**Status:** Bugs documented, fixes in progress  
**Next Step:** Debug Bug 2 (wrong archer) with console logs
