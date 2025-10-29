# OAS Ranking Online 3.0 - Requirements Document

**Branch:** `OAS-Ranking-Online-3.0`  
**Date Created:** October 28, 2025  
**Base Version:** v2.0-ranking-round  
**Status:** Planning / Requirements Gathering

---

## Executive Summary

OAS Ranking Online 3.0 represents a fundamental shift to an **online-first, database-driven architecture** while maintaining the speed and simplicity that made v2.0 successful. The goal is to create a unified system where archers and coaches have seamless access to scorecards, historical data, and real-time results.

---

## User Stories & Requirements

### 👨‍🏫 As a Coach

#### Master Roster Management
- **Create a "Master Roster" of Archers**
  - Add archers with: First Name, Last Name, School, Level (VAR/JV), Gender, External ID
  - Import archers from CSV
  - Edit archer details
  - Deactivate/archive archers (soft delete)
  - View archer history and performance trends

#### Event Management
- **Create "Events"** (e.g., "Tryout One", "League Match 1")
  - Set event name, date, location
  - Set event type: Practice, Tryout, Competition
  - Generate entry code for archer access
  - Set event status: Planned → Active → Completed

#### Event Round Management
- **Create "Event Rounds"** (e.g., "Boys JV Ranking", "Girls Varsity 300")
  - Define round type: R300, R360, etc.
  - Auto-assign archers by division (BVAR, GVAR, BJV, GJV)
  - Assign bale numbers and target letters (A, B, C, D)
  - Configure round settings (number of ends, arrows per end)

#### Event Roster Management
- **Create "Event Roster" from "Master Roster"**
  - Select archers from master roster
  - Bulk add by division/level
  - Assign to specific rounds
  - Override archer details for specific event (e.g., competing up a level)

#### Live Results & Leaderboard
- **View summary leaderboard style "Results" in real-time or historical**
  - Live updating leaderboard during active events
  - Filter by division, gender, level
  - Sort by score, average, Xs, 10s
  - Export results to PDF/CSV
  - Historical results comparison

#### Scorecard Review
- **View ALL Archer Score Cards (live or historical)**
  - Individual archer scorecard view
  - End-by-end breakdown
  - Running totals, averages, performance metrics
  - Filter by event, date, division
  - Search by archer name

#### In-Person Verification
- **"Verify" Digital Archer Score Cards with Archers (live and in person)**
  - Display scorecard for archer to review
  - Digital signature or confirmation
  - Mark as "Verified" with timestamp
  - Flag discrepancies for review
  - Print verified scorecard

---

### 🏹 As an Archer

#### Online-First Experience
- **Access from any device (phone, tablet, computer)**
  - Responsive design that works on all screen sizes
  - Fast loading even on slow connections
  - Works offline with sync when connection restored
  - No app installation required (PWA)

#### Active Scorecard Management
- **Produce an "Archer Score Card" for each Archer Round**
  - Automatically generated when assigned to a round
  - Pre-populated with archer details and assignment (bale, target)
  - Clean, printable format
  - QR code for quick access

#### Progressive Scorecard Display
- **Reproduce the "Archer Score Card" as it progresses**
  - Live updates as scores are entered
  - Visual feedback on performance (color-coded scores)
  - Running totals update automatically
  - End-by-end averages
  - Comparison to personal best / division average

#### Bale Group Management
- **Ability to Manage a "Bale Group" of Archer Score Cards**
  - Enter scores for all archers on my bale (A, B, C, D)
  - Navigate between bale mates easily
  - See bale group summary
  - Support for different target assignments
  - Handle archers joining/leaving mid-round

#### Historical Scorecards
- **View ALL MY Archer Score Cards (live or historical)**
  - Personal scorecard history
  - Performance trends over time
  - Filter by event, date, round type
  - Compare scorecards side-by-side
  - Export personal history

---

## Current System Analysis (v2.0)

### ✅ PROS

#### Round Entry Approach
- **Easy to understand**
  - Familiar spreadsheet-like layout
  - Clear visual hierarchy (archer rows, arrow columns)
  - Intuitive navigation (Last End / Next End)
  - Color-coded scores (Gold=X/10, Red=7-9, Blue=5-6, Black=1-4, White=M)

#### Local Storage Performance
- **Fast and responsive**
  - Instant score entry (no network delay)
  - Works completely offline
  - State persistence across page reloads
  - No loading spinners for most operations

#### Keypad Interface (Screenshot 2)
- **Mobile-optimized input**
  - Large, touch-friendly buttons
  - Score-specific colors match target face
  - Navigation arrows (← →) for moving between inputs
  - Clear (CLR) and Close functions
  - Common scores (X, 10, 9, 8, 7, 6) prioritized in layout
  - No need for keyboard on mobile devices

#### Current Data Model
- **Simple and flexible**
  - JSON-based state in localStorage
  - Easy to debug in browser console
  - Self-contained sessions (per date)
  - Event-scoped caching

---

### ❌ CONS

