# Position Filter Implementation for Games Events

**Date:** February 7, 2026  
**Branch:** `feature/bracket-workflow-update`  
**Status:** ✅ Complete - Ready for Testing

---

## Overview

Added position/assignment filtering to the "Add Archers to Roster" modal in the Coach Console to support **Games Events** where archers are pre-assigned to specific positions (S1-S8 for solo brackets, T1-T6 for team brackets).

This enhancement enables coaches to quickly filter and select archers based on their assigned positions when populating bracket rosters.

---

## What Changed

### 1. Database Schema Enhancement

**File:** `api/sql/migration_add_assignment_field.sql`

- **Fixed ENUM values** to match assignment_list.html UI:
  ```sql
  ENUM('S1','S2','S3','S4','S5','S6','S7','S8','T1','T2','T3','T4','T5','T6','')
  ```
- Added index for performance: `idx_archers_assignment`

### 2. API Enhancement

**File:** `api/index.php` (line ~5095)

- **Added `assignment` field** to GET `/v1/archers` endpoint
- Ensures all archer data includes position assignments

### 3. UI Enhancement

**File:** `coach.html` (lines 938-962)

- **Added Position Filter dropdown** to "Add Archers to Roster" modal
- Grouped options:
  - **Solo:** S1, S2, S3, S4, S5, S6, S7, S8
  - **Team:** T1, T2, T3, T4, T5, T6
- Follows same styling as other filter dropdowns

### 4. Filtering Logic

**File:** `js/coach.js`

- **Added `roster-filter-position`** to filter event listeners (line 3174)
- **Updated `getFilteredRosterArchers()`** to filter by assignment (line 3315)
- Filters archers based on selected position before passing to ArcherSelector

### 5. Display Enhancement

**File:** `js/archer_selector.js` (lines 296-306)

- **Shows position assignment** in archer card metadata
- Format: `School • Level • Position` (e.g., "WDV • VAR • S1")
- Only displays if archer has an assignment

---

## Games Event Workflow

### Phase 1: Pre-Event Position Assignments

**Tool:** `assignment_list.html`

Coach assigns positions for each archer:

```
WDV High School - Boys Varsity:
  - John Smith → S1 (Solo position 1)
  - Mike Jones → S2, T1 (Solo 2 + Team 1)
  - Tom Brown → S3, T1
  - Steve Davis → S4
  - Chris Lee → T1 (Team only)
```

### Phase 2: Create Games Event

**Tool:** `coach.html` → Create Event

```
Event Name: "Winter Games 2026"
☐ Ranking Rounds (UNCHECKED)
☑ Solo Brackets
☑ Team Brackets
```

### Phase 3: Create Solo Bracket

**Tool:** Event Dashboard → "Create Bracket"

```
Type: Solo
Format: Swiss
Division: Boys Varsity
```

### Phase 4: Add Archers to Solo Bracket

**Tool:** "Manage Roster" → "Add Archers"

**Filter settings:**
- Gender: Boys
- Level: Varsity
- **Position: S1** (or multi-select S1-S4)
- Status: Active

**Result:** Shows ONLY Boys Varsity archers assigned to S1  
**Action:** Coach clicks "Select All Filtered" → Bulk adds all S1-S4 archers

### Phase 5: Create Team Bracket

```
Type: Team
Format: Swiss
Division: Boys Varsity
```

### Phase 6: Add Teams

**Filter settings:**
- Gender: Boys
- Level: Varsity
- **Position: T1**

**Result:** Shows ONLY Boys Varsity archers assigned to T1  
**Teams formed:** WDV T1 (3 archers), BHS T1 (3 archers), etc.

---

## Testing Checklist

### Prerequisites

1. **Run migration** (if not already run):
   ```bash
   # Via migration admin UI or directly:
   mysql -h localhost -u root -paelectricity wdv_archery < api/sql/migration_add_assignment_field.sql
   ```

2. **Verify assignment field exists**:
   ```sql
   DESCRIBE archers;
   -- Should show 'assignment' column with ENUM type
   ```

3. **Assign positions** via `assignment_list.html`:
   - Open `http://localhost:8001/assignment_list.html`
   - Assign at least 8 archers to S1-S4 positions
   - Assign at least 6 archers to T1-T2 positions (3 per team)

### Test 1: Position Filter Visibility

**Steps:**
1. Open `coach.html`
2. Navigate to an event with brackets
3. Click "Manage Roster" on a bracket
4. Click "Add Archers"

**Expected:**
- ✅ Position dropdown appears after Level dropdown
- ✅ Contains Solo (S1-S8) and Team (T1-T6) optgroups
- ✅ Default: "All Positions"

