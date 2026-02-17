# Phase 2: Solo & Team Olympic Match API Endpoints

**Created:** November 17, 2025  
**Status:** Backend Complete - Ready for Frontend Integration  
**Sprint:** Phase 2 Sprint 2 (Backend Foundation)

---

## Overview

This document describes the REST API endpoints for Solo and Team Olympic matches, added in Phase 2. These endpoints mirror the proven Ranking Round pattern and support the complete match workflow from creation through verification.

### Pattern Consistency

All endpoints follow the same patterns as Ranking Rounds:
- **Authentication:** Requires `X-Passcode` or `X-API-Key` header (coach/event code)
- **IDs:** UUIDs (not sequential numbers)
- **Responses:** JSON with appropriate HTTP status codes
- **Verification:** Includes `locked`, `card_status`, `verified_at` fields
- **Event Integration:** Optional `event_id` linking

---

## Solo Olympic Match Endpoints

### 1. Create Solo Match

**Endpoint:** `POST /v1/solo-matches`  
**Auth:** Required (Coach/Event Code)

**Request:**
```json
{
  "eventId": "uuid-optional",
  "date": "2025-11-17",
  "location": "Gymnasium A",
  "maxSets": 5
}
```

**Response:** `201 Created`
```json
{
  "matchId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Notes:**
- Default `maxSets` is 5 (best of 5, first to 3 wins)
- Match status starts as "Not Started"
- `eventId` is optional but recommended for coach visibility

---

### 2. Add Archer to Solo Match

**Endpoint:** `POST /v1/solo-matches/:matchId/archers`  
**Auth:** Required

**Request:**
```json
{
  "firstName": "Sarah",
  "lastName": "Johnson",
  "extId": "archer-local-id-123",
  "school": "WIS",
  "level": "VAR",
  "gender": "F",
  "position": 1
}
```

**Response:** `201 Created` or `200 OK` (if updated)
```json
{
  "matchArcherId": "uuid",
  "archerId": "uuid",
  "created": true
}
```

**Notes:**
- `position` must be 1 or 2 (left/right archer)
- `extId` used to link with master archer list
- If archer exists in master list, links automatically
- If not found, creates new archer in master table

---

### 3. Submit Set Scores

**Endpoint:** `POST /v1/solo-matches/:matchId/archers/:matchArcherId/sets`  
**Auth:** Required

**Request:**
```json
{
  "setNumber": 1,
  "a1": "10",
  "a2": "9",
  "a3": "X",
  "setTotal": 29,
  "setPoints": 2,
  "runningPoints": 2,
  "tens": 2,
  "xs": 1,
  "deviceTs": "2025-11-17T14:30:00Z"
}
```

**Response:** `201 Created` or `200 OK` (if updated)
```json
{
  "setId": "uuid",
  "created": true
}
```

**Notes:**
- `setNumber`: 1-5 (or 6 for shoot-off)
- `setPoints`: 2 (win), 1 (tie), 0 (loss)
- First submission sets match status to "In Progress"
- Updates are idempotent (same set can be resubmitted)

---

### 4. Get Solo Match Details

**Endpoint:** `GET /v1/solo-matches/:matchId`  
**Auth:** Required

**Response:** `200 OK`
```json
{
  "match": {
    "id": "uuid",
    "event_id": "uuid",
    "date": "2025-11-17",
    "location": "Gymnasium A",
    "status": "In Progress",
    "max_sets": 5,
    "shoot_off": false,
    "winner_archer_id": null,
    "locked": false,
    "card_status": "PENDING",
    "archers": [
      {
        "id": "uuid",
        "archer_id": "uuid",
        "archer_name": "Sarah Johnson",
        "school": "WIS",
        "level": "VAR",
        "gender": "F",
        "position": 1,
        "sets_won": 2,
        "total_score": 58,
        "winner": false,
        "sets": [
          {
            "set_number": 1,
            "a1": "10",
            "a2": "9",
            "a3": "X",
            "set_total": 29,
            "set_points": 2,
            "running_points": 2,
            "tens": 2,
            "xs": 1
          }
        ]
      },
      {
        "id": "uuid",
        "archer_name": "Mike Chen",
        "position": 2,
        "sets_won": 1,
        "total_score": 57,
        "sets": [...]
      }
    ]
  }
}
```

**Notes:**
- Returns complete match state with nested archers and sets
- Use for match recovery and coach console display

---

### 5. Update Match (Verification)

**Endpoint:** `PATCH /v1/solo-matches/:matchId`  
**Auth:** Required (typically Coach only)

**Request:**
```json
{
  "status": "Completed",
  "winnerArcherId": "uuid",
  "shootOff": false,
  "locked": true,
  "cardStatus": "VER",
  "notes": "Verified by Coach Terry"
}
```

**Response:** `200 OK`
```json
{
  "message": "Match updated successfully"
}
```

**Notes:**
- All fields optional (update only what changed)
- `cardStatus`: "PENDING", "VER", or "VOID"
- `locked: true` prevents further edits
- Use for coach verification workflow

---

## Team Olympic Match Endpoints

### 1. Create Team Match

**Endpoint:** `POST /v1/team-matches`  
**Auth:** Required

**Request:**
```json
{
  "eventId": "uuid-optional",
  "date": "2025-11-17",
  "location": "Gymnasium A",
  "maxSets": 4
}
```

**Response:** `201 Created`
```json
{
  "matchId": "uuid"
}
```

**Notes:**
- Default `maxSets` is 4 (best of 4, first to 5 set points wins)
- Creates match container for two teams

---

### 2. Add Team to Match

**Endpoint:** `POST /v1/team-matches/:matchId/teams`  
**Auth:** Required

**Request:**
```json
{
  "teamName": "Varsity Blue",
  "school": "WIS",
  "position": 1
}
```

**Response:** `201 Created` or `200 OK`
```json
{
  "teamId": "uuid",
  "created": true
}
```

**Notes:**
- `position` must be 1 or 2
- `teamName` is optional
- Creates team within match

---

### 3. Add Archer to Team

**Endpoint:** `POST /v1/team-matches/:matchId/teams/:teamId/archers`  
**Auth:** Required

**Request:**
```json
{
  "firstName": "Sarah",
  "lastName": "Johnson",
  "extId": "archer-local-id-123",
  "school": "WIS",
  "level": "VAR",
  "gender": "F",
  "position": 1
}
```

**Response:** `201 Created` or `200 OK`
```json
{
  "matchArcherId": "uuid",
  "archerId": "uuid",
  "created": true
}
```

**Notes:**
- `position` must be 1-3 (3 archers per team)
- Same master archer lookup logic as Solo matches

---

### 4. Submit Set Scores

**Endpoint:** `POST /v1/team-matches/:matchId/teams/:teamId/archers/:matchArcherId/sets`  
**Auth:** Required

**Request:**
```json
{
  "setNumber": 1,
  "a1": "X",
  "setTotal": 30,
  "setPoints": 2,
  "runningPoints": 2,
  "tens": 3,
  "xs": 1,
  "deviceTs": "2025-11-17T14:30:00Z"
}
```

**Response:** `201 Created` or `200 OK`
```json
{
  "setId": "uuid",
  "created": true
}
```

**Notes:**
- Each archer shoots 2 arrows per set (`a1` and `a2`)
- `setTotal` is team total (3 archers × 2 arrows each = 6 arrows)
- `setPoints` stored per team (2 for win, 1 for tie, 0 for loss)

---

### 5. Get Team Match Details

**Endpoint:** `GET /v1/team-matches/:matchId`  
**Auth:** Required

**Response:** `200 OK`
```json
{
  "match": {
    "id": "uuid",
    "event_id": "uuid",
    "date": "2025-11-17",
    "status": "In Progress",
    "max_sets": 4,
    "locked": false,
    "teams": [
      {
        "id": "uuid",
        "team_name": "Varsity Blue",
        "school": "WIS",
        "position": 1,
        "sets_won": 3,
        "total_score": 87,
        "winner": false,
        "archers": [
          {
            "id": "uuid",
            "archer_name": "Sarah Johnson",
            "position": 1,
            "sets": [
              {
                "set_number": 1,
                "a1": "X",
                "set_total": 30,
                "set_points": 2,
                "running_points": 2
              }
            ]
          }
        ]
      },
      {
        "id": "uuid",
        "team_name": "Varsity Gold",
        "position": 2,
        "archers": [...]
      }
    ]
  }
}
```

---

### 6. Update Match (Verification)

**Endpoint:** `PATCH /v1/team-matches/:matchId`  
**Auth:** Required

**Request:**
```json
{
  "status": "Completed",
  "winnerTeamId": "uuid",
  "shootOff": false,
  "locked": true,
  "cardStatus": "VER"
}
```

**Response:** `200 OK`
```json
{
  "message": "Match updated successfully"
}
```

---

## Authentication

All endpoints require authentication via headers:

```bash
# Coach authentication (full access)
curl -H "X-Passcode: wdva26" https://tryentist.com/wdv/api/v1/solo-matches

