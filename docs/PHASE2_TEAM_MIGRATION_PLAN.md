# Phase 2 Team Match Migration Plan

**Date:** November 17, 2025  
**Status:** Planning Document  
**Based on:** Solo Match Migration (completed)

---

## Summary of Solo Match Modifications

### Backend Changes

1. **Database Schema** (`migration_add_match_codes.sql`)
   - Added `match_code` column to `solo_matches` and `team_matches`
   - Created indexes for fast lookup

2. **Authentication** (`api/db.php`)
   - Extended `require_api_key()` to accept match codes from `solo_matches` and `team_matches` tables
   - Match codes work alongside event codes and coach keys

3. **Match Code Generation** (`api/index.php`)
   - Added `generate_solo_match_code()` function
   - Format: `solo-[INITIALS]-[MMDD]` (e.g., `solo-TAJA-1117`)
   - Generated when second archer is added
   - Ensures uniqueness (appends number if duplicate)

4. **Endpoint Updates** (`api/index.php`)
   - `POST /v1/solo-matches`: Allow public creation for standalone matches (no `eventId`)
   - `POST /v1/solo-matches/:id/archers`: 
     - Allow first archer without auth (standalone)
     - Generate match code when second archer added
     - Return match code in response

### Frontend Changes

5. **LiveUpdates API** (`js/live_updates.js`)
   - Added `ensureSoloMatch()` with `forceNew` parameter
   - Added `ensureSoloArcher()` - stores match code when returned
   - Added `postSoloSet()` - posts set scores with offline queue
   - Updated `request()` to automatically use match code for solo match requests
   - Match code stored in `localStorage` as `solo_match_code:{matchId}`

6. **Solo Card** (`js/solo_card.js`)
   - Added database integration state: `matchId`, `matchArcherIds`, `eventId`, `syncStatus`
   - Updated `startScoring()` to:
     - Use `LiveUpdates.ensureSoloMatch()` with `forceNew: true`
     - Use `LiveUpdates.ensureSoloArcher()` for both archers
   - Updated `handleScoreInput()` to use `LiveUpdates.postSoloSet()`
   - Updated `resetMatch()` to clear match code cache
   - Updated `init()` to load from MySQL and restore match from database
   - Changed `saveData()` to only store session state (not scores)

7. **HTML** (`solo_card.html`)
   - Added `<script src="js/live_updates.js"></script>` before other scripts

---

## Team Match Migration Requirements

### Key Differences: Solo vs Team

| Aspect | Solo Match | Team Match |
|--------|-----------|------------|
| **Participants** | 2 archers | 2 teams, 3 archers each |
| **Sets** | 5 sets (best of 5) | 4 sets (best of 4) |
| **Arrows per set** | 3 per archer (6 total) | 1 per archer (3 total per team) |
| **Match code trigger** | When 2nd archer added | When 2nd team fully populated (3 archers) |
| **Match code format** | `solo-[INITIALS]-[MMDD]` | `team-[INITIALS]-[MMDD]` |
| **State structure** | `archer1`, `archer2` | `team1[]`, `team2[]` (arrays) |

---

## Backend Changes Needed

### 1. Match Code Generation Function

**File:** `api/index.php`

Add function similar to `generate_solo_match_code()`:

```php
// Generate match code: team-[INITIALS]-[MMDD]
// Example: team-TASJ-1117 (Team 1: Terry, Adam, Sarah vs Team 2: John, Jane, Joe on Nov 17)
function generate_team_match_code(PDO $pdo, array $team1Archers, array $team2Archers, string $date): string {
    // Extract first letter of first name for each archer (up to 3 per team)
    $initials1 = '';
    $initials2 = '';
    
    foreach ($team1Archers as $archer) {
        $name = $archer['archer_name'] ?? '';
        $parts = explode(' ', $name, 2);
        $first = $parts[0] ?? '';
        $last = $parts[1] ?? '';
        if ($first && $last) {
            $initials1 .= strtoupper(substr($first, 0, 1) . substr($last, 0, 1));
        }
    }
    
    foreach ($team2Archers as $archer) {
        $name = $archer['archer_name'] ?? '';
        $parts = explode(' ', $name, 2);
        $first = $parts[0] ?? '';
        $last = $parts[1] ?? '';
        if ($first && $last) {
            $initials2 .= strtoupper(substr($first, 0, 1) . substr($last, 0, 1));
        }
    }
    
    // Limit to 3 archers per team (6 initials max)
    $initials1 = substr($initials1, 0, 6);
    $initials2 = substr($initials2, 0, 6);
    
    // Get MMDD from date
    $dateParts = explode('-', $date);
    $mmdd = $dateParts[1] . $dateParts[2];
    
    $code = 'team-' . $initials1 . $initials2 . '-' . $mmdd;
    
    // Ensure uniqueness
    $baseCode = $code;
    $counter = 1;
    do {
        $stmt = $pdo->prepare('SELECT id FROM team_matches WHERE match_code = ? LIMIT 1');
        $stmt->execute([$code]);
        if ($stmt->fetch()) {
            $code = $baseCode . $counter;
            $counter++;
        } else {
            break;
        }
    } while (true);
    
    return $code;
}
```

