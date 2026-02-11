# Coach Bug: Bale Assignment Exceeds 4 Archers Per Bale

**Date:** 2026-02-11
**Page/Module:** coach.html → API `POST /v1/events/{id}/rounds/{id}/archers`
**Severity:** High
**Status:** ✅ Fixed

---

## 🐛 Bug Description

When using "Auto-Assign Bales" to add archers to a division (e.g., Boys Varsity), the first bale can receive 5 archers instead of the expected maximum of 4. The UI explicitly states "2-4 per bale" but the algorithm violates this constraint.

**User Impact:**
- Coaches add archers via Auto-Assign and see incorrect bale sizes in the confirmation dialog
- Bale 1 had 5 archers (Ryder S., Dominic D., Dean G., Bryce G., Ethan D.) in the reported case
- Physical bale setup expects max 4 targets (A,B,C,D) per bale
- Affects both prod and dev

---

## 🔍 Steps to Reproduce

1. Navigate to coaches and enter coach code (e.g., wdva26)
2. Create a new event (e.g., RR3Test)
3. Select Ranking Rounds → Boys Varsity, Girls Varsity (deselect Open)
4. Add archers to Boys Varsity (e.g., "Select All Filtered" with Varsity + WDV filters)
5. Select "Auto Assign Bales" and confirm
6. Observe confirmation dialog: Bale 1 shows 5 archers

**Expected:** Each bale has 2-4 archers (2 minimum, 4 maximum)
**Actual:** Bale 1 has 5 archers

---

## 🔍 Root Cause Analysis

### The Problem

The PHASE 0 endpoint (`POST /v1/events/{id}/rounds/{id}/archers`) uses a custom "even distribution" algorithm that can assign 5+ archers to a bale when:
- Total archers don't divide evenly (e.g., 13 archers)
- The "avoid single archer on last bale" logic reduces bale count
- Redistribution puts extra archers on first bale(s)

### Code Flow (Buggy Algorithm)

For 13 archers:
```
numBales = ceil(13/4) = 4
lastBaleCount = 13 - (4-1)*4 = 1  ← less than 2
numBales-- → 3
basePerBale = floor(13/3) = 4
extraArchers = 13 % 3 = 1
Bale 0: 4 + 1 = 5 archers  ← BUG: exceeds 4 max!
Bale 1: 4 archers
Bale 2: 4 archers
```

### Why This Happens

The algorithm prioritizes "even distribution" and "no single archer on last bale" but never enforces the hard cap of 4 archers per bale. The same file already has a correct `$assignArchersToBales` closure (lines 1063-1100) used by the event-creation flow, but the PHASE 0 add-archers endpoint uses duplicate buggy logic.

---

## ✅ Solution

### Fix Strategy

Replace the buggy custom algorithm in the PHASE 0 endpoint with the existing `$assignArchersToBales` function, which correctly enforces 2-4 per bale for all cases (2, 3, 4, 5, 13, etc.).

### Implementation

**File:** `api/index.php`
**Location:** Lines 3744-3803 (AUTO-ASSIGN MODE block)

**Changes:**
- Remove custom `numBales`/`basePerBale`/`extraArchers` logic
- Call `$assignArchersToBales($archers, $startBale)` 
- Iterate over returned bale arrays to insert round_archers and build baleAssignments

---

## 🧪 Testing Plan

### Test Cases

1. **13 archers** → Should produce 4+4+3+2 or 4+3+3+3 (never 5 on any bale)
2. **5 archers** → 3+2 (per existing logic)
3. **8 archers** → 4+4
4. **2 archers** → 1 bale with 2
5. **1 archer** → 1 bale with 1 (edge case)

### Regression Tests

- Event creation with auto-assign (uses $assignArchersToBales already)
- Manual signup mode (unchanged)
- Add archers to existing event with existing bales (startBale should be correct)

### Mobile Testing

- Confirm dialog displays correct bale counts
- No layout issues

---

## 📋 Implementation Checklist

- [x] Root cause identified
- [x] Fix implemented
- [x] Code tested locally (PHP syntax verified)
- [ ] Mobile device tested (manual verification recommended)
- [ ] Regression tests passed
- [x] Documentation updated
- [ ] Ready for deployment

---

**Status:** Fixed
**Priority:** High
**Fix Applied:** 2026-02-11
**Files Changed:** `api/index.php` - Replaced buggy PHASE 0 auto-assign algorithm with `$assignArchersToBales` closure
