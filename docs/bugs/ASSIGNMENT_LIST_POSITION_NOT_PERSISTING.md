# Assignment List Bug: Position Not Persisting to Database

**Date:** 2026-02-15
**Page/Module:** `assignment_list.html` / `api/index.php` (bulk_upsert endpoint)
**Severity:** High
**Status:** ✅ Fixed

---

## Bug Description

When a coach sets archer positions (S1-S8, T1-T6) on the Assignment List page, the assignment appears to save (highlighted button, success toast) but is lost on page refresh. The position value is never written to the database — it only persists in localStorage until the next `loadFromMySQL()` call overwrites it with the empty DB value.

**User Impact:**
- Coach sets assignments, refreshes page, and all assignments are gone
- Affects both prod and dev environments
- Mobile and desktop both affected
- Coach has to re-enter all positions every session

---

## Steps to Reproduce

1. Go to `assignment_list.html`
2. Click a position button (e.g., S3) for any archer
3. Wait for auto-save (1.5s) or click "Save All Changes"
4. See success toast: "Assignments saved!"
5. Refresh the page
6. **Observe:** All assignments are cleared (back to no selection)
7. **Expected:** Assignment should persist across page loads

---

## Root Cause Analysis

### The Problem

The `assignment` field was completely missing from the `POST /v1/archers/bulk_upsert` API endpoint in `api/index.php`. The field was omitted in three places:

1. **Normalization array** (~line 4616-4672): No `'assignment' => ...` entry
2. **UPDATE logic** (~line 4683-4905): No `if ($normalized['assignment'])` block
3. **INSERT logic** (~line 4924-4993): `assignment` column not in INSERT statement

### Code Flow

```
assignment_list.html                  api/index.php
─────────────────                     ─────────────
setAssignment('S3')
  → archer.assignment = 'S3'
  → modifiedArchers.set(...)
  → saveAll()
    → _prepareForSync(archer)
      → payload = { assignment: 'S3', ... }  ← JS sends it correctly
    → POST /v1/archers/bulk_upsert
      → $normalized = [ ... ]                ← 'assignment' NOT included
      → UPDATE archers SET ...               ← assignment NOT in SET clause
      → DB assignment stays empty ❌
  → archerModule.saveList()                  ← localStorage gets 'S3' (temporarily)

loadFromMySQL()
  → GET /v1/archers
    → SELECT assignment FROM archers         ← returns '' (empty)
  → saveList(convertedList)                  ← Overwrites localStorage with empty
  → assignment lost ❌
```

### Why This Happens

The `assignment` column exists in the DB schema (an enum), the GET endpoint returns it, and the JS client sends it — but the `bulk_upsert` endpoint never reads or writes it. This was likely an omission when the `assignment` column was first added to the `archers` table, or when the `bulk_upsert` endpoint was built/extended.

---

## Solution

### Fix Strategy

Add `assignment` handling to all three places in the `bulk_upsert` endpoint.

### Implementation

**File:** `api/index.php`
**Endpoint:** `POST /v1/archers/bulk_upsert`

**Changes:**

1. **Normalization** — Added `'assignment' => $archer['assignment'] ?? null` to the `$normalized` array
2. **UPDATE** — Added assignment handling block:
   ```php
   if ($normalized['assignment'] !== null) {
       $updateFields[] = 'assignment = ?';
       $updateValues[] = $normalized['assignment'];
   }
   ```
3. **INSERT** — Added `assignment` column to INSERT statement and corresponding value `$normalized['assignment'] ?: ''`

---

## Testing Plan

### Test Cases

1. **Set Assignment via API**
   - POST `bulk_upsert` with `assignment: "S1"` → DB column updates to `S1` ✅
   - GET `/archers` → returns `assignment: "S1"` ✅

2. **Clear Assignment via API**
   - POST `bulk_upsert` with `assignment: ""` → DB column updates to `""` ✅

3. **Full Round-Trip**
   - Set assignment → fetch back → value matches ✅

4. **UI Testing**
   - Set assignment on assignment_list.html
   - Refresh page
   - Assignment persists

### Test Devices

- Desktop browser — API verification
- Mobile (iPhone Safari) — UI testing needed

---

## Implementation Checklist

- [x] Root cause identified
- [x] Fix implemented
- [x] API tested locally (curl)
- [ ] Mobile device tested
- [ ] Regression tests passed
- [x] Documentation updated
- [ ] Ready for deployment

---

## Related Issues

- Similar pattern to `IMPORT_ROSTER_GAMES_NO_MYSQL_SYNC.md` — data saved locally but not persisted to DB
- Both bugs stem from incomplete field coverage in API endpoints

---

**Status:** ✅ Fixed
**Priority:** High
**Fix Applied:** 2026-02-15 — Added `assignment` field to `bulk_upsert` normalization, UPDATE, and INSERT logic
