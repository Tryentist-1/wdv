/**
 * js/team_card.js
 * 
 * Manages the state and UI for the modernized Team Olympic Round scorecard.
 * Integrates with ArcherModule for archer selection and uses a state-driven
 * approach for rendering views, selecting teams, and calculating scores.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- STATE MANAGEMENT ---
    const state = {
        app: 'TeamCard',
        version: '1.0',
        currentView: 'setup', // 'setup' or 'scoring'
        team1: [],            // Array of up to 3 archer objects
        team2: [],            // Array of up to 3 archer objects
        scores: {},           // { t1: [[s1..s6], ...], t2: [[s1..s6], ...], so: {t1:[s1,s2,s3], t2:[s1,s2,s3]} }
        currentSet: 1,
        shootOffWinner: null, // 't1' or 't2' if judge call is needed
        // Phase 2: Database integration
        matchId: null,
        teamIds: { t1: null, t2: null },
        matchArcherIds: { t1: {}, t2: {} }, // { t1: {0: id, 1: id, 2: id}, t2: {...} }
        eventId: null,
        bracketId: null,
        eventName: '',
        bracketName: '',
        syncStatus: { t1: {}, t2: {} },
        location: '',
        events: [],
        brackets: [],
        cardStatus: 'PEND',   // Match card status: PEND, COMP, VRFD, VOID
        locked: false,        // Match locked after verification
        matchOverModalShown: false
    };

    const sessionKey = `teamCard_${new Date().toISOString().split('T')[0]}`;
    const TOTAL_TEAM_SETS = 4;
    const ARROWS_PER_ARCHER = 2;
    const SHOOT_OFF_KEY = 'so';

    /**
     * API base URL for fetch calls. On localhost use api/index.php/v1 so PHP built-in server routes correctly.
     * @returns {string}
     */
    function getApiBase() {
        if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            const port = window.location.port || '8001';
            return `${window.location.protocol}//${window.location.hostname}:${port}/api/index.php/v1`;
        }
        return 'https://archery.tryentist.com/api/v1';
    }

    // --- DOM ELEMENT REFERENCES ---
    const views = {
        setup: document.getElementById('setup-view'),
        scoring: document.getElementById('scoring-view')
    };
    const archerSelectionContainer = document.getElementById('archer-selection-container');
    const searchInput = document.getElementById('archer-search-input');
    const startScoringBtn = document.getElementById('start-scoring-btn');
    const scoreTableContainer = document.getElementById('score-table-container');
    const keypadElement = document.getElementById('score-keypad');
    const editSetupBtn = document.getElementById('edit-setup-btn');
    const newMatchBtn = document.getElementById('new-match-btn');
    const matchSummaryDisplay = document.getElementById('match-summary-display');

    let scoreKeypad = null;

    // --- UTILITY FUNCTIONS ---
    /**
     * Gives 'X' a higher value for sorting/comparison in tie-breaks,
     * without affecting its score value of 10 for totals.
     * @param {string|number} score The arrow score.
     * @returns {number} The value for tie-breaking.
     */
    function getArrowValueForTiebreak(score) {
        const upperScore = String(score).toUpperCase().trim();
        if (upperScore === 'X') return 10.1;
        return parseScoreValue(score);
    }

    // --- VIEW MANAGEMENT & PERSISTENCE ---
    function renderView() {
        Object.values(views).forEach(view => {
            view.classList.add('hidden');
            view.classList.remove('block');
        });
        if (views[state.currentView]) {
            views[state.currentView].classList.remove('hidden');
            views[state.currentView].classList.add('block');
        }
    }
    
    function saveData() {
        // Phase 2: Only store session state, not scores (scores are in database)
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

    function loadData() {
        const storedState = localStorage.getItem(sessionKey);
        if (storedState) {
            try {
                const loadedState = JSON.parse(storedState);
                Object.assign(state, loadedState);
            } catch (e) {
                console.error("Error parsing stored data.", e);
                localStorage.removeItem(sessionKey);
            }
        }
    }

    // --- SETUP VIEW LOGIC ---
    let archerSelector = null;

    function initializeArcherSelector() {
        if (!archerSelectionContainer || typeof ArcherSelector === 'undefined') {
            console.warn('ArcherSelector component unavailable.');
            return;
        }

        archerSelector = ArcherSelector.init(archerSelectionContainer, {
            groups: [
                { id: 't1', label: 'Team 1', buttonText: 'T1', max: 3, accentClass: 'bg-primary text-white' },
                { id: 't2', label: 'Team 2', buttonText: 'T2', max: 3, accentClass: 'bg-danger text-white' }
            ],
            emptyMessage: 'No archers found. Sync your roster to begin.',
            onSelectionChange: handleSelectorChange,
            onFavoriteToggle: handleFavoriteToggle
        });

        refreshArcherRoster();
        syncSelectorSelection();
    }

    function refreshArcherRoster() {
        if (!archerSelector || typeof ArcherModule === 'undefined') return;
        try {
            const roster = ArcherModule.loadList() || [];
            const ctx = getSelectorContext();
            archerSelector.setContext(ctx);
            archerSelector.setRoster(roster);
            if (searchInput && searchInput.value) {
                archerSelector.setFilter(searchInput.value);
            }
        } catch (err) {
            console.warn('Failed to load archer roster for selector:', err);
            archerSelector.setRoster([]);
        }
    }

    function getSelectorContext() {
        if (typeof ArcherModule === 'undefined') {
            return { favorites: new Set(), selfExtId: '' };
        }
        const selfArcher = typeof ArcherModule.getSelfArcher === 'function' ? ArcherModule.getSelfArcher() : null;
        const favorites = new Set((selfArcher?.faves || []).filter(Boolean));
        const selfExtId = selfArcher?.extId || (typeof ArcherModule.getSelfExtId === 'function' ? ArcherModule.getSelfExtId() : '');
        return { favorites, selfExtId };
    }

    async function handleFavoriteToggle(archer) {
        if (!archer || typeof ArcherModule === 'undefined' || typeof ArcherModule.toggleFriend !== 'function') {
            return;
        }
        const extId = archer.extId || archer.id;
        if (!extId) return;
        const selfExtId = typeof ArcherModule.getSelfExtId === 'function' ? ArcherModule.getSelfExtId() : '';
        if (!selfExtId) {
            alert('Set "Who am I" first by selecting yourself in the Archer List.');
            return;
        }
        try {
            await ArcherModule.toggleFriend(extId);
            refreshArcherRoster();
        } catch (error) {
            alert('Unable to update favorites: ' + (error.message || 'Unknown error'));
        }
    }

    function normalizeTeamArcher(archer) {
        if (!archer) return null;
        const normalized = Object.assign({}, archer);
        normalized.id = normalized.id || `${(normalized.first || '').trim()}-${(normalized.last || '').trim()}`;
        normalized.extId = normalized.extId || normalized.id;
        return normalized;
    }

    function syncSelectorSelection() {
        if (!archerSelector) return;
        const selection = {
            t1: state.team1.map(normalizeTeamArcher),
            t2: state.team2.map(normalizeTeamArcher)
        };
        archerSelector.setSelection(selection);
        updateStartButtonState();
    }

    function handleSelectorChange(selectionMap) {
        state.team1 = (selectionMap.t1 || []).map(normalizeTeamArcher);
        state.team2 = (selectionMap.t2 || []).map(normalizeTeamArcher);
        saveData();
        updateStartButtonState();
    }

    function initializeKeypad() {
        if (!keypadElement || typeof ScoreKeypad === 'undefined') return;
        scoreKeypad = ScoreKeypad.init(keypadElement, {
            inputSelector: '#scoring-view input[type=\"text\"]',
            getInputKey: (input) => {
                if (!input || !input.dataset) return '';
                return [
                    input.dataset.team || '',
                    input.dataset.archer || '',
                    input.dataset.end || '',
                    input.dataset.arrow || ''
                ].join('|');
            },
            onShow: () => document.body.classList.add('keypad-visible'),
            onHide: () => document.body.classList.remove('keypad-visible')
        });
    }

    function getArrowsPerSet() {
        const teamSize = Math.max(state.team1.length, state.team2.length, 1);
        return Math.max(2, teamSize * ARROWS_PER_ARCHER);
    }

    function ensureScoreArrays() {
        const arrowSlots = getArrowsPerSet();
        if (!state.scores.t1 || !Array.isArray(state.scores.t1)) {
            state.scores.t1 = Array.from({ length: TOTAL_TEAM_SETS }, () => Array(arrowSlots).fill(''));
        }
        if (!state.scores.t2 || !Array.isArray(state.scores.t2)) {
            state.scores.t2 = Array.from({ length: TOTAL_TEAM_SETS }, () => Array(arrowSlots).fill(''));
        }
        for (let i = 0; i < TOTAL_TEAM_SETS; i++) {
            if (!Array.isArray(state.scores.t1[i])) {
                state.scores.t1[i] = Array(arrowSlots).fill('');
            } else if (state.scores.t1[i].length !== arrowSlots) {
                state.scores.t1[i] = Array.from({ length: arrowSlots }, (_, idx) => state.scores.t1[i][idx] || '');
            }
            if (!Array.isArray(state.scores.t2[i])) {
                state.scores.t2[i] = Array(arrowSlots).fill('');
            } else if (state.scores.t2[i].length !== arrowSlots) {
                state.scores.t2[i] = Array.from({ length: arrowSlots }, (_, idx) => state.scores.t2[i][idx] || '');
            }
        }

        if (!state.scores.so) {
            state.scores.so = { t1: [], t2: [] };
        }
        state.scores.so.t1 = Array.from({ length: state.team1.length || 3 }, (_, idx) => {
            return state.scores.so.t1 && state.scores.so.t1[idx] !== undefined ? state.scores.so.t1[idx] : '';
        });
        state.scores.so.t2 = Array.from({ length: state.team2.length || 3 }, (_, idx) => {
            return state.scores.so.t2 && state.scores.so.t2[idx] !== undefined ? state.scores.so.t2[idx] : '';
        });
    }

    function updateStartButtonState() {
        const t1Count = state.team1.length;
        const t2Count = state.team2.length;
        const isValid = t1Count > 0 && t1Count === t2Count;
        startScoringBtn.disabled = !isValid;
        startScoringBtn.classList.toggle('btn-primary', isValid);
        startScoringBtn.classList.toggle('btn-secondary', !isValid);
    }
    
    // Phase 2: Create match in database before starting
    async function startScoring() {
        const t1Count = state.team1.length;
        const t2Count = state.team2.length;

        if (t1Count === 0 || t1Count !== t2Count) {
            alert("Please select an equal number of archers for each team (1, 2, or 3).");
            return;
        }
        
        // Check if LiveUpdates is available
        if (!window.LiveUpdates || !window.LiveUpdates.ensureTeamMatch) {
            console.error('LiveUpdates API not available');
            alert('Database connection not available. Please refresh the page.');
            return;
        }
        
        try {
            // Get event ID and bracket ID from URL or localStorage (if available)
            const urlParams = new URLSearchParams(window.location.search);
            const eventId = urlParams.get('event') || state.eventId || null;
            const bracketId = urlParams.get('bracket') || state.bracketId || null;
            const today = new Date().toISOString().split('T')[0];
            
            // Create match in database (force new match - don't reuse cache)
            
            console.log('Creating team match in database...');
            const matchId = await window.LiveUpdates.ensureTeamMatch({
                date: today,
                location: state.location || '',
                eventId: eventId,
                bracketId: bracketId,
                maxSets: 4,
                forceNew: true  // Always create a new match when starting scoring
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
            console.log('[TeamCard] Adding archers to teams...');
            for (let i = 0; i < state.team1.length; i++) {
                const a1Id = state.team1[i].id;
                const archerName = `${state.team1[i].first} ${state.team1[i].last}`;
                console.log(`[TeamCard] Adding Team 1 archer ${i + 1}: ${archerName}`);
                const matchArcherId1 = await window.LiveUpdates.ensureTeamArcher(matchId, team1Id, a1Id, state.team1[i], i + 1);
                if (!matchArcherId1) {
                    throw new Error(`Failed to add archer ${i + 1} to team 1`);
                }
                if (!state.matchArcherIds.t1) state.matchArcherIds.t1 = {};
                state.matchArcherIds.t1[i] = matchArcherId1;
                console.log(`[TeamCard] ✅ Team 1 archer ${i + 1} added: ${matchArcherId1}`);
            }
            
            for (let i = 0; i < state.team2.length; i++) {
                const a2Id = state.team2[i].id;
                const archerName = `${state.team2[i].first} ${state.team2[i].last}`;
                console.log(`[TeamCard] Adding Team 2 archer ${i + 1}: ${archerName}`);
                const matchArcherId2 = await window.LiveUpdates.ensureTeamArcher(matchId, team2Id, a2Id, state.team2[i], i + 1);
                if (!matchArcherId2) {
                    throw new Error(`Failed to add archer ${i + 1} to team 2`);
                }
                if (!state.matchArcherIds.t2) state.matchArcherIds.t2 = {};
                state.matchArcherIds.t2[i] = matchArcherId2;
                console.log(`[TeamCard] ✅ Team 2 archer ${i + 1} added: ${matchArcherId2}`);
            }
            
            // Initialize scores
            const numArrows = t1Count * 2; // Each archer shoots 2 arrows per end
            state.scores.t1 = Array(4).fill(null).map(() => Array(numArrows).fill(''));
            state.scores.t2 = Array(4).fill(null).map(() => Array(numArrows).fill(''));
            state.scores.so = { t1: Array(t1Count).fill(''), t2: Array(t1Count).fill('') };
            
            state.syncStatus = { t1: {}, t2: {} };
            state.matchOverModalShown = false;
            state.currentView = 'scoring';
            saveData();
            renderScoringView();
            renderView();
            
            console.log('✅ Team match started successfully:', matchId);
            
            // Flush any pending queue
            if (window.LiveUpdates.flushTeamQueue) {
                window.LiveUpdates.flushTeamQueue(matchId).catch(e => console.warn('Queue flush failed:', e));
            }
        } catch (e) {
            console.error('Failed to start match:', e);
            alert(`Failed to start match: ${e.message}. Please try again.`);
        }
    }

    // --- SCORING VIEW LOGIC ---
    function renderScoringView() {
        renderMatchSummary();
        renderScoreTable();
        updateScoreHighlightsAndTotals();
        updateCompleteMatchButton();
    }

    /**
     * Get event and bracket display names from state.
     * @returns {{ eventName: string, bracketName: string }}
     */
    function getEventBracketLabels() {
        let eventName = state.eventName || '';
        let bracketName = state.bracketName || '';
        if (!eventName && state.eventId && state.events && state.events.length) {
            const ev = state.events.find(e => (e.id || e.eventId) === state.eventId);
            eventName = ev ? (ev.name || ev.eventName || '') : '';
        }
        if (!bracketName && state.bracketId && state.brackets && state.brackets.length) {
            const br = state.brackets.find(b => (b.id || b.bracketId) === state.bracketId);
            bracketName = br ? (br.division || br.bracket_format || '') : '';
        }
        if (!eventName && state.matchData && state.matchData.event_name) eventName = state.matchData.event_name;
        if (!bracketName && state.matchData && state.matchData.bracket_name) bracketName = state.matchData.bracket_name;
        return { eventName, bracketName };
    }

    /**
     * Render match summary header with team names, event/bracket, and bale.
     */
    function renderMatchSummary() {
        if (!state.team1.length || !state.team2.length) return;
        const { eventName, bracketName } = getEventBracketLabels();
        let metaHtml = '';
        const parts = [];
        if (eventName) parts.push(eventName);
        if (bracketName) parts.push(bracketName);
        if (state.baleNumber) {
            const lineLabel = state.lineNumber === 1 ? 'Line 1 (A,B)' : state.lineNumber === 2 ? 'Line 2 (C,D)' : '';
            const waveLabel = state.wave ? ` Wave ${state.wave}` : '';
            parts.push(`Bale ${state.baleNumber}${lineLabel ? ` • ${lineLabel}` : ''}${waveLabel}`);
        }
        if (parts.length) {
            metaHtml = `<div class="text-xs mt-0.5 text-gray-500 dark:text-gray-400 truncate">${parts.join(' • ')}</div>`;
        }
        matchSummaryDisplay.innerHTML = `
            <div class="font-semibold">Team 1 vs Team 2</div>
            ${metaHtml}
        `;
    }

    /**
     * Builds a single arrow <td> with archer-pair shading and group borders.
     * @param {string} team - 't1' or 't2'
     * @param {number|string} endIdx - End index (0-3) or 'so'
     * @param {number} arrowIdx - Arrow column index (0-5)
     * @param {string} value - Score value
     * @returns {string} HTML for the td element
     */
    function buildArrowCell(team, endIdx, arrowIdx, value) {
        const scoreColor = typeof getScoreColor === 'function' ? getScoreColor(value) : '';
        const isAlt = (arrowIdx === 2 || arrowIdx === 3) && !value;
        const isGroupStart = arrowIdx === 0 || arrowIdx === 2 || arrowIdx === 4;
        const altCls = isAlt ? 'archer-pair-alt' : '';
        const groupCls = isGroupStart ? 'archer-group-start' : '';
        return `<td class="p-0 border-r border-gray-200 dark:border-gray-600 ${altCls} ${groupCls} ${scoreColor}"><input type="text" class="score-input w-full h-full min-h-[44px] text-center font-bold border-none bg-transparent" data-team="${team}" data-end="${endIdx}" data-arrow="${arrowIdx}" value="${value || ''}" readonly></td>`;
    }

    function renderScoreTable() {
        // Ensure scores arrays are initialized
        if (!state.scores.t1 || !Array.isArray(state.scores.t1)) {
            state.scores.t1 = [[], [], [], []];
        }
        if (!state.scores.t2 || !Array.isArray(state.scores.t2)) {
            state.scores.t2 = [[], [], [], []];
        }
        for (let i = 0; i < 4; i++) {
            if (!state.scores.t1[i] || !Array.isArray(state.scores.t1[i])) {
                state.scores.t1[i] = ['', '', '', '', '', ''];
            }
            if (!state.scores.t2[i] || !Array.isArray(state.scores.t2[i])) {
                state.scores.t2[i] = ['', '', '', '', '', ''];
            }
        }
        if (!state.scores.so) {
            state.scores.so = { t1: ['', '', ''], t2: ['', '', ''] };
        }
        if (!state.scores.so.t1 || !Array.isArray(state.scores.so.t1)) {
            state.scores.so.t1 = ['', '', ''];
        }
        if (!state.scores.so.t2 || !Array.isArray(state.scores.so.t2)) {
            state.scores.so.t2 = ['', '', ''];
        }

        const t1Names = state.team1.map(a => `${a.first} ${a.last.charAt(0)}`).join(' | ');
        const t2Names = state.team2.map(a => `${a.first} ${a.last.charAt(0)}`).join(' | ');

        const COLS = 8;

        let tableHTML = `<table class="w-full border-collapse text-sm" id="team_round_table">
            <thead class="sticky top-0 z-10">
                <tr class="bg-gray-700 dark:bg-gray-900 text-white text-xs">
                    <th class="px-1 py-1 text-center font-bold border-r border-gray-500" style="width:28px">Team</th>
                    <th class="px-1 py-1 text-center font-bold border-r border-gray-500 archer-group-start">A1</th>
                    <th class="px-1 py-1 text-center font-bold border-r border-gray-500">A2</th>
                    <th class="px-1 py-1 text-center font-bold border-r border-gray-500 archer-group-start">A3</th>
                    <th class="px-1 py-1 text-center font-bold border-r border-gray-500">A4</th>
                    <th class="px-1 py-1 text-center font-bold border-r border-gray-500 archer-group-start">A5</th>
                    <th class="px-1 py-1 text-center font-bold border-r border-gray-500">A6</th>
                    <th class="px-1 py-1 text-center font-bold" style="width:40px">Tot</th>
                </tr>
            </thead><tbody>`;

        for (let i = 0; i < 4; i++) {
            const setNumber = i + 1;
            const syncStatuses = [];
            for (let archIdx = 0; archIdx < 3; archIdx++) {
                const t1Status = state.syncStatus?.t1?.[archIdx]?.[setNumber] || '';
                const t2Status = state.syncStatus?.t2?.[archIdx]?.[setNumber] || '';
                if (t1Status) syncStatuses.push(t1Status);
                if (t2Status) syncStatuses.push(t2Status);
            }
            const syncIcon = getSyncStatusIcon(syncStatuses);

            // Team 1 row
            tableHTML += `<tr class="team-row-t1 border-b border-gray-200 dark:border-gray-600">
                <td class="team-label-t1 px-1 py-0.5 text-center text-xs border-r border-gray-300 dark:border-gray-600" style="width:28px">T1</td>
                ${state.scores.t1[i].map((s, a) => buildArrowCell('t1', i, a, s)).join('')}
                <td class="px-1 py-0.5 text-center font-bold border-l border-gray-300 dark:border-gray-600" id="t1-e${setNumber}-total" style="width:40px"></td>
            </tr>`;

            // Team 2 row
            tableHTML += `<tr class="team-row-t2 border-b border-gray-200 dark:border-gray-600">
                <td class="team-label-t2 px-1 py-0.5 text-center text-xs border-r border-gray-300 dark:border-gray-600" style="width:28px">T2</td>
                ${state.scores.t2[i].map((s, a) => buildArrowCell('t2', i, a, s)).join('')}
                <td class="px-1 py-0.5 text-center font-bold border-l border-gray-300 dark:border-gray-600" id="t2-e${setNumber}-total" style="width:40px"></td>
            </tr>`;

            // End summary row
            tableHTML += `<tr class="end-summary-row">
                <td colspan="${COLS}" class="px-2 py-1 text-center text-gray-700 dark:text-gray-300">
                    <span class="font-semibold">End ${setNumber}</span>
                    <span class="mx-1">|</span>
                    Pts: <span id="t1-e${setNumber}-setpts" class="font-bold">-</span> - <span id="t2-e${setNumber}-setpts" class="font-bold">-</span>
                    <span class="ml-2" id="sync-e${setNumber}" data-set="${setNumber}">${syncIcon}</span>
                </td>
            </tr>`;

            // End divider (except after last end)
            if (i < 3) {
                tableHTML += `<tr class="end-divider"><td colspan="${COLS}"></td></tr>`;
            }
        }

        tableHTML += `</tbody>`;

        // Shoot-off section (separate tbody for easy show/hide)
        const soSyncStatuses = [];
        for (let archIdx = 0; archIdx < 3; archIdx++) {
            const t1Status = state.syncStatus?.t1?.[archIdx]?.[5] || '';
            const t2Status = state.syncStatus?.t2?.[archIdx]?.[5] || '';
            if (t1Status) soSyncStatuses.push(t1Status);
            if (t2Status) soSyncStatuses.push(t2Status);
        }
        const soSyncIcon = getSyncStatusIcon(soSyncStatuses);

        tableHTML += `<tbody id="shoot-off" class="hidden">
            <tr class="end-divider"><td colspan="${COLS}"></td></tr>
            <tr class="team-row-t1 border-b border-gray-200 dark:border-gray-600">
                <td class="team-label-t1 px-1 py-0.5 text-center text-xs border-r border-gray-300 dark:border-gray-600" style="width:28px">T1</td>
                ${state.scores.so.t1.map((s, a) => buildArrowCell('t1', 'so', a, s)).join('')}
                <td colspan="3" class="border-r border-gray-200 dark:border-gray-600"></td>
                <td class="px-1 py-0.5 text-center font-bold border-l border-gray-300 dark:border-gray-600" id="t1-so-total" style="width:40px"></td>
            </tr>
            <tr class="team-row-t2 border-b border-gray-200 dark:border-gray-600">
                <td class="team-label-t2 px-1 py-0.5 text-center text-xs border-r border-gray-300 dark:border-gray-600" style="width:28px">T2</td>
                ${state.scores.so.t2.map((s, a) => buildArrowCell('t2', 'so', a, s)).join('')}
                <td colspan="3" class="border-r border-gray-200 dark:border-gray-600"></td>
                <td class="px-1 py-0.5 text-center font-bold border-l border-gray-300 dark:border-gray-600" id="t2-so-total" style="width:40px"></td>
            </tr>
            <tr class="end-summary-row">
                <td colspan="${COLS}" class="px-2 py-1 text-center text-gray-700 dark:text-gray-300">
                    <span class="font-semibold">Shoot-Off</span>
                    <span class="mx-1">|</span>
                    <span id="so-winner-cell"><span id="so-winner-text"></span></span>
                    <span class="ml-2" id="sync-so" data-set="5">${soSyncIcon}</span>
                </td>
            </tr>
        </tbody>`;

        // Footer
        tableHTML += `<tfoot class="bg-gray-200 dark:bg-gray-600">
                <tr>
                    <td colspan="${COLS}" class="px-2 py-3 text-center dark:text-white">
                        <span class="font-bold">Match Score:</span>
                        <span class="ml-2 text-lg font-bold" id="t1-match-score"></span>
                        <span class="mx-1">-</span>
                        <span class="text-lg font-bold" id="t2-match-score"></span>
                    </td>
                </tr>
                <tr id="judge-call-row" class="hidden">
                    <td colspan="${COLS}" class="text-center p-2 bg-yellow-100 dark:bg-yellow-900/20">
                        <span class="font-bold mr-2">Judge Call:</span>
                        <span class="tie-breaker-controls">
                            <button class="px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold transition-colors min-h-[44px]" data-winner="t1">Team 1 Wins</button>
                            <button class="px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold transition-colors min-h-[44px]" data-winner="t2">Team 2 Wins</button>
                        </span>
                    </td>
                </tr>
                <tr><td colspan="${COLS}" id="match-result" class="px-2 py-2 text-center font-bold"></td></tr>
            </tfoot>
        </table>`;

        // Team name legend above table
        const legendHTML = `<div class="flex justify-between items-center px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
            <span><span class="inline-block w-3 h-3 rounded-sm mr-1" style="background:var(--color-team1-accent)"></span><strong>T1:</strong> ${t1Names}</span>
            <span><span class="inline-block w-3 h-3 rounded-sm mr-1" style="background:var(--color-team2-accent)"></span><strong>T2:</strong> ${t2Names}</span>
        </div>`;

        scoreTableContainer.innerHTML = legendHTML + tableHTML;
    }

    function updateScoreHighlightsAndTotals() {
        let t1MatchScore = 0, t2MatchScore = 0, matchOver = false, winner = null;
        for (let i = 0; i < 4; i++) {
            const endScoresT1 = state.scores.t1[i], endScoresT2 = state.scores.t2[i];
            const endComplete = endScoresT1.every(s => s !== '') && endScoresT2.every(s => s !== '');
            const t1EndTotal = endScoresT1.reduce((sum, s) => sum + parseScoreValue(s), 0);
            const t2EndTotal = endScoresT2.reduce((sum, s) => sum + parseScoreValue(s), 0);
            document.getElementById(`t1-e${i+1}-total`).textContent = t1EndTotal;
            document.getElementById(`t2-e${i+1}-total`).textContent = t2EndTotal;
            let t1SetPoints = 0, t2SetPoints = 0;
            if (!matchOver && endComplete) {
                if (t1EndTotal > t2EndTotal) t1SetPoints = 2;
                else if (t2EndTotal > t1EndTotal) t2SetPoints = 2;
                else { t1SetPoints = 1; t2SetPoints = 1; }
                t1MatchScore += t1SetPoints;
                t2MatchScore += t2SetPoints;
                if (t1MatchScore >= 5 || t2MatchScore >= 5) {
                    matchOver = true;
                    winner = t1MatchScore > t2MatchScore ? 't1' : 't2';
                }
            }
            document.getElementById(`t1-e${i+1}-setpts`).textContent = endComplete ? t1SetPoints : '-';
            document.getElementById(`t2-e${i+1}-setpts`).textContent = endComplete ? t2SetPoints : '-';
        }

        document.getElementById('t1-match-score').textContent = t1MatchScore;
        document.getElementById('t2-match-score').textContent = t2MatchScore;
        const headerT1 = document.getElementById('header-t1-score');
        const headerT2 = document.getElementById('header-t2-score');
        if (headerT1) headerT1.textContent = t1MatchScore;
        if (headerT2) headerT2.textContent = t2MatchScore;

        const shootOffEl = document.getElementById('shoot-off');
        const judgeCallRow = document.getElementById('judge-call-row');
        judgeCallRow.classList.add('hidden');
        judgeCallRow.classList.remove('table-row');

        if (!matchOver && t1MatchScore === 4 && t2MatchScore === 4) {
            shootOffEl.classList.remove('hidden');
            shootOffEl.classList.add('table-row-group');
            const t1SoTotal = state.scores.so.t1.reduce((sum, s) => sum + parseScoreValue(s), 0);
            const t2SoTotal = state.scores.so.t2.reduce((sum, s) => sum + parseScoreValue(s), 0);
            document.getElementById('t1-so-total').textContent = t1SoTotal;
            document.getElementById('t2-so-total').textContent = t2SoTotal;
            const soComplete = state.scores.so.t1.every(s => s !== '') && state.scores.so.t2.every(s => s !== '');
            
            const soWinnerText = document.getElementById('so-winner-text');
            
            if (soComplete) {
                if (t1SoTotal > t2SoTotal) { 
                    winner = 't1'; 
                    matchOver = true; 
                    soWinnerText.textContent = 'T1 Wins S.O.';
                } else if (t2SoTotal > t1SoTotal) { 
                    winner = 't2'; 
                    matchOver = true; 
                    soWinnerText.textContent = 'T2 Wins S.O.';
                } else { // Tied shoot-off total, check highest arrow using the correct tie-break logic
                    const t1Max = Math.max(...state.scores.so.t1.map(getArrowValueForTiebreak));
                    const t2Max = Math.max(...state.scores.so.t2.map(getArrowValueForTiebreak));

                    if (t1Max > t2Max) {
                        winner = 't1';
                        matchOver = true;
                        soWinnerText.textContent = 'T1 Wins (High Arrow)';
                    } else if (t2Max > t1Max) {
                        winner = 't2';
                        matchOver = true;
                        soWinnerText.textContent = 'T2 Wins (High Arrow)';
                    } else { // Still tied, must be a judge call
                        if (state.shootOffWinner) {
                            winner = state.shootOffWinner;
                            matchOver = true;
                            soWinnerText.textContent = `T${winner === 't1' ? 1 : 2} Wins (Closest)`;
                        } else {
                            soWinnerText.textContent = 'Tied!';
                            judgeCallRow.classList.remove('hidden');
                            judgeCallRow.classList.add('table-row');
                        }
                    }
                }
            } else {
                soWinnerText.textContent = 'Enter S.O. Scores';
            }
        } else {
            shootOffEl.classList.add('hidden');
            shootOffEl.classList.remove('table-row-group');
        }

        const matchResultEl = document.getElementById('match-result');
        const dbMatchComplete = isMatchComplete();
        const shouldLock = matchOver || dbMatchComplete;
        let displayWinner = winner;
        if (!displayWinner && state.matchData && state.matchData.winner_team_id && state.teamIds) {
            displayWinner = state.teamIds.t1 === state.matchData.winner_team_id ? 't1' : 't2';
        }
        if (shouldLock) {
            matchResultEl.textContent = `Match Over: Team ${displayWinner === 't1' ? 1 : 2} Wins!`;
            matchResultEl.classList.add('text-success');
            matchResultEl.classList.remove('text-gray-500');
            if (scoreTableContainer) scoreTableContainer.classList.add('match-over-locked');
            const isAlreadyCompleted = state.cardStatus === 'COMP' || state.cardStatus === 'VRFD';
            if (!isAlreadyCompleted && !state.matchOverModalShown && matchOver) {
                state.matchOverModalShown = true;
                const modal = document.getElementById('match-over-modal');
                const winnerText = document.getElementById('match-over-winner-text');
                if (modal && winnerText) {
                    winnerText.textContent = `Team ${displayWinner === 't1' ? 1 : 2} Wins!`;
                    modal.classList.remove('hidden');
                    modal.classList.add('flex');
                }
            }
        } else {
            matchResultEl.textContent = 'Match in Progress...';
            matchResultEl.classList.add('text-gray-500');
            matchResultEl.classList.remove('text-success');
            if (scoreTableContainer) scoreTableContainer.classList.remove('match-over-locked');
        }
    }

    /**
     * Check if match is complete (winner determined)
     * Checks both state.scores and match data from database
     */
    function isMatchComplete() {
        // First check if we have match data with winner_team_id or sets_won from database
        if (state.matchData) {
            // Check if winner_team_id is set
            if (state.matchData.winner_team_id) {
                return true;
            }
            // Check if any team has sets_won >= 5
            if (state.matchData.teams && Array.isArray(state.matchData.teams)) {
                for (const team of state.matchData.teams) {
                    if ((team.sets_won || 0) >= 5) {
                        return true;
                    }
                }
            }
        }
        
        // Fallback: Check state.scores (for matches being scored in real-time)
        let t1MatchScore = 0, t2MatchScore = 0, matchOver = false, winner = null;
        for (let i = 0; i < 4; i++) {
            const endScoresT1 = state.scores.t1 && state.scores.t1[i];
            const endScoresT2 = state.scores.t2 && state.scores.t2[i];
            if (!endScoresT1 || !endScoresT2) continue;
            
            const endComplete = endScoresT1.every(s => s !== '' && s !== null) && endScoresT2.every(s => s !== '' && s !== null);
            if (!matchOver && endComplete) {
                const t1EndTotal = endScoresT1.reduce((sum, s) => sum + parseScoreValue(s), 0);
                const t2EndTotal = endScoresT2.reduce((sum, s) => sum + parseScoreValue(s), 0);
                let t1SetPoints = 0, t2SetPoints = 0;
                if (t1EndTotal > t2EndTotal) t1SetPoints = 2;
                else if (t2EndTotal > t1EndTotal) t2SetPoints = 2;
                else { t1SetPoints = 1; t2SetPoints = 1; }
                t1MatchScore += t1SetPoints;
                t2MatchScore += t2SetPoints;
                if (t1MatchScore >= 5 || t2MatchScore >= 5) {
                    matchOver = true;
                    winner = t1MatchScore > t2MatchScore ? 't1' : 't2';
                }
            }
        }
        // Check shoot-off if tied at 4-4
        if (!matchOver && t1MatchScore === 4 && t2MatchScore === 4) {
            const soComplete = state.scores.so && state.scores.so.t1 && state.scores.so.t2 &&
                state.scores.so.t1.every(s => s !== '' && s !== null) && state.scores.so.t2.every(s => s !== '' && s !== null);
            if (soComplete) {
                const t1SoTotal = state.scores.so.t1.reduce((sum, s) => sum + parseScoreValue(s), 0);
                const t2SoTotal = state.scores.so.t2.reduce((sum, s) => sum + parseScoreValue(s), 0);
                if (t1SoTotal > t2SoTotal || t2SoTotal > t1SoTotal || state.shootOffWinner) {
                    matchOver = true;
                    winner = state.shootOffWinner || (t1SoTotal > t2SoTotal ? 't1' : 't2');
                }
            }
        }
        return matchOver && winner !== null;
    }

    /**
     * Show Complete Match confirmation modal
     */
    function showCompleteMatchModal() {
        const modal = document.getElementById('complete-match-modal');
        
        if (!modal) {
            console.error('[showCompleteMatchModal] Modal not found');
            return;
        }
        
        // Check if match is actually complete
        if (!isMatchComplete()) {
            alert('Match is not complete. Please finish all sets and determine a winner before marking as complete.');
            return;
        }
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    function hideCompleteMatchModal() {
        const modal = document.getElementById('complete-match-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }

    function showTeamCompleteSuccessModal() {
        const modal = document.getElementById('team-complete-success-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }

    function hideTeamCompleteSuccessModal() {
        const modal = document.getElementById('team-complete-success-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }

    /**
     * Mark the current match as Complete
     */
    async function completeMatch() {
        if (!state.matchId) {
            alert('No match ID found. Please ensure match is saved to database.');
            hideCompleteMatchModal();
            return;
        }
        
        // Check if match is actually complete
        if (!isMatchComplete()) {
            alert('Match is not complete. Please finish all sets and determine a winner before marking as complete.');
            hideCompleteMatchModal();
            return;
        }
        
        try {
            // Build headers
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Add event code if match is part of an event
            if (state.eventId) {
                const entryCode = localStorage.getItem('event_entry_code') || localStorage.getItem('coach_passcode');
                if (entryCode) {
                    headers['X-Passcode'] = entryCode;
                }
            }
            
            const response = await fetch(`${getApiBase()}/team-matches/${state.matchId}/status`, {
                method: 'PATCH',
                headers: headers,
                body: JSON.stringify({
                    cardStatus: 'COMP'
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            // Update local state
            state.cardStatus = result.cardStatus || 'COMP';
            state.status = result.status || 'Completed';
            state.locked = result.locked || false;
            
            console.log('[completeMatch] Status updated:', result);
            
            updateCompleteMatchButton();
            hideCompleteMatchModal();
            showTeamCompleteSuccessModal();
            return true;
        } catch (err) {
            console.error('[completeMatch] Failed:', err);
            alert('Failed to mark match as complete: ' + err.message);
            return false;
        }
    }

    /**
     * Update Complete Match button state
     */
    function updateCompleteMatchButton() {
        const completeBtn = document.getElementById('complete-match-btn');
        if (!completeBtn) return;
        
        const isComplete = isMatchComplete();
        const isAlreadyCompleted = state.cardStatus === 'COMP';
        const isVerified = state.cardStatus === 'VRFD';
        const isLocked = state.locked || isVerified;
        
        if (isLocked) {
            completeBtn.disabled = true;
            completeBtn.innerHTML = '<i class="fas fa-lock mr-1"></i> Verified';
            completeBtn.classList.remove('bg-primary', 'hover:bg-primary-dark');
            completeBtn.classList.add('bg-gray-500', 'hover:bg-gray-600');
        } else if (isAlreadyCompleted) {
            completeBtn.disabled = true;
            completeBtn.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Completed';
            completeBtn.classList.remove('bg-primary', 'hover:bg-primary-dark');
            completeBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
        } else if (isComplete) {
            completeBtn.disabled = false;
            completeBtn.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Complete';
            completeBtn.classList.remove('bg-gray-500', 'hover:bg-gray-600', 'bg-blue-500', 'hover:bg-blue-600');
            completeBtn.classList.add('bg-primary', 'hover:bg-primary-dark');
        } else {
            completeBtn.disabled = true;
            completeBtn.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Complete';
        }
    }
    
    async function handleScoreInput(e) {
        const input = e.target;
        const { team, end, arrow } = input.dataset;
        if (end === 'so') {
            state.scores.so[team][parseInt(arrow, 10)] = input.value;
        } else {
            state.scores[team][parseInt(end, 10)][parseInt(arrow, 10)] = input.value;
        }

        // Update score color classes on the cell (td element) - matching cf3a8cb approach
        if (input && input.parentElement && typeof getScoreColor === 'function') {
            const cell = input.parentElement;
            // Remove archer-pair-alt when cell has a score (so score color shows correctly)
            const arrowIdx = parseInt(input.dataset.arrow, 10);
            const isA3A4 = arrowIdx === 2 || arrowIdx === 3;
            if (input.value) cell.classList.remove('archer-pair-alt');
            else if (isA3A4) cell.classList.add('archer-pair-alt');
            // Remove old score color classes
            cell.classList.remove('bg-score-gold', 'bg-score-red', 'bg-score-blue', 'bg-score-black', 'bg-score-white', 'text-black', 'text-white', 'dark:text-black');
            // Add new score color classes
            const scoreClasses = getScoreColor(input.value).split(' ');
            scoreClasses.forEach(cls => {
                if (cls) cell.classList.add(cls);
            });
        }
        updateScoreHighlightsAndTotals();
        updateCompleteMatchButton();
        saveData();
        
        // Phase 2: Post to database if match is active
        if (state.matchId && state.teamIds[team] && end !== 'so' && window.LiveUpdates && window.LiveUpdates.postTeamSet) {
            const setNumber = parseInt(end, 10) + 1;
            const arrowIdx = parseInt(arrow, 10);
            const archerIndex = Math.floor(arrowIdx / ARROWS_PER_ARCHER);
            const matchArcherId = state.matchArcherIds[team] && state.matchArcherIds[team][archerIndex];
            
            if (matchArcherId) {
                // Get all arrows for this set (team total)
                const setScores = state.scores[team][parseInt(end, 10)];
                const setTotal = setScores.reduce((sum, s) => sum + parseScoreValue(s), 0);
                
                // Calculate set points (compare with opponent team)
                let setPoints = 0;
                let runningPoints = 0;
                const opponentTeam = team === 't1' ? 't2' : 't1';
                const opponentScores = state.scores[opponentTeam][parseInt(end, 10)];
                const opponentTotal = opponentScores.reduce((sum, s) => sum + parseScoreValue(s), 0);
                
                // Only calculate if both teams have all arrows entered
                const allArrowsEntered = setScores.every(s => s !== '' && s !== null);
                const opponentAllEntered = opponentScores.every(s => s !== '' && s !== null);
                
                if (allArrowsEntered && opponentAllEntered) {
                    if (setTotal > opponentTotal) setPoints = 2;
                    else if (setTotal < opponentTotal) setPoints = 0;
                    else setPoints = 1;
                    
                    // Calculate running points (sum of all previous sets)
                    const currentSet = parseInt(end, 10);
                    for (let i = 0; i <= currentSet; i++) {
                        const myScores = state.scores[team][i];
                        const oppScores = state.scores[opponentTeam][i];
                        const myTotal = myScores.reduce((sum, s) => sum + parseScoreValue(s), 0);
                        const oppTotal = oppScores.reduce((sum, s) => sum + parseScoreValue(s), 0);
                        if (myTotal > oppTotal) runningPoints += 2;
                        else if (myTotal === oppTotal) runningPoints += 1;
                    }
                }
                
                // Read both arrows for this archer from state (UPSERT will set both)
                const arrowStartIdx = archerIndex * ARROWS_PER_ARCHER;
                const a1Value = setScores[arrowStartIdx] || null;
                const a2Value = setScores[arrowStartIdx + 1] || null;
                
                // Count tens and Xs across both of this archer's arrows
                const a1Score = parseScoreValue(a1Value);
                const a2Score = parseScoreValue(a2Value);
                const tens = (a1Score === 10 ? 1 : 0) + (a2Score === 10 ? 1 : 0);
                const xs = (String(a1Value).toUpperCase() === 'X' ? 1 : 0) + (String(a2Value).toUpperCase() === 'X' ? 1 : 0);
                
                // Post this archer's set score (2 arrows per archer per set)
                try {
                    console.log(`[TeamCard] 📤 Posting score: Team=${team}, Archer=${archerIndex + 1}, Set=${setNumber}, a1=${a1Value}, a2=${a2Value}`);
                    updateSyncStatus(team, archerIndex, setNumber, 'pending');
                    await window.LiveUpdates.postTeamSet(state.matchId, state.teamIds[team], matchArcherId, setNumber, {
                        a1: a1Value,
                        a2: a2Value,
                        setTotal: allArrowsEntered && opponentAllEntered ? setTotal : 0,
                        setPoints: allArrowsEntered && opponentAllEntered ? setPoints : 0,
                        runningPoints: allArrowsEntered && opponentAllEntered ? runningPoints : 0,
                        tens,
                        xs
                    });
                    updateSyncStatus(team, archerIndex, setNumber, 'synced');
                    console.log(`[TeamCard] ✅ Score synced successfully: Team=${team}, Archer=${archerIndex + 1}, Set=${setNumber}`);
                } catch (e) {
                    console.error(`[TeamCard] ❌ Failed to sync score: Team=${team}, Archer=${archerIndex + 1}, Set=${setNumber}:`, e);
                    updateSyncStatus(team, archerIndex, setNumber, 'failed');
                }
            }
        }
    }
    
    // Phase 2: Helper function to parse score value
    function parseScoreValue(score) {
        if (!score || score === '') return 0;
        const upper = String(score).toUpperCase();
        if (upper === 'X' || upper === '10') return 10;
        if (upper === 'M') return 0;
        const num = parseInt(score, 10);
        return isNaN(num) ? 0 : num;
    }
    
    // Phase 2: Update sync status for UI feedback
    function updateSyncStatus(team, archerIndex, setNumber, status) {
        if (!state.syncStatus[team]) state.syncStatus[team] = {};
        if (!state.syncStatus[team][archerIndex]) state.syncStatus[team][archerIndex] = {};
        state.syncStatus[team][archerIndex][setNumber] = status;
        
        // Update UI indicator
        const setId = setNumber === 5 ? 'so' : setNumber;
        const syncCell = document.getElementById(`sync-e${setId}`);
        if (syncCell) {
            // Get all sync statuses for this set (all archers in both teams)
            const syncStatuses = [];
            for (let archIdx = 0; archIdx < 3; archIdx++) {
                const t1Status = state.syncStatus?.t1?.[archIdx]?.[setNumber] || '';
                const t2Status = state.syncStatus?.t2?.[archIdx]?.[setNumber] || '';
                if (t1Status) syncStatuses.push(t1Status);
                if (t2Status) syncStatuses.push(t2Status);
            }
            syncCell.innerHTML = getSyncStatusIcon(syncStatuses);
        }
    }
    
    // Phase 2: Get sync status icon (shows worst status across all archers)
    function getSyncStatusIcon(statuses) {
        // Determine overall status (failed > pending > synced > none)
        let overallStatus = '';
        if (statuses.includes('failed')) {
            overallStatus = 'failed';
        } else if (statuses.includes('pending')) {
            overallStatus = 'pending';
        } else if (statuses.includes('synced')) {
            overallStatus = 'synced';
        }
        
        const icons = {
            'synced': '<span class="text-success text-xl" title="Synced">✓</span>',
            'pending': '<span class="text-warning text-xl" title="Pending">⟳</span>',
            'failed': '<span class="text-danger text-xl" title="Failed">✗</span>',
            '': '<span class="text-gray-400 dark:text-gray-500 text-xl" title="Not Synced">○</span>'
        };
        return icons[overallStatus] || icons[''];
    }
    
    // =====================================================
    // PHASE 0: Centralized Data Hydration Functions
    // Following DATA_SYNCHRONIZATION_STRATEGY.md rules
    // =====================================================
    
    /**
     * Validate UUID format
     * Rule 5: UUID-Only for Entity Identification
     */
    function isValidUUID(str) {
        if (!str || typeof str !== 'string') return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    }
    
    /**
     * Normalize entity ID to UUID format
     * Rule 5: UUID-Only for Entity Identification
     */
    function normalizeEntityId(entity, fieldName = 'id') {
        const id = typeof entity === 'string' ? entity : (entity?.id || entity?.matchId);
        
        if (!id) {
            throw new Error(`Entity missing ${fieldName}`);
        }
        
        if (!isValidUUID(id)) {
            throw new Error(`Invalid UUID format: ${id}`);
        }
        
        return id;
    }
    
    /**
     * Clear Team Match state before hydration
     * Rule 4: Clear State Before Hydration
     */
    function clearTeamMatchState() {
        console.log('[clearTeamMatchState] Clearing state before hydration');
        state.matchId = null;
        state.team1 = [];
        state.team2 = [];
        state.scores = { t1: [], t2: [], so: { t1: [], t2: [] } };
        state.teamIds = { t1: null, t2: null };
        state.matchArcherIds = { t1: {}, t2: {} };
        state.eventId = null;
        state.bracketId = null;
        state.eventName = '';
        state.bracketName = '';
        state.location = '';
        state.syncStatus = { t1: {}, t2: {} };
        state.currentView = 'setup';
        state.currentSet = 1;
    }
    
    /**
     * Validate Team Match integrity
     * Rule 3: Atomic Data Units - Verify all data belongs to this match
     * @param {Object} matchData - Match data from server
     * @param {string} expectedMatchId - Expected match ID
     */
    function validateTeamMatch(matchData, expectedMatchId) {
        if (!matchData || !matchData.match) {
            throw new Error('Match data is missing');
        }
        
        const match = matchData.match;
        
        // Verify MatchID matches
        if (match.id && match.id !== expectedMatchId) {
            throw new Error(`Match ID mismatch: expected ${expectedMatchId}, got ${match.id}`);
        }
        
        // Verify we have exactly 2 teams
        if (!match.teams || !Array.isArray(match.teams) || match.teams.length < 2) {
            throw new Error('Match must have exactly 2 teams');
        }
        
        // Verify teams have valid positions
        const positions = match.teams.map(t => t.position).sort();
        if (positions[0] !== 1 || positions[1] !== 2) {
            throw new Error('Match teams must have positions 1 and 2');
        }
        
        // Verify each team has archers
        match.teams.forEach((team, index) => {
            if (!team.archers || !Array.isArray(team.archers) || team.archers.length === 0) {
                throw new Error(`Team ${index + 1} must have at least one archer`);
            }
        });
        
        console.log('[validateTeamMatch] ✅ Validation passed');
    }
    
    /**
     * Fetch Team Match from server
     * Rule 3: Atomic Data Units - Fetch Complete Units from Server
     * @param {string} matchId - Match UUID
     * @returns {Promise<Object>} Match data
     */
    async function fetchTeamMatch(matchId) {
        console.log('[fetchTeamMatch] Fetching Team Match:', matchId);
        
        // Validate input
        if (!matchId || !isValidUUID(matchId)) {
            throw new Error(`Invalid matchId: ${matchId}`);
        }
        
        if (!window.LiveUpdates) {
            throw new Error('LiveUpdates is not available');
        }
        
        const matchData = await window.LiveUpdates.request(`/team-matches/${matchId}`, 'GET');
        
        if (!matchData || !matchData.match) {
            throw new Error(`Match not found: ${matchId}`);
        }
        
        console.log('[fetchTeamMatch] ✅ Fetched Team Match:', {
            matchId: matchData.match.id,
            status: matchData.match.status,
            teamCount: matchData.match.teams?.length || 0
        });
        
        return matchData;
    }
    
    /**
     * Centralized hydration function for Team Match
     * Rule 6: Centralized Hydration Function
     * 
     * @param {string} matchId - Match UUID
     * @param {Object} options - Hydration options
     *   - mergeLocal: Whether to merge with local scores (default: false)
     *   - clearStateFirst: Whether to clear state before hydration (default: true)
     * @returns {Promise<Object>} Hydrated state
     */
    async function hydrateTeamMatch(matchId, options = {}) {
        console.log('[hydrateTeamMatch] ========== START ==========');
        console.log('[hydrateTeamMatch] Parameters:', { matchId, options });
        
        try {
            // 1. Clear state first (Rule 4)
            if (options.clearStateFirst !== false) {
                clearTeamMatchState();
            }
            
            // 2. Validate inputs (Rule 5)
            const normalizedMatchId = normalizeEntityId(matchId, 'matchId');
            
            // 3. Fetch atomic unit from server (Rule 3)
            const matchData = await fetchTeamMatch(normalizedMatchId);
            
            // 4. Validate atomic unit integrity (Rule 3)
            validateTeamMatch(matchData, normalizedMatchId);
            
            const match = matchData.match;

            // 4b. Restore match code for authenticated writes (e.g. postTeamSet)
            if (match.match_code) {
                localStorage.setItem(`team_match_code:${normalizedMatchId}`, match.match_code);
                if (window.LiveUpdates && window.LiveUpdates.setTeamMatchCode) {
                    window.LiveUpdates.setTeamMatchCode(match.match_code);
                }
                console.log('[hydrateTeamMatch] 🔑 Match code restored');
            }
            
            // 5. Populate metadata from server (Rule 1)
            state.matchId = normalizedMatchId;
            state.eventId = match.event_id || null;
            state.bracketId = match.bracket_id || null;
            state.eventName = match.event_name || '';
            state.bracketName = match.bracket_name || '';
            state.location = match.location || '';
            state.cardStatus = match.card_status || 'PEND';
            state.locked = match.locked || false;
            // Store match data for completion checking
            state.matchData = match;
            // Bale assignment info (display-only, no scoring impact)
            state.baleNumber = match.bale_number ? parseInt(match.bale_number) : null;
            state.lineNumber = match.line_number ? parseInt(match.line_number) : null;
            state.wave = match.wave || null;
            
            // 6. Build teams from match data
            const teams = match.teams || [];
            if (teams.length < 2) {
                throw new Error('Match must have at least 2 teams');
            }
            
            const team1Data = teams.find(t => t.position === 1);
            const team2Data = teams.find(t => t.position === 2);
            
            if (!team1Data || !team2Data) {
                throw new Error('Match missing team at position 1 or 2');
            }
            
            // Store team IDs
            state.teamIds = {
                t1: team1Data.id,
                t2: team2Data.id
            };
            
            // Find archers in master list by UUID (preferred) or fallback to name
            const masterList = ArcherModule.loadList();
            state.team1 = [];
            state.team2 = [];
            state.matchArcherIds = { t1: {}, t2: {} };
            
            // Restore Team 1 archers
            if (team1Data.archers && Array.isArray(team1Data.archers)) {
                team1Data.archers.forEach((archerData, index) => {
                    const archerName = archerData.archer_name || '';
                    const nameParts = archerName.split(' ');
                    const firstName = nameParts[0] || '';
                    const lastName = nameParts.slice(1).join(' ') || '';
                    
                    // Try UUID first
                    let archer = masterList.find(a => {
                        const archerId = a.id || a.archerId;
                        return archerId && archerId === archerData.archer_id;
                    });
                    
                    // Fallback to name matching
                    if (!archer) {
                        archer = masterList.find(a => 
                            a.first.toLowerCase() === firstName.toLowerCase() &&
                            a.last.toLowerCase() === lastName.toLowerCase()
                        );
                    }
                    
                    if (archer) {
                        archer.id = archer.id || `${archer.first}-${archer.last}`;
                        state.team1.push(archer);
                        state.matchArcherIds.t1[index] = archerData.id;
                    } else {
                        // Create minimal archer object if not found
                        state.team1.push({
                            id: `${firstName}-${lastName}`,
                            first: firstName,
                            last: lastName,
                            school: archerData.school || '',
                            level: archerData.level || 'VAR',
                            gender: archerData.gender || ''
                        });
                        state.matchArcherIds.t1[index] = archerData.id;
                    }
                });
            }
            
            // Restore Team 2 archers
            if (team2Data.archers && Array.isArray(team2Data.archers)) {
                team2Data.archers.forEach((archerData, index) => {
                    const archerName = archerData.archer_name || '';
                    const nameParts = archerName.split(' ');
                    const firstName = nameParts[0] || '';
                    const lastName = nameParts.slice(1).join(' ') || '';
                    
                    // Try UUID first
                    let archer = masterList.find(a => {
                        const archerId = a.id || a.archerId;
                        return archerId && archerId === archerData.archer_id;
                    });
                    
                    // Fallback to name matching
                    if (!archer) {
                        archer = masterList.find(a => 
                            a.first.toLowerCase() === firstName.toLowerCase() &&
                            a.last.toLowerCase() === lastName.toLowerCase()
                        );
                    }
                    
                    if (archer) {
                        archer.id = archer.id || `${archer.first}-${archer.last}`;
                        state.team2.push(archer);
                        state.matchArcherIds.t2[index] = archerData.id;
                    } else {
                        // Create minimal archer object if not found
                        state.team2.push({
                            id: `${firstName}-${lastName}`,
                            first: firstName,
                            last: lastName,
                            school: archerData.school || '',
                            level: archerData.level || 'VAR',
                            gender: archerData.gender || ''
                        });
                        state.matchArcherIds.t2[index] = archerData.id;
                    }
                });
            }
            
            // 7. Build scores from server data
            const numArrows = state.team1.length * ARROWS_PER_ARCHER;
            state.scores = {
                t1: Array(TOTAL_TEAM_SETS).fill(null).map(() => Array(numArrows).fill('')),
                t2: Array(TOTAL_TEAM_SETS).fill(null).map(() => Array(numArrows).fill('')),
                so: {
                    t1: Array(state.team1.length).fill(''),
                    t2: Array(state.team2.length).fill('')
                }
            };
            
            // Restore Team 1 scores
            if (team1Data.archers && Array.isArray(team1Data.archers)) {
                team1Data.archers.forEach((archerData, archIdx) => {
                    if (archerData.sets && Array.isArray(archerData.sets)) {
                        archerData.sets.forEach(set => {
                            if (set.set_number >= 1 && set.set_number <= TOTAL_TEAM_SETS) {
                                const setIdx = set.set_number - 1;
                                const arrowStartIdx = archIdx * ARROWS_PER_ARCHER;
                                if (set.a1) state.scores.t1[setIdx][arrowStartIdx] = set.a1;
                                if (set.a2) state.scores.t1[setIdx][arrowStartIdx + 1] = set.a2;
                            } else if (set.set_number === 5) {
                                // Shoot-off
                                if (set.a1) state.scores.so.t1[archIdx] = set.a1;
                            }
                        });
                    }
                });
            }
            
            // Restore Team 2 scores
            if (team2Data.archers && Array.isArray(team2Data.archers)) {
                team2Data.archers.forEach((archerData, archIdx) => {
                    if (archerData.sets && Array.isArray(archerData.sets)) {
                        archerData.sets.forEach(set => {
                            if (set.set_number >= 1 && set.set_number <= TOTAL_TEAM_SETS) {
                                const setIdx = set.set_number - 1;
                                const arrowStartIdx = archIdx * ARROWS_PER_ARCHER;
                                if (set.a1) state.scores.t2[setIdx][arrowStartIdx] = set.a1;
                                if (set.a2) state.scores.t2[setIdx][arrowStartIdx + 1] = set.a2;
                            } else if (set.set_number === 5) {
                                // Shoot-off
                                if (set.a1) state.scores.so.t2[archIdx] = set.a1;
                            }
                        });
                    }
                });
            }
            
            // 8. Set current view
            state.currentView = 'scoring';
            
            // 9. Save session for recovery
            saveData();
            
            console.log('[hydrateTeamMatch] ✅ Hydration complete:', {
                matchId: state.matchId,
                team1Archers: state.team1.length,
                team2Archers: state.team2.length,
                setsScored: state.scores.t1.filter(s => s.some(v => v)).length
            });
            console.log('[hydrateTeamMatch] ========== END ==========');
            
            return state;
            
        } catch (error) {
            console.error('[hydrateTeamMatch] ❌ Error:', error);
            throw error;
        }
    }
    
    // Phase 2: Restore match from database if matchId exists
    // Now uses centralized hydration function (Phase 0)
    async function restoreTeamMatchFromDatabase() {
        if (!state.matchId) return false;
        
        try {
            console.log('[restoreTeamMatchFromDatabase] Using centralized hydrateTeamMatch()');
            await hydrateTeamMatch(state.matchId, {
                mergeLocal: false,
                clearStateFirst: true
            });
            return true;
        } catch (error) {
            console.error('[restoreTeamMatchFromDatabase] Failed to restore match:', error);
            return false;
        }
    }
    
    // Phase 2: Reset clears session state (database match remains for coach visibility)
    function resetMatch() {
        if(confirm("Are you sure you want to start a new match? This will clear all scores.")) {
            // Clear cached match from localStorage so a new match will be created
            const oldMatchId = state.matchId;
            if (oldMatchId) {
                // Clear the match code cache
                localStorage.removeItem(`team_match_code:${oldMatchId}`);
                // Clear team mappings for this match
                localStorage.removeItem(`team_match_team:${oldMatchId}:1`);
                localStorage.removeItem(`team_match_team:${oldMatchId}:2`);
                // Clear archer mappings for this match
                if (state.teamIds.t1) {
                    for (let i = 0; i < 3; i++) {
                        localStorage.removeItem(`team_archer:${oldMatchId}:${state.teamIds.t1}:${i + 1}`);
                    }
                }
                if (state.teamIds.t2) {
                    for (let i = 0; i < 3; i++) {
                        localStorage.removeItem(`team_archer:${oldMatchId}:${state.teamIds.t2}:${i + 1}`);
                    }
                }
            }
            // Clear the match cache by date/event so ensureTeamMatch will create a new one
            const today = new Date().toISOString().split('T')[0];
            const urlParams = new URLSearchParams(window.location.search);
            const eventId = urlParams.get('event') || state.eventId || null;
            const matchKey = `team_match:${eventId || 'standalone'}:${today}`;
            localStorage.removeItem(matchKey);
            
            state.team1 = [];
            state.team2 = [];
            state.scores = {};
            state.shootOffWinner = null;
            state.currentView = 'setup';
            // Phase 2: Clear database references (match remains in DB for coach)
            state.matchId = null;
            state.teamIds = { t1: null, t2: null };
            state.matchArcherIds = { t1: {}, t2: {} };
            state.eventId = null;
            state.bracketId = null;
            state.eventName = '';
            state.bracketName = '';
            state.syncStatus = { t1: {}, t2: {} };
            localStorage.removeItem(sessionKey);
            syncSelectorSelection();
            renderView();
        }
    }

    // --- EVENT/BRACKET MANAGEMENT ---
    async function loadEvents() {
        try {
            const response = await fetch(`${getApiBase()}/events/recent`);
            if (response.ok) {
                const data = await response.json();
                state.events = data.events || [];
                renderEventSelect();
            } else {
                console.log('Events require authentication - standalone mode only');
                state.events = [];
                renderEventSelect();
            }
        } catch (error) {
            console.log('Could not load events:', error.message);
            state.events = [];
            renderEventSelect();
        }
    }
    
    function renderEventSelect() {
        const eventSelect = document.getElementById('event-select');
        if (!eventSelect) return;
        
        eventSelect.innerHTML = '<option value="">Standalone Match (No Event)</option>';
        
        // Only show active events
        const activeEvents = state.events.filter(e => e.status === 'Active');
        activeEvents.forEach(event => {
            const option = document.createElement('option');
            option.value = event.id;
            option.textContent = `${event.name} - ${event.date}`;
            eventSelect.appendChild(option);
        });
        
        // Set selected value if we have one
        if (state.eventId) {
            eventSelect.value = state.eventId;
            loadBrackets(state.eventId);
        }
    }
    
    async function handleEventSelection() {
        const eventSelect = document.getElementById('event-select');
        const bracketSelection = document.getElementById('bracket-selection');
        
        const eventId = eventSelect.value;
        state.eventId = eventId || null;
        state.bracketId = null;
        state.brackets = [];
        
        if (eventId) {
            await loadBrackets(eventId);
            if (bracketSelection) bracketSelection.classList.remove('hidden');
        } else {
            if (bracketSelection) bracketSelection.classList.add('hidden');
        }
        
        updateMatchTypeIndicator();
        saveData();
    }
    
    async function loadBrackets(eventId) {
        try {
            const response = await fetch(`${getApiBase()}/events/${eventId}/brackets`);
            if (response.ok) {
                const data = await response.json();
                state.brackets = (data.brackets || []).filter(b => b.bracket_type === 'TEAM');
                renderBracketSelect();
            } else {
                console.log('Could not load brackets for event');
                state.brackets = [];
                renderBracketSelect();
            }
        } catch (error) {
            console.log('Error loading brackets:', error.message);
            state.brackets = [];
            renderBracketSelect();
        }
    }
    
    function renderBracketSelect() {
        const bracketSelect = document.getElementById('bracket-select');
        if (!bracketSelect) return;
        
        bracketSelect.innerHTML = '<option value="">No Bracket (Standalone)</option>';
        
        state.brackets.forEach(bracket => {
            const option = document.createElement('option');
            option.value = bracket.id;
            const formatText = bracket.bracket_format === 'ELIMINATION' ? 'Elimination' : 'Swiss';
            option.textContent = `${bracket.division} ${formatText} (${bracket.status})`;
            bracketSelect.appendChild(option);
        });
        
        // Set selected value if we have one
        if (state.bracketId) {
            bracketSelect.value = state.bracketId;
        }
    }
    
    function handleBracketSelection() {
        const bracketSelect = document.getElementById('bracket-select');
        state.bracketId = bracketSelect.value || null;
        updateMatchTypeIndicator();
        saveData();
    }
    
    function updateMatchTypeIndicator() {
        const matchTypeText = document.getElementById('match-type-text');
        if (!matchTypeText) return;
        
        if (state.eventId && state.bracketId) {
            const bracket = state.brackets.find(b => b.id === state.bracketId);
            const event = state.events.find(e => e.id === state.eventId);
            if (bracket && event) {
                const formatText = bracket.bracket_format === 'ELIMINATION' ? 'Elimination' : 'Swiss';
                matchTypeText.textContent = `${formatText} bracket match in "${event.name}"`;
            }
        } else if (state.eventId) {
            const event = state.events.find(e => e.id === state.eventId);
            if (event) {
                matchTypeText.textContent = `Event match in "${event.name}" (no bracket)`;
            }
        } else {
            matchTypeText.textContent = 'Standalone match - not linked to any event';
        }
    }

    // --- INITIALIZATION ---
    async function init() {
        console.log('[TeamCard] 🚀 Initializing Team Match Card...');
        console.log('[TeamCard] LiveUpdates available:', !!window.LiveUpdates);
        console.log('[TeamCard] LiveUpdates enabled:', window.LiveUpdates?._state?.config?.enabled);
        
        // Phase 2: Load archers from MySQL first (for better UX)
        try {
            console.log('[TeamCard] Loading archers from MySQL...');
            await ArcherModule.loadFromMySQL();
            console.log('[TeamCard] ✅ Archers loaded from MySQL');
        } catch (e) {
            console.warn('[TeamCard] ⚠️ Failed to load archers from MySQL, using CSV fallback:', e);
            await ArcherModule.loadDefaultCSVIfNeeded();
        }
        
        loadData();
        
        // Check URL for match ID (e.g., team_card.html?match=UUID)
        const urlParams = new URLSearchParams(window.location.search);
        let urlMatchId = urlParams.get('match');
        
        // Hash fallback (e.g., #matchId=UUID or #UUID)
        if (!urlMatchId && window.location.hash) {
            const hashVal = window.location.hash.substring(1);
            if (hashVal.startsWith('matchId=')) {
                urlMatchId = hashVal.split('=')[1];
            } else if (/^[0-9a-f]{8}-/.test(hashVal)) {
                urlMatchId = hashVal;
            }
        }
        
        if (urlMatchId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(urlMatchId)) {
            console.log('[TeamCard] Loading match from URL param:', urlMatchId);
            try {
                await hydrateTeamMatch(urlMatchId, { mergeLocal: false, clearStateFirst: true });
                console.log('[TeamCard] ✅ Match loaded from URL');
                if (window.LiveUpdates?.flushTeamQueue) {
                    window.LiveUpdates.flushTeamQueue(state.matchId).catch(e => console.warn('Queue flush failed:', e));
                }
            } catch (err) {
                console.error('[TeamCard] Failed to load match from URL:', err);
            }
        }
        
        console.log('[TeamCard] Session state loaded:', {
            currentView: state.currentView,
            matchId: state.matchId,
            team1Count: state.team1.length,
            team2Count: state.team2.length
        });
        
        initializeKeypad();
        initializeArcherSelector();
        
        // Phase 2: Restore match from database if matchId exists (skip if already loaded from URL)
        if (state.matchId && window.LiveUpdates && !urlMatchId) {
            const restored = await restoreTeamMatchFromDatabase();
            if (restored) {
                console.log('[TeamCard] ✅ Match restored from database');
                // Flush any pending queue
                if (window.LiveUpdates.flushTeamQueue) {
                    window.LiveUpdates.flushTeamQueue(state.matchId).catch(e => console.warn('Queue flush failed:', e));
                }
            }
        }
        
        if (state.currentView === 'scoring' && state.team1.length === 3 && state.team2.length === 3) {
            console.log('[TeamCard] Restoring scoring view from session');
            renderScoringView();
        } else {
            console.log('[TeamCard] Starting in setup view');
            state.currentView = 'setup';
            syncSelectorSelection();
        }
        renderView();
        console.log('[TeamCard] ✅ Initialization complete');

        searchInput.addEventListener('input', () => {
            if (archerSelector) {
                archerSelector.setFilter(searchInput.value);
            }
        });
        startScoringBtn.addEventListener('click', startScoring);
        editSetupBtn.addEventListener('click', () => { state.currentView = 'setup'; renderView(); });
        newMatchBtn.addEventListener('click', resetMatch);

        // Complete Match functionality
        const completeMatchBtn = document.getElementById('complete-match-btn');
        if (completeMatchBtn) {
            completeMatchBtn.addEventListener('click', showCompleteMatchModal);
        }

        // Complete Match modal handlers
        const completeMatchConfirmBtn = document.getElementById('complete-match-confirm-btn');
        const completeMatchCancelBtn = document.getElementById('complete-match-cancel-btn');

        if (completeMatchConfirmBtn) {
            completeMatchConfirmBtn.addEventListener('click', completeMatch);
        }

        if (completeMatchCancelBtn) {
            completeMatchCancelBtn.addEventListener('click', hideCompleteMatchModal);
        }

        const teamCompleteSuccessOkBtn = document.getElementById('team-complete-success-ok-btn');
        if (teamCompleteSuccessOkBtn) {
            teamCompleteSuccessOkBtn.addEventListener('click', hideTeamCompleteSuccessModal);
        }

        const matchOverModal = document.getElementById('match-over-modal');
        const matchOverCompleteBtn = document.getElementById('match-over-complete-btn');
        const matchOverCloseBtn = document.getElementById('match-over-close-btn');
        if (matchOverCompleteBtn) {
            matchOverCompleteBtn.addEventListener('click', () => {
                if (matchOverModal) { matchOverModal.classList.add('hidden'); matchOverModal.classList.remove('flex'); }
                showCompleteMatchModal();
            });
        }
        if (matchOverCloseBtn) {
            matchOverCloseBtn.addEventListener('click', () => {
                if (matchOverModal) { matchOverModal.classList.add('hidden'); matchOverModal.classList.remove('flex'); }
            });
        }
        
        document.body.addEventListener('focusin', (e) => {
            if (e.target.matches('#scoring-view input[type="text"]') && scoreKeypad) {
                scoreKeypad.showForInput(e.target);
            }
        });
        
        scoreTableContainer.addEventListener('click', (e) => {
            if (e.target.matches('.tie-breaker-controls button')) {
                state.shootOffWinner = e.target.dataset.winner;
                updateScoreHighlightsAndTotals();
                updateCompleteMatchButton();
                saveData();
            }
        });
        
        // Use event delegation for score input changes (works with dynamically generated table)
        scoreTableContainer.addEventListener('input', (e) => {
            if (e.target.matches('input.score-input')) {
                handleScoreInput(e);
            }
        });
        
        scoreTableContainer.addEventListener('change', (e) => {
            if (e.target.matches('input.score-input')) {
                handleScoreInput(e);
            }
        });
    }

    // Only initialize the app if we are on the team card page
    if (document.title.includes('Team Match')) {
        init();
    }
});
