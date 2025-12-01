# Ranking Round Event & Division Selection Refactor - Analysis

**Date:** December 1, 2025  
**Status:** Analysis & Planning  
**Priority:** High

---

## 🎯 Objective

Refactor the Ranking Round Module to:
1. **Explicitly allow selection of Event and Division** (modeled after Solo/Team match format)
2. **Support "Stand Alone" Ranking Rounds** that are not tied to a specific event but still backed up to the database
3. **Generate entry codes for standalone rounds** to tie individual rounds to archers and enable coach visibility

---

## 📊 Current State Analysis

### Current Ranking Round Flow

**Event Selection:**
- Modal-based selection (`event-modal` in `ranking_round_300.html`)
- Two tabs: "Enter Code" and "Select Event"
- Event selection loads event snapshot with divisions
- Division is **implicitly derived** from archer's gender/level during setup

**Division Handling:**
- `state.availableDivisions` populated from event snapshot
- Division code derived via `deriveDivisionCode(gender, level)` function
- No explicit UI for division selection
- Division stored in `state.divisionCode` but not prominently displayed

**Authentication:**
- Event entry code required for event-linked rounds
- Entry code stored in `localStorage` as `event_entry_code`
- Used in API calls via `X-Passcode` header

**Database Structure:**
```sql
rounds (
  id CHAR(36),
  event_id CHAR(36) NULL,  -- Can be NULL for standalone
  round_type VARCHAR(20),   -- 'R300' or 'R360'
  division VARCHAR(50),     -- 'BVAR', 'GJV', 'OPEN', etc.
  gender VARCHAR(1),
  level VARCHAR(3),
  date DATE,
  status VARCHAR(20)
)
```

**Key Files:**
- `ranking_round_300.html` - UI structure
- `js/ranking_round_300.js` - State management and logic
- `api/index.php` - Round creation endpoints

---

## 🎨 Target State (Modeled After Solo/Team Matches)

### Solo/Team Match Pattern (Reference Implementation)

**Event Selection UI:**
```html
<!-- From solo_card.html -->
<div class="space-y-3">
  <div>
    <label>Event (Optional)</label>
    <select id="event-select">
      <option value="">Standalone Match (No Event)</option>
      <!-- Populated with active events -->
    </select>
  </div>
  
  <!-- Bracket Selection (shown when event selected) -->
  <div id="bracket-selection" class="hidden">
    <label>Bracket</label>
    <select id="bracket-select">
      <option value="">Select Bracket...</option>
    </select>
  </div>
  
  <!-- Match Type Indicator -->
  <div id="match-type-indicator">
    <span id="match-type-text">Standalone match - not linked to any event</span>
  </div>
</div>
```

**State Management:**
```javascript
// From solo_card.js
const state = {
  eventId: null,        // Optional event ID
  bracketId: null,      // Optional bracket ID (shown when event selected)
  matchId: null,        // Database match ID
  // ...
};
```

**Standalone Match Flow:**
1. User selects "Standalone Match (No Event)"
2. System generates match code: `SOLO-[INITIALS]-[MMDD]`
3. Match created in database with `event_id = NULL`
4. Match code used for authentication (no event code required)
5. Coaches can view standalone matches via archer history

**Authentication:**
- Event-linked: Requires event entry code
- Standalone: Uses generated match code (no event code needed)

---

## 🔄 Proposed Ranking Round Refactor

### 1. UI Changes (Modeled After Solo/Team)

**New Setup Section:**
```html
<!-- Event/Division Selection (similar to Solo/Team) -->
<div class="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b">
  <div class="space-y-3">
    <!-- Event Selection -->
    <div>
      <label>Event (Optional)</label>
      <select id="event-select">
        <option value="">Standalone Round (No Event)</option>
        <!-- Populated with active events -->
      </select>
    </div>
    
    <!-- Division Selection (shown when event selected OR for standalone) -->
    <div id="division-selection">
      <label>Division</label>
      <select id="division-select">
        <option value="">Select Division...</option>
        <!-- Populated based on event or default list -->
      </select>
    </div>
    
    <!-- Round Type Indicator -->
    <div id="round-type-indicator">
      <span id="round-type-text">Standalone round - not linked to any event</span>
    </div>
  </div>
</div>
```

