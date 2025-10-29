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

## Critical UX Pain Points (Must Fix in v3.0)

### 🔴 Priority 1: Session Persistence & Recovery

**Problem:** Archers reload the page or lose their status and become disconnected from their bale group and scorecards.

**User Impact:**
- Archer opens app, selects event via QR code ✅
- Goes to "Select Archers" for manual bale assignment ✅
- As they open/close the app, their link to scorecards becomes broken ❌
- Must re-select archers, losing any progress ❌
- Frustration leads to paper scorecards ❌

**Root Causes (v2.0):**
- Session state stored in memory and localStorage only
- No persistent server-side "session" linking archer → bale → scorecards
- Round/archer IDs not properly restored after reload
- No visual confirmation of "connected" status

**Proposed Solutions for v3.0:**

#### Solution 1A: Persistent Bale Session
```
When archer selects their bale group:
1. Server creates a "BaleSession" record
   - Links: Archer (scorer) → Event → Bale Number → Scorecard IDs
   - Stores: Device ID, last active timestamp
   
2. Client stores in localStorage:
   - Session ID (UUID)
   - Bale number
   - Scorecard IDs
   
3. On app open/reload:
   - Client checks for session ID in localStorage
   - Calls GET /sessions/{sessionId} to restore
   - Server returns: event, bale, scorecards, current end
   - UI shows "Reconnected to Bale 3, End 5" confirmation
```

#### Solution 1B: Visual Connection Status
```
Persistent connection indicator at top of screen:
┌─────────────────────────────────────┐
│ 🟢 Bale 3 | End 5 | Synced 12:34 PM │
└─────────────────────────────────────┘

States:
🟢 Green: Connected and synced
🟡 Yellow: Connected but pending sync (offline queue)
🔴 Red: Disconnected (click to reconnect)
⚪ Gray: Not in a session
```

#### Solution 1C: Automatic Recovery
```
On page load:
1. Check for localStorage session
2. If found, show loading screen: "Restoring session..."
3. Call API to validate session is still active
4. If valid: Load scorecards, skip setup, go to scoring view
5. If invalid: Show clear message: "Session expired. Please select your bale again."
6. Provide "Resume" button vs. "Start New" button
```

**Success Criteria:**
- ✅ 95% of page reloads successfully restore session
- ✅ Clear visual feedback on connection status
- ✅ Zero data loss when reloading
- ✅ < 2 seconds to restore session

---

### 🔴 Priority 2: Bale Selection UX

**Problem:** The bale selection UI (small number input) is not user-friendly. Hard to identify which bale you're on.

**Current Implementation:**
```
Setup view has:
Bale Number: [3] ← Small input field, easy to miss
```

**User Impact:**
- Archers enter wrong bale number by accident
- Scores go to wrong bale group
- Hard to see which bale you're on once scoring starts
- No visual confirmation of bale selection

**Proposed Solutions for v3.0:**

#### Solution 2A: Large Bale Selector (Mobile-First)
```
After QR code scan, show full-screen bale selector:

┌────────────────────────────────────┐
│     Which bale are you on?         │
├────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐     │
│  │  1   │  │  2   │  │  3   │     │
│  └──────┘  └──────┘  └──────┘     │
│  ┌──────┐  ┌──────┐  ┌──────┐     │
│  │  4   │  │  5   │  │  6   │     │
│  └──────┘  └──────┘  └──────┘     │
│  ┌──────┐  ┌──────┐               │
│  │  7   │  │  8   │               │
│  └──────┘  └──────┘               │
└────────────────────────────────────┘

Each button:
- 100px × 100px (large touch target)
- Shows bale number in 48pt font
- Highlights on tap
- Shows number of archers on that bale (if known)
```

#### Solution 2B: Persistent Bale Indicator
```
Always visible at top of every screen:

┌─────────────────────────────────────┐
│  🎯 BALE 3  |  End 5 of 10          │
└─────────────────────────────────────┘

Styling:
- Large, bold text (24pt)
- High contrast colors
- Sticky header (always visible)
- Tap to see bale details
```

#### Solution 2C: Confirmation Screen
```
After bale selection, show confirmation:

┌────────────────────────────────────┐
│   You selected: BALE 3             │
│                                    │
│   Archers on this bale:            │
│   • Leo H. (Target A)              │
│   • Ryder S. (Target B)            │
│   • Eric S. (Target C)             │
│   • Amelia B. (Target D)           │
│                                    │
│   [✓ Correct]    [← Change Bale]   │
└────────────────────────────────────┘
```

**Success Criteria:**
- ✅ Zero wrong bale selections
- ✅ Bale number always visible during scoring
- ✅ < 3 seconds to select bale

---

### 🔴 Priority 3: Bale Group Setup Process

**Problem:** Process to identify who you're shooting with is clunky. Manual archer selection is tedious.

**Current Implementation:**
- Search box with text input
- Small checkboxes for selection
- No visual grouping
- Hard to see who's already selected

**Proposed Solutions for v3.0:**

