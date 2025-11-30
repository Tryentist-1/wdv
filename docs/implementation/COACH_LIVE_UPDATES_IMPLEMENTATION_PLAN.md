# Coach Live Updates & Division-Based Rounds Implementation Plan

**Status:** Draft for Review  
**Date:** 2025-10-06  
**Owner:** Development Team

---

## 1. Executive Summary

This document outlines the refactoring plan to implement division-based event management, automatic bale assignment, and real-time leaderboards for coaches during ranking rounds.

### Key Changes:
1. **Data Model Standardization** - Consistent use of Division (VAR/JV), Gender (M/F), School (3-letter codes)
2. **Event Architecture** - 1 Event → 4 Division Rounds → Individual Scorecards (not bale-based)
3. **Archer Master List** - MySQL as source of truth, sync from Archer Management module
4. **Coach Workflows** - Auto-assign archers to bales OR create empty bales for on-site assignment
5. **Live Updates** - Division-based leaderboards with running totals and sync status
6. **Offline Resilience** - Local storage backup with Master Sync for poor connectivity

---

## 2. Data Model Standardization

### 2.1 Field Standards

| Field | Current Values | New Standard | Notes |
|-------|---------------|--------------|-------|
| **Division** | "Varsity", "V", "JV" (mixed) | "VAR", "JV" | Consistent across all code |
| **Gender** | "M", "F", "Male", "Female" (mixed) | "M", "F" | Male, Female |
| **School** | Full names (inconsistent) | 3-letter codes | E.g., "WIS", "DVN", "BHS" |

### 2.2 Database Schema Updates

**archers table:**
```sql
ALTER TABLE archers 
  MODIFY COLUMN level VARCHAR(3) NOT NULL COMMENT 'VAR or JV',
  MODIFY COLUMN gender VARCHAR(1) NOT NULL COMMENT 'M or F',
  MODIFY COLUMN school VARCHAR(3) NOT NULL COMMENT '3-letter school code';

-- Add index for division queries
CREATE INDEX idx_archers_division ON archers(gender, level);
```

**events table:**
```sql
-- Add event_type to distinguish between auto-assign and self-select
ALTER TABLE events
  ADD COLUMN event_type VARCHAR(20) DEFAULT 'auto_assign' COMMENT 'auto_assign or self_select';
```

**rounds table - CRITICAL CHANGE:**
```sql
-- Rounds are now DIVISION-based, not bale-based
ALTER TABLE rounds
  ADD COLUMN division VARCHAR(10) NOT NULL COMMENT 'BVAR, BJV, GVAR, GJV',
  ADD COLUMN gender VARCHAR(1) COMMENT 'M or F',
  ADD COLUMN level VARCHAR(3) COMMENT 'VAR or JV';

-- Remove bale_number from rounds (it moves to round_archers)
-- bale_number stays temporarily for backwards compatibility
```

**round_archers table:**
```sql
-- Add bale_number here (it's an archer assignment, not a round property)
ALTER TABLE round_archers
  ADD COLUMN bale_number INT NULL COMMENT 'Assigned bale within division round',
  MODIFY COLUMN level VARCHAR(3) COMMENT 'VAR or JV',
  MODIFY COLUMN gender VARCHAR(1) COMMENT 'M or F',
  MODIFY COLUMN school VARCHAR(3) COMMENT '3-letter code';

-- Add index for bale queries
CREATE INDEX idx_ra_bale ON round_archers(round_id, bale_number);
```

---

## 3. Event & Round Architecture

### 3.1 Current (Incorrect) Model
```
Event
  └── Round (per bale)
       └── 2-4 Archers (mixed divisions)
```

### 3.2 New (Correct) Model
```
Event
  ├── Round: BVAR (Boys Varsity)
  │    ├── Bale 1: Archer A, B, C, D (4 archers)
  │    ├── Bale 2: Archer E, F, G (3 archers)
  │    └── Bale 3: Archer H, I (2 archers)
  ├── Round: BJV (Boys JV)
  │    └── Bale 4: Archer J, K, L, M
  ├── Round: GVAR (Girls Varsity)
  │    └── Bale 5: Archer N, O, P
  └── Round: GJV (Girls JV)
       └── Bale 6: Archer Q, R, S, T
```

