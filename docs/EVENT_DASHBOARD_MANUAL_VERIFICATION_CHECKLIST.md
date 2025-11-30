# Event Dashboard - Manual Verification Checklist

**Date:** November 29, 2025  
**Feature:** Event Dashboard Phase 1 MVP  
**Purpose:** Comprehensive manual testing checklist for Event Dashboard

---

## 📋 Pre-Testing Setup

### Test Environment
- [ ] Local development server running (`npm run serve`)
- [ ] OR Production environment accessible
- [ ] Coach Console accessible
- [ ] At least one test event exists (with rounds and/or brackets if possible)

### Test Data Requirements
- [ ] Event with status: "Planned"
- [ ] Event with status: "Active" (for auto-refresh testing)
- [ ] Event with status: "Completed"
- [ ] Event with rounds (at least one)
- [ ] Event with brackets (if available)
- [ ] Event with scorecards (some completed, some not)

---

## ✅ Basic Functionality

### Navigation & Access
- [ ] Can access Coach Console (`coach.html`)
- [ ] Can see "📊 Dashboard" button in events table
- [ ] Clicking Dashboard button navigates to `event_dashboard.html?event={id}`
- [ ] Dashboard page loads without errors
- [ ] No console errors in browser DevTools

### Event Header
- [ ] Event name displays correctly
- [ ] Event date displays in readable format (e.g., "Friday, November 29, 2025")
- [ ] Event status badge displays correctly
  - [ ] "Planned" shows gray badge
  - [ ] "Active" shows green badge
  - [ ] "Completed" shows dark gray badge
- [ ] Overall progress bar displays
- [ ] Overall progress percentage is correct (0-100%)
- [ ] Progress bar width matches percentage
- [ ] "Last updated" timestamp displays
- [ ] Dark mode toggle works

### Quick Stats
- [ ] Rounds stat shows: `completed/total` format
- [ ] Brackets stat shows: `completed/total` format
- [ ] Archers stat shows total count
- [ ] Matches stat shows: `completed/total` format
- [ ] All stats are accurate (match actual data)

---

## 📊 Rounds Section

### Rounds List Display
- [ ] All rounds for event are displayed
- [ ] Rounds are ordered correctly (BVAR, GVAR, BJV, GJV, OPEN)
- [ ] Each round shows:
  - [ ] Division name (e.g., "Boys Varsity - R300")
  - [ ] Progress text (e.g., "14/18 scorecards completed")
  - [ ] Bale count (if applicable)
  - [ ] Average score (if available)
  - [ ] Progress percentage
  - [ ] Progress bar with correct color:
    - [ ] Green for 90%+
    - [ ] Yellow for 50-89%
    - [ ] Orange for <50%

### Round Expansion/Collapse
- [ ] Clicking round header expands/collapses details
- [ ] "Collapse All" / "Expand All" button works
- [ ] Expanded view shows:
  - [ ] Status
  - [ ] Archer count
  - [ ] Bale count
  - [ ] Progress details
  - [ ] Quick action buttons

### Round Quick Actions
- [ ] "📊 View Results" button links to `results.html?event={id}&division={div}`
- [ ] "🛡️ Verify" button links to Coach Console
- [ ] Buttons are clickable and navigate correctly

---

## 🏆 Brackets Section

### Brackets List Display
- [ ] All brackets for event are displayed
- [ ] Each bracket shows:
  - [ ] Bracket type (Solo/Team)
  - [ ] Format (Elimination/Swiss)
  - [ ] Division name
  - [ ] Match progress (e.g., "4/7 matches completed")
  - [ ] Entry count
  - [ ] Progress percentage
  - [ ] Progress bar with correct color

### Bracket Expansion/Collapse
- [ ] Clicking bracket header expands/collapses details
- [ ] "Collapse All" / "Expand All" button works
- [ ] Expanded view shows:
  - [ ] Status
  - [ ] Format
  - [ ] Entry count
  - [ ] Match details
  - [ ] Quick action buttons

### Bracket Quick Actions
- [ ] "📊 View Bracket" button links to `bracket_results.html?bracket={id}`
- [ ] "✏️ Edit" button links to Coach Console
- [ ] Buttons are clickable and navigate correctly

---

## 🔄 Auto-Refresh Functionality

### Auto-Refresh Behavior
- [ ] For "Active" events: Auto-refresh starts automatically
- [ ] For "Planned" events: Auto-refresh does NOT start
- [ ] For "Completed" events: Auto-refresh does NOT start
- [ ] Refresh occurs every 30 seconds (for Active events)
- [ ] "Last updated" timestamp updates on refresh
- [ ] Progress bars update on refresh
- [ ] Stats update on refresh
- [ ] No page flicker or layout shift during refresh

### Manual Refresh
- [ ] "🔄 Refresh" button in header works
- [ ] "🔄 Refresh" button in footer works
- [ ] Manual refresh updates all data
- [ ] "Last updated" timestamp updates immediately

### Auto-Refresh Cleanup
- [ ] Auto-refresh stops when navigating away
- [ ] No memory leaks (check browser DevTools)

---

## 🎨 UI/UX Testing

### Layout & Design
- [ ] Layout is clean and organized
- [ ] Sections are clearly separated
- [ ] Colors are consistent with app theme
- [ ] Text is readable (good contrast)
- [ ] Icons/emojis display correctly
- [ ] Progress bars are visually clear

### Responsive Design (iPad/Tablet)
- [ ] Layout works on iPad (portrait)
- [ ] Layout works on iPad (landscape)
- [ ] Layout works on tablet devices
- [ ] Text is readable at tablet sizes
- [ ] Buttons are appropriately sized (44px minimum)
- [ ] Touch targets are easy to tap

