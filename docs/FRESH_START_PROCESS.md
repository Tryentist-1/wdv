# Fresh Start Process - Verifying Resume Round Functionality

**Date:** December 2025  
**Purpose:** Clean process to verify resume round functionality with clean data

---

## The Problem

We have a lot of bad and orphaned data in dev that makes it difficult to:
- Test resume round functionality reliably
- Identify real bugs vs data issues
- Verify the process is working correctly

**Solution:** Clean the database to start fresh, preserving only the master archer list.

---

## Quick Start

### Option 1: Use Helper Script (Recommended)

```bash
# Run the cleanup script
./cleanup-dev-db.sh

# Follow the prompts:
# 1. Review preview of data to be deleted
# 2. Confirm deletion
# 3. Script verifies cleanup worked
```

### Option 2: Manual SQL Execution

```bash
# Preview what will be deleted
mysql -u root -p wdv_local < api/sql/cleanup_dev_database_fresh_start.sql

# Or run in mysql client
mysql -u root -p wdv_local
source api/sql/cleanup_dev_database_fresh_start.sql
```

---

## What Gets Deleted vs Preserved

### ✅ Deleted (All Competition Data)
- Events
- Rounds
- Round Archers (scorecards)
- End Events (scores)
- Solo Matches
- Team Matches
- Brackets & Bracket Entries

### ✅ Preserved (Master Data)
- **Archers** - Complete master list with all archer profiles

---

## After Cleanup: Testing Workflow

### Step 1: Create Fresh Test Event

1. **Open coach console:**
   ```
   http://localhost:8001/coach.html
   ```

2. **Create test event:**
   - Name: "Resume Round Test - [Today's Date]"
   - Date: Today
   - Status: Active
   - Entry Code: `TEST001` (or any code)

3. **Create division rounds:**
   - Create rounds for divisions you want to test (e.g., BVAR, GVAR)
   - Or let the system create them automatically

4. **Assign archers:**
   - Use "Auto-Assign to Bales" or manually assign
   - Assign at least 4 archers to a bale for testing

### Step 2: Test Resume Round Flow

#### Test 1: Basic Resume (Page Reload)

1. **Start scoring:**
   - Go to: `http://localhost:8001/ranking_round_300.html`
   - Enter event code: `TEST001`
   - Select a bale (if manual mode)
   - Start scoring
   - Score 2-3 ends (don't finish)

2. **Test resume:**
   - Reload page (F5 or Cmd+R)
   - Should see resume prompt
   - Click "OK" to resume
   - **Verify:** All scores are still there
   - **Verify:** Can continue scoring from where you left off

#### Test 2: Direct Link Resume

1. **Get round details:**
   - Open browser console (F12)
   - Look for round ID in console logs
   - Or check database:
     ```sql
     SELECT id, event_id FROM rounds ORDER BY created_at DESC LIMIT 1;
     ```

2. **Test direct link:**
   - Get your archer ID from cookies or console
   - Navigate to:
     ```
     ranking_round_300.html?event=EVENT_ID&round=ROUND_ID&archer=ARCHER_ID
     ```
   - **Verify:** Goes directly to scoring view (no modal)
   - **Verify:** Scores loaded correctly

#### Test 3: Event Modal Resume

1. **Open ranking round page:**
   - Go to: `http://localhost:8001/ranking_round_300.html` (no params)

2. **Check event modal:**
   - Should see your test event in the list
   - Should show "⏳ In Progress" badge if round exists
   - Should show progress (e.g., "3/10 ends")

3. **Click event:**
   - **Verify:** Navigates to direct link automatically
   - **Verify:** Goes straight to scoring view

#### Test 4: Entry Code Persistence

1. **Start scoring with entry code:**
   - Enter code: `TEST001`
   - Start scoring

2. **Clear global entry code:**
   - Open browser console
   - Run: `localStorage.removeItem('event_entry_code')`
   - Reload page

3. **Resume:**
   - Should still work (uses entry code from bale session)
   - **Verify:** No 401 errors
   - **Verify:** Console shows entry code retrieved from session

### Step 3: Verify Data Integrity

After completing a round:

1. **Check database:**
   ```sql
   -- Should see your round
   SELECT * FROM rounds ORDER BY created_at DESC LIMIT 1;
   
   -- Should see scorecards
   SELECT * FROM round_archers WHERE round_id = 'YOUR_ROUND_ID';
   
   -- Should see scores
   SELECT * FROM end_events WHERE round_id = 'YOUR_ROUND_ID' ORDER BY end_number;
   ```

2. **Check resume works:**
   - Close browser completely
   - Reopen and navigate to ranking round page
   - Should prompt to resume
   - All data should be there

---

## Troubleshooting

### Issue: Resume Not Working

**Check 1: Entry Code**
- Open console and check for entry code errors
- Verify entry code is saved in localStorage
- Try re-entering event code manually

**Check 2: Session Data**
- Check `localStorage.getItem('current_bale_session')`
- Should have `roundId`, `baleNumber`, `entryCode`
- If missing, session wasn't saved

**Check 3: Database**
- Verify round exists in database
- Verify round_archers exist for the round
- Verify end_events exist for the archers

### Issue: Direct Link Not Working

**Check 1: URL Parameters**
- Verify event ID, round ID, and archer ID are correct
- Check console for errors fetching round data

**Check 2: Entry Code**
- Direct links need entry code for authentication
- Check if entry code is in localStorage
- May need to enter code first

### Issue: Event Modal Not Showing Rounds

**Check 1: Archer History**
- Event modal fetches archer history from API
- Verify: `GET /v1/archers/{archerId}/history`
- Should return rounds for the event

**Check 2: Event Status**
- Event must be "Active" to show in modal
- Check event status in database or coach console

---

## Success Criteria

✅ **Resume works after page reload**
- All scores preserved
- Can continue scoring
- Entry code persists

✅ **Direct links work**
- Goes straight to scoring (no modal)
- Scores loaded correctly
- Entry code available

✅ **Event modal shows progress**
- In-progress rounds shown
- Status badges displayed
- One-click resume works

✅ **Entry code persists everywhere**
- Works after clearing global storage
- Works across browser restarts
- No 401 errors

---

## Next Steps After Verification

Once resume round is working:

1. ✅ Document any remaining issues
2. ✅ Create test scenarios for edge cases
3. ✅ Update `01-SESSION_QUICK_START.md` status
4. ✅ Mark resume round as functional

---

## Related Documentation

- `docs/RESTART_ROUND_AND_EVENT_CODE_WORK_SUMMARY.md` - Complete summary of work
- `docs/DEV_DATABASE_CLEANUP_PROCESS.md` - Detailed cleanup process
- `docs/RESUME_ROUND_DATA_INTEGRATION_ANALYSIS.md` - Data integration analysis
- `api/sql/cleanup_dev_database_fresh_start.sql` - Cleanup SQL script

---

**Last Updated:** December 2025  
**Status:** Ready for testing