# OR using API key
curl -H "X-API-Key: your-api-key" https://tryentist.com/wdv/api/v1/solo-matches

# Event code authentication (archer access)
curl -H "X-Passcode: event-entry-code" https://tryentist.com/wdv/api/v1/solo-matches
```

---

## Error Responses

All endpoints return standard error responses:

**400 Bad Request**
```json
{
  "error": "firstName, lastName, and position (1 or 2) required"
}
```

**404 Not Found**
```json
{
  "error": "Match not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Database error: <details>"
}
```

---

## Testing Examples

### Solo Match Complete Workflow

```bash
# 1. Create match
curl -X POST https://tryentist.com/wdv/api/v1/solo-matches \
  -H "X-Passcode: wdva26" \
  -H "Content-Type: application/json" \
  -d '{"date":"2025-11-17","location":"Gym A"}'

# 2. Add archer 1
curl -X POST https://tryentist.com/wdv/api/v1/solo-matches/{matchId}/archers \
  -H "X-Passcode: wdva26" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Sarah","lastName":"Johnson","school":"WIS","level":"VAR","gender":"F","position":1}'

# 3. Add archer 2
curl -X POST https://tryentist.com/wdv/api/v1/solo-matches/{matchId}/archers \
  -H "X-Passcode: wdva26" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Mike","lastName":"Chen","school":"DVN","level":"VAR","gender":"M","position":2}'

