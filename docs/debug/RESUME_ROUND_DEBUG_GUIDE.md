# Resume Round Debug Guide

## Issues Reported

1. **Standalone rounds showing for everyone** - Should only show for the archer who created them
2. **Same archers for all rounds** - Clicking resume on different rounds shows the same archers
3. **Wrong archer data** - Selecting different archers as "me" still shows same archers

## Debugging Steps

### 1. Check Console Logs in index.html

When loading the assignments list, look for:

```
[index] Round check: {
  round_id: "...",
  event_id: "...",
  is_standalone: true/false,
  ...
  archerId: "..."
}
```

**What to check:**
- Are standalone rounds (`is_standalone: true`) showing for archers who didn't create them?
- Does the `round_id` match what you expect?
- Does the `archerId` in the log match the selected archer?

### 2. Check Console Logs When Clicking Resume

When you click a resume link, look for these log sections:

#### A. Initial Parameters
```
[handleDirectLink] ========== START ==========
[handleDirectLink] Parameters: { eventId: "...", roundId: "...", archerId: "..." }
```

**What to check:**
- Does `roundId` match the round you clicked?
- Does `archerId` match the selected archer?
- Is `eventId` correct (or `null` for standalone)?

#### B. Snapshot Data
```
[handleDirectLink] ========== SNAPSHOT DATA ==========
[handleDirectLink] Round ID from URL: "..."
[handleDirectLink] Round ID in snapshot: "..."
[handleDirectLink] Snapshot archers count: X
```

**What to check:**
- Do the round IDs match? (If not, there's a bug!)
- How many archers are in the snapshot?
- Are the archer IDs in the snapshot correct?

#### C. Merged Archers
```
[handleDirectLink] ========== MERGED ARCHERS ==========
[handleDirectLink] Total archers after merge: X
[handleDirectLink] Merged archers: [...]
```

**What to check:**
- Are the archers correct for this round?
- Do the archer IDs match what you expect?
- Are there any "test" archers with NULL archer_id?

### 3. Check Database

If standalone rounds are showing for everyone, check the database:

```sql
-- Check if standalone rounds have NULL archer_id
SELECT 
    r.id as round_id,
    r.event_id,
    ra.id as round_archer_id,
    ra.archer_id,
    ra.archer_name,
    COUNT(*) as archer_count
FROM rounds r
JOIN round_archers ra ON ra.round_id = r.id
WHERE r.event_id IS NULL  -- Standalone rounds
GROUP BY r.id, r.event_id, ra.id, ra.archer_id, ra.archer_name;
```

**What to check:**
- Do standalone rounds have entries with `archer_id = NULL`?
- Are there multiple `round_archers` entries for the same round?
- Do the `archer_name` values match the expected archers?

### 4. Check Resume Link Construction

In index.html console, look for:

```
[index] Building resume link: {
  round_id: "...",
  event_id: "...",
  is_standalone: true/false,
  archerId: "...",
  link: "..."
}
```

**What to check:**
- Is the `round_id` correct for each round?
- Is the `archerId` correct for the selected archer?
- For standalone rounds, is `event_id` null?

## Common Issues & Fixes

### Issue: Standalone rounds showing for everyone

**Possible causes:**
1. `round_archers` entries have `archer_id = NULL` (orphaned entries)
2. History API query not filtering correctly
3. Frontend not filtering by archer

**Fix:**
- Check database for NULL archer_id entries
- Verify history API query: `WHERE ra.archer_id = ?`
- Add frontend filter to exclude rounds where archer_id doesn't match

### Issue: Same archers for all rounds

**Possible causes:**
1. State pollution - previous round's data not cleared
2. Wrong roundId being used
3. Snapshot returning wrong round's data

**Fix:**
- Clear state before loading: `state.roundId = null; state.archers = [];`
- Verify roundId matches between URL and snapshot
- Check that snapshot API is using correct roundId

### Issue: Wrong archer data

**Possible causes:**
1. Archer cookie not updated
2. URL parameter not being used
3. State using stale archer data

**Fix:**
- Update archer cookie from URL: `setArcherCookieSafe(archerId)`
- Verify URL has correct archerId
- Clear state before loading

## Next Steps

1. **Run the app and check console logs** for the sections above
2. **Share the console output** so we can identify the exact issue
3. **Check the database** if standalone rounds are showing for everyone
4. **Verify the round_archers table** has correct archer_id values