### 2. Update Team Match Endpoints

**File:** `api/index.php`

**A. `POST /v1/team-matches`** - Allow standalone creation:
```php
// POST /v1/team-matches - Create new team match
// Note: For standalone matches (no eventId), we allow creation without auth.
if (preg_match('#^/v1/team-matches$#', $route) && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    $eventId = $input['eventId'] ?? null;
    $date = $input['date'] ?? date('Y-m-d');
    $location = $input['location'] ?? null;
    $maxSets = $input['maxSets'] ?? 4;
    
    // Require auth only if match is linked to an event
    if ($eventId) {
        require_api_key();
    }
    
    // ... rest of creation logic
}
```

**B. `POST /v1/team-matches/:id/teams`** - Allow first team without auth:
```php
// POST /v1/team-matches/:id/teams - Add team to match
// Note: For standalone matches, we allow adding first team without auth.
if (preg_match('#^/v1/team-matches/([0-9a-f-]+)/teams$#i', $route, $m) && $method === 'POST') {
    $matchId = $m[1];
    
    // Check if match exists and if it has a match code
    try {
        $pdo = db();
        $matchCheck = $pdo->prepare('SELECT event_id, match_code FROM team_matches WHERE id=?');
        $matchCheck->execute([$matchId]);
        $matchData = $matchCheck->fetch();
        
        if (!$matchData) {
            json_response(['error' => 'Match not found'], 404);
            exit;
        }
        
        // Require auth if match is linked to event OR if match code already exists
        if ($matchData['event_id'] || $matchData['match_code']) {
            require_api_key();
        }
    } catch (Exception $e) {
        require_api_key();
    }
    
    // ... rest of team creation logic
}
```

**C. `POST /v1/team-matches/:id/teams/:teamId/archers`** - Generate match code when second team is complete:
```php
// POST /v1/team-matches/:id/teams/:teamId/archers - Add archer to team
// Note: Generate match code when second team has 3 archers
if (preg_match('#^/v1/team-matches/([0-9a-f-]+)/teams/([0-9a-f-]+)/archers$#i', $route, $m) && $method === 'POST') {
    // ... existing archer addition logic ...
    
    // After adding archer, check if both teams are complete (3 archers each)
    $teams = $pdo->prepare('SELECT t.id, t.position, COUNT(tma.id) as archer_count 
                             FROM team_match_teams t 
                             LEFT JOIN team_match_archers tma ON t.id = tma.team_id 
                             WHERE t.match_id = ? 
                             GROUP BY t.id, t.position 
                             ORDER BY t.position');
    $teams->execute([$matchId]);
    $teamRows = $teams->fetchAll();
    
    $matchCode = null;
    if (count($teamRows) === 2) {
        $team1Count = (int)($teamRows[0]['archer_count'] ?? 0);
        $team2Count = (int)($teamRows[1]['archer_count'] ?? 0);
        
        // Both teams have 3 archers - generate match code
        if ($team1Count === 3 && $team2Count === 3) {
            // Get all archers for both teams
            $team1Archers = $pdo->prepare('SELECT archer_name FROM team_match_archers tma 
                                            JOIN team_match_teams t ON tma.team_id = t.id 
                                            WHERE t.match_id = ? AND t.position = 1 
                                            ORDER BY tma.position');
            $team1Archers->execute([$matchId]);
            $team1ArcherRows = $team1Archers->fetchAll();
            
            $team2Archers = $pdo->prepare('SELECT archer_name FROM team_match_archers tma 
                                            JOIN team_match_teams t ON tma.team_id = t.id 
                                            WHERE t.match_id = ? AND t.position = 2 
                                            ORDER BY tma.position');
            $team2Archers->execute([$matchId]);
            $team2ArcherRows = $team2Archers->fetchAll();
            
            // Get match date
            $matchStmt = $pdo->prepare('SELECT date FROM team_matches WHERE id = ?');
            $matchStmt->execute([$matchId]);
            $matchDate = $matchStmt->fetchColumn();
            
            if (count($team1ArcherRows) === 3 && count($team2ArcherRows) === 3 && $matchDate) {
                $matchCode = generate_team_match_code($pdo, $team1ArcherRows, $team2ArcherRows, $matchDate);
                
                // Update match with code
                $updateStmt = $pdo->prepare('UPDATE team_matches SET match_code = ? WHERE id = ?');
                $updateStmt->execute([$matchCode, $matchId]);
            }
        }
    }
    
    $response = ['matchArcherId' => $matchArcherId, 'archerId' => $archerId, 'created' => true];
    if ($matchCode) {
        $response['matchCode'] = $matchCode;
    }
    json_response($response, 201);
}
```

