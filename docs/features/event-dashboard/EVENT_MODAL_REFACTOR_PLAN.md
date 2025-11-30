# Event Selection Modal Refactor - Integration Plan

**Date:** November 28, 2025  
**Issue:** Event modal doesn't properly handle round information, bale assignments, or direct links from index.html  
**Status:** 🔍 ANALYSIS → 📋 PLAN

---

## Problem Statement

### Current Issues

1. **Two tabs with incomplete functionality:**
   - **"Enter Code" tab** - Doesn't capture round information
   - **"Select Event" tab** - Doesn't leverage existing bale assignments

2. **Direct links from index.html don't work:**
   - URL format: `ranking_round_300.html?event=X&round=Y&archer=Z`
   - Should go directly to scoring without validation
   - Should pull from existing in-progress card

3. **Doesn't check if archer already has a bale assignment:**
   - Pre-assigned archers shouldn't need to select a bale
   - Should automatically load their assigned bale

4. **Doesn't integrate with new workflow:**
   - Resume flow (from `restoreCurrentBaleSession()`)
   - Pre-assigned mode vs manual mode
   - Entry code persistence

---

## Current URL Parameters

```javascript
const urlParams = new URLSearchParams(window.location.search);
const urlEventId = urlParams.get('event');      // Event ID
const urlEntryCode = urlParams.get('code');     // Entry code (QR)
const urlRoundId = urlParams.get('round');      // Round ID (direct link)
const urlArcherId = urlParams.get('archer');    // Archer ID (direct link)
```

### Current Scenarios

| Scenario | URL | Expected Behavior | Current Behavior |
|----------|-----|-------------------|------------------|
| QR Code | `?event=X&code=ABC` | Load event, show setup | ✅ Works |
| Direct Link | `?event=X&round=Y&archer=Z` | Load round, go to scoring | ❌ Shows modal |
| Resume from Index | `?event=X&round=Y&archer=Z` | Resume existing card | ❌ Shows modal |
| Manual Entry | No params | Show event modal | ✅ Works |

---

## Desired Workflow

### Scenario 1: Direct Link from Index.html (Resume)

**URL:** `ranking_round_300.html?event=29028a52-b889-4f05-9eb1-7cf87cbd5a62&round=21d8ad92-8aa3-47f1-b8a8-471b...&archer=abc-123`

**Flow:**
```
1. Parse URL parameters
   ├─ eventId: 29028a52...
   ├─ roundId: 21d8ad92...
   └─ archerId: abc-123

2. Check for existing session
   ├─ Check current_bale_session
   ├─ Check if roundId matches
   └─ If match → Resume immediately

3. If no session, fetch round data from server
   ├─ GET /v1/rounds/{roundId}
   ├─ Extract: division, baleNumber, archers
   └─ Populate state

4. Check if archer is in this round
   ├─ Find archer in round.archers
   ├─ Get baleNumber from archer
   └─ Set state.baleNumber

5. Go directly to scoring view
   ├─ No modal
   ├─ No validation
   └─ Pull from existing card
```

**Expected Result:** User sees their scorecard immediately, no prompts.

---

### Scenario 2: QR Code Entry (New Round)

**URL:** `ranking_round_300.html?event=X&code=ABC`

**Flow:**
```
1. Parse URL parameters
   ├─ eventId: X
   └─ entryCode: ABC

2. Save entry code
   ├─ localStorage.event_entry_code = ABC
   └─ Save to event:{eventId}:meta

3. Load event data
   ├─ GET /v1/events/{eventId}
   └─ Extract: name, assignmentMode, eventType

4. Check assignment mode
   ├─ If 'pre-assigned':
   │   ├─ Check if archer has bale assignment
   │   ├─ GET /v1/events/{eventId}/snapshot
   │   ├─ Find archer's bale
   │   └─ Load bale automatically
   │
   └─ If 'manual':
       └─ Show manual bale selection

5. Show setup view
   └─ Ready to start scoring
```

**Expected Result:** Event loaded, entry code saved, setup shown (pre-assigned or manual).

---

### Scenario 3: Manual Entry (No URL Params)

