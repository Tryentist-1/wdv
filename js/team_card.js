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
        shootOffWinner: null  // 't1' or 't2' if judge call is needed
    };

    const sessionKey = `teamCard_${new Date().toISOString().split('T')[0]}`;

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
        Object.values(views).forEach(view => view.style.display = 'none');
        if (views[state.currentView]) {
            views[state.currentView].style.display = 'block';
        }
    }
    
    function saveData() {
        localStorage.setItem(sessionKey, JSON.stringify(state));
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
    function renderSetupView(filter = '') {
        archerSelectionContainer.innerHTML = '';
        const masterList = ArcherModule.loadList().filter(a => 
            `${a.first} ${a.last}`.toLowerCase().includes(filter.toLowerCase())
        );

        masterList.forEach(archer => {
            const archerId = `${(archer.first || '').trim()}-${(archer.last || '').trim()}`;
            const isInTeam1 = state.team1.some(a => a.id === archerId);
            const isInTeam2 = state.team2.some(a => a.id === archerId);

            const row = document.createElement('div');
            row.className = 'archer-select-row';
            if (isInTeam1) row.classList.add('selected-a1');
            if (isInTeam2) row.classList.add('selected-a2');

            row.innerHTML = `
                <span class="favorite-star">${archer.fave ? '★' : '☆'}</span>
                <div class="archer-name-label">${archer.first} ${archer.last}</div>
                <div class="archer-details-label">(${archer.level || 'VAR'})</div>
                <div class="selection-buttons">
                    <button class="btn btn-sm ${isInTeam1 ? 'btn-primary' : 'btn-secondary'}" data-id="${archerId}" data-role="t1" ${!isInTeam1 && state.team1.length >= 3 ? 'disabled' : ''}>T1</button>
                    <button class="btn btn-sm ${isInTeam2 ? 'btn-danger' : 'btn-secondary'}" data-id="${archerId}" data-role="t2" ${!isInTeam2 && state.team2.length >= 3 ? 'disabled' : ''}>T2</button>
                </div>
            `;
            archerSelectionContainer.appendChild(row);
        });
        updateStartButtonState();
    }

    function handleTeamSelection(e) {
        const button = e.target.closest('button[data-role]');
        if (!button) return;

        const archerId = button.dataset.id;
        const role = button.dataset.role;
        const archer = ArcherModule.getArcherById(archerId);
        if (!archer) return;
        archer.id = archerId;

        const targetTeam = role === 't1' ? state.team1 : state.team2;
        const otherTeam = role === 't1' ? state.team2 : state.team1;
        const archerIndexInTarget = targetTeam.findIndex(a => a.id === archerId);
        const archerIndexInOther = otherTeam.findIndex(a => a.id === archerId);

        if (archerIndexInTarget > -1) { // Archer is in the team, so remove them
            targetTeam.splice(archerIndexInTarget, 1);
        } else { // Archer is not in the team, so add them
            if (targetTeam.length < 3) {
                if (archerIndexInOther > -1) { // Remove from other team if present
                    otherTeam.splice(archerIndexInOther, 1);
                }
                targetTeam.push(archer);
            } else {
                alert(`Team ${role === 't1' ? '1' : '2'} is already full.`);
            }
        }
        saveData();
        renderSetupView(searchInput.value);
    }

    function updateStartButtonState() {
        const t1Count = state.team1.length;
        const t2Count = state.team2.length;
        const isValid = t1Count > 0 && t1Count === t2Count;
        startScoringBtn.disabled = !isValid;
        startScoringBtn.classList.toggle('btn-primary', isValid);
        startScoringBtn.classList.toggle('btn-secondary', !isValid);
    }
    
    function startScoring() {
        const t1Count = state.team1.length;
        const t2Count = state.team2.length;

        if (t1Count === 0 || t1Count !== t2Count) {
            alert("Please select an equal number of archers for each team (1, 2, or 3).");
            return;
        }
        
        // Initialize scores if they don't exist
        const numArrows = t1Count * 2; // Each archer shoots 2 arrows per end
        state.scores.t1 = Array(4).fill(null).map(() => Array(numArrows).fill(''));
        state.scores.t2 = Array(4).fill(null).map(() => Array(numArrows).fill(''));
        state.scores.so = { t1: Array(t1Count).fill(''), t2: Array(t1Count).fill('') };
        
        state.currentView = 'scoring';
        renderScoringView();
        renderView();
        saveData();
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
            <span style="margin: 0 10px;">vs</span>
            <span class="team-summary a2-summary">Team 2</span>
        `;
    }

    function renderScoreTable() {
        const t1ArcherNames = state.team1.map(a => `${a.first} ${a.last.charAt(0)}`).join(' | ');
        const t2ArcherNames = state.team2.map(a => `${a.first} ${a.last.charAt(0)}`).join(' | ');

        let tableHTML = `<table class="score-table" id="team_round_table">
            <thead>
                <tr>
                    <th rowspan="3">End</th>
                    <th colspan="6">Team 1 (${t1ArcherNames})</th>
                    <th colspan="6">Team 2 (${t2ArcherNames})</th>
                    <th colspan="2">End Total</th>
                    <th colspan="2">Set Points</th>
                </tr>
                <tr><th colspan="16" style="background-color: #f8f9fa;"></th></tr>
                <tr>
                    <th>A1</th><th>A2</th><th>A3</th><th>A4</th><th>A5</th><th>A6</th>
                    <th>A1</th><th>A2</th><th>A3</th><th>A4</th><th>A5</th><th>A6</th>
                    <th>T1</th><th>T2</th>
                    <th>T1</th><th>T2</th>
                </tr>
            </thead><tbody>`;

        for (let i = 0; i < 4; i++) {
            tableHTML += `<tr id="end-${i+1}"><td>End ${i+1}</td>
                ${state.scores.t1[i].map((s, a) => `<td class="${getScoreColor(s)}"><input type="text" data-team="t1" data-end="${i}" data-arrow="${a}" value="${s}" readonly></td>`).join('')}
                ${state.scores.t2[i].map((s, a) => `<td class="${getScoreColor(s)}"><input type="text" data-team="t2" data-end="${i}" data-arrow="${a}" value="${s}" readonly></td>`).join('')}
                <td class="calculated-cell" id="t1-e${i+1}-total"></td>
                <td class="calculated-cell" id="t2-e${i+1}-total"></td>
                <td class="calculated-cell" id="t1-e${i+1}-setpts"></td>
                <td class="calculated-cell" id="t2-e${i+1}-setpts"></td>
            </tr>`;
        }

        tableHTML += `<tr id="shoot-off" style="display: none;">
                <td>S.O.</td>
                ${state.scores.so.t1.map((s,a) => `<td class="${getScoreColor(s)}"><input type="text" data-team="t1" data-end="so" data-arrow="${a}" value="${s}" readonly></td>`).join('')}<td colspan="3"></td>
                ${state.scores.so.t2.map((s,a) => `<td class="${getScoreColor(s)}"><input type="text" data-team="t2" data-end="so" data-arrow="${a}" value="${s}" readonly></td>`).join('')}<td colspan="3"></td>
                <td class="calculated-cell" id="t1-so-total"></td><td class="calculated-cell" id="t2-so-total"></td>
                <td colspan="2" id="so-winner-cell" class="calculated-cell">
                    <span id="so-winner-text"></span>
                </td>
            </tr></tbody>
            <tfoot>
                <tr><td colspan="15" style="text-align: right; font-weight: bold;">Match Score:</td>
                    <td class="calculated-cell" id="t1-match-score"></td>
                    <td class="calculated-cell" id="t2-match-score"></td>
                </tr>
                <tr id="judge-call-row" style="display: none;">
                    <td colspan="17" style="text-align: center; padding: 8px; background-color: #fffacd;">
                        <span style="font-weight: bold; margin-right: 10px;">Judge Call (Closest to Center):</span>
                        <span class="tie-breaker-controls">
                            <button class="btn" data-winner="t1">Team 1 Wins</button>
                            <button class="btn" data-winner="t2">Team 2 Wins</button>
                        </span>
                    </td>
                </tr>
                <tr><td colspan="17" id="match-result"></td></tr>
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
        judgeCallRow.style.display = 'none'; // Hide by default

        if (!matchOver && t1MatchScore === 4 && t2MatchScore === 4) {
            shootOffRow.style.display = 'table-row';
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
                            judgeCallRow.style.display = 'table-row';
                        }
                    }
                }
            } else {
                soWinnerText.textContent = 'Enter S.O. Scores';
            }
        } else {
            shootOffRow.style.display = 'none';
        }

        const matchResultEl = document.getElementById('match-result');
        if (matchOver) {
            matchResultEl.textContent = `Match Over: Team ${winner === 't1' ? 1 : 2} Wins!`;
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
        const action = button.dataset.action, value = button.dataset.value, input = keypad.currentlyFocusedInput;
        const allInputs = Array.from(document.querySelectorAll('#scoring-view input[type="text"]'));
        const currentIndex = allInputs.indexOf(input);
        if (action === 'prev' && currentIndex > 0) allInputs[currentIndex - 1].focus();
        else if (action === 'next' && currentIndex < allInputs.length - 1) allInputs[currentIndex + 1].focus();
        else if (action === 'close') { keypadElement.style.display = 'none'; document.body.classList.remove('keypad-visible'); }
        else {
            input.value = (action === 'clear') ? '' : value;
            handleScoreInput({ target: input });
            if (value && currentIndex < allInputs.length - 1) allInputs[currentIndex + 1].focus();
            else { keypadElement.style.display = 'none'; document.body.classList.remove('keypad-visible'); }
        }
    }

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
    }
    
    function resetMatch() {
        if(confirm("Are you sure you want to start a new match? This will clear all scores.")) {
            Object.assign(state, { team1: [], team2: [], scores: {}, shootOffWinner: null, currentView: 'setup' });
            localStorage.removeItem(sessionKey);
            renderSetupView();
            renderView();
        }
    }

    // --- INITIALIZATION ---
    async function init() {
        await ArcherModule.loadDefaultCSVIfNeeded();
        loadData();
        renderKeypad();
        if (state.currentView === 'scoring' && state.team1.length === 3 && state.team2.length === 3) {
            renderScoringView();
        } else {
            state.currentView = 'setup';
            renderSetupView();
        }
        renderView();

        searchInput.addEventListener('input', () => renderSetupView(searchInput.value));
        archerSelectionContainer.addEventListener('click', handleTeamSelection);
        startScoringBtn.addEventListener('click', startScoring);
        editSetupBtn.addEventListener('click', () => { state.currentView = 'setup'; renderView(); });
        newMatchBtn.addEventListener('click', resetMatch);
        keypadElement.addEventListener('click', handleKeypadClick);
        
        document.body.addEventListener('focusin', (e) => {
            if (e.target.matches('#scoring-view input[type="text"]')) {
                keypad.currentlyFocusedInput = e.target;
                keypadElement.style.display = 'grid';
                document.body.classList.add('keypad-visible');
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