---

## Frontend Changes Needed

### 1. LiveUpdates API Methods

**File:** `js/live_updates.js`

Add team match methods (mirror solo match pattern):

```javascript
// =====================================================
// PHASE 2: TEAM MATCH METHODS
// =====================================================

function ensureTeamMatch({ date, location, eventId, maxSets = 4, forceNew = false }) {
    if (!state.config.enabled) return Promise.resolve(null);
    
    const matchKey = `team_match:${eventId || 'standalone'}:${date}`;
    
    if (!forceNew) {
        // Check cache (same pattern as solo)
        const cached = localStorage.getItem(matchKey);
        if (cached) {
            try {
                const cachedData = JSON.parse(cached);
                if (cachedData.matchId && cachedData.eventId === eventId) {
                    console.log('✅ Reusing existing team match:', cachedData.matchId);
                    state.teamMatchId = cachedData.matchId;
                    state.teamEventId = eventId;
                    if (cachedData.matchCode) {
                        state.teamMatchCode = cachedData.matchCode;
                        localStorage.setItem(`team_match_code:${cachedData.matchId}`, cachedData.matchCode);
                    }
                    return Promise.resolve(cachedData.matchId);
                }
            } catch (e) {
                console.warn('Failed to parse cached team match:', e);
            }
        }
    }
    
    return request('/team-matches', 'POST', { date, location, eventId, maxSets })
        .then(json => {
            if (!json || !json.matchId) {
                throw new Error('Team match creation failed: missing matchId');
            }
            state.teamMatchId = json.matchId;
            state.teamEventId = eventId;
            const cacheData = { matchId: json.matchId, eventId, date };
            if (json.matchCode) {
                cacheData.matchCode = json.matchCode;
                localStorage.setItem(`team_match_code:${json.matchId}`, json.matchCode);
                state.teamMatchCode = json.matchCode;
            }
            localStorage.setItem(matchKey, JSON.stringify(cacheData));
            console.log('Team match created:', json.matchId, json.matchCode ? `(code: ${json.matchCode})` : '');
            return json.matchId;
        });
}

function ensureTeam(matchId, teamNumber, teamName, school) {
    if (!state.config.enabled) return Promise.resolve(null);
    
    const mappingKey = `team_match_team:${matchId}:${teamNumber}`;
    const alreadyMapped = localStorage.getItem(mappingKey);
    if (alreadyMapped) {
        try {
            const mapped = JSON.parse(alreadyMapped);
            console.log(`🔄 Team ${teamNumber} already mapped to ${mapped.teamId}`);
            return Promise.resolve(mapped.teamId);
        } catch (e) {
            console.warn('Failed to parse cached team mapping:', e);
        }
    }
    
    return request(`/team-matches/${matchId}/teams`, 'POST', {
        teamName: teamName || null,
        school: school || '',
        position: teamNumber
    }).then(json => {
        if (!json || !json.teamId) {
            throw new Error('Team ensure failed: missing teamId');
        }
        localStorage.setItem(mappingKey, JSON.stringify({ teamId: json.teamId, position: teamNumber }));
        console.log(`✅ Team ${teamNumber} mapped: ${json.teamId}`);
        return json.teamId;
    });
}

function ensureTeamArcher(matchId, teamId, localId, archer, position) {
    if (!state.config.enabled) return Promise.resolve(null);
    
    const mappingKey = `team_archer:${matchId}:${teamId}:${position}`;
    const alreadyMapped = localStorage.getItem(mappingKey);
    if (alreadyMapped) {
        try {
            const mapped = JSON.parse(alreadyMapped);
            console.log(`🔄 Team archer ${localId} position ${position} already mapped to ${mapped.matchArcherId}`);
            return Promise.resolve(mapped.matchArcherId);
        } catch (e) {
            console.warn('Failed to parse cached archer mapping:', e);
        }
    }
    
    return request(`/team-matches/${matchId}/teams/${teamId}/archers`, 'POST', {
        extId: localId,
        firstName: archer.first || archer.firstName || '',
        lastName: archer.last || archer.lastName || '',
        school: archer.school || '',
        level: archer.level || '',
        gender: archer.gender || '',
        position: position
    }).then(json => {
        if (!json || !json.matchArcherId) {
            throw new Error('Team archer ensure failed: missing matchArcherId');
        }
        localStorage.setItem(mappingKey, JSON.stringify({ matchArcherId: json.matchArcherId, position }));
        console.log(`✅ Team archer ${localId} position ${position} mapped: ${json.matchArcherId}`);
        
        // Store match code if returned (generated when second team is complete)
        if (json.matchCode) {
            localStorage.setItem(`team_match_code:${matchId}`, json.matchCode);
            state.teamMatchCode = json.matchCode;
            console.log(`🔑 Team match code stored: ${json.matchCode}`);
        }
        
        return json.matchArcherId;
    });
}

function postTeamSet(matchId, teamId, matchArcherId, setNumber, payload) {
    if (!state.config.enabled) return Promise.resolve();
    
    const reqBody = {
        setNumber,
        a1: payload.a1 || null,
        setTotal: payload.setTotal || 0,
        setPoints: payload.setPoints || 0,
        runningPoints: payload.runningPoints || 0,
        tens: payload.tens || 0,
        xs: payload.xs || 0,
        deviceTs: new Date().toISOString(),
    };
    
    console.log('📤 Posting team set:', { matchId, teamId, matchArcherId, setNumber, payload: reqBody });
    
    const doRequest = () => request(`/team-matches/${matchId}/teams/${teamId}/archers/${matchArcherId}/sets`, 'POST', reqBody)
        .then(() => {
            try {
                window.dispatchEvent(new CustomEvent('teamSyncSuccess', { detail: { matchArcherId, setNumber } }));
            } catch (_) {}
        });
    
    return doRequest().catch(e => {
        const isNetwork = (e && (e.name === 'TypeError' || /NetworkError|Failed to fetch/i.test(String(e))));
        if (isNetwork) {
            try {
                const key = `luq:team:${matchId}`;
                const q = JSON.parse(localStorage.getItem(key) || '[]');
                q.push({ teamId, matchArcherId, setNumber, body: reqBody });
                localStorage.setItem(key, JSON.stringify(q));
                try {
                    window.dispatchEvent(new CustomEvent('teamSyncPending', { detail: { matchArcherId, setNumber } }));
                } catch (_) {}
                return;
            } catch (_) {}
        }
        try {
            window.dispatchEvent(new CustomEvent('teamSyncPending', { detail: { matchArcherId, setNumber } }));
        } catch (_) {}
        throw e;
    });
}

function flushTeamQueue(matchId) {
    if (!state.config.enabled) return Promise.resolve();
    const key = `luq:team:${matchId}`;
    const q = JSON.parse(localStorage.getItem(key) || '[]');
    if (q.length === 0) return Promise.resolve();
    console.log(`🔄 Flushing ${q.length} pending team set scores...`);
    const promises = q.map(item => {
        return request(`/team-matches/${matchId}/teams/${item.teamId}/archers/${item.matchArcherId}/sets`, 'POST', item.body)
            .then(() => {
                const newQ = JSON.parse(localStorage.getItem(key) || '[]');
                const filtered = newQ.filter(x => 
                    x.teamId !== item.teamId || 
                    x.matchArcherId !== item.matchArcherId || 
                    x.setNumber !== item.setNumber
                );
                localStorage.setItem(key, JSON.stringify(filtered));
            });
    });
    return Promise.allSettled(promises).then(() => {
        const remaining = JSON.parse(localStorage.getItem(key) || '[]');
        if (remaining.length === 0) {
            console.log('✅ All pending team scores flushed');
        } else {
            console.warn(`⚠️ ${remaining.length} team scores still pending`);
        }
    });
}
```

