# WDV Archery Score Management Suite
## Architecture & Integration Strategy

**Version:** 2.1  
**Date:** November 21, 2025  
**Status:** Master Reference Document

---

## Executive Summary

The WDV Archery Suite consists of **5 scoring modules** in various states of integration. This document provides a unified view of the architecture, identifies inconsistencies, and outlines the integration strategy for remaining modules.

> **🎯 CRITICAL:** Before reading this document, understand the complete scoring workflow:  
> See [BALE_GROUP_SCORING_WORKFLOW.md](BALE_GROUP_SCORING_WORKFLOW.md) for the end-to-end process from setup through verification and event closure. This workflow drives all architectural decisions.

### Current Integration Status

| Module | Database | UI Components | Status | Priority |
|--------|----------|---------------|--------|----------|
| **Ranking Round 360** | ✅ MySQL | ⚠️ Legacy CSS | ✅ **INTEGRATED** | LIVE |
| **Ranking Round 300** | ✅ MySQL | ⚠️ Legacy CSS | ✅ **INTEGRATED** | LIVE |
| **Solo Olympic Match** | ✅ MySQL | ✅ **ArcherSelector** | ✅ **INTEGRATED** | LIVE |
| **Team Olympic Match** | ✅ MySQL | ✅ **ArcherSelector** | ✅ **INTEGRATED** | LIVE |
| **Bracket Management** | ✅ MySQL | ✅ Tailwind | ✅ **INTEGRATED** | LIVE |
| **Practice Analyzer** | N/A | ✅ p5.js | ✅ **STANDALONE** | COMPLETE |

### Standardized Components Status (v1.5.0)

| Component | Status | Integration | Files |
|-----------|--------|-------------|-------|
| **ArcherSelector** | ✅ **COMPLETE** | Team Module | `js/archer_selector.js` |
| **ScoreKeypad** | ✅ **COMPLETE** | Available | `js/score_keypad.js` |
| **ScorecardView** | ✅ **ENHANCED** | All Modules | `js/scorecard_view.js` |

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

### 1.2 Solo Olympic Match (✅ INTEGRATED – Phase 2)

**Files:**
- `solo_card.html` – Tailwind-based iPhone layout with event/bracket selectors
- `js/solo_card.js` – Database-backed state machine + keypad renderer
- `js/solo_round.js` – Legacy local-only build (kept for backwards compatibility)

**Storage Strategy:**
```javascript
// Database (MySQL)
- solo_matches (match metadata, match_code, bracket/event links)
- solo_match_archers (two positions + per-archer metadata)
- solo_match_sets (ends 1-5 + shoot-off, tens/xs tracking)
- solo_match_lock_history (audit trail for coach verification)

// localStorage (per-session cache)
- soloCard_session_<date> (matchId, archer IDs, event/bracket context)
- solo_match:<event>:<bracket>:<date> (cached matchId + matchCode reuse)
- live_updates queue (pending set posts when offline)

// Cookies
- `oas_archer_id` (shared via common.js for identification)
```

**Authentication & Sync:**
- `LiveUpdates.ensureSoloMatch/ensureSoloArcher/postSoloSet` hit `/v1/solo-matches` endpoints
- Supports event entry codes OR generated match codes (`solo-[INITIALS]-[MMDD]`)
- Offline queue persists pending sets and flushes via `window.LiveUpdates.flushSoloQueue(matchId)`

**Features:**
- Dual archer selector powered by `ArcherModule` with favorites, search, and safe-area sized buttons
- Event + bracket dropdown populates from `GET /v1/events` and `GET /v1/events/:id/brackets`
- Match restoration via `GET /v1/solo-matches/:id`
- Score table renders set points, shoot-off, and sync indicators (lines 378–520 in `js/solo_card.js`)
- Export modal (screenshot, JSON, email) to keep parity with ranking rounds

> `solo_round.html/js` remain as frozen legacy references; all new work should extend `solo_card.*`.

---

### 1.3 Team Olympic Match (✅ INTEGRATED – Phase 2)

**Files:**
- `team_card.html` – Tailwind UI for team setup + scoring
- `js/team_card.js` – Database-backed 3v3 scoring logic

**Storage Strategy:**
```javascript
// Database (MySQL)
- team_matches (match metadata, match_code, bracket/event links)
- team_match_teams (two teams per match)
- team_match_archers (up to three per team)
- team_match_sets (4 sets + shoot-off rows, tens/xs)
- team_match_lock_history (audit trail)

// localStorage (session + offline resilience)
- teamCard_session_<date> (matchId, team IDs, selected archers)
- team_match:<event>:<bracket>:<date> cache + `team_match_code:<matchId>`
- live_updates queue namespaces per match/team
```

