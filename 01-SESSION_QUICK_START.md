# 🚀 Session Quick Start Guide

**Purpose:** Rapidly onboard into development session without derailing  
**Use Case:** Start of every AI-assisted session or new developer onboarding  
**Last Updated:** December 15, 2025

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

## 🚨 Status Update (February 2026)

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

## 🚨 Status Update (January 26, 2026)

### ✅ Docker Environment Integration
- **Feature:** Added full Docker Compose support for local development (`docker-compose.yml`)
- **Components:** Nginx (Web), PHP-FPM 8.2 (App), MariaDB 10.6 (Database)
- **Configuration:** 
  - `nginx.conf` with PATH_INFO support for API routing
  - `config.docker.php` with environment-specific credentials
  - `package.json` scripts: `docker:up`, `docker:down`, `docker:logs`
- **Documentation:** Updated `README.md`, `QUICK_START_LOCAL.md`, and `LOCAL_DEVELOPMENT_SETUP.md`
- **Status:** Verified and working. Database seeded with production backup.

## 🚨 Status Update (January 20, 2026)

> **💡 Pro Tip:** For detailed change history, see [RELEASE_NOTES_FOR_LLMS.md](docs/RELEASE_NOTES_FOR_LLMS.md)  
> Release notes provide context and "why" - much better for LLM onboarding than git commits alone!

### 📝 What Changed Since Last Session

**Last Updated:** January 20, 2026

**Session Date:** January 20, 2026

**What We Did:**
- ✅ **Swiss Bracket Win/Loss Accuracy Fix:** Fixed double-counting bug in bracket standings
  - Replaced increment-based logic with recalculation from actual match data
  - Prevents multiple wins from repeated "Complete" clicks
  - Handles match edits and verification correctly
  - Standings recalculate automatically when matches are completed, unlocked, or verified
- ✅ **Bracket Results Display Enhancements:**
  - Added match status badges (Pending, In Progress, Complete, Verified) in top-right corner
  - Fixed end scores to show match points (set_points: 0, 1, or 2) instead of just score
  - Display full archer names in match results
  - Added auto-refresh for Swiss brackets (every 5 seconds)
  - Added manual refresh button with recycle icon
  - Removed header navigation buttons, kept footer navigation
- ✅ **Archer Selection Improvements for Solo Matches:**
  - Enhanced archer filtering to show only event archers when bracket is selected
  - For Open/Mixed brackets: Shows all archers assigned to the event
  - For division-specific brackets: Shows archers from that division only
  - Added ranking round scores display in archer list
  - Added bracket standings (W-L record) for Swiss brackets
  - Improved error handling with fallbacks
- ✅ **Navigation Improvements:**
  - Added "Brackets" button in coach console that links directly to bracket results
  - Fixed bracket edit button on event dashboard
  - Improved bracket results page navigation

**Previous Session (January 13, 2026):**
- ✅ **Export Shirt Order Feature (v1.9.4):** Added new export functionality to Coach Actions menu
  - New "Export Shirt Order" button in Coach Actions modal
  - Exports CSV formatted for custom jersey/apparel ordering
  - Fields: Name on Jersey (LastName), Number (blank), Size (Gender-ShirtSize), Name on Front (Nickname/FirstName), Style ("archery 1/4 zip"), Note (blank)
  - File downloads as `shirt-order-YYYY-MM-DD.csv`
  - Handles missing data gracefully (empty sizes, missing nicknames)
- ✅ **Shirt Sizes Entry List Feature:** Complete implementation of new shirt sizes entry list for Manage Archers module
  - Added "Shirt Sizes" button to selector strip (right side)
  - Created shirt sizes entry list view with 3-row button grid (L/XL/2X/3X, M, S/XS)
  - Implemented larger avatar (100px tall, matches 3 name rows)
  - Added nickname entry modal (opens on field click, green check saves, X cancels)
  - Implemented auto-submit/save on shirt size button selection
  - Updated style guide with new patterns
  - Fixed bug: Use extId/id to find archers instead of filtered list indices
  - Layout: Names on left, shirt sizes on right, avatar spans full height
