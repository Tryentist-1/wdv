/**
 * js/ranking_round.js
 * 
 * Manages the state and user interface for the redesigned "Bale-centric"
 * Ranking Round scoring application.
 */

document.addEventListener('DOMContentLoaded', () => {

    // Check for URL parameters (event and code for QR code access)
    const urlParams = new URLSearchParams(window.location.search);
    const urlEventId = urlParams.get('event');
    const urlEntryCode = urlParams.get('code');

    // --- STATE MANAGEMENT ---
    const state = {
        app: 'RankingRound',
        version: '1.1',
        currentView: 'setup', // 'setup', 'scoring', 'card'
        currentEnd: 1,
        totalEnds: 12, // Default for a 360 round
        baleNumber: 1,
        date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        archers: [], // { id, extId, firstName, lastName, school, level, gender, targetAssignment, scores, targetSize? }
        activeArcherId: null, // For card view
        selectedEventId: null, // Selected event for this bale
        activeEventId: null, // Event ID if pre-assigned mode
        assignmentMode: 'manual', // 'manual' or 'pre-assigned'
        syncStatus: {}, // Track sync status per archer per end: { archerId: { endNumber: 'synced'|'pending'|'failed' } }
        rosterFilter: '',
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
    
    function parseScoreValue(score) {
        if (!score || score === '') return 0;
        const upper = String(score).toUpperCase();
        if (upper === 'X' || upper === '10') return 10;
        if (upper === 'M') return 0;
        const num = parseInt(upper, 10);
        return isNaN(num) ? 0 : num;
    }
    
    function getScoreColorClass(score) {
        if (!score || score === '') return 'white';
        const upper = String(score).toUpperCase();
        if (upper === 'X' || upper === '10' || upper === '9') return 'gold';
        if (upper === '8' || upper === '7') return 'red';
        if (upper === '6' || upper === '5') return 'blue';
        if (upper === '4' || upper === '3') return 'black';
        if (upper === '2' || upper === '1') return 'white';
        return 'white';
    }
    
    function getScoreTextColor(score) {
        if (!score || score === '') return 'text-gray-500';
        const upper = String(score).toUpperCase();
        if (upper === 'X' || upper === '10' || upper === '9') return 'text-black';
        if (upper === '8' || upper === '7') return 'text-white';
        if (upper === '6' || upper === '5') return 'text-white';
        if (upper === '4' || upper === '3') return 'text-white';
        if (upper === '2' || upper === '1') return 'text-black';
        if (upper === 'M') return 'text-gray-500';
        return 'text-gray-500';
    }
    
    function getScoreColor(score) {
        // Legacy function for card view - returns class name without bg- prefix
        return getScoreColorClass(score);
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

        const setupBaleBtn = document.getElementById('setup-bale-btn');
        if (setupBaleBtn && setupBaleBtn.onclick === null) {
            setupBaleBtn.onclick = () => {
                state.currentView = 'setup';
                renderView();
            };
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
                if (typeof state.rosterFilter !== 'string') {
                    state.rosterFilter = '';
                }
            } catch (e) {
                console.error("Error parsing stored data. Starting fresh.", e);
                localStorage.removeItem(sessionKey);
            }
        }
    }

    const TARGET_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    // --- ARCHER SELECTOR SETUP ---
    let archerSelector = null;
    const RANKING_SELECTOR_GROUPS = [
        { id: 'A', label: 'Target A', buttonText: 'A', max: 1, accentClass: 'bg-primary text-white' },
        { id: 'B', label: 'Target B', buttonText: 'B', max: 1, accentClass: 'bg-secondary text-white' },
        { id: 'C', label: 'Target C', buttonText: 'C', max: 1, accentClass: 'bg-success text-white' },
        { id: 'D', label: 'Target D', buttonText: 'D', max: 1, accentClass: 'bg-warning text-gray-800' }
    ];

    function initializeArcherSelector() {
        if (!setupControls.container || typeof ArcherSelector === 'undefined') {
            console.warn('ArcherSelector component unavailable.');
            return;
        }

        archerSelector = ArcherSelector.init(setupControls.container, {
            groups: RANKING_SELECTOR_GROUPS,
            emptyMessage: 'No archers found. Sync your roster to begin.',
            onSelectionChange: handleSelectorChange,
            onFavoriteToggle: handleFavoriteToggle,
            showAvatars: true,
            showFavoriteToggle: true
        });
        
        refreshArcherRoster();
        syncSelectorSelection();
    }

    function refreshArcherRoster() {
        if (!archerSelector || typeof ArcherModule === 'undefined') return;
        try {
            const roster = ArcherModule.loadList() || [];
            const ctx = getSelectorContext();
            archerSelector.setContext(ctx);
            archerSelector.setRoster(roster);
            const searchInput = setupControls.subheader?.querySelector('input[type="text"]');
            if (searchInput && searchInput.value) {
                archerSelector.setFilter(searchInput.value);
            }
        } catch (err) {
            console.warn('Failed to load archer roster for selector:', err);
            archerSelector.setRoster([]);
        }
    }

    function getSelectorContext() {
        const rosterState = getRosterState();
        return {
            favorites: rosterState.friendSet instanceof Set ? rosterState.friendSet : new Set(Array.isArray(rosterState.friendSet) ? rosterState.friendSet : []),
            selfExtId: rosterState.selfExtId || ''
        };
    }

    function handleSelectorChange(groupId, selectedArchers) {
        // Update state.archers based on selector selection
        // Remove archers from state that are no longer selected
        state.archers = state.archers.filter(archer => {
            const archerExtId = getExtIdFromArcher(archer);
            const stillSelected = selectedArchers.some(sel => getExtIdFromArcher(sel) === archerExtId);
            return stillSelected;
        });
        
        // Add or update archers from selector
        selectedArchers.forEach(selectedArcher => {
            const archerExtId = getExtIdFromArcher(selectedArcher);
            const existingIndex = state.archers.findIndex(a => getExtIdFromArcher(a) === archerExtId);
            
            const normalizedArcher = buildStateArcherFromRoster(
                {
                    first: selectedArcher.first || selectedArcher.firstName,
                    last: selectedArcher.last || selectedArcher.lastName,
                    nickname: selectedArcher.nickname,
                    school: selectedArcher.school,
                    level: selectedArcher.level,
                    gender: selectedArcher.gender,
                    status: selectedArcher.status
                },
                groupId // Use groupId (A, B, C, D) as target assignment
            );
            
            if (existingIndex >= 0) {
                // Update existing archer
                state.archers[existingIndex] = { ...state.archers[existingIndex], ...normalizedArcher, targetAssignment: groupId };
            } else {
                // Add new archer
                state.archers.push(normalizedArcher);
            }
        });
        
        updateSelectedChip();
        saveData();
    }

    function handleFavoriteToggle(archer, isFavorite) {
        if (typeof ArcherModule === 'undefined') return;
        try {
            const extId = getExtIdFromArcher(archer);
            if (isFavorite) {
                ArcherModule.addFriend(extId);
            } else {
                ArcherModule.removeFriend(extId);
            }
            // Refresh roster to update favorites
            refreshArcherRoster();
        } catch (err) {
            console.error('Failed to toggle favorite:', err);
        }
    }

    function syncSelectorSelection() {
        if (!archerSelector) return;
        
        // Map state.archers to selector format
        const selection = {};
        RANKING_SELECTOR_GROUPS.forEach(group => {
            selection[group.id] = [];
        });
        
        state.archers.forEach(archer => {
            const target = archer.targetAssignment || 'A';
            if (selection[target]) {
                // Find archer in roster by extId
                const rosterState = getRosterState();
                const rosterArcher = rosterState.list.find(a => getExtIdFromArcher(a) === getExtIdFromArcher(archer));
                if (rosterArcher) {
                    selection[target].push(rosterArcher);
                }
            }
        });
        
        archerSelector.setSelection(selection);
    }

    // --- LOGIC ---

    function inferTargetSize(level = '') {
        const normalized = String(level || '').trim().toUpperCase();
        return (normalized === 'VAR' || normalized === 'V' || normalized === 'VARSITY') ? 122 : 80;
    }

    function getExtIdFromArcher(archer = {}) {
        if (!archer) return '';
        if (archer.extId) return archer.extId;
        if (archer.id) return String(archer.id);
        const first = (archer.first || archer.firstName || '').trim().toLowerCase();
        const last = (archer.last || archer.lastName || '').trim().toLowerCase();
        const school = (archer.school || '').trim().toLowerCase();
        return [first, last, school].filter(Boolean).join('-');
    }

    function getRosterState() {
        if (typeof ArcherModule === 'undefined') {
            return { list: [], selfExtId: '', selfArcher: null, friendSet: new Set() };
        }
        const list = ArcherModule.loadList() || [];
        let selfExtId = '';
        let selfArcher = null;
        if (typeof ArcherModule.getSelfExtId === 'function') {
            selfExtId = ArcherModule.getSelfExtId() || '';
        }
        if (selfExtId) {
            selfArcher = list.find(a => getExtIdFromArcher(a) === selfExtId) || null;
            if (!selfArcher) {
                selfExtId = '';
            }
        }
        const friendSet = new Set((selfArcher && Array.isArray(selfArcher.faves)) ? selfArcher.faves.filter(Boolean) : []);
        return { list, selfExtId, selfArcher, friendSet };
    }

    function getStateArcherByExtId(extId) {
        if (!extId) return null;
        return state.archers.find(a => {
            const candidate = a.extId || a.id;
            return candidate === extId;
        }) || null;
    }

    function buildStateArcherFromRoster(rosterArcher = {}, targetAssignment = 'A') {
        const extId = getExtIdFromArcher(rosterArcher);
        const firstName = (rosterArcher.first || rosterArcher.firstName || '').trim();
        const lastName = (rosterArcher.last || rosterArcher.lastName || '').trim();
        const nickname = (rosterArcher.nickname || rosterArcher.nick || '').trim();
        const school = (rosterArcher.school || '').trim();
        const grade = (rosterArcher.grade || '').trim();
        const gender = (rosterArcher.gender || '').trim();
        const level = (rosterArcher.level || '').trim();
        const status = (rosterArcher.status || 'active').trim().toLowerCase();
        const fallbackId = [firstName, lastName].filter(Boolean).join('-').toLowerCase() || `archer-${Date.now()}`;

        return {
            id: extId || fallbackId,
            extId: extId || '',
            firstName,
            lastName,
            nickname,
            school,
            grade,
            gender,
            level,
            status,
            targetAssignment: targetAssignment,
            targetSize: inferTargetSize(level),
            scores: Array(state.totalEnds).fill(null).map(() => ['', '', ''])
        };
    }

    function getArcherKey(archer) {
        if (!archer) return '';
        if (archer.id) return String(archer.id);
        if (archer.extId) return String(archer.extId);
        return getExtIdFromArcher(archer);
    }

    function findArcherByKey(key) {
        if (!key) return null;
        return state.archers.find(archer => getArcherKey(archer) === key) || null;
    }

    function updateSelectedChip() {
        const chip = document.getElementById('selected-count-chip');
        if (chip) chip.textContent = `${state.archers.length}/4`;
    }

    function pickNextTargetLetter() {
        const usedTargets = new Set(state.archers.map(a => (a.targetAssignment || '').toUpperCase()));
        const next = TARGET_LETTERS.find(letter => !usedTargets.has(letter));
        return next || TARGET_LETTERS[0];
    }

    function renderSetupForm() {
        if (!setupControls.container) return;
        
        // Pre-assigned mode: show read-only archer list
        if (state.assignmentMode === 'pre-assigned' && state.archers.length > 0) {
            renderPreAssignedArchers();
            updateSelectedChip();
            return;
        }
        
        // Manual mode: use ArcherSelector component
        if (!archerSelector) {
            initializeArcherSelector();
        } else {
            // Refresh roster and sync selection
            refreshArcherRoster();
            syncSelectorSelection();
        }
        updateSelectedChip();
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

    function renderArcherSelectList(rosterState = {}, filter = '') {
        if (!setupControls.container) return;
        setupControls.container.innerHTML = '';
        const listDiv = document.createElement('div');
        listDiv.className = 'archer-select-list';
        setupControls.container.appendChild(listDiv);

        const { list = [], selfExtId = '', friendSet = new Set() } = rosterState || {};
        if (!Array.isArray(list) || list.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.style.cssText = 'padding: 16px; text-align: center; color: #666;';
            emptyState.textContent = 'No archers found. Sync your roster from the Archer Management module to get started.';
            listDiv.appendChild(emptyState);
            return;
        }

        const normalizedFilter = String(filter || '').trim().toLowerCase();
        const friendLookup = friendSet instanceof Set ? friendSet : new Set(Array.isArray(friendSet) ? friendSet : []);
        const selectedExtIds = new Set();
        state.archers.forEach(a => {
            if (!a) return;
            const direct = a.extId || a.id;
            if (direct) selectedExtIds.add(direct);
            const derived = getExtIdFromArcher({
                extId: a.extId,
                id: a.id,
                first: a.first || a.firstName,
                last: a.last || a.lastName,
                school: a.school
            });
            if (derived) selectedExtIds.add(derived);
        });

        const prepared = list.map(original => {
            const extId = getExtIdFromArcher(original);
            const firstName = (original.first || original.firstName || '').trim();
            const lastName = (original.last || original.lastName || '').trim();
            const nickname = (original.nickname || original.nick || '').trim();
            const school = (original.school || '').trim();
            const grade = (original.grade || '').trim();
            const level = (original.level || '').trim();
            const status = (original.status || 'active').trim();
            const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || nickname || extId || 'Unknown Archer';
            const searchText = [
                displayName,
                nickname,
                school,
                grade,
                level,
                extId
            ].join(' ').toLowerCase();
            const matchesFilter = normalizedFilter ? searchText.includes(normalizedFilter) : true;
            const isSelf = !!selfExtId && extId === selfExtId;
            const isFriend = !!extId && friendLookup.has(extId);
            const isSelected = !!extId && selectedExtIds.has(extId);
            return {
                original,
                extId,
                firstName,
                lastName,
                nickname,
                school,
                grade,
                level,
                status,
                displayName,
                matchesFilter,
                isSelf,
                isFriend,
                isSelected
            };
        }).filter(item => item.matchesFilter);

        prepared.sort((a, b) => {
            const firstCmp = a.firstName.toLowerCase().localeCompare(b.firstName.toLowerCase(), undefined, { sensitivity: 'base' });
            if (firstCmp !== 0) return firstCmp;
            return a.lastName.toLowerCase().localeCompare(b.lastName.toLowerCase(), undefined, { sensitivity: 'base' });
        });

        const sections = [];
        const selfEntries = prepared.filter(item => item.isSelf);
        if (selfEntries.length) sections.push({ title: 'Who Am I', items: selfEntries });

        const friendEntries = prepared.filter(item => item.isFriend && !item.isSelf);
        if (friendEntries.length) sections.push({ title: 'Friends', items: friendEntries });

        const selectedEntries = prepared.filter(item => item.isSelected && !item.isSelf && !item.isFriend);
        if (selectedEntries.length) sections.push({ title: 'Selected', items: selectedEntries });

        const remainingEntries = prepared.filter(item => !item.isSelf && !item.isFriend && !item.isSelected);
        if (remainingEntries.length) {
            sections.push({
                title: normalizedFilter ? 'Search Results' : 'Roster',
                items: remainingEntries
            });
        }

        if (!sections.length) {
            const noResults = document.createElement('div');
            noResults.style.cssText = 'padding: 16px; text-align: center; color: #666;';
            noResults.textContent = 'No archers match your search.';
            listDiv.appendChild(noResults);
            return;
        }

        const createBadge = (label, background) => {
            const badge = document.createElement('span');
            badge.textContent = label;
            badge.style.cssText = `display:inline-block;margin-right:6px;padding:2px 8px;border-radius:999px;font-size:0.75em;color:#ffffff;background:${background};`;
            return badge;
        };

        const createRow = (item) => {
            const { original, extId, displayName, nickname, school, grade, level, status, isSelf, isFriend, isSelected } = item;
            const row = document.createElement('div');
            row.className = 'archer-select-row';
            if (status && status.toLowerCase() !== 'active') {
                row.style.opacity = '0.75';
            }

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = isSelected;
            checkbox.disabled = !extId || (status && status.toLowerCase() === 'inactive');
            checkbox.setAttribute('aria-label', `Select ${displayName}`);

            const star = document.createElement('span');
            star.textContent = isFriend ? '★' : '☆';
            star.className = 'favorite-star';
            star.style.color = isFriend ? '#ffc107' : '#ccc';
            star.setAttribute('role', 'button');
            star.setAttribute('tabindex', '0');
            if (isFriend) {
                star.setAttribute('aria-label', `Remove ${displayName} from friends`);
            } else {
                star.setAttribute('aria-label', `Add ${displayName} to friends`);
            }

            const infoWrapper = document.createElement('div');
            infoWrapper.style.flex = '1';
            infoWrapper.style.display = 'flex';
            infoWrapper.style.flexDirection = 'column';

            const nameLine = document.createElement('div');
            const nameLabel = document.createElement('span');
            nameLabel.className = 'archer-name-label';
            nameLabel.textContent = displayName;
            nameLine.appendChild(nameLabel);
            if (nickname) {
                const nicknameSpan = document.createElement('span');
                nicknameSpan.style.cssText = 'margin-left:6px;font-size:0.9em;color:#888;';
                nicknameSpan.textContent = `"${nickname}"`;
                nameLine.appendChild(nicknameSpan);
            }
            infoWrapper.appendChild(nameLine);

            const metaLine = document.createElement('div');
            metaLine.className = 'archer-details-label';
            const metaParts = [school, level, grade].filter(Boolean);
            metaLine.textContent = metaParts.join(' • ');
            infoWrapper.appendChild(metaLine);

            const badgeRow = document.createElement('div');
            badgeRow.style.cssText = 'margin-top:4px;display:flex;flex-wrap:wrap;';
            if (isSelf) badgeRow.appendChild(createBadge('Me', '#1976d2'));
            if (isFriend) badgeRow.appendChild(createBadge('Friend', '#ff9800'));
            if (isSelected) badgeRow.appendChild(createBadge('Selected', '#4caf50'));
            if (status && status.toLowerCase() === 'inactive') {
                badgeRow.appendChild(createBadge('Inactive', '#9e9e9e'));
            }
            if (badgeRow.childElementCount > 0) {
                infoWrapper.appendChild(badgeRow);
            }

            const targetSelect = document.createElement('select');
            targetSelect.className = 'target-assignment-select';
            TARGET_LETTERS.forEach(letter => {
                const option = document.createElement('option');
                option.value = letter;
                option.textContent = letter;
                targetSelect.appendChild(option);
            });
            const selectedArcher = extId ? getStateArcherByExtId(extId) : null;
            if (selectedArcher) {
                targetSelect.value = selectedArcher.targetAssignment || pickNextTargetLetter();
            }
            targetSelect.style.display = isSelected ? 'inline-block' : 'none';

            const handleSelectionChange = () => {
                const alreadySelected = extId ? getStateArcherByExtId(extId) : null;
                if (checkbox.checked) {
                    if (!extId) {
                        alert('This record is missing an external ID and cannot be selected yet.');
                        checkbox.checked = false;
                        return;
                    }
                    if (state.archers.length >= 4 && !alreadySelected) {
                        checkbox.checked = false;
                        alert('Bale is full (4 archers).');
                        return;
                    }
                    if (!alreadySelected) {
                        const nextTarget = pickNextTargetLetter();
                        const normalized = buildStateArcherFromRoster(original, nextTarget);
                        state.archers.push(normalized);
                    }
                } else if (alreadySelected) {
                    const removeId = getArcherKey(alreadySelected);
                    state.archers = state.archers.filter(a => getArcherKey(a) !== removeId);
                    if (removeId && state.syncStatus[removeId]) {
                        delete state.syncStatus[removeId];
                    }
                }
                saveData();
                updateSelectedChip();
                renderSetupForm();
            };

            checkbox.addEventListener('change', handleSelectionChange);

            row.addEventListener('click', (evt) => {
                const tag = evt.target && evt.target.tagName;
                if (tag === 'SELECT' || tag === 'INPUT' || evt.target === star) return;
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            });

            if (typeof ArcherModule !== 'undefined' && typeof ArcherModule.toggleFriend === 'function') {
                const toggleFriendHandler = async (event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    if (!extId) {
                        alert('Cannot update friends without an archer ID.');
                        return;
                    }
                    const selfId = ArcherModule.getSelfExtId ? ArcherModule.getSelfExtId() : '';
                    if (!selfId) {
                        alert('Set "Who Am I" in the Archer module to manage friends.');
                        return;
                    }
                    star.style.pointerEvents = 'none';
                    try {
                        await ArcherModule.toggleFriend(extId);
                        renderSetupForm();
                    } catch (err) {
                        console.error('Friend toggle failed', err);
                        alert(err && err.message ? err.message : 'Could not update friends. Try again.');
                    } finally {
                        star.style.pointerEvents = '';
                    }
                };
                star.addEventListener('click', toggleFriendHandler);
                star.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        toggleFriendHandler(event);
                    }
                });
            } else {
                star.style.opacity = '0.4';
                star.title = 'Update available soon';
            }

            targetSelect.addEventListener('change', (event) => {
                event.stopPropagation();
                const selected = extId ? getStateArcherByExtId(extId) : null;
                if (selected) {
                    selected.targetAssignment = targetSelect.value;
                    saveData();
                }
            });
            targetSelect.addEventListener('click', (event) => event.stopPropagation());

            row.appendChild(checkbox);
            row.appendChild(star);
            row.appendChild(infoWrapper);
            row.appendChild(targetSelect);
            return row;
        };

        sections.forEach(section => {
            const header = document.createElement('div');
            header.className = 'list-header';
            header.textContent = section.title;
            listDiv.appendChild(header);
            section.items.forEach(item => {
                const row = createRow(item);
                listDiv.appendChild(row);
            });
        });
    }
    
    // Function to load entire bale when clicking on any archer
    function loadEntireBale(baleNumber, archersInBale) {
        // Clear existing archers
        state.archers = [];
        state.baleNumber = parseInt(baleNumber);
        
        // Add all archers from this bale
        const targets = TARGET_LETTERS.slice();
        archersInBale.forEach((archer, index) => {
            const targetAssignment = archer.target || targets[index] || pickNextTargetLetter();
            const normalized = buildStateArcherFromRoster({
                first: archer.first || archer.first_name,
                last: archer.last || archer.last_name,
                nickname: archer.nickname,
                school: archer.school,
                level: archer.level,
                gender: archer.gender,
                status: archer.status
            }, targetAssignment);
            state.archers.push(normalized);
        });
        
        saveData();
        renderSetupForm();
        updateSelectedChip();
        
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
            <div class="overflow-x-auto -mx-6 px-6">
                <table class="w-full border-collapse text-xs sm:text-sm bg-white dark:bg-gray-700 min-w-[500px]">
                    <thead class="bg-primary dark:bg-primary-dark text-white sticky top-0">
                        <tr>
                            <th class="px-1.5 sm:px-2 py-1.5 sm:py-2 text-left font-bold sticky left-0 bg-primary dark:bg-primary-dark z-10 max-w-[80px] sm:max-w-[100px]">Archer</th>
                            <th class="px-1 py-1.5 sm:py-2 text-center font-bold w-10 sm:w-12">A1</th>
                            <th class="px-1 py-1.5 sm:py-2 text-center font-bold w-10 sm:w-12">A2</th>
                            <th class="px-1 py-1.5 sm:py-2 text-center font-bold w-10 sm:w-12">A3</th>
                            <th class="px-1 py-1.5 sm:py-2 text-center font-bold w-10 sm:w-12">End</th>
                            <th class="px-1 py-1.5 sm:py-2 text-center font-bold w-10 sm:w-12">Run</th>
                            <th class="px-1 py-1.5 sm:py-2 text-center font-bold w-8 sm:w-10">X</th>
                            <th class="px-1 py-1.5 sm:py-2 text-center font-bold w-8 sm:w-10">10</th>${isLiveEnabled ? '<th class="px-1 py-1.5 sm:py-2 text-center font-bold w-8 sm:w-10">⟳</th>' : ''}<th class="px-1 py-1.5 sm:py-2 text-center font-bold w-10 sm:w-12">Card</th>
                        </tr>
                    </thead>
                    <tbody>`;
        state.archers.forEach(archer => {
            const archerKey = getArcherKey(archer);
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
            const archerSync = archerKey ? state.syncStatus[archerKey] : null;
            const syncStatus = (archerSync && archerSync[state.currentEnd]) || '';
            const syncIcon = getSyncStatusIcon(syncStatus);
            
            const lastInitial = archer.lastName ? `${archer.lastName.charAt(0)}.` : '';
            const nameDisplay = [archer.firstName, lastInitial].filter(Boolean).join(' ');
            const rowBgClass = state.archers.indexOf(archer) % 2 === 0 ? 'bg-white dark:bg-gray-700' : 'bg-gray-50 dark:bg-gray-800';
            tableHTML += `
                <tr class="border-b border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-600 ${rowBgClass}" data-archer-id="${archerKey}">
                    <td class="px-1.5 sm:px-2 py-0.5 text-left font-semibold sticky left-0 ${rowBgClass} dark:text-white z-10 max-w-[80px] sm:max-w-[100px] text-xs sm:text-sm truncate" title="${nameDisplay} (${archer.targetAssignment})">${nameDisplay} (${archer.targetAssignment})</td>
                    <td class="p-0 border-r border-gray-200 dark:border-gray-600">
                        <input type="text" class="score-input bg-score-${getScoreColorClass(safeEndScores[0])} ${getScoreTextColor(safeEndScores[0])}" data-archer-id="${archerKey}" data-arrow-idx="0" value="${safeEndScores[0] || ''}" readonly>
                    </td>
                    <td class="p-0 border-r border-gray-200 dark:border-gray-600">
                        <input type="text" class="score-input bg-score-${getScoreColorClass(safeEndScores[1])} ${getScoreTextColor(safeEndScores[1])}" data-archer-id="${archerKey}" data-arrow-idx="1" value="${safeEndScores[1] || ''}" readonly>
                    </td>
                    <td class="p-0 border-r border-gray-200 dark:border-gray-600">
                        <input type="text" class="score-input bg-score-${getScoreColorClass(safeEndScores[2])} ${getScoreTextColor(safeEndScores[2])}" data-archer-id="${archerKey}" data-arrow-idx="2" value="${safeEndScores[2] || ''}" readonly>
                    </td>
                    <td class="px-1 py-0.5 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold border-r border-gray-200 dark:border-gray-600 text-xs sm:text-sm">${endTotal}</td>
                    <td class="px-1 py-0.5 text-center bg-gray-100 dark:bg-gray-400 dark:text-white border-r border-gray-200 dark:border-gray-600 text-xs sm:text-sm">${runningTotal}</td>
                    <td class="px-1 py-0.5 text-center bg-gray-100 dark:bg-gray-400 dark:text-white border-r border-gray-200 dark:border-gray-600 text-xs sm:text-sm">${endXs}</td>
                    <td class="px-1 py-0.5 text-center bg-gray-100 dark:bg-gray-400 dark:text-white border-r border-gray-200 dark:border-gray-600 text-xs sm:text-sm">${endTens + endXs}</td>${isLiveEnabled ? `<td class="px-1 py-0.5 text-center sync-status-indicator sync-status-${syncStatus}">${syncIcon}</td>` : ''}<td class="px-1 py-0.5 text-center">
                        <button class="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-primary text-white rounded text-xs hover:bg-primary-dark view-card-btn" data-archer-id="${archerKey}">📄</button>
                    </td>
                </tr>`;
        });
        tableHTML += `</tbody></table></div>`;
        scoringControls.container.innerHTML = tableHTML;
    }
    
    function renderCardView(archerId) {
        const archer = findArcherByKey(archerId);
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
        table.className = 'w-full border-collapse text-sm bg-white dark:bg-gray-700';
        table.dataset.archerId = archerId;
            table.innerHTML = `
            <thead class="bg-primary dark:bg-primary-dark text-white">
                <tr>
                    <th class="px-2 py-2 text-center font-bold w-12">E</th>
                    <th class="px-2 py-2 text-center font-bold w-12">A1</th>
                    <th class="px-2 py-2 text-center font-bold w-12">A2</th>
                    <th class="px-2 py-2 text-center font-bold w-12">A3</th>
                    <th class="px-2 py-2 text-center font-bold w-12">10s</th>
                    <th class="px-2 py-2 text-center font-bold w-12">Xs</th>
                    <th class="px-2 py-2 text-center font-bold w-14">END</th>
                    <th class="px-2 py-2 text-center font-bold w-14">RUN</th>
                    <th class="px-2 py-2 text-center font-bold w-12">AVG</th>
                </tr>
            </thead>`;
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
            let avgBgClass = '';
            let avgTextClass = '';
            if (isComplete) {
                const avgNum = parseFloat(avg);
                if (avgNum >= 9) { avgBgClass = 'bg-score-gold'; avgTextClass = 'text-black dark:text-black'; }
                else if (avgNum >= 7) { avgBgClass = 'bg-score-red'; avgTextClass = 'text-white dark:text-white'; }
                else if (avgNum >= 5) { avgBgClass = 'bg-score-blue'; avgTextClass = 'text-white dark:text-white'; }
                else if (avgNum >= 3) { avgBgClass = 'bg-score-black'; avgTextClass = 'text-white dark:text-white'; }
                else { avgBgClass = 'bg-score-white'; avgTextClass = 'text-black dark:text-black'; }
            }
            const rowBgClass = i % 2 === 0 ? '' : 'bg-gray-50 dark:bg-gray-800';
            tableHTML += `
                <tr class="border-b border-gray-200 dark:border-gray-600 ${rowBgClass}">
                    <td class="px-1 py-0.5 text-center font-semibold dark:text-white">${endNum}</td>
                    ${endScores.map(s => {
                        const colorClass = getScoreColorClass(s);
                        const textClass = getScoreTextColor(s);
                        return `<td class="px-1 py-0.5 text-center bg-score-${colorClass} ${textClass} font-bold">${s || ''}</td>`;
                    }).join('')}
                    <td class="px-1 py-0.5 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold">${isComplete ? (endTens + endXs) : ''}</td>
                    <td class="px-1 py-0.5 text-center bg-gray-100 dark:bg-gray-400 dark:text-white">${isComplete ? endXs : ''}</td>
                    <td class="px-1 py-0.5 text-center bg-gray-100 dark:bg-gray-400 dark:text-white font-bold">${isComplete ? endTotal : ''}</td>
                    <td class="px-1 py-0.5 text-center bg-gray-100 dark:bg-gray-400 dark:text-white">${isComplete ? runningTotal : ''}</td>
                    <td class="px-1 py-0.5 text-center ${avgBgClass} ${avgTextClass} font-bold">${avg}</td>
                </tr>`;
        }
        tbody.innerHTML = tableHTML;
        table.appendChild(tbody);
        const tfoot = table.createTFoot();
        tfoot.className = 'bg-gray-200 dark:bg-gray-600';
        const footerRow = tfoot.insertRow();
        let finalAvg = 0, finalAvgBgClass = '', finalAvgTextClass = '';
        const completedEnds = archer.scores.filter(s => s.every(val => val !== '')).length;
        if (completedEnds > 0) {
            finalAvg = (runningTotal / (completedEnds * 3)).toFixed(1);
            const avgNum = parseFloat(finalAvg);
            if (avgNum >= 9) { finalAvgBgClass = 'bg-score-gold'; finalAvgTextClass = 'text-black dark:text-black'; }
            else if (avgNum >= 7) { finalAvgBgClass = 'bg-score-red'; finalAvgTextClass = 'text-white dark:text-white'; }
            else if (avgNum >= 5) { finalAvgBgClass = 'bg-score-blue'; finalAvgTextClass = 'text-white dark:text-white'; }
            else if (avgNum >= 3) { finalAvgBgClass = 'bg-score-black'; finalAvgTextClass = 'text-white dark:text-white'; }
            else { finalAvgBgClass = 'bg-score-white'; finalAvgTextClass = 'text-black dark:text-black'; }
        }
        footerRow.innerHTML = `
            <td colspan="4" class="px-2 py-2 text-right font-bold dark:text-white">Round Totals:</td>
            <td class="px-2 py-2 text-center font-bold dark:text-white">${totalTensOverall + totalXsOverall}</td>
            <td class="px-2 py-2 text-center font-bold dark:text-white">${totalXsOverall}</td>
            <td class="px-2 py-2 text-center font-bold dark:text-white"></td>
            <td class="px-2 py-2 text-center font-bold dark:text-white">${runningTotal}</td>
            <td class="px-2 py-2 text-center font-bold ${finalAvgBgClass} ${finalAvgTextClass}">${finalAvg > 0 ? finalAvg : ''}</td>`;
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
        // New 4x3 layout: Tailwind CSS, no gaps, no navigation buttons, edge-to-edge borders
        keypad.element.innerHTML = `
            <div class="grid grid-cols-4 gap-0 w-full">
                <!-- Row 1: X, 10, 9, M -->
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-gold text-black min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98" data-value="X">X</button>
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-gold text-black min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98" data-value="10">10</button>
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-gold text-black min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98" data-value="9">9</button>
                <button class="keypad-btn p-4 text-xl font-bold border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-gray-200 dark:bg-gray-200 text-black dark:text-black min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98" data-value="M">M</button>
                
                <!-- Row 2: 8, 7, 6, 5 -->
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-red text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98" data-value="8">8</button>
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-red text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98" data-value="7">7</button>
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-blue text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98" data-value="6">6</button>
                <button class="keypad-btn p-4 text-xl font-bold border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-blue text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98" data-value="5">5</button>
                
                <!-- Row 3: 4, 3, 2, 1 -->
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-black text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98" data-value="4">4</button>
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-black text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98" data-value="3">3</button>
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-white text-black min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98" data-value="2">2</button>
                <button class="keypad-btn p-4 text-xl font-bold border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-white text-black min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98" data-value="1">1</button>
                
                <!-- Row 4: CLOSE (left), CLEAR (right) -->
                <button class="keypad-btn p-4 text-lg font-bold border-r border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 col-span-2" data-action="close">CLOSE</button>
                <button class="keypad-btn p-4 text-lg font-bold cursor-pointer transition-all duration-150 flex items-center justify-center bg-danger-light dark:bg-danger-dark text-danger-dark dark:text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 col-span-2" data-action="clear">CLEAR</button>
            </div>
        `;
    }

    function handleKeypadClick(e) {
        const button = e.target.closest('.keypad-btn');
        if (!button || !keypad.currentlyFocusedInput) return;
        const action = button.dataset.action;
        const value = button.dataset.value;
        const input = keypad.currentlyFocusedInput;
        const allInputs = Array.from(document.querySelectorAll('#scoring-view .score-input'));
        const currentIndex = allInputs.indexOf(input);
        
        // Handle action buttons
        if (action === 'close') {
            keypad.element.classList.add('hidden');
            document.body.classList.remove('keypad-visible');
            return;
        }
        
        if (action === 'clear') {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            // Keep focus on current input after clear
            const currentInputInNewDom = document.querySelector(`[data-archer-id="${input.dataset.archerId}"][data-arrow-idx="${input.dataset.arrowIdx}"]`);
            if (currentInputInNewDom) currentInputInNewDom.focus();
            return;
        }
        
        // Handle score value entry
        if (value) {
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Auto-advance to next input if available
            if (currentIndex < allInputs.length - 1) {
                const nextInputInOldList = allInputs[currentIndex + 1];
                const nextInputInNewDom = document.querySelector(`[data-archer-id="${nextInputInOldList.dataset.archerId}"][data-arrow-idx="${nextInputInOldList.dataset.arrowIdx}"]`);
                if (nextInputInNewDom) {
                    nextInputInNewDom.focus();
                } else {
                    // If next input not found, hide keypad
                    keypad.element.classList.add('hidden');
                    document.body.classList.remove('keypad-visible');
                }
            } else {
                // Last input, hide keypad
                keypad.element.classList.add('hidden');
                document.body.classList.remove('keypad-visible');
            }
        }
    }

    function handleScoreInput(e) {
        const input = e.target;
        const archerId = input.dataset.archerId;
        const arrowIndex = parseInt(input.dataset.arrowIdx, 10);
        const archer = findArcherByKey(archerId);
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
                    // Per-end values
                    let endTotal = 0, tens = 0, xs = 0;
                    [a1,a2,a3].forEach(s => {
                        const u = String(s).toUpperCase();
                        if (!u) return;
                        if (u === 'X') { endTotal += 10; xs++; tens++; }
                        else if (u === '10') { endTotal += 10; tens++; }
                        else if (u === 'M') { /* zero */ }
                        else if (/^[0-9]$|^10$/.test(u)) { endTotal += parseInt(u, 10); }
                    });
                    // Running total across all ends up to current
                    let running = 0;
                    for (let i = 0; i < state.currentEnd; i++) {
                        const scores = archer.scores[i];
                        if (!Array.isArray(scores)) continue;
                        scores.forEach(s => {
                            const u = String(s).toUpperCase();
                            if (!u) return;
                            if (u === 'X' || u === '10') running += 10;
                            else if (u === 'M') { /* zero */ }
                            else if (/^[0-9]$|^10$/.test(u)) { running += parseInt(u, 10); }
                        });
                    }
                    
                    const archerKey = getArcherKey(archer);
                    if (!archerKey) {
                        console.warn('Cannot sync archer without identifier', archer);
                        return;
                    }

                    // Debug logging
                    console.log('Live update attempt:', { 
                        enabled: isEnabled, 
                        hasLiveUpdates: !!LiveUpdates, 
                        hasState: !!LiveUpdates._state, 
                        roundId: LiveUpdates._state?.roundId,
                        archerId: archerKey,
                        endNumber: state.currentEnd,
                        scores: { a1, a2, a3, endTotal, runningTotal: running, tens, xs }
                    });
                    
                    // Set sync status to pending
                    updateSyncStatus(archerKey, state.currentEnd, 'pending');
                    
                    if (LiveUpdates._state && LiveUpdates._state.roundId) {
                        LiveUpdates.postEnd(archerKey, state.currentEnd, { a1, a2, a3, endTotal, runningTotal: running, tens, xs })
                          .then(() => updateSyncStatus(archerKey, state.currentEnd, 'synced'))
                          .catch(() => updateSyncStatus(archerKey, state.currentEnd, 'failed'));
                    } else {
                        const badge = document.getElementById('live-status-badge');
                        if (badge) { badge.textContent = 'Not Synced'; badge.className = 'inline-block px-2 py-1 text-xs font-bold rounded bg-warning-light dark:bg-warning-dark text-warning-dark dark:text-white'; }
                        LiveUpdates.ensureRound({ roundType: 'R360', date: new Date().toISOString().slice(0, 10), baleNumber: state.baleNumber })
                          .then(() => LiveUpdates.ensureArcher(archerKey, { ...archer, targetSize: archer.targetSize || ((archer.level === 'VAR' || archer.level === 'V' || archer.level === 'Varsity') ? 122 : 80) }))
                          .then(() => LiveUpdates.postEnd(archerKey, state.currentEnd, { a1, a2, a3, endTotal, runningTotal: running, tens, xs }))
                          .then(() => updateSyncStatus(archerKey, state.currentEnd, 'synced'))
                          .catch(err => {
                            console.error('Live init/post failed:', err);
                            updateSyncStatus(archerKey, state.currentEnd, 'failed');
                          });
                    }
                }
            } catch (e) { 
                console.error('Live update error:', e);
                const fallbackKey = getArcherKey(archer);
                if (fallbackKey) updateSyncStatus(fallbackKey, state.currentEnd, 'failed');
            }
        }
    }

    function updateSyncStatus(archerId, endNumber, status) {
        if (!archerId) return;
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
        updateSelectedChip();
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

    // Verify entry code and auto-load event
    async function verifyAndLoadEventByCode(eventId, entryCode) {
        try {
            const res = await fetch(`${API_BASE}/events/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId, entryCode })
            });
            
            const data = await res.json();
            
            if (!data.verified) {
                alert(`Entry code invalid: ${data.error || 'Unknown error'}`);
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
                const snapshot = eventData.snapshot;
                
                if (snapshot && snapshot.divisions) {
                    // Extract all archers
                    const allArchers = [];
                    Object.keys(snapshot.divisions).forEach(divKey => {
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
                    
                    // Save to localStorage
                    localStorage.setItem('archery_master_list', JSON.stringify(allArchers));
                    console.log(`Loaded ${allArchers.length} archers from event`);
                }
                
                renderSetupForm();
                return true;
            } catch (err) {
                console.error('Failed to load event data:', err);
                alert('Entry code verified, but failed to load event data');
                return false;
            }
        } catch (err) {
            console.error('Failed to verify entry code:', err);
            alert('Failed to verify entry code. Please check your connection.');
            return false;
        }
    }
    
    // Load event information for display (PUBLIC - no authentication required)
    async function loadEventInfo() {
        try {
            const today = new Date().toISOString().slice(0, 10);
            
            // Fetch events from public API endpoint
            const res = await fetch(`${API_BASE}/events/recent`);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            const data = await res.json();
            
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
            const snapshot = data.snapshot;
            
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
                state.archers = foundArchers.map(a => {
                    const nameParts = String(a.archerName || '').trim().split(/\s+/);
                    const firstName = nameParts.shift() || '';
                    const lastName = nameParts.join(' ');
                    const extId = getExtIdFromArcher({
                        extId: a.extId || a.archerExtId,
                        id: a.roundArcherId,
                        first: firstName,
                        last: lastName,
                        school: a.school
                    });
                    return {
                        id: a.roundArcherId || extId || `${firstName}-${lastName}`.toLowerCase(),
                        extId: extId || '',
                        firstName,
                        lastName,
                        school: a.school || '',
                        level: a.level || 'VAR',
                        gender: a.gender || 'M',
                        status: (a.status || 'active').toLowerCase(),
                        targetAssignment: a.target || 'A',
                        targetSize: inferTargetSize(a.level),
                        scores: Array(state.totalEnds).fill(null).map(() => ['', '', ''])
                    };
                });
                
                state.activeEventId = eventId;
                state.assignmentMode = 'pre-assigned';
                state.divisionName = divisionName;
                
                console.log(`Pre-assigned mode: ${foundArchers.length} archers on bale ${state.baleNumber} (${divisionName})`);
                saveData();
                renderSetupForm();
                updateSelectedChip();
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
                const archerKey = getArcherKey(archer);
                if (!archerKey) continue;
                if (!LiveUpdates._state.archerIds[archerKey]) {
                    await LiveUpdates.ensureArcher(archerKey, {
                        ...archer,
                        targetSize: archer.targetSize || ((archer.level === 'VAR' || archer.level === 'V' || archer.level === 'Varsity') ? 122 : 80)
                    });
                }
            }
            
            // Sync all ends for all archers
            for (const archer of state.archers) {
                const archerKey = getArcherKey(archer);
                if (!archerKey) continue;
                for (let endNum = 1; endNum <= state.totalEnds; endNum++) {
                    const endScores = archer.scores[endNum - 1];
                    if (!endScores || !Array.isArray(endScores)) continue;
                    
                    // Only sync if end has at least one score
                    const hasScores = endScores.some(s => s !== '' && s !== null);
                    if (!hasScores) continue;
                    
                    // Check sync status - sync if pending, failed, or never synced
                    const currentSync = state.syncStatus[archerKey];
                    const currentStatus = (currentSync && currentSync[endNum]) || '';
                    if (currentStatus === 'synced') continue; // Skip already synced
                    
                    totalAttempts++;
                    const [a1, a2, a3] = [endScores[0] || '', endScores[1] || '', endScores[2] || ''];
                    // Per-end numbers
                    let endTotal = 0, tens = 0, xs = 0;
                    [a1, a2, a3].forEach(s => {
                        const u = String(s).toUpperCase();
                        if (!u) return;
                        if (u === 'X') { endTotal += 10; xs++; tens++; }
                        else if (u === '10') { endTotal += 10; tens++; }
                        else if (u === 'M') { /* zero */ }
                        else if (/^[0-9]$|^10$/.test(u)) { endTotal += parseInt(u, 10); }
                    });
                    // Running total up to this end
                    let running = 0;
                    for (let i = 0; i < endNum; i++) {
                        if (archer.scores[i] && Array.isArray(archer.scores[i])) {
                            archer.scores[i].forEach(s => {
                                const u = String(s).toUpperCase();
                                if (!u) return;
                                if (u === 'X' || u === '10') running += 10;
                                else if (u === 'M') { /* zero */ }
                                else if (/^[0-9]$|^10$/.test(u)) { running += parseInt(u, 10); }
                            });
                        }
                    }
                    
                    try {
                        updateSyncStatus(archerKey, endNum, 'pending');
                        await LiveUpdates.postEnd(archerKey, endNum, { 
                            a1, a2, a3, endTotal, runningTotal: running, tens, xs 
                        });
                        updateSyncStatus(archerKey, endNum, 'synced');
                        successCount++;
                    } catch (e) {
                        console.error(`Failed to sync archer ${archerKey} end ${endNum}:`, e);
                        updateSyncStatus(archerKey, endNum, 'failed');
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

    async function init() {
        console.log("Initializing Ranking Round App...");
        loadData();
        renderKeypad();
        renderView();
        
        // Check for URL parameters (QR code access)
        if (urlEventId && urlEntryCode) {
            console.log('QR code detected - verifying entry code...');
            const verified = await verifyAndLoadEventByCode(urlEventId, urlEntryCode);
            if (verified) {
                // Event loaded successfully - skip normal event loading
                console.log('Event loaded from QR code');
            } else {
                // Verification failed - load normal event list
                await loadEventInfo();
            }
        } else {
            // Normal load
            await loadEventInfo();
        }

        const baleNumberInput = document.getElementById('bale-number-input');
        if (baleNumberInput) {
            baleNumberInput.value = state.baleNumber;
            baleNumberInput.onchange = async () => {
                const newBale = parseInt(baleNumberInput.value, 10) || 1;
                state.baleNumber = newBale;
                saveData();
                
                // If event is selected, try to load archers for this bale
                if (state.selectedEventId) {
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
                
                // Load archers from this event
                if (state.selectedEventId) {
                    try {
                        // Load all archers from this event to show in the list
                        const res = await fetch(`${API_BASE}/events/${state.selectedEventId}/snapshot`);
                        if (!res.ok) {
                            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                        }
                        const data = await res.json();
                        const snapshot = data.snapshot;
                        
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
                    }
                }
            };
        }

        if (setupControls.subheader) {
            setupControls.subheader.innerHTML = '';
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.placeholder = 'Search archers...';
            searchInput.className = 'flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-colors';
            searchInput.value = state.rosterFilter || '';
            searchInput.oninput = () => {
                state.rosterFilter = searchInput.value;
                if (archerSelector) {
                    archerSelector.setFilter(searchInput.value);
                } else {
                    renderSetupForm();
                }
            };
            const refreshBtn = document.createElement('button');
            refreshBtn.id = 'refresh-btn';
            refreshBtn.className = 'px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark font-semibold transition-colors min-h-[44px]';
            refreshBtn.textContent = 'Refresh';
            refreshBtn.onclick = async () => { await ArcherModule.loadDefaultCSVIfNeeded(true); renderSetupForm(); };
            const selectedChip = document.createElement('span');
            selectedChip.className = 'px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg font-semibold cursor-default min-h-[44px] flex items-center';
            selectedChip.textContent = `${state.archers.length}/4`;
            const syncBtn = document.createElement('button');
            syncBtn.id = 'sync-db-btn';
            syncBtn.className = 'px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark font-semibold transition-colors min-h-[44px]';
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
            liveBtn.className = 'px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark font-semibold transition-colors min-h-[44px]';
            const getLiveEnabled = () => { try { return !!(JSON.parse(localStorage.getItem('live_updates_config')||'{}').enabled); } catch(_) { return false; } };
            const setLiveEnabled = (v) => { try { if (window.LiveUpdates && LiveUpdates.saveConfig) LiveUpdates.saveConfig({ enabled: !!v }); else localStorage.setItem('live_updates_config', JSON.stringify({ enabled: !!v })); } catch(_) {} };
            const renderLiveBtn = () => { 
                const on = getLiveEnabled(); 
                liveBtn.textContent = on ? 'Live: On' : 'Live: Off'; 
                liveBtn.className = on 
                    ? 'px-4 py-2 bg-success text-white rounded-lg hover:bg-success-dark font-semibold transition-colors min-h-[44px]' 
                    : 'px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark font-semibold transition-colors min-h-[44px]'; 
            };
            renderLiveBtn();
            
            const masterSyncBtn = document.createElement('button');
            masterSyncBtn.id = 'master-sync-btn';
            masterSyncBtn.className = 'px-4 py-2 bg-warning text-gray-800 rounded-lg hover:bg-warning-dark font-semibold transition-colors min-h-[44px] text-sm';
            masterSyncBtn.textContent = 'Master Sync';
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
                    const ensureArcher = (archer) => {
                        const key = getArcherKey(archer);
                        if (!key) return;
                        LiveUpdates.ensureArcher(key, {
                            ...archer,
                            targetSize: archer.targetSize || inferTargetSize(archer.level)
                        });
                    };
                    if (!LiveUpdates._state.roundId) {
                        LiveUpdates.ensureRound({ roundType: 'R360', date: new Date().toISOString().slice(0, 10), baleNumber: state.baleNumber })
                          .then(() => { state.archers.forEach(ensureArcher); })
                          .catch(() => {});
                    } else {
                        state.archers.forEach(ensureArcher);
                    }
                    const badge = document.getElementById('live-status-badge');
                    if (badge) { badge.textContent = 'Not Synced'; badge.className = 'inline-block px-2 py-1 text-xs font-bold rounded bg-warning-light dark:bg-warning-dark text-warning-dark dark:text-white'; }
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
            resetBtn.className = 'px-4 py-2 bg-danger text-white rounded-lg hover:bg-danger-dark font-semibold transition-colors min-h-[44px]';
            resetBtn.textContent = 'Reset';
            resetBtn.onclick = () => resetModal.element.style.display = 'flex';
            const scoringBtn = document.createElement('button');
            scoringBtn.id = 'scoring-btn';
            scoringBtn.className = 'px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold transition-colors min-h-[44px] ml-auto';
            scoringBtn.textContent = 'Scoring';
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
                keypad.element.classList.remove('hidden');
                document.body.classList.add('keypad-visible');
            }
        });

        document.body.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-card-btn')) {
                const archerId = e.target.dataset.archerId;
                showArcherScorecardModal(archerId);
                if (keypad.element) keypad.element.classList.add('hidden');
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
                const ensureArcher = (archer) => {
                    const key = getArcherKey(archer);
                    if (!key) return;
                    LiveUpdates.ensureArcher(key, {
                        ...archer,
                        targetSize: archer.targetSize || inferTargetSize(archer.level)
                    });
                };
                if (!LiveUpdates._state.roundId && isEnabled) {
                    LiveUpdates.ensureRound({
                        roundType: 'R360',
                        date: new Date().toISOString().slice(0, 10),
                        baleNumber: state.baleNumber,
                    }).then(() => {
                        state.archers.forEach(ensureArcher);
                    }).catch(() => {});
                } else if (isEnabled) {
                    state.archers.forEach(ensureArcher);
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
                if (liveOn) { badge.textContent = 'Not Synced'; badge.className = 'inline-block px-2 py-1 text-xs font-bold rounded bg-warning-light dark:bg-warning-dark text-warning-dark dark:text-white'; }
                else { badge.textContent = 'Not Live Scoring'; badge.className = 'inline-block px-2 py-1 text-xs font-bold rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'; }
            }
            window.addEventListener('liveSyncPending', (e) => {
                const id = e.detail.archerId;
                const row = document.querySelector(`tr[data-archer-id="${id}"]`);
                if (row) row.classList.add('sync-pending');
                const badge = document.getElementById('live-status-badge');
                if (badge) { badge.textContent = 'Not Synced'; badge.className = 'inline-block px-2 py-1 text-xs font-bold rounded bg-warning-light dark:bg-warning-dark text-warning-dark dark:text-white'; }
            });
            window.addEventListener('liveSyncSuccess', (e) => {
                const id = e.detail.archerId;
                const row = document.querySelector(`tr[data-archer-id="${id}"]`);
                if (row) { row.classList.remove('sync-pending'); row.classList.add('sync-ok'); setTimeout(()=>row.classList.remove('sync-ok'),1200); }
                const badge = document.getElementById('live-status-badge');
                if (badge) { badge.textContent = 'Synced'; badge.className = 'inline-block px-2 py-1 text-xs font-bold rounded bg-success-light dark:bg-success-dark text-success-dark dark:text-white'; }
            });
        } catch (e) { /* noop */ }
    }

    function loadSampleData() {
        state.archers = [
            buildStateArcherFromRoster({ extId: 'mike-a-wdv', first: 'Mike', last: 'A.', school: 'WDV', level: 'VAR', gender: 'M' }, 'A'),
            buildStateArcherFromRoster({ extId: 'robert-b-wdv', first: 'Robert', last: 'B.', school: 'WDV', level: 'VAR', gender: 'M' }, 'B'),
            buildStateArcherFromRoster({ extId: 'terry-c-opp', first: 'Terry', last: 'C.', school: 'OPP', level: 'JV', gender: 'M' }, 'C'),
            buildStateArcherFromRoster({ extId: 'susan-d-opp', first: 'Susan', last: 'D.', school: 'OPP', level: 'VAR', gender: 'F' }, 'D'),
        ];
        const sampleScores = [
            [['10','9','7'], ['8','6','M'], ['5','4','3'], ['10','9','7'], ['X','10','8'], ['X','X','X'],['9','9','8'], ['10','X','X'], ['7','6','5'], ['X','X','9'], ['10','10','10'], ['8','8','7']],
            [['X','9','9'], ['8','8','7'], ['5','5','5'], ['6','6','7'], ['8','9','10'], ['7','7','6'],['10','9','9'], ['X','X','8'], ['9','8','7'], ['6','5','M'], ['7','7','8'], ['9','9','10']],
            [['X','7','7'], ['7','7','7'], ['10','7','10'], ['5','4','M'], ['8','7','6'], ['5','4','3'],['9','8','X'], ['10','7','6'], ['9','9','9'], ['8','8','M'], ['7','6','X'], ['10','9','8']],
            [['9','9','8'], ['10','9','8'], ['X','9','8'], ['7','7','6'], ['10','10','9'], ['X','9','9'],['8','8','7'], ['9','9','9'], ['10','X','9'], ['8','7','6'], ['X','X','X'], ['9','9','8']]
        ];
        state.archers.forEach((archer, idx) => {
            archer.scores = sampleScores[idx];
        });
        updateSelectedChip();
        saveData();
    }

    function navigateArchers(direction) {
        const currentArcherId = state.activeArcherId;
        const currentIndex = state.archers.findIndex(a => getArcherKey(a) === currentArcherId);
        if (currentIndex === -1) {
            console.error("Could not find active archer in state.");
            return;
        }
        let nextIndex = currentIndex + direction;
        if (nextIndex >= state.archers.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = state.archers.length - 1;
        const nextArcherId = getArcherKey(state.archers[nextIndex]);
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
            const archer = findArcherByKey(state.activeArcherId);
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
        const archer = findArcherByKey(state.activeArcherId);
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
                id: getArcherKey(archer),
                extId: archer.extId || '',
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
        
        const archer = findArcherByKey(state.activeArcherId);
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
        const archer = findArcherByKey(state.activeArcherId);
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
