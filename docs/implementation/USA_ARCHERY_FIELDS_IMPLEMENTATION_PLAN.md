# USA Archery Fields Implementation Plan

**Date:** 2025-01-XX  
**Status:** 📋 Planning Phase  
**Related:** `docs/analysis/USA_ARCHERY_FIELD_MAPPING_COMPLETE.md`

---

## Overview

This plan implements support for USA Archery team upload/download functionality by:
1. Adding 12 new fields to the archers table
2. Updating UI to include new fields in Extended Profile section
3. Creating separate import/export functions for USA Archery format (30 columns)

**Key Decisions:**
- ✅ All 12 recommended fields will be added
- ✅ USA Archery import/export will be separate functions (not modifying existing export)
- ✅ New fields are coach-only (Extended Profile section)
- ✅ Maintains backward compatibility with existing functionality

---

## Phase 1: Database Schema Updates

### 1.1 Create Migration Script

**File:** `api/sql/migration_usa_archery_fields.sql`

**Fields to Add:**

| Field Name | Database Column | Type | Default | Comment |
|------------|----------------|------|---------|---------|
| `validFrom` | `valid_from` | DATE | NULL | USA Archery membership validity start date |
| `clubState` | `club_state` | VARCHAR(50) | NULL | State where club is located |
| `membershipType` | `membership_type` | VARCHAR(100) | NULL | Type of USA Archery membership |
| `addressCountry` | `address_country` | VARCHAR(100) | NULL DEFAULT 'USA' | Country in mailing address |
| `addressLine3` | `address_line3` | VARCHAR(255) | NULL | Third address line |
| `disabilityList` | `disability_list` | TEXT | NULL | Multiple disability options (JSON or comma-separated) |
| `militaryService` | `military_service` | VARCHAR(10) | NULL DEFAULT 'No' | Military service flag (Y/N) |
| `introductionSource` | `introduction_source` | VARCHAR(100) | NULL | Where archer was introduced to archery |
| `introductionOther` | `introduction_other` | VARCHAR(255) | NULL | Other introduction source |
| `nfaaMemberNo` | `nfaa_member_no` | VARCHAR(20) | NULL | NFAA membership number |
| `schoolType` | `school_type` | VARCHAR(20) | NULL | Type of school (High, Middle, etc.) |
| `schoolFullName` | `school_full_name` | VARCHAR(200) | NULL | Full school name |

**Migration Requirements:**
- MySQL 5.7+ compatible
- Idempotent (safe to run multiple times)
- Use stored procedure pattern (like `migration_archer_extended_profile.sql`)
- All fields nullable with appropriate defaults
- Add comments for each column
- Place fields logically after existing Extended Profile fields

**Implementation Steps:**
1. Create migration file following existing pattern
2. Use `IF NOT EXISTS` checks for each column
3. Add columns after `camp_attendance` in logical groups:
   - Membership info: `valid_from`, `club_state`, `membership_type`
   - Address extension: `address_country`, `address_line3`
   - Additional info: `disability_list`, `military_service`, `introduction_source`, `introduction_other`, `nfaa_member_no`
   - School info: `school_type`, `school_full_name`
4. Include verification queries at end

**Files to Modify:**
- Create: `api/sql/migration_usa_archery_fields.sql`
- Update: `api/sql/schema.mysql.sql` (add fields to CREATE TABLE statement for reference)

---

## Phase 2: Frontend Data Model Updates

### 2.1 Update DEFAULT_ARCHER_TEMPLATE

**File:** `js/archer_module.js`

**Location:** Lines 26-76 (`DEFAULT_ARCHER_TEMPLATE`)

**Changes:**
Add 12 new fields to the template object:

```javascript
const DEFAULT_ARCHER_TEMPLATE = {
  // ... existing fields ...
  campAttendance: '',
  // NEW USA Archery fields
  validFrom: '',
  clubState: '',
  membershipType: '',
  addressCountry: 'USA',
  addressLine3: '',
  disabilityList: '',
  militaryService: 'No',
  introductionSource: '',
  introductionOther: '',
  nfaaMemberNo: '',
  schoolType: '',
  schoolFullName: '',
  // ... rest of template ...
};
```

