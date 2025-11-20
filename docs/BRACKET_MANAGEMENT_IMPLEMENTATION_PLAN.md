# Bracket Management Implementation Plan

**Date:** November 18, 2025  
**Status:** ✅ COMPLETED (November 20, 2025)  
**Related:** Phase 2 Enhancement, Feature_EventPlanning_Product.md Phase 4-5

---

## 🎯 Overview

This plan outlines the implementation of bracket management for Solo and Team Olympic matches. Brackets can be either **Elimination** (auto-generated from ranking Top 8) or **Swiss** (open format with manual match creation).

---

## 📋 Requirements Summary

### Bracket Types

1. **Elimination Brackets**
   - Created AFTER ranking rounds complete
   - Auto-generated from Top 8 archers/teams
   - Fixed structure: 8 slots → Quarters → Semis → Finals
   - Match IDs: `BVARQ1`, `BVARQ2`, etc. (Division + Round + Match Number)

2. **Swiss Brackets**
   - Created manually by coach (before or after ranking)
   - Open format - no fixed structure
   - Archers create matches against different opponents
   - Scoring: 1 point per win (5/0 = perfect record)
   - Match codes: Existing system (`SOLO-RHTA-1101`, `TEAM-RHTA-1101`)

### Bracket Divisions

- **Solo Brackets:** By division (BV, BJV, GV, GJV)
- **Team Brackets:** 
  - By division (BV Team, GV Team)
  - **Mixed Var Team:** Boys and Girls on same team

---

## 🗄️ Database Schema

### New Table: `brackets`

