# OAS Ranking Online 3.0 - Requirements Document

**Branch:** `OAS-Ranking-Online-3.0`  
**Date Created:** October 28, 2025  
**Base Version:** v2.0-ranking-round  
**Status:** Planning / Requirements Gathering

---

## Executive Summary

OAS Ranking Online 3.0 represents a fundamental shift to an **online-first, database-driven architecture** while maintaining the speed and simplicity that made v2.0 successful. The goal is to create a unified system where archers and coaches have seamless access to scorecards, historical data, and real-time results.

---

## User Stories & Requirements

### 👨‍🏫 As a Coach

#### Master Roster Management
- **Create a "Master Roster" of Archers**
  - Add archers with: First Name, Last Name, School, Level (VAR/JV), Gender, External ID
  - Import archers from CSV
  - Edit archer details
  - Deactivate/archive archers (soft delete)
  - View archer history and performance trends

#### Event Management
- **Create "Events"** (e.g., "Tryout One", "League Match 1")
  - Set event name, date, location
  - Set event type: Practice, Tryout, Competition
  - Generate entry code for archer access
  - Set event status: Planned → Active → Completed

#### Event Round Management
- **Create "Event Rounds"** (e.g., "Boys JV Ranking", "Girls Varsity 300")
  - Define round type: R300, R360, etc.
  - Auto-assign archers by division (BVAR, GVAR, BJV, GJV)
  - Assign bale numbers and target letters (A, B, C, D)
  - Configure round settings (number of ends, arrows per end)

#### Event Roster Management
- **Create "Event Roster" from "Master Roster"**
  - Select archers from master roster
  - Bulk add by division/level
  - Assign to specific rounds
  - Override archer details for specific event (e.g., competing up a level)

#### Live Results & Leaderboard
- **View summary leaderboard style "Results" in real-time or historical**
  - Live updating leaderboard during active events
  - Filter by division, gender, level
  - Sort by score, average, Xs, 10s
  - Export results to PDF/CSV
  - Historical results comparison

#### Scorecard Review
- **View ALL Archer Score Cards (live or historical)**
  - Individual archer scorecard view
  - End-by-end breakdown
  - Running totals, averages, performance metrics
  - Filter by event, date, division
  - Search by archer name

#### In-Person Verification
- **"Verify" Digital Archer Score Cards with Archers (live and in person)**
  - Display scorecard for archer to review
  - Digital signature or confirmation
  - Mark as "Verified" with timestamp
  - Flag discrepancies for review
  - Print verified scorecard

---

### 🏹 As an Archer

#### Online-First Experience
- **Access from any device (phone, tablet, computer)**
  - Responsive design that works on all screen sizes
  - Fast loading even on slow connections
  - Works offline with sync when connection restored
  - No app installation required (PWA)

#### Active Scorecard Management
- **Produce an "Archer Score Card" for each Archer Round**
  - Automatically generated when assigned to a round
  - Pre-populated with archer details and assignment (bale, target)
  - Clean, printable format
  - QR code for quick access

#### Progressive Scorecard Display
- **Reproduce the "Archer Score Card" as it progresses**
  - Live updates as scores are entered
  - Visual feedback on performance (color-coded scores)
  - Running totals update automatically
  - End-by-end averages
  - Comparison to personal best / division average

#### Bale Group Management
- **Ability to Manage a "Bale Group" of Archer Score Cards**
  - Enter scores for all archers on my bale (A, B, C, D)
  - Navigate between bale mates easily
  - See bale group summary
  - Support for different target assignments
  - Handle archers joining/leaving mid-round

#### Historical Scorecards
- **View ALL MY Archer Score Cards (live or historical)**
  - Personal scorecard history
  - Performance trends over time
  - Filter by event, date, round type
  - Compare scorecards side-by-side
  - Export personal history

---

## Current System Analysis (v2.0)

### ✅ PROS

#### Round Entry Approach
- **Easy to understand**
  - Familiar spreadsheet-like layout
  - Clear visual hierarchy (archer rows, arrow columns)
  - Intuitive navigation (Last End / Next End)
  - Color-coded scores (Gold=X/10, Red=7-9, Blue=5-6, Black=1-4, White=M)

#### Local Storage Performance
- **Fast and responsive**
  - Instant score entry (no network delay)
  - Works completely offline
  - State persistence across page reloads
  - No loading spinners for most operations

#### Keypad Interface (Screenshot 2)
- **Mobile-optimized input**
  - Large, touch-friendly buttons
  - Score-specific colors match target face
  - Navigation arrows (← →) for moving between inputs
  - Clear (CLR) and Close functions
  - Common scores (X, 10, 9, 8, 7, 6) prioritized in layout
  - No need for keyboard on mobile devices

#### Current Data Model
- **Simple and flexible**
  - JSON-based state in localStorage
  - Easy to debug in browser console
  - Self-contained sessions (per date)
  - Event-scoped caching

---

### ❌ CONS

#### Limited Historical Access
- **No persistent scorecard history**
  - Scorecards lost if localStorage cleared
  - No access from different devices
  - Can't view past events easily
  - No performance trend analysis

#### Coach Visibility Gaps
- **Limited real-time oversight**
  - Can't see which archers are actively scoring
  - Hard to identify archers who need assistance
  - No way to verify scores until after the fact
  - Results page requires manual refresh

#### Data Integrity Issues
- **No single source of truth**
  - Each phone has independent state
  - Sync conflicts possible with multiple scorers
  - Manual sync required (Sync End button)
  - Duplicate archers if not careful

#### Archer Identity Management
- **Weak archer linkage**
  - Archers identified by name strings (e.g., "Leo H.")
  - No unique archer ID visible to user
  - Hard to disambiguate archers with same name
  - Manual entry prone to typos

#### Limited Roster Management
- **No master archer database UI**
  - Archers must be re-entered for each event
  - No central place to manage archer info
  - Import process is manual (CSV to database directly)
  - Can't easily update archer level/school across events