### Desktop Testing
- [ ] Layout works on desktop (1920x1080)
- [ ] Layout works on laptop (1366x768)
- [ ] No horizontal scrolling
- [ ] Content is centered appropriately
- [ ] Max width constraint works

### Dark Mode
- [ ] Dark mode toggle works
- [ ] All text is readable in dark mode
- [ ] Progress bars visible in dark mode
- [ ] Buttons visible in dark mode
- [ ] Background colors appropriate
- [ ] Preference persists on page reload

---

## 🔍 Data Accuracy

### Progress Calculations
- [ ] Overall progress matches expected calculation
- [ ] Round progress percentages are accurate
- [ ] Bracket progress percentages are accurate
- [ ] Progress bars match percentages visually

### Summary Statistics
- [ ] Total rounds count is correct
- [ ] Completed rounds count is correct
- [ ] Total brackets count is correct
- [ ] Completed brackets count is correct
- [ ] Total archers count is correct
- [ ] Total scorecards count is correct
- [ ] Completed scorecards count is correct
- [ ] Total matches count is correct
- [ ] Completed matches count is correct

### Round Details
- [ ] Round status matches database
- [ ] Archer counts are accurate
- [ ] Bale counts are accurate
- [ ] Average scores are accurate (if displayed)
- [ ] Completed scorecards count is correct

### Bracket Details
- [ ] Bracket status matches database
- [ ] Entry counts are accurate
- [ ] Match counts are accurate
- [ ] Completed matches count is correct

---

## ⚠️ Error Handling

### Missing Data
- [ ] Event with no rounds displays "No rounds configured" message
- [ ] Event with no brackets displays "No brackets created" message
- [ ] Event with no archers shows 0 archers (not error)
- [ ] Missing event ID shows error and redirects to Coach Console

### Invalid Data
- [ ] Invalid event ID shows 404 error
- [ ] Error message is user-friendly
- [ ] Error doesn't break page layout

### Network Issues
- [ ] Failed API request shows error message
- [ ] Error message is clear and actionable
- [ ] Page doesn't crash on network error
- [ ] Manual refresh can recover from error

### Edge Cases
- [ ] Event with 0% progress displays correctly
- [ ] Event with 100% progress displays correctly
- [ ] Event with very large numbers (100+ archers) displays correctly
- [ ] Event with special characters in name displays correctly

---

## 🔗 Integration Testing

### Coach Console Integration
- [ ] Dashboard button appears for all events
- [ ] Navigation from Coach Console works
- [ ] "Back to Coach Console" link works
- [ ] Can navigate back and forth without issues

### Results Page Integration
- [ ] "View Results" links work correctly
- [ ] Division filter is passed correctly
- [ ] Results page loads with correct event/division

### Bracket Results Integration
- [ ] "View Bracket" links work correctly
- [ ] Bracket ID is passed correctly
- [ ] Bracket results page loads correctly

### Verify Integration
- [ ] "Verify" button navigates to Coach Console
- [ ] Coach Console opens to correct event
- [ ] Can access verify modal from Coach Console

---

## 📱 Device-Specific Testing

### iPad Testing
- [ ] Test on iPad (Safari)
- [ ] Test on iPad (Chrome)
- [ ] Touch interactions work smoothly
- [ ] No scrolling issues
- [ ] Text is readable
- [ ] Buttons are easy to tap

### Tablet Testing
- [ ] Test on Android tablet (if available)
- [ ] Layout adapts correctly
- [ ] Touch interactions work

### Desktop Testing
- [ ] Test on Chrome
- [ ] Test on Safari
- [ ] Test on Firefox
- [ ] Test on Edge
- [ ] Mouse interactions work
- [ ] Keyboard navigation works (Tab, Enter)

---

## 🐛 Known Issues / Bugs Found

_Use this section to document any issues found during testing:_

1. **Issue:** [Description]
   - **Steps to reproduce:** [Steps]
   - **Expected:** [Expected behavior]
   - **Actual:** [Actual behavior]
   - **Severity:** [High/Medium/Low]
   - **Status:** [Open/Fixed/Deferred]

---

## ✅ Final Verification

### Performance
- [ ] Page loads in < 2 seconds
- [ ] API response time is reasonable (< 1 second)
- [ ] No memory leaks during auto-refresh
- [ ] Smooth animations/transitions

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatible (if applicable)
- [ ] Color contrast meets WCAG standards
- [ ] Focus indicators visible

### Browser Compatibility
- [ ] Works in Chrome (latest)
- [ ] Works in Safari (latest)
- [ ] Works in Firefox (latest)
- [ ] Works in Edge (latest)

### Security
- [ ] Authentication required (coach passcode)
- [ ] No sensitive data exposed
- [ ] API endpoints properly secured

---

## 📝 Test Results Summary

**Date Tested:** _______________  
**Tester:** _______________  
**Environment:** [ ] Local [ ] Production

**Overall Status:**
- [ ] ✅ All tests passing - Ready for production
- [ ] ⚠️ Minor issues found - Fix before production
- [ ] ❌ Critical issues found - Do not deploy

**Issues Found:** _____  
**Critical:** _____  
**High:** _____  
**Medium:** _____  
**Low:** _____

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

## 🚀 Sign-Off

**Ready for Production:** [ ] Yes [ ] No

**Approved By:** _______________  
**Date:** _______________

---

*Last Updated: November 29, 2025*

