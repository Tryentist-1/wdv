# Archer Data Unification - Phase 1 Recommendations

**Date:** November 5, 2025  
**Goal:** Make MySQL the single source of truth, with CSV and localStorage as synchronized caches

---

## Current State Analysis

### 1. **Data Sources**

| Source | Location | Key Fields | UUID Support | Status |
|--------|----------|------------|--------------|--------|
| **MySQL Database** | `archers` table | `id` (UUID), `ext_id`, `first_name`, `last_name`, + 20+ fields | ✅ Yes | **Source of Truth** |
| **CSV Master File** | `app-imports/listimport-01.csv` | `extId`, `first`, `last`, `school`, `level`, `gender` | ❌ No UUID | Outdated |
| **localStorage** | `archerList` key | Full schema (extId, first, last, + 20+ fields) | ⚠️ Optional `id` | Partial sync |
| **Coach CSV Import** | Upload via coach.js | `first`, `last`, `school`, `level`, `gender` | ❌ No UUID | Limited fields |

### 2. **Field Mapping Discrepancies**

**Current Mismatches:**

| Database Column | Frontend/CSV Field | API Field | Status |
|----------------|-------------------|-----------|--------|
| `id` (UUID) | `id` (optional) | `id` | ❌ Not in CSV |
| `ext_id` | `extId` | `extId` | ✅ Matches |
| `first_name` | `first` | `firstName` | ⚠️ Inconsistent |
| `last_name` | `last` | `lastName` | ⚠️ Inconsistent |
| `nickname` | `nickname` | `nickname` | ❌ Not synced |
| `photo_url` | `photoUrl` | `photoUrl` | ❌ Not synced |
| `grade` | `grade` | `grade` | ❌ Not synced |
| `status` | `status` | `status` | ❌ Not synced |
| `email` | `email` | `email` | ❌ Not synced |
| `phone` | `phone` | `phone` | ❌ Not synced |
| `us_archery_id` | `usArcheryId` | `usArcheryId` | ❌ Not synced |
| `jv_pr` | `jvPr` | `jvPr` | ❌ Not synced |
| `var_pr` | `varPr` | `varPr` | ❌ Not synced |
| + 10+ more fields | Present in localStorage | Missing from API | ❌ Not synced |

### 3. **Critical Issues Identified**

#### Issue 1: **Incomplete API Endpoints**

**Problem:** `GET /v1/archers` only returns 8 fields (id, extId, firstName, lastName, school, level, gender, createdAt)

**Current Code (line 2069):**
```php
$sql = 'SELECT id, ext_id as extId, first_name as firstName, last_name as lastName, school, level, gender, created_at as createdAt FROM archers WHERE 1=1';
```

**Impact:** When loading from MySQL, most archer data is lost (nickname, photo, grade, contact info, physiology, notes, PRs, etc.)

---

#### Issue 2: **Incomplete Bulk Upsert**

**Problem:** `POST /v1/archers/bulk_upsert` only syncs 5 fields (first_name, last_name, school, level, gender)

**Current Code (line 1933-1951):**
```php
$ins = $pdo->prepare('INSERT INTO archers (id, ext_id, first_name, last_name, school, level, gender, created_at) VALUES (?,?,?,?,?,?,?,NOW())');
$upd = $pdo->prepare('UPDATE archers SET first_name=?, last_name=?, school=?, level=?, gender=? WHERE id=?');
```

**Impact:** All other fields (nickname, photo, grade, status, email, phone, notes, PRs, etc.) are never synced to database

---

#### Issue 3: **CSV Missing UUID**

**Problem:** CSV export doesn't include `id` (UUID) field, making it impossible to match records back to database

**Current CSV Headers (line 822-850):**
```javascript
const headers = [
  'extId', 'first', 'last', 'nickname', 'photoUrl', 'school', 'grade', ...
  // Missing: 'id'
];
```

**Impact:** CSV imports can't preserve database UUIDs, causing duplicate records

---

#### Issue 4: **Field Name Inconsistency**

**Problem:** Three different naming conventions:
- Database: `snake_case` (first_name, last_name)
- API: `camelCase` (firstName, lastName)
- Frontend/CSV: `camelCase` but different names (first, last)

**Impact:** Mapping errors, data loss during sync

---

#### Issue 5: **Coach CSV Import Limited & No Smart Matching**

**Problem:** 
1. Coach CSV import only handles 5 fields (first, last, school, level, gender)
2. No smart matching logic - relies only on extId which may not exist in CSV
3. Coach uploads may be incomplete (missing columns, missing extId)