### 3.3 Division Codes
- **BVAR** = Boys Varsity (gender: M, level: VAR)
- **BJV** = Boys JV (gender: M, level: JV)
- **GVAR** = Girls Varsity (gender: F, level: VAR)
- **GJV** = Girls JV (gender: F, level: JV)

---

## 4. Bale Assignment Logic

### 4.1 Auto-Assignment Algorithm

```javascript
function assignArchersToBales(archers, divisionCode) {
  // Filter archers by division
  const divisionArchers = archers.filter(a => 
    getDivisionCode(a.gender, a.level) === divisionCode
  );
  
  const totalArchers = divisionArchers.length;
  if (totalArchers === 0) return [];
  
  // Calculate optimal bale distribution (2-4 per bale, no singles)
  let bales = [];
  
  if (totalArchers === 1) {
    // Special case: single archer gets added to nearest compatible bale
    // OR flagged for manual assignment
    return [{ bale: 1, archers: divisionArchers, warning: 'Single archer' }];
  }
  
  // Algorithm: Distribute evenly, prefer 4 per bale, avoid singles
  let remainingArchers = [...divisionArchers];
  let baleNumber = 1;
  
  while (remainingArchers.length > 0) {
    let baleSize;
    
    if (remainingArchers.length >= 4) {
      baleSize = 4;
    } else if (remainingArchers.length === 3) {
      baleSize = 3;
    } else if (remainingArchers.length === 2) {
      baleSize = 2;
    } else if (remainingArchers.length === 1) {
      // Add to previous bale if it has < 4, otherwise create pair
      if (bales.length > 0 && bales[bales.length - 1].archers.length < 4) {
        bales[bales.length - 1].archers.push(remainingArchers[0]);
        break;
      } else {
        baleSize = 1; // Flag for manual review
      }
    }
    
    bales.push({
      bale: baleNumber,
      archers: remainingArchers.splice(0, baleSize)
    });
    baleNumber++;
  }
  
  return bales;
}
```

### 4.2 Bale Numbering Convention
- Bale numbers are **continuous across the event**
- Boys Varsity: Bales 1-N
- Girls Varsity: Bales N+1 to M
- Boys JV: Bales M+1 to P
- Girls JV: Bales P+1 to Q

---

## 5. Archer Master List (MySQL Sync)

### 5.1 Current State
- Archer Management module uses **localStorage** (`archerList`)
- MySQL `archers` table exists but may be unpopulated
- No sync mechanism

### 5.2 New Sync Process

**On Archer Management Save:**
```javascript
async function syncArcherToMySQL(archer) {
  const payload = {
    firstName: archer.first,
    lastName: archer.last,
    school: archer.school.substring(0, 3).toUpperCase(), // Force 3-letter
    level: archer.level === 'Varsity' || archer.level === 'V' ? 'VAR' : 'JV',
    gender: archer.gender === 'Male' || archer.gender === 'Boys' ? 'M' : 'F',
    extId: archer.id || generateUUID() // Local ID for matching
  };
  
  await LiveUpdates.request('/archers', 'POST', payload);
}
```

**On Event Creation (Pull from MySQL):**
```javascript
async function loadArchersForEvent() {
  const archers = await LiveUpdates.request('/archers', 'GET');
  // Returns all archers from MySQL, grouped by division
  return archers;
}
```

### 5.3 API Endpoints Needed

```
POST   /archers              - Upsert archer (idempotent on extId)
GET    /archers              - Get all archers
GET    /archers?division=BVAR - Get archers by division
PUT    /archers/{id}         - Update archer
DELETE /archers/{id}         - Delete archer
```

---

## 6. Coach Console Workflows

### 6.1 Event Creation - Option A (Auto-Assign)

**UI Flow:**
1. Coach clicks "Create Event"
2. Enters: Event Name, Date, Event Type = "Auto-Assign"
3. System fetches all archers from MySQL
4. System creates:
   - 1 Event record
   - 4 Round records (BVAR, BJV, GVAR, GJV)
   - Auto-assigns archers to bales within each division
   - Creates round_archers records with bale assignments
5. Displays summary: "Created event with X archers across Y bales"

