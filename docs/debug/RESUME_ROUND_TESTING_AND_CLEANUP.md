# Resume Round Testing and Cleanup Guide

## Automated Tests

### Running the Tests

```bash
# Run all resume flow tests
npx playwright test tests/resume_round_standalone_flow.spec.js

# Run with UI (interactive)
npx playwright test tests/resume_round_standalone_flow.spec.js --ui

# Run in headed mode (see browser)
npx playwright test tests/resume_round_standalone_flow.spec.js --headed

# Run for local dev
npx playwright test tests/resume_round_standalone_flow.spec.js --config=playwright.config.local.js
```

### Test Coverage

The tests cover the three reported issues:

1. **Standalone rounds visibility** - Verifies standalone rounds only show for the archer who created them
2. **Correct archers per round** - Verifies each round loads its own archers, not a cached set
3. **ArcherId from URL** - Verifies the URL parameter takes precedence over cookie

### Test Structure

- `should only show standalone rounds to the archer who created them` - Tests filtering
- `should load correct archers for each round when resuming` - Tests roundId usage
- `should use correct archerId from URL parameter, not cookie` - Tests archerId precedence

## Cleanup Scripts

### SQL Cleanup Script

Location: `api/sql/cleanup_orphaned_round_archers.sql`

**Usage:**
1. Review the SELECT queries first to see what will be affected
2. Run the DELETE statements one at a time
3. Verify with the verification queries at the end

**What it fixes:**
- Orphaned entries with NULL `archer_id` (test entries)
- Standalone rounds with multiple archer assignments
- Duplicate archer assignments to the same round

### PHP Cleanup Script

Location: `api/cleanup_orphaned_round_archers.php`

**Usage:**

```bash
# Dry run (see what would be fixed, no changes)
php api/cleanup_orphaned_round_archers.php --dry-run

# Delete orphaned entries (NULL archer_id, older than 1 day)
php api/cleanup_orphaned_round_archers.php --delete-orphaned

# Fix standalone rounds (keep only first archer)
php api/cleanup_orphaned_round_archers.php --fix-standalone

# Fix duplicate assignments (keep entry with bale/target)
php api/cleanup_orphaned_round_archers.php --fix-duplicates

# Do everything (with dry-run first!)
php api/cleanup_orphaned_round_archers.php --dry-run --delete-orphaned --fix-standalone --fix-duplicates
php api/cleanup_orphaned_round_archers.php --delete-orphaned --fix-standalone --fix-duplicates
```

**What it does:**
1. Reports orphaned entries (NULL archer_id)
2. Reports standalone rounds with multiple archers
3. Reports duplicate archer assignments
4. Optionally fixes each issue (with safety checks)

## Recommended Workflow

### 1. Check for Dirty Data

```bash
# Run the PHP script in dry-run mode
php api/cleanup_orphaned_round_archers.php --dry-run
```

This will show you:
- How many orphaned entries exist
- Which standalone rounds have multiple archers
- Which rounds have duplicate assignments

### 2. Review the Issues

Look at the output and decide:
- Are the orphaned entries safe to delete? (They're "test" entries)
- Should standalone rounds have multiple archers? (Usually no)
- Are duplicates intentional? (Usually no)

### 3. Run Cleanup (if needed)

```bash
# First, do a dry-run to see what will be deleted
php api/cleanup_orphaned_round_archers.php --dry-run --delete-orphaned --fix-standalone --fix-duplicates

# If the output looks correct, run without --dry-run
php api/cleanup_orphaned_round_archers.php --delete-orphaned --fix-standalone --fix-duplicates
```

### 4. Run Tests

```bash
# Run the automated tests to verify fixes
npx playwright test tests/resume_round_standalone_flow.spec.js
```

### 5. Manual Testing

1. Select different archers as "me" in index.html
2. Check that each archer only sees their own rounds
3. Click resume on different rounds
4. Verify each round shows its own archers
5. Check console logs for the debug output

## Common Issues

### Issue: "Standalone rounds showing for everyone"

**Root cause:** `round_archers` entries with NULL `archer_id` or multiple archers assigned

**Fix:**
```bash
php api/cleanup_orphaned_round_archers.php --delete-orphaned --fix-standalone
```

### Issue: "Same archers for all rounds"

**Root cause:** State pollution or wrong roundId being used

**Fix:** Already fixed in code (state clearing), but verify with tests:
```bash
npx playwright test tests/resume_round_standalone_flow.spec.js -g "correct archers"
```

### Issue: "Wrong archer data"

**Root cause:** Cookie not updated from URL parameter

**Fix:** Already fixed in code (cookie update), but verify with tests:
```bash
npx playwright test tests/resume_round_standalone_flow.spec.js -g "archerId from URL"
```

## Database Queries for Manual Inspection

### Check orphaned entries
```sql
SELECT COUNT(*) FROM round_archers WHERE archer_id IS NULL;
```

### Check standalone rounds with multiple archers
```sql
SELECT r.id, COUNT(DISTINCT ra.archer_id) as archer_count
FROM rounds r
JOIN round_archers ra ON ra.round_id = r.id
WHERE r.event_id IS NULL AND ra.archer_id IS NOT NULL
GROUP BY r.id
HAVING archer_count > 1;
```

### Check duplicate assignments
```sql
SELECT round_id, archer_id, COUNT(*) as count
FROM round_archers
WHERE archer_id IS NOT NULL
GROUP BY round_id, archer_id
HAVING count > 1;
```