#### Session Isolation
- **Bale-centric model limits flexibility**
  - Each bale is a separate session
  - Hard to move archers between bales mid-event
  - Can't easily combine/split bale groups
  - No event-wide coordination

#### Verification Workflow
- **No formal scorecard verification**
  - Archers can't review their own scorecards easily
  - No digital signature/confirmation
  - Paper scorecards still needed for official records
  - No audit trail for changes

#### Mobile UX Challenges
- **Small screen real estate**
  - Scorecard view cramped on phones (Screenshot 1)
  - Need to scroll horizontally to see all columns
  - Card view (Screenshot 2) only shows 4 archers at once
  - Navigation between archers requires tapping

---

## Proposed Architecture for v3.0

### Database-First Design
- **Master archer table as single source of truth**
  - ✅ Already implemented in v2.0
  - Extend with additional fields (photo, contact info, emergency contact)
  - Soft delete for historical integrity

### API-Driven Workflow
- **All operations via REST API**
  - Create/Read/Update/Delete for archers, events, rounds, scorecards
  - Real-time sync via polling or WebSockets
  - Optimistic UI updates with rollback on error
  - Background sync for offline changes

### Progressive Web App (PWA)
- **Install as app on home screen**
  - Offline capability with Service Workers
  - Push notifications for event updates
  - Background sync when connection restored
  - App-like experience without app store

### Hybrid Storage Strategy
- **Best of both worlds**
  - Critical data persisted to server (source of truth)
  - Local cache for instant UI response
  - Offline queue for pending changes
  - Smart sync on reconnection

---

## Key Design Decisions to Make

### 1. Scorecard Ownership Model
**Question:** Who "owns" the scorecard for entering scores?

**Option A: Archer-owned (current model)**
- Each archer manages their own bale group
- Pro: Distributed scoring, less coach burden
- Con: Requires all archers to have devices

**Option B: Scorer-owned**
- Designated scorer(s) for each bale/range
- Pro: Fewer devices needed, more control
- Con: Bottleneck if scorer is slow/absent

**Option C: Hybrid**
- Default to archer-owned
- Coach can override and assign scorers
- Pro: Flexibility for different event types
- Con: More complex permissions model

**Recommendation:** Option C - Hybrid model with archer-owned as default

---

### 2. Score Entry Interface

**Question:** Should we keep the current keypad UI or explore alternatives?

**Current Keypad Strengths:**
- Mobile-optimized
- Color-coded
- Fast input
- No keyboard required

**Possible Enhancements:**
- Voice input ("X, 9, 7")
- Camera OCR for paper scorecards
- Apple Pencil support for iPad
- Gesture-based input (swipe for common scores)

**Recommendation:** Keep current keypad as primary input, add voice as optional enhancement in future release

---

### 3. Real-Time vs. Polling

**Question:** How should live updates work?

**Option A: Polling**
- Client requests updates every N seconds
- Pro: Simple, works with any server
- Con: Higher latency, unnecessary requests

**Option B: WebSockets**
- Persistent connection for real-time updates
- Pro: Instant updates, efficient
- Con: More complex server setup, firewall issues

**Option C: Server-Sent Events (SSE)**
- One-way server push
- Pro: Simpler than WebSockets, reliable
- Con: Still requires long-lived connections

**Recommendation:** Start with smart polling (5-10 seconds during active scoring), evaluate WebSockets in v3.1

---

### 4. Offline Capabilities

**Question:** What should work offline?

**Must Work Offline:**
- ✅ Score entry
- ✅ View current scorecard
- ✅ Navigate between ends
- View personal history

**Can Require Online:**
- Event creation (coach)
- Roster management (coach)
- Verification workflow
- Live leaderboard

**Sync Strategy:**
- Queue all changes in localStorage
- Sync on reconnection
- Conflict resolution (last write wins? manual merge?)

---

### 5. Mobile-First vs. Responsive

**Question:** Should we optimize for mobile or desktop?

**Current Reality:**
- Archers use phones 90% of the time
- Coaches split between tablets and laptops
- Results often displayed on large screens

**Recommendation:**
- **Mobile-first for archer interfaces** (score entry, personal scorecards)
- **Desktop-optimized for coach interfaces** (roster management, event setup)
- **Large-screen optimized for results/leaderboards** (projector-friendly)

---

## Technical Implementation Plan

### ⚠️ UI Preservation Notice

**Critical:** The current keypad and scorecard UI has been extensively optimized for low-end iPhones and Android devices, especially Safari on iPhone. Phase 0 and early phases **MUST NOT** modify:
- Keypad layout, sizing, or touch targets
- Scorecard table layout
- Score input focus/blur behavior
- Color-coding system
- Mobile viewport handling

All Phase 0 work is **backend/API only** - no UI changes.

---

### Phase 0: Backend Foundation (v3.0 Foundation) 🏗️

**Goal:** Clean up the data model and API without touching the UI. Make the current app work better with a proper backend structure.

**Duration:** 1-2 weeks  
**Status:** Planning

**Key Constraints:**
- ✅ No data migration - start fresh
- ✅ Bale groups: 1-8 archers (flexible, default 4)
- ✅ Cookie-based archer identification (not device fingerprint)
- ✅ No new tables - use existing `round_archers` correctly
- ✅ Default division: "Mixed Open" (all levels together for practices)

#### 0.1: Event & Round Structure

**Problem:** Events exist, but division rounds (Boys JV, Boys V, Girls JV, Girls V) are not formally defined.

**Current State (v2.0):**
```
events table:
- id, name, date, status, event_type, entry_code

rounds table:
- id, round_type, date, bale_number, division, gender, level, event_id

Issue: Rounds are created ad-hoc per bale. No formal "division rounds" for the event.
```