**API Call:**
```javascript
POST /events
{
  "name": "Fall Championship 2025",
  "date": "2025-10-15",
  "eventType": "auto_assign",
  "autoAssignBales": true
}

Response:
{
  "eventId": "uuid",
  "rounds": [
    { "roundId": "uuid1", "division": "BVAR", "bales": 3, "archers": 10 },
    { "roundId": "uuid2", "division": "BJV", "bales": 2, "archers": 7 },
    { "roundId": "uuid3", "division": "GVAR", "bales": 2, "archers": 6 },
    { "roundId": "uuid4", "division": "GJV", "bales": 1, "archers": 4 }
  ]
}
```

### 6.2 Event Creation - Option B (Self-Select Bales)

**UI Flow:**
1. Coach clicks "Create Event"
2. Enters: Event Name, Date, Event Type = "Self-Select"
3. Enters: Number of bales per division
4. System creates:
   - 1 Event record
   - 4 Round records (BVAR, BJV, GVAR, GJV)
   - Empty bale "slots" (no archer assignments yet)
5. On-site: Scorers open Ranking Round app, select their bale, assign archers

**API Call:**
```javascript
POST /events
{
  "name": "Practice Meet",
  "date": "2025-10-15",
  "eventType": "self_select",
  "balesPerDivision": {
    "BVAR": 3,
    "BJV": 2,
    "GVAR": 2,
    "GJV": 1
  }
}
```

---

## 7. Ranking Round App Updates

### 7.1 Current Behavior
- Scorer manually selects 4 archers from master list
- Assigns target letters A-D
- Creates round in localStorage
- Posts to Live Updates

### 7.2 New Behavior (Auto-Assigned Mode)

**On App Load:**
1. Check if event is active
2. Fetch bale assignments: `GET /events/{eventId}/bale-assignments`
3. Display: "Your Bale: #3 (Boys Varsity)"
4. Show pre-assigned archers (read-only names)
5. Allow score entry as normal

**On App Load (Self-Select Mode):**
1. Show event name and available bales
2. Scorer selects their bale number
3. Scorer selects archers from master list (division-filtered)
4. System validates division consistency
5. Creates round_archers records with bale assignment

### 7.3 Bale Assignment Display

**Setup Screen Enhancement:**
```html
<div class="bale-assignment-banner">
  <strong>Event:</strong> Fall Championship 2025<br>
  <strong>Your Bale:</strong> #3 (Boys Varsity)<br>
  <strong>Assigned Archers:</strong> (4)
</div>

<div class="archer-list">
  <!-- Pre-populated, read-only -->
  <div class="archer-item">
    <span>A - John Smith (WIS)</span>
    <span class="badge">VAR</span>
  </div>
  <!-- ... -->
</div>
```

---

## 8. Live Updates & Sync Status

### 8.1 Current Issues
- No sync status indicators
- No division-based grouping
- Missing running averages
- Unclear failure handling

### 8.2 New Sync Status Display

**Per-Archer Status Indicator:**
```html
<div class="archer-row">
  <span>John Smith (WIS)</span>
  <span class="sync-status synced">✓ Synced</span>
  <!-- OR -->
  <span class="sync-status pending">⟳ Pending</span>
  <!-- OR -->
  <span class="sync-status failed">✗ Failed</span>
</div>
```

**Per-End Sync Logic:**
```javascript
async function syncEndToBackend(archerId, endNumber) {
  try {
    updateSyncStatus(archerId, 'pending');
    await LiveUpdates.postEnd(archerId, endNumber, endData);
    updateSyncStatus(archerId, 'synced');
  } catch (error) {
    updateSyncStatus(archerId, 'failed');
    queueForRetry(archerId, endNumber, endData);
  }
}
```

### 8.3 Offline Resilience - Master Sync

**Local Storage Backup:**
```javascript
// Store complete scorecard in localStorage
localStorage.setItem(`scorecard_${archerId}`, JSON.stringify({
  archer: {...},
  ends: [...],
  syncStatus: { end1: 'synced', end2: 'pending', end3: 'failed' },
  lastSyncAttempt: timestamp
}));
```

**Master Sync Button:**
```html
<button id="master-sync-btn" class="btn btn-primary">
  Master Sync All Scorecards
</button>
```

