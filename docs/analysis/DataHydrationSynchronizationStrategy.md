# Data Hydration & Synchronization Strategy

> ⚠️ **DEPRECATED** - This document has been merged into the master strategy.
> 
> **See:** [DATA_SYNCHRONIZATION_STRATEGY.md](../core/DATA_SYNCHRONIZATION_STRATEGY.md)
> 
> This document is kept for historical reference only. For current implementation
> guidance, refer to the master strategy document.
> 
> **Deprecated:** December 1, 2025  
> **Reason:** Merged into universal synchronization rules

**Date:** January 21, 2025  
**Status:** Critical Analysis - Root Cause Identified  
**Priority:** CRITICAL - Must Fix Before Resume Paths

---

## 🎯 Core Problem Identified

**User Observation:** "Is there a hydrate or merge remote server to local data? It seems like that is where we are allowing disconnects to happen, with ambiguous data locally or on the server. then the movement of the data back and forth causes issues?"

**Answer: YES - This is the root cause of all resume issues.**

---

## 🔍 Current State: Ambiguous Data Hydration

### Problem: Multiple Merge Strategies Without Clear Rules

The codebase has **multiple places** where local (localStorage) and server data are merged, but **no consistent strategy**:

1. **`loadExistingScoresForArchers()`** - Merges server scores into local state
2. **`restoreCurrentBaleSession()`** - Merges server bale data with local state  
3. **`handleDirectLink()`** - Merges snapshot archers with bale data
4. **`proceedWithResume()`** - Uses localStorage state, then loads scores
5. **`fetchFullRound()` in live_updates.js** - Hydrates LiveUpdates state from server

**Each uses different logic, causing ambiguity and bugs.**

---

## 📊 Current Merge Points (Where Ambiguity Creeps In)

### 1. `loadExistingScoresForArchers()` (Line ~2500)

**Current Logic:**
```javascript
// Loads server scores and merges into local archer state
// Problem: Doesn't handle conflicts (what if local is newer?)
// Problem: Doesn't verify archer IDs match correctly
// Problem: Merges scores without validating RoundID + Bale Number
```

**Issues:**
- No conflict resolution (local vs server)
- Archer ID matching can fail (extId vs UUID)
- Doesn't verify Scorecard Group (RoundID + Bale Number)

---

### 2. `restoreCurrentBaleSession()` (Line ~1241)

**Current Logic:**
```javascript
// Loads from localStorage session
// Fetches server bale data
// Merges snapshot archers with bale data
// Problem: Includes archers with NULL bale_number
// Problem: Doesn't verify all archers belong to same Scorecard Group
```

**Issues:**
- Merges archers from snapshot + bale data (potential duplicates)
- Includes NULL bale_number archers (cross-contamination)
- No verification of Scorecard Group integrity

---

### 3. `handleDirectLink()` (Line 5827)

**Current Logic:**
```javascript
// Fetches round snapshot (all archers)
// Fetches bale data (bale-specific archers)
// Merges both lists
// Problem: Snapshot may include archers from other bales/rounds
// Problem: Merges without verifying RoundID + Bale Number match
```

**Issues:**
- Merges snapshot (all archers) with bale data (filtered)
- Includes NULL bale_number archers (can pull wrong archers)
- No Scorecard Group verification before merge

---

### 4. `fetchFullRound()` in live_updates.js (Line 466)

**Current Logic:**
```javascript
// Fetches full round from server
// Maps archers to internal state
// Problem: Doesn't filter by bale number
// Problem: Loads all archers in round, not just Scorecard Group
```

**Issues:**
- Loads all archers in round (not just Scorecard Group)
- Doesn't filter by bale number
- Can cause cross-contamination

---

## 💡 Proposed Solution: Clear Synchronization Rules

### Phase 1: Synchronize Data Without Ambiguity

**Goal:** Establish clear rules for data synchronization before fixing resume paths.

---

### Rule 1: Server is Source of Truth for Metadata

**What:** Division, RoundID, Bale Number, EventID, Round Type  
**Source:** Always from server  
**Never:** Use cached metadata from localStorage

```javascript
// ✅ CORRECT
state.divisionCode = serverData.division;  // From rounds table
state.roundId = serverData.round.id;       // From server
state.baleNumber = serverData.baleNumber;  // From server

// ❌ WRONG
state.divisionCode = localStorage.divisionCode;  // Stale cache
state.roundId = cachedState.roundId;             // May be wrong
```

