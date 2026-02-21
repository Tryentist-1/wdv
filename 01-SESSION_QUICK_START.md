# 🚀 Session Quick Start Guide

**Purpose:** Rapidly onboard into development session without derailing  
**Use Case:** Start of every AI-assisted session or new developer onboarding  
**Last Updated:** February 20, 2026

---

## 📋 Read These First (In Order)

### 1. **Critical Context** (2 min read)

**[docs/core/BALE_GROUP_SCORING_WORKFLOW.md](docs/core/BALE_GROUP_SCORING_WORKFLOW.md)**

**Why:** Understand how scoring actually works in real competitions

- Bale groups (4 archers, 1 digital scorer)
- Verification process (coach locks entire bale)
- Event closure (permanent, no edits)

**Key Takeaway:** All system design flows from this real-world process.

---

### 1.5. **Tournament Rules** (3 min read)

**[docs/core/OAS_RULES.md](docs/core/OAS_RULES.md)**

**Why:** Understand tournament structure and formats

- Ranking rounds determine seeding
- Solo elimination brackets (Top 8)
- Team elimination brackets (Top 8 schools)
- Point systems for championships
- Tournament flow and advancement rules

**Key Takeaway:** Tournament structure drives bracket generation and match organization.

---

### 2. **System Architecture** (5 min scan)

**[docs/core/APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md](docs/core/APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md)**

**Why:** Master reference for entire system

- 5 modules: status & integration state
- Storage strategy (DB + localStorage + cookies)
- Phase 2 integration plan (Solo/Team)
- Database schemas & API designs

**Key Takeaway:** Ranking Rounds fully integrated ✅, Solo matches integrated ✅, Team matches integrated ✅, Bracket Management System fully implemented ✅

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

---
 
 ## 🚨 Status Update (February 21, 2026)
  
  ### ✅ Bracket Logic Refinements & Team Support (February 21, 2026)
  - **Generic Swiss Standings**: Refactored standings calculation to dynamically support both `ARCHER` and `TEAM` brackets.
  - **Team Swiss Support**: Enabled `generate-round` to handle team pairings, including school-balancing logic and roster preservation from previous rounds.
  - **Position-Based Seeding**: Integrated `seed_position` into Swiss tie-breaking and initial round pairings for fairer tournament distribution.
  - **Bale Range Persistence**: Optimized bale assignment to persist the starting bale range across multiple rounds of the same bracket.
  - **Roster Import Bug Fix**: Resolved SQL error during CSV import caused by non-integer values in the `seed_position` column. Extracting numeric portion of `assignment` strings (S1, T1) automatically.

  **Files Changed:** `api/index.php`, `version.json`, `walkthrough.md`, `task.md`

 
  ## 🚨 Status Update (February 20, 2026)
 
 ### ✅ Assignment List: Per-Archer Toggles & Navigation Fix (February 20, 2026)
 - **Per-Archer Toggles**: Added Level (VAR/JV) and Status (Act/Ina) toggle buttons directly to archer cards in `assignment_list.html`. Enables rapid individual adjustments without additional navigation.
 - **Global Filter Toggles**: Replaced legacy `<select>` dropdowns for Level and Status with touch-friendly button sets for improved mobile UX.
 - **Navigation Fix**: Replaced `window.history.back()` with a robust `goBack()` fallback logic. Corrects "non-page" error when navigating back from a direct link or QR entry.
 - **Auto-Save**: Integrated changes with the bulk upsert API, triggering an automatic save after 1.5s of inactivity.
 
 **Files Changed:** `assignment_list.html`, `version.json`, `walkthrough.md`  
 
 ## 🚨 Status Update (February 19, 2026)

### ✅ Event Deletion Confirm Bug Fix (February 19, 2026)
- **iOS PWA Confirm Bug**: Replaced the native `window.confirm()` dialog with a custom HTML modal in the `deleteEvent` workflow to prevent WebKit from instantly dismissing the dialogue in standalone bounds.