**Current Code (coach.js line 907-914):**
```javascript
archers.push({
  extId,
  firstName: archer.first,
  lastName: archer.last,
  school: archer.school.substring(0, 3).toUpperCase(),
  level: (archer.level || 'VAR').toUpperCase() === 'JV' ? 'JV' : 'VAR',
  gender: (archer.gender || 'M').toUpperCase() === 'F' ? 'F' : 'M'
});
```

**Impact:** 
- CSV imports lose all extended profile data
- Can't match existing archers if extId missing
- Creates duplicate records instead of updating existing ones

---

#### Issue 6: **Sync Verification Missing**

**Problem:** No verification that sync actually worked. `bulk_upsert` returns success even if fields were ignored.

**Current Response (line 1956):**
```php
json_response(['upserted' => $upserted, 'created' => $created, 'updated' => $updated]);
// Doesn't indicate which fields were actually saved
```

**Impact:** Data loss silently occurs without user awareness

---

## Phase 1 Recommendations

### **Goal:** Make MySQL the single source of truth with complete field synchronization

### **Priority 1: Fix API Endpoints (CRITICAL)**

#### 1.1 Update `GET /v1/archers` to Return All Fields

**Action:** Modify the SELECT query to include all archer profile fields

**Current:**
```php
SELECT id, ext_id as extId, first_name as firstName, last_name as lastName, school, level, gender, created_at as createdAt
```

**Proposed:**
```php
SELECT 
  id, ext_id as extId, 
  first_name as firstName, last_name as lastName, nickname, photo_url as photoUrl,
  school, grade, gender, level, status,
  faves, dom_eye as domEye, dom_hand as domHand,
  height_in as heightIn, wingspan_in as wingspanIn, draw_length_sugg as drawLengthSugg,
  riser_height_in as riserHeightIn, limb_length as limbLength, limb_weight_lbs as limbWeightLbs,
  notes_gear as notesGear, notes_current as notesCurrent, notes_archive as notesArchive,
  email, phone, us_archery_id as usArcheryId,
  jv_pr as jvPr, var_pr as varPr,
  created_at as createdAt, updated_at as updatedAt
FROM archers
```

**Impact:** ✅ Full data available when loading from MySQL

---

#### 1.2 Update `POST /v1/archers/bulk_upsert` to Handle All Fields + Smart Matching

**Action:** Expand INSERT and UPDATE statements to include all profile fields + implement smart matching

**Current:** Only handles 5 fields, matches only by extId  
**Proposed:** Handle all 25+ fields + smart matching by multiple criteria

