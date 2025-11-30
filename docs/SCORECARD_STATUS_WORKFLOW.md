# Scorecard Status Workflow - Master Reference

**Status:** ✅ Authoritative Document  
**Date:** December 2025  
**Version:** 1.0  
**Last Updated:** December 2025

> **This is the definitive reference for scorecard status workflows across all modules.**  
> All other documentation should reference this document.

---

## 📋 Table of Contents

1. [Status Values & Definitions](#status-values--definitions)
2. [Status Transition Flows](#status-transition-flows)
3. [Ranking Round Status Workflow](#ranking-round-status-workflow)
4. [Solo Match Status Workflow](#solo-match-status-workflow)
5. [Team Match Status Workflow](#team-match-status-workflow)
6. [ScorecardEditor Workflow](#scorecardeditor-workflow)
7. [Common Card Component](#common-card-component)
8. [Implementation Details](#implementation-details)
9. [Cross-Module Consistency](#cross-module-consistency)

---

## Status Values & Definitions

### Standard Status Values

| Status | Code | Meaning | Color | Editable | Visible in Results |
|--------|------|---------|-------|----------|-------------------|
| **PENDING** | `PENDING` / `PEND` | Card in progress, scores being entered | Yellow/Warning | ✅ Yes | ✅ Yes |
| **COMPLETED** | `COMP` / `COMPLETED` | Card finished by scorer, awaiting verification | Blue/Primary | ✅ Yes (coach only) | ✅ Yes |
| **VERIFIED** | `VER` / `VERIFIED` | Card verified by coach, locked | Green/Success | ❌ No | ✅ Yes |
| **VOID** | `VOID` | Card marked invalid/incomplete | Red/Danger | ❌ No | ❌ Hidden (unless filter) |

### Status Display Conventions

- **Database:** Use full names (`PENDING`, `COMPLETED`, `VERIFIED`, `VOID`)
- **UI Display:** Use short codes (`PEND`, `COMP`, `VER`, `VOID`)
- **API Responses:** Can use either, but prefer full names for consistency

---

## Status Transition Flows

### Ranking Round Flow

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

### Solo Match Flow

```
┌─────────┐
│ PENDING │  ← Match in progress, scores being entered
└────┬────┘
     │
     │ Match complete (all sets finished)
     │ Action: Scorer marks match as "Complete"
     │
     ▼
┌─────────┐
│  COMP   │  ← Match complete, awaiting coach verification
└────┬────┘
     │
     │ Coach verifies match results
     │ Action: Coach clicks "Verify" in coach console
     │
     ▼
┌─────────┐
│   VER   │  ← Match verified and locked
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
└─────────┘
```

### Team Match Flow

```
┌─────────┐
│ PENDING │  ← Match in progress, scores being entered
└────┬────┘
     │
     │ Match complete (all sets finished)
     │ Action: Scorer marks match as "Complete"
     │
     ▼
┌─────────┐
│  COMP   │  ← Match complete, awaiting coach verification
└────┬────┘
     │
     │ Coach verifies match results
     │ Action: Coach clicks "Verify" in coach console
     │
     ▼
┌─────────┐
│   VER   │  ← Match verified and locked
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
└─────────┘
```

---

## Ranking Round Status Workflow

### User Story
> After Ranking Round 10 ends, archers go to the cards to verify the digital vs the paper card.  
> We want to have a "Complete" status from the scorer, that can be "Verified" by the Coaches.  
> There should also be "Next" and "Prev" to cycle through the cards.

### Implementation Requirements

#### 1. Card View (Not Modal)
- **Location:** `ranking_round_300.html` - `#card-view` div (currently hidden)
- **Current State:** Uses `ScorecardView.showScorecardModal()` (modal)
- **Required:** Switch to full card view using `ScorecardView.renderScorecard()`

#### 2. Complete Button (Scorer)
- **Location:** Card view footer
- **Visibility:** Only when all 10 ends are fully scored
- **Action:** Updates `card_status` to `COMP` via API
- **API Endpoint:** `PATCH /round_archers/{id}/status` with `{ cardStatus: 'COMP' }`

#### 3. Prev/Next Navigation
- **Location:** Card view footer (`#prev-archer-btn`, `#next-archer-btn`)
- **Functionality:** Cycle through all archers in current bale
- **State:** `state.currentArcherId` tracks current archer

#### 4. Status Display
- **Location:** Card view header
- **Display:** Status badge showing PEND/COMP/VER/VOID
- **Color Coding:** Yellow/Blue/Green/Red per status definitions

### Code Locations

- **HTML:** `ranking_round_300.html` lines 336-363
- **JavaScript:** `js/ranking_round_300.js` lines 2998-3030
- **Status Logic:** `js/ranking_round_300.js` lines 1807-1820, 2726-2739

---

## Solo Match Status Workflow

### Status Transitions

1. **PENDING** → Match created, scores being entered
2. **COMP** → Match complete (all sets finished), scorer marks complete
3. **VER** → Coach verifies match results
4. **VOID** → Coach marks match as invalid

### Implementation Notes

- **File:** `js/solo_card.js`
- **Status Field:** `cardStatus` or `status` in match data
- **Complete Action:** Scorer marks match complete when all sets finished
- **Verify Action:** Coach verifies in coach console or ScorecardEditor

### Future Enhancements

- Add "Complete" button in Solo match view
- Add status badge display
- Add Prev/Next navigation for multi-match events

---

## Team Match Status Workflow

### Status Transitions

1. **PENDING** → Match created, scores being entered
2. **COMP** → Match complete (all sets finished), scorer marks complete
3. **VER** → Coach verifies match results
4. **VOID** → Coach marks match as invalid

### Implementation Notes

- **File:** `js/team_card.js`
- **Status Field:** `cardStatus` or `status` in match data
- **Complete Action:** Scorer marks match complete when all sets finished
- **Verify Action:** Coach verifies in coach console or ScorecardEditor

### Future Enhancements

- Add "Complete" button in Team match view
- Add status badge display
- Add Prev/Next navigation for multi-match events

---

## ScorecardEditor Workflow

### Overview

**File:** `scorecard_editor.html`  
**Purpose:** Dedicated page for coaches to view and edit scorecards  
**Access:** `scorecard_editor.html?id={roundArcherId}&mode=coach`

### Status Display

**Location:** Line 138 - `#status-badge` div

```javascript
// Status badge rendering (lines 532-542)
if (card.card_status === 'VER') {
  statusBadge.innerHTML = '<span class="...bg-success...">✓ VERIFIED</span>';
} else if (card.card_status === 'VOID') {
  statusBadge.innerHTML = '<span class="...bg-gray-500...">✗ VOID</span>';
} else if (card.completed) {
  statusBadge.innerHTML = '<span class="...bg-primary...">COMPLETED</span>';
} else {
  statusBadge.innerHTML = '<span class="...bg-warning...">PENDING</span>';
}
```

### Lock Controls (Coach Only)

**Location:** Lines 143-160 - `#lock-controls` div

**Buttons:**
- **Unlock** (when locked): Unlocks card for editing
- **Lock & Save** (when unlocked): Saves changes and locks card (sets to VER)
- **Void**: Marks card as VOID
- **Delete**: Permanently deletes card (only unlocked/abandoned cards)

### Status Transitions in ScorecardEditor

1. **VER → PENDING**: Coach clicks "Unlock" → `action: 'unlock'` → `card_status: 'PENDING'`, `locked: false`
2. **PENDING → VER**: Coach edits scores → clicks "Lock & Save" → saves scores → `action: 'lock'` → `card_status: 'VER'`, `locked: true`
3. **Any → VOID**: Coach clicks "Void" → `action: 'void'` → `card_status: 'VOID'`, `locked: true`

### Verification History

**Location:** Lines 192-198 - `#verification-history` div

- Displays `lock_history` JSON array
- Shows all lock/unlock/void actions with timestamps
- Format: `{ action: 'lock'|'unlock'|'void', actor: string, timestamp: ISO, notes: string }`

---

## Common Card Component

### Overview

**File:** `js/scorecard_view.js`  
**Component:** `ScorecardView`  
**Usage:** Used by `results.html`, `archer_history.html`, `ranking_round_300.js`

### Methods

#### `ScorecardView.showScorecardModal(archerData, roundData, options)`
- **Purpose:** Display scorecard in modal overlay
- **Used By:** `results.html`, `archer_history.html`, `ranking_round_300.js` (currently)
- **Parameters:**
  - `archerData`: `{ id, firstName, lastName, school, level, gender, scores, cardStatus, verified, completed }`
  - `roundData`: `{ totalEnds, eventName, division, roundType }`
  - `options`: `{ onClose: function }`

#### `ScorecardView.renderScorecard(archerData, roundData, options)`
- **Purpose:** Generate HTML string for scorecard
- **Used By:** Should be used by `ranking_round_300.js` for full card view
- **Returns:** HTML string
- **Parameters:** Same as `showScorecardModal`

### Status Badge Rendering

**Location:** `js/scorecard_view.js` lines 70-74

```javascript
const statusBadge = archerData.verified 
  ? '<span class="...bg-success-light text-success-dark">VER</span>'
  : archerData.cardStatus === 'VOID' 
    ? '<span class="...bg-danger-light text-danger-dark">VOID</span>'
    : '<span class="...bg-warning-light text-warning-dark">PENDING</span>';
```

**Note:** Currently doesn't show COMP status. Should be updated to:

```javascript
const statusBadge = archerData.cardStatus === 'VER' || archerData.verified
  ? '<span class="...bg-success-light text-success-dark">VER</span>'
  : archerData.cardStatus === 'VOID'
    ? '<span class="...bg-danger-light text-danger-dark">VOID</span>'
    : archerData.cardStatus === 'COMP' || archerData.cardStatus === 'COMPLETED'
      ? '<span class="...bg-primary-light text-primary-dark">COMP</span>'
      : '<span class="...bg-warning-light text-warning-dark">PENDING</span>';
```

---

## Implementation Details

### Database Schema

**Table:** `round_archers` (Ranking Rounds)

```sql
card_status VARCHAR(20) DEFAULT 'PENDING' 
  COMMENT 'PENDING, COMPLETED, VERIFIED, VOID',
locked BOOLEAN DEFAULT FALSE,
verified_by VARCHAR(100) NULL,
verified_at TIMESTAMP NULL,
lock_history JSON NULL
```

**Table:** `solo_matches` (Solo Matches)

```sql
card_status VARCHAR(20) DEFAULT 'PENDING',
locked BOOLEAN DEFAULT FALSE,
verified_by VARCHAR(100) NULL,
verified_at TIMESTAMP NULL
```

**Table:** `team_matches` (Team Matches)

```sql
card_status VARCHAR(20) DEFAULT 'PENDING',
locked BOOLEAN DEFAULT FALSE,
verified_by VARCHAR(100) NULL,
verified_at TIMESTAMP NULL
```

### API Endpoints

#### Update Card Status
```
PATCH /round_archers/{id}/status
Body: { cardStatus: 'COMP' | 'VER' | 'VOID' | 'PENDING' }
```

#### Verification Actions (ScorecardEditor)
```
POST /round_archers/{id}/verify
Body: { 
  action: 'lock' | 'unlock' | 'void',
  notes: string
}
```

#### Update Scores (ScorecardEditor)
```
PUT /round_archers/{id}/scores
Body: { scores: array }
```

### Status Check Logic

```javascript
function getCardStatus(archer) {
  return ((archer.cardStatus || archer.status || 'PENDING') + '').toUpperCase();
}

function renderStatusText(status) {
  if (status === 'VER') return 'VER';
  else if (status === 'VOID') return 'VOID';
  else if (status === 'PENDING' || status === 'PEND') return 'PEND';
  else if (status === 'COMP' || status === 'COMPLETED') return 'COMP';
  else return 'PEND'; // Default
}
```

---

## Cross-Module Consistency

### Status Display Consistency

| Module | PENDING | COMP | VER | VOID |
|--------|---------|------|-----|------|
| **results.html** | ✅ PEND | ✅ COMP | ✅ VER | ✅ VOID |
| **archer_history.html** | ✅ PEND | ✅ COMP | ✅ VER | ✅ VOID |
| **coach.js** | ✅ PENDING | ⚠️ Missing | ✅ VER | ✅ VOID |
| **ranking_round_300.js** | ✅ PEND | ✅ COMP | ✅ VER | ✅ VOID |
| **scorecard_editor.html** | ✅ PENDING | ✅ COMPLETED | ✅ VERIFIED | ✅ VOID |
| **ScorecardView** | ✅ PENDING | ⚠️ Missing | ✅ VER | ✅ VOID |

### Required Updates

1. **coach.js** - Add COMP status display in verification table
2. **ScorecardView** - Add COMP status badge rendering
3. **ranking_round_300.js** - Switch from modal to full card view
4. **ranking_round_300.js** - Add "Complete" button for scorer
5. **ranking_round_300.js** - Wire up Prev/Next navigation

---

## Related Documentation

### Documents to Update

These documents should be updated to reference this master document:

1. **`docs/RANKING_ROUND_STATUS_WORKFLOW.md`** → Points to this document
2. **`docs/SPRINT_VERIFY_SCORECARDS.md`** → Points to this document
3. **`docs/BALE_GROUP_SCORING_WORKFLOW.md`** → Points to this document
4. **`docs/COACH_LIVE_UPDATES_IMPLEMENTATION_PLAN.md`** → Points to this document
5. **`docs/Feature_EventPlanning_Product.md`** → Points to this document (older design)

### Update Template

Add to the top of each document:

```markdown
> **Status Workflow Reference:**  
> For the authoritative status workflow documentation, see:  
> **[SCORECARD_STATUS_WORKFLOW.md](SCORECARD_STATUS_WORKFLOW.md)**
> 
> This document contains historical/implementation-specific details.  
> The master reference should be consulted for current status definitions.
```

---

## Testing Checklist

### Ranking Round Status Workflow
- [ ] Card view displays correctly (not modal)
- [ ] "Complete" button appears when all 10 ends are scored
- [ ] "Complete" button updates status to COMP
- [ ] Prev/Next buttons cycle through archers
- [ ] Status badge displays correctly (PEND/COMP/VER/VOID)
- [ ] Coach can verify COMP cards (COMP → VER)
- [ ] Verified cards are locked (no edits allowed)

### ScorecardEditor Workflow
- [ ] Status badge displays correctly
- [ ] Unlock button works (VER → PENDING)
- [ ] Lock & Save works (PENDING → VER)
- [ ] Void button works (Any → VOID)
- [ ] Verification history displays correctly
- [ ] Score editing works when unlocked

### Common Card Component
- [ ] Status badge shows COMP status
- [ ] Modal displays correctly in results.html
- [ ] Modal displays correctly in archer_history.html
- [ ] Status colors match definitions

### Solo/Team Match Status
- [ ] Status transitions work correctly
- [ ] Complete action updates status
- [ ] Verify action updates status
- [ ] Void action updates status

---

## Version History

- **v1.0** (December 2025) - Initial authoritative document
  - Consolidated status workflows from multiple documents
  - Added ScorecardEditor workflow
  - Added Common Card Component documentation
  - Added Solo/Team match status workflows
  - Defined cross-module consistency requirements

---

**Maintainer:** Development Team  
**Last Review:** December 2025  
**Next Review:** After implementation of Ranking Round card view changes