# 4. Submit set 1 scores for archer 1
curl -X POST https://tryentist.com/wdv/api/v1/solo-matches/{matchId}/archers/{archerId}/sets \
  -H "X-Passcode: wdva26" \
  -H "Content-Type: application/json" \
  -d '{"setNumber":1,"a1":"X","a2":"10","a3":"9","setTotal":29,"setPoints":2,"runningPoints":2,"tens":2,"xs":1}'

# 5. Get match details
curl https://tryentist.com/wdv/api/v1/solo-matches/{matchId} \
  -H "X-Passcode: wdva26"

# 6. Verify and lock match
curl -X PATCH https://tryentist.com/wdv/api/v1/solo-matches/{matchId} \
  -H "X-Passcode: wdva26" \
  -H "Content-Type: application/json" \
  -d '{"status":"Completed","locked":true,"cardStatus":"VER"}'
```

---

## Database Schema

### Solo Match Tables

**solo_matches**
- Primary table for match metadata
- Includes event linking, verification fields
- Status: Not Started, In Progress, Completed, Voided

**solo_match_archers**
- 2 archers per match (position 1 or 2)
- Links to master `archers` table via `archer_id`
- Stores cumulative match stats

**solo_match_sets**
- One row per archer per set
- Stores 3 arrow scores + totals
- Unique constraint on (match_archer_id, set_number)

### Team Match Tables

**team_matches**
- Primary table for team match metadata

**team_match_teams**
- 2 teams per match (position 1 or 2)
- Optional team name

**team_match_archers**
- 3 archers per team (position 1-3)
- Links to master `archers` table

**team_match_sets**
- One row per archer per set
- Stores 1 arrow score (team match format)

---

## Migration

**File:** `api/sql/migration_phase2_solo_team_matches.sql`

**Apply:**
```bash
mysql -u root -p wdv_local < api/sql/migration_phase2_solo_team_matches.sql
```

**Rollback:** (if needed)
```sql
DROP TABLE IF EXISTS solo_match_sets;
DROP TABLE IF EXISTS solo_match_archers;
DROP TABLE IF EXISTS solo_matches;
DROP TABLE IF EXISTS team_match_sets;
DROP TABLE IF EXISTS team_match_archers;
DROP TABLE IF EXISTS team_match_teams;
DROP TABLE IF EXISTS team_matches;
```

---

## Next Steps (Phase 2 Sprint 3-4)

### Sprint 3: Frontend Integration - Solo Module
1. Refactor `js/solo_card.js` to use these endpoints
2. Replace localStorage primary storage with API calls
3. Keep localStorage for session state only
4. Add offline queue support (use `live_updates.js` pattern)
5. Add verification UI for coaches
6. Test complete workflow

### Sprint 4: Frontend Integration - Team Module
1. Same pattern as Solo (copy & adapt)
2. Refactor `js/team_card.js`
3. Test complete workflow

---

## Implementation Notes

### Pattern Consistency
- **Mirrors Ranking Rounds:** All endpoints follow proven patterns from `POST /v1/rounds`
- **UUIDs:** All IDs generated with `$genUuid()` (not sequential)
- **Verification Fields:** `locked`, `card_status`, `verified_at`, `verified_by`
- **Status Workflow:** Not Started → In Progress → Completed (or Voided)

### Master Archer Integration
- All archer additions check master `archers` table first
- Lookup by `ext_id` (most reliable)
- Fallback to name + school match
- Creates new archer if not found
- Ensures referential integrity

### Offline Support (Frontend Sprint)
- Frontend will use `live_updates.js` offline queue pattern
- Failed API calls queued in localStorage (`luq:match:{matchId}`)
- Auto-flush on reconnection
- UI shows sync status (pending/synced/failed)

---

**Status:** ✅ Backend Complete - Ready for Testing  
**Next:** Apply SQL migration and test endpoints  
**Then:** Sprint 3 - Frontend Integration

**Created:** November 17, 2025  
**Last Updated:** November 17, 2025