**URL:** `ranking_round_300.html`

**Flow:**
```
1. Check for existing session
   ├─ Check current_bale_session
   └─ If found → Prompt to resume

2. If no session, show event modal
   ├─ Tab 1: Enter Code
   └─ Tab 2: Select Event

3. User selects event
   └─ Follow Scenario 2 flow
```

**Expected Result:** Event modal shown, user selects event or enters code.

---

## Event Modal Refactor

### Tab 1: Enter Code

**Current:**
```html
<input type="text" id="event-code-input" placeholder="Enter event code...">
<button id="verify-code-btn">Connect to Event</button>
```

**Issues:**
- Doesn't save entry code properly
- Doesn't check for round information
- Doesn't handle pre-assigned archers

**Improved:**
```javascript
async function handleCodeEntry(code) {
    try {
        // 1. Validate code format
        if (!code || code.length < 4) {
            showError('Please enter a valid event code');
            return;
        }

        // 2. Search for event by code
        const events = await searchEventsByCode(code);
        if (events.length === 0) {
            showError('Event not found. Please check the code.');
            return;
        }

        // 3. If multiple events, let user select
        if (events.length > 1) {
            showEventSelection(events, code);
            return;
        }

        // 4. Single event found - load it
        const event = events[0];
        await loadEventWithCode(event.id, event.name, code);

    } catch (error) {
        console.error('[handleCodeEntry] Error:', error);
        showError('Failed to connect to event. Please try again.');
    }
}

async function loadEventWithCode(eventId, eventName, entryCode) {
    // 1. Save entry code everywhere
    localStorage.setItem('event_entry_code', entryCode);
    const metaKey = `event:${eventId}:meta`;
    const meta = { entryCode, eventName, loadedAt: new Date().toISOString() };
    localStorage.setItem(metaKey, JSON.stringify(meta));

    // 2. Load event data
    const eventData = await loadEventById(eventId, eventName, entryCode);

    // 3. Check if archer has pre-assigned bale
    if (eventData.assignmentMode === 'pre-assigned') {
        const archerBale = await findArcherBaleAssignment(eventId, getArcherCookie());
        if (archerBale) {
            // Archer has a bale - load it automatically
            await loadPreAssignedBale(eventId, archerBale.baleNumber);
            closeModal();
            renderView();
            return;
        }
    }

    // 4. No pre-assignment - show setup
    closeModal();
    renderView();
}
```

---

### Tab 2: Select Event

**Current:**
```html
<div id="event-list" class="max-h-[300px] overflow-y-auto">
    <!-- Populated dynamically -->
</div>
```

**Issues:**
- Doesn't show round information
- Doesn't indicate if archer has a bale assignment
- Doesn't show in-progress rounds

**Improved:**
```javascript
async function loadActiveEvents() {
    try {
        // 1. Fetch recent events
        const response = await fetch(`${API_BASE}/events/recent`);
        const data = await response.json();
        const events = data.events || [];

        // 2. Fetch archer's round history
        const archerId = getArcherCookie();
        const historyResponse = await fetch(`${API_BASE}/archers/${archerId}/history`);
        const historyData = await historyResponse.json();
        const rounds = historyData.history || [];

        // 3. Enrich events with round information
        const enrichedEvents = events.map(event => {
            const eventRounds = rounds.filter(r => r.event_id === event.id);
            const inProgressRound = eventRounds.find(r => (r.ends_completed || 0) < 10);
            
            return {
                ...event,
                hasInProgressRound: !!inProgressRound,
                inProgressRound: inProgressRound,
                roundCount: eventRounds.length
            };
        });

        // 4. Render event list
        renderEventList(enrichedEvents);

    } catch (error) {
        console.error('[loadActiveEvents] Error:', error);
        showError('Failed to load events');
    }
}

function renderEventList(events) {
    const container = document.getElementById('event-list');
    container.innerHTML = '';

    events.forEach(event => {
        const eventCard = document.createElement('div');
        eventCard.className = 'p-3 border border-gray-200 dark:border-gray-700 rounded-lg mb-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700';
        
        let statusBadge = '';
        if (event.hasInProgressRound) {
            const round = event.inProgressRound;
            statusBadge = `
                <span class="px-2 py-1 bg-green-500 text-white text-xs rounded">
                    In Progress: ${round.ends_completed}/10 ends
                </span>
            `;
        }

        eventCard.innerHTML = `
            <div class="font-bold text-gray-800 dark:text-white">${event.name}</div>
            <div class="text-sm text-gray-600 dark:text-gray-300">${event.date}</div>
            ${statusBadge}
        `;

        eventCard.addEventListener('click', async () => {
            if (event.hasInProgressRound) {
                // Resume existing round
                await resumeRound(event.inProgressRound);
            } else {
                // Start new round
                await loadEventById(event.id, event.name, event.entryCode || '');
            }
        });

        container.appendChild(eventCard);
    });
}
```