---

### Rule 2: Scores Use "Last Write Wins" Strategy

**What:** Individual end scores  
**Source:** Server if newer timestamp, otherwise keep local if unsynced

```javascript
function mergeScores(localScores, serverScores, syncStatus) {
    const merged = [];
    
    for (let end = 1; end <= 10; end++) {
        const localEnd = localScores[end - 1];
        const serverEnd = serverScores[end - 1];
        const sync = syncStatus[end];
        
        if (sync === 'synced') {
            // Already synced - use server (authoritative)
            merged[end - 1] = serverEnd;
        } else if (sync === 'pending' || sync === 'failed') {
            // Local has unsynced changes - keep local
            merged[end - 1] = localEnd;
        } else if (serverEnd && serverEnd.length > 0) {
            // Server has data, local doesn't - use server
            merged[end - 1] = serverEnd;
        } else {
            // Neither has data - empty
            merged[end - 1] = localEnd || ['', '', ''];
        }
    }
    
    return merged;
}
```

---

### Rule 3: Scorecard Group is Atomic (RoundID + Bale Number)

**What:** Archer list for a bale group  
**Source:** Always fetch from server by RoundID + Bale Number  
**Never:** Merge archers from different Scorecard Groups

```javascript
// ✅ CORRECT: Fetch Scorecard Group from server
async function fetchScorecardGroup(roundId, baleNumber) {
    const response = await fetch(`/v1/rounds/${roundId}/bales/${baleNumber}/archers`);
    const data = await response.json();
    
    // Verify all archers belong to this Scorecard Group
    const validatedArchers = data.archers.filter(archer => {
        return archer.roundId === roundId && archer.baleNumber === baleNumber;
    });
    
    return validatedArchers;
}

// ❌ WRONG: Merge archers from different sources
const merged = [...snapshotArchers, ...baleArchers];  // Ambiguous!
```

---

### Rule 4: Clear State Before Hydration

**What:** Remove all local state before loading from server  
**When:** Always before resuming a Scorecard Group

```javascript
// ✅ CORRECT: Clear state first
function clearState() {
    state.roundId = null;
    state.baleNumber = null;
    state.archers = [];
    state.divisionCode = null;
    // Clear localStorage session
    localStorage.removeItem('current_bale_session');
}

// Then hydrate from server
async function hydrateFromServer(roundId, baleNumber) {
    clearState();  // Clear first
    const scorecardGroup = await fetchScorecardGroup(roundId, baleNumber);
    // Then populate state
}
```

---

### Rule 5: UUID-Only for Archer Identification

**What:** Archer IDs must be UUIDs from database  
**Never:** Use extId, composite IDs, or legacy formats for queries

```javascript
// ✅ CORRECT: Normalize to UUID before use
function normalizeArcherId(archer) {
    if (archer.archerId && isValidUUID(archer.archerId)) {
        return archer.archerId;  // Master UUID
    }
    // Look up UUID by extId if needed
    throw new Error('Cannot resolve UUID');
}

// ❌ WRONG: Use extId or composite ID
const archerId = archer.extId;  // Not unique!
```

---

## 🛠️ Proposed Implementation: Phase 1

### Step 1: Create Centralized Hydration Function

**Single source of truth for data hydration:**

```javascript
/**
 * Hydrate state from server for a specific Scorecard Group
 * @param {string} roundId - Round UUID
 * @param {number} baleNumber - Bale number
 * @param {Object} options - Hydration options
 * @returns {Promise<Object>} Hydrated state
 */
async function hydrateScorecardGroup(roundId, baleNumber, options = {}) {
    // 1. Clear local state first
    clearState();
    
    // 2. Fetch Scorecard Group from server (RoundID + Bale Number)
    const scorecardGroup = await fetchScorecardGroup(roundId, baleNumber);
    
    // 3. Verify Scorecard Group integrity
    validateScorecardGroup(scorecardGroup, roundId, baleNumber);
    
    // 4. Fetch server scores
    const serverScores = await fetchServerScores(roundId, baleNumber);
    
    // 5. Merge with local scores (if option specified)
    const mergedScores = options.mergeLocal 
        ? mergeScoresWithLocal(serverScores, roundId, baleNumber)
        : serverScores;
    
    // 6. Populate state
    state.roundId = roundId;
    state.baleNumber = baleNumber;
    state.divisionCode = scorecardGroup.division;
    state.archers = buildArchersFromScorecardGroup(scorecardGroup, mergedScores);
    
    // 7. Save session
    saveCurrentBaleSession();
    
    return state;
}
```

---

### Step 2: Replace All Merge Points

**Update all resume paths to use centralized hydration:**

1. **`restoreCurrentBaleSession()`** → Use `hydrateScorecardGroup()`
2. **`handleDirectLink()`** → Use `hydrateScorecardGroup()`
3. **`loadExistingRound()`** → Use `hydrateScorecardGroup()` (extract RoundID + Bale Number first)
4. **`proceedWithResume()`** → Use `hydrateScorecardGroup()` (if RoundID + Bale Number available)

---

### Step 3: Add Validation Layer

**Verify data integrity before hydration:**

```javascript
function validateScorecardGroup(scorecardGroup, roundId, baleNumber) {
    // Verify RoundID matches
    if (scorecardGroup.roundId !== roundId) {
        throw new Error(`Round ID mismatch: expected ${roundId}, got ${scorecardGroup.roundId}`);
    }
    
    // Verify all archers belong to this Scorecard Group
    scorecardGroup.archers.forEach(archer => {
        if (archer.baleNumber !== baleNumber) {
            throw new Error(`Archer ${archer.id} not on bale ${baleNumber}`);
        }
        if (!isValidUUID(archer.archerId)) {
            throw new Error(`Archer ${archer.id} has invalid UUID`);
        }
    });
    
    // Verify division is set
    if (!scorecardGroup.division) {
        throw new Error('Scorecard Group missing division');
    }
}
```

---

## 📋 Phase 1 Implementation Checklist

### Database & Backend
- [ ] Verify `/v1/rounds/{roundId}/bales/{baleNumber}/archers` endpoint returns correct Scorecard Group
- [ ] Verify all archers in response belong to RoundID + Bale Number
- [ ] Add validation to prevent cross-contamination

### Frontend Hydration
- [ ] Create `hydrateScorecardGroup()` function
- [ ] Create `clearState()` function
- [ ] Create `validateScorecardGroup()` function
- [ ] Create `mergeScoresWithLocal()` function (with clear rules)
- [ ] Replace all merge points to use centralized hydration

### Testing
- [ ] Test hydration with multiple rounds (same bale number)
- [ ] Test hydration with offline data
- [ ] Test conflict resolution (local vs server)
- [ ] Test Scorecard Group validation

---

## 🎯 Success Criteria for Phase 1

✅ **Clear Rules:**
- Server is source of truth for metadata
- Scores use "Last Write Wins" strategy
- Scorecard Group is atomic (RoundID + Bale Number)
- State is cleared before hydration
- UUID-only for archer identification

✅ **No Ambiguity:**
- Single hydration function (no multiple merge strategies)
- All resume paths use same hydration logic
- Validation catches data integrity issues
- No cross-contamination between Scorecard Groups

✅ **After Phase 1:**
- Resume paths will work correctly (they use centralized hydration)
- No more ambiguous data merging
- Clear error messages when data doesn't match

---

## 🚀 Recommended Approach

**YES - Phase 1 should be "Synchronize Data Without Ambiguity"**

1. **First:** Implement centralized hydration with clear rules
2. **Then:** Fix resume paths (they'll use the centralized hydration)
3. **Finally:** Add other features (Standalone event, bale validation, etc.)

**Why:**
- Resume path bugs are symptoms of ambiguous hydration
- Fix the root cause (hydration) and symptoms (resume bugs) will be fixed
- Makes all future development easier (clear rules)

---

## 📚 Related Documentation

- [RankingRoundRefactorAnalysis.md](RankingRoundRefactorAnalysis.md) - Original analysis
- [RankingRoundImplementationGuidance.md](RankingRoundImplementationGuidance.md) - Implementation guidance
- [RESUME_ROUND_DATA_INTEGRATION_ANALYSIS.md](RESUME_ROUND_DATA_INTEGRATION_ANALYSIS.md) - Data integration analysis

---

**Last Updated:** January 21, 2025  
**Status:** Ready for Implementation  
**Next Step:** Begin Phase 1 - Synchronize Data Without Ambiguity

