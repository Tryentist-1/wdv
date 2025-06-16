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
    function parseScoreValue(score) {
        if (typeof score === 'string') {
            const upperScore = score.toUpperCase().trim();
            if (upperScore === 'X') return 10;
            if (upperScore === 'M') return 0;
            const num = parseInt(score, 10);
            return isNaN(num) ? 0 : num;
        }
        return (typeof score === 'number' && !isNaN(score)) ? score : 0;
    }

    function getScoreColor(score) {
        if (score === '' || score === null || score === undefined) return 'score-empty';
        const strScore = String(score).toUpperCase().trim();
        if (strScore === 'X') return 'score-x';
        if (strScore === 'M') return 'score-m';
        if (strScore === '10') return 'score-10';
        if (strScore === '9') return 'score-9';
        if (strScore === '8') return 'score-8';
        if (strScore === '7') return 'score-7';
        if (strScore === '6') return 'score-6';
        if (strScore === '5') return 'score-5';
        if (strScore === '4') return 'score-4';
        if (strScore === '3') return 'score-3';
        if (strScore === '2') return 'score-2';
        if (strScore === '1') return 'score-1';
        return 'score-empty';
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
        startScoringBtn.disabled = !(state.team1.length === 3 && state.team2.length === 3);
        startScoringBtn.classList.toggle('btn-primary', !startScoringBtn.disabled);
        startScoringBtn.classList.toggle('btn-secondary', startScoringBtn.disabled);
    }
    
    function startScoring() {
        if (state.team1.length !== 3 || state.team2.length !== 3) {
            alert("Please select exactly 3 archers for each team.");
            return;
        }
        // Initialize scores if they don't exist
        state.scores.t1 = Array(4).fill(null).map(() => Array(6).fill(''));
        state.scores.t2 = Array(4).fill(null).map(() => Array(6).fill(''));
        state.scores.so = { t1: ['','',''], t2: ['','',''] };
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
                <td colspan="2" id="so-winner-cell">
                    <span id="so-winner-text"></span>
                    <span class="tie-breaker-controls" style="display:none;">
                        <button class="btn btn-sm" data-winner="t1">T1 Wins</button>
                        <button class="btn btn-sm" data-winner="t2">T2 Wins</button>
                    </span>
                </td>
            </tr></tbody>
            <tfoot>
                <tr><td colspan="14" style="text-align: right; font-weight: bold;">Match Score:</td>
                    <td class="calculated-cell" id="t1-match-score"></td><td class="calculated-cell" id="t2-match-score"></td></tr>
                <tr><td colspan="16" id="match-result"></td></tr>
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
        if (!matchOver && t1MatchScore === 4 && t2MatchScore === 4) {
            shootOffRow.style.display = 'table-row';
            const t1SoTotal = state.scores.so.t1.reduce((sum, s) => sum + parseScoreValue(s), 0);
            const t2SoTotal = state.scores.so.t2.reduce((sum, s) => sum + parseScoreValue(s), 0);
            document.getElementById('t1-so-total').textContent = t1SoTotal;
            document.getElementById('t2-so-total').textContent = t2SoTotal;
            const soComplete = state.scores.so.t1.every(s => s !== '') && state.scores.so.t2.every(s => s !== '');
            if (soComplete) {
                if (t1SoTotal > t2SoTotal) { winner = 't1'; matchOver = true; } 
                else if (t2SoTotal > t1SoTotal) { winner = 't2'; matchOver = true; } 
                else { // Tied shootoff
                    if(state.shootOffWinner) {
                        winner = state.shootOffWinner;
                        matchOver = true;
                    } else {
                        document.getElementById('so-winner-text').textContent = 'Judge Call:';
                        document.querySelector('.tie-breaker-controls').style.display = 'inline-block';
                    }
                }
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

    init();
});