# Archer Swiss Bracket Workflow - Complete Guide

**Date:** November 20, 2025  
**Purpose:** Document how archers create and participate in Swiss bracket matches  
**Audience:** Archers, Coaches, Developers

---

## 🎯 Overview

This document describes the complete workflow for how an archer creates a match for a **Swiss bracket** tournament, starting from the home page with their Archer ID already established.

### What is a Swiss Bracket?

- **Format:** Open tournament where archers can challenge different opponents
- **Scoring:** 1 point per match win, 0 for a loss
- **Opponent Selection:** Manual (archers choose who to face)
- **Win/Loss Tracking:** System shows win/loss ratio to help avoid duplicates
- **Match Codes:** Uses existing system (`SOLO-RHTA-1101`, `TEAM-RHTA-1101`)

---

## 📱 Complete Archer Workflow

### Prerequisites
- ✅ Archer has established their Archer ID (via `archer_list.html`)
- ✅ Coach has created an event with Swiss brackets
- ✅ Archer has been added to the Swiss bracket by coach

---

## Step 1: Navigate from Home Page

### 1.1 Starting Point: Home Page (`index.html`)

**URL:** `https://tryentist.com/wdv/` or `http://localhost:8001/`

**What the archer sees:**
```
┌─────────────────────────────────────┐
│ 🏹 Archery Tools                   │
│                                     │
│ 👤 Archer Details                  │
│ [Shows: "Sarah Johnson" with photo] │
│                                     │
│ ┌─────────┬─────────┐              │
│ │🏆 Ranking│👥 Solo  │              │
│ │         │         │              │
│ └─────────┴─────────┘              │
│ ┌─────────┬─────────┐              │
│ │👥👥 Team │🎯 Practice│             │
│ │         │         │              │
│ └─────────┴─────────┘              │
└─────────────────────────────────────┘
```

### 1.2 Navigation Options

**For Solo Swiss Bracket:**
- Click **"Solo"** button → Goes to `solo_card.html`

**For Team Swiss Bracket:**
- Click **"Team"** button → Goes to `team_card.html`

---

## Step 2: Solo Swiss Bracket Creation

### 2.1 Solo Match Setup (`solo_card.html`)

**URL:** `solo_card.html` (no parameters needed for Swiss)

**What happens:**
1. **Page loads** with archer selection interface
2. **Archer list loads** from database (all available archers)
3. **Setup screen appears** for selecting opponents

### 2.2 Archer Selection Interface

```
┌─────────────────────────────────────┐
│ 🥇 Solo Olympic Match               │
│                                     │
│ Select Archers:                     │
│                                     │
│ Archer 1: [Select Archer ▼]        │
│ ┌─────────────────────────────────┐ │
│ │ 🔍 Search archers...            │ │
│ │ ⭐ Sarah Johnson (You)          │ │
│ │ ⭐ Mike Chen                    │ │
│ │   Alex Rodriguez               │ │
│ │   Emma Davis                   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Archer 2: [Select Archer ▼]        │
│ [Same dropdown list]                │
│                                     │
│ Location: [Optional text field]     │
│                                     │
│ [Start Match] (disabled until both  │
│                archers selected)    │
└─────────────────────────────────────┘
```

### 2.3 Archer Selection Process

**Step 1: Select Yourself**
- Archer clicks on **Archer 1** dropdown
- Searches for and selects their own name
- ⭐ **Starred archers appear at top** (favorites/teammates)

**Step 2: Select Opponent**
- Archer clicks on **Archer 2** dropdown  
- Searches for and selects their opponent
- **Swiss Bracket Hint:** System could show win/loss ratio here to help avoid duplicates

**Step 3: Optional Location**
- Enter location if desired (e.g., "Range A", "Bale 5")

**Step 4: Start Match**
- Click **"Start Match"** button
- System creates match in database

---

## Step 3: Database Match Creation

### 3.1 Behind the Scenes (Technical)

When archer clicks **"Start Match"**, the system:

```javascript
// From js/solo_card.js - startScoring() function
const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('event') || null;      // No event for standalone
const bracketId = urlParams.get('bracket') || null;  // No bracket for standalone
const today = new Date().toISOString().split('T')[0];

const matchId = await window.LiveUpdates.ensureSoloMatch({
    date: today,
    location: state.location || '',
    eventId: eventId,        // null for standalone Swiss
    bracketId: bracketId,    // null for standalone Swiss  
    maxSets: 5,
    forceNew: true
});
```

### 3.2 Match Code Generation

**For Swiss Brackets:**
- Uses existing match code system
- Format: `SOLO-RHTA-1101` (not bracket-specific)
- Generated when second archer is added to match
- Stored in database and localStorage for sync

### 3.3 Database Storage

**Tables Updated:**
```sql
-- Main match record
INSERT INTO solo_matches (id, date, location, event_id, bracket_id, status, max_sets)
VALUES (uuid(), '2025-11-20', 'Range A', NULL, NULL, 'Not Started', 5);

-- Archer 1 (Sarah Johnson)
INSERT INTO solo_match_archers (id, match_id, archer_id, position, cumulative_score, set_points)
VALUES (uuid(), match_id, sarah_id, 1, 0, 0);

-- Archer 2 (Mike Chen)  
INSERT INTO solo_match_archers (id, match_id, archer_id, position, cumulative_score, set_points)
VALUES (uuid(), match_id, mike_id, 2, 0, 0);
```

---

## Step 4: Match Scoring Interface

### 4.1 Scoring Screen Loads

After match creation, archer sees:

