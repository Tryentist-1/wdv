# Import Roster Games Bug: Archers Not Persisting to Database

**Date:** 2026-02-15
**Page/Module:** `archer_list.html` / `js/archer_module.js` → `importRosterGamesCSV()`
**Severity:** High
**Status:** ✅ Fixed

---

## Bug Description

"Import Roster Games" CSV import appears to succeed (shows success alert, archers appear in list) but imported archers vanish on page refresh. Neither dev nor prod retain the imported data.

**User Impact:**
- Coach imports a roster CSV, sees success message
- Navigates away or refreshes the page
- All imported archers are gone
- Import appears completely broken

---

## Steps to Reproduce

1. Go to `archer_list.html`
2. Open Coach Actions modal
3. Click "Import Roster Games"
4. Select a valid CSV file (e.g., `app-imports/BHS.csv`)
5. See success alert: "Successfully imported 33 archer(s)"
6. Archers appear in the list
7. Refresh the page
8. **Observe:** Imported archers are gone

**Expected:** Imported archers persist in the database and survive page refresh.

---

## Root Cause Analysis

### Two bugs working together:

### Bug 1: Wrong method name (original defect since commit `781e856`)

**File:** `js/archer_module.js` line 2205
**Code:** `this.queueUpsert(archer)` — method does not exist
**Correct:** `this._queuePendingUpsert(archer)` — the actual method name

The `queueUpsert` call throws `TypeError: this.queueUpsert is not a function` which is caught by the surrounding try/catch and silently logged as a warning. Archers are never sent to the MySQL database.

The USA Archery CSV import (`importUSAArcheryCSV`) uses the correct `_syncImportedToMySQL()` helper which calls `bulk_upsert` API and falls back to `_queuePendingUpsert`. The Roster Games import was built separately and used a non-existent method name.

### Bug 2: Page load overwrites localStorage from database

**File:** `archer_list.html` lines 3533-3543
**Code:** On every page load, `init()` calls `ArcherModule.loadFromMySQL()` which fetches all archers from the database and **replaces localStorage** with the result.

**Combined effect:**
1. Import saves archers to localStorage (works)
2. Import tries to sync to MySQL via `queueUpsert` (silently fails)
3. Page refresh calls `loadFromMySQL()` → fetches from DB (which never got the imports)
4. DB data overwrites localStorage, wiping imported archers

---

## Solution

**File:** `js/archer_module.js`
**Change:** Replace the broken `queueUpsert` loop with `_syncImportedToMySQL()` — the same bulk sync method used by the USA Archery import.

### Before (broken):
```javascript
archersToSync.forEach(archer => {
  try {
    syncPromises.push(this.queueUpsert(archer)); // ← method doesn't exist
  } catch (err) {
    console.warn('Failed to queue:', err); // silently swallowed
  }
});
```

### After (fixed):
```javascript
this._syncImportedToMySQL(archersToSync).then(result => {
  if (result.ok) {
    console.log(`MySQL sync complete for ${archersToSync.length} archers`);
  } else {
    console.warn('MySQL sync failed - queued for retry:', result.error);
  }
});
```

`_syncImportedToMySQL` does a single `POST /archers/bulk_upsert` call and falls back to `_queuePendingUpsert` per-archer if it fails.

---

## Testing Plan

1. **Primary fix test:** Import `app-imports/BHS.csv` → verify 33 archers appear → refresh page → archers still present
2. **Database verification:** Check MySQL directly after import to confirm rows exist
3. **Existing import:** Verify USA Archery import still works (unchanged code path)
4. **Error handling:** Test with malformed CSV → verify graceful error
5. **Mobile:** Test import on iPhone Safari (file picker + processing)

---

## Implementation Checklist

- [x] Root cause identified
- [x] Fix implemented
- [x] Code tested locally
- [ ] Mobile device tested
- [x] Regression tests passed
- [x] Ready for deployment

---

## Related

- Original feature: commit `781e856` — "feat: add position filter and Import Roster Games"
- MySQL sync fix (USA Archery import): commit `c11f1ff` — "Fix: Import now syncs to MySQL database"
- `_syncImportedToMySQL()` helper: lines 1883-1900 of `archer_module.js`
