/**
 * js/ranking_round.js
 * 
 * Manages the state and user interface for the redesigned "Bale-centric"
 * Ranking Round scoring application.
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- STATE MANAGEMENT ---
    const state = {
        app: 'RankingRound',
        version: '1.0',
        currentView: 'setup', // 'setup', 'scoring', 'card'
        currentEnd: 1,
        totalEnds: 12, // Default for a 360 round
        archers: [], // { id: 0, name: 'Archer 1', school: 'WDV', scores: [[r1a1,r1a2,r1a3], [r2a1,...]] }
        activeArcherId: null, // For card view
    };

    const sessionKey = `rankingRound_${new Date().toISOString().split('T')[0]}`;

    // --- DOM ELEMENT REFERENCES ---
    const views = {
        setup: document.getElementById('setup-view'),
        scoring: document.getElementById('scoring-view'),
        card: document.getElementById('card-view'),
    };

    const setupControls = {
        container: document.getElementById('archer-setup-container'),
        addArcherBtn: document.getElementById('add-archer-btn'),
        startScoringBtn: document.getElementById('start-scoring-btn'),
    };

    const scoringControls = {
        container: document.getElementById('bale-scoring-container'),
        currentEndDisplay: document.getElementById('current-end-display'),
        prevEndBtn: document.getElementById('prev-end-btn'),
        nextEndBtn: document.getElementById('next-end-btn'),
        newRoundBtn: document.getElementById('new-round-btn'),
    };

    const cardControls = {
        container: document.getElementById('individual-card-container'),
        archerNameDisplay: document.getElementById('card-view-archer-name'),
        backToScoringBtn: document.getElementById('back-to-scoring-btn'),
        exportCardBtn: document.getElementById('export-card-btn'),
    };

    const resetModal = {
        element: document.getElementById('reset-modal'),
        cancelBtn: document.getElementById('modal-cancel'),
        resetBtn: document.getElementById('modal-reset-confirm'),
        sampleBtn: document.getElementById('modal-load-sample'),
    };

    const keypad = {
        element: document.getElementById('keypad'),
        currentlyFocusedInput: null,
    };
    
    // --- VIEW MANAGEMENT ---

    /**
     * Renders the appropriate view based on the current state.
     */
    function renderView() {
        // Hide all views first
        Object.values(views).forEach(view => view.style.display = 'none');
        // Show the current view
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
            alert("Could not save session. Your data will be lost on refresh.");
        }
    }

    function loadData() {
        const storedState = localStorage.getItem(sessionKey);
        if (storedState) {
            try {
                const loadedState = JSON.parse(storedState);
                // Simple merge: This overwrites the default state with the loaded one.
                // A more complex merge might be needed if the state structure changes over versions.
                Object.assign(state, loadedState);
            } catch (e) {
                console.error("Error parsing stored data. Starting fresh.", e);
                // If data is corrupt, start with a fresh session
                localStorage.removeItem(sessionKey);
            }
        }
    }

    // --- LOGIC ---

    /**
     * Renders the archer input forms in the setup view.
     */
    function renderSetupForm() {
        if (!setupControls.container) return;

        setupControls.container.innerHTML = ''; // Clear previous content
        
        state.archers.forEach(archer => {
            const archerDiv = document.createElement('div');
            archerDiv.className = 'form-group-row';
            archerDiv.dataset.archerId = archer.id;

            archerDiv.innerHTML = `
                <div class="form-group">
                    <label>Archer Name</label>
                    <input type="text" class="archer-name-input" value="${archer.name}" placeholder="Enter name">
                </div>
                <div class="form-group">
                    <label>School</label>
                    <input type="text" class="archer-school-input" value="${archer.school}" placeholder="Enter school (3 letters)" maxlength="3">
                </div>
                <button class="btn btn-danger remove-archer-btn">&times;</button>
            `;
            
            setupControls.container.appendChild(archerDiv);
        });

        // Add event listeners for the new remove buttons
        document.querySelectorAll('.remove-archer-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const archerDiv = e.target.closest('.form-group-row');
                const archerId = parseInt(archerDiv.dataset.archerId);
                state.archers = state.archers.filter(a => a.id !== archerId);
                renderSetupForm(); // Re-render the form
                saveData(); // Save after removing
            });
        });
    }

    /**
     * Renders the main "Digital Clipboard" for the current end.
     */
    function renderScoringView() {
        if (!scoringControls.container) return;
        scoringControls.currentEndDisplay.textContent = state.currentEnd;

        const table = document.createElement('table');
        table.className = 'score-table';

        // Create table header
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Archer</th>
                    <th>A1</th>
                    <th>A2</th>
                    <th>A3</th>
                    <th>10s</th>
                    <th>X</th>
                    <th>End</th>
                    <th>Run</th>
                    <th>Avg</th>
                    <th>Card</th>
                </tr>
            </thead>
        `;

        // Create table body
        const tbody = document.createElement('tbody');
        state.archers.forEach(archer => {
            const endScores = archer.scores[state.currentEnd - 1] || ['', '', ''];
            
            const arrowInputs = endScores.map((score, i) => {
                return `<td><input type="text" class="score-input" value="${score}" data-archer-id="${archer.id}" data-arrow-index="${i}" readonly></td>`;
            }).join('');

            const endTotal = endScores.reduce((acc, s) => acc + parseScoreValue(s), 0);
            const endTens = endScores.filter(s => parseScoreValue(s) === 10).length;
            const endXs = endScores.filter(s => s.toUpperCase() === 'X').length;

            let runningTotal = 0;
            let arrowsShot = 0;
            // Loop through all ends up to the current one to calculate running totals/averages
            for(let i = 0; i < state.currentEnd; i++) {
                const loopEndScores = archer.scores[i] || [];
                loopEndScores.forEach(score => {
                    if (score !== '') {
                        runningTotal += parseScoreValue(score);
                    }
                });
            }
            
            // Calculate END average (for "Avg" column)
            let endAvg = '';
            let avgClass = '';
            const arrowsInEnd = endScores.filter(s => s !== '').length;
            if (arrowsInEnd > 0) {
                const avgNum = endTotal / arrowsInEnd;
                endAvg = avgNum.toFixed(1);
                if (avgNum >= 9) avgClass = 'score-gold';
                else if (avgNum >= 7) avgClass = 'score-red';
                else if (avgNum >= 5) avgClass = 'score-blue';
                else if (avgNum >= 3) avgClass = 'score-black';
                else avgClass = 'score-white';
            }

            const row = document.createElement('tr');
            row.dataset.archerId = archer.id;
            row.innerHTML = `
                <td>${archer.name}</td>
                ${arrowInputs}
                <td class="calculated-cell">${endTotal > 0 ? endTens : ''}</td>
                <td class="calculated-cell">${endTotal > 0 ? endXs : ''}</td>
                <td class="end-total">${endTotal > 0 ? endTotal : ''}</td>
                <td class="calculated-cell">${runningTotal > 0 ? runningTotal : ''}</td>
                <td class="calculated-cell score-cell ${avgClass}">${endAvg}</td>
                <td><button class="btn btn-secondary view-card-btn" data-archer-id="${archer.id}">View</button></td>
            `;
            tbody.appendChild(row);
        });

        table.appendChild(tbody);

        scoringControls.container.innerHTML = ''; // Clear old table
        scoringControls.container.appendChild(table);

        // Apply score colors
        document.querySelectorAll('.score-input').forEach(input => {
            const cell = input.parentElement;
            cell.className = 'score-cell'; // Reset class
            cell.classList.add(getScoreColor(input.value));
        });
    }
    
    /**
     * Renders the full scorecard for a single archer.
     * @param {number} archerId The ID of the archer to render the card for.
     */
    function renderCardView(archerId) {
        // The archerId passed from the click handler is a string. state.archers have number IDs.
        // Using loose equality `==` correctly handles the type difference.
        const archer = state.archers.find(a => a.id == archerId);
        if (!archer) {
            console.error(`Archer not found for ID: ${archerId}`);
            return;
        };

        cardControls.archerNameDisplay.textContent = `${archer.name}'s Scorecard`;
        
        const table = document.createElement('table');
        table.className = 'score-table';
        table.dataset.archerId = archerId;
        table.innerHTML = `
            <thead>
                <tr>
                    <th>R</th>
                    <th>Arrow 1</th><th>Arrow 2</th><th>Arrow 3</th>
                    <th>10s</th><th>Xs</th><th>END</th><th>TOT</th><th>AVG</th>
                </tr>
            </thead>
        `;
        const tbody = document.createElement('tbody');
        let tableHTML = '';
        
        let runningTotal = 0;
        let totalTensOverall = 0;
        let totalXsOverall = 0;

        for (let i = 0; i < state.totalEnds; i++) {
            const endNum = i + 1;
            const endScores = archer.scores[i] || ['', '', ''];
            
            let endTotal = 0;
            let endTens = 0; // Will count literal '10's
            let endXs = 0;   // Will count 'X's
            let isComplete = endScores.every(s => s !== '');

            endScores.forEach(scoreValue => {
                const val = parseScoreValue(scoreValue);
                endTotal += val;
                if (scoreValue === '10') {
                    endTens++;
                } else if (String(scoreValue).toUpperCase() === 'X') {
                    endXs++;
                }
            });
            
            if (isComplete) {
                runningTotal += endTotal;
                totalTensOverall += endTens; // Accumulate literal 10s
                totalXsOverall += endXs;     // Accumulate Xs
            }

            const avg = isComplete ? (runningTotal / (endNum * 3)).toFixed(1) : '';
            
            let avgClass = '';
            if (isComplete) {
                const avgNum = parseFloat(avg);
                if (avgNum >= 9) avgClass = 'score-gold';
                else if (avgNum >= 7) avgClass = 'score-red';
                else if (avgNum >= 5) avgClass = 'score-blue';
                else if (avgNum >= 3) avgClass = 'score-black';
                else avgClass = 'score-white';
            }

            tableHTML += `
                <tr>
                    <td>${endNum}</td>
                    ${endScores.map(s => `<td class="score-cell ${getScoreColor(s)}">${s}</td>`).join('')}
                    <td class="calculated-cell">${isComplete ? (endTens + endXs) : ''}</td>
                    <td class="calculated-cell">${isComplete ? endXs : ''}</td>
                    <td class="calculated-cell">${isComplete ? endTotal : ''}</td>
                    <td class="calculated-cell">${isComplete ? runningTotal : ''}</td>
                    <td class="calculated-cell score-cell ${avgClass}">${avg}</td>
                </tr>
            `;
        }

        tbody.innerHTML = tableHTML;
        table.appendChild(tbody);
        
        // Add table footer with final totals
        const tfoot = table.createTFoot();
        const footerRow = tfoot.insertRow();
        
        let finalAvg = 0;
        let finalAvgClass = '';
        const completedEnds = archer.scores.filter(s => s.every(val => val !== '')).length;
        if (completedEnds > 0) {
            finalAvg = (runningTotal / (completedEnds * 3)).toFixed(1);
            const avgNum = parseFloat(finalAvg);
            if (avgNum >= 9) finalAvgClass = 'score-gold';
            else if (avgNum >= 7) finalAvgClass = 'score-red';
            else if (avgNum >= 5) finalAvgClass = 'score-blue';
            else if (avgNum >= 3) finalAvgClass = 'score-black';
            else finalAvgClass = 'score-white';
        }

        footerRow.innerHTML = `
            <td colspan="4" style="text-align: right; font-weight: bold;">Round Totals:</td>
            <td class="calculated-cell">${totalTensOverall + totalXsOverall}</td>
            <td class="calculated-cell">${totalXsOverall}</td>
            <td class="calculated-cell"></td>
            <td class="calculated-cell">${runningTotal}</td>
            <td class="calculated-cell score-cell ${finalAvgClass}">${finalAvg > 0 ? finalAvg : ''}</td>
        `;

        cardControls.container.innerHTML = '';
        cardControls.container.appendChild(table);
    }
    
    /**
     * Exports the scorecard for a given archer as formatted text to the clipboard.
     * @param {string} archerId 
     */
    function exportCardAsText(archerId) {
        const archer = state.archers.find(a => a.id === archerId);
        if (!archer) return;

        let text = `Scorecard for ${archer.name}\n`;
        text += `================================\n`;
        text += `End\t1\t2\t3\t10s\tXs\tEnd Total\tRunning Total\n`;
        text += `--------------------------------\n`;

        let runningTotal = 0;
        let totalTensOverall = 0;
        let totalXsOverall = 0;

        archer.scores.forEach((endScores, i) => {
            if (endScores.every(s => s === '')) return; // Skip empty ends

            const endNum = i + 1;
            const scores = endScores.map(s => parseScoreValue(s));
            const endTotal = scores.reduce((a, b) => a + b, 0);
            const endTens = endScores.filter(s => s === '10').length;
            const endXs = endScores.filter(s => s.toUpperCase() === 'X').length;
            runningTotal += endTotal;
            totalTensOverall += endTens;
            totalXsOverall += endXs;

            text += `${endNum}\t${endScores.join('\t')}\t${endTens}\t${endXs}\t${endTotal}\t${runningTotal}\n`;
        });

        text += `================================\n`;
        text += `Totals:\t\t\t\t${totalTensOverall}\t${totalXsOverall}\t${runningTotal}\n`;

        navigator.clipboard.writeText(text).then(() => {
            alert('Scorecard copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy scorecard. See console for details.');
        });
    }

    /**
     * Handles clicks on the keypad buttons.
     * @param {Event} e The click event.
     */
    function handleKeypadClick(e) {
        const button = e.target.closest('.keypad-btn');
        if (!button || !keypad.currentlyFocusedInput) return;

        const action = button.dataset.action;
        const value = button.dataset.value;
        const input = keypad.currentlyFocusedInput;

        if (value) {
            // --- Identify the next input BEFORE re-rendering ---
            const allInputs = [...document.querySelectorAll('.score-input')];
            const currentIndex = allInputs.indexOf(input);
            
            let nextInputToFocus = null;
            if (currentIndex < allInputs.length - 1) {
                nextInputToFocus = allInputs[currentIndex + 1];
            }

            // --- Update value and state, which triggers the re-render ---
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true })); // This calls renderScoringView()
            
            // --- After re-render, focus the correct new input ---
            if (nextInputToFocus) {
                const archerId = nextInputToFocus.dataset.archerId;
                const arrowIndex = nextInputToFocus.dataset.arrowIndex;
                // The DOM is new, so we must re-query
                const newNextInput = document.querySelector(`.score-input[data-archer-id='${archerId}'][data-arrow-index='${arrowIndex}']`);
                if (newNextInput) {
                    newNextInput.focus();
                }
            } else { // This was the last input in the list
                keypad.element.style.display = 'none';
                document.body.classList.remove('keypad-visible');
            }
        } else if (action === 'clear') {
            const archerId = input.dataset.archerId;
            const arrowIndex = input.dataset.arrowIndex;
            
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            const sameInputAfterRender = document.querySelector(`.score-input[data-archer-id='${archerId}'][data-arrow-index='${arrowIndex}']`);
            if(sameInputAfterRender) {
                sameInputAfterRender.focus();
            }
        } else if (action === 'close') {
            keypad.element.style.display = 'none';
            document.body.classList.remove('keypad-visible');
        }
    }

    /**
     * Updates the score in the state when an input event fires on a score input.
     * @param {Event} e The input event.
     */
    function handleScoreInput(e) {
        const input = e.target;
        const archerId = parseInt(input.dataset.archerId);
        const arrowIndex = parseInt(input.dataset.arrowIndex);
        const archer = state.archers.find(a => a.id === archerId);

        if (archer) {
            archer.scores[state.currentEnd - 1][arrowIndex] = input.value;
            renderScoringView(); // Re-render to update totals and colors
            saveData();
        }
    }

    /**
     * Changes the current end and re-renders the scoring view.
     * @param {number} direction -1 for previous, 1 for next.
     */
    function changeEnd(direction) {
        const newEnd = state.currentEnd + direction;
        if (newEnd > 0 && newEnd <= state.totalEnds) {
            state.currentEnd = newEnd;
            renderScoringView();
            saveData();
        }
    }
    
    /**
     * Resets the application state to its initial default.
     */
    function resetState() {
        localStorage.removeItem(sessionKey);
        Object.assign(state, {
            currentView: 'setup',
            currentEnd: 1,
            archers: [],
            activeArcherId: null,
        });
        state.archers.push({ id: 1, name: 'Archer 1', school: '', scores: Array.from({ length: state.totalEnds }, () => ['', '', '']) });
        renderSetupForm();
        renderScoringView();
        renderView();
        resetModal.element.style.display = 'none';
    }
    
    /**
     * Switches the view to the main scoring view.
     */
    function showScoringView() {
        state.currentView = 'scoring';
        renderView();
    }

    /**
     * Initializes the application.
     */
    function init() {
        console.log("Initializing Ranking Round App...");
        loadData(); // Load data first

        // If no archers, add a default one. Otherwise, render the loaded state.
        if (state.archers.length === 0) {
            state.archers.push({ id: 1, name: 'Archer 1', school: '', scores: Array.from({ length: state.totalEnds }, () => ['', '', '']) });
        }
        
        renderSetupForm();
        renderScoringView(); // Also render scoring view in case we load into it
        renderView(); // Show the correct view based on loaded state

        // --- SETUP VIEW LISTENERS ---
        setupControls.addArcherBtn.addEventListener('click', () => {
            const newId = state.archers.length > 0 ? Math.max(...state.archers.map(a => a.id)) + 1 : 1;
            updateStateFromSetupForm(); // Save any changes first
            state.archers.push({ id: newId, name: `Archer ${newId}`, school: '', scores: Array.from({ length: state.totalEnds }, () => ['', '', '']) });
            renderSetupForm();
            saveData();
        });

        setupControls.startScoringBtn.addEventListener('click', () => {
            updateStateFromSetupForm();
            state.currentView = 'scoring';
            renderView();
            saveData();
        });
        
        // Using event delegation for remove buttons since they are created dynamically
        setupControls.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-archer-btn')) {
                const archerDiv = e.target.closest('.form-group-row');
                const archerId = parseInt(archerDiv.dataset.archerId);
                state.archers = state.archers.filter(a => a.id !== archerId);
                renderSetupForm();
                saveData();
            }
        });

        // --- RESET MODAL LISTENERS ---
        scoringControls.newRoundBtn.addEventListener('click', () => resetModal.element.style.display = 'block');
        resetModal.cancelBtn.addEventListener('click', () => resetModal.element.style.display = 'none');
        resetModal.resetBtn.addEventListener('click', resetState);
        resetModal.sampleBtn.addEventListener('click', () => {
            loadSampleData();
            state.currentView = 'scoring';
            renderSetupForm();
            renderScoringView();
            renderView();
            saveData();
            resetModal.element.style.display = 'none';
        });

        // --- SCORING & CARD VIEW LISTENERS (STATIC ELEMENTS) ---
        scoringControls.prevEndBtn.addEventListener('click', () => changeEnd(-1));
        scoringControls.nextEndBtn.addEventListener('click', () => changeEnd(1));
        cardControls.backToScoringBtn.addEventListener('click', showScoringView);
        cardControls.exportCardBtn.addEventListener('click', () => {
             const archerId = document.querySelector('#card-view .score-table').dataset.archerId;
             if (archerId) exportCardAsText(archerId);
        });
        
        // --- KEYPAD LISTENERS & DYNAMIC ELEMENT HANDLING (DELEGATION) ---
        keypad.element.addEventListener('click', handleKeypadClick);
        
        // Use event delegation on a static parent for dynamically created elements
        document.body.addEventListener('click', (e) => {
            // Show Card View
            if (e.target.classList.contains('view-card-btn')) {
                state.currentView = 'card';
                // The button's dataset has the archer ID as a string.
                renderCardView(e.target.dataset.archerId);
                renderView();
                keypad.element.style.display = 'none';
            }
        });

        document.body.addEventListener('focusin', (e) => {
            // Show Keypad
            if (e.target.classList.contains('score-input')) {
                keypad.currentlyFocusedInput = e.target;
                keypad.element.style.display = 'grid';
                document.body.classList.add('keypad-visible');
            }
        });

        // Handle state updates from score inputs
        document.body.addEventListener('input', (e) => {
            if (e.target.classList.contains('score-input')) {
                handleScoreInput(e);
            }
        });

        document.body.addEventListener('change', (e) => {
             if (e.target.classList.contains('archer-name-input') || e.target.classList.contains('archer-school-input')) {
                updateStateFromSetupForm();
                saveData();
            }
        });
    }

    function updateStateFromSetupForm() {
        document.querySelectorAll('.form-group-row').forEach(row => {
            const archerId = parseInt(row.dataset.archerId);
            const archer = state.archers.find(a => a.id === archerId);
            if (archer) {
                archer.name = row.querySelector('.archer-name-input').value || `Archer ${archer.id}`;
                archer.school = row.querySelector('.archer-school-input').value.toUpperCase();
            }
        });
    }

    function loadSampleData() {
        state.archers = [
            { id: 1, name: 'Mike A.', school: 'WDV', scores: Array.from({ length: 12 }, () => ['', '', '']) },
            { id: 2, name: 'Robert B.', school: 'WDV', scores: Array.from({ length: 12 }, () => ['', '', '']) },
            { id: 3, name: 'Terry C.', school: 'OPP', scores: Array.from({ length: 12 }, () => ['', '', '']) },
        ];
        // Pre-fill some scores for the first archer
        state.archers[0].scores[0] = ['10', '9', '7'];
        state.archers[0].scores[1] = ['8', '6', 'M'];
        state.archers[0].scores[2] = ['5', '4', '3'];
        state.archers[0].scores[3] = ['10', '9', '7'];
        // Pre-fill some scores for the second archer
        state.archers[1].scores[0] = ['X', '9', '9'];
        state.archers[1].scores[1] = ['8', '8', '7'];
    }

    // --- INITIALIZATION ---
    init();

}); 