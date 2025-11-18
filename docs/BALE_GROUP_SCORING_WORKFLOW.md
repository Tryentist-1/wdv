# Bale Group Scoring Workflow - Complete Process

**Date:** November 17, 2025  
**Status:** Critical Reference Document  
**Audience:** Developers, Coaches, Refs

---

## 🎯 Overview

This document describes the **complete scoring workflow** for archery competitions, from setup through final verification. Understanding this flow is critical for proper system design.

---

## 👥 Key Roles

### Bale Group Composition
- **Typical Size:** 4 archers per bale (can be 3-9)
- **Paper Scorer:** 1 archer designated to write on physical scorecard
- **Digital Scorer:** 1 archer designated to use the app (enters scores for ENTIRE bale)
- **Archers:** All shoot and verify their scores

**Important:** The digital scorer is also one of the shooting archers!

### Competition Roles
- **Archers:** Shoot, sign off on scores
- **Paper Scorer:** Records on physical card, signs
- **Digital Scorer:** Records in app for entire bale, signs
- **Coach/Ref:** Verifies all bale scores match, locks cards
- **Results Manager:** Uses verified scores for awards/placement

---

## 📋 Complete Scoring Workflow

### Phase 1: Event Setup (Coach)

```
Coach Console
    │
    ├─→ Create Event (e.g., "Practice Meet - Nov 17")
    ├─→ Generate Entry Code
    ├─→ Create QR Code
    └─→ Assign Archers to Bales
         │
         ├─ Bale 1: Sarah J (A), Mike C (B), Alex R (C), Emma D (D)
         ├─ Bale 2: John S (A), Lisa M (B), Tom W (C), Amy K (D)
         └─ Bale 3: ...
```

**Key Points:**
- Archers are assigned to specific bales
- Each archer gets a target position (A, B, C, D)
- Entry code required for archers to access event

---

### Phase 2: Bale Group Setup (Archers)

```
Bale 1 arrives at shooting line
    │
    ├─→ ONE archer scans QR code (or enters event code)
    │    └─→ App loads entire bale roster
    │
    ├─→ Group designates roles:
    │    ├─ Paper Scorer: Mike C
    │    └─ Digital Scorer: Sarah J (also shooting!)
    │
    └─→ Physical scorecard prepared
         └─→ Names written for all 4 archers
```

**Key Points:**
- Only ONE device needed per bale
- Digital scorer enters scores for ALL archers
- Physical card mirrors digital entry

---

### Phase 3: Shooting & Scoring (Entire Round)

```
┌─────────────────────────────────────────────────────┐
│ BALE 1 - Full Round (10 or 12 ends)                 │
├─────────────────────────────────────────────────────┤
│                                                      │
│ End 1:                                               │
│   All 4 archers shoot 3 arrows                      │
│   │                                                  │
│   ├─→ Paper Scorer: Writes scores on physical card  │
│   └─→ Digital Scorer: Enters ALL 4 scores in app    │
│        (Sarah enters: Sarah, Mike, Alex, Emma)      │
│                                                      │
│ End 2-10 (or 2-12):                                  │
│   Repeat process for each end                       │
│                                                      │
│ Round Complete                                       │
│   All ends shot                                      │
│   All scores recorded (paper + digital)             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Database Structure:**
```javascript
// ONE round (event-specific)
round = {
  id: "uuid",
  event_id: "uuid",
  division: "BVAR",
  date: "2025-11-17"
}

// ONE round_archer per archer (4 total for bale)
round_archers = [
  { id: "uuid-1", round_id: "uuid", archer_id: "sarah", bale: 1, target: "A" },
  { id: "uuid-2", round_id: "uuid", archer_id: "mike", bale: 1, target: "B" },
  { id: "uuid-3", round_id: "uuid", archer_id: "alex", bale: 1, target: "C" },
  { id: "uuid-4", round_id: "uuid", archer_id: "emma", bale: 1, target: "D" }
]

// Multiple end_events per archer (10 or 12 per archer)
end_events = [
  { round_archer_id: "uuid-1", end: 1, arrows: [10,9,10], total: 29 },
  { round_archer_id: "uuid-1", end: 2, arrows: [10,10,9], total: 29 },
  // ... 8 more ends for Sarah
  { round_archer_id: "uuid-2", end: 1, arrows: [9,8,9], total: 26 },
  // ... Mike's ends
  // ... Alex's ends
  // ... Emma's ends
]
```

**Key Points:**
- **ONE digital scorer** enters scores for ALL archers
- Each archer has their own `round_archer` record (scorecard)
- Scores saved in real-time (offline queue if needed)
- Coach can see live progress during shooting

---

### Phase 4: Sign-Off (Bale Group)

```
Round Complete
    │
    ├─→ Physical Card:
    │    │
    │    ├─ Paper Scorer (Mike) signs
    │    ├─ Digital Scorer (Sarah) signs
    │    ├─ Archer 1 (Sarah) signs
    │    ├─ Archer 2 (Mike) signs
    │    ├─ Archer 3 (Alex) signs
    │    └─ Archer 4 (Emma) signs
    │
    └─→ Digital App:
         └─→ "Complete Round" button clicked
              └─→ Scorecard marked as ready for verification
