# 🚀 Session Quick Start Guide

**Purpose:** Rapidly onboard into development session without derailing  
**Use Case:** Start of every AI-assisted session or new developer onboarding  
**Last Updated:** November 17, 2025

---

## 📋 Read These First (In Order)

### 1. **Critical Context** (2 min read)
**[docs/BALE_GROUP_SCORING_WORKFLOW.md](docs/BALE_GROUP_SCORING_WORKFLOW.md)**

**Why:** Understand how scoring actually works in real competitions
- Bale groups (4 archers, 1 digital scorer)
- Verification process (coach locks entire bale)
- Event closure (permanent, no edits)

**Key Takeaway:** All system design flows from this real-world process.

---

### 2. **System Architecture** (5 min scan)
**[docs/APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md](docs/APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md)**

**Why:** Master reference for entire system
- 5 modules: status & integration state
- Storage strategy (DB + localStorage + cookies)
- Phase 2 integration plan (Solo/Team)
- Database schemas & API designs

**Key Takeaway:** Ranking Rounds fully integrated ✅, Solo/Team need Phase 2 integration ⚠️

---

### 3. **Project Overview** (3 min scan)
**[README.md](README.md)**

**Why:** Quick project orientation
- Module status table
- Development workflow
- Testing & deployment
- Documentation index

**Key Takeaway:** Production system (v1.3.0) with clear roadmap forward.

---

## 🎯 Current State (November 2025)

### ✅ What's Live & Working
- **Ranking Round 360/300** - Full database integration, live sync
- **Coach Console** - Event management, verification
- **Live Results** - Real-time leaderboard
- **Archer Roster** - Master archer list (public access)
- **Authentication** - Public/Event/Coach tiers working
- **Verification & Locking** - Complete workflow implemented

### ⚠️ What Needs Work (Phase 2)
- **Solo Olympic Matches** - localStorage only, needs DB integration
- **Team Olympic Matches** - localStorage only, needs DB integration
- Both need same verification workflow as Ranking Rounds

### 📅 What's Planned (Phase 3-6)
See: [docs/FUTURE_VISION_AND_ROADMAP.md](docs/FUTURE_VISION_AND_ROADMAP.md)
- Phase 3: Coach-Athlete collaboration (progress tracking, notes, goals)
- Phase 4: Tournament brackets (auto-generation, live updates)
- Phase 5: Team season management (dual meets, standings)
- Phase 6: Mobile apps, advanced analytics

---

## 🗂️ File Organization

### Entry Points
```
/
├── SESSION_QUICK_START.md          ← You are here! Start every session here
├── README.md                        ← Project overview
└── docs/
    ├── BALE_GROUP_SCORING_WORKFLOW.md              ← CRITICAL workflow
    ├── APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md ← Master architecture
    ├── FUTURE_VISION_AND_ROADMAP.md                ← Long-term vision
    └── MODULE_COMPARISON_SUMMARY.md                ← Quick visual reference
```

### When Working On...

**Authentication/Storage:**
- [docs/AUTHENTICATION_ANALYSIS.md](docs/AUTHENTICATION_ANALYSIS.md)
- [docs/STORAGE_TIER_AUDIT.md](docs/STORAGE_TIER_AUDIT.md)
- [docs/CLEANUP_ACTION_PLAN.md](docs/CLEANUP_ACTION_PLAN.md)

**Ranking Rounds:**
- [docs/ARCHER_SCORING_WORKFLOW.md](docs/ARCHER_SCORING_WORKFLOW.md)
- [docs/LIVE_SCORING_IMPLEMENTATION.md](docs/LIVE_SCORING_IMPLEMENTATION.md)

**Verification/Locking:**
- [docs/SPRINT_VERIFY_SCORECARDS.md](docs/SPRINT_VERIFY_SCORECARDS.md)
- [docs/BALE_GROUP_SCORING_WORKFLOW.md](docs/BALE_GROUP_SCORING_WORKFLOW.md)

**Testing:**
- [docs/AUTOMATED_TESTING.md](docs/AUTOMATED_TESTING.md)
- [docs/MANUAL_TESTING_CHECKLIST.md](docs/MANUAL_TESTING_CHECKLIST.md)

**Deployment:**
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- [docs/CLOUDFLARE_CACHE_PURGE_SETUP.md](docs/CLOUDFLARE_CACHE_PURGE_SETUP.md)

---

## 🏗️ Tech Stack at a Glance

### Frontend
- **Vanilla JS** (no framework - intentional)
- **Tailwind CSS** (utility-first styling)
- **Mobile-first** (99% phone usage [[memory:10705663]])

### Backend
- **PHP 8.0+** (RESTful API)
- **MySQL 8.0+** (primary database)

### Key Modules
- `js/live_updates.js` - API client + offline queue
- `js/common.js` - Shared utilities (cookies, etc)
- `js/archer_module.js` - Roster management
- `js/coach.js` - Coach console
- `api/index.php` - API router
- `api/db.php` - Database + auth layer

### Storage Pattern
```javascript
DATABASE (MySQL)
  └─ Source of truth for all competition data

localStorage
  └─ Cache + session state + offline queue

Cookies
  └─ Persistent identification (archer ID, coach auth)
```

---

## 🔑 Key Principles (Do NOT Violate)

### 1. Mobile-First Always
- 99% usage on phones [[memory:10705663]]
- Test on small screens (iPhone SE)
- Touch-friendly targets
- Simple, fast UX

### 2. Database is Source of Truth
- All competition scores → MySQL
- localStorage = cache only
- Offline queue for sync
- Never rely on localStorage for permanent data

### 3. Verification Workflow is Sacred
- Coach must verify before finalization
- Locking prevents tampering
- Event closure is permanent
- Full audit trail required

### 4. IDs Use GUIDs (Not Sequential Numbers)
- Use UUIDs for all IDs [[memory:10706370]]
- No sequential numbering in IDs
- Prevents guessing/enumeration

### 5. Coach is Gatekeeper
- Coach controls events
- Coach verifies scores
- Coach closes events
- Coach uses results for decisions

---

## 🤝 AI Collaboration Approach

**When working in Cursor/IDE, focus on two mindsets:**

### 🔧 Dev Lead Mindset (Implementation)
**Apply when:** Building features, refactoring, architecting

**Key Focus:**
- **Technical Feasibility** - Can this be built? What's the complexity?
- **Follow Proven Patterns** - Ranking Round is your template, copy that approach
- **Modular & Maintainable** - Break into components, keep DRY
- **Design for Testability** - Can this be easily tested?
- **Translate Requirements → Code** - Turn user needs into technical specs

**Questions to Ask:**
- "How does this integrate with existing systems?"
- "What's the data model?"
- "Are there edge cases I'm missing?"
- "How will this perform at scale?"

---

### 🧪 QA Lead Mindset (Quality & Testing)
**Apply when:** Reviewing code, before commits, planning features

**Key Focus:**
- **Test Before Production** - All changes reviewed with testing in mind
- **Incremental & Safe** - Break big changes into small, testable pieces
- **Edge Cases & Errors** - What can go wrong? What if inputs are invalid?
- **No Regressions** - Will this break existing functionality?
- **Validate Against Requirements** - Does this meet acceptance criteria?

**Questions to Ask:**
- "What's the test plan for this?"
- "How do we verify this works?"
- "What happens if this fails?"
- "Did we test on mobile?"
- "Can we break this into smaller changes?"

---

### 💡 Switching Mindsets

**During implementation:** Lead with Dev mindset, check with QA mindset

```
1. Feature request arrives
2. Dev: "Here's how we build it..." (design & implement)
3. QA: "Here's how we test it..." (test plan)
4. Dev: Implement with tests in mind
5. QA: Review before commit
6. Commit only when both mindsets satisfied
```

**Before every commit:**
- ✅ Dev: "Is this well-architected?"
- ✅ QA: "Is this tested/testable?"
- ✅ Both: "Does this solve the user problem?"

---

## ⚡ Quick Commands

### Local Development
```bash
# Start PHP server
npm run serve
# → http://localhost:3000

# Run tests
npm test

# Check linting
npm run lint
```

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature

# Commit with conventional commits
git commit -m "feat: description"
git commit -m "fix: description"
git commit -m "docs: description"

# Push to remote
git push origin feature/your-feature
```

### Deployment
```bash
# Deploy to production (requires FTP credentials)
./DeployFTP.sh

# Purge Cloudflare cache
./test_cloudflare.sh
```

### Database
```bash
# Connect to local MySQL
mysql -u root -p wdv_local

