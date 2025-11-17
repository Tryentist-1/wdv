# WDV Archery Score Management Suite
## Architecture & Integration Strategy

**Version:** 2.0  
**Date:** November 17, 2025  
**Status:** Master Reference Document

---

## Executive Summary

The WDV Archery Suite consists of **5 scoring modules** in various states of integration. This document provides a unified view of the architecture, identifies inconsistencies, and outlines the integration strategy for remaining modules.

### Current Integration Status

| Module | Status | Storage | Auth | Database | Priority |
|--------|--------|---------|------|----------|----------|
| **Ranking Round 360** | ✅ **INTEGRATED** | DB + localStorage | Event Code | MySQL | LIVE |
| **Ranking Round 300** | ✅ **INTEGRATED** | DB + localStorage | Event Code | MySQL | LIVE |
| **Solo Olympic Match** | ⚠️ **LOCAL ONLY** | localStorage only | None | ❌ No | PHASE 2 |
| **Team Olympic Match** | ⚠️ **LOCAL ONLY** | localStorage only | None | ❌ No | PHASE 2 |
| **Practice Analyzer** | ✅ **STANDALONE** | localStorage only | None | N/A | COMPLETE |

---

## 1. Application Modules Overview

### 1.1 Ranking Round (✅ INTEGRATED)

**Files:**
- `ranking_round.html` (360 round: 12 ends × 3 arrows)
- `ranking_round_300.html` (300 round: 10 ends × 3 arrows)
- `js/ranking_round.js`
- `js/ranking_round_300.js`
- `js/live_updates.js` (API client)
- `js/archer_module.js` (roster management)
- `js/common.js` (shared utilities)

**Storage Strategy:**
```javascript
// Database (MySQL) - Master data
- archers table (master roster)
- events table (competitions)
- rounds table (scoring sessions)
- round_archers table (scorecards)
- end_events table (per-end scores)

// localStorage - Session state & cache
- rankingRound_<date> or rankingRound300_<date> (session state)
- event_entry_code (current event auth)
- event:<eventId>:meta (event metadata cache)
- master_archer_list (roster cache)
- last_fetched_master_list (cache timestamp)

// Cookies - Persistent identification
- oas_archer_id (365 days) - Archer profile ID
- coach_auth (90 days) - Coach authentication
```

**Authentication:**
- Public: Archer list load (no auth)
- Event Code: Score submission, view scorecards
- Coach Code: Full admin access

**Features:**
- ✅ Database-backed scoring
- ✅ Real-time sync across devices
- ✅ Event management
- ✅ Coach console
- ✅ Live leaderboard
- ✅ QR code access
- ✅ Bale group management
- ✅ Scorecard verification

**Documentation:**
- `docs/ARCHER_SCORING_WORKFLOW.md`
- `docs/LIVE_SCORING_IMPLEMENTATION.md`
- `docs/AUTHENTICATION_ANALYSIS.md`
- `docs/OAS_RANKING_ONLINE_3.0_REQUIREMENTS.md`

---

### 1.2 Solo Olympic Match (⚠️ NEEDS INTEGRATION)

**Files:**
- `solo_card.html` - Head-to-head 1v1 match
- `solo_round.html` - Alternative implementation (?)
- `js/solo_card.js` (5 localStorage references)
- `js/solo_round.js` (7 localStorage references)

**Current Storage:**
```javascript
// localStorage ONLY (no database)
- Solo match state
- Archer names
- Set points (first to 6 wins)
- End scores (3 arrows per end)
- Shoot-off handling (5-5 tie)
```

**Current Features:**
- ✅ 1v1 match scoring
- ✅ Set points calculation (2 for win, 1 for tie)
- ✅ First to 6 set points wins
- ✅ 1-arrow shoot-off for 5-5 ties
- ✅ localStorage persistence
- ❌ No database integration
- ❌ No multi-device sync
- ❌ No coach visibility
- ❌ No authentication

**Integration Needs:**
- Database schema for solo matches
- Match creation/retrieval endpoints
- Real-time score sync
- Authentication (event code or match code)
- Coach console integration
- Match history/results

---

### 1.3 Team Olympic Match (⚠️ NEEDS INTEGRATION)