```

**Key Points:**
- **6 signatures required** on physical card:
  - Paper scorer
  - Digital scorer
  - All 4 archers
- Digital app marks round as "complete" (ready for verification)
- Scores are synced to database

---

### Phase 5: Verification (Coach/Ref)

```
┌─────────────────────────────────────────────────────┐
│ CRITICAL: ENTIRE BALE GROUP VERIFICATION             │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Bale 1 Group approaches Coach/Ref together          │
│   ├─ Brings physical scorecard                      │
│   └─ Digital scores already in system               │
│                                                      │
│ Coach/Ref Process:                                   │
│   │                                                  │
│   ├─→ Opens Verification Console                    │
│   │    └─→ Selects Event, Division, Bale 1         │
│   │                                                  │
│   ├─→ Views All 4 Scorecards Side-by-Side           │
│   │    ├─ Sarah J: 278/300 (synced ✓)              │
│   │    ├─ Mike C: 268/300 (synced ✓)               │
│   │    ├─ Alex R: 271/300 (synced ✓)               │
│   │    └─ Emma D: 265/300 (synced ✓)               │
│   │                                                  │
│   ├─→ Cross-Checks Physical Card vs Digital         │
│   │    └─→ Confirms all scores match               │
│   │                                                  │
│   ├─→ Verifies All 6 Signatures Present             │
│   │                                                  │
│   └─→ Action: "Lock All on Bale 1"                  │
│        │                                             │
│        └─→ ALL 4 CARDS LOCKED SIMULTANEOUSLY        │
│             ├─ Status: PENDING → VERIFIED           │
│             ├─ locked = 1                           │
│             ├─ verified_by = "Coach Smith"          │
│             ├─ verified_at = timestamp              │
│             └─ Cards become READ-ONLY               │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Database Updates:**
```sql
UPDATE round_archers
SET 
  locked = 1,
  card_status = 'VERIFIED',
  verified_by = 'Coach Smith',
  verified_at = NOW(),
  lock_history = JSON_ARRAY_APPEND(lock_history, '$', JSON_OBJECT(
    'action', 'lock',
    'actor', 'Coach Smith',
    'timestamp', NOW(),
    'notes', 'Bale 1 verified - all signatures present'
  ))
WHERE round_id = ? AND bale_number = 1;
```

**Key Points:**
- **ENTIRE BALE GROUP** verified together (not individually)
- Coach sees all 4 cards at once in verification console
- Physical card must match digital
- All 6 signatures verified
- **ALL 4 CARDS LOCKED** in single action
- Cards become read-only after locking

---

### Phase 6: Event Closure (Coach)

```
All Bales Verified for Event
    │
    ├─→ Bale 1: ✓ VERIFIED (4 cards locked)
    ├─→ Bale 2: ✓ VERIFIED (4 cards locked)
    ├─→ Bale 3: ✓ VERIFIED (4 cards locked)
    └─→ ...
         │
         └─→ Coach Action: "Close Event"
              │
              ├─→ Event status: Active → Completed
              ├─→ Remaining incomplete cards → VOID
              ├─→ NO FURTHER MODIFICATIONS ALLOWED
              └─→ Results finalized
```

**Database Updates:**
```sql
-- Mark event as completed
UPDATE events
SET status = 'Completed', completed_at = NOW()
WHERE id = ?;

-- Void any incomplete cards
UPDATE round_archers
SET card_status = 'VOID', locked = 1
WHERE round_id IN (
  SELECT id FROM rounds WHERE event_id = ?
) AND card_status = 'PENDING';
```

**Key Points:**
- Event closure is **FINAL**
- All verified cards locked permanently
- Incomplete cards automatically voided
- Results page shows only VERIFIED cards
- No modifications possible after closure

---

## 🔍 Visibility & Access

### Archer View (During Event)

```
Archer logs in (own device)
    │
    └─→ Can view:
         ├─ Own scorecard (live updates)
         ├─ Own bale mates' scorecards (same bale)
         └─ Anyone's scorecard (after verification)
```

**Rules:**
- ✅ Can view own scores anytime
- ✅ Can view bale mates' scores anytime
- ✅ Can view anyone's verified scores
- ❌ Cannot edit locked scorecards
- ❌ Cannot edit after event closed

