# Import Roster Games - User Guide

**Feature:** Import archer rosters for Games Events with position assignments  
**Date Added:** February 7, 2026  
**Location:** Archer List → Coach Actions → "Import Roster Games"

---

## Overview

The **Import Roster Games** feature allows coaches to bulk import archer rosters for Games Events (non-sanctioned events) where positions are pre-assigned. This streamlined import format focuses on the essential fields needed for Games Events.

---

## CSV Format

### Required Columns

| Column | Description | Example Values | Required |
|--------|-------------|----------------|----------|
| **First Name** | Archer's first name | John, Sarah | ✅ Yes |
| **Last Name** | Archer's last name | Smith, Johnson | ✅ Yes |
| **Gender** | M (Boys) or F (Girls) | M, F | Optional (defaults to M) |
| **VJV** | Varsity or JV level | V, JV, VAR | Optional (defaults to VAR) |
| **Position** | Solo or Team position | S1, S2, T1 | Optional |
| **Discipline** | Archery discipline | Recurve, Compound, Barebow | Optional |
| **School** | 3-letter school code | WDV, BHS, HST | ✅ Yes |
| **email** | Archer's email address | john@example.com | Optional |
| **Active** | Status: active or inactive | active, inactive | Optional (defaults to active) |

### Column Name Variations

The importer accepts various column name formats (case-insensitive):

- **First Name:** `First Name`, `FirstName`, `First`
- **Last Name:** `Last Name`, `LastName`, `Last`
- **Gender:** `Gender`, `Gener` (typo tolerant)
- **VJV:** `VJV`, `Level`, `Var/JV`
- **Position:** `Position`, `Pos`, `Assignment`
- **School:** `School`, `Sch`
- **email:** `email`, `e-mail`
- **Active:** `Active`, `Status`

---

## Position Values

### Solo Positions
Assigns archers to individual bracket positions:
- `S1`, `S2`, `S3`, `S4`, `S5`, `S6`, `S7`, `S8`

### Team Positions
Assigns archers to team rosters (3 archers per team):
- `T1`, `T2`, `T3`, `T4`, `T5`, `T6`

**Note:** Archers can have BOTH a solo position (S1-S8) AND a team position (T1-T6). They're not mutually exclusive.

---

## Level/VJV Values

| CSV Value | Interpreted As | Description |
|-----------|----------------|-------------|
| V, VAR, VARSITY | VAR | Varsity level |
| JV, J | JV | Junior Varsity |
| BEG, BEGINNER | BEG | Beginner |

---

## Gender Values

| CSV Value | Interpreted As | Description |
|-----------|----------------|-------------|
| M, MALE, BOY | M | Male/Boys |
| F, FEMALE, GIRL, W, WOMAN | F | Female/Girls |

---

## Status Values

| CSV Value | Interpreted As | Description |
|-----------|----------------|-------------|
| active, a, yes | active | Archer is active |
| inactive, i, no | inactive | Archer is inactive |

---

## Sample CSV Template

```csv
First Name,Last Name,Gender,VJV,Position,Discipline,School,email,Active
John,Smith,M,V,S1,Recurve,WDV,john.smith@example.com,active
Sarah,Johnson,F,V,S1,Compound,WDV,sarah.j@example.com,active
Mike,Williams,M,V,S2,Recurve,WDV,mike.w@example.com,active
Emily,Brown,F,V,S2,Compound,WDV,emily.b@example.com,active
Chris,Davis,M,V,T1,Recurve,WDV,chris.d@example.com,active
Jessica,Martinez,F,JV,S1,Recurve,WDV,jess.m@example.com,active
Tom,Anderson,M,JV,S2,Compound,WDV,tom.a@example.com,active
Lisa,Taylor,F,JV,T1,Recurve,WDV,lisa.t@example.com,active
Alex,Thomas,M,V,S3,Barebow,BHS,alex.t@example.com,active
Morgan,White,F,V,S3,Recurve,BHS,morgan.w@example.com,active
```

**Download template:** `app-imports/roster-games-template.csv`

---

## How to Use

### Step 1: Prepare Your CSV File

1. Open Excel, Google Sheets, or any spreadsheet program
2. Create columns with the headers shown above
3. Fill in archer data row by row
4. Save/Export as **CSV format** (not XLSX)

### Step 2: Import via Archer List

1. Open `http://localhost:8001/archer_list.html`
2. Click the **"Coach"** button (orange button in top toolbar)
3. Click **"Import Roster Games"** (purple button)
4. Select your CSV file
5. Wait for import confirmation

### Step 3: Verify Import

1. Check the success message:
   - "Successfully imported X archer(s)"
   - Or "Import completed with warnings" (shows details)
2. Review the archer list to confirm archers were added/updated
3. Check position assignments via `assignment_list.html`

---

## Import Behavior

### New Archers
If an archer **doesn't exist** (matched by First Name + Last Name + School):
- Creates a new archer record
- Assigns all provided data
- Status: Increments "added" count

### Existing Archers
If an archer **already exists** (matched by First Name + Last Name + School):
- Updates existing record with new data
- Preserves fields not included in CSV
- Status: Increments "updated" count

### Duplicate Detection
Archers are matched using:
```
First Name (case-insensitive) + Last Name (case-insensitive) + School (case-insensitive)
```

---

## Examples

### Example 1: Games Event with Solo and Team Brackets

**Scenario:** Winter Games 2026 - Boys Varsity
- 4 schools competing
- Each school has 4 solo positions (S1-S4)
- Each school has 1 team (T1) with 3 archers

