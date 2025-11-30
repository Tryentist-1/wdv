# Phase 2 Authentication Implementation - Match Code System

**Date:** November 17, 2025  
**Status:** ✅ Implemented  
**Solution:** Option A - Match Code Authentication

---

## Implementation Summary

Match code authentication has been implemented for Solo Olympic matches, allowing standalone matches (without event codes) to function properly.

### Match Code Format
- **Pattern:** `solo-[INITIALS]-[MMDD]`
- **Example:** `solo-JSJD-1117` (John Smith vs Jane Doe on November 17)
- **Uniqueness:** If code exists, appends number (e.g., `solo-JSJD-11171`)

### How It Works

1. **Match Creation:**
   - Standalone matches (no `eventId`) can be created **without authentication**
   - Event-linked matches require event code or coach key

2. **Archer Addition:**
   - First archer can be added without auth (for standalone matches)
   - Second archer triggers match code generation
   - Match code is returned in API response and stored in localStorage

3. **Subsequent Requests:**
   - Match code is automatically sent in `X-Passcode` header
   - `require_api_key()` accepts match codes (along with event codes and coach keys)
   - Works for all solo match endpoints (sets, updates, etc.)

---

## Files Modified

### Backend

1. **`api/sql/migration_add_match_codes.sql`** (NEW)
   - Adds `match_code` column to `solo_matches` and `team_matches`
   - Creates indexes for fast lookup

2. **`api/db.php`**
   - Extended `require_api_key()` to check match codes from `solo_matches` and `team_matches` tables

3. **`api/index.php`**
   - Added `generate_solo_match_code()` function
   - Updated `POST /v1/solo-matches` to allow public creation for standalone matches
   - Updated `POST /v1/solo-matches/:id/archers` to generate match code when second archer is added
   - Match code generation uses archer initials and match date

### Frontend

4. **`js/live_updates.js`**
   - Updated `ensureSoloMatch()` to store match code if returned
   - Updated `ensureSoloArcher()` to store match code when second archer is added
   - Updated `request()` function to automatically use match code for solo match requests

---

## Database Schema Changes

```sql
ALTER TABLE solo_matches 
ADD COLUMN match_code VARCHAR(20) NULL UNIQUE 
COMMENT 'Unique access code for this match (format: solo-INITIALS-MMDD)';

CREATE INDEX idx_solo_match_code ON solo_matches(match_code);
```

---

## Authentication Flow

### Standalone Match (No Event)

1. **Create Match:** `POST /v1/solo-matches` (no auth required)
2. **Add Archer 1:** `POST /v1/solo-matches/:id/archers` (no auth required)
3. **Add Archer 2:** `POST /v1/solo-matches/:id/archers` (no auth required)
   - **Match code generated:** `solo-JSJD-1117`
   - **Returned in response:** `{ matchCode: "solo-JSJD-1117", ... }`
   - **Stored in localStorage:** `solo_match_code:{matchId}`
4. **Submit Scores:** `POST /v1/solo-matches/:id/archers/:archerId/sets`
   - **Auth:** Match code sent in `X-Passcode` header
   - **Backend:** Validates match code via `require_api_key()`

### Event-Linked Match

1. **Create Match:** `POST /v1/solo-matches` (event code or coach key required)
2. **Add Archers:** `POST /v1/solo-matches/:id/archers` (event code or coach key required)
3. **Match Code:** Still generated for consistency, but event code is primary auth
4. **Submit Scores:** Event code or match code both work

---

## Testing Checklist

- [ ] Create standalone solo match (no eventId)
- [ ] Add first archer (should succeed without auth)
- [ ] Add second archer (should generate match code)
- [ ] Verify match code format: `solo-[INITIALS]-[MMDD]`
- [ ] Submit set scores using match code
- [ ] Verify match code stored in localStorage
- [ ] Test event-linked match (should still work with event code)
- [ ] Test match code uniqueness (create duplicate, should append number)

---

## Migration Steps

1. **Apply database migration:**
   ```bash
   mysql -u root -p wdv_local < api/sql/migration_add_match_codes.sql
   ```

2. **Deploy code changes:**
   - Backend: `api/db.php`, `api/index.php`
   - Frontend: `js/live_updates.js`

3. **Test standalone match creation**

---

## Notes

- Match codes are generated **only when the second archer is added** (when we have both names)
- Match codes are **case-insensitive** for authentication
- Match codes are **unique** - duplicates get numeric suffix
- Event-linked matches can use **either** event code or match code
- Team matches will use similar pattern: `team-[INITIALS]-[MMDD]` (pending implementation)

---

## Future Enhancements

- [ ] Implement team match code generation
- [ ] Add match code display in UI
- [ ] Allow manual match code entry for joining existing matches
- [ ] Add match code to GET /v1/solo-matches/:id response