**Files to Modify:**
- `js/archer_module.js` (lines 26-76)

---

### 2.2 Update _prepareForSync Method

**File:** `js/archer_module.js`

**Location:** Lines 446-493 (`_prepareForSync` method)

**Changes:**
Add new fields to the payload mapping:

```javascript
_prepareForSync(archer) {
  const data = this._applyTemplate(archer);
  const payload = {
    // ... existing fields ...
    campAttendance: this._safeString(data.campAttendance),
    // NEW USA Archery fields
    validFrom: this._safeString(data.validFrom),
    clubState: this._safeString(data.clubState),
    membershipType: this._safeString(data.membershipType),
    addressCountry: this._safeString(data.addressCountry) || 'USA',
    addressLine3: this._safeString(data.addressLine3),
    disabilityList: this._safeString(data.disabilityList),
    militaryService: this._safeString(data.militaryService) || 'No',
    introductionSource: this._safeString(data.introductionSource),
    introductionOther: this._safeString(data.introductionOther),
    nfaaMemberNo: this._safeString(data.nfaaMemberNo),
    schoolType: this._safeString(data.schoolType),
    schoolFullName: this._safeString(data.schoolFullName),
    // ... rest of payload ...
  };
  return payload;
}
```

**Files to Modify:**
- `js/archer_module.js` (lines 446-493)

---

### 2.3 Update _fromApiResponse Method

**File:** `js/archer_module.js`

**Location:** Lines 595-680 (`_fromApiResponse` method)

**Changes:**
Add new fields to the mapping from API response:

```javascript
_fromApiResponse(apiArcher = {}) {
  return {
    // ... existing fields ...
    campAttendance: this._safeString(apiArcher.campAttendance),
    // NEW USA Archery fields
    validFrom: this._safeString(apiArcher.validFrom),
    clubState: this._safeString(apiArcher.clubState),
    membershipType: this._safeString(apiArcher.membershipType),
    addressCountry: this._safeString(apiArcher.addressCountry) || 'USA',
    addressLine3: this._safeString(apiArcher.addressLine3),
    disabilityList: this._safeString(apiArcher.disabilityList),
    militaryService: this._safeString(apiArcher.militaryService) || 'No',
    introductionSource: this._safeString(apiArcher.introductionSource),
    introductionOther: this._safeString(apiArcher.introductionOther),
    nfaaMemberNo: this._safeString(apiArcher.nfaaMemberNo),
    schoolType: this._safeString(apiArcher.schoolType),
    schoolFullName: this._safeString(apiArcher.schoolFullName),
    // ... rest of mapping ...
  };
}
```

**Files to Modify:**
- `js/archer_module.js` (lines 595-680)

---

### 2.4 Update _fromCsvRow Method

**File:** `js/archer_module.js`

**Location:** Lines 846-899 (`_fromCsvRow` method)

**Changes:**
Add CSV field lookups for new fields (for backwards compatibility with existing CSV imports):

```javascript
_fromCsvRow(row = {}) {
  const lookup = key => {
    const val = row[key] || row[key.replace(/_/g, '')];
    return val !== undefined && val !== null && val !== '' ? String(val).trim() : '';
  };
  const parsed = Object.assign({}, DEFAULT_ARCHER_TEMPLATE, {
    // ... existing fields ...
    campAttendance: lookup('camp_attendance') || lookup('campattendance'),
    // NEW USA Archery fields (optional for CSV import)
    validFrom: lookup('valid_from') || lookup('validfrom'),
    clubState: lookup('club_state') || lookup('clubstate'),
    membershipType: lookup('membership_type') || lookup('membershiptype'),
    addressCountry: lookup('address_country') || lookup('addresscountry') || 'USA',
    addressLine3: lookup('address_line3') || lookup('addressline3') || lookup('address3'),
    disabilityList: lookup('disability_list') || lookup('disabilitylist'),
    militaryService: lookup('military_service') || lookup('militaryservice') || 'No',
    introductionSource: lookup('introduction_source') || lookup('introductionsource'),
    introductionOther: lookup('introduction_other') || lookup('introductionother'),
    nfaaMemberNo: lookup('nfaa_member_no') || lookup('nfaamemberno') || lookup('nfaa'),
    schoolType: lookup('school_type') || lookup('schooltype'),
    schoolFullName: lookup('school_full_name') || lookup('schoolfullname'),
    // ... rest of parsed object ...
  });
  return parsed;
}
```

