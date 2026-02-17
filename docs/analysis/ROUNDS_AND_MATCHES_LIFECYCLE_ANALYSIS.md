# Rounds and Matches Status Lifecycle Analysis

**Date:** December 2025  
**Purpose:** Comprehensive analysis of rounds and matches types, their status lifecycle, and when they should be displayed in work queues

---

## Table of Contents

1. [Types of Rounds and Matches](#types-of-rounds-and-matches)
2. [Status Lifecycle Overview](#status-lifecycle-overview)
3. [Ranking Rounds Lifecycle](#ranking-rounds-lifecycle)
4. [Solo Matches Lifecycle](#solo-matches-lifecycle)
5. [Team Matches Lifecycle](#team-matches-lifecycle)
6. [Display Logic by Context](#display-logic-by-context)
7. [Recommendations](#recommendations)

---

## Types of Rounds and Matches

### 1. Ranking Rounds

**Database Table:** `rounds`  
**Card Table:** `round_archers` (one card per archer per round)

**Types:**
- **R300**: 10 ends, 3 arrows per end (30 arrows total)
- **R360**: 12 ends, 3 arrows per end (36 arrows total)

**Divisions:**
- **BVAR** (Boys Varsity)
- **BJV** (Boys Junior Varsity)
- **GVAR** (Girls Varsity)
- **GJV** (Girls Junior Varsity)

**Characteristics:**
- One round per division per event
- Multiple archers per round (assigned to bales)
- Each archer has their own scorecard (`round_archers` record)
- Round-level status is aggregate of all scorecards

### 2. Solo Matches

**Database Table:** `solo_matches`  
**Participants Table:** `solo_match_archers` (2 archers per match)

**Types:**
- **SOLO_OLYMPIC**: Best of 5 sets (first to 3 wins)
  - Each set: 3 arrows per archer
  - First to 6 set points wins match
  - Shoot-off if tied at 5-5

**Characteristics:**
- Head-to-head competition between 2 archers
- Match-level status (not per-archer cards)
- Part of elimination brackets or standalone matches

### 3. Team Matches

**Database Table:** `team_matches`  
**Participants Table:** `team_match_teams` (2 teams) + `team_match_archers` (3 archers per team)

**Types:**
- **TEAM_OLYMPIC**: Best of 4 sets (first to 5 set points wins)
  - Each set: 2 arrows per archer (3 archers = 6 arrows total per team)
  - First to 5 set points wins match
  - Shoot-off if tied at 4-4

**Characteristics:**
- Team vs team competition (3 archers per team)
- Match-level status (not per-archer cards)
- Part of elimination brackets or standalone matches

---

## Status Lifecycle Overview

### Two-Level Status System

The system uses **two levels of status**:

1. **Card/Match Status** (`card_status`): Individual scorecard or match status
   - Values: `PENDING`, `COMPLETED`, `VERIFIED`, `VOID`
   - Stored in: `round_archers.card_status`, `solo_matches.card_status`, `team_matches.card_status`

2. **Round/Match Status** (`status`): Aggregate round or match status
   - Values: `Not Started`, `In Progress`, `Completed`, `Voided`
   - Stored in: `rounds.status`, `solo_matches.status`, `team_matches.status`

### Status Definitions

| Status | Code | Meaning | Editable | Visible in Results |
|--------|------|---------|----------|-------------------|
| **PENDING** | `PENDING` / `PEND` | Card/match in progress, scores being entered | ✅ Yes | ✅ Yes |
| **COMPLETED** | `COMP` / `COMPLETED` | Card/match finished by scorer, awaiting verification | ✅ Yes (coach only) | ✅ Yes |
| **VERIFIED** | `VER` / `VERIFIED` | Card/match verified by coach, locked | ❌ No | ✅ Yes |
| **VOID** | `VOID` | Card/match marked invalid/incomplete | ❌ No | ❌ Hidden (unless filter) |

---

## Ranking Rounds Lifecycle

### Card-Level Status Flow (`round_archers.card_status`)

```
┌─────────┐
│ PENDING │  ← Scorer entering scores (10 ends for R300, 12 for R360)
└────┬────┘
     │
     │ Scorer marks card as "Complete" (all ends scored)
     │ Action: Click "Complete" button in card view
     │
     ▼
┌─────────┐
│  COMP   │  ← Card complete, awaiting coach verification
│         │     - All 10/12 ends fully scored
│         │     - Scorer has verified digital vs paper
└────┬────┘
     │
     │ Coach verifies digital vs paper card
     │ Action: Coach clicks "Verify" in coach console or ScorecardEditor
     │
     ▼
┌─────────┐
│   VER   │  ← Card verified and locked (no more edits)
│         │     - locked = true
│         │     - verified_by = coach name
│         │     - verified_at = timestamp
└─────────┘

Alternative paths:
┌─────────┐
│ PENDING │
└────┬────┘
     │
     │ Coach marks as invalid
     │ Action: Coach clicks "Void" in coach console or ScorecardEditor
     │
     ▼
┌─────────┐
│  VOID   │  ← Card voided, hidden from leaderboards
│         │     - locked = true
│         │     - card_status = 'VOID'
└─────────┘
```

### Round-Level Status Flow (`rounds.status`)

**Calculated dynamically** based on scorecard states:

```javascript
// From api/index.php lines 3469-3479
if (total === 0) {
    status = 'Not Started';
} else if (completed === total && total > 0) {
    status = 'Completed';  // All scorecards completed
} else if (started > 0) {
    status = 'In Progress';  // At least one scorecard has scores
} else {
    status = 'Not Started';
}
```

**Status Transitions:**
- **Not Started** → **In Progress**: First score entered in any scorecard
- **In Progress** → **Completed**: All scorecards completed (or verified)
- **Completed** → **Voided**: If all scorecards are voided (rare)

**Note:** Round status can also be manually set to `Voided` during bulk verification.

---

## Solo Matches Lifecycle

### Match-Level Status Flow (`solo_matches.card_status` + `solo_matches.status`)

```
┌─────────┐
│ PENDING │  ← Match in progress, scores being entered
│         │     status = 'In Progress'
└────┬────┘
     │
     │ Match complete (all sets finished, winner determined)
     │ Action: Scorer marks match as "Complete"
     │
     ▼
┌─────────┐
│  COMP    │  ← Match complete, awaiting coach verification
│          │     status = 'Completed'
└────┬────┘
     │
     │ Coach verifies match results
     │ Action: Coach clicks "Verify" in coach console
     │
     ▼
┌─────────┐
│   VER   │  ← Match verified and locked
│         │     status = 'Completed'
│         │     locked = true
└─────────┘

Alternative:
┌─────────┐
│ PENDING │
└────┬────┘
     │
     │ Coach marks as invalid
     │
     ▼
┌─────────┐
│  VOID   │  ← Match voided
│         │     status = 'Voided'
└─────────┘
```

**Status Field Usage:**
- `solo_matches.status`: `Not Started`, `In Progress`, `Completed`, `Voided`
- `solo_matches.card_status`: `PENDING`, `COMPLETED`, `VERIFIED`, `VOID`

**Match Completion Logic:**
- Match is complete when: `sets_won >= 6` OR `opponent_sets_won >= 6`
- Status transitions from `Not Started` → `In Progress` when first set is scored
- Status transitions to `Completed` when match winner is determined

---

## Team Matches Lifecycle

### Match-Level Status Flow (`team_matches.card_status` + `team_matches.status`)

```
┌─────────┐
│ PENDING │  ← Match in progress, scores being entered
│         │     status = 'In Progress'
└────┬────┘
     │
     │ Match complete (all sets finished, winner determined)
     │ Action: Scorer marks match as "Complete"
     │
     ▼
┌─────────┐
│  COMP    │  ← Match complete, awaiting coach verification
│          │     status = 'Completed'
└────┬────┘
     │
     │ Coach verifies match results
     │ Action: Coach clicks "Verify" in coach console
     │
     ▼
┌─────────┐
│   VER   │  ← Match verified and locked
│         │     status = 'Completed'
│         │     locked = true
└─────────┘

Alternative:
┌─────────┐
│ PENDING │
└────┬────┘
     │
     │ Coach marks as invalid
     │
     ▼
┌─────────┐
│  VOID   │  ← Match voided
│         │     status = 'Voided'
└─────────┘
```

**Status Field Usage:**
- `team_matches.status`: `Not Started`, `In Progress`, `Completed`, `Voided`
- `team_matches.card_status`: `PENDING`, `COMPLETED`, `VERIFIED`, `VOID`

**Match Completion Logic:**
- Match is complete when: `sets_won >= 5` OR `opponent_sets_won >= 5`
- Status transitions from `Not Started` → `In Progress` when first set is scored
- Status transitions to `Completed` when match winner is determined

---

## Display Logic by Context

### 1. Archer Home Page (`index.html`) - "My Assignments"

**Purpose:** Show archers what they need to work on

**Current Logic (lines 585-624):**

#### Ranking Rounds:
```javascript
const openRounds = rankingRounds.filter(round => {
  const endsCompleted = parseInt(round.ends_completed || 0);
  const hasIncompleteEnds = endsCompleted < 10;
  const isToday = round.event_date === new Date().toISOString().slice(0, 10);
  const shouldShow = hasIncompleteEnds || (isToday && endsCompleted > 0);
  return shouldShow;
});
```

**Should Show When:**
- ✅ `card_status = PENDING` AND `ends_completed < 10` (incomplete)
- ✅ `card_status = COMPLETED` AND `ends_completed < 10` (can still edit)
- ✅ `card_status = PENDING` AND `isToday` AND `ends_completed > 0` (today's work)
- ❌ `card_status = VERIFIED` (locked, no edits)
- ❌ `card_status = VOID` (voided, hidden)

**Recommendation:**
- Show: `card_status IN ('PENDING', 'COMPLETED')` AND `ends_completed < 10`
- Also show today's matches even if complete (for quick access)

#### Solo Matches:
```javascript
const openSoloMatches = soloMatches.filter(match => {
  const setsWon = parseInt(match.sets_won || 0);
  const opponentSetsWon = parseInt(match.opponent_sets_won || 0);
  const isComplete = setsWon >= 6 || opponentSetsWon >= 6;
  const isToday = match.event_date === new Date().toISOString().slice(0, 10);
  const hasStarted = setsWon > 0 || opponentSetsWon > 0;
  
  return !isComplete || (isToday && hasStarted);
});
```

**Should Show When:**
- ✅ `card_status = PENDING` AND match not complete (sets < 6)
- ✅ `card_status = COMPLETED` AND match not verified (can still edit)
- ✅ `card_status = PENDING` AND `isToday` AND `hasStarted` (today's work)
- ❌ `card_status = VERIFIED` (locked)
- ❌ `card_status = VOID` (voided)

**Recommendation:**
- Show: `card_status IN ('PENDING', 'COMPLETED')` AND `(sets_won < 6 AND opponent_sets_won < 6)`
- Also show today's matches even if complete (for quick access)

#### Team Matches:
- Similar logic to Solo Matches
- Show when: `card_status IN ('PENDING', 'COMPLETED')` AND match not complete

---

### 2. Coach Console (`coach.html`) - Verification Queue

**Purpose:** Show coaches what needs verification

**Current Logic (lines 611-629):**

```javascript
const statusOrder = { 'PENDING': 0, 'VER': 1, 'VOID': 2 };
archers.sort((a, b) => {
  const statusA = (a.cardStatus || 'PENDING').toUpperCase();
  const statusB = (b.cardStatus || 'PENDING').toUpperCase();
  if (statusOrder[statusA] !== statusOrder[statusB]) {
    return statusOrder[statusA] - statusOrder[statusB];
  }
  return (a.target || '').localeCompare(b.target || '');
});
```

**Should Show When:**
- ✅ `card_status = PENDING` (needs work or verification)
- ✅ `card_status = COMPLETED` (needs verification) ⚠️ **Currently missing from statusOrder**
- ✅ `card_status = VERIFIED` (already verified, for reference)
- ✅ `card_status = VOID` (voided cards, for reference)

**Recommendation:**
- Show all cards, but prioritize:
  1. `COMPLETED` (awaiting verification)
  2. `PENDING` (in progress)
  3. `VERIFIED` (already done)
  4. `VOID` (voided)

**Status Order Should Be:**
```javascript
const statusOrder = { 
  'COMPLETED': 0,  // Highest priority - needs verification
  'PENDING': 1,    // In progress
  'VERIFIED': 2,   // Already done
  'VOID': 3        // Voided
};
```

---

### 3. Event Dashboard (`event_dashboard.html`) - Round Overview

**Purpose:** Show event-level progress and status

**Current Logic (lines 273-352):**

Shows all rounds with:
- Round status: `Not Started`, `In Progress`, `Completed`
- Progress percentage
- Scorecard counts (completed/started/not started)

**Should Show:**
- ✅ All rounds regardless of status
- ✅ Round-level status (`rounds.status`)
- ✅ Aggregate statistics (completed scorecards, progress)

**Recommendation:**
- Show all rounds
- Use round-level status (`Not Started`, `In Progress`, `Completed`, `Voided`)
- Display progress indicators
- Link to verification queue for rounds with `COMPLETED` cards

---

### 4. Results Page (`results.html`) - Leaderboards

**Purpose:** Display final/current standings

**Current Logic (lines 201-207):**

```javascript
function filterArchersForDisplay(archers = []) {
  return archers.filter(a => {
    const status = getCardStatus(a);
    if (!showVoided && status === 'VOID') return false;
    return true;
  });
}
```

**Should Show:**
- ✅ `card_status = PENDING` (in progress)
- ✅ `card_status = COMPLETED` (complete, awaiting verification)
- ✅ `card_status = VERIFIED` (verified, final)
- ❌ `card_status = VOID` (hidden unless filter enabled)

**Recommendation:**
- Show all non-voided cards by default
- Allow filter to show voided cards
- Sort by status: `VERIFIED` → `COMPLETED` → `PENDING`

---

### 5. Scorecard Editor (`scorecard_editor.html`) - Individual Card Editing

**Purpose:** Edit individual scorecards

**Should Show:**
- ✅ All cards (coach can view/edit any card)
- ✅ Status badge shows current `card_status`
- ✅ Lock controls based on `card_status`:
  - `PENDING`: Can edit, can complete, can verify, can void
  - `COMPLETED`: Can edit (coach), can verify, can void
  - `VERIFIED`: Can unlock (coach), can void
  - `VOID`: Can unlock (coach), can restore

**Current Implementation:**
- ✅ Shows all cards
- ✅ Status-based lock controls
- ✅ Verification history

---

## Recommendations

### 1. Archer Home Page - Work Queue

**Show Ranking Rounds When:**
- `card_status IN ('PENDING', 'COMPLETED')` 
- AND `ends_completed < 10` (for R300) or `ends_completed < 12` (for R360)
- OR `isToday` AND `ends_completed > 0` (today's work, even if complete)

**Show Solo/Team Matches When:**
- `card_status IN ('PENDING', 'COMPLETED')`
- AND match not complete (`sets_won < 6` for solo, `sets_won < 5` for team)
- OR `isToday` AND `hasStarted` (today's matches)

**Hide When:**
- `card_status = VERIFIED` (locked, no work needed)
- `card_status = VOID` (voided, hidden)

---

### 2. Coach Console - Verification Queue

**Show All Cards, Prioritize:**
1. **COMPLETED** - Needs verification (highest priority)
2. **PENDING** - In progress (may need attention)
3. **VERIFIED** - Already verified (for reference)
4. **VOID** - Voided (for reference)

**Filter Options:**
- Show only `COMPLETED` (verification needed)
- Show only `PENDING` (in progress)
- Show all (default)

**Sort Order:**
- Primary: Status (COMPLETED → PENDING → VERIFIED → VOID)
- Secondary: Target assignment (A, B, C...)
- Tertiary: Bale number

---

### 3. Event Dashboard - Round Status

**Show Round Status:**
- `Not Started`: No scorecards started
- `In Progress`: Some scorecards started, not all complete
- `Completed`: All scorecards complete/verified
- `Voided`: All scorecards voided (rare)

**Display Logic:**
- Show all rounds
- Highlight rounds with `COMPLETED` cards needing verification
- Show progress percentage
- Link to verification queue

---

### 4. Results Page - Leaderboards

**Show Cards:**
- All cards with `card_status != 'VOID'` (default)
- Option to show `VOID` cards with filter

**Sort Order:**
- By score (descending)
- Within same score: `VERIFIED` → `COMPLETED` → `PENDING`

---

### 5. Status Transition Rules

**Ranking Rounds:**
- `PENDING` → `COMPLETED`: Scorer marks complete (all ends scored)
- `COMPLETED` → `VERIFIED`: Coach verifies
- `PENDING` → `VOID`: Coach voids
- `COMPLETED` → `VOID`: Coach voids
- `VERIFIED` → `PENDING`: Coach unlocks (rare, for corrections)

**Solo/Team Matches:**
- `PENDING` → `COMPLETED`: Match complete (winner determined)
- `COMPLETED` → `VERIFIED`: Coach verifies
- `PENDING` → `VOID`: Coach voids
- `COMPLETED` → `VOID`: Coach voids
- `VERIFIED` → `PENDING`: Coach unlocks (rare, for corrections)

---

## Implementation Notes

### Current Issues

1. **Coach Console Missing COMP Status:**
   - `statusOrder` doesn't include `COMPLETED`
   - Should prioritize `COMPLETED` cards for verification

2. **Archer Home Page Logic:**
   - Currently filters by `ends_completed < 10`
   - Should also consider `card_status`
   - Should show `COMPLETED` cards that can still be edited

3. **Round Status Calculation:**
   - Currently based on scorecard completion
   - Should also consider `card_status` (all `VERIFIED` = round complete)

### Recommended Changes

1. **Update Coach Console Status Order:**
   ```javascript
   const statusOrder = { 
     'COMPLETED': 0,  // Highest priority
     'PENDING': 1,
     'VERIFIED': 2,
     'VOID': 3
   };
   ```

2. **Update Archer Home Page Filter:**
   ```javascript
   const shouldShow = (
     (card_status === 'PENDING' || card_status === 'COMPLETED') &&
     ends_completed < 10
   ) || (
     isToday && ends_completed > 0
   );
   ```

3. **Update Round Status Calculation:**
   ```javascript
   // Consider card_status when calculating round status
   const allVerified = scorecards.every(c => c.card_status === 'VERIFIED');
   const allCompleted = scorecards.every(c => 
     c.card_status === 'COMPLETED' || c.card_status === 'VERIFIED'
   );
   
   if (allVerified) status = 'Completed';
   else if (allCompleted) status = 'Completed'; // Awaiting verification
   else if (started > 0) status = 'In Progress';
   else status = 'Not Started';
   ```

---

## Summary

### Status Lifecycle Summary

| Type | Card Status Flow | Round/Match Status Flow |
|------|-----------------|------------------------|
| **Ranking Rounds** | PENDING → COMP → VER (or VOID) | Not Started → In Progress → Completed |
| **Solo Matches** | PENDING → COMP → VER (or VOID) | Not Started → In Progress → Completed |
| **Team Matches** | PENDING → COMP → VER (or VOID) | Not Started → In Progress → Completed |

### Display Rules Summary

| Context | Show PENDING | Show COMP | Show VER | Show VOID |
|---------|-------------|-----------|----------|-----------|
| **Archer Home** | ✅ (incomplete) | ✅ (incomplete) | ❌ | ❌ |
| **Coach Console** | ✅ (priority 2) | ✅ (priority 1) | ✅ (reference) | ✅ (reference) |
| **Event Dashboard** | ✅ (all rounds) | ✅ (all rounds) | ✅ (all rounds) | ✅ (all rounds) |
| **Results Page** | ✅ | ✅ | ✅ | ❌ (filter) |
| **Scorecard Editor** | ✅ | ✅ | ✅ | ✅ |

---

**Last Updated:** December 2025  
**Related Documents:**
- `docs/features/ranking-rounds/SCORECARD_STATUS_WORKFLOW.md`
- `docs/features/ranking-rounds/RANKING_ROUND_STATUS_WORKFLOW.md`