**CSV Structure:**
```csv
First Name,Last Name,Gender,VJV,Position,School,Active
John,Smith,M,V,S1,WDV,active
Mike,Williams,M,V,S2,WDV,active
Tom,Brown,M,V,S3,WDV,active
Steve,Davis,M,V,S4,WDV,active
John,Smith,M,V,T1,WDV,active
Mike,Williams,M,V,T1,WDV,active
Tom,Brown,M,V,T1,WDV,active
...repeat for BHS, HST, HRO...
```

**Note:** John, Mike, and Tom appear twice - once for solo position and once for team position.

### Example 2: Solo-Only Event

**Scenario:** Spring Invitational - Girls JV Solo Brackets
- 3 schools competing
- Each school has 4 solo positions
- No team brackets

**CSV Structure:**
```csv
First Name,Last Name,Gender,VJV,Position,School
Sarah,Johnson,F,JV,S1,WDV
Emily,Brown,F,JV,S2,WDV
Jessica,Martinez,F,JV,S3,WDV
Lisa,Taylor,F,JV,S4,WDV
...repeat for other schools...
```

---

## Error Handling

### Validation Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Missing required columns" | CSV headers don't match expected names | Verify column names match guide |
| "Row X: Missing first or last name" | Name field is empty | Fill in required name fields |
| "Row X: Missing school" | School code is empty | Add 3-letter school code |
| "Empty CSV content" | File is empty or not readable | Check file contents |

### Warnings

Warnings don't stop the import but notify you of issues:

- **Row X: Error parsing** - Data format issue in that row
- **MySQL sync failed** - Data saved locally but not synced to database (will sync on refresh)

---

## Best Practices

### 1. Use Consistent School Codes
- Always use 3-letter codes (e.g., WDV, BHS)
- System auto-truncates to 3 characters
- Keep codes uppercase for consistency

### 2. Validate Positions Before Import
- S1-S8: Solo bracket positions
- T1-T6: Team roster positions
- Invalid positions are ignored (set to blank)

### 3. Test with Small Files First
- Start with 5-10 archers
- Verify import works correctly
- Then import full roster

### 4. Back Up Before Large Imports
- Export current roster first (Export Coach Roster CSV)
- Import can update existing archers
- Have backup in case of mistakes

### 5. Review After Import
- Check archer count matches expected
- Verify positions via `assignment_list.html`
- Confirm schools populated correctly

---

## Troubleshooting

### Import Button Not Working
**Problem:** "Import Roster Games function not available"  
**Solution:** Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

### Positions Not Showing
**Problem:** Imported but positions don't appear  
**Solution:** 
1. Check position values in CSV (must be S1-S8 or T1-T6)
2. Open `assignment_list.html` to verify
3. Check browser console for errors

### Archers Not Updating
**Problem:** CSV imported but data didn't change  
**Solution:**
1. Verify First Name + Last Name + School match exactly
2. Check for leading/trailing spaces in CSV
3. Try using fresh extId (don't match on name)

### MySQL Sync Failed Warning
**Problem:** "MySQL sync failed" after import  
**Solution:**
- Archers are saved in localStorage (safe)
- Will auto-sync on next page refresh
- Or manually click "Refresh" button in Archer List

---

## Related Features

- **Assignment List** (`assignment_list.html`): Manually assign/verify positions
- **Position Filter** (Coach Console → Add Archers): Filter by position when adding to brackets
- **Export Coach Roster CSV**: Export current roster with all fields

---

## Technical Notes

### Data Flow
1. CSV file selected → `importRosterGamesCSV()` called
2. Parse CSV → Validate headers → Extract data
3. Match existing archers (name + school)
4. Create new or update existing records
5. Save to localStorage
6. Queue MySQL sync (async)
7. Return results to user

### Sync Behavior
- Import saves to localStorage immediately (always succeeds)
- MySQL sync happens asynchronously via `_flushPendingUpserts()`
- If sync fails, data is preserved locally and will retry on next operation

### Performance
- Can import 100+ archers in <1 second
- No limit on CSV size
- Processes row-by-row to conserve memory

---

## Comparison: Import Roster Games vs. USA Archery Import

| Feature | Import Roster Games | Import USA Archery CSV |
|---------|-------------------|----------------------|
| **Purpose** | Games Events with positions | Sanctioned event registration |
| **Columns** | 9 essential fields | 30+ detailed fields |
| **Position Support** | ✅ Yes (S1-S8, T1-T6) | ❌ No |
| **Ease of Use** | ✅ Simple spreadsheet | ⚠️ Requires template |
| **Use Case** | Weekly games, invitationals | USA Archery membership data |

---

## FAQ

**Q: Can I import archers without positions?**  
A: Yes! Position column is optional. Leave blank for archers without assigned positions.

**Q: What if I have more than 8 solo positions?**  
A: The system supports S1-S8. If you need more, you'll need to manually assign them via `assignment_list.html` after import.

**Q: Can one archer have both S1 and T1?**  
A: In the CSV, you can only specify one position per row. To assign multiple positions, either:
- Import twice with different position values
- Or import once, then use `assignment_list.html` to add the second position

**Q: What happens to archers not in the CSV?**  
A: Existing archers not in the CSV are **unchanged**. Import only adds/updates archers in the file.

**Q: Can I use this for ranking rounds?**  
A: This is designed for Games Events. For ranking rounds, use the "Add Archers" workflow in the event creation process.

---

**Last Updated:** February 7, 2026  
**Feature Status:** ✅ Ready for Production