**Files to Modify:**
- `js/archer_module.js` (lines 846-899)

---

## Phase 3: Backend API Updates

### 3.1 Update Bulk Upsert Endpoint

**File:** `api/index.php`

**Location:** Lines ~1933-1951 (bulk_upsert endpoint)

**Changes:**
Add new fields to INSERT and UPDATE statements:

```php
// Add new fields to INSERT statement
$ins = $pdo->prepare('INSERT INTO archers (
  id, ext_id, first_name, last_name, school, level, gender, 
  // ... existing fields ...
  camp_attendance,
  valid_from, club_state, membership_type, address_country, address_line3,
  disability_list, military_service, introduction_source, introduction_other,
  nfaa_member_no, school_type, school_full_name,
  created_at
) VALUES (?,?,?,?,?,?,?, ... ?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())');

// Add new fields to UPDATE statement
$upd = $pdo->prepare('UPDATE archers SET 
  first_name=?, last_name=?, school=?, level=?, gender=?,
  // ... existing fields ...
  camp_attendance=?,
  valid_from=?, club_state=?, membership_type=?, address_country=?, address_line3=?,
  disability_list=?, military_service=?, introduction_source=?, introduction_other=?,
  nfaa_member_no=?, school_type=?, school_full_name=?,
  updated_at=NOW()
  WHERE id=?');
```

**Note:** This assumes the bulk_upsert endpoint already handles all Extended Profile fields. If not, this may need to be part of a larger refactor.

**Files to Modify:**
- `api/index.php` (bulk_upsert endpoint - lines TBD after review)

---

### 3.2 Update GET Archers Endpoint

**File:** `api/index.php`

**Location:** Lines ~2069+ (GET /v1/archers endpoint)

**Changes:**
Add new fields to SELECT statement and response mapping:

```php
// Add fields to SELECT
$sql = 'SELECT 
  id, ext_id as extId, first_name as firstName, last_name as lastName,
  // ... existing fields ...
  camp_attendance as campAttendance,
  valid_from as validFrom, club_state as clubState, membership_type as membershipType,
  address_country as addressCountry, address_line3 as addressLine3,
  disability_list as disabilityList, military_service as militaryService,
  introduction_source as introductionSource, introduction_other as introductionOther,
  nfaa_member_no as nfaaMemberNo, school_type as schoolType, school_full_name as schoolFullName
  FROM archers WHERE 1=1';
```

**Files to Modify:**
- `api/index.php` (GET /v1/archers endpoint - lines TBD after review)

---

## Phase 4: UI Updates

### 4.1 Add Fields to Archer Profile Modal

**File:** `archer_list.html`

**Location:** Lines 1467-1537 (Extended Profile section)

**Changes:**
Add new fields to the Extended Profile section, organized logically:

**Group 1: Membership Information** (after Personal Info)
```html
<div class="border-t border-gray-100 dark:border-gray-700 pt-2">
  <label class="text-xs text-gray-500 dark:text-gray-400 font-medium">USA Archery Membership</label>
  <div class="grid grid-cols-2 gap-2 mt-1">
    <div>
      <label class="text-xs text-gray-500 dark:text-gray-400">Membership Valid From</label>
      <input class="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" type="date" id="validFrom">
    </div>
    <div>
      <label class="text-xs text-gray-500 dark:text-gray-400">Membership Type</label>
      <input class="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" type="text" id="membershipType" placeholder="OAS Membership">
    </div>
    <div>
      <label class="text-xs text-gray-500 dark:text-gray-400">Club State</label>
      <input class="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" type="text" id="clubState" placeholder="California" maxlength="2">
    </div>
    <div>
      <label class="text-xs text-gray-500 dark:text-gray-400">NFAA Member #</label>
      <input class="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" type="text" id="nfaaMemberNo" placeholder="NFAA number">
    </div>
  </div>
</div>
```

