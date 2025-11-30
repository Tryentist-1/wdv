# Ranking Round Implementation Plan

**Date**: October 15, 2025  
**Status**: Ready to Implement  
**Based on**: User answers in RANKING_ROUND_TUNING_PLAN.md

---

## 📋 User Requirements (Confirmed)

### **Q1**: Event Filtering
- ✅ Show **ONLY "Active" events** in dropdown
- Filter out Planned and Completed events

### **Q2**: Auto-Selection
- ✅ **Auto-select** if only ONE active event
- Skip manual selection when obvious

### **Q3**: QR Code Behavior
- ✅ **Bypass event selector entirely**
- Go straight to event with bale assignments
- No intermediate selection step

### **Q4**: Archer List Display
- ✅ **Option A: Flat list**
- Add **sort button**: "Sort by Name" or "Sort by Bale"
- Toggle between two sort modes

### **Q5**: Manual Assignment Mode
- ✅ **Full list with checkboxes** (current implementation)
- Select bale partners manually
- Assigns targets A, B, C, D automatically

### **Q6**: In-Progress Detection
- ✅ Check **BOTH**:
  - localStorage for `state.archers` with scores
  - Server sync status for synced ends

### **Q7**: Event Switching
- ✅ **Auto-save Event A** and **switch to Event B**
- No confirmation dialog
- Seamless transition

---

## 🔧 Implementation Tasks

### **Phase 1: API Response Structure Fixes** ✨ CRITICAL
**File**: `js/ranking_round_300.js`