- ✅ **API Field Completeness Fix:** Fixed GET /v1/archers endpoint to return all fields
  - Added shirtSize, pantSize, hatSize to SELECT statement
  - Created verification scripts to ensure all database fields are properly exposed
  - Fixed refresh functionality to load all archer data including shirt sizes
- ✅ **Unsaved Changes Detection Fix:** Fixed false positive warnings in Edit Archer modal
  - Added unsaved changes check before navigating to next/previous archer
  - Improved comparison logic with normalizeValue() to handle null/undefined/empty consistently
  - Added guard checks to ensure originalFormState exists before comparing
  - Fixed false positive warnings when closing/navigating with no actual changes

**Files Changed:**
- `archer_list.html` - Export Shirt Order button, shirt sizes entry list view, nickname modal, unsaved changes detection fixes
- `js/archer_module.js` - Added exportShirtOrderCSV() function
- `api/index.php` - Fixed GET /v1/archers to return size fields
- `tests/components/style-guide.html` - Added Shirt Sizes Entry section with examples
- `RELEASE_NOTES_v1.9.4.md` - New release notes document

**Status:** ✅ Completed and deployed to production

**Commits:**
- `dc8bb3f` - Add Shirt Sizes entry list feature
- `818be07` - Fix unsaved changes detection in Edit Archer modal

### 🎯 Current Sprint / Active Work

**Last Session Focus:** Shirt Sizes Entry List Feature & Unsaved Changes Detection Fix  
**Current Priority:** Ready for next feature  
**Next Session Focus:** TBD  
**Active Branch:** `main`  
**Blockers:** None

**Quick Context for This Session:**
- ✅ **Completed:**
  1. **Archer List Header Cleanup & Modal Improvements (v1.9.5):** ✅ Complete - Cleaned up header, added favorites filter, improved modal
     - Removed redundant self-summary container and select-yourself banner
     - Added favorites filter button (includes "Me" record)
     - Highlighted "Me" record with blue background and left border accent
     - Fixed identity selection persistence between pages
     - Improved ArcherModule.getSelfArcher() lookup logic
     - Fixed modal alignment (top locked, content scrolls down)
     - Increased photo size (w-32 h-32) to match 3 lines of name inputs
     - Show nickname instead of first name in list, modal title, and success messages
     - Moved gear notes to Equipment section
     - Modal stays open after save for easier editing
  2. **Footer Mobile-Friendly Update (v1.9.4):** ✅ Complete - All 14 footers updated
     - Increased footer height from 36px to 48px for better touch targets
     - Home button now 48×48px touch target (`min-w-[48px] h-[48px]`)
     - Larger home icon (`text-2xl` instead of `text-xl`)
     - Added active state feedback (`active:bg-gray-100 dark:active:bg-gray-700`)
     - Updated button padding from `px-2 py-[2px]` to `px-3`
     - Updated all body padding from `calc(36px+...)` to `calc(48px+...)`
     - Updated style-guide.html with new footer standard
     - Updated FOOTER_STANDARDIZATION_ANALYSIS.md documentation
     - Rebuilt Tailwind CSS with new utility classes
  2. **Previous: Coach.html Event Layout:** ✅ Converted events table to 2-line card layout per event
  3. **Previous: Verify Scorecards Modal:** ✅ Mobile-friendly refactor
  4. **Previous: Scorecard Editor Edit Buttons:** ✅ Complete integration
  5. **Previous: Footer Standardization (v1.9.2):** ✅ All 14 footers standardized to 36px
- 📂 **Files Changed (This Session):**
  - `archer_list.html` - Removed header self-selection elements, added favorites filter, highlighted "Me" record, improved modal
  - `index.html` - Fixed identity selection to use ArcherModule.setSelfExtId(), improved lookup logic
  - `js/archer_module.js` - Updated getSelfArcher() to check both extId and id (UUID)
  - `docs/analysis/ARCHER_LIST_HEADER_RECOMMENDATIONS.md` - New analysis document 

---

### ✅ Latest Release (v1.9.0)

**Release Date:** December 1, 2025  
**Status:** Production