**Files:**
- `team_card.html` - Team vs team match (3 archers each)
- `js/team_card.js` (4 localStorage references)

**Current Storage:**
```javascript
// localStorage ONLY (no database)
- Team match state
- Team names & rosters (3 archers per team)
- Set points (first to 5 wins)
- End scores (6 arrows per end: 2 per archer)
- Shoot-off handling (4-4 tie: 3 arrows, 1 per archer)
```

**Current Features:**
- ✅ Team match scoring (3v3)
- ✅ Set points calculation
- ✅ First to 5 set points wins
- ✅ 3-arrow shoot-off for 4-4 ties
- ✅ localStorage persistence
- ❌ No database integration
- ❌ No multi-device sync
- ❌ No coach visibility
- ❌ No authentication

**Integration Needs:**
- Database schema for team matches
- Team/roster management
- Match creation/retrieval endpoints
- Real-time score sync
- Authentication (event code or match code)
- Coach console integration
- Match history/results

---

### 1.4 Practice Analyzer (✅ STANDALONE)

**Files:**
- `gemini-oneshot.html` - Interactive target practice
- Uses p5.js library (canvas-based)

**Storage:**
```javascript
// localStorage ONLY (by design)
- Arrow placement data
- Group analysis
- Session history
```

**Status:** ✅ **COMPLETE - NO INTEGRATION NEEDED**
- This is intentionally a standalone practice tool
- Doesn't need database (personal practice only)
- No authentication needed
- No coach visibility needed

---

## 2. Core Inconsistencies Identified

### 2.1 Storage Strategy Inconsistency

**Problem:** Different modules use different storage patterns with no unified strategy.

| Module | Database | localStorage | Cookies | sessionStorage |
|--------|----------|--------------|---------|----------------|
| Ranking Round | ✅ Primary | ✅ Cache/State | ✅ Auth/ID | ❌ |
| Solo Match | ❌ None | ✅ Primary | ❌ None | ❌ |
| Team Match | ❌ None | ✅ Primary | ❌ None | ❌ |
| Practice | ❌ N/A | ✅ Only | ❌ None | ❌ |

**Impact:**
- Solo/Team matches isolated (no coach visibility)
- No cross-device sync
- No integration with event management
- Different UX patterns

---

### 2.2 Authentication Inconsistency

**Problem:** Ranking Round has robust auth, Solo/Team have none.

| Module | Public Access | Archer Auth | Coach Auth | Event Integration |
|--------|---------------|-------------|------------|-------------------|
| Ranking Round | ✅ Roster | ✅ Event Code | ✅ Coach Code | ✅ Full |
| Solo Match | ✅ All | ❌ None | ❌ None | ❌ None |
| Team Match | ✅ All | ❌ None | ❌ None | ❌ None |
| Practice | ✅ All | ❌ N/A | ❌ N/A | ❌ N/A |

**Impact:**
- Solo/Team matches not tied to events
- Coaches can't see Solo/Team scores
- No leaderboard for Solo/Team
- Can't track match history

---

### 2.3 Documentation Gaps

**Problem:** Documentation focuses on Ranking Round, ignores Solo/Team.

**Missing Documentation:**
- Solo/Team integration plan
- Unified storage strategy
- Complete module inventory
- Migration path for localStorage data
- Combined README/getting started guide

---

## 3. Unified Storage Strategy

### 3.1 Storage Decision Matrix

**Use Database For:**
- ✅ Master archer roster
- ✅ Event definitions
- ✅ All scores (ranking, solo, team)
- ✅ Match/round metadata
- ✅ Coach-visible data
- ✅ Cross-device sync needs

**Use localStorage For:**
- ✅ Active session state (current round/match)
- ✅ UI preferences
- ✅ Cached roster (with timestamp)
- ✅ Offline score queue
- ✅ Temporary draft data

**Use Cookies For:**
- ✅ Long-term user identification (archer ID)
- ✅ Authentication state (coach auth)
- ✅ Data needing automatic expiry

**Use sessionStorage For:**
- ⚠️ Currently unused (consider for tab-specific state)

---

### 3.2 Recommended Storage Pattern (All Modules)