---

## URL Parameter Handling Refactor

### New `handleUrlParameters()` Function

```javascript
async function handleUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlEventId = urlParams.get('event');
    const urlEntryCode = urlParams.get('code');
    const urlRoundId = urlParams.get('round');
    const urlArcherId = urlParams.get('archer');

    console.log('[handleUrlParameters]', { urlEventId, urlEntryCode, urlRoundId, urlArcherId });

    // Scenario 1: Direct link with round ID (from index.html)
    if (urlEventId && urlRoundId && urlArcherId) {
        console.log('[handleUrlParameters] Direct link detected - loading round');
        return await handleDirectLink(urlEventId, urlRoundId, urlArcherId);
    }

    // Scenario 2: QR code with event and entry code
    if (urlEventId && urlEntryCode) {
        console.log('[handleUrlParameters] QR code detected - loading event');
        return await handleQRCode(urlEventId, urlEntryCode);
    }

    // Scenario 3: Event ID only (legacy)
    if (urlEventId) {
        console.log('[handleUrlParameters] Event ID only - loading event');
        return await loadEventById(urlEventId, '', '');
    }

    // Scenario 4: No URL params - check for existing session
    return false;
}

async function handleDirectLink(eventId, roundId, archerId) {
    try {
        // 1. Check if this matches current session
        const sessionData = localStorage.getItem('current_bale_session');
        if (sessionData) {
            const session = JSON.parse(sessionData);
            if (session.roundId === roundId) {
                console.log('[handleDirectLink] ✅ Matches current session - resuming');
                const restored = await restoreCurrentBaleSession();
                if (restored) {
                    renderView();
                    return true;
                }
            }
        }

        // 2. Fetch round data from server
        console.log('[handleDirectLink] Fetching round data from server');
        const response = await fetch(`${API_BASE}/rounds/${roundId}`, {
            headers: {
                'X-Passcode': getEventEntryCode() || ''
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch round: ${response.status}`);
        }

        const roundData = await response.json();
        console.log('[handleDirectLink] Round data:', roundData);

        // 3. Find archer's bale assignment
        const archerData = roundData.archers.find(a => a.archerId === archerId || a.id === archerId);
        if (!archerData) {
            console.error('[handleDirectLink] Archer not found in round');
            alert('You are not assigned to this round.');
            return false;
        }

        // 4. Set up state
        state.activeEventId = eventId;
        state.roundId = roundId;
        state.baleNumber = archerData.baleNumber;
        state.divisionCode = roundData.division;
        state.assignmentMode = 'pre-assigned';

        // 5. Reconstruct archers for this bale
        const baleArchers = roundData.archers.filter(a => a.baleNumber === archerData.baleNumber);
        state.archers = baleArchers.map(a => buildStateArcherFromRoundData(a));

        // 6. Load scores from server
        await loadExistingScoresForArchers();

        // 7. Go to scoring view
        state.currentView = 'scoring';
        renderView();
        return true;

    } catch (error) {
        console.error('[handleDirectLink] Error:', error);
        alert('Failed to load round. Please try again.');
        return false;
    }
}

