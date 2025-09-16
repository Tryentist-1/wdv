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
        version: '1.0',
        currentView: 'setup', // 'setup' or 'scoring'
        archer1: null,        // Stores the full archer object for Archer 1
        archer2: null,        // Stores the full archer object for Archer 2
        scores: {},           // { a1: [[s1,s2,s3], ...], a2: [[s1,s2,s3], ...], so: {a1: s, a2: s} }
        shootOffWinner: null  // 'a1' or 'a2' if judge call is needed
    };

    const sessionKey = `soloCard_${new Date().toISOString().split('T')[0]}`;

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
    function saveData() {
        try {
            localStorage.setItem(sessionKey, JSON.stringify(state));
        } catch (e) {
            console.error("Error saving data to localStorage", e);
        }
    }

    function loadData() {
        const storedState = localStorage.getItem(sessionKey);
        if (storedState) {
            try {
                const loadedState = JSON.parse(storedState);
                Object.assign(state, loadedState);
            } catch (e) {
                console.error("Error parsing stored data. Starting fresh.", e);
                localStorage.removeItem(sessionKey);
            }
        }
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
    
    function startScoring() {
        if (!state.archer1 || !state.archer2) {
            alert("Please select two archers to start the match.");
            return;
        }
        // Initialize scores if they don't exist
        if (!state.scores.a1 || state.scores.a1.length !== 5) {
            state.scores.a1 = Array(5).fill(null).map(() => ['', '', '']);
        }
        if (!state.scores.a2 || state.scores.a2.length !== 5) {
            state.scores.a2 = Array(5).fill(null).map(() => ['', '', '']);
        }
        if (!state.scores.so) {
            state.scores.so = { a1: '', a2: '' };
        }
        state.currentView = 'scoring';
        renderScoringView();
        renderView();
        saveData();
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

    function handleScoreInput(e) {
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
    }
    
    function resetMatch() {
        if(confirm("Are you sure you want to start a new match? This will clear all scores.")) {
            state.archer1 = null;
            state.archer2 = null;
            state.scores = {};
            state.shootOffWinner = null;
            state.currentView = 'setup';
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
        await ArcherModule.loadDefaultCSVIfNeeded();
        loadData();
        renderKeypad();

        if (state.currentView === 'scoring' && state.archer1 && state.archer2) {
            renderScoringView();
        } else {
            state.currentView = 'setup';
            renderSetupView();
        }
        renderView();

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