```javascript
// DATABASE (source of truth)
const PRIMARY_STORAGE = {
  archers: 'MySQL archers table',
  events: 'MySQL events table',
  ranking_rounds: 'MySQL rounds + round_archers + end_events tables',
  solo_matches: 'MySQL solo_matches table (TO BE CREATED)',
  team_matches: 'MySQL team_matches table (TO BE CREATED)',
};

// LOCALSTORAGE (cache + session state)
const SESSION_STORAGE = {
  // Current session (clear on "New Match/Round")
  current_session: {
    type: 'ranking' | 'solo' | 'team' | 'practice',
    id: 'uuid',
    state: {/* round/match-specific state */},
    lastUpdated: timestamp
  },
  
  // Cache (clear when stale)
  cached_archer_list: {
    data: [...],
    fetched_at: timestamp,
    ttl: 3600000 // 1 hour
  },
  
  // Auth (synced with cookies)
  event_entry_code: 'ABC123',
  event_metadata: {/* cached event data */},
  
  // Offline queue
  pending_sync: [
    {endpoint: '/end-events', payload: {...}, timestamp}
  ]
};

// COOKIES (persistent identification)
const PERSISTENT_STORAGE = {
  oas_archer_id: 'uuid', // 365 days
  coach_auth: 'true',    // 90 days
};
```

---

## 4. Integration Plan for Solo & Team Modules

### Phase 2A: Database Schema & API (Backend)

**Priority:** HIGH  
**Effort:** 6-8 hours  
**Status:** NOT STARTED

#### 4.1 Database Schema

**Tables to Create:**

```sql
-- Solo Matches
CREATE TABLE solo_matches (
  id CHAR(36) PRIMARY KEY,
  event_id CHAR(36),                    -- Link to events table
  archer1_id CHAR(36) NOT NULL,          -- From archers table
  archer2_id CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  winner_archer_id CHAR(36),
  final_set_points_a1 INT,
  final_set_points_a2 INT,
  status VARCHAR(20) DEFAULT 'in_progress',
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (archer1_id) REFERENCES archers(id),
  FOREIGN KEY (archer2_id) REFERENCES archers(id),
  INDEX idx_event (event_id),
  INDEX idx_archers (archer1_id, archer2_id)
);

-- Solo Match Ends (set points scoring)
CREATE TABLE solo_match_ends (
  id CHAR(36) PRIMARY KEY,
  match_id CHAR(36) NOT NULL,
  end_number INT NOT NULL,
  archer1_arrows JSON,                   -- [10, 9, 8]
  archer2_arrows JSON,
  archer1_total INT,
  archer2_total INT,
  set_points_awarded VARCHAR(10),        -- 'archer1_2', 'archer2_2', 'tie_1'
  archer1_cumulative_sp INT,
  archer2_cumulative_sp INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES solo_matches(id) ON DELETE CASCADE,
  INDEX idx_match (match_id)
);

-- Team Matches
CREATE TABLE team_matches (
  id CHAR(36) PRIMARY KEY,
  event_id CHAR(36),
  team1_name VARCHAR(100),
  team2_name VARCHAR(100),
  team1_archer_ids JSON,                 -- [uuid1, uuid2, uuid3]
  team2_archer_ids JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  winner_team INT,                       -- 1 or 2
  final_set_points_t1 INT,
  final_set_points_t2 INT,
  status VARCHAR(20) DEFAULT 'in_progress',
  FOREIGN KEY (event_id) REFERENCES events(id),
  INDEX idx_event (event_id)
);

-- Team Match Ends
CREATE TABLE team_match_ends (
  id CHAR(36) PRIMARY KEY,
  match_id CHAR(36) NOT NULL,
  end_number INT NOT NULL,
  team1_arrows JSON,                     -- [10,9,8,7,10,9] (2 per archer)
  team2_arrows JSON,
  team1_total INT,
  team2_total INT,
  set_points_awarded VARCHAR(10),        -- 'team1_2', 'team2_2', 'tie_1'
  team1_cumulative_sp INT,
  team2_cumulative_sp INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES team_matches(id) ON DELETE CASCADE,
  INDEX idx_match (match_id)
);
```

#### 4.2 API Endpoints to Create

**Solo Match Endpoints:**
```
POST   /v1/solo-matches              Create new solo match
GET    /v1/solo-matches/:id           Get match details
POST   /v1/solo-matches/:id/ends     Submit end scores
PATCH  /v1/solo-matches/:id          Update match (complete, etc)
GET    /v1/events/:id/solo-matches   List matches for event
```

