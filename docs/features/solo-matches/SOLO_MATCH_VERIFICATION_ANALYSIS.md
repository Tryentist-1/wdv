# Solo Match Verification - Implementation Analysis

**Date:** December 1, 2025  
**Status:** 📋 Analysis Complete - Ready for Implementation  
**Priority:** High (Current Sprint Focus)

---

## 🎯 Objective

Add Solo Matches to:
1. **Verification Flow** - Enable coaches to verify solo matches in coach module or Event Dashboard
2. **ScoreCard Editor** - Allow coaches to view and edit solo matches in `scorecard_editor.html`

---

## 📊 Current State Analysis

### ✅ What Already Exists

#### 1. **Backend Verification Infrastructure**
- **API Endpoint:** `POST /v1/solo-matches/{id}/verify`
- **Location:** `api/index.php` (lines 4436-4469)
- **Function:** `process_solo_match_verification()` (lines 582-648)
- **Capabilities:**
  - Lock/unlock/void solo matches
  - Standalone matches excluded (event_id required)
  - Complete audit trail (lock_history JSON)
  - Status transitions: PENDING → COMP → VER (or VOID)

#### 2. **Database Schema**
- **Table:** `solo_matches`
- **Verification Fields:**
  ```sql
  card_status VARCHAR(20) DEFAULT 'PENDING',
  locked BOOLEAN DEFAULT FALSE,
  verified_by VARCHAR(100) NULL,
  verified_at TIMESTAMP NULL,
  lock_history JSON NULL
  ```

#### 3. **Ranking Round Verification Pattern** (Reference Implementation)
- **Location:** `coach.html` (lines 436-457)
- **Modal:** "Verify Scorecards Modal"
- **Flow:**
  1. Select Event → Division → Bale
  2. Display all scorecards for that bale
  3. Coach can lock/unlock/void individual cards
  4. "Lock All On Bale" button for batch verification
- **API Endpoint:** `POST /v1/round_archers/{id}/verification`
- **File:** `js/coach.js` (lines 576-702)

#### 4. **ScoreCard Editor Infrastructure**
- **File:** `scorecard_editor.html`
- **Current Support:** Ranking rounds only (via `roundArcherId` parameter)
- **URL Format:** `scorecard_editor.html?id={roundArcherId}&mode=coach`
- **Features:**
  - View/edit individual scorecards
  - Lock/unlock/void actions
  - Verification history display
  - Score editing with bottom sheet keypad

---

## 🔍 Gap Analysis

### ❌ Missing Components

#### 1. **Verification UI for Solo Matches**

**Current State:**
- Coach verification modal (`coach.html`) only shows ranking rounds
- No way to list/select solo matches for verification
- Event Dashboard (`event_dashboard.html`) shows brackets but no match verification

**What's Needed:**
- Add solo matches to verification modal OR
- Create dedicated solo match verification section
- Display solo matches grouped by event/bracket
- Show match status, opponents, scores
- Enable lock/unlock/void actions

#### 2. **ScoreCard Editor Support for Solo Matches**

**Current State:**
- `scorecard_editor.html` only accepts `roundArcherId` parameter
- Loads from `/v1/round_archers/{id}` endpoint
- Renders ranking round format (ends, arrows, totals)

**What's Needed:**
- Accept `match` or `soloMatchId` parameter
- Load from `/v1/solo-matches/{id}` endpoint
- Render solo match format (sets, arrows per set, shoot-off if applicable)
- Support verification actions (lock/unlock/void)
- Display match-specific metadata (opponent, event, bracket)

---

## 📐 Implementation Approach

### Option A: Extend Existing Verification Modal (Recommended)

**Pros:**
- Reuses existing UI patterns
- Consistent coach workflow
- Minimal new code

**Implementation Steps:**

1. **Extend Verification Modal in `coach.html`**
   - Add tab or selector: "Ranking Rounds" | "Solo Matches" | "Team Matches"
   - When "Solo Matches" selected:
     - Replace Division/Bale selectors with Event/Bracket selectors
     - Query solo matches: `GET /v1/events/{eventId}/solo-matches?bracket_id={bracketId}&status=Completed`
     - Display matches in table format (similar to ranking round table)
     - Each row shows: Opponents, Sets Score, Status, Actions

2. **Add Solo Match Actions**
   - Reuse existing lock/unlock/void button handlers
   - Call `POST /v1/solo-matches/{id}/verify` instead of round_archers endpoint
   - Update table after verification

