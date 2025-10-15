# Ranking Round Tuning & Fixes

**Status**: 🔄 In Progress  
**Priority**: High  
**Target Files**: `js/ranking_round_300.js`, `ranking_round_300.html`

---

## 🎯 Goals

Fix the Ranking Round app to properly integrate with the new Coach Console workflow, including:
1. QR code verification and event loading
2. Proper archer display with bale assignments
3. Working event selector and bale navigation
4. Pre-assigned bale mode workflow
5. Manual bale selection fallback

---

## 🐛 Known Issues (From User Testing)

### 1. **Event Dropdown is Blank**
- **Symptom**: Event selector at top of page shows no events
- **Likely Cause**: API response structure mismatch (`data.snapshot` vs `data.divisions`)
- **Impact**: Archers can't manually select an event

### 2. **Too Many Archers Per Bale**
- **Symptom**: Bale assignments show more than 4 archers per bale
- **Likely Cause**: Auto-assignment algorithm issue or test data problem
- **Impact**: Doesn't match physical setup (max 4 targets per bale)

### 3. **Archer Data Issues**
- **Symptom**: Archer names showing as "undefined undefined"
- **Likely Cause**: Field name mismatches (firstName vs first_name, archerName, etc.)
- **Impact**: Can't identify archers in list

### 4. **Event Selector Not Driving Anything**
- **Symptom**: Selecting an event from dropdown doesn't load archers
- **Likely Cause**: Event change handler not connected or broken
- **Impact**: Manual event selection doesn't work

### 5. **Bale Ticker Not Working**
- **Symptom**: Changing bale number doesn't filter archers
- **Likely Cause**: Bale number input not connected to archer filter
- **Impact**: Can't browse different bales manually

### 6. **Bale/Scorecard Selection Missing**
- **Symptom**: No clear workflow for selecting a bale from the list
- **Likely Cause**: UI not implemented for bale group selection
- **Impact**: Archers don't know how to start scoring

---

## 📋 Proposed Solutions

### Phase 1: Fix API Response Handling
**Files**: `js/ranking_round_300.js`

**Issues to Fix**:
1. `data.snapshot.divisions` → `data.divisions`
2. `archer.first_name` → `archer.archerName` (or parse firstName/lastName)
3. `snapshot.event` → `data.event`

**Approach**:
- Search for all instances of API response parsing
- Update to match actual API structure from `/events/{id}/snapshot`
- Add console logging for debugging

### Phase 2: Fix Event Selector
**Files**: `js/ranking_round_300.js`

**Current Issues**:
- Event selector populated but not visible?
- Event change handler not working?

**Solutions**:
1. Verify event selector is populated with active events only
2. Ensure change handler calls `loadPreAssignedBale(eventId)`
3. Update UI to show selected event name
4. Filter events by status (show Active events prominently)

### Phase 3: Improve Setup Workflow
**Default Behavior**:
```
1. Check localStorage for in-progress scorecard → Go to Scoring view
2. Check URL params (event + code) → Verify and load → Setup view
3. Show Setup view with:
   - Event selector (Active events at top)
   - Bale/Scorecard selection area
```

**Setup View Structure**:
```
┌─────────────────────────────────────┐
│ Event: [Fall Championship ▼]       │
├─────────────────────────────────────┤
│ Select Your Bale:                   │
│                                     │
│ BVAR - Bale 1 (4 archers) [Select] │
│   • John Smith (Target A)          │
│   • Mike Jones (Target B)          │
│   • Chris Lee (Target C)           │
│   • Tom White (Target D)           │
│                                     │
│ BVAR - Bale 2 (3 archers) [Select] │
│   • David Kim (Target A)           │
│   • Luke Garr (Target B)           │
│   • Levi Meeker (Target C)         │
│                                     │
│ GVAR - Bale 3 (4 archers) [Select] │
│   ...                               │
└─────────────────────────────────────┘
```

**Clickable Elements**:
- Bale header → Selects entire bale
- Individual archer → Selects just that archer (for manual mode)

### Phase 4: Bale Navigation
**Bale Ticker**:
- Should filter/highlight the selected bale in the list
- Not replace the event selector
- Useful for quick navigation

**Implementation**:
```javascript
baleNumberInput.onchange = () => {
  const bale = parseInt(baleNumberInput.value, 10);
  // Scroll to bale section
  // Highlight bale group
  // Don't change state.archers (that's for actual selection)
};
```

### Phase 5: Pre-Assigned vs Manual Mode
**Pre-Assigned Mode** (via QR code):
- Event + code in URL
- Auto-load event snapshot
- Show only bales with assignments
- Click bale → Load all archers for that bale
- "Begin Scoring" button

**Manual Mode** (no QR code):
- Show event selector
- User selects event
- Show all archers from event
- User manually checks boxes to select archers
- "Begin Scoring" button