**Issues**:
1. ❌ `const snapshot = data.snapshot;` - WRONG (no wrapper)
2. ❌ `snapshot.divisions` - WRONG
3. ❌ `archer.first_name` - WRONG (doesn't exist)

**Fixes**:
```javascript
// OLD (broken):
const snapshot = data.snapshot;
if (snapshot && snapshot.divisions) {
  const div = snapshot.divisions[divKey];
  archer.first = archer.first_name;
}

// NEW (correct):
const eventData = await eventRes.json();
if (eventData && eventData.divisions) {
  const div = eventData.divisions[divKey];
  // Parse archerName: "John Smith" -> first: "John", last: "Smith"
  const nameParts = archer.archerName.split(' ');
  archer.first = nameParts[0];
  archer.last = nameParts.slice(1).join(' ');
}
```

**Search Patterns**:
- `data.snapshot` → replace with `data` or `eventData`
- `archer.first_name` → parse from `archer.archerName`
- `archer.last_name` → parse from `archer.archerName`

---

### **Phase 2: Event Selector Improvements** 🎯

#### **2A: Filter to Active Events Only**
```javascript
// In loadEventInfo():
const events = data.events || [];

// OLD: Show all events
eventSelector.innerHTML = '<option value="">Select Event...</option>';
events.forEach(ev => { ... });

// NEW: Filter to Active only
const activeEvents = events.filter(ev => ev.status === 'Active');
eventSelector.innerHTML = '<option value="">Select Event...</option>';
activeEvents.forEach(ev => {
  const option = document.createElement('option');
  option.value = ev.id;
  option.textContent = `${ev.name} (${ev.date})`;
  eventSelector.appendChild(option);
});
```

#### **2B: Auto-Select if Only One Active Event**
```javascript
// After populating selector:
if (activeEvents.length === 1) {
  eventSelector.value = activeEvents[0].id;
  state.selectedEventId = activeEvents[0].id;
  // Trigger load
  await loadPreAssignedBale(activeEvents[0].id);
  saveData();
}
```

---

### **Phase 3: QR Code Flow - Bypass Selector** 🚀

**Current**: QR code loads event but still shows selector  
**New**: Skip directly to bale selection

```javascript
// In init():
if (urlEventId && urlEntryCode) {
  const verified = await verifyAndLoadEventByCode(urlEventId, urlEntryCode);
  if (verified) {
    // OLD: Just loads event, shows setup
    // NEW: Load event AND pre-populate archers, show bale selection
    state.currentView = 'setup';  // Stay in setup to show bale selection
    renderView();
    return; // Skip loadEventInfo()
  }
}
```

**In verifyAndLoadEventByCode()**:
```javascript
// After loading event snapshot:
// Don't just populate masterArcherList
// Actually prepare the UI for bale selection
renderArcherSelectList(allArchers); // Show bale groups immediately
```

---

### **Phase 4: Archer List with Sort Button** 📊

**Add to Setup View**:
```html
<div class="setup-controls">
  <button id="sort-toggle-btn" class="btn btn-secondary">
    Sort by: Bale Number
  </button>
</div>
```

**State**:
```javascript
state.sortMode = 'bale'; // or 'name'
```

**Sort Function**:
```javascript
function renderArcherSelectList(masterList, filter = '') {
  // Sort based on state.sortMode
  const sorted = [...masterList].sort((a, b) => {
    if (state.sortMode === 'bale') {
      // Division → Bale → Target → First Name
      if (a.division !== b.division) return divisionOrder(a, b);
      if (a.bale !== b.bale) return a.bale - b.bale;
      if (a.target !== b.target) return a.target.localeCompare(b.target);
      return a.first.localeCompare(b.first);
    } else {
      // First Name → Last Name
      if (a.first !== b.first) return a.first.localeCompare(b.first);
      return a.last.localeCompare(b.last);
    }
  });
  
  // Render sorted list
  renderList(sorted);
}
```

**Toggle Button**:
```javascript
const sortToggleBtn = document.getElementById('sort-toggle-btn');
sortToggleBtn.onclick = () => {
  state.sortMode = state.sortMode === 'bale' ? 'name' : 'bale';
  sortToggleBtn.textContent = state.sortMode === 'bale' 
    ? 'Sort by: Bale Number' 
    : 'Sort by: Name';
  renderArcherSelectList(masterArcherList);
};
```

---

### **Phase 5: In-Progress Detection** 💾

**Check localStorage**:
```javascript
function hasInProgressScorecard() {
  const saved = localStorage.getItem(sessionKey);
  if (!saved) return false;
  
  const data = JSON.parse(saved);
  if (!data.archers || data.archers.length === 0) return false;
  
  // Check if any archer has scores entered
  return data.archers.some(archer => {
    return archer.scores && archer.scores.some(s => s !== null && s !== '');
  });
}
```

**Check server sync**:
```javascript
async function hasServerSyncedEnds() {
  if (!state.activeEventId) return false;
  
  try {
    const snapshot = await fetch(`${API_BASE}/events/${state.activeEventId}/snapshot`);
    const data = await snapshot.json();
    
    // Check if any archers in current selection have synced ends
    return state.archers.some(archer => {
      // Find in snapshot
      const serverArcher = findArcherInSnapshot(data, archer);
      return serverArcher && serverArcher.endsCompleted > 0;
    });
  } catch (e) {
    return false;
  }
}
```

**Combined check in init()**:
```javascript
async function init() {
  loadData();
  
  // Check for in-progress work
  const localProgress = hasInProgressScorecard();
  const serverProgress = await hasServerSyncedEnds();
  
  if (localProgress || serverProgress) {
    // Resume to scoring view
    state.currentView = 'scoring';
    renderView();
    return;
  }
  
  // Otherwise, continue with normal flow
  // ...
}
```

---

### **Phase 6: Auto-Save and Switch Events** 🔄

**When QR code for Event B scanned while Event A in progress**:

```javascript
async function switchToNewEvent(newEventId, newEventCode) {
  // 1. Check if current work exists
  if (state.archers.length > 0) {
    console.log('Auto-saving current event before switching...');
    
    // 2. Save current state to separate key
    const backupKey = `rankingRound300_backup_${state.selectedEventId}`;
    localStorage.setItem(backupKey, JSON.stringify(state));
    
    // 3. Try to sync any unsynced ends
    if (typeof performMasterSync === 'function') {
      await performMasterSync();
    }
  }
  
  // 4. Clear current state
  state.archers = [];
  state.selectedEventId = null;
  state.activeEventId = null;
  
  // 5. Load new event
  await verifyAndLoadEventByCode(newEventId, newEventCode);
  
  // 6. Save new state
  saveData();
}
```

**In verifyAndLoadEventByCode()**:
```javascript
// At the start:
if (state.selectedEventId && state.selectedEventId !== eventId) {
  // Different event - auto-save and switch
  await switchToNewEvent(eventId, entryCode);
  return true;
}
```

---

### **Phase 7: Bale Ticker Navigation** 🎯

**Current Issue**: Bale ticker changes number but doesn't do anything

**Solution**: Highlight and scroll to bale group

```javascript
const baleNumberInput = document.getElementById('bale-number-input');
baleNumberInput.onchange = () => {
  const bale = parseInt(baleNumberInput.value, 10) || 1;
  state.baleNumber = bale;
  saveData();
  
  // Highlight bale in list
  highlightBale(bale);
  
  // Scroll to bale section
  scrollToBale(bale);
};

function highlightBale(baleNum) {
  // Remove previous highlights
  document.querySelectorAll('.bale-group').forEach(el => {
    el.classList.remove('highlighted');
  });
  
  // Add highlight to target bale
  const baleGroup = document.querySelector(`[data-bale="${baleNum}"]`);
  if (baleGroup) {
    baleGroup.classList.add('highlighted');
  }
}

function scrollToBale(baleNum) {
  const baleGroup = document.querySelector(`[data-bale="${baleNum}"]`);
  if (baleGroup) {
    baleGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
```

---

### **Phase 8: Clickable Bale Headers** 🖱️

**Add bale grouping with headers**:

```javascript
function renderArcherSelectList(masterList) {
  // Group by bale
  const baleGroups = {};
  masterList.forEach(archer => {
    if (!archer.bale) return;
    if (!baleGroups[archer.bale]) {
      baleGroups[archer.bale] = [];
    }
    baleGroups[archer.bale].push(archer);
  });
  
  // Render groups
  listDiv.innerHTML = '';
  Object.keys(baleGroups).sort((a, b) => a - b).forEach(bale => {
    const archers = baleGroups[bale];
    
    // Bale header (clickable)
    const header = document.createElement('div');
    header.className = 'bale-group-header';
    header.dataset.bale = bale;
    header.innerHTML = `
      <strong>Bale ${bale}</strong> (${archers.length} archers)
      <button class="btn btn-sm btn-select-bale">Select All</button>
    `;
    header.querySelector('.btn-select-bale').onclick = (e) => {
      e.stopPropagation();
      selectEntireBale(bale, archers);
    };
    listDiv.appendChild(header);
    
    // Archers in this bale
    archers.forEach(archer => {
      const item = createArcherItem(archer);
      listDiv.appendChild(item);
    });
  });
}

function selectEntireBale(baleNum, archers) {
  // Clear current selection
  state.archers = [];
  
  // Add all archers from this bale
  archers.forEach(archer => {
    state.archers.push({
      id: archer.id || genLocalId(),
      firstName: archer.first,
      lastName: archer.last,
      school: archer.school,
      level: archer.level,
      gender: archer.gender,
      targetAssignment: archer.target,
      targetSize: archer.targetSize || (archer.level === 'VAR' ? 122 : 80),
      scores: Array(state.totalEnds).fill(null).map(() => ['', '', ''])
    });
  });
  
  // Update bale number
  state.baleNumber = parseInt(baleNum);
  
  // Save and transition to scoring
  saveData();
  state.currentView = 'scoring';
  renderView();
}
```

---

## 🎨 CSS Additions

```css
/* Bale group header */
.bale-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #3498db;
  color: white;
  margin-top: 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.bale-group-header:hover {
  background: #2980b9;
}

.bale-group-header.highlighted {
  background: #f39c12;
  box-shadow: 0 0 0 3px rgba(243, 156, 18, 0.3);
}

.btn-select-bale {
  background: white;
  color: #3498db;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  border: none;
  font-weight: 600;
}
```

---

## 📝 Testing Plan

### **Test 1: QR Code Flow**
1. Create Active event with archers
2. Generate QR code
3. Scan with phone
4. ✅ Should bypass event selector
5. ✅ Should show bale groups immediately
6. ✅ Click bale header → all archers selected
7. ✅ "Begin Scoring" → scoring view

### **Test 2: Manual Event Selection**
1. Open ranking_round_300.html (no QR)
2. ✅ Event selector shows ONLY Active events
3. ✅ If 1 active event → auto-selected
4. ✅ If multiple → manual selection
5. ✅ Selecting event → loads archer list
6. ✅ Sort button toggles Name/Bale

### **Test 3: In-Progress Detection**
1. Start scoring for Event A
2. Enter some scores (not synced)
3. Refresh page
4. ✅ Should resume to scoring view (localStorage)
5. Sync some ends
6. Close browser completely
7. Reopen
8. ✅ Should detect server-synced ends

### **Test 4: Event Switching**
1. Score Event A (partial progress)
2. Scan QR for Event B
3. ✅ Auto-saves Event A
4. ✅ Syncs unsynced ends
5. ✅ Switches to Event B
6. ✅ No data loss

### **Test 5: Bale Navigation**
1. Load event with 10 bales
2. Change bale ticker to "5"
3. ✅ Scrolls to Bale 5
4. ✅ Highlights Bale 5
5. ✅ Doesn't change selected archers

---

## 🚀 Deployment Plan

1. **Backup current version**: Copy `ranking_round_300.js` to backup
2. **Implement fixes** in order (Phase 1 → 8)
3. **Test locally** on desktop and iPhone
4. **Commit to git** with detailed message
5. **Deploy via FTP** with cache purge
6. **Test on production** with real QR code
7. **Document** any issues found

---

## ✅ Success Criteria

- [ ] QR code loads event and shows bale groups immediately
- [ ] Event selector shows ONLY Active events
- [ ] Auto-selects if only one active event
- [ ] Archer names display correctly (no "undefined")
- [ ] Sort button works (Name ↔ Bale)
- [ ] Bale headers are clickable (select entire bale)
- [ ] Bale ticker highlights and scrolls to bale
- [ ] In-progress detection works (localStorage + server)
- [ ] Event switching auto-saves and syncs
- [ ] All changes work on iPhone Safari

---

*Ready to implement: October 15, 2025*