**Update `request()` function** to check for team match codes:
```javascript
// In request() function, add team match code check (similar to solo)
if (path.includes('/team-matches/')) {
    const matchIdMatch = path.match(/\/team-matches\/([0-9a-f-]+)/);
    if (matchIdMatch) {
        const matchId = matchIdMatch[1];
        let matchCode = localStorage.getItem(`team_match_code:${matchId}`);
        if (!matchCode && state.teamMatchCode) {
            matchCode = state.teamMatchCode;
        }
        if (matchCode) {
            headers['X-Passcode'] = matchCode;
            console.log('[LiveUpdates] Using team match code for request.');
        }
    }
}
```

**Export functions:**
```javascript
return {
    // ... existing exports ...
    ensureTeamMatch,
    ensureTeam,
    ensureTeamArcher,
    postTeamSet,
    flushTeamQueue
};
```

### 2. Team Card Integration

**File:** `js/team_card.js`

**A. Update state structure:**
```javascript
const state = {
    app: 'TeamCard',
    version: '1.0',
    currentView: 'setup',
    team1: [],
    team2: [],
    scores: {},
    shootOffWinner: null,
    // Phase 2: Database integration
    matchId: null,
    teamIds: { t1: null, t2: null },
    matchArcherIds: { t1: {}, t2: {} }, // { t1: {0: id, 1: id, 2: id}, t2: {...} }
    eventId: null,
    syncStatus: { t1: {}, t2: {} },
    location: ''
};
```

