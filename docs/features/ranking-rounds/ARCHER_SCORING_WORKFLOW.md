# Archer Scoring Workflow - Complete Guide

## How Archers Log Their Scores

### Overview

Archers use the **Ranking Round** app to log their scores. The app provides three ways to access events and bale assignments:

1. **QR Code Scan** (Recommended - Fastest)
2. **Event Selection** (Manual event dropdown)
3. **Manual Bale Setup** (If no event is configured)

---

## Method 1: QR Code Access (Recommended)

### Step-by-Step

1. **Scan QR Code** posted at the event
   - QR code contains: Event ID + Entry Code
   
2. **App Auto-Loads Event**
   - Verifies entry code
   - Loads archer list from database
   - Shows all archers grouped by bale

3. **Select Your Bale**
   - Click on **any archer** in your bale
   - OR click the **Bale header** (e.g., "Bale 2")
   - All archers for that bale load automatically

4. **Begin Scoring**
   - Click "Begin Scoring" button
   - Keypad appears for score entry

5. **Enter Scores**
   - Enter each arrow value (X, 10, 9, 8, etc.)
   - Scores are color-coded (Gold, Red, Blue, Black, White)
   - Totals calculate automatically

6. **Advance Through Ends**
   - Click "E →" to move to next end
   - Click "← E" to go back
   - Progress is saved automatically

7. **Complete Round**
   - All ends scored = Round complete
   - View scorecard summary
   - Share results (optional)

---

## Method 2: Manual Event Selection

### Step-by-Step

1. **Open Ranking Round App**
   - Go to https://tryentist.com/wdv/
   - Click "Ranking Round"

2. **Select Event**
   - Top of screen shows event dropdown
   - Select today's active event

3. **Event Loads Automatically**
   - Archer list appears
   - Archers grouped by bale number

4. **Select Your Bale**
   - Find your name in the list
   - Click on any archer in your bale
   - Entire bale loads

5. **Begin Scoring** (same as QR code method)

---

## Method 3: Manual Bale Setup (No Event)

### Step-by-Step

1. **Open Ranking Round App**

2. **Bale Number**
   - Enter your bale number at the top
   - Default is "1"

3. **Select Archers Manually**
   - Scroll through archer list
   - Check boxes next to archers on your bale
   - Assign target letters (A, B, C, D)
   - Maximum 4 archers per bale

4. **Begin Scoring** (same as above)

---

## Scoring Interface

### Keypad Entry

```
┌─────────────────────────┐
│   Bale 2 - End 1        │
├─────────────────────────┤
│ Archer    A1   A2   A3  │
├─────────────────────────┤
│ John S.   10   9    8   │
│ Sarah M.  X    10   9   │
│ Alex R.   9    8    7   │
│ Emma D.   8    7    6   │
├─────────────────────────┤
│ [Keypad]                │
│ X | 10 | 9 | 8 | 7      │
│ 6 | 5  | 4 | 3 | 2      │
│ 1 | M  | 0 | ← | Clear  │
└─────────────────────────┘
```

### Color Coding

- **Gold**: X, 10, 9
- **Red**: 8, 7
- **Blue**: 6, 5
- **Black**: 4, 3, 2, 1
- **White**: M (miss), 0

### Sync Status (if Live Updates enabled)

- **✓ Synced**: Data saved to server
- **⟳ Pending**: Waiting to sync
- **✗ Failed**: Sync error (retry available)

---

## Coach Workflow Summary

### 1. Upload Archer CSV (Rarely)

**Frequency**: Once per season or when roster changes

**Steps**:
- Open Archer Setup
- Import CSV file with columns:
  - First Name, Last Name, School (3-letter code), Level (VAR/JV), Gender (M/F)
- Click "Sync to DB" to upload to MySQL

**File Format**:
```csv
First,Last,School,Level,Gender
John,Smith,WIS,VAR,M
Sarah,Johnson,DVN,VAR,F
```

### 2. Create Event

**Frequency**: Once per tournament

**Steps**:
1. Open Coach Console
2. Click "Create Event"
3. Enter:
   - **Event Name**: "Fall Tournament"
   - **Entry Code**: "FALL2024" (for QR code)
   - **Event Date**: Today (auto-filled)
4. Choose:
   - **Auto-assign bales**: Yes (recommended)
   - **Round Type**: R300 or R360

**Result**:
- 4 division rounds created (BVAR, GVAR, BJV, GJV)
- Archers automatically assigned to bales
- Bale numbering continuous across divisions
- 2-4 archers per bale

### 3. Generate QR Code

**Steps**:
1. Copy Event ID from Coach Console
2. Create URL:
   ```
   https://tryentist.com/wdv/ranking_round_300.html?event=EVENT_ID&code=ENTRY_CODE
   ```
