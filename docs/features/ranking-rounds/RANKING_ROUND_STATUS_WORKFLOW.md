# Ranking Round Status Workflow

> **⚠️ Status Workflow Reference:**  
> For the authoritative status workflow documentation covering all modules (Ranking Rounds, Solo Matches, Team Matches, ScorecardEditor), see:  
> **[SCORECARD_STATUS_WORKFLOW.md](SCORECARD_STATUS_WORKFLOW.md)**
> 
> This document contains Ranking Round-specific implementation details.  
> The master reference should be consulted for current status definitions and cross-module consistency.

**Status:** 📋 Analysis Complete - Ready for Implementation  
**Date:** December 2025  
**Related Files:**
- `js/ranking_round_300.js`
- `ranking_round_300.html`
- `results.html`
- `js/coach.js`
- `js/scorecard_view.js`

---

## 📊 Current Status Usage Across System

### Status Values Currently Used

| Status | Location | Meaning | Color |
|--------|----------|---------|-------|
| **PENDING** / **PEND** | All modules | Card in progress, not yet complete | Yellow/Warning |
| **COMP** / **COMPLETED** | `results.html`, `ranking_round_300.js` | Card finished by scorer, awaiting verification | Blue/Primary |
| **VER** / **VERIFIED** | All modules | Card verified by coach, locked | Green/Success |
| **VOID** | All modules | Card marked invalid/incomplete | Red/Danger |

### Status Display by Module

#### 1. **results.html** (Lines 178-192)
```javascript
function getCardStatus(archer) {
  return ((archer.cardStatus || archer.status || 'PENDING') + '').toUpperCase();
}

function renderStatusText(status) {
  if (status === 'VER') return 'VER';
  else if (status === 'VOID') return 'VOID';
  else if (status === 'PENDING' || status === 'PEND') return 'PEND';
  else return 'COMP';  // Default to COMP for completed cards
}
```

**Status Flow:** `PEND` → `COMP` → `VER` (or `VOID`)

#### 2. **js/coach.js** (Lines 544-550, 595-600)
```javascript
function formatStatusBadge(status) {
  const normalized = (status || 'PENDING').toUpperCase();
  let color = '#f1c40f';  // Yellow for PENDING
  if (normalized === 'VER') color = '#2ecc71';  // Green
  if (normalized === 'VOID') color = '#e74c3c';  // Red
  return `<span class="status-badge" style="background:${color};color:#fff;">${normalized}</span>`;
}

const statusOrder = { 'PENDING': 0, 'VER': 1, 'VOID': 2 };
```

**Status Flow:** `PENDING` → `VER` (or `VOID`)

#### 3. **js/ranking_round_300.js** (Lines 1807-1820, 2726-2739)
```javascript
const cardStatus = existingArcher.cardStatus || 'PENDING';
let statusText = 'PEND';
let statusClass = 'bg-warning text-white';

if (cardStatus === 'VER' || verified) {
  statusText = 'VER';
  statusClass = 'bg-success text-white';
} else if (cardStatus === 'COMPLETED' || existingArcher.completed) {
  statusText = 'COMP';
  statusClass = 'bg-primary text-white';
}
```

**Status Flow:** `PEND` → `COMP` → `VER` (or `VOID`)

---

## 🎯 Required Workflow

### User Story
> After Ranking Round 10 ends, archers go to the cards to verify the digital vs the paper card.  
> We want to have a "Complete" status from the scorer, that can be "Verified" by the Coaches.  
> There should also be "Next" and "Prev" to cycle through the cards.

### Status Transition Flow

```
┌─────────┐
│ PENDING │  ← Card in progress (scorer entering scores)
└────┬────┘
     │
     │ Scorer marks card as "Complete"
     ▼
┌─────────┐
│  COMP   │  ← Card complete, awaiting coach verification
└────┬────┘
     │
     │ Coach verifies digital vs paper card
     ▼
┌─────────┐
│   VER   │  ← Card verified and locked (no more edits)
└─────────┘

Alternative path:
┌─────────┐
│ PENDING │
└────┬────┘
     │
     │ Coach marks as invalid
     ▼
┌─────────┐
│  VOID   │  ← Card voided, hidden from leaderboards
└─────────┘
```

---

## 🔍 Current Card View Implementation

### HTML Structure (`ranking_round_300.html` Lines 336-363)

```html
<div id="card-view" class="flex flex-col min-h-screen hidden">
  <header class="px-4 py-3 bg-white dark:bg-gray-800 border-b...">
    <h2 id="card-view-archer-name" class="text-xl font-bold..."></h2>
    <div class="flex flex-wrap gap-2 text-sm...">
      <span id="card-view-division"></span>
      <span id="card-view-round"></span>
    </div>
  </header>

  <div id="individual-card-container" class="flex-1 overflow-auto p-4 pb-20">
    <!-- Card content rendered here -->
  </div>

  <footer class="px-2 py-2 bg-white... flex justify-center gap-2 safe-bottom">
    <button id="back-to-scoring-btn">← Scoring</button>
    <button id="export-btn">Export</button>
    <button id="prev-archer-btn">← Prev</button>
    <button id="next-archer-btn">Next →</button>
  </footer>
</div>
```

