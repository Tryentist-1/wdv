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
        syncStatus: {},       // Track sync status per archer per set: { a1: { setNumber: 'synced'|'pending'|'failed' } }
        location: ''          // Match location
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
    const scoreTableContainer = document.getElementById('score-table-container');
    const keypadElement = document.getElementById('score-keypad');
    const editSetupBtn = document.getElementById('edit-setup-btn');
    const newMatchBtn = document.getElementById('new-match-btn');
    const matchSummaryDisplay = document.getElementById('match-summary-display');

    let keypad = {
        currentlyFocusedInput: null
    };

    // --- UTILITY FUNCTIONS ---

    // --- VIEW MANAGEMENT ---
    function renderView() {
        Object.values(views).forEach(view => view.style.display = 'none');
        if (views[state.currentView]) {
            views[state.currentView].style.display = 'block';
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
    
    // Phase 2: Restore match from database if matchId exists
    async function restoreMatchFromDatabase() {
        if (!state.matchId || !window.LiveUpdates) return false;
        
        try {
            const match = await window.LiveUpdates.request(`/solo-matches/${state.matchId}`, 'GET');
            if (!match || !match.match) return false;
            
            console.log('✅ Restored solo match from database:', state.matchId);
            
            // Restore archers from match data
            const matchArchers = match.match.archers || [];
            if (matchArchers.length >= 2) {
                const a1Data = matchArchers.find(a => a.position === 1);
                const a2Data = matchArchers.find(a => a.position === 2);
                
                if (a1Data && a2Data) {
                    // Find archers in master list by name
                    const masterList = ArcherModule.loadList();
                    const a1 = masterList.find(a => 
                        `${a.first} ${a.last}`.toLowerCase() === a1Data.archer_name.toLowerCase()
                    );
                    const a2 = masterList.find(a => 
                        `${a.first} ${a.last}`.toLowerCase() === a2Data.archer_name.toLowerCase()
                    );
                    
                    if (a1 && a2) {
                        a1.id = `${a1.first}-${a1.last}`;
                        a2.id = `${a2.first}-${a2.last}`;
                        state.archer1 = a1;
                        state.archer2 = a2;
                        state.matchArcherIds = {
                            a1: a1Data.id,
                            a2: a2Data.id
                        };
                    }
                    
                    // Restore scores from database
                    state.scores = { a1: Array(5).fill(null).map(() => ['', '', '']), a2: Array(5).fill(null).map(() => ['', '', '']), so: { a1: '', a2: '' } };
                    matchArchers.forEach(archerData => {
                        const archerKey = archerData.position === 1 ? 'a1' : 'a2';
                        if (archerData.sets && archerData.sets.length > 0) {
                            archerData.sets.forEach(set => {
                                if (set.set_number <= 5) {
                                    const setIdx = set.set_number - 1;
                                    state.scores[archerKey][setIdx] = [set.a1 || '', set.a2 || '', set.a3 || ''];
                                } else if (set.set_number === 6) {
                                    // Shoot-off
                                    state.scores.so[archerKey] = set.a1 || '';
                                }
                            });
                        }
                    });
                    
                    state.currentView = 'scoring';
                    return true;
                }
            }
        } catch (e) {
            console.error('Failed to restore match from database:', e);
        }
        return false;
    }

    // --- LOGIC ---
    function renderSetupView(filter = '') {
        archerSelectionContainer.innerHTML = '';
        const masterList = ArcherModule.loadList().filter(a => {
            const name = `${a.first} ${a.last}`.toLowerCase();
            return name.includes(filter.toLowerCase());
        });

        masterList.forEach(archer => {
            const archerId = `${(archer.first || '').trim()}-${(archer.last || '').trim()}`;
            const isSelectedA1 = state.archer1 && state.archer1.id === archerId;
            const isSelectedA2 = state.archer2 && state.archer2.id === archerId;

            const row = document.createElement('div');
            row.className = 'archer-select-row';
            if (isSelectedA1) row.classList.add('selected-a1');
            if (isSelectedA2) row.classList.add('selected-a2');

            row.innerHTML = `
                <span class="favorite-star">${archer.fave ? '★' : '☆'}</span>
                <div class="archer-name-label">${archer.first} ${archer.last}</div>
                <div class="archer-details-label">(${archer.level || 'VAR'})</div>
                <div class="selection-buttons">
                    <button class="btn btn-sm ${isSelectedA1 ? 'btn-primary' : 'btn-secondary'}" data-id="${archerId}" data-role="a1">A1</button>
                    <button class="btn btn-sm ${isSelectedA2 ? 'btn-danger' : 'btn-secondary'}" data-id="${archerId}" data-role="a2">A2</button>
                </div>
            `;
            archerSelectionContainer.appendChild(row);
        });

        updateStartButtonState();
    }

    function handleArcherSelection(e) {
        const button = e.target.closest('button[data-role]');
        if (!button) return;

        const archerId = button.dataset.id;
        const role = button.dataset.role;
        const archer = ArcherModule.getArcherById(archerId);

        if (!archer) return; // Archer not found, something is wrong.

        // Add the generated ID to the archer object so we can reference it later
        archer.id = archerId;

        if (role === 'a1') {
            if (state.archer2 && state.archer2.id === archerId) state.archer2 = null; // Unset from other role if needed
            state.archer1 = (state.archer1 && state.archer1.id === archerId) ? null : archer;
        } else if (role === 'a2') {
            if (state.archer1 && state.archer1.id === archerId) state.archer1 = null; // Unset from other role if needed
            state.archer2 = (state.archer2 && state.archer2.id === archerId) ? null : archer;
        }
        
        saveData();
        renderSetupView(searchInput.value);
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
            // Get event ID from URL or localStorage (if available)
            const urlParams = new URLSearchParams(window.location.search);
            const eventId = urlParams.get('event') || state.eventId || null;
            const today = new Date().toISOString().split('T')[0];
            
            // Create match in database (force new match - don't reuse cache)
            console.log('Creating solo match in database...');
            const matchId = await window.LiveUpdates.ensureSoloMatch({
                date: today,
                location: state.location || '',
                eventId: eventId,
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
            <span class="team-summary a1-summary">${a1Name}</span>
            <span style="margin: 0 10px;">vs</span>
            <span class="team-summary a2-summary">${a2Name}</span>
        `;
    }

    function renderScoreTable() {
        let tableHTML = `<table class="score-table" id="solo_round_table">
            <thead>
                <tr>
                    <th rowspan="2">End</th>
                    <th colspan="3">Archer 1</th>
                    <th colspan="3">Archer 2</th>
                    <th colspan="2">End Total</th>
                    <th colspan="2">Set Points</th>
                </tr>
                <tr>
                    <th>A1</th><th>A2</th><th>A3</th>
                    <th>A1</th><th>A2</th><th>A3</th>
                    <th>A1</th><th>A2</th>
                    <th>A1</th><th>A2</th>
                </tr>
            </thead>
            <tbody>`;

        for (let i = 0; i < 5; i++) {
            tableHTML += `<tr id="end-${i+1}">
                <td>End ${i+1}</td>
                <td class="${getScoreColor(state.scores.a1[i][0])}"><input type="text" data-archer="a1" data-end="${i}" data-arrow="0" value="${state.scores.a1[i][0]}" readonly></td>
                <td class="${getScoreColor(state.scores.a1[i][1])}"><input type="text" data-archer="a1" data-end="${i}" data-arrow="1" value="${state.scores.a1[i][1]}" readonly></td>
                <td class="${getScoreColor(state.scores.a1[i][2])}"><input type="text" data-archer="a1" data-end="${i}" data-arrow="2" value="${state.scores.a1[i][2]}" readonly></td>
                <td class="${getScoreColor(state.scores.a2[i][0])}"><input type="text" data-archer="a2" data-end="${i}" data-arrow="0" value="${state.scores.a2[i][0]}" readonly></td>
                <td class="${getScoreColor(state.scores.a2[i][1])}"><input type="text" data-archer="a2" data-end="${i}" data-arrow="1" value="${state.scores.a2[i][1]}" readonly></td>
                <td class="${getScoreColor(state.scores.a2[i][2])}"><input type="text" data-archer="a2" data-end="${i}" data-arrow="2" value="${state.scores.a2[i][2]}" readonly></td>
                <td class="calculated-cell" id="a1-e${i+1}-total"></td>
                <td class="calculated-cell" id="a2-e${i+1}-total"></td>
                <td class="calculated-cell" id="a1-e${i+1}-setpts"></td>
                <td class="calculated-cell" id="a2-e${i+1}-setpts"></td>
            </tr>`;
        }

        tableHTML += `
            <tr id="shoot-off" style="display: none;">
                <td>S.O.</td>
                <td colspan="2" class="${getScoreColor(state.scores.so.a1)}"><input type="text" data-archer="a1" data-end="so" data-arrow="0" value="${state.scores.so.a1}" readonly></td><td></td>
                <td colspan="2" class="${getScoreColor(state.scores.so.a2)}"><input type="text" data-archer="a2" data-end="so" data-arrow="0" value="${state.scores.so.a2}" readonly></td><td></td>
                <td class="calculated-cell" id="a1-so-total"></td>
                <td class="calculated-cell" id="a2-so-total"></td>
                <td colspan="2" id="so-winner-cell">
                    <span id="so-winner-text"></span>
                    <span class="tie-breaker-controls" style="display:none;">
                        <button class="btn btn-sm" data-winner="a1">A1 Wins</button>
                        <button class="btn btn-sm" data-winner="a2">A2 Wins</button>
                    </span>
                </td>
            </tr>
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="8" style="text-align: right; font-weight: bold;">Match Score:</td>
                    <td class="calculated-cell" id="a1-match-score"></td>
                    <td class="calculated-cell" id="a2-match-score"></td>
                </tr>
                <tr><td colspan="10" id="match-result"></td></tr>
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
            shootOffRow.style.display = 'table-row';
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
                    tieBreakerControls.style.display = 'none';
                } else if (soValueA2 > soValueA1) {
                    winner = 'a2';
                    matchOver = true;
                    soWinnerText.textContent = "A2 Wins S.O.";
                    tieBreakerControls.style.display = 'none';
                } else {
                    if (state.shootOffWinner) {
                         winner = state.shootOffWinner;
                         matchOver = true;
                         soWinnerText.textContent = `S.O. Tied! ${winner === 'a1' ? 'A1' : 'A2'} Wins (Closest)`;
                         tieBreakerControls.style.display = 'none';
                    } else {
                        soWinnerText.textContent = 'Tied! Judge Call:';
                        tieBreakerControls.style.display = 'inline-block';
                    }
                }
            } else {
                soWinnerText.textContent = 'Enter S.O. Scores';
                tieBreakerControls.style.display = 'none';
            }
        } else {
            shootOffRow.style.display = 'none';
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
        keypadElement.innerHTML = `<div class="keypad"><button class="keypad-btn" data-value="X">X</button><button class="keypad-btn" data-value="10">10</button><button class="keypad-btn" data-value="9">9</button><button class="keypad-btn nav-btn" data-action="prev">&larr;</button><button class="keypad-btn" data-value="8">8</button><button class="keypad-btn" data-value="7">7</button><button class="keypad-btn" data-value="6">6</button><button class="keypad-btn nav-btn" data-action="next">&rarr;</button><button class="keypad-btn" data-value="5">5</button><button class="keypad-btn" data-value="4">4</button><button class="keypad-btn" data-value="3">3</button><button class="keypad-btn" data-action="clear">CLR</button><button class="keypad-btn" data-value="2">2</button><button class="keypad-btn" data-value="1">1</button><button class="keypad-btn" data-value="M">M</button><button class="keypad-btn" data-action="close">Close</button></div>`;
    }

    function handleKeypadClick(e) {
        const button = e.target.closest('.keypad-btn');
        if (!button || !keypad.currentlyFocusedInput) return;

        const action = button.dataset.action;
        const value = button.dataset.value;
        const input = keypad.currentlyFocusedInput;

        // --- Navigation ---
        if (action === 'prev' || action === 'next') {
            const allInputs = Array.from(document.querySelectorAll('#scoring-view input[type="text"]'));
            const currentIndex = allInputs.indexOf(input);
            if (action === 'prev' && currentIndex > 0) {
                allInputs[currentIndex - 1].focus();
            } else if (action === 'next' && currentIndex < allInputs.length - 1) {
                allInputs[currentIndex + 1].focus();
            }
            return;
        }

        if (action === 'close') {
            keypadElement.style.display = 'none';
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
                keypadElement.style.display = 'none';
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
        // TODO: Update UI to show sync status (green checkmark, yellow pending, red failed)
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
            exportModal.style.display = 'flex';
        }
    }

    function hideExportModal() {
        const exportModal = document.getElementById('export-modal');
        if (exportModal) {
            exportModal.style.display = 'none';
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

        searchInput.addEventListener('input', () => renderSetupView(searchInput.value));
        archerSelectionContainer.addEventListener('click', handleArcherSelection);
        startScoringBtn.addEventListener('click', startScoring);
        editSetupBtn.addEventListener('click', editSetup);
        newMatchBtn.addEventListener('click', resetMatch);
        
        document.body.addEventListener('focusin', (e) => {
            if (e.target.matches('#scoring-view input[type="text"]')) {
                keypad.currentlyFocusedInput = e.target;
                keypadElement.style.display = 'grid';
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