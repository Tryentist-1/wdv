# Archer List Filters and Export Enhancements

**Date:** January 21, 2025  
**Status:** ✅ Implemented  
**Feature Branch:** `feature/archer-import-export-enhancements`

---

## Overview

Enhanced the Archer List page (`archer_list.html`) with improved filtering capabilities and a new simplified export format based on `roster_template.csv`.

---

## Filter Bar Enhancements

### Filter Order
The filter bar is now organized in the following order (left to right):
1. **Sort (A-Z)** - Sorts by first name ascending
2. **Gender** - Icon button (cycles: All → Male → Female)
3. **Level** - Dropdown (All, VAR, JV)
4. **Heart** - Favorites filter toggle
5. **School** - Dropdown (dynamically populated with unique school codes)
6. **Active** - Status dropdown (Active, Inactive, All)
7. **Shirt** - Shirt sizes view toggle

### Filter Features

#### Gender Filter
- **Type:** Icon button (venus-mars icon)
- **Behavior:** Cycles through All → Male (M) → Female (F) → All
- **Visual Feedback:**
  - All: Gray (default)
  - Male: Blue when active
  - Female: Pink when active
- **Mobile-Friendly:** 44px touch target

#### Level Filter
- **Type:** Dropdown select
- **Options:** All, VAR, JV
- **Replaces:** Previous "Level" sort button
- **Behavior:** Filters archers by competition level

#### School Filter
- **Type:** Dropdown select
- **Options:** Dynamically populated from archer list
- **Behavior:** Shows unique school codes (3-letter codes) sorted alphabetically
- **Auto-updates:** Refreshes when list is loaded from MySQL

### Sorting
- **A-Z Button:** Only sort option remaining
- **Sort Order:** First name ascending
- **Removed:** Level-based sorting (now a filter instead)

---

## Export Enhancements

### Export Coach Roster Simple

**New Export Format:** Based on `app-imports/roster_template.csv`

**Location:** Coach Actions Modal → "Export Coach Roster Simple" button

**CSV Format:**
```
First Name,Last Name,Gender,VJV,SCHOOL,USAArcheryNo,Email1,Discipline,Disability,RankingAvg
```

**Field Mappings:**
- `First Name` → `first`
- `Last Name` → `last`
- `Gender` → `gender` (M/F, uppercase)
- `VJV` → `level` (VAR/JV/BEG, uppercase)
- `SCHOOL` → `school` (3-letter code, uppercase)
- `USAArcheryNo` → `usArcheryId`
- `Email1` → `email`
- `Discipline` → `discipline` (defaults to "Recurve")
- `Disability` → `disability` (defaults to "NO", uppercase)
- `RankingAvg` → `varPr` for VAR level, `jvPr` for JV level

**Features:**
- ✅ Respects all active filters (search, status, school, level, gender, favorites)
- ✅ Only exports archers matching current filter criteria
- ✅ Shows alert if no archers match filters
- ✅ File naming: `coach-roster-simple-YYYY-MM-DD.csv`

**Use Cases:**
- Quick roster export for competitions
- Simplified format for external systems
- Template-based export matching standard format

---

## Technical Implementation

### Files Modified
- `archer_list.html` - Filter bar UI, filtering logic, export button
- `js/archer_module.js` - New `exportCoachRosterSimpleCSV()` function

### Key Functions

#### `exportCoachRosterSimpleCSV(filteredList)`
- **Location:** `js/archer_module.js` (line ~1183)
- **Parameters:** Optional filtered list (uses `getFilteredArchers()` if not provided)
- **Returns:** CSV string (also triggers download)
- **Template:** Based on `app-imports/roster_template.csv`

#### Filter Functions Updated
- `getFilteredArchers()` - Added level and gender filters
- `renderList()` - Added level and gender filters, updated sorting
- `renderShirtSizesList()` - Added level and gender filters, updated sorting

### Removed Features
- ❌ Level sort button (converted to filter dropdown)
- ❌ `sortMode` variable (no longer needed)
- ❌ Level-based sorting logic (replaced with filter)

---

## User Workflow

### Filtering Archers
1. Use any combination of filters (Gender, Level, School, Status)
2. Search by name, nickname, or school
3. Toggle favorites to show only favorite archers
4. All filters work together (AND logic)

### Exporting Filtered List
1. Apply desired filters
2. Click Coach Actions button (footer)
3. Select "Export Coach Roster Simple"
4. CSV downloads with only filtered archers

---

## Mobile Considerations

- All filter controls have 44px minimum touch targets
- Dropdowns are mobile-friendly
- Icon buttons have proper spacing
- Filter bar wraps on small screens

---

## Related Documentation

- **Archer Management:** `docs/features/archer-management/ARCHER_MANAGEMENT.md`
- **Import/Export Guide:** `docs/guides/PHASE1_UI_ACCESS_GUIDE.md`
- **Template File:** `app-imports/roster_template.csv`

---

## Future Enhancements

- [ ] Add BEG option to Level filter
- [ ] Export template customization
- [ ] Filter presets/saved filters
- [ ] Export format selection in modal
