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
        version: '1.1',
        currentView: 'setup', // 'setup', 'scoring', 'card'
        currentEnd: 1,
        totalEnds: 12, // Default for a 360 round
        date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        archers: [], // { id, firstName, lastName, school, level, gender, scores, targetSize? }
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
        subheader: document.querySelector('#setup-view .page-subheader'),
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
    
    // --- UTILITY FUNCTIONS ---

    /**
     * Parses a score input (e.g., 'X', '10', 'M') into its numerical value.
     * @param {string|number} score The score to parse.
     * @returns {number} The numerical value of the score.
     */
    function parseScoreValue(score) {
        if (typeof score === 'string') {
            const upperScore = score.toUpperCase().trim();
            if (upperScore === 'X') return 10;
            if (upperScore === 'M') return 0;
            const num = parseInt(upperScore, 10);
            return isNaN(num) ? 0 : num;
        }
        if (typeof score === 'number' && !isNaN(score)) {
            return score;
        }
        return 0;
    }

    /**
     * Gets the appropriate CSS class for a given score value based on target colors.
     * @param {string|number} score The score to evaluate.
     * @returns {string} The CSS class name.
     */
    function getScoreColor(score) {
        const value = parseScoreValue(score);
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

        // Rerender components if the view is active
        if (state.currentView === 'setup') {
            renderSetupForm();
        } else if (state.currentView === 'scoring') {
            renderScoringView();
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

        // The subheader is cleared and rebuilt in init(), so we only handle the list here.
        setupControls.container.innerHTML = '';

        // Load master list for selection
        const masterList = (typeof ArcherModule !== 'undefined') ? ArcherModule.loadList() : [];
        
        // Sort master list to put favorites first, then alphabetically
        masterList.sort((a, b) => {
            if (a.fave && !b.fave) return -1;
            if (!a.fave && b.fave) return 1;
            const nameA = `${a.first} ${a.last}`.toLowerCase();
            const nameB = `${b.first} ${b.last}`.toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });

        // Search functionality is now tied to the input in the subheader
        const searchInput = setupControls.subheader.querySelector('.archer-search-bar');
        const filter = searchInput ? searchInput.value : '';
        
        renderArcherSelectList(masterList, filter);
    }

    /**
     * Renders just the list of archers based on the master list and a filter.
     * This is separated to be called by the search input's oninput event.
     */
    function renderArcherSelectList(masterList, filter = '') {
        if (!setupControls.container) return;
        setupControls.container.innerHTML = ''; // Clear previous list

        // Multi-select list
        const listDiv = document.createElement('div');
        listDiv.className = 'archer-select-list';
        setupControls.container.appendChild(listDiv);

        const hasFavorites = masterList.some(a => a.fave);
        if (hasFavorites) {
            const favHeader = document.createElement('div');
            favHeader.className = 'list-header';
            favHeader.textContent = 'Favorites';
            listDiv.appendChild(favHeader);
        }

        const filteredList = masterList.filter(archer => {
            const name = `${archer.first} ${archer.last}`.toLowerCase();
            return name.includes(filter.toLowerCase());
        });

        let allArchersHeaderAdded = !hasFavorites;
        filteredList.forEach((archer, idx) => {
            // Add "All Archers" separator
            if (!archer.fave && !allArchersHeaderAdded) {
                const separator = document.createElement('div');
                separator.className = 'list-header';
                separator.textContent = '☆ All Archers';
                listDiv.appendChild(separator);
                allArchersHeaderAdded = true;
            }

            const row = document.createElement('div');
            row.className = 'archer-select-row';

            const uniqueId = `${archer.first.trim()}-${archer.last.trim()}`;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = state.archers.some(a => a.id === uniqueId);
            checkbox.onchange = () => {
                if (checkbox.checked) {
                    if (!state.archers.some(a => a.id === uniqueId)) {
                        state.archers.push({
                            id: uniqueId,
                            firstName: archer.first,
                            lastName: archer.last,
                            school: archer.school || '',
                            level: archer.level || '',
                            gender: archer.gender || '',
                            scores: Array(state.totalEnds).fill(null).map(() => ['', '', '']) // Use empty strings for empty scores
                        });
                    }
                } else {
                    state.archers = state.archers.filter(a => a.id !== uniqueId);
                }
                saveData();
            };

            const star = document.createElement('span');
            star.textContent = archer.fave ? '★' : '☆';
            star.className = 'favorite-star';
            star.style.color = archer.fave ? '#ffc107' : '#ccc';
            star.onclick = (e) => {
                e.stopPropagation();
                ArcherModule.toggleFavorite(archer.first, archer.last);
                renderSetupForm();
            };

            const nameLabel = document.createElement('span');
            nameLabel.textContent = `${archer.first} ${archer.last}`;
            nameLabel.className = 'archer-name-label';
            
            const detailsLabel = document.createElement('span');
            detailsLabel.className = 'archer-details-label';
            detailsLabel.textContent = `(${archer.level || 'VAR'})`;
            
            row.appendChild(checkbox);
            row.appendChild(star);
            row.appendChild(nameLabel);
            row.appendChild(detailsLabel);
            listDiv.appendChild(row);

            // Make the whole row clickable
            row.onclick = () => {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            };
        });
    }

    /**
     * Renders the main "Digital Clipboard" for the current end.
     */
    function renderScoringView() {
        if (!scoringControls.container) return;
        scoringControls.currentEndDisplay.textContent = state.currentEnd;

        let tableHTML = `
            <table class="score-table">
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
                <tbody>
        `;
        
        state.archers.forEach(archer => {
            const endScores = archer.scores[state.currentEnd - 1] || ['', '', ''];
            const safeEndScores = Array.isArray(endScores) ? endScores : ['', '', ''];

            let endTotal = 0;
            let endTens = 0;
            let endXs = 0;

            safeEndScores.forEach(score => {
                const upperScore = String(score).toUpperCase();
                endTotal += parseScoreValue(score);
                if (upperScore === '10') {
                    endTens++;
                } else if (upperScore === 'X') {
                    endXs++;
                }
            });

            let runningTotal = 0;
            let completedArrows = 0;
            archer.scores.forEach(end => {
                if (Array.isArray(end)) {
                    end.forEach(score => {
                        if (score !== null && score !== '') {
                            runningTotal += parseScoreValue(score);
                            completedArrows++;
                        }
                    });
                }
            });

            // Calculate END average, not running average
            const arrowsInEnd = safeEndScores.filter(s => s !== '' && s !== null).length;
            const endAvg = arrowsInEnd > 0 ? (endTotal / arrowsInEnd).toFixed(1) : '0.0';

            let avgClass = '';
            const avgNum = parseFloat(endAvg);
            if (avgNum > 0) {
                if (avgNum >= 9) avgClass = 'score-gold';
                else if (avgNum >= 7) avgClass = 'score-red';
                else if (avgNum >= 5) avgClass = 'score-blue';
                else if (avgNum >= 3) avgClass = 'score-black';
                else avgClass = 'score-white';
            }

            tableHTML += `
                <tr data-archer-id="${archer.id}">
                    <td>${archer.firstName} ${archer.lastName.charAt(0)}.</td>
                    <td><input type="text" class="score-input ${getScoreColor(safeEndScores[0])}" data-archer-id="${archer.id}" data-arrow-idx="0" value="${safeEndScores[0] || ''}" readonly></td>
                    <td><input type="text" class="score-input ${getScoreColor(safeEndScores[1])}" data-archer-id="${archer.id}" data-arrow-idx="1" value="${safeEndScores[1] || ''}" readonly></td>
                    <td><input type="text" class="score-input ${getScoreColor(safeEndScores[2])}" data-archer-id="${archer.id}" data-arrow-idx="2" value="${safeEndScores[2] || ''}" readonly></td>
                    <td class="calculated-cell">${endTens + endXs}</td>
                    <td class="calculated-cell">${endXs}</td>
                    <td class="calculated-cell">${endTotal}</td>
                    <td class="calculated-cell">${runningTotal}</td>
                    <td class="calculated-cell ${avgClass}">${endAvg}</td>
                    <td><button class="btn view-card-btn" data-archer-id="${archer.id}">»</button></td>
                </tr>
            `;
        });

        tableHTML += `</tbody></table>`;
        scoringControls.container.innerHTML = tableHTML;
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

        const displayName = `${archer.firstName} ${archer.lastName}`;
        cardControls.archerNameDisplay.textContent = displayName;
        
        // Clear previous details and add new ones
        const header = cardControls.archerNameDisplay.parentElement;
        header.querySelectorAll('.card-details').forEach(el => el.remove());
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'card-details';
        detailsDiv.innerHTML = `
            <span>${archer.school}</span>
            <span>${archer.level}</span>
            <span>${archer.gender}</span>
            <span>${state.date}</span>
        `;
        header.appendChild(detailsDiv);
        
        const table = document.createElement('table');
        table.className = 'score-table';
        table.dataset.archerId = archerId;
        table.innerHTML = `
            <thead>
                <tr>
                    <th>R</th>
                    <th>Arrow 1</th><th>Arrow 2</th><th>Arrow 3</th>
                    <th>10s</th><th>Xs</th><th>E</th><th>TOT</th><th>AVG</th>
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
        const archer = state.archers.find(a => a.id == archerId);
        if (!archer) return;

        const displayName = `${archer.firstName} ${archer.lastName}`;
        let text = `Scorecard for ${displayName}\n`;
        text += `School: ${archer.school}, Level: ${archer.level}, Gender: ${archer.gender}\n`;
        text += `Date: ${state.date}\n`;
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
            const originalText = cardControls.exportCardBtn.textContent;
            cardControls.exportCardBtn.textContent = 'Copied!';
            cardControls.exportCardBtn.classList.add('btn-success');
            setTimeout(() => {
                cardControls.exportCardBtn.textContent = originalText;
                cardControls.exportCardBtn.classList.remove('btn-success');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy scorecard. See console for details.');
        });
    }

    /**
     * Initializes the keypad by rendering its HTML structure.
     */
    function renderKeypad() {
        if (!keypad.element) return;
        keypad.element.innerHTML = `
            <div class="keypad">
                <button class="keypad-btn" data-value="X">X</button>
                <button class="keypad-btn" data-value="10">10</button>
                <button class="keypad-btn" data-value="9">9</button>
                <button class="keypad-btn nav-btn" data-action="prev">&larr;</button>
                <button class="keypad-btn" data-value="8">8</button>
                <button class="keypad-btn" data-value="7">7</button>
                <button class="keypad-btn" data-value="6">6</button>
                <button class="keypad-btn nav-btn" data-action="next">&rarr;</button>
                <button class="keypad-btn" data-value="5">5</button>
                <button class="keypad-btn" data-value="4">4</button>
                <button class="keypad-btn" data-value="3">3</button>
                <button class="keypad-btn" data-action="clear">CLR</button>
                <button class="keypad-btn" data-value="2">2</button>
                <button class="keypad-btn" data-value="1">1</button>
                <button class="keypad-btn" data-value="M">M</button>
                <button class="keypad-btn" data-action="close">Close</button>
            </div>
        `;
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
        const allInputs = Array.from(document.querySelectorAll('#scoring-view .score-input'));
        const currentIndex = allInputs.indexOf(input);

        // --- Handle navigation first, as it doesn't require re-rendering ---
        if (action === 'prev') {
            if (currentIndex > 0) allInputs[currentIndex - 1].focus();
            return;
        }
        if (action === 'next') {
            if (currentIndex < allInputs.length - 1) allInputs[currentIndex + 1].focus();
            return;
        }
        
        if (action === 'close') {
            keypad.element.style.display = 'none';
            document.body.classList.remove('keypad-visible');
            return;
        }

        // --- Handle value changes, which DO require re-rendering ---
        if (action === 'clear') {
            input.value = '';
        } else if (value) {
            input.value = value;
        }

        // Dispatch an 'input' event to trigger handleScoreInput, which saves state and re-renders the view.
        input.dispatchEvent(new Event('input', { bubbles: true }));

        // --- Post-render focus logic ---
        // Since renderScoringView() replaces the DOM elements, we must find the new elements to focus them.
        if (value && currentIndex < allInputs.length - 1) {
            // A score was entered, and it wasn't the last input. Advance to the next one.
            const nextInputInOldList = allInputs[currentIndex + 1];
            const nextInputInNewDom = document.querySelector(`[data-archer-id="${nextInputInOldList.dataset.archerId}"][data-arrow-idx="${nextInputInOldList.dataset.arrowIdx}"]`);
            if (nextInputInNewDom) nextInputInNewDom.focus();
        } else if (action === 'clear') {
            // Keep focus on the same input after clearing.
             const currentInputInNewDom = document.querySelector(`[data-archer-id="${input.dataset.archerId}"][data-arrow-idx="${input.dataset.arrowIdx}"]`);
            if (currentInputInNewDom) currentInputInNewDom.focus();
        } else {
            // It was the last input, so close the keypad.
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
        const archerId = input.dataset.archerId;
        const arrowIndex = parseInt(input.dataset.arrowIdx, 10);
        const archer = state.archers.find(a => a.id === archerId);

        if (archer) {
            // Ensure the scores array for the current end exists
            if (!Array.isArray(archer.scores[state.currentEnd - 1])) {
                archer.scores[state.currentEnd - 1] = ['', '', ''];
            }
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
        state.archers = [];
        state.currentEnd = 1;
        state.currentView = 'setup';
        renderView();
        saveData();
    }
    
    /**
     * Switches the view to the main scoring view.
     */
    function showScoringView() {
        if (state.archers.length === 0) {
            alert("Please select at least one archer to start scoring.");
            return;
        }
        state.currentView = 'scoring';
        renderView();
        saveData();
    }

    /**
     * Initializes the application.
     */
    function init() {
        console.log("Initializing Ranking Round App...");
        loadData(); // Load data first

        // Load master archer list if no archers in session
        if (typeof ArcherModule !== 'undefined' && state.archers.length === 0) {
            const masterList = ArcherModule.loadList();
            if (masterList.length > 0) {
                state.archers = masterList.map((a, i) => ({
                    id: a.id || i + 1,
                    firstName: a.first || '',
                    lastName: a.last || '',
                    school: a.school || '',
                    level: a.level || 'V',
                    gender: a.gender || 'M',
                    targetSize: a.size || '40cm',
                    scores: Array.from({ length: state.totalEnds }, () => ['', '', ''])
                }));
            }
        }

        renderKeypad();

        // If no archers, add a default one. Otherwise, render the loaded state.
        if (state.archers.length === 0) {
            state.archers.push({ 
                id: 1, 
                firstName: 'Archer', lastName: '1', 
                school: '', level: 'V', gender: 'M',
                scores: Array.from({ length: state.totalEnds }, () => ['', '', '']),
                targetSize: '40cm'
            });
        }
        
        renderSetupForm();
        renderScoringView(); // Also render scoring view in case we load into it
        renderView(); // Show the correct view based on loaded state

        // --- SETUP VIEW CONTROLS ---
        if (setupControls.subheader) {
            setupControls.subheader.innerHTML = ''; // Clear on init

            // Search Input
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.placeholder = 'Search archers...';
            searchInput.className = 'archer-search-bar';
            searchInput.oninput = () => {
                const masterList = (typeof ArcherModule !== 'undefined') ? ArcherModule.loadList() : [];
                renderArcherSelectList(masterList, searchInput.value);
            };
            
            // Refresh Button
            const refreshBtn = document.createElement('button');
            refreshBtn.id = 'refresh-btn';
            refreshBtn.className = 'btn btn-secondary';
            refreshBtn.textContent = 'Refresh';
            refreshBtn.onclick = () => {
                // Simply re-render the setup form which re-loads the master list
                renderSetupForm();
            };

            // Reset Button
            const resetBtn = document.createElement('button');
            resetBtn.id = 'reset-btn';
            resetBtn.className = 'btn btn-danger';
            resetBtn.textContent = 'Reset';
            resetBtn.onclick = () => {
                resetModal.element.style.display = 'flex';
            };

            // Scoring Button
            const scoringBtn = document.createElement('button');
            scoringBtn.id = 'scoring-btn';
            scoringBtn.className = 'btn btn-primary';
            scoringBtn.textContent = 'Scoring';
            scoringBtn.style.marginLeft = 'auto'; // Push to the right
            scoringBtn.onclick = showScoringView;

            setupControls.subheader.appendChild(searchInput);
            setupControls.subheader.appendChild(refreshBtn);
            setupControls.subheader.appendChild(resetBtn);
            setupControls.subheader.appendChild(scoringBtn);
        }

        // --- FOOTER CONTROLS ---
        const setupBaleBtn = document.getElementById('setup-bale-btn');
        if (setupBaleBtn) {
            setupBaleBtn.onclick = () => {
                state.currentView = 'setup';
                renderView();
            };
        }
        
        // --- SCORING VIEW CONTROLS ---
        scoringControls.prevEndBtn.onclick = () => changeEnd(-1);
        scoringControls.nextEndBtn.onclick = () => changeEnd(1);
        
        // --- MODAL CONTROLS ---
        resetModal.cancelBtn.onclick = () => resetModal.element.style.display = 'none';
        resetModal.resetBtn.onclick = () => {
            resetState();
            resetModal.element.style.display = 'none';
        };
        resetModal.sampleBtn.onclick = () => {
            loadSampleData();
            resetModal.element.style.display = 'none';
        };

        // --- CARD VIEW CONTROLS ---
        cardControls.backToScoringBtn.onclick = () => {
            state.currentView = 'scoring';
            renderView();
        };
        cardControls.exportCardBtn.onclick = () => {
            if (state.activeArcherId) {
                exportCardAsText(state.activeArcherId);
            }
        };
        document.getElementById('next-archer-btn').onclick = () => navigateArchers(1);

        // --- DELEGATED EVENT LISTENERS (for dynamic elements) ---
        document.body.addEventListener('focusin', (e) => {
            if (e.target.classList.contains('score-input')) {
                keypad.currentlyFocusedInput = e.target;
                keypad.element.style.display = 'grid';
                document.body.classList.add('keypad-visible');
            }
        });

        document.body.addEventListener('click', (e) => {
            // Show Card View
            if (e.target.classList.contains('view-card-btn')) {
                state.currentView = 'card';
                renderCardView(e.target.dataset.archerId);
                renderView();
                keypad.element.style.display = 'none';
            }
        });
        
        document.body.addEventListener('input', (e) => {
            if (e.target.classList.contains('score-input')) {
                handleScoreInput(e);
            }
        });

        keypad.element.addEventListener('click', handleKeypadClick);

        // --- INITIAL LOAD ---
        loadData();
        renderKeypad(); // Render keypad once, it's always in the DOM
        renderView(); // Initial view render based on loaded or default state
    }

    /**
     * Updates the application state based on the selections in the setup form.
     * This function is now less critical as selections update state directly,
     * but can be used as a final check before moving to scoring.
     */
    function updateStateFromSetupForm() {
        // This function can be simplified or removed if the checkbox onchange
        // proves reliable enough. For now, it's a good safeguard.
        console.log("Final check of selected archers before scoring.");
        saveData();
    }

    /**
     * Loads sample data for demonstration or testing purposes.
     */
    function loadSampleData() {
        state.archers = [
            { id: 1, firstName: 'Mike', lastName: 'A.', school: 'WDV', level: 'V', gender: 'M', scores: [
                ['10','9','7'], ['8','6','M'], ['5','4','3'], ['10','9','7'], ['X','10','8'], ['X','X','X'],
                ['9','9','8'], ['10','X','X'], ['7','6','5'], ['X','X','9'], ['10','10','10'], ['8','8','7']
            ], targetSize: '40cm' },
            { id: 2, firstName: 'Robert', lastName: 'B.', school: 'WDV', level: 'V', gender: 'M', scores: [
                ['X','9','9'], ['8','8','7'], ['5','5','5'], ['6','6','7'], ['8','9','10'], ['7','7','6'],
                ['10','9','9'], ['X','X','8'], ['9','8','7'], ['6','5','M'], ['7','7','8'], ['9','9','10']
            ], targetSize: '40cm' },
            { id: 3, firstName: 'Terry', lastName: 'C.', school: 'OPP', level: 'JV', gender: 'M', scores: [
                ['X','7','7'], ['7','7','7'], ['10','7','10'], ['5','4','M'], ['8','7','6'], ['5','4','3'],
                ['9','8','X'], ['10','7','6'], ['9','9','9'], ['8','8','M'], ['7','6','X'], ['10','9','8']
            ], targetSize: '40cm' },
            { id: 4, firstName: 'Susan', lastName: 'D.', school: 'OPP', level: 'V', gender: 'F', scores: [
                ['9','9','8'], ['10','9','8'], ['X','9','8'], ['7','7','6'], ['10','10','9'], ['X','9','9'],
                ['8','8','7'], ['9','9','9'], ['10','X','9'], ['8','7','6'], ['X','X','X'], ['9','9','8']
            ], targetSize: '40cm' },
        ];
    }

    /**
     * Navigates to the next or previous archer's scorecard.
     * @param {number} direction -1 for previous, 1 for next.
     */
    function navigateArchers(direction) {
        const currentArcherId = parseInt(document.querySelector('#card-view .score-table').dataset.archerId);
        const currentIndex = state.archers.findIndex(a => a.id === currentArcherId);
        
        let nextIndex = currentIndex + direction;

        // Wrap around
        if (nextIndex >= state.archers.length) {
            nextIndex = 0;
        }
        if (nextIndex < 0) {
            nextIndex = state.archers.length - 1;
        }

        const nextArcherId = state.archers[nextIndex].id;
        renderCardView(nextArcherId);
    }

    // --- INITIALIZATION ---
    init();

}); 