**Key Differences from Solo/Team:**
- **Division** instead of **Bracket** (matches tournament structure)
- Division selection shown for **both** event-linked and standalone rounds
- Standalone rounds still require division selection (for proper categorization)

### 2. State Management Updates

**New State Fields:**
```javascript
const state = {
  // Existing fields...
  selectedEventId: null,      // Selected event (or null for standalone)
  selectedDivision: null,     // Selected division (required)
  roundId: null,              // Database round ID (created when starting)
  roundEntryCode: null,       // Generated entry code for standalone rounds
  isStandalone: false,        // Flag for standalone mode
  // ...
};
```

### 3. Standalone Round Flow

**Step 1: User Selects "Standalone Round"**
- Event dropdown: "Standalone Round (No Event)"
- Division dropdown: Shows available divisions (BVAR, GVAR, BJV, GJV, OPEN)
- Round type indicator: "Standalone round - not linked to any event"

**Step 2: User Selects Division**
- Required selection (cannot proceed without division)
- Division determines gender/level defaults for archer selection

**Step 3: User Sets Up Bale & Starts Scoring**
- System generates **round entry code**: `R300-[INITIALS]-[MMDD]` or `R300-[DIVISION]-[MMDD]`
- Round created in database:
  ```sql
  INSERT INTO rounds (id, event_id, round_type, division, gender, level, date, status)
  VALUES (uuid(), NULL, 'R300', 'BVAR', 'M', 'VAR', '2025-12-01', 'In Progress')
  ```
- Entry code stored in `localStorage` as `round_entry_code`
- Entry code used for API authentication (similar to event entry code)

**Step 4: Scoring & Sync**
- Scores sync to database using round entry code
- Round ID stored in `state.roundId`
- Archer can resume via round ID or entry code

**Step 5: Coach Visibility**
- Standalone rounds appear in archer history
- Coaches can view via `GET /v1/archers/{id}/history`
- Round entry code enables access for verification

### 4. Event-Linked Round Flow (Updated)

**Step 1: User Selects Event**
- Event dropdown: Shows active events
- Division dropdown: Populated from event snapshot (divisions available in event)

**Step 2: User Selects Division**
- Only divisions available in selected event are shown
- Division selection determines which archers are available (pre-assigned mode)

**Step 3: User Sets Up Bale & Starts Scoring**
- Round created linked to event:
  ```sql
  INSERT INTO rounds (id, event_id, round_type, division, gender, level, date, status)
  VALUES (uuid(), 'event-uuid', 'R300', 'BVAR', 'M', 'VAR', '2025-12-01', 'In Progress')
  ```
- Uses event entry code for authentication
- Round ID stored in `state.roundId`

---

## 🔐 Authentication Flow Impact

### Current Authentication

**Event-Linked Rounds:**
- Entry code from event (`event_entry_code` in localStorage)
- Used in API calls: `X-Passcode: <event_entry_code>`
- Required for round creation and score submission

**Standalone Rounds (Current):**
- ❌ **Not supported** - All rounds currently require event

### Proposed Authentication

**Event-Linked Rounds:**
- ✅ **No change** - Continue using event entry code
- Entry code from event selection
- Stored in `localStorage` as `event_entry_code`

**Standalone Rounds (New):**
- ✅ **Round entry code** - Generated when round is created
- Format: `R300-[DIVISION]-[MMDD]` or `R300-[INITIALS]-[MMDD]`
- Stored in `localStorage` as `round_entry_code`
- Used in API calls: `X-Passcode: <round_entry_code>`
- **Backend must accept round entry codes** for authentication

### API Endpoint Changes Required

**Round Creation Endpoint:**
```php
// POST /v1/rounds
// Current: Requires event_id and event entry code
// Proposed: Allow event_id = NULL for standalone, generate round entry code

if (!$eventId) {
    // Standalone round - generate entry code
    $roundEntryCode = generateRoundEntryCode($roundType, $division, $date);
    // Store in rounds table or separate round_codes table
}
```