#### Limited Historical Access
- **No persistent scorecard history**
  - Scorecards lost if localStorage cleared
  - No access from different devices
  - Can't view past events easily
  - No performance trend analysis

#### Coach Visibility Gaps
- **Limited real-time oversight**
  - Can't see which archers are actively scoring
  - Hard to identify archers who need assistance
  - No way to verify scores until after the fact
  - Results page requires manual refresh

#### Data Integrity Issues
- **No single source of truth**
  - Each phone has independent state
  - Sync conflicts possible with multiple scorers
  - Manual sync required (Sync End button)
  - Duplicate archers if not careful

#### Archer Identity Management
- **Weak archer linkage**
  - Archers identified by name strings (e.g., "Leo H.")
  - No unique archer ID visible to user
  - Hard to disambiguate archers with same name
  - Manual entry prone to typos

#### Limited Roster Management
- **No master archer database UI**
  - Archers must be re-entered for each event
  - No central place to manage archer info
  - Import process is manual (CSV to database directly)
  - Can't easily update archer level/school across events

#### Session Isolation
- **Bale-centric model limits flexibility**
  - Each bale is a separate session
  - Hard to move archers between bales mid-event
  - Can't easily combine/split bale groups
  - No event-wide coordination

#### Verification Workflow
- **No formal scorecard verification**
  - Archers can't review their own scorecards easily
  - No digital signature/confirmation
  - Paper scorecards still needed for official records
  - No audit trail for changes

#### Mobile UX Challenges
- **Small screen real estate**
  - Scorecard view cramped on phones (Screenshot 1)
  - Need to scroll horizontally to see all columns
  - Card view (Screenshot 2) only shows 4 archers at once
  - Navigation between archers requires tapping

---

## Proposed Architecture for v3.0

### Database-First Design
- **Master archer table as single source of truth**
  - ✅ Already implemented in v2.0
  - Extend with additional fields (photo, contact info, emergency contact)
  - Soft delete for historical integrity

### API-Driven Workflow
- **All operations via REST API**
  - Create/Read/Update/Delete for archers, events, rounds, scorecards
  - Real-time sync via polling or WebSockets
  - Optimistic UI updates with rollback on error
  - Background sync for offline changes

### Progressive Web App (PWA)
- **Install as app on home screen**
  - Offline capability with Service Workers
  - Push notifications for event updates
  - Background sync when connection restored
  - App-like experience without app store

### Hybrid Storage Strategy
- **Best of both worlds**
  - Critical data persisted to server (source of truth)
  - Local cache for instant UI response
  - Offline queue for pending changes
  - Smart sync on reconnection

---

## Key Design Decisions to Make

### 1. Scorecard Ownership Model
**Question:** Who "owns" the scorecard for entering scores?

**Option A: Archer-owned (current model)**
- Each archer manages their own bale group
- Pro: Distributed scoring, less coach burden
- Con: Requires all archers to have devices

**Option B: Scorer-owned**
- Designated scorer(s) for each bale/range
- Pro: Fewer devices needed, more control
- Con: Bottleneck if scorer is slow/absent

**Option C: Hybrid**
- Default to archer-owned
- Coach can override and assign scorers
- Pro: Flexibility for different event types
- Con: More complex permissions model

**Recommendation:** Option C - Hybrid model with archer-owned as default

---

### 2. Score Entry Interface

**Question:** Should we keep the current keypad UI or explore alternatives?

**Current Keypad Strengths:**
- Mobile-optimized
- Color-coded
- Fast input
- No keyboard required

**Possible Enhancements:**
- Voice input ("X, 9, 7")
- Camera OCR for paper scorecards
- Apple Pencil support for iPad
- Gesture-based input (swipe for common scores)

**Recommendation:** Keep current keypad as primary input, add voice as optional enhancement in future release

---

### 3. Real-Time vs. Polling

**Question:** How should live updates work?

**Option A: Polling**
- Client requests updates every N seconds
- Pro: Simple, works with any server
- Con: Higher latency, unnecessary requests

**Option B: WebSockets**
- Persistent connection for real-time updates
- Pro: Instant updates, efficient
- Con: More complex server setup, firewall issues

**Option C: Server-Sent Events (SSE)**
- One-way server push
- Pro: Simpler than WebSockets, reliable
- Con: Still requires long-lived connections

**Recommendation:** Start with smart polling (5-10 seconds during active scoring), evaluate WebSockets in v3.1

---

### 4. Offline Capabilities

**Question:** What should work offline?

**Must Work Offline:**
- ✅ Score entry
- ✅ View current scorecard
- ✅ Navigate between ends
- View personal history

**Can Require Online:**
- Event creation (coach)
- Roster management (coach)
- Verification workflow
- Live leaderboard

**Sync Strategy:**
- Queue all changes in localStorage
- Sync on reconnection
- Conflict resolution (last write wins? manual merge?)

---

### 5. Mobile-First vs. Responsive

**Question:** Should we optimize for mobile or desktop?

**Current Reality:**
- Archers use phones 90% of the time
- Coaches split between tablets and laptops
- Results often displayed on large screens

