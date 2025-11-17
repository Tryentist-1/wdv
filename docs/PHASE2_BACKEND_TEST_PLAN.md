# Phase 2 Backend Test Plan

**Date:** November 17, 2025  
**Sprint:** Phase 2 Sprint 2 (Backend Foundation)  
**Status:** Ready for Execution

---

## Overview

This test plan validates the Solo and Team Olympic Match API endpoints created in Sprint 2. Follow these steps to verify backend functionality before proceeding to Sprint 3 (frontend integration).

---

## Prerequisites

### 1. Apply Database Migration

```bash
# Navigate to project root
cd /Users/terry/web-mirrors/tryentist/wdv

# Apply SQL migration
mysql -u root -p wdv_local < api/sql/migration_phase2_solo_team_matches.sql
```

**Expected:** Tables created without errors

**Verify Tables Created:**
```bash
mysql -u root -p wdv_local -e "SHOW TABLES LIKE '%match%';"
```

**Expected Output:**
```
+--------------------------------+
| Tables_in_wdv_local (%match%)  |
+--------------------------------+
| solo_match_archers             |
| solo_match_sets                |
| solo_matches                   |
| team_match_archers             |
| team_match_sets                |
| team_match_teams               |
| team_matches                   |
+--------------------------------+
```

---

### 2. Start Local Server

```bash
# Terminal 1: Start PHP server
npm run serve
# → http://localhost:3000

# Terminal 2: Run tests (this terminal)
```

---

### 3. Set Environment Variables

```bash
export API_BASE="http://localhost:3000/api/v1"
export COACH_CODE="wdva26"
```

---

## Test Suite 1: Solo Olympic Match

### Test 1.1: Create Solo Match ✅

```bash
curl -X POST $API_BASE/solo-matches \
  -H "X-Passcode: $COACH_CODE" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-11-17",
    "location": "Test Gymnasium"
  }' | jq '.'
```

**Expected Response:** `201 Created`
```json
{
  "matchId": "uuid"
}
```

**Save matchId:**
```bash
export SOLO_MATCH_ID="<paste-matchId-here>"
```

---

### Test 1.2: Add Archer 1 to Solo Match ✅

```bash
curl -X POST $API_BASE/solo-matches/$SOLO_MATCH_ID/archers \
  -H "X-Passcode: $COACH_CODE" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Archer1",
    "school": "TST",
    "level": "VAR",
    "gender": "M",
    "position": 1
  }' | jq '.'
```

**Expected Response:** `201 Created`
```json
{
  "matchArcherId": "uuid",
  "archerId": "uuid",
  "created": true
}
```

**Save matchArcherId:**
```bash
export ARCHER1_ID="<paste-matchArcherId-here>"
```

---

### Test 1.3: Add Archer 2 to Solo Match ✅

```bash
curl -X POST $API_BASE/solo-matches/$SOLO_MATCH_ID/archers \
  -H "X-Passcode: $COACH_CODE" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Archer2",
    "school": "TST",
    "level": "VAR",
    "gender": "F",
    "position": 2
  }' | jq '.'
```

**Expected Response:** `201 Created`

**Save matchArcherId:**
```bash
export ARCHER2_ID="<paste-matchArcherId-here>"
```

---

### Test 1.4: Submit Set 1 Scores for Archer 1 ✅

```bash
curl -X POST $API_BASE/solo-matches/$SOLO_MATCH_ID/archers/$ARCHER1_ID/sets \
  -H "X-Passcode: $COACH_CODE" \
  -H "Content-Type: application/json" \
  -d '{
    "setNumber": 1,
    "a1": "X",
    "a2": "10",
    "a3": "9",
    "setTotal": 29,
    "setPoints": 2,
    "runningPoints": 2,
    "tens": 2,
    "xs": 1,
    "deviceTs": "2025-11-17T14:00:00Z"
  }' | jq '.'
```

**Expected Response:** `201 Created`
```json
{
  "setId": "uuid",
  "created": true
}
```

---

### Test 1.5: Submit Set 1 Scores for Archer 2 ✅