3. Use QR code generator: https://www.qr-code-generator.com/
4. Generate QR code from URL
5. Print and post at event location

**Example URL**:
```
https://tryentist.com/wdv/ranking_round_300.html?event=a1b2c3d4-5678-90ab-cdef-1234567890ab&code=FALL2024
```

### 4. Update Event Status

**During Event**:
- Change status from "Planned" → "Active"
- Archers can now score

**After Event**:
- Change status to "Completed"
- Archive results

### 5. View Live Leaderboards

**Steps**:
1. Open Coach Console
2. Select active event
3. View division-based leaderboards
   - Running totals
   - Arrow averages
   - Real-time score updates
   - Grouped by division (BVAR, GVAR, BJV, GJV)

---

## Division Structure

### Automatic Division Assignment

Archers are grouped into divisions based on:
- **Gender**: M (Boys) or F (Girls)
- **Level**: VAR (Varsity) or JV (Junior Varsity)

**Divisions**:
1. **BVAR**: Boys Varsity
2. **GVAR**: Girls Varsity
3. **BJV**: Boys JV
4. **GJV**: Girls JV

### Bale Assignment Algorithm

**Rules**:
- 2-4 archers per bale
- No single-archer bales
- Continuous numbering across all divisions
- Example: BVAR uses bales 1-3, GVAR continues at bale 4

**Example Event**:
```
BVAR: 10 archers → Bales 1, 2, 3 (4+3+3)
GVAR: 6 archers  → Bales 4, 5 (3+3)
BJV:  7 archers  → Bales 6, 7 (4+3)
GJV:  4 archers  → Bale 8 (4)
```

---

## Data Flow

### Archer Perspective

```
1. Scan QR Code
   ↓
2. Entry Code Verified
   ↓
3. Event Data Loaded (Archers + Bale Assignments)
   ↓
4. Select Bale → Loads All Archers on Bale
   ↓
5. Begin Scoring
   ↓
6. Keypad Entry → Auto-saves to localStorage
   ↓
7. (Optional) Live Updates → Syncs to MySQL
   ↓
8. Complete Round → View Scorecard
```

### Coach Perspective

```
1. Upload CSV → MySQL (archers table)
   ↓
2. Create Event → MySQL (events + rounds tables)
   ↓
3. Auto-assign Bales → MySQL (round_archers table)
   ↓
4. Generate QR Code → Share with archers
   ↓
5. Set Event Active
   ↓
6. Monitor Live Leaderboards
   ↓
7. Set Event Completed
```

---

## Technical Architecture

### Public Endpoints (No Auth)

- `GET /v1/events/recent` - List events
- `GET /v1/events/{id}/snapshot` - Get event with bale assignments
- `POST /v1/events/verify` - Verify entry code

### Protected Endpoints (Requires Auth)

- `POST /v1/events` - Create event
- `DELETE /v1/events/{id}` - Delete event
- `POST /v1/archers/bulk_upsert` - Sync archer roster
- `POST /v1/rounds/{id}/archers/{id}/ends` - Submit end scores

### Storage

- **localStorage**: Archer scores (offline resilience)
- **MySQL**: Archer roster, events, rounds, bale assignments
- **Live Updates**: Real-time score sync (optional)

---

## Mobile Optimization

**Target Device**: iPhone SE (small screen)

**UI Features**:
- Large touch targets (keypad buttons)
- Responsive layout (flexbox)
- Horizontal scroll for wide tables
- Color-coded score inputs
- Simplified navigation
- Auto-save on every entry
- Offline-first design

---

## Benefits

### For Archers
✅ No login required
✅ Instant QR code access
✅ Pre-loaded bale assignments
✅ Easy score entry
✅ Auto-save (offline resilience)
✅ Color-coded feedback

### For Coaches
✅ CSV roster upload (one-time)
✅ Auto-bale assignment
✅ QR code generation
✅ Live leaderboards
✅ Division-based organization
✅ Running averages & totals

---

## Troubleshooting

### Issue: QR Code Not Working

**Solution**:
1. Check entry code is correct
2. Verify event status is "Active"
3. Test URL in browser first
4. Regenerate QR code if needed

### Issue: Archer Not in List

**Solution**:
1. Verify archer in CSV roster
2. Check CSV sync to database
3. Recreate event if needed
4. Use manual mode as fallback

### Issue: Scores Not Syncing

**Solution**:
1. Check internet connection
2. Click "Master Sync" button
3. Verify Live Updates is enabled
4. Check API key (coach mode)
5. Scores saved locally (safe to continue)

---

## Future Enhancements

- **Auto-refresh leaderboards** (polling)
- **Push notifications** for score updates
- **Photo verification** of scorecards
- **Printable scorecards** (PDF export)
- **Historical stats** by archer
- **Tournament brackets** for playoffs
