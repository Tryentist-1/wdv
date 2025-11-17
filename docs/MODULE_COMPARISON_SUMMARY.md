# Module Comparison & Inconsistencies Summary

**Date:** November 17, 2025  
**Purpose:** Quick visual reference for module inconsistencies

---

## 🎯 The Big Picture

You have **5 scoring modules** in **3 different states**:

```
✅ FULLY INTEGRATED (Ranking Round)
  │
  ├─ ranking_round.html (360)
  └─ ranking_round_300.html (300)
      └─ Database + Live Sync + Auth + Coach Visibility

⚠️ NEEDS INTEGRATION (Solo & Team Olympic)
  │
  ├─ solo_card.html (1v1 match)
  └─ team_card.html (3v3 match)
      └─ localStorage ONLY - No DB, No Sync, No Coach

✅ STANDALONE (Practice)
  │
  └─ gemini-oneshot.html
      └─ Intentionally isolated (personal practice)
```

---

## 📊 Side-by-Side Comparison

| Feature | Ranking Round | Solo Match | Team Match | Practice |
|---------|---------------|------------|------------|----------|
| **Database** | ✅ Full MySQL | ❌ None | ❌ None | ❌ N/A |
| **localStorage** | Cache only | Primary | Primary | Primary |
| **Cookies** | Archer ID + Auth | ❌ None | ❌ None | ❌ None |
| **Authentication** | Event Code | ❌ None | ❌ None | ❌ None |
| **Coach Visibility** | ✅ Full | ❌ None | ❌ None | ❌ N/A |
| **Cross-Device Sync** | ✅ Yes | ❌ No | ❌ No | ❌ N/A |
| **Live Leaderboard** | ✅ Yes | ❌ No | ❌ No | ❌ N/A |
| **Event Integration** | ✅ Full | ❌ None | ❌ None | ❌ N/A |
| **Offline Capability** | ✅ Queue | ✅ Yes | ✅ Yes | ✅ Yes |
| **API Endpoints** | ✅ Full REST | ❌ None | ❌ None | ❌ N/A |
| **Mobile UX** | ✅ Optimized | ✅ Good | ✅ Good | ✅ Good |

---

## 🔍 Key Inconsistencies

### 1. Storage Pattern Inconsistency

**Ranking Round** (integrated):
```javascript
// Source of truth: MySQL database
PRIMARY: MySQL tables
  → archers, events, rounds, round_archers, end_events

// Cache layer: localStorage
CACHE: localStorage
  → current session state
  → cached archer list (1 hour TTL)
  → offline score queue

// Identification: Cookies
PERSISTENT: Cookies
  → oas_archer_id (365 days)
  → coach_auth (90 days)
```

**Solo/Team** (not integrated):
```javascript
// EVERYTHING in localStorage (no database)
PRIMARY: localStorage ONLY
  → match state
  → archer names
  → all scores
  → match history

// No cache needed (no external data)
// No cookies (no persistent ID)
// No server sync (isolated to device)
```

**Impact:**
- ❌ Solo/Team matches lost if browser data cleared
- ❌ Can't view matches on different device
- ❌ Coach can't see Solo/Team results
- ❌ No leaderboard for Solo/Team
- ❌ Can't tie matches to events

---

### 2. Authentication Inconsistency

**Ranking Round:**
```
┌─────────────────────────────────────────┐
│ PUBLIC: Load archer roster              │
│   GET /v1/archers (no auth)              │
├─────────────────────────────────────────┤
│ ARCHER: Submit scores                    │
│   Event Code required                    │
│   POST /v1/end-events                    │
├─────────────────────────────────────────┤
│ COACH: Full admin                        │
│   API Key/Passcode required              │
│   All CRUD operations                    │
└─────────────────────────────────────────┘
```

**Solo/Team:**
```
┌─────────────────────────────────────────┐
│ NO AUTHENTICATION                        │
│   Everything is public                   │
│   No event codes                         │
│   No coach access control                │
└─────────────────────────────────────────┘
```

**Impact:**
- ❌ Solo/Team not tied to events
- ❌ No access control
- ❌ Can't restrict editing
- ❌ No audit trail

---

### 3. Data Flow Inconsistency