**Files Changed:** `coach.html`, `js/coach.js`, `version.json`
**Full Notes:** [RELEASE_NOTES_v1.0.0_build20260219d.md](RELEASE_NOTES_v1.0.0_build20260219d.md)

### ✅ Swiss Bracket Bale Assignment Fix (February 19, 2026)
- **Persisted Bale Assignments**: Modified the `generate-round` API for Swiss brackets. Rather than defaulting to `startBale = 1` for every new round, the system now queries the previous rounds in the DB to calculate the minimum bale number used by that specific bracket. This ensures archers retain their original bale grouping (e.g., Varsity Girls stay on Bales 3 & 4 instead of resetting to 1).

**Files Changed:** `api/index.php`, `version.json`
**Full Notes:** [RELEASE_NOTES_v1.0.0_build20260219c.md](RELEASE_NOTES_v1.0.0_build20260219c.md)

### ✅ Live Action HUD Beta & Search Improvements (February 19, 2026 - Evening)
- **Live Action HUD (Beta)**: Created `live_action.html` and `js/live_action.js` to provide a read-only, auto-refreshing dashboard for spectators. Displays all Solo and Team matches for a given event.
- **Click-to-View Scorecards**: Made the HUD match cards clickable. Clicking a match card opens `solo_card.html?match=UUID` or `team_card.html?match=UUID` in read-only mode, showing the detailed end-by-end scorecard without requiring an API key. 
- **Enhanced Search (OR Logic)**: Upgraded the HUD's search bar to use space-separated OR logic instead of AND logic. Searching "Liana BJV" now matches any archer in the event named Liana OR any match in the BJV division.
- **Team Roster Search & Display**: Extracted the archer names from the `team_match_archers` array and injected them into the searchable string. Added a comma-separated list of archers underneath the team names on Team match cards (e.g. `Ariana Ramirez, Alina Vizcarra, Liana Bils`).
- **API Adjustments**: Removed `require_api_key()` from `GET /v1/solo-matches/:id` and `GET /v1/team-matches/:id` in `api/index.php` to enable public read-only access for the scorecards.

**Files Changed:** `live_action.html`, `js/live_action.js`, `api/index.php`, `walkthrough.md`, `version.json`  

### ✅ Event Prep Fixes & UI Polish (February 19, 2026)
- **Pending Matches Link Fix**: Modified the `/v1/archers/{id}/bracket-assignments` API to dynamically resolve the active match ID for both Elimination and Swiss brackets. The archer UI now successfully clicks through to `solo_card.html?match=UUID`.
- **Bracket Tie-Breakers (Shoot-Offs)**: Adjusted the aggregation limit inside `api/index.php`. Solo matches now parse up to `set_number <= 6` and Team matches up to `set_number <= 5`, securely resolving tie scenarios without rolling over missing points.
- **Bracket Leaderboards**: Unified the SQL `ORDER BY` logic for `/v1/brackets/{id}/results`. Swiss standings inherently prioritize absolute win percentage (record) prior to points or total wins. Polling on `bracket_results.html` is relaxed from 5 to 15 seconds.
- **Dashboard Verify Workflow**: Intercepted the hidden `Verify` button inside the `event_dashboard.html` authenticated UI. Integrated the exact coach parameter logic (`verifyEvent`) to automatically trigger the `coach.html` Verify Scorecards modal.
- **Bracket Results UI**: Status badge conditionally transitions to "Verified" when cards hit `VRFD` or `VER`. Display explicit bale strings (e.g. `11-A`) in the `Tgt` column. Amply styled match winner rows using `bg-green-100`.
- **Event List QR Update**: Rewired the coach event list QR Code generation to exclusively direct toward `event_dashboard.html?event=UUID`, dissolving the previous `entry_code` requirement since the dashboard is inherently public-facing.

**Files Changed:** `api/index.php`, `index.html`, `bracket_results.html`, `event_dashboard.html`, `js/coach.js`
**Full Notes:** [RELEASE_NOTES_v1.0.0_build20260219.md](RELEASE_NOTES_v1.0.0_build20260219.md)

