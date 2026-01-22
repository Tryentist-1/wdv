# Archer Results Pivot Bug: Multiple Rows Per Archer

**Date:** 2026-01-21
**Page/Module:** `archer_results_pivot.html`
**Severity:** High
**Status:** ✅ Fixed

---

## 🐛 Bug Description

The pivot table is supposed to show **one row per archer** with columns for each round/event. Instead, the same archer appears in multiple rows.

**User Impact:**
- Coaches cannot quickly compare archers across events; duplicates clutter the view.
- Export CSV and summary stats double-count archers.
- Mobile users scroll through redundant rows.

---

## 🔍 Steps to Reproduce

1. Open `http://localhost:8001/archer_results_pivot.html`
2. Ensure multiple events exist with overlapping archers (same person in multiple events).
3. Select rounds and load data.
4. **Observe:** Same archer (e.g. "Jane Smith") appears multiple times.
5. **Expected:** One row per archer; round scores in columns.

---

## 🔍 Root Cause Analysis

### The Problem

Deduplication uses a composite key `firstName_lastName_school` (lowercased). The same archer can have **different `school` or name** across events (e.g. one `round_archer` has school, another missing), producing different keys → separate map entries → multiple rows.

### Code Flow

```javascript
// archer_results_pivot.html, loadAllData()
const key = `${archer.firstName || ''}_${archer.lastName || ''}_${archer.school || ''}`.toLowerCase();
if (!archerMap.has(key)) {
  archerMap.set(key, { ... });
}
```

### Why This Happens

- Snapshot data comes per-event, per-division; `school` can differ by `round_archers` row.
- No trimming/normalization; `" East "` vs `"East"` → different keys.
- `archerId` is returned by the API but **not used** for deduplication.

---

## ✅ Solution

### Fix Strategy

1. **Prefer `archerId`** for deduplication when present (stable identity across events).
2. **Fallback** to normalized `name_school` for archers without `archerId` (e.g. legacy/unnamed).
3. **Normalize** fallback key: trim, collapse whitespace, consistent empty handling.

### Implementation

**File:** `archer_results_pivot.html`  
**Location:** `loadAllData()`, archer map keying and merge logic.

**Changes:**
- Build key as `archerId` when available, else `normalizeKey(firstName, lastName, school)`.
- When processing each archer, merge into existing entry by that key; add rounds to that entry.
- Ensure we never create a second entry for the same archer.

---

## 🧪 Testing Plan

### Test Cases

1. **Primary:** Multiple events, overlapping archers → one row per archer.
2. **Regression:** Archers in single event only → still one row each.
3. **Edge:** Same name, different schools → two rows (correct).
4. **Mobile:** Verify pivot on iPhone SE viewport; touch targets, scroll.

### Test Devices

- iPhone (Safari) - Primary
- Desktop - Regression check

---

## 📋 Implementation Checklist

- [x] Root cause identified
- [x] Fix implemented
- [x] Code tested locally (Playwright: `tests/archer_results_pivot.spec.js` asserts one row per archer by dedupe key)
- [x] Mobile device tested
- [x] Documentation updated

---

## ✅ Fix Applied

**Date:** 2026-01-21

**File:** `archer_results_pivot.html`

**Changes:**
- Added `normalizeKey(firstName, lastName, school)` to trim/collapse whitespace for stable fallback keys.
- Deduplication now uses `archerId` when present (from snapshot API); otherwise `normalizeKey(...)`.
- Store `id` and `roundArcherId` on merged archer/round objects for modal linking.

**Verification:** Run `npx playwright test tests/archer_results_pivot.spec.js --config=playwright.config.no-server.js` (dev server on 8001). Manual: reload pivot page; each archer appears once. Test Simple/Advanced views, filters, score cell → scorecard modal.

---

**Status:** ✅ Fixed
**Fix Applied:** 2026-01-21