**Group 2: Extended Address** (expand existing Address section)
```html
<!-- Add after existing address fields -->
<input class="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" type="text" id="addressLine3" placeholder="Address Line 3 (optional)">
<div class="grid grid-cols-2 gap-2">
  <!-- Existing city, state, zip fields -->
  <div>
    <label class="text-xs text-gray-500 dark:text-gray-400">Country</label>
    <input class="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" type="text" id="addressCountry" placeholder="USA" value="USA">
  </div>
</div>
```

**Group 3: Additional Information** (after Disability & Camp)
```html
<div class="border-t border-gray-100 dark:border-gray-700 pt-2">
  <label class="text-xs text-gray-500 dark:text-gray-400 font-medium">Additional Information</label>
  <div class="space-y-2 mt-1">
    <div>
      <label class="text-xs text-gray-500 dark:text-gray-400">Disability List</label>
      <input class="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" type="text" id="disabilityList" placeholder="Comma-separated options">
    </div>
    <div>
      <label class="text-xs text-gray-500 dark:text-gray-400">Military Service</label>
      <select class="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" id="militaryService">
        <option value="No">No</option>
        <option value="Yes">Yes</option>
      </select>
    </div>
    <div>
      <label class="text-xs text-gray-500 dark:text-gray-400">Introduction Source</label>
      <select class="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" id="introductionSource">
        <option value="">-</option>
        <option value="Olympic Archery in the Schools (OAS)">Olympic Archery in the Schools (OAS)</option>
        <option value="Other">Other</option>
      </select>
    </div>
    <div id="introductionOtherWrapper" class="hidden">
      <label class="text-xs text-gray-500 dark:text-gray-400">Other Introduction Source</label>
      <input class="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" type="text" id="introductionOther" placeholder="Specify other source">
    </div>
  </div>
</div>
```

**Group 4: School Information** (optional, could go in Header or Extended Profile)
```html
<div class="border-t border-gray-100 dark:border-gray-700 pt-2">
  <label class="text-xs text-gray-500 dark:text-gray-400 font-medium">School Information</label>
  <div class="grid grid-cols-2 gap-2 mt-1">
    <div>
      <label class="text-xs text-gray-500 dark:text-gray-400">School Type</label>
      <select class="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" id="schoolType">
        <option value="">-</option>
        <option value="Elementary">Elementary</option>
        <option value="Middle">Middle</option>
        <option value="High" selected>High</option>
        <option value="College">College</option>
      </select>
    </div>
    <div>
      <label class="text-xs text-gray-500 dark:text-gray-400">Full School Name</label>
      <input class="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary" type="text" id="schoolFullName" placeholder="Wiseburn Da Vinci High School">
    </div>
  </div>
</div>
```

**Files to Modify:**
- `archer_list.html` (Extended Profile section - lines 1467-1537)

---

### 4.2 Update Form Population Logic

**File:** `archer_list.html`

**Location:** Lines 773-785 (form population in `openModal` function)

**Changes:**
Add field population for new fields:

```javascript
// Extended profile fields (coach-only)
setFormValue(form, 'dob', archer.dob || '');
setFormValue(form, 'email2', archer.email2 || '');
setFormValue(form, 'nationality', archer.nationality || 'U.S.A.');
setFormValue(form, 'ethnicity', archer.ethnicity || '');
setFormValue(form, 'discipline', archer.discipline || '');
setFormValue(form, 'streetAddress', archer.streetAddress || '');
setFormValue(form, 'streetAddress2', archer.streetAddress2 || '');
setFormValue(form, 'city', archer.city || '');
setFormValue(form, 'state', archer.state || '');
setFormValue(form, 'postalCode', archer.postalCode || '');
setFormValue(form, 'disability', archer.disability || '');
setFormValue(form, 'campAttendance', archer.campAttendance || '');
// NEW USA Archery fields
setFormValue(form, 'validFrom', archer.validFrom || '');
setFormValue(form, 'clubState', archer.clubState || '');
setFormValue(form, 'membershipType', archer.membershipType || '');
setFormValue(form, 'addressCountry', archer.addressCountry || 'USA');
setFormValue(form, 'addressLine3', archer.addressLine3 || '');
setFormValue(form, 'disabilityList', archer.disabilityList || '');
setFormValue(form, 'militaryService', archer.militaryService || 'No');
setFormValue(form, 'introductionSource', archer.introductionSource || '');
setFormValue(form, 'introductionOther', archer.introductionOther || '');
setFormValue(form, 'nfaaMemberNo', archer.nfaaMemberNo || '');
setFormValue(form, 'schoolType', archer.schoolType || '');
setFormValue(form, 'schoolFullName', archer.schoolFullName || '');
```