---

### Coach View

```
Coach Console
    │
    ├─→ Event Dashboard
    │    └─→ All events (planned, active, completed)
    │
    ├─→ Live Scores
    │    ├─ Real-time updates during shooting
    │    ├─ Sync status per scorecard
    │    └─ Completion percentage
    │
    ├─→ Verification Console
    │    ├─ Bale-by-bale verification
    │    ├─ Lock individual cards
    │    ├─ Lock all cards on bale
    │    └─ Unlock for corrections (if needed)
    │
    ├─→ Results Page
    │    ├─ Leaderboard (verified cards only)
    │    ├─ Filter by division
    │    ├─ Export results
    │    └─ VER badges for locked cards
    │
    └─→ Event Management
         ├─ Close event (finalize)
         ├─ Reopen if needed
         └─ View audit trail
```

**Key Points:**
- ✅ Coach sees **ALL** scorecards
- ✅ Real-time progress during shooting
- ✅ Verification console for sign-off
- ✅ Results page for awards/placement
- ✅ Full audit trail (lock_history)

---

## 🏆 Results & Awards (Post-Event)

### Results Page Usage

```
Coach Opens Results Page
    │
    ├─→ Filter: Event = "Practice Meet - Nov 17"
    ├─→ Filter: Division = "Boys Varsity"
    │
    └─→ Leaderboard:
         ├─ 1. Sarah J - 278 [VER ✓]
         ├─ 2. Mike C - 268 [VER ✓]
         ├─ 3. Alex R - 271 [VER ✓]
         └─ 4. Emma D - 265 [VER ✓]
              │
              └─→ Decisions Made:
                   ├─ Awards: Top 3 medals
                   ├─ Varsity placement: Sarah promoted
                   ├─ JV placement: Emma assigned JV
                   └─ Tournament selection: Sarah, Mike, Alex selected
```

**Use Cases:**
1. **Hand Out Awards**
   - Top scores in each division
   - X-count leaders
   - Most improved

2. **Determine Winners**
   - Individual champions
   - Team scores (combined)
   - Division winners

3. **Assign Varsity/JV**
   - Performance-based placement
   - Seasonal progression
   - Skill level assessment

4. **Select for Events**
   - Tournament team selection
   - Travel team roster
   - Competition eligibility

**Key Points:**
- Results page shows **VERIFIED** scores only
- VOID cards hidden by default (can filter to show)
- Export functionality for records
- Archived for historical reference

---

## 🔒 Security & Data Integrity

### Lock Mechanism

**Card Lifecycle:**
```
PENDING → VERIFIED → [LOCKED] → (Event Closed)
   ↓          ↓           ↑
 Editable  Editable   Read-Only
            (until locked)
```

**Lock Rules:**
- ✅ Scores can be edited until locked
- ✅ Coach can unlock for corrections (before event closed)
- ❌ Cannot edit locked cards (without unlock)
- ❌ Cannot unlock after event closed
- ❌ Cannot edit after event closed (FINAL)

---

### Audit Trail

Every lock/unlock action recorded:

```json
{
  "lock_history": [
    {
      "action": "lock",
      "actor": "Coach Smith",
      "timestamp": "2025-11-17T16:30:00Z",
      "notes": "Bale 1 verified - all signatures present"
    },
    {
      "action": "unlock",
      "actor": "Coach Smith",
      "timestamp": "2025-11-17T16:35:00Z",
      "notes": "Correction needed - transposed scores"
    },
    {
      "action": "lock",
      "actor": "Coach Smith",
      "timestamp": "2025-11-17T16:37:00Z",
      "notes": "Re-verified after correction"
    }
  ]
}
```

**Key Points:**
- Full audit trail preserved
- Who locked/unlocked
- When actions occurred
- Why (notes field)
- Cannot be deleted or modified

---

## 🚨 Critical Implementation Requirements

### For Ranking Rounds (Current - ✅ IMPLEMENTED)

1. **Database Schema** ✅
   - `round_archers.locked` (TINYINT)
   - `round_archers.card_status` (VARCHAR: PENDING, VERIFIED, VOID)
   - `round_archers.verified_by` (VARCHAR)
   - `round_archers.verified_at` (TIMESTAMP)
   - `round_archers.lock_history` (JSON)
   - `rounds.status` (VARCHAR: Created, In Progress, Completed, Voided)
   - `events.status` (VARCHAR: Planned, Active, Completed)

2. **API Endpoints** ✅
   - `POST /v1/round_archers/{id}/verify` - Lock/unlock individual card
   - `POST /v1/rounds/{id}/verification/bale` - Lock all cards on bale
   - `POST /v1/rounds/{id}/verification/close` - Close round (verify all/void incomplete)