```sql
CREATE TABLE brackets (
    id CHAR(36) PRIMARY KEY,
    event_id CHAR(36) NOT NULL,
    bracket_type ENUM('SOLO', 'TEAM') NOT NULL,
    bracket_format ENUM('ELIMINATION', 'SWISS') NOT NULL,
    division VARCHAR(10) NOT NULL,  -- BV, BJV, GV, GJV, or 'MIXED_VAR' for team
    bracket_size INT DEFAULT 8,  -- For elimination: always 8. For swiss: max participants
    status VARCHAR(20) DEFAULT 'OPEN',  -- OPEN, IN_PROGRESS, COMPLETED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    INDEX idx_event (event_id),
    INDEX idx_type_format (bracket_type, bracket_format, division)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### New Table: `bracket_entries`

For tracking which archers/teams are in which bracket (for seeding and Swiss tracking).

```sql
CREATE TABLE bracket_entries (
    id CHAR(36) PRIMARY KEY,
    bracket_id CHAR(36) NOT NULL,
    entry_type ENUM('ARCHER', 'TEAM') NOT NULL,
    archer_id CHAR(36) NULL,  -- For solo brackets
    school_id CHAR(36) NULL,  -- For team brackets (team = school)
    seed_position INT NULL,  -- For elimination: 1-8. For swiss: NULL (random)
    swiss_wins INT DEFAULT 0,  -- For swiss: win count
    swiss_losses INT DEFAULT 0,  -- For swiss: loss count
    swiss_points INT DEFAULT 0,  -- For swiss: total points (wins - losses)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bracket_id) REFERENCES brackets(id) ON DELETE CASCADE,
    FOREIGN KEY (archer_id) REFERENCES archers(id) ON DELETE SET NULL,
    INDEX idx_bracket (bracket_id),
    INDEX idx_archer (archer_id),
    INDEX idx_school (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Note:** For Mixed Var Teams, coaches will manually create team entries with selected archers (stored separately in team_match_teams table).

### Update Table: `solo_matches`

Add `bracket_id` and `bracket_match_id` fields:

```sql
ALTER TABLE solo_matches
    ADD COLUMN bracket_id CHAR(36) NULL AFTER event_id,
    ADD COLUMN bracket_match_id VARCHAR(30) NULL AFTER bracket_id,  -- e.g., 'BVARQ1-TC-AG', 'SOLO-RHTA-1101'
    ADD INDEX idx_bracket (bracket_id),
    ADD INDEX idx_bracket_match (bracket_match_id);
```

**Bracket Match ID Format:**
- **Elimination:** `{DIVISION}{ROUND}{MATCH}-{ARCHER1_INITIALS}-{ARCHER2_INITIALS}`
  - Example: `BVARQ1-TC-AG` (Boys Varsity, Quarter Final 1, Trenton Cowles vs Alex Gilliam)
- **Swiss:** Existing match code system (`SOLO-RHTA-1101`) - no change

### Update Table: `team_matches`

Add `bracket_id` and `bracket_match_id` fields:

```sql
ALTER TABLE team_matches
    ADD COLUMN bracket_id CHAR(36) NULL AFTER event_id,
    ADD COLUMN bracket_match_id VARCHAR(30) NULL AFTER bracket_id,  -- e.g., 'BVTARQ1-CA-GA', 'TEAM-RHTA-1101'
    ADD INDEX idx_bracket (bracket_id),
    ADD INDEX idx_bracket_match (bracket_match_id);
```

**Bracket Match ID Format:**
- **Elimination:** `{DIVISION}T{ROUND}{MATCH}-{TEAM1_SCHOOL}-{TEAM2_SCHOOL}`
  - Example: `BVTARQ1-CA-GA` (Boys Varsity Team, Quarter Final 1, California vs Georgia)
- **Swiss:** Existing match code system (`TEAM-RHTA-1101`) - no change

---

## 🔄 Event Creation Flow (Updated)

### Current Flow
1. ✅ Coach creates event
2. ✅ Coach creates ranking rounds by division
3. ✅ Coach adds archers to ranking divisions

### New Flow (After Ranking)
4. **Coach creates brackets** (similar to creating rounds)
   - Select bracket type: Solo or Team
   - Select bracket format: Elimination or Swiss
   - Select division (or Mixed Var for teams)
   - For Elimination: System auto-generates from Top 8 after ranking
   - For Swiss: Create open bracket

5. **Coach adds archers/teams to brackets**
   - For Elimination: Auto-seeded from ranking (Top 8)
   - For Swiss: Coach manually adds archers/teams
   - Can be done at setup or later in Edit phase

---

## 🎮 Coach Console UI Changes

### Event Edit Modal - Remove Current Match Results

**Remove:**
- Current "Match Results" section
- "➕ Solo Match" and "➕ Team Match" buttons
- Solo/Team match lists

**Replace with:**
- Link to "View Bracket Results" (opens new module)

### Event Edit Modal - Add Bracket Management

**New Section: "Brackets"** (after Division Rounds)

```
┌─────────────────────────────────────────┐
│ Brackets                                 │
│ [➕ Create Bracket]                      │
│                                          │
│ Solo Brackets:                          │
│   • BV Elimination (Top 8) [Edit]      │
│   • GV Swiss [Edit]                     │
│                                          │
│ Team Brackets:                          │
│   • BV Team Elimination (Top 8) [Edit]  │
│   • Mixed Var Team Swiss [Edit]         │
└─────────────────────────────────────────┘
```

**Create Bracket Modal:**
- Bracket Type: Solo / Team
- Bracket Format: Elimination / Swiss
- Division: BV / BJV / GV / GJV / Mixed Var (teams only)
- Bracket Size: 8 (elimination) or custom (swiss)
- Auto-generate from ranking? (elimination only, shows Top 8 preview)

---

## 🎯 Match Creation Flow (Updated)

### Solo Match Module

**Setup Screen Changes:**
1. Select Event (existing)
2. **NEW: Select Bracket** (dropdown)
   - Shows brackets for this event
   - Filtered by Solo type
   - Shows bracket format (Elimination/Swiss)

3. **For Elimination Brackets:**
   - System shows available matches in bracket
   - Match ID format: `BVARQ1` (Division + Round + Match Number)
   - Example: "BV Elimination - Quarter Final 1 (Archer A vs Archer B)"
   - Archers are pre-assigned based on bracket structure

4. **For Swiss Brackets:**
   - Archers select opponent manually
   - Match code generated: `SOLO-RHTA-1101` (existing system)
   - System tracks which opponents archer has faced

### Team Match Module

**Same flow as Solo, but:**
- Select Team bracket
- Match ID format: `BVTARQ1` (Team brackets)
- Swiss match codes: `TEAM-RHTA-1101`

---

## 📊 Bracket Results Module

**New File:** `bracket_results.html`

### Features

1. **Bracket Selection**
   - Dropdown: Select event
   - Dropdown: Select bracket (shows all brackets for event)
   - Tabs: Qual Ranking / Quarter Finals / Semi Finals / Finals Round

2. **Qualification Ranking Tab**
   - Shows ranking round results
   - Top 8 highlighted (for elimination brackets)
   - Used for seeding

3. **Elimination Bracket Tabs**
   - **Quarter Finals:** Shows 4 matches (Q1, Q2, Q3, Q4)
   - **Semi Finals:** Shows 2 matches (S1, S2)
   - **Finals Round:** Shows 1 match (F1) + Bronze match (B1)

4. **Match Display (per tab)**
   - Table format (like images provided)
   - Columns: Target, Name (Rank), End 1-5, Total Score
   - Shows set points (6 = winner, highlighted in green)
   - Shows end scores with X count: `29(2)`
   - Winner highlighted in green

5. **Swiss Bracket View**
   - Shows all matches in bracket
   - Leaderboard: Wins/Losses/Points (W-L format, e.g., 5-0)
   - Match history per archer/team
   - Win/Loss ratio displayed on match cards to help avoid duplicate opponents

6. **Bracket Completion**
   - "Validate All and Close" button (coach only)
   - Validates all matches in bracket are verified
   - Sets bracket status to "COMPLETED"
   - Locks bracket from further changes

### Data Structure

**API Endpoint:** `GET /v1/brackets/:bracketId/results`

**Response:**
```json
{
  "bracket": {
    "id": "bracket-uuid",
    "type": "SOLO",
    "format": "ELIMINATION",
    "division": "BV",
    "status": "IN_PROGRESS"
  },
  "qualification": [
    {
      "rank": 1,
      "archer_name": "Trenton Cowles",
      "total_score": 673,
      "total_10s": 45,
      "total_xs": 12
    }
  ],
  "rounds": {
    "quarterfinals": [
      {
        "match_id": "match-uuid",
        "bracket_match_id": "BVARQ1",
        "archer1": {
          "name": "Trenton Cowles (1)",
          "target": "15A",
          "ends": [
            {"end": 1, "score": 29, "xs": 2, "set_points": 2},
            {"end": 2, "score": 25, "xs": 0, "set_points": 0}
          ],
          "total_set_points": 6
        },
        "archer2": {
          "name": "Alex Gilliam (8)",
          "target": "16A",
          "ends": [
            {"end": 1, "score": 26, "xs": 0, "set_points": 0},
            {"end": 2, "score": 29, "xs": 2, "set_points": 2}
          ],
          "total_set_points": 2
        },
        "winner": "Trenton Cowles"
      }
    ],
    "semifinals": [...],
    "finals": [...]
  }
}
```

---

## 🔧 API Endpoints

### Bracket Management

```
POST   /v1/events/:eventId/brackets          Create bracket
GET    /v1/events/:eventId/brackets          List all brackets for event
GET    /v1/brackets/:bracketId               Get bracket details
PATCH  /v1/brackets/:bracketId               Update bracket
DELETE /v1/brackets/:bracketId               Delete bracket

POST   /v1/brackets/:bracketId/entries       Add archer/team to bracket
GET    /v1/brackets/:bracketId/entries       List bracket entries
DELETE /v1/brackets/:bracketId/entries/:id   Remove entry

POST   /v1/brackets/:bracketId/generate       Generate elimination bracket from ranking (Top 8)
GET    /v1/brackets/:bracketId/results        Get bracket results (for results module)
```

### Match Updates

```
PATCH  /v1/solo-matches/:id                  Update match (add bracket_id, bracket_match_id)
PATCH  /v1/team-matches/:id                  Update match (add bracket_id, bracket_match_id)
```

---

## 📝 Implementation Phases

### Phase 1: Database Schema ✅ COMPLETED
- [x] Create `brackets` table migration
- [x] Create `bracket_entries` table migration
- [x] Add `bracket_id` and `bracket_match_id` to `solo_matches`
- [x] Add `bracket_id` and `bracket_match_id` to `team_matches`

### Phase 2: API Endpoints ✅ COMPLETED
- [x] Bracket CRUD endpoints
- [x] Bracket entry management endpoints
- [x] Auto-generate elimination bracket from ranking
- [x] Bracket results endpoint

### Phase 3: Coach Console UI ✅ COMPLETED
- [x] Remove current Match Results section
- [x] Add Bracket Management section
- [x] Create Bracket modal
- [x] Edit Bracket modal (add/remove entries)
- [x] Link to Bracket Results module

### Phase 4: Match Creation Updates ✅ COMPLETED
- [x] Update Solo match setup to select bracket
- [x] Update Team match setup to select bracket
- [x] Generate bracket_match_id for elimination matches
- [x] Track Swiss match opponents

### Phase 5: Bracket Results Module ✅ COMPLETED
- [x] Create `bracket_results.html`
- [x] Implement bracket selection
- [x] Implement tab navigation (Qual, Quarters, Semis, Finals)
- [x] Display match results table
- [x] Display Swiss leaderboard

### Phase 6: Testing & Documentation ✅ COMPLETED
- [x] Test elimination bracket flow
- [x] Test Swiss bracket flow
- [x] Test mixed var team brackets
- [x] Update documentation

---

## 🎨 UI Mockups

### Bracket Results Module

**Header:**
```
2024 Olympic Games U.S. Team Trials
Stage #6: Elimination Round
Recurve Senior Men

[Qual Ranking] [Quarter Finals] [Semi Finals] [Finals Round]
```

**Table (Quarter Finals example):**
```
Target | Name (Rank)        | End 1  | End 2  | End 3  | End 4  | End 5  | Total Score
-------|-------------------|--------|--------|--------|--------|--------|------------
15A    | Trenton Cowles (1) | 29(2)  | 25(0)  | 29(2)  | 28(2)  |        | 6
16A    | Alex Gilliam (8)   | 26(0)  | 29(2)  | 28(0)  | 25(0)  |        | 2
```

---

## ✅ Design Decisions

1. **Swiss Bracket Seeding:** Random (no ranking-based seeding)

2. **Mixed Var Team Composition:** Coaches manually select 3 archers (mix of boys/girls) when creating team

3. **Bracket Match ID Format:** Include archer initials
   - Elimination: `BVARQ1-TC-AG` (Division + Round + Match + Archer1 Initials + Archer2 Initials)
   - Swiss: Existing system (`SOLO-RHTA-1101`) - no change

4. **Swiss Round Tracking:** Manual opponent selection, but match card shows win/loss ratio to help archers avoid duplicates

5. **Bracket Completion:** Bracket marked "COMPLETED" when coach clicks "Validate All and Close" button

---

## 📚 Related Documentation

- [Feature_EventPlanning_Product.md](Feature_EventPlanning_Product.md) - Original feature plan
- [OAS_RULES.md](OAS_RULES.md) - Tournament rules
- [VIEWING_MATCH_RESULTS.md](VIEWING_MATCH_RESULTS.md) - Current match viewing (to be replaced)
- [APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md](APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md) - System architecture

---

**Last Updated:** November 18, 2025  
**Status:** Planning - Ready for Implementation