**Status:** ✅ HTML structure exists with Prev/Next buttons

### JavaScript Implementation (`js/ranking_round_300.js` Lines 2998-3030)

```javascript
function renderCardView(archerId) {
  const archer = state.archers.find(a => a.id == archerId);
  if (!archer) return;

  // Convert archer data to ScorecardView format
  const archerData = {
    id: archer.id,
    firstName: archer.firstName,
    lastName: archer.lastName,
    school: archer.school,
    level: archer.level,
    gender: archer.gender,
    scores: archer.scores,
    verified: archer.cardStatus === 'VER',
    completed: archer.scores.filter(s => s.every(val => val !== '')).length >= state.totalEnds
  };

  // Use standardized ScorecardView modal
  ScorecardView.showScorecardModal(archerData, roundData, {
    onClose: () => {
      state.currentView = 'scoring';
      renderView();
    }
  });
}
```

**Issue:** Currently uses `ScorecardView.showScorecardModal()` (modal) instead of the full `card-view` div.

**Missing:**
1. ❌ "Complete" button for scorer to mark card as COMP
2. ❌ Full card view rendering (not modal)
3. ❌ Prev/Next navigation handlers
4. ❌ Status display in card view

---

## 📋 Implementation Plan

### Phase 1: Enable Full Card View (Not Modal)

**File:** `js/ranking_round_300.js`

**Changes:**
1. Modify `renderCardView()` to render directly into `#individual-card-container` instead of using modal
2. Use `ScorecardView.renderScorecard()` to generate HTML
3. Show `#card-view` div (remove `hidden` class)
4. Hide `#scoring-view` when showing card view

**Code Location:** Lines 2998-3030

### Phase 2: Add "Complete" Button for Scorer

**File:** `ranking_round_300.html` (card view footer)

**Add:**
```html
<button id="complete-card-btn" 
  class="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark font-semibold transition-colors min-h-[44px]">
  ✓ Complete
</button>
```

**File:** `js/ranking_round_300.js`

**Add Handler:**
```javascript
// In renderCardView() or card view initialization
document.getElementById('complete-card-btn').onclick = async () => {
  const archer = state.archers.find(a => a.id == state.currentArcherId);
  if (!archer) return;
  
  // Check if all ends are complete
  const allEndsComplete = archer.scores.filter(s => s.every(val => val !== '')).length >= state.totalEnds;
  if (!allEndsComplete) {
    alert('Please complete all 10 ends before marking card as complete.');
    return;
  }
  
  // Update card status to COMP
  await updateCardStatus(archer.id, 'COMP');
  
  // Refresh card view
  renderCardView(state.currentArcherId);
};
```

### Phase 3: Implement Prev/Next Navigation

**File:** `js/ranking_round_300.js`

**Add Functions:**
```javascript
function getNextArcherId(currentId) {
  const currentIndex = state.archers.findIndex(a => a.id === currentId);
  if (currentIndex === -1) return null;
  const nextIndex = (currentIndex + 1) % state.archers.length;
  return state.archers[nextIndex].id;
}

function getPrevArcherId(currentId) {
  const currentIndex = state.archers.findIndex(a => a.id === currentId);
  if (currentIndex === -1) return null;
  const prevIndex = (currentIndex - 1 + state.archers.length) % state.archers.length;
  return state.archers[prevIndex].id;
}
```

**Wire Up Buttons:**
```javascript
// In renderCardView() or card view initialization
document.getElementById('prev-archer-btn').onclick = () => {
  const prevId = getPrevArcherId(state.currentArcherId);
  if (prevId) {
    state.currentArcherId = prevId;
    renderCardView(prevId);
  }
};

document.getElementById('next-archer-btn').onclick = () => {
  const nextId = getNextArcherId(state.currentArcherId);
  if (nextId) {
    state.currentArcherId = nextId;
    renderCardView(nextId);
  }
};
```

### Phase 4: Add Status Display in Card View

**File:** `js/ranking_round_300.js` (in `renderCardView()`)