**B. Update `startScoring()`:**
```javascript
async function startScoring() {
    const t1Count = state.team1.length;
    const t2Count = state.team2.length;

    if (t1Count === 0 || t1Count !== t2Count) {
        alert("Please select an equal number of archers for each team (1, 2, or 3).");
        return;
    }
    
    if (!window.LiveUpdates || !window.LiveUpdates.ensureTeamMatch) {
        console.error('LiveUpdates API not available');
        alert('Database connection not available. Please refresh the page.');
        return;
    }
    
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('event') || state.eventId || null;
        const today = new Date().toISOString().split('T')[0];
        
        console.log('Creating team match in database...');
        const matchId = await window.LiveUpdates.ensureTeamMatch({
            date: today,
            location: state.location || '',
            eventId: eventId,
            maxSets: 4,
            forceNew: true
        });
        
        if (!matchId) {
            throw new Error('Failed to create match in database');
        }
        
        state.matchId = matchId;
        state.eventId = eventId;
        
        // Add teams
        console.log('Adding teams to match...');
        const team1Id = await window.LiveUpdates.ensureTeam(matchId, 1, null, state.team1[0]?.school || '');
        const team2Id = await window.LiveUpdates.ensureTeam(matchId, 2, null, state.team2[0]?.school || '');
        
        if (!team1Id || !team2Id) {
            throw new Error('Failed to add teams to match');
        }
        
        state.teamIds = { t1: team1Id, t2: team2Id };
        
        // Add archers to teams
        console.log('Adding archers to teams...');
        for (let i = 0; i < state.team1.length; i++) {
            const a1Id = state.team1[i].id;
            const matchArcherId1 = await window.LiveUpdates.ensureTeamArcher(matchId, team1Id, a1Id, state.team1[i], i + 1);
            if (!matchArcherId1) {
                throw new Error(`Failed to add archer ${i + 1} to team 1`);
            }
            if (!state.matchArcherIds.t1) state.matchArcherIds.t1 = {};
            state.matchArcherIds.t1[i] = matchArcherId1;
        }
        
        for (let i = 0; i < state.team2.length; i++) {
            const a2Id = state.team2[i].id;
            const matchArcherId2 = await window.LiveUpdates.ensureTeamArcher(matchId, team2Id, a2Id, state.team2[i], i + 1);
            if (!matchArcherId2) {
                throw new Error(`Failed to add archer ${i + 1} to team 2`);
            }
            if (!state.matchArcherIds.t2) state.matchArcherIds.t2 = {};
            state.matchArcherIds.t2[i] = matchArcherId2;
        }
        
        // Initialize scores
        const numArrows = t1Count * 2;
        state.scores.t1 = Array(4).fill(null).map(() => Array(numArrows).fill(''));
        state.scores.t2 = Array(4).fill(null).map(() => Array(numArrows).fill(''));
        state.scores.so = { t1: Array(t1Count).fill(''), t2: Array(t1Count).fill('') };
        
        state.syncStatus = { t1: {}, t2: {} };
        state.currentView = 'scoring';
        saveData();
        renderScoringView();
        renderView();
        
        console.log('✅ Team match started successfully:', matchId);
        
        if (window.LiveUpdates.flushTeamQueue) {
            window.LiveUpdates.flushTeamQueue(matchId).catch(e => console.warn('Queue flush failed:', e));
        }
    } catch (e) {
        console.error('Failed to start match:', e);
        alert(`Failed to start match: ${e.message}. Please try again.`);
    }
}
```