**Desired State (v3.0):**
```
Clear hierarchy:

Event "Tryout One" (2025-10-28)
├── Division Round: Boys Varsity (BVAR)
│   ├── Bale 1 Group (1-8 archers with target assignments)
│   ├── Bale 2 Group (1-8 archers)
│   └── Bale 3 Group (1-8 archers)
├── Division Round: Girls Varsity (GVAR)
│   ├── Bale 4 Group (1-8 archers)
│   └── Bale 5 Group (1-8 archers)
└── Division Round: Boys JV (BJV)
    ├── Bale 6 Group (1-8 archers)
    └── Bale 7 Group (1-8 archers)

Event "Tuesday Practice" (2025-10-29)
└── Division Round: Mixed Open (DEFAULT)
    ├── Bale 1 Group (1-8 archers, all levels together)
    ├── Bale 2 Group (1-8 archers, all levels together)
    └── Bale 3 Group (1-8 archers, all levels together)
```

**Note:** "Mixed Open" is the default division for practices where all archers (VAR, JV, M, F) shoot together.

**Implementation:**

**Step 1: Simplify Division Handling**
```sql
-- Existing rounds table already has:
-- - event_id (links to event)
-- - division (e.g., "BVAR", "GJV", "Mixed Open")
-- - bale_number (1-N, identifies the bale group)

-- No new columns needed! Just use existing schema correctly.

-- Division values:
-- - "BVAR" (Boys Varsity)
-- - "GVAR" (Girls Varsity)
-- - "BJV" (Boys JV)
-- - "GJV" (Girls JV)
-- - "Mixed Open" (DEFAULT - all levels together for practices)
```

**Step 2: Use round_archers Correctly for Bale Groups**
```sql
-- Existing round_archers table already has:
-- - round_id (links to the division round)
-- - archer_id (links to master archer)
-- - bale_number (which bale they're on: 1-N)
-- - target_assignment (position within bale: "A", "B", "C", etc., or NULL)

-- Key insight: A "Bale Group" is simply:
--   All round_archers WHERE round_id = X AND bale_number = Y

-- Query to get Bale 3 Group for a round:
SELECT ra.*, a.first_name, a.last_name
FROM round_archers ra
JOIN archers a ON a.id = ra.archer_id
WHERE ra.round_id = 'uuid-of-boys-jv-round'
  AND ra.bale_number = 3
ORDER BY ra.target_assignment;

-- Result: 1-8 archers on Bale 3
```

**Step 3: API Endpoints (Simplified)**

```
POST /v1/events/{eventId}/rounds
Body: {
  "division": "Mixed Open",  // Or "BVAR", "GJV", etc.
  "roundType": "R300",
  "date": "2025-10-29"
}
Response: {
  "roundId": "uuid",
  "division": "Mixed Open",
  "roundType": "R300",
  "date": "2025-10-29"
}

GET /v1/events/{eventId}/rounds
Response: {
  "rounds": [
    {
      "roundId": "uuid-1",
      "division": "Mixed Open",
      "archerCount": 12,
      "baleGroups": [
        { "baleNumber": 1, "archerCount": 4, "currentEnd": 5 },
        { "baleNumber": 2, "archerCount": 3, "currentEnd": 2 },
        { "baleNumber": 3, "archerCount": 5, "currentEnd": 1 }
      ]
    }
  ]
}

GET /v1/rounds/{roundId}/bales/{baleNumber}/archers
Response: {
  "roundId": "uuid",
  "division": "Mixed Open",
  "baleNumber": 3,
  "archers": [
    {
      "roundArcherId": "uuid-ra-1",
      "archerId": "uuid-a-1",
      "firstName": "Leo",
      "lastName": "Hernandez",
      "targetAssignment": "A",
      "currentEnd": 5,
      "runningTotal": 142
    },
    // ... up to 8 archers
  ]
}
```

**Success Criteria:**
- ✅ Coach can create division rounds for an event
- ✅ Division rounds visible in coach console
- ✅ Bale groups automatically allocated per division
- ✅ Current UI continues to work (backwards compatible)

---

#### 0.2: Bale Group & Scorecard Retrieval

**Problem:** Hard to create and retrieve "Bale Group" and "Archer Score Cards" from `round_archers` table.

**Current Issues:**
- `round_archers` has duplicates (same archer, multiple entries)
- No formal "bale group" concept - just individual round_archer records
- Hard to query "all archers on Bale 3"
- Session persistence issues (archer loses connection to their scorecards)

**Solution: Use Existing Schema Correctly + Cookies**

**Step 1: Archer Identification via Cookie**
```javascript
// Client-side: Generate or retrieve archer cookie
function getArcherCookie() {
  let archerId = getCookie('oas_archer_id');
  if (!archerId) {
    // First time user - generate UUID
    archerId = generateUUID();
    setCookie('oas_archer_id', archerId, 365); // 1 year expiry
  }
  return archerId;
}

// When creating round_archers, use the cookie value as archer_id
// This persists across sessions and page reloads
```

**Step 2: Session Persistence via localStorage + Cookie**
```javascript
// Store current bale session in localStorage
const session = {
  eventId: 'uuid',
  roundId: 'uuid',
  baleNumber: 3,
  archerId: getArcherCookie(),
  currentEnd: 5,
  lastSync: Date.now()
};
localStorage.setItem('current_bale_session', JSON.stringify(session));

// On page load, restore session:
function restoreSession() {
  const session = JSON.parse(localStorage.getItem('current_bale_session') || '{}');
  if (session.roundId && session.baleNumber) {
    // Call API to get bale group archers and their scorecards
    return fetch(`/v1/rounds/${session.roundId}/bales/${session.baleNumber}/archers`)
      .then(r => r.json());
  }
  return null;
}
```

**Step 3: Querying Bale Groups (No New Tables)**
```sql
-- Get all archers on Bale 3 for a round:
SELECT 
  ra.id as roundArcherId,
  ra.archer_id as archerId,
  a.first_name,
  a.last_name,
  ra.target_assignment,
  ra.bale_number,
  (SELECT MAX(running_total) FROM end_events WHERE round_archer_id = ra.id) as currentTotal,
  (SELECT MAX(end_number) FROM end_events WHERE round_archer_id = ra.id) as currentEnd
FROM round_archers ra
JOIN archers a ON a.id = ra.archer_id
WHERE ra.round_id = ?
  AND ra.bale_number = ?
ORDER BY ra.target_assignment;

-- This returns 1-8 archers on the specified bale with their current scores
```