**Key Changes:**
- Expand INSERT to include all columns
- Expand UPDATE to include all columns (partial updates - only update non-null fields)
- Implement smart matching logic (priority: UUID → extId → email → phone → name+school → name)
- Support partial data (missing fields = NULL, don't overwrite existing data)
- Validate and normalize all fields server-side
- Return matched records with their UUIDs

**Smart Matching Implementation:**
```php
function findExistingArcher($pdo, $data) {
    // Priority 1: UUID (if provided and exists)
    if (!empty($data['id'])) {
        $stmt = $pdo->prepare('SELECT id FROM archers WHERE id = ? LIMIT 1');
        $stmt->execute([$data['id']]);
        if ($row = $stmt->fetch()) return $row['id'];
    }
    
    // Priority 2: extId
    if (!empty($data['extId'])) {
        $stmt = $pdo->prepare('SELECT id FROM archers WHERE ext_id = ? LIMIT 1');
        $stmt->execute([$data['extId']]);
        if ($row = $stmt->fetch()) return $row['id'];
    }
    
    // Priority 3: email (if unique)
    if (!empty($data['email'])) {
        $stmt = $pdo->prepare('SELECT id FROM archers WHERE email = ? LIMIT 1');
        $stmt->execute([$data['email']]);
        if ($row = $stmt->fetch()) {
            // Verify uniqueness
            $count = $pdo->prepare('SELECT COUNT(*) FROM archers WHERE email = ?');
            $count->execute([$data['email']]);
            if ($count->fetchColumn() == 1) return $row['id'];
        }
    }
    
    // Priority 4: phone (if unique)
    if (!empty($data['phone'])) {
        $stmt = $pdo->prepare('SELECT id FROM archers WHERE phone = ? LIMIT 1');
        $stmt->execute([$data['phone']]);
        if ($row = $stmt->fetch()) {
            $count = $pdo->prepare('SELECT COUNT(*) FROM archers WHERE phone = ?');
            $count->execute([$data['phone']]);
            if ($count->fetchColumn() == 1) return $row['id'];
        }
    }
    
    // Priority 5: first_name + last_name + school
    if (!empty($data['firstName']) && !empty($data['lastName']) && !empty($data['school'])) {
        $stmt = $pdo->prepare('SELECT id FROM archers WHERE first_name = ? AND last_name = ? AND school = ? LIMIT 1');
        $stmt->execute([$data['firstName'], $data['lastName'], $data['school']]);
        if ($row = $stmt->fetch()) return $row['id'];
    }
    
    // Priority 6: first_name + last_name (if unique)
    if (!empty($data['firstName']) && !empty($data['lastName'])) {
        $stmt = $pdo->prepare('SELECT id FROM archers WHERE first_name = ? AND last_name = ? LIMIT 1');
        $stmt->execute([$data['firstName'], $data['lastName']]);
        if ($row = $stmt->fetch()) {
            $count = $pdo->prepare('SELECT COUNT(*) FROM archers WHERE first_name = ? AND last_name = ?');
            $count->execute([$data['firstName'], $data['lastName']]);
            if ($count->fetchColumn() == 1) return $row['id'];
        }
    }
    
    return null; // No match found
}
```

**Impact:** ✅ Complete data sync + smart matching for incomplete CSV uploads

---

### **Priority 2: Add UUID to CSV**

#### 2.1 Include `id` Field in CSV Export

**Action:** Add `id` as first column in CSV export

**Proposed CSV Headers:**
```javascript
const headers = [
  'id',           // NEW: Database UUID (first column for visibility)
  'extId',        // Composite ID: first-last-school
  'first',
  'last',
  // ... rest of fields
];
```

**Impact:** ✅ CSV downloads include UUID for database matching

**Note:** UUID is the primary identifier. extId (first-last-school) is an alternate identifier for matching when UUID is missing.

---

#### 2.2 Preserve UUID on CSV Import

**Action:** When importing CSV, use smart matching hierarchy

**Proposed Matching Priority:**
1. **If CSV row has `id` (UUID):** Use UUID to find existing record (most reliable)
2. **If CSV row has `extId`:** Use extId to find existing record
3. **If CSV row has `email`:** Use email (if unique) to find existing record
4. **If CSV row has `phone`:** Use phone (if unique) to find existing record
5. **If CSV row has `first + last + school`:** Use composite key to find existing record
6. **If CSV row has `first + last`:** Use name (if unique) to find existing record
7. **If no match:** Create new record with new UUID

**Impact:** ✅ CSV round-trips preserve database relationships even with incomplete data

**Additional Requirement:**
- If CSV has `id` but record doesn't exist in database, treat as new record (don't use provided UUID - generate new one for security)
- If CSV has `extId` but no `id`, generate extId from first-last-school if missing

---

### **Priority 3: Standardize Field Names**

#### 3.1 Establish Canonical Field Names

**Recommendation:** Use camelCase for API/JSON (matches frontend), snake_case for database

**Mapping Table:**
| Database | API/JSON | Frontend/CSV | Notes |
|----------|----------|--------------|-------|
| `id` | `id` | `id` | UUID |
| `ext_id` | `extId` | `extId` | ✅ Already consistent |
| `first_name` | `firstName` | `first` | ⚠️ Frontend uses `first` |
| `last_name` | `lastName` | `last` | ⚠️ Frontend uses `last` |
| `photo_url` | `photoUrl` | `photoUrl` | ✅ Consistent |
| `dom_eye` | `domEye` | `domEye` | ✅ Consistent |
| `dom_hand` | `domHand` | `domHand` | ✅ Consistent |
| `height_in` | `heightIn` | `heightIn` | ✅ Consistent |
| `us_archery_id` | `usArcheryId` | `usArcheryId` | ✅ Consistent |
| `jv_pr` | `jvPr` | `jvPr` | ✅ Consistent |
| `var_pr` | `varPr` | `varPr` | ✅ Consistent |

**Decision:** Keep frontend using `first`/`last` (less typing), but ensure API accepts both `firstName`/`lastName` and `first`/`last` for compatibility.

---

### **Priority 4: Enhance Coach CSV Import with Smart Matching**

#### 4.1 Support Full Field Set in CSV Import

**Action:** Update `parseCSV()` in `coach.js` to handle all fields, not just basic 5