**Score Submission Endpoint:**
```php
// POST /v1/round_archers/{id}/ends
// Current: Requires event entry code
// Proposed: Accept either event entry code OR round entry code

$authCode = $_SERVER['HTTP_X_PASSCODE'] ?? null;
if ($authCode) {
    // Check if it's an event entry code
    $event = findEventByEntryCode($authCode);
    if ($event) {
        // Event-linked round
    } else {
        // Check if it's a round entry code
        $round = findRoundByEntryCode($authCode);
        if ($round) {
            // Standalone round
        }
    }
}
```

**Questions for Implementation:**

1. **Where to store round entry codes?**
   - Option A: Add `entry_code` column to `rounds` table ✅ **SELECTED**
   - Option B: Create separate `round_codes` table (like events table)
   - **Decision:** Option A (simpler, matches event pattern)

2. **Entry code format?**
   - `R300-BVAR-1201` (round type + division + date)
   - `R300-SJ-1201` (round type + archer initials + date)
   - `R300-60CM-1201-A2D` (round type + target size + date + random suffix) ✅ **SELECTED**
   - **Decision:** `R300-[TARGET_SIZE]-[MMDD]-[RANDOM]` format
     - VAR shoots 40cm, JV shoots 60cm
     - Target size is more useful for standalone rounds (allows mixed genders on bale)
     - Random alphanumeric suffix (3 chars) ensures uniqueness and prevents collisions
     - Examples: `R300-60CM-1201-A2D`, `R360-40CM-1201-QR9`

3. **Entry code uniqueness?**
   - Per-round (one code per round) ✅ **SELECTED**
   - Per-archer-per-round (each archer gets their own code)
   - **Decision:** Per-round (one code per round, shared by bale group)
   - **Note:** Random suffix in format ensures uniqueness; no need for Archer ExtID>

---

## 📋 Implementation Plan

### Phase 1: Database Schema Updates

**Add `entry_code` to `rounds` table:**
```sql
ALTER TABLE rounds 
ADD COLUMN entry_code VARCHAR(25) NULL 
COMMENT 'Entry code for standalone rounds (e.g., R300-60CM-1201-A2D)';

CREATE UNIQUE INDEX idx_rounds_entry_code ON rounds(entry_code);
```

**Note:** VARCHAR(25) to accommodate format: `R300-60CM-1201-A2D` (18 chars) with buffer

**Migration Script:**
- Create `api/sql/migration_add_round_entry_codes.sql`
- Add entry code column
- Generate entry codes for existing standalone rounds (if any)

### Phase 2: API Endpoint Updates

**Update Round Creation:**
- `POST /v1/rounds` - Allow `event_id = NULL`
- Generate entry code for standalone rounds using format: `R300-[TARGET_SIZE]-[MMDD]-[RANDOM]`
  - Determine target size from level: VAR → 40CM, JV → 60CM
  - Generate random 3-char alphanumeric suffix
  - Check for uniqueness, regenerate if collision
- Return entry code in response

**Update Authentication:**
- `api/db.php` - Add `findRoundByEntryCode()` function
- Update `require_api_key()` to accept round entry codes
- Update score submission endpoints to accept round entry codes

**New Endpoint (Optional):**
- `GET /v1/rounds/{id}` - Get round details by ID
- `GET /v1/rounds?entry_code={code}` - Get round by entry code

### Phase 3: Frontend UI Updates

**Update `ranking_round_300.html`:**
- Add Event/Division selection section (modeled after Solo/Team)
- Add division dropdown
- Add round type indicator
- Update event modal to show division selection
- **Important:** Division selection should be shown for BOTH event-linked and standalone rounds

**Update `js/ranking_round_300.js`:**
- Add division selection state management
- Add standalone round detection logic
- Add round entry code generation (client-side preview)
- Update `loadEventById()` to handle division selection
  - **For coach-created events:** Division list comes from event snapshot (divisions already created)
  - **For standalone:** Division list is default list (BVAR, GVAR, BJV, GJV, OPEN)
