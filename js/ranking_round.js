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

        // Load master list for selection
        const masterList = (typeof ArcherModule !== 'undefined') ? ArcherModule.loadList() : [];
        if (state.archers.length === 0) {
            // If no archers are set, load the master list and pre-select favorites
            masterList.forEach(archer => {
                if (archer.fave) {
                    state.archers.push({
                        id: Date.now() + Math.random(),
                        firstName: archer.first,
                        lastName: archer.last,
                        school: archer.school || '',
                        level: archer.level || '',
                        gender: archer.gender || '',
                        scores: Array(state.totalEnds).fill(null)
                    });
                }
            });
        }
        setupControls.container.innerHTML = '';

        // Search bar
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search archers...';
        searchInput.className = 'archer-search-bar';
        setupControls.container.appendChild(searchInput);

        // Multi-select list
        const listDiv = document.createElement('div');
        listDiv.style.maxHeight = '250px';
        listDiv.style.overflowY = 'auto';
        listDiv.style.marginBottom = '1em';
        setupControls.container.appendChild(listDiv);

        // Helper to render the list
        function renderArcherSelectList(filter = '') {
            listDiv.innerHTML = '';
            
            // Add a favorites section header if there are favorites
            const hasFavorites = masterList.some(a => a.fave);
            if (hasFavorites) {
                const favHeader = document.createElement('div');
                favHeader.style.padding = '0.8em';
                favHeader.style.backgroundColor = '#f8f9fa';
                favHeader.style.borderBottom = '1px solid #dee2e6';
                favHeader.style.fontWeight = 'bold';
                favHeader.style.fontSize = '1.1em';
                favHeader.textContent = '★ Favorites';
                listDiv.appendChild(favHeader);
            }

            // Sort: favorites first, then by name
            const sorted = masterList.slice().sort((a, b) => {
                if (b.fave !== a.fave) return b.fave - a.fave;
                return (a.last + a.first).localeCompare(b.last + b.first);
            });

            sorted.forEach((archer, idx) => {
                const name = `${archer.first} ${archer.last}`.toLowerCase();
                if (!name.includes(filter.toLowerCase())) return;

                // Add a separator between favorites and non-favorites
                if (idx > 0 && archer.fave !== sorted[idx-1].fave) {
                    const separator = document.createElement('div');
                    separator.style.padding = '0.8em';
                    separator.style.backgroundColor = '#f8f9fa';
                    separator.style.borderBottom = '1px solid #dee2e6';
                    separator.style.fontWeight = 'bold';
                    separator.style.fontSize = '1.1em';
                    separator.textContent = '☆ All Archers';
                    listDiv.appendChild(separator);
                }

                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.alignItems = 'center';
                row.style.marginBottom = '0.5em';
                row.style.padding = '0.8em';
                row.style.borderRadius = '8px';
                row.style.cursor = 'pointer';
                row.style.backgroundColor = '#ffffff';
                row.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';

                // Star (favorite toggle)
                const star = document.createElement('span');
                star.textContent = archer.fave ? '★' : '☆';
                star.style.cursor = 'pointer';
                star.style.fontSize = '1.4em';
                star.style.color = archer.fave ? '#e6b800' : '#ccc';
                star.style.marginRight = '0.8em';
                star.style.minWidth = '1.2em';
                star.style.textAlign = 'center';
                star.onclick = (e) => {
                    e.stopPropagation();
                    const realIdx = masterList.findIndex(a => a.first === archer.first && a.last === archer.last);
                    if (realIdx !== -1) {
                        masterList[realIdx].fave = !masterList[realIdx].fave;
                        if (typeof ArcherModule !== 'undefined') ArcherModule.saveList(masterList);
                        renderArcherSelectList(filter);
                    }
                };
                row.appendChild(star);

                // Checkbox
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = masterList.indexOf(archer);
                checkbox.style.marginRight = '0.8em';
                checkbox.style.width = '1.2em';
                checkbox.style.height = '1.2em';
                // Pre-select favorites on first render
                if (
                    (state.archers.length === 0 && archer.fave) ||
                    state.archers.some(a => a.firstName === archer.first && a.lastName === archer.last)
                ) {
                    checkbox.checked = true;
                }
                row.appendChild(checkbox);

                // Name label
                const label = document.createElement('label');
                label.textContent = `${archer.first} ${archer.last}`;
                label.style.flex = '1';
                label.style.cursor = 'pointer';
                label.style.fontSize = '1.1em';
                row.appendChild(label);

                // Details
                const details = document.createElement('span');
                details.textContent = `(${archer.grade || ''} ${archer.gender || ''} ${archer.level || ''})`;
                details.style.color = '#6c757d';
                details.style.fontSize = '0.9em';
                details.style.marginLeft = '0.5em';
                row.appendChild(details);

                listDiv.appendChild(row);
            });
        }
        renderArcherSelectList();
        searchInput.oninput = () => renderArcherSelectList(searchInput.value);

        // Add Archer button
        const addBtn = document.createElement('button');
        addBtn.textContent = '+ Add Archer';
        addBtn.className = 'btn btn-secondary';
        addBtn.style.marginBottom = '1em';
        addBtn.onclick = () => {
            alert('Add Archer: Please use the Archer List page for now. (Integration coming soon)');
        };
        setupControls.container.appendChild(addBtn);
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
            // Use a shortened name for the main scoring view to save space
            const displayName = `${archer.firstName} ${archer.lastName.charAt(0)}.`;
            row.innerHTML = `
                <td>${displayName}</td>
                ${arrowInputs}
                <td class="calculated-cell">${endTotal > 0 ? endTens : ''}</td>
                <td class="calculated-cell">${endTotal > 0 ? endXs : ''}</td>
                <td class="end-total">${endTotal > 0 ? endTotal : ''}</td>
                <td class="calculated-cell">${runningTotal > 0 ? runningTotal : ''}</td>
                <td class="calculated-cell score-cell ${avgClass}">${endAvg}</td>
                <td><button class="btn btn-secondary view-card-btn" data-archer-id="${archer.id}">>></button></td>
            `;
            tbody.appendChild(row);

            // Apply color classes to arrow score cells
            const scoreInputs = row.querySelectorAll('.score-input');
            scoreInputs.forEach((input, idx) => {
                const scoreValue = input.value;
                const td = input.parentElement;
                // Remove all classes
                td.className = '';
                // Add only the color class
                td.classList.add(getScoreColor(scoreValue));
            });
        });

        table.appendChild(tbody);

        scoringControls.container.innerHTML = ''; // Clear old table
        scoringControls.container.appendChild(table);
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
                <button class="keypad-btn" data-action="clear">Clear</button>
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
        } else if (action === 'prev' || action === 'next') {
            const allInputs = [...document.querySelectorAll('.score-input')];
            const currentIndex = allInputs.indexOf(keypad.currentlyFocusedInput);
            let nextIndex = action === 'next' ? currentIndex + 1 : currentIndex - 1;

            if (nextIndex >= 0 && nextIndex < allInputs.length) {
                allInputs[nextIndex].focus();
            }
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
        state.currentView = 'setup';
        state.currentEnd = 1;
        state.archers = [];
        state.activeArcherId = null;
        saveData();
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

        // --- SETUP VIEW LISTENERS ---
        setupControls.addArcherBtn.addEventListener('click', () => {
            const newId = state.archers.length > 0 ? Math.max(...state.archers.map(a => a.id)) + 1 : 1;
            updateStateFromSetupForm(); // Save any changes first
            state.archers.push({ 
                id: newId, 
                firstName: 'Archer', lastName: `${newId}`, 
                school: '', level: 'V', gender: 'M',
                scores: Array.from({ length: state.totalEnds }, () => ['', '', '']),
                targetSize: '40cm'
            });
            renderSetupForm();
            saveData();
        });

        setupControls.startScoringBtn.addEventListener('click', () => {
            // Force reload the master list first
            if (typeof ArcherModule !== 'undefined') {
                ArcherModule.loadList();
            }
            
            // Then refresh the setup form to get latest archer list
            renderSetupForm();
            
            // Get selected archers from the checkboxes
            const masterList = (typeof ArcherModule !== 'undefined') ? ArcherModule.loadList() : [];
            const selectedIdxs = Array.from(document.querySelectorAll('#archer-setup-container input[type=checkbox]:checked')).map(cb => parseInt(cb.value));
            state.archers = selectedIdxs.map(idx => {
                const a = masterList[idx];
                return {
                    id: a.id || idx + 1,
                    firstName: a.first || '',
                    lastName: a.last || '',
                    school: a.school || '',
                    level: a.level || 'V',
                    gender: a.gender || 'M',
                    targetSize: a.size || '40cm',
                    scores: Array.from({ length: state.totalEnds }, () => ['', '', ''])
                };
            });
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
        scoringControls.newRoundBtn.addEventListener('click', () => {
            resetModal.element.style.display = 'flex'; // Use flex to ensure proper centering
        });
        
        resetModal.cancelBtn.addEventListener('click', () => {
            resetModal.element.style.display = 'none';
        });
        
        resetModal.resetBtn.addEventListener('click', () => {
            resetState();
            resetModal.element.style.display = 'none';
            renderView(); // Re-render the view after reset
            renderSetupForm(); // Refresh the setup form
        });
        
        resetModal.sampleBtn.addEventListener('click', () => {
            loadSampleData();
            resetModal.element.style.display = 'none';
            showScoringView();
        });

        // --- SCORING & CARD VIEW LISTENERS (STATIC ELEMENTS) ---
        scoringControls.prevEndBtn.addEventListener('click', () => changeEnd(-1));
        scoringControls.nextEndBtn.addEventListener('click', () => changeEnd(1));
        cardControls.backToScoringBtn.addEventListener('click', showScoringView);
        cardControls.exportCardBtn.addEventListener('click', () => {
             const archerId = document.querySelector('#card-view .score-table').dataset.archerId;
             if (archerId) exportCardAsText(archerId);
        });
        document.getElementById('prev-archer-btn')?.addEventListener('click', () => navigateArchers(-1));
        document.getElementById('next-archer-btn')?.addEventListener('click', () => navigateArchers(1));
        
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
             if (e.target.classList.contains('archer-firstname-input') || e.target.classList.contains('archer-lastname-input') || e.target.classList.contains('archer-school-input') || e.target.classList.contains('archer-level-select') || e.target.classList.contains('archer-gender-select')) {
                updateStateFromSetupForm();
                saveData();
            }
        });

        const refreshBtn = document.getElementById('refresh-master-list-btn');
        if (refreshBtn) {
          console.log('Refresh Master List button found and event attached!');
          refreshBtn.onclick = async function() {
            console.log('Refresh Master List button clicked!');
            if (confirm('This will overwrite your current master archer list with the default CSV. Continue?')) {
              await ArcherModule.loadDefaultCSVIfNeeded(true); // force reload
              if (typeof ArcherModule !== 'undefined') {
                const masterList = ArcherModule.loadList();
                state.archers = [];
                masterList.forEach(archer => {
                  if (archer.fave) {
                    state.archers.push({
                      id: Date.now() + Math.random(),
                      firstName: archer.first,
                      lastName: archer.last,
                      school: archer.school || '',
                      level: archer.level || '',
                      gender: archer.gender || '',
                      scores: Array(state.totalEnds).fill(null)
                    });
                  }
                });
                renderSetupForm();
                alert('Master list refreshed from default CSV.');
              }
            }
          };
        } else {
          console.log('Refresh Master List button NOT found in DOM!');
        }
    }

    function updateStateFromSetupForm() {
        const newArchers = [];
        document.querySelectorAll('#archer-setup-container .form-group-row').forEach(row => {
            const archerId = parseInt(row.dataset.archerId);
            const existingArcher = state.archers.find(a => a.id === archerId);
            const scores = existingArcher ? existingArcher.scores : Array.from({ length: state.totalEnds }, () => ['', '', '']);

            newArchers.push({
                id: archerId,
                firstName: row.querySelector('.archer-firstname-input').value || 'Archer',
                lastName: row.querySelector('.archer-lastname-input').value || archerId.toString(),
                school: row.querySelector('.archer-school-input').value.toUpperCase(),
                level: row.querySelector('.archer-level-select').value,
                gender: row.querySelector('.archer-gender-select').value,
                scores: scores,
                targetSize: row.querySelector('.archer-targetsize-input').value || '40cm'
            });
        });
        state.archers = newArchers;
    }

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