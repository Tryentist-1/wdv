# Solo and Team Match "Mark Complete" Implementation Analysis

**Date:** December 2025  
**Purpose:** Analyze and plan implementation of "Mark Complete" functionality for Solo and Team matches to match Ranking Round workflow

## Status Abbreviations Standard

All status values use standardized 4-letter abbreviations:
- **PEND** - Pending (in progress)
- **COMP** - Completed (awaiting verification)
- **VRFD** - Verified (locked, coach verified)
- **VOID** - Voided (invalid/incomplete)

**Note:** Previous attempts used VER for Verified, but VRFD is the correct standard.

---

## Current State

### Ranking Rounds ✅
- Has "Mark Complete" button in card view
- Uses `PATCH /v1/round_archers/{id}/status` API endpoint
- Updates `card_status` to `COMP`
- Shows confirmation modal before completing
- Button only appears when all ends are complete

### Solo Matches ❌
- Has "Export" button (old workflow)
- No "Mark Complete" functionality
- No API endpoint for updating match `card_status`
- Match completion is determined automatically but not marked as COMP

### Team Matches ❌
- Has "Export" button (old workflow)
- No "Mark Complete" functionality
- No API endpoint for updating match `card_status`
- Match completion is determined automatically but not marked as COMP

---

## Required Changes

### 1. API Endpoints

#### Create: `PATCH /v1/solo-matches/{id}/status`

**Location:** `api/index.php` (after line 5603)

**Purpose:** Update solo match `card_status` to `COMP`

**Request:**
```json
{
  "cardStatus": "COMP"
}
```

**Response:**
```json
{
  "matchId": "uuid",
  "cardStatus": "COMP",
  "status": "Completed"
}
```

**Implementation:**
- Validate status value (PEND, COMP, VRFD, VOID)
- Check if match is locked (prevent changes if VRFD)
- Update `solo_matches.card_status` to `COMP`
- Update `solo_matches.status` to `Completed` (if match is actually complete)
- Return updated match data

#### Create: `PATCH /v1/team-matches/{id}/status`

**Location:** `api/index.php` (after solo matches endpoint)

**Purpose:** Update team match `card_status` to `COMP`

**Request:**
```json
{
  "cardStatus": "COMP"
}
```

**Response:**
```json
{
  "matchId": "uuid",
  "cardStatus": "COMP",
  "status": "Completed"
}
```

**Implementation:**
- Same as solo matches but for `team_matches` table

---

### 2. Solo Match UI Changes

#### File: `solo_card.html`

**Replace Export Button with Complete Button:**

**Current (line 282-283):**
```html
<button id="export-btn"
    class="px-3 h-[44px] bg-purple text-white rounded-lg hover:bg-purple-dark font-semibold transition-colors flex items-center justify-center"><i class="fas fa-upload mr-1"></i> Export</button>
```

**New:**
```html
<button id="complete-match-btn"
    class="px-3 h-[44px] bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
    <i class="fas fa-check-circle mr-1"></i> Complete
</button>
```

**Add Complete Match Modal (similar to ranking_round_300.html):**

**Location:** After export modal (around line 270)

```html
<!-- Complete Match Confirmation Modal -->
<div id="complete-match-modal"
    class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-40 overflow-y-auto hidden">
    <div
        class="bg-white dark:bg-gray-800 p-6 rounded-md shadow-lg w-11/12 max-w-md max-h-[90vh] overflow-y-auto flex flex-col transition-colors duration-200">
        <h2 class="text-xl font-bold text-center text-gray-800 dark:text-white mb-4">Complete Match</h2>
        <p class="text-gray-600 dark:text-gray-300 mb-6 text-center">
            Mark this match as complete? This will save all scores and mark the match as ready for coach verification.
        </p>
        <div class="flex gap-3">
            <button id="complete-match-confirm-btn"
                class="flex-1 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark font-semibold transition-colors min-h-[44px]">
                ✓ Complete Match
            </button>
            <button id="complete-match-cancel-btn"
                class="flex-1 px-4 py-2 bg-secondary-light dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold transition-colors min-h-[44px]">
                Cancel
            </button>
        </div>
    </div>
</div>
```

