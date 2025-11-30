# Division Hierarchy and Local/Server Data Integration

**Date:** November 28, 2025  
**Topic:** Division assignment hierarchy and Active Rounds integration

---

## Division Hierarchy - ✅ Confirmed Correct

### Your Understanding is 100% Accurate

**Division Source of Truth:**
```
Event-Round-RoundCard (Server) > Archer Profile (Default)
```

**Example Flow:**
1. **Archer Profile:** Sarah is "JV" (her default division)
2. **Event Assignment:** Coach assigns Sarah to "VAR" division for State Championship
3. **Round Created:** `rounds.division = 'VAR'`
4. **Scorecard:** Uses VAR target size (80cm), not JV (122cm)
5. **Resume:** Loads division from `rounds.division`, NOT from Sarah's profile

### Why the Fix Works

The fix I proposed **correctly implements this hierarchy**:

```javascript
// STEP 1: Extract division from ROUND (server authority)
const baleDivision = baleData.division || null;  // From rounds table

// STEP 2: Pass it to each archer during reconstruction
const overrides = {
    division: baleDivision || archer.division,  // Round first, fallback to archer default
    // ...
};
```

**This ensures:**
- ✅ Round division (event-specific) takes precedence
- ✅ Falls back to archer default only if round has no division
- ✅ Each scorecard reflects the **actual division they shot**, not their profile default
- ✅ Target size is correct for the event assignment

---

## Local vs Server Integration in index.html

### How "Active Rounds" Works

When you open `index.html`, it shows your open assignments by integrating **both** local and server data:

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Get Current Archer (from ArcherModule or localStorage)  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Fetch Archer's Round History from Server                │
│    GET /api/v1/archers/{archerId}/history                  │
│    Returns: All rounds for this archer (IN_PROGRESS, COMP)  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Filter for Open Rounds                                   │
│    - Has incomplete ends (ends_completed < 10)              │
│    - OR is today's round (for quick access)                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Display in "Your Open Assignments" Section               │
│    - Title: "Resume Ranking Round" or event name            │
│    - Details: Bale, ends completed, division                │
│    - Link: ranking_round_300.html?event=X&round=Y&archer=Z  │
└─────────────────────────────────────────────────────────────┘
```

### Code Implementation (index.html lines 358-413)

```javascript
// Fetch round history from server
const historyRes = await fetch(`api/v1/archers/${archerId}/history`);
const historyData = await historyRes.json();
const rounds = historyData.history || historyData.rounds || [];

// Find incomplete rounds
const openRounds = rounds.filter(round => {
    const endsCompleted = parseInt(round.ends_completed || 0);
    const hasIncompleteEnds = endsCompleted < 10;
    const isToday = round.event_date === new Date().toISOString().slice(0, 10);
    
    // Show if:
    // 1. Has incomplete ends (not finished) - PRIMARY condition
    // 2. OR is today's round (show active rounds even if complete)
    return hasIncompleteEnds || (isToday && endsCompleted > 0);
});

// Display each open round
openRounds.forEach(round => {
    const isStarted = (round.ends_completed || 0) > 0;
    assignments.push({
        type: 'ranking',
        title: isStarted ? 'Resume Ranking Round' : (round.event_name || 'Ranking Round'),
        subtitle: `${round.round_type || 'R300'} • ${round.division || 'Unknown Division'}`,
        details: `Bale ${round.bale_number || '?'} • ${round.ends_completed || 0}/10 ends`,
        link: `ranking_round_300.html?event=${round.event_id}&round=${round.round_id}&archer=${archerId}`,
        urgent: isStarted && (round.ends_completed || 0) < 10
    });
});
```

### Integration Points

#### 1. **Local Data Used:**
- `ArcherModule.getSelfArcher()` - Current archer identity
- `localStorage.getItem('archerList')` - Cached archer list
- `localStorage.getItem('archerSelfExtId')` - Archer's local ID

#### 2. **Server Data Used:**
- `GET /api/v1/archers/{archerId}/history` - All rounds for this archer
  - Returns: `event_name`, `round_type`, `division`, `bale_number`, `ends_completed`, `final_score`
- `GET /api/v1/events/recent` - Active events
- `GET /api/v1/brackets/{bracketId}/archer-assignment/{archerId}` - Bracket assignments

#### 3. **How They Integrate:**

**Scenario 1: In-Progress Card in localStorage**
```
1. You have local state: rankingRound300_2025-11-28
   - Contains: archers, scores, currentEnd, baleNumber
   
2. Server has: round_archers record with ends_completed = 5
   
3. index.html shows:
   - "Resume Ranking Round"
   - "R300 • VAR" (from server)
   - "Bale 3 • 5/10 ends" (from server)
   
4. When you click:
   - ranking_round_300.html loads
   - Checks localStorage first (fast)
   - Then calls restoreCurrentBaleSession()
   - Fetches server data to sync
   - Merges: local scores + server metadata
```

**Scenario 2: No Local Data, Server Has Round**
```
1. localStorage is empty (cleared or different device)
   
2. Server has: round_archers record with ends_completed = 5
   
3. index.html shows:
   - "Resume Ranking Round" (same as above)
   
4. When you click:
   - ranking_round_300.html loads
   - No localStorage found
   - Calls restoreCurrentBaleSession()
   - Fetches ALL data from server
   - Reconstructs state entirely from server
```

**Scenario 3: Local Data Newer Than Server**
```
1. localStorage has: 7 ends scored
   
2. Server has: 5 ends (last sync was at end 5)
   
3. index.html shows:
   - "Bale 3 • 5/10 ends" (server data, conservative)
   
4. When you click:
   - ranking_round_300.html loads
   - Loads localStorage (7 ends)
   - Fetches server data (5 ends)
   - Uses localStorage (newer)
   - Shows 7 ends in UI
   - Sync button available to push ends 6-7 to server
```

---

## Key Design Principles

### 1. **Server is Authoritative for Metadata**
- Division, event name, bale assignments come from server
- This ensures consistency across devices
- Prevents stale cached division from being used

### 2. **Local is Faster for Scores**
- Scores are cached in localStorage for instant load
- Server is synced asynchronously
- Offline queue handles network failures

### 3. **Merge Strategy**
```javascript
// Pseudocode for resume
function resume() {
    const localState = loadFromLocalStorage();
    const serverState = await fetchFromServer();
    
    const mergedState = {
        // Metadata from server (authoritative)
        division: serverState.division,
        eventName: serverState.eventName,
        baleNumber: serverState.baleNumber,
        
        // Scores from local if newer, else server
        scores: localState.scores.length > serverState.scores.length 
            ? localState.scores 
            : serverState.scores,
        
        // Current end from whichever is further
        currentEnd: Math.max(localState.currentEnd, serverState.currentEnd)
    };
    
    return mergedState;
}
```

### 4. **Division Always from Round**
```javascript
// ✅ CORRECT: Division from round record
state.divisionCode = baleData.division;  // From rounds table

// ❌ WRONG: Division from archer profile
state.divisionCode = archer.division;  // This is just their default!
```

---

## Answer to Your Questions

### Q1: Is the division driven by Event-Round-RoundCard?
**A: Yes, 100% correct.** The fix ensures division comes from `rounds.division`, which is set when the coach assigns archers to divisions for the event.

### Q2: How does local data integrate with server for Active Rounds?
**A: Server is the source of truth for the list.**

1. **index.html** queries server for your round history
2. **Server returns** all rounds with metadata (division, bale, ends_completed)
3. **Display shows** server data (conservative, always accurate)
4. **When you click** to resume:
   - Loads local data first (fast)
   - Fetches server data (authoritative)
   - Merges intelligently (newest scores, server metadata)

**This means:**
- ✅ You see accurate division (from event assignment)
- ✅ You see accurate progress (from server)
- ✅ You can resume from any device
- ✅ Local scores are preserved if newer than server

---

## Verification

To verify this is working correctly, check the console logs when resuming:

```javascript
// Should see:
[Phase 0 Session] ✅ Set division from server: VAR
// NOT:
[Phase 0 Session] ⚠️ Set division from first archer: JV
```

If you see the second message, it means the fix needs to be applied.

---

**Summary:**
- ✅ Your understanding of division hierarchy is **perfect**
- ✅ The fix **correctly implements** this hierarchy
- ✅ index.html uses **server as source of truth** for active rounds
- ✅ Local data is **cache + offline resilience**, not source of truth
- ✅ Division always comes from **Event-Round-RoundCard**, never archer profile

The architecture is sound. The fix just ensures the division extraction happens in the right order during resume.