**Ranking Round Flow:**
```
Archer Device                     Server                Coach Console
     │                               │                        │
     │───── POST /v1/rounds ────────>│                        │
     │<──── round_id + meta ─────────│                        │
     │                               │                        │
     │───── POST /v1/end-events ────>│                        │
     │      (end 1 scores)            │                        │
     │                               │────── Live Update ────>│
     │                               │                        │
     │───── POST /v1/end-events ────>│                        │
     │      (end 2 scores)            │                        │
     │                               │────── Live Update ────>│
     │                               │                        │
     │                          [ MySQL stores everything ]   │
```

**Solo/Team Flow:**
```
Archer Device                     Server                Coach Console
     │                               │                        │
     │                               │                        │
     │  [localStorage ONLY]          │                        │
     │  No server interaction        │     [ Nothing ]        │
     │  No coach visibility          │                        │
     │  Isolated to device           │                        │
     │                               │                        │
```

**Impact:**
- ❌ Coach has no visibility into Solo/Team matches
- ❌ Can't generate match reports
- ❌ Can't export results
- ❌ Can't do analytics

---

## 🎯 What Needs to Happen (Phase 2)

### Goal: Make Solo/Team Match the Ranking Round Pattern

**Add to Solo/Team:**

1. **Database Schema**
   ```sql
   solo_matches table
   solo_match_ends table
   team_matches table
   team_match_ends table
   ```

2. **API Endpoints**
   ```
   POST   /v1/solo-matches
   GET    /v1/solo-matches/:id
   POST   /v1/solo-matches/:id/ends
   PATCH  /v1/solo-matches/:id
   ```

3. **Authentication**
   ```javascript
   // Require event code for match creation
   // Store in localStorage same as ranking rounds
   // Use for score submission
   ```

4. **Coach Integration**
   ```javascript
   // Add Solo/Team tabs to coach console
   // Show live matches
   // Export results
   ```

5. **Frontend Refactoring**
   ```javascript
   // Replace localStorage with database calls
   // Add offline queue (like ranking rounds)
   // Keep localStorage as cache only
   ```

---

## 📋 Detailed Plan Available

**See:** [APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md](APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md)

**Key Sections:**
- Section 4: Integration Plan for Solo & Team
- Section 5: Implementation Order (4 sprints)
- Section 6: Migration Strategy
- Section 7: Success Criteria

**Estimated Effort:** 32-40 hours total
- Backend: 8-10 hours
- Solo Frontend: 10-12 hours
- Team Frontend: 10-12 hours
- Testing: 4-6 hours

---

## ✅ Immediate Actions

### This Week
1. ✅ **Document inconsistencies** (this doc + master doc)
2. ✅ **Create unified README**
3. ✅ **Review with team**
4. [ ] **Decide: Solo first or Team first?**
5. [ ] **Create Sprint 2 ticket (backend schema)**

### Next Sprint (Backend)
1. [ ] Create database migration SQL
2. [ ] Add API endpoints
3. [ ] Test endpoints
4. [ ] Update API documentation

### Following Sprints (Frontend)
1. [ ] Refactor Solo module
2. [ ] Refactor Team module
3. [ ] Add coach console integration
4. [ ] End-to-end testing

---

## 🚫 What to Avoid

### Don't Break Working Code
- ✅ Ranking rounds work great - leave them alone
- ✅ Solo/Team work offline - preserve that capability
- ✅ Practice app is fine standalone - don't touch it

### Don't Over-Engineer
- ❌ Don't add complex frameworks
- ❌ Don't change storage patterns that work
- ❌ Keep it simple - match existing patterns

### Don't Rush
- ❌ These aren't critical bugs
- ❌ Take time to do it right
- ❌ Test thoroughly before deploying

---

## 📚 Reference Documents

**Start Here:**
- [APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md](APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md) - **MASTER REFERENCE**
- [README.md](../README.md) - Project overview

**Authentication:**
- [AUTHENTICATION_ANALYSIS.md](AUTHENTICATION_ANALYSIS.md)
- [CLEANUP_ACTION_PLAN.md](CLEANUP_ACTION_PLAN.md)

**User Workflows:**
- [ARCHER_SCORING_WORKFLOW.md](ARCHER_SCORING_WORKFLOW.md)
- [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md)

**API & Backend:**
- [LIVE_SCORING_IMPLEMENTATION.md](LIVE_SCORING_IMPLEMENTATION.md)

---

**TL;DR:** Ranking Round is fully integrated (database, auth, coach visibility). Solo/Team modules work but are localStorage-only and invisible to coaches. Phase 2 plan ready to integrate them using the same pattern as Ranking Round.

**Next Step:** Review [APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md](APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md) and decide on Sprint 2 priorities.