#### File: `js/solo_card.js`

**Add Complete Match Function:**

**Location:** After `calculateMatchResult()` function (around line 1273)

```javascript
/**
 * Check if match is complete (winner determined)
 */
function isMatchComplete() {
    const result = calculateMatchResult();
    return result.matchOver && result.winner !== null;
}

/**
 * Show Complete Match confirmation modal
 */
function showCompleteMatchModal() {
    const modal = document.getElementById('complete-match-modal');
    
    if (!modal) {
        console.error('[showCompleteMatchModal] Modal not found');
        return;
    }
    
    // Check if match is actually complete
    if (!isMatchComplete()) {
        alert('Match is not complete. Please finish all sets and determine a winner before marking as complete.');
        return;
    }
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function hideCompleteMatchModal() {
    const modal = document.getElementById('complete-match-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

/**
 * Mark the current match as Complete
 */
async function completeMatch() {
    if (!state.matchId) {
        alert('No match ID found. Please ensure match is saved to database.');
        hideCompleteMatchModal();
        return;
    }
    
    // Check if match is actually complete
    if (!isMatchComplete()) {
        alert('Match is not complete. Please finish all sets and determine a winner before marking as complete.');
        hideCompleteMatchModal();
        return;
    }
    
    try {
        // Build headers
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Add event code if match is part of an event
        if (state.eventId) {
            const entryCode = getEventEntryCode(); // Implement this if needed
            if (entryCode) {
                headers['X-Passcode'] = entryCode;
            }
        }
        
        const response = await fetch(`${API_BASE}/solo-matches/${state.matchId}/status`, {
            method: 'PATCH',
            headers: headers,
            body: JSON.stringify({
                cardStatus: 'COMP'
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        // Update local state
        state.cardStatus = result.cardStatus || 'COMP';
        state.status = result.status || 'Completed';
        
        console.log('[completeMatch] Status updated:', result);
        
        // Update UI to show completed status
        updateCompleteMatchButton();
        
        // Show success message
        alert('Match marked as complete! Ready for coach verification.');
        
        hideCompleteMatchModal();
        return true;
    } catch (err) {
        console.error('[completeMatch] Failed:', err);
        alert('Failed to mark match as complete: ' + err.message);
        return false;
    }
}

/**
 * Update Complete Match button state
 */
function updateCompleteMatchButton() {
    const completeBtn = document.getElementById('complete-match-btn');
    if (!completeBtn) return;
    
    const isComplete = isMatchComplete();
    const isAlreadyCompleted = state.cardStatus === 'COMP';
    const isVerified = state.cardStatus === 'VRFD';
    const isLocked = state.locked || isVerified;
    
    if (isLocked) {
        completeBtn.disabled = true;
        completeBtn.innerHTML = '<i class="fas fa-lock mr-1"></i> Verified';
        completeBtn.classList.remove('bg-primary', 'hover:bg-primary-dark');
        completeBtn.classList.add('bg-gray-500', 'hover:bg-gray-600');
    } else if (isAlreadyCompleted) {
        completeBtn.disabled = true;
        completeBtn.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Completed';
        completeBtn.classList.remove('bg-primary', 'hover:bg-primary-dark');
        completeBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
    } else if (isComplete) {
        completeBtn.disabled = false;
        completeBtn.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Complete';
        completeBtn.classList.remove('bg-gray-500', 'hover:bg-gray-600', 'bg-blue-500', 'hover:bg-blue-600');
        completeBtn.classList.add('bg-primary', 'hover:bg-primary-dark');
    } else {
        completeBtn.disabled = true;
        completeBtn.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Complete';
    }
}
```

**Update Event Handlers:**

**Location:** In initialization section (around line 1778)

**Replace:**
```javascript
// Export functionality
const exportBtn = document.getElementById('export-btn');
if (exportBtn) {
    exportBtn.addEventListener('click', showExportModal);
}
```