**Add Status Badge:**
```javascript
function renderCardView(archerId) {
  const archer = state.archers.find(a => a.id == archerId);
  if (!archer) return;

  const status = (archer.cardStatus || 'PENDING').toUpperCase();
  let statusBadge = '';
  if (status === 'VER') {
    statusBadge = '<span class="inline-block px-2 py-1 text-xs font-bold rounded bg-success text-white">VER</span>';
  } else if (status === 'COMP' || status === 'COMPLETED') {
    statusBadge = '<span class="inline-block px-2 py-1 text-xs font-bold rounded bg-primary text-white">COMP</span>';
  } else if (status === 'VOID') {
    statusBadge = '<span class="inline-block px-2 py-1 text-xs font-bold rounded bg-danger text-white">VOID</span>';
  } else {
    statusBadge = '<span class="inline-block px-2 py-1 text-xs font-bold rounded bg-warning text-white">PEND</span>';
  }

  // Render card with status badge in header
  // ...
}
```

### Phase 5: API Integration for Status Updates

**File:** `js/ranking_round_300.js`

**Add Function:**
```javascript
async function updateCardStatus(archerId, newStatus) {
  if (!state.activeEventId || !state.divisionRoundId) {
    console.warn('[updateCardStatus] No active event or round ID');
    return;
  }

  const archer = state.archers.find(a => a.id === archerId);
  if (!archer || !archer.roundArcherId) {
    console.warn('[updateCardStatus] No roundArcherId for archer');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/round_archers/${archer.roundArcherId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Event-Code': state.eventEntryCode || ''
      },
      body: JSON.stringify({
        cardStatus: newStatus
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Update local state
    archer.cardStatus = newStatus;
    
    // Update sync status
    if (window.LiveUpdates && typeof window.LiveUpdates.updateCardStatus === 'function') {
      await window.LiveUpdates.updateCardStatus(archer.roundArcherId, newStatus);
    }

    return true;
  } catch (err) {
    console.error('[updateCardStatus] Failed:', err);
    alert('Failed to update card status: ' + err.message);
    return false;
  }
}
```

---

## ✅ Alignment with Existing System

### Status Consistency

| Module | PENDING | COMP | VER | VOID |
|--------|---------|------|-----|------|
| **results.html** | ✅ PEND | ✅ COMP | ✅ VER | ✅ VOID |
| **coach.js** | ✅ PENDING | ⚠️ (not shown) | ✅ VER | ✅ VOID |
| **ranking_round_300.js** | ✅ PEND | ✅ COMP | ✅ VER | ✅ VOID |

**Action Required:** Ensure `coach.js` displays COMP status in verification table.

### Coach Verification Flow

**Current:** Coach can verify cards directly (sets to VER)  
**Required:** Coach should verify COMP cards (COMP → VER transition)

**File:** `js/coach.js` (Lines 620-633)

**Current Logic:**
```javascript
if (status === 'VER' && locked) {
  actions = `<button ... data-action="unlock">Unlock</button>`;
} else if (status === 'VOID') {
  actions = `<button ... data-action="unlock">Reopen</button>`;
} else {
  actions = `
    <button ... data-action="lock">Validate</button>
    <button ... data-action="void">Void</button>
  `;
}
```

**Update Required:** Add COMP status handling:
```javascript
if (status === 'VER' && locked) {
  actions = `<button ... data-action="unlock">Unlock</button>`;
} else if (status === 'COMP' || status === 'COMPLETED') {
  actions = `
    <button ... data-action="lock">Verify</button>
    <button ... data-action="void">Void</button>
  `;
} else if (status === 'VOID') {
  actions = `<button ... data-action="unlock">Reopen</button>`;
} else {
  actions = `
    <button ... data-action="void">Void</button>
  `;
}
```

---

## 🧪 Testing Checklist

- [ ] Card view displays correctly (not modal)
- [ ] "Complete" button appears for scorer
- [ ] "Complete" button only enabled when all 10 ends are scored
- [ ] Status updates to COMP when scorer clicks "Complete"
- [ ] Prev/Next buttons cycle through all archers in bale
- [ ] Status badge displays correctly (PEND/COMP/VER/VOID)
- [ ] Coach can verify COMP cards (COMP → VER)
- [ ] Verified cards are locked (no edits allowed)
- [ ] Status persists after page refresh
- [ ] Status syncs to database correctly

---

## 📝 Summary

### Current State
- ✅ Status system exists (PENDING, COMP, VER, VOID)
- ✅ Card view HTML structure exists with Prev/Next buttons
- ❌ Card view uses modal instead of full view
- ❌ No "Complete" button for scorer
- ❌ Prev/Next navigation not wired up
- ❌ Status display missing in card view

### Required Changes
1. **Switch from modal to full card view** in `renderCardView()`
2. **Add "Complete" button** in card view footer
3. **Wire up Prev/Next navigation** buttons
4. **Add status display** in card view header
5. **Implement status update API** call
6. **Update coach verification** to handle COMP status

### Status Workflow (Final)
```
PENDING → COMP (scorer) → VER (coach) → Locked
         ↓
        VOID (coach) → Hidden
```

---

**Next Steps:** Implement Phase 1-5 changes in order, test each phase before proceeding.

