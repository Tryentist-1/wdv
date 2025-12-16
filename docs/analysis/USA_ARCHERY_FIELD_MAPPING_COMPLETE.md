# USA Archery Field Mapping - Complete Analysis

**Date:** 2025-01-XX  
**Purpose:** Complete mapping table between USA Archery template columns and our Archer Profile system  
**Status:** ✅ Analysis Complete - Implementation Planning Phase

**Decisions Made:**
- ✅ All 12 recommended fields will be added to the system
- ✅ USA Archery import/export will be a separate function (not modifying existing export)

---

## Overview

This document provides a complete mapping table for USA Archery team upload/download functionality. The table includes:
1. USA Archery Template Column (order matters for validation)
2. Our Archer Profile Field (internal field name)
3. Our Default Value (team default)
4. Our Abbreviation (field code used in app)
5. UI Group/Tab (where field appears in archer profile modal)

---

## Complete Field Mapping Table

| # | USA Archery Template Column | Our Archer Profile Field | Our Default Value | Our Abbreviation | UI Group/Tab |
|---|----------------------------|-------------------------|-------------------|------------------|--------------|
| 1 | Email | `email` | '' | `email` | Contact |
| 2 | First Name | `first` | '' | `first` | Header (Top) |
| 3 | Last Name | `last` | '' | `last` | Header (Top) |
| 4 | Gender | `gender` | 'M' | `gender` | Header (Quick Stats) |
| 5 | DOB | `dob` | '' | `dob` | Extended Profile |
| 6 | Membership Number Look Up | `usArcheryId` | '' | `usaId` | Contact |
| 7 | Valid From | ❌ **NOT IN OUR SYSTEM** | - | - | N/A |
| 8 | State | ⚠️ **PARTIAL** - `state` (address state, not club state) | '' | `state` | Extended Profile (Address) |
| 9 | Clubs | ❌ **NOT IN OUR SYSTEM** (we have `school` code only) | - | - | N/A |
| 10 | Membership Type | ❌ **NOT IN OUR SYSTEM** | - | - | N/A |
| 11 | What is your Primary Discipline? | `discipline` | '' | `disc` | Extended Profile |
| 12 | Race/Ethnicity | `ethnicity` | '' | `ethnic` | Extended Profile |
| 13 | Address - Addr 1 | `streetAddress` | '' | `street1` | Extended Profile (Address) |
| 14 | Address - Addr 2 | `streetAddress2` | '' | `street2` | Extended Profile (Address) |
| 15 | Address - Addr 3 | ❌ **NOT IN OUR SYSTEM** (we only have 2 address lines) | - | - | N/A |
| 16 | Address - Addr City | `city` | '' | `city` | Extended Profile (Address) |
| 17 | Address - Addr State | `state` | '' | `state` | Extended Profile (Address) |
| 18 | Address - Addr Zip Code | `postalCode` | '' | `zip` | Extended Profile (Address) |
| 19 | Address - Addr Country | ⚠️ **PARTIAL** - `nationality` (we use for citizenship) | 'U.S.A.' | `nation` | Extended Profile |
| 20 | Primary Phone Number | `phone` | '' | `phone` | Contact |
| 21 | Do you consider yourself to have a disability? | `disability` | '' | `disab` | Extended Profile |
| 22 | Please select all that apply. | ❌ **NOT IN OUR SYSTEM** (we only have single `disability` field) | - | - | N/A |
| 23 | Have you ever served in the US Armed Forces? | ❌ **NOT IN OUR SYSTEM** | - | - | N/A |
| 24 | Please tell us where you were first introduced to archery. | ❌ **NOT IN OUR SYSTEM** | - | - | N/A |
| 25 | Other | ❌ **NOT IN OUR SYSTEM** | - | - | N/A |
| 26 | Select Your Citizenship Country | `nationality` | 'U.S.A.' | `nation` | Extended Profile |
| 27 | NFAA Membership Number | ❌ **NOT IN OUR SYSTEM** | - | - | N/A |
| 28 | School Type | ❌ **NOT IN OUR SYSTEM** (we have `school` code but not type) | - | - | N/A |
| 29 | Grade in School | `grade` | '' | `grade` | Header (Quick Stats) |
| 30 | School Name | ⚠️ **PARTIAL** - `school` (we store 3-letter code, not full name) | '' | `school` | Header (Quick Stats) |

---

## Field Mapping Details

### ✅ Fully Mapped Fields (13 fields)

These fields have direct 1:1 mappings:

1. **Email** → `email` - Contact section
2. **First Name** → `first` - Header (Top)
3. **Last Name** → `last` - Header (Top)
4. **Gender** → `gender` - Header (Quick Stats)
5. **DOB** → `dob` - Extended Profile
6. **Membership Number Look Up** → `usArcheryId` - Contact section
7. **What is your Primary Discipline?** → `discipline` - Extended Profile
8. **Race/Ethnicity** → `ethnicity` - Extended Profile
9. **Address - Addr 1** → `streetAddress` - Extended Profile (Address)
10. **Address - Addr 2** → `streetAddress2` - Extended Profile (Address)
11. **Address - Addr City** → `city` - Extended Profile (Address)
12. **Address - Addr Zip Code** → `postalCode` - Extended Profile (Address)
13. **Primary Phone Number** → `phone` - Contact section

### ⚠️ Partial Mappings (3 fields)

These fields map but have limitations:

1. **State** (USAA_Club_State)
   - USA Archery has: Club State (default: "California")
   - We have: `state` for address only (Extended Profile → Address)
   - **Issue:** USA Archery has TWO state fields:
     - Club State (where club is located)
     - Address State (where archer lives)
   - **Recommendation:** Map to Address State only, or add new `clubState` field

2. **Address - Addr Country** / **Select Your Citizenship Country**
   - USA Archery has: TWO separate fields
     - Address Country (where archer lives)
     - Citizenship Country (nationality)
   - We have: `nationality` (default: 'U.S.A.') - Extended Profile
   - **Issue:** We're using one field for both concepts
   - **Recommendation:** Currently maps to Citizenship. May need `addressCountry` field

3. **School Name**
   - USA Archery has: Full school name (e.g., "Wiseburn Da Vinci High School")
   - We have: `school` - 3-letter code only (e.g., "WDV") - Header (Quick Stats)
   - **Issue:** USA Archery expects full name, we store abbreviated code
   - **Recommendation:** May need to store full name or have lookup table

### ❌ Not in Our System (14 fields)

These USA Archery fields don't exist in our system:

1. **Valid From** (USAS_Valid_From_Date) - Membership validity start date
2. **Clubs** (USAA_Club) - Full club name with ID (e.g., "Wiseburn Da Vinci High School (CA - 5391)")
3. **Membership Type** (USAA_Membership_type) - e.g., "OAS Membership (For OAS Program Members Only)"
4. **Address - Addr 3** - Third address line (we only have 2)
5. **Please select all that apply.** (Disabliity_list) - Multiple disability options (we only have single text field)
6. **Have you ever served in the US Armed Forces?** (Military) - Boolean flag
7. **Please tell us where you were first introduced to archery.** (USAA_Introduction) - e.g., "Olympic Archery in the Schools (OAS)"
8. **Other** (USAA_Introduction_Other) - Free text for introduction source
9. **NFAA Membership Number** (NFAA_Member_No) - Separate organization membership
10. **School Type** (USAA_School_Type) - e.g., "High" (High School)
11. **Address - Addr State** vs **State** (USAA_Club_State) - See Partial Mappings above
12. **Address - Addr Country** vs **Select Your Citizenship Country** - See Partial Mappings above

---

## Default Value Analysis

Based on the template you provided, here are the default values USA Archery expects vs what we have:

| USA Archery Field | Their Default | Our Default | Match? |
|------------------|---------------|-------------|--------|
| State (Club State) | "California" | '' | ❌ |
| Clubs | "Wiseburn Da Vinci High School (CA - 5391)" | '' | ❌ |
| Membership Type | "OAS Membership (For OAS Program Members Only)" | '' | ❌ |
| Primary Discipline | "Recurve" | '' | ❌ |
| Disability | "No" | '' | ❌ |
| Military | "No" | '' | ❌ |
| USAA_Introduction | "Olympic Archery in the Schools (OAS)" | '' | ❌ |
| Citizenship | "USA" | 'U.S.A.' | ⚠️ Close (USA vs U.S.A.) |
| School Type | "High" | '' | ❌ |
| School Name | "Wiseburn Da Vinci High School" | '' | ❌ |
| Gender | Not specified | 'M' | N/A |

---

## Dropdown Field Mappings

### Gender
- **USA Archery:** Not specified in template (likely M/F)
- **Our System:** Dropdown with M, F
- **Our Default:** 'M'
- **Mapping:** ✅ Direct match

### Discipline
- **USA Archery Default:** "Recurve"
- **USA Archery Options:** Likely "Recurve", "Compound", "Barebow"
- **Our System:** Dropdown with Recurve, Compound, Barebow
- **Our Default:** '' (empty)
- **Mapping:** ✅ Options match, defaults differ