```
┌─────────────────────────────────────┐
│ 🥇 Solo Match - Set 1               │
│                                     │
│ Sarah Johnson    vs    Mike Chen    │
│     0 sets              0 sets      │
│                                     │
│ ┌─────────────┬─────────────────────┐
│ │ Sarah J     │ Mike C              │
│ │ A1: [  ]    │ A1: [  ]           │
│ │ A2: [  ]    │ A2: [  ]           │
│ │ A3: [  ]    │ A3: [  ]           │
│ │ Total: 0    │ Total: 0           │
│ └─────────────┴─────────────────────┘
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ X  10  9  8  7  6  5  4  3  M  │ │
│ │ 2  1   0  0  0  0  0  0  0  0  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Submit Set]                        │
└─────────────────────────────────────┘
```

### 4.2 Scoring Process

**Per Set (5 sets total):**
1. **Enter Arrow Scores** - Tap keypad for each arrow (3 arrows per set)
2. **System Calculates** - Automatic totals and set points
3. **Submit Set** - Moves to next set
4. **Set Winner** - Higher total wins 2 points, lower gets 0 (tie = 1 each)

**Match Winner:**
- **First to 6 set points wins** the match
- **Swiss Scoring:** Winner gets +1 win, loser gets +1 loss

---

## Step 5: Swiss Bracket Integration

### 5.1 Event-Linked Swiss Brackets

**If archer accesses via event/bracket:**

**URL with Parameters:**
```
solo_card.html?event=08184166-7900-44e0-8386-0b1c7c14a398&bracket=bracket-uuid
```

**What changes:**
- `eventId` and `bracketId` are passed to match creation
- Match is linked to specific Swiss bracket
- Win/loss counts toward bracket standings
- Coach can view all bracket matches in Coach Console

### 5.2 Bracket Results Tracking

**Database Updates After Match:**
```sql
-- Update bracket entry with win/loss
UPDATE bracket_entries 
SET swiss_wins = swiss_wins + 1,
    swiss_points = swiss_wins + 1
WHERE bracket_id = 'bracket-uuid' 
  AND archer_id = 'winner_archer_id';

UPDATE bracket_entries 
SET swiss_losses = swiss_losses + 1,
    swiss_points = swiss_wins  
WHERE bracket_id = 'bracket-uuid'
  AND archer_id = 'loser_archer_id';
```

---

## Step 6: Team Swiss Bracket (Alternative)

### 6.1 Team Match Setup (`team_card.html`)

**Similar process but with teams:**

```
┌─────────────────────────────────────┐
│ 👥👥 Team Olympic Match              │
│                                     │
│ Team 1: Select 3 Archers           │
│ ┌─────────────────────────────────┐ │
│ │ ⭐ Sarah Johnson               │ │
│ │ ⭐ Mike Chen                   │ │  
│ │ ⭐ Alex Rodriguez              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Team 2: Select 3 Archers           │
│ [Same selection interface]          │
│                                     │
│ [Start Match] (disabled until 3+3)  │
└─────────────────────────────────────┘
```

### 6.2 Team Scoring Differences

- **3 archers per team** (vs 1 archer in solo)
- **4 sets total** (vs 5 sets in solo)  
- **2 arrows per archer per set** (vs 3 arrows per archer in solo)
- **First to 5 set points wins** (vs 6 in solo)

---

## 🎯 Swiss Bracket Features

### Win/Loss Tracking
- **Automatic Updates:** System tracks wins/losses per archer
- **Leaderboard:** Coaches can view Swiss standings
- **Duplicate Prevention:** Match cards show win/loss ratio to help archers avoid repeat opponents

### Coach Integration
- **Bracket Management:** Coaches create Swiss brackets via Coach Console
- **Results Viewing:** `bracket_results.html` shows Swiss leaderboard
- **Match Verification:** Coaches can verify/lock completed matches

### Standalone vs Event-Linked
- **Standalone:** Direct access via home page (no event/bracket linking)
- **Event-Linked:** Access via QR code or event selection (counts toward bracket)

---

## 📋 Technical Implementation Notes

### URL Parameters
```javascript
// Swiss bracket match with event/bracket linking
solo_card.html?event=EVENT_ID&bracket=BRACKET_ID

// Standalone Swiss match (no linking)
solo_card.html
```

### Database Schema
```sql
-- Swiss bracket tracking
brackets: id, event_id, bracket_type='SOLO', bracket_format='SWISS', division, status
bracket_entries: id, bracket_id, archer_id, swiss_wins, swiss_losses, swiss_points

-- Match linking  
solo_matches: id, event_id, bracket_id, bracket_match_id, status
```

### Match Code Format
- **Swiss:** `SOLO-RHTA-1101` (existing system)
- **Elimination:** `BVARQ1-TC-AG` (bracket-specific)

---

## 🚀 Summary

**Complete Swiss Bracket Workflow:**

1. **Home Page** → Click "Solo" or "Team"
2. **Match Setup** → Select yourself + opponent(s)  
3. **Match Creation** → System creates database record
4. **Scoring** → Enter arrow scores, system calculates winners
5. **Swiss Tracking** → Wins/losses update bracket standings
6. **Results** → Coaches view leaderboard in bracket results module

**Key Benefits:**
- ✅ **Simple Access** - Direct from home page, no complex navigation
- ✅ **Flexible Opponents** - Archers choose who to face
- ✅ **Automatic Tracking** - Win/loss records maintained
- ✅ **Coach Oversight** - Full visibility and verification capabilities
- ✅ **Database Sync** - Cross-device compatibility and offline support

The Swiss bracket system provides a flexible, archer-driven tournament format while maintaining the robust database integration and coach oversight of the WDV Archery Suite.
