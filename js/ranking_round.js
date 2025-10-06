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
        activeEventId: null, // Event ID if pre-assigned mode
        assignmentMode: 'manual', // 'manual' or 'pre-assigned'
        syncStatus: {}, // Track sync status per archer per end: { archerId: { endNumber: 'synced'|'pending'|'failed' } }
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
        exportBtn: document.getElementById('export-btn'),
        prevArcherBtn: document.getElementById('prev-archer-btn'),
        nextArcherBtn: document.getElementById('next-archer-btn'),
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
        
        // Pre-assigned mode: show read-only archer list
        if (state.assignmentMode === 'pre-assigned' && state.archers.length > 0) {
            renderPreAssignedArchers();
            return;
        }
        
        // Manual mode: show checkbox list
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

    function renderPreAssignedArchers() {
        if (!setupControls.container) return;
        
        const banner = document.createElement('div');
        banner.className = 'pre-assigned-banner';
        banner.style.cssText = 'background: #e3f2fd; padding: 12px; margin-bottom: 12px; border-radius: 4px; border-left: 4px solid #2196f3;';
        banner.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 4px;">📌 Pre-Assigned Bale</div>
            <div style="font-size: 0.9em;">Bale ${state.baleNumber} - ${state.divisionName || 'Division'}</div>
            <div style="font-size: 0.85em; color: #666; margin-top: 4px;">These archers are pre-assigned by your coach</div>
        `;
        setupControls.container.appendChild(banner);
        
        const listDiv = document.createElement('div');
        listDiv.className = 'archer-select-list';
        listDiv.style.cssText = 'background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px;';
        
        state.archers.forEach(archer => {
            const row = document.createElement('div');
            row.className = 'archer-select-row';
            row.style.cssText = 'padding: 12px; border-bottom: 1px solid #ddd; background: white; margin: 4px; border-radius: 4px;';
            
            row.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: bold;">${archer.targetAssignment}: ${archer.firstName} ${archer.lastName}</div>
                        <div style="font-size: 0.85em; color: #666;">${archer.school} • ${archer.level} / ${archer.gender}</div>
                    </div>
                    <div style="padding: 4px 8px; background: #4caf50; color: white; border-radius: 12px; font-size: 0.75em; font-weight: bold;">
                        ASSIGNED
                    </div>
                </div>
            `;
            
            listDiv.appendChild(row);
        });
        
        setupControls.container.appendChild(listDiv);
        
        // Add switch to manual mode button
        const manualBtn = document.createElement('button');
        manualBtn.className = 'btn btn-secondary';
        manualBtn.textContent = 'Switch to Manual Mode';
        manualBtn.style.cssText = 'margin-top: 12px; width: 100%;';
        manualBtn.onclick = () => {
            if (confirm('Switch to manual mode? This will clear pre-assigned archers.')) {
                state.assignmentMode = 'manual';
                state.activeEventId = null;
                state.archers = [];
                saveData();
                renderSetupForm();
            }
        };
        setupControls.container.appendChild(manualBtn);
    }

    function renderArcherSelectList(masterList, filter = '') {
        if (!setupControls.container) return;
        setupControls.container.innerHTML = '';
        const listDiv = document.createElement('div');
        listDiv.className = 'archer-select-list';
        setupControls.container.appendChild(listDiv);
        
        // Group archers by bale if they have bale assignments
        const baleGroups = {};
        const unassigned = [];
        
        masterList.forEach(archer => {
            if (archer.bale) {
                if (!baleGroups[archer.bale]) baleGroups[archer.bale] = [];
                baleGroups[archer.bale].push(archer);
            } else {
                unassigned.push(archer);
            }
        });
        
        // Filter logic
        const filteredBaleGroups = {};
        Object.keys(baleGroups).forEach(bale => {
            const filtered = baleGroups[bale].filter(archer => {
                const name = `${archer.first} ${archer.last}`.toLowerCase();
                return name.includes(filter.toLowerCase());
            });
            if (filtered.length > 0) {
                filteredBaleGroups[bale] = filtered;
            }
        });
        
        const filteredUnassigned = unassigned.filter(archer => {
            const name = `${archer.first} ${archer.last}`.toLowerCase();
            return name.includes(filter.toLowerCase());
        });
        
        // Render bale groups first
        const sortedBales = Object.keys(filteredBaleGroups).sort((a, b) => parseInt(a) - parseInt(b));
        
        sortedBales.forEach(bale => {
            const baleHeader = document.createElement('div');
            baleHeader.className = 'list-header';
            baleHeader.textContent = `Bale ${bale}`;
            baleHeader.style.cssText = 'background: #e3f2fd; color: #1976d2; font-weight: bold; cursor: pointer;';
            baleHeader.title = 'Click to load this entire bale';
            
            baleHeader.onclick = () => {
                loadEntireBale(bale, filteredBaleGroups[bale]);
            };
            
            listDiv.appendChild(baleHeader);
            
            filteredBaleGroups[bale].forEach((archer) => {
                const row = document.createElement('div');
                row.className = 'archer-select-row';
                row.style.cssText = 'cursor: pointer; padding-left: 20px;';
                
                row.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span style="font-weight: bold;">${archer.first} ${archer.last}</span>
                            <span style="font-size: 0.85em; color: #666; margin-left: 8px;">(${archer.level || 'VAR'})</span>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <span style="background: #4caf50; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75em; font-weight: bold;">Bale ${archer.bale}</span>
                            <span style="background: #2196f3; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75em; font-weight: bold;">Target ${archer.target || 'A'}</span>
                        </div>
                    </div>
                `;
                
                row.onclick = () => {
                    loadEntireBale(bale, filteredBaleGroups[bale]);
                };
                
                listDiv.appendChild(row);
            });
        });
        
        // Render unassigned archers (old manual selection mode)
        if (filteredUnassigned.length > 0) {
            const unassignedHeader = document.createElement('div');
            unassignedHeader.className = 'list-header';
            unassignedHeader.textContent = '☆ Unassigned Archers (Manual Selection)';
            listDiv.appendChild(unassignedHeader);
            
            filteredUnassigned.forEach((archer) => {
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
                        const selectedCount = state.archers.length;
                        if (selectedCount >= 4) {
                            checkbox.checked = false;
                            alert('Bale is full (4 archers).');
                            return;
                        }
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
                                targetSize: (archer.level === 'VAR' || archer.level === 'V' || archer.level === 'Varsity') ? 122 : 80,
                                scores: Array(state.totalEnds).fill(null).map(() => ['', '', ''])
                            });
                        }
                    } else {
                        state.archers = state.archers.filter(a => a.id !== uniqueId);
                    }
                    saveData();
                    const chip = document.getElementById('selected-count-chip');
                    if (chip) chip.textContent = `${state.archers.length}/4`;
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
    }
    
    // Function to load entire bale when clicking on any archer
    function loadEntireBale(baleNumber, archersInBale) {
        // Clear existing archers
        state.archers = [];
        state.baleNumber = parseInt(baleNumber);
        
        // Add all archers from this bale
        const targets = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        archersInBale.forEach((archer, index) => {
            const uniqueId = `${archer.first.trim()}-${archer.last.trim()}`;
            state.archers.push({
                id: uniqueId,
                firstName: archer.first,
                lastName: archer.last,
                school: archer.school || '',
                level: archer.level || '',
                gender: archer.gender || '',
                targetAssignment: archer.target || targets[index],
                targetSize: (archer.level === 'VAR' || archer.level === 'V' || archer.level === 'Varsity') ? 122 : 80,
                scores: Array(state.totalEnds).fill(null).map(() => ['', '', ''])
            });
        });
        
        saveData();
        renderSetupForm();
        
        // Scroll to the top to show the selected archers
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderScoringView() {
        if (!scoringControls.container) return;
        scoringControls.currentEndDisplay.textContent = `Bale ${state.baleNumber} - End ${state.currentEnd}`;
        
        // Check if Live Updates is enabled to show sync column
        let isLiveEnabled = false;
        try { isLiveEnabled = !!(JSON.parse(localStorage.getItem('live_updates_config')||'{}').enabled); } catch(_) {}
        
        let tableHTML = `
            <table class="score-table">
                <thead>
                    <tr>
                        <th>Archer</th>
                        <th>A1</th><th>A2</th><th>A3</th>
                        <th>10s</th><th>X</th><th>End</th><th>Run</th><th>Avg</th>${isLiveEnabled ? '<th style="width: 30px;">⟳</th>' : ''}<th>Card</th>
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
            
            // Get sync status for this archer/end
            const syncStatus = (state.syncStatus[archer.id] && state.syncStatus[archer.id][state.currentEnd]) || '';
            const syncIcon = getSyncStatusIcon(syncStatus);
            
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
                    <td class="calculated-cell ${avgClass}">${endAvg}</td>${isLiveEnabled ? `<td class="sync-status-indicator sync-status-${syncStatus}" style="text-align: center;">${syncIcon}</td>` : ''}<td><button class="btn view-card-btn" data-archer-id="${archer.id}">»</button></td>
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

            // Live Updates: best-effort post of current end state
            try {
                let isEnabled = false;
                try { isEnabled = !!(JSON.parse(localStorage.getItem('live_updates_config')||'{}').enabled); } catch(_) {}
                if (isEnabled && typeof LiveUpdates !== 'undefined') {
                    const endScores = archer.scores[state.currentEnd - 1];
                    const [a1,a2,a3] = [endScores[0]||'', endScores[1]||'', endScores[2]||''];
                    let endTotal = 0, tens = 0, xs = 0, running = 0;
                    const add = (s) => { const u = String(s).toUpperCase(); if (!u) return; if (u==='X') { endTotal+=10; running+=10; xs++; tens++; } else if (u==='10') { endTotal+=10; running+=10; tens++; } else if (/^[0-9]$|^10$/.test(u)) { const n=parseInt(u,10); endTotal+=n; running+=n; } };
                    [a1,a2,a3].forEach(add);
                    archer.scores.forEach(end => { if (Array.isArray(end)) end.forEach(add); });
                    
                    // Debug logging
                    console.log('Live update attempt:', { 
                        enabled: isEnabled, 
                        hasLiveUpdates: !!LiveUpdates, 
                        hasState: !!LiveUpdates._state, 
                        roundId: LiveUpdates._state?.roundId,
                        archerId: archer.id,
                        endNumber: state.currentEnd,
                        scores: { a1, a2, a3, endTotal, runningTotal: running, tens, xs }
                    });
                    
                    // Set sync status to pending
                    updateSyncStatus(archer.id, state.currentEnd, 'pending');
                    
                    if (LiveUpdates._state && LiveUpdates._state.roundId) {
                        LiveUpdates.postEnd(archer.id, state.currentEnd, { a1, a2, a3, endTotal, runningTotal: running, tens, xs })
                          .then(() => updateSyncStatus(archer.id, state.currentEnd, 'synced'))
                          .catch(() => updateSyncStatus(archer.id, state.currentEnd, 'failed'));
                    } else {
                        const badge = document.getElementById('live-status-badge');
                        if (badge) { badge.textContent = 'Not Synced'; badge.className = 'status-badge status-pending'; }
                        LiveUpdates.ensureRound({ roundType: 'R360', date: new Date().toISOString().slice(0, 10), baleNumber: state.baleNumber })
                          .then(() => LiveUpdates.ensureArcher(archer.id, { ...archer, targetSize: archer.targetSize || ((archer.level === 'VAR' || archer.level === 'V' || archer.level === 'Varsity') ? 122 : 80) }))
                          .then(() => LiveUpdates.postEnd(archer.id, state.currentEnd, { a1, a2, a3, endTotal, runningTotal: running, tens, xs }))
                          .then(() => updateSyncStatus(archer.id, state.currentEnd, 'synced'))
                          .catch(err => {
                            console.error('Live init/post failed:', err);
                            updateSyncStatus(archer.id, state.currentEnd, 'failed');
                          });
                    }
                }
            } catch (e) { 
                console.error('Live update error:', e);
                updateSyncStatus(archer.id, state.currentEnd, 'failed');
            }
        }
    }

    function updateSyncStatus(archerId, endNumber, status) {
        if (!state.syncStatus[archerId]) {
            state.syncStatus[archerId] = {};
        }
        state.syncStatus[archerId][endNumber] = status;
        
        // Update UI indicator if visible
        const row = document.querySelector(`tr[data-archer-id="${archerId}"]`);
        if (row) {
            const statusCell = row.querySelector('.sync-status-indicator');
            if (statusCell) {
                const icon = getSyncStatusIcon(status);
                statusCell.innerHTML = icon;
                statusCell.className = `sync-status-indicator sync-status-${status}`;
            }
        }
        
        saveData();
    }

    function getSyncStatusIcon(status) {
        const icons = {
            'synced': '<span style="color: #4caf50; font-size: 0.9em;" title="Synced">✓</span>',
            'pending': '<span style="color: #ff9800; font-size: 0.9em;" title="Pending">⟳</span>',
            'failed': '<span style="color: #f44336; font-size: 0.9em;" title="Failed">✗</span>'
        };
        return icons[status] || '';
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

    // Load event information for display
    async function loadEventInfo() {
        // Check if authenticated before making API calls
        if (!window.LiveUpdates || !LiveUpdates._state || !LiveUpdates._state.apiKey) {
            console.log('Event info requires authentication (not configured for archers)');
            const eventSelector = document.getElementById('event-selector');
            if (eventSelector) {
                eventSelector.innerHTML = '<option value="">Manual Mode - Use Archer Setup</option>';
                eventSelector.disabled = true;
            }
            return;
        }
        
        try {
            const today = new Date().toISOString().slice(0, 10);
            
            // Use LiveUpdates.request to automatically handle API key
            const data = await LiveUpdates.request('/events/recent');
            
            if (data.events && data.events.length > 0) {
                // Find today's event
                const todayEvent = data.events.find(ev => ev.date === today);
                if (todayEvent) {
                    const eventNameEl = document.getElementById('event-name');
                    const baleDisplayEl = document.getElementById('current-bale-display');
                    
                    if (eventNameEl) eventNameEl.textContent = todayEvent.name;
                    if (baleDisplayEl) baleDisplayEl.textContent = state.baleNumber;
                    
                    // Try to load pre-assigned bale
                    await loadPreAssignedBale(todayEvent.id);
                }
            }
        } catch (e) {
            console.log('Could not load event info:', e.message);
            // Silent fail - archers use manual mode
        }
    }

    // Check if this bale has pre-assigned archers from an event
    async function loadPreAssignedBale(eventId, baleNumber = null) {
        try {
            const snapshot = await LiveUpdates.request(`/events/${eventId}/snapshot`);
            
            if (!snapshot || !snapshot.divisions) {
                console.log('No divisions found in event snapshot');
                return;
            }
            
            // Use provided bale number or current state bale
            const targetBale = baleNumber !== null ? baleNumber : state.baleNumber;
            
            // Search all divisions for archers assigned to our bale number
            let foundArchers = [];
            let divisionName = '';
            
            for (const [divCode, divData] of Object.entries(snapshot.divisions)) {
                if (divData.archers && divData.archers.length > 0) {
                    const baleArchers = divData.archers.filter(a => a.bale === targetBale);
                    if (baleArchers.length > 0) {
                        foundArchers = baleArchers;
                        divisionName = getDivisionDisplayName(divCode);
                        break;
                    }
                }
            }
            
            if (foundArchers.length > 0) {
                // Convert to our state format
                state.archers = foundArchers.map(a => ({
                    id: a.roundArcherId,
                    firstName: a.archerName.split(' ')[0] || '',
                    lastName: a.archerName.split(' ').slice(1).join(' ') || '',
                    school: a.school || '',
                    level: a.level || 'VAR',
                    gender: a.gender || 'M',
                    targetAssignment: a.target || 'A',
                    targetSize: (a.level === 'VAR' || a.level === 'V' || a.level === 'Varsity') ? 122 : 80,
                    scores: Array(state.totalEnds).fill(null).map(() => ['', '', ''])
                }));
                
                state.activeEventId = eventId;
                state.assignmentMode = 'pre-assigned';
                state.divisionName = divisionName;
                
                console.log(`Pre-assigned mode: ${foundArchers.length} archers on bale ${state.baleNumber} (${divisionName})`);
                saveData();
                renderSetupForm();
            }
        } catch (e) {
            console.log('Could not load pre-assigned bale:', e.message);
        }
    }

    function getDivisionDisplayName(code) {
        const names = {
            'BVAR': 'Boys Varsity',
            'GVAR': 'Girls Varsity',
            'BJV': 'Boys JV',
            'GJV': 'Girls JV'
        };
        return names[code] || code;
    }

    async function performMasterSync() {
        if (!window.LiveUpdates || !LiveUpdates._state) {
            alert('Live Updates not initialized');
            return;
        }
        
        const btn = document.getElementById('master-sync-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Syncing...';
        }
        
        let totalAttempts = 0;
        let successCount = 0;
        let failCount = 0;
        
        // Ensure round exists first
        try {
            if (!LiveUpdates._state.roundId) {
                await LiveUpdates.ensureRound({ 
                    roundType: 'R360', 
                    date: new Date().toISOString().slice(0, 10), 
                    baleNumber: state.baleNumber 
                });
            }
            
            // Ensure all archers exist
            for (const archer of state.archers) {
                if (!LiveUpdates._state.archerIds[archer.id]) {
                    await LiveUpdates.ensureArcher(archer.id, {
                        ...archer,
                        targetSize: archer.targetSize || ((archer.level === 'VAR' || archer.level === 'V' || archer.level === 'Varsity') ? 122 : 80)
                    });
                }
            }
            
            // Sync all ends for all archers
            for (const archer of state.archers) {
                for (let endNum = 1; endNum <= state.totalEnds; endNum++) {
                    const endScores = archer.scores[endNum - 1];
                    if (!endScores || !Array.isArray(endScores)) continue;
                    
                    // Only sync if end has at least one score
                    const hasScores = endScores.some(s => s !== '' && s !== null);
                    if (!hasScores) continue;
                    
                    // Check sync status - sync if pending, failed, or never synced
                    const currentStatus = (state.syncStatus[archer.id] && state.syncStatus[archer.id][endNum]) || '';
                    if (currentStatus === 'synced') continue; // Skip already synced
                    
                    totalAttempts++;
                    const [a1, a2, a3] = [endScores[0] || '', endScores[1] || '', endScores[2] || ''];
                    let endTotal = 0, tens = 0, xs = 0, running = 0;
                    const add = (s) => { 
                        const u = String(s).toUpperCase(); 
                        if (!u) return; 
                        if (u === 'X') { endTotal += 10; running += 10; xs++; tens++; } 
                        else if (u === '10') { endTotal += 10; running += 10; tens++; } 
                        else if (/^[0-9]$|^10$/.test(u)) { const n = parseInt(u, 10); endTotal += n; running += n; }
                    };
                    [a1, a2, a3].forEach(add);
                    
                    // Calculate running total up to this end
                    for (let i = 0; i < endNum; i++) {
                        if (archer.scores[i] && Array.isArray(archer.scores[i])) {
                            archer.scores[i].forEach(add);
                        }
                    }
                    
                    try {
                        updateSyncStatus(archer.id, endNum, 'pending');
                        await LiveUpdates.postEnd(archer.id, endNum, { 
                            a1, a2, a3, endTotal, runningTotal: running, tens, xs 
                        });
                        updateSyncStatus(archer.id, endNum, 'synced');
                        successCount++;
                    } catch (e) {
                        console.error(`Failed to sync archer ${archer.id} end ${endNum}:`, e);
                        updateSyncStatus(archer.id, endNum, 'failed');
                        failCount++;
                    }
                }
            }
            
            const message = `Master Sync Complete!\n\nAttempted: ${totalAttempts}\nSucceeded: ${successCount}\nFailed: ${failCount}`;
            alert(message);
            
        } catch (e) {
            console.error('Master sync error:', e);
            alert('Master Sync failed: ' + e.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Master Sync';
            }
        }
    }

    function init() {
        console.log("Initializing Ranking Round App...");
        loadData();
        renderKeypad();
        renderView();
        loadEventInfo();

        const baleNumberInput = document.getElementById('bale-number-input');
        if (baleNumberInput) {
            baleNumberInput.value = state.baleNumber;
            baleNumberInput.onchange = async () => {
                const newBale = parseInt(baleNumberInput.value, 10) || 1;
                state.baleNumber = newBale;
                saveData();
                
                // If event is selected and authenticated, try to load archers for this bale
                if (state.selectedEventId && window.LiveUpdates && LiveUpdates._state && LiveUpdates._state.apiKey) {
                    try {
                        await loadPreAssignedBale(state.selectedEventId, newBale);
                    } catch (err) {
                        console.log('Could not load bale:', err.message);
                    }
                }
            };
        }

        const eventSelector = document.getElementById('event-selector');
        if (eventSelector) {
            eventSelector.onchange = async () => {
                state.selectedEventId = eventSelector.value || null;
                saveData();
                
                // Load archers from this event (requires authentication)
                if (state.selectedEventId && window.LiveUpdates && LiveUpdates._state && LiveUpdates._state.apiKey) {
                    try {
                        // Load all archers from this event to show in the list
                        const snapshot = await LiveUpdates.request(`/events/${state.selectedEventId}/snapshot`);
                        
                        if (!snapshot || !snapshot.divisions) {
                            console.log('No divisions found in event snapshot');
                            return;
                        }
                        
                        // Extract archers from all divisions
                        const allArchers = [];
                        Object.keys(snapshot.divisions || {}).forEach(divKey => {
                            const div = snapshot.divisions[divKey];
                            (div.archers || []).forEach(archer => {
                                allArchers.push({
                                    first: archer.first_name,
                                    last: archer.last_name,
                                    school: archer.school,
                                    level: archer.level,
                                    gender: archer.gender,
                                    bale: archer.bale,
                                    target: archer.target,
                                    fave: false
                                });
                            });
                        });
                        
                        // Save to localStorage as master list
                        localStorage.setItem('archery_master_list', JSON.stringify(allArchers));
                        renderSetupForm();
                    } catch (err) {
                        console.log('Could not load event archers:', err.message);
                        // Silently fail if not authenticated
                    }
                } else if (state.selectedEventId) {
                    console.log('Event selector requires authentication (API key not configured)');
                }
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
            refreshBtn.onclick = async () => { await ArcherModule.loadDefaultCSVIfNeeded(true); renderSetupForm(); };
            const selectedChip = document.createElement('span');
            selectedChip.id = 'selected-count-chip';
            selectedChip.className = 'btn';
            selectedChip.style.cursor = 'default';
            selectedChip.textContent = `${state.archers.length}/4`;
            const syncBtn = document.createElement('button');
            syncBtn.id = 'sync-db-btn';
            syncBtn.className = 'btn btn-secondary';
            syncBtn.textContent = 'Sync to DB';
            syncBtn.onclick = async () => {
                try {
                    const result = await ArcherModule.bulkUpsertMasterList();
                    alert(`Synced to DB: ${result.upserted || 0} (created ${result.created || 0}, updated ${result.updated || 0})`);
                } catch (e) {
                    alert('Sync failed: ' + e.message);
                }
            };
            const liveBtn = document.createElement('button');
            liveBtn.id = 'live-toggle-btn';
            liveBtn.className = 'btn btn-secondary';
            const getLiveEnabled = () => { try { return !!(JSON.parse(localStorage.getItem('live_updates_config')||'{}').enabled); } catch(_) { return false; } };
            const setLiveEnabled = (v) => { try { if (window.LiveUpdates && LiveUpdates.saveConfig) LiveUpdates.saveConfig({ enabled: !!v }); else localStorage.setItem('live_updates_config', JSON.stringify({ enabled: !!v })); } catch(_) {} };
            const renderLiveBtn = () => { const on = getLiveEnabled(); liveBtn.textContent = on ? 'Live: On' : 'Live: Off'; liveBtn.className = on ? 'btn btn-success' : 'btn btn-secondary'; };
            renderLiveBtn();
            
            const masterSyncBtn = document.createElement('button');
            masterSyncBtn.id = 'master-sync-btn';
            masterSyncBtn.className = 'btn btn-warning';
            masterSyncBtn.textContent = 'Master Sync';
            masterSyncBtn.style.cssText = 'font-size: 0.9em;';
            masterSyncBtn.onclick = async () => {
                if (!getLiveEnabled()) {
                    alert('Enable Live Updates first to sync scores.');
                    return;
                }
                await performMasterSync();
            };
            const initLiveRoundAndArchers = () => {
                try {
                    let isEnabled = getLiveEnabled();
                    if (!isEnabled || !window.LiveUpdates || !LiveUpdates.setConfig) return;
                    const cfg = window.LIVE_UPDATES || {};
                    LiveUpdates.setConfig({ apiBase: cfg.apiBase || 'https://tryentist.com/wdv/api/v1' });
                    if (!LiveUpdates._state.roundId) {
                        LiveUpdates.ensureRound({ roundType: 'R360', date: new Date().toISOString().slice(0, 10), baleNumber: state.baleNumber })
                          .then(() => { state.archers.forEach(a => LiveUpdates.ensureArcher(a.id, a)); })
                          .catch(() => {});
                    } else {
                        state.archers.forEach(a => LiveUpdates.ensureArcher(a.id, a));
                    }
                    const badge = document.getElementById('live-status-badge');
                    if (badge) { badge.textContent = 'Not Synced'; badge.className = 'status-badge status-pending'; }
                } catch(_) {}
            };
            liveBtn.onclick = () => {
                if (!getLiveEnabled()) {
                    let key = (localStorage.getItem('coach_api_key')||'').trim();
                    if (!key) {
                        key = prompt('Enter coach passcode to enable Live Updates:','');
                        if (!key) return;
                        try { localStorage.setItem('coach_api_key', key); if (window.LiveUpdates && LiveUpdates.saveConfig) LiveUpdates.saveConfig({ apiKey: key }); } catch(_) {}
                    } else {
                        try { if (window.LiveUpdates && LiveUpdates.saveConfig) LiveUpdates.saveConfig({ apiKey: key }); } catch(_) {}
                    }
                }
                setLiveEnabled(!getLiveEnabled());
                renderLiveBtn();
                if (getLiveEnabled()) initLiveRoundAndArchers();
            };

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
            setupControls.subheader.appendChild(syncBtn);
            setupControls.subheader.appendChild(selectedChip);
            setupControls.subheader.appendChild(liveBtn);
            setupControls.subheader.appendChild(masterSyncBtn);
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
        if (cardControls.exportBtn) {
            cardControls.exportBtn.onclick = showExportModal;
        }

        // Prev/Next Archer cycling in card view
        if (cardControls.prevArcherBtn) {
            cardControls.prevArcherBtn.onclick = () => navigateArchers(-1);
        }
        if (cardControls.nextArcherBtn) {
            cardControls.nextArcherBtn.onclick = () => navigateArchers(1);
        }

        // Export modal button handlers
        const takeScreenshotBtn = document.getElementById('take-screenshot-btn');
        const downloadJsonBtn = document.getElementById('download-json-btn');
        const copyJsonBtn = document.getElementById('copy-json-btn');
        const emailCoachBtn = document.getElementById('email-coach-btn');
        const modalCloseExport = document.getElementById('modal-close-export');
        const openVerifyBtn = document.getElementById('open-verify-btn');

        if (takeScreenshotBtn) {
            takeScreenshotBtn.onclick = () => {
                takeScreenshot();
                hideExportModal();
            };
        }

        if (downloadJsonBtn) {
            downloadJsonBtn.onclick = () => {
                downloadJSON();
                hideExportModal();
            };
        }

        if (copyJsonBtn) {
            copyJsonBtn.onclick = () => {
                copyJSONToClipboard();
                hideExportModal();
            };
        }

        if (emailCoachBtn) {
            emailCoachBtn.onclick = () => {
                emailCoach();
                hideExportModal();
            };
        }

        if (openVerifyBtn) {
            openVerifyBtn.onclick = () => {
                hideExportModal();
                renderVerifyModal();
            };
        }

        if (modalCloseExport) {
            modalCloseExport.onclick = hideExportModal;
        }

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

        // --- Live Updates wiring (feature-flag) ---
        try {
            const cfg = window.LIVE_UPDATES || {};
            let isEnabled = false;
            try { isEnabled = !!(JSON.parse(localStorage.getItem('live_updates_config')||'{}').enabled); } catch(_) {}
            LiveUpdates.setConfig({ apiBase: cfg.apiBase || 'https://tryentist.com/wdv/api/v1', apiKey: cfg.apiKey || '' });

            const onStartScoring = () => {
                if (!LiveUpdates || !LiveUpdates._state || !LiveUpdates.setConfig) return;
                if (!LiveUpdates._state.roundId && isEnabled) {
                    LiveUpdates.ensureRound({
                        roundType: 'R360',
                        date: new Date().toISOString().slice(0, 10),
                        baleNumber: state.baleNumber,
                    }).then(() => {
                        state.archers.forEach(a => LiveUpdates.ensureArcher(a.id, a));
                    }).catch(() => {});
                } else if (isEnabled) {
                    state.archers.forEach(a => LiveUpdates.ensureArcher(a.id, a));
                }
            };

            const scoringBtn = document.getElementById('scoring-btn');
            if (scoringBtn) {
                const orig = scoringBtn.onclick;
                scoringBtn.onclick = (ev) => { if (orig) orig(ev); onStartScoring(); };
            } else {
                onStartScoring();
            }
            const badge = document.getElementById('live-status-badge');
            const liveOn = !!isEnabled;
            if (badge) {
                if (liveOn) { badge.textContent = 'Not Synced'; badge.className = 'status-badge status-pending'; }
                else { badge.textContent = 'Not Live Scoring'; badge.className = 'status-badge status-off'; }
            }
            window.addEventListener('liveSyncPending', (e) => {
                const id = e.detail.archerId;
                const row = document.querySelector(`tr[data-archer-id="${id}"]`);
                if (row) row.classList.add('sync-pending');
                const badge = document.getElementById('live-status-badge');
                if (badge) { badge.textContent = 'Not Synced'; badge.className = 'status-badge status-pending'; }
            });
            window.addEventListener('liveSyncSuccess', (e) => {
                const id = e.detail.archerId;
                const row = document.querySelector(`tr[data-archer-id="${id}"]`);
                if (row) { row.classList.remove('sync-pending'); row.classList.add('sync-ok'); setTimeout(()=>row.classList.remove('sync-ok'),1200); }
                const badge = document.getElementById('live-status-badge');
                if (badge) { badge.textContent = 'Synced'; badge.className = 'status-badge status-ok'; }
            });
        } catch (e) { /* noop */ }
    }

    function loadSampleData() {
        state.archers = [
            { id: '1', firstName: 'Mike', lastName: 'A.', school: 'WDV', level: 'V', gender: 'M', targetAssignment: 'A', targetSize: 122, scores: [['10','9','7'], ['8','6','M'], ['5','4','3'], ['10','9','7'], ['X','10','8'], ['X','X','X'],['9','9','8'], ['10','X','X'], ['7','6','5'], ['X','X','9'], ['10','10','10'], ['8','8','7']] },
            { id: '2', firstName: 'Robert', lastName: 'B.', school: 'WDV', level: 'V', gender: 'M', targetAssignment: 'B', targetSize: 122, scores: [['X','9','9'], ['8','8','7'], ['5','5','5'], ['6','6','7'], ['8','9','10'], ['7','7','6'],['10','9','9'], ['X','X','8'], ['9','8','7'], ['6','5','M'], ['7','7','8'], ['9','9','10']] },
            { id: '3', firstName: 'Terry', lastName: 'C.', school: 'OPP', level: 'JV', gender: 'M', targetAssignment: 'C', targetSize: 80, scores: [['X','7','7'], ['7','7','7'], ['10','7','10'], ['5','4','M'], ['8','7','6'], ['5','4','3'],['9','8','X'], ['10','7','6'], ['9','9','9'], ['8','8','M'], ['7','6','X'], ['10','9','8']] },
            { id: '4', firstName: 'Susan', lastName: 'D.', school: 'OPP', level: 'V', gender: 'F', targetAssignment: 'D', targetSize: 122, scores: [['9','9','8'], ['10','9','8'], ['X','9','8'], ['7','7','6'], ['10','10','9'], ['X','9','9'],['8','8','7'], ['9','9','9'], ['10','X','9'], ['8','7','6'], ['X','X','X'], ['9','9','8']] },
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

    // --- SCREENSHOT & EXPORT FUNCTIONS ---

    function takeScreenshot() {
        const cardContainer = document.getElementById('individual-card-container');
        if (!cardContainer) {
            alert('No scorecard to capture');
            return;
        }

        html2canvas(cardContainer, {
            scale: 2, // Higher resolution
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: cardContainer.offsetWidth,
            height: cardContainer.offsetHeight
        }).then(canvas => {
            // Create download link
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const archer = state.archers.find(a => a.id === state.activeArcherId);
            const filename = `scorecard_${archer?.firstName}_${archer?.lastName}_${timestamp}.png`;
            
            link.download = filename;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }).catch(error => {
            console.error('Screenshot failed:', error);
            alert('Failed to generate screenshot. Please try again.');
        });
    }

    function exportJSON() {
        const archer = state.archers.find(a => a.id === state.activeArcherId);
        if (!archer) {
            alert('No archer data to export');
            return;
        }

        const exportData = {
            metadata: {
                app: 'RankingRound',
                version: state.version,
                exportDate: new Date().toISOString(),
                baleNumber: state.baleNumber,
                totalEnds: state.totalEnds,
                date: state.date
            },
            archer: {
                id: archer.id,
                firstName: archer.firstName,
                lastName: archer.lastName,
                school: archer.school,
                level: archer.level,
                gender: archer.gender,
                targetAssignment: archer.targetAssignment,
                targetSize: archer.targetSize
            },
            scores: archer.scores,
            totals: calculateArcherTotals(archer)
        };

        return JSON.stringify(exportData, null, 2);
    }

    function downloadJSON() {
        const jsonData = exportJSON();
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const archer = state.archers.find(a => a.id === state.activeArcherId);
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `scorecard_${archer?.firstName}_${archer?.lastName}_${timestamp}.json`;
        
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
        const archer = state.archers.find(a => a.id === state.activeArcherId);
        const jsonData = exportJSON();
        const subject = `Scorecard - ${archer?.firstName} ${archer?.lastName} - Bale ${state.baleNumber}`;
        const body = `Please find attached the scorecard data for ${archer?.firstName} ${archer?.lastName}.\n\nBale: ${state.baleNumber}\nDate: ${state.date}\n\nJSON Data:\n${jsonData}`;
        
        window.location.href = `mailto:davinciarchers@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    function calculateArcherTotals(archer) {
        let totalScore = 0;
        let totalTens = 0;
        let totalXs = 0;
        let completedEnds = 0;

        archer.scores.forEach((endScores, endIndex) => {
            const isComplete = endScores.every(score => score !== '' && score !== null);
            if (isComplete) {
                completedEnds++;
                endScores.forEach(score => {
                    const scoreValue = parseScoreValue(score);
                    totalScore += scoreValue;
                    if (score === '10') totalTens++;
                    if (score.toUpperCase() === 'X') totalXs++;
                });
            }
        });

        return {
            totalScore,
            totalTens,
            totalXs,
            completedEnds,
            average: completedEnds > 0 ? (totalScore / (completedEnds * 3)).toFixed(1) : 0
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

    // Only initialize the app if we are on the ranking round page
    if (document.getElementById('bale-scoring-container')) {
        init();
    }
});