- **Universal Data Synchronization Strategy:** Centralized hydration functions across all modules
- **6 Universal Rules:** Server as source of truth, Last Write Wins for scores, atomic data units
- **Live Sync Fixes:** Standalone rounds no longer require event code
- **Complete Button:** Replaced deprecated Export modal with modern Complete confirmation
- **Error Handling:** Enhanced error handling for Archer History endpoint
- **Database Migration:** Combined migration script for solo/team match tables

**Full Release Notes:** [RELEASE_NOTES_v1.9.0.md](RELEASE_NOTES_v1.9.0.md)

### ✅ Previous Release (v1.8.3)

**Release Date:** December 1, 2025  
**Status:** Production

- **Solo Match Verification:** Complete integration into coach verification workflow
- **Match Type Selector:** Radio buttons to switch between Ranking Rounds, Solo Matches, and Team Matches
- **Enhanced API:** GET `/v1/events/{id}/solo-matches` with filtering and summary statistics
- **ScoreCard Editor Support:** View and verify solo matches with sets-based display
- **Verification Actions:** Lock, unlock, and void solo matches with full audit trail
- **Smoke Tests:** 16 comprehensive tests for verification workflow
- **Style Guide Updates:** New component documentation for solo match tables and verification UI

**Full Release Notes:** [RELEASE_NOTES_v1.8.2.md](RELEASE_NOTES_v1.8.2.md)  
**Why Release Notes Matter:** See [RELEASE_NOTES_FOR_LLMS.md](docs/guides/RELEASE_NOTES_FOR_LLMS.md) for how release notes help LLMs understand context better than git commits alone.

### ✅ Previous Release (v1.8.1)

**Release Date:** December 1, 2025  
**Status:** Production

- **Match Tracking:** Win/loss ratio display in archer history (e.g., "5-3")
- **Solo Match Modal:** Click any solo match to view complete details in modal overlay
- **Reusable Component:** SoloMatchView component for consistent match display
- **Enhanced Authentication:** Support for match codes in standalone matches
- **Complete Match Info:** Shows all sets, scores, set points, and match totals
- **Remake Match:** Button to navigate to solo card for full editing/review

**Full Release Notes:** [RELEASE_NOTES_v1.8.1.md](RELEASE_NOTES_v1.8.1.md)

### ✅ Previous Release (v1.8.0)

**Release Date:** November 30 2025  
**Status:** Production

- **Unified History Display:** Ranking rounds, solo matches, and team matches now shown together in archer history
- **Accurate Totals:** Sets won and total scores calculated from database set records
- **Proper Navigation:** Solo matches route to solo_card.html with match loaded from URL
- **Open Rounds Integration:** Incomplete solo matches appear in "Active Rounds" on home page
- **Winner Indicators:** Trophy emoji shown for match winners
- **Type-Specific Display:** Clear visual distinction between ranking rounds, solo matches, and team matches

**Full Release Notes:** [RELEASE_NOTES_v1.8.0.md](RELEASE_NOTES_v1.8.0.md)

### ✅ Previous Release (v1.7.1)

[Add release notes when available]

### ✅ Previous Release (v1.7.0)

[Add release notes when available]

### ✅ Previous Release (v1.6.7)

- **Dark Mode Text Visibility Fixes:** Fixed dark mode text color issues across all modules
  - **Unified Scorecard Lists:** Updated all scorecard lists to use `dark:text-white` instead of `dark:text-gray-100` for better visibility
  - **Solo Card:** Fixed dark text in table header and match summary display
  - **Team Card:** Fixed score color styling (moved color classes from input to td elements)
  - **Results & History:** Fixed dark mode text in scorecard lists
  - **Test Components:** Fixed dark text in 6-column layout section
- **Syntax Error Fixes:** Removed unclosed DOMContentLoaded listeners in event_dashboard.html and archer_history.html
- **Team Match Code Generation:** Fixed condition check in api/index.php to ensure match codes are generated correctly
- **Standalone Match Warnings:** Improved warning messages in live_updates.js for standalone matches (suppressed warnings for match creation)
- **Match Code Logging:** Added error_log statements to track match code generation for debugging

### ✅ Previous Release (v1.6.6)

