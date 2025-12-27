# USA Archery Field Mapping Analysis

**Date:** 2025-01-XX  
**Purpose:** Analyze field mapping between USA Archery template and our Archer Profile system  
**Status:** 🔍 Analysis Phase

---

## Overview

This document analyzes the mapping between USA Archery team upload/download template columns and our internal Archer Profile system. The goal is to create a comprehensive mapping table for validation and implementation.

---

## Current USA Archery Export Implementation

From `js/archer_module.js` (`exportCoachRosterCSV()` function, lines 984-1064), the current export includes these columns in this order:

| # | USA Archery Template Column | Our Archer Profile Field | Default Value | Abbreviation | UI Group/Tab |
|---|----------------------------|-------------------------|---------------|--------------|--------------|
| 1 | First Name | `first` | '' | `first` | Header (Top) |
| 2 | Last Name | `last` | '' | `last` | Header (Top) |
| 3 | USAArcheryNo | `usArcheryId` | '' | `usaId` | Contact |
| 4 | DOB | `dob` | '' | `dob` | Extended Profile |
| 5 | Email1 | `email` | '' | `email` | Contact |
| 6 | Email2 | `email2` | '' | `email2` | Extended Profile |
| 7 | Phone | `phone` | '' | `phone` | Contact |
| 8 | Gender | `gender` | 'M' | `gender` | Header (Quick Stats) |
| 9 | Nationality | `nationality` | 'U.S.A.' | `nation` | Extended Profile |
| 10 | Ethnicity | `ethnicity` | '' | `ethnic` | Extended Profile |
| 11 | Discipline | `discipline` | '' | `disc` | Extended Profile |
| 12 | Street Address | `streetAddress` | '' | `street1` | Extended Profile (Address) |
| 13 | Street Address 2 | `streetAddress2` | '' | `street2` | Extended Profile (Address) |
| 14 | City | `city` | '' | `city` | Extended Profile (Address) |
| 15 | State | `state` | '' | `state` | Extended Profile (Address) |
| 16 | PostalCode | `postalCode` | '' | `zip` | Extended Profile (Address) |
| 17 | Disability | `disability` | '' | `disab` | Extended Profile |
| 18 | Camp | `campAttendance` | '' | `camp` | Extended Profile |

---

## Field Analysis

### Header Section (Top of Modal)
Fields displayed in the main header area:
- **first** - First Name
- **last** - Last Name
- **nickname** - Nickname (not in USA Archery export)
- **school** - School (not in USA Archery export)
- **grade** - Grade (not in USA Archery export)
- **gender** - Gender
- **level** - Level (VAR/JV/BEG, not in USA Archery export)
- **status** - Status (not in USA Archery export)

### Performance Section (Collapsible)
- **jvPr** - JV PR (not in USA Archery export)
- **varPr** - VAR PR (not in USA Archery export)

### Equipment Section (Collapsible)
- **domHand** - Dominant Hand (not in USA Archery export)
- **domEye** - Dominant Eye (not in USA Archery export)
- **heightIn** - Height (not in USA Archery export)
- **wingspanIn** - Wingspan (not in USA Archery export)
- **drawLengthSugg** - Draw Length (not in USA Archery export)
- **limbLength** - Limb Length (not in USA Archery export)
- **limbWeightLbs** - Limb Weight (not in USA Archery export)

### Notes Section (Collapsible)
- **notesGear** - Gear Notes (not in USA Archery export)
- **notesCurrent** - Current Notes (not in USA Archery export)
- **notesArchive** - History Notes (not in USA Archery export)

### Sizes Section (Collapsible)
- **shirtSize** - Shirt Size (not in USA Archery export)
- **pantSize** - Pant Size (not in USA Archery export)
- **hatSize** - Hat Size (not in USA Archery export)

### Contact Section (Collapsible)
- **email** - Email1
- **phone** - Phone
- **usArcheryId** - USA Archery ID

### Extended Profile Section (Collapsible, Coach-Only, Amber Highlighted)
- **dob** - Date of Birth
- **email2** - Secondary Email
- **nationality** - Nationality (default: 'U.S.A.')
- **ethnicity** - Ethnicity
- **discipline** - Discipline (dropdown: Recurve, Compound, Barebow)
- **streetAddress** - Street Address
- **streetAddress2** - Street Address 2
- **city** - City
- **state** - State
- **postalCode** - Postal Code
- **disability** - Disability
- **campAttendance** - Camp Attendance (dropdown: Y/N)