async function handleQRCode(eventId, entryCode) {
    try {
        // 1. Save entry code
        localStorage.setItem('event_entry_code', entryCode);
        const metaKey = `event:${eventId}:meta`;
        const meta = { entryCode, loadedAt: new Date().toISOString() };
        localStorage.setItem(metaKey, JSON.stringify(meta));

        // 2. Load event
        const success = await loadEventById(eventId, '', entryCode);
        if (!success) {
            throw new Error('Failed to load event');
        }

        // 3. Check for pre-assigned bale
        if (state.assignmentMode === 'pre-assigned') {
            const archerId = getArcherCookie();
            const baleAssignment = await findArcherBaleAssignment(eventId, archerId);
            if (baleAssignment) {
                console.log('[handleQRCode] Found bale assignment:', baleAssignment.baleNumber);
                await loadPreAssignedBale(eventId, baleAssignment.baleNumber);
            }
        }

        return true;

    } catch (error) {
        console.error('[handleQRCode] Error:', error);
        return false;
    }
}
```

---

## Helper Functions Needed

### 1. Find Archer's Bale Assignment

```javascript
async function findArcherBaleAssignment(eventId, archerId) {
    try {
        const response = await fetch(`${API_BASE}/events/${eventId}/snapshot`, {
            headers: {
                'X-Passcode': getEventEntryCode() || ''
            }
        });

        if (!response.ok) return null;

        const data = await response.json();
        const snapshot = data.snapshot || [];

        // Find archer in snapshot
        for (const divisionGroup of snapshot) {
            for (const baleGroup of divisionGroup.bales || []) {
                const archer = baleGroup.archers.find(a => 
                    a.archerId === archerId || 
                    a.id === archerId ||
                    a.extId === archerId
                );
                if (archer) {
                    return {
                        baleNumber: baleGroup.baleNumber,
                        division: divisionGroup.division,
                        targetAssignment: archer.targetAssignment
                    };
                }
            }
        }

        return null;

    } catch (error) {
        console.error('[findArcherBaleAssignment] Error:', error);
        return null;
    }
}
```

### 2. Build State Archer from Round Data

```javascript
function buildStateArcherFromRoundData(roundArcher) {
    const scoreSheet = createEmptyScoreSheet(state.totalEnds);
    
    // Map ends to score sheet
    if (roundArcher.scorecard && Array.isArray(roundArcher.scorecard.ends)) {
        roundArcher.scorecard.ends.forEach(end => {
            const idx = (end.endNumber || 1) - 1;
            if (idx >= 0 && idx < state.totalEnds) {
                scoreSheet[idx] = [end.a1 || '', end.a2 || '', end.a3 || ''];
            }
        });
    }

    return {
        id: roundArcher.archerId || roundArcher.id,
        roundArcherId: roundArcher.roundArcherId || roundArcher.id,
        firstName: roundArcher.firstName,
        lastName: roundArcher.lastName,
        school: roundArcher.school,
        level: roundArcher.level,
        gender: roundArcher.gender,
        division: roundArcher.division,
        targetAssignment: roundArcher.targetAssignment,
        targetSize: roundArcher.targetSize,
        baleNumber: roundArcher.baleNumber,
        scores: scoreSheet
    };
}
```

### 3. Resume Round from Index

```javascript
async function resumeRound(roundInfo) {
    try {
        console.log('[resumeRound] Resuming:', roundInfo);

        // Build URL with parameters
        const url = `ranking_round_300.html?event=${roundInfo.event_id}&round=${roundInfo.round_id}&archer=${getArcherCookie()}`;
        
        // Navigate to URL (will be handled by handleDirectLink)
        window.location.href = url;

    } catch (error) {
        console.error('[resumeRound] Error:', error);
        alert('Failed to resume round');
    }
}
```

---

## Updated Init Flow

```javascript
async function init() {
    console.log("Initializing Ranking Round 300 App...");

    // 1. Initialize archer cookie
    const archerId = getArcherCookie();
    console.log('[Phase 0] Archer cookie initialized:', archerId);

    // 2. Clean up and load data
    cleanupLegacyStorage();
    loadData();
    renderKeypad();
    wireCoreHandlers();

    // 3. Handle URL parameters FIRST (highest priority)
    const urlHandled = await handleUrlParameters();
    if (urlHandled) {
        console.log('[init] URL parameters handled - skipping other checks');
        return;
    }

    // 4. Try to restore bale session from server
    const sessionRestored = await restoreCurrentBaleSession();
    if (sessionRestored) {
        console.log('[Phase 0] Session restored, showing scoring view');
        renderView();
        return;
    }

    // 5. Check for in-progress work in localStorage
    const localProgress = hasInProgressScorecard();
    if (localProgress) {
        console.log('Found in-progress scorecard - resuming scoring');
        if (getLiveEnabled()) {
            await ensureLiveRoundReady({ promptForCode: false });
        }
        state.currentView = 'scoring';
        renderView();
        return;
    }

    // 6. Check server progress
    if (state.activeEventId || state.selectedEventId) {
        const serverProgress = await hasServerSyncedEnds();
        if (serverProgress) {
            console.log('Found server-synced progress - resuming scoring');
            await proceedWithResume();
            return;
        }
    }

    // 7. No existing work - show event modal
    console.log('[init] No existing work found - showing event modal');
    showEventModal();
}
```

---

## Testing Checklist

### Test 1: Direct Link from Index
- [ ] Click "Resume Ranking Round" from index.html
- [ ] URL: `?event=X&round=Y&archer=Z`
- [ ] **Verify:** Goes directly to scoring view
- [ ] **Verify:** No modal shown
- [ ] **Verify:** Scores loaded from server

### Test 2: QR Code Entry
- [ ] Scan QR code with `?event=X&code=ABC`
- [ ] **Verify:** Entry code saved
- [ ] **Verify:** Event loaded
- [ ] **Verify:** If pre-assigned, bale loaded automatically

### Test 3: Manual Entry
- [ ] Open `ranking_round_300.html` (no params)
- [ ] **Verify:** Event modal shown
- [ ] **Verify:** Can enter code or select event
- [ ] **Verify:** Entry code saved after selection

### Test 4: Pre-Assigned Archer
- [ ] Archer has bale assignment in event
- [ ] Enter event code
- [ ] **Verify:** Bale loaded automatically
- [ ] **Verify:** No manual bale selection needed

### Test 5: Resume Existing Session
- [ ] Have in-progress session
- [ ] Open `ranking_round_300.html`
- [ ] **Verify:** Session restored
- [ ] **Verify:** No modal shown
- [ ] **Verify:** Scores preserved

---

## Implementation Priority

**Phase 1: URL Parameter Handling** (High Priority)
1. ✅ Implement `handleUrlParameters()`
2. ✅ Implement `handleDirectLink()`
3. ✅ Implement `handleQRCode()`
4. ✅ Update `init()` to call `handleUrlParameters()` first

**Phase 2: Event Modal Improvements** (Medium Priority)
5. ✅ Improve "Enter Code" tab with better error handling
6. ✅ Improve "Select Event" tab with round information
7. ✅ Add entry code persistence everywhere

**Phase 3: Pre-Assigned Bale Detection** (Medium Priority)
8. ✅ Implement `findArcherBaleAssignment()`
9. ✅ Auto-load bale for pre-assigned archers
10. ✅ Skip manual bale selection if pre-assigned

**Phase 4: Helper Functions** (Low Priority)
11. ✅ Implement `buildStateArcherFromRoundData()`
12. ✅ Implement `resumeRound()`
13. ✅ Add comprehensive logging

---

## Summary

**Current State:** Event modal shows for all scenarios, doesn't handle rounds or bale assignments

**Desired State:** 
- Direct links go straight to scoring
- QR codes load event and auto-assign bale if applicable
- Manual entry shows improved modal with round information
- Entry code persisted everywhere
- No unnecessary prompts or validation

**Key Changes:**
1. URL parameter handling takes priority in init flow
2. Direct links bypass modal completely
3. Pre-assigned archers get bale loaded automatically
4. Event modal shows round information and in-progress status
5. Entry code saved in multiple locations for resilience

**Files to Modify:**
- `js/ranking_round_300.js` (init, URL handling, event modal)
- No HTML changes needed (modal structure is fine)

**Breaking Changes:** None (additive only)