**Proposed:** Use same field mapping as `archer_module.js` `_fromCsvRow()` function

**Impact:** ✅ CSV imports can include full profile data

---

#### 4.2 Implement Smart Upsert Matching Logic

**Problem:** Coach CSV uploads may be incomplete (missing extId, missing columns). Need to match existing archers by multiple criteria.

**Current Matching:** Only by `extId` (which may not exist in CSV)

**Proposed Smart Matching Strategy:**

1. **Primary Match (if extId exists):**
   - Match by `ext_id` (most reliable)

2. **Secondary Match (if extId missing):**
   Try in order:
   - Match by `email` (if email exists and is unique)
   - Match by `phone` (if phone exists and is unique)
   - Match by `first_name + last_name + school` (composite key)
   - Match by `first_name + last_name` (if only one match)

3. **Fallback:**
   - If no match found, create new record with new UUID
   - Generate extId from first-last-school if not provided

**API Endpoint Enhancement:**

Update `POST /v1/archers/bulk_upsert` to:
- Accept partial data (missing fields = NULL)
- Use smart matching logic above
- Only update fields that are provided (partial updates)
- Return matched records with their UUIDs

**Example Matching Logic:**
```php
// Pseudo-code for smart matching
function findExistingArcher($data) {
  // 1. Try extId first
  if ($data['extId']) {
    $match = findByExtId($data['extId']);
    if ($match) return $match;
  }
  
  // 2. Try email (if unique)
  if ($data['email']) {
    $match = findByEmail($data['email']);
    if ($match && isUnique($match)) return $match;
  }
  
  // 3. Try phone (if unique)
  if ($data['phone']) {
    $match = findByPhone($data['phone']);
    if ($match && isUnique($match)) return $match;
  }
  
  // 4. Try name + school composite
  if ($data['firstName'] && $data['lastName'] && $data['school']) {
    $match = findByNameAndSchool($data['firstName'], $data['lastName'], $data['school']);
    if ($match) return $match;
  }
  
  // 5. Try name only (if unique)
  if ($data['firstName'] && $data['lastName']) {
    $match = findByName($data['firstName'], $data['lastName']);
    if ($match && isUnique($match)) return $match;
  }
  
  return null; // No match found
}
```

**Impact:** ✅ CSV imports can match existing archers even with incomplete data

---

### **Priority 5: Add Sync Verification**

#### 5.1 Verify Sync Completeness

**Action:** After bulk_upsert, return read-after-write data showing what was actually saved

**Proposed Response:**
```php
// After upsert, fetch the saved record
$verify = $pdo->prepare('SELECT * FROM archers WHERE id = ?');
$verify->execute([$id]);
$saved = $verify->fetch();

json_response([
  'ok' => true,
  'inserted' => $inserted,
  'updated' => $updated,
  'samples' => [
    // Return first 3 saved records to verify fields were saved
    'firstInserted' => $firstInserted,
    'firstUpdated' => $firstUpdated
  ]
]);
```

**Impact:** ✅ Users can verify sync worked correctly

---

### **Priority 6: CSV Export from MySQL**

#### 6.1 Add API Endpoint to Export CSV from Database

**Action:** Create `GET /v1/archers/export?format=csv` endpoint

**Proposed:**
- Query all archers from database (with all fields)
- Generate CSV with UUID as first column
- Return CSV file or JSON array
- Use same field mapping as exportCSV() in archer_module.js

**Impact:** ✅ Coaches can download authoritative CSV from MySQL

---

## Implementation Plan

### **Phase 1.1: Fix API Endpoints (Week 1)**

**Tasks:**
1. ✅ Update `GET /v1/archers` to return all fields
2. ✅ Update `POST /v1/archers/bulk_upsert` to handle all fields
3. ✅ Add field validation and normalization server-side
4. ✅ Test with full profile data
5. ✅ Deploy and verify

**Files to Modify:**
- `api/index.php` (lines 2058-2102, 1924-1962, 2000-2056)

---

### **Phase 1.2: CSV UUID Support & Smart Matching (Week 1)**

**Tasks:**
1. ✅ Add `id` field to CSV export (first column)
2. ✅ Implement smart matching logic in API (email, phone, name, extId)
3. ✅ Update CSV import to preserve UUIDs using smart matching
4. ✅ Update coach CSV import to handle UUIDs and incomplete data
5. ✅ Support partial updates (only update fields provided in CSV)
6. ✅ Test CSV round-trip with incomplete data (export → edit → import → verify)