### Disability
- **USA Archery Default:** "No"
- **USA Archery Format:** Likely Yes/No dropdown
- **Our System:** Free text field
- **Our Default:** '' (empty)
- **Mapping:** ⚠️ Format mismatch (dropdown vs text)

### Camp Attendance (Our field, not in USA Archery template)
- **Our System:** Dropdown with Y, N
- **Our Default:** '' (empty)
- **Note:** Not in USA Archery template

---

## UI Group/Tab Reference

### Header (Top)
- Main header area with avatar
- Fields: `first`, `last`, `nickname`

### Header (Quick Stats)
- Quick stats row below name
- Fields: `school`, `grade`, `gender`, `level`

### Performance
- Collapsible section
- Fields: `jvPr`, `varPr`

### Equipment
- Collapsible section
- Fields: `domHand`, `domEye`, `heightIn`, `wingspanIn`, `drawLengthSugg`, `limbLength`, `limbWeightLbs`

### Notes
- Collapsible section
- Fields: `notesGear`, `notesCurrent`, `notesArchive`

### Sizes
- Collapsible section
- Fields: `shirtSize`, `pantSize`, `hatSize`

### Contact
- Collapsible section
- Fields: `email`, `phone`, `usArcheryId`

### Extended Profile
- Collapsible section (Coach-only, Amber highlighted)
- Fields: `dob`, `email2`, `nationality`, `ethnicity`, `discipline`, `disability`, `campAttendance`

### Extended Profile (Address)
- Subsection within Extended Profile
- Fields: `streetAddress`, `streetAddress2`, `city`, `state`, `postalCode`

### Friends
- Collapsible section (hidden by default)
- Fields: `faves`

---

## Recommendations

### Fields We Should Consider Adding

1. **`validFrom`** (Date) - USA Archery membership validity start date
   - UI: Extended Profile
   - Type: Date field

2. **`clubState`** (String) - State where club is located
   - UI: Extended Profile
   - Type: Text or dropdown
   - Note: Different from address state

3. **`membershipType`** (String) - Type of USA Archery membership
   - UI: Extended Profile
   - Type: Text or dropdown
   - Default: "OAS Membership (For OAS Program Members Only)"

4. **`addressCountry`** (String) - Country in mailing address
   - UI: Extended Profile (Address)
   - Type: Text or dropdown
   - Default: "USA"
   - Note: Separate from `nationality` (citizenship)

5. **`addressLine3`** (String) - Third address line
   - UI: Extended Profile (Address)
   - Type: Text
   - Note: USA Archery supports 3 address lines, we only have 2

6. **`disabilityList`** (Array/Text) - Multiple disability options
   - UI: Extended Profile
   - Type: Multi-select or comma-separated text
   - Note: USA Archery has "select all that apply", we only have single text field

7. **`militaryService`** (Boolean/String) - Military service flag
   - UI: Extended Profile
   - Type: Boolean or Y/N dropdown
   - Default: "No"

8. **`introductionSource`** (String) - Where archer was introduced to archery
   - UI: Extended Profile
   - Type: Dropdown or text
   - Default: "Olympic Archery in the Schools (OAS)"

9. **`introductionOther`** (String) - Other introduction source
   - UI: Extended Profile
   - Type: Text
   - Note: Conditional field when "Other" is selected

10. **`nfaaMemberNo`** (String) - NFAA membership number
    - UI: Extended Profile
    - Type: Text

11. **`schoolType`** (String) - Type of school
    - UI: Extended Profile
    - Type: Dropdown
    - Default: "High" (High School)
    - Options: Likely "Elementary", "Middle", "High", "College", etc.

12. **`schoolFullName`** (String) - Full school name
    - UI: Extended Profile or Header
    - Type: Text
    - Default: "Wiseburn Da Vinci High School"
    - Note: Currently we only store 3-letter code in `school`
    - **✅ Decision:** Add `schoolFullName` field to our system

---

## Implementation Decisions

### ✅ Fields to Add
**Status:** All recommended fields will be added to the system.

**Fields to Add:**
1. `validFrom` - USA Archery membership validity start date
2. `clubState` - State where club is located (separate from address state)
3. `membershipType` - Type of USA Archery membership
4. `addressCountry` - Country in mailing address (separate from citizenship)
5. `addressLine3` - Third address line
6. `disabilityList` - Multiple disability options (multi-select or comma-separated)
7. `militaryService` - Military service flag
8. `introductionSource` - Where archer was introduced to archery
9. `introductionOther` - Other introduction source (conditional)
10. `nfaaMemberNo` - NFAA membership number
11. `schoolType` - Type of school (e.g., "High", "Middle", "Elementary")
12. `schoolFullName` - Full school name (in addition to 3-letter code)

