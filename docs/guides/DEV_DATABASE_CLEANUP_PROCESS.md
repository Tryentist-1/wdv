# Dev Database Cleanup Process

**Purpose:** Start fresh with clean test data for debugging resume round functionality

---

## Overview

This process cleans up the dev database to remove all orphaned, incomplete, or problematic data while preserving the master archer list. This gives us a clean slate to test the resume round functionality.

---

## What Gets Deleted

- ✅ **Events** - All event definitions
- ✅ **Rounds** - All ranking round data
- ✅ **Round Archers** - All scorecard assignments
- ✅ **End Events** - All scoring data
- ✅ **Solo Matches** - All solo Olympic match data
- ✅ **Team Matches** - All team Olympic match data
- ✅ **Brackets** - All bracket definitions and entries

## What Gets Preserved

- ✅ **Archers** - Master archer list (KEPT)

---

## Cleanup Process

### Step 1: Review Current Data

Before deleting, preview what will be deleted:

```bash
# Connect to dev database
mysql -u root -p wdv_local

# Run preview queries (first part of cleanup script)
source api/sql/cleanup_dev_database_fresh_start.sql
```

**Review the preview output** to ensure you're comfortable with what will be deleted.

### Step 2: Optional Backup

If you want to keep a backup before cleaning:

```sql
-- Uncomment backup lines in cleanup script
CREATE TABLE events_backup_fresh_start AS SELECT * FROM events;
CREATE TABLE rounds_backup_fresh_start AS SELECT * FROM rounds;
-- ... etc
```

### Step 3: Run Cleanup Script

```bash
# Option 1: Run via mysql command line
mysql -u root -p wdv_local < api/sql/cleanup_dev_database_fresh_start.sql

# Option 2: Run via phpMyAdmin
# Copy/paste the SQL from cleanup_dev_database_fresh_start.sql
```

### Step 4: Verify Cleanup

The script includes verification queries that should show:
- All competition tables: 0 records
- Archers table: Preserved with all records

### Step 5: Verify in Application

1. **Check archer list:**
   ```bash
   curl http://localhost:8001/api/v1/archers | jq '.archers | length'
   ```
   Should show all archers still present.

2. **Check events:**
   ```bash
   curl -H "X-Passcode: wdva26" http://localhost:8001/api/v1/events | jq '.events | length'
   ```
   Should return 0.

3. **Verify in browser:**
   - Open coach console: http://localhost:8001/coach.html
   - Check that archer list loads
   - Verify no events are shown

---

## After Cleanup: Testing Workflow

### 1. Create Fresh Test Event

1. Open coach console: http://localhost:8001/coach.html
2. Create new test event:
   - Name: "Resume Round Test Event"
   - Date: Today
   - Status: Active
   - Entry Code: `TEST123`

### 2. Create Division Rounds

1. In coach console, create division rounds for the event
2. Assign archers to bales (or use auto-assign)

### 3. Test Resume Round Flow

1. **Start scoring:**
   - Go to ranking_round_300.html
   - Enter event code: `TEST123`
   - Select bale and start scoring
   - Score 2-3 ends

2. **Test resume:**
   - Reload page
   - Should prompt to resume
   - Verify scores are loaded correctly
   - Verify entry code is preserved

3. **Test direct link:**
   - Get round ID from console or database
   - Navigate to: `ranking_round_300.html?event=X&round=Y&archer=Z`
   - Should go directly to scoring view

4. **Test event modal:**
   - Open ranking_round_300.html (no params)
   - Event modal should show test event
   - Should show "In Progress" badge if round exists

---

## Troubleshooting

### Issue: Foreign Key Constraints

If you get foreign key constraint errors:

```sql
SET FOREIGN_KEY_CHECKS = 0;
-- Run cleanup script
SET FOREIGN_KEY_CHECKS = 1;
```

The cleanup script already includes this.

### Issue: Some Tables Don't Exist

If Phase 2 tables (solo_matches, brackets) don't exist yet, that's fine. The script will handle missing tables gracefully with warnings.

### Issue: Want to Restore Backup

If you created backups and want to restore:

```sql
-- Restore from backup tables
INSERT INTO events SELECT * FROM events_backup_fresh_start;
INSERT INTO rounds SELECT * FROM rounds_backup_fresh_start;
-- ... etc
```

---

## Safety Checklist

Before running cleanup:

- [ ] Review preview queries output
- [ ] Verify you're on dev database (NOT production!)
- [ ] Confirm archer count looks correct
- [ ] Optional: Create backup tables
- [ ] Close any active scoring sessions
- [ ] Verify database connection works

After cleanup:

- [ ] Verify all competition tables are empty
- [ ] Verify archers table still has all records
- [ ] Test archer list loads in application
- [ ] Ready to create fresh test events

---

## Related Scripts

- `api/sql/cleanup_rounds_and_ends.sql` - Simpler cleanup (keeps events)
- `api/sql/cleanup_orphaned_data.sql` - Only removes orphaned data
- `api/sql/cleanup_test_rounds.sql` - Clean specific round

---

**Last Updated:** December 2025  
**Status:** Ready for use

