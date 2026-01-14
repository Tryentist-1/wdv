# Event Deletion Bug: Orphaned "Stand Alone" Rounds Created

**Date:** 2025-01-XX
**Page/Module:** `api/index.php` - Event deletion endpoint
**Severity:** 🔴 High
**Status:** 🔴 Open

---

## 🐛 Bug Description

**What's broken:**
When events are deleted through the Coach Console, the deletion endpoint (`DELETE /v1/events/:id`) unlinks rounds from the event (sets `event_id=NULL`) instead of deleting them. This creates orphaned "Stand Alone" rounds that remain in the database with no parent event.

**User Impact:**
- Many "Stand Alone" rounds appearing in production after test event deletions
- Orphaned rounds and scorecards remain in database, cluttering the system
- Data integrity issue: rounds exist without parent events
- Potential confusion in coach console and results pages
- Database bloat from orphaned data

---

## 🔍 Steps to Reproduce

1. Create a test event in Coach Console
2. Add rounds to the event (or let the system create division rounds)
3. Add archers and enter some scores (creates round_archers and end_events)
4. Delete the event through Coach Console
5. **Observe:** Rounds still exist in database with `event_id=NULL` (showing as "Stand Alone")
6. **Expected:** Rounds, round_archers, and end_events should be deleted when event is deleted

**Environment:**
- Production: `https://archery.tryentist.com`
- Coach Console: `coach.html`
- API Endpoint: `DELETE /v1/events/:id`

---

## 📸 Evidence

**Current Behavior:**
- Multiple "Stand Alone" rounds created today in production
- User deleted test events, but rounds remain orphaned
- Rounds have `event_id = NULL` instead of being deleted

**Database Query Results (Production - 2025-01-XX):**
- **Total orphaned rounds:** 100+ rounds with `event_id IS NULL`
- **Rounds with data:** Multiple rounds have scorecards and ends attached
- **Date range:** From 2025-11-04 to 2026-01-13
- **Examples:**
  - Round `d8657021-a640-4ded-bdfe-c5a3cf9d0c54`: 117 scorecards, 25 ends
  - Round `caa59efd-c271-45f4-8634-fb931388e912`: 33 scorecards, 2 ends
  - Round `a8497233-2b83-4616-b325-193e739da789`: 11 scorecards, 3 ends
  - Many rounds with 0 scorecards (empty rounds)

**Database Query to Verify:**
```sql
-- Count orphaned rounds (event_id is NULL)
SELECT COUNT(*) as orphaned_rounds
FROM rounds
WHERE event_id IS NULL;

-- Show orphaned rounds with details
SELECT 
    r.id,
    r.round_type,
    r.division,
    r.status,
    r.created_at,
    COUNT(DISTINCT ra.id) as scorecard_count,
    COUNT(DISTINCT ee.id) as end_count
FROM rounds r
LEFT JOIN round_archers ra ON ra.round_id = r.id
LEFT JOIN end_events ee ON ee.round_id = r.id
WHERE r.event_id IS NULL
GROUP BY r.id
ORDER BY r.created_at DESC;
```

---

## 🔍 Root Cause Analysis

### The Problem

**File:** `api/index.php` (lines 2847-2870)

The `DELETE /v1/events/:id` endpoint has a problematic deletion strategy:

```php
// First unlink all rounds from this event
$unlink = $pdo->prepare('UPDATE rounds SET event_id=NULL WHERE event_id=?');
$unlink->execute([$eventId]);

// Then delete the event
$delete = $pdo->prepare('DELETE FROM events WHERE id=?');
$delete->execute([$eventId]);
```

**Issues:**
1. **Unlinks instead of deletes:** Sets `event_id=NULL` instead of deleting rounds
2. **Orphaned data:** Rounds, round_archers, and end_events remain in database
3. **Inconsistent with other deletion method:** `data_admin.php` has `deleteEventCascade()` that properly deletes everything

### Comparison: Two Different Deletion Methods

**Method 1: API Endpoint (CURRENT - BROKEN)**
- Location: `api/index.php` line 2847
- Behavior: Unlinks rounds (sets `event_id=NULL`)
- Result: Orphaned rounds remain

**Method 2: Data Admin Function (CORRECT)**
- Location: `api/data_admin.php` line 128
- Function: `deleteEventCascade()`
- Behavior: Properly deletes rounds, round_archers, and end_events
- Result: Clean deletion