**With:**
```javascript
// Complete Match functionality
const completeMatchBtn = document.getElementById('complete-match-btn');
if (completeMatchBtn) {
    completeMatchBtn.addEventListener('click', showCompleteMatchModal);
}

// Complete Match modal handlers
const completeMatchConfirmBtn = document.getElementById('complete-match-confirm-btn');
const completeMatchCancelBtn = document.getElementById('complete-match-cancel-btn');

if (completeMatchConfirmBtn) {
    completeMatchConfirmBtn.addEventListener('click', completeMatch);
}

if (completeMatchCancelBtn) {
    completeMatchCancelBtn.addEventListener('click', hideCompleteMatchModal);
}
```

**Update Match Completion Detection:**

**Location:** In `calculateMatchResult()` or wherever match completion is checked

Add call to `updateCompleteMatchButton()` after calculating match result.

---

### 3. Team Match UI Changes

#### File: `team_card.html`

**Similar changes as Solo Matches:**
- Replace Export button with Complete button
- Add Complete Match modal
- Update footer button

#### File: `js/team_card.js`

**Similar functions as Solo Matches:**
- `isMatchComplete()` - Check if team match is complete (sets_won >= 5)
- `showCompleteMatchModal()`
- `hideCompleteMatchModal()`
- `completeMatch()` - Call `PATCH /v1/team-matches/{id}/status`
- `updateCompleteMatchButton()`

**Match Completion Logic for Team:**
- Match is complete when: `t1MatchScore >= 5` OR `t2MatchScore >= 5`
- Or after shoot-off winner is determined

---

### 4. Assignment Filtering Updates

#### File: `index.html`

**Current Logic (lines 585-624):**

**Ranking Rounds:**
```javascript
const openRounds = rankingRounds.filter(round => {
  const endsCompleted = parseInt(round.ends_completed || 0);
  const hasIncompleteEnds = endsCompleted < 10;
  const isToday = round.event_date === new Date().toISOString().slice(0, 10);
  const shouldShow = hasIncompleteEnds || (isToday && endsCompleted > 0);
  return shouldShow;
});
```

**Solo Matches:**
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

**New Logic - Show Only PENDING and COMPLETED (Today):**

**Ranking Rounds:**
```javascript
const openRounds = rankingRounds.filter(round => {
  const cardStatus = (round.card_status || round.cardStatus || 'PEND').toUpperCase();
  const endsCompleted = parseInt(round.ends_completed || 0);
  const isToday = round.event_date === new Date().toISOString().slice(0, 10);
  
  // Show if PEND (incomplete work)
  if (cardStatus === 'PEND' && endsCompleted < 10) {
    return true;
  }
  
  // Show if COMP and today (completed today, may need review)
  if (cardStatus === 'COMP') {
    return isToday;
  }
  
  // Don't show VRFD or VOID
  return false;
});
```

**Solo Matches:**
```javascript
const openSoloMatches = soloMatches.filter(match => {
  const cardStatus = (match.card_status || 'PEND').toUpperCase();
  const isToday = match.event_date === new Date().toISOString().slice(0, 10);
  const setsWon = parseInt(match.sets_won || 0);
  const opponentSetsWon = parseInt(match.opponent_sets_won || 0);
  const isMatchComplete = setsWon >= 6 || opponentSetsWon >= 6;
  
  // Show if PEND (incomplete work)
  if (cardStatus === 'PEND' && !isMatchComplete) {
    return true;
  }
  
  // Show if COMP and today (completed today, may need review)
  if (cardStatus === 'COMP') {
    return isToday;
  }
  
  // Don't show VRFD or VOID
  return false;
});
```

**Team Matches:**
```javascript
const openTeamMatches = teamMatches.filter(match => {
  const cardStatus = (match.card_status || 'PEND').toUpperCase();
  const isToday = match.event_date === new Date().toISOString().slice(0, 10);
  const setsWon = parseInt(match.sets_won || 0);
  const opponentSetsWon = parseInt(match.opponent_sets_won || 0);
  const isMatchComplete = setsWon >= 5 || opponentSetsWon >= 5;
  
  // Show if PEND (incomplete work)
  if (cardStatus === 'PEND' && !isMatchComplete) {
    return true;
  }
  
  // Show if COMP and today (completed today, may need review)
  if (cardStatus === 'COMP') {
    return isToday;
  }
  
  // Don't show VRFD or VOID
  return false;
});
```

---