**Recommendation:**
- **Mobile-first for archer interfaces** (score entry, personal scorecards)
- **Desktop-optimized for coach interfaces** (roster management, event setup)
- **Large-screen optimized for results/leaderboards** (projector-friendly)

---

## Technical Implementation Plan

### Phase 1: Foundation (v3.0 Alpha)
- [ ] Master Roster UI (coach console)
  - List all archers with search/filter
  - Add/Edit/Deactivate archer
  - Import CSV
  - View archer history (link to existing archer_history.html)

- [ ] Event Management UI (coach console)
  - Create event with metadata
  - Generate entry code
  - Set status (Planned/Active/Completed)
  - List events with filters

- [ ] Event Roster Builder (coach console)
  - Select archers from master roster
  - Bulk add by division
  - Assign to rounds
  - Preview round assignments

### Phase 2: Enhanced Scoring (v3.0 Beta)
- [ ] Archer Scorecard Viewer
  - Personal scorecard history page
  - Filter by event/date
  - Compare scorecards
  - Export PDF

- [ ] Enhanced Results Page
  - Real-time leaderboard (polling-based)
  - Division filters
  - Sort by various metrics
  - Export results

- [ ] Verification Workflow
  - Coach-facing verification UI
  - Archer confirmation interface
  - Digital signature capture
  - Print verified scorecard

### Phase 3: Polish & Performance (v3.0 Release)
- [ ] PWA Features
  - Service worker for offline
  - Install prompts
  - Push notifications

- [ ] Performance Optimizations
  - Smart caching strategies
  - Lazy loading for large rosters
  - Optimize API queries

- [ ] Documentation
  - User guides (coach & archer)
  - Video tutorials
  - Troubleshooting guide

---

## Open Questions for Discussion

1. **Archer Photos:** Should we support archer photos in the roster? (For identification during verification)

2. **Multi-Coach Access:** Should multiple coaches be able to manage the same event? (Permissions model)

3. **Practice Mode:** Should archers be able to create practice rounds without coach setup?

4. **Notifications:** What events should trigger notifications? (Event starting, verification ready, results posted)

5. **Historical Data Migration:** Should we migrate v2.0 localStorage data to the database? Or start fresh?

6. **Scoring Rules Engine:** Should we support configurable scoring rules? (e.g., compound vs. recurve, indoor vs. outdoor)

7. **Team Scoring:** Do we need to support team totals in addition to individual scores?

8. **Export Formats:** What formats should we support for exports? (PDF, CSV, Excel, JSON)

---

## Success Metrics

### User Adoption
- 90% of archers access scorecards digitally (vs. paper)
- 100% of coaches use digital roster management
- 80% of events verified digitally

### Performance
- Score entry < 500ms latency (online)
- Scorecard load < 1 second
- Leaderboard updates within 10 seconds of score entry

### Data Quality
- Zero duplicate archer entries
- < 1% sync conflicts requiring manual resolution
- 100% scorecard data retained (no localStorage loss)

### User Satisfaction
- "Easy to use" rating > 4.5/5
- < 5% support requests during events
- Positive coach feedback on time savings

---

## Next Steps

1. **Review this document** with stakeholders
2. **Prioritize features** for v3.0 Alpha
3. **Create wireframes** for new UI components
4. **Set up database migrations** for new tables
5. **Build API endpoints** for roster management
6. **Prototype coach console** UI

---

## Appendix: Current UI Screenshots

### Screenshot 1: Archer Scorecard (Card View)
**File:** Vida Vargas - Bale 1 Target A - End 10 Complete
**Analysis:**
- Clean, readable layout
- Color-coded scores (Gold, Red, Blue, Black)
- Running totals clearly visible
- Round totals at bottom (8 Xs, 8 10s, 229 total)
- Averages declining over time (9.0 → 7.6) - fatigue visible
- Navigation: Prev/Next, Export, Start Scoring, Setup

**What Works Well:**
- High information density without feeling cramped
- Color coding makes scores easy to parse
- Running total visible at all times

**Pain Points:**
- No indication this is synced/verified
- Can't see other archers on the bale
- No comparison to division average

### Screenshot 2: Score Entry Interface (Bale View)
**File:** R300 - Bale 3 - End 2 (NOT SYNCED)
**Analysis:**
- 4 archers visible (Leo H., Ryder S., Eric S., Amelia B.)
- End 2 partially filled
- Keypad visible at bottom
- Sync status shown (NOT SYNCED)
- Running totals visible (57, 42, 28, 35)

**What Works Well:**
- Keypad is large, touch-friendly
- Color-coded scores match target colors
- Can see all bale archers at once
- Clear "NOT SYNCED" warning

**Pain Points:**
- Only 4 archers fit on screen
- Need to scroll to see all data columns
- Keypad takes up 1/3 of screen
- No indication of which archer's turn it is

---

**Document Version:** 1.0  
**Last Updated:** October 28, 2025  
**Author:** Development Team  
**Status:** Draft - Pending Review

