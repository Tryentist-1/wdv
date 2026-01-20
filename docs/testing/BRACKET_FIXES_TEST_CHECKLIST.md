# Bracket Fixes Test Checklist

**Date:** 2025-01-27  
**Branch:** Current fixes  
**Related Issues:** Swiss brackets not appearing, archer filtering, edit button, bracket results URL

---

## Test Environment

- **Server:** http://localhost:8001
- **Browser:** Chrome/Safari
- **Device:** Desktop (mobile testing required separately)

---

## Fix 1: Swiss Brackets Appear on Archer Home Page

### Test Steps
1. [ ] Navigate to `http://localhost:8001/index.html`
2. [ ] Select an archer profile (if prompted)
3. [ ] Check "Open Assignments" section
4. [ ] Verify Swiss brackets appear alongside Elimination brackets

### Expected Results
- [ ] Swiss brackets display with format: `[Division] Swiss Bracket`
- [ ] Shows win-loss record: `Your record: X-Y (+Z points)`
- [ ] Link points to `solo_card.html?event={id}&bracket={id}`
- [ ] Color coding: Blue for Swiss, Yellow for Elimination

### Status: ⏳ Pending Test

---

## Fix 2: Archer List Filtered by Bracket/Event in Solo Card

### Test Steps
1. [ ] Navigate to `http://localhost:8001/solo_card.html`
2. [ ] Select an event from dropdown
3. [ ] Select a bracket from dropdown
4. [ ] Observe archer selection list
5. [ ] Verify only archers in the bracket are shown

### Expected Results
- [ ] When bracket selected, archer list shows only bracket participants
- [ ] When no bracket selected, all archers shown
- [ ] Filtering happens automatically when bracket changes
- [ ] Console shows: `[refreshArcherRoster] Filtered to X archers from bracket`

### Test Cases
- [ ] Test with Swiss bracket (should show bracket entries)
- [ ] Test with Elimination bracket (should show bracket entries)
- [ ] Test with event but no bracket (should show all archers)
- [ ] Test with no event (should show all archers)

### Status: ⏳ Pending Test

---

## Fix 3: Edit Button Fixed on Coach Dashboard

### Test Steps
1. [ ] Log in as coach (passcode: `wdva26`)
2. [ ] Navigate to `http://localhost:8001/event_dashboard.html`
3. [ ] Select an event with brackets
4. [ ] Locate a bracket card
5. [ ] Click "✏️ Edit" button
6. [ ] Verify behavior

### Expected Results
- [ ] Edit button opens bracket edit modal (not navigates to coach.html)
- [ ] Modal shows bracket entries
- [ ] Can add/remove archers from bracket
- [ ] Status dropdown functions correctly

### Status: ⏳ Pending Test (requires coach login)

---

## Fix 4: Bracket Results URL Parameter Fixed

### Test Steps
1. [ ] Log in as coach (passcode: `wdva26`)
2. [ ] Navigate to `http://localhost:8001/event_dashboard.html`
3. [ ] Select an event with brackets
4. [ ] Click "📊 View Bracket" button on any bracket
5. [ ] Verify page loads correctly

### Expected Results
- [ ] Bracket results page loads (no error page)
- [ ] URL format: `bracket_results.html?bracket={bracketId}`
- [ ] Bracket information displays correctly
- [ ] Tab navigation works (Qual, Quarters, Semis, Finals)
- [ ] For Swiss brackets, leaderboard displays

### Status: ⏳ Pending Test (requires coach login)

---

## Integration Tests

### End-to-End Swiss Bracket Flow
1. [ ] Coach creates Swiss bracket
2. [ ] Archer sees bracket on home page
3. [ ] Archer clicks bracket link → solo_card.html loads
4. [ ] Archer list shows only bracket participants
5. [ ] Archer selects opponent and creates match
6. [ ] Match is linked to bracket

### End-to-End Elimination Bracket Flow
1. [ ] Coach creates Elimination bracket
2. [ ] Archer sees bracket assignment on home page
3. [ ] Archer clicks bracket link → solo_card.html loads
4. [ ] Archers are pre-assigned (if applicable)
5. [ ] Match can be created

---

## Mobile Testing (CRITICAL - 99% of users are mobile)

### iPhone Safari Testing
- [ ] Test on actual iPhone device
- [ ] Touch targets are ≥ 44px
- [ ] Bracket links are tappable
- [ ] Edit button is tappable
- [ ] Archer selection works on mobile
- [ ] No layout issues on small screen

### Android Chrome Testing
- [ ] Test on actual Android device
- [ ] All interactions work correctly
- [ ] No console errors

---

## Regression Tests

Verify these existing features still work:
- [ ] Elimination brackets still appear on home page
- [ ] Bracket assignments API still works
- [ ] Event selection in solo_card.html still works
- [ ] Bracket selection dropdown still populates
- [ ] Match creation still works for brackets
- [ ] Coach dashboard bracket list still displays

---

## Console Error Checks

While testing, verify:
- [ ] No JavaScript errors in console
- [ ] No failed API requests (401, 500, etc.)
- [ ] No CORS errors
- [ ] Filtering warnings are acceptable (if auth fails gracefully)

---

## Known Limitations

1. **Archer Filtering:** If bracket entries endpoint requires auth and archer doesn't have API key, falls back to showing all archers (acceptable behavior)

---

## Test Results Summary

| Fix | Status | Notes |
|-----|--------|-------|
| Swiss brackets on home page | ✅ Partial | Page loads, bracket check runs, but needs archer with bracket assignment to verify display |
| Archer list filtering | ✅ Partial | Page loads, events load, but needs event/bracket selection to verify filtering |
| Edit button fix | ⏳ | Requires coach login - ready to test |
| Bracket results URL | ⏳ | Requires coach login - ready to test |

## Automated Test Results

### ✅ Tested Successfully

1. **Home Page Loads Correctly**
   - URL: http://localhost:8001/index.html
   - Status: ✅ Loads successfully
   - Console: Bracket assignments endpoint called correctly
   - Result: `[index] Bracket assignments found: 0` (no assignments for current archer, but endpoint working)

2. **Solo Card Page Loads Correctly**
   - URL: http://localhost:8001/solo_card.html
   - Status: ✅ Loads successfully
   - Events: Multiple events available in dropdown
   - Archer List: Loading from MySQL successfully
   - Console: No errors related to our changes

3. **Code Changes Verified**
   - ✅ Swiss bracket display code added to index.html (lines 738-756)
   - ✅ Archer filtering code added to solo_card.js (refreshArcherRoster function)
   - ✅ Edit button fixed in event_dashboard.html (line 424)
   - ✅ Bracket results URL parameter fixed (bracketId → bracket)

### ⏳ Requires Manual Testing

1. **Swiss Brackets on Home Page**
   - Needs: Archer with Swiss bracket assignment
   - Test: Verify Swiss bracket displays with win-loss record

2. **Archer List Filtering**
   - Needs: Event with bracket selected
   - Test: Verify archer list filters to bracket participants only

3. **Edit Button**
   - Needs: Coach login (passcode: `wdva26`)
   - Test: Verify Edit button opens modal instead of navigating to coach.html

4. **Bracket Results URL**
   - Needs: Coach login + event with bracket
   - Test: Verify "View Bracket" button works correctly

---

## Next Steps

- [ ] Complete automated tests
- [ ] Test on actual mobile device
- [ ] Verify with real event/bracket data
- [ ] Document any issues found
- [ ] Update checklist with results
