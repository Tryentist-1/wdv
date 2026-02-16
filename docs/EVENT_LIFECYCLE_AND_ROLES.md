# WDV Archery Suite - Event Lifecycle & User Roles

**Last Updated:** 2026-02-15  
**Purpose:** Complete guide to event flow from planning to completion, covering both Coach and Archer roles across two distinct event types: **Sanctioned OAS Events** and **Games Events**.

---

## Table of Contents

1. [User Roles](#user-roles)
2. [Event Types Overview](#event-types-overview)
3. [Bale and Target Model](#bale-and-target-model)
4. [Assignment System](#assignment-system)
5. [Games Event Lifecycle](#games-event-lifecycle)
6. [Sanctioned OAS Event Lifecycle](#sanctioned-oas-event-lifecycle)
7. [Authentication Flows](#authentication-flows)
8. [Data Flow and Database Tables](#data-flow-and-database-tables)
9. [Coach vs Archer Permissions](#coach-vs-archer-permissions)
10. [Quick Reference](#quick-reference)
11. [Best Practices](#best-practices)
12. [Common Issues and Solutions](#common-issues-and-solutions)
13. [Implementation TODOs](#implementation-todos)

---

## User Roles

### Coach Role

**Access:** `coach.html` (requires passcode: `wdva26`)

**Responsibilities:**
- Manage archer records and school rosters in the Archer List module (Import CSV or Add Archer)
- Assign positions (S1-S4, T1-T2) for Games Events via `assignment_list.html`
- Create and manage events, including Ranking Rounds, Solo Brackets, and Team Brackets
- Assign opponents, bales, and targets for each round
- Verify scorecards and match results
- Manage event lifecycle (Planned -> Active -> Completed)
- Determine winners and award medals

**Permissions:**
- Full read/write access to all data
- Delete events, rounds, archers
- Verify and finalize scores
- Create brackets and generate matches
- Export/import CSV files
- Access admin tools

---

### Archer Role

**Access:** `index.html` -> Enter event code -> Select profile -> Access scoring apps

**Responsibilities:**
- Select own profile from master list
- Find opponents and bale/target assignments on the Home Screen
- Join events using entry codes or QR codes
- Score ranking rounds (300 Round) when applicable
- Score solo matches (Olympic Round)
- Score team matches (Olympic Team Round)
- Check Home Screen for updated opponents and bale assignments as rounds progress
- View own history and stats

**Permissions:**
- Read archer list (public)
- Read/write own scores (authenticated by event code)
- View event results and brackets (public)
- Cannot verify scores (coach-only)
- Cannot create events
- Cannot delete data

---

## Event Types Overview

The app supports two distinct event types with different flows:

### Games Events (Non-Sanctioned)

**Use case:** Multi-school competitions focused on maximum participation and experience. This is the primary flow for weekend games events.

**Key characteristics:**
- Ranking Rounds are **optional** (brackets do NOT require ranking scores)
- Swiss format only (Solo and Team)
- Roster populated from **assignment field** (S1-S4 = Solo, T1-T2 = Team)
- Divisions: BVAR, GVAR, BJV, GJV
- Medals: 1st, 2nd, 3rd per division for both Solo and Team
- All divisions and types shoot each round simultaneously
- App suggests number of rounds based on roster size

**Typical structure:**
- Solo Swiss Brackets: BVAR, GVAR, BJV, GJV
- Team Swiss Brackets: BVAR, GVAR, BJV, GJV
- All brackets run concurrently through N rounds

---

### Sanctioned OAS Events

**Use case:** Official Oregon Archery in the Schools tournaments with formal ranking and elimination brackets.

**Key characteristics:**
- Ranking Rounds are **required** (scores determine seeding)
- Elimination format (Top 8 from Ranking Round)
- Assignment field is **NOT used** -- seeding is score-based
- Divisions: BVAR, GVAR (Varsity only for Elimination; no JV)
- Team Brackets: Top 3 archers per school for Varsity Men and Varsity Women

**Typical structure:**
1. Ranking Rounds (R300) for BVAR, GVAR, BJV, GJV
2. Solo Elimination Brackets: Top 8 from Ranking Round (BVAR, GVAR)
3. Team Elimination Brackets: Top 3 archers per school (BVAR, GVAR)

---

### Comparison

| Feature | Games Events | Sanctioned OAS Events |
|---|---|---|
| **Ranking Rounds** | Optional | Required |
| **Bracket Format** | Swiss | Elimination (Top 8) |
| **Roster Source** | Assignment field (S1-S4, T1-T2) | Ranking Round scores |
| **Divisions** | BVAR, GVAR, BJV, GJV | BVAR, GVAR (Varsity only for brackets) |
| **JV Brackets** | Yes | No |
| **Assignment Field Used** | Yes | No |
| **Round Count** | App-suggested ceil(log2(N)) | Fixed bracket size (8) |
| **Medals** | 1st/2nd/3rd per division (Solo + Team) | 1st/2nd/3rd + overall school awards |

---

## Bale and Target Model

### Physical Layout

Each **bale** has **4 targets** arranged in two lines:

```
         Bale N
    ┌──────────────────┐
    │  Line 1 (shoots first)  │
    │  ┌─────┐  ┌─────┐      │
    │  │  A  │  │  B  │      │
    │  └─────┘  └─────┘      │
    │                         │
    │  Line 2 (shoots second) │
    │  ┌─────┐  ┌─────┐      │
    │  │  C  │  │  D  │      │
    │  └─────┘  └─────┘      │
    └──────────────────┘
```

- **Line 1:** Targets A and B -- shoots first
- **Line 2:** Targets C and D -- shoots second
- Lines alternate: all Line 1 archers shoot, then all Line 2 archers shoot

### Solo Match on a Bale

A solo match is a 1v1 head-to-head. Two opponents share a **line** on the same bale:

```
    Line 1: Archer1 → Target A  vs  Archer2 → Target B
    Line 2: Archer3 → Target C  vs  Archer4 → Target D
```

- **2 solo matches per bale** (one match per line)
- Opponents shoot side by side on the same line
- 5 sets, 3 arrows per set, first to 6 set points wins

### Team Match on a Bale

A team match is a 3v3. Each team of 3 archers shares **one target**, taking turns:

```
    Line 1: Team1 (3 archers) → Target A  vs  Team2 (3 archers) → Target B
    Line 2: Team3 (3 archers) → Target C  vs  Team4 (3 archers) → Target D
```

- **2 team matches per bale** (one match per line)
- Each archer shoots 2 arrows per set, one at a time (Archer1, then Archer2, then Archer3)
- 4 sets maximum, first team to 5 set points wins
- All 3 archers share one target face

### Capacity (16 Bales)

| | Per Bale | 16 Bales Total |
|---|---|---|
| **Solo matches** | 2 (one per line) | 32 matches (64 archers) |
| **Team matches** | 2 (one per line) | 32 matches (192 archers) |
| **Mixed (Solo + Team)** | 2 total | 32 matches total |

When Solo and Team matches run simultaneously in the same round:
- Bales are assigned **sequentially**: Solo matches fill bales first, then Team matches
- Example: 12 Solo matches (6 bales) + 6 Team matches (3 bales) = 9 bales used

### Waves

If a round has more matches than available bale capacity (32 matches for 16 bales):

- **Wave A:** First batch of matches shoots
- **Wave B:** Second batch shoots after Wave A completes

Waves are rare with fewer than 20 archers per division but possible with large events.

---

## Assignment System

### Overview

The **assignment field** on each archer record determines which bracket type they participate in for Games Events. Managed in `assignment_list.html` before event creation.

### Position Values

| Position | Type | Meaning |
|---|---|---|
| S1 | Solo | Solo position 1 (top solo archer) |
| S2 | Solo | Solo position 2 |
| S3 | Solo | Solo position 3 |
| S4 | Solo | Solo position 4 |
| S5-S8 | Solo | Additional solo positions (larger teams) |
| T1 | Team | Team 1 member |
| T2 | Team | Team 2 member (second team from same school, rare) |
| T3-T6 | Team | Additional team positions |
| (empty) | None | Not assigned to any bracket |

### Key Rules

- **An archer is Solo OR Team, not both.** The single `assignment` field determines their bracket type.
- Solo archers (S1-S4) go into Solo Swiss brackets only
- Team archers (T1-T2) go into Team Swiss brackets only
- Assignments are set **per season** in the Archer List module and can change between events

### Typical Team Compositions

| School Size | Solo Positions | Team Positions | Total Archers |
|---|---|---|---|
| Small (5 archers) | S1, S2 | T1 (3 archers) | 5 |
| Medium (7 archers) | S1, S2, S3, S4 | T1 (3 archers) | 7 |
| Large (10+ archers) | S1, S2, S3, S4 | T1 (3), T2 (3) | 10 |

### Team Derivation

Teams are derived from the combination of **School + Gender + Level + Team Number**:

```
Team ID Format: {SCHOOL}-{GENDER}-{LEVEL}-{T#}

Examples:
  WDV-M-VAR-T1  = West Valley Men's Varsity Team 1
  BHS-F-VAR-T1  = Bend High Women's Varsity Team 1
  HST-M-JV-T1   = Hood River Men's JV Team 1
  MIX-F-VAR-T1  = Mixed Women's Varsity Team 1 (cross-school)
```

- A team = all archers at the same School + Gender + Level with the same T# assignment
- Each team must have exactly **3 archers**
- Team ID is derived at import time, not stored as a separate field

### Cross-School Teams ("MIX")

When a school does not have enough archers for a full team (3):
1. Coach creates a **"MIX" school** entry in the roster
2. Assigns archers from different schools to the MIX school with T1 position
3. These archers form a mixed team: "MIX-M-VAR-T1"
4. Coach can manually adjust bale assignments in Edit mode if needed

### Assignment Workflow

```
1. Coach opens assignment_list.html
2. Filters by School, Gender, Level, Status (Active)
3. Clicks S1-S4 buttons for solo archers
4. Clicks T1-T2 buttons for team archers
5. Auto-saves to database after 1.5 seconds
6. Repeat for each school
7. Assignments ready for event import
```

---

## Games Event Lifecycle

This is the complete flow for a Games Event (non-sanctioned, Swiss format, assignment-based rosters).

### Phase 1: Pre-Event Setup (Coach, days before)

**Location:** `assignment_list.html` + `coach.html`

#### Step 1: Assign Positions
1. Open `assignment_list.html`
2. For each school, filter by Gender and Level
3. Assign S1-S4 to solo archers, T1-T2 to team archers
4. Verify each team has exactly 3 archers with the same T# assignment
5. Set any non-participating archers to "Inactive"
6. Confirm all assignments saved

#### Step 2: Create Event
1. Open `coach.html` -> "Create Event"
2. Enter event name (e.g., "WDV Games Feb 2026")
3. Select date
4. Set bales available: **16** (configurable)
5. Set targets per bale: **4** (A, B, C, D)
6. Generate entry code (e.g., `GAMES26`)
7. Status: `Planned`

#### Step 3: Import Rosters from Assignments
1. Click "Import Roster" on the event
2. System filters all archers where `status = 'active'` and `assignment != ''`
3. Groups archers by Gender + Level + Assignment type:
   - S* archers -> Solo brackets per division (BVAR, GVAR, BJV, GJV)
   - T* archers -> Team brackets per division (BVAR, GVAR, BJV, GJV)
4. System creates up to **8 brackets** automatically:
   - Solo Swiss BVAR, Solo Swiss GVAR, Solo Swiss BJV, Solo Swiss GJV
   - Team Swiss BVAR, Team Swiss GVAR, Team Swiss BJV, Team Swiss GJV
5. Empty divisions (no archers) are skipped
6. Coach reviews rosters and can manually add/remove archers

#### Step 4: Generate Round 1
1. System suggests total rounds: **ceil(log2(N))** where N = largest roster in any bracket
   - Example: 16 archers -> 4 rounds suggested, 20 archers -> 5 rounds
   - Coach can override
2. Click "Generate Round 1"
3. System creates pairings following these rules:
   - **Different schools** paired against each other (priority)
   - Random or seed-based initial pairing
   - No duplicate matchups across rounds
4. System auto-assigns bales and targets:
   - Solo matches assigned first, sequentially (Bale 1 Line 1, Bale 1 Line 2, Bale 2 Line 1, etc.)
   - Team matches assigned after Solo, continuing bale sequence
   - If matches exceed 32 (16 bales x 2 lines): split into Wave A and Wave B
5. Coach reviews and can manually adjust opponents or bale assignments in Edit mode

**Output:**
- Event exists with entry code and QR code
- All brackets created with rosters
- Round 1 pairings generated with bale/target assignments
- Event ready for day-of

---

### Phase 2: Day-of-Event Setup (Coach, morning of)

**Location:** `coach.html` -> Event Dashboard

#### Steps:
1. Coach changes event status from `Planned` to `Active`
2. Display QR code on projector or share event URL
3. Archers arrive, scan QR code or enter event code
4. Archers select their profile and see their Round 1 assignment:
   - Opponent name
   - Bale number
   - Target letter (A, B, C, or D)
   - Line number (1 or 2)

**Output:**
- Event is `Active`
- Archers can access via QR/code
- All archers know where to go for Round 1

---

### Phase 3: Match Play (Archers + Coach, during event)

**Location:** `solo_card.html` (Solo) or `team_card.html` (Team)

#### Archer Steps:
1. **Check Home Screen** for current round assignment:
   - Opponent(s)
   - Bale number and target
   - Line 1 or Line 2
2. **Go to assigned bale**
3. **Line 1 shoots first** (Targets A and B)
   - Solo: Both archers score simultaneously on their respective targets
   - Team: All 3 archers on each team take turns on their shared target
4. **Line 2 shoots second** (Targets C and D) -- same format
5. **Score the match** digitally (one scorer uses app, other uses paper backup)
6. **Submit match** -> status: `PENDING` -> `COMP` (Completed)

#### Solo Match Scoring:
- 5 sets maximum
- 3 arrows per set (30 points max per set)
- Win set: 2 points, Tie set: 1 point each
- First to 6 set points wins
- Shoot-off if tied 5-5 after 5 sets

#### Team Match Scoring:
- 4 sets maximum
- Each archer shoots 2 arrows per set (6 arrows per team per set, 24 points max)
- Archers shoot one at a time: Archer 1, Archer 2, Archer 3
- Win set: 2 points, Tie set: 1 point each
- First team to 5 set points wins
- Shoot-off if tied 4-4 after 4 sets

---

### Phase 4: Verification and Next Round (Coach, between rounds)

**Location:** `coach.html` -> "Verify Scorecards"

#### Steps:
1. **Verify completed matches:**
   - Review all `COMP` matches from current round
   - Compare digital scores to paper scorecards
   - Verify: `COMP` -> `VER` (Verified) -- winner/loser recorded
   - Void: `COMP` -> `VOID` -- match must be re-shot
2. **Swiss standings update automatically:**
   - W-L records updated for all verified matches
   - Standings ranked by: Points (2/win, 1/tie) -> Wins -> Losses (fewer better) -> Head-to-head
3. **Generate next round:**
   - Click "Generate Round N+1"
   - System pairs by current record (winners vs winners, etc.)
   - Different schools still prioritized
   - No rematches (system prevents duplicate pairings)
   - Bales/targets auto-assigned
   - Coach reviews and can adjust
4. **Announce next round** -- archers check Home Screen for new assignment
5. **Repeat** until all suggested rounds complete

---

### Phase 5: Finals and Medals (Coach, end of event)

**Location:** `coach.html` -> Event Dashboard -> Results

#### Steps:
1. After final round verified, review Swiss standings per bracket
2. **Medals awarded per division:**
   - Solo BVAR: 1st, 2nd, 3rd
   - Solo GVAR: 1st, 2nd, 3rd
   - Solo BJV: 1st, 2nd, 3rd
   - Solo GJV: 1st, 2nd, 3rd
   - Team BVAR: 1st, 2nd, 3rd
   - Team GVAR: 1st, 2nd, 3rd
   - Team BJV: 1st, 2nd, 3rd
   - Team GJV: 1st, 2nd, 3rd
3. **Tiebreakers for medal positions:**
   - Swiss points (2/win, 1/tie)
   - Total wins
   - Fewest losses
   - Head-to-head result
   - If still tied: shared placement
4. Update event status to `Completed`
5. Export results (optional)

---

### Phase 6: Event Completion (Coach)

**Location:** `coach.html` -> Event Dashboard

#### Steps:
1. Verify all matches across all brackets are verified (no `COMP` or `PENDING` remaining)
2. Review final standings and medal placements
3. Change event status from `Active` to `Completed`
4. Generate reports / export CSV (optional)
5. Historical record saved

---

### Games Event Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GAMES EVENT LIFECYCLE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PHASE 1: Pre-Event Setup (Coach)                                  │
│  ├─ Assign positions in assignment_list.html (S1-S4, T1-T2)       │
│  ├─ Create event with bale config (16 bales, 4 targets)           │
│  ├─ Import rosters from active assignments                         │
│  ├─ System creates Solo + Team Swiss brackets per division         │
│  ├─ Generate Round 1 pairings (different schools, auto-bales)     │
│  └─ Status: PLANNED                                                │
│      ↓                                                              │
│                                                                     │
│  PHASE 2: Day-of Setup (Coach)                                     │
│  ├─ Change status to ACTIVE                                        │
│  ├─ Share QR code / event URL with archers                         │
│  ├─ Archers join and see Round 1 assignment                        │
│  └─ Status: ACTIVE                                                  │
│      ↓                                                              │
│                                                                     │
│  PHASE 3: Match Play (Archers)                ─── ROUND LOOP ───  │
│  ├─ Check Home Screen for bale/target/opponent                     │
│  ├─ Line 1 shoots (A, B), then Line 2 shoots (C, D)              │
│  ├─ Score match digitally + paper backup                           │
│  └─ Submit match (PENDING → COMP)                                  │
│      ↓                                                              │
│                                                                     │
│  PHASE 4: Verification + Next Round (Coach)   ─── ROUND LOOP ───  │
│  ├─ Verify matches (COMP → VER)                                    │
│  ├─ Swiss standings auto-update                                    │
│  ├─ Generate next round (pair by record, auto-bales)              │
│  └─ Repeat Phases 3-4 for ceil(log2(N)) rounds                   │
│      ↓                                                              │
│                                                                     │
│  PHASE 5: Finals + Medals (Coach)                                  │
│  ├─ Final standings calculated                                     │
│  ├─ Medals: 1st/2nd/3rd per division (Solo + Team)                │
│  └─ Announce winners                                                │
│      ↓                                                              │
│                                                                     │
│  PHASE 6: Event Completion (Coach)                                 │
│  ├─ All matches verified                                           │
│  ├─ Export results                                                  │
│  └─ Status: COMPLETED                                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Games Event Day Timeline (Example)

**Assumptions:** 6 schools, ~60 archers total, 16 bales available

**Week Before:**
- Coaches assign positions (S1-S4, T1-T2) per school
- Head coach creates event, imports rosters, generates Round 1

**Day of Event:**

| Time | Activity | Who |
|---|---|---|
| 8:00 AM | Arrive, set up bales, activate event, display QR | Coach |
| 8:15 AM | Archers scan QR, find Round 1 assignments | Archers |
| 8:30 AM | **Round 1** -- all Solo + Team matches shoot | All |
| 9:15 AM | Verify Round 1, generate Round 2 | Coach |
| 9:30 AM | **Round 2** -- matches by record | All |
| 10:15 AM | Verify Round 2, generate Round 3 | Coach |
| 10:30 AM | **Round 3** -- matches by record | All |
| 11:15 AM | Verify Round 3, generate Round 4 | Coach |
| 11:30 AM | **Round 4** -- final round | All |
| 12:15 PM | Verify Round 4, finalize standings | Coach |
| 12:30 PM | Medal ceremony, event completed | All |

---

## Sanctioned OAS Event Lifecycle

This is the flow for official Oregon Archery in the Schools tournaments where Ranking Round scores determine bracket seeding.

### Phase 1: Event Planning (Coach)

**Timeline:** Days or weeks before event  
**Location:** `coach.html` -> "Create Event"

#### Steps:
1. **Create Event**
   - Enter event name (e.g., "State Championships 2026")
   - Select date
   - Set status: `Planned`
   - Generate entry code (e.g., `STATE26`)

2. **Select Divisions for Ranking Rounds**
   - Check divisions: BVAR, GVAR, BJV, GJV
   - System creates a Ranking Round (R300) for each selected division

3. **Add Archers to Ranking Rounds (Division Loop)**
   - FOR EACH DIVISION:
     - Modal: "Add Archers to [Division] Round"
     - Search/filter master archer list (by school, gender, level, status)
     - Select multiple archers (bulk selection)
     - Choose bale assignment mode:
       - **Auto-Assign:** System assigns bales (2-4 per bale, continuous numbering)
       - **Manual Signup:** Archers select their own bales via app
     - Click "Confirm"
   - Loop continues until all divisions configured

4. **Event created**
   - Status: `Planned`
   - Ranking rounds have rosters with bale assignments
   - Entry code and QR code available

---

### Phase 2: Day-of-Event Setup (Coach)

**Timeline:** Morning of event  
**Location:** `coach.html` -> Event Dashboard

#### Steps:
1. Change event status from `Planned` to `Active`
2. Display QR code on projector or share event URL
3. If Manual Signup mode: archers select bales via app

---

### Phase 3: Ranking Round Scoring (Archers)

**Timeline:** 1-2 hours  
**Location:** `ranking_round_300.html`

#### Steps:
1. Scan QR code or enter event code
2. Select own profile from list
3. Confirm bale assignment
4. Score 30 arrows (10 ends x 3 arrows per end)
5. View running total and real-time leaderboard
6. Submit scorecard -> status: `PENDING` -> `COMP`

---

### Phase 4: Ranking Round Verification (Coach)

**Timeline:** After archers submit  
**Location:** `coach.html` -> "Verify Scorecards"

#### Steps:
1. Select verification type: "Ranking Rounds"
2. Select division and bale
3. Review scorecards: compare digital to paper, check signatures
4. Verify (`COMP` -> `VER`) or Void (`COMP` -> `VOID`)
5. Bulk verify: "Verify This Bale" or "Verify ALL Bales"

**Output:** Official rankings calculated, ready for bracket generation

---

### Phase 5: Bracket Creation (Coach)

**Timeline:** After ranking rounds verified  
**Location:** `coach.html` -> Event Dashboard -> "Create Bracket"

#### A. Solo Elimination (Top 8)
1. Create bracket: Solo, Elimination, Division (BVAR or GVAR)
2. Click "Generate from Top 8" -- fetches top 8 from verified ranking scores
3. Seeds: 1v8, 2v7, 3v6, 4v5
4. 4 Quarter-Final matches created

#### B. Team Elimination
1. Create bracket: Team, Elimination, Division (BVAR or GVAR)
2. Generate from top schools (top 3 archers per school by combined ranking scores)
3. Teams seeded by combined score
4. Bracket matches created

---

### Phase 6: Elimination Match Play (Archers)

**Timeline:** During/after ranking rounds  
**Location:** `solo_card.html` or `team_card.html`

#### Steps:
1. View "My Matches" on home page -- see assigned opponent and bale/target
2. Navigate to match card
3. Both archers/teams confirm ready
4. Score match (Solo: 5 sets x 3 arrows; Team: 4 sets x 2 arrows per archer)
5. Submit match -> `PENDING` -> `COMP`

**Bracket Progression:**
- QF Winner -> Semi-Final
- SF Winner -> Final
- Final Winner -> Champion
- Losers -> Placement matches (3rd/4th)

---

### Phase 7: Match Verification (Coach)

**Timeline:** After each match  
**Location:** `coach.html` -> "Verify Scorecards"

#### Steps:
1. Review completed matches
2. Verify (`COMP` -> `VER`) or Void (`COMP` -> `VOID`)
3. Winner auto-advances to next round
4. Repeat until champion determined

---

### Phase 8: Event Completion (Coach)

**Timeline:** After all matches  
**Location:** `coach.html` -> Event Dashboard

#### Steps:
1. Verify all ranking rounds and bracket matches verified
2. Review final results:
   - Ranking Round placements per division
   - Solo Elimination champion per division
   - Team Elimination champion per division
   - Overall school/team awards
3. Change event status to `Completed`
4. Export reports (optional)

---

## Authentication Flows

### Coach Authentication

```
coach.html
  → Modal: "Enter Passcode"
  → Enter: wdva26
  → Cookie stored (90 days)
  → Full access granted
```

### Archer Authentication

```
index.html
  → Scan QR code OR enter event code (e.g., GAMES26)
  → Select own profile from list
  → Event-specific access granted
  → Can score for this event only
```

---

## Data Flow and Database Tables

### Core Tables

| Table | Purpose |
|---|---|
| `events` | Event metadata (name, date, status, entry_code, event_type) |
| `archers` | Master archer list (name, school, gender, level, assignment, status) |
| `rounds` | Ranking rounds (one per division per event) |
| `round_archers` | Archer assignments to ranking rounds (with bale/target) |
| `end_events` | Individual end scores for ranking rounds (30 arrows per archer) |
| `brackets` | Bracket metadata (type: SOLO/TEAM, format: SWISS/ELIMINATION, division, mode) |
| `bracket_entries` | Archers/teams in brackets (with seeds, W-L records) |
| `solo_matches` | Solo match records (with bracket_id, status, winner) |
| `solo_match_archers` | Archer pairings for solo matches (position 1 or 2) |
| `solo_values` | Arrow-by-arrow scores for solo matches |
| `team_matches` | Team match records |
| `team_match_teams` | Team entries in team matches |
| `team_match_archers` | Individual archers within teams |
| `team_values` | Arrow scores for team matches |

### Key Fields on `archers` Table

| Field | Type | Values | Purpose |
|---|---|---|---|
| `gender` | VARCHAR(1) | M, F | Division grouping |
| `level` | VARCHAR(3) | VAR, JV, BEG | Division grouping |
| `school` | VARCHAR(3) | 3-letter code | School/team affiliation |
| `assignment` | ENUM | S1-S8, T1-T6, '' | Games Event bracket placement |
| `status` | VARCHAR(16) | active, inactive | Roster filtering |

### Division Codes (Derived)

| Code | Gender | Level | Display Name |
|---|---|---|---|
| BVAR | M | VAR | Men's Varsity |
| GVAR | F | VAR | Women's Varsity |
| BJV | M | JV | Men's JV |
| GJV | F | JV | Women's JV |

### Source of Truth

- **Database:** Source of truth for all verified data
- **localStorage:** Temporary cache only (scorecard drafts, profile selection, UI preferences)

---

## Coach vs Archer Permissions

| Action | Coach | Archer |
|---|---|---|
| Create events | Yes | No |
| Assign positions (S1-S4, T1-T2) | Yes | No |
| Import rosters | Yes | No |
| Add archers to events | Yes | No |
| Assign bales | Yes | No (can select if manual mode) |
| View archer list | Yes | Yes (public) |
| Score ranking rounds | Yes | Yes |
| Score matches | Yes | Yes |
| Submit scorecards | Yes | Yes |
| Verify scorecards | Yes | No |
| Verify matches | Yes | No |
| Create brackets | Yes | No |
| Generate rounds/matches | Yes | No |
| View results | Yes | Yes (public) |
| Delete data | Yes | No |
| Export CSV | Yes | No |
| Import CSV | Yes | No |
| Access admin tools | Yes | No |

---

## Quick Reference

### Coach Tasks

| Task | Location |
|---|---|
| Assign positions (S1-S4, T1-T2) | `assignment_list.html` |
| Create event | `coach.html` -> "Create Event" |
| Import roster from assignments | Event Dashboard -> "Import Roster" |
| Edit event / adjust bales | `coach.html` -> Click event -> "Edit" |
| Generate next round | Event Dashboard -> Bracket -> "Generate Round" |
| Verify scorecards | `coach.html` -> "Verify Scorecards" |
| View results / standings | Event Dashboard -> "View Results" |
| Create bracket (Sanctioned) | Event Dashboard -> "Create Bracket" |
| Export data | `coach.html` -> "Export CSV" |
| Admin tools | Footer -> "Admin" |

### Archer Tasks

| Task | Location |
|---|---|
| Join event | `index.html` -> Scan QR or enter code |
| Select profile | After entering code -> Select from list |
| View current assignment | Home Screen -> opponent, bale, target, line |
| Score ranking round | `ranking_round_300.html` |
| Score solo match | `solo_card.html` |
| Score team match | `team_card.html` |
| View bracket standings | `bracket_results.html` |
| View own history | `archer_history.html` |

---

## Best Practices

### For Coaches (Games Events)

1. **Assign positions days in advance** -- use `assignment_list.html` so rosters are ready
2. **Verify team sizes** -- every T1/T2 group must have exactly 3 archers per school/gender/level
3. **Use MIX school sparingly** -- only when a school genuinely cannot field a team of 3
4. **Generate Round 1 before event day** -- review pairings and bale assignments in advance
5. **Verify matches promptly between rounds** -- don't let them pile up
6. **Trust the app's round suggestion** -- ceil(log2(N)) is mathematically sound for Swiss
7. **Monitor leaderboards during matches** -- coaches and spectators can follow along
8. **Export results after completion** -- backup for awards and records

### For Coaches (Sanctioned Events)

1. **Create events days in advance** -- don't wait until day-of
2. **Use auto-assign bales** -- faster and less confusion than manual
3. **Test the QR code** -- make sure it works before event
4. **Generate brackets only after ALL ranking rounds verified** -- ensures accurate seeding
5. **Export data regularly** -- backup results

### For Archers

1. **Test the app before event day** -- make sure you can access it
2. **Check Home Screen between rounds** -- opponents and bales change each round
3. **Bring paper scorecard** -- required for verification (backup to digital)
4. **Sign paper card** -- coach needs signature for verification
5. **Submit matches promptly** -- don't hold up the next round
6. **Arrive at your bale on time** -- know your bale number, target letter, and line

---

## Common Issues and Solutions

### "Can't access event"
- Check entry code is correct
- Event must be `Active` status
- Try manual entry if QR doesn't work

### "Can't find my profile"
- Search by first or last name
- Profile must exist in master list with `status = 'active'`
- Ask coach to add you if not found

### "Don't know where to go"
- Check Home Screen for: Bale number, Target letter (A/B/C/D), Line (1 or 2)
- Line 1 = Targets A and B (shoot first)
- Line 2 = Targets C and D (shoot second)

### "Can't submit scorecard"
- Must complete all sets/arrows
- Check for missing scores
- Verify end totals calculated

### "Match opponent not showing up"
- Check bale/target assignment
- Verify both archers are in the event
- Ask coach if issue persists

### "Bracket not generating / no Round 1"
- Verify rosters are imported (check bracket has entries)
- For Sanctioned: ranking rounds must be verified (not just completed)
- For Games: assignments must be set and archers must be active
- Check division codes match

### "Not enough bales"
- System will split into Wave A and Wave B if matches exceed capacity
- Coach can adjust bale assignments manually in Edit mode
- Consider reducing divisions or running sequentially

---

## Implementation TODOs

These are database and code changes needed to fully support the Games Event flow described in this document. They represent gaps between the current implementation and the documented requirements.

### Database Changes

1. **Add bale config to `events` table:**
   - `total_bales` INT DEFAULT 16
   - `targets_per_bale` INT DEFAULT 4

2. **Add bale/target fields to match tables:**
   - `solo_matches`: add `bale_number` INT, `line_number` TINYINT (1 or 2)
   - `solo_match_archers`: add `target_assignment` VARCHAR(1) (A, B, C, or D)
   - `team_matches`: add `bale_number` INT, `line_number` TINYINT (1 or 2)
   - `team_match_teams`: add `target_assignment` VARCHAR(1) (A, B, C, or D)

3. **Add wave support:**
   - `solo_matches`: add `wave` VARCHAR(1) DEFAULT NULL (A or B)
   - `team_matches`: add `wave` VARCHAR(1) DEFAULT NULL (A or B)

### API Changes

4. **Import roster from assignments endpoint:**
   - `POST /v1/events/{id}/import-roster`
   - Filters active archers by assignment (S* -> Solo brackets, T* -> Team brackets)
   - Auto-creates brackets per division
   - Returns created brackets and roster counts

5. **Bale auto-assignment in round generation:**
   - Update `POST /v1/brackets/{id}/generate-round` to accept bale config
   - Sequential bale fill: Solo first, then Team
   - Wave A/B split when exceeding capacity

6. **Swiss round count suggestion:**
   - `GET /v1/brackets/{id}/suggested-rounds`
   - Returns `ceil(log2(N))` based on roster size
   - Coach can override when generating rounds

### UI Changes

7. **Event creation form:**
   - Add "Total Bales" and "Targets per Bale" fields
   - Add "Event Type" selector: Games Event vs Sanctioned Event

8. **Home Screen for archers:**
   - Display bale number, target letter, line number for current match
   - Clear visual distinction between Line 1 and Line 2

9. **Coach dashboard:**
   - Show bale assignment summary per round
   - Wave A/B indicators when applicable
   - Medal/placement view for Games Events

---

## Related Documentation

- **Bracket Validation:** `docs/BRACKET_CREATION_VALIDATION.md`
- **Event Modal Refactor:** `docs/EVENT_MODAL_REFACTOR_PHASE1_IMPLEMENTATION.md`
- **Testing Guide:** `docs/testing/TESTING_GUIDE.md`
- **Architecture:** `docs/core/APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md`
- **Authentication:** `docs/core/AUTHENTICATION_FLOWS.md`
- **API Endpoints:** `docs/implementation/PHASE2_API_ENDPOINTS.md`

---

**Last Updated:** 2026-02-15  
**Status:** REVISED  
**Audience:** Coaches, Archers, Developers