### Why This Happens

The API endpoint was likely designed to "preserve" rounds when deleting events, but this creates data integrity issues:
- Rounds without events are confusing
- No way to identify which rounds belong to deleted events
- Database bloat from orphaned data
- Potential issues in coach console and results pages

---

## ✅ Solution

### Fix Strategy

**Option 1: Use Cascade Deletion (Recommended)**
- Update `DELETE /v1/events/:id` to use cascade deletion like `deleteEventCascade()`
- Delete rounds, round_archers, and end_events when event is deleted
- Maintain data integrity

**Option 2: Add Cleanup Endpoint**
- Keep current behavior but add cleanup endpoint
- Allow coaches to manually clean up orphaned rounds
- Less ideal - doesn't prevent the problem

### Implementation

**File:** `api/index.php` (lines 2847-2870)

**Current Code:**
```php
// Delete event
if (preg_match('#^/v1/events/([0-9a-f-]+)$#i', $route, $m) && $method === 'DELETE') {
    require_api_key();
    $eventId = $m[1];
    try {
        $pdo = db();
        // First unlink all rounds from this event
        $unlink = $pdo->prepare('UPDATE rounds SET event_id=NULL WHERE event_id=?');
        $unlink->execute([$eventId]);
        
        // Then delete the event
        $delete = $pdo->prepare('DELETE FROM events WHERE id=?');
        $delete->execute([$eventId]);
        // ...
    }
}
```

**Proposed Fix:**
```php
// Delete event (with cascade deletion)
if (preg_match('#^/v1/events/([0-9a-f-]+)$#i', $route, $m) && $method === 'DELETE') {
    require_api_key();
    $eventId = $m[1];
    try {
        $pdo = db();
        $pdo->beginTransaction();
        
        // Get all round IDs for this event
        $roundStmt = $pdo->prepare('SELECT id FROM rounds WHERE event_id = ?');
        $roundStmt->execute([$eventId]);
        $roundIds = $roundStmt->fetchAll(PDO::FETCH_COLUMN);
        
        if (!empty($roundIds)) {
            $placeholders = implode(',', array_fill(0, count($roundIds), '?'));
            
            // Delete end_events (scores)
            $endsStmt = $pdo->prepare("DELETE FROM end_events WHERE round_id IN ($placeholders)");
            $endsStmt->execute($roundIds);
            
            // Delete round_archers (scorecards)
            $archerStmt = $pdo->prepare("DELETE FROM round_archers WHERE round_id IN ($placeholders)");
            $archerStmt->execute($roundIds);
            
            // Delete rounds
            $roundDelStmt = $pdo->prepare("DELETE FROM rounds WHERE id IN ($placeholders)");
            $roundDelStmt->execute($roundIds);
        }
        
        // Finally delete the event
        $eventDelStmt = $pdo->prepare('DELETE FROM events WHERE id = ?');
        $eventDelStmt->execute([$eventId]);
        
        $pdo->commit();
        
        if ($eventDelStmt->rowCount() > 0) {
            json_response(['message' => 'Event deleted successfully'], 200);
        } else {
            json_response(['error' => 'Event not found'], 404);
        }
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("Event deletion failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}
```

**Alternative: Reuse Existing Function**
- Extract `deleteEventCascade()` from `data_admin.php` to a shared utility
- Call it from the API endpoint
- Ensures consistency across deletion methods

---

## 🧪 Testing Plan

### Test Cases

1. **Primary Fix Test**
   - Create test event with rounds and scores
   - Delete event through Coach Console
   - **Expected:** Event, rounds, round_archers, and end_events all deleted
   - **Verify:** Query database - no orphaned rounds with `event_id=NULL`

2. **Regression Tests**
   - Test event deletion with no rounds (should still work)
   - Test event deletion with solo matches (should not be affected)
   - Test event deletion with team matches (should not be affected)
   - Test event reset functionality (should still work)

3. **Database Integrity Tests**
   - Verify no orphaned round_archers after event deletion
   - Verify no orphaned end_events after event deletion
   - Verify foreign key constraints are respected

### Database Verification Queries

