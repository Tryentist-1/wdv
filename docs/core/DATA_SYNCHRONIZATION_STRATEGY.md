# Data Synchronization Strategy

**Date:** December 1, 2025  
**Status:** Master Reference Document  
**Version:** 1.0  
**Priority:** CRITICAL - Core System Architecture

---

## 🎯 Purpose

This document establishes **universal rules** for synchronizing data between local storage (localStorage) and remote server (database) across **all modules** in the WDV Archery Suite.

**Use this document as the master reference for:**
- Ranking Rounds
- Solo Matches
- Team Matches
- Future modules (Brackets, Events, etc.)

---

## 🔍 Problem Statement

**Root Cause:** Ambiguous data hydration/merging between localStorage and server causes bugs, data corruption, and resume failures.

**Symptoms:**
- Resume paths load incorrect data
- Cross-contamination between sessions
- Lost scores during sync
- Inconsistent state across devices

**Solution:** Establish clear, universal rules for data synchronization that all modules follow.

---

## 📊 Three-Tier Storage Architecture

### Tier 1: Database (MySQL) - Source of Truth

**What:** All permanent, authoritative data  
**Examples:**
- Round metadata (division, event_id, round_type)
- Archer assignments to rounds (`round_archers`)
- Score data (`end_events`, `solo_match_sets`, `team_match_sets`)
- Event metadata
- Match metadata

**Rules:**
- ✅ **Always authoritative** for metadata (division, IDs, timestamps)
- ✅ **Always authoritative** for synced scores (has `synced` status)
- ✅ **Never bypass** - all writes must go through API
- ✅ **Never edit directly** - use API endpoints

---

### Tier 2: localStorage - Cache + Session State

**What:** Temporary session data and offline queue  
**Examples:**
- Session state (`rankingRound300_<date>`, `soloCard_session_<date>`)
- Minimal recovery data (`current_bale_session`)
- Offline queue (`luq:${roundId}`, `luq:solo:${matchId}`)
- Cached event data (`event:<eventId>:archers_v2`, `event:<eventId>:meta`)

**Rules:**
- ✅ **Cache only** - can be reconstructed from server
- ✅ **Session state** - temporary, cleared on logout
- ✅ **Offline queue** - pending writes when offline
- ❌ **Never primary** - localStorage is not source of truth
- ❌ **Never trusted** - always verify with server

---

### Tier 3: Cookies - Persistent Identification

**What:** Long-term user identification  
**Examples:**
- `oas_archer_id` - Archer UUID (365 days)
- `coach_auth` - Coach authentication

**Rules:**
- ✅ **Identification only** - not data storage
- ✅ **Long expiration** - persists across sessions
- ❌ **Never store scores** - use localStorage/database

---

## 🔄 Universal Synchronization Rules

### Rule 1: Server is Source of Truth for Metadata

**What:** All structural/organizational data  
**Examples:** Division, RoundID, Bale Number, EventID, MatchID, Round Type, Status

**Implementation:**
```javascript
// ✅ CORRECT: Always fetch from server
const serverData = await fetchScorecardGroup(roundId, baleNumber);
state.divisionCode = serverData.division;      // From rounds table
state.roundId = serverData.round.id;          // From server
state.baleNumber = serverData.baleNumber;     // From server

// ❌ WRONG: Never use cached metadata
state.divisionCode = localStorage.getItem('divisionCode');  // Stale!
state.roundId = cachedState.roundId;                        // May be wrong!
```

**Why:**
- Metadata changes (e.g., division reassignment, round closure)
- Multiple devices must stay in sync
- Cached metadata can become stale

**When:**
- **Always** when resuming/resuming a session
- **Always** when fetching data for display
- **Before** any data merge operation

---

### Rule 2: Scores Use "Last Write Wins" with Sync Status

**What:** Individual score data (ends, sets, points)  
**Strategy:** Server if synced, local if pending/failed, server if newer timestamp