**Authentication & Sync:**
- Uses the same LiveUpdates client (`ensureTeamMatch`, `ensureTeam`, `ensureTeamArcher`, `postTeamSet`, `flushTeamQueue`)
- Standalone matches allowed with generated `team-[INITIALS]-[MMDD]` codes; event/bracket linking enforced when entry code present
- Coach verification happens via `/v1/team-matches/:id/verify`

**Features:**
- Flexible roster selector that enforces mirrored team sizes (lines 205–309 in `js/team_card.js`)
- Set-by-set scoreboard with 6 arrow inputs per team, set points, sync badges, and shoot-off logic (lines 360–520)
- Restores ongoing matches via `GET /v1/team-matches/:id`, including per-archer mappings
- Exposes export/reset tooling consistent with Solo + Ranking

**Legacy Note:** `team_round.css` + older scorecard files are retained for archival purposes but are no longer used in production.

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

## 2. Core Focus After Phase 2

Phase 2 delivered full-stack Solo/Team integration. The next bottleneck is UI consistency: ranking rounds still look and behave differently from the Tailwind-based Solo/Team modules, and three separate results surfaces duplicate logic. The following gaps are now the priorities.

### 2.1 UI Framework Divergence
- `ranking_round.html` and `ranking_round_300.html` still load `css/main.css` and the legacy table layout instead of Tailwind (`solo_card.html`/`team_card.html` ship with `css/tailwind-compiled.css`).
- Safe-area padding, touch target sizing, and dark-mode toggles exist in Solo/Team, Results, and Coach Console, but not in the ranking pages.
- Maintaining two styling systems (legacy CSS + Tailwind) slows down adjustments for iPhone-first layouts.

### 2.2 Archer List & Score Helpers Duplicated
- `getRosterState`/`renderArcherSelectList` are re-implemented in `js/ranking_round.js:151-360`, `js/ranking_round_300.js:210-420`, `js/solo_card.js:188-260`, and `js/team_card.js:203-315` even though `js/archer_module.js` already normalizes roster data.
- `parseScoreValue`/`getScoreColor` live in `js/common.js`, but the same helpers are copied into `js/solo_card.js`, `js/team_card.js`, `js/ranking_round.js`, `js/ranking_round_300.js`, and `js/scorecard_view.js`.
- Result: inconsistent favorites icons, sorting, and color semantics between modules.

### 2.3 Results & Scorecard Rendering Fragmentation
- `results.html:200-334`, `archer_results_pivot.html:334-520`, and `archer_history.html:200-282` each implement their own leaderboard tables, filtering logic, and dark-mode toggles even though they all consume the same `/v1/events/:id/snapshot` or `/v1/archers/:id/history` payloads.
- `js/scorecard_view.js` already encapsulates the per-archer card UI, but every view still manually transforms API responses, recreates rank colors, and wires click handlers.
- Maintaining three distinct renderers complicates feature requests such as “show verification badges everywhere” or “add Swiss bracket standings to any results view.”

### 2.4 Legacy Scripts Still Shipping
- `js/score.js`, `solo_round.html/js`, and older CSS bundles remain in the repo for historical reasons. They are useful references but show up in IDE search results and confuse new contributors.
- Without clear guidance, fixes occasionally land in the wrong file (e.g., modifying `solo_round.js` instead of `solo_card.js`).

---

## 3. Shared UI Standardization <a id="shared-ui-standardization"></a>

### 3.1 Standardized Components (✅ v1.5.0 - COMPLETED)

#### ✅ ArcherSelector Component (`js/archer_selector.js`)
**Status:** Complete and integrated in Team module

**Features:**
- Configurable selection modes (`multi`, `dual`, `team`)
- Real-time search and filtering
- Favorites management with star toggle
- Avatar display support
- Mobile-first responsive design (44px touch targets)
- Consistent visual language across modules

**Integration Status:**
- ✅ **Team Module** - Complete integration with beautiful UI
- ✅ **Solo Module** - Complete integration with A1/A2 selection
- ⏳ **Ranking Rounds** - Next target (complex: 4+ archers)

**API:**
```javascript
const selector = ArcherSelector.init(container, {
  groups: [
    { id: 'T1', label: 'Team 1', max: 3, buttonText: 'T1' },
    { id: 'T2', label: 'Team 2', max: 3, buttonText: 'T2' }
  ],
  onSelectionChange: (selections) => { /* handle changes */ },
  onFavoriteToggle: (archerId, isFavorite) => { /* handle favorites */ },
  showAvatars: true,
  showFavoriteToggle: true
});
```

#### ✅ ScoreKeypad Component (`js/score_keypad.js`)
**Status:** Complete and available for integration

**Features:**
- Touch-optimized 4×3 layout (X, 10-1, M buttons)
- Score color coding (gold, red, blue, black, white)
- Auto-advance functionality
- Customizable callbacks and behavior
- Consistent with archery ring colors

**Integration Status:**
- ✅ **Available** - Ready for use in all modules
- ⏳ **Integration Pending** - Not yet integrated in any module

**API:**
```javascript
const keypad = ScoreKeypad.init(container, {
  onScoreInput: (value) => { /* handle score */ },
  onMiss: () => { /* handle miss */ },
  onClear: () => { /* handle clear */ },
  autoAdvance: true,
  showColors: true
});
```

#### ✅ Enhanced ScorecardView (`js/scorecard_view.js`)
**Status:** Enhanced with new rendering capabilities

**New Features:**
- `renderArcherTable()` function for consistent table rendering
- Configurable options for different use cases
- Reusable across multiple modules
- Consistent styling and behavior

### 3.2 Integration Progress

| Module | ArcherSelector | ScoreKeypad | ScorecardView | Status |
|--------|----------------|-------------|---------------|--------|
| **Team Match** | ✅ Complete | ⏳ Available | ✅ Enhanced | **INTEGRATED** |
| **Solo Match** | ✅ Complete | ⏳ Available | ✅ Enhanced | **INTEGRATED** |
| **Ranking Round** | ⏳ Next | ⏳ Available | ✅ Enhanced | Ready for integration |
| **Ranking Round 300** | ⏳ Next | ⏳ Available | ✅ Enhanced | Ready for integration |

### 3.3 Next Integration Steps

#### Phase 1: Solo Module Integration
**Target:** Solo Card (`solo_card.html`, `js/solo_card.js`)
**Complexity:** Low (2 archers, simpler workflow)
**Benefits:** Consistent UX, reduced code duplication

#### Phase 2: Ranking Rounds Integration  
**Target:** Both ranking round modules
**Complexity:** High (4+ archers, complex bale management)
**Benefits:** Full UI consistency, legacy CSS removal

#### Phase 3: Results View Unification
**Target:** `results.html`, `archer_results_pivot.html`, `archer_history.html`
**Complexity:** Medium (data normalization, multiple views)
**Benefits:** Unified leaderboard experience

### 3.4 Architecture Benefits Achieved

✅ **Reusable Components** - No more duplicated UI logic  
✅ **Mobile-First Design** - Consistent touch targets and spacing  
✅ **Proven Integration** - Team module demonstrates success  
✅ **Maintainable Code** - Single source of truth for UI patterns  
✅ **Enhanced UX** - Beautiful, consistent interfaces

---

## 4. Current Status & Next Steps (v1.5.0)

### ✅ Recently Completed
1. **✅ ArcherSelector Component** – `js/archer_selector.js` created and battle-tested
2. **✅ ScoreKeypad Component** – `js/score_keypad.js` ready for integration
3. **✅ Team Module Integration** – Complete ArcherSelector integration with beautiful UI
4. **✅ Enhanced ScorecardView** – Added `renderArcherTable` function for consistency
5. **✅ Security Improvements** – Path sanitization in LiveUpdates API client

### 🎯 Immediate Next Steps

#### ✅ Phase 1: Solo Module Integration (COMPLETED)
**Completed:** November 21, 2025
- ✅ Integrate ArcherSelector in `solo_card.js` (replace legacy archer selection)
- ✅ A1/A2 selection groups with exclusive selection logic
- ✅ Real-time search and filtering functionality
- ✅ Mobile UX and touch interactions tested and working
- ✅ Documentation updated

#### Phase 2: Ranking Rounds Integration (Next Priority)
**Estimated:** 8-12 hours  
- [ ] Integrate ArcherSelector in `ranking_round.js` and `ranking_round_300.js`
- [ ] Replace legacy CSS with Tailwind components
- [ ] Migrate to ScoreKeypad for consistent input
- [ ] Remove `css/main.css` dependencies

#### Phase 3: Results View Unification (Future)
**Estimated:** 6-8 hours
- [ ] Create `js/results_view.js` component
- [ ] Unify `results.html`, `archer_results_pivot.html`, `archer_history.html`
- [ ] Centralize data fetching and normalization
- [ ] Add shared filter controls
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

✅ **Verification & Locking:** ⚠️ CRITICAL
- **MUST implement same verification workflow as ranking rounds**
- Coach verification required before finalization
- Lock mechanism prevents tampering
- Event closure makes scores permanent
- See [BALE_GROUP_SCORING_WORKFLOW.md](BALE_GROUP_SCORING_WORKFLOW.md) for details

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
5. Implement event planning workflow (see [Feature_EventPlanning_Product.md](Feature_EventPlanning_Product.md))
6. Add archer profile pages (see [Feature_ArcherProfile.md](Feature_ArcherProfile.md))

**Note:** Tournament bracket generation and event management features are defined in [OAS_RULES.md](OAS_RULES.md) and [Feature_EventPlanning_Product.md](Feature_EventPlanning_Product.md). These will drive Phase 3+ development priorities.

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
**Last Updated:** November 21, 2025  
**Next Review:** After Solo Module integration completion