**Files to Modify:**
- `archer_list.html` (lines 773-785)

---

### 4.3 Update Form Save Logic

**File:** `archer_list.html`

**Location:** Lines ~1773+ (form save in archer update function)

**Changes:**
Add field extraction for new fields:

```javascript
const updatedArcher = {
  // ... existing fields ...
  campAttendance: form.querySelector('#campAttendance').value,
  // NEW USA Archery fields
  validFrom: form.querySelector('#validFrom').value,
  clubState: form.querySelector('#clubState').value,
  membershipType: form.querySelector('#membershipType').value,
  addressCountry: form.querySelector('#addressCountry').value || 'USA',
  addressLine3: form.querySelector('#addressLine3').value,
  disabilityList: form.querySelector('#disabilityList').value,
  militaryService: form.querySelector('#militaryService').value || 'No',
  introductionSource: form.querySelector('#introductionSource').value,
  introductionOther: form.querySelector('#introductionOther').value,
  nfaaMemberNo: form.querySelector('#nfaaMemberNo').value,
  schoolType: form.querySelector('#schoolType').value,
  schoolFullName: form.querySelector('#schoolFullName').value,
  // ... rest of archer object ...
};
```

**Files to Modify:**
- `archer_list.html` (form save function - lines TBD after review)

---

### 4.4 Add Conditional Field Logic

**File:** `archer_list.html`

**Location:** After form initialization

**Changes:**
Add JavaScript to show/hide `introductionOther` field based on `introductionSource` selection:

```javascript
// Conditional field: introductionOther
const introductionSourceSelect = form.querySelector('#introductionSource');
const introductionOtherWrapper = form.querySelector('#introductionOtherWrapper');
if (introductionSourceSelect && introductionOtherWrapper) {
  const toggleIntroductionOther = () => {
    if (introductionSourceSelect.value === 'Other') {
      introductionOtherWrapper.classList.remove('hidden');
    } else {
      introductionOtherWrapper.classList.add('hidden');
      form.querySelector('#introductionOther').value = '';
    }
  };
  introductionSourceSelect.addEventListener('change', toggleIntroductionOther);
  toggleIntroductionOther(); // Initial state
}
```

**Files to Modify:**
- `archer_list.html` (after form initialization)

---

## Phase 5: USA Archery Import/Export Functions

### 5.1 Create importUSAArcheryCSV Function

**File:** `js/archer_module.js`

**Location:** After `importCSV` method (around line 844)

**Purpose:** Import CSV in USA Archery template format (30 columns)

**Key Features:**
- Maps USA Archery column names to our field names
- Handles all 30 columns from template
- Creates/updates archers based on First Name + Last Name + USA Archery ID matching
- Validates required fields
- Handles defaults appropriately

**Function Structure:**
```javascript
importUSAArcheryCSV(csvText) {
  // Parse CSV with proper header handling
  // Map USA Archery columns to our fields
  // Handle defaults (membership type, club state, etc.)
  // Return list of archer objects
  // Return errors array for validation issues
}
```

**Column Mapping:**
See `docs/analysis/USA_ARCHERY_FIELD_MAPPING_COMPLETE.md` for complete mapping table.

**Files to Create/Modify:**
- `js/archer_module.js` (add new method)

---

### 5.2 Create exportUSAArcheryCSV Function

**File:** `js/archer_module.js`