**Files to Modify:**
- `api/index.php` (bulk_upsert endpoint - add smart matching)
- `js/archer_module.js` (lines 816-880, 749-768)
- `js/coach.js` (lines 883-918)

---

### **Phase 1.3: Sync Verification (Week 1)**

**Tasks:**
1. ✅ Add read-after-write verification to bulk_upsert
2. ✅ Return saved data in response
3. ✅ Add UI feedback showing sync completeness
4. ✅ Test and verify

**Files to Modify:**
- `api/index.php` (bulk_upsert endpoints)
- `js/archer_module.js` (sync feedback)
- `archer_list.html` (UI updates)

---

### **Phase 1.4: Database Export Endpoint (Week 2)**

**Tasks:**
1. ✅ Create `GET /v1/archers/export` endpoint
2. ✅ Support CSV and JSON formats
3. ✅ Include all fields with proper mapping
4. ✅ Add to coach console UI
5. ✅ Test and deploy

**Files to Create/Modify:**
- `api/index.php` (new endpoint)
- `js/coach.js` (export button)

---

## Field Mapping Reference

### **Complete Field List (Database → API → Frontend)**

| # | Database Column | API Field | Frontend/CSV | Type | Required | Notes |
|---|----------------|-----------|--------------|------|----------|-------|
| 1 | `id` | `id` | `id` | UUID | ✅ | Primary key |
| 2 | `ext_id` | `extId` | `extId` | String | ✅ | Unique identifier |
| 3 | `first_name` | `firstName` | `first` | String | ✅ | |
| 4 | `last_name` | `lastName` | `last` | String | ✅ | |
| 5 | `nickname` | `nickname` | `nickname` | String | | |
| 6 | `photo_url` | `photoUrl` | `photoUrl` | String | | URL |
| 7 | `school` | `school` | `school` | String(3) | ✅ | Uppercase |
| 8 | `grade` | `grade` | `grade` | String(4) | | 9,10,11,12,GRAD |
| 9 | `gender` | `gender` | `gender` | String(1) | ✅ | M/F |
| 10 | `level` | `level` | `level` | String(3) | ✅ | VAR/JV/BEG |
| 11 | `status` | `status` | `status` | String(16) | | active/inactive |
| 12 | `faves` | `faves` | `faves` | JSON Array | | Friend UUIDs |
| 13 | `dom_eye` | `domEye` | `domEye` | String(2) | | RT/LT |
| 14 | `dom_hand` | `domHand` | `domHand` | String(2) | | RT/LT |
| 15 | `height_in` | `heightIn` | `heightIn` | Int | | Inches |
| 16 | `wingspan_in` | `wingspanIn` | `wingspanIn` | Int | | Inches |
| 17 | `draw_length_sugg` | `drawLengthSugg` | `drawLengthSugg` | Decimal | | |
| 18 | `riser_height_in` | `riserHeightIn` | `riserHeightIn` | Decimal | | |
| 19 | `limb_length` | `limbLength` | `limbLength` | String(2) | | S/M/L |
| 20 | `limb_weight_lbs` | `limbWeightLbs` | `limbWeightLbs` | Decimal | | |
| 21 | `notes_gear` | `notesGear` | `notesGear` | Text | | |
| 22 | `notes_current` | `notesCurrent` | `notesCurrent` | Text | | |
| 23 | `notes_archive` | `notesArchive` | `notesArchive` | Text | | |
| 24 | `email` | `email` | `email` | String(200) | | |
| 25 | `phone` | `phone` | `phone` | String(20) | | |
| 26 | `us_archery_id` | `usArcheryId` | `usArcheryId` | String(20) | | |
| 27 | `jv_pr` | `jvPr` | `jvPr` | Int | | Personal record |
| 28 | `var_pr` | `varPr` | `varPr` | Int | | Personal record |
| 29 | `created_at` | `createdAt` | - | Timestamp | | Read-only |
| 30 | `updated_at` | `updatedAt` | - | Timestamp | | Read-only |

---

## Migration Strategy

### **Step 1: Update API Endpoints**
- Deploy updated GET and POST endpoints
- Test with existing data
- Verify all fields sync correctly

### **Step 2: Update CSV Format**
- Add `id` column to exports
- Update imports to handle UUIDs
- Test round-trip with existing CSV files

### **Step 3: Sync Existing Data**
- Export current database to CSV (with UUIDs)
- Update `app-imports/listimport-01.csv` with full data
- Verify localStorage syncs correctly