```bash
curl -X POST $API_BASE/solo-matches/$SOLO_MATCH_ID/archers/$ARCHER2_ID/sets \
  -H "X-Passcode: $COACH_CODE" \
  -H "Content-Type: application/json" \
  -d '{
    "setNumber": 1,
    "a1": "10",
    "a2": "9",
    "a3": "8",
    "setTotal": 27,
    "setPoints": 0,
    "runningPoints": 0,
    "tens": 1,
    "xs": 0,
    "deviceTs": "2025-11-17T14:01:00Z"
  }' | jq '.'
```

**Expected Response:** `201 Created`

---

### Test 1.6: Get Solo Match Details ✅

```bash
curl $API_BASE/solo-matches/$SOLO_MATCH_ID \
  -H "X-Passcode: $COACH_CODE" | jq '.'
```

**Expected Response:** `200 OK`

**Verify:**
- Match status is "In Progress"
- Both archers present with position 1 and 2
- Set 1 scores present for both archers
- Scores match submitted values

---

### Test 1.7: Update Match (Verify & Lock) ✅

```bash
curl -X PATCH $API_BASE/solo-matches/$SOLO_MATCH_ID \
  -H "X-Passcode: $COACH_CODE" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Completed",
    "winnerArcherId": "'$ARCHER1_ID'",
    "locked": true,
    "cardStatus": "VER",
    "notes": "Test verification"
  }' | jq '.'
```

**Expected Response:** `200 OK`
```json
{
  "message": "Match updated successfully"
}
```

---

### Test 1.8: Verify Match is Locked ✅

```bash
curl $API_BASE/solo-matches/$SOLO_MATCH_ID \
  -H "X-Passcode: $COACH_CODE" | jq '.match.locked, .match.card_status, .match.status'
```

**Expected Response:**
```json
true
"VER"
"Completed"
```

---

## Test Suite 2: Team Olympic Match

### Test 2.1: Create Team Match ✅

```bash
curl -X POST $API_BASE/team-matches \
  -H "X-Passcode: $COACH_CODE" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-11-17",
    "location": "Test Gymnasium"
  }' | jq '.'
```

**Expected Response:** `201 Created`

**Save matchId:**
```bash
export TEAM_MATCH_ID="<paste-matchId-here>"
```

---

### Test 2.2: Add Team 1 ✅

```bash
curl -X POST $API_BASE/team-matches/$TEAM_MATCH_ID/teams \
  -H "X-Passcode: $COACH_CODE" \
  -H "Content-Type: application/json" \
  -d '{
    "teamName": "Test Team Blue",
    "school": "TST",
    "position": 1
  }' | jq '.'
```

**Expected Response:** `201 Created`

**Save teamId:**
```bash
export TEAM1_ID="<paste-teamId-here>"
```

---

### Test 2.3: Add Team 2 ✅

```bash
curl -X POST $API_BASE/team-matches/$TEAM_MATCH_ID/teams \
  -H "X-Passcode: $COACH_CODE" \
  -H "Content-Type: application/json" \
  -d '{
    "teamName": "Test Team Gold",
    "school": "TST",
    "position": 2
  }' | jq '.'
```

**Expected Response:** `201 Created`

**Save teamId:**
```bash
export TEAM2_ID="<paste-teamId-here>"
```

---

### Test 2.4: Add 3 Archers to Team 1 ✅

```bash
# Archer 1
curl -X POST $API_BASE/team-matches/$TEAM_MATCH_ID/teams/$TEAM1_ID/archers \
  -H "X-Passcode: $COACH_CODE" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Team1",
    "lastName": "Archer1",
    "school": "TST",
    "level": "VAR",
    "gender": "M",
    "position": 1
  }' | jq '.'

# Save archer ID
export T1_ARCHER1_ID="<paste-matchArcherId-here>"

# Archer 2
curl -X POST $API_BASE/team-matches/$TEAM_MATCH_ID/teams/$TEAM1_ID/archers \
  -H "X-Passcode: $COACH_CODE" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Team1",
    "lastName": "Archer2",
    "school": "TST",
    "level": "VAR",
    "gender": "F",
    "position": 2
  }' | jq '.'

export T1_ARCHER2_ID="<paste-matchArcherId-here>"

# Archer 3
curl -X POST $API_BASE/team-matches/$TEAM_MATCH_ID/teams/$TEAM1_ID/archers \
  -H "X-Passcode: $COACH_CODE" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Team1",
    "lastName": "Archer3",
    "school": "TST",
    "level": "VAR",
    "gender": "M",
    "position": 3
  }' | jq '.'

export T1_ARCHER3_ID="<paste-matchArcherId-here>"
```