### Test 2: Filter by Solo Position

**Steps:**
1. Open "Add Archers" modal
2. Set filters:
   - Gender: Boys
   - Level: Varsity
   - Position: S1

**Expected:**
- ✅ Shows ONLY Boys Varsity archers with assignment="S1"
- ✅ Archer cards display position: "WDV • VAR • S1"
- ✅ Other positions are filtered out

### Test 3: Filter by Team Position

**Steps:**
1. Set filters:
   - Position: T1

**Expected:**
- ✅ Shows ONLY archers with assignment="T1"
- ✅ Can select all T1 archers for team bracket roster

### Test 4: Multi-Position Selection

**Steps:**
1. Set Position: S1
2. Click "Select All Filtered"
3. Change Position: S2
4. Click "Select All Filtered" again

**Expected:**
- ✅ Both S1 and S2 archers are selected
- ✅ Selection count updates correctly
- ✅ Selected archers persist across filter changes

### Test 5: No Position Filter

**Steps:**
1. Set Position: "All Positions"
2. Apply other filters (Gender: Boys, Level: VAR)

**Expected:**
- ✅ Shows all Boys Varsity archers regardless of assignment
- ✅ Includes archers with NO assignment
- ✅ Displays position in metadata where available

### Test 6: Add to Bracket Roster

**Steps:**
1. Filter by Position: S1
2. Select 3-5 archers
3. Click "Add to Round"

**Expected:**
- ✅ Selected archers added to bracket roster
- ✅ Modal closes
- ✅ Roster table updates with new archers
- ✅ API call succeeds (check network tab)

### Test 7: Mobile Responsiveness

**Steps:**
1. Open on iPhone SE viewport (375x667)
2. Open "Add Archers" modal

**Expected:**
- ✅ Position dropdown fits in filter bar
- ✅ Touch target ≥ 44px
- ✅ Scrolls correctly in modal
- ✅ No horizontal overflow

### Test 8: Dark Mode

**Steps:**
1. Toggle dark mode
2. Open "Add Archers" modal

**Expected:**
- ✅ Position dropdown styled correctly in dark mode
- ✅ Text readable
- ✅ Hover states work

---

## Database Verification

```sql
-- Check assignment field structure
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT 
FROM information_schema.columns 
WHERE table_schema = 'wdv_archery' 
  AND table_name = 'archers' 
  AND column_name = 'assignment';

-- View sample assignments
SELECT id, first_name, last_name, school, gender, level, assignment, status 
FROM archers 
WHERE assignment != '' 
LIMIT 20;

-- Count by position
SELECT assignment, COUNT(*) as count 
FROM archers 
WHERE assignment != ''
GROUP BY assignment 
ORDER BY assignment;
```

---

## API Verification

```bash
# Test archer endpoint returns assignment
curl -s http://localhost:8001/api/v1/archers | jq '.archers[0] | {firstName, lastName, school, level, assignment}'

# Expected output:
# {
#   "firstName": "John",
#   "lastName": "Smith",
#   "school": "WDV",
#   "level": "VAR",
#   "assignment": "S1"
# }
```

---

## Files Modified

1. ✅ `api/sql/migration_add_assignment_field.sql` - Fixed ENUM values
2. ✅ `api/index.php` - Added assignment to GET /v1/archers
3. ✅ `coach.html` - Added position filter dropdown
4. ✅ `js/coach.js` - Added filter logic and event listener
5. ✅ `js/archer_selector.js` - Display assignment in archer cards

---

## Known Limitations

1. **Multi-select positions:** Current dropdown only allows selecting one position at a time. To select multiple (e.g., S1-S4), coach must:
   - Filter by S1 → Select All
   - Filter by S2 → Select All
   - Repeat for S3, S4

2. **Migration timing:** If migration hasn't been run, assignment field won't exist. Check database before testing.

3. **No position validation:** System doesn't enforce position limits (e.g., max 1 archer per position per school). This is by design for flexibility.

---

## Next Steps

1. **Run migration** if not already applied
2. **Test workflow** using checklist above
3. **Assign positions** via `assignment_list.html` for test data
4. **Verify Games Event flow** end-to-end
5. **Commit changes** if tests pass

---

## Questions for Alignment

1. **Multi-select:** Should position filter support multi-select (e.g., "S1, S2, S3, S4" in one go)?
2. **Position limits:** Should system enforce max 1 archer per position per school?
3. **Team formation:** Should system auto-form teams based on T1 assignments, or does coach manually create teams?

---

**Implementation Complete** ✅  
Ready for user testing and feedback.