**Team Match Endpoints:**
```
POST   /v1/team-matches              Create new team match
GET    /v1/team-matches/:id          Get match details
POST   /v1/team-matches/:id/ends     Submit end scores
PATCH  /v1/team-matches/:id          Update match
GET    /v1/events/:id/team-matches   List matches for event
```

**Authentication:**
- Event code required (same as ranking rounds)
- Coach code for admin operations
- Match ID + event code for score submission

---

### Phase 2B: Frontend Integration (Client)

**Priority:** MEDIUM  
**Effort:** 8-10 hours per module  
**Status:** NOT STARTED

#### 4.3 Solo/Team Module Refactoring

**Pattern to Follow (from Ranking Round):**

```javascript
// 1. Remove all direct localStorage references
// 2. Add LiveUpdates.js integration
// 3. Add authentication handling
// 4. Add offline queue for scores
// 5. Keep session state in localStorage (cache only)

// BEFORE (current):
localStorage.setItem('solo_match_state', JSON.stringify(matchData));

// AFTER (integrated):
// Save to database first
await LiveUpdates.request('/solo-matches', 'POST', matchData);

// Cache state locally
localStorage.setItem('current_session', JSON.stringify({
  type: 'solo',
  match_id: matchData.id,
  cached_at: Date.now()
}));
```

**Files to Update:**
- `js/solo_card.js` - Add database calls
- `js/team_card.js` - Add database calls
- `solo_card.html` - Add event code entry
- `team_card.html` - Add event code entry

---

### Phase 2C: Coach Console Integration

**Priority:** MEDIUM  
**Effort:** 4-6 hours  
**Status:** NOT STARTED

**Add to Coach Console:**
- View Solo matches tab
- View Team matches tab
- Match results display
- Match history
- Export match results

---

## 5. Recommended Implementation Order

### Sprint 1: Documentation & Strategy ✅ DONE
- [x] Create this master architecture document
- [x] Document storage strategy (`CLEANUP_ACTION_PLAN.md`)
- [x] Document authentication (`AUTHENTICATION_ANALYSIS.md`)
- [x] Create unified README (see below)

### Sprint 2: Backend Foundation
**Estimated:** 8-10 hours

- [ ] Create migration SQL for solo_matches tables
- [ ] Create migration SQL for team_matches tables
- [ ] Add solo match API endpoints to `api/index.php`
- [ ] Add team match API endpoints
- [ ] Test endpoints with curl/Postman
- [ ] Update `api/test_harness.html` for new endpoints

### Sprint 3: Solo Module Integration
**Estimated:** 10-12 hours

- [ ] Refactor `js/solo_card.js` to use database
- [ ] Add authentication to solo_card.html
- [ ] Add event code entry/verification
- [ ] Add offline sync queue
- [ ] Update solo_card.html UI for event integration
- [ ] Add to coach console
- [ ] Test end-to-end

### Sprint 4: Team Module Integration
**Estimated:** 10-12 hours

- [ ] Refactor `js/team_card.js` to use database
- [ ] Add authentication to team_card.html
- [ ] Add event code entry/verification
- [ ] Add offline sync queue
- [ ] Update team_card.html UI for event integration
- [ ] Add to coach console
- [ ] Test end-to-end

### Sprint 5: Testing & Documentation
**Estimated:** 4-6 hours

- [ ] End-to-end testing all modules
- [ ] Update all documentation
- [ ] Create migration guide for users
- [ ] Update main README
- [ ] Deploy to production

**Total Estimated Effort:** 32-40 hours

---

## 6. Migration Strategy for Existing Users

### For Coaches
1. No action needed - new features additive
2. Can start using Solo/Team modules immediately
3. Existing ranking rounds unaffected

### For Archers (Solo/Team Users)
**If localStorage data exists:**
1. Display migration prompt on module load
2. Offer to "Create Event" or "Use Manual Mode"
3. Option to export localStorage data before clearing
4. One-time migration, then database-backed

