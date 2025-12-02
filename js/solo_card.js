/**
 * js/solo_card.js
 * 
 * Manages the state and UI for the modernized Solo Olympic Round scorecard.
 * Integrates with ArcherModule for archer selection and uses a state-driven
 * approach for rendering views and calculating scores.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- STATE MANAGEMENT ---
    const state = {
        app: 'SoloCard',
        version: '2.0', // Phase 2: Database integration
        currentView: 'setup', // 'setup' or 'scoring'
        archer1: null,        // Stores the full archer object for Archer 1
        archer2: null,        // Stores the full archer object for Archer 2
        scores: {},           // { a1: [[s1,s2,s3], ...], a2: [[s1,s2,s3], ...], so: {a1: s, a2: s} }
        shootOffWinner: null, // 'a1' or 'a2' if judge call is needed
        // Phase 2: Database integration
        matchId: null,        // Database match ID (UUID)
        matchArcherIds: {},   // { a1: matchArcherId, a2: matchArcherId }
        eventId: null,        // Optional event ID for coach visibility
        bracketId: null,      // Optional bracket ID for tournament matches
        syncStatus: {},       // Track sync status per archer per set: { a1: { setNumber: 'synced'|'pending'|'failed' } }
        location: '',         // Match location
        events: [],           // Available events
        brackets: []          // Available brackets for selected event
    };

    const sessionKey = `soloCard_session_${new Date().toISOString().split('T')[0]}`;

    // --- DOM ELEMENT REFERENCES ---
    const views = {
        setup: document.getElementById('setup-view'),
        scoring: document.getElementById('scoring-view')
    };
    const archerSelectionContainer = document.getElementById('archer-selection-container');
    const searchInput = document.getElementById('archer-search-input');
    const startScoringBtn = document.getElementById('start-scoring-btn');
    const eventSelect = document.getElementById('event-select');
    const bracketSelect = document.getElementById('bracket-select');
    const bracketSelection = document.getElementById('bracket-selection');
    const matchTypeText = document.getElementById('match-type-text');
    const refreshEventsBtn = document.getElementById('refresh-events-btn');
    const scoreTableContainer = document.getElementById('score-table-container');
    const keypadElement = document.getElementById('score-keypad');
    const editSetupBtn = document.getElementById('edit-setup-btn');
    const newMatchBtn = document.getElementById('new-match-btn');
    const matchSummaryDisplay = document.getElementById('match-summary-display');

    let keypad = {
        currentlyFocusedInput: null
    };

    // --- ARCHER SELECTOR SETUP ---
    let archerSelector = null;
    const SOLO_SELECTOR_GROUPS = [
        { id: 'a1', label: 'Archer 1', buttonText: 'A1', max: 1, accentClass: 'bg-primary text-white' },
        { id: 'a2', label: 'Archer 2', buttonText: 'A2', max: 1, accentClass: 'bg-danger text-white' }
    ];

    // --- UTILITY FUNCTIONS ---

    // --- ARCHER SELECTOR FUNCTIONS ---
    function initializeArcherSelector() {
        if (!archerSelectionContainer || typeof ArcherSelector === 'undefined') {
            console.warn('ArcherSelector component unavailable.');
            return;
        }

        archerSelector = ArcherSelector.init(archerSelectionContainer, {
            groups: SOLO_SELECTOR_GROUPS,
            emptyMessage: 'No archers found. Sync your roster to begin.',
            onSelectionChange: handleSelectorChange,
            onFavoriteToggle: handleFavoriteToggle,
            showAvatars: true,
            showFavoriteToggle: true
        });
        
        // If we have pending bracket sync, do it now
        if (state.pendingBracketSync && state.archer1 && state.archer2) {
            console.log('[SoloCard] Syncing bracket assignment now that selector is ready');
            syncSelectorSelection();
            state.pendingBracketSync = false;
        }
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
        if (typeof ArcherModule === 'undefined') return { favorites: new Set(), selfExtId: '' };
        const selfExtId = ArcherModule.getSelfExtId() || '';
        
        // Get favorites from self archer's faves array
        let favorites = new Set();
        if (selfExtId) {
            const selfArcher = ArcherModule.loadList().find(a => a.extId === selfExtId);
            if (selfArcher && selfArcher.faves) {
                favorites = new Set(selfArcher.faves);
            }
        }
        
        return {
            favorites,
            selfExtId,
            selfArcher: typeof ArcherModule !== 'undefined' ? ArcherModule.getSelfArcher() : null
        };
    }
    
    // Store self archer reference
    let selfArcher = null;

    function syncSelectorSelection() {
        if (!archerSelector) return;
        const selection = {
            a1: state.archer1 ? [normalizeArcher(state.archer1)] : [],
            a2: state.archer2 ? [normalizeArcher(state.archer2)] : []
        };
        archerSelector.setSelection(selection);
        updateStartButtonState();
    }

    function normalizeArcher(archer) {
        if (!archer) return null;
        return {
            extId: archer.extId || archer.id,
            first: archer.first,
            last: archer.last,
            level: archer.level,
            school: archer.school,
            gender: archer.gender
        };
    }

    function handleSelectorChange(selectionMap) {
        // Convert ArcherSelector format back to Solo module format
        const a1Selection = selectionMap.a1 && selectionMap.a1.length > 0 ? selectionMap.a1[0] : null;
        const a2Selection = selectionMap.a2 && selectionMap.a2.length > 0 ? selectionMap.a2[0] : null;
        
        // Update state
        state.archer1 = a1Selection ? {
            id: `${a1Selection.first}-${a1Selection.last}`,
            extId: a1Selection.extId,
            first: a1Selection.first,
            last: a1Selection.last,
            level: a1Selection.level,
            school: a1Selection.school,
            gender: a1Selection.gender
        } : null;
        
        state.archer2 = a2Selection ? {
            id: `${a2Selection.first}-${a2Selection.last}`,
            extId: a2Selection.extId,
            first: a2Selection.first,
            last: a2Selection.last,
            level: a2Selection.level,
            school: a2Selection.school,
            gender: a2Selection.gender
        } : null;
        
        saveData();
        updateStartButtonState();
    }

    async function handleFavoriteToggle(archerId, isFavorite) {
        if (typeof ArcherModule !== 'undefined' && typeof ArcherModule.toggleFriend === 'function') {
            try {
                await ArcherModule.toggleFriend(archerId);
                refreshArcherRoster(); // Refresh to show updated favorite status
            } catch (err) {
                console.error('Failed to toggle favorite:', err);
            }
        }
    }

    // --- VIEW MANAGEMENT ---
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

    // --- PERSISTENCE ---
    // Phase 2: Only save session state (temporary, can be reconstructed from DB)
    function saveData() {
        try {
            // Only save session state, not scores (scores are in database)
            const sessionState = {
                matchId: state.matchId,
                matchArcherIds: state.matchArcherIds,
                eventId: state.eventId,
                location: state.location,
                currentView: state.currentView,
                // Keep archer selections for UI (will be restored from DB if matchId exists)
                archer1: state.archer1 ? { id: state.archer1.id, first: state.archer1.first, last: state.archer1.last } : null,
                archer2: state.archer2 ? { id: state.archer2.id, first: state.archer2.first, last: state.archer2.last } : null
            };
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
                // Restore session state only
                state.matchId = loadedState.matchId || null;
                state.matchArcherIds = loadedState.matchArcherIds || {};
                state.eventId = loadedState.eventId || null;
                state.location = loadedState.location || '';
                state.currentView = loadedState.currentView || 'setup';
                // Restore archer references (will need to reload from ArcherModule)
                if (loadedState.archer1) {
                    const a1 = ArcherModule.getArcherById(loadedState.archer1.id);
                    if (a1) {
                        a1.id = loadedState.archer1.id;
                        state.archer1 = a1;
                    }
                }
                if (loadedState.archer2) {
                    const a2 = ArcherModule.getArcherById(loadedState.archer2.id);
                    if (a2) {
                        a2.id = loadedState.archer2.id;
                        state.archer2 = a2;
                    }
                }
            } catch (e) {
                console.error("Error parsing stored session state. Starting fresh.", e);
                localStorage.removeItem(sessionKey);
            }
        }
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
     * Clear Solo Match state before hydration
     * Rule 4: Clear State Before Hydration
     */
    function clearSoloMatchState() {
        console.log('[clearSoloMatchState] Clearing state before hydration');
        state.matchId = null;
        state.archer1 = null;
        state.archer2 = null;
        state.scores = { a1: Array(5).fill(null).map(() => ['', '', '']), a2: Array(5).fill(null).map(() => ['', '', '']), so: { a1: '', a2: '' } };
        state.matchArcherIds = {};
        state.eventId = null;
        state.bracketId = null;
        state.location = '';
        state.syncStatus = {};
        state.currentView = 'setup';
    }
    
    /**
     * Validate Solo Match integrity
     * Rule 3: Atomic Data Units - Verify all data belongs to this match
     * @param {Object} matchData - Match data from server
     * @param {string} expectedMatchId - Expected match ID
     */
    function validateSoloMatch(matchData, expectedMatchId) {
        if (!matchData || !matchData.match) {
            throw new Error('Match data is missing');
        }
        
        const match = matchData.match;
        
        // Verify MatchID matches
        if (match.id && match.id !== expectedMatchId) {
            throw new Error(`Match ID mismatch: expected ${expectedMatchId}, got ${match.id}`);
        }
        
        // Verify we have exactly 2 archers
        if (!match.archers || !Array.isArray(match.archers) || match.archers.length < 2) {
            throw new Error('Match must have exactly 2 archers');
        }
        
        // Verify archers have valid positions
        const positions = match.archers.map(a => a.position).sort();
        if (positions[0] !== 1 || positions[1] !== 2) {
            throw new Error('Match archers must have positions 1 and 2');
        }
        
        // Verify archers have UUIDs
        match.archers.forEach((archer, index) => {
            if (!archer.archer_id || !isValidUUID(archer.archer_id)) {
                console.warn(`[validateSoloMatch] Archer ${index + 1} has invalid UUID: ${archer.archer_id}`);
            }
        });
        
        console.log('[validateSoloMatch] ✅ Validation passed');
    }
    
    /**
     * Fetch Solo Match from server
     * Rule 3: Atomic Data Units - Fetch Complete Units from Server
     * @param {string} matchId - Match UUID
     * @returns {Promise<Object>} Match data
     */
    async function fetchSoloMatch(matchId) {
        console.log('[fetchSoloMatch] Fetching Solo Match:', matchId);
        
        // Validate input
        if (!matchId || !isValidUUID(matchId)) {
            throw new Error(`Invalid matchId: ${matchId}`);
        }
        
        if (!window.LiveUpdates) {
            throw new Error('LiveUpdates is not available');
        }
        
        const matchData = await window.LiveUpdates.request(`/solo-matches/${matchId}`, 'GET');
        
        if (!matchData || !matchData.match) {
            throw new Error(`Match not found: ${matchId}`);
        }
        
        console.log('[fetchSoloMatch] ✅ Fetched Solo Match:', {
            matchId: matchData.match.id,
            status: matchData.match.status,
            archerCount: matchData.match.archers?.length || 0
        });
        
        return matchData;
    }
    
    /**
     * Centralized hydration function for Solo Match
     * Rule 6: Centralized Hydration Function
     * 
     * @param {string} matchId - Match UUID
     * @param {Object} options - Hydration options
     *   - mergeLocal: Whether to merge with local scores (default: false)
     *   - clearStateFirst: Whether to clear state before hydration (default: true)
     * @returns {Promise<Object>} Hydrated state
     */
    async function hydrateSoloMatch(matchId, options = {}) {
        console.log('[hydrateSoloMatch] ========== START ==========');
        console.log('[hydrateSoloMatch] Parameters:', { matchId, options });
        
        try {
            // 1. Clear state first (Rule 4)
            if (options.clearStateFirst !== false) {
                clearSoloMatchState();
            }
            
            // 2. Validate inputs (Rule 5)
            const normalizedMatchId = normalizeEntityId(matchId, 'matchId');
            
            // 3. Fetch atomic unit from server (Rule 3)
            const matchData = await fetchSoloMatch(normalizedMatchId);
            
            // 4. Validate atomic unit integrity (Rule 3)
            validateSoloMatch(matchData, normalizedMatchId);
            
            const match = matchData.match;
            
            // 5. Populate metadata from server (Rule 1)
            state.matchId = normalizedMatchId;
            state.eventId = match.event_id || null;
            state.bracketId = match.bracket_id || null;
            state.location = match.location || '';
            
            // 6. Build archers from match data (use UUIDs, not names)
            const matchArchers = match.archers || [];
            if (matchArchers.length < 2) {
                throw new Error('Match must have at least 2 archers');
            }
            
            const a1Data = matchArchers.find(a => a.position === 1);
            const a2Data = matchArchers.find(a => a.position === 2);
            
            if (!a1Data || !a2Data) {
                throw new Error('Match missing archer at position 1 or 2');
            }
            
            // Find archers in master list by UUID (preferred) or fallback to name
            const masterList = ArcherModule.loadList();
            let a1 = masterList.find(a => {
                const archerId = a.id || a.archerId;
                return archerId && archerId === a1Data.archer_id;
            });
            let a2 = masterList.find(a => {
                const archerId = a.id || a.archerId;
                return archerId && archerId === a2Data.archer_id;
            });
            
            // Fallback to name matching if UUID not found
            if (!a1) {
                a1 = masterList.find(a => 
                    `${a.first} ${a.last}`.toLowerCase() === a1Data.archer_name.toLowerCase()
                );
            }
            if (!a2) {
                a2 = masterList.find(a => 
                    `${a.first} ${a.last}`.toLowerCase() === a2Data.archer_name.toLowerCase()
                );
            }
            
            if (!a1 || !a2) {
                throw new Error(`Could not find archers in master list: ${a1Data.archer_name}, ${a2Data.archer_name}`);
            }
            
            // Ensure archer IDs are set
            a1.id = a1.id || `${a1.first}-${a1.last}`;
            a2.id = a2.id || `${a2.first}-${a2.last}`;
            
            state.archer1 = a1;
            state.archer2 = a2;
            state.matchArcherIds = {
                a1: a1Data.id,
                a2: a2Data.id
            };
            
            // 7. Build scores from server data
            state.scores = {
                a1: Array(5).fill(null).map(() => ['', '', '']),
                a2: Array(5).fill(null).map(() => ['', '', '']),
                so: { a1: '', a2: '' }
            };
            
            matchArchers.forEach(archerData => {
                const archerKey = archerData.position === 1 ? 'a1' : 'a2';
                if (archerData.sets && Array.isArray(archerData.sets)) {
                    archerData.sets.forEach(set => {
                        if (set.set_number >= 1 && set.set_number <= 5) {
                            const setIdx = set.set_number - 1;
                            state.scores[archerKey][setIdx] = [
                                set.a1 || '',
                                set.a2 || '',
                                set.a3 || ''
                            ];
                        } else if (set.set_number === 6) {
                            // Shoot-off
                            state.scores.so[archerKey] = set.a1 || '';
                        }
                    });
                }
            });
            
            // 8. Set current view
            state.currentView = 'scoring';
            
            // 9. Save session for recovery
            saveData();
            
            console.log('[hydrateSoloMatch] ✅ Hydration complete:', {
                matchId: state.matchId,
                archer1: `${state.archer1?.first} ${state.archer1?.last}`,
                archer2: `${state.archer2?.first} ${state.archer2?.last}`,
                setsScored: state.scores.a1.filter(s => s.some(v => v)).length
            });
            console.log('[hydrateSoloMatch] ========== END ==========');
            
            return state;
            
        } catch (error) {
            console.error('[hydrateSoloMatch] ❌ Error:', error);
            throw error;
        }
    }
    
    // Phase 2: Restore match from database if matchId exists
    // Now uses centralized hydration function (Phase 0)
    async function restoreMatchFromDatabase() {
        if (!state.matchId) return false;
        
        try {
            console.log('[restoreMatchFromDatabase] Using centralized hydrateSoloMatch()');
            await hydrateSoloMatch(state.matchId, {
                mergeLocal: false,
                clearStateFirst: true
            });
            return true;
        } catch (error) {
            console.error('[restoreMatchFromDatabase] Failed to restore match:', error);
            return false;
        }
    }

    // --- LOGIC ---
    function renderSetupView(filter = '') {
        if (!archerSelector) {
            initializeArcherSelector();
        }
        refreshArcherRoster();
        syncSelectorSelection();
        
        // Apply filter if provided
        if (filter && archerSelector) {
            archerSelector.setFilter(filter);
        }
    }


    function updateStartButtonState() {
        if (state.archer1 && state.archer2) {
            startScoringBtn.disabled = false;
            startScoringBtn.classList.remove('btn-secondary');
            startScoringBtn.classList.add('btn-primary');
        } else {
            startScoringBtn.disabled = true;
            startScoringBtn.classList.add('btn-secondary');
            startScoringBtn.classList.remove('btn-primary');
        }
    }
    
    // Phase 2: Create match in database before starting
    async function startScoring() {
        if (!state.archer1 || !state.archer2) {
            alert("Please select two archers to start the match.");
            return;
        }
        
        // Check if LiveUpdates is available
        if (!window.LiveUpdates || !window.LiveUpdates.ensureSoloMatch) {
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
            console.log('Creating solo match in database...');
            const matchId = await window.LiveUpdates.ensureSoloMatch({
                date: today,
                location: state.location || '',
                eventId: eventId,
                bracketId: bracketId,
                maxSets: 5,
                forceNew: true  // Always create a new match when starting scoring
            });
            
            if (!matchId) {
                throw new Error('Failed to create match in database');
            }
            
            state.matchId = matchId;
            state.eventId = eventId;
            
            // Add archers to match
            console.log('Adding archers to match...');
            const a1Id = state.archer1.id;
            const a2Id = state.archer2.id;
            
            const matchArcherId1 = await window.LiveUpdates.ensureSoloArcher(matchId, a1Id, state.archer1, 1);
            const matchArcherId2 = await window.LiveUpdates.ensureSoloArcher(matchId, a2Id, state.archer2, 2);
            
            if (!matchArcherId1 || !matchArcherId2) {
                throw new Error('Failed to add archers to match');
            }
            
            state.matchArcherIds = {
                a1: matchArcherId1,
                a2: matchArcherId2
            };
            
            // Initialize scores
            if (!state.scores.a1 || state.scores.a1.length !== 5) {
                state.scores.a1 = Array(5).fill(null).map(() => ['', '', '']);
            }
            if (!state.scores.a2 || state.scores.a2.length !== 5) {
                state.scores.a2 = Array(5).fill(null).map(() => ['', '', '']);
            }
            if (!state.scores.so) {
                state.scores.so = { a1: '', a2: '' };
            }
            
            // Initialize sync status
            state.syncStatus = { a1: {}, a2: {} };
            
            state.currentView = 'scoring';
            saveData();
            renderScoringView();
            renderView();
            
            console.log('✅ Solo match started successfully:', matchId);
            
            // Flush any pending queue
            if (window.LiveUpdates.flushSoloQueue) {
                window.LiveUpdates.flushSoloQueue(matchId).catch(e => console.warn('Queue flush failed:', e));
            }
        } catch (e) {
            console.error('Failed to start match:', e);
            alert(`Failed to start match: ${e.message}. Please try again.`);
        }
    }

    function renderScoringView() {
        renderMatchSummary();
        renderScoreTable();
        updateScoreHighlightsAndTotals();
    }

    function renderMatchSummary() {
        if (!state.archer1 || !state.archer2) return;
        const a1Name = `${state.archer1.first} ${state.archer1.last}`;
        const a2Name = `${state.archer2.first} ${state.archer2.last}`;
        matchSummaryDisplay.innerHTML = `
            <span class="team-summary a1-summary text-blue-600 dark:text-blue-400 font-bold">${a1Name}</span>
            <span style="margin: 0 10px;" class="text-gray-800 dark:text-white">vs</span>
            <span class="team-summary a2-summary text-red-600 dark:text-red-400 font-bold">${a2Name}</span>
        `;
    }

    function renderScoreTable() {
        // Ensure scores arrays are initialized
        if (!state.scores.a1 || !Array.isArray(state.scores.a1)) {
            state.scores.a1 = [[], [], [], [], []];
        }
        if (!state.scores.a2 || !Array.isArray(state.scores.a2)) {
            state.scores.a2 = [[], [], [], [], []];
        }
        // Ensure each end array has 3 elements (for 3 arrows)
        for (let i = 0; i < 5; i++) {
            if (!state.scores.a1[i] || !Array.isArray(state.scores.a1[i])) {
                state.scores.a1[i] = ['', '', ''];
            }
            if (!state.scores.a2[i] || !Array.isArray(state.scores.a2[i])) {
                state.scores.a2[i] = ['', '', ''];
            }
        }
        
        let tableHTML = `<table class="w-full border-collapse text-sm bg-white dark:bg-gray-700" id="solo_round_table">
            <thead class="bg-primary dark:bg-primary-dark text-white sticky top-0">
                <tr>
                    <th rowspan="2" class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">End</th>
                    <th colspan="3" class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">Archer 1</th>
                    <th colspan="3" class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">Archer 2</th>
                    <th colspan="2" class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">End Total</th>
                    <th colspan="2" class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">Set Points</th>
                    <th rowspan="2" class="px-2 py-2 text-center font-bold text-white">Sync</th>
                </tr>
                <tr>
                    <th class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">A1</th>
                    <th class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">A2</th>
                    <th class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">A3</th>
                    <th class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">A1</th>
                    <th class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">A2</th>
                    <th class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">A3</th>
                    <th class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">A1</th>
                    <th class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">A2</th>
                    <th class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">A1</th>
                    <th class="px-2 py-2 text-center font-bold text-white border-r border-gray-300 dark:border-gray-600">A2</th>
                </tr>
            </thead>
            <tbody>`;

        for (let i = 0; i < 5; i++) {
            const setNumber = i + 1;
            const syncStatusA1 = state.syncStatus?.a1?.[setNumber] || '';
            const syncStatusA2 = state.syncStatus?.a2?.[setNumber] || '';
            const syncIcon = getSyncStatusIcon(syncStatusA1, syncStatusA2);
            
            tableHTML += `<tr id="end-${i+1}" class="border-b border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-600">
                <td class="px-2 py-1 text-center font-semibold bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white border-r border-gray-200 dark:border-gray-600">End ${i+1}</td>
                <td class="p-0 border-r border-gray-200 dark:border-gray-600 ${getScoreColor(state.scores.a1[i][0])}"><input type="text" class="score-input w-full h-full min-h-[44px] text-center font-bold border-none bg-transparent" data-archer="a1" data-end="${i}" data-arrow="0" value="${state.scores.a1[i][0]}" readonly></td>
                <td class="p-0 border-r border-gray-200 dark:border-gray-600 ${getScoreColor(state.scores.a1[i][1])}"><input type="text" class="score-input w-full h-full min-h-[44px] text-center font-bold border-none bg-transparent" data-archer="a1" data-end="${i}" data-arrow="1" value="${state.scores.a1[i][1]}" readonly></td>
                <td class="p-0 border-r border-gray-200 dark:border-gray-600 ${getScoreColor(state.scores.a1[i][2])}"><input type="text" class="score-input w-full h-full min-h-[44px] text-center font-bold border-none bg-transparent" data-archer="a1" data-end="${i}" data-arrow="2" value="${state.scores.a1[i][2]}" readonly></td>
                <td class="p-0 border-r border-gray-200 dark:border-gray-600 ${getScoreColor(state.scores.a2[i][0])}"><input type="text" class="score-input w-full h-full min-h-[44px] text-center font-bold border-none bg-transparent" data-archer="a2" data-end="${i}" data-arrow="0" value="${state.scores.a2[i][0]}" readonly></td>
                <td class="p-0 border-r border-gray-200 dark:border-gray-600 ${getScoreColor(state.scores.a2[i][1])}"><input type="text" class="score-input w-full h-full min-h-[44px] text-center font-bold border-none bg-transparent" data-archer="a2" data-end="${i}" data-arrow="1" value="${state.scores.a2[i][1]}" readonly></td>
                <td class="p-0 border-r border-gray-200 dark:border-gray-600 ${getScoreColor(state.scores.a2[i][2])}"><input type="text" class="score-input w-full h-full min-h-[44px] text-center font-bold border-none bg-transparent" data-archer="a2" data-end="${i}" data-arrow="2" value="${state.scores.a2[i][2]}" readonly></td>
                <td class="px-2 py-1 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold border-r border-gray-200 dark:border-gray-600" id="a1-e${i+1}-total"></td>
                <td class="px-2 py-1 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold border-r border-gray-200 dark:border-gray-600" id="a2-e${i+1}-total"></td>
                <td class="px-2 py-1 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold border-r border-gray-200 dark:border-gray-600" id="a1-e${i+1}-setpts"></td>
                <td class="px-2 py-1 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold border-r border-gray-200 dark:border-gray-600" id="a2-e${i+1}-setpts"></td>
                <td class="px-2 py-1 text-center" id="sync-e${i+1}" data-set="${setNumber}">${syncIcon}</td>
            </tr>`;
        }

        const soSyncStatusA1 = state.syncStatus?.a1?.[6] || '';
        const soSyncStatusA2 = state.syncStatus?.a2?.[6] || '';
        const soSyncIcon = getSyncStatusIcon(soSyncStatusA1, soSyncStatusA2);
        
        tableHTML += `
                <tr id="shoot-off" class="hidden border-b border-gray-200 dark:border-gray-600">
                <td class="px-2 py-1 text-center font-semibold bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white border-r border-gray-200 dark:border-gray-600">S.O.</td>
                <td colspan="2" class="p-0 border-r border-gray-200 dark:border-gray-600 ${getScoreColor(state.scores.so.a1)}"><input type="text" class="score-input w-full h-full min-h-[44px] text-center font-bold border-none bg-transparent" data-archer="a1" data-end="so" data-arrow="0" value="${state.scores.so.a1}" readonly></td><td class="border-r border-gray-200 dark:border-gray-600"></td>
                <td colspan="2" class="p-0 border-r border-gray-200 dark:border-gray-600 ${getScoreColor(state.scores.so.a2)}"><input type="text" class="score-input w-full h-full min-h-[44px] text-center font-bold border-none bg-transparent" data-archer="a2" data-end="so" data-arrow="0" value="${state.scores.so.a2}" readonly></td><td class="border-r border-gray-200 dark:border-gray-600"></td>
                <td class="px-2 py-1 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold border-r border-gray-200 dark:border-gray-600" id="a1-so-total"></td>
                <td class="px-2 py-1 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold border-r border-gray-200 dark:border-gray-600" id="a2-so-total"></td>
                <td colspan="2" id="so-winner-cell" class="px-2 py-1 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold border-r border-gray-200 dark:border-gray-600">
                    <span id="so-winner-text"></span>
                    <span class="tie-breaker-controls hidden">
                        <button class="px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold transition-colors min-h-[44px]" data-winner="a1">A1 Wins</button>
                        <button class="px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold transition-colors min-h-[44px]" data-winner="a2">A2 Wins</button>
                    </span>
                </td>
                <td class="px-2 py-1 text-center" id="sync-so" data-set="6">${soSyncIcon}</td>
            </tr>
            </tbody>
            <tfoot class="bg-gray-200 dark:bg-gray-600">
                <tr>
                    <td colspan="8" class="px-2 py-2 text-right font-bold dark:text-white">Match Score:</td>
                    <td class="px-2 py-2 text-center font-bold dark:text-white" id="a1-match-score"></td>
                    <td class="px-2 py-2 text-center font-bold dark:text-white" id="a2-match-score"></td>
                    <td></td>
                </tr>
                <tr><td colspan="11" id="match-result"></td></tr>
            </tfoot>
        </table>`;
        scoreTableContainer.innerHTML = tableHTML;
    }

    function updateScoreHighlightsAndTotals() {
        let a1MatchScore = 0;
        let a2MatchScore = 0;
        let matchOver = false;
        let winner = null;

        for (let i = 0; i < 5; i++) {
            const endScoresA1 = state.scores.a1[i];
            const endScoresA2 = state.scores.a2[i];
            
            const isCompleteA1 = endScoresA1.every(s => s !== '' && s !== null);
            const isCompleteA2 = endScoresA2.every(s => s !== '' && s !== null);
            const endComplete = isCompleteA1 && isCompleteA2;

            const a1EndTotal = isCompleteA1 ? endScoresA1.reduce((sum, s) => sum + parseScoreValue(s), 0) : 0;
            const a2EndTotal = isCompleteA2 ? endScoresA2.reduce((sum, s) => sum + parseScoreValue(s), 0) : 0;

            document.getElementById(`a1-e${i+1}-total`).textContent = isCompleteA1 ? a1EndTotal : '';
            document.getElementById(`a2-e${i+1}-total`).textContent = isCompleteA2 ? a2EndTotal : '';

            let a1SetPoints = 0;
            let a2SetPoints = 0;
            if (!matchOver && endComplete) {
                if (a1EndTotal > a2EndTotal) a1SetPoints = 2;
                else if (a2EndTotal > a1EndTotal) a2SetPoints = 2;
                else { a1SetPoints = 1; a2SetPoints = 1; }
                a1MatchScore += a1SetPoints;
                a2MatchScore += a2SetPoints;

                if (a1MatchScore >= 6 || a2MatchScore >= 6) {
                    matchOver = true;
                    winner = a1MatchScore > a2MatchScore ? 'a1' : 'a2';
                }
            }
            document.getElementById(`a1-e${i+1}-setpts`).textContent = endComplete ? a1SetPoints : '';
            document.getElementById(`a2-e${i+1}-setpts`).textContent = endComplete ? a2SetPoints : '';
        }

        document.getElementById('a1-match-score').textContent = a1MatchScore;
        document.getElementById('a2-match-score').textContent = a2MatchScore;
        
        const shootOffRow = document.getElementById('shoot-off');
        const soWinnerText = document.getElementById('so-winner-text');
        const tieBreakerControls = document.querySelector('.tie-breaker-controls');

        if (!matchOver && a1MatchScore === 5 && a2MatchScore === 5) {
            shootOffRow.classList.remove('hidden');
            shootOffRow.classList.add('table-row');
            const soScoreA1 = state.scores.so.a1;
            const soScoreA2 = state.scores.so.a2;
            const soValueA1 = parseScoreValue(soScoreA1);
            const soValueA2 = parseScoreValue(soScoreA2);
            document.getElementById('a1-so-total').textContent = soScoreA1 ? soValueA1 : '';
            document.getElementById('a2-so-total').textContent = soScoreA2 ? soValueA2 : '';

            if (soScoreA1 !== '' && soScoreA2 !== '') {
                if (soValueA1 > soValueA2) {
                    winner = 'a1';
                    matchOver = true;
                    soWinnerText.textContent = "A1 Wins S.O.";
                    tieBreakerControls.classList.add('hidden');
                    tieBreakerControls.classList.remove('inline-block');
                } else if (soValueA2 > soValueA1) {
                    winner = 'a2';
                    matchOver = true;
                    soWinnerText.textContent = "A2 Wins S.O.";
                    tieBreakerControls.classList.add('hidden');
                    tieBreakerControls.classList.remove('inline-block');
                } else {
                    if (state.shootOffWinner) {
                         winner = state.shootOffWinner;
                         matchOver = true;
                         soWinnerText.textContent = `S.O. Tied! ${winner === 'a1' ? 'A1' : 'A2'} Wins (Closest)`;
                         tieBreakerControls.classList.add('hidden');
                    tieBreakerControls.classList.remove('inline-block');
                    } else {
                        soWinnerText.textContent = 'Tied! Judge Call:';
                        tieBreakerControls.classList.remove('hidden');
                        tieBreakerControls.classList.add('inline-block');
                    }
                }
            } else {
                soWinnerText.textContent = 'Enter S.O. Scores';
                tieBreakerControls.classList.add('hidden');
                tieBreakerControls.classList.remove('inline-block');
            }
        } else {
            shootOffRow.classList.add('hidden');
            shootOffRow.classList.remove('table-row');
        }

        const matchResultEl = document.getElementById('match-result');
        if (matchOver) {
            const winnerName = (winner === 'a1' ? state.archer1.first : state.archer2.first);
            matchResultEl.textContent = `Match Over: ${winnerName} Wins!`;
            matchResultEl.style.color = 'var(--primary-green)';
        } else {
            matchResultEl.textContent = 'Match in Progress...';
            matchResultEl.style.color = 'var(--medium-gray)';
        }
    }

    function renderKeypad() {
        if (!keypadElement) return;
        // New 4x3 layout: Tailwind CSS, no gaps, no navigation buttons, no rounded corners, edge-to-edge borders
        keypadElement.innerHTML = `
            <div class="grid grid-cols-4 gap-0 w-full">
                <!-- Row 1: X, 10, 9, M -->
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-gold text-black min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 rounded-none" style="border-radius: 0 !important;" data-value="X">X</button>
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-gold text-black min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 rounded-none" style="border-radius: 0 !important;" data-value="10">10</button>
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-gold text-black min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 rounded-none" style="border-radius: 0 !important;" data-value="9">9</button>
                <button class="keypad-btn p-4 text-xl font-bold border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-gray-200 dark:bg-gray-200 text-black dark:text-black min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 rounded-none" style="border-radius: 0 !important;" data-value="M">M</button>
                
                <!-- Row 2: 8, 7, 6, 5 -->
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-red text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 rounded-none" style="border-radius: 0 !important;" data-value="8">8</button>
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-red text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 rounded-none" style="border-radius: 0 !important;" data-value="7">7</button>
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-blue text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 rounded-none" style="border-radius: 0 !important;" data-value="6">6</button>
                <button class="keypad-btn p-4 text-xl font-bold border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-blue text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 rounded-none" style="border-radius: 0 !important;" data-value="5">5</button>
                
                <!-- Row 3: 4, 3, 2, 1 -->
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-black text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 rounded-none" style="border-radius: 0 !important;" data-value="4">4</button>
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-black text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 rounded-none" style="border-radius: 0 !important;" data-value="3">3</button>
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-white text-black min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 rounded-none" style="border-radius: 0 !important;" data-value="2">2</button>
                <button class="keypad-btn p-4 text-xl font-bold border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-white text-black min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 rounded-none" style="border-radius: 0 !important;" data-value="1">1</button>
                
                <!-- Row 4: CLOSE (left), CLEAR (right) -->
                <button class="keypad-btn p-4 text-lg font-bold border-r border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 col-span-2 rounded-none" style="border-radius: 0 !important;" data-action="close">CLOSE</button>
                <button class="keypad-btn p-4 text-lg font-bold cursor-pointer transition-all duration-150 flex items-center justify-center bg-danger-light dark:bg-danger-dark text-danger-dark dark:text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 col-span-2 rounded-none" style="border-radius: 0 !important;" data-action="clear">CLEAR</button>
            </div>
        `;
    }

    function handleKeypadClick(e) {
        const button = e.target.closest('.keypad-btn');
        if (!button || !keypad.currentlyFocusedInput) return;

        const action = button.dataset.action;
        const value = button.dataset.value;
        const input = keypad.currentlyFocusedInput;

        // --- Close action ---
        if (action === 'close') {
            keypadElement.classList.add('hidden');
            keypadElement.classList.remove('grid');
            document.body.classList.remove('keypad-visible');
            return;
        }

        // --- Score Entry ---
        if (action === 'clear') {
            input.value = '';
        } else if (value) {
            input.value = value;
        }

        // Dispatch an event to trigger the update
        input.dispatchEvent(new Event('input', { bubbles: true }));

        // Auto-advance focus after score entry (but not for clear)
        if (value) {
            // Re-fetch the list of inputs as the DOM may have been updated
            const allInputs = Array.from(document.querySelectorAll('#scoring-view input[type="text"]'));
            // Find the index of the *current* input by its unique data attributes,
            // not by object reference, which can be stale.
            const currentIndex = allInputs.findIndex(el => 
                el.dataset.archer === input.dataset.archer &&
                el.dataset.end === input.dataset.end &&
                el.dataset.arrow === input.dataset.arrow
            );

            if (currentIndex !== -1 && currentIndex < allInputs.length - 1) {
                allInputs[currentIndex + 1].focus();
            } else {
                // If it's the last input, close the keypad
                keypadElement.classList.add('hidden');
            keypadElement.classList.remove('grid');
                document.body.classList.remove('keypad-visible');
            }
        }
    }

    // Phase 2: Post scores to database when entered
    async function handleScoreInput(e) {
        const input = e.target;
        const { archer, end, arrow } = input.dataset;

        if (end === 'so') {
            state.scores.so[archer] = input.value;
        } else {
            state.scores[archer][parseInt(end, 10)][parseInt(arrow, 10)] = input.value;
        }

        // Re-render the entire view to ensure consistency
        renderScoringView();
        saveData();
        
        // Phase 2: Post to database if match is active
        if (state.matchId && state.matchArcherIds[archer] && window.LiveUpdates && window.LiveUpdates.postSoloSet) {
            const setNumber = end === 'so' ? 6 : (parseInt(end, 10) + 1);
            const matchArcherId = state.matchArcherIds[archer];
            
            // Calculate set totals and points
            const setScores = end === 'so' 
                ? [state.scores.so[archer], '', ''] 
                : state.scores[archer][parseInt(end, 10)];
            
            const setTotal = setScores.reduce((sum, s) => sum + parseScoreValue(s), 0);
            
            // Calculate set points (compare with opponent)
            let setPoints = 0;
            let runningPoints = 0;
            if (end !== 'so') {
                const opponentArcher = archer === 'a1' ? 'a2' : 'a1';
                const opponentScores = state.scores[opponentArcher][parseInt(end, 10)];
                const opponentTotal = opponentScores.reduce((sum, s) => sum + parseScoreValue(s), 0);
                
                if (setTotal > opponentTotal) setPoints = 2;
                else if (setTotal < opponentTotal) setPoints = 0;
                else setPoints = 1;
                
                // Calculate running points (sum of all previous sets)
                const currentSet = parseInt(end, 10);
                for (let i = 0; i <= currentSet; i++) {
                    const myScores = state.scores[archer][i];
                    const oppScores = state.scores[opponentArcher][i];
                    const myTotal = myScores.reduce((sum, s) => sum + parseScoreValue(s), 0);
                    const oppTotal = oppScores.reduce((sum, s) => sum + parseScoreValue(s), 0);
                    if (myTotal > oppTotal) runningPoints += 2;
                    else if (myTotal === oppTotal) runningPoints += 1;
                }
            }
            
            // Count tens and Xs
            const tens = setScores.filter(s => parseScoreValue(s) === 10).length;
            const xs = setScores.filter(s => String(s).toUpperCase() === 'X').length;
            
            // Only post if all 3 arrows are entered (or shoot-off with 1 arrow)
            const isComplete = end === 'so' 
                ? (state.scores.so.a1 !== '' && state.scores.so.a2 !== '')
                : setScores.every(s => s !== '' && s !== null);
            
            if (isComplete) {
                try {
                    updateSyncStatus(archer, setNumber, 'pending');
                    await window.LiveUpdates.postSoloSet(state.matchId, matchArcherId, setNumber, {
                        a1: setScores[0] || null,
                        a2: setScores[1] || null,
                        a3: setScores[2] || null,
                        setTotal,
                        setPoints,
                        runningPoints,
                        tens,
                        xs
                    });
                    updateSyncStatus(archer, setNumber, 'synced');
                } catch (e) {
                    console.error('Failed to sync set to database:', e);
                    updateSyncStatus(archer, setNumber, 'failed');
                }
            }
        }
    }
    
    // Phase 2: Update sync status for UI feedback
    function updateSyncStatus(archer, setNumber, status) {
        if (!state.syncStatus[archer]) state.syncStatus[archer] = {};
        state.syncStatus[archer][setNumber] = status;
        
        // Update UI indicator - find the cell for this set
        const setId = setNumber === 6 ? 'so' : setNumber;
        const syncCell = document.getElementById(`sync-e${setId}`);
        if (syncCell) {
            const syncStatusA1 = state.syncStatus?.a1?.[setNumber] || '';
            const syncStatusA2 = state.syncStatus?.a2?.[setNumber] || '';
            syncCell.innerHTML = getSyncStatusIcon(syncStatusA1, syncStatusA2);
        }
    }
    
    // Phase 2: Get sync status icon (shows worst status if both archers have status)
    function getSyncStatusIcon(statusA1, statusA2) {
        // Determine overall status (failed > pending > synced > none)
        let overallStatus = '';
        if (statusA1 === 'failed' || statusA2 === 'failed') {
            overallStatus = 'failed';
        } else if (statusA1 === 'pending' || statusA2 === 'pending') {
            overallStatus = 'pending';
        } else if (statusA1 === 'synced' || statusA2 === 'synced') {
            overallStatus = 'synced';
        }
        
        const icons = {
            'synced': '<span class="sync-status-icon" style="color: #4caf50; font-size: 1.2em;" title="Synced">✓</span>',
            'pending': '<span class="sync-status-icon" style="color: #ff9800; font-size: 1.2em;" title="Pending">⟳</span>',
            'failed': '<span class="sync-status-icon" style="color: #f44336; font-size: 1.2em;" title="Failed">✗</span>',
            '': '<span class="sync-status-icon" style="color: #ccc; font-size: 1.2em;" title="Not Synced">○</span>'
        };
        return icons[overallStatus] || icons[''];
    }
    
    // Phase 2: Reset clears session state (database match remains for coach visibility)
    function resetMatch() {
        if(confirm("Are you sure you want to start a new match? This will clear all scores.")) {
            // Clear cached match from localStorage so a new match will be created
            const oldMatchId = state.matchId;
            if (oldMatchId) {
                // Clear the match code cache
                localStorage.removeItem(`solo_match_code:${oldMatchId}`);
                // Clear archer mappings for this match
                localStorage.removeItem(`solo_archer:${oldMatchId}:1`);
                localStorage.removeItem(`solo_archer:${oldMatchId}:2`);
            }
            // Clear the match cache by date/event so ensureSoloMatch will create a new one
            const today = new Date().toISOString().split('T')[0];
            const urlParams = new URLSearchParams(window.location.search);
            const eventId = urlParams.get('event') || state.eventId || null;
            const matchKey = `solo_match:${eventId || 'standalone'}:${today}`;
            localStorage.removeItem(matchKey);
            
            state.archer1 = null;
            state.archer2 = null;
            state.scores = {};
            state.shootOffWinner = null;
            state.currentView = 'setup';
            // Phase 2: Clear database references (match remains in DB for coach)
            state.matchId = null;
            state.matchArcherIds = {};
            state.eventId = null;
            state.syncStatus = {};
            localStorage.removeItem(sessionKey);
            renderSetupView();
            renderView();
        }
    }
    
    function editSetup() {
        state.currentView = 'setup';
        renderView();
    }

    // --- SCREENSHOT & EXPORT FUNCTIONS ---

    function takeScreenshot() {
        const scoreTableContainer = document.getElementById('score-table-container');
        if (!scoreTableContainer) {
            alert('No scorecard to capture');
            return;
        }

        // Show loading state
        const originalContent = scoreTableContainer.innerHTML;
        scoreTableContainer.innerHTML = '<div style="text-align: center; padding: 2rem;">Generating screenshot...</div>';

        html2canvas(scoreTableContainer, {
            scale: 2, // Higher resolution
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: scoreTableContainer.offsetWidth,
            height: scoreTableContainer.offsetHeight
        }).then(canvas => {
            // Restore original content
            scoreTableContainer.innerHTML = originalContent;

            // Create download link
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `solo_match_${state.archer1?.first}_vs_${state.archer2?.first}_${timestamp}.png`;
            
            link.download = filename;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }).catch(error => {
            console.error('Screenshot failed:', error);
            scoreTableContainer.innerHTML = originalContent;
            alert('Failed to generate screenshot. Please try again.');
        });
    }

    function exportJSON() {
        if (!state.archer1 || !state.archer2) {
            alert('No match data to export');
            return;
        }

        const exportData = {
            metadata: {
                app: 'SoloCard',
                version: state.version,
                exportDate: new Date().toISOString(),
                matchType: 'Solo Olympic Round'
            },
            archers: {
                archer1: {
                    id: state.archer1.id,
                    firstName: state.archer1.first,
                    lastName: state.archer1.last,
                    school: state.archer1.school,
                    level: state.archer1.level,
                    gender: state.archer1.gender
                },
                archer2: {
                    id: state.archer2.id,
                    firstName: state.archer2.first,
                    lastName: state.archer2.last,
                    school: state.archer2.school,
                    level: state.archer2.level,
                    gender: state.archer2.gender
                }
            },
            scores: state.scores,
            matchResult: calculateMatchResult()
        };

        return JSON.stringify(exportData, null, 2);
    }

    function downloadJSON() {
        const jsonData = exportJSON();
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `solo_match_${state.archer1?.first}_vs_${state.archer2?.first}_${timestamp}.json`;
        
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    function copyJSONToClipboard() {
        const jsonData = exportJSON();
        navigator.clipboard.writeText(jsonData).then(() => {
            alert('JSON data copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
            alert('Failed to copy to clipboard. Please try again.');
        });
    }

    function emailCoach() {
        const jsonData = exportJSON();
        const subject = `Solo Match - ${state.archer1?.first} vs ${state.archer2?.first}`;
        const body = `Please find attached the solo match data.\n\nArcher 1: ${state.archer1?.first} ${state.archer1?.last}\nArcher 2: ${state.archer2?.first} ${state.archer2?.last}\n\nJSON Data:\n${jsonData}`;
        
        window.location.href = `mailto:davinciarchers@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    function calculateMatchResult() {
        let a1MatchScore = 0;
        let a2MatchScore = 0;
        let matchOver = false;
        let winner = null;

        for (let i = 0; i < 5; i++) {
            const endScoresA1 = state.scores.a1[i];
            const endScoresA2 = state.scores.a2[i];
            
            const isCompleteA1 = endScoresA1.every(s => s !== '' && s !== null);
            const isCompleteA2 = endScoresA2.every(s => s !== '' && s !== null);
            const endComplete = isCompleteA1 && isCompleteA2;

            if (!matchOver && endComplete) {
                const a1EndTotal = endScoresA1.reduce((sum, s) => sum + parseScoreValue(s), 0);
                const a2EndTotal = endScoresA2.reduce((sum, s) => sum + parseScoreValue(s), 0);

                let a1SetPoints = 0;
                let a2SetPoints = 0;
                
                if (a1EndTotal > a2EndTotal) a1SetPoints = 2;
                else if (a2EndTotal > a1EndTotal) a2SetPoints = 2;
                else { a1SetPoints = 1; a2SetPoints = 1; }
                
                a1MatchScore += a1SetPoints;
                a2MatchScore += a2SetPoints;

                if (a1MatchScore >= 6 || a2MatchScore >= 6) {
                    matchOver = true;
                    winner = a1MatchScore > a2MatchScore ? 'a1' : 'a2';
                }
            }
        }

        // Check shoot-off if match is tied
        if (!matchOver && a1MatchScore === 5 && a2MatchScore === 5) {
            const soScoreA1 = state.scores.so.a1;
            const soScoreA2 = state.scores.so.a2;
            const soValueA1 = parseScoreValue(soScoreA1);
            const soValueA2 = parseScoreValue(soScoreA2);

            if (soScoreA1 !== '' && soScoreA2 !== '') {
                if (soValueA1 > soValueA2) {
                    winner = 'a1';
                    matchOver = true;
                } else if (soValueA2 > soValueA1) {
                    winner = 'a2';
                    matchOver = true;
                } else if (state.shootOffWinner) {
                    winner = state.shootOffWinner;
                    matchOver = true;
                }
            }
        }

        return {
            a1MatchScore,
            a2MatchScore,
            matchOver,
            winner: winner ? (winner === 'a1' ? state.archer1.first : state.archer2.first) : null
        };
    }

    function showExportModal() {
        const exportModal = document.getElementById('export-modal');
        if (exportModal) {
            exportModal.classList.remove('hidden');
            exportModal.classList.add('flex');
        }
    }

    function hideExportModal() {
        const exportModal = document.getElementById('export-modal');
        if (exportModal) {
            exportModal.classList.add('hidden');
            exportModal.classList.remove('flex');
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
                state.brackets = (data.brackets || []).filter(b => b.bracket_type === 'SOLO');
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
    
    async function handleBracketSelection() {
        state.bracketId = bracketSelect.value || null;
        updateMatchTypeIndicator();
        
        // For elimination brackets, check if archer has an assigned match
        if (state.bracketId && typeof ArcherModule !== 'undefined') {
            const selfArcher = ArcherModule.getSelfArcher();
            console.log('[SoloCard] Bracket selected, checking assignment for archer:', selfArcher);
            if (selfArcher) {
                // Try multiple ID formats
                const archerId = selfArcher.id || selfArcher.extId || (selfArcher.first && selfArcher.last ? `${selfArcher.first}-${selfArcher.last}` : null);
                if (archerId) {
                    console.log('[SoloCard] Loading bracket assignment for:', archerId);
                    await loadBracketAssignment(archerId);
                } else {
                    console.log('[SoloCard] No archer ID found in selfArcher:', selfArcher);
                }
            } else {
                console.log('[SoloCard] No self archer found');
            }
        }
        
        saveData();
    }
    
    async function loadBracketAssignment(archerId) {
        if (!state.bracketId || !archerId) {
            console.log('[SoloCard] Cannot load assignment - missing bracketId or archerId:', { bracketId: state.bracketId, archerId });
            return;
        }
        
        // Try to get database UUID from archer, or use name-based lookup
        let url;
        if (typeof ArcherModule !== 'undefined') {
            const selfArcher = ArcherModule.getSelfArcher();
            if (selfArcher) {
                const firstName = selfArcher.first || '';
                const lastName = selfArcher.last || '';
                
                // First try UUID if it looks like one
                if (archerId.length === 36 && archerId.includes('-')) {
                    url = `api/v1/brackets/${state.bracketId}/archer-assignment/${archerId}`;
                } else if (firstName && lastName) {
                    // Use name-based lookup
                    url = `api/v1/brackets/${state.bracketId}/archer-assignment/by-name/${encodeURIComponent(firstName)}/${encodeURIComponent(lastName)}`;
                    console.log('[SoloCard] Using name-based lookup:', firstName, lastName);
                } else {
                    url = `api/v1/brackets/${state.bracketId}/archer-assignment/${archerId}`;
                }
            } else {
                url = `api/v1/brackets/${state.bracketId}/archer-assignment/${archerId}`;
            }
        } else {
            url = `api/v1/brackets/${state.bracketId}/archer-assignment/${archerId}`;
        }
        
        try {
            console.log('[SoloCard] Fetching bracket assignment from:', url);
            const response = await fetch(url);
            console.log('[SoloCard] Assignment response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('[SoloCard] Assignment data:', data);
                
                if (data.assignment && data.assignment.opponent) {
                    // Pre-populate opponent for elimination bracket
                    const opponent = data.assignment.opponent;
                    
                        // Find opponent in archer list
                        if (typeof ArcherModule !== 'undefined') {
                            // Refresh roster to ensure we have latest archers
                            refreshArcherRoster();
                            const roster = ArcherModule.loadList() || [];
                            const currentSelfArcher = ArcherModule.getSelfArcher();
                        
                        console.log('[SoloCard] Looking for opponent in roster:', opponent.name, 'ID:', opponent.id);
                        console.log('[SoloCard] Roster size:', roster.length);
                        
                        // Try to find opponent by ID first, then by name
                        let opponentArcher = roster.find(a => {
                            const aId = a.id || a.archerId || `${a.first}-${a.last}`;
                            return aId === opponent.id;
                        });
                        
                        if (!opponentArcher) {
                            console.log('[SoloCard] Opponent not found by ID, trying name match...');
                            // Try by name match (case insensitive, handle variations)
                            opponentArcher = roster.find(a => {
                                if (!a.first || !a.last) return false;
                                const fullName = `${a.first} ${a.last}`.toLowerCase().trim();
                                const opponentName = opponent.name.toLowerCase().trim();
                                return fullName === opponentName;
                            });
                            
                            if (!opponentArcher) {
                                // Try partial match (first name + last name initial)
                                const opponentParts = opponent.name.toLowerCase().trim().split(' ');
                                if (opponentParts.length >= 2) {
                                    opponentArcher = roster.find(a => {
                                        if (!a.first || !a.last) return false;
                                        return a.first.toLowerCase() === opponentParts[0] &&
                                               a.last.toLowerCase().startsWith(opponentParts[1]);
                                    });
                                }
                            }
                        }
                        
                        if (opponentArcher) {
                            console.log('[SoloCard] Found opponent in roster:', opponentArcher);
                        } else {
                            console.log('[SoloCard] Opponent NOT found in roster. Available archers:', roster.map(a => `${a.first} ${a.last}`).slice(0, 10));
                        }
                        
                        // Set archer 1 (self) if not already set
                        if (!state.archer1 && currentSelfArcher) {
                            state.archer1 = normalizeArcher(currentSelfArcher);
                            console.log('[SoloCard] Set archer1 (self):', state.archer1);
                        }
                        
                        if (opponentArcher) {
                            // Set archer 2 (opponent)
                            state.archer2 = normalizeArcher(opponentArcher);
                            console.log('[SoloCard] Set archer2 (opponent):', state.archer2);
                            
                            // Sync selection if selector is ready
                            if (archerSelector) {
                                syncSelectorSelection();
                                console.log('[SoloCard] Synced selector with archers');
                            } else {
                                console.log('[SoloCard] Archer selector not ready yet, will sync when ready');
                                // Store flag to sync later
                                state.pendingBracketSync = true;
                            }
                        } else {
                            console.log('[SoloCard] Opponent not found in roster:', opponent.name);
                        }
                        
                        // Show assignment info in match type indicator
                        if (matchTypeText) {
                            const matchInfo = data.assignment.match_id || `Quarter Final ${data.assignment.match_number}`;
                            const bracket = state.brackets.find(b => b.id === state.bracketId);
                            const event = state.events.find(e => e.id === state.eventId);
                            const formatText = bracket?.bracket_format === 'ELIMINATION' ? 'Elimination' : 'Swiss';
                            const eventName = event?.name || 'Event';
                            
                            matchTypeText.textContent = `${formatText} bracket: ${matchInfo} - You (Seed ${data.archer.seed}) vs ${opponent.name} (Seed ${opponent.seed})`;
                            matchTypeText.classList.add('font-semibold', 'text-primary');
                            console.log('[SoloCard] Updated match type indicator with assignment');
                        }
                    }
                } else if (data.assignment && data.assignment.message) {
                    // Swiss bracket - show message
                    if (matchTypeText) {
                        matchTypeText.textContent = data.assignment.message;
                    }
                }
            }
        } catch (error) {
            console.log('Could not load bracket assignment:', error);
        }
    }
    
    function updateMatchTypeIndicator() {
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
        // Phase 2: Try to load archer list from MySQL first (public endpoint)
        try {
            if (window.LiveUpdates && window.LiveUpdates.request) {
                await ArcherModule.loadFromMySQL();
                console.log('✅ Archer list loaded from MySQL');
            } else {
                console.warn('⚠️ LiveUpdates not available, loading from CSV/localStorage');
                await ArcherModule.loadDefaultCSVIfNeeded();
            }
        } catch (e) {
            console.warn('⚠️ Failed to load from MySQL, falling back to CSV:', e);
            await ArcherModule.loadDefaultCSVIfNeeded();
        }
        
        loadData();
        renderKeypad();
        initializeArcherSelector();
        
        // After selector is initialized, sync any pending bracket assignment
        // Use setTimeout to ensure selector is fully ready
        setTimeout(() => {
            if (state.pendingBracketSync && state.archer1 && state.archer2 && archerSelector) {
                console.log('[SoloCard] Syncing bracket assignment after selector initialization');
                syncSelectorSelection();
                state.pendingBracketSync = false;
            }
        }, 200);
        
        // Phase 2: Restore match from database if matchId exists
        if (state.matchId && window.LiveUpdates) {
            const restored = await restoreMatchFromDatabase();
            if (restored) {
                console.log('✅ Match restored from database');
                // Flush any pending queue
                if (window.LiveUpdates.flushSoloQueue) {
                    window.LiveUpdates.flushSoloQueue(state.matchId).catch(e => 
                        console.warn('Queue flush failed:', e)
                    );
                }
            } else {
                console.log('⚠️ Match not found in database, starting fresh');
                // Clear invalid matchId
                state.matchId = null;
                state.matchArcherIds = {};
            }
        }

        // Get self archer reference
        if (typeof ArcherModule !== 'undefined') {
            selfArcher = ArcherModule.getSelfArcher();
        }
        
        // Load events and set up event/bracket selection
        await loadEvents();
        
        // Set up event listeners for event/bracket selection
        if (eventSelect) eventSelect.addEventListener('change', handleEventSelection);
        if (bracketSelect) bracketSelect.addEventListener('change', handleBracketSelection);
        if (refreshEventsBtn) refreshEventsBtn.addEventListener('click', loadEvents);
        
        // Check for URL parameters (for QR code access or bracket assignments)
        const urlParams = new URLSearchParams(window.location.search);
        const matchId = urlParams.get('match');
        const eventId = urlParams.get('event');
        const bracketId = urlParams.get('bracket');
        
        // If match ID is in URL, load that match using centralized hydration
        if (matchId) {
            try {
                console.log('[init] Loading match from URL parameter using hydrateSoloMatch():', matchId);
                await hydrateSoloMatch(matchId, {
                    mergeLocal: false,
                    clearStateFirst: true
                });
                console.log('✅ Match loaded from URL parameter:', matchId);
                renderScoringView();
                // Flush any pending queue
                if (window.LiveUpdates && window.LiveUpdates.flushSoloQueue) {
                    window.LiveUpdates.flushSoloQueue(state.matchId).catch(e => 
                        console.warn('Queue flush failed:', e)
                    );
                }
            } catch (error) {
                console.warn('⚠️ Match not found in database:', matchId);
                alert('Match not found. Please check the match ID.');
            }
        } else if (eventId) {
            state.eventId = eventId;
            // Re-render selects with URL parameters
            renderEventSelect();
            if (eventSelect) {
                eventSelect.value = eventId;
            }
            
            // Load brackets for this event
            await loadBrackets(eventId);
            if (bracketSelection) bracketSelection.classList.remove('hidden');
            
            if (bracketId) {
                state.bracketId = bracketId;
                // Set bracket in dropdown (after brackets are loaded)
                if (bracketSelect) {
                    bracketSelect.value = bracketId;
                }
                
                // Load bracket assignment and auto-populate archers
                if (typeof ArcherModule !== 'undefined') {
                    const selfArcher = ArcherModule.getSelfArcher();
                    if (selfArcher) {
                        // Try multiple ID formats
                        let archerId = selfArcher.id || selfArcher.archerId || selfArcher.extId || null;
                        
                        // If we have extId but not UUID, try to find UUID
                        if (archerId && !archerId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                            const firstName = selfArcher.first || '';
                            const lastName = selfArcher.last || '';
                            if (firstName && lastName) {
                                try {
                                    const searchRes = await fetch(`api/v1/archers/search?q=${encodeURIComponent(firstName + ' ' + lastName)}`);
                                    if (searchRes.ok) {
                                        const searchData = await searchRes.json();
                                        if (searchData.results && searchData.results.length > 0) {
                                            const match = searchData.results.find(r => 
                                                r.archer.firstName.toLowerCase() === firstName.toLowerCase() &&
                                                r.archer.lastName.toLowerCase() === lastName.toLowerCase()
                                            );
                                            if (match && match.archer.id) {
                                                archerId = match.archer.id;
                                            }
                                        }
                                    }
                                } catch (e) {
                                    console.log('[SoloCard] Could not search for UUID:', e);
                                }
                            }
                        }
                        
                        if (archerId) {
                            console.log('[SoloCard] Loading bracket assignment from URL params for archer:', archerId);
                            await loadBracketAssignment(archerId);
                        } else {
                            console.log('[SoloCard] No archer ID found for bracket assignment');
                        }
                    } else {
                        console.log('[SoloCard] No self archer found for bracket assignment');
                    }
                }
            }
        }
        
        updateMatchTypeIndicator();

        if (state.currentView === 'scoring' && state.archer1 && state.archer2) {
            renderScoringView();
        } else {
            state.currentView = 'setup';
            renderSetupView();
        }
        renderView();
        
        // Phase 2: Set up offline/online listeners
        if (window.LiveUpdates && window.LiveUpdates.flushSoloQueue) {
            window.addEventListener('online', () => {
                if (state.matchId) {
                    console.log('🌐 Online - flushing solo match queue...');
                    window.LiveUpdates.flushSoloQueue(state.matchId).catch(e => 
                        console.warn('Queue flush failed:', e)
                    );
                }
            });
        }

        searchInput.addEventListener('input', () => {
            if (archerSelector) {
                archerSelector.setFilter(searchInput.value);
            }
        });
        startScoringBtn.addEventListener('click', startScoring);
        editSetupBtn.addEventListener('click', editSetup);
        newMatchBtn.addEventListener('click', resetMatch);
        
        document.body.addEventListener('focusin', (e) => {
            if (e.target.matches('#scoring-view input[type="text"]')) {
                keypad.currentlyFocusedInput = e.target;
                keypadElement.classList.remove('hidden');
                keypadElement.classList.add('grid');
                document.body.classList.add('keypad-visible');
            }
        });
        
        keypadElement.addEventListener('click', handleKeypadClick);
        
        scoreTableContainer.addEventListener('input', (e) => {
            if(e.target.matches('input[type="text"]')) {
                handleScoreInput(e);
            }
        });
        
        scoreTableContainer.addEventListener('click', (e) => {
            if (e.target.matches('.tie-breaker-controls button')) {
                state.shootOffWinner = e.target.dataset.winner;
                updateScoreHighlightsAndTotals();
                saveData();
            }
        });

        // Export functionality
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', showExportModal);
        }

        // Export modal button handlers
        const takeScreenshotBtn = document.getElementById('take-screenshot-btn');
        const downloadJsonBtn = document.getElementById('download-json-btn');
        const copyJsonBtn = document.getElementById('copy-json-btn');
        const emailCoachBtn = document.getElementById('email-coach-btn');
        const modalCloseExport = document.getElementById('modal-close-export');

        if (takeScreenshotBtn) {
            takeScreenshotBtn.addEventListener('click', () => {
                takeScreenshot();
                hideExportModal();
            });
        }

        if (downloadJsonBtn) {
            downloadJsonBtn.addEventListener('click', () => {
                downloadJSON();
                hideExportModal();
            });
        }

        if (copyJsonBtn) {
            copyJsonBtn.addEventListener('click', () => {
                copyJSONToClipboard();
                hideExportModal();
            });
        }

        if (emailCoachBtn) {
            emailCoachBtn.addEventListener('click', () => {
                emailCoach();
                hideExportModal();
            });
        }

        if (modalCloseExport) {
            modalCloseExport.addEventListener('click', hideExportModal);
        }
    }

    // Only initialize the app if we are on the solo card page
    if (document.title.includes('Solo Match')) {
        init();
    }
});