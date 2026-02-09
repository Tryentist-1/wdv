# Bracket Creation Issues - Analysis & Solutions

**Date:** 2026-02-07  
**Branch:** `feature/bracket-workflow-update`  
**Status:** 🔴 INVESTIGATING

---

## 🔍 Issue Report

User reports: **"Brackets not being created and not working"**

---

## 📊 Investigation Results

### 1. ✅ Frontend Code EXISTS
- `coach.html` lines 527-601: Create Bracket modal HTML
- `js/coach.js` lines 2648-2785: Create bracket logic
- Modal structure is correct
- Button handlers are wired up

### 2. ✅ API Endpoint EXISTS  
- `api/index.php` line 7135: `POST /v1/events/:id/brackets`
- Validation logic present
- Bracket creation code present
- UUID generation works

### 3. ✅ Test Data Script EXISTS
- `api/seed_test_data.php` - Generates completed ranking round scores
- See `HOW_TO_SEED_TEST_DATA.md` for usage

---

## 🧪 Testing Needed

### Step 1: Check if bracket modal opens
```javascript
// In browser console on coach.html
console.log(document.getElementById('create-bracket-modal'));
// Should show the modal element

// Try to open it manually
document.getElementById('create-bracket-btn').click();
// Does modal appear?
```

### Step 2: Check for JavaScript errors
```
1. Open coach.html
2. Open browser DevTools (F12)
3. Go to Console tab
4. Click "Edit" on an event
5. Click "Create Bracket"
6. Look for red errors in console
```

### Step 3: Test API endpoint directly
```bash
# Get an event ID first
curl -H "X-API-Key: wdva26" http://localhost:8001/api/v1/events | jq '.events[0].id'

# Try to create a bracket
curl -X POST -H "X-API-Key: wdva26" -H "Content-Type: application/json" \
  -d '{"bracketType":"SOLO","bracketFormat":"ELIMINATION","division":"BVAR","bracketSize":8,"mode":"OPEN"}' \
  http://localhost:8001/api/v1/events/YOUR_EVENT_ID_HERE/brackets

# Should return bracket ID or error
```

---

## 🐛 Possible Root Causes

### 1. Modal Not Opening (CSS/JS Issue)
**Symptoms:**
- Click "Create Bracket" button
- Nothing happens
- No modal appears

**Fix:**
```javascript
// Check if using old .style.display or new classList
// Should be: modal.style.display = 'flex';
// Line 2655 in coach.js
```

### 2. API Route Not Matching
**Symptoms:**
- Modal opens
- Fill out form
- Click "Create Bracket"
- Error: "Not Found" or 404

**Fix:**
- Check `api/index.php` line 7135
- Verify regex pattern matches
- Check route_debug.txt for actual route being hit

### 3. Validation Errors
**Symptoms:**
- Modal opens
- Fill out form
- Click "Create Bracket"
- Error message about invalid data

**Fix:**
- Check division codes match (BV vs BVAR)
- Verify event ID is valid
- Check required fields are filled

### 4. Division Code Mismatch
**Symptoms:**
- Bracket created
- "Generate from Top 8" fails
- Error: "No archers found"

**Issue:**
- Brackets use: BV, GV, BJV, GJV
- Rounds use: BVAR, GVAR, BJV, GJV  
- Mismatch causes seeding to fail

**Fix:**
```php
// api/index.php line 7821-7830
// Normalization code EXISTS:
if ($division === 'BV') $searchDivision = 'BVAR';
if ($division === 'GV') $searchDivision = 'GVAR';
// etc.
```

### 5. Event ID Not Set
**Symptoms:**
- Click "Create Bracket"
- Alert: "No event selected"

**Fix:**
- Verify `currentEditEventId` is set when editing event
- Check edit event modal sets this variable

---

## 🔧 Quick Diagnostic Script

Run this in browser console on coach.html:

```javascript
// Diagnostic: Check bracket creation setup
console.log('=== BRACKET DIAGNOSTIC ===');

// 1. Check modal exists
const modal = document.getElementById('create-bracket-modal');
console.log('Modal exists:', !!modal);

// 2. Check button exists
const btn = document.getElementById('create-bracket-btn');
console.log('Button exists:', !!btn);

// 3. Check onclick handler
console.log('Button has onclick:', typeof btn?.onclick);

// 4. Check currentEditEventId
console.log('Current event ID:', window.coach?.currentEditEventId || 'NOT SET');

// 5. Try to open modal manually
if (modal) {
  modal.style.display = 'flex';
  console.log('Modal opened manually');
}

// 6. Check API base URL
console.log('API Base:', '/api/v1');

// 7. List all bracket-related elements
console.log('Bracket elements:', {
  'create-modal': !!document.getElementById('create-bracket-modal'),
  'edit-modal': !!document.getElementById('edit-bracket-modal'),
  'type-select': !!document.getElementById('bracket-type'),
  'format-select': !!document.getElementById('bracket-format'),
  'division-select': !!document.getElementById('bracket-division'),
  'size-input': !!document.getElementById('bracket-size')
});
```

---

## 🎯 Most Likely Issues

Based on typical problems:

### 1. **Modal display issue** (60% probability)
- Using `classList` instead of `style.display`
- Tailwind `hidden` class interference
- Z-index conflicts

### 2. **Event ID not set** (20% probability)
- `currentEditEventId` is null
- Need to click "Edit" on event first

### 3. **API validation error** (15% probability)
- Invalid division code
- Missing required field

### 4. **Route not matched** (5% probability)
- API routing issue
- Nginx/Apache config

---

## ✅ Action Items

### For User to Test:

1. **Open browser console** (F12)
2. **Run diagnostic script** (above)
3. **Try to create bracket** and watch for errors
4. **Report back:**
   - Does modal open?
   - Any console errors?
   - What error message appears?

### For AI to Fix:

Based on test results, likely fixes:
- Update modal display code
- Fix event ID tracking
- Add better error messages
- Fix division code mapping

---

## 📝 Related Files

- `coach.html` - Bracket modal HTML
- `js/coach.js` - Bracket creation logic
- `api/index.php` - Bracket API endpoints
- `api/seed_test_data.php` - Test data generator

---

**Next Steps:** Run diagnostics and report results

---

**Last Updated:** 2026-02-07  
**Status:** 🔴 AWAITING USER DIAGNOSTIC