# Connect to production (if needed)
mysql -h tryentist.com -u USERNAME -p wdv_production
```

---

## 🎯 Current Priorities (Phase 2)

### Sprint 2: Backend Foundation (NEXT)
**Goal:** Create database & API for Solo/Team matches

**Tasks:**
1. [ ] Create `solo_matches` table schema
2. [ ] Create `team_matches` table schema
3. [ ] Add verification fields (locked, card_status, etc)
4. [ ] Create Solo match API endpoints
5. [ ] Create Team match API endpoints
6. [ ] Test all endpoints

**Estimated:** 8-10 hours  
**Documentation:** [APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md#4-integration-plan](docs/APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md#4-integration-plan-for-solo--team-modules)

---

### Sprint 3: Solo Module Integration (AFTER Sprint 2)
**Goal:** Refactor Solo module to use database

**Tasks:**
1. [ ] Refactor `js/solo_card.js` to use API
2. [ ] Add event code authentication
3. [ ] Add offline sync queue
4. [ ] Add verification UI
5. [ ] Integrate with coach console
6. [ ] End-to-end testing

**Estimated:** 10-12 hours

---

### Sprint 4: Team Module Integration (AFTER Sprint 3)
**Goal:** Refactor Team module to use database

**Tasks:** (Same pattern as Solo)

**Estimated:** 10-12 hours

---

## 🚫 Common Pitfalls to Avoid

### ❌ Don't Do This
1. **Sequential IDs** - Use GUIDs/UUIDs [[memory:10706370]]
2. **Skip Verification** - Every module needs verification workflow
3. **localStorage as Primary** - Database is source of truth
4. **Desktop-first Design** - Mobile is 99% of usage
5. **Break Existing Code** - Ranking Rounds work perfectly, don't touch
6. **Complex Frameworks** - Keep it simple, vanilla JS
7. **Ignore Locking** - Security through lock mechanism is critical

### ✅ Do This Instead
1. **UUIDs everywhere** - Archer IDs, Event IDs, Round IDs
2. **Follow Ranking Round pattern** - It's proven and working
3. **Database first, cache second** - localStorage is temporary
4. **Test on phone** - Real device testing required
5. **Add, don't replace** - Additive changes only
6. **Keep it simple** - No unnecessary complexity
7. **Implement locking** - Verification workflow is non-negotiable

---

## 🗣️ Common Phrases to Understand

When Terry says... | He means...
---|---
**"Bale group"** | 4 archers shooting together (3-9 possible)
**"Digital scorer"** | The ONE archer entering all scores in app
**"Lock the card"** | Mark scorecard as verified and read-only
**"Close the event"** | Finalize all scores permanently (no more edits)
**"Verify"** | Coach cross-checks paper vs digital and locks
**"VOID"** | Incomplete scorecard marked invalid
**"VER badge"** | Visual indicator of verified/locked scorecard
**"Round archer"** | Individual scorecard (one per archer per round)
**"Entry code"** | Event-specific code for archer authentication
**"Coach passcode"** | Static admin code for coach authentication

---

## 📊 Health Checks

### Is System Working?
```bash
# 1. Check API health
curl https://tryentist.com/wdv/api/health

# 2. Check database connection
curl https://tryentist.com/wdv/api/v1/archers | jq '.archers | length'

# 3. Check authentication
curl -H "X-Passcode: wdva26" https://tryentist.com/wdv/api/v1/events | jq '.events | length'
```

### Expected Results
- Health: `{"status":"ok"}`
- Archers: Number > 0
- Events: Number >= 0

---

## 🎓 Onboarding Checklist

**For AI Session Start:**
- [ ] Read SESSION_QUICK_START.md (this file)
- [ ] Scan BALE_GROUP_SCORING_WORKFLOW.md
- [ ] Review current phase/sprint
- [ ] Check open issues/tasks
- [ ] Ready to code!

**For New Developer:**
- [ ] Read SESSION_QUICK_START.md
- [ ] Read BALE_GROUP_SCORING_WORKFLOW.md completely
- [ ] Scan APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md
- [ ] Read README.md
- [ ] Set up local environment (QUICK_START_LOCAL.md)
- [ ] Run local PHP server
- [ ] Test ranking round scoring flow
- [ ] Review one module in detail
- [ ] Ask questions!

---

## 🆘 When You're Stuck

### Questions About...

**"How does scoring work?"**  
→ [docs/BALE_GROUP_SCORING_WORKFLOW.md](docs/BALE_GROUP_SCORING_WORKFLOW.md)

**"What's the architecture?"**  
→ [docs/APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md](docs/APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md)

**"How do I authenticate?"**  
→ [docs/AUTHENTICATION_ANALYSIS.md](docs/AUTHENTICATION_ANALYSIS.md)

**"What are we building next?"**  
→ [docs/FUTURE_VISION_AND_ROADMAP.md](docs/FUTURE_VISION_AND_ROADMAP.md)

**"How do I test?"**  
→ [docs/AUTOMATED_TESTING.md](docs/AUTOMATED_TESTING.md)

**"How do I deploy?"**  
→ [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

**"What's the status of X?"**  
→ Search in `/docs` folder (57 documents!)

---

## 💬 Session Start Template

**Use this when starting a new AI session:**

```
Hi! I'm working on the WDV Archery Suite. Quick context:

CURRENT PHASE: Phase 2 - Solo/Team Integration
CURRENT STATUS: Planning complete, starting Sprint 2 (backend)
LAST SESSION: [brief summary if applicable]

I've read:
- SESSION_QUICK_START.md
- BALE_GROUP_SCORING_WORKFLOW.md  
- APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md (relevant sections)

TODAY'S GOAL: [What you want to accomplish]

QUESTION/TASK: [Your specific question or task]

CONTEXT: [Any additional context specific to today's work]
```

**This gives AI perfect context without re-explaining the entire system!**

---

## 📈 Progress Tracking

### Phase 1 ✅ COMPLETE
- Ranking Rounds (360 & 300)
- Live score sync
- Coach console
- Event management
- Verification & locking
- Real-time results

**Status:** Production (v1.3.0)

---

### Phase 2 🚧 IN PROGRESS
**Sprint 1:** Documentation ✅ COMPLETE (Nov 17, 2025)
- Created architecture docs
- Captured critical workflow
- Defined integration requirements

**Sprint 2:** Backend Foundation ⏳ NEXT UP
- Database schema for Solo/Team
- API endpoints
- Testing

**Sprint 3-4:** Frontend Integration ⏳ PLANNED
- Refactor Solo module
- Refactor Team module
- Coach console integration

**Target:** December 2025

---

### Phase 3-6 📅 PLANNED
**Target:** Q1-Q4 2026

See [docs/FUTURE_VISION_AND_ROADMAP.md](docs/FUTURE_VISION_AND_ROADMAP.md)

---

## 🎯 Success Criteria

**You know you're on track if:**
- ✅ Following the bale group workflow
- ✅ Using database as source of truth
- ✅ Implementing verification for all modules
- ✅ Mobile-first design
- ✅ Using UUIDs for IDs
- ✅ Adding features, not breaking existing
- ✅ Tests pass
- ✅ Coach can verify and lock scores
- ✅ Event closure works correctly

**Red flags to watch for:**
- ❌ localStorage as primary storage
- ❌ Skipping verification workflow
- ❌ Sequential numeric IDs
- ❌ Desktop-only design
- ❌ Breaking Ranking Round functionality
- ❌ Scores editable after event closure
- ❌ No audit trail

---

## 📝 Quick Reference

### Important URLs
- **Production:** https://tryentist.com/wdv/
- **Coach Console:** https://tryentist.com/wdv/coach.html
- **Results:** https://tryentist.com/wdv/results.html
- **Local:** http://localhost:3000

### Important Files
- **API Router:** `api/index.php`
- **Database:** `api/db.php`
- **Config:** `api/config.php`
- **Live Updates:** `js/live_updates.js`
- **Coach Logic:** `js/coach.js`
- **Ranking Round:** `js/ranking_round_300.js`

### Important Values
- **Coach Passcode:** `wdva26` (or from config)
- **Cookie Names:** `oas_archer_id`, `coach_auth`
- **localStorage Keys:** `rankingRound300_<date>`, `event_entry_code`, `master_archer_list`

---

## 🚀 Ready to Code?

**You're now equipped to:**
- Understand the complete scoring workflow ✅
- Know the system architecture ✅
- See what's done and what's next ✅
- Follow the correct patterns ✅
- Avoid common pitfalls ✅

**Start your session with confidence!**

Need more detail on anything? Check the linked docs above.

---

**Last Updated:** November 17, 2025  
**Version:** 1.0  
**Maintainer:** Development Team

**Keep this file updated as phases progress!**