**Master Sync Logic:**
```javascript
async function masterSyncAll() {
  const scorecards = getAllLocalScorecards();
  
  for (const card of scorecards) {
    for (const end of card.ends) {
      if (end.syncStatus !== 'synced') {
        try {
          await syncEndToBackend(card.archerId, end.number);
        } catch (e) {
          console.error(`Failed to sync ${card.archer.name} End ${end.number}`);
        }
      }
    }
  }
  
  showSyncSummary();
}
```

---

## 9. Coach Console Leaderboard

### 9.1 Current Issues
- Shows rounds by bales (incorrect)
- No division grouping
- Missing arrow averages
- No real-time updates

### 9.2 New Leaderboard Structure

**Division Tabs:**
```html
<div class="division-tabs">
  <button class="active">Boys Varsity (10)</button>
  <button>Girls Varsity (6)</button>
  <button>Boys JV (7)</button>
  <button>Girls JV (4)</button>
  <button>Overall (27)</button>
</div>
```

**Leaderboard Table (Per Division):**
```html
<table class="leaderboard">
  <thead>
    <tr>
      <th>Rank</th>
      <th>Archer</th>
      <th>School</th>
      <th>Bale</th>
      <th>End</th>
      <th>End Total</th>
      <th>Running Total</th>
      <th>Avg/Arrow</th>
      <th>Xs</th>
      <th>10s</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>John Smith</td>
      <td>WIS</td>
      <td>3</td>
      <td>5/10</td>
      <td>28</td>
      <td>142</td>
      <td>9.47</td>
      <td>3</td>
      <td>12</td>
      <td><span class="badge synced">Live</span></td>
    </tr>
  </tbody>
</table>
```

**Calculation Logic:**
```javascript
function calculateLeaderboard(divisionCode, endEvents) {
  const archers = groupByArcher(endEvents);
  
  return archers.map(archer => {
    const totalArrows = archer.endsCompleted * 3;
    const avgPerArrow = totalArrows > 0 ? (archer.runningTotal / totalArrows).toFixed(2) : '0.00';
    
    return {
      rank: 0, // Calculated after sorting
      name: archer.archerName,
      school: archer.school,
      bale: archer.baleNumber,
      currentEnd: `${archer.endsCompleted}/10`,
      endTotal: archer.lastEndTotal,
      runningTotal: archer.runningTotal,
      avgPerArrow: avgPerArrow,
      xs: archer.totalXs,
      tens: archer.totalTens,
      status: archer.lastSyncTime > (Date.now() - 60000) ? 'Live' : 'Stale'
    };
  }).sort((a, b) => b.runningTotal - a.runningTotal)
    .map((archer, idx) => ({ ...archer, rank: idx + 1 }));
}
```

### 9.3 Real-Time Updates

**Polling Strategy (Simple, Reliable):**
```javascript
let leaderboardInterval;

function startLeaderboardPolling(eventId) {
  leaderboardInterval = setInterval(async () => {
    const snapshot = await LiveUpdates.request(`/events/${eventId}/snapshot`);
    updateLeaderboard(snapshot);
  }, 5000); // Poll every 5 seconds
}

function stopLeaderboardPolling() {
  clearInterval(leaderboardInterval);
}
```

**Future: WebSocket/SSE (Optional Enhancement):**
```javascript
// Server-Sent Events for real-time push
const eventSource = new EventSource(`${API_BASE}/events/${eventId}/stream`);

eventSource.addEventListener('score_update', (e) => {
  const data = JSON.parse(e.data);
  updateLeaderboardRow(data.archerId, data.endData);
});
```

---

## 10. API Changes Required

### 10.1 New Endpoints

```
POST   /events                          - Create event (auto or self-select)
GET    /events/{id}/bale-assignments    - Get bale assignments for event
GET    /events/{id}/snapshot            - Get leaderboard snapshot (updated)
POST   /events/{id}/assign-bales        - Manual bale assignment

GET    /archers                         - Get all archers
POST   /archers                         - Upsert archer
GET    /archers/{id}                    - Get archer details

GET    /rounds/{id}/leaderboard         - Get division leaderboard
```

### 10.2 Updated Endpoints