**Step 3: API Endpoints for Bale Groups (Simplified)**

```
POST /v1/rounds/{roundId}/archers/bulk
Body: {
  "baleNumber": 3,
  "archers": [
    { "archerId": "cookie-uuid-1", "firstName": "Leo", "lastName": "Hernandez", "targetAssignment": "A" },
    { "archerId": "cookie-uuid-2", "firstName": "Ryder", "lastName": "Singer", "targetAssignment": "B" },
    // ... 1-8 archers
  ]
}
Response: {
  "roundId": "uuid",
  "baleNumber": 3,
  "archersCreated": 3,
  "roundArcherIds": ["uuid-ra-1", "uuid-ra-2", "uuid-ra-3"]
}

GET /v1/rounds/{roundId}/bales/{baleNumber}/archers
Response: {
  "roundId": "uuid",
  "baleNumber": 3,
  "archers": [
    {
      "roundArcherId": "uuid-ra-1",
      "archerId": "cookie-uuid-1",
      "firstName": "Leo",
      "lastName": "Hernandez",
      "targetAssignment": "A",
      "scorecard": {
        "ends": [
          { "endNumber": 1, "a1": "X", "a2": "7", "a3": "X", "endTotal": 27, "runningTotal": 27 },
          { "endNumber": 2, "a1": "10", "a2": "7", "a3": "6", "endTotal": 23, "runningTotal": 50 },
          // ... all ends
        ],
        "currentEnd": 5,
        "runningTotal": 142,
        "tens": 3,
        "xs": 8
      }
    },
    // ... other archers on this bale (1-8 total)
  ]
}

GET /v1/archers/{cookieArcherId}/current-session
Response: {
  "eventId": "uuid",
  "roundId": "uuid",
  "baleNumber": 3,
  "roundArcherId": "uuid-ra-1",
  "currentEnd": 5,
  // Quick way to restore session from cookie
}
```

**Step 4: Client-Side Changes (Minimal)**

```javascript
// In ranking_round_300.js - ONLY these changes:

// Helper: Get or create archer cookie
function getArcherCookie() {
  let archerId = getCookie('oas_archer_id');
  if (!archerId) {
    archerId = generateUUID();
    setCookie('oas_archer_id', archerId, 365);
  }
  return archerId;
}

// After archer selection, create bale group:
async function startScoring() {
  const archerId = getArcherCookie();
  
  // Create round_archers entries for all archers on this bale
  await fetch(`/v1/rounds/${state.roundId}/archers/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Passcode': state.entryCode },
    body: JSON.stringify({
      baleNumber: state.baleNumber,
      archers: state.archers.map(a => ({
        archerId: a.id, // From master archers table
        firstName: a.firstName,
        lastName: a.lastName,
        targetAssignment: a.targetAssignment
      }))
    })
  }).then(r => r.json());
  
  // Save session to localStorage
  const session = {
    eventId: state.activeEventId,
    roundId: state.roundId,
    baleNumber: state.baleNumber,
    archerId: archerId,
    currentEnd: 1
  };
  localStorage.setItem('current_bale_session', JSON.stringify(session));
  
  showScoringView();
}

// On page load, attempt restore:
async function init() {
  // ... existing init code ...
  
  const session = JSON.parse(localStorage.getItem('current_bale_session') || '{}');
  if (session.roundId && session.baleNumber) {
    try {
      // Restore bale group from server
      const baleGroup = await fetch(`/v1/rounds/${session.roundId}/bales/${session.baleNumber}/archers`, {
        headers: { 'X-Passcode': getEventEntryCode() }
      }).then(r => r.json());
      
      if (baleGroup.archers && baleGroup.archers.length > 0) {
        // Show: "Resuming Bale 3, End 5..."
        state.roundId = session.roundId;
        state.baleNumber = session.baleNumber;
        state.currentEnd = baleGroup.archers[0].scorecard.currentEnd || 1;
        state.archers = baleGroup.archers.map(a => ({
          id: a.archerId,
          roundArcherId: a.roundArcherId,
          firstName: a.firstName,
          lastName: a.lastName,
          targetAssignment: a.targetAssignment,
          scores: reconstructScoresFromEnds(a.scorecard.ends)
        }));
        
        state.currentView = 'scoring';
        renderView();
        return; // Skip normal setup
      }
    } catch (e) {
      console.warn('Could not restore session:', e);
      // Continue with normal setup
    }
  }
  
  // ... existing setup flow ...
}
```

**Success Criteria:**
- ✅ Archer identified by persistent cookie (not device fingerprint)
- ✅ Bale groups support 1-8 archers (not fixed at 4)
- ✅ Session persists across page reloads via localStorage + cookie
- ✅ Clear "Bale Group" concept using existing round_archers table
- ✅ Easy to query all archers on a bale (no new tables needed)
- ✅ No duplicate round_archers entries
- ✅ Session automatically restores with all scores
- ✅ **NO changes to keypad or scorecard UI**
- ✅ **NO data migration required** (start fresh)

---

#### 0.3: Clean Data Hierarchy

**Problem:** Unclear relationship between Events → Rounds → BaleGroups → Archers → Ends

**Implementation:**

**Database Schema Documentation (Simplified - No New Tables):**
```
┌─────────────────────────────────────────────────────────────┐
│                         EVENTS                              │
│  (Tryout One, Tuesday Practice, etc.)                       │
│  - id, name, date, entry_code                               │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Has many rounds (one per division)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                         ROUNDS                              │
│  (Division-specific: BVAR, GJV, or "Mixed Open")            │
│  - id, event_id, division, round_type, date                 │
│  - "Mixed Open" = DEFAULT (all levels together)             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Contains many round_archers (grouped by bale_number)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                     ROUND_ARCHERS                           │
│  (Individual archer scorecards)                             │
│  - id, round_id, archer_id, bale_number, target_assignment  │
│  - "Bale Group" = all entries with same round_id + bale_number │
│  - Supports 1-8 archers per bale                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Has many end scores
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                      END_EVENTS                             │
│  (End 1: X,7,X = 27, etc.)                                  │
│  - id, round_archer_id, end_number, a1, a2, a3, end_total   │
└─────────────────────────────────────────────────────────────┘