**C. Update `handleScoreInput()` to post scores:**
```javascript
function handleScoreInput(e) {
    const input = e.target;
    const { team, end, arrow } = input.dataset;
    
    if (end === 'so') {
        state.scores.so[team][parseInt(arrow, 10)] = input.value;
    } else {
        state.scores[team][parseInt(end, 10)][parseInt(arrow, 10)] = input.value;
    }

    input.parentElement.className = getScoreColor(input.value);
    updateScoreHighlightsAndTotals();
    saveData();
    
    // Phase 2: Post to database
    if (state.matchId && state.teamIds[team] && end !== 'so') {
        const setNumber = parseInt(end, 10) + 1;
        const archerIndex = Math.floor(parseInt(arrow, 10) / 2); // Each archer has 2 arrows per set
        const matchArcherId = state.matchArcherIds[team][archerIndex];
        
        if (matchArcherId && window.LiveUpdates && window.LiveUpdates.postTeamSet) {
            // Calculate set totals, points, etc. (similar to solo)
            const setScores = state.scores[team][parseInt(end, 10)];
            const setTotal = setScores.reduce((sum, s) => sum + parseScoreValue(s), 0);
            // ... calculate set points, running points, tens, xs ...
            
            window.LiveUpdates.postTeamSet(
                state.matchId,
                state.teamIds[team],
                matchArcherId,
                setNumber,
                {
                    a1: input.value,
                    setTotal: setTotal,
                    // ... other calculated values
                }
            ).catch(e => console.warn('Failed to post team set:', e));
        }
    }
}
```

**D. Update `resetMatch()`:**
```javascript
function resetMatch() {
    if(confirm("Are you sure you want to start a new match? This will clear all scores.")) {
        // Clear cached match from localStorage
        const oldMatchId = state.matchId;
        if (oldMatchId) {
            localStorage.removeItem(`team_match_code:${oldMatchId}`);
            // Clear team and archer mappings
            localStorage.removeItem(`team_match_team:${oldMatchId}:1`);
            localStorage.removeItem(`team_match_team:${oldMatchId}:2`);
            for (let i = 0; i < 3; i++) {
                if (state.teamIds.t1) {
                    localStorage.removeItem(`team_archer:${oldMatchId}:${state.teamIds.t1}:${i + 1}`);
                }
                if (state.teamIds.t2) {
                    localStorage.removeItem(`team_archer:${oldMatchId}:${state.teamIds.t2}:${i + 1}`);
                }
            }
        }
        
        // Clear the match cache
        const today = new Date().toISOString().split('T')[0];
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('event') || state.eventId || null;
        const matchKey = `team_match:${eventId || 'standalone'}:${today}`;
        localStorage.removeItem(matchKey);
        
        Object.assign(state, { 
            team1: [], 
            team2: [], 
            scores: {}, 
            shootOffWinner: null, 
            currentView: 'setup',
            matchId: null,
            teamIds: { t1: null, t2: null },
            matchArcherIds: { t1: {}, t2: {} },
            eventId: null,
            syncStatus: { t1: {}, t2: {} }
        });
        localStorage.removeItem(sessionKey);
        renderSetupView();
        renderView();
    }
}
```