- Update round creation to support standalone mode
- Update authentication to use round entry code for standalone
- **Critical:** Ensure `handleDirectLink()` works for:
  - Coach-created rounds (event + round + archer)
  - Archer-created event-linked rounds (event + round + archer)
  - Standalone rounds (round + archer OR code + archer)

### Phase 4: Coach Visibility

**Update Archer History:**
- `GET /v1/archers/{id}/history` - Include standalone rounds
- Display round entry code in history
- Allow coaches to view standalone rounds

**Update Coach Console:**
- Show standalone rounds in verification workflow (optional)
- Display round entry codes for standalone rounds

---

## ⚠️ Critical Considerations

### 1. Backward Compatibility

**Coach Console Event Creation Flow (CRITICAL):**
The coach console creates events and division rounds through a specific workflow:

1. **Event Creation (`coach.html` + `js/coach.js`):**
   - Coach selects divisions (OPEN, BVAR, GVAR, BJV, GJV) via checkboxes
   - System creates event via `POST /v1/events` with `eventType: 'manual'`
   - System creates division rounds via `POST /v1/events/{id}/rounds` with divisions array
   - Each division gets its own round with `event_id` set (NOT NULL)
   - Rounds are created BEFORE archers are added

2. **Archer Assignment:**
   - Coach adds archers to each division sequentially
   - Assignment mode: "Auto-Assign Bales" or "Manual Signup"
   - Archers added via `POST /v1/events/{id}/rounds/{roundId}/archers`
   - Bale numbers assigned automatically or manually

3. **Key Backward Compatibility Requirements:**
   - ✅ **Coach-created rounds MUST continue to work unchanged**
   - ✅ **Event entry code authentication must remain functional**
   - ✅ **Archer-facing ranking round module must be able to resume coach-created rounds**
   - ✅ **No breaking changes to existing API contracts**
   - ✅ **Division selection in coach console is separate from archer-facing division selection**

**Existing Event-Linked Rounds:**
- ✅ Must continue to work unchanged
- Event entry code authentication must remain functional
- No breaking changes to existing API contracts
- Coach-created rounds have `event_id` set and division explicitly set

**Existing Standalone Rounds (if any):**
- May need migration to add entry codes
- Consider auto-generating entry codes for existing rounds
- Standalone rounds are NEW feature - no existing data to migrate

### 2. Division Selection Logic

**For Event-Linked Rounds (Coach-Created):**
- Division list comes from event snapshot
- Only divisions available in event are shown (coach selected during event creation)
- Division selection determines available archers (pre-assigned mode)
- **Note:** Coach console creates rounds with explicit divisions - archer-facing module should respect this

**For Event-Linked Rounds (Archer-Created):**
- Division list comes from event snapshot
- Only divisions available in event are shown
- User must select division explicitly (NEW requirement)
- Division selection determines available archers (pre-assigned mode)

**For Standalone Rounds:**
- Division list: `['BVAR', 'GVAR', 'BJV', 'GJV', 'OPEN']`
- User selects division explicitly
- Division determines gender/level defaults for archer selection
**+ Target Size is actually more useful for standalone. "JV PR" (Personal Record) is really PR on a 60CM and VAR PR is really a PR on a 40CM target. At santioned events they are gender split, but for practice and individual goals the JV and VAR is not different.**

### 3. Entry Code Generation

**Format (DECIDED):**
- `R300-[TARGET_SIZE]-[MMDD]-[RANDOM]` (e.g., `R300-60CM-1201-A2D`)
- `R360-[TARGET_SIZE]-[MMDD]-[RANDOM]` (e.g., `R360-40CM-1201-QR9`)
- **Target Size Mapping:**
  - VAR (Varsity) → `40CM`
  - JV (Junior Varsity) → `60CM`