#### Solution 3A: Smart Archer Assignment
```
Two modes:

MODE 1: Pre-Assigned (Coach sets up)
- Archer scans QR code
- App shows: "You are on Bale 3, Target A"
- Shows other archers on your bale automatically
- No selection needed
- One tap to "Start Scoring"

MODE 2: Self-Select (Manual)
- Large bale selector (per Solution 2A)
- After bale selected, show: "Who's on Bale 3 with you?"
- Large archer cards (not small list):
  
  ┌─────────────────────┐
  │ Leo Hernandez       │
  │ T School | JV | M   │  ← Tap to add
  └─────────────────────┘
  
  ┌─────────────────────┐
  │ ✓ Ryder Singer      │  ← Already selected
  │ T School | JV | M   │
  └─────────────────────┘

- Auto-assign targets (A, B, C, D) as archers are added
- Show live preview of bale group
```

#### Solution 3B: Recent Archers Quick Add
```
Show "Frequently shoot with:" section:

┌────────────────────────────────────┐
│  Quick Add (from recent events):   │
│  [+ Leo H.]  [+ Ryder S.]          │
│  [+ Eric S.] [+ Amelia B.]         │
└────────────────────────────────────┘

- One tap to add archer to bale
- Pre-filled with archers from same division
- Learns from past events
```

#### Solution 3C: Bale Group Overview
```
After archers selected, show:

┌────────────────────────────────────┐
│       BALE 3 - Ready to Score      │
├────────────────────────────────────┤
│  Target A: Leo Hernandez           │
│  Target B: Ryder Singer            │
│  Target C: Eric Salas              │
│  Target D: Amelia Beall            │
├────────────────────────────────────┤
│  [✓ Start Scoring]                 │
│  [+ Add Archer]  [← Change Bale]   │
└────────────────────────────────────┘
```

**Success Criteria:**
- ✅ < 30 seconds to set up 4-archer bale group
- ✅ Clear visual confirmation of bale group
- ✅ Easy to add/remove archers

---

### 🔴 Priority 4: End Tracking Clarity

**Problem:** Confusing to know which end you're on.

**Current Implementation:**
- Small text: "End 2 of 10" in header
- Easy to lose track during round
- No visual progress indicator

**Proposed Solutions for v3.0:**

#### Solution 4A: Prominent End Indicator
```
Large, always-visible end indicator:

┌─────────────────────────────────────┐
│  🎯 BALE 3  |  📍 END 5 of 10       │
│  ▓▓▓▓▓░░░░░                         │ ← Progress bar
└─────────────────────────────────────┘

Styling:
- Large font (24pt)
- Progress bar shows completion
- Different color per end (cycle colors)
```

#### Solution 4B: End Navigation Preview
```
Show previous/current/next ends:

┌────────────────────────────────────┐
│  [End 4]    END 5    [End 6]       │
│   ✓Done   ⬤ NOW     ○ Next        │
└────────────────────────────────────┘

Visual cues:
✓ = Completed and synced
⬤ = Current end
○ = Not started
```

#### Solution 4C: End Completion Confirmation
```
After last archer scores, show:

┌────────────────────────────────────┐
│   End 5 Complete! 🎯               │
│                                    │
│   Bale 3 Scores:                   │
│   • Leo H.: 27 (X, 7, X)           │
│   • Ryder S.: 21 (7, X, 4)         │
│   • Eric S.: 16 (8, 4, 4)          │
│   • Amelia B.: 20 (8, 4, 8)        │
│                                    │
│   [Sync End ⬆️]  [Next End →]      │
└────────────────────────────────────┘
```

**Success Criteria:**
- ✅ Always know which end you're on
- ✅ Clear visual progress through round
- ✅ Confirmation when end is complete

---

### 🔴 Priority 5: Sync Status Clarity

**Problem:** Confusing to know if scores are synced. "NOT SYNCED" warning is alarming but unclear.

**Current Implementation:**
- Red "NOT SYNCED" badge in header
- Small sync icons (⟳) next to each archer
- No explanation of what's not synced or why

**Proposed Solutions for v3.0:**

#### Solution 5A: Clear Sync Indicators
```
Per-end sync status (not just per-archer):

┌────────────────────────────────────┐
│  END 5  |  ✅ Synced at 12:34 PM   │
└────────────────────────────────────┘

Or:

┌────────────────────────────────────┐
│  END 5  |  ⏳ Syncing... (2 of 4)  │
└────────────────────────────────────┘

Or:

┌────────────────────────────────────┐
│  END 5  |  📤 Not synced (Tap to sync) │
└────────────────────────────────────┘
```

#### Solution 5B: Automatic Sync with Visual Feedback
```
Auto-sync when end is complete:

1. All archers have scores entered
2. Show: "Syncing end 5..." with spinner
3. API call to sync all 4 scorecards
4. Show: "✅ End 5 synced!" for 2 seconds
5. Auto-advance to next end

No manual "Sync End" button needed!
```