3. **API Endpoints Needed:**
   ```php
   // List solo matches for verification
   GET /v1/events/{eventId}/solo-matches
   Query params: bracket_id (optional), status (optional), locked (optional)
   ```

### Option B: Add to Event Dashboard

**Pros:**
- More context (matches shown alongside brackets/rounds)
- Better visual hierarchy
- Natural grouping by event

**Implementation Steps:**

1. **Add Solo Matches Section to Event Dashboard**
   - Below Brackets section, add "Solo Matches" section
   - Group matches by bracket or show all event matches
   - Show completion status per match
   - Add "Verify" button/link for each match or batch verify

2. **Create Match Verification Modal**
   - Similar to ranking round modal
   - Show match details (opponents, sets, scores)
   - Enable verification actions

### Recommendation: **Option A + ScoreCard Editor Extension**

**Rationale:**
- Maintains consistent workflow (all verification in one place)
- Reuses proven UI patterns
- Easier to implement (extend existing modal)
- ScoreCard Editor provides detailed view/editing capability

---

## 🔧 Implementation Plan

### Phase 1: API Endpoints (Backend)

#### 1.1 List Solo Matches for Event
**Endpoint:** `GET /v1/events/{eventId}/solo-matches`  
**Location:** `api/index.php`

**Query Parameters:**
- `bracket_id` (optional) - Filter by bracket
- `status` (optional) - Filter by match status (Completed, In Progress, etc.)
- `locked` (optional) - Filter by locked status (true/false)
- `card_status` (optional) - Filter by card_status (PENDING, COMP, VER, VOID)

**Response Format:**
```json
{
  "matches": [
    {
      "match_id": "uuid",
      "event_id": "uuid",
      "event_name": "Fall Tournament",
      "bracket_id": "uuid",
      "bracket_name": "Solo Elimination - BV",
      "archer1_name": "John Doe",
      "archer2_name": "Jane Smith",
      "sets_won": 6,
      "opponent_sets_won": 4,
      "status": "Completed",
      "card_status": "COMP",
      "locked": false,
      "verified_by": null,
      "verified_at": null,
      "date": "2025-12-01"
    }
  ],
  "summary": {
    "total": 10,
    "pending": 3,
    "completed": 5,
    "verified": 2,
    "voided": 0
  }
}
```

#### 1.2 Verify Current Endpoint Status
- ✅ `POST /v1/solo-matches/{id}/verify` - Already exists
- ✅ Lock/unlock/void actions supported
- ✅ Audit trail (lock_history) working

**Action:** No changes needed to existing verification endpoint

---

### Phase 2: Coach Verification Modal Extension

#### 2.1 Add Match Type Selector
**File:** `coach.html` (line ~441)

**Changes:**
- Add radio buttons or tabs above division selector:
  ```
  [○] Ranking Rounds  [●] Solo Matches  [○] Team Matches
  ```

#### 2.2 Update Selectors Based on Type
**File:** `js/coach.js`

**When "Solo Matches" selected:**
- Replace Division/Bale selectors with Event/Bracket selectors
- Event selector: Dropdown of active/completed events
- Bracket selector: Dropdown of solo brackets for selected event
- Add "All Brackets" option

#### 2.3 Add Solo Match Table Renderer
**File:** `js/coach.js`

**New Function:** `renderSoloMatchVerifyTable(matches)`

**Table Columns:**
- Match ID / Link
- Opponents (Archer 1 vs Archer 2)
- Sets Score (6-4 format)
- Status (Completed, In Progress)
- Card Status (PEND, COMP, VER, VOID)
- Locked Status (🔒 icon)
- Actions (Lock, Unlock, Void buttons)

#### 2.4 Add Solo Match Action Handlers
**File:** `js/coach.js`

**Reuse existing pattern:**
```javascript
async function handleSoloMatchVerification(matchId, action) {
  const { verifiedBy, notes } = getVerifyInputs();
  await req(`/solo-matches/${matchId}/verify`, 'POST', {
    action, // 'lock', 'unlock', 'void'
    verifiedBy,
    notes
  });
  await loadSoloMatchesForVerification(); // Reload table
}
```

---

### Phase 3: ScoreCard Editor Extension

#### 3.1 Add Match Parameter Support
**File:** `scorecard_editor.html` (line ~344)