### ✅ Archer Window — "Your Bale" Section + API Fix (February 18, 2026 — Evening, Build 20260218192007)
- **"Your Bale" section added to Archer Window** — Archers now see their exact bale, line, and target assignment directly on the home screen, without navigating to the scorecard. A compact card appears whenever the archer has an active match with a bale assigned. (`index.html`)
  - **Solo matches:** Shows target letter (A or B) highlighted in blue, opponent's target and name
  - **Team matches:** Shows your team name and "Opponent Team" label — no confusing target letters when not applicable
  - Tapping the card navigates directly to the match scorecard
  - Re-uses data from the existing `/v1/archers/{id}/bracket-assignments` API (no new network calls)
- **Fixed 500 error on `/v1/archers/{id}/bracket-assignments` API** — Two invalid column references (`b.side`, `tmt_self.swiss_wins/losses/points`) blocked the endpoint for all archers. Removed both. (`api/index.php`)
- **Fixed team bale assignments not showing** — The `bracketAssignments.forEach` loop only handled `SOLO` assignments. Added `TEAM` branch that merges bale data from the bracket-assignments API onto the existing team entry from the history API. (`index.html`)

**Files Changed:** `index.html`, `api/index.php`, `version.json`  
**Build:** `20260218192007` → deployed to production ✅  
**Full Notes:** [RELEASE_NOTES_v1.0.0_build20260218c.md](RELEASE_NOTES_v1.0.0_build20260218c.md)

### ✅ Archer Window UI — Recent Activity & Team Match Navigation Fixes (February 18, 2026 — Evening, Build 20260218151545)
- **Recent Activity hidden for archers with no open assignments** — `renderRecentActivity()` was called after an early-return guard in `loadOpenAssignments()`. Archers who had completed all work (e.g. post-event) never saw their history. Fixed by moving the call before the early return. (`index.html`)
- **Stale Recent Activity when switching archers** — Switching from an archer with active assignments to one without left the previous archer's history cards visible. Fixed automatically by the above change.
- **Team match deep-link shows Setup view instead of Scoring view** — `team_card.js` required exactly 3 archers per side before restoring the scoring view from `?match=UUID`. Test/dev matches with fewer archers could never reach the scoring view. Relaxed guard to `team1.length > 0 && team1.length === team2.length`. (`js/team_card.js`)
- **Legacy files removed:** `solo_round.html` and `js/solo_round.js` deleted.

**Files Changed:** `index.html`, `js/team_card.js`  
**Git Commit:** `0da4d15` (fix) + `0e0b423` (chore) → merged `78723c9` on main  
**Build:** `20260218151545` → deployed to production ✅  
**Full Notes:** [RELEASE_NOTES_v1.0.0_build20260218.md](RELEASE_NOTES_v1.0.0_build20260218.md)


### ✅ Team Dashboard & Verification Fixes (February 18, 2026 — Afternoon)
- **Team Bracket SQL Error:** Fixed 500 error on `GET /v1/brackets/:id/results` for TEAM Swiss brackets. `tmt.team_name` was missing from `SELECT DISTINCT` but referenced in `ORDER BY`. (`api/index.php`)
- **Verification Radio Buttons:** Fixed "Teams" / "Solo" radio buttons requiring a page reload to work. Added explicit `onchange` listeners inside `verifyEvent()`. (`js/coach.js`)
- **Team Score Sync:** Fixed team match scores showing as "0-0" on all summary views. Set-save endpoint now syncs `set_total`/`set_points`/`running_points` across all team archers and recalculates `sets_won` on `team_match_teams`. (`api/index.php`)
- **Data Repair:** Ran one-time repair script to fix existing match records. Match `23089dd3` now correctly shows 5-1.

**Files Changed:** `api/index.php`, `js/coach.js`  
**Full Notes:** [RELEASE_NOTES_v1.0.0_build20260218b.md](RELEASE_NOTES_v1.0.0_build20260218b.md)