CLIENT-SIDE (No database table):
┌─────────────────────────────────────────────────────────────┐
│                    ARCHER COOKIE                            │
│  - Name: "oas_archer_id"                                    │
│  - Value: UUID (persistent across sessions)                 │
│  - Used to identify archer and restore sessions             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               localStorage: current_bale_session            │
│  - { eventId, roundId, baleNumber, archerId, currentEnd }   │
│  - Used to restore session on page reload                   │
└─────────────────────────────────────────────────────────────┘
```

**SQL Migration Script (Simplified - No New Tables):**
```sql
-- File: api/sql/migration_v3.0_phase0.sql

-- NO NEW TABLES NEEDED!
-- Existing schema already supports everything we need.

-- Just ensure division column can handle "Mixed Open":
ALTER TABLE rounds MODIFY COLUMN division VARCHAR(50);

-- Add index for faster bale group queries:
CREATE INDEX IF NOT EXISTS idx_round_bale 
  ON round_archers(round_id, bale_number);

-- Add index for archer cookie lookups:
CREATE INDEX IF NOT EXISTS idx_archer_cookie
  ON archers(ext_id);  -- ext_id stores cookie value

-- Optional: Add constraint to prevent duplicate archers on same bale
-- (Commented out for flexibility - may want same archer on multiple bales for practice)
-- ALTER TABLE round_archers 
--   ADD UNIQUE KEY unique_archer_bale (round_id, archer_id, bale_number);

-- That's it! No data migration, no new tables.
```

**Success Criteria:**
- ✅ Clear database schema with no ambiguity (using existing tables)
- ✅ Foreign keys enforce referential integrity
- ✅ No duplicate round_archers entries per bale
- ✅ Easy to trace: Event → Round (division) → Bale Group (round_archers) → Ends
- ✅ Support for "Mixed Open" default division (all levels together)
- ✅ Bale groups support 1-8 archers flexibly
- ✅ **No new tables or complex migrations**

---

#### 0.4: API Endpoint Summary (Phase 0 - Simplified)

**New Endpoints:**

```
Rounds:
  POST   /v1/events/{eventId}/rounds
    - Create round with division ("Mixed Open" as default)
  
  GET    /v1/events/{eventId}/rounds
    - List all rounds for event with bale group summaries

Bale Groups:
  POST   /v1/rounds/{roundId}/archers/bulk
    - Create 1-8 round_archers for a bale group at once
  
  GET    /v1/rounds/{roundId}/bales/{baleNumber}/archers
    - Get all archers on a bale with their scorecards

Archer Sessions:
  GET    /v1/archers/{cookieArcherId}/current-session
    - Quick session restore from archer cookie
```

**Existing Endpoints (No Changes):**
```
POST /v1/rounds/{roundId}/archers/{roundArcherId}/ends
  - Continue to work as-is (score entry)

GET /v1/events/{eventId}/snapshot
  - Continue to work (leaderboard/results)
```

---

#### 0.5: Testing Strategy (Phase 0)

**Unit Tests:**
- [ ] Division round creation
- [ ] Bale session creation/restoration
- [ ] Round_archer deduplication
- [ ] Scorecard retrieval with all ends

**Integration Tests:**
- [ ] Full flow: Create event → Create divisions → Create bale session → Add archers → Enter scores
- [ ] Session restore after "page reload" (clear session, restore by ID)
- [ ] Multiple devices scoring different bales (no conflicts)

**Backwards Compatibility:**
- [x] v2.0 client can still create rounds (same schema, same API)
- [x] No data migration needed (start fresh)
- [ ] Results page shows v3.0 data correctly (minor updates for "Mixed Open")

---

### Phase 1: Foundation (v3.0 Alpha)
- [ ] Master Roster UI (coach console)
  - List all archers with search/filter
  - Add/Edit/Deactivate archer
  - Import CSV
  - View archer history (link to existing archer_history.html)

- [ ] Event Management UI (coach console)
  - Create event with metadata
  - Generate entry code
  - Set status (Planned/Active/Completed)
  - List events with filters

- [ ] Event Roster Builder (coach console)
  - Select archers from master roster
  - Bulk add by division
  - Assign to rounds
  - Preview round assignments

### Phase 2: Enhanced Scoring (v3.0 Beta)
- [ ] Archer Scorecard Viewer
  - Personal scorecard history page
  - Filter by event/date
  - Compare scorecards
  - Export PDF

- [ ] Enhanced Results Page
  - Real-time leaderboard (polling-based)
  - Division filters
  - Sort by various metrics
  - Export results

- [ ] Verification Workflow
  - Coach-facing verification UI
  - Archer confirmation interface
  - Digital signature capture
  - Print verified scorecard

### Phase 3: Polish & Performance (v3.0 Release)
- [ ] PWA Features
  - Service worker for offline
  - Install prompts
  - Push notifications

- [ ] Performance Optimizations
  - Smart caching strategies
  - Lazy loading for large rosters
  - Optimize API queries

- [ ] Documentation
  - User guides (coach & archer)
  - Video tutorials
  - Troubleshooting guide

---

## Critical UX Pain Points (Must Fix in v3.0)

### 🔴 Priority 1: Session Persistence & Recovery

**Problem:** Archers reload the page or lose their status and become disconnected from their bale group and scorecards.

**User Impact:**
- Archer opens app, selects event via QR code ✅
- Goes to "Select Archers" for manual bale assignment ✅
- As they open/close the app, their link to scorecards becomes broken ❌
- Must re-select archers, losing any progress ❌
- Frustration leads to paper scorecards ❌

**Root Causes (v2.0):**
- Session state stored in memory and localStorage only
- No persistent server-side "session" linking archer → bale → scorecards
- Round/archer IDs not properly restored after reload
- No visual confirmation of "connected" status

**Proposed Solutions for v3.0:**

#### Solution 1A: Persistent Bale Session
```
When archer selects their bale group:
1. Server creates a "BaleSession" record
   - Links: Archer (scorer) → Event → Bale Number → Scorecard IDs
   - Stores: Device ID, last active timestamp
   
