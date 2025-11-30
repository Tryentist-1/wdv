# Match Tracking Feature - Analysis

**Date:** December 1, 2025  
**Status:** Analysis Complete - Ready for Implementation Review  
**Feature:** Solo Match History with Win/Loss Ratio and Match Restoration

---

## 🎯 Feature Overview

Add a comprehensive Match Tracking feature that displays:
1. **Complete solo match history** for an archer
2. **Win/Loss ratio** (e.g., "5-3" format)
3. **Match details** including:
   - Opponent name
   - Complete match score (all sets, shoot-off if applicable)
   - Date
   - Event name (if part of event)
4. **Match restoration** - Ability to "remake" or view a solo match similar to the `showRoundScorecard` function for ranking rounds

---

## 📊 Current State Analysis

### ✅ What Already Exists

#### 1. **History API Endpoint** (`api/index.php`)
- **Endpoint:** `GET /v1/archers/{id}/history`
- **Status:** ✅ Already returns solo matches
- **Data Returned:**
  ```php
  [
    'type' => 'solo',
    'match_id' => $match['match_id'],
    'event_id' => $match['event_id'],
    'event_name' => $match['event_name'] ?: 'Solo Match',
    'event_date' => $match['event_date'],
    'card_status' => $match['card_status'],
    'locked' => $match['locked'],
    'opponent_name' => $opponentName,
    'sets_won' => $setsWon,
    'opponent_sets_won' => $opponentSetsWon,
    'final_score' => $totalScore,
    'is_winner' => $isWinner
  ]
  ```

#### 2. **History Display** (`archer_history.html`)
- **Status:** ✅ Solo matches are displayed in the history list
- **Current Display:**
  - Event name
  - Date
  - Opponent name with trophy emoji if winner
  - Sets score (e.g., "3-2")
  - Status badge (PEND, COMP, VER, VOID)
- **Click Handler:** Currently just logs to console (TODO comment on line 264)

#### 3. **Solo Match Restoration** (`js/solo_card.js`)
- **Status:** ✅ Can load matches from URL parameter
- **URL Format:** `solo_card.html?match={matchId}`
- **Function:** `restoreMatchFromDatabase()` (line ~1429)
- **API Endpoint:** `GET /v1/solo-matches/{id}` (line 4230 in `api/index.php`)

#### 4. **Match Detail API** (`api/index.php`)
- **Endpoint:** `GET /v1/solo-matches/{id}`
- **Status:** ✅ Returns complete match data including:
  - Match metadata
  - Both archers with positions
  - All sets with scores
  - Shoot-off data (if applicable)

---

## 🚧 What Needs to Be Built

### 1. **Win/Loss Ratio Calculation**

**Location:** `archer_history.html` or `api/index.php`

**Approach Options:**

**Option A: Calculate in Frontend** (Recommended)
- Calculate from history array after API response
- Simple, no API changes needed
- Can be recalculated on filter/sort changes

**Option B: Calculate in Backend**
- Add to history API response
- More efficient, single source of truth
- Requires API modification

**Implementation:**
```javascript
function calculateWinLossRatio(history) {
  const soloMatches = history.filter(item => item.type === 'solo');
  const wins = soloMatches.filter(m => m.is_winner).length;
  const losses = soloMatches.filter(m => !m.is_winner).length;
  return { wins, losses, ratio: `${wins}-${losses}` };
}
```

### 2. **Match Detail Display**

**Location:** `archer_history.html`

**Function:** `showSoloMatchScorecard(match)` (similar to `showRoundScorecard`)

**Options:**

**Option A: Navigate to Solo Card** (For "remake" functionality)
- Navigate to `solo_card.html?match={matchId}`
- Uses existing restoration functionality
- Consistent with "remake" concept
- User can view full match interface and continue scoring if needed
- Best for: Users who want to review/edit the match

**Option B: Modal Display** (For quick viewing - like pivot analysis & event dashboard)
- Show match details in modal (like `ScorecardView.showScorecardModal`)
- New component: `SoloMatchView.showMatchModal()` or add to `ScorecardView`
- Keeps user on same page
- Quick view without navigation
- Best for: Quick reference, pivot analysis, event dashboard

