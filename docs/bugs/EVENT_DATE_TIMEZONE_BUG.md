# Event Date Bug: Wrong Date Due to Timezone Issue

**Date:** 2025-01-27
**Page/Module:** `coach.html` / `js/coach.js`
**Severity:** Medium
**Status:** ✅ Fixed

---

## 🐛 Bug Description

**What's broken:**
When creating a new event in the coach console, the default date shown in the date input field is incorrect - it shows yesterday's date instead of today's date.

**User Impact:**
- Users create events with the wrong date by default
- Requires manual correction of the date field
- Confusing UX - users expect today's date to be the default
- Affects all users in timezones behind UTC (like US timezones)

**Environment:**
- Page: `coach.html` (Coach Console)
- Element: Event creation modal date input field
- Affected: Users in timezones behind UTC (e.g., Pacific, Mountain, Central, Eastern US)

---

## 🔍 Steps to Reproduce

1. Navigate to `coach.html`
2. Click "Create Event" button
3. Observe the date input field
4. **Observe:** Date shows yesterday's date (e.g., if today is Jan 27, shows Jan 26)
5. **Expected:** Date should show today's date

**Example:**
- Current time: 11:00 PM Jan 27, 2025 (Pacific Time, UTC-8)
- UTC time: 7:00 AM Jan 28, 2025
- **Bug:** Date input shows "2025-01-26" (yesterday)
- **Expected:** Date input shows "2025-01-27" (today)

---

## 🔍 Root Cause Analysis

### The Problem

The code was using `new Date().toISOString().split('T')[0]` to get today's date. The `toISOString()` method returns a UTC date/time string, which can be a different date than the local date.

**Example:**
- Local time: 11:00 PM Jan 27, 2025 (Pacific Time, UTC-8)
- UTC time: 7:00 AM Jan 28, 2025
- `toISOString()` returns: "2025-01-28T07:00:00.000Z"
- After `split('T')[0]`: "2025-01-28" (tomorrow in UTC, but still today locally)

However, if the local time is early in the day (before UTC midnight), it could show yesterday's date:
- Local time: 1:00 AM Jan 27, 2025 (Pacific Time, UTC-8)
- UTC time: 9:00 AM Jan 26, 2025
- `toISOString()` returns: "2025-01-26T09:00:00.000Z"
- After `split('T')[0]`: "2025-01-26" (yesterday in UTC, but today locally)

### Code Flow

```javascript
// BEFORE (buggy code)
dateInput.value = new Date().toISOString().split('T')[0];
```

This uses UTC time, which can be a different date than local time.

### Why This Happens

JavaScript's `toISOString()` method always returns UTC time, regardless of the user's local timezone. For users in timezones behind UTC (like US timezones), the UTC date can be different from the local date.

---

## ✅ Solution

### Fix Strategy

Use local date methods (`getFullYear()`, `getMonth()`, `getDate()`) instead of UTC methods to format the date in the user's local timezone.

### Implementation

**File:** `js/coach.js`
**Location:** 
- Helper function: Lines ~27-35 (new `getLocalDateString()` function)
- Usage: Line ~376 (updated date input default value)

**Changes:**
1. Added `getLocalDateString()` helper function that uses local date methods
2. Updated `showCreateEventModal()` to use the new helper function instead of `toISOString()`

### Code Changes

**Before:**
```javascript
dateInput.value = new Date().toISOString().split('T')[0];
```

**After:**
```javascript
/**
 * Get today's date in local timezone as YYYY-MM-DD format
 * Uses local date methods to avoid timezone issues with toISOString()
 * @returns {string} Date string in YYYY-MM-DD format
 */
function getLocalDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// In showCreateEventModal():
dateInput.value = getLocalDateString(); // Use local timezone to avoid date offset issues
```

---

## 🧪 Testing Plan

### Test Cases

1. **Basic Date Test**
   - Open coach console
   - Click "Create Event"
   - **Expected:** Date input shows today's date in local timezone

2. **Timezone Test (if possible)**
   - Change system timezone to different timezone
   - Open coach console
   - Click "Create Event"
   - **Expected:** Date input shows today's date in the current timezone

3. **Edge Case: Midnight**
   - Test at different times of day
   - **Expected:** Date always shows correct local date, regardless of UTC time

### Test Devices

- Desktop browser (Chrome, Safari, Firefox)
- Mobile device (if applicable)
- Different timezones (if possible)

---

## 📋 Implementation Checklist

- [x] Root cause identified
- [x] Fix implemented
- [x] Code tested locally
- [ ] Mobile device tested (if applicable)
- [x] Documentation updated
- [x] Ready for deployment

---

## 🔗 Related Issues

- Similar timezone issues may exist in other date handling code
- Check other uses of `toISOString().split('T')[0]` in the codebase
- Consider creating a shared utility function for local date formatting

---

## 📝 Notes

**Other files with similar patterns:**
- `js/team_card.js` - Line 34, 292, 1347
- `js/ranking_round.js` - Line 33, 1411, 1549, 1801
- `js/ranking_round_300.js` - Multiple locations
- `js/solo_card.js` - Line 32, 580, 1107
- `js/live_updates.js` - Line 772

These may need similar fixes if they're used for date input defaults or user-facing dates. However, some uses (like session keys or timestamps) may intentionally use UTC.

---

**Status:** ✅ Fixed
**Priority:** Medium
**Fix Applied:** 2025-01-27
**Files Changed:**
- `js/coach.js` - Added `getLocalDateString()` helper and updated date input default