2. Client stores in localStorage:
   - Session ID (UUID)
   - Bale number
   - Scorecard IDs
   
3. On app open/reload:
   - Client checks for session ID in localStorage
   - Calls GET /sessions/{sessionId} to restore
   - Server returns: event, bale, scorecards, current end
   - UI shows "Reconnected to Bale 3, End 5" confirmation
```

#### Solution 1B: Visual Connection Status
```
Persistent connection indicator at top of screen:
┌─────────────────────────────────────┐
│ 🟢 Bale 3 | End 5 | Synced 12:34 PM │
└─────────────────────────────────────┘

States:
🟢 Green: Connected and synced
🟡 Yellow: Connected but pending sync (offline queue)
🔴 Red: Disconnected (click to reconnect)
⚪ Gray: Not in a session
```

#### Solution 1C: Automatic Recovery
```
On page load:
1. Check for localStorage session
2. If found, show loading screen: "Restoring session..."
3. Call API to validate session is still active
4. If valid: Load scorecards, skip setup, go to scoring view
5. If invalid: Show clear message: "Session expired. Please select your bale again."
6. Provide "Resume" button vs. "Start New" button
```

**Success Criteria:**
- ✅ 95% of page reloads successfully restore session
- ✅ Clear visual feedback on connection status
- ✅ Zero data loss when reloading
- ✅ < 2 seconds to restore session

---

### 🔴 Priority 2: Bale Selection UX

**Problem:** The bale selection UI (small number input) is not user-friendly. Hard to identify which bale you're on.

**Current Implementation:**
```
Setup view has:
Bale Number: [3] ← Small input field, easy to miss
```

**User Impact:**
- Archers enter wrong bale number by accident
- Scores go to wrong bale group
- Hard to see which bale you're on once scoring starts
- No visual confirmation of bale selection

**Proposed Solutions for v3.0:**

#### Solution 2A: Large Bale Selector (Mobile-First)
```
After QR code scan, show full-screen bale selector:

┌────────────────────────────────────┐
│     Which bale are you on?         │
├────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐     │
│  │  1   │  │  2   │  │  3   │     │
│  └──────┘  └──────┘  └──────┘     │
│  ┌──────┐  ┌──────┐  ┌──────┐     │
│  │  4   │  │  5   │  │  6   │     │
│  └──────┘  └──────┘  └──────┘     │
│  ┌──────┐  ┌──────┐               │
│  │  7   │  │  8   │               │
│  └──────┘  └──────┘               │
└────────────────────────────────────┘

Each button:
- 100px × 100px (large touch target)
- Shows bale number in 48pt font
- Highlights on tap
- Shows number of archers on that bale (if known)
```

#### Solution 2B: Persistent Bale Indicator
```
Always visible at top of every screen:

┌─────────────────────────────────────┐
│  🎯 BALE 3  |  End 5 of 10          │
└─────────────────────────────────────┘

Styling:
- Large, bold text (24pt)
- High contrast colors
- Sticky header (always visible)
- Tap to see bale details
```

#### Solution 2C: Confirmation Screen
```
After bale selection, show confirmation:

┌────────────────────────────────────┐
│   You selected: BALE 3             │
│                                    │
│   Archers on this bale:            │
│   • Leo H. (Target A)              │
│   • Ryder S. (Target B)            │
│   • Eric S. (Target C)             │
│   • Amelia B. (Target D)           │
│                                    │
│   [✓ Correct]    [← Change Bale]   │
└────────────────────────────────────┘
```

**Success Criteria:**
- ✅ Zero wrong bale selections
- ✅ Bale number always visible during scoring
- ✅ < 3 seconds to select bale

---

### 🔴 Priority 3: Bale Group Setup Process

**Problem:** Process to identify who you're shooting with is clunky. Manual archer selection is tedious.

**Current Implementation:**
- Search box with text input
- Small checkboxes for selection
- No visual grouping
- Hard to see who's already selected

**Proposed Solutions for v3.0:**

#### Solution 3A: Smart Archer Assignment
```
Two modes:

MODE 1: Pre-Assigned (Coach sets up)
- Archer scans QR code
- App shows: "You are on Bale 3, Target A"
- Shows other archers on your bale automatically
- No selection needed
- One tap to "Start Scoring"

MODE 2: Self-Select (Manual)
- Large bale selector (per Solution 2A)
- After bale selected, show: "Who's on Bale 3 with you?"
- Large archer cards (not small list):
  
  ┌─────────────────────┐
  │ Leo Hernandez       │
  │ T School | JV | M   │  ← Tap to add
  └─────────────────────┘
  
  ┌─────────────────────┐
  │ ✓ Ryder Singer      │  ← Already selected
  │ T School | JV | M   │
  └─────────────────────┘

- Auto-assign targets (A, B, C, D) as archers are added
- Show live preview of bale group
```

#### Solution 3B: Recent Archers Quick Add
```
Show "Frequently shoot with:" section:

┌────────────────────────────────────┐
│  Quick Add (from recent events):   │
│  [+ Leo H.]  [+ Ryder S.]          │
│  [+ Eric S.] [+ Amelia B.]         │
└────────────────────────────────────┘

- One tap to add archer to bale
- Pre-filled with archers from same division
- Learns from past events
```

#### Solution 3C: Bale Group Overview
```
After archers selected, show:

┌────────────────────────────────────┐
│       BALE 3 - Ready to Score      │
├────────────────────────────────────┤
│  Target A: Leo Hernandez           │
│  Target B: Ryder Singer            │
│  Target C: Eric Salas              │
│  Target D: Amelia Beall            │
├────────────────────────────────────┤
│  [✓ Start Scoring]                 │
│  [+ Add Archer]  [← Change Bale]   │
└────────────────────────────────────┘
```

**Success Criteria:**
- ✅ < 30 seconds to set up 4-archer bale group
- ✅ Clear visual confirmation of bale group
- ✅ Easy to add/remove archers

---

### 🔴 Priority 4: End Tracking Clarity

**Problem:** Confusing to know which end you're on.

**Current Implementation:**
- Small text: "End 2 of 10" in header
- Easy to lose track during round
- No visual progress indicator

**Proposed Solutions for v3.0:**

#### Solution 4A: Prominent End Indicator
```
Large, always-visible end indicator:

┌─────────────────────────────────────┐
│  🎯 BALE 3  |  📍 END 5 of 10       │
│  ▓▓▓▓▓░░░░░                         │ ← Progress bar
└─────────────────────────────────────┘

Styling:
- Large font (24pt)
- Progress bar shows completion
- Different color per end (cycle colors)
```

#### Solution 4B: End Navigation Preview
```
Show previous/current/next ends:

┌────────────────────────────────────┐
│  [End 4]    END 5    [End 6]       │
│   ✓Done   ⬤ NOW     ○ Next        │
└────────────────────────────────────┘

Visual cues:
✓ = Completed and synced
⬤ = Current end
○ = Not started
```

#### Solution 4C: End Completion Confirmation
```
After last archer scores, show:

┌────────────────────────────────────┐
│   End 5 Complete! 🎯               │
│                                    │
│   Bale 3 Scores:                   │
│   • Leo H.: 27 (X, 7, X)           │
│   • Ryder S.: 21 (7, X, 4)         │
│   • Eric S.: 16 (8, 4, 4)          │
│   • Amelia B.: 20 (8, 4, 8)        │
│                                    │
│   [Sync End ⬆️]  [Next End →]      │
└────────────────────────────────────┘
```

**Success Criteria:**
- ✅ Always know which end you're on
- ✅ Clear visual progress through round
- ✅ Confirmation when end is complete

---

### 🔴 Priority 5: Sync Status Clarity

**Problem:** Confusing to know if scores are synced. "NOT SYNCED" warning is alarming but unclear.

**Current Implementation:**
- Red "NOT SYNCED" badge in header
- Small sync icons (⟳) next to each archer
- No explanation of what's not synced or why

**Proposed Solutions for v3.0:**

#### Solution 5A: Clear Sync Indicators
```
Per-end sync status (not just per-archer):

┌────────────────────────────────────┐
│  END 5  |  ✅ Synced at 12:34 PM   │
└────────────────────────────────────┘

Or:

┌────────────────────────────────────┐
│  END 5  |  ⏳ Syncing... (2 of 4)  │
└────────────────────────────────────┘

Or:

┌────────────────────────────────────┐
│  END 5  |  📤 Not synced (Tap to sync) │
└────────────────────────────────────┘
```

#### Solution 5B: Automatic Sync with Visual Feedback
```
Auto-sync when end is complete:

1. All archers have scores entered
2. Show: "Syncing end 5..." with spinner
3. API call to sync all 4 scorecards
4. Show: "✅ End 5 synced!" for 2 seconds
5. Auto-advance to next end

No manual "Sync End" button needed!
```

#### Solution 5C: Offline Queue Indicator
```
When offline, show:

┌────────────────────────────────────┐
│  📡 Offline Mode                   │
│  3 ends queued to sync             │
│  Will sync when connected          │
└────────────────────────────────────┘

When online, auto-sync and show:

┌────────────────────────────────────┐
│  ✅ Synced 3 ends successfully!    │
└────────────────────────────────────┘
```

#### Solution 5D: Sync History
```
Tap sync indicator to see:

┌────────────────────────────────────┐
│  Sync History                      │
├────────────────────────────────────┤
│  ✅ End 5: Synced at 12:34 PM      │
│  ✅ End 4: Synced at 12:28 PM      │
│  ✅ End 3: Synced at 12:22 PM      │
│  ✅ End 2: Synced at 12:16 PM      │
│  ✅ End 1: Synced at 12:10 PM      │
└────────────────────────────────────┘
```

**Success Criteria:**
- ✅ Clear understanding of sync status
- ✅ Automatic sync when possible
- ✅ No confusion about "NOT SYNCED" state
- ✅ Offline mode clearly indicated

---

### 🔴 Priority 6: Results Page Enhancements

**Problem:** Results/leaderboard in coach app lacks bale number, has no scorecard view, and no "last end completed" field to monitor status.

**Current Implementation:**
- Shows: Archer name, school, score, 10s, Xs
- Missing: Bale number, current status, scorecard link

**Proposed Solutions for v3.0:**

#### Solution 6A: Enhanced Leaderboard Columns
```
Results Page - New Columns:

| Rank | Archer | School | Bale | Status | Score | 10s | Xs | Avg | View |
|------|--------|--------|------|--------|-------|-----|----|----- |------|
| 1    | Leo H. | T      | 3    | End 10 | 229   | 8   | 8  | 7.6  | 👁️  |
| 2    | Test A | WDV    | 1    | End 8  | 215   | 6   | 5  | 7.2  | 👁️  |
| 3    | Ryder  | T      | 3    | End 5  | 142   | 3   | 2  | 7.1  | 👁️  |

New columns:
- Bale: Which bale they're on
- Status: "End X of 10", "Complete", "Not Started"
- View: Link to full scorecard (👁️)
```

#### Solution 6B: Live Status Indicators
```
Status column shows:

🟢 End 10 of 10 (Complete)
🟡 End 5 of 10 (In Progress)
⚪ Not Started
🔴 End 3 of 10 (Stalled - no update in 15 min)

Color codes help coach identify:
- Who's finished
- Who's actively scoring
- Who needs help
```

#### Solution 6C: Bale View Grouping
```
Add "Group by Bale" toggle:

┌────────────────────────────────────┐
│  BALE 1 (4 archers, End 8-10)      │
├────────────────────────────────────┤
│  Test Archer A: 215 (End 10) 👁️   │
│  Test Archer B: 198 (End 9) 👁️    │
│  Test Archer C: 187 (End 8) 👁️    │
│  Test Archer D: 201 (End 10) 👁️   │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│  BALE 3 (4 archers, End 5-6)       │
├────────────────────────────────────┤
│  Leo H.: 142 (End 5) 👁️            │
│  Ryder S.: 121 (End 6) 👁️          │
│  Eric S.: 98 (End 5) 👁️            │
│  Amelia B.: 110 (End 5) 👁️         │
└────────────────────────────────────┘

Helps coach see:
- Which bales are moving quickly
- Which bales need assistance
- Overall event pace
```

#### Solution 6D: Quick Scorecard Preview
```
Click 👁️ icon to open modal with full scorecard:

┌────────────────────────────────────┐
│  Leo Hernandez - Bale 3, Target A  │
│  [Close ✕]                         │
├────────────────────────────────────┤
│  End | A1 | A2 | A3 | Total | Run  │
│   1  | X  | 7  | X  |  27   | 27   │
│   2  | X  | X  | X  |  30   | 57   │
│   3  | X  | X  | X  |  30   | 87   │
│   4  | 7  | 7  | 6  |  20   | 107  │
│   5  | 8  | 8  | 8  |  24   | 131  │
│  ...                               │
│                                    │
│  Totals: 229 | 8 Xs | 8 10s        │
│  [Print] [Export] [Verify]         │
└────────────────────────────────────┘

No need to open separate page!
```

#### Solution 6E: Last Update Timestamp
```
Show when each archer last synced:

| Archer | Score | Status | Last Update |
|--------|-------|--------|-------------|
| Leo H. | 229   | End 10 | 12:45 PM    |
| Ryder  | 142   | End 5  | 12:38 PM    |
| Eric   | 98    | End 5  | 9 min ago ⚠️ |

Warnings:
⚠️ Yellow: > 10 min since last sync
🔴 Red: > 20 min since last sync
```

**Success Criteria:**
- ✅ Coach can see bale assignments at a glance
- ✅ Coach can see which archers/bales are progressing
- ✅ Coach can quickly view any scorecard
- ✅ Coach can identify archers who need help

---

## Open Questions for Discussion

1. **Archer Photos:** Should we support archer photos in the roster? (For identification during verification)

2. **Multi-Coach Access:** Should multiple coaches be able to manage the same event? (Permissions model)

3. **Practice Mode:** Should archers be able to create practice rounds without coach setup?

4. **Notifications:** What events should trigger notifications? (Event starting, verification ready, results posted)

5. **Historical Data Migration:** Should we migrate v2.0 localStorage data to the database? Or start fresh?

6. **Scoring Rules Engine:** Should we support configurable scoring rules? (e.g., compound vs. recurve, indoor vs. outdoor)

7. **Team Scoring:** Do we need to support team totals in addition to individual scores?

8. **Export Formats:** What formats should we support for exports? (PDF, CSV, Excel, JSON)

---

## Success Metrics

### User Adoption
- 90% of archers access scorecards digitally (vs. paper)
- 100% of coaches use digital roster management
- 80% of events verified digitally

### Performance
- Score entry < 500ms latency (online)
- Scorecard load < 1 second
- Leaderboard updates within 10 seconds of score entry

### Data Quality
- Zero duplicate archer entries
- < 1% sync conflicts requiring manual resolution
- 100% scorecard data retained (no localStorage loss)

### User Satisfaction
- "Easy to use" rating > 4.5/5
- < 5% support requests during events
- Positive coach feedback on time savings

---

## Next Steps

1. **Review this document** with stakeholders
2. **Prioritize features** for v3.0 Alpha
3. **Create wireframes** for new UI components
4. **Set up database migrations** for new tables
5. **Build API endpoints** for roster management
6. **Prototype coach console** UI

---

## Appendix: Current UI Screenshots

### Screenshot 1: Archer Scorecard (Card View)
**File:** Vida Vargas - Bale 1 Target A - End 10 Complete
**Analysis:**
- Clean, readable layout
- Color-coded scores (Gold, Red, Blue, Black)
- Running totals clearly visible
- Round totals at bottom (8 Xs, 8 10s, 229 total)
- Averages declining over time (9.0 → 7.6) - fatigue visible
- Navigation: Prev/Next, Export, Start Scoring, Setup

**What Works Well:**
- High information density without feeling cramped
- Color coding makes scores easy to parse
- Running total visible at all times

**Pain Points:**
- No indication this is synced/verified
- Can't see other archers on the bale
- No comparison to division average

### Screenshot 2: Score Entry Interface (Bale View)
**File:** R300 - Bale 3 - End 2 (NOT SYNCED)
**Analysis:**
- 4 archers visible (Leo H., Ryder S., Eric S., Amelia B.)
- End 2 partially filled
- Keypad visible at bottom
- Sync status shown (NOT SYNCED)
- Running totals visible (57, 42, 28, 35)

**What Works Well:**
- Keypad is large, touch-friendly
- Color-coded scores match target colors
- Can see all bale archers at once
- Clear "NOT SYNCED" warning

**Pain Points:**
- Only 4 archers fit on screen
- Need to scroll to see all data columns
- Keypad takes up 1/3 of screen
- No indication of which archer's turn it is

---

**Document Version:** 1.0  
**Last Updated:** October 28, 2025  
**Author:** Development Team  
**Status:** Draft - Pending Review