### Phase 6: Archer Display Sorting
**Sort Order**:
1. Division (BVAR, GVAR, BJV, GJV)
2. Bale Number (ascending)
3. Target Assignment (A, B, C, D)
4. First Name (alphabetical)

**Grouping**:
- Group by division/bale combination
- Show bale as a clickable header
- Indent archers under their bale

---

## 🔧 Technical Details

### API Response Structure (Actual)
```json
{
  "event": {
    "id": "...",
    "name": "Fall Championship 2025",
    "date": "2025-10-15",
    "status": "Active"
  },
  "divisions": {
    "BVAR": {
      "roundId": "...",
      "division": "BVAR",
      "archerCount": 12,
      "archers": [
        {
          "roundArcherId": "...",
          "archerName": "John Smith",
          "school": "W",
          "gender": "M",
          "level": "VAR",
          "target": "A",
          "bale": 1,
          "runningTotal": 270,
          "avgPerArrow": 9.0
        }
      ]
    }
  }
}
```

### Field Name Mappings
| API Response | Display As | Parse How |
|--------------|-----------|-----------|
| `archerName` | First Last | Split on space |
| `school` | School code | Direct |
| `bale` | Bale number | parseInt |
| `target` | Target letter | Direct (A, B, C, D) |
| `runningTotal` | Total score | Direct |

### State Management
```javascript
state = {
  currentView: 'setup' | 'scoring' | 'card',
  selectedEventId: null,
  activeEventId: null,  // From QR code
  assignmentMode: 'manual' | 'pre-assigned',
  baleNumber: 1,
  archers: [],  // Selected archers for scoring
  masterArcherList: [],  // All archers from event
}
```

---

## 🧪 Testing Checklist

### QR Code Flow
- [ ] Scan QR code with event + code
- [ ] Entry code verifies successfully
- [ ] Event snapshot loads
- [ ] Archers display with bale assignments
- [ ] Can select a bale group
- [ ] "Begin Scoring" starts scoring view
- [ ] All archers from bale are loaded

### Manual Event Selection
- [ ] Event selector shows active events
- [ ] Selecting event loads archer list
- [ ] Archers grouped by division/bale
- [ ] Can manually check/uncheck archers
- [ ] "Begin Scoring" works with selection

### Bale Navigation
- [ ] Bale number input changes highlight
- [ ] Can scroll through bale list
- [ ] Bale ticker doesn't break selection

### Archer Display
- [ ] Names show correctly (not "undefined")
- [ ] Bale/target assignments visible
- [ ] Max 4 archers per bale
- [ ] Sorted by division → bale → target → name

---

## 📝 Questions for User

Before implementing fixes, clarify:

**Q1**: When an archer opens Ranking Round (without QR code), should they see:
- A) Only "Active" events in dropdown?
- B) All events (Planned/Active/Completed)?
USER: A, only "Active Events"

**Q2**: If there's only ONE active event, should it auto-select?
USER: Yes

**Q3**: When using QR code, should it:
- A) Bypass event selector entirely?
- B) Show event selector but pre-populate it?
Bypass event selector entirely and go straight to the event

**Q4**: For bale/archer list, should it look like:
- **Option A - Flat List**:
  ```
  BVAR
    Bale 1 - Target A: John Smith
    Bale 1 - Target B: Mike Jones
  ```
- **Option B - Grouped by Bale (clickable headers)**:
  ```
  BVAR - Bale 1 (2 archers) [Click to select all]
    Target A: John Smith
    Target B: Mike Jones
  ```
  Option A with a button to sort by first name or bale number

**Q5**: Manual assignment mode - should archers:
- A) See full list and check boxes to select bale partners?
- B) Only see their own name and enter bale number?
USER A, full list that selects bale partners and assigns their target a, b, c, d (this is how it is implemented)

**Q6**: In-progress scorecard detection:
- A) Check localStorage for `state.archers` with scores?
- B) Check if any ends synced to server?
- C) Both?
USER C, BOTH

**Q7**: If archer has in-progress scorecard for Event A, but scans QR for Event B:
- A) Warn and ask to abandon Event A?
- B) Auto-save Event A and switch to Event B?
- C) Prevent switching until Event A complete?
USER B AUTOSAVE and SWITCH TO EVENT B
---

## 🎯 Success Criteria

1. ✅ QR code scanning loads correct event and archers
2. ✅ Event selector works for manual event selection
3. ✅ Archer names display correctly (no "undefined")
4. ✅ Max 4 archers per bale (no overcrowding)
5. ✅ Bale groups are clickable and select all archers
6. ✅ Bale ticker highlights but doesn't break selection
7. ✅ "Begin Scoring" button loads correct archers
8. ✅ Setup → Scoring transition is smooth
9. ✅ Works on both desktop and iPhone Safari

---

*Created: October 8, 2025*  
*Status: Ready for implementation*

USER UPDATED QUESTIONS Octover 15
