/**
 * js/ranking_round_300.js
 * 
 * 300 Round variant: 10 ends of 3 arrows. Bale-centric UI.
 */

document.addEventListener('DOMContentLoaded', () => {

    // API Configuration
    const API_BASE = 'https://tryentist.com/wdv/api/v1';

    // Check for URL parameters (event and code for QR code access)
    const urlParams = new URLSearchParams(window.location.search);
    const urlEventId = urlParams.get('event');
    const urlEntryCode = urlParams.get('code');

    // --- STATE MANAGEMENT ---
    const state = {
        app: 'RankingRound300',
        version: '1.0-300',
        currentView: 'setup', // 'setup', 'scoring', 'card'
        currentEnd: 1,
        totalEnds: 10, // 300 round: 10 ends of 3
        baleNumber: 1,
        date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        archers: [], // { id, firstName, lastName, school, level, gender, targetAssignment, targetSize, scores }
        activeArcherId: null, // For card view
        selectedEventId: null, // Selected event for this bale
        activeEventId: null, // Event ID if pre-assigned mode
        eventName: '',
        assignmentMode: 'manual', // 'manual' or 'pre-assigned'
        setupMode: 'manual', // 'manual' or 'pre-assigned' - determines which setup section to show
        syncStatus: {}, // Track sync status per archer per end: { archerId: { endNumber: 'synced'|'pending'|'failed' } }
        sortMode: 'bale' // 'bale' or 'name'
    };

    const sessionKey = `rankingRound300_${new Date().toISOString().split('T')[0]}`;

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

    const manualSetupControls = {
        section: document.getElementById('manual-setup-section'),
        baleInput: document.getElementById('bale-number-input-manual'),
        searchInput: document.getElementById('archer-search-manual'),
        selectedCountChip: document.getElementById('selected-count-chip'),
        selectedArchersDisplay: document.getElementById('selected-archers-display'),
        startScoringBtn: document.getElementById('manual-start-scoring-btn'),
    };

    const preassignedSetupControls = {
        section: document.getElementById('preassigned-setup-section'),
        baleListContainer: document.getElementById('bale-list-container'),
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
    let uiWired = false; // ensure click/input handlers survive reload/resume
    
    // --- VIEW MANAGEMENT ---
    function renderView() {
        Object.values(views).forEach(view => view.style.display = 'none');
        if (views[state.currentView]) {
            views[state.currentView].style.display = 'block';
        }
        updateEventHeader();
        if (state.currentView === 'scoring') {
            showScoringBanner();
        } else {
            hideScoringBanner();
        }
        if (state.currentView === 'setup') {
            renderSetupForm();
        } else if (state.currentView === 'scoring') {
            renderScoringView();
        }
    }

    function updateEventHeader() {
        const eventNameEl = document.getElementById('event-name');
        const baleDisplayEl = document.getElementById('current-bale-display');
        
        if (eventNameEl) {
            eventNameEl.textContent = state.eventName || 'No Event';
        }
        
        if (baleDisplayEl) {
            baleDisplayEl.textContent = state.baleNumber;
        }
    }

    function getOrCreateScoringBanner() {
        let banner = document.getElementById('scoring-indicator');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'scoring-indicator';
            banner.style.cssText = 'position: sticky; top: 0; z-index: 999; width: 100%; background:#198754; color:white; font-weight:700; text-align:center; padding:6px 8px;';
            const header = document.querySelector('.page-header');
            if (header && header.parentNode) {
                header.parentNode.insertBefore(banner, header.nextSibling);
            } else {
                document.body.prepend(banner);
            }
        }
        return banner;
    }

    function showScoringBanner() {
        const banner = getOrCreateScoringBanner();
        banner.style.display = 'block';
        banner.textContent = `SCORING IN PROGRESS • ${state.eventName || 'Event'} • Bale ${state.baleNumber} • End ${state.currentEnd} of ${state.totalEnds}`;
    }

    function hideScoringBanner() {
        const banner = document.getElementById('scoring-indicator');
        if (banner) banner.style.display = 'none';
    }

    // Ensure core UI handlers are always attached, even on resume after reload
    function wireCoreHandlers() {
        if (uiWired) return;
        uiWired = true;

        // End navigation
        if (scoringControls.prevEndBtn) scoringControls.prevEndBtn.onclick = () => changeEnd(-1);
        if (scoringControls.nextEndBtn) scoringControls.nextEndBtn.onclick = () => changeEnd(1);

        // Reset modal
        if (resetModal.cancelBtn) resetModal.cancelBtn.onclick = () => resetModal.element.style.display = 'none';
        if (resetModal.resetBtn) resetModal.resetBtn.onclick = () => { resetState(); resetModal.element.style.display = 'none'; };
        if (resetModal.sampleBtn) resetModal.sampleBtn.onclick = () => { loadSampleData(); resetModal.element.style.display = 'none'; };

        // Verify modal
        if (verifyModal.closeBtn) verifyModal.closeBtn.onclick = () => verifyModal.element.style.display = 'none';
        if (verifyModal.sendBtn) verifyModal.sendBtn.onclick = () => { sendBaleSMS(); verifyModal.element.style.display = 'none'; };

        // Card controls
        if (cardControls.backToScoringBtn) {
            cardControls.backToScoringBtn.textContent = 'Start Scoring';
            cardControls.backToScoringBtn.onclick = () => { state.currentView = 'scoring'; renderView(); };
        }
        if (cardControls.exportBtn) cardControls.exportBtn.onclick = showExportModal;
        if (cardControls.prevArcherBtn) cardControls.prevArcherBtn.onclick = () => navigateArchers(-1);
        if (cardControls.nextArcherBtn) cardControls.nextArcherBtn.onclick = () => navigateArchers(1);

        // Delegated handlers (robust across rerenders)
        document.body.addEventListener('click', (e) => {
            if (e.target.classList && e.target.classList.contains('view-card-btn')) {
                state.currentView = 'card';
                state.activeArcherId = e.target.dataset.archerId;
                renderCardView(state.activeArcherId);
                renderView();
                if (keypad.element) keypad.element.style.display = 'none';
            }
        });
        document.body.addEventListener('input', (e) => {
            if (e.target.classList && e.target.classList.contains('score-input')) {
                handleScoreInput(e);
            }
        });
        if (keypad.element) keypad.element.addEventListener('click', handleKeypadClick);
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
        updateEventHeader();
    }

    // --- LOGIC ---
    // Highlight a specific bale in the list
    function highlightBale(baleNum) {
        document.querySelectorAll('.list-header').forEach(el => {
            el.classList.remove('highlighted');
            el.style.background = '#e3f2fd';
        });
        const target = document.querySelector(`[data-bale="${baleNum}"]`);
        if (target) {
            target.classList.add('highlighted');
            target.style.background = '#f39c12';
            target.style.boxShadow = '0 0 0 3px rgba(243, 156, 18, 0.3)';
        }
    }
    
    // Scroll to a specific bale section
    function scrollToBale(baleNum) {
        const target = document.querySelector(`[data-bale="${baleNum}"]`);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    function determineSetupMode() {
        // If we have an active event with pre-assigned archers, use pre-assigned mode
        if (state.activeEventId && state.assignmentMode === 'pre-assigned' && state.archers.length > 0) {
            return 'pre-assigned';
        }
        // Otherwise, use manual mode
        return 'manual';
    }

    function renderSetupSections() {
        const setupMode = determineSetupMode();
        state.setupMode = setupMode;
        
        // Hide both sections first
        if (manualSetupControls.section) {
            manualSetupControls.section.style.display = 'none';
        }
        if (preassignedSetupControls.section) {
            preassignedSetupControls.section.style.display = 'none';
        }
        
        // Show the appropriate section
        if (setupMode === 'manual') {
            if (manualSetupControls.section) {
                manualSetupControls.section.style.display = 'block';
            }
            renderManualSetup();
        } else {
            if (preassignedSetupControls.section) {
                preassignedSetupControls.section.style.display = 'block';
            }
            renderPreassignedSetup();
        }
    }

    function renderManualSetup() {
        // Update bale input
        if (manualSetupControls.baleInput) {
            manualSetupControls.baleInput.value = state.baleNumber;
        }
        
        // Update selection count
        updateSelectionCount();
        
        // Render selected archers
        renderSelectedArchers();
        
        // Render archer list for selection
        renderManualArcherList();
    }

    function renderPreassignedSetup() {
        if (!preassignedSetupControls.baleListContainer) return;
        
        // Group archers by bale
        const baleGroups = {};
        state.archers.forEach(archer => {
            if (archer.baleNumber) {
                if (!baleGroups[archer.baleNumber]) {
                    baleGroups[archer.baleNumber] = [];
                }
                baleGroups[archer.baleNumber].push(archer);
            }
        });
        
        // Render bale list
        preassignedSetupControls.baleListContainer.innerHTML = '';
        
        const sortedBales = Object.keys(baleGroups).sort((a, b) => parseInt(a) - parseInt(b));
        
        sortedBales.forEach(baleNumber => {
            const archers = baleGroups[baleNumber];
            const baleItem = document.createElement('div');
            baleItem.className = 'bale-list-item';
            
            baleItem.innerHTML = `
                <div class="bale-info">
                    <div class="bale-number">Bale ${baleNumber}</div>
                    <div class="bale-archers">${archers.length} archers</div>
                </div>
                <div class="bale-actions">
                    <button class="btn btn-primary" onclick="loadEntireBale(${baleNumber}, ${JSON.stringify(archers).replace(/"/g, '&quot;')})">
                        Start Scoring
                    </button>
                </div>
            `;
            
            preassignedSetupControls.baleListContainer.appendChild(baleItem);
        });
    }

    function updateSelectionCount() {
        if (manualSetupControls.selectedCountChip) {
            const count = state.archers.length;
            manualSetupControls.selectedCountChip.textContent = `${count}/4 archers selected`;
            
            // Enable/disable start scoring button
            if (manualSetupControls.startScoringBtn) {
                manualSetupControls.startScoringBtn.disabled = count === 0;
            }
        }
    }

    function renderSelectedArchers() {
        if (!manualSetupControls.selectedArchersDisplay) return;
        
        if (state.archers.length === 0) {
            manualSetupControls.selectedArchersDisplay.innerHTML = '<div style="text-align: center; color: #666; padding: 1rem;">No archers selected</div>';
            return;
        }
        
        manualSetupControls.selectedArchersDisplay.innerHTML = '';
        
        state.archers.forEach(archer => {
            const archerItem = document.createElement('div');
            archerItem.className = 'selected-archer-item';
            
            archerItem.innerHTML = `
                <span class="selected-archer-name">${archer.firstName} ${archer.lastName}</span>
                <span class="selected-archer-target">${archer.targetAssignment}</span>
            `;
            
            manualSetupControls.selectedArchersDisplay.appendChild(archerItem);
        });
    }

    function renderManualArcherList() {
        if (!setupControls.container) return;
        setupControls.container.innerHTML = '';
        
        // Load master list
        let masterList = [];
        const eventArchers = localStorage.getItem('archery_master_list');
        if (eventArchers) {
            try {
                masterList = JSON.parse(eventArchers);
            } catch (e) {
                console.error('Failed to parse event archers:', e);
            }
        }
        
        if (masterList.length === 0 && typeof ArcherModule !== 'undefined') {
            masterList = ArcherModule.loadList();
        }
        
        if (masterList.length === 0) {
            setupControls.container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🎯</div>
                    <h3>No Archers Available</h3>
                    <p>Connect to an event to load archers.</p>
                </div>
            `;
            return;
        }
        
        // Filter by search term
        const searchTerm = manualSetupControls.searchInput ? manualSetupControls.searchInput.value.toLowerCase() : '';
        const filteredList = masterList.filter(archer => {
            if (!searchTerm) return true;
            const name = `${archer.first} ${archer.last}`.toLowerCase();
            const school = (archer.school || '').toLowerCase();
            return name.includes(searchTerm) || school.includes(searchTerm);
        });
        
        // Create table for archer selection
        const table = document.createElement('table');
        table.style.cssText = 'width: 100%; border-collapse: collapse; margin-top: 1rem;';
        
        // Header
        const headerRow = document.createElement('tr');
        headerRow.style.cssText = 'background: #f8f9fa; font-weight: bold;';
        
        const headers = ['Select', 'Archer Name', 'School', 'Division', 'Target'];
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            th.style.cssText = 'padding: 10px 8px; text-align: left; border-bottom: 1px solid #dee2e6;';
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);
        
        // Data rows
        filteredList.forEach((archer, index) => {
            const row = document.createElement('tr');
            row.style.cssText = `background: ${index % 2 === 0 ? 'white' : '#f8f9fa'};`;
            
            // Checkbox cell
            const checkboxCell = document.createElement('td');
            checkboxCell.style.cssText = 'padding: 10px 8px; border-bottom: 1px solid #e9ecef; text-align: center;';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.style.cssText = 'transform: scale(1.2);';
            
            const uniqueId = `${archer.first.trim()}-${archer.last.trim()}`;
            const existingArcher = state.archers.find(a => a.id === uniqueId);
            checkbox.checked = !!existingArcher;
            
            // Target select dropdown
            const targetSelect = document.createElement('select');
            targetSelect.className = 'target-assignment-select';
            targetSelect.style.cssText = 'display: none; margin-left: 8px; padding: 2px 4px; font-size: 0.9em;';
            ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(letter => {
                const option = document.createElement('option');
                option.value = letter;
                option.textContent = letter;
                targetSelect.appendChild(option);
            });
            if (existingArcher) {
                targetSelect.value = existingArcher.targetAssignment;
                targetSelect.style.display = 'inline-block';
            }
            
            checkbox.onchange = () => {
                if (checkbox.checked) {
                    // Enforce max 4 archers per bale
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
                        targetSelect.value = nextTarget;
                    }
                    targetSelect.style.display = 'inline-block';
                } else {
                    state.archers = state.archers.filter(a => a.id !== uniqueId);
                    targetSelect.style.display = 'none';
                }
                saveData();
                updateSelectionCount();
                renderSelectedArchers();
            };
            
            targetSelect.onchange = () => {
                const archerInState = state.archers.find(a => a.id === uniqueId);
                if (archerInState) {
                    archerInState.targetAssignment = targetSelect.value;
                    saveData();
                    renderSelectedArchers();
                }
            };
            
            checkboxCell.appendChild(checkbox);
            checkboxCell.appendChild(targetSelect);
            row.appendChild(checkboxCell);
            
            // Other data cells
            const cells = [
                `${archer.first} ${archer.last}`,
                archer.school || 'Unknown',
                archer.level || 'VAR',
                existingArcher ? existingArcher.targetAssignment : 'Unassigned'
            ];
            
            cells.forEach(cellText => {
                const td = document.createElement('td');
                td.textContent = cellText;
                td.style.cssText = 'padding: 10px 8px; border-bottom: 1px solid #e9ecef;';
                row.appendChild(td);
            });
            
            table.appendChild(row);
        });
        
        setupControls.container.appendChild(table);
    }

    function renderSetupForm() {
        // Use the new setup sections instead of the old logic
        renderSetupSections();
    }

    function renderPreAssignedArchers() {
        if (!setupControls.container) return;
        
        // Get search term from input
        const searchInput = setupControls.subheader?.querySelector('.archer-search-bar');
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        
        // Filter archers by current bale number and search term
        const baleArchers = state.archers.filter(archer => {
            const matchesBale = archer.baleNumber === state.baleNumber;
            if (!matchesBale) return false;
            
            if (!searchTerm) return true;
            
            const fullName = `${archer.firstName} ${archer.lastName}`.toLowerCase();
            const school = archer.school.toLowerCase();
            return fullName.includes(searchTerm) || school.includes(searchTerm);
        });
        
        const banner = document.createElement('div');
        banner.className = 'pre-assigned-banner';
        banner.style.cssText = 'background: #e3f2fd; padding: 12px; margin-bottom: 12px; border-radius: 4px; border-left: 4px solid #2196f3;';
        banner.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 4px;">📌 Pre-Assigned Bale</div>
            <div style="font-size: 0.9em;">Bale ${state.baleNumber} - ${state.divisionName || 'Division'}</div>
            <div style="font-size: 0.85em; color: #666; margin-top: 4px;">
                ${searchTerm ? `Showing ${baleArchers.length} archers matching "${searchTerm}"` : 'These archers are pre-assigned by your coach'}
            </div>
        `;
        setupControls.container.appendChild(banner);
        
        // Add "Edit Assignments" button
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-outline-primary';
        editBtn.style.cssText = 'margin-bottom: 12px; width: 100%;';
        editBtn.textContent = '✏️ Edit Assignments';
        editBtn.onclick = () => showEditAssignmentsModal();
        setupControls.container.appendChild(editBtn);
        
        // Create clean table interface
        const tableContainer = document.createElement('div');
        tableContainer.className = 'bale-assignment-table';
        tableContainer.style.cssText = 'background: white; border: 1px solid #ddd; border-radius: 4px; overflow: hidden;';
        
        // Create table
        const table = document.createElement('table');
        table.style.cssText = 'width: 100%; border-collapse: collapse;';
        
        // Create header row
        const headerRow = document.createElement('tr');
        headerRow.style.cssText = 'background: #2d7dd9; color: white; font-weight: bold;';
        
        const headers = ['Archer Name', 'School', 'Division', 'Bale', 'Target'];
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            th.style.cssText = 'padding: 12px 8px; text-align: left; border-right: 1px solid rgba(255,255,255,0.2);';
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);
        
        // Sort archers by first name for clean display
        const sortedArchers = [...baleArchers].sort((a, b) => {
            return a.firstName.localeCompare(b.firstName);
        });
        
        // Create data rows
        sortedArchers.forEach((archer, index) => {
            const row = document.createElement('tr');
            row.style.cssText = `background: ${index % 2 === 0 ? 'white' : '#f8f9fa'}; border-bottom: 1px solid #e9ecef;`;
            
            const cells = [
                `${archer.firstName} ${archer.lastName}`,
                archer.school || 'Unknown',
                archer.level || 'VAR',
                archer.baleNumber || '1',
                archer.targetAssignment || 'A'
            ];
            
            cells.forEach(cellText => {
                const td = document.createElement('td');
                td.textContent = cellText;
                td.style.cssText = 'padding: 12px 8px; border-right: 1px solid #e9ecef;';
                row.appendChild(td);
            });
            
            table.appendChild(row);
        });
        
        tableContainer.appendChild(table);
        setupControls.container.appendChild(tableContainer);
        
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

    function renderEmptyBaleState(baleNumber) {
        if (!setupControls.container) return;
        setupControls.container.innerHTML = '';
        
        const banner = document.createElement('div');
        banner.className = 'empty-bale-banner';
        banner.style.cssText = 'background: #fff3cd; padding: 12px; margin-bottom: 12px; border-radius: 4px; border-left: 4px solid #ffc107;';
        banner.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 4px;">⚠️ No Archers Assigned</div>
            <div style="font-size: 0.9em;">Bale ${baleNumber} has no archers assigned</div>
            <div style="font-size: 0.85em; color: #666; margin-top: 4px;">Try a different bale number or switch to manual mode</div>
        `;
        setupControls.container.appendChild(banner);
        
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
        
        // Add sort toggle buttons
        const sortContainer = document.createElement('div');
        sortContainer.style.cssText = 'display: flex; gap: 8px; margin-bottom: 12px;';
        
        const sortByBaleBtn = document.createElement('button');
        sortByBaleBtn.id = 'sort-by-bale-btn';
        sortByBaleBtn.className = state.sortMode === 'bale' ? 'btn btn-primary' : 'btn btn-outline-primary';
        sortByBaleBtn.textContent = 'Sort by Bale';
        sortByBaleBtn.onclick = () => {
            state.sortMode = 'bale';
            saveData();
            renderArcherSelectList(masterList, filter);
        };
        
        const sortByNameBtn = document.createElement('button');
        sortByNameBtn.id = 'sort-by-name-btn';
        sortByNameBtn.className = state.sortMode === 'name' ? 'btn btn-primary' : 'btn btn-outline-primary';
        sortByNameBtn.textContent = 'Sort by Name';
        sortByNameBtn.onclick = () => {
            state.sortMode = 'name';
            saveData();
            renderArcherSelectList(masterList, filter);
        };
        
        sortContainer.appendChild(sortByBaleBtn);
        sortContainer.appendChild(sortByNameBtn);
        setupControls.container.appendChild(sortContainer);
        
        // Filter archers based on search term
        const filteredList = masterList.filter(archer => {
            if (!filter) return true;
            const name = `${archer.first} ${archer.last}`.toLowerCase();
            const school = (archer.school || '').toLowerCase();
            return name.includes(filter.toLowerCase()) || school.includes(filter.toLowerCase());
        });
        
        if (state.sortMode === 'bale') {
            renderBaleView(filteredList);
        } else {
            renderNameView(filteredList);
        }
    }
    
    function renderBaleView(archerList) {
        // Group archers by bale
        const baleGroups = {};
        const unassigned = [];
        
        archerList.forEach(archer => {
            if (archer.bale) {
                if (!baleGroups[archer.bale]) baleGroups[archer.bale] = [];
                baleGroups[archer.bale].push(archer);
            } else {
                unassigned.push(archer);
            }
        });
        
        // Sort bales numerically
        const sortedBales = Object.keys(baleGroups).sort((a, b) => parseInt(a) - parseInt(b));
        
        sortedBales.forEach(bale => {
            // Create bale section
            const baleSection = document.createElement('div');
            baleSection.className = 'bale-section';
            baleSection.style.cssText = 'margin-bottom: 20px;';
            
            // Create bale header with Start Scoring button
            const baleHeader = document.createElement('div');
            baleHeader.style.cssText = `
                background: #2d7dd9; 
                color: white; 
                padding: 12px 16px; 
                border-radius: 4px 4px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            
            const baleTitle = document.createElement('div');
            baleTitle.style.cssText = 'font-weight: bold; font-size: 1.1em;';
            baleTitle.textContent = `🎯 Bale ${bale} • ${baleGroups[bale].length} archers`;
            
            const startScoringBtn = document.createElement('button');
            startScoringBtn.className = 'btn btn-success';
            startScoringBtn.textContent = 'Start Scoring';
            startScoringBtn.style.cssText = 'font-size: 0.9em; padding: 6px 12px;';
            startScoringBtn.onclick = () => {
                loadEntireBale(bale, baleGroups[bale]);
            };
            
            baleHeader.appendChild(baleTitle);
            baleHeader.appendChild(startScoringBtn);
            baleSection.appendChild(baleHeader);
            
            // Create table for this bale
            const tableContainer = document.createElement('div');
            tableContainer.style.cssText = 'background: white; border: 1px solid #ddd; border-top: none; border-radius: 0 0 4px 4px;';
            
            const table = document.createElement('table');
            table.style.cssText = 'width: 100%; border-collapse: collapse;';
            
            // Create header row
            const headerRow = document.createElement('tr');
            headerRow.style.cssText = 'background: #f8f9fa; font-weight: bold;';
            
            const headers = ['Archer Name', 'School', 'Division', 'Bale', 'Target'];
            headers.forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                th.style.cssText = 'padding: 10px 8px; text-align: left; border-bottom: 1px solid #dee2e6;';
                headerRow.appendChild(th);
            });
            table.appendChild(headerRow);
            
            // Sort archers within bale by first name
            const sortedArchers = [...baleGroups[bale]].sort((a, b) => a.first.localeCompare(b.first));
            
            // Create data rows
            sortedArchers.forEach((archer, index) => {
                const row = document.createElement('tr');
                row.style.cssText = `background: ${index % 2 === 0 ? 'white' : '#f8f9fa'};`;
                
                const cells = [
                    `${archer.first} ${archer.last}`,
                    archer.school || 'Unknown',
                    archer.level || 'VAR',
                    archer.bale || '1',
                    archer.target || 'A'
                ];
                
                cells.forEach(cellText => {
                    const td = document.createElement('td');
                    td.textContent = cellText;
                    td.style.cssText = 'padding: 10px 8px; border-bottom: 1px solid #e9ecef;';
                    row.appendChild(td);
                });
                
                table.appendChild(row);
            });
            
            tableContainer.appendChild(table);
            baleSection.appendChild(tableContainer);
            setupControls.container.appendChild(baleSection);
        });
        
        // Render unassigned archers if any
        if (unassigned.length > 0) {
            const unassignedSection = document.createElement('div');
            unassignedSection.style.cssText = 'margin-top: 20px;';
            
            const unassignedHeader = document.createElement('div');
            unassignedHeader.style.cssText = `
                background: #6c757d; 
                color: white; 
                padding: 12px 16px; 
                border-radius: 4px 4px 0 0;
                font-weight: bold;
            `;
            unassignedHeader.textContent = `☆ Unassigned Archers (${unassigned.length})`;
            unassignedSection.appendChild(unassignedHeader);
            
            // Create table for unassigned archers
            const tableContainer = document.createElement('div');
            tableContainer.style.cssText = 'background: white; border: 1px solid #ddd; border-top: none; border-radius: 0 0 4px 4px;';
            
            const table = document.createElement('table');
            table.style.cssText = 'width: 100%; border-collapse: collapse;';
            
            // Create header row
            const headerRow = document.createElement('tr');
            headerRow.style.cssText = 'background: #f8f9fa; font-weight: bold;';
            
            const headers = ['Archer Name', 'School', 'Division', 'Bale', 'Target'];
            headers.forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                th.style.cssText = 'padding: 10px 8px; text-align: left; border-bottom: 1px solid #dee2e6;';
                headerRow.appendChild(th);
            });
            table.appendChild(headerRow);
            
            // Sort unassigned archers by first name
            const sortedUnassigned = [...unassigned].sort((a, b) => a.first.localeCompare(b.first));
            
            // Create data rows for unassigned archers
            sortedUnassigned.forEach((archer, index) => {
                const row = document.createElement('tr');
                row.style.cssText = `background: ${index % 2 === 0 ? 'white' : '#f8f9fa'};`;
                
                const cells = [
                    `${archer.first} ${archer.last}`,
                    archer.school || 'Unknown',
                    archer.level || 'VAR',
                    'Unassigned',
                    'Unassigned'
                ];
                
                cells.forEach(cellText => {
                    const td = document.createElement('td');
                    td.textContent = cellText;
                    td.style.cssText = 'padding: 10px 8px; border-bottom: 1px solid #e9ecef;';
                    row.appendChild(td);
                });
                
                table.appendChild(row);
            });
            
            tableContainer.appendChild(table);
            unassignedSection.appendChild(tableContainer);
            setupControls.container.appendChild(unassignedSection);
        }
    }
    
    function renderNameView(archerList) {
        // Sort all archers by first name
        const sortedArchers = [...archerList].sort((a, b) => {
            if (a.first !== b.first) return a.first.localeCompare(b.first);
            return a.last.localeCompare(b.last);
        });
        
        // Group archers by assignment status
        const assignedArchers = sortedArchers.filter(archer => archer.bale);
        const unassignedArchers = sortedArchers.filter(archer => !archer.bale);
        
        // Show assigned archers first
        if (assignedArchers.length > 0) {
            const assignedSection = document.createElement('div');
            assignedSection.style.cssText = 'margin-bottom: 20px;';
            
            const assignedHeader = document.createElement('div');
            assignedHeader.style.cssText = `
                background: #28a745; 
                color: white; 
                padding: 12px 16px; 
                border-radius: 4px 4px 0 0;
                font-weight: bold;
            `;
            assignedHeader.textContent = `✅ Assigned Archers (${assignedArchers.length})`;
            assignedSection.appendChild(assignedHeader);
            
            const tableContainer = document.createElement('div');
            tableContainer.style.cssText = 'background: white; border: 1px solid #ddd; border-top: none; border-radius: 0 0 4px 4px;';
            
            const table = document.createElement('table');
            table.style.cssText = 'width: 100%; border-collapse: collapse;';
            
            // Create header row
            const headerRow = document.createElement('tr');
            headerRow.style.cssText = 'background: #f8f9fa; font-weight: bold;';
            
            const headers = ['Archer Name', 'School', 'Division', 'Bale', 'Target'];
            headers.forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                th.style.cssText = 'padding: 10px 8px; text-align: left; border-bottom: 1px solid #dee2e6;';
                headerRow.appendChild(th);
            });
            table.appendChild(headerRow);
            
            // Create data rows for assigned archers
            assignedArchers.forEach((archer, index) => {
                const row = document.createElement('tr');
                row.style.cssText = `background: ${index % 2 === 0 ? 'white' : '#f8f9fa'};`;
                
                const cells = [
                    `${archer.first} ${archer.last}`,
                    archer.school || 'Unknown',
                    archer.level || 'VAR',
                    archer.bale || '1',
                    archer.target || 'A'
                ];
                
                cells.forEach(cellText => {
                    const td = document.createElement('td');
                    td.textContent = cellText;
                    td.style.cssText = 'padding: 10px 8px; border-bottom: 1px solid #e9ecef;';
                    row.appendChild(td);
                });
                
                table.appendChild(row);
            });
            
            tableContainer.appendChild(table);
            assignedSection.appendChild(tableContainer);
            setupControls.container.appendChild(assignedSection);
        }
        
        // Show unassigned archers with manual selection capability
        if (unassignedArchers.length > 0) {
            const unassignedSection = document.createElement('div');
            unassignedSection.style.cssText = 'margin-top: 20px;';
            
            const unassignedHeader = document.createElement('div');
            unassignedHeader.style.cssText = `
                background: #6c757d; 
                color: white; 
                padding: 12px 16px; 
                border-radius: 4px 4px 0 0;
                font-weight: bold;
            `;
            unassignedHeader.textContent = `☆ Unassigned Archers (Manual Selection) - ${unassignedArchers.length}`;
            unassignedSection.appendChild(unassignedHeader);
            
            // Create table for unassigned archers with checkboxes
            const tableContainer = document.createElement('div');
            tableContainer.style.cssText = 'background: white; border: 1px solid #ddd; border-top: none; border-radius: 0 0 4px 4px;';
            
            const table = document.createElement('table');
            table.style.cssText = 'width: 100%; border-collapse: collapse;';
            
            // Create header row with checkbox column
            const headerRow = document.createElement('tr');
            headerRow.style.cssText = 'background: #f8f9fa; font-weight: bold;';
            
            const headers = ['Select', 'Archer Name', 'School', 'Division', 'Target'];
            headers.forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                th.style.cssText = 'padding: 10px 8px; text-align: left; border-bottom: 1px solid #dee2e6;';
                headerRow.appendChild(th);
            });
            table.appendChild(headerRow);
            
            // Create data rows for unassigned archers with checkboxes
            unassignedArchers.forEach((archer, index) => {
                const row = document.createElement('tr');
                row.style.cssText = `background: ${index % 2 === 0 ? 'white' : '#f8f9fa'};`;
                
                // Checkbox cell
                const checkboxCell = document.createElement('td');
                checkboxCell.style.cssText = 'padding: 10px 8px; border-bottom: 1px solid #e9ecef; text-align: center;';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.style.cssText = 'transform: scale(1.2);';
                
                const uniqueId = `${archer.first.trim()}-${archer.last.trim()}`;
                const existingArcher = state.archers.find(a => a.id === uniqueId);
                checkbox.checked = !!existingArcher;
                
                // Target select dropdown (hidden initially)
                const targetSelect = document.createElement('select');
                targetSelect.className = 'target-assignment-select';
                targetSelect.style.cssText = 'display: none; margin-left: 8px; padding: 2px 4px; font-size: 0.9em;';
                ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(letter => {
                    const option = document.createElement('option');
                    option.value = letter;
                    option.textContent = letter;
                    targetSelect.appendChild(option);
                });
                if (existingArcher) {
                    targetSelect.value = existingArcher.targetAssignment;
                    targetSelect.style.display = 'inline-block';
                }
                
                checkbox.onchange = () => {
                    if (checkbox.checked) {
                        // Enforce max 4 archers per bale
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
                            targetSelect.value = nextTarget;
                        }
                        targetSelect.style.display = 'inline-block';
                    } else {
                        state.archers = state.archers.filter(a => a.id !== uniqueId);
                        targetSelect.style.display = 'none';
                    }
                    saveData();
                    // Update selected count chip
                    const chip = document.getElementById('selected-count-chip');
                    if (chip) chip.textContent = `${state.archers.length}/4`;
                };
                
                targetSelect.onchange = () => {
                    const archerInState = state.archers.find(a => a.id === uniqueId);
                    if (archerInState) {
                        archerInState.targetAssignment = targetSelect.value;
                        saveData();
                    }
                };
                
                checkboxCell.appendChild(checkbox);
                checkboxCell.appendChild(targetSelect);
                row.appendChild(checkboxCell);
                
                // Other data cells
                const cells = [
                    `${archer.first} ${archer.last}`,
                    archer.school || 'Unknown',
                    archer.level || 'VAR',
                    'Unassigned'
                ];
                
                cells.forEach(cellText => {
                    const td = document.createElement('td');
                    td.textContent = cellText;
                    td.style.cssText = 'padding: 10px 8px; border-bottom: 1px solid #e9ecef;';
                    row.appendChild(td);
                });
                
                table.appendChild(row);
            });
            
            tableContainer.appendChild(table);
            unassignedSection.appendChild(tableContainer);
            setupControls.container.appendChild(unassignedSection);
        }
    }
    
    // Function to load entire bale when clicking on any archer
    window.loadEntireBale = function(baleNumber, archersInBale) {
        // Clear existing archers
        state.archers = [];
        state.baleNumber = parseInt(baleNumber);
        
        // Add all archers from this bale
        const targets = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        archersInBale.forEach((archer, index) => {
            const uniqueId = `${archer.firstName.trim()}-${archer.lastName.trim()}`;
            state.archers.push({
                id: uniqueId,
                firstName: archer.firstName,
                lastName: archer.lastName,
                school: archer.school || '',
                level: archer.level || '',
                gender: archer.gender || '',
                targetAssignment: archer.target || targets[index],
                targetSize: (archer.level === 'VAR' || archer.level === 'V' || archer.level === 'Varsity') ? 122 : 80,
                scores: Array(state.totalEnds).fill(null).map(() => ['', '', ''])
            });
        });
        
        // Set assignment mode to pre-assigned since we're loading a complete bale
        state.assignmentMode = 'pre-assigned';
        saveData();
        
        // Transition to scoring view
        state.currentView = 'scoring';
        renderView();
        
        // Scroll to the top to show the scoring interface
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
        
        // Update live status display and complete button after rendering
        updateLiveStatusDisplay();
        updateCompleteButton();
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
        if (!keypad.element) {
            console.error('Keypad element not found!');
            return;
        }
        
        // Ensure keypad has proper styling and is initially hidden
        keypad.element.style.display = 'none';
        keypad.element.className = 'keypad-container';
        
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
        
        console.log('Keypad rendered successfully');
    }

    function handleKeypadClick(e) {
        const button = e.target.closest('.keypad-btn');
        if (!button) return;
        
        console.log('Keypad button clicked:', button.dataset.value || button.dataset.action);
        
        if (!keypad.currentlyFocusedInput) {
            console.log('No focused input, ignoring keypad click');
            return;
        }
        
        const action = button.dataset.action;
        const value = button.dataset.value;
        const input = keypad.currentlyFocusedInput;
        const allInputs = Array.from(document.querySelectorAll('#scoring-view .score-input'));
        const currentIndex = allInputs.indexOf(input);
        
        // Navigation
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
            input.blur();
            return;
        }
        
        // Score entry
        if (action === 'clear') {
            input.value = '';
        } else if (value) {
            input.value = value;
        }
        
        // Trigger input event to update scores
        input.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Auto-advance to next input after score entry
        if (value && currentIndex < allInputs.length - 1) {
            const nextInputInOldList = allInputs[currentIndex + 1];
            const nextInputInNewDom = document.querySelector(`[data-archer-id="${nextInputInOldList.dataset.archerId}"][data-arrow-idx="${nextInputInOldList.dataset.arrowIdx}"]`);
            if (nextInputInNewDom) {
                setTimeout(() => nextInputInNewDom.focus(), 50);
            }
        } else if (action === 'clear') {
            const currentInputInNewDom = document.querySelector(`[data-archer-id="${input.dataset.archerId}"][data-arrow-idx="${input.dataset.arrowIdx}"]`);
            if (currentInputInNewDom) {
                setTimeout(() => {
                    currentInputInNewDom.focus();
                    currentInputInNewDom.select();
                }, 50);
            }
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
                    
                    // Check if Live Updates is properly initialized
                    if (!isLiveUpdatesReady()) {
                        console.log('Live Updates not ready - skipping sync');
                        return;
                    }
                    
                    if (LiveUpdates._state.roundId) {
                        // Round is initialized, sync directly
                        LiveUpdates.postEnd(archer.id, state.currentEnd, { a1, a2, a3, endTotal, runningTotal: running, tens, xs })
                          .then(() => updateSyncStatus(archer.id, state.currentEnd, 'synced'))
                          .catch(err => {
                            console.error('Sync failed:', err);
                            updateSyncStatus(archer.id, state.currentEnd, 'failed');
                          });
                    } else {
                        // Round not initialized, initialize first
                        console.log('Initializing Live Updates round...');
                        LiveUpdates.ensureRound({ roundType: 'R300', date: new Date().toISOString().slice(0, 10), baleNumber: state.baleNumber })
                          .then(() => {
                            console.log('Round initialized, ensuring archer...');
                            return LiveUpdates.ensureArcher(archer.id, archer);
                          })
                          .then(() => {
                            console.log('Archer ensured, posting end...');
                                return LiveUpdates.postEnd(archer.id, state.currentEnd, { a1, a2, a3, endTotal, runningTotal: running, tens, xs });
                            })
                          .then(() => {
                            console.log('End posted successfully');
                            updateSyncStatus(archer.id, state.currentEnd, 'synced');
                        })
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
        
        // Update complete button after score input
        updateCompleteButton();
    }

    function changeEnd(direction) {
        const newEnd = state.currentEnd + direction;
        if (newEnd > 0 && newEnd <= state.totalEnds) {
            state.currentEnd = newEnd;
            renderScoringView();
            saveData();
            updateCompleteButton();
            updateLiveStatusDisplay();
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
        updateCompleteButton();
        updateEventHeader();
        
        // Show scoring in progress banner
        showScoringBanner();
    }

    function syncCurrentEnd() {
        const currentEnd = state.currentEnd;
        const promises = [];
        
        // Sync all archers for the current end
        state.archers.forEach(archer => {
            const endScores = archer.scores[currentEnd - 1];
            if (!endScores || !endScores.some(score => score !== '' && score !== null)) {
                return; // Skip archers with no scores for this end
            }
            
            const [a1, a2, a3] = [endScores[0] || '', endScores[1] || '', endScores[2] || ''];
            let endTotal = 0, tens = 0, xs = 0, running = 0;
            
            // Calculate scores
            const add = (s) => { 
                const u = String(s).toUpperCase(); 
                if (!u) return; 
                if (u === 'X') { endTotal += 10; running += 10; xs++; tens++; } 
                else if (u === '10') { endTotal += 10; running += 10; tens++; } 
                else if (u === 'M') { running += 0; } 
                else { const n = parseInt(u); if (!isNaN(n)) { endTotal += n; running += n; } }
            };
            
            [a1, a2, a3].forEach(add);
            
            // Calculate running total
            for (let i = 0; i < currentEnd; i++) {
                const scores = archer.scores[i];
                if (scores) {
                    scores.forEach(s => {
                        const u = String(s).toUpperCase();
                        if (u === 'X') running += 10;
                        else if (u === '10') running += 10;
                        else if (u === 'M') running += 0;
                        else { const n = parseInt(u); if (!isNaN(n)) running += n; }
                    });
                }
            }
            
            // Set sync status to pending
            updateSyncStatus(archer.id, currentEnd, 'pending');
            
            // Sync to server
            if (!isLiveUpdatesReady()) {
                console.log('Live Updates not ready for archer:', archer.id);
                updateSyncStatus(archer.id, currentEnd, 'failed');
                return;
            }
            
            if (LiveUpdates._state.roundId) {
                // Round is initialized, sync directly
                const promise = LiveUpdates.postEnd(archer.id, currentEnd, { a1, a2, a3, endTotal, runningTotal: running, tens, xs })
                    .then(() => updateSyncStatus(archer.id, currentEnd, 'synced'))
                    .catch(err => {
                        console.error('Sync failed for archer:', archer.id, 'end:', currentEnd, err);
                        updateSyncStatus(archer.id, currentEnd, 'failed');
                    });
                promises.push(promise);
            } else {
                // Initialize round and archer first
                console.log('Initializing Live Updates round for sync...');
                const promise = LiveUpdates.ensureRound({ roundType: 'R300', date: new Date().toISOString().slice(0, 10), baleNumber: state.baleNumber })
                    .then(() => {
                        console.log('Round initialized, ensuring archer:', archer.id);
                        return LiveUpdates.ensureArcher(archer.id, archer);
                    })
                    .then(() => {
                        console.log('Archer ensured, posting end for:', archer.id);
                        return LiveUpdates.postEnd(archer.id, currentEnd, { a1, a2, a3, endTotal, runningTotal: running, tens, xs });
                    })
                    .then(() => {
                        console.log('End posted successfully for:', archer.id);
                        updateSyncStatus(archer.id, currentEnd, 'synced');
                    })
                    .catch(err => {
                        console.error('Sync failed for archer:', archer.id, 'end:', currentEnd, err);
                        updateSyncStatus(archer.id, currentEnd, 'failed');
                    });
                promises.push(promise);
            }
        });
        
        // Show progress
        const completeBtn = document.getElementById('complete-round-btn');
        if (completeBtn) {
            completeBtn.disabled = true;
            completeBtn.textContent = 'Syncing...';
        }
        
        // Wait for all syncs to complete
        Promise.allSettled(promises).then(() => {
            if (completeBtn) {
                completeBtn.disabled = false;
                completeBtn.textContent = 'Sync End';
            }
            updateCompleteButton();
            updateLiveStatusDisplay();
        });
    }

    function completeRound() {
        // Mark all archers as completed (10 ends)
        state.archers.forEach(archer => {
            if (archer.scores.length < 10) {
                // Fill remaining ends with 0s if needed
                while (archer.scores.length < 10) {
                    archer.scores.push([0, 0, 0]);
                }
            }
        });
        
        saveData();
        alert('Round completed! All archers have finished 10 ends.');
        updateCompleteButton();
    }

    function updateCompleteButton() {
        const completeBtn = document.getElementById('complete-round-btn');
        if (!completeBtn) return;
        
        const isLiveEnabled = getLiveEnabled();
        
        if (!isLiveEnabled) {
            // Live sync is off - show "Complete Round" for final verification
            const allComplete = state.archers.length > 0 && state.archers.every(archer => 
                archer.scores && archer.scores.length >= 10
            );
            
            if (allComplete) {
                completeBtn.style.display = 'inline-block';
                completeBtn.textContent = 'Complete Round';
                completeBtn.className = 'btn btn-primary';
            } else {
                completeBtn.style.display = 'none';
            }
        } else {
            // Live sync is on - show "Sync End" for current end
            const currentEndHasScores = state.archers.some(archer => {
                const endScores = archer.scores[state.currentEnd - 1];
                return endScores && endScores.some(score => score !== '' && score !== null);
            });
            
            if (currentEndHasScores) {
                completeBtn.style.display = 'inline-block';
                completeBtn.textContent = 'Sync End';
                completeBtn.className = 'btn btn-success';
            } else {
                completeBtn.style.display = 'none';
            }
        }
    }

    // Verify entry code and auto-load event
    async function verifyAndLoadEventByCode(eventId, entryCode) {
        try {
            console.log('Verifying entry code for event:', eventId);
            
            // Validate inputs
            if (!eventId || !entryCode) {
                console.error('Missing eventId or entryCode');
                return false;
            }
            
            const res = await fetch(`${API_BASE}/events/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId, entryCode })
            });
            
            if (!res.ok) {
                const errorText = await res.text();
                console.error('Verify failed:', res.status, errorText);
                return false;
            }
            
            const data = await res.json();
            console.log('Verify response:', data);
            
            if (!data.verified) {
                console.error('Entry code invalid:', data.error || 'Unknown error');
                return false;
            }
            
            // Success - load the event
            console.log('Entry code verified! Loading event:', data.event.name);
            state.selectedEventId = eventId;
            state.activeEventId = eventId;
            
            // Load event data and show archer list
            try {
                const eventRes = await fetch(`${API_BASE}/events/${eventId}/snapshot`);
                if (!eventRes.ok) throw new Error(`HTTP ${eventRes.status}`);
                
                const eventData = await eventRes.json();
                console.log('Event snapshot:', eventData);
                
                if (eventData && eventData.divisions) {
                    // Extract all archers
                    const allArchers = [];
                    Object.keys(eventData.divisions).forEach(divKey => {
                        const div = eventData.divisions[divKey];
                        (div.archers || []).forEach(archer => {
                            allArchers.push({
                                first: archer.archerName ? archer.archerName.split(' ')[0] : '',
                                last: archer.archerName ? archer.archerName.split(' ').slice(1).join(' ') : '',
                                school: archer.school,
                                level: archer.level,
                                gender: archer.gender,
                                bale: archer.bale,
                                target: archer.target,
                                fave: false
                            });
                        });
                    });
                    
                    // Save to localStorage
                    localStorage.setItem('archery_master_list', JSON.stringify(allArchers));
                    console.log(`Loaded ${allArchers.length} archers from event`);
                }
                
                renderSetupForm();
                return true;
            } catch (err) {
                console.error('Failed to load event data:', err);
                return false;
            }
        } catch (err) {
            console.error('Failed to verify entry code:', err);
            return false;
        }
    }
    
    // Load event information for display and selector (PUBLIC - no authentication required)
    async function loadEventInfo() {
        try {
            console.log('Loading events...');
            const today = new Date().toISOString().slice(0, 10);
            
            // Fetch events from public API endpoint
            const res = await fetch(`${API_BASE}/events/recent`);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            const data = await res.json();
            console.log('Events data:', data);
            
            if (data.events && data.events.length > 0) {
                // Filter to ONLY Active events
                const activeEvents = data.events.filter(ev => ev.status === 'Active');
                console.log(`Found ${activeEvents.length} active events out of ${data.events.length} total`);
                
                // Populate event selector
                const eventSelector = document.getElementById('event-selector');
                if (eventSelector) {
                    eventSelector.innerHTML = '<option value="">Select Event...</option>';
                    
                    if (activeEvents.length === 0) {
                        eventSelector.innerHTML = '<option value="">No Active Events</option>';
                        return;
                    }
                    
                    activeEvents.forEach(ev => {
                        const option = document.createElement('option');
                        option.value = ev.id;
                        option.textContent = `${ev.name} (${ev.date})`;
                        eventSelector.appendChild(option);
                    });
                    
                    // Auto-select if only ONE active event
                    if (activeEvents.length === 1) {
                        console.log('Only one active event - auto-selecting:', activeEvents[0].name);
                        eventSelector.value = activeEvents[0].id;
                        state.selectedEventId = activeEvents[0].id;
                        saveData();
                        
                        // Trigger load of archers for this event
                        try {
                            const res = await fetch(`${API_BASE}/events/${activeEvents[0].id}/snapshot`);
                            if (res.ok) {
                                const eventData = await res.json();
                                if (eventData && eventData.divisions) {
                                    const allArchers = [];
                                    Object.keys(eventData.divisions).forEach(divKey => {
                                        const div = eventData.divisions[divKey];
                                        (div.archers || []).forEach(archer => {
                                            const nameParts = (archer.archerName || '').split(' ');
                                            allArchers.push({
                                                first: nameParts[0] || '',
                                                last: nameParts.slice(1).join(' ') || '',
                                                school: archer.school,
                                                level: archer.level,
                                                gender: archer.gender,
                                                bale: archer.bale,
                                                target: archer.target,
                                                division: divKey,
                                                fave: false
                                            });
                                        });
                                    });
                                    localStorage.setItem('archery_master_list', JSON.stringify(allArchers));
                                    renderSetupForm();
                                }
                            }
                        } catch (err) {
                            console.log('Could not auto-load event:', err.message);
                        }
                    }
                } else {
                    console.log('Event selector element not found');
                }
                
                // Update display info
                const todayEvent = data.events.find(ev => ev.date === today);
                if (todayEvent) {
                    const eventNameEl = document.getElementById('event-name');
                    const baleDisplayEl = document.getElementById('current-bale-display');
                    
                    if (eventNameEl) eventNameEl.textContent = todayEvent.name;
                    if (baleDisplayEl) baleDisplayEl.textContent = state.baleNumber;
                }
            } else {
                console.log('No events found in response');
            }
        } catch (e) {
            console.log('Could not load event info:', e.message);
            // Silent fail - archers can use manual mode
        }
    }

    // Check if this bale has pre-assigned archers from an event (PUBLIC - no authentication required)
    async function loadPreAssignedBale(eventId, baleNumber = null) {
        try {
            // Fetch snapshot from public API endpoint
            const res = await fetch(`${API_BASE}/events/${eventId}/snapshot`);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            const data = await res.json();
            console.log('Loaded event snapshot for bale:', data);
            
            if (!data || !data.divisions) {
                console.log('No divisions found in event snapshot');
                return;
            }
            
            // Use provided bale number or current state bale
            const targetBale = baleNumber !== null ? baleNumber : state.baleNumber;
            
            // Search all divisions for archers assigned to our bale number
            let foundArchers = [];
            let divisionName = '';
            
            for (const [divCode, divData] of Object.entries(data.divisions)) {
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

    function updateLiveStatusDisplay() {
        const badge = document.getElementById('live-status-badge');
        if (!badge) return;
        
        const isLiveEnabled = getLiveEnabled();
        
        if (!isLiveEnabled) {
            badge.textContent = 'Live Updates Off';
            badge.className = 'status-badge status-off';
            return;
        }
        
        // Check if current end is synced for all archers
        const currentEnd = state.currentEnd;
        const allSynced = state.archers.length > 0 && state.archers.every(archer => {
            const syncStatus = state.syncStatus[archer.id] && state.syncStatus[archer.id][currentEnd];
            return syncStatus === 'synced';
        });
        
        const anyPending = state.archers.some(archer => {
            const syncStatus = state.syncStatus[archer.id] && state.syncStatus[archer.id][currentEnd];
            return syncStatus === 'pending';
        });
        
        if (allSynced) {
            badge.textContent = 'Synced';
            badge.className = 'status-badge status-synced';
        } else if (anyPending) {
            badge.textContent = 'Syncing...';
            badge.className = 'status-badge status-pending';
        } else {
            badge.textContent = 'Not Synced';
            badge.className = 'status-badge status-pending';
        }
    }
    
    function getLiveEnabled() {
        try { 
            return !!(JSON.parse(localStorage.getItem('live_updates_config')||'{}').enabled); 
        } catch(_) { 
            return false; 
        }
    }
    
    function setLiveEnabled(v) { 
        try { 
            if (window.LiveUpdates && LiveUpdates.saveConfig) {
                LiveUpdates.saveConfig({ enabled: !!v }); 
            } else {
                localStorage.setItem('live_updates_config', JSON.stringify({ enabled: !!v })); 
            }
        } catch(_) {} 
    }

    function isLiveUpdatesReady() {
        return !!(window.LiveUpdates && 
                 LiveUpdates._state && 
                 LiveUpdates._state.roundId && 
                 getLiveEnabled());
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
        
        // Update live status display
        updateLiveStatusDisplay();
        
        saveData();
    }

    function getSyncStatusIcon(status) {
        const icons = {
            'synced': '<span style="color: #4caf50; font-size: 0.9em;" title="Synced">✓</span>',
            'pending': '<span style="color: #ff9800; font-size: 0.9em;" title="Pending">⟳</span>',
            'failed': '<span style="color: #f44336; font-size: 0.9em;" title="Failed">✗</span>',
            '': '<span style="color: #9e9e9e; font-size: 0.9em;" title="Not Synced">○</span>'
        };
        return icons[status] || icons[''];
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
                        roundType: 'R300',
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

    // Check if there's an in-progress scorecard
    function hasInProgressScorecard() {
        if (!state.archers || state.archers.length === 0) return false;
        return state.archers.some(a => 
            a.scores && a.scores.some(s => s && s.some(val => val !== ''))
        );
    }
    
    // Check if event has server-synced ends
    async function hasServerSyncedEnds() {
        if (!state.activeEventId && !state.selectedEventId) return false;
        const eventId = state.activeEventId || state.selectedEventId;
        try {
            const res = await fetch(`${API_BASE}/events/${eventId}/snapshot`);
            if (!res.ok) return false;
            const data = await res.json();
            // Check if any archers have endsCompleted > 0
            return Object.values(data.divisions || {}).some(div =>
                div.archers && div.archers.some(a => a.endsCompleted > 0)
            );
        } catch (e) {
            return false;
        }
    }
    
    // Show event selection modal
    function showEventModal() {
        const modal = document.getElementById('event-modal');
        if (modal) {
            modal.style.display = 'flex';
            
            // Load active events into the Events tab
            loadActiveEventsIntoModal();
        }
    }
    
    // Hide event selection modal
    function hideEventModal() {
        const modal = document.getElementById('event-modal');
        if (modal) modal.style.display = 'none';
    }
    
    // Load active events into modal list
    async function loadActiveEventsIntoModal() {
        try {
            const res = await fetch(`${API_BASE}/events/recent`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            
            const data = await res.json();
            const activeEvents = (data.events || []).filter(ev => ev.status === 'Active');
            
            const eventList = document.getElementById('event-list');
            if (!eventList) return;
            
            if (activeEvents.length === 0) {
                eventList.innerHTML = '<p style="color: #999; text-align: center;">No active events found</p>';
                return;
            }
            
            eventList.innerHTML = '';
            activeEvents.forEach(ev => {
                const eventBtn = document.createElement('button');
                eventBtn.className = 'btn btn-secondary';
                eventBtn.style.cssText = 'width: 100%; margin-bottom: 0.5rem; text-align: left; padding: 1rem;';
                eventBtn.innerHTML = `
                    <div style="font-weight: bold;">${ev.name}</div>
                    <div style="font-size: 0.85em; color: #666;">${ev.date}</div>
                `;
                eventBtn.onclick = async () => {
                    await loadEventById(ev.id, ev.name);
                    hideEventModal();
                };
                eventList.appendChild(eventBtn);
            });
        } catch (err) {
            console.error('Failed to load events:', err);
            const eventList = document.getElementById('event-list');
            if (eventList) {
                eventList.innerHTML = '<p style="color: #f44336;">Failed to load events</p>';
            }
        }
    }
    
    // Load event by ID (without entry code)
    async function loadEventById(eventId, eventName) {
        try {
            if (!eventId) {
                console.error('No event ID provided');
                return false;
            }
            
            state.selectedEventId = eventId;
            state.activeEventId = eventId;
            
            const res = await fetch(`${API_BASE}/events/${eventId}/snapshot`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            
            const eventData = await res.json();
            if (eventData && eventData.divisions) {
                const allArchers = [];
                Object.keys(eventData.divisions).forEach(divKey => {
                    const div = eventData.divisions[divKey];
                    (div.archers || []).forEach(archer => {
                        const nameParts = (archer.archerName || '').split(' ');
                        allArchers.push({
                            first: nameParts[0] || '',
                            last: nameParts.slice(1).join(' ') || '',
                            school: archer.school,
                            level: archer.level,
                            gender: archer.gender,
                            bale: archer.bale,
                            target: archer.target,
                            division: divKey,
                            fave: false
                        });
                    });
                });
                localStorage.setItem('archery_master_list', JSON.stringify(allArchers));
                
                // Load archers into state for pre-assigned mode
                state.archers = allArchers.map(archer => ({
                    id: `${archer.first}-${archer.last}`,
                    firstName: archer.first,
                    lastName: archer.last,
                    school: archer.school,
                    level: archer.level,
                    gender: archer.gender,
                    baleNumber: archer.bale, // Map bale to baleNumber
                    target: archer.target,
                    division: archer.division,
                    scores: [[], [], [], [], [], []], // Initialize empty scores
                    fave: archer.fave
                }));
                
                // Update UI/state
                state.eventName = eventName || state.eventName || '';
                state.assignmentMode = 'pre-assigned'; // Set to pre-assigned when loading event
                updateEventHeader();
                
                saveData();
                renderSetupForm();
                return true;
            }
            return false;
        } catch (err) {
            console.error('Failed to load event:', err);
            return false;
        }
    }
    
    async function init() {
        console.log("Initializing Ranking Round 300 App...");
        loadData();
        renderKeypad();
        wireCoreHandlers();
        
        // Check for in-progress work FIRST
        const localProgress = hasInProgressScorecard();
        if (localProgress) {
            console.log('Found in-progress scorecard - resuming scoring');
            state.currentView = 'scoring';
            renderView();
            return; // Resume scoring, skip further setup
        }
        
        // Check server progress if we have an active event
        if (state.activeEventId || state.selectedEventId) {
            const serverProgress = await hasServerSyncedEnds();
            if (serverProgress) {
                console.log('Found server-synced progress - resuming scoring');
                state.currentView = 'scoring';
                renderView();
                return; // Resume scoring, skip further setup
            }
        }
        
        // No in-progress work - show setup
        renderView();
        
        // Check for URL parameters (QR code access)
        if (urlEventId && urlEntryCode && urlEventId.trim() && urlEntryCode.trim()) {
            console.log('QR code detected - verifying entry code...');
            const verified = await verifyAndLoadEventByCode(urlEventId.trim(), urlEntryCode.trim());
            if (verified) {
                // Event loaded successfully - skip event modal, go straight to bale selection
                console.log('Event loaded from QR code - bypassing event modal');
                
                // Update current event name button
                state.eventName = 'QR Event';
                updateEventHeader();
                
                renderSetupForm();
            } else {
                // Verification failed - show modal with error message
                console.log('QR code verification failed - showing modal');
                showEventModal();
                // Show error in modal
                const codeError = document.getElementById('code-error');
                if (codeError) {
                    codeError.textContent = 'QR code verification failed. Please try entering the code manually or select an event.';
                    codeError.style.display = 'block';
                }
            }
        } else if (!state.selectedEventId && !state.activeEventId) {
            // No QR code, no saved event - show modal
            console.log('No event connected - showing event modal');
            showEventModal();
        } else {
            // Has saved event - try to load it
            console.log('Found saved event ID:', state.selectedEventId || state.activeEventId);
            const eventId = state.selectedEventId || state.activeEventId;
            const success = await loadEventById(eventId, state.eventName || 'Saved Event');
            if (!success) {
                // Failed to load saved event - show modal
                console.log('Failed to load saved event - showing modal');
                showEventModal();
            }
        }

        // Wire up manual setup controls
        if (manualSetupControls.baleInput) {
            manualSetupControls.baleInput.value = state.baleNumber;
            manualSetupControls.baleInput.onchange = () => {
                const newBale = parseInt(manualSetupControls.baleInput.value, 10) || 1;
                state.baleNumber = newBale;
                saveData();
                console.log('Bale number updated to:', newBale);
            };
        }

        if (manualSetupControls.searchInput) {
            manualSetupControls.searchInput.oninput = () => {
                renderManualArcherList();
            };
        }

        if (manualSetupControls.startScoringBtn) {
            manualSetupControls.startScoringBtn.onclick = () => {
                if (state.archers.length === 0) {
                    alert('Please select at least one archer to start scoring.');
                    return;
                }
                showScoringView();
            };
        }

        const baleNumberInput = document.getElementById('bale-number-input');
        if (baleNumberInput) {
            baleNumberInput.value = state.baleNumber;
            baleNumberInput.onchange = async () => {
                const newBale = parseInt(baleNumberInput.value, 10) || 1;
                state.baleNumber = newBale;
                saveData();
                
                // If event is selected, filter archers by this bale
                if (state.activeEventId && state.assignmentMode === 'pre-assigned') {
                    // Filter current archers by bale number
                    const filteredArchers = state.archers.filter(archer => 
                        archer.baleNumber === newBale
                    );
                    
                    if (filteredArchers.length > 0) {
                        // Update the display with filtered archers
                        renderPreAssignedArchers();
                    } else {
                        // No archers for this bale - show empty state
                        renderEmptyBaleState(newBale);
                    }
                } else if (state.assignmentMode === 'manual') {
                    // For manual mode, just highlight and scroll
                    highlightBale(newBale);
                    scrollToBale(newBale);
                }
            };
        }

        const eventSelector = document.getElementById('event-selector');
        if (eventSelector) {
            eventSelector.onchange = async () => {
                state.selectedEventId = eventSelector.value || null;
                saveData();
                
                // Load archers from this event
                if (state.selectedEventId) {
                    try {
                        // Load all archers from this event to show in the list
                        const res = await fetch(`${API_BASE}/events/${state.selectedEventId}/snapshot`);
                        if (!res.ok) {
                            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                        }
                        const data = await res.json();
                        console.log('Event snapshot loaded:', data);
                        
                        if (!data || !data.divisions) {
                            console.log('No divisions found in event snapshot');
                            return;
                        }
                        
                        // Extract archers from all divisions
                        const allArchers = [];
                        Object.keys(data.divisions || {}).forEach(divKey => {
                            const div = data.divisions[divKey];
                            (div.archers || []).forEach(archer => {
                                // Parse archerName: "John Smith" -> first: "John", last: "Smith"
                                const nameParts = (archer.archerName || '').split(' ');
                                const first = nameParts[0] || '';
                                const last = nameParts.slice(1).join(' ') || '';
                                
                                allArchers.push({
                                    first: first,
                                    last: last,
                                    school: archer.school,
                                    level: archer.level,
                                    gender: archer.gender,
                                    bale: archer.bale,
                                    target: archer.target,
                                    division: divKey,
                                    fave: false
                                });
                            });
                        });
                        
                        // Save to localStorage as master list
                        localStorage.setItem('archery_master_list', JSON.stringify(allArchers));
                        renderSetupForm();
                    } catch (err) {
                        console.log('Could not load event archers:', err.message);
                    }
                }
            };
        }

        // Complete round / Sync end button
        const completeBtn = document.getElementById('complete-round-btn');
        if (completeBtn) {
            completeBtn.onclick = () => {
                const isLiveEnabled = getLiveEnabled();
                
                if (!isLiveEnabled) {
                    // Live sync is off - complete round for final verification
                    if (confirm('Are you sure you want to complete this round? This will mark all archers as finished.')) {
                        completeRound();
                    }
                } else {
                    // Live sync is on - sync current end
                    syncCurrentEnd();
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
                if (state.assignmentMode === 'pre-assigned' && state.activeEventId) {
                    // Filter event archers by search term
                    renderPreAssignedArchers();
                } else {
                    // Manual mode - use global master list
                    const masterList = (typeof ArcherModule !== 'undefined') ? ArcherModule.loadList() : [];
                    renderArcherSelectList(masterList, searchInput.value);
                }
            };
            // Live toggle
            const liveBtn = document.createElement('button');
            liveBtn.id = 'live-toggle-btn';
            liveBtn.className = 'btn btn-secondary';
            const getLiveEnabled = () => {
                try { return !!(JSON.parse(localStorage.getItem('live_updates_config')||'{}').enabled); } catch(_) { return false; }
            };
            const setLiveEnabled = (v) => { try { if (window.LiveUpdates && LiveUpdates.saveConfig) LiveUpdates.saveConfig({ enabled: !!v }); else localStorage.setItem('live_updates_config', JSON.stringify({ enabled: !!v })); } catch(_) {} };
            const renderLiveBtn = () => { const on = getLiveEnabled(); liveBtn.textContent = on ? 'Live: On' : 'Live: Off'; liveBtn.className = on ? 'btn btn-success' : 'btn btn-secondary'; };
            renderLiveBtn();
            
            // Master Sync button removed - not needed for archers
            // Initialize round/archers immediately when enabling live
            const initLiveRoundAndArchers = () => {
                try {
                    let isEnabled = getLiveEnabled();
                    if (!isEnabled || !window.LiveUpdates || !LiveUpdates.setConfig) {
                        console.log('Live Updates not available or disabled');
                        return;
                    }
                    
                    const cfg = window.LIVE_UPDATES || {};
                    LiveUpdates.setConfig({ apiBase: cfg.apiBase || 'https://tryentist.com/wdv/api/v1' });
                    
                    if (!LiveUpdates._state.roundId) {
                        console.log('Initializing Live Updates round...');
                        LiveUpdates.ensureRound({ roundType: 'R300', date: new Date().toISOString().slice(0, 10), baleNumber: state.baleNumber })
                          .then(() => { 
                            console.log('Round initialized, ensuring archers...');
                            state.archers.forEach(a => {
                                console.log('Ensuring archer:', a.id);
                                LiveUpdates.ensureArcher(a.id, a);
                            });
                          })
                          .catch(err => {
                            console.error('Failed to initialize Live Updates:', err);
                          });
                    } else {
                        console.log('Round already initialized, ensuring archers...');
                        state.archers.forEach(a => {
                            console.log('Ensuring archer:', a.id);
                            LiveUpdates.ensureArcher(a.id, a);
                        });
                    }
                    
                    const badge = document.getElementById('live-status-badge');
                    if (badge) { 
                        badge.textContent = 'Not Synced'; 
                        badge.className = 'status-badge status-pending'; 
                    }
                } catch(err) {
                    console.error('Error in initLiveRoundAndArchers:', err);
                }
            };
            liveBtn.onclick = () => {
                const newState = !getLiveEnabled();
                setLiveEnabled(newState);
                renderLiveBtn();
                
                if (newState) {
                    // Enable live sync - initialize round and archers
                    initLiveRoundAndArchers();
                    console.log('Live Sync enabled');
                } else {
                    // Disable live sync
                    console.log('Live Sync disabled');
                }
                
                // Update status display
                updateLiveStatusDisplay();
            };

            const resetBtn = document.createElement('button');
            resetBtn.id = 'reset-btn';
            resetBtn.className = 'btn btn-danger';
            resetBtn.textContent = 'Reset';
            resetBtn.onclick = () => resetModal.element.style.display = 'flex';
            const scoringBtn = document.createElement('button');
            scoringBtn.id = 'scoring-btn';
            scoringBtn.className = 'btn btn-primary';
            scoringBtn.textContent = 'Start Scoring';
            scoringBtn.style.marginLeft = 'auto';
            scoringBtn.onclick = showScoringView;
            setupControls.subheader.appendChild(searchInput);
            setupControls.subheader.appendChild(liveBtn);
            setupControls.subheader.appendChild(resetBtn);
            setupControls.subheader.appendChild(scoringBtn);
            
            // Add selected count chip for manual mode
            if (state.assignmentMode === 'manual') {
                const selectedChip = document.createElement('span');
                selectedChip.className = 'btn';
                selectedChip.style.cursor = 'default';
                selectedChip.textContent = `${state.archers.length}/4`;
                setupControls.subheader.appendChild(selectedChip);
            }
        }

        const setupBaleBtn = document.getElementById('setup-bale-btn');
        if (setupBaleBtn) {
            setupBaleBtn.onclick = () => {
                state.currentView = 'setup';
                renderView();
            };
        }
        
        if (scoringControls.prevEndBtn) {
            scoringControls.prevEndBtn.textContent = 'Last End';
        scoringControls.prevEndBtn.onclick = () => changeEnd(-1);
        }
        if (scoringControls.nextEndBtn) {
            scoringControls.nextEndBtn.textContent = 'Next End';
        scoringControls.nextEndBtn.onclick = () => changeEnd(1);
        }
        
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

        document.body.addEventListener('focusin', (e) => {
            if (e.target.classList.contains('score-input')) {
                console.log('Score input focused:', e.target);
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
                        roundType: 'R300',
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
            // Visual sync indicator on end rows
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
            // Initialize badge if live is on
            const badge = document.getElementById('live-status-badge');
            const liveOn = !!isEnabled;
            if (badge) {
                if (liveOn) { badge.textContent = 'Not Synced'; badge.className = 'status-badge status-pending'; }
                else { badge.textContent = 'Not Live Scoring'; badge.className = 'status-badge status-off'; }
            }
        } catch (e) { /* noop */ }
    }

    function loadSampleData() {
        state.archers = [
            { id: '1', firstName: 'Mike', lastName: 'A.', school: 'WDV', level: 'V', gender: 'M', targetAssignment: 'A', targetSize: 122, scores: [['10','9','7'], ['8','6','M'], ['5','4','3'], ['10','9','7'], ['X','10','8'], ['X','X','X'],['9','9','8'], ['10','X','X'], ['7','6','5'], ['X','X','9']] },
            { id: '2', firstName: 'Robert', lastName: 'B.', school: 'WDV', level: 'V', gender: 'M', targetAssignment: 'B', targetSize: 122, scores: [['X','9','9'], ['8','8','7'], ['5','5','5'], ['6','6','7'], ['8','9','10'], ['7','7','6'],['10','9','9'], ['X','X','8'], ['9','8','7'], ['6','5','M']] },
            { id: '3', firstName: 'Terry', lastName: 'C.', school: 'OPP', level: 'JV', gender: 'M', targetAssignment: 'C', targetSize: 80, scores: [['X','7','7'], ['7','7','7'], ['10','7','10'], ['5','4','M'], ['8','7','6'], ['5','4','3'],['9','8','X'], ['10','7','6'], ['9','9','9'], ['8','8','M']] },
            { id: '4', firstName: 'Susan', lastName: 'D.', school: 'OPP', level: 'V', gender: 'F', targetAssignment: 'D', targetSize: 122, scores: [['9','9','8'], ['10','9','8'], ['X','9','8'], ['7','7','6'], ['10','10','9'], ['X','9','9'],['8','8','7'], ['9','9','9'], ['10','X','9'], ['8','7','6']] },
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
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: cardContainer.offsetWidth,
            height: cardContainer.offsetHeight
        }).then(canvas => {
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
                app: 'RankingRound300',
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

        archer.scores.forEach((endScores) => {
            const isComplete = endScores.every(score => score !== '' && score !== null);
            if (isComplete) {
                completedEnds++;
                endScores.forEach(score => {
                    const scoreValue = parseScoreValue(score);
                    totalScore += scoreValue;
                    if (score === '10') totalTens++;
                    if (String(score).toUpperCase() === 'X') totalXs++;
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

    function showEditAssignmentsModal() {
        // Create modal if it doesn't exist
        let modal = document.getElementById('edit-assignments-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'edit-assignments-modal';
            modal.className = 'modal-overlay';
            modal.style.cssText = 'display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center;';
            document.body.appendChild(modal);
        }
        
        // Get all archers from the event
        const eventArchers = JSON.parse(localStorage.getItem('archery_master_list') || '[]');
        const currentArcherIds = state.archers.map(a => `${a.firstName}-${a.lastName}-${a.school}`);
        
        modal.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; max-width: 90%; max-height: 80%; overflow-y: auto;">
                <h3 style="margin-top: 0;">Edit Bale Assignments</h3>
                <p style="color: #666; margin-bottom: 16px;">Check/uncheck archers to include in this bale</p>
                
                <div style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 8px;">
                    ${eventArchers.map(archer => {
                        const archerId = `${archer.first}-${archer.last}-${archer.school}`;
                        const isChecked = currentArcherIds.includes(archerId);
                        return `
                            <label style="display: block; padding: 8px; border-bottom: 1px solid #eee; cursor: pointer;">
                                <input type="checkbox" ${isChecked ? 'checked' : ''} 
                                       data-archer='${JSON.stringify(archer).replace(/'/g, '&#39;')}'
                                       style="margin-right: 8px;">
                                <strong>${archer.first} ${archer.last}</strong> 
                                <span style="color: #666;">(${archer.school} - ${archer.level}/${archer.gender})</span>
                                ${archer.bale ? `<span style="color: #2196f3;">- Bale ${archer.bale}</span>` : ''}
                            </label>
                        `;
                    }).join('')}
                </div>
                
                <div style="margin-top: 16px; display: flex; gap: 8px; justify-content: flex-end;">
                    <button id="edit-assignments-cancel" class="btn btn-secondary">Cancel</button>
                    <button id="edit-assignments-save" class="btn btn-primary">Save Changes</button>
                </div>
            </div>
        `;
        
        // Add event listeners
        document.getElementById('edit-assignments-cancel').onclick = () => {
            modal.style.display = 'none';
        };
        
        document.getElementById('edit-assignments-save').onclick = () => {
            const checkboxes = modal.querySelectorAll('input[type="checkbox"]:checked');
            const selectedArchers = Array.from(checkboxes).map(cb => {
                const archerData = JSON.parse(cb.dataset.archer.replace(/&#39;/g, "'"));
                return {
                    id: `${archerData.first}-${archerData.last}-${archerData.school}`,
                    firstName: archerData.first,
                    lastName: archerData.last,
                    school: archerData.school,
                    level: archerData.level,
                    gender: archerData.gender,
                    targetAssignment: archerData.target || 'A',
                    scores: []
                };
            });
            
            state.archers = selectedArchers;
            saveData();
            renderSetupForm();
            modal.style.display = 'none';
        };
        
        modal.style.display = 'flex';
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

    // Event Modal Handlers
    const tabPasscode = document.getElementById('tab-passcode');
    const tabEvents = document.getElementById('tab-events');
    const passcodeTabContent = document.getElementById('passcode-tab');
    const eventsTabContent = document.getElementById('events-tab');
    const verifyCodeBtn = document.getElementById('verify-code-btn');
    const eventCodeInput = document.getElementById('event-code-input');
    const codeError = document.getElementById('code-error');
    const cancelEventModalBtn = document.getElementById('cancel-event-modal-btn');
    const changeEventBtn = document.getElementById('change-event-btn');
    
    // Tab switching
    if (tabPasscode && tabEvents) {
        tabPasscode.onclick = () => {
            tabPasscode.classList.add('active');
            tabPasscode.style.borderBottom = '3px solid #2d7dd9';
            tabEvents.classList.remove('active');
            tabEvents.style.borderBottom = '3px solid transparent';
            passcodeTabContent.style.display = 'block';
            eventsTabContent.style.display = 'none';
        };
        
        tabEvents.onclick = () => {
            tabEvents.classList.add('active');
            tabEvents.style.borderBottom = '3px solid #2d7dd9';
            tabPasscode.classList.remove('active');
            tabPasscode.style.borderBottom = '3px solid transparent';
            eventsTabContent.style.display = 'block';
            passcodeTabContent.style.display = 'none';
        };
    }
    
    // Verify code button
    if (verifyCodeBtn && eventCodeInput) {
        verifyCodeBtn.onclick = async () => {
            const code = eventCodeInput.value.trim();
            if (!code) {
                codeError.textContent = 'Please enter an event code';
                codeError.style.display = 'block';
                return;
            }
            
            codeError.style.display = 'none';
            verifyCodeBtn.disabled = true;
            verifyCodeBtn.textContent = 'Connecting...';
            
            try {
                // First, get list of events to find event ID by code
                // We need to check each event by verifying the code
                const eventsRes = await fetch(`${API_BASE}/events/recent`);
                if (!eventsRes.ok) throw new Error('Failed to fetch events');
                
                const eventsData = await eventsRes.json();
                const activeEvents = (eventsData.events || []).filter(ev => ev.status === 'Active');
                
                // Try to verify the code against each active event
                let matchedEvent = null;
                for (const event of activeEvents) {
                    try {
                        const verifyRes = await fetch(`${API_BASE}/events/verify`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ eventId: event.id, entryCode: code })
                        });
                        
                        if (verifyRes.ok) {
                            const verifyData = await verifyRes.json();
                            if (verifyData.verified) {
                                matchedEvent = event;
                                break;
                            }
                        }
                    } catch (e) {
                        // Continue to next event
                        continue;
                    }
                }
                
                if (!matchedEvent) {
                    codeError.textContent = 'Invalid event code. Please check and try again.';
                    codeError.style.display = 'block';
                    verifyCodeBtn.disabled = false;
                    verifyCodeBtn.textContent = 'Connect to Event';
                    return;
                }
                
                // Load this event
                await loadEventById(matchedEvent.id, matchedEvent.name);
                hideEventModal();
                eventCodeInput.value = '';
                
            } catch (err) {
                console.error('Failed to verify code:', err);
                codeError.textContent = 'Connection failed. Please check your internet.';
                codeError.style.display = 'block';
            } finally {
                verifyCodeBtn.disabled = false;
                verifyCodeBtn.textContent = 'Connect to Event';
            }
        };
        
        // Allow Enter key to submit
        eventCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                verifyCodeBtn.click();
            }
        });
    }
    
    // Cancel button
    if (cancelEventModalBtn) {
        cancelEventModalBtn.onclick = () => {
            hideEventModal();
        };
    }
    
    // Change event button (in header)
    if (changeEventBtn) {
        changeEventBtn.onclick = () => {
            showEventModal();
        };
    }

    // Only initialize the app if we are on the ranking round page
    if (document.getElementById('bale-scoring-container')) {
        init();
    }
});

// --- Helpers reused from 360 variant (no external deps) ---
function parseScoreValue(score) {
    const s = String(score).toUpperCase();
    if (s === 'X') return 10;
    if (s === 'M' || s === '') return 0;
    const n = parseInt(s, 10);
    return isNaN(n) ? 0 : Math.max(0, Math.min(10, n));
}

function getScoreColor(score) {
    const s = String(score).toUpperCase();
    // Gold: X, 10, 9
    if (s === 'X' || s === '10' || s === '9') return 'score-gold';
    // Red: 8, 7
    if (s === '8' || s === '7') return 'score-red';
    // Blue: 6, 5
    if (s === '6' || s === '5') return 'score-blue';
    // Black: 4, 3
    if (s === '4' || s === '3') return 'score-black';
    // White: 2, 1, M, 0
    if (s === '2' || s === '1' || s === 'M' || s === '0') return 'score-white';
    return '';
}