- **Random Suffix:** 3-character alphanumeric (A-Z, 0-9) for uniqueness
- **Rationale:** Target size is more meaningful for standalone rounds than division
  - Allows mixed genders on same bale (common in practice)
  - JV PR = PR on 60cm target, VAR PR = PR on 40cm target
  - At sanctioned events, divisions are gender-split, but for practice/individual goals, target size matters more

**Uniqueness:**
- ✅ Must be unique across all rounds
- ✅ Random suffix (3 chars) prevents collisions
- ✅ Store in database with unique constraint on `rounds.entry_code`
- ✅ Generate on round creation, store immediately

### 4. Resume Functionality

**Current Resume Flow:**
- URL parameters: `?event={id}&round={id}&archer={id}`
- Works for event-linked rounds (coach-created or archer-created)
- `handleDirectLink()` in `ranking_round_300.js` handles this flow

**Proposed Resume Flow:**
- **Event-linked (Coach-Created):** `?event={id}&round={id}&archer={id}` (unchanged)
  - Coach creates event → creates division rounds → assigns archers
  - Archer resumes via direct link from home page
  - System loads event snapshot, finds archer's bale assignment, loads round
- **Event-linked (Archer-Created):** `?event={id}&round={id}&archer={id}` (unchanged)
  - Archer selects event → selects division → creates round
  - Archer resumes via direct link
- **Standalone:** `?round={id}&archer={id}` OR `?code={entry_code}&archer={id}`
  - Archer creates standalone round → gets entry code
  - Archer resumes via round ID or entry code
- Must handle all three cases in `handleDirectLink()`

### 5. Coach Verification

**Event-Linked Rounds:**
- Continue using existing verification workflow
- Coach verifies via event dashboard

**Standalone Rounds:**
- Option A: Include in verification workflow (requires event_id)
- Option B: Exclude from verification (standalone = practice/personal)
- **Recommendation:** Option B (matches Solo/Team pattern - standalone matches excluded from verification)

---

## 🧪 Testing Plan

### Unit Tests

1. **Entry Code Generation**
   - Test format: `R300-60CM-1201-A2D` (target size + date + random suffix)
   - Test target size mapping: VAR → 40CM, JV → 60CM
   - Test uniqueness (random suffix prevents collisions)
   - Test collision handling (regenerate if duplicate)

2. **Round Creation**
   - Test event-linked round creation
   - Test standalone round creation
   - Test division selection validation

3. **Authentication**
   - Test event entry code authentication
   - Test round entry code authentication
   - Test invalid code rejection

### Integration Tests

1. **Standalone Round Flow**
   - Create standalone round
   - Select division
   - Add archers
   - Submit scores
   - Verify database storage
   - Verify entry code generation

2. **Event-Linked Round Flow**
   - Select event
   - Select division
   - Add archers
   - Submit scores
   - Verify event linkage

3. **Resume Functionality**
   - Resume event-linked round
   - Resume standalone round (by ID)
   - Resume standalone round (by entry code)

### Manual Testing

1. **Mobile Testing**
   - Test on iPhone SE (smallest screen)
   - Test division dropdown on mobile
   - Test event selection modal

2. **Coach Visibility**
   - Verify standalone rounds appear in archer history
   - Verify round entry codes are displayed
   - Verify coaches can access standalone rounds

---

## 📝 Open Questions (RESOLVED)

1. **Entry Code Storage:** ✅ **RESOLVED**
   - ✅ Store in `rounds.entry_code` column

2. **Entry Code Format:** ✅ **RESOLVED**
   - ✅ `R300-[TARGET_SIZE]-[MMDD]-[RANDOM]` format
   - ✅ Target size (40CM/60CM) instead of division
   - ✅ Random 3-char suffix for uniqueness

3. **Entry Code Uniqueness:** ✅ **RESOLVED**
   - ✅ Per-round (one code per round, shared by bale group)
   - ✅ Random suffix ensures uniqueness (no need for Archer ExtID)

4. **Verification Workflow:** ✅ **RESOLVED**
   - ❌ Exclude standalone rounds from coach verification (matches Solo/Team pattern)
   - Standalone = practice/personal, not part of official verification