```sql
-- Before fix: Should show orphaned rounds
SELECT COUNT(*) FROM rounds WHERE event_id IS NULL;

-- After fix: Should return 0 (or only intentionally standalone rounds)
SELECT COUNT(*) FROM rounds r 
WHERE r.event_id IS NULL 
AND NOT EXISTS (
    SELECT 1 FROM events e WHERE e.id = r.event_id
);

-- Check for orphaned round_archers
SELECT COUNT(*) FROM round_archers ra
WHERE NOT EXISTS (
    SELECT 1 FROM rounds r WHERE r.id = ra.round_id
);

-- Check for orphaned end_events
SELECT COUNT(*) FROM end_events ee
WHERE NOT EXISTS (
    SELECT 1 FROM rounds r WHERE r.id = ee.round_id
);
```

---

## 📋 Implementation Checklist

- [x] Root cause identified ✅
- [x] Fix strategy decided ✅ (Cascade deletion)
- [x] Fix implemented ✅
- [ ] Code tested locally
- [ ] Database queries verified (no orphaned data after fix)
- [ ] Regression tests passed
- [x] Documentation updated ✅
- [ ] Cleanup script created for existing orphaned data (100+ rounds need cleanup)
- [ ] Ready for deployment

---

## 🔧 Cleanup Existing Orphaned Data

**Before deploying fix, may need to clean up existing orphaned rounds:**

```sql
-- Preview orphaned rounds (run first to see what will be deleted)
SELECT 
    r.id,
    r.round_type,
    r.division,
    r.status,
    r.created_at,
    COUNT(DISTINCT ra.id) as scorecard_count,
    COUNT(DISTINCT ee.id) as end_count
FROM rounds r
LEFT JOIN round_archers ra ON ra.round_id = r.id
LEFT JOIN end_events ee ON ee.round_id = r.id
WHERE r.event_id IS NULL
GROUP BY r.id
ORDER BY r.created_at DESC;

-- Delete orphaned rounds (CASCADE will delete round_archers and end_events)
-- WARNING: Only run after verifying the rounds are truly orphaned!
DELETE FROM rounds WHERE event_id IS NULL;
```

**Cleanup Script Created:**
- `api/sql/cleanup_orphaned_rounds_from_event_deletion.sql` - Safe cleanup script with preview queries and backup options

**Or use existing cleanup script:**
- `api/sql/cleanup_orphaned_data.sql` (lines 86-95)

---

## 🔗 Related Issues

- Similar issue may exist with solo/team match deletion
- Event reset functionality (`/v1/events/:id/reset`) keeps rounds - this is intentional
- Data admin has correct cascade deletion function that could be reused

---

## 📝 Notes

**Why "Stand Alone" Rounds Exist:**
- The system allows creating rounds without events (standalone rounds)
- These are legitimate use cases
- The bug creates "orphaned" standalone rounds that were originally linked to events

**Distinguishing Legitimate vs Orphaned:**
- Legitimate standalone rounds: Created intentionally without event
- Orphaned rounds: Created with event, but event was deleted and round was unlinked

**Investigation Needed:**
- Check if there's a way to distinguish legitimate standalone rounds from orphaned ones
- Consider adding a flag or timestamp to track when rounds become orphaned
- Or simply delete all rounds when events are deleted (cleaner approach)

---

## ✅ Fix Applied

**Date:** 2025-01-XX
**Files Changed:**
- `api/index.php` - Updated DELETE event endpoint to use cascade deletion (lines ~2847-2895)

**Summary:**
1. **Replaced unlink logic with cascade deletion:**
   - Deletes `end_events` first (scores)
   - Deletes `round_archers` second (scorecards)
   - Deletes `rounds` third
   - Deletes `events` last
   - Uses transaction for atomicity

2. **Added deletion summary in response:**
   - Returns count of deleted rounds, round_archers, and end_events
   - Helps verify successful deletion

3. **Production findings:**
   - 100+ orphaned rounds currently in production
   - Some rounds have significant data (117 scorecards, 33 scorecards, etc.)
   - Cleanup needed for existing orphaned data

**Next Steps:**
- Test fix locally
- Create cleanup script for existing 100+ orphaned rounds
- Deploy fix
- Run cleanup script to remove existing orphaned data

---

**Status:** 🟡 In Progress (Fix implemented, needs testing and cleanup)
**Priority:** High
**Fix Applied:** 2025-01-XX