#### Solution 5C: Offline Queue Indicator
```
When offline, show:

┌────────────────────────────────────┐
│  📡 Offline Mode                   │
│  3 ends queued to sync             │
│  Will sync when connected          │
└────────────────────────────────────┘

When online, auto-sync and show:

┌────────────────────────────────────┐
│  ✅ Synced 3 ends successfully!    │
└────────────────────────────────────┘
```

#### Solution 5D: Sync History
```
Tap sync indicator to see:

┌────────────────────────────────────┐
│  Sync History                      │
├────────────────────────────────────┤
│  ✅ End 5: Synced at 12:34 PM      │
│  ✅ End 4: Synced at 12:28 PM      │
│  ✅ End 3: Synced at 12:22 PM      │
│  ✅ End 2: Synced at 12:16 PM      │
│  ✅ End 1: Synced at 12:10 PM      │
└────────────────────────────────────┘
```

**Success Criteria:**
- ✅ Clear understanding of sync status
- ✅ Automatic sync when possible
- ✅ No confusion about "NOT SYNCED" state
- ✅ Offline mode clearly indicated

---

### 🔴 Priority 6: Results Page Enhancements

**Problem:** Results/leaderboard in coach app lacks bale number, has no scorecard view, and no "last end completed" field to monitor status.

**Current Implementation:**
- Shows: Archer name, school, score, 10s, Xs
- Missing: Bale number, current status, scorecard link

**Proposed Solutions for v3.0:**

#### Solution 6A: Enhanced Leaderboard Columns
```
Results Page - New Columns:

| Rank | Archer | School | Bale | Status | Score | 10s | Xs | Avg | View |
|------|--------|--------|------|--------|-------|-----|----|----- |------|
| 1    | Leo H. | T      | 3    | End 10 | 229   | 8   | 8  | 7.6  | 👁️  |
| 2    | Test A | WDV    | 1    | End 8  | 215   | 6   | 5  | 7.2  | 👁️  |
| 3    | Ryder  | T      | 3    | End 5  | 142   | 3   | 2  | 7.1  | 👁️  |

New columns:
- Bale: Which bale they're on
- Status: "End X of 10", "Complete", "Not Started"
- View: Link to full scorecard (👁️)
```

#### Solution 6B: Live Status Indicators
```
Status column shows:

🟢 End 10 of 10 (Complete)
🟡 End 5 of 10 (In Progress)
⚪ Not Started
🔴 End 3 of 10 (Stalled - no update in 15 min)

Color codes help coach identify:
- Who's finished
- Who's actively scoring
- Who needs help
```

#### Solution 6C: Bale View Grouping
```
Add "Group by Bale" toggle:

┌────────────────────────────────────┐
│  BALE 1 (4 archers, End 8-10)      │
├────────────────────────────────────┤
│  Test Archer A: 215 (End 10) 👁️   │
│  Test Archer B: 198 (End 9) 👁️    │
│  Test Archer C: 187 (End 8) 👁️    │
│  Test Archer D: 201 (End 10) 👁️   │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│  BALE 3 (4 archers, End 5-6)       │
├────────────────────────────────────┤
│  Leo H.: 142 (End 5) 👁️            │
│  Ryder S.: 121 (End 6) 👁️          │
│  Eric S.: 98 (End 5) 👁️            │
│  Amelia B.: 110 (End 5) 👁️         │
└────────────────────────────────────┘

Helps coach see:
- Which bales are moving quickly
- Which bales need assistance
- Overall event pace
```

#### Solution 6D: Quick Scorecard Preview
```
Click 👁️ icon to open modal with full scorecard:

┌────────────────────────────────────┐
│  Leo Hernandez - Bale 3, Target A  │
│  [Close ✕]                         │
├────────────────────────────────────┤
│  End | A1 | A2 | A3 | Total | Run  │
│   1  | X  | 7  | X  |  27   | 27   │
│   2  | X  | X  | X  |  30   | 57   │
│   3  | X  | X  | X  |  30   | 87   │
│   4  | 7  | 7  | 6  |  20   | 107  │
│   5  | 8  | 8  | 8  |  24   | 131  │
│  ...                               │
│                                    │
│  Totals: 229 | 8 Xs | 8 10s        │
│  [Print] [Export] [Verify]         │
└────────────────────────────────────┘

No need to open separate page!
```

#### Solution 6E: Last Update Timestamp
```
Show when each archer last synced:

| Archer | Score | Status | Last Update |
|--------|-------|--------|-------------|
| Leo H. | 229   | End 10 | 12:45 PM    |
| Ryder  | 142   | End 5  | 12:38 PM    |
| Eric   | 98    | End 5  | 9 min ago ⚠️ |

Warnings:
⚠️ Yellow: > 10 min since last sync
🔴 Red: > 20 min since last sync
```

**Success Criteria:**
- ✅ Coach can see bale assignments at a glance
- ✅ Coach can see which archers/bales are progressing
- ✅ Coach can quickly view any scorecard
- ✅ Coach can identify archers who need help

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