### ✅ Solo/Team Keypad & Sync Fixes (February 12, 2026)
- **Solo keypad fix:** Migrated `solo_card.js` from inline keypad to shared `ScoreKeypad` module (`js/score_keypad.js`). Fixed keypad not appearing and auto-advance broken on mobile (caused by `readOnly` check in `focusin` handler).
- **Match code restoration:** `hydrateSoloMatch()` and `hydrateTeamMatch()` now restore `match_code` from server GET response. Fixes 401 sync failures after "Reset Data" clears localStorage.
- **Sync status on solo card:** End rows now embed sync status icons (checkmark/spinner/error) via `<span id="sync-e${setNumber}">`.
- **LiveUpdates API:** Added `setSoloMatchCode()` and `setTeamMatchCode()` public setters.

### ✅ Deploy Script & Safety Overhaul (February 12, 2026)
- **Comprehensive exclusions:** `DeployFTP.sh` now has 40+ exclude patterns organized by category (sensitive files, IDE/tooling, dev dirs, test configs, API dev tools, etc.)
- **Canonical whitelist:** `.cursor/rules/deployment-safety.mdc` now starts with a positive "What DOES Deploy" list — no more guessing.
- **Step 3 verification:** Deploy script now accurately shows only production files (was previously showing dev files in the preview).
- **Files now excluded that were previously leaking to prod:** `scripts/`, `audit/`, `bugs/`, `planning/`, `jest.config.js`, `playwright.config*`, `package.json`, `api/sql/**`, `api/seed_*.php`, `api/*migrate*.php`, build configs, dot files, and more.

### ✅ Games Events: Position Filter & Import Roster Games
- **Position filter:** S1–S8, T1–T6 for Games Events in Add Archers modal
- **Import Roster Games:** CSV import with column mapping, MySQL sync
- **Assignment list:** Active/Inactive/All filter, sort by School → Gender → VJV → Position
- **Deploy safety:** Excludes `.cursor`, `.agent`, `config.local.php`; `WDV_DEPLOY_SOURCE` env var
- **Config:** `config.local.php.example`, `docs/CONFIG_SETUP.md`, prod cleanup guides

**Items left:** [docs/planning/ITEMS_LEFT_TO_COMPLETE.md](docs/planning/ITEMS_LEFT_TO_COMPLETE.md)

**Open (when convenient):**
- **Local PHP 8.5 vs prod 8.3:** Downgrade local to 8.3 to match prod (prod is capped at 8.3 in control panel). Reduces "works on my machine" surprises. Not blocking.

### ✅ Ranking Round Sync Fixes (February 3, 2026)

- **Header:** Single alert — LOCAL Only (red) / Syncing (yellow) / Synced (green). Removed “Check server”; automatic background comparison with server.
- **Footer:** Sync End validated (missing-arrow check), “All Arrows Synced” or “Error [desc]” feedback, event delegation so button always fires. Running total = sum of complete ends 1..current.
- **Missing Arrow** indicator in scoring table and scorecard view (placeholder “Missing” + dashed border).
- **Style guide:** Preference added — headers for information and alerts only; actions in footer or content. See `tests/components/style-guide.html` → Headers & Layouts.

**Note:** Server setup (Docker, MySQL, PHP) is unchanged and separate from these sync optimizations. See `QUICK_START_LOCAL.md` → “Ranking Round Sync” for details.

---

## 🎯 Next Steps (Upcoming Work)

### 🔥 ACTIVE WORK (Current Sprint)

#### 📋 Event Tracking Dashboard

**Status:** Planning & Implementation  
**Priority:** High  
**Goal:** Create holistic event overview for day-of-event management

**Features:**
- Real-time progress tracking across all rounds and brackets
- Visual hierarchy: Event → Rounds → Brackets
- Completion percentages and status indicators
- Quick access to critical actions (Verify, View Results, Create Brackets)
- Timeline/schedule view for multi-day events
- Mobile-optimized for on-the-go event management