5. **Division Selection UI:** ✅ **RESOLVED**
   - ✅ Always show division dropdown (for both event-linked and standalone)

6. **Round Entry Code Display:** ✅ **RESOLVED**
   - ✅ Show in UI header (visible during scoring)

---

## 🔍 Additional Considerations

### Target Size vs Division for Standalone Rounds

**Key Insight:** For standalone rounds, target size (40cm vs 60cm) is more meaningful than division (BVAR vs GVAR) because:
- **Practice Context:** Mixed genders often shoot together on same bale
- **Personal Records:** JV PR = PR on 60cm target, VAR PR = PR on 40cm target
- **Event Context:** At sanctioned events, divisions are gender-split, but for practice/individual goals, target size is the distinguishing factor

**Implementation Note:**
- Entry code uses target size: `R300-60CM-1201-A2D` (clear, descriptive)
- Division still stored in database for categorization
- UI can show both: "60CM Target (JV Division)" for clarity

---

## 🎯 Success Criteria

✅ **Event Selection:**
- User can select event from dropdown (or choose standalone)
- Event selection populates division list
- Standalone option clearly indicated

✅ **Division Selection:**
- User must select division before starting scoring
- Division list appropriate for event (or default for standalone)
- Division selection persists through session

✅ **Standalone Rounds:**
- Round entry code generated automatically
- Entry code stored in database
- Entry code used for authentication
- Round appears in archer history
- Coaches can view standalone rounds

✅ **Backward Compatibility:**
- Existing event-linked rounds work unchanged
- No breaking changes to API
- Existing resume functionality preserved

✅ **Mobile-First:**
- UI works on iPhone SE (smallest screen)
- Touch-friendly dropdowns
- Clear visual hierarchy

---

## 📚 Related Documentation

- [BALE_GROUP_SCORING_WORKFLOW.md](../core/BALE_GROUP_SCORING_WORKFLOW.md) - Scoring workflow
- [APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md](../core/APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md) - System architecture
- [OAS_RULES.md](../core/OAS_RULES.md) - Tournament rules and divisions
- [PHASE2_AUTH_IMPLEMENTATION.md](../solo-matches/PHASE2_AUTH_IMPLEMENTATION.md) - Match code authentication (reference)

---

---

## 🔄 Coach Console Integration Summary

### Current Coach Event Creation Flow

**Step 1: Event Creation**
- Coach selects divisions via checkboxes (OPEN, BVAR, GVAR, BJV, GJV)
- System creates event via `POST /v1/events` with `eventType: 'manual'`
- System creates division rounds via `POST /v1/events/{id}/rounds`
- Each division gets its own round with `event_id` set (NOT NULL)

**Step 2: Archer Assignment**
- Coach adds archers to each division sequentially
- Assignment mode: "Auto-Assign Bales" or "Manual Signup"
- Archers added via `POST /v1/events/{id}/rounds/{roundId}/archers`
- Bale numbers assigned automatically or manually

**Key Points:**
- ✅ Rounds are created with `event_id` set (NOT NULL)
- ✅ Division is explicitly set during round creation
- ✅ Rounds are created BEFORE archers are added
- ✅ Coach console workflow is SEPARATE from archer-facing ranking round module

### Backward Compatibility Guarantees

**Coach-Created Rounds:**
- ✅ **MUST continue to work unchanged**
- ✅ Archer-facing module can resume coach-created rounds via `?event={id}&round={id}&archer={id}`
- ✅ Event entry code authentication remains functional
- ✅ Division selection in coach console is independent of archer-facing division selection

**Archer-Created Event-Linked Rounds:**
- ✅ Can create new rounds in existing events (if event allows)
- ✅ Must select division explicitly (NEW requirement)
- ✅ Uses event entry code for authentication

**Standalone Rounds:**
- ✅ NEW feature - no existing data to migrate
- ✅ Uses round entry code for authentication
- ✅ Appears in archer history for coach visibility

---

**Next Steps:**
1. Review this analysis with team
2. Answer open questions
3. Create detailed implementation plan
4. Begin Phase 1 (Database schema updates)