**POST /events (Enhanced):**
```json
Request:
{
  "name": "Fall Championship",
  "date": "2025-10-15",
  "eventType": "auto_assign",  // NEW
  "autoAssignBales": true,      // NEW
  "status": "Active"
}

Response:
{
  "eventId": "uuid",
  "rounds": [
    {
      "roundId": "uuid",
      "division": "BVAR",       // NEW
      "gender": "M",            // NEW
      "level": "VAR",           // NEW
      "baleCount": 3,           // NEW
      "archerCount": 10         // NEW
    },
    // ... 3 more division rounds
  ]
}
```

**GET /events/{id}/snapshot (Updated Response):**
```json
{
  "event": {
    "id": "uuid",
    "name": "Fall Championship",
    "date": "2025-10-15",
    "status": "Active"
  },
  "divisions": {
    "BVAR": {
      "roundId": "uuid",
      "archers": [
        {
          "archerId": "uuid",
          "archerName": "John Smith",
          "school": "WIS",
          "bale": 3,
          "target": "A",
          "endsCompleted": 5,
          "lastEndTotal": 28,
          "runningTotal": 142,
          "avgPerArrow": 9.47,
          "tens": 12,
          "xs": 3,
          "lastSyncTime": "2025-10-15T14:32:10Z",
          "ends": [
            { "end": 1, "a1": "X", "a2": "10", "a3": "9", "total": 29 },
            // ... more ends
          ]
        }
      ]
    },
    "BJV": { /* ... */ },
    "GVAR": { /* ... */ },
    "GJV": { /* ... */ }
  }
}
```

---

## 11. Implementation Phases

### Phase 1: Data Model & Schema (Foundation)
**Duration:** 1-2 days
- [ ] Update database schema (migrations)
- [ ] Update all code to use VAR/JV, M/F, 3-letter schools
- [ ] Test data migration script
- [ ] Update API endpoints for new fields

### Phase 2: Archer Master List Sync
**Duration:** 1 day
- [ ] Add MySQL sync to Archer Management module
- [ ] Create /archers API endpoints
- [ ] Test bidirectional sync

### Phase 3: Event/Round Refactoring
**Duration:** 2-3 days
- [ ] Update event creation API (auto-assign logic)
- [ ] Implement bale assignment algorithm
- [ ] Update Coach Console event creation UI
- [ ] Create division rounds instead of bale rounds

### Phase 4: Ranking Round App Updates
**Duration:** 2 days
- [ ] Add bale assignment display
- [ ] Support pre-assigned mode
- [ ] Update sync status indicators
- [ ] Implement Master Sync button

### Phase 5: Live Updates & Leaderboard
**Duration:** 2-3 days
- [ ] Fix Live Updates sync logic
- [ ] Refactor Coach Console leaderboard (division-based)
- [ ] Add running totals and arrow averages
- [ ] Implement polling/real-time updates

### Phase 6: Testing & Refinement
**Duration:** 2-3 days
- [ ] End-to-end testing (all workflows)
- [ ] Offline/online sync testing
- [ ] Performance optimization
- [ ] Bug fixes and polish

**Total Estimated Duration:** 10-14 days

---

## 12. Risk Assessment & Mitigation

### High Risk Items:
1. **Data Migration** - Existing events/rounds use old structure
   - *Mitigation:* Create migration script with rollback capability
   - *Mitigation:* Support both old and new structures temporarily

2. **Breaking Changes** - Existing score cards in progress
   - *Mitigation:* Feature flag for new system
   - *Mitigation:* Gradual rollout (coach console first, then scoring apps)

3. **Offline Sync Reliability** - Complex retry logic
   - *Mitigation:* Comprehensive local storage backup
   - *Mitigation:* Manual Master Sync as fallback

### Medium Risk Items:
1. **API Performance** - Leaderboard queries may be slow with many archers
   - *Mitigation:* Database indexing on (round_id, division)
   - *Mitigation:* Consider caching layer

2. **Real-Time Updates** - Polling every 5 seconds may be heavy
   - *Mitigation:* Start with 10-second interval
   - *Mitigation:* Move to WebSocket/SSE in Phase 2

---

## 13. Testing Checklist

### Unit Tests
- [ ] Bale assignment algorithm (various archer counts)
- [ ] Division code generation (gender + level)
- [ ] Sync status state machine
- [ ] Arrow average calculation