- **Practice Target Database Integration:** Practice rounds now save to database and appear in archer history
  - **Database Save:** Practice rounds saved with `round_type: 'PRACTICE'` and all end-by-end scoring data
  - **Archer Selection:** Automatic prompt for archer selection if no "Me" archer is set
  - **History Integration:** Practice rounds display in archer history alongside competition rounds
  - **Mobile UI Improvements:** Better touch targets, responsive design, dark mode support
  - **Button Handler Fixes:** Fixed non-responsive buttons with proper event handler initialization
  - **Separate Save Options:** "Save" button for database, "Image" button for PNG download

### ✅ Previous Fixes (v1.6.5)

- **Ranking Round Grid Tuning:** Optimized scoring table for better mobile display
  - **Column Widths:** Reduced widths to fit 450px minimum (Archer: 85px, A1/A2/A3: 32px, End: 40px, Run: 48px, X/10: 24px, Card: 32px)
  - **Padding:** Tighter padding (px-0.5 for most cells, px-1.5 for Archer)
  - **Row Height:** Consistent 44px height with proper vertical alignment
  - **Table Width:** Reduced minimum width from 600px to 450px for better mobile fit
- **Ranking Round Header Standardization:** Two-line header layout across all modules
  - **Line 1:** Event Name + Sync Status | Bale Number
  - **Line 2:** Division + Round Type | End Number
  - Shows actual event name from database
- **Scorecard Editor Improvements:** Enhanced usability for critical coach tool
  - **X/10 Calculation:** Fixed calculation and display in search results and scorecard table
  - **Bottom Sheet Keypad:** Converted intrusive modal to bottom sheet for score input
  - **Subheader for Edit Functions:** Moved action buttons to dedicated subheader below main card
  - **Column Alignment:** Fixed X/10 columns breaking onto separate line
- **Results & History Formatting:** Fixed regression in scorecard list display
  - Restored proper Tailwind grid classes and column alignment
  - All 6 columns always rendered for consistent layout

### ✅ Previous Fixes (v1.6.1)

- **Active Rounds List Display:** Fixed critical bug where "Active Rounds" list was not displaying on home screen.
  - **Cause:** Variable scope error in `unified_scorecard_list.js` - `xs` and `tens` used before initialization.
  - **Fix:** Reordered variable declarations to calculate values before use in column count determination.
- **Active Rounds Layout Improvements:** Enhanced "Active Rounds" display on home screen (`index.html`).
  - **Event Name Display:** Now shows actual event/round information instead of generic "Resume Ranking..." text.
  - **Status Field:** Clarified status calculation (PEND, VER, VOID, COMP) matching results.html logic.
  - **Column Alignment:** Fixed header-to-row alignment with dynamic grid template columns.
  - **Mobile Responsive:** Optimized spacing and layout for iPhone XR, iPhone SE, Samsung, Safari mobile.
  - **Tailwind Alignment:** Removed exclamation point indicator, ensured all styling uses Tailwind utilities.
  - **Column Configuration:** Updated from 6 columns to 4 columns (Assignment, Status, Progress, Type).

### ✅ Previous Fixes (Nov 29, 2025)

- **Scorecard Colors:** Fixed CSS regression where score colors (Gold, Red, Blue, etc.) were not showing.
  - **Cause:** `.score-input` class had `background-color: transparent` overriding Tailwind classes.
  - **Fix:** Removed conflicting style and ensured `tokens.css` is loaded.
- **Localhost "No Event Code" Modal:** Fixed modal appearing on fresh loads in local dev.
- **Live Updates Errors:** Clarified that 401 errors on localhost are expected and handled gracefully.
- **Tailwind System:** Completed integration by adding `tokens.css` (CSS variables) and removing legacy `score-colors.css`.

### ⚠️ Known Issues / Recent Fixes