**Expected:** 3 archers created successfully

---

### Test 2.5: Add 3 Archers to Team 2 ✅

```bash
# (Same pattern as Team 1, positions 1-3)
# Repeat commands with Team 2 IDs
```

---

### Test 2.6: Submit Set 1 Scores for Team 1 Archers ✅

```bash
# Archer 1 - Set 1
curl -X POST $API_BASE/team-matches/$TEAM_MATCH_ID/teams/$TEAM1_ID/archers/$T1_ARCHER1_ID/sets \
  -H "X-Passcode: $COACH_CODE" \
  -H "Content-Type: application/json" \
  -d '{
    "setNumber": 1,
    "a1": "X",
    "setTotal": 29,
    "setPoints": 2,
    "runningPoints": 2,
    "tens": 1,
    "xs": 1,
    "deviceTs": "2025-11-17T14:00:00Z"
  }' | jq '.'

# Archer 2 - Set 1
curl -X POST $API_BASE/team-matches/$TEAM_MATCH_ID/teams/$TEAM1_ID/archers/$T1_ARCHER2_ID/sets \
  -H "X-Passcode: $COACH_CODE" \
  -H "Content-Type: application/json" \
  -d '{
    "setNumber": 1,
    "a1": "10",
    "setTotal": 29,
    "setPoints": 2,
    "runningPoints": 2,
    "tens": 1,
    "xs": 0,
    "deviceTs": "2025-11-17T14:00:00Z"
  }' | jq '.'

# Archer 3 - Set 1
curl -X POST $API_BASE/team-matches/$TEAM_MATCH_ID/teams/$TEAM1_ID/archers/$T1_ARCHER3_ID/sets \
  -H "X-Passcode: $COACH_CODE" \
  -H "Content-Type: application/json" \
  -d '{
    "setNumber": 1,
    "a1": "9",
    "setTotal": 29,
    "setPoints": 2,
    "runningPoints": 2,
    "tens": 0,
    "xs": 0,
    "deviceTs": "2025-11-17T14:00:00Z"
  }' | jq '.'
```

**Expected:** All 3 scores submitted successfully
**Note:** Team total should be X+10+9 = 29

---

### Test 2.7: Get Team Match Details ✅

```bash
curl $API_BASE/team-matches/$TEAM_MATCH_ID \
  -H "X-Passcode: $COACH_CODE" | jq '.'
```

**Expected Response:** `200 OK`

**Verify:**
- Match status is "In Progress"
- 2 teams present
- Each team has 3 archers
- Set 1 scores present for Team 1
- Nested structure: match → teams → archers → sets

---

### Test 2.8: Update Match (Verify & Lock) ✅

```bash
curl -X PATCH $API_BASE/team-matches/$TEAM_MATCH_ID \
  -H "X-Passcode: $COACH_CODE" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Completed",
    "winnerTeamId": "'$TEAM1_ID'",
    "locked": true,
    "cardStatus": "VER"
  }' | jq '.'
```

**Expected Response:** `200 OK`

---

## Test Suite 3: Error Handling

### Test 3.1: Invalid Position (Solo) ❌

```bash
curl -X POST $API_BASE/solo-matches/$SOLO_MATCH_ID/archers \
  -H "X-Passcode: $COACH_CODE" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Bad",
    "lastName": "Position",
    "position": 99
  }' | jq '.'
```

**Expected Response:** `400 Bad Request`
```json
{
  "error": "firstName, lastName, and position (1 or 2) required"
}
```

---

### Test 3.2: Invalid Position (Team) ❌

```bash
curl -X POST $API_BASE/team-matches/$TEAM_MATCH_ID/teams/$TEAM1_ID/archers \
  -H "X-Passcode: $COACH_CODE" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Bad",
    "lastName": "Position",
    "position": 99
  }' | jq '.'
```

**Expected Response:** `400 Bad Request`
```json
{
  "error": "firstName, lastName, and position (1-3) required"
}
```

---

### Test 3.3: Match Not Found ❌