**Recommendation:** **Implement BOTH options**
- **Modal** for quick viewing (primary action on click)
- **Navigation** as secondary action (button in modal: "Open in Solo Card" or "Remake Match")
- Follows pattern from ranking rounds (modal in pivot/event dashboard, navigation in history)

### 3. **Complete Match Score Display**

**Current State:** History shows sets won (e.g., "3-2") but not individual set scores

**Needs:**
- Display all 5 sets (or completed sets)
- Show shoot-off if applicable
- Show set totals and match total

**Location Options:**
1. **In History List** - Expandable row or tooltip
2. **In Solo Card** - When match is restored (already shows this)
3. **In Modal** - If we go with modal approach

**Recommendation:** Show in Solo Card when restored (already implemented)

### 4. **Win/Loss Ratio Display**

**Location:** `archer_history.html` - Archer Info section

**Display Format:**
- Add to archer info section: "🎯 Solo Matches: **5-3** (W-L)"
- Or separate section: "Match Record: 5 Wins, 3 Losses"

**Implementation:**
```javascript
// After loading history
const { wins, losses, ratio } = calculateWinLossRatio(history);
document.getElementById('solo-match-record').textContent = `${wins}-${losses}`;
```

---

## 📁 Files to Modify

### 1. **`archer_history.html`**

**Changes Needed:**

1. **Add Win/Loss Display** (Archer Info Section)
   ```html
   <span>🎯 Solo Record: <strong id="solo-record" class="text-gray-800 dark:text-white">-</strong></span>
   ```

2. **Implement `showSoloMatchScorecard()` Function** (Modal + Navigation)
   ```javascript
   async function showSoloMatchScorecard(match) {
     // Fetch match details from API
     const matchData = await fetchMatchDetails(match.match_id);
     
     // Show modal with match details
     SoloMatchView.showMatchModal(matchData, {
       onRemake: () => {
         // Navigate to solo card for remake
         window.location.href = `solo_card.html?match=${match.match_id}`;
       }
     });
   }
   ```

3. **Update Click Handler** (Line 264)
   ```javascript
   } else if (item.type === 'solo') {
     showSoloMatchScorecard(item);
   }
   ```

4. **Add Win/Loss Calculation**
   ```javascript
   function calculateWinLossRatio(history) {
     const soloMatches = history.filter(item => item.type === 'solo');
     const wins = soloMatches.filter(m => m.is_winner).length;
     const losses = soloMatches.filter(m => !m.is_winner).length;
     return { wins, losses, ratio: `${wins}-${losses}` };
   }
   ```

5. **Update `loadHistory()` Function**
   - Calculate win/loss after history loads
   - Display in archer info section

6. **Add SoloMatchView Script**
   ```html
   <script src="js/solo_match_view.js"></script>
   ```

### 2. **`js/solo_match_view.js`** (NEW FILE)

**Purpose:** Reusable component for displaying solo matches in modals (similar to `ScorecardView`)

**Functions Needed:**

1. **`renderMatchCard(matchData, options)`**
   - Render HTML for solo match scorecard
   - Display: Both archers, 5 sets with scores, set totals, set points, match score
   - Include shoot-off if applicable
   - Show match metadata (date, event, status)

2. **`showMatchModal(matchData, options)`**
   - Show match in modal overlay
   - Similar to `ScorecardView.showScorecardModal`
   - Include "Remake Match" button that navigates to solo card
   - Include close button and background click to close

3. **Helper Functions**
   - `parseScoreValue(score)` - Reuse from ScorecardView or import
   - `getScoreColor(score)` - Reuse from ScorecardView or import
   - `calculateSetPoints(set1Total, set2Total)` - Calculate set winner
   - `formatMatchScore(sets)` - Format match score (e.g., "3-2")

**API Integration:**
- Fetch match details from `GET /v1/solo-matches/{id}`
- Transform API response to match display format

