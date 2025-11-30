# Keypad Not Working - Authentication Issue

**Date:** November 27, 2025  
**Issue:** Keypad clicks don't work, scores not saving  
**Root Cause:** Missing event entry code for authentication

---

## Problem

When archers click the keypad to enter scores, the scores don't save and the browser console shows:
```
401 Unauthorized
```

This is because the API endpoint `/v1/rounds/{roundId}/archers/{roundArcherId}/ends` requires authentication via:
- Coach API key (for coaches), OR
- Event entry code (for archers)

---

## Root Cause

The `require_api_key()` function in `api/db.php` accepts event entry codes as valid authentication (lines 37-41):

```php
// Check event entry codes
$stmt = $pdo->prepare('SELECT id FROM events WHERE LOWER(entry_code) = LOWER(?) LIMIT 1');
$stmt->execute([$pass]);
if ($stmt->fetchColumn()) {
    $authorized = true;
}
```

The frontend (`live_updates.js`) correctly tries to send the entry code in the `X-Passcode` header (lines 202-244), but it can't find one in localStorage.

---

## Why Entry Code is Missing

When you start a scoring session, the entry code should be saved to localStorage in one of these places:

1. `localStorage.getItem('event_entry_code')` - Global entry code
2. `localStorage.getItem('event:{eventId}:meta').entryCode` - Event-specific metadata

**The entry code is NOT being saved when:**
- You load a pre-assigned bale from an event
- You resume a session from localStorage
- You start scoring without entering an entry code

---

## Quick Fix: Manually Set Entry Code

**Option 1: Use Browser Console**
```javascript
// Set the entry code for your event
localStorage.setItem('event_entry_code', 'YOUR_EVENT_CODE_HERE');

// Then reload the page
location.reload();
```

**Option 2: Check if Event Has Entry Code**
```javascript
// Check what events you have
Object.keys(localStorage).filter(k => k.startsWith('event:') && k.endsWith(':meta')).forEach(k => {
    const meta = JSON.parse(localStorage.getItem(k));
    console.log(k, meta);
});
```

---

## Permanent Fix Needed

The division fixes we just implemented don't address the entry code issue. We need to ensure the entry code is:

1. **Captured** when loading an event (from QR code or event selection)
2. **Persisted** to localStorage in multiple places for redundancy
3. **Restored** when resuming a session

### Where to Add Entry Code Persistence:

#### Fix A: In `loadEventById()` (Line ~4329)
Already has code to save entry code (lines 4386-4423), but it might not be executing.

#### Fix B: In `restoreCurrentBaleSession()` (Line ~705)
Should restore entry code from session data.

#### Fix C: In `loadPreAssignedBale()` (Line ~3665)
Should extract entry code from event snapshot if available.

---

## Testing

After setting the entry code manually:

1. Open browser console
2. Enter: `localStorage.setItem('event_entry_code', 'YOUR_CODE');`
3. Reload page
4. Try clicking keypad
5. Check console for `[LiveUpdates] Using event entry code for request.`
6. Scores should now save successfully

---

## Related Code

- `api/db.php` lines 21-65: `require_api_key()` function
- `js/live_updates.js` lines 202-244: Entry code lookup logic
- `js/ranking_round_300.js` lines 4386-4423: Entry code save logic

---

**Status:** Workaround available (manual entry code set)  
**Permanent Fix:** Needed in next update