**E. Update `init()` to load from MySQL:**
```javascript
async function init() {
    // Load archer list from MySQL
    if (window.ArcherModule && window.ArcherModule.loadFromMySQL) {
        try {
            await window.ArcherModule.loadFromMySQL();
            console.log('✅ Archer list loaded from MySQL');
        } catch (e) {
            console.warn('⚠️ Failed to load archers from MySQL:', e);
            await window.ArcherModule.loadDefaultCSVIfNeeded();
        }
    } else {
        await ArcherModule.loadDefaultCSVIfNeeded();
    }
    
    loadData();
    renderKeypad();
    
    // Restore match from database if matchId exists
    if (state.matchId && window.LiveUpdates && window.LiveUpdates.restoreTeamMatch) {
        // TODO: Implement restoreTeamMatch if needed
    }
    
    if (state.currentView === 'scoring' && state.team1.length > 0 && state.team2.length > 0) {
        renderScoringView();
    } else {
        state.currentView = 'setup';
        renderSetupView();
    }
    renderView();
    
    // ... event listeners ...
}
```

**F. Update `saveData()` to only store session state:**
```javascript
function saveData() {
    // Only store session state, not scores (scores are in database)
    const sessionState = {
        currentView: state.currentView,
        matchId: state.matchId,
        teamIds: state.teamIds,
        matchArcherIds: state.matchArcherIds,
        eventId: state.eventId,
        location: state.location,
        // Store team archer IDs for restoration
        team1: state.team1.map(a => ({ id: a.id, first: a.first, last: a.last })),
        team2: state.team2.map(a => ({ id: a.id, first: a.first, last: a.last }))
    };
    try {
        localStorage.setItem(sessionKey, JSON.stringify(sessionState));
    } catch (e) {
        console.error("Error saving session state to localStorage", e);
    }
}
```

### 3. HTML Update

**File:** `team_card.html`

Add LiveUpdates script:
```html
<script src="js/live_updates.js"></script>
<script src="js/archer_module.js"></script>
<script src="js/team_card.js"></script>
```

---

## Implementation Checklist

### Backend
- [ ] Add `generate_team_match_code()` function
- [ ] Update `POST /v1/team-matches` to allow standalone creation
- [ ] Update `POST /v1/team-matches/:id/teams` to allow first team without auth
- [ ] Update `POST /v1/team-matches/:id/teams/:teamId/archers` to generate match code when second team complete
- [ ] Test match code generation with various team configurations

### Frontend - LiveUpdates
- [ ] Add `ensureTeamMatch()` function
- [ ] Add `ensureTeam()` function
- [ ] Add `ensureTeamArcher()` function
- [ ] Add `postTeamSet()` function
- [ ] Add `flushTeamQueue()` function
- [ ] Update `request()` to use team match codes
- [ ] Export all team match functions

### Frontend - Team Card
- [ ] Update state structure with database fields
- [ ] Update `startScoring()` to create match and add teams/archers
- [ ] Update `handleScoreInput()` to post scores to database
- [ ] Update `resetMatch()` to clear cache
- [ ] Update `init()` to load from MySQL
- [ ] Update `saveData()` to only store session state
- [ ] Add offline queue support

### Testing
- [ ] Test standalone team match creation
- [ ] Test match code generation (when 6th archer added)
- [ ] Test score posting for all archers
- [ ] Test offline queue functionality
- [ ] Test match code authentication
- [ ] Test event-linked matches
- [ ] Test match restoration from database

---

## Notes

- Team match codes are generated when **both teams have 3 archers each** (6th archer added)
- Match code format: `team-[INITIALS]-[MMDD]` where INITIALS can be up to 6 characters (3 archers × 2 initials each)
- Team matches use 1 arrow per archer per set (vs 3 arrows for solo)
- Score calculation needs to aggregate team totals per set
- Offline queue key: `luq:team:{matchId}`