### ✅ Separate Import/Export Function
**Status:** USA Archery upsert/export will be a **separate function** from existing export.
- Will not modify existing `exportCoachRosterCSV()` function
- New function will handle USA Archery specific format and all 30 columns
- Maintains backward compatibility with current export

## Implementation Priority

### Phase 1: Database Schema Updates
- Add all 12 new fields to `archers` table
- Create migration script
- Update `DEFAULT_ARCHER_TEMPLATE` in `archer_module.js`

### Phase 2: UI Updates
- Add new fields to archer profile modal (Extended Profile section)
- Organize fields logically (address fields together, USA Archery fields together)
- Handle conditional fields (e.g., `introductionOther` when "Other" selected)

### Phase 3: New USA Archery Import/Export Function
- Create `importUSAArcheryCSV()` function
- Create `exportUSAArcheryCSV()` function
- Map all 30 USA Archery columns to our fields
- Handle partial mappings and defaults appropriately

### Phase 4: Validation & Testing
- Test import with USA Archery template format
- Test export generates correct format
- Verify all 30 columns map correctly
- Test with defaults and edge cases

---

## Implementation Summary

### New Fields to Add (12 total)

| Field Name | Type | Default | UI Location | Notes |
|------------|------|---------|-------------|-------|
| `validFrom` | DATE | NULL | Extended Profile | USA Archery membership validity start date |
| `clubState` | VARCHAR(50) | '' | Extended Profile | State where club is located (separate from address state) |
| `membershipType` | VARCHAR(100) | '' | Extended Profile | Type of USA Archery membership |
| `addressCountry` | VARCHAR(100) | 'USA' | Extended Profile (Address) | Country in mailing address (separate from citizenship) |
| `addressLine3` | VARCHAR(255) | '' | Extended Profile (Address) | Third address line |
| `disabilityList` | TEXT | '' | Extended Profile | Multiple disability options (comma-separated or JSON) |
| `militaryService` | VARCHAR(10) | 'No' | Extended Profile | Military service flag (Y/N or Yes/No) |
| `introductionSource` | VARCHAR(100) | '' | Extended Profile | Where archer was introduced to archery |
| `introductionOther` | VARCHAR(255) | '' | Extended Profile | Other introduction source (conditional) |
| `nfaaMemberNo` | VARCHAR(20) | '' | Extended Profile | NFAA membership number |
| `schoolType` | VARCHAR(20) | '' | Extended Profile | Type of school (e.g., "High", "Middle") |
| `schoolFullName` | VARCHAR(200) | '' | Extended Profile or Header | Full school name (in addition to 3-letter code) |

### Separate Import/Export Functions

**New Functions to Create:**
- `importUSAArcheryCSV(csvText)` - Import from USA Archery template format
- `exportUSAArcheryCSV()` - Export to USA Archery template format (30 columns)

**Key Points:**
- These will be **separate** from existing `exportCoachRosterCSV()` function
- Will handle all 30 USA Archery columns
- Maintains backward compatibility with current export
- Can be called from coach console UI

## Validation Checklist

Before implementing upload/download:

- [ ] Add all 12 new fields to database schema
- [ ] Create database migration script
- [ ] Update `DEFAULT_ARCHER_TEMPLATE` in `archer_module.js`
- [ ] Add fields to archer profile UI (Extended Profile section)
- [ ] Create `importUSAArcheryCSV()` function
- [ ] Create `exportUSAArcheryCSV()` function
- [ ] Verify exact column names match (case-sensitive, 30 columns)
- [ ] Verify date format (DOB, Valid From) - likely YYYY-MM-DD or MM/DD/YYYY
- [ ] Verify dropdown values match exactly (Discipline, Disability, Military, etc.)
- [ ] Verify default values are acceptable
- [ ] Map `nationality` correctly (citizenship field)
- [ ] Map `addressCountry` correctly (address country field)
- [ ] Map `state` correctly (address state)
- [ ] Map `clubState` correctly (club state field)
- [ ] Map `school` code vs `schoolFullName`
- [ ] Handle conditional fields (e.g., `introductionOther`)
- [ ] Test import with USA Archery template format
- [ ] Test export generates correct format with all 30 columns

---

## References

- USA Archery Template: Provided by user (30 columns)
- Our Export Function: `js/archer_module.js:984-1064` (`exportCoachRosterCSV()`)
- Our UI Structure: `archer_list.html:1191-1537` (`createFormFieldsHTML()`)
- Our Default Template: `js/archer_module.js:26-76` (`DEFAULT_ARCHER_TEMPLATE`)
- Our Database Schema: `api/sql/schema.mysql.sql:4-52` (archers table)