### 3. **`js/solo_card.js`** (No Changes Needed)

**Current Behavior:**
- Match restoration loads match and allows scoring
- This is fine for "remake" concept
- User can view scores and continue if incomplete

**Recommendation:** Keep current behavior (allow editing even for completed matches)
- Matches "remake" concept
- User can review and potentially correct scores
- Coach verification prevents unauthorized changes

### 4. **`api/index.php`** (No Changes Needed)

**Current Status:**
- `GET /v1/solo-matches/{id}` already returns complete match data ✅
- `GET /v1/archers/{id}/history` already returns solo match history ✅

**Optional Enhancement:**
- Add win/loss ratio to history API response
- Would eliminate frontend calculation
- **Decision:** Start with frontend calculation, enhance API later if needed

---

## 🎨 UI/UX Considerations

### 1. **Win/Loss Display**

**Location:** Archer Info section (top of page)

**Format Options:**
- `🎯 Solo Record: 5-3 (W-L)`
- `🎯 Solo Matches: 5 Wins, 3 Losses`
- `📊 Match Record: 5-3`

**Recommendation:** `🎯 Solo Record: 5-3 (W-L)`
- Compact
- Clear format
- Consistent with sports notation

### 2. **Match List Display**

**Current:** Shows sets score (e.g., "3-2")

**Enhancement Options:**
1. **Add Win Indicator** - Already has trophy emoji ✅
2. **Add Total Score** - Show match total (e.g., "3-2 (145-142)")
3. **Add Set Details** - Expandable row showing individual sets

**Recommendation:** Keep current display, show details when match is opened

### 3. **Click Behavior**

**Current:** TODO comment, no action

**New:** Navigate to `solo_card.html?match={matchId}`

**User Flow:**
1. User clicks solo match in history
2. Navigates to solo card with match loaded
3. Can view complete match details
4. Can continue scoring if incomplete
5. Can export/view as needed

---

## 🔍 Technical Implementation Details

### 1. **Win/Loss Calculation**

```javascript
function calculateWinLossRatio(history) {
  const soloMatches = history.filter(item => item.type === 'solo');
  const wins = soloMatches.filter(m => m.is_winner === true).length;
  const losses = soloMatches.filter(m => m.is_winner === false).length;
  const total = soloMatches.length;
  
  return {
    wins,
    losses,
    total,
    ratio: `${wins}-${losses}`,
    winPercentage: total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0'
  };
}
```

### 2. **Match Modal Display**

```javascript
// In archer_history.html
async function showSoloMatchScorecard(match) {
  if (!match || !match.match_id) {
    console.error('Invalid match data:', match);
    alert('Unable to load match. Missing match ID.');
    return;
  }
  
  try {
    // Fetch complete match details
    const response = await fetch(`${API_BASE}/solo-matches/${match.match_id}`);
    if (!response.ok) {
      throw new Error(`Failed to load match: ${response.status}`);
    }
    const data = await response.json();
    const matchData = data.match;
    
    // Show modal
    SoloMatchView.showMatchModal(matchData, {
      onRemake: () => {
        window.location.href = `solo_card.html?match=${match.match_id}`;
      }
    });
  } catch (error) {
    console.error('Error loading match:', error);
    alert('Unable to load match details. Please try again.');
  }
}
```

### 3. **SoloMatchView Component**

```javascript
// In js/solo_match_view.js
const SoloMatchView = (() => {
  
  function renderMatchCard(matchData, options = {}) {
    // Extract archers
    const archer1 = matchData.archers.find(a => a.position === 1);
    const archer2 = matchData.archers.find(a => a.position === 2);
    
    // Build match table HTML
    // ... (similar to solo_card.js renderScoreTable but read-only)
    
    return html;
  }
  
  function showMatchModal(matchData, options = {}) {
    // Similar to ScorecardView.showScorecardModal
    // Include "Remake Match" button
  }
  
  return {
    renderMatchCard,
    showMatchModal
  };
})();
```

### 3. **Update History Loading**

```javascript
async function loadHistory() {
  // ... existing code ...
  
  // After history is loaded and displayed
  const { wins, losses, ratio } = calculateWinLossRatio(history);
  
  // Update display
  const recordElement = document.getElementById('solo-record');
  if (recordElement) {
    recordElement.textContent = ratio || '0-0';
  }
  
  // Show archer info if hidden
  document.getElementById('archer-info').classList.remove('hidden');
}
```

---

## ✅ Testing Checklist

### Functional Testing

- [ ] Win/Loss ratio calculates correctly
- [ ] Win/Loss displays in archer info section
- [ ] Clicking solo match navigates to solo card
- [ ] Match loads correctly in solo card
- [ ] All match data displays correctly (opponent, sets, scores)
- [ ] Win/Loss updates when filtering history
- [ ] Win/Loss handles edge cases (no matches, all wins, all losses)

### UI/UX Testing

- [ ] Win/Loss display is visible and clear
- [ ] Match list items are clickable
- [ ] Navigation is smooth
- [ ] Mobile-friendly (touch targets, responsive)
- [ ] Dark mode works correctly
- [ ] Loading states handled properly

### Edge Cases

- [ ] Archer with no solo matches (show "0-0")
- [ ] Archer with only wins (e.g., "5-0")
- [ ] Archer with only losses (e.g., "0-3")
- [ ] Incomplete matches (sets_won < 6)
- [ ] Verified/locked matches
- [ ] Matches without events (standalone matches)

---

## 📋 Implementation Steps

### Phase 1: Win/Loss Calculation & Display
1. Add win/loss calculation function
2. Add display element to archer info section
3. Calculate and display after history loads
4. Test calculation accuracy

### Phase 2: SoloMatchView Component
1. Create `js/solo_match_view.js` file
2. Implement `renderMatchCard()` function
3. Implement `showMatchModal()` function
4. Add "Remake Match" button to modal
5. Test modal display with sample data

### Phase 3: Match Modal Integration
1. Implement `showSoloMatchScorecard()` function in `archer_history.html`
2. Add API call to fetch match details
3. Update click handler in history list
4. Test modal display
5. Test "Remake Match" navigation

### Phase 4: Polish & Testing
1. Test all edge cases
2. Verify mobile responsiveness
3. Test dark mode
4. Test in pivot analysis and event dashboard contexts
5. Update documentation

---

## 🎯 Success Criteria

✅ **Win/Loss ratio displays correctly** in archer info section  
✅ **Clicking a solo match** shows modal with complete match details  
✅ **Modal displays** all match information (opponent, sets, scores, date, status)  
✅ **"Remake Match" button** navigates to solo card with match loaded  
✅ **Match details display** correctly in modal (all 5 sets, shoot-off if applicable, match score)  
✅ **Modal works** for all match states (complete, incomplete, verified)  
✅ **Mobile-friendly** and responsive (modal scrollable, touch-friendly)  
✅ **Dark mode** works correctly  
✅ **Edge cases handled** (no matches, all wins/losses, incomplete sets, shoot-off, etc.)  
✅ **Reusable component** can be used in pivot analysis and event dashboard

---

## 🔄 Future Enhancements (Out of Scope)

1. **Team Match Tracking** - Similar feature for team matches
2. **Match Statistics** - Average score, best match, etc.
3. **Opponent History** - Track record against specific opponents
4. **Match Filtering** - Filter by date, event, opponent
5. **Export Match History** - CSV/PDF export
6. **Match Comparison** - Compare multiple matches side-by-side

---

## 📚 Related Documentation

- [BALE_GROUP_SCORING_WORKFLOW.md](../core/BALE_GROUP_SCORING_WORKFLOW.md) - Scoring workflow
- [APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md](../core/APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md) - System architecture
- [RELEASE_NOTES_v1.8.0.md](../../RELEASE_NOTES_v1.8.0.md) - Solo match history integration

---

**Document Owner:** Development Team  
**Last Updated:** December 1, 2025  
**Next Review:** After implementation review

