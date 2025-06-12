/**
 * js/ranking_round.js
 * 
 * Manages the state and user interface for the redesigned "Bale-centric"
 * Ranking Round scoring application.
 * 
 * Architecture:
 * - Centralized state object (`state`) holds the entire application's data.
 * - A single master `render()` function is responsible for drawing the UI based on the current state.
 * - All event listeners are centralized in the `init()` function. They update the state and then call `render()`.
 * - Data is persisted to localStorage on every state change.
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- STATE MANAGEMENT ---
    let state = {
        currentView: 'setup', // 'setup', 'scoring', 'card'
        currentEnd: 1,
        totalEnds: 12,
        archers: [],
        activeArcherId: null, // For card view
        modalVisible: false
    };

    const sessionKey = `rankingRound_v2_${new Date().toISOString().split('T')[0]}`;

    // --- DOM ELEMENT REFERENCES (QUERIED ONCE) ---
    const appContainer = document.getElementById('app-container');
    const views = {
        setup: document.getElementById('setup-view'),
        scoring: document.getElementById('scoring-view'),
        card: document.getElementById('card-view'),
    };
    const keypadElement = document.getElementById('keypad');
    const resetModalElement = document.getElementById('reset-modal');
    
    // Will hold a reference to the currently focused score input
    let currentlyFocusedInput = null;

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
                return JSON.parse(storedState);
            } catch (e) {
                console.error("Error parsing stored data. Starting fresh.", e);
                localStorage.removeItem(sessionKey);
            }
        }
        // Return a fresh state if nothing is stored
        return {
            currentView: 'setup',
            currentEnd: 1,
            totalEnds: 12,
            archers: [{ id: 1, firstName: 'Archer', lastName: '1', school: '', level: 'V', gender: 'M', scores: Array.from({ length: 12 }, () => ['', '', '']) }],
            activeArcherId: null,
            modalVisible: false
        };
    }

    // --- RENDER FUNCTIONS ---

    /**
     * The main render function. It orchestrates the rendering of the entire UI based on the current state.
     */
    function render() {
        // Hide all views first
        Object.values(views).forEach(view => view.style.display = 'none');
        // Show the current view
        if (views[state.currentView]) {
            views[state.currentView].style.display = 'block';
        }

        // Render the content of the active view
        switch (state.currentView) {
            case 'setup':
                renderSetupForm();
                break;
            case 'scoring':
                renderScoringView();
                break;
            case 'card':
                renderCardView();
                break;
        }

        // Show/hide the modal
        resetModalElement.style.display = state.modalVisible ? 'block' : 'none';

        // Show/hide the keypad
        keypadElement.style.display = currentlyFocusedInput ? 'grid' : 'none';
        appContainer.classList.toggle('keypad-visible', !!currentlyFocusedInput);

        // Always save data after a render cycle
        saveData();
    }

    /**
     * Renders the archer input forms in the setup view.
     */
    function renderSetupForm() {
        const container = views.setup.querySelector('#archer-setup-container');
        container.innerHTML = ''; // Clear previous content
        
        state.archers.forEach(archer => {
            const archerDiv = document.createElement('div');
            archerDiv.className = 'form-group-row';
            archerDiv.dataset.archerId = archer.id;
            archerDiv.innerHTML = `
                <input type="text" class="archer-firstname" value="${archer.firstName}" placeholder="First Name" data-id="${archer.id}" data-field="firstName">
                <input type="text" class="archer-lastname" value="${archer.lastName}" placeholder="Last Name" data-id="${archer.id}" data-field="lastName">
                <input type="text" class="archer-school" value="${archer.school}" placeholder="School" maxlength="3" data-id="${archer.id}" data-field="school">
                <select class="archer-level" data-id="${archer.id}" data-field="level">
                    <option value="V" ${archer.level === 'V' ? 'selected' : ''}>V</option>
                    <option value="JV" ${archer.level === 'JV' ? 'selected' : ''}>JV</option>
                    <option value="MS" ${archer.level === 'MS' ? 'selected' : ''}>MS</option>
                </select>
                <select class="archer-gender" data-id="${archer.id}" data-field="gender">
                    <option value="M" ${archer.gender === 'M' ? 'selected' : ''}>M</option>
                    <option value="F" ${archer.gender === 'F' ? 'selected' : ''}>F</option>
                </select>
                <button type="button" class="btn remove-archer-btn" data-id="${archer.id}">&times;</button>
            `;
            container.appendChild(archerDiv);
        });
    }

    /**
     * Renders the main "Digital Clipboard" for the current end.
     */
    function renderScoringView() {
        views.scoring.querySelector('#current-end-display').textContent = state.currentEnd;
        const container = views.scoring.querySelector('#bale-scoring-container');
        
        const table = document.createElement('table');
        table.className = 'score-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Archer</th>
                    <th>A1</th><th>A2</th><th>A3</th>
                    <th>End</th><th>Run</th><th>Avg</th>
                    <th>Card</th>
                </tr>
            </thead>
        `;
        const tbody = document.createElement('tbody');
        state.archers.forEach(archer => {
            const endScores = archer.scores[state.currentEnd - 1] || ['', '', ''];
            const endTotal = endScores.reduce((acc, s) => acc + parseScoreValue(s), 0);
            
            let runningTotal = 0;
            let arrowsShot = 0;
            archer.scores.forEach(end => {
                end.forEach(score => {
                    if (score !== '') {
                        runningTotal += parseScoreValue(score);
                        arrowsShot++;
                    }
                });
            });

            const avg = arrowsShot > 0 ? (runningTotal / arrowsShot).toFixed(1) : '';
            const avgClass = getScoreColor(avg, 'avg');

            const row = document.createElement('tr');
            row.dataset.archerId = archer.id;
            row.innerHTML = `
                <td>${archer.firstName} ${archer.lastName[0]}.</td>
                ${endScores.map((score, i) => `<td class="score-cell ${getScoreColor(score)}"><input type="text" class="score-input" value="${score}" data-archer-id="${archer.id}" data-arrow-index="${i}" readonly></td>`).join('')}
                <td class="end-total">${endTotal > 0 ? endTotal : ''}</td>
                <td class="calculated-cell">${runningTotal > 0 ? runningTotal : ''}</td>
                <td class="calculated-cell score-cell ${avgClass}">${avg}</td>
                <td><button class="btn btn-secondary view-card-btn" data-id="${archer.id}">View</button></td>
            `;
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        container.innerHTML = '';
        container.appendChild(table);
    }
    
    /**
     * Renders the full scorecard for a single archer.
     */
    function renderCardView() {
        const archer = state.archers.find(a => a.id == state.activeArcherId);
        if (!archer) {
            // This might happen if an archer is deleted while their card is viewed.
            // A robust solution would be to switch back to the scoring view.
            state.currentView = 'scoring';
            render(); // Re-render the scoring view
            return;
        };

        views.card.querySelector('#card-view-archer-name').textContent = `${archer.firstName} ${archer.lastName}'s Scorecard`;
        const container = views.card.querySelector('#individual-card-container');
        
        const table = document.createElement('table');
        table.className = 'score-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>R</th><th>A1</th><th>A2</th><th>A3</th>
                    <th>10s</th><th>Xs</th><th>END</th><th>TOT</th>
                </tr>
            </thead>
        `;
        const tbody = document.createElement('tbody');
        
        let runningTotal = 0;
        let totalTensOverall = 0;
        let totalXsOverall = 0;

        archer.scores.forEach((endScores, i) => {
            const endNum = i + 1;
            let endTotal = 0;
            let endTens = 0;
            let endXs = 0;
            
            endScores.forEach(score => {
                const val = parseScoreValue(score);
                endTotal += val;
                if (score === '10' || score.toUpperCase() === 'X') endTens++;
                if (score.toUpperCase() === 'X') endXs++;
            });
            
            runningTotal += endTotal;
            totalTensOverall += endTens;
            totalXsOverall += endXs;

            tbody.innerHTML += `
                <tr>
                    <td>${endNum}</td>
                    ${endScores.map(s => `<td class="score-cell ${getScoreColor(s)}">${s}</td>`).join('')}
                    <td class="calculated-cell">${endTens}</td>
                    <td class="calculated-cell">${endXs}</td>
                    <td class="calculated-cell">${endTotal}</td>
                    <td class="calculated-cell">${runningTotal}</td>
                </tr>
            `;
        });
        table.appendChild(tbody);

        // Add table footer
        const tfoot = table.createTFoot();
        tfoot.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: right; font-weight: bold;">Round Totals:</td>
                <td class="calculated-cell">${totalTensOverall}</td>
                <td class="calculated-cell">${totalXsOverall}</td>
                <td class="calculated-cell"></td>
                <td class="calculated-cell">${runningTotal}</td>
            </tr>
        `;
        
        container.innerHTML = '';
        container.appendChild(table);
    }

    // --- EVENT HANDLERS ---
    
    /**
     * Initializes all event listeners for the application.
     * Uses event delegation on the main app container to handle clicks on dynamic elements.
     */
    function init() {
        state = loadData();

        // Centralized event listener
        appContainer.addEventListener('click', (e) => {
            const target = e.target;

            // --- Setup View ---
            if (target.id === 'add-archer-btn') {
                const newId = state.archers.length > 0 ? Math.max(...state.archers.map(a => a.id)) + 1 : 1;
                state.archers.push({ id: newId, firstName: 'Archer', lastName: `${newId}`, school: '', level: 'V', gender: 'M', scores: Array.from({ length: state.totalEnds }, () => ['', '', '']) });
            } else if (target.id === 'load-sample-btn') {
                loadSampleData();
            } else if (target.id === 'start-scoring-btn') {
                if(state.archers.length > 0) state.currentView = 'scoring';
            } else if (target.matches('.remove-archer-btn')) {
                const id = parseInt(target.dataset.id);
                state.archers = state.archers.filter(a => a.id !== id);
            } 
            
            // --- Scoring View ---
            else if (target.id === 'setup-round-btn') {
                state.currentView = 'setup';
            } else if (target.id === 'prev-end-btn') {
                if (state.currentEnd > 1) state.currentEnd--;
            } else if (target.id === 'next-end-btn') {
                if (state.currentEnd < state.totalEnds) state.currentEnd++;
            } else if (target.matches('.view-card-btn')) {
                state.activeArcherId = parseInt(target.dataset.id);
                state.currentView = 'card';
            }

            // --- Card View ---
            else if (target.id === 'back-to-scoring-btn') {
                state.currentView = 'scoring';
            } else if (target.id === 'export-card-btn') {
                // exportCardAsText(state.activeArcherId); // TODO: Re-implement export
                alert('Export function not yet implemented in this version.');
            }

            // --- Modal ---
            else if (target.id === 'modal-cancel') {
                state.modalVisible = false;
            } else if (target.id === 'modal-reset-confirm') {
                localStorage.removeItem(sessionKey);
                state = loadData(); // Reload initial state
            }
            
            render(); // Re-render the UI after every action
        });

        // Keypad listener
        keypadElement.addEventListener('click', (e) => {
            const button = e.target.closest('.keypad-btn');
            if (!button || !currentlyFocusedInput) return;

            const action = button.dataset.action;
            const value = button.dataset.value;
            const { archerId, arrowIndex } = currentlyFocusedInput.dataset;

            if (value) {
                const archer = state.archers.find(a => a.id == archerId);
                if(archer) {
                    archer.scores[state.currentEnd - 1][arrowIndex] = value;
                }
                // Try to focus next input
                const allInputs = [...views.scoring.querySelectorAll('.score-input')];
                const currentIndex = allInputs.indexOf(currentlyFocusedInput);
                if (currentIndex < allInputs.length - 1) {
                    currentlyFocusedInput = allInputs[currentIndex + 1];
                    // No direct .focus() here; render() will handle it by seeing `currentlyFocusedInput` is not null
                } else {
                    currentlyFocusedInput = null; // Last input, close keypad
                }
            } else if (action === 'clear') {
                const archer = state.archers.find(a => a.id == archerId);
                if(archer) {
                    archer.scores[state.currentEnd - 1][arrowIndex] = '';
                }
            } else if (action === 'close') {
                currentlyFocusedInput = null;
            }
            render();
        });
        
        // Listen for input changes in the setup form
        views.setup.addEventListener('change', (e) => {
            const target = e.target;
            const { id, field, value } = target.dataset;
            if (id && field) {
                const archer = state.archers.find(a => a.id == id);
                if (archer) {
                    archer[field] = target.value;
                    render();
                }
            }
        });
        
        // Listen for when a score input gets focus
        views.scoring.addEventListener('focusin', (e) => {
            if (e.target.matches('.score-input')) {
                currentlyFocusedInput = e.target;
                render();
            }
        });

        // Initial Render
        render();
    }
    
    // --- UTILITY FUNCTIONS ---
    
    function loadSampleData() {
        state.archers = [
            { id: 1, firstName: 'Mike', lastName: 'A', school: 'WDV', level: 'V', gender: 'M', scores: Array.from({ length: 12 }, () => ['', '', '']) },
            { id: 2, firstName: 'Robert', lastName: 'B', school: 'WDV', level: 'V', gender: 'M', scores: Array.from({ length: 12 }, () => ['', '', '']) },
            { id: 3, firstName: 'Terry', lastName: 'C', school: 'OPP', level: 'JV', gender: 'M', scores: Array.from({ length: 12 }, () => ['', '', '']) },
        ];
        state.archers[0].scores[0] = ['10', '9', '7'];
        state.archers[0].scores[1] = ['X', 'X', '8'];
        state.archers[1].scores[0] = ['X', '9', '9'];
        state.currentView = 'setup'; // Go to setup view after loading
    }
    
    // --- INITIALIZATION ---
    init();

});
