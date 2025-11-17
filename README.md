# WDV Archery Score Management Suite

> **Mobile-first web applications for Olympic Archery in Schools (OAS) scoring**

[![Version](https://img.shields.io/badge/version-1.3.0-blue.svg)](RELEASE_NOTES_v1.3.0.md)
[![Status](https://img.shields.io/badge/status-production-green.svg)]()
[![Database](https://img.shields.io/badge/database-MySQL-orange.svg)]()

---

## 📱 Quick Start

### For Archers

**Ranking Round:**
1. Visit https://tryentist.com/wdv/
2. Scan QR code OR select event
3. Find your bale group
4. Begin scoring!

**Solo/Team Matches:**
1. Visit https://tryentist.com/wdv/
2. Select "Solo Match" or "Team Match"
3. Enter archer names
4. Start match!

### For Coaches

**Event Management:**
1. Visit https://tryentist.com/wdv/coach.html
2. Enter coach passcode
3. Create/manage events
4. View live scores

---

## 🎯 Critical: Understanding the Scoring Workflow

> **Before diving into modules or architecture**, understand how scoring actually works:

**📋 [BALE_GROUP_SCORING_WORKFLOW.md](docs/BALE_GROUP_SCORING_WORKFLOW.md)** ← **READ THIS FIRST**

This document explains:
- How bale groups work (4 archers, 1 digital scorer)
- The complete workflow from setup through verification
- Why verification and locking are critical
- How coaches use results for decisions

**All system design flows from this real-world process.**

---

## 🏗️ Application Modules

### ✅ Production Ready

| Module | Purpose | Integration | Documentation |
|--------|---------|-------------|---------------|
| **Ranking Round 360** | 12 ends × 3 arrows competitive scoring | ✅ Full MySQL + Live Sync | [Workflow](docs/ARCHER_SCORING_WORKFLOW.md) |
| **Ranking Round 300** | 10 ends × 3 arrows competitive scoring | ✅ Full MySQL + Live Sync | [Implementation](docs/LIVE_SCORING_IMPLEMENTATION.md) |
| **Coach Console** | Event & archer management | ✅ Full MySQL | [Requirements](docs/OAS_RANKING_ONLINE_3.0_REQUIREMENTS.md) |
| **Live Results** | Real-time leaderboard | ✅ Full MySQL | [Implementation](docs/LIVE_SCORING_IMPLEMENTATION.md) |
| **Practice Analyzer** | Arrow grouping analysis | ✅ Standalone (p5.js) | [PRD](docs/PRODUCT_REQUIREMENTS.md) |

### ✅ Phase 2 - Solo Match Integration (COMPLETE)

| Module | Purpose | Current Status | Documentation |
|--------|---------|----------------|---------------|
| **Solo Olympic Match** | 1v1 head-to-head scoring | ✅ Full MySQL + Match Code Auth | [Implementation](docs/PHASE2_AUTH_IMPLEMENTATION.md) |

### ⚠️ Phase 2 - Team Match Integration (In Progress)

| Module | Purpose | Current Status | Integration Plan |
|--------|---------|----------------|------------------|
| **Team Olympic Match** | 3v3 team competition scoring | ⚠️ Backend ready, frontend pending | [Migration Plan](docs/PHASE2_TEAM_MIGRATION_PLAN.md) |

---

## 🚀 Local Development Setup

### Prerequisites
```bash
# Required
- PHP 8.0+
- MySQL 8.0+
- Node.js 16+ (for dev tools)
- Git
```

### Quick Setup
```bash
# 1. Clone repository
git clone <repo-url>
cd wdv

# 2. Run setup script
./setup_local.sh

# 3. Start PHP server
npm run serve

# 4. Open browser
open http://localhost:3000
```

### Detailed Setup
See [QUICK_START_LOCAL.md](QUICK_START_LOCAL.md) for full instructions.

---

## 📁 Project Structure

```
wdv/
├── index.html                    # Landing page
├── ranking_round.html            # 360 round scoring ✅
├── ranking_round_300.html        # 300 round scoring ✅
├── solo_card.html                # 1v1 matches ✅
├── team_card.html                # Team matches ⚠️
├── coach.html                    # Coach console ✅
├── results.html                  # Live leaderboard ✅
├── archer_list.html              # Roster management ✅
│
├── js/
│   ├── ranking_round.js          # Ranking round logic ✅
│   ├── ranking_round_300.js      # 300 round logic ✅
│   ├── live_updates.js           # API client + offline sync ✅
│   ├── archer_module.js          # Roster management ✅
│   ├── common.js                 # Shared utilities ✅
│   ├── coach.js                  # Coach console ✅
│   ├── solo_card.js              # Solo match logic ✅
│   └── team_card.js              # Team match logic ⚠️
│
├── api/
│   ├── index.php                 # RESTful API router
│   ├── db.php                    # Database + auth layer
│   ├── config.php                # Configuration
│   └── sql/                      # Database migrations
│
├── css/
│   ├── main.css                  # Master stylesheet
│   ├── components.css            # Reusable components
│   ├── score-colors.css          # Archery ring colors
│   └── tailwind.css              # Tailwind build
│
├── docs/
│   ├── APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md  # 🔑 Master reference
│   ├── AUTHENTICATION_ANALYSIS.md                    # Auth system
│   ├── ARCHER_SCORING_WORKFLOW.md                    # User guide
│   ├── LIVE_SCORING_IMPLEMENTATION.md                # API docs
│   ├── PRODUCT_REQUIREMENTS.md                       # Original PRD
│   ├── ROADMAP.md                                    # Development phases
│   └── [52 more docs...]
│
└── tests/                        # Playwright tests
```

---

## 🔑 Key Technical Concepts

### Storage Strategy

The application uses a **three-tier storage pattern**:

```javascript
// 1. DATABASE (MySQL) - Source of truth
{
  archers: "Master roster",
  events: "Competitions and tournaments",
  rounds: "Ranking round scorecards",
  round_archers: "Individual archer cards",
  end_events: "Per-end scores (live sync)"
}

// 2. LOCALSTORAGE - Cache + session state
{
  current_session: "Active round/match state",
  cached_archer_list: "Roster cache (1 hour TTL)",
  event_entry_code: "Current event authentication",
  pending_sync: "Offline score queue"
}

// 3. COOKIES - Persistent identification
{
  oas_archer_id: "Archer profile ID (365 days)",
  coach_auth: "Coach authentication (90 days)"
}
```

**See:** [APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md](docs/APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md#3-unified-storage-strategy)

---

### Authentication Model

```
┌─────────────────────────────────────────────────────────────┐
│ Authentication Paths                                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PUBLIC (No Auth):                                           │
│    GET /v1/archers          Load archer roster               │
│    GET /v1/health           Health check                     │
│                                                              │
│  ARCHER (Event Code):                                        │
│    POST /v1/rounds          Create round                     │
│    POST /v1/end-events      Submit scores                    │
│    GET /v1/round-archers    View scorecards                  │
│                                                              │
│  COACH (API Key/Passcode):                                   │
│    POST /v1/events          Create event                     │
│    POST /v1/archers         Manage roster                    │
│    GET /v1/events/:id/results  View all scores               │
│    DELETE /v1/*             Admin operations                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**See:** [AUTHENTICATION_ANALYSIS.md](docs/AUTHENTICATION_ANALYSIS.md)

---

## 🧪 Testing

### Run All Tests
```bash
# Unit tests (QUnit)
npm test

# E2E tests (Playwright)
npm run test:e2e

# Manual test guide
cat tests/manual_sanity_check.md
```

### Test Documentation
- [AUTOMATED_TESTING.md](docs/AUTOMATED_TESTING.md)
- [PHASE_0_TESTING_PLAN.md](docs/PHASE_0_TESTING_PLAN.md)
- [Manual Testing Checklist](docs/MANUAL_TESTING_CHECKLIST.md)

---

## 🚢 Deployment

### Production Deployment
```bash
# 1. Test locally
npm run test:e2e

# 2. Deploy to production
./DeployFTP.sh

# 3. Purge Cloudflare cache
./test_cloudflare.sh

# 4. Verify deployment
open https://tryentist.com/wdv/
```

### Deployment Documentation
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- [CLOUDFLARE_CACHE_PURGE_SETUP.md](docs/CLOUDFLARE_CACHE_PURGE_SETUP.md)

---

## 📚 Documentation Index

### 🎯 Start Here
| Document | Purpose | Audience |
|----------|---------|----------|
| [APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md](docs/APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md) | **Master reference** - Full system overview | Developers |
| [ARCHER_SCORING_WORKFLOW.md](docs/ARCHER_SCORING_WORKFLOW.md) | How archers use the app | Archers & Coaches |
| [PRODUCT_REQUIREMENTS.md](docs/PRODUCT_REQUIREMENTS.md) | Original product vision | All |

### 🔧 Development
| Document | Purpose |
|----------|---------|
| [QUICK_START_LOCAL.md](QUICK_START_LOCAL.md) | Local development setup |
| [DEVELOPMENT_WORKFLOW.md](docs/DEVELOPMENT_WORKFLOW.md) | Git workflow & conventions |
| [TECHNICAL_DOCUMENTATION.md](docs/TECHNICAL_DOCUMENTATION.md) | Legacy code analysis |
| [ROADMAP.md](docs/ROADMAP.md) | Development phases |

### 🔐 Security & Auth
| Document | Purpose |
|----------|---------|
| [AUTHENTICATION_ANALYSIS.md](docs/AUTHENTICATION_ANALYSIS.md) | Complete auth system |
| [AUTHENTICATION_FLOWS.md](docs/AUTHENTICATION_FLOWS.md) | Visual flow diagrams |
| [AUTHENTICATION_QUICK_REFERENCE.md](docs/AUTHENTICATION_QUICK_REFERENCE.md) | Quick lookup |
| [STORAGE_TIER_AUDIT.md](docs/STORAGE_TIER_AUDIT.md) | 3-tier storage verification |

### 🎓 User Guides
| Document | Purpose |
|----------|---------|
| [ARCHER_SCORING_WORKFLOW.md](docs/ARCHER_SCORING_WORKFLOW.md) | Archer instructions |
| [RANKING_ROUND_TUTORIAL.md](docs/RANKING_ROUND_TUTORIAL.md) | Step-by-step guide |
| [QR_CODE_EVENT_ACCESS.md](docs/QR_CODE_EVENT_ACCESS.md) | QR code setup |
| [COACH_CONSOLE_REDESIGN.md](docs/COACH_CONSOLE_REDESIGN.md) | Coach features |

### 🧪 Testing
| Document | Purpose |
|----------|---------|
| [AUTOMATED_TESTING.md](docs/AUTOMATED_TESTING.md) | Test infrastructure |
| [MANUAL_TESTING_CHECKLIST.md](docs/MANUAL_TESTING_CHECKLIST.md) | Manual test procedures |
| [PHASE_0_TESTING_PLAN.md](docs/PHASE_0_TESTING_PLAN.md) | Initial testing phase |

### 🚢 Deployment & Operations
| Document | Purpose |
|----------|---------|
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | Pre-flight checklist |
| [CLOUDFLARE_CACHE_PURGE_SETUP.md](docs/CLOUDFLARE_CACHE_PURGE_SETUP.md) | Cache management |
| [SETUP_REMOTE_DATABASE.md](SETUP_REMOTE_DATABASE.md) | Database setup |

### 📊 Analytics & Features
| Document | Purpose |
|----------|---------|
| [ANALYTICS_PIVOT_ENHANCEMENTS.md](docs/ANALYTICS_PIVOT_ENHANCEMENTS.md) | Analytics features |
| [ARCHER_DATA_UNIFICATION_PHASE1.md](docs/ARCHER_DATA_UNIFICATION_PHASE1.md) | Data model |
| [OAS_RANKING_ONLINE_3.0_REQUIREMENTS.md](docs/OAS_RANKING_ONLINE_3.0_REQUIREMENTS.md) | Live scoring design |

---

## 🗺️ Development Roadmap

### ✅ Phase 0 - Complete
- Git structure
- Local/remote database
- Deployment pipeline

### ✅ Phase 1 - Complete
- Ranking Round 360 & 300
- Live score sync
- Coach console
- Event management
- QR code access
- Master archer roster
- Real-time leaderboard

### ✅ Phase 2 - Solo Match Integration (COMPLETE)
**Goal:** Integrate Solo Olympic match scoring

**Status:** ✅ Complete and deployed (November 2025)
- ✅ Solo match database schema
- ✅ API endpoints for solo matches
- ✅ Frontend integration with match code authentication
- ✅ Offline queue support
- ✅ Match code generation (`solo-[INITIALS]-[MMDD]`)

**Documentation:**
- [PHASE2_AUTH_IMPLEMENTATION.md](docs/PHASE2_AUTH_IMPLEMENTATION.md)
- [PHASE2_SPRINT2_COMPLETE.md](docs/PHASE2_SPRINT2_COMPLETE.md)

### 🚧 Phase 2 - Team Match Integration (In Progress)
**Goal:** Integrate Team Olympic match scoring

**Status:** Backend complete, frontend integration pending
- ✅ Team match database schema
- ✅ API endpoints for team matches
- [ ] Frontend integration (next)
- [ ] Match code generation (`team-[INITIALS]-[MMDD]`)

**See:** [PHASE2_TEAM_MIGRATION_PLAN.md](docs/PHASE2_TEAM_MIGRATION_PLAN.md)

### 📅 Phase 3 - Planned
- Tutorial system
- Advanced analytics
- Season tracking

### 📅 Phase 4 - Future
- Offline-first PWA
- Mobile native apps
- Tournament brackets

**Full Roadmap:** [ROADMAP.md](docs/ROADMAP.md)

---

## 🐛 Known Issues & Limitations

### Solo & Team Modules
- ⚠️ **localStorage only** - No database integration
- ⚠️ **No coach visibility** - Coaches can't see matches
- ⚠️ **No cross-device sync** - Matches tied to one device
- ⚠️ **No event integration** - Can't link to competitions

**Fix:** Phase 2 integration (see [Integration Plan](docs/APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md))

### Authentication
- ⚠️ **Event codes** - Need better management UI
- ⚠️ **Coach passcode** - Static value (not per-coach)

**Tracking:** [CLEANUP_ACTION_PLAN.md](docs/CLEANUP_ACTION_PLAN.md)

---

## 🤝 Contributing

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes, commit often
git add .
git commit -m "feat: descriptive message"

# Push and create PR
git push origin feature/your-feature
```

### Commit Convention
```
feat: New feature
fix: Bug fix
docs: Documentation changes
style: Code style (formatting, no logic change)
refactor: Code restructure (no behavior change)
test: Add or update tests
chore: Build/tooling changes
```

**See:** [VIBE_CODING_GIT_WORKFLOW.md](docs/VIBE_CODING_GIT_WORKFLOW.md)

---

## 📞 Support & Resources

### Documentation
- **Master Reference:** [APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md](docs/APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md)
- **All Docs:** [/docs](/docs) (57 documents)

### Quick Links
- **Production:** https://tryentist.com/wdv/
- **Coach Console:** https://tryentist.com/wdv/coach.html
- **Live Results:** https://tryentist.com/wdv/results.html

### Development
- **Local Dev Guide:** [QUICK_START_LOCAL.md](QUICK_START_LOCAL.md)
- **API Docs:** [LIVE_SCORING_IMPLEMENTATION.md](docs/LIVE_SCORING_IMPLEMENTATION.md)
- **Testing:** [AUTOMATED_TESTING.md](docs/AUTOMATED_TESTING.md)

---

## 📄 License

Copyright © 2025 WDV Archery

---

## 📋 Recent Updates

### v1.3.0 (November 17, 2025)
- ✅ Fixed authentication: `GET /v1/archers` now public
- ✅ Enhanced analytics with pivot table
- ✅ Improved documentation
- 📚 Created master architecture document

**Full Release Notes:** [RELEASE_NOTES_v1.3.0.md](RELEASE_NOTES_v1.3.0.md)

---

**Last Updated:** November 17, 2025  
**Version:** 1.3.0  
**Status:** Production + Phase 2 Planning