3. **Frontend UI** ✅
   - Coach verification console
   - Bale selector
   - Lock/unlock buttons
   - "Lock All on Bale" button
   - "Close Round" button
   - Lock status indicators
   - Read-only inputs for locked cards

---

### For Solo/Team Matches (Phase 2 - 🚧 TO BE IMPLEMENTED)

**MUST IMPLEMENT SAME PATTERN:**

1. **Database Schema** 🚧
   ```sql
   -- Solo matches
   ALTER TABLE solo_match_ends ADD COLUMN locked TINYINT DEFAULT 0;
   ALTER TABLE solo_match_ends ADD COLUMN card_status VARCHAR(20) DEFAULT 'PENDING';
   ALTER TABLE solo_match_ends ADD COLUMN verified_by VARCHAR(100);
   ALTER TABLE solo_match_ends ADD COLUMN verified_at TIMESTAMP NULL;
   ALTER TABLE solo_match_ends ADD COLUMN lock_history JSON;
   
   ALTER TABLE solo_matches ADD COLUMN status VARCHAR(20) DEFAULT 'In Progress';
   
   -- Team matches (same pattern)
   ALTER TABLE team_match_ends ADD COLUMN locked TINYINT DEFAULT 0;
   -- ... etc
   ```

2. **API Endpoints** 🚧
   - `POST /v1/solo-matches/{id}/verify`
   - `POST /v1/team-matches/{id}/verify`
   - Match-level verification (both competitors verify together)

3. **Frontend UI** 🚧
   - Verification console for matches
   - Lock status display
   - Read-only after locking
   - Coach oversight

**Key Principle:** Solo/Team matches must follow **EXACT SAME** verification workflow as ranking rounds!

---

## 📊 Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│ COMPLETE SCORING WORKFLOW                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 1. SETUP (Coach)                                                 │
│    Event created → Entry code → Bales assigned                  │
│                                                                  │
│ 2. SHOOTING (Bale Group)                                         │
│    ONE digital scorer → Enters ALL archer scores → Syncs live   │
│                                                                  │
│ 3. SIGN-OFF (Bale Group)                                         │
│    6 signatures → Physical card → Digital "complete"            │
│                                                                  │
│ 4. VERIFICATION (Coach/Ref)                                      │
│    Cross-check → Entire bale → Lock all 4 cards → VERIFIED      │
│                                                                  │
│ 5. CLOSURE (Coach)                                               │
│    Close event → Finalize → No more edits → PERMANENT           │
│                                                                  │
│ 6. RESULTS (Coach)                                               │
│    Awards → Winners → Varsity/JV → Event selection              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways for Development

### Critical Design Principles

1. **One Digital Scorer Per Bale**
   - UI must support entering scores for multiple archers
   - Currently working (ranking rounds)
   - Must extend to Solo/Team matches

2. **Bale-Level Verification**
   - Coach verifies ENTIRE bale at once
   - "Lock All on Bale" is primary action
   - Individual lock available but less common

3. **Read-Only After Lock**
   - Locked cards cannot be edited (except by unlock)
   - UI must clearly show locked status
   - Prevent accidental modifications

4. **Event Closure is Final**
   - No modifications after event closed
   - Database constraints enforced
   - Audit trail preserved forever

5. **Coach as Gatekeeper**
   - Coach controls verification process
   - Coach closes events
   - Coach uses results for decisions

---

## 📚 Related Documentation

**Current Implementation:**
- [SPRINT_VERIFY_SCORECARDS.md](SPRINT_VERIFY_SCORECARDS.md) - Verification feature spec
- [LIVE_SCORING_IMPLEMENTATION.md](LIVE_SCORING_IMPLEMENTATION.md) - API endpoints
- [ARCHER_SCORING_WORKFLOW.md](ARCHER_SCORING_WORKFLOW.md) - Archer perspective

**Tournament Structure:**
- [OAS_RULES.md](OAS_RULES.md) - Tournament rules, bracket formats (Top 8, elimination rounds), point systems

**Future Implementation:**
- [APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md](APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md) - Phase 2 Solo/Team
- [FUTURE_VISION_AND_ROADMAP.md](FUTURE_VISION_AND_ROADMAP.md) - Long-term vision

**This Document:**
- Master reference for complete scoring workflow
- Critical for all future development
- Reference during Phase 2 Solo/Team integration

---

**Document Owner:** Development Team  
**Last Updated:** November 17, 2025  
**Review Cadence:** Before any changes to scoring, verification, or locking features

**This workflow is CRITICAL to the platform. All features must respect this process.**