**Implementation Approach:**
- **Additive only** - New page (`event_dashboard.html`) and API endpoint
- **No impact on existing features** - Standalone dashboard
- **Follows existing patterns** - Uses same API structure, Tailwind CSS, mobile-first

**Documentation:**
- [EVENT_TRACKING_DETAILS_ENHANCEMENT_EVALUATION.md](docs/EVENT_TRACKING_DETAILS_ENHANCEMENT_EVALUATION.md)

**Estimated Effort:** 6-10 weeks (phased approach)

---

### 📋 BACKLOG (Planned but Not Active)

**Note:** These are planned improvements but not currently being worked on. Prioritize based on user needs and sprint goals.

- ✅ **Archer Edit Modal Scroll/Touch Fixes (v1.9.6):** ✅ Complete - Fixed critical scroll and touch issues
  - Fixed background scrolling when modal is open
  - Implemented body scroll lock
  - Added touch event prevention on overlay
  - Added scroll containment CSS
  - Evaluated modal paradigm (confirmed appropriate)
  - Created evaluation documentation
- **Headers and Footers:** Update headers and footers in scoring modules (Ranking Round 300, Ranking Round 360, Solo Card, Team Card) for consistency and improved UX
- **Complete Checkbox:** Add "Complete" checkbox to scorecards so archers can mark in-progress cards as complete
  - This will help archers signal when they've finished scoring a round/match
  - Should integrate with existing status system (PEND → COMP transition)
  - UI placement: Consider adding to card view header or footer area
- **Bracket Generation Bug:** Fix bracket generation from Top 8 ranking results
  - Issue: Bracket generation endpoint (`POST /v1/brackets/{id}/generate`) does not properly generate brackets from Top 8 archers/teams
  - Location: `api/index.php` - `/v1/brackets/:id/generate` endpoint
  - Priority: High (blocks tournament progression from ranking rounds to elimination brackets)
- **Results Dark Mode Bug:** Fix dark mode display issues in results view
  - Issue: Dark mode styling not working correctly in results page
  - Location: `results.html` or related CSS/JS
  - Priority: Medium (affects user experience in dark mode)

---

## 🎯 Current State (December 2025)

## 🗂️ File Organization

### Entry Points

```
/
├── 01-SESSION_QUICK_START.md       ← You are here! Start every session here
├── README.md                        ← Project overview
├── QUICK_START_LOCAL.md             ← Local dev setup
├── docs/
│   ├── QUICK_START_INDEX.md         ← Quick start guide index
│   ├── core/BALE_GROUP_SCORING_WORKFLOW.md         ← CRITICAL workflow
│   ├── core/APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md ← Master architecture
│   └── planning/ITEMS_LEFT_TO_COMPLETE.md          ← Items left to do
```

### When Working On

**Authentication/Storage:**

- [docs/AUTHENTICATION_ANALYSIS.md](docs/AUTHENTICATION_ANALYSIS.md)
- [docs/STORAGE_TIER_AUDIT.md](docs/STORAGE_TIER_AUDIT.md)
- [docs/PHASE2_AUTH_IMPLEMENTATION.md](docs/PHASE2_AUTH_IMPLEMENTATION.md) - Match code authentication
- [docs/CLEANUP_ACTION_PLAN.md](docs/CLEANUP_ACTION_PLAN.md)

**Ranking Rounds:**

- [docs/ARCHER_SCORING_WORKFLOW.md](docs/ARCHER_SCORING_WORKFLOW.md)
- [docs/LIVE_SCORING_IMPLEMENTATION.md](docs/LIVE_SCORING_IMPLEMENTATION.md)

**Verification/Locking:**

- [docs/SPRINT_VERIFY_SCORECARDS.md](docs/SPRINT_VERIFY_SCORECARDS.md)
- [docs/BALE_GROUP_SCORING_WORKFLOW.md](docs/BALE_GROUP_SCORING_WORKFLOW.md)

**Event Management:**

- [docs/Feature_EventPlanning_Product.md](docs/Feature_EventPlanning_Product.md) - Event creation and tournament flow (Phase 3+)