### Friends Section (Collapsible, Hidden by default)
- **faves** - Friends list (not in USA Archery export)

---

## Dropdown Fields Analysis

Based on UI code in `archer_list.html`:

### Discipline Dropdown (Extended Profile)
- Options: `Recurve`, `Compound`, `Barebow`
- Field: `discipline`
- USA Archery Column: `Discipline`

### Camp Attendance Dropdown (Extended Profile)
- Options: `Y` (Yes), `N` (No)
- Field: `campAttendance`
- USA Archery Column: `Camp`

### Gender Dropdown (Header Quick Stats)
- Options: `M`, `F`
- Field: `gender`
- USA Archery Column: `Gender`
- Note: We default to 'M', USA Archery may have different defaults

---

## Mapping Issues & Questions

### Fields in Our System NOT in USA Archery Export
These fields exist in our system but are not part of the USA Archery template:
- `nickname`
- `photoUrl`
- `school`
- `grade`
- `level` (VAR/JV/BEG)
- `status` (active/inactive)
- `jvPr`, `varPr` (performance records)
- `domHand`, `domEye` (physical characteristics)
- `heightIn`, `wingspanIn`, `drawLengthSugg`, `riserHeightIn`, `limbLength`, `limbWeightLbs` (equipment measurements)
- `notesGear`, `notesCurrent`, `notesArchive` (notes)
- `shirtSize`, `pantSize`, `hatSize` (sizes)
- `faves` (friends list)

### Potential Mapping Inaccuracies

Need to verify:
1. **Gender default**: We default to 'M', but USA Archery may require explicit value or have different default
2. **Nationality default**: We default to 'U.S.A.', but should verify if USA Archery requires this or allows empty
3. **Discipline**: Our dropdown has specific options - need to verify USA Archery accepts these exact values
4. **Camp Attendance**: We use 'Y'/'N' - need to verify USA Archery format (may be Yes/No, Y/N, 1/0, etc.)
5. **Date formats**: Our `dob` is a date field - need to verify USA Archery date format (MM/DD/YYYY, YYYY-MM-DD, etc.)

---

## Recommended Additional Columns

Based on your requirements, here are the proposed columns for the mapping table:

### Column 4: Abbreviation
Short code used in our application for each field. Examples:
- `first`, `last`, `dob`, `email`, `phone`, etc.
- Used for: code references, variable names, quick lookup

### Column 5: UI Group/Tab Location
Where the field appears in our archer profile modal UI:
- **Header (Top)** - Main header area with avatar
- **Header (Quick Stats)** - Quick stats row below name
- **Performance** - Performance section (collapsible)
- **Equipment** - Equipment section (collapsible)
- **Notes** - Notes section (collapsible)
- **Sizes** - Sizes section (collapsible)
- **Contact** - Contact section (collapsible)
- **Extended Profile** - Extended Profile section (collapsible, coach-only)
- **Extended Profile (Address)** - Address subsection within Extended Profile
- **Friends** - Friends section (collapsible, hidden by default)

---

## Next Steps

1. **Review Current Mapping Table**: If you have an existing 3-column mapping table, please share it so we can:
   - Verify accuracy of field mappings
   - Add the 4th column (Abbreviation)
   - Add the 5th column (UI Group/Tab)
   - Identify any missing fields

2. **Validate USA Archery Requirements**:
   - Verify exact column names (case sensitivity, spacing)
   - Verify data formats (dates, dropdowns, etc.)
   - Verify required vs optional fields
   - Verify default values are acceptable

3. **Identify Missing Fields**:
   - Determine if USA Archery template has fields we're not mapping
   - Determine if we need to add fields to support USA Archery requirements

4. **Document Dropdown Mappings**:
   - Create reference table for dropdown value mappings
   - Document transformations needed (e.g., Y/N vs Yes/No)

---

## References

- Export Function: `js/archer_module.js:984-1064` (`exportCoachRosterCSV()`)
- UI Structure: `archer_list.html:1191-1537` (`createFormFieldsHTML()`)
- Default Template: `js/archer_module.js:26-76` (`DEFAULT_ARCHER_TEMPLATE`)
- Database Schema: `api/sql/schema.mysql.sql:4-52` (archers table)