**Current:**
```javascript
const roundArcherId = urlParams.get('id');
```

**Change to:**
```javascript
const roundArcherId = urlParams.get('id');
const soloMatchId = urlParams.get('match') || urlParams.get('soloMatchId');
const matchType = soloMatchId ? 'solo_match' : 'ranking_round';
```

#### 3.2 Add Solo Match Loader
**File:** `scorecard_editor.html`

**New Function:**
```javascript
async function loadSoloMatch() {
  try {
    const res = await fetch(`${API_BASE}/solo-matches/${soloMatchId}`);
    if (!res.ok) throw new Error(`Failed to load match: ${res.status}`);
    
    const data = await res.json();
    currentMatch = data.match;
    renderSoloMatchScorecard();
    
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('scorecard-container').classList.remove('hidden');
  } catch (error) {
    showError(error.message);
  }
}
```

#### 3.3 Add Solo Match Renderer
**File:** `scorecard_editor.html`

**New Function:** `renderSoloMatchScorecard()`

**Display Format:**
- Match Header:
  - Archer 1 Name vs Archer 2 Name
  - Event Name / Bracket Name
  - Status Badge (PEND, COMP, VER, VOID)
- Sets Table:
  - Each set as row (Set 1, Set 2, ..., Set N, Shoot-off)
  - Columns: Set # | Archer 1 Score | Archer 2 Score | Set Points (Archer 1) | Set Points (Archer 2)
  - Running totals
- Match Summary:
  - Total Sets Won (Archer 1 vs Archer 2)
  - Match Winner
  - Final Score
- Lock Controls:
  - Same as ranking rounds (Unlock, Verify, Void, Delete)
  - Reuse existing button handlers
  - Call `/v1/solo-matches/{id}/verify` endpoint

#### 3.4 Add Solo Match Score Editing
**File:** `scorecard_editor.html`

**Challenge:** Solo match scoring is set-based, not end-based

**Approach:**
- Load set data from `/v1/solo-matches/{id}` (includes `sets` array)
- Render editable set scores when unlocked
- Save changes to `/v1/solo-matches/{id}/sets` or include in match update
- Use same bottom sheet keypad for score input

**API Endpoint Needed:**
```php
PUT /v1/solo-matches/{id}/sets
Body: { sets: [{ set_number: 1, archer1_score: 28, archer2_score: 27, ... }] }
```

**OR** (Simpler approach):
- Use existing `PATCH /v1/solo-matches/{id}` endpoint
- Include full sets array in update

---

### Phase 4: Integration Points

#### 4.1 Link from Coach Verification Modal
**File:** `js/coach.js`

**Add link in match table:**
```javascript
<a href="scorecard_editor.html?match=${match.match_id}&mode=coach">
  View/Edit
</a>
```

#### 4.2 Link from Event Dashboard
**File:** `event_dashboard.html`

**In bracket details:**
- Show list of matches for bracket
- Add "Verify" link: `scorecard_editor.html?match={matchId}&mode=coach`

#### 4.3 Link from Archer History
**File:** `archer_history.html`

**Current:** Solo matches show in history with modal view  
**Enhancement:** Add "Edit" link for coaches:
```javascript
if (isCoach && match.card_status !== 'VER') {
  // Show edit link
  link = `scorecard_editor.html?match=${match.match_id}&mode=coach`;
}
```

---

## 🎨 UI/UX Considerations

### Mobile-First Design (99% phone usage)

1. **Verification Modal:**
   - Match table: Single column on mobile, stack vertically
   - Actions: Full-width buttons on mobile
   - Scrollable table container

2. **ScoreCard Editor:**
   - Sets table: Single column or horizontal scroll
   - Lock controls: Stack vertically on mobile
   - Bottom sheet keypad: Already mobile-optimized

### Status Badge Consistency

**Follow existing patterns:**
- PEND = Yellow/Warning badge
- COMP = Blue/Primary badge
- VER = Green/Success badge with ✓
- VOID = Gray badge with ✗

### Touch Targets

- Minimum 44px height for all buttons
- Adequate spacing between action buttons
- Clear visual feedback on tap

---

## 📋 Testing Checklist

### Backend API Testing

- [ ] `GET /v1/events/{eventId}/solo-matches` returns correct matches
- [ ] Filters (bracket_id, status, locked, card_status) work correctly
- [ ] Response format matches specification
- [ ] `POST /v1/solo-matches/{id}/verify` works for lock/unlock/void
- [ ] Audit trail (lock_history) updates correctly
- [ ] Standalone matches (no event_id) excluded from verification