```bash
curl $API_BASE/solo-matches/00000000-0000-0000-0000-000000000000 \
  -H "X-Passcode: $COACH_CODE" | jq '.'
```

**Expected Response:** `404 Not Found`
```json
{
  "error": "Match not found"
}
```

---

### Test 3.4: Missing Authentication ❌

```bash
curl -X POST $API_BASE/solo-matches \
  -H "Content-Type: application/json" \
  -d '{"date":"2025-11-17"}' | jq '.'
```

**Expected Response:** `401 Unauthorized`

---

## Test Suite 4: Database Verification

### Test 4.1: Verify Solo Match in Database ✅

```bash
mysql -u root -p wdv_local -e "
  SELECT id, date, location, status, locked, card_status 
  FROM solo_matches 
  WHERE id='$SOLO_MATCH_ID';
"
```

**Expected:** Match data matches API responses

---

### Test 4.2: Verify Archer Linking ✅

```bash
mysql -u root -p wdv_local -e "
  SELECT sma.archer_name, sma.position, a.first_name, a.last_name
  FROM solo_match_archers sma
  JOIN archers a ON a.id = sma.archer_id
  WHERE sma.match_id='$SOLO_MATCH_ID';
"
```

**Expected:** Both archers linked to master `archers` table

---

### Test 4.3: Verify Set Scores ✅

```bash
mysql -u root -p wdv_local -e "
  SELECT set_number, a1, a2, a3, set_total, set_points, running_points
  FROM solo_match_sets
  WHERE match_id='$SOLO_MATCH_ID'
  ORDER BY set_number;
"
```

**Expected:** Set scores match submitted values

---

## Cleanup (After Testing)

### Option 1: Keep Test Data
```bash
# Leave test matches in database for frontend development
```

### Option 2: Clean Test Data
```bash
mysql -u root -p wdv_local -e "
  DELETE FROM solo_matches WHERE id='$SOLO_MATCH_ID';
  DELETE FROM team_matches WHERE id='$TEAM_MATCH_ID';
"
```

**Note:** Foreign keys CASCADE DELETE will remove related records automatically

---

## Success Criteria

### ✅ All Tests Pass If:
1. All API endpoints return expected status codes
2. Data structures match expected JSON format
3. Database records created correctly
4. Foreign key relationships maintained
5. UUIDs generated (not sequential IDs)
6. Verification workflow functions (lock/unlock/status)
7. Error handling works as expected

---

## Test Results Log

**Date:** _______________  
**Tester:** _______________  

| Test ID | Description | Pass/Fail | Notes |
|---------|-------------|-----------|-------|
| 1.1 | Create Solo Match | ☐ | |
| 1.2 | Add Archer 1 | ☐ | |
| 1.3 | Add Archer 2 | ☐ | |
| 1.4 | Submit Set 1 (A1) | ☐ | |
| 1.5 | Submit Set 1 (A2) | ☐ | |
| 1.6 | Get Match Details | ☐ | |
| 1.7 | Verify & Lock | ☐ | |
| 1.8 | Confirm Locked | ☐ | |
| 2.1 | Create Team Match | ☐ | |
| 2.2 | Add Team 1 | ☐ | |
| 2.3 | Add Team 2 | ☐ | |
| 2.4 | Add T1 Archers (3) | ☐ | |
| 2.5 | Add T2 Archers (3) | ☐ | |
| 2.6 | Submit T1 Set 1 | ☐ | |
| 2.7 | Get Team Match | ☐ | |
| 2.8 | Verify & Lock | ☐ | |
| 3.1 | Invalid Position (Solo) | ☐ | |
| 3.2 | Invalid Position (Team) | ☐ | |
| 3.3 | Match Not Found | ☐ | |
| 3.4 | Missing Auth | ☐ | |
| 4.1 | DB: Solo Match | ☐ | |
| 4.2 | DB: Archer Linking | ☐ | |
| 4.3 | DB: Set Scores | ☐ | |

**Overall Result:** ☐ PASS | ☐ FAIL

**Issues Found:**
- 

**Next Steps:**
- If all tests pass → Proceed to Sprint 3 (Frontend Integration)
- If tests fail → Fix issues and retest

---

**Test Plan Created:** November 17, 2025  
**Sprint:** Phase 2 Sprint 2  
**Status:** Ready for Execution