**Location:** After `exportCoachRosterCSV` method (around line 1064)

**Purpose:** Export CSV in USA Archery template format (30 columns, exact order)

**Key Features:**
- Exports exactly 30 columns in USA Archery template order
- Maps our field names to USA Archery column names
- Handles missing fields gracefully (empty strings)
- Uses proper CSV formatting (quotes, escaping)
- File naming: `usa-archery-roster-YYYY-MM-DD.csv`

**Function Structure:**
```javascript
exportUSAArcheryCSV() {
  const list = this.loadList();
  if (!list.length) {
    alert('No archers to export.');
    return '';
  }
  
  // USA Archery template columns in exact order (30 columns)
  const headers = [
    'Email',
    'First Name',
    'Last Name',
    'Gender',
    'DOB',
    'Membership Number Look Up',
    'Valid From',
    'State',
    'Clubs',
    'Membership Type',
    'What is your Primary Discipline?',
    'Race/Ethnicity',
    'Address - Addr 1',
    'Address - Addr 2',
    'Address - Addr 3',
    'Address - Addr City',
    'Address - Addr State',
    'Address - Addr Zip Code',
    'Address - Addr Country',
    'Primary Phone Number',
    'Do you consider yourself to have a disability?',
    'Please select all that apply.',
    'Have you ever served in the US Armed Forces?',
    'Please tell us where you were first introduced to archery.',
    'Other',
    'Select Your Citizenship Country',
    'NFAA Membership Number',
    'School Type',
    'Grade in School',
    'School Name'
  ];
  
  // Map our fields to USA Archery columns
  // Generate CSV rows
  // Download file
}
```

**Field Mapping Logic:**
- Map our fields to USA Archery columns based on mapping table
- Handle partial mappings (e.g., `school` code vs full name)
- Use defaults where our fields don't exist
- Format dates appropriately (likely YYYY-MM-DD)

**Files to Create/Modify:**
- `js/archer_module.js` (add new method)

---

### 5.3 Add UI Buttons for Import/Export

**File:** `coach.html` or `archer_list.html`

**Location:** Coach console or archer list footer

**Changes:**
Add buttons for USA Archery import/export (coach-only):

```html
<!-- USA Archery Import/Export (Coach Only) -->
${isCoachMode() ? `
<div class="flex gap-2">
  <button type="button" onclick="importUSAArcheryCSV()" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm">
    <i class="fas fa-upload mr-2"></i>Import USA Archery CSV
  </button>
  <button type="button" onclick="exportUSAArcheryCSV()" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm">
    <i class="fas fa-download mr-2"></i>Export USA Archery CSV
  </button>
</div>
` : ''}
```

**Functions to Add:**
```javascript
async function importUSAArcheryCSV() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const result = ArcherModule.importUSAArcheryCSV(text);
    if (result.errors && result.errors.length > 0) {
      alert('Import completed with errors:\n' + result.errors.join('\n'));
    } else {
      alert(`Successfully imported ${result.list.length} archers.`);
    }
    // Refresh archer list
    location.reload();
  };
  input.click();
}

function exportUSAArcheryCSV() {
  ArcherModule.exportUSAArcheryCSV();
}
```

**Files to Modify:**
- `coach.html` or `archer_list.html` (add buttons and functions)

---

## Phase 6: Testing

### 6.1 Database Migration Testing

- [ ] Run migration script on test database
- [ ] Verify all 12 columns added successfully
- [ ] Verify columns are nullable with correct defaults
- [ ] Verify existing data not affected
- [ ] Test migration idempotency (run twice, no errors)
- [ ] Verify on both MySQL 5.7 and 8.0+

### 6.2 UI Testing

- [ ] Verify all new fields appear in Extended Profile section
- [ ] Verify fields are coach-only (not visible to non-coaches)
- [ ] Test form population with existing archer data
- [ ] Test form save creates/updates new fields
- [ ] Test conditional field (introductionOther shows/hides)
- [ ] Test on mobile device (99% of users)
- [ ] Test in dark mode and light mode
- [ ] Verify field validation works correctly

### 6.3 Import Function Testing