**Implementation:**
```javascript
/**
 * Merge scores using sync status to determine source
 * @param {Array} localScores - Local score array
 * @param {Array} serverScores - Server score array  
 * @param {Object} syncStatus - Sync status per score (e.g., { endNumber: 'synced'|'pending'|'failed' })
 * @returns {Array} Merged scores
 */
function mergeScores(localScores, serverScores, syncStatus) {
    const merged = [];
    
    for (let i = 0; i < localScores.length; i++) {
        const localScore = localScores[i];
        const serverScore = serverScores[i];
        const sync = syncStatus[i + 1]; // endNumber is 1-indexed
        
        if (sync === 'synced') {
            // Already synced - use server (authoritative)
            merged[i] = serverScore;
        } else if (sync === 'pending' || sync === 'failed') {
            // Local has unsynced changes - keep local (will sync later)
            merged[i] = localScore;
        } else if (serverScore && hasData(serverScore)) {
            // Server has data, local doesn't - use server
            merged[i] = serverScore;
        } else {
            // Neither has data - keep local (empty or partial)
            merged[i] = localScore || createEmptyScore();
        }
    }
    
    return merged;
}

function hasData(score) {
    // Check if score array has any non-empty values
    return Array.isArray(score) && score.some(val => val !== '' && val !== null && val !== undefined);
}
```