### Integration Tests
- [ ] Event creation → Division rounds → Bale assignments
- [ ] Archer Management → MySQL sync
- [ ] Score entry → Live Updates → Leaderboard update
- [ ] Offline scoring → Master Sync → Leaderboard update

### User Acceptance Tests
- [ ] Coach creates auto-assign event
- [ ] Coach creates self-select event
- [ ] Scorer opens pre-assigned bale
- [ ] Scorer scores in offline mode, syncs later
- [ ] Coach monitors live leaderboard
- [ ] Divisions display correctly with rankings

---

## 14. Status Workflow & Completion Logic

> **⚠️ Status Workflow Reference:**  
> For the authoritative status workflow documentation, see:  
> **[SCORECARD_STATUS_WORKFLOW.md](SCORECARD_STATUS_WORKFLOW.md)**
> 
> This section contains historical implementation details.  
> The master reference should be consulted for current status definitions.

### 14.1 Scorecard Status Flow
```
Created → Active (first score entered) → Completed (Verify & Submit clicked)
```

**Scorecard Completion:**
- Scorer completes all ends (10 for R300, 12 for R360)
- Reviews full scorecard
- Clicks "Verify and Submit" button
- Scorecard marked as `completed: true` in database
- No further edits allowed (read-only)

### 14.2 Division Round Status Flow
```
Created → Active (first scorecard active) → Completed (all scorecards completed)
```

**Division Round Completion:**
- Auto-calculated based on scorecard completion
- SQL: `SELECT COUNT(*) WHERE round_id = ? AND completed = false`
- If count = 0, mark round as completed
- Triggers leaderboard finalization

### 14.3 Event Status Flow
```
Planned → Active (day of event, manual) → Completed (all division rounds completed)
```

**Event Lifecycle:**
- **Planned:** Created by coach during the week, no scoring yet
- **Active:** Coach manually activates on competition day (or auto on first score)
- **Completed:** Auto when all 4 division rounds are completed OR coach manually closes

### 14.4 Database Schema for Status

**round_archers table (scorecard level):**
```sql
ALTER TABLE round_archers
  ADD COLUMN completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN verified_at TIMESTAMP NULL,
  ADD COLUMN verified_by VARCHAR(100) NULL;
```

**rounds table (division level):**
```sql
ALTER TABLE rounds
  ADD COLUMN status VARCHAR(20) DEFAULT 'Created' COMMENT 'Created, Active, Completed';
```

**events table:**
```sql
-- Already has status field
-- Values: 'Planned', 'Active', 'Completed'
```

---

## 15. Open Questions - RESOLVED ✅

1. **Bale Numbering:** ✅ **Event-wide continuous numbering (1, 2, 3... across all divisions)**
   - No division-specific restart

2. **Single Archer Edge Case:** ✅ **Not applicable - won't occur in real world**
   - No special handling needed

3. **Division Display Names:** ✅ **Full names ("Boys Varsity") if fits in mobile iPhone SE space**
   - Critical: Must not break or run off page
   - Use codes in database/API, full names in UI where space allows
   - Test on smallest supported device (iPhone SE)

4. **Event Status Workflow:** ✅ **Defined lifecycle**
   - **Event:** Planned (throughout week) → Active (day of competition) → Completed (same day, when all divisions complete)
   - **Scorecard:** Active (being scored) → Completed (after "Verify and Submit")
   - **Division Round:** Completed (when ALL scorecards in division are completed)
   - "Verify and Submit" button finalizes a scorecard

5. **Historical Data:** ✅ **Clean slate - can purge/drop/rename columns**
   - Full refactoring allowed
   - Will create test data for validation

---

## 15. Next Steps

**Before Implementation:**
1. ✅ Review this document with stakeholders
2. ✅ Answer open questions
3. ✅ Approve implementation approach
4. ✅ Schedule development sprint

**After Approval:**
1. Create feature branch: `feature/division-based-events`
2. Begin Phase 1: Data Model & Schema
3. Daily progress updates in `01-SESSION_MANAGEMENT_AND_WORKFLOW.md`

---

**Document Status:** Ready for Review  
**Approval Required From:** Terry (Product Owner)