**Archer Management:**

- [docs/Feature_ArcherProfile.md](docs/Feature_ArcherProfile.md) - Archer profile and career stats (Phase 3+)

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
- **Tailwind CSS** (utility-first styling) - ✅ 100% migrated (Nov 2025)
- **Mobile-first** (99% phone usage [[memory:10705663]])
- **No legacy CSS** - All modules use Tailwind exclusively
- **Progressive Web App (PWA)** - Installable, offline-capable (v1.8.3+)

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
- `sw.js` - Service worker for PWA caching (v1.8.3+)
- `manifest.json` - Web app manifest for PWA (v1.8.3+)

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

The full dev environment runs in Docker Compose via OrbStack. **Open OrbStack and everything auto-starts.**

```bash
# First time or after changes
docker compose up -d

# Verify
docker compose ps
curl http://localhost:8001/api/v1/health

# View logs
docker compose logs -f

# Run tests
npm test
```

- **App:** http://localhost:8001/index.html
- **Coach:** http://localhost:8001/coach.html
- **API:** http://localhost:8001/api/v1/health
- **DB (DBeaver):** 127.0.0.1:3306, user `wdv_user`, password `wdv_dev_password`

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

### Deployment Workflow

**IMPORTANT FOR LLMs:** When asked to "promote to prod", "deploy to production", or "FTP deploy", follow this complete workflow:

#### Pre-Deployment Checklist

```bash
# 1. Build Tailwind CSS (if any styling changes)
npm run build:css:prod

# 2. Run tests (optional but recommended)
npm test                    # Remote tests
npm run test:local          # Local tests (if server running)

# 3. Preview deployment (dry run)
npm run deploy:dry
```

#### Deploy to Production

```bash
# Primary deployment script location: scripts/deploy/DeployFTP.sh
npm run deploy              # Full deploy with local backup
npm run deploy:fast         # Skip local backup (faster)

# The script automatically:
# ✅ Creates local backup (unless --no-local-backup)
# ✅ Shows files to be uploaded
# ✅ Uploads changed files via FTP-SSL
# ✅ Purges Cloudflare cache (if credentials in .env)
```

#### Available Flags

| Flag | Purpose |
|------|---------|
| `--dry-run` | Preview changes without deploying |
| `--reset` | Force re-upload all files, delete remote orphans |
| `--no-local-backup` | Skip local backup (faster) |
| `--remote-backup` | Download remote backup before deploying |

#### What Gets Deployed

> **Canonical whitelist:** `.cursor/rules/deployment-safety.mdc`

| Deployed ✅ | Excluded ❌ |
|-------------|------------|
| `api/` - Production PHP only | `scripts/`, `docs/`, `tests/` |
| `js/` - Frontend JS | `audit/`, `bugs/`, `planning/` |
| `css/` - Compiled CSS | `api/sql/`, `api/seed_*.php`, `api/*migrate*.php` |
| Production `*.html` pages | `*.md`, `.env*`, `node_modules/` |
| `avatars/`, `icons/*.png` | Build configs (`jest`, `playwright`, `package.json`) |
| `sw.js`, `manifest.json`, `version.json` | `.git/`, `.cursor/`, `.agent/`, IDE files |
| `targetface/`, `.htaccess` files | `backups/`, `deploy_backups/`, `app-imports/` |

#### Post-Deployment Verification

```bash
# Check production health
curl https://archery.tryentist.com/api/v1/health

# Open key pages to verify
open https://archery.tryentist.com/
open https://archery.tryentist.com/coach.html
```

📋 **Full Checklist:** See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

### Database

```bash
# Connect to local MySQL
mysql -u root -p wdv_local

# Connect to production (if needed)
mysql -h tryentist.com -u USERNAME -p wdv_production
```

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
**"Top 8"** | Top 8 archers/teams advance to elimination brackets (see [OAS_RULES.md](docs/OAS_RULES.md))
**"Bracket"** | Single-elimination tournament structure (see [OAS_RULES.md](docs/OAS_RULES.md))