## Implementation Checklist

### Phase 1: API Endpoints
- [ ] Create `PATCH /v1/solo-matches/{id}/status` endpoint
- [ ] Create `PATCH /v1/team-matches/{id}/status` endpoint
- [ ] Test endpoints with Postman/curl
- [ ] Verify status updates in database

### Phase 2: Solo Match UI
- [ ] Replace Export button with Complete button in `solo_card.html`
- [ ] Add Complete Match modal to `solo_card.html`
- [ ] Add `isMatchComplete()` function to `js/solo_card.js`
- [ ] Add `showCompleteMatchModal()` function
- [ ] Add `hideCompleteMatchModal()` function
- [ ] Add `completeMatch()` function
- [ ] Add `updateCompleteMatchButton()` function
- [ ] Wire up event handlers
- [ ] Update button state when match completes
- [ ] Test complete flow

### Phase 3: Team Match UI
- [ ] Replace Export button with Complete button in `team_card.html`
- [ ] Add Complete Match modal to `team_card.html`
- [ ] Add `isMatchComplete()` function to `js/team_card.js`
- [ ] Add `showCompleteMatchModal()` function
- [ ] Add `hideCompleteMatchModal()` function
- [ ] Add `completeMatch()` function
- [ ] Add `updateCompleteMatchButton()` function
- [ ] Wire up event handlers
- [ ] Update button state when match completes
- [ ] Test complete flow

### Phase 4: Assignment Filtering
- [ ] Update Ranking Round filtering in `index.html`
- [ ] Update Solo Match filtering in `index.html`
- [ ] Update Team Match filtering in `index.html`
- [ ] Test filtering with different statuses
- [ ] Test "today" logic for completed items
- [ ] Verify VRFD and VOID items are hidden

### Phase 5: Testing
- [ ] Test Solo match complete flow end-to-end
- [ ] Test Team match complete flow end-to-end
- [ ] Test assignment filtering with various statuses
- [ ] Test "today" completed items show in assignments
- [ ] Test VRFD items don't show in assignments
- [ ] Test voided items don't show in assignments
- [ ] Test coach verification still works after COMP status

---

## API Endpoint Details

### PATCH /v1/solo-matches/{id}/status

**Request:**
```json
{
  "cardStatus": "COMP"
}
```

**Validation:**
- Match must exist
- Match must not be locked (unless unlocking)
- Status must be valid: PEND, COMP, VRFD, VOID
- If setting to COMP, verify match is actually complete (sets_won >= 6)

**Response:**
```json
{
  "matchId": "uuid",
  "cardStatus": "COMP",
  "status": "Completed",
  "locked": false
}
```

**Database Updates:**
- `solo_matches.card_status` = 'COMP'
- `solo_matches.status` = 'Completed' (if match is complete)

### PATCH /v1/team-matches/{id}/status

**Same as solo matches but for `team_matches` table**

**Validation:**
- Match must be complete (sets_won >= 5) before setting to COMP

---

## Match Completion Detection

### Solo Match
- **Complete when:** `sets_won >= 6` OR `opponent_sets_won >= 6`
- **Or:** Shoot-off winner determined
- **Check:** `calculateMatchResult().matchOver === true && calculateMatchResult().winner !== null`

### Team Match
- **Complete when:** `t1MatchScore >= 5` OR `t2MatchScore >= 5`
- **Or:** Shoot-off winner determined
- **Check:** Match result shows `matchOver === true && winner !== null`

---

## Status Flow Summary

### Before Implementation
```
PEND → (automatic) → VRFD (coach only)
```

### After Implementation
```
PEND → COMP (scorer marks complete) → VRFD (coach verifies)
```

This matches the Ranking Round workflow exactly.

---

## Related Files

- `api/index.php` - API endpoints
- `solo_card.html` - Solo match UI
- `js/solo_card.js` - Solo match logic
- `team_card.html` - Team match UI
- `js/team_card.js` - Team match logic
- `index.html` - Assignment filtering
- `ranking_round_300.html` - Reference for Complete modal
- `js/ranking_round_300.js` - Reference for Complete logic

---

**Last Updated:** December 2025  
**Status:** Ready for Implementation