- **Resume Ranking Round from Open Assignments (index.html):**
  - **Status:** 🔧 **In Progress - Debugging resume flow bugs**
  - **Current Issues:**
    1. **"Open Assignments" showing incorrect data:**
       - **Bug:** Shows rounds for all archers instead of only pending rounds for the selected archer's UUID
       - **Expected:** Only show rounds where `round_archers.archer_id` matches the selected archer
       - **Root Cause:** History API query may not be filtering correctly, or frontend not filtering by archer
    2. **Resume not selecting correct archers:**
       - **Bug:** Clicking resume on different rounds shows the same set of archers
       - **Expected:** Each round should load its own unique set of archers from that round's score card group
       - **Root Cause:** Possible state pollution or wrong roundId being used when fetching archers
    3. **Standalone rounds defaulting to Bale 1:**
       - **Design Flaw:** When creating standalone rounds, archers often leave bale as Bale 1, making restoration difficult
       - **Impact:** Multiple standalone rounds all on Bale 1 makes it impossible to distinguish which archers belong to which round
       - **Potential Fix:** Require bale selection or auto-assign unique bale numbers for standalone rounds
    4. **Standalone rounds with null event_id:**
       - **Design Flaw:** Standalone rounds have `event_id = NULL`, which can cause dirty data and filtering issues
       - **Expected:** Standalone rounds should have a special event code value (e.g., "Standalone") instead of null
       - **Impact:** Makes it difficult to filter and display standalone rounds correctly
  - **Recent Fixes:**
    - ✅ Added comprehensive logging throughout resume flow
    - ✅ Fixed state clearing to prevent pollution between rounds
    - ✅ Implemented snapshot merge logic to include all archers (not just bale-specific)
    - ✅ Added roundId verification to ensure correct round is loaded
    - ✅ Created cleanup scripts for orphaned `round_archers` entries
  - **Next Steps:**
    - Fix history API filtering to only return rounds for selected archer
    - Verify roundId is correctly used throughout resume flow
    - Address standalone round bale assignment design
    - Update standalone rounds to use "Standalone" event code

---

## 📝 What Changed Since Last Session

> **💡 Pro Tip:** See [SESSION_WRAP_UP_BEST_PRACTICES.md](docs/SESSION_WRAP_UP_BEST_PRACTICES.md) for quick wrap-up process (5 minutes)

**Last Updated:** December 15, 2025

### Recent Changes
- ✅ **Session Date:** December 15, 2025 (Afternoon - Final)
- ✅ **What We Did:** Archer Edit Modal Scroll/Touch Fixes - Complete Resolution (v1.9.6):
  - **Scroll/Touch Fixes:** Fixed critical issues where background was scrolling when modal was open
    - Implemented body scroll lock when modal opens (position: fixed, preserves scroll position)
    - Added touch event prevention on modal overlay background only
    - Added scroll containment CSS classes (overscroll-contain)
    - Added wheel event prevention on overlay background
    - Modal form content now scrolls independently while background is locked
  - **Form Scrolling Fix:** Resolved issue where Extended Profile and other long sections couldn't scroll
    - Added touch-action: pan-y CSS for explicit vertical scrolling
    - Improved touch event detection to work with deeply nested form content
    - Added will-change: scroll-position for better scroll performance
    - Ensured all nested elements allow touch events (touch-action: auto)
    - Form now properly scrolls when content exceeds viewport height
  - **Modal Evaluation:** Comprehensive evaluation of modal paradigm for complex form
    - Created ARCHER_EDIT_MODAL_EVALUATION.md analysis document
    - Confirmed modal is appropriate for this use case (mobile-first, context preservation)
    - Documented technical implementation details
  - **User Experience:** Improved modal behavior on mobile devices
    - Background no longer scrolls when interacting with modal
    - Touch events properly contained within modal
    - Smooth scrolling within form content, including long sections like Extended Profile
    - All nested form elements (details, divs, inputs) properly scrollable
- ✅ **Files Changed:**
  - `archer_list.html` - Fixed scroll/touch handling, added body lock, improved form scrolling
  - `docs/analysis/ARCHER_EDIT_MODAL_EVALUATION.md` - New evaluation document
  - `01-SESSION_QUICK_START.md` - Updated session status
- ✅ **Status:** Completed - Tested and working
- ✅ **Next Steps:** Deploy to production