### Coach Verification Modal Testing

- [ ] Match type selector (Ranking Rounds / Solo Matches) works
- [ ] Event/Bracket selectors appear when Solo Matches selected
- [ ] Match table displays correctly
- [ ] Lock/Unlock/Void actions work
- [ ] Table refreshes after verification actions
- [ ] Mobile layout responsive

### ScoreCard Editor Testing

- [ ] Loads solo match via `?match={id}` parameter
- [ ] Renders match format correctly (sets, scores)
- [ ] Lock controls appear for coaches
- [ ] Unlock allows editing
- [ ] Verify locks match and updates status
- [ ] Void marks match as VOID
- [ ] Score editing works (if implemented)
- [ ] Verification history displays correctly
- [ ] Mobile layout responsive

### Integration Testing

- [ ] Links from coach modal to scorecard editor work
- [ ] Links from event dashboard work
- [ ] Links from archer history work (coach mode)
- [ ] Back navigation works correctly

---

## 🚀 Implementation Order

### Step 1: Backend API (2-3 hours)
1. Implement `GET /v1/events/{eventId}/solo-matches` endpoint
2. Test with existing solo match data
3. Verify filters work correctly

### Step 2: Coach Verification Modal (3-4 hours)
1. Add match type selector
2. Update selectors for solo matches
3. Add match table renderer
4. Add action handlers
5. Test end-to-end verification flow

### Step 3: ScoreCard Editor - View Only (2-3 hours)
1. Add match parameter support
2. Add solo match loader
3. Add solo match renderer (read-only)
4. Add lock controls
5. Test verification actions

### Step 4: ScoreCard Editor - Editing (3-4 hours)
1. Add score editing capability
2. Add set score update endpoint (or use existing PATCH)
3. Test score updates
4. Test verification after editing

### Step 5: Integration & Polish (1-2 hours)
1. Add links from various entry points
2. Test all navigation paths
3. Mobile responsiveness testing
4. Documentation updates

**Total Estimated Time:** 11-16 hours

---

## 📚 Related Documentation

- [BALE_GROUP_SCORING_WORKFLOW.md](../core/BALE_GROUP_SCORING_WORKFLOW.md) - Verification workflow principles
- [SCORECARD_STATUS_WORKFLOW.md](../features/ranking-rounds/SCORECARD_STATUS_WORKFLOW.md) - Status definitions
- [MATCH_TRACKING_FEATURE_ANALYSIS.md](MATCH_TRACKING_FEATURE_ANALYSIS.md) - Solo match history implementation
- [VIEWING_MATCH_RESULTS.md](../features/brackets/VIEWING_MATCH_RESULTS.md) - Match viewing in coach console

---

## 🔗 Key Files to Modify

### Backend
- `api/index.php` - Add `GET /v1/events/{eventId}/solo-matches` endpoint

### Frontend - Coach Console
- `coach.html` - Add match type selector to verification modal
- `js/coach.js` - Add solo match verification logic

### Frontend - ScoreCard Editor
- `scorecard_editor.html` - Add solo match support

### Frontend - Event Dashboard (Optional)
- `event_dashboard.html` - Add match verification links

---

## ✅ Success Criteria

1. **Verification Flow:**
   - ✅ Coach can list solo matches for an event/bracket
   - ✅ Coach can verify (lock) completed solo matches
   - ✅ Coach can unlock verified matches for editing
   - ✅ Coach can void incomplete/invalid matches
   - ✅ All actions logged in audit trail

2. **ScoreCard Editor:**
   - ✅ Coach can view solo match details
   - ✅ Coach can edit scores (when unlocked)
   - ✅ Coach can verify/unlock/void matches
   - ✅ Verification history displays correctly
   - ✅ Mobile layout works correctly

3. **Integration:**
   - ✅ Links work from coach console
   - ✅ Links work from event dashboard
   - ✅ Links work from archer history (coach mode)

---

## 🎯 Next Steps

1. **Review this analysis** with development team
2. **Confirm approach** (Option A recommended)
3. **Prioritize features** (View-only first, editing second)
4. **Create implementation branch:** `feature/solo-match-verification`
5. **Start with Phase 1** (Backend API)

---

**Last Updated:** December 1, 2025  
**Next Review:** After Phase 1 completion