---

## 📊 Health Checks

### Is System Working?

```bash
# 1. Check API health
curl https://archery.tryentist.com/api/health

# 2. Check database connection
curl https://archery.tryentist.com/api/v1/archers | jq '.archers | length'

# 3. Check authentication
curl -H "X-Passcode: wdva26" https://archery.tryentist.com/api/v1/events | jq '.events | length'
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

### Questions About

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

**"How does PWA work?"**  
→ [docs/PWA_SETUP_GUIDE.md](docs/PWA_SETUP_GUIDE.md) and [docs/PWA_OFFLINE_QUEUE_INTEGRATION.md](docs/PWA_OFFLINE_QUEUE_INTEGRATION.md)

**"What's the status of X?"**  
→ Search in `/docs` folder or check [docs/README.md](docs/README.md) for organized index

**"How do I wrap up a session?"**  
→ [SESSION_WRAP_UP_BEST_PRACTICES.md](docs/SESSION_WRAP_UP_BEST_PRACTICES.md) - 5-minute wrap-up process

**"Where should I put this doc?"**  
→ [guides/DOCS_FOLDER_ORGANIZATION.md](docs/guides/DOCS_FOLDER_ORGANIZATION.md) - Docs organization guide

---

## 💬 Session Start Template

**Use this when starting a new AI session:**

```
Hi! I'm working on the WDV Archery Suite. Quick context:

📋 CURRENT STATE:
- Version: v1.8.0 (December 2025)
- Phase: Phase 2.5 - Event Tracking Dashboard (Planning)
- Status: [In Progress / Planning / Testing]

🎯 TODAY'S GOAL:
[What you want to accomplish in this session]

📝 WHAT CHANGED SINCE LAST SESSION:
[Brief summary of what was done last time, or "First session"]

📂 FILES/MODULES WE'RE WORKING ON:
- [List specific files or modules]

❓ QUESTION/TASK:
[Your specific question or task]

🔧 CONTEXT:
[Any additional context: constraints, requirements, edge cases, etc.]

📚 I'VE READ:
- ✅ SESSION_QUICK_START.md
- ✅ BALE_GROUP_SCORING_WORKFLOW.md
- [ ] APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md (relevant sections)
- [ ] [Other relevant docs]
```

**Why This Works:**
- ✅ Gives LLM immediate context about current state
- ✅ Clearly states what you want to accomplish
- ✅ Highlights what changed (helps LLM understand recent work)
- ✅ Lists files/modules (helps LLM focus on relevant code)
- ✅ Separates question from context (clearer structure)

**Pro Tip:** Copy this template into a note file and update it after each session. Then paste it at the start of the next session!

---

## 🏁 Session Wrap-Up (End of Session)

> **💡 Quick Reference:** [SESSION_WRAP_UP_BEST_PRACTICES.md](docs/SESSION_WRAP_UP_BEST_PRACTICES.md) - Complete guide

**Before ending your session, spend 5 minutes:**

1. ✅ **Update "What Changed Since Last Session"** (2 min)
   - What was accomplished?
   - Key files changed?
   - Status (Completed/In Progress/Blocked)?

2. ✅ **Update "Current Sprint / Active Work"** (1 min)
   - Last session focus
   - Current priority
   - Blockers (if any)

3. ✅ **Commit changes** (1 min)
   - Documentation updates
   - Code changes (if any)

**Result:** Next session starts with full context in seconds!

### Quick Wrap-Up Checklist

- [ ] Updated "What Changed Since Last Session"
- [ ] Updated "Current Sprint / Active Work"  
- [ ] Noted any blockers/dependencies
- [ ] Committed changes
- [ ] Ready for next session!

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

- **Production:** <https://archery.tryentist.com/>
- **Coach Console:** <https://archery.tryentist.com/coach.html>
- **Results:** <https://archery.tryentist.com/results.html>
- **Local:** <http://localhost:8001>

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