### Previous Session
- ✅ **Session Date:** December 15, 2025 (Morning)
- ✅ **What We Did:** Archer List Header Cleanup & Identity Selection Flow Improvements:
  - **Header Cleanup:** Removed redundant self-summary container and select-yourself banner from archer_list.html
    - Simplified header structure for better mobile experience
    - Reduced header height from ~200-250px to ~120-150px
  - **Favorites Filter:** Added favorites filter button that includes "Me" record
    - Quick access to favorite archers and self
    - Toggle button with active state styling
  - **"Me" Record Highlighting:** Added visual highlighting for "Me" record
    - Blue background (bg-blue-50 in light, bg-blue-900/20 in dark)
    - Left border accent (border-l-4 border-l-primary)
    - Stands out clearly from other archers
  - **Identity Selection Fixes:** Fixed persistence between index.html and archer_list.html
    - Updated index.html to use ArcherModule.setSelfExtId() instead of non-existent method
    - Improved ArcherModule.getSelfArcher() to check both extId and id (UUID)
    - Improved lookup logic in renderIdentitySection() to check ArcherModule first
    - Ensured archer list loads before rendering identity section
  - **Code Cleanup:** Removed unused functions and handlers
    - Removed refreshSelfSummary() function
    - Removed banner dismiss and select-yourself button handlers
    - Removed edit-my-profile and clear-self button handlers
- ✅ **What We Did:** Tailwind Styling Fixes & Footer Standardization:
  - **Tailwind Class Fixes:** Fixed invalid Tailwind classes in index.html
    - Changed `border-3` → `border-[3px]` (2 instances in avatar HTML)
    - Fixed typo `safe-bottom` → `safe-area-bottom` in footer
  - **Onboarding Modal Removal:** Removed onboarding modal and related CSS from index.html (no longer needed)
  - **Footer Standardization:** Standardized footer styling across all 14 HTML pages
    - Fixed `safe-bottom` typo → `safe-area-bottom` everywhere
    - Updated footer height from 36px to 48px for better mobile touch targets
    - Improved footer button styling (min-w-[48px], rounded-lg, active states)
    - Updated home button icon size from text-xl to text-2xl
  - **API Enhancement:** Added efficient bracket assignments endpoint (`GET /v1/archers/:id/bracket-assignments`)
    - Single query to get all bracket assignments for an archer
    - Reduces 404 noise from checking brackets individually
  - **CSS Rebuild:** Rebuilt tailwind-compiled.css with all fixes
  - **Documentation:** Updated docs and added workflow documentation
- ✅ **Files Changed:** 
  - `index.html` - Removed onboarding modal, fixed Tailwind classes
  - All 14 HTML files - Footer standardization (`safe-bottom` → `safe-area-bottom`)
  - `api/index.php` - New bracket assignments endpoint
  - `api/data_admin.php`, `api/check_and_migrate.php` - Minor updates
  - `css/tailwind-compiled.css` - Rebuilt with fixes
  - `tests/components/style-guide.html` - Updated footer patterns
  - Documentation files updated
- ✅ **Status:** Completed - Committed in logical groups
- ✅ **Commits:** 6 commits organized by feature area
- ✅ **Next Steps:** Ready for deployment or next feature development

### Previous Session
- ✅ **Session Date:** December 11, 2025
- ✅ **What We Did:** Extended Archer Profile for USA Archery Reporting + UX Fixes (v1.9.3)
- ✅ **Status:** Completed - Deployed to production

### Previous Session
- ✅ **Session Date:** January 21, 2025
- ✅ **What We Did:** Ranking Round Event/Division Refactor and Resume Flow Debugging:
  - **Event Modal Refactor:** Simplified event selection modal - removed "Enter Code" tab, added "New Round (Standalone)" option
  - **Standalone Round Support:** Added `entry_code` column to `rounds` table, implemented round entry code generation and authentication
  - **Resume Dialog Enhancement:** Added server-side verification, improved UI with "Resume" and "New Round" buttons
  - **Snapshot Merge Logic:** Fixed resume flow to include all archers from round snapshot, not just bale-specific ones
  - **Comprehensive Logging:** Added detailed console logging throughout resume flow for debugging
  - **Automated Tests:** Created Playwright tests for resume flow issues (`tests/resume_round_standalone_flow.spec.js`)
  - **Cleanup Scripts:** Created SQL and PHP scripts to clean up orphaned `round_archers` entries
  - **Debug Documentation:** Added debug guides for troubleshooting resume flow issues
- ✅ **Files Changed:** 
  - `ranking_round_300.html` - Simplified event modal, added resume dialog
  - `js/ranking_round_300.js` - Event/division selection, standalone round support, resume flow fixes
  - `index.html` - Resume link handling, logging improvements
  - `api/index.php` - Round entry code generation, standalone round support
  - `api/db.php` - Round entry code authentication
  - `api/sql/migration_add_round_entry_codes.sql` - Database migration
  - `tests/resume_round_standalone_flow.spec.js` - Automated tests (new)
  - `api/cleanup_orphaned_round_archers.php` - Cleanup script (new)
  - `docs/debug/RESUME_ROUND_DEBUG_GUIDE.md` - Debug guide (new)
  - `docs/debug/RESUME_ROUND_TESTING_AND_CLEANUP.md` - Testing guide (new)
- ✅ **Status:** In Progress - Debugging resume flow bugs
- ✅ **Bugs Identified:**
  - "Open Assignments" showing incorrect data (should only show pending rounds for archer's UUID)
  - Resume not selecting correct archers from unique score card group
- ✅ **Design Flaws Identified:**
  - Standalone rounds defaulting to Bale 1, making restoration difficult
  - Standalone rounds should have EventCode value "Standalone" instead of null
- ✅ **Next Steps:** 
  - Fix "Open Assignments" filtering to only show rounds for selected archer
  - Fix resume flow to correctly load archers for each unique round
  - Address standalone round bale assignment design flaw
  - Update standalone rounds to use "Standalone" event code instead of null
- ✅ **Blockers:** None

### Quick Wrap-Up Template (Copy-Paste)
```markdown
**Last Updated:** [Date]

### Recent Changes
- ✅ **Session Date:** [Date]
- ✅ **What We Did:** [Summary]
- ✅ **Files Changed:** [Key files]
- ✅ **Status:** [Completed / In Progress / Blocked]
- ✅ **Next Steps:** [If applicable]
- ✅ **Blockers:** [If applicable]
```

### Current Session Context
**If this is a continuation session, note:**
- What was left incomplete?
- What needs testing?
- What's the next step?

**If this is a new focus, note:**
- What are we switching to?
- Why the change in focus?

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

### ✅ What's Live & Working

- **Ranking Round 360/300** - Full database integration, live sync
- **Coach Console** - Event management, verification
- **Live Results** - Real-time leaderboard
- **Archer Roster** - Master archer list (public access)
- **Authentication** - Public/Event/Coach tiers working
- **Verification & Locking** - Complete workflow implemented
- **Solo Olympic Matches** - ✅ Full database integration with match code authentication (Nov 2025)

### ✅ What's Recently Completed (Phase 2) - COMPLETED ✅

- **Bracket Management System** - ✅ Full implementation complete (Nov 2025)
  - Database schema (brackets, bracket_entries tables)
  - Complete API endpoints for bracket CRUD operations
  - Coach Console UI for bracket management
  - Bracket results module with tab navigation
  - Integration with Solo/Team match creation
- **Team Olympic Matches** - ✅ Full database integration with match code authentication (Nov 2025)
- **Solo Olympic Matches** - ✅ Full database integration with bracket support (Nov 2025)
- **UX Enhancements** - ✅ Sorted archer lists, sync status indicators, match restoration
- **Tailwind CSS Migration** - ✅ Complete migration to 100% Tailwind CSS (Nov 2025)
  - Standardized keypad (4x3 layout) across all modules
  - Removed all legacy CSS dependencies
  - Complete dark mode support
  - Fixed score colors in tables
  - Updated setup screens with consistent styling

### 📅 What's Planned

**See:** [docs/planning/ITEMS_LEFT_TO_COMPLETE.md](docs/planning/ITEMS_LEFT_TO_COMPLETE.md)

- Phase 2.5: Event Tracking Dashboard
- Phase 3: Coach-Athlete collaboration
- Phase 4-6: Brackets, team season, mobile apps

**Full vision:** [docs/planning/FUTURE_VISION_AND_ROADMAP.md](docs/planning/FUTURE_VISION_AND_ROADMAP.md)

---

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

## 🎯 Current Priorities (Phase 2)

### ✅ Sprint 2: Backend Foundation (COMPLETE)

**Goal:** Create database & API for Solo/Team matches

**Completed:**

1. ✅ Created `solo_matches` table schema
2. ✅ Created `team_matches` table schema
3. ✅ Added verification fields (locked, card_status, etc)
4. ✅ Created Solo match API endpoints
5. ✅ Created Team match API endpoints
6. ✅ Added match code authentication for standalone matches
7. ✅ Tested all endpoints

**Documentation:**

- [PHASE2_SPRINT2_COMPLETE.md](docs/PHASE2_SPRINT2_COMPLETE.md)
- [PHASE2_API_ENDPOINTS.md](docs/PHASE2_API_ENDPOINTS.md)

### ✅ Sprint 3: Solo Match Frontend Integration (COMPLETE)

**Goal:** Integrate Solo matches with database

**Completed:**

1. ✅ Updated `solo_card.js` to use database API
2. ✅ Implemented match code generation and storage
3. ✅ Added offline queue support
4. ✅ Fixed match reuse issue (forceNew parameter)
5. ✅ Deployed to production (Nov 2025)

**Documentation:**

- [PHASE2_AUTH_IMPLEMENTATION.md](docs/PHASE2_AUTH_IMPLEMENTATION.md)

### ✅ Sprint 4: Team Match Frontend Integration (COMPLETE)

**Goal:** Integrate Team matches with database

**Completed:**

1. ✅ Added team match methods to `live_updates.js`
2. ✅ Updated `team_card.js` to use database API
3. ✅ Implemented match code generation (when 6th archer added)
4. ✅ Added offline queue support
5. ✅ Implemented restoreTeamMatch function
6. ✅ Added sync status UI indicators
7. ✅ Deployed to production (Nov 2025)

**Documentation:** [PHASE2_TEAM_MIGRATION_PLAN.md](docs/PHASE2_TEAM_MIGRATION_PLAN.md)

### ✅ Recent Enhancements (Feature Branch)

**Goal:** UX improvements and bug fixes

**Completed:**

1. ✅ Sort archer selection lists (selected first, then alphabetical)
2. ✅ Sync status UI indicators (✓ synced, ⟳ pending, ✗ failed)
3. ✅ Fixed verification field in scorecard API endpoint
4. ✅ Team match restoration from database

**Status:** Ready for testing and merge

---

### ✅ Sprint 3: Solo Module Integration (COMPLETE)

**Goal:** Refactor Solo module to use database

**Status:** ✅ Complete - See Sprint 3 section above

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

### Phase 2 ✅ COMPLETE

**Sprint 1:** Documentation ✅ COMPLETE (Nov 17, 2025)

- Created architecture docs
- Captured critical workflow

**Sprint 2-4:** Solo/Team Integration ✅ COMPLETE (Nov 20, 2025)

- Database schema implementation
- API endpoints for Solo/Team matches
- Frontend integration with event/bracket selection
- Bracket management system
- Tournament integration for archers
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

**Last Updated:** December 15, 2025  
**Version:** 1.3  
**Maintainer:** Development Team

**Recent Updates:**

- ✅ Archer list header cleanup (Dec 15, 2025) - Removed redundant self-selection UI, added favorites filter, highlighted "Me" record
- ✅ Identity selection flow improvements (Dec 15, 2025) - Fixed persistence between pages, improved ArcherModule lookup
- ✅ Footer mobile-friendly update (Dec 15, 2025) - 48px height, 48×48px home button
- ✅ Extended Archer Profile for USA Archery (Dec 11, 2025)
- ✅ Footer standardization complete (Dec 2, 2025)
- ✅ Tailwind CSS migration complete (Nov 17, 2025)

**Keep this file updated as phases progress!**