**Code Pattern:**
```javascript
function checkForLegacyData() {
  const legacyData = localStorage.getItem('solo_match_state');
  if (legacyData && !localStorage.getItem('migration_complete')) {
    showMigrationModal({
      onExport: () => exportLegacyData(legacyData),
      onMigrate: () => migrateToDB(legacyData),
      onSkip: () => markMigrationComplete()
    });
  }
}
```

---

## 7. Success Criteria

### For Solo/Team Integration

✅ **Database Storage:**
- All scores saved to MySQL
- No critical data in localStorage only

✅ **Authentication:**
- Event code required for score submission
- Coach can view all matches
- Matches linked to events

✅ **Cross-Device Sync:**
- Match state available on any device
- Offline queue works
- Auto-sync when online

✅ **Coach Visibility:**
- Coach console shows Solo/Team matches
- Export functionality for results
- Match history available

✅ **Backward Compatible:**
- Existing ranking rounds work
- No breaking changes
- Migration path for localStorage data

---

## 8. Risk Assessment

### Low Risk
- ✅ Database schema additions (additive only)
- ✅ API endpoint additions (no changes to existing)
- ✅ Documentation updates

### Medium Risk
- ⚠️ localStorage to database migration (test thoroughly)
- ⚠️ Authentication changes to Solo/Team (UX impact)
- ⚠️ Offline sync implementation

### High Risk
- ❌ None identified (all changes are additive)

### Mitigation Strategies
1. **Feature Flags:** Deploy database/API first, activate frontend later
2. **Parallel Testing:** Keep localStorage version available during transition
3. **Gradual Rollout:** Start with Solo, then Team, then deprecate localStorage
4. **Backup Plan:** Maintain localStorage fallback for 30 days

---

## 9. Open Questions

### Technical
- [ ] Should Solo/Team use same event model as Ranking Round?
- [ ] Do we need match-specific entry codes (vs event codes)?
- [ ] Should old localStorage data auto-migrate or manual?
- [ ] Do we need match brackets/tournaments (future)?

### UX
- [ ] How do archers create a Solo/Team match?
- [ ] Can matches exist outside of events?
- [ ] Should coach see live Solo/Team scores?
- [ ] Do we need match scheduling features?

### Business
- [ ] When is best time to integrate (off-season)?
- [ ] Should we deprecate localStorage immediately?
- [ ] Do we need data migration tools?
- [ ] What analytics do coaches need from matches?

---

## 10. Next Steps

### Immediate (This Week)
1. ✅ Review this document with team
2. ✅ Create unified README (separate task)
3. ✅ Finalize integration timeline
4. ✅ Prioritize Solo vs Team (which first?)

### Short Term (Next Sprint)
1. Create database migration SQL
2. Implement Solo match API endpoints
3. Test endpoints thoroughly
4. Begin Solo module refactoring

### Long Term (Next Quarter)
1. Complete Solo integration
2. Complete Team integration
3. Deprecate localStorage-only modes
4. Add advanced features (tournaments, brackets)

---

## Appendix A: File Inventory

### HTML Pages
- `index.html` - Main landing page
- `ranking_round.html` - 360 round scoring ✅
- `ranking_round_300.html` - 300 round scoring ✅
- `solo_card.html` - 1v1 match ⚠️
- `solo_round.html` - Alternative solo? ⚠️
- `team_card.html` - Team match ⚠️
- `gemini-oneshot.html` - Practice analyzer ✅
- `coach.html` - Coach console ✅
- `results.html` - Live leaderboard ✅
- `archer_list.html` - Roster management ✅
- `archer_history.html` - Archer stats ✅

### JavaScript Modules
- `js/ranking_round.js` ✅
- `js/ranking_round_300.js` ✅
- `js/live_updates.js` ✅ (API client)
- `js/archer_module.js` ✅ (roster)
- `js/common.js` ✅ (shared utilities)
- `js/coach.js` ✅
- `js/solo_card.js` ⚠️ (needs integration)
- `js/solo_round.js` ⚠️ (needs integration)
- `js/team_card.js` ⚠️ (needs integration)

### Backend API
- `api/index.php` - Main router
- `api/db.php` - Database + auth
- `api/config.php` - Configuration
- `api/sql/` - Schema migrations

---

**Document Owner:** Development Team  
**Last Updated:** November 17, 2025  
**Next Review:** After Sprint 2 completion

