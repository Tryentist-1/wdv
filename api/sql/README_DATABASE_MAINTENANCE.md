# Database Maintenance SQL Scripts

This directory contains SQL scripts for inspecting, maintaining, and cleaning up the database.

## Quick Reference

| Script | Purpose | Safe to Run? |
|--------|---------|--------------|
| `check_orphans_preview.sql` | Preview orphaned data | ✅ Yes - read-only |
| `cleanup_orphaned_data.sql` | Delete orphaned records | ⚠️ Modifies data |
| `inspect_database_structure.sql` | Show indexes, constraints, columns | ✅ Yes - read-only |
| `add_missing_constraints.sql` | Check/add missing indexes & FKs | ⚠️ Modifies structure |
| `generate_current_schema.sql` | Export current table definitions | ✅ Yes - read-only |

---

## Workflow: Check and Fix Orphaned Data

### Step 1: Preview Orphaned Data
**File:** `check_orphans_preview.sql`

```sql
-- Run in phpMyAdmin SQL tab
-- Shows what orphaned records exist without modifying anything
```

**What it checks:**
- Orphaned rounds (event_id points to deleted events)
- Orphaned end_events (round_id or round_archer_id invalid)
- Orphaned round_archers (round_id invalid)
- Current table sizes

### Step 2: Clean Up Orphans
**File:** `cleanup_orphaned_data.sql`

```sql
-- WARNING: This deletes data!
-- Run AFTER reviewing preview results
-- Deletes orphaned records in safe order
```

**What it does:**
1. Shows preview (same as Step 1)
2. Deletes orphaned end_events
3. Deletes orphaned round_archers
4. Deletes orphaned rounds (cascades to children)
5. Verifies cleanup (all should return 0)

**Safe deletion order:**
```
end_events → round_archers → rounds
(leaf nodes first, prevents FK violations)
```

---

## Workflow: Inspect and Fix Schema

### Step 1: Inspect Current Database Structure
**File:** `inspect_database_structure.sql`

```sql
-- Run in phpMyAdmin SQL tab
-- Shows complete database structure
```

**What it shows:**
- Complete CREATE TABLE statements
- All indexes on each table
- All foreign key constraints
- Column definitions and types
- Summary of index/FK counts

### Step 2: Compare with Expected Schema
**File:** `generate_current_schema.sql`

```sql
-- Generates SHOW CREATE TABLE for all tables
-- Compare output with schema.mysql.sql
```

**Manually compare:**
1. Run `generate_current_schema.sql` in phpMyAdmin
2. Open `schema.mysql.sql` in editor
3. Look for differences in:
   - Column definitions
   - Indexes
   - Foreign keys
   - Default values

### Step 3: Add Missing Constraints/Indexes
**File:** `add_missing_constraints.sql`

```sql
-- First runs checks to see what's missing
-- Then provides ALTER statements to add them
```

**Two-phase approach:**
1. **Phase 1 (read-only):** Runs SELECT queries showing which indexes/FKs are MISSING
2. **Phase 2 (modify):** Uncomment and run ALTER TABLE statements for missing items

---

## Common Issues & Solutions

### Issue 1: Orphaned Rounds After Event Deletion

**Symptom:** Rounds exist with `event_id` pointing to deleted events

**Cause:** Event deleted in UI, cleanup didn't cascade properly

**Fix:**
```sql
-- Preview first
source check_orphans_preview.sql

-- Then clean up
source cleanup_orphaned_data.sql
```

**Prevention:** Add foreign key constraint:
```sql
ALTER TABLE rounds 
ADD CONSTRAINT fk_rounds_event 
FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;
```

### Issue 2: Missing Foreign Key Constraints

**Symptom:** Manual deletions don't cascade, orphaned records remain

**Check:**
```sql
source inspect_database_structure.sql
-- Look for "ALL FOREIGN KEY CONSTRAINTS" section
```

**Expected constraints:**
- `round_archers.round_id` → `rounds.id` (CASCADE)
- `end_events.round_id` → `rounds.id` (CASCADE)
- `end_events.round_archer_id` → `round_archers.id` (CASCADE)

**Fix:** Uncomment and run ALTER statements in `add_missing_constraints.sql`

### Issue 3: Missing Indexes (Slow Queries)

**Symptom:** Slow queries, especially on large tables

**Check:**
```sql
source add_missing_constraints.sql
-- Look for index checks - any marked "MISSING"?
```

**Expected indexes:**
- Events: `idx_events_date`, `idx_events_status`, `idx_events_entry_code`
- Rounds: `idx_rounds_event`, `idx_rounds_date`, `idx_rounds_division`, `idx_rounds_status`
- Round_archers: `idx_ra_round`, `idx_ra_bale`, `idx_ra_completed`
- End_events: `idx_ev_round`, `idx_ev_ts`, `uq_ra_end` (unique)

**Fix:** Uncomment and run ALTER statements in `add_missing_constraints.sql`

---

## How to Run SQL Scripts in phpMyAdmin

1. **Open phpMyAdmin** in your browser
2. **Select database** `wdv` from left sidebar
3. Click **SQL** tab at top
4. **Copy and paste** script contents into the text area
5. Click **Go** to execute

**Tips:**
- You can run entire scripts or individual queries
- Use `-- comments` to disable specific queries
- For multi-query scripts, enable "Enable multi-query execution" if needed
- Review preview results before running DELETE/ALTER statements

---

## When to Run These Scripts

### Regular Maintenance (Weekly/Monthly)
- `check_orphans_preview.sql` - Check for data integrity issues

### After Manual Database Changes
- `inspect_database_structure.sql` - Verify structure is correct
- `generate_current_schema.sql` - Update documentation

### After Event Deletion Issues
- `check_orphans_preview.sql` - See what orphans exist
- `cleanup_orphaned_data.sql` - Clean up orphans

### During Deployment/Migration
- `generate_current_schema.sql` - Document current state
- `add_missing_constraints.sql` - Ensure indexes/FKs exist

---

## Safety Notes

✅ **Safe to run anytime (read-only):**
- `check_orphans_preview.sql`
- `inspect_database_structure.sql`
- `generate_current_schema.sql`
- Index/FK checks in `add_missing_constraints.sql` (before uncommenting ALTER statements)

⚠️ **Review before running (modifies data):**
- `cleanup_orphaned_data.sql` - Deletes orphaned records
- ALTER statements in `add_missing_constraints.sql` - Changes schema

🚫 **Never run on production without:**
1. Database backup
2. Preview of what will be affected
3. Testing on staging/dev first

---

## Reference: Schema Files

- **`schema.mysql.sql`** - Expected database schema (source of truth)
- **`migration_*.sql`** - Historical schema changes
- **`cleanup_*.sql`** - One-time cleanup scripts (already run)
- **`helper_queries.sql`** - Useful admin queries

Compare current database structure with `schema.mysql.sql` to identify drift.