### **Step 4: Validation**
- Run diagnostic queries to verify data consistency
- Check for missing UUIDs
- Verify all fields are syncing

---

## Testing Checklist

### **API Endpoint Tests**
- [ ] GET /v1/archers returns all 30 fields
- [ ] POST /v1/archers/bulk_upsert saves all fields
- [ ] UUID preservation works correctly
- [ ] Field normalization works (gender, level, etc.)
- [ ] Read-after-write verification returns correct data

### **CSV Tests**
- [ ] CSV export includes `id` field (first column)
- [ ] CSV import preserves UUIDs using smart matching
- [ ] CSV with missing extId matches by email
- [ ] CSV with missing extId matches by phone
- [ ] CSV with missing extId matches by name+school
- [ ] CSV with missing extId matches by name (if unique)
- [ ] CSV round-trip maintains all data
- [ ] Coach CSV import handles incomplete columns
- [ ] Coach CSV import uses smart matching
- [ ] Default CSV on server includes UUIDs
- [ ] Partial CSV updates don't overwrite existing data

### **Sync Tests**
- [ ] localStorage → MySQL sync includes all fields
- [ ] MySQL → localStorage load includes all fields
- [ ] Sync verification shows accurate results
- [ ] Offline queue preserves all fields

### **Data Integrity Tests**
- [ ] No duplicate records created
- [ ] UUIDs match across all sources
- [ ] Field values consistent across sources
- [ ] No data loss during sync

---

## Success Criteria

### **Phase 1 Complete When:**
1. ✅ MySQL database has all archer profile fields
2. ✅ API endpoints handle all fields (GET and POST)
3. ✅ CSV includes UUID and all fields
4. ✅ localStorage syncs all fields to/from MySQL
5. ✅ Coach CSV import handles all fields
6. ✅ Sync verification confirms data accuracy
7. ✅ No data loss during round-trips
8. ✅ All existing data migrated with UUIDs preserved

---

## Risk Mitigation

### **Data Loss Prevention:**
- ✅ Backup database before any changes
- ✅ Test on staging/dev first
- ✅ Gradual rollout (API first, then CSV, then UI)
- ✅ Verification queries after each step

### **Backward Compatibility:**
- ✅ Support both `firstName`/`lastName` and `first`/`last` in API
- ✅ Handle missing UUIDs gracefully (generate new)
- ✅ Preserve existing extId matching logic as fallback

---

## Next Steps

1. **Review this document** - Confirm approach and priorities
2. **Create backup** - Full database backup before changes
3. **Implement Phase 1.1** - Fix API endpoints
4. **Test thoroughly** - Verify all fields sync correctly
5. **Deploy incrementally** - API first, then CSV, then UI
6. **Monitor** - Watch for sync issues or data loss

---

## Questions for Discussion

1. **Field Name Standardization:** Should we change frontend to use `firstName`/`lastName` instead of `first`/`last`? (Breaking change)
2. **CSV Format:** Should we keep current CSV format or migrate to new format with UUID?
3. **Migration Timeline:** Is this acceptable for Phase 1, or should we break into smaller phases?
4. **Validation:** Should we add strict validation (reject invalid data) or be permissive (normalize/fix)?
5. **Smart Matching Priority:** Is the proposed matching order (UUID → extId → email → phone → name+school → name) correct?
6. **Partial Updates:** When CSV has incomplete data, should we:
   - Only update fields that are provided (NULL = don't update) ✅ Recommended
   - Or set missing fields to NULL (overwrite existing data)?
7. **Duplicate Prevention:** Should we add validation to prevent duplicate emails/phones across different archers?

---

## Appendix: Code Locations

### **API Endpoints:**
- `GET /v1/archers`: `api/index.php` lines 2058-2102
- `POST /v1/archers/bulk_upsert`: `api/index.php` lines 1924-1962, 2000-2056

### **Frontend Code:**
- Archer module: `js/archer_module.js`
- Coach CSV import: `js/coach.js` lines 883-918
- CSV export: `js/archer_module.js` lines 816-880
- CSV import: `js/archer_module.js` lines 749-768

### **Database Schema:**
- Full schema: `api/sql/schema.mysql.sql` lines 4-40
- Migration: `api/sql/migration_archer_profile_fields.sql`

### **Default CSV:**
- Location: `app-imports/listimport-01.csv` (on server)
- Loaded by: `js/archer_module.js` line 883-895