- [ ] Test import with USA Archery template format (30 columns)
- [ ] Test with all fields populated
- [ ] Test with partial data (some fields empty)
- [ ] Test with defaults applied correctly
- [ ] Test error handling (missing required fields)
- [ ] Test duplicate handling (same archer imported twice)
- [ ] Verify field mappings are correct
- [ ] Test date format parsing (DOB, Valid From)

### 6.4 Export Function Testing

- [ ] Test export generates CSV with exactly 30 columns
- [ ] Verify column order matches USA Archery template
- [ ] Verify column names match exactly (case-sensitive)
- [ ] Test with archers having all fields
- [ ] Test with archers having partial fields (empty values)
- [ ] Verify date formats are correct
- [ ] Verify CSV escaping (commas, quotes, newlines)
- [ ] Test file downloads correctly

### 6.5 Integration Testing

- [ ] Import → Edit → Export workflow
- [ ] Export → Import workflow (round-trip)
- [ ] Verify data integrity through full cycle
- [ ] Test with large datasets (100+ archers)
- [ ] Test sync to database works correctly
- [ ] Verify no data loss during import/export

---

## Implementation Checklist

### Database
- [ ] Create `migration_usa_archery_fields.sql`
- [ ] Test migration on development database
- [ ] Update `schema.mysql.sql` for reference
- [ ] Backup production database before migration
- [ ] Run migration on production

### Frontend Data Model
- [ ] Update `DEFAULT_ARCHER_TEMPLATE`
- [ ] Update `_prepareForSync` method
- [ ] Update `_fromApiResponse` method
- [ ] Update `_fromCsvRow` method (for backwards compatibility)

### Backend API
- [ ] Update bulk_upsert endpoint (INSERT statement)
- [ ] Update bulk_upsert endpoint (UPDATE statement)
- [ ] Update GET /v1/archers endpoint (SELECT statement)
- [ ] Test API endpoints with new fields

### UI
- [ ] Add new fields to Extended Profile section
- [ ] Organize fields logically (groups)
- [ ] Update form population logic
- [ ] Update form save logic
- [ ] Add conditional field logic (introductionOther)
- [ ] Test UI on mobile device
- [ ] Test UI in dark mode

### Import/Export Functions
- [ ] Create `importUSAArcheryCSV` function
- [ ] Create `exportUSAArcheryCSV` function
- [ ] Add UI buttons for import/export
- [ ] Add import/export handler functions
- [ ] Test import function thoroughly
- [ ] Test export function thoroughly
- [ ] Test round-trip (export → import)

### Testing
- [ ] Complete all testing tasks above
- [ ] Document any issues found
- [ ] Fix bugs found during testing
- [ ] Verify mobile compatibility

### Documentation
- [ ] Update field mapping document if needed
- [ ] Document any deviations from plan
- [ ] Create user guide for import/export (if needed)

---

## Timeline Estimate

- **Phase 1 (Database):** 2-4 hours
- **Phase 2 (Frontend Data Model):** 2-3 hours
- **Phase 3 (Backend API):** 2-3 hours
- **Phase 4 (UI):** 4-6 hours
- **Phase 5 (Import/Export Functions):** 6-8 hours
- **Phase 6 (Testing):** 4-6 hours

**Total Estimate:** 20-30 hours

---

## Risks & Mitigations

### Risk 1: Migration breaks existing functionality
**Mitigation:** Test thoroughly on development database first, backup production

### Risk 2: USA Archery template format changes
**Mitigation:** Document exact column names and order, make mapping table easy to update

### Risk 3: Performance issues with large imports
**Mitigation:** Test with large datasets, consider batching if needed

### Risk 4: Field mapping errors
**Mitigation:** Thorough testing, validation in import function, clear error messages

---

## References

- Mapping Analysis: `docs/analysis/USA_ARCHERY_FIELD_MAPPING_COMPLETE.md`
- Database Migration Example: `api/sql/migration_archer_extended_profile.sql`
- Database Standards: `.cursor/rules/database-migrations.mdc`
- Archer Module: `js/archer_module.js`
- Archer UI: `archer_list.html`
- API Endpoints: `api/index.php`

