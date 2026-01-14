# WDV Archery Score Management Suite

> **Mobile-first web applications for Olympic Archery in Schools (OAS) scoring**

[![Version](https://img.shields.io/badge/version-1.9.4-blue.svg)]()
[![Status](https://img.shields.io/badge/status-production-green.svg)]()
[![Database](https://img.shields.io/badge/database-MySQL-orange.svg)]()
[![PWA](https://img.shields.io/badge/PWA-enabled-blue.svg)]()
[![Components](https://img.shields.io/badge/components-50%25_integrated-purple.svg)]()

---

## 🚀 For Developers

> **Starting a development session?**  
> → See **[01-SESSION_QUICK_START.md](01-SESSION_QUICK_START.md)** for current state, active work, and session onboarding

---

## 📱 Quick Start

### For Archers

**Install as App (PWA):**
1. Visit https://archery.tryentist.com/ on mobile
2. Add to home screen for app-like experience
3. Works offline with cached assets

**Ranking Round:**
1. Visit https://archery.tryentist.com/
2. Scan QR code OR select event
3. Find your bale group
4. Begin scoring!

**Solo/Team Matches:**
1. Visit https://archery.tryentist.com/
2. Select "Solo Match" or "Team Match"
3. Enter archer names
4. Start match!

### For Coaches

**Event Management:**
1. Visit https://archery.tryentist.com/coach.html
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

### ✅ Phase 2 - Team Match Integration (COMPLETE)

| Module | Purpose | Current Status | Documentation |
|--------|---------|----------------|---------------|
| **Team Olympic Match** | 3v3 team competition scoring | ✅ Full MySQL + Match Code Auth | [Migration Plan](docs/PHASE2_TEAM_MIGRATION_PLAN.md) |

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

# 2. Install dependencies
npm install

# 3. Build Tailwind CSS
npm run build:css

# 4. Run setup script
./scripts/dev/setup_local.sh

# 5. Start PHP server
npm run serve

# 6. Open browser
open http://localhost:8001

# 7. View Style Guide (UI Components)
open http://localhost:8001/tests/components/style-guide.html
```

### Detailed Setup
See [QUICK_START_LOCAL.md](QUICK_START_LOCAL.md) for full instructions.

### 🎨 Style Guide
**`style-guide.html`** - Complete UI style guide and component library with:
- All button styles and states
- Scoring table layouts (bale view + individual scorecard)
- Score input colors and styling
- Status badges and headers
- Keypad layouts and modal examples

**Use this as the reference** for all UI styling and components.

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
│   ├── team_card.js              # Team match logic ✅
│   ├── archer_selector.js        # 🆕 Standardized archer selection component
│   ├── score_keypad.js           # 🆕 Touch-optimized score input keypad
│   └── scorecard_view.js         # Enhanced scorecard rendering utilities
│
├── api/
│   ├── index.php                 # RESTful API router
│   ├── db.php                    # Database + auth layer
│   ├── config.php                # Configuration
│   └── sql/                      # Database migrations
│
├── css/
│   ├── components.css            # Reusable components (legacy)
│   ├── score-colors.css          # Archery ring colors (legacy)
│   ├── tailwind.css              # Tailwind source (edit this)
│   ├── tailwind-compiled.css     # Compiled Tailwind CSS (generated)
│   ⚠️ Note: All modules use compiled Tailwind CSS. Run `npm run build:css` after editing `tailwind.css`
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

### Quick Test Commands
```bash
# Run all E2E tests (primary)
npm test

# Interactive test UI
npm run test:ui

# Style guide (visual testing)
open http://localhost:8001/tests/components/style-guide.html

# Local development tests
npm run test:local

# Manual test checklist
cat tests/manual_sanity_check.md
```

### Testing Strategy
- **📋 [TESTING_STRATEGY.md](TESTING_STRATEGY.md)** - Complete testing overview and workflow
- **🎨 [style-guide.html](tests/components/style-guide.html)** - UI style guide and component library for visual testing
- **📁 [tests/TEST_ORGANIZATION.md](tests/TEST_ORGANIZATION.md)** - Test structure and organization

### Test Documentation
- [AUTOMATED_TESTING.md](docs/AUTOMATED_TESTING.md) - Playwright E2E testing
- [MANUAL_TESTING_CHECKLIST.md](docs/MANUAL_TESTING_CHECKLIST.md) - Manual test procedures
- [tests/README.md](tests/README.md) - Test suite commands and status

---

## 🚢 Deployment

### Production Deployment (FTP)

**IMPORTANT FOR LLMs:** When asked to "promote to prod", "deploy to production", or "FTP deploy", use this script:

**Primary Deployment Script:** `scripts/deploy/DeployFTP.sh`

This is the main script for deploying to production via FTP. It supports several flags:
- `--dry-run` - Preview changes without deploying
- `--reset` - Reset remote files before deployment  
- `--no-local-backup` - Skip local backup creation
- `--remote-backup` - Create backup on remote server
```bash
# 1. Test locally
npm run test:e2e

# 2. Deploy to production
./scripts/deploy/DeployFTP.sh

# 3. Purge Cloudflare cache
./tests/scripts/test_cloudflare.sh

# 4. Verify deployment
open https://archery.tryentist.com/
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
| [BALE_GROUP_SCORING_WORKFLOW.md](docs/BALE_GROUP_SCORING_WORKFLOW.md) | **Critical workflow** - How scoring works in real competitions | Developers |
| [OAS_RULES.md](docs/OAS_RULES.md) | **Tournament rules** - Tournament structure and formats | All |
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
| [Feature_EventPlanning_Product.md](docs/Feature_EventPlanning_Product.md) | Event management and tournament flow (Phase 3+) |
| [Feature_ArcherProfile.md](docs/Feature_ArcherProfile.md) | Archer profile and career stats (Phase 3+) |

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

### ✅ Phase 2 - Solo & Team Match Integration (COMPLETED)
**Goal:** Integrate Solo & Team Olympic match scoring with bracket management

**Status:** ✅ COMPLETED (November 20, 2025)

**Solo & Team Match Features:**
- ✅ Solo & Team match database schema
- ✅ API endpoints for Solo & Team matches
- ✅ Frontend integration with LiveUpdates + offline queue (solo_card.html, team_card.html)
- ✅ Match code generation + restoration (`solo-[INITIALS]-[MMDD]`, `team-[INITIALS]-[MMDD]`)

**Bracket Management Features (v1.5.3):**
- ✅ Bracket management system (elimination & Swiss formats)
- ✅ Coach Console UI for bracket creation and management
- ✅ Bracket results viewing with detailed match scores (`bracket_results.html`)
- ✅ Integration with Solo/Team match creation screens (event + bracket selectors, QR support)
- ✅ Archer assignment display on home page with direct navigation
- ✅ Auto-population of archers in Solo match setup from bracket assignments
- ✅ Archer match history page (`archer_matches.html`)
- ✅ URL parameter support for direct bracket/round access

**See:** [PHASE2_TEAM_MIGRATION_PLAN.md](docs/PHASE2_TEAM_MIGRATION_PLAN.md)

### 📅 Phase 3 - Planned
- Tutorial system
- Advanced analytics
- Season tracking

### ✅ Phase 4 - Tournament Brackets (FOUNDATION COMPLETE)
- ✅ Elimination & Swiss bracket management
- ✅ Bracket results viewing
- ✅ Archer assignment display
- ⏳ Advanced bracket features (double elimination, round robin, visualization)
- ⏳ Offline-first PWA
- ⏳ Mobile native apps

**Full Roadmap:** [ROADMAP.md](docs/ROADMAP.md)

---

## 🐛 Known Issues & Limitations

### UI Standardization Progress

#### ✅ Completed (v1.6.0)
- ✅ **100% Tailwind CSS Migration** – All modules now use compiled Tailwind CSS exclusively
- ✅ **Zero Legacy CSS** – Removed all `main.css` dependencies
- ✅ **Standardized Components** – `js/archer_selector.js` and `js/score_keypad.js` used across all modules
- ✅ **Ranking Round Migration** – Complete Tailwind migration for both 300 and 360 round modules
- ✅ **Team Module Integration** – Complete ArcherSelector integration with score color fixes
- ✅ **Solo Module Integration** – Complete ArcherSelector integration with A1/A2 selection
- ✅ **Dark Mode Support** – Complete dark mode implementation across all views
- ✅ **Mobile-First Design** – All modules optimized for mobile with 44px touch targets
- ✅ **Score Color System** – Unified score color utilities across all modules
- ✅ **Enhanced ScorecardView** – Consistent table rendering across modules

#### 🎯 Next Integration Targets
1. **Results Views** – Unify leaderboard rendering across multiple interfaces
2. **Advanced Bracket Visualization** – Enhanced bracket display and interaction

**Tracking:** [APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md](docs/APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md#shared-ui-standardization)

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
- **Production:** https://archery.tryentist.com/
- **Coach Console:** https://archery.tryentist.com/coach.html
- **Live Results:** https://archery.tryentist.com/results.html

### Development
- **Local Dev Guide:** [QUICK_START_LOCAL.md](QUICK_START_LOCAL.md)
- **API Docs:** [LIVE_SCORING_IMPLEMENTATION.md](docs/LIVE_SCORING_IMPLEMENTATION.md)
- **Testing:** [AUTOMATED_TESTING.md](docs/AUTOMATED_TESTING.md)

---

## 📄 License

Copyright © 2025 WDV Archery

---

## 📋 Recent Updates

### v1.8.1 - Match Tracking Release (December 1, 2025)
- ✅ **Match Tracking** – Win/loss ratio display in archer history
- ✅ **Solo Match Modal** – Quick view of complete match details without navigation
- ✅ **Reusable Component** – SoloMatchView component for consistent match display
- ✅ **Enhanced Authentication** – Support for match codes in standalone matches
- ✅ **Complete Match Info** – Shows all sets, scores, set points, and match totals

**Full Release Notes:** [RELEASE_NOTES_v1.8.1.md](RELEASE_NOTES_v1.8.1.md)

### v1.8.0 - Solo & Team Match History Integration (November 30, 2025)
- ✅ **Unified History Display** – Ranking rounds, solo matches, and team matches now shown together in archer history
- ✅ **Accurate Totals** – Sets won and total scores calculated from database set records
- ✅ **Proper Navigation** – Solo matches route to solo_card.html with match loaded from URL
- ✅ **Open Rounds Integration** – Incomplete solo matches appear in "Active Rounds" on home page
- ✅ **Winner Indicators** – Trophy emoji shown for match winners
- ✅ **Type-Specific Display** – Clear visual distinction between ranking rounds, solo matches, and team matches

**Full Release Notes:** [RELEASE_NOTES_v1.8.0.md](RELEASE_NOTES_v1.8.0.md)

### v1.6.1 - Active Rounds Display Improvements (December 2025)
- ✅ **Fixed List Display Bug** – Resolved critical issue where "Active Rounds" list was not showing on home screen
- ✅ **Enhanced Event Information** – Now displays actual event/round information instead of generic "Resume Ranking..." text
- ✅ **Status Field Clarification** – Status field now clearly shows card lifecycle (PEND, VER, VOID, COMP)
- ✅ **Improved Layout** – Better spacing, alignment, and mobile responsiveness
- ✅ **Tailwind Alignment** – Removed custom CSS, ensured all styling uses Tailwind utilities
- ✅ **Mobile Optimization** – Optimized for iPhone XR, iPhone SE, Samsung, Safari mobile

**Full Release Notes:** [RELEASE_NOTES_v1.6.1.md](RELEASE_NOTES_v1.6.1.md)

### v1.6.0 - Complete Tailwind CSS Migration (December 2025)
- ✅ **100% Tailwind Migration** – All major modules now use Tailwind CSS exclusively
- ✅ **Ranking Round Migration** – Complete 9-phase migration for both 300 and 360 round modules
- ✅ **ArcherSelector Integration** – Modern archer selection with avatars across all modules
- ✅ **Dark Mode Complete** – Full dark mode support across all views
- ✅ **Mobile Optimization** – All modules optimized for mobile-first usage
- ✅ **Zero Legacy CSS** – Removed all `main.css` dependencies
- ✅ **UI Consistency Achievement** – 100% UI consistency across all scoring modules

**Full Release Notes:** [RELEASE_NOTES_v1.6.0_Tailwind_Migration.md](RELEASE_NOTES_v1.6.0_Tailwind_Migration.md)

### v1.5.1 - Solo Module Integration Complete (November 21, 2025)
- ✅ **Solo Module Integration** – Complete ArcherSelector integration with A1/A2 selection
- ✅ **UI Consistency Achievement** – 50% of scoring modules now use standardized components
- ✅ **Enhanced User Experience** – Beautiful, consistent interface across Solo and Team modules
- ✅ **Code Quality Improvement** – Reduced duplication, cleaner architecture patterns

### v1.5.0 - Standardized Components & Team Integration (November 21, 2025)
- ✅ **New Standardized Components:**
  - `js/archer_selector.js` – Reusable archer selection with search, favorites, avatars
  - `js/score_keypad.js` – Touch-optimized score input with color coding
- ✅ **Team Module Integration** – Complete ArcherSelector integration with beautiful UI
- ✅ **Enhanced ScorecardView** – Added `renderArcherTable` function for consistent rendering
- ✅ **Security Improvements** – Path sanitization in LiveUpdates API client
- ✅ **Mobile-First Design** – Touch targets, safe-area padding, responsive layouts
- ✅ **Proven Architecture** – Team module demonstrates successful component integration

**Integration Status:** 2 of 4 modules using standardized components (Team ✅, Solo ✅, Ranking pending)

### v1.4.0 - Tailwind Conversion (November 17, 2025)
- ✅ Complete Tailwind CSS migration (100% Tailwind, no legacy CSS)
- ✅ Standardized keypad (4x3 layout) across all modules
- ✅ Fixed score colors in tables
- ✅ Complete dark mode support
- ✅ Updated setup screens with consistent styling
- ✅ Removed all `css/main.css` dependencies

**Full Release Notes:** [RELEASE_NOTES_v1.4.0.md](RELEASE_NOTES_v1.4.0.md)

### v1.3.0 (November 17, 2025)
- ✅ Fixed authentication: `GET /v1/archers` now public
- ✅ Enhanced analytics with pivot table
- ✅ Improved documentation
- 📚 Created master architecture document

**Full Release Notes:** [RELEASE_NOTES_v1.3.0.md](RELEASE_NOTES_v1.3.0.md)

---

**Last Updated:** December 1, 2025  
**Version:** 1.8.1  
**Status:** Production + 100% Tailwind Migration Complete
