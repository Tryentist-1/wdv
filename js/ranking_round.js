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
        baleNumber: 1,
        date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        archers: [], // { id, firstName, lastName, school, level, gender, targetAssignment, scores, targetSize? }
        activeArcherId: null, // For card view
    };

    const sessionKey = `rankingRound_${new Date().toISOString().split('T')[0]}`;

    // --- DOM ELEMENT REFERENCES ---
    const views = {
        setup: document.getElementById('setup-view'),
        scoring: document.getElementById('scoring-view'),
        card: document.getElementById('card-view'),
    };

    const verifyModal = {
        element: document.getElementById('verify-totals-modal'),
        container: document.getElementById('verify-totals-container'),
        closeBtn: document.getElementById('modal-close-verify'),
        sendBtn: document.getElementById('modal-send-sms'),
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
    };

    const cardControls = {
        container: document.getElementById('individual-card-container'),
        archerNameDisplay: document.getElementById('card-view-archer-name'),
        backToScoringBtn: document.getElementById('back-to-scoring-btn'),
        verifySendBtn: document.getElementById('verify-send-btn'), // Changed from export
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

    // --- VIEW MANAGEMENT ---

    function renderView() {
        Object.values(views).forEach(view => view.style.display = 'none');
        if (views[state.currentView]) {
            views[state.currentView].style.display = 'block';
        }
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
                Object.assign(state, loadedState);
            } catch (e) {
                console.error("Error parsing stored data. Starting fresh.", e);
                localStorage.removeItem(sessionKey);
            }
        }
    }

    // --- LOGIC ---

    function renderSetupForm() {
        if (!setupControls.container) return;
        setupControls.container.innerHTML = '';
        const masterList = (typeof ArcherModule !== 'undefined') ? ArcherModule.loadList() : [];
        masterList.sort((a, b) => {
            if (a.fave && !b.fave) return -1;
            if (!a.fave && b.fave) return 1;
            const nameA = `${a.first} ${a.last}`.toLowerCase();
            const nameB = `${b.first} ${b.last}`.toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });
        const searchInput = setupControls.subheader.querySelector('.archer-search-bar');
        const filter = searchInput ? searchInput.value : '';
        renderArcherSelectList(masterList, filter);
    }

    function renderArcherSelectList(masterList, filter = '') {
        if (!setupControls.container) return;
        setupControls.container.innerHTML = '';
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
        filteredList.forEach((archer) => {
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
            const existingArcher = state.archers.find(a => a.id === uniqueId);

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = !!existingArcher;
            
            const targetSelect = document.createElement('select');
            targetSelect.className = 'target-assignment-select';
            ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(letter => {
                const option = document.createElement('option');
                option.value = letter;
                option.textContent = letter;
                targetSelect.appendChild(option);
            });
            targetSelect.style.display = checkbox.checked ? 'inline-block' : 'none';
            if (existingArcher) {
                targetSelect.value = existingArcher.targetAssignment;
            }
            
            checkbox.onchange = () => {
                if (checkbox.checked) {
                    if (!state.archers.some(a => a.id === uniqueId)) {
                        const usedTargets = state.archers.map(a => a.targetAssignment);
                        const availableTargets = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].filter(t => !usedTargets.includes(t));
                        const nextTarget = availableTargets.length > 0 ? availableTargets[0] : 'A';
                        state.archers.push({
                            id: uniqueId,
                            firstName: archer.first,
                            lastName: archer.last,
                            school: archer.school || '',
                            level: archer.level || '',
                            gender: archer.gender || '',
                            targetAssignment: nextTarget,
                            scores: Array(state.totalEnds).fill(null).map(() => ['', '', ''])
                        });
                    }
                } else {
                    state.archers = state.archers.filter(a => a.id !== uniqueId);
                }
                saveData();
                renderSetupForm(); // Re-render to show/hide select and update state
            };

            targetSelect.onchange = () => {
                const archerInState = state.archers.find(a => a.id === uniqueId);
                if (archerInState) {
                    archerInState.targetAssignment = targetSelect.value;
                    saveData();
                }
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
            row.appendChild(targetSelect);
            listDiv.appendChild(row);
            row.onclick = (e) => {
                if(e.target.tagName !== 'SELECT' && e.target.tagName !== 'INPUT') {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            };
        });
    }

    function renderScoringView() {
        if (!scoringControls.container) return;
        scoringControls.currentEndDisplay.textContent = `Bale ${state.baleNumber} - End ${state.currentEnd}`;
        let tableHTML = `
            <table class="score-table">
                <thead>
                    <tr>
                        <th>Archer</th>
                        <th>A1</th><th>A2</th><th>A3</th>
                        <th>10s</th><th>X</th><th>End</th><th>Run</th><th>Avg</th><th>Card</th>
                    </tr>
                </thead>
                <tbody>`;
        state.archers.forEach(archer => {
            const endScores = archer.scores[state.currentEnd - 1] || ['', '', ''];
            const safeEndScores = Array.isArray(endScores) ? endScores : ['', '', ''];
            let endTotal = 0, endTens = 0, endXs = 0;
            safeEndScores.forEach(score => {
                const upperScore = String(score).toUpperCase();
                endTotal += parseScoreValue(score);
                if (upperScore === '10') endTens++;
                else if (upperScore === 'X') endXs++;
            });
            let runningTotal = 0;
            archer.scores.forEach(end => {
                if (Array.isArray(end)) {
                    end.forEach(score => {
                        if (score !== null && score !== '') runningTotal += parseScoreValue(score);
                    });
                }
            });
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
                    <td>${archer.firstName} ${archer.lastName.charAt(0)}. (${archer.targetAssignment})</td>
                    <td><input type="text" class="score-input ${getScoreColor(safeEndScores[0])}" data-archer-id="${archer.id}" data-arrow-idx="0" value="${safeEndScores[0] || ''}" readonly></td>
                    <td><input type="text" class="score-input ${getScoreColor(safeEndScores[1])}" data-archer-id="${archer.id}" data-arrow-idx="1" value="${safeEndScores[1] || ''}" readonly></td>
                    <td><input type="text" class="score-input ${getScoreColor(safeEndScores[2])}" data-archer-id="${archer.id}" data-arrow-idx="2" value="${safeEndScores[2] || ''}" readonly></td>
                    <td class="calculated-cell">${endTens + endXs}</td>
                    <td class="calculated-cell">${endXs}</td>
                    <td class="calculated-cell">${endTotal}</td>
                    <td class="calculated-cell">${runningTotal}</td>
                    <td class="calculated-cell ${avgClass}">${endAvg}</td>
                    <td><button class="btn view-card-btn" data-archer-id="${archer.id}">»</button></td>
                </tr>`;
        });
        tableHTML += `</tbody></table>`;
        scoringControls.container.innerHTML = tableHTML;
    }
    
    function renderCardView(archerId) {
        const archer = state.archers.find(a => a.id == archerId);
        if (!archer) return;
        const displayName = `${archer.firstName} ${archer.lastName}`;
        cardControls.archerNameDisplay.textContent = displayName;
        const header = cardControls.archerNameDisplay.parentElement;
        header.querySelectorAll('.card-details').forEach(el => el.remove());
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'card-details';
        detailsDiv.innerHTML = `<span>Bale ${state.baleNumber} - Target ${archer.targetAssignment}</span><span>${archer.school}</span><span>${archer.level} / ${archer.gender}</span>`;
        header.appendChild(detailsDiv);
        const table = document.createElement('table');
        table.className = 'score-table';
        table.dataset.archerId = archerId;
        table.innerHTML = `<thead><tr><th>E</th><th>A1</th><th>A2</th><th>A3</th><th>10s</th><th>Xs</th><th>END</th><th>RUN</th><th>AVG</th></tr></thead>`;
        const tbody = document.createElement('tbody');
        let tableHTML = '';
        let runningTotal = 0, totalTensOverall = 0, totalXsOverall = 0;
        for (let i = 0; i < state.totalEnds; i++) {
            const endNum = i + 1;
            const endScores = archer.scores[i] || ['', '', ''];
            let endTotal = 0, endTens = 0, endXs = 0;
            let isComplete = endScores.every(s => s !== '');
            endScores.forEach(scoreValue => {
                endTotal += parseScoreValue(scoreValue);
                if (scoreValue === '10') endTens++;
                else if (String(scoreValue).toUpperCase() === 'X') endXs++;
            });
            if (isComplete) {
                runningTotal += endTotal;
                totalTensOverall += endTens;
                totalXsOverall += endXs;
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
            tableHTML += `<tr><td>${endNum}</td>${endScores.map(s => `<td class="score-cell ${getScoreColor(s)}">${s}</td>`).join('')}<td class="calculated-cell">${isComplete ? (endTens + endXs) : ''}</td><td class="calculated-cell">${isComplete ? endXs : ''}</td><td class="calculated-cell">${isComplete ? endTotal : ''}</td><td class="calculated-cell">${isComplete ? runningTotal : ''}</td><td class="calculated-cell score-cell ${avgClass}">${avg}</td></tr>`;
        }
        tbody.innerHTML = tableHTML;
        table.appendChild(tbody);
        const tfoot = table.createTFoot();
        const footerRow = tfoot.insertRow();
        let finalAvg = 0, finalAvgClass = '';
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
        footerRow.innerHTML = `<td colspan="4" style="text-align: right; font-weight: bold;">Round Totals:</td><td class="calculated-cell">${totalTensOverall + totalXsOverall}</td><td class="calculated-cell">${totalXsOverall}</td><td class="calculated-cell"></td><td class="calculated-cell">${runningTotal}</td><td class="calculated-cell score-cell ${finalAvgClass}">${finalAvg > 0 ? finalAvg : ''}</td>`;
        cardControls.container.innerHTML = '';
        cardControls.container.appendChild(table);
    }
    
    function getBaleTotals() {
        return state.archers.map(archer => {
            let totalScore = 0, totalArrows = 0, tens = 0, xs = 0;
            archer.scores.forEach(end => {
                end.forEach(scoreStr => {
                    if (scoreStr !== '' && scoreStr !== null) {
                        totalArrows++;
                        const scoreVal = parseScoreValue(scoreStr);
                        totalScore += scoreVal;
                        if (scoreVal === 10) {
                            if (String(scoreStr).toUpperCase() === 'X') xs++;
                            tens++;
                        }
                    }
                });
            });
            const avgArrow = totalArrows > 0 ? (totalScore / totalArrows).toFixed(2) : '0.00';
            return {
                name: `${archer.firstName} ${archer.lastName}`,
                tens,
                xs,
                totalScore,
                avgArrow,
                gender: archer.gender || 'N/A'
            };
        });
    }

    function renderVerifyModal() {
        const totals = getBaleTotals();
        let tableHTML = `<table class="score-table"><thead><tr><th>Archer</th><th>10s</th><th>Xs</th><th>Total</th><th>Avg</th></tr></thead><tbody>`;
        totals.forEach(archer => {
            tableHTML += `<tr><td style="text-align:left; padding-left: 5px;">${archer.name}</td><td>${archer.tens}</td><td>${archer.xs}</td><td>${archer.totalScore}</td><td>${archer.avgArrow}</td></tr>`;
        });
        tableHTML += `</tbody></table>`;
        verifyModal.container.innerHTML = tableHTML;
        verifyModal.element.style.display = 'flex';
    }

    function sendBaleSMS() {
        const totals = getBaleTotals();
        const timestamp = new Date().toLocaleDateString('en-US');
        const dataRows = totals.map(archer => {
            return [archer.name, archer.tens, archer.xs, archer.totalScore, archer.avgArrow, timestamp, archer.gender].join('\t');
        });
        const smsBody = dataRows.join('\n');
        window.location.href = `sms:?&body=${encodeURIComponent(smsBody)}`;
    }

    function renderKeypad() {
        if (!keypad.element) return;
        keypad.element.innerHTML = `<div class="keypad"><button class="keypad-btn" data-value="X">X</button><button class="keypad-btn" data-value="10">10</button><button class="keypad-btn" data-value="9">9</button><button class="keypad-btn nav-btn" data-action="prev">&larr;</button><button class="keypad-btn" data-value="8">8</button><button class="keypad-btn" data-value="7">7</button><button class="keypad-btn" data-value="6">6</button><button class="keypad-btn nav-btn" data-action="next">&rarr;</button><button class="keypad-btn" data-value="5">5</button><button class="keypad-btn" data-value="4">4</button><button class="keypad-btn" data-value="3">3</button><button class="keypad-btn" data-action="clear">CLR</button><button class="keypad-btn" data-value="2">2</button><button class="keypad-btn" data-value="1">1</button><button class="keypad-btn" data-value="M">M</button><button class="keypad-btn" data-action="close">Close</button></div>`;
    }

    function handleKeypadClick(e) {
        const button = e.target.closest('.keypad-btn');
        if (!button || !keypad.currentlyFocusedInput) return;
        const action = button.dataset.action;
        const value = button.dataset.value;
        const input = keypad.currentlyFocusedInput;
        const allInputs = Array.from(document.querySelectorAll('#scoring-view .score-input'));
        const currentIndex = allInputs.indexOf(input);
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
        if (action === 'clear') input.value = '';
        else if (value) input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        if (value && currentIndex < allInputs.length - 1) {
            const nextInputInOldList = allInputs[currentIndex + 1];
            const nextInputInNewDom = document.querySelector(`[data-archer-id="${nextInputInOldList.dataset.archerId}"][data-arrow-idx="${nextInputInOldList.dataset.arrowIdx}"]`);
            if (nextInputInNewDom) nextInputInNewDom.focus();
        } else if (action === 'clear') {
             const currentInputInNewDom = document.querySelector(`[data-archer-id="${input.dataset.archerId}"][data-arrow-idx="${input.dataset.arrowIdx}"]`);
            if (currentInputInNewDom) currentInputInNewDom.focus();
        } else {
            keypad.element.style.display = 'none';
            document.body.classList.remove('keypad-visible');
        }
    }

    function handleScoreInput(e) {
        const input = e.target;
        const archerId = input.dataset.archerId;
        const arrowIndex = parseInt(input.dataset.arrowIdx, 10);
        const archer = state.archers.find(a => a.id === archerId);
        if (archer) {
            if (!Array.isArray(archer.scores[state.currentEnd - 1])) {
                archer.scores[state.currentEnd - 1] = ['', '', ''];
            }
            archer.scores[state.currentEnd - 1][arrowIndex] = input.value;
            renderScoringView();
            saveData();
        }
    }

    function changeEnd(direction) {
        const newEnd = state.currentEnd + direction;
        if (newEnd > 0 && newEnd <= state.totalEnds) {
            state.currentEnd = newEnd;
            renderScoringView();
            saveData();
        }
    }
    
    function resetState() {
        state.archers = [];
        state.currentEnd = 1;
        state.currentView = 'setup';
        renderView();
        saveData();
    }
    
    function showScoringView() {
        if (state.archers.length === 0) {
            alert("Please select at least one archer to start scoring.");
            return;
        }
        state.currentView = 'scoring';
        renderView();
        saveData();
    }

    function init() {
        console.log("Initializing Ranking Round App...");
        loadData();
        renderKeypad();
        renderView();

        const baleNumberInput = document.getElementById('bale-number-input');
        if (baleNumberInput) {
            baleNumberInput.value = state.baleNumber;
            baleNumberInput.onchange = () => {
                state.baleNumber = parseInt(baleNumberInput.value, 10) || 1;
                saveData();
            };
        }

        if (setupControls.subheader) {
            setupControls.subheader.innerHTML = '';
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.placeholder = 'Search archers...';
            searchInput.className = 'archer-search-bar';
            searchInput.oninput = () => {
                const masterList = (typeof ArcherModule !== 'undefined') ? ArcherModule.loadList() : [];
                renderArcherSelectList(masterList, searchInput.value);
            };
            const refreshBtn = document.createElement('button');
            refreshBtn.id = 'refresh-btn';
            refreshBtn.className = 'btn btn-secondary';
            refreshBtn.textContent = 'Refresh';
            refreshBtn.onclick = () => renderSetupForm();
            const resetBtn = document.createElement('button');
            resetBtn.id = 'reset-btn';
            resetBtn.className = 'btn btn-danger';
            resetBtn.textContent = 'Reset';
            resetBtn.onclick = () => resetModal.element.style.display = 'flex';
            const scoringBtn = document.createElement('button');
            scoringBtn.id = 'scoring-btn';
            scoringBtn.className = 'btn btn-primary';
            scoringBtn.textContent = 'Scoring';
            scoringBtn.style.marginLeft = 'auto';
            scoringBtn.onclick = showScoringView;
            setupControls.subheader.appendChild(searchInput);
            setupControls.subheader.appendChild(refreshBtn);
            setupControls.subheader.appendChild(resetBtn);
            setupControls.subheader.appendChild(scoringBtn);
        }

        const setupBaleBtn = document.getElementById('setup-bale-btn');
        if (setupBaleBtn) {
            setupBaleBtn.onclick = () => {
                state.currentView = 'setup';
                renderView();
            };
        }
        
        scoringControls.prevEndBtn.onclick = () => changeEnd(-1);
        scoringControls.nextEndBtn.onclick = () => changeEnd(1);
        
        resetModal.cancelBtn.onclick = () => resetModal.element.style.display = 'none';
        resetModal.resetBtn.onclick = () => {
            resetState();
            resetModal.element.style.display = 'none';
        };
        resetModal.sampleBtn.onclick = () => {
            loadSampleData();
            resetModal.element.style.display = 'none';
        };

        verifyModal.closeBtn.onclick = () => verifyModal.element.style.display = 'none';
        verifyModal.sendBtn.onclick = () => {
            sendBaleSMS();
            verifyModal.element.style.display = 'none';
        };

        cardControls.backToScoringBtn.onclick = () => {
            state.currentView = 'scoring';
            renderView();
        };
        cardControls.verifySendBtn.onclick = renderVerifyModal;

        document.getElementById('prev-archer-btn').onclick = () => navigateArchers(-1);
        document.getElementById('next-archer-btn').onclick = () => navigateArchers(1);

        document.body.addEventListener('focusin', (e) => {
            if (e.target.classList.contains('score-input')) {
                keypad.currentlyFocusedInput = e.target;
                keypad.element.style.display = 'grid';
                document.body.classList.add('keypad-visible');
            }
        });

        document.body.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-card-btn')) {
                state.currentView = 'card';
                state.activeArcherId = e.target.dataset.archerId;
                renderCardView(state.activeArcherId);
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
    }

    function loadSampleData() {
        state.archers = [
            { id: '1', firstName: 'Mike', lastName: 'A.', school: 'WDV', level: 'V', gender: 'M', scores: [['10','9','7'], ['8','6','M'], ['5','4','3'], ['10','9','7'], ['X','10','8'], ['X','X','X'],['9','9','8'], ['10','X','X'], ['7','6','5'], ['X','X','9'], ['10','10','10'], ['8','8','7']] },
            { id: '2', firstName: 'Robert', lastName: 'B.', school: 'WDV', level: 'V', gender: 'M', scores: [['X','9','9'], ['8','8','7'], ['5','5','5'], ['6','6','7'], ['8','9','10'], ['7','7','6'],['10','9','9'], ['X','X','8'], ['9','8','7'], ['6','5','M'], ['7','7','8'], ['9','9','10']] },
            { id: '3', firstName: 'Terry', lastName: 'C.', school: 'OPP', level: 'JV', gender: 'M', scores: [['X','7','7'], ['7','7','7'], ['10','7','10'], ['5','4','M'], ['8','7','6'], ['5','4','3'],['9','8','X'], ['10','7','6'], ['9','9','9'], ['8','8','M'], ['7','6','X'], ['10','9','8']] },
            { id: '4', firstName: 'Susan', lastName: 'D.', school: 'OPP', level: 'V', gender: 'F', scores: [['9','9','8'], ['10','9','8'], ['X','9','8'], ['7','7','6'], ['10','10','9'], ['X','9','9'],['8','8','7'], ['9','9','9'], ['10','X','9'], ['8','7','6'], ['X','X','X'], ['9','9','8']] },
        ];
    }

    function navigateArchers(direction) {
        const currentArcherId = state.activeArcherId;
        const currentIndex = state.archers.findIndex(a => a.id == currentArcherId);
        if (currentIndex === -1) {
            console.error("Could not find active archer in state.");
            return;
        }
        let nextIndex = currentIndex + direction;
        if (nextIndex >= state.archers.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = state.archers.length - 1;
        const nextArcherId = state.archers[nextIndex].id;
        state.activeArcherId = nextArcherId;
        renderCardView(nextArcherId);
    }

    init();
});