**Why:**
- Preserves unsynced local work (user hasn't lost data)
- Uses authoritative server data when synced
- Handles offline scenarios gracefully

**When:**
- **Always** when hydrating state from server
- **Always** when resuming a session
- **Before** displaying scores to user

---

### Rule 3: Atomic Data Units - Fetch Complete Units from Server

**What:** Logical groupings of data that must stay together  
**Examples:**
- Scorecard Group (RoundID + Bale Number) for Ranking Rounds
- Match (MatchID) for Solo/Team Matches
- Event Snapshot (EventID) for Event data

**Implementation:**
```javascript
// ✅ CORRECT: Fetch complete atomic unit
async function fetchScorecardGroup(roundId, baleNumber) {
    const response = await fetch(`/v1/rounds/${roundId}/bales/${baleNumber}/archers`);
    const data = await response.json();
    
    // Verify all archers belong to this atomic unit
    const validatedArchers = data.archers.filter(archer => {
        return archer.roundId === roundId && archer.baleNumber === baleNumber;
    });
    
    return {
        roundId: data.roundId,
        baleNumber: data.baleNumber,
        division: data.division,
        archers: validatedArchers
    };
}

// ❌ WRONG: Merge data from different sources
const snapshotArchers = await fetchSnapshot(roundId);  // All archers in round
const baleArchers = await fetchBale(roundId, baleNumber);  // Bale-specific
const merged = [...snapshotArchers, ...baleArchers];  // Ambiguous! Can mix units
```

**Why:**
- Prevents cross-contamination between data units
- Ensures data integrity
- Makes validation possible

**When:**
- **Always** when loading data for a session
- **Always** when resuming
- **Never** mix data from different atomic units

---

### Rule 4: Clear State Before Hydration

**What:** Remove all local state before loading from server  
**When:** Always before hydrating state from server

**Implementation:**
```javascript
/**
 * Clear all state before hydration to prevent ambiguity
 */
function clearState() {
    // Clear state object
    state.roundId = null;
    state.baleNumber = null;
    state.archers = [];
    state.divisionCode = null;
    state.scores = [];
    
    // Clear localStorage session
    localStorage.removeItem('current_bale_session');
    
    // Clear any cached metadata
    // (Keep offline queue - that's for writes, not state)
}

/**
 * Hydrate state from server (atomic operation)
 */
async function hydrateFromServer(roundId, baleNumber) {
    // 1. Clear state first
    clearState();
    
    // 2. Fetch atomic unit from server
    const scorecardGroup = await fetchScorecardGroup(roundId, baleNumber);
    
    // 3. Validate atomic unit integrity
    validateScorecardGroup(scorecardGroup, roundId, baleNumber);
    
    // 4. Populate state from server
    state.roundId = scorecardGroup.roundId;
    state.baleNumber = scorecardGroup.baleNumber;
    state.divisionCode = scorecardGroup.division;
    
    // 5. Merge scores with sync status
    const mergedScores = await mergeScoresWithServer(scorecardGroup.archers);
    
    // 6. Build archers with merged scores
    state.archers = buildArchersFromScorecardGroup(scorecardGroup, mergedScores);
    
    // 7. Save session for recovery
    saveCurrentBaleSession();
    
    return state;
}
```

**Why:**
- Prevents mixing old and new data
- Ensures clean state
- Makes debugging easier

**When:**
- **Always** before fetching from server
- **Always** when resuming a session
- **Never** skip clearing (even if state looks empty)

---

### Rule 5: UUID-Only for Entity Identification

**What:** All entity IDs (archers, rounds, matches, events)  
**Format:** Standard UUID (e.g., `3c7533af-eda1-48c7-b688-3279e75cc697`)

**Implementation:**
```javascript
/**
 * Normalize entity ID to UUID format
 * @param {Object|string} entity - Entity object or ID string
 * @returns {string} UUID or throws error
 */
function normalizeEntityId(entity) {
    const id = typeof entity === 'string' ? entity : (entity.id || entity.archerId || entity.matchId || entity.roundId);
    
    if (!id) {
        throw new Error('Entity missing ID');
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
        throw new Error(`Invalid UUID format: ${id}`);
    }
    
    return id;
}

// ✅ CORRECT: Always normalize before use
const archerId = normalizeEntityId(archer);
const response = await fetch(`/v1/archers/${archerId}/history`);

// ❌ WRONG: Use extId or composite ID
const archerId = archer.extId;  // Not unique!
const archerId = `${firstName}-${lastName}-${school}`;  // Collisions!
```

**Why:**
- Ensures uniqueness across all entities
- Prevents ID format mismatches
- Makes queries reliable

**When:**
- **Always** before database queries
- **Always** before API calls
- **Always** when comparing IDs

---

### Rule 6: Centralized Hydration Function

**What:** Single function for loading data from server  
**Purpose:** Ensure all modules follow same rules

**Implementation Pattern:**
```javascript
/**
 * Universal hydration function pattern
 * Each module implements this with module-specific details
 * 
 * @param {string} entityId - Primary entity ID (roundId, matchId, etc.)
 * @param {Object} context - Additional context (baleNumber, bracketId, etc.)
 * @param {Object} options - Hydration options
 * @returns {Promise<Object>} Hydrated state
 */
async function hydrateEntity(entityId, context, options = {}) {
    // 1. Clear state
    clearState();
    
    // 2. Validate inputs
    validateInputs(entityId, context);
    
    // 3. Fetch atomic unit from server
    const serverData = await fetchAtomicUnit(entityId, context);
    
    // 4. Validate atomic unit integrity
    validateAtomicUnit(serverData, entityId, context);
    
    // 5. Merge scores (if applicable)
    const mergedData = options.mergeLocal 
        ? await mergeWithLocal(serverData, entityId, context)
        : serverData;
    
    // 6. Populate state
    populateState(mergedData);
    
    // 7. Save session
    saveSession(entityId, context);
    
    return state;
}
```

**Module-Specific Examples:**
- **Ranking Rounds:** `hydrateScorecardGroup(roundId, baleNumber)`
- **Solo Matches:** `hydrateMatch(matchId)`
- **Team Matches:** `hydrateTeamMatch(matchId)`

**Why:**
- Single source of truth for hydration logic
- Consistent behavior across modules
- Easier to debug and maintain

**When:**
- **Always** use centralized hydration function
- **Never** create ad-hoc merge logic
- **All** resume paths must use this function

---

## 🔧 Module-Specific Implementation

### Ranking Rounds

**Atomic Unit:** Scorecard Group (RoundID + Bale Number)

```javascript
async function hydrateScorecardGroup(roundId, baleNumber) {
    clearState();
    
    // Fetch atomic unit
    const response = await fetch(`/v1/rounds/${roundId}/bales/${baleNumber}/archers`);
    const scorecardGroup = await response.json();
    
    // Validate
    validateScorecardGroup(scorecardGroup, roundId, baleNumber);
    
    // Merge scores
    const mergedScores = await mergeScoresWithServer(scorecardGroup.archers);
    
    // Populate state
    state.roundId = roundId;
    state.baleNumber = baleNumber;
    state.divisionCode = scorecardGroup.division;
    state.archers = buildArchers(scorecardGroup.archers, mergedScores);
    
    saveCurrentBaleSession();
    return state;
}
```

---

### Solo Matches

**Atomic Unit:** Match (MatchID)

```javascript
async function hydrateMatch(matchId) {
    clearState();
    
    // Fetch atomic unit
    const response = await fetch(`/v1/solo-matches/${matchId}`);
    const matchData = await response.json();
    
    // Validate
    validateMatch(matchData, matchId);
    
    // Merge sets (if local has unsynced sets)
    const mergedSets = await mergeSetsWithServer(matchData.sets);
    
    // Populate state
    state.matchId = matchId;
    state.archer1 = matchData.archer1;
    state.archer2 = matchData.archer2;
    state.sets = mergedSets;
    
    saveMatchSession();
    return state;
}
```

---

### Team Matches

**Atomic Unit:** Match (MatchID)

```javascript
async function hydrateTeamMatch(matchId) {
    clearState();
    
    // Fetch atomic unit
    const response = await fetch(`/v1/team-matches/${matchId}`);
    const matchData = await response.json();
    
    // Validate
    validateTeamMatch(matchData, matchId);
    
    // Merge sets
    const mergedSets = await mergeSetsWithServer(matchData.sets);
    
    // Populate state
    state.matchId = matchId;
    state.team1 = matchData.team1;
    state.team2 = matchData.team2;
    state.sets = mergedSets;
    
    saveTeamMatchSession();
    return state;
}
```

---

## 📋 Implementation Checklist

### Phase 1: Centralized Hydration Functions

- [ ] Create `hydrateScorecardGroup()` for Ranking Rounds
- [ ] Create `hydrateMatch()` for Solo Matches
- [ ] Create `hydrateTeamMatch()` for Team Matches
- [ ] Add validation functions for each module
- [ ] Add merge functions with sync status

### Phase 2: Replace All Merge Points

- [ ] Replace `loadExistingScoresForArchers()` calls
- [ ] Replace `restoreCurrentBaleSession()` logic
- [ ] Replace `handleDirectLink()` merge logic
- [ ] Replace all resume path merge points
- [ ] Update Solo Match resume logic
- [ ] Update Team Match resume logic

### Phase 3: Testing

- [ ] Test hydration with multiple sessions
- [ ] Test hydration with offline data
- [ ] Test conflict resolution (local vs server)
- [ ] Test atomic unit validation
- [ ] Test UUID normalization
- [ ] Test cross-module scenarios

---

## ✅ Success Criteria

### Universal Rules Applied

- ✅ Server is source of truth for metadata
- ✅ Scores use "Last Write Wins" with sync status
- ✅ Atomic data units fetched complete
- ✅ State cleared before hydration
- ✅ UUID-only for entity identification
- ✅ Centralized hydration functions

### No Ambiguity

- ✅ Single hydration function per module
- ✅ All resume paths use centralized hydration
- ✅ Validation catches data integrity issues
- ✅ No cross-contamination between sessions
- ✅ Clear error messages when data doesn't match

### Module Compliance

- ✅ Ranking Rounds follow rules
- ✅ Solo Matches follow rules
- ✅ Team Matches follow rules
- ✅ Future modules will follow rules

---

## 📚 Related Documentation

### Master Architecture
- [APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md](APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md) - Overall system architecture

### Module-Specific
- [RESUME_ROUND_DATA_INTEGRATION_ANALYSIS.md](../analysis/RESUME_ROUND_DATA_INTEGRATION_ANALYSIS.md) - Ranking Round data integration (deprecated - see this doc)
- Solo Match sync patterns (to be documented)
- Team Match sync patterns (to be documented)

### Deprecated Documents (See Deprecation Plan)

- `STORAGE_TIER_AUDIT.md` - Replaced by this document
- `RESUME_ROUND_DATA_INTEGRATION_ANALYSIS.md` - Replaced by this document
- Module-specific data flow docs - Replaced by this document

---

**Last Updated:** January 21, 2025  
**Version:** 1.0  
**Status:** Master Reference - All Modules Must Follow  
**Next Review:** After Phase 1 Implementation

