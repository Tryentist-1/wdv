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
        syncStatus: { t1: {}, t2: {} },
        location: '',
        events: [],
        brackets: []
    };

    const sessionKey = `teamCard_${new Date().toISOString().split('T')[0]}`;
    const TOTAL_TEAM_SETS = 4;
    const ARROWS_PER_ARCHER = 2;
    const SHOOT_OFF_KEY = 'so';

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
    }

    function renderMatchSummary() {
        if (!state.team1.length || !state.team2.length) return;
        matchSummaryDisplay.innerHTML = `
            <span class="team-summary a1-summary">Team 1</span>
            <span class="mx-2">vs</span>
            <span class="team-summary a2-summary">Team 2</span>
        `;
    }

    function renderScoreTable() {
        // Ensure scores arrays are initialized
        if (!state.scores.t1 || !Array.isArray(state.scores.t1)) {
            state.scores.t1 = [[], [], [], []];
        }
        if (!state.scores.t2 || !Array.isArray(state.scores.t2)) {
            state.scores.t2 = [[], [], [], []];
        }
        // Ensure each end array has 6 elements (for 6 arrows)
        for (let i = 0; i < 4; i++) {
            if (!state.scores.t1[i] || !Array.isArray(state.scores.t1[i])) {
                state.scores.t1[i] = ['', '', '', '', '', ''];
            }
            if (!state.scores.t2[i] || !Array.isArray(state.scores.t2[i])) {
                state.scores.t2[i] = ['', '', '', '', '', ''];
            }
        }
        // Ensure shoot-off scores are initialized
        if (!state.scores.so) {
            state.scores.so = { t1: ['', '', ''], t2: ['', '', ''] };
        }
        if (!state.scores.so.t1 || !Array.isArray(state.scores.so.t1)) {
            state.scores.so.t1 = ['', '', ''];
        }
        if (!state.scores.so.t2 || !Array.isArray(state.scores.so.t2)) {
            state.scores.so.t2 = ['', '', ''];
        }
        
        const t1ArcherNames = state.team1.map(a => `${a.first} ${a.last.charAt(0)}`).join(' | ');
        const t2ArcherNames = state.team2.map(a => `${a.first} ${a.last.charAt(0)}`).join(' | ');

        let tableHTML = `<table class="w-full border-collapse text-sm bg-white dark:bg-gray-700" id="team_round_table">
            <thead class="bg-primary dark:bg-primary-dark text-white sticky top-0">
                <tr>
                    <th rowspan="3" class="px-2 py-2 text-center font-bold border-r border-gray-300 dark:border-gray-600">End</th>
                    <th colspan="6" class="px-2 py-2 text-center font-bold border-r border-gray-300 dark:border-gray-600">Team 1 (${t1ArcherNames})</th>
                    <th colspan="6" class="px-2 py-2 text-center font-bold border-r border-gray-300 dark:border-gray-600">Team 2 (${t2ArcherNames})</th>
                    <th colspan="2" class="px-2 py-2 text-center font-bold border-r border-gray-300 dark:border-gray-600">End Total</th>
                    <th colspan="2" class="px-2 py-2 text-center font-bold border-r border-gray-300 dark:border-gray-600">Set Points</th>
                    <th rowspan="3" class="px-2 py-2 text-center font-bold">Sync</th>
                </tr>
                <tr><th colspan="16" class="bg-gray-100 dark:bg-gray-700 h-1 p-0"></th></tr>
                <tr>
                    <th class="px-2 py-2 text-center font-bold border-r border-gray-300 dark:border-gray-600">A1</th>
                    <th class="px-2 py-2 text-center font-bold border-r border-gray-300 dark:border-gray-600">A2</th>
                    <th class="px-2 py-2 text-center font-bold border-r border-gray-300 dark:border-gray-600">A3</th>
                    <th class="px-2 py-2 text-center font-bold border-r border-gray-300 dark:border-gray-600">A4</th>
                    <th class="px-2 py-2 text-center font-bold border-r border-gray-300 dark:border-gray-600">A5</th>
                    <th class="px-2 py-2 text-center font-bold border-r border-gray-300 dark:border-gray-600">A6</th>
                    <th class="px-2 py-2 text-center font-bold border-r border-gray-300 dark:border-gray-600">A1</th>
                    <th class="px-2 py-2 text-center font-bold border-r border-gray-300 dark:border-gray-600">A2</th>
                    <th class="px-2 py-2 text-center font-bold border-r border-gray-300 dark:border-gray-600">A3</th>
                    <th class="px-2 py-2 text-center font-bold border-r border-gray-300 dark:border-gray-600">A4</th>
                    <th class="px-2 py-2 text-center font-bold border-r border-gray-300 dark:border-gray-600">A5</th>
                    <th class="px-2 py-2 text-center font-bold border-r border-gray-300 dark:border-gray-600">A6</th>
                    <th class="px-2 py-2 text-center font-bold border-r border-gray-300 dark:border-gray-600">T1</th>
                    <th class="px-2 py-2 text-center font-bold border-r border-gray-300 dark:border-gray-600">T2</th>
                    <th class="px-2 py-2 text-center font-bold border-r border-gray-300 dark:border-gray-600">T1</th>
                    <th class="px-2 py-2 text-center font-bold border-r border-gray-300 dark:border-gray-600">T2</th>
                </tr>
            </thead><tbody>`;

        for (let i = 0; i < 4; i++) {
            const setNumber = i + 1;
            // Get sync status for all archers in this set
            const syncStatuses = [];
            for (let archIdx = 0; archIdx < 3; archIdx++) {
                const t1Status = state.syncStatus?.t1?.[archIdx]?.[setNumber] || '';
                const t2Status = state.syncStatus?.t2?.[archIdx]?.[setNumber] || '';
                if (t1Status) syncStatuses.push(t1Status);
                if (t2Status) syncStatuses.push(t2Status);
            }
            const syncIcon = getSyncStatusIcon(syncStatuses);
            
            tableHTML += `<tr id="end-${i+1}" class="border-b border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-600">
                <td class="px-2 py-1 text-center font-semibold bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white border-r border-gray-200 dark:border-gray-600">End ${i+1}</td>
                ${state.scores.t1[i].map((s, a) => `<td class="p-0 border-r border-gray-200 dark:border-gray-600 ${getScoreColor(s)}"><input type="text" class="score-input w-full h-full min-h-[44px] text-center font-bold border-none bg-transparent" data-team="t1" data-end="${i}" data-arrow="${a}" value="${s}" readonly></td>`).join('')}
                ${state.scores.t2[i].map((s, a) => `<td class="p-0 border-r border-gray-200 dark:border-gray-600 ${getScoreColor(s)}"><input type="text" class="score-input w-full h-full min-h-[44px] text-center font-bold border-none bg-transparent" data-team="t2" data-end="${i}" data-arrow="${a}" value="${s}" readonly></td>`).join('')}
                <td class="px-2 py-1 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold border-r border-gray-200 dark:border-gray-600" id="t1-e${i+1}-total"></td>
                <td class="px-2 py-1 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold border-r border-gray-200 dark:border-gray-600" id="t2-e${i+1}-total"></td>
                <td class="px-2 py-1 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold border-r border-gray-200 dark:border-gray-600" id="t1-e${i+1}-setpts"></td>
                <td class="px-2 py-1 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold border-r border-gray-200 dark:border-gray-600" id="t2-e${i+1}-setpts"></td>
                <td class="px-2 py-1 text-center" id="sync-e${i+1}" data-set="${setNumber}">${syncIcon}</td>
            </tr>`;
        }

        // Get shoot-off sync status
        const soSyncStatuses = [];
        for (let archIdx = 0; archIdx < 3; archIdx++) {
            const t1Status = state.syncStatus?.t1?.[archIdx]?.[5] || '';
            const t2Status = state.syncStatus?.t2?.[archIdx]?.[5] || '';
            if (t1Status) soSyncStatuses.push(t1Status);
            if (t2Status) soSyncStatuses.push(t2Status);
        }
        const soSyncIcon = getSyncStatusIcon(soSyncStatuses);
        
        tableHTML += `<tr id="shoot-off" class="hidden border-b border-gray-200 dark:border-gray-600">
                <td class="px-2 py-1 text-center font-semibold bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white border-r border-gray-200 dark:border-gray-600">S.O.</td>
                ${state.scores.so.t1.map((s,a) => `<td class="p-0 border-r border-gray-200 dark:border-gray-600 ${getScoreColor(s)}"><input type="text" class="score-input w-full h-full min-h-[44px] text-center font-bold border-none bg-transparent" data-team="t1" data-end="so" data-arrow="${a}" value="${s}" readonly></td>`).join('')}<td colspan="3" class="border-r border-gray-200 dark:border-gray-600"></td>
                ${state.scores.so.t2.map((s,a) => `<td class="p-0 border-r border-gray-200 dark:border-gray-600 ${getScoreColor(s)}"><input type="text" class="score-input w-full h-full min-h-[44px] text-center font-bold border-none bg-transparent" data-team="t2" data-end="so" data-arrow="${a}" value="${s}" readonly></td>`).join('')}<td colspan="3" class="border-r border-gray-200 dark:border-gray-600"></td>
                <td class="px-2 py-1 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold border-r border-gray-200 dark:border-gray-600" id="t1-so-total"></td>
                <td class="px-2 py-1 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold border-r border-gray-200 dark:border-gray-600" id="t2-so-total"></td>
                <td colspan="2" id="so-winner-cell" class="px-2 py-1 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold border-r border-gray-200 dark:border-gray-600">
                    <span id="so-winner-text"></span>
                </td>
                <td class="px-2 py-1 text-center" id="sync-so" data-set="5">${soSyncIcon}</td>
            </tr></tbody>
            <tfoot class="bg-gray-200 dark:bg-gray-600">
                <tr><td colspan="15" class="px-2 py-2 text-right font-bold dark:text-white">Match Score:</td>
                    <td class="px-2 py-2 text-center font-bold dark:text-white" id="t1-match-score"></td>
                    <td class="px-2 py-2 text-center font-bold dark:text-white" id="t2-match-score"></td>
                    <td class="px-2 py-2"></td>
                </tr>
                <tr id="judge-call-row" class="hidden">
                    <td colspan="18" class="text-center p-2 bg-yellow-100 dark:bg-yellow-900/20">
                        <span class="font-bold mr-2">Judge Call (Closest to Center):</span>
                        <span class="tie-breaker-controls">
                            <button class="px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold transition-colors min-h-[44px]" data-winner="t1">Team 1 Wins</button>
                            <button class="px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold transition-colors min-h-[44px]" data-winner="t2">Team 2 Wins</button>
                        </span>
                    </td>
                </tr>
                <tr><td colspan="18" id="match-result" class="px-2 py-2 text-center font-bold"></td></tr>
            </tfoot>
        </table>`;
        scoreTableContainer.innerHTML = tableHTML;
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

        const shootOffRow = document.getElementById('shoot-off');
        const judgeCallRow = document.getElementById('judge-call-row');
        judgeCallRow.classList.add('hidden');
        judgeCallRow.classList.remove('table-row');

        if (!matchOver && t1MatchScore === 4 && t2MatchScore === 4) {
            shootOffRow.classList.remove('hidden');
            shootOffRow.classList.add('table-row');
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
            shootOffRow.classList.add('hidden');
            shootOffRow.classList.remove('table-row');
        }

        const matchResultEl = document.getElementById('match-result');
        if (matchOver) {
            matchResultEl.textContent = `Match Over: Team ${winner === 't1' ? 1 : 2} Wins!`;
            matchResultEl.classList.add('text-success');
            matchResultEl.classList.remove('text-gray-500');
        } else {
            matchResultEl.textContent = 'Match in Progress...';
            matchResultEl.classList.add('text-gray-500');
            matchResultEl.classList.remove('text-success');
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

        // Update score color classes on the cell (preserve other Tailwind classes)
        const cell = input.parentElement;
        if (cell) {
            // Remove old score color classes
            cell.classList.remove('bg-score-gold', 'bg-score-red', 'bg-score-blue', 'bg-score-black', 'bg-score-white', 'text-black', 'text-white', 'dark:text-black');
            // Add new score color classes
            const scoreClasses = getScoreColor(input.value).split(' ');
            scoreClasses.forEach(cls => {
                if (cls) cell.classList.add(cls);
            });
        }
        updateScoreHighlightsAndTotals();
        saveData();
        
        // Phase 2: Post to database if match is active
        if (state.matchId && state.teamIds[team] && end !== 'so' && window.LiveUpdates && window.LiveUpdates.postTeamSet) {
            const setNumber = parseInt(end, 10) + 1;
            const archerIndex = parseInt(arrow, 10); // Arrow index 0-2 corresponds to archer position 1-3
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
                
                // Count tens and Xs for this archer's arrow only
                const tens = parseScoreValue(input.value) === 10 ? 1 : 0;
                const xs = String(input.value).toUpperCase() === 'X' ? 1 : 0;
                
                // Post this archer's set score (1 arrow per archer per set)
                try {
                    const arrowValue = input.value || null;
                    console.log(`[TeamCard] 📤 Posting score: Team=${team}, Archer=${archerIndex + 1}, Set=${setNumber}, Arrow=${arrowValue}`);
                    updateSyncStatus(team, archerIndex, setNumber, 'pending');
                    await window.LiveUpdates.postTeamSet(state.matchId, state.teamIds[team], matchArcherId, setNumber, {
                        a1: arrowValue,
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
        if (String(score).toUpperCase() === 'X' || String(score).toUpperCase() === 'M') return 0;
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
    
    // Phase 2: Restore match from database if matchId exists
    async function restoreTeamMatchFromDatabase() {
        if (!state.matchId || !window.LiveUpdates) return false;
        
        try {
            const match = await window.LiveUpdates.request(`/team-matches/${state.matchId}`, 'GET');
            if (!match || !match.match) return false;
            
            console.log('[TeamCard] Restoring team match from database:', state.matchId);
            
            // Restore teams and archers from match data
            const teams = match.match.teams || [];
            if (teams.length >= 2) {
                const team1Data = teams.find(t => t.position === 1);
                const team2Data = teams.find(t => t.position === 2);
                
                if (team1Data && team2Data && team1Data.archers && team2Data.archers) {
                    // Store team IDs
                    state.teamIds = {
                        t1: team1Data.id,
                        t2: team2Data.id
                    };
                    
                    // Find archers in master list by name
                    const masterList = ArcherModule.loadList();
                    state.team1 = [];
                    state.team2 = [];
                    state.matchArcherIds = { t1: {}, t2: {} };
                    
                    // Restore Team 1 archers
                    team1Data.archers.forEach((archerData, index) => {
                        const archerName = archerData.archer_name || '';
                        const nameParts = archerName.split(' ');
                        const firstName = nameParts[0] || '';
                        const lastName = nameParts.slice(1).join(' ') || '';
                        
                        const archer = masterList.find(a => 
                            a.first.toLowerCase() === firstName.toLowerCase() &&
                            a.last.toLowerCase() === lastName.toLowerCase()
                        );
                        
                        if (archer) {
                            archer.id = `${archer.first}-${archer.last}`;
                            state.team1.push(archer);
                            state.matchArcherIds.t1[index] = archerData.id;
                        } else {
                            // Create a minimal archer object if not found in master list
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
                    
                    // Restore Team 2 archers
                    team2Data.archers.forEach((archerData, index) => {
                        const archerName = archerData.archer_name || '';
                        const nameParts = archerName.split(' ');
                        const firstName = nameParts[0] || '';
                        const lastName = nameParts.slice(1).join(' ') || '';
                        
                        const archer = masterList.find(a => 
                            a.first.toLowerCase() === firstName.toLowerCase() &&
                            a.last.toLowerCase() === lastName.toLowerCase()
                        );
                        
                        if (archer) {
                            archer.id = `${archer.first}-${archer.last}`;
                            state.team2.push(archer);
                            state.matchArcherIds.t2[index] = archerData.id;
                        } else {
                            // Create a minimal archer object if not found in master list
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
                    
                    // Restore scores from database
                    const numArrows = state.team1.length * 2; // Each archer shoots 2 arrows per end
                    state.scores = {
                        t1: Array(4).fill(null).map(() => Array(numArrows).fill('')),
                        t2: Array(4).fill(null).map(() => Array(numArrows).fill('')),
                        so: { t1: Array(state.team1.length).fill(''), t2: Array(state.team1.length).fill('') }
                    };
                    
                    // Restore Team 1 scores
                    team1Data.archers.forEach((archerData, archIdx) => {
                        if (archerData.sets && archerData.sets.length > 0) {
                            archerData.sets.forEach(set => {
                                if (set.set_number <= 4) {
                                    const setIdx = set.set_number - 1;
                                    const arrowStartIdx = archIdx * 2;
                                    if (set.a1) state.scores.t1[setIdx][arrowStartIdx] = set.a1;
                                    if (set.a2) state.scores.t1[setIdx][arrowStartIdx + 1] = set.a2;
                                } else if (set.set_number === 5) {
                                    // Shoot-off
                                    if (set.a1) state.scores.so.t1[archIdx] = set.a1;
                                }
                            });
                        }
                    });
                    
                    // Restore Team 2 scores
                    team2Data.archers.forEach((archerData, archIdx) => {
                        if (archerData.sets && archerData.sets.length > 0) {
                            archerData.sets.forEach(set => {
                                if (set.set_number <= 4) {
                                    const setIdx = set.set_number - 1;
                                    const arrowStartIdx = archIdx * 2;
                                    if (set.a1) state.scores.t2[setIdx][arrowStartIdx] = set.a1;
                                    if (set.a2) state.scores.t2[setIdx][arrowStartIdx + 1] = set.a2;
                                } else if (set.set_number === 5) {
                                    // Shoot-off
                                    if (set.a1) state.scores.so.t2[archIdx] = set.a1;
                                }
                            });
                        }
                    });
                    
                    // Restore event ID if present
                    if (match.match.event_id) {
                        state.eventId = match.match.event_id;
                    }
                    
                    state.currentView = 'scoring';
                    return true;
                }
            }
        } catch (e) {
            console.error('[TeamCard] Failed to restore match from database:', e);
        }
        return false;
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
            state.syncStatus = { t1: {}, t2: {} };
            localStorage.removeItem(sessionKey);
            syncSelectorSelection();
            renderView();
        }
    }

    // --- EVENT/BRACKET MANAGEMENT ---
    async function loadEvents() {
        try {
            const response = await fetch('api/v1/events/recent');
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
            const response = await fetch(`api/v1/events/${eventId}/brackets`);
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
        console.log('[TeamCard] Session state loaded:', {
            currentView: state.currentView,
            matchId: state.matchId,
            team1Count: state.team1.length,
            team2Count: state.team2.length
        });
        
        initializeKeypad();
        initializeArcherSelector();
        
        // Phase 2: Restore match from database if matchId exists
        if (state.matchId && window.LiveUpdates) {
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
        
        document.body.addEventListener('focusin', (e) => {
            if (e.target.matches('#scoring-view input[type="text"]') && scoreKeypad) {
                scoreKeypad.showForInput(e.target);
            }
        });
        
        scoreTableContainer.addEventListener('click', (e) => {
            if (e.target.matches('.tie-breaker-controls button')) {
                state.shootOffWinner = e.target.dataset.winner;
                updateScoreHighlightsAndTotals();
                saveData();
            }
        });
    }

    // Only initialize the app if we are on the team card page
    if (document.title.includes('Team Match')) {
        init();
    }
});
