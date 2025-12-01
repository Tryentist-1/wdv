/**
 * js/ranking_round_300.js
 * 
 * 300 Round variant: 10 ends of 3 arrows. Bale-centric UI.
 */

document.addEventListener('DOMContentLoaded', () => {

    // API Configuration - Detect localhost for local dev
    const getApiBase = () => {
        if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            const port = window.location.port || '8001';
            return `${window.location.protocol}//${window.location.hostname}:${port}/api/index.php/v1`;
        }
        return 'https://tryentist.com/wdv/api/v1';
    };
    const API_BASE = getApiBase();

    /**
     * Safely set the archer cookie so future flows that rely on the
     * `oas_archer_id` cookie (index.html, history lookups, etc.) load
     * the correct archer after a direct-link resume.
     *
     * NOTE:
     * - `setCookie` is defined in common.js for the browser.
     * - In non-browser/test environments we silently no-op.
     */
    function setArcherCookieSafe(archerId) {
        try {
            if (!archerId) {
                console.warn('[setArcherCookieSafe] No archerId provided');
                return;
            }

            if (typeof setCookie === 'function') {
                // 1 year expiry, matches getArcherCookie behaviour
                setCookie('oas_archer_id', archerId, 365);
                console.log('[setArcherCookieSafe] ✅ Archer cookie set to:', archerId);
            } else if (typeof document !== 'undefined') {
                // Fallback in case setCookie is not on window for any reason
                const date = new Date();
                date.setTime(date.getTime() + (365 * 24 * 60 * 60 * 1000));
                const expires = '; expires=' + date.toUTCString();
                document.cookie = 'oas_archer_id=' + archerId + expires + '; path=/';
                console.log('[setArcherCookieSafe] ✅ Archer cookie set via fallback:', archerId);
            } else {
                // Non-browser / test environment – skip without throwing
                console.log('[setArcherCookieSafe] Running outside browser context, skipping cookie set');
            }
        } catch (err) {
            console.warn('[setArcherCookieSafe] Failed to set archer cookie:', err && err.message ? err.message : err);
        }
    }

    // Check for URL parameters (event and code for QR code access, or event/round for direct links)
    const urlParams = new URLSearchParams(window.location.search);
    const urlEventId = urlParams.get('event');
    const urlEntryCode = urlParams.get('code');
    const urlRoundId = urlParams.get('round');
    const urlArcherId = urlParams.get('archer');

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
        selectedEventId: null, // Selected event for this bale (null for standalone)
        activeEventId: null, // Event ID if pre-assigned mode
        eventName: '',
        selectedDivision: null, // Division selected by user (required for both event-linked and standalone)
        assignmentMode: 'manual', // 'manual' or 'pre-assigned'
        setupMode: 'manual', // 'manual' or 'pre-assigned' - determines which setup section to show
        syncStatus: {}, // Track sync status per archer per end: { archerId: { endNumber: 'synced'|'pending'|'failed' } }
        sortMode: 'bale', // 'bale' or 'name'
        availableDivisions: ['OPEN'],
        // CRITICAL FIX 5: Add division fields to ensure they persist to localStorage
        divisionCode: null, // Division code for this round (e.g., 'BVAR', 'GJV', 'OPEN') - MUST come from round/event
        divisionRoundId: null, // Round ID for this division - used to prevent creating duplicate rounds
        divisionName: '', // Display name for division (e.g., 'Boys Varsity')
        // Standalone round support
        roundId: null, // Database round ID (created when starting scoring)
        roundEntryCode: null, // Generated entry code for standalone rounds
        isStandalone: false // Flag for standalone mode
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
        baleGrid: document.getElementById('manual-bale-grid'),
        searchInput: document.getElementById('archer-search-manual'),
        selectedCountChip: document.getElementById('selected-count-chip'),
        liveToggleBtn: document.getElementById('manual-live-toggle-btn'),
        liveStatusBadge: document.getElementById('manual-live-status'),
        startScoringBtn: document.getElementById('manual-start-scoring-btn'),
    };

    const preassignedSetupControls = {
        section: document.getElementById('preassigned-setup-section'),
        baleListContainer: document.getElementById('bale-list-container'),
    };

    const eventDivisionControls = {
        eventSelect: document.getElementById('event-select'),
        divisionSelect: document.getElementById('division-select'),
        divisionSelection: document.getElementById('division-selection'),
        refreshEventsBtn: document.getElementById('refresh-events-btn'),
        roundTypeIndicator: document.getElementById('round-type-indicator'),
        roundTypeText: document.getElementById('round-type-text'),
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

    const TARGET_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    // --- ARCHER SELECTOR SETUP ---
    let archerSelector = null;
    const RANKING_SELECTOR_GROUPS = [
        { id: 'A', label: 'Target A', buttonText: 'A', max: 1, accentClass: 'bg-primary text-white' },
        { id: 'B', label: 'Target B', buttonText: 'B', max: 1, accentClass: 'bg-secondary text-white' },
        { id: 'C', label: 'Target C', buttonText: 'C', max: 1, accentClass: 'bg-success text-white' },
        { id: 'D', label: 'Target D', buttonText: 'D', max: 1, accentClass: 'bg-warning text-gray-800' }
    ];

    function inferTargetSize(level = '') {
        const normalized = String(level || '').trim().toUpperCase();
        return (normalized === 'VAR' || normalized === 'V' || normalized === 'VARSITY') ? 122 : 80;
    }

    function createEmptyScoreSheet(totalEnds) {
        return Array.from({ length: totalEnds }, () => ['', '', '']);
    }

    function ensureScoreSheet(scores, totalEnds) {
        const sheet = Array.isArray(scores) ? scores.slice(0, totalEnds) : [];
        const normalized = [];
        for (let i = 0; i < totalEnds; i++) {
            const end = Array.isArray(sheet[i]) ? sheet[i] : [];
            normalized.push([
                end[0] !== undefined ? end[0] : '',
                end[1] !== undefined ? end[1] : '',
                end[2] !== undefined ? end[2] : ''
            ]);
        }
        return normalized;
    }

    function safeString(value) {
        if (value === null || value === undefined) return '';
        return String(value).trim();
    }

    function getExtIdFromArcher(archer = {}) {
        if (!archer) return '';
        if (archer.extId) return String(archer.extId).trim();
        if (archer.id && /^[0-9a-f-]{32,}$/i.test(String(archer.id))) return String(archer.id).trim();
        const first = safeString(archer.first || archer.firstName).toLowerCase();
        const last = safeString(archer.last || archer.lastName).toLowerCase();
        const school = safeString(archer.school).toLowerCase();
        return [first, last, school].filter(Boolean).join('-');
    }

    function buildStateArcherFromRoster(rosterArcher = {}, overrides = {}) {
        const firstName = safeString(rosterArcher.firstName || rosterArcher.first);
        const lastName = safeString(rosterArcher.lastName || rosterArcher.last);
        const nickname = safeString(rosterArcher.nickname || rosterArcher.nick);
        const school = safeString(rosterArcher.school);
        const grade = safeString(rosterArcher.grade);
        const status = safeString(rosterArcher.status || 'active').toLowerCase() || 'active';
        const normalizedLevel = normalizeLevel(overrides.level || rosterArcher.level);
        const normalizedGender = normalizeGender(overrides.gender || rosterArcher.gender);
        const divisionCode = overrides.division || rosterArcher.division || deriveDivisionCode(normalizedGender, normalizedLevel);
        const baleNumber = Number(overrides.baleNumber ?? rosterArcher.baleNumber ?? rosterArcher.bale ?? state.baleNumber) || 1;
        const targetAssignment = safeString(overrides.targetAssignment || rosterArcher.targetAssignment || rosterArcher.target);
        const extId = safeString(overrides.extId || getExtIdFromArcher(rosterArcher));

        // CRITICAL: Preserve UUID from database if it exists, otherwise use extId or generate composite fallback
        const databaseUuid = rosterArcher.id || rosterArcher.archerId || overrides.id || overrides.archerId;
        const fallbackId = databaseUuid || extId || `${firstName.toLowerCase()}-${lastName.toLowerCase()}-${school.toLowerCase()}` || `archer-${Date.now()}`;

        const cardStatusSource = overrides.cardStatus ?? rosterArcher.cardStatus ?? rosterArcher.statusCode ?? '';
        const normalizedCardStatus = String(cardStatusSource || '').trim().toUpperCase() || 'PENDING';
        const lockedFlag = overrides.locked !== undefined
            ? !!overrides.locked
            : (typeof rosterArcher.locked === 'boolean'
                ? rosterArcher.locked
                : (normalizedCardStatus === 'VER' || normalizedCardStatus === 'VOID'));
        const verifiedBy = safeString(overrides.verifiedBy ?? rosterArcher.verifiedBy);
        const verifiedAt = overrides.verifiedAt || rosterArcher.verifiedAt || null;
        const verificationNotes = overrides.notes !== undefined ? overrides.notes : (rosterArcher.notes ?? '');

        return {
            id: fallbackId,
            archerId: databaseUuid || fallbackId,  // Store both for compatibility with Live Updates
            roundArcherId: rosterArcher.roundArcherId || overrides.roundArcherId,  // FIX: Preserve round_archer_id for sync
            extId,
            firstName,
            lastName,
            nickname,
            school,
            grade,
            gender: normalizedGender,
            level: normalizedLevel,
            division: divisionCode,
            status,
            baleNumber,
            targetAssignment: targetAssignment || 'A',
            targetSize: inferTargetSize(normalizedLevel),
            scores: ensureScoreSheet(overrides.scores || rosterArcher.scores, state.totalEnds),
            // preserve optional fields if present
            photoUrl: rosterArcher.photoUrl || rosterArcher.photo || '',
            notesCurrent: rosterArcher.notesCurrent || '',
            notesGear: rosterArcher.notesGear || '',
            locked: lockedFlag,
            cardStatus: normalizedCardStatus,
            verifiedBy,
            verifiedAt,
            verificationNotes
        };
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

    function normalizeLevel(level = '') {
        const value = String(level || '').trim().toUpperCase();
        if (value.startsWith('JV') || value === 'J' || value.includes('JUNIOR')) return 'JV';
        if (value.startsWith('BEG') || value === 'B') return 'BEG';
        return 'VAR';
    }

    function normalizeGender(gender = '') {
        const value = String(gender || '').trim().toUpperCase();
        if (value === 'F' || value === 'FEMALE' || value === 'G') return 'F';
        return 'M';
    }

    function deriveDivisionCode(gender, level) {
        const divisions = Array.isArray(state.availableDivisions) && state.availableDivisions.length ? state.availableDivisions : ['OPEN'];
        const normalizedLevel = normalizeLevel(level);
        const normalizedGender = normalizeGender(gender);

        if (divisions.includes('OPEN') && divisions.length === 1) {
            return 'OPEN';
        }

        const candidate = `${normalizedGender === 'F' ? 'G' : 'B'}${normalizedLevel}`;
        if (divisions.includes(candidate)) return candidate;

        if (divisions.includes('OPEN')) return 'OPEN';
        return divisions[0];
    }

    function deriveGenderFromDivision(code = '') {
        const value = String(code || '').trim().toUpperCase();
        if (value.startsWith('G')) return 'F';
        if (value.startsWith('B')) return 'M';
        return null;
    }

    function deriveLevelFromDivision(code = '') {
        const value = String(code || '').trim().toUpperCase();
        if (value.endsWith('JV')) return 'JV';
        if (value.endsWith('VAR')) return 'VAR';
        if (value.endsWith('BEG')) return 'BEG';
        return null;
    }

    // --- VIEW MANAGEMENT ---
    function renderView() {
        Object.values(views).forEach(view => {
            if (view) {
                view.classList.add('hidden');
                view.classList.remove('block');
            }
        });
        if (views[state.currentView]) {
            views[state.currentView].classList.remove('hidden');
            views[state.currentView].classList.add('block');
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
        } else if (state.currentView === 'card') {
            // Render card view if we have an active archer
            if (state.activeArcherId) {
                renderCardView(state.activeArcherId);
            }
            if (keypad.element) {
                keypad.element.classList.add('hidden');
            }
            document.body.classList.remove('keypad-visible');
            if (keypad.element) {
                keypad.element.classList.add('hidden');
            }
            document.body.classList.remove('keypad-visible');
        }
    }

    function updateEventHeader() {
        const eventNameEl = document.getElementById('event-name');
        const baleDisplayEl = document.getElementById('current-bale-display');

        const eventLabel = state.eventName || (state.activeEventId ? 'Loading...' : 'No Event');
        if (eventNameEl) {
            eventNameEl.textContent = eventLabel;
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
        banner.style.display = 'none'; // Hidden per user request
        banner.textContent = `SCORING IN PROGRESS • ${state.eventName || 'Event'} • Bale ${state.baleNumber} • End ${state.currentEnd} of ${state.totalEnds}`;
    }

    function hideScoringBanner() {
        const banner = document.getElementById('scoring-indicator');
        if (banner) banner.style.display = 'none';
    }

    // ==================== Event/Division Selection Functions ====================
    
    async function loadEventsIntoSelect() {
        if (!eventDivisionControls.eventSelect) return;
        
        try {
            const response = await fetch(`${API_BASE}/events/recent`);
            if (!response.ok) {
                console.error('[Load Events] Failed to load events');
                return;
            }
            
            const data = await response.json();
            const events = data.events || [];
            
            eventDivisionControls.eventSelect.innerHTML = '<option value="">Standalone Round (No Event)</option>';
            
            // Only show active events
            const activeEvents = events.filter(e => e.status === 'Active');
            activeEvents.forEach(event => {
                const option = document.createElement('option');
                option.value = event.id;
                option.textContent = `${event.name} - ${event.date}`;
                eventDivisionControls.eventSelect.appendChild(option);
            });
            
            // Set selected value if we have one
            if (state.selectedEventId) {
                eventDivisionControls.eventSelect.value = state.selectedEventId;
                await loadDivisionsForEvent(state.selectedEventId);
            } else {
                // Load default divisions for standalone
                loadDefaultDivisions();
            }
        } catch (error) {
            console.error('[Load Events] Error:', error);
            // Still show default divisions for standalone
            loadDefaultDivisions();
        }
    }
    
    function loadDefaultDivisions() {
        if (!eventDivisionControls.divisionSelect) return;
        
        const defaultDivisions = [
            { code: 'OPEN', name: 'OPEN (Mixed - All Levels)' },
            { code: 'BVAR', name: 'BVAR (Boys Varsity)' },
            { code: 'GVAR', name: 'GVAR (Girls Varsity)' },
            { code: 'BJV', name: 'BJV (Boys JV)' },
            { code: 'GJV', name: 'GJV (Girls JV)' }
        ];
        
        eventDivisionControls.divisionSelect.innerHTML = '<option value="">Select Division...</option>';
        defaultDivisions.forEach(div => {
            const option = document.createElement('option');
            option.value = div.code;
            option.textContent = div.name;
            eventDivisionControls.divisionSelect.appendChild(option);
        });
        
        // Set selected value if we have one
        if (state.selectedDivision) {
            eventDivisionControls.divisionSelect.value = state.selectedDivision;
        }
    }
    
    async function loadDivisionsForEvent(eventId) {
        if (!eventId || !eventDivisionControls.divisionSelect) return;
        
        try {
            const response = await fetch(`${API_BASE}/events/${eventId}/snapshot`);
            if (!response.ok) {
                console.error('[Load Divisions] Failed to load event snapshot');
                loadDefaultDivisions();
                return;
            }
            
            const data = await response.json();
            const divisions = data.divisions || {};
            
            eventDivisionControls.divisionSelect.innerHTML = '<option value="">Select Division...</option>';
            
            // Populate from event snapshot
            const divisionNames = {
                'OPEN': 'OPEN (Mixed - All Levels)',
                'BVAR': 'BVAR (Boys Varsity)',
                'GVAR': 'GVAR (Girls Varsity)',
                'BJV': 'BJV (Boys JV)',
                'GJV': 'GJV (Girls JV)'
            };
            
            Object.keys(divisions).forEach(divCode => {
                const option = document.createElement('option');
                option.value = divCode;
                option.textContent = divisionNames[divCode] || divCode;
                eventDivisionControls.divisionSelect.appendChild(option);
            });
            
            // Set selected value if we have one
            if (state.selectedDivision && Object.keys(divisions).includes(state.selectedDivision)) {
                eventDivisionControls.divisionSelect.value = state.selectedDivision;
            }
        } catch (error) {
            console.error('[Load Divisions] Error:', error);
            loadDefaultDivisions();
        }
    }
    
    async function handleEventSelection() {
        const eventId = eventDivisionControls.eventSelect?.value || null;
        state.selectedEventId = eventId || null;
        state.isStandalone = !eventId;
        
        if (eventId) {
            // Load divisions from event
            await loadDivisionsForEvent(eventId);
            // Load event data
            const events = await fetch(`${API_BASE}/events/recent`).then(r => r.json()).then(d => d.events || []).catch(() => []);
            const event = events.find(e => e.id === eventId);
            if (event) {
                state.eventName = event.name;
                await loadEventById(eventId, event.name, event.entryCode || '');
            }
        } else {
            // Standalone - load default divisions
            loadDefaultDivisions();
            state.eventName = '';
        }
        
        updateRoundTypeIndicator();
        saveData();
    }
    
    function handleDivisionSelection() {
        const division = eventDivisionControls.divisionSelect?.value || null;
        state.selectedDivision = division || null;
        
        if (division) {
            // Update division code and name
            const divisionNames = {
                'OPEN': 'OPEN (Mixed)',
                'BVAR': 'Boys Varsity',
                'GVAR': 'Girls Varsity',
                'BJV': 'Boys JV',
                'GJV': 'Girls JV'
            };
            state.divisionCode = division;
            state.divisionName = divisionNames[division] || division;
        }
        
        updateRoundTypeIndicator();
        saveData();
    }
    
    function updateRoundTypeIndicator() {
        if (!eventDivisionControls.roundTypeText) return;
        
        if (state.isStandalone) {
            eventDivisionControls.roundTypeText.textContent = 'Standalone round - not linked to any event';
        } else if (state.selectedEventId && state.eventName) {
            eventDivisionControls.roundTypeText.textContent = `Event-linked round - ${state.eventName}`;
        } else {
            eventDivisionControls.roundTypeText.textContent = 'Select event and division to continue';
        }
    }
    
    // Ensure core UI handlers are always attached, even on resume after reload
    function wireCoreHandlers() {
        if (uiWired) return;
        uiWired = true;

        // End navigation
        if (scoringControls.prevEndBtn) scoringControls.prevEndBtn.onclick = () => changeEnd(-1);
        if (scoringControls.nextEndBtn) scoringControls.nextEndBtn.onclick = () => changeEnd(1);

        // Primary navigation
        const setupBaleBtn = document.getElementById('setup-bale-btn');
        if (setupBaleBtn) {
            setupBaleBtn.onclick = () => {
                state.currentView = 'setup';
                renderView();
            };
        }

        // Footer reset button
        const resetEventBtn = document.getElementById('reset-event-btn');
        if (resetEventBtn) {
            resetEventBtn.onclick = () => {
                if (resetModal.element) {
                    resetModal.element.classList.remove('hidden');
                    resetModal.element.classList.add('flex');
                }
            };
        }

        // Reset modal
        if (resetModal.cancelBtn) resetModal.cancelBtn.onclick = () => {
            if (resetModal.element) {
                resetModal.element.classList.add('hidden');
                resetModal.element.classList.remove('flex');
            }
        };
        if (resetModal.resetBtn) resetModal.resetBtn.onclick = () => {
            resetState();
            if (resetModal.element) {
                resetModal.element.classList.add('hidden');
                resetModal.element.classList.remove('flex');
            }
        };
        if (resetModal.sampleBtn) resetModal.sampleBtn.onclick = () => {
            loadSampleData();
            if (resetModal.element) {
                resetModal.element.classList.add('hidden');
                resetModal.element.classList.remove('flex');
            }
        };

        // Verify modal
        if (verifyModal.closeBtn) verifyModal.closeBtn.onclick = () => {
            if (verifyModal.element) {
                verifyModal.element.classList.add('hidden');
                verifyModal.element.classList.remove('flex');
            }
        };
        if (verifyModal.sendBtn) verifyModal.sendBtn.onclick = () => {
            sendBaleSMS();
            if (verifyModal.element) {
                verifyModal.element.classList.add('hidden');
                verifyModal.element.classList.remove('flex');
            }
        };

        // Card controls
        if (cardControls.backToScoringBtn) {
            cardControls.backToScoringBtn.textContent = '← Scoring';
            cardControls.backToScoringBtn.onclick = () => { state.currentView = 'scoring'; renderView(); };
        }
        if (cardControls.exportBtn) cardControls.exportBtn.onclick = showExportModal;
        if (cardControls.prevArcherBtn) cardControls.prevArcherBtn.onclick = () => navigateArchers(-1);
        if (cardControls.nextArcherBtn) cardControls.nextArcherBtn.onclick = () => navigateArchers(1);
        
        // Complete card button
        const completeCardBtn = document.getElementById('complete-card-btn');
        if (completeCardBtn) {
            completeCardBtn.onclick = async () => {
                const archer = state.archers.find(a => a.id === state.activeArcherId);
                if (!archer) return;
                
                // Check if all ends are complete
                const allEndsComplete = archer.scores.filter(s => s.every(val => val !== '' && val !== null)).length >= state.totalEnds;
                if (!allEndsComplete) {
                    alert('Please complete all 10 ends before marking card as complete.');
                    return;
                }
                
                // Confirm action
                if (!confirm('Mark this scorecard as Complete?\n\nThis indicates you have verified the digital card matches the paper card. Coaches can then verify it.')) {
                    return;
                }
                
                // Update card status to COMP
                const success = await updateCardStatus(archer.id, 'COMP');
                if (success) {
                    // Refresh card view
                    renderCardView(archer.id);
                }
            };
        }

        // Delegated handlers (robust across rerenders)
        document.body.addEventListener('click', (e) => {
            if (e.target.classList && e.target.classList.contains('view-card-btn')) {
                const archerId = e.target.dataset.archerId;
                if (archerId) {
                    state.currentView = 'card';
                    state.activeArcherId = archerId;
                    renderView();
                }
                if (keypad.element) keypad.element.style.display = 'none';
            }
        });
        document.body.addEventListener('input', (e) => {
            if (e.target.classList && e.target.classList.contains('score-input')) {
                handleScoreInput(e);
            }
        });
        // Use event delegation on document.body for keypad clicks (more robust than attaching to keypad.element)
        document.body.addEventListener('click', (e) => {
            // Only handle clicks inside the keypad
            if (keypad.element && keypad.element.contains(e.target)) {
                handleKeypadClick(e);
            }
        });
    }
    function getEventEntryCode() {
        try {
            // Priority 1: Global entry code
            let code = localStorage.getItem('event_entry_code') || '';
            if (code) {
                console.log('[getEventEntryCode] ✅ Using global entry code');
                return code;
            }

            // Priority 2: Current bale session
            const sessionData = localStorage.getItem('current_bale_session');
            if (sessionData) {
                try {
                    const session = JSON.parse(sessionData);
                    if (session.entryCode) {
                        console.log('[getEventEntryCode] ✅ Using entry code from bale session');
                        // Also save it globally for future use
                        localStorage.setItem('event_entry_code', session.entryCode);
                        return session.entryCode;
                    }
                } catch (e) {
                    console.warn('[getEventEntryCode] Could not parse bale session');
                }
            }

            // Priority 3: Event metadata from latest session
            let latestKey = null; let latestTs = 0; let stateObj = null;
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('rankingRound300_')) {
                    const suffix = k.substring('rankingRound300_'.length);
                    const ts = Date.parse(suffix) || 0;
                    if (ts >= latestTs) { latestTs = ts; latestKey = k; }
                }
            }
            if (latestKey) {
                stateObj = JSON.parse(localStorage.getItem(latestKey) || '{}');
            }
            const eventId = (stateObj && (stateObj.activeEventId || stateObj.selectedEventId)) || state.activeEventId || state.selectedEventId;
            if (eventId) {
                const metaRaw = localStorage.getItem(`event:${eventId}:meta`);
                if (metaRaw) {
                    const meta = JSON.parse(metaRaw);
                    if (meta.entryCode) {
                        console.log('[getEventEntryCode] ✅ Using entry code from event meta');
                        // Also save it globally for future use
                        localStorage.setItem('event_entry_code', meta.entryCode);
                        return meta.entryCode;
                    }
                }
            }

            console.warn('[getEventEntryCode] ⚠️ No entry code found in any storage location');
        } catch (e) {
            console.error('[getEventEntryCode] Error:', e);
        }
        return '';
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

    async function loadData() {
        const storedState = localStorage.getItem(sessionKey);
        if (storedState) {
            try {
                const loadedState = JSON.parse(storedState);
                Object.assign(state, loadedState);
                console.log('Loaded state from localStorage:', {
                    eventName: state.eventName,
                    activeEventId: state.activeEventId,
                    selectedEventId: state.selectedEventId,
                    assignmentMode: state.assignmentMode,
                    archersCount: state.archers ? state.archers.length : 0
                });
                if (!Array.isArray(state.availableDivisions) || state.availableDivisions.length === 0) {
                    state.availableDivisions = ['OPEN'];
                }
                sanitizeStateArchers();

                // CRITICAL: Check for existing IN PROGRESS or COMPLETED rounds
                await checkExistingRounds();
            } catch (e) {
                console.error("Error parsing stored data. Starting fresh.", e);
                localStorage.removeItem(sessionKey);
            }
        }
        updateEventHeader();
    }

    /**
     * CRITICAL: Check if archer already has an IN PROGRESS or COMPLETED round
     * - IN PROGRESS: Prompt to resume or create new
     * - COMPLETED/VERIFIED: Lock and prevent new scoring
     */
    async function checkExistingRounds() {
        const archerId = getArcherCookie();
        if (!archerId) return;

        try {
            const res = await fetch(`${API_BASE}/archers/${archerId}/rounds?status=IN_PROGRESS,COMPLETED,VERIFIED`);
            if (!res.ok) return;

            const rounds = await res.json();
            if (!Array.isArray(rounds) || rounds.length === 0) return;

            // Check for COMPLETED or VERIFIED rounds
            const lockedRounds = rounds.filter(r => r.card_status === 'COMPLETED' || r.verified);
            if (lockedRounds.length > 0) {
                const roundNames = lockedRounds.map(r => r.round_type || 'Round').join(', ');
                alert(`⚠️ LOCKED SCORECARDS\n\nYou have ${lockedRounds.length} completed/verified scorecard(s): ${roundNames}\n\nThese cards are LOCKED and cannot be edited.\n\nTo start a new round, use the setup panel.`);
                // Don't prevent loading, just warn
                return;
            }

            // Check for IN PROGRESS rounds
            const inProgressRounds = rounds.filter(r => r.card_status === 'IN_PROGRESS' || r.card_status === 'PENDING');
            if (inProgressRounds.length > 0) {
                const round = inProgressRounds[0];
                const roundName = round.round_type || 'Round';
                const currentEnd = round.current_end || 1;

                const resume = confirm(`📋 IN PROGRESS SCORECARD FOUND\n\nYou have an unfinished scorecard:\n• ${roundName}\n• Current End: ${currentEnd}/${round.total_ends || 10}\n• Score: ${round.total_score || 0}\n\nClick OK to RESUME this scorecard\nClick CANCEL to start a NEW scorecard`);

                if (resume) {
                    // Load the existing round data
                    await loadExistingRound(round);
                } else {
                    // User wants to start fresh - clear local state
                    localStorage.removeItem(sessionKey);
                    state.archers = [];
                    state.currentEnd = 1;
                    saveData();
                }
            }
        } catch (error) {
            console.error('[checkExistingRounds] Error:', error);
        }
    }

    /**
     * Load an existing IN PROGRESS round
     */
    async function loadExistingRound(round) {
        try {
            // Fetch full round data including scores
            const res = await fetch(`${API_BASE}/rounds/${round.id}`);
            if (!res.ok) {
                console.error('[loadExistingRound] Failed to load round:', res.status);
                return;
            }

            const roundData = await res.json();

            // Update state with loaded data
            state.currentEnd = roundData.current_end || 1;
            state.totalEnds = roundData.total_ends || 10;
            state.roundType = roundData.round_type || 'R300';
            state.activeEventId = roundData.event_id || state.activeEventId;
            state.selectedEventId = roundData.event_id || state.selectedEventId;
            state.baleNumber = roundData.bale_number || state.baleNumber;

            // CRITICAL: Use the division from the ROUND itself, not the archer's default
            // Archers can shoot up (JV -> Varsity), so the round's division is the source of truth
            if (roundData.division) {
                state.divisionCode = roundData.division;
                console.log('[loadExistingRound] Set division from round data:', state.divisionCode);
            }

            // Load archer scores if available
            if (roundData.archers && Array.isArray(roundData.archers)) {
                state.archers = roundData.archers.map(a => {
                    // Map API archer to state archer
                    const names = (a.name || '').split(' ');
                    const firstName = names[0] || '';
                    const lastName = names.slice(1).join(' ') || '';

                    return {
                        id: a.id || a.archer_id,
                        archerId: a.id || a.archer_id,
                        firstName: a.first_name || firstName,
                        lastName: a.last_name || lastName,
                        // Use round division if available, otherwise fallback to archer's division
                        division: state.divisionCode || a.division,
                        gender: a.gender,
                        level: a.level,
                        school: a.school,
                        baleNumber: a.bale_number || state.baleNumber,
                        targetAssignment: a.target || 'A',
                        scores: a.scores || createEmptyScoreSheet(state.totalEnds),
                        roundArcherId: a.round_archer_id
                    };
                });

                // Fallback: If round didn't have division, try to infer from first archer (legacy support)
                if (!state.divisionCode && state.archers.length > 0) {
                    state.divisionCode = state.archers[0].division;
                }
            }

            saveData();
            console.log('[loadExistingRound] Loaded round:', roundData);

            // If we have archers and division, we can initialize LiveUpdates
            if (state.archers.length > 0 && state.divisionCode) {
                if (getLiveEnabled()) {
                    console.log('[loadExistingRound] Initializing Live Updates...');
                    await ensureLiveRoundReady({ promptForCode: false });
                }
            }

            renderView();

        } catch (error) {
            console.error('[loadExistingRound] Error:', error);
        }
    }

    function sanitizeStateArchers() {
        if (!Array.isArray(state.archers)) {
            state.archers = [];
            return;
        }
        state.archers = state.archers
            .filter(Boolean)
            .map(raw => {
                const extId = getExtIdFromArcher(raw);
                const overrides = {
                    extId,
                    targetAssignment: raw.targetAssignment || raw.target,
                    baleNumber: raw.baleNumber || raw.bale || state.baleNumber,
                    scores: raw.scores
                };
                return buildStateArcherFromRoster(raw, overrides);
            });
    }

    // =====================================================
    // PHASE 0: Session Persistence for Bale Groups
    // =====================================================

    /**
     * Save current bale session to localStorage for recovery on page reload.
     * Includes archer cookie, round ID, bale number, and current end.
     */
    function saveCurrentBaleSession() {
        try {
            const archerId = getArcherCookie(); // From common.js
            const roundId = (window.LiveUpdates && window.LiveUpdates._state) ? window.LiveUpdates._state.roundId : null;

            const session = {
                archerId: archerId,
                eventId: state.activeEventId || state.selectedEventId,
                roundId: roundId,
                baleNumber: state.baleNumber,
                currentEnd: state.currentEnd,
                assignmentMode: state.assignmentMode,
                lastSaved: new Date().toISOString(),
                archerIds: state.archers.map(a => a.id), // For quick validation
                // CRITICAL FIX 5b: Include division in session for offline resilience
                divisionCode: state.divisionCode,
                divisionRoundId: state.divisionRoundId,
                // CRITICAL FIX 6: Include entry code for authentication on resume
                entryCode: getEventEntryCode()
            };


            localStorage.setItem('current_bale_session', JSON.stringify(session));
            console.log('[Phase 0 Session] Saved bale session:', session);
        } catch (e) {
            console.warn('[Phase 0 Session] Failed to save session:', e);
        }
    }

    /**
     * Show resume dialog with server verification
     * Returns a promise that resolves to true if user wants to resume, false otherwise
     */
    async function showResumeDialog({ session, archerCount, hasScores, isCurrent, serverRoundStatus }) {
        return new Promise((resolve) => {
            const modal = document.getElementById('resume-session-modal');
            const detailsEl = document.getElementById('resume-session-details');
            const resumeBtn = document.getElementById('resume-session-btn');
            const newRoundBtn = document.getElementById('new-round-btn');
            
            if (!modal || !detailsEl || !resumeBtn || !newRoundBtn) {
                console.error('[Resume Dialog] Missing dialog elements');
                resolve(false);
                return;
            }
            
            // Build details HTML
            const statusIcon = isCurrent ? '✅' : '⚠️';
            const statusText = isCurrent ? 'Current' : 'May be outdated';
            const serverStatus = serverRoundStatus ? `Server: ${serverRoundStatus}` : 'Server: Unknown';
            
            detailsEl.innerHTML = `
                <div class="space-y-2 text-sm">
                    <div><strong>Bale:</strong> ${session.baleNumber}</div>
                    <div><strong>Archers:</strong> ${archerCount}</div>
                    <div><strong>Current End:</strong> ${session.currentEnd || 1} of ${state.totalEnds}</div>
                    <div><strong>Scores:</strong> ${hasScores ? '⚠️ Has existing scores' : '✓ No scores yet'}</div>
                    <div class="pt-2 border-t border-gray-200 dark:border-gray-600">
                        <div><strong>Status:</strong> ${statusIcon} ${statusText}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">${serverStatus}</div>
                    </div>
                </div>
            `;
            
            // Enable/disable resume button based on verification
            if (!isCurrent) {
                resumeBtn.disabled = false;
                resumeBtn.classList.add('opacity-75');
                resumeBtn.title = 'Round may have been updated on server';
            } else {
                resumeBtn.disabled = false;
                resumeBtn.classList.remove('opacity-75');
                resumeBtn.title = '';
            }
            
            // Show modal
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            
            // Handle Resume button
            const handleResume = async () => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                
                const entryCode = session.entryCode ||
                    localStorage.getItem('event_entry_code') ||
                    (session.eventId ? (JSON.parse(localStorage.getItem(`event:${session.eventId}:meta`) || '{}').entryCode) : null);
                
                if (!entryCode) {
                    console.error('[Resume Dialog] ❌ No entry code found');
                    localStorage.removeItem('current_bale_session');
                    resolve(false);
                    return;
                }
                
                localStorage.setItem('event_entry_code', entryCode);
                
                // Fetch snapshot first to get ALL archers for the round
                const snapshotResponse = await fetch(`${API_BASE}/rounds/${session.roundId}/snapshot`, {
                    headers: { 'X-Passcode': entryCode }
                });
                
                let snapshotData = null;
                if (snapshotResponse.ok) {
                    snapshotData = await snapshotResponse.json();
                    console.log('[Resume Dialog] ✅ Snapshot retrieved:', snapshotData.archers?.length || 0, 'archers');
                } else {
                    console.warn('[Resume Dialog] Could not fetch snapshot, using bale data only');
                }
                
                const response = await fetch(`${API_BASE}/rounds/${session.roundId}/bales/${session.baleNumber}/archers`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json', 'X-Passcode': entryCode }
                });
                
                let baleData = null;
                if (response.ok) {
                    baleData = await response.json();
                    console.log('[Resume Dialog] ✅ Bale data retrieved:', baleData.archers?.length || 0, 'archers');
                } else {
                    console.warn('[Resume Dialog] Failed to fetch bale group:', response.status);
                    baleData = { division: null, archers: [] };
                }
                
                // Merge snapshot archers with bale data (same logic as handleDirectLink)
                const archerMap = new Map();
                
                // First, add archers from bale data (full details)
                if (baleData.archers && Array.isArray(baleData.archers)) {
                    baleData.archers.forEach(archer => {
                        const key = archer.archerId || archer.id || archer.roundArcherId;
                        if (key) {
                            archerMap.set(key, archer);
                        }
                    });
                }
                
                // Then, add missing archers from snapshot (same bale or NULL bale_number)
                if (snapshotData && snapshotData.archers) {
                    const relevantArchers = snapshotData.archers.filter(a => 
                        a.baleNumber === session.baleNumber || 
                        a.baleNumber === null || 
                        a.baleNumber === undefined
                    );
                    
                    relevantArchers.forEach(snapshotArcher => {
                        const key = snapshotArcher.archerId || snapshotArcher.roundArcherId;
                        if (key && !archerMap.has(key)) {
                            // Convert snapshot archer to bale data format
                            const archerName = snapshotArcher.archerName || 'Unknown';
                            const nameParts = archerName.split(' ');
                            const firstName = nameParts[0] || '';
                            const lastName = nameParts.slice(1).join(' ') || '';
                            
                            archerMap.set(key, {
                                roundArcherId: snapshotArcher.roundArcherId,
                                archerId: snapshotArcher.archerId,
                                firstName: firstName,
                                lastName: lastName,
                                school: '',
                                level: '',
                                gender: '',
                                targetAssignment: snapshotArcher.targetAssignment,
                                baleNumber: snapshotArcher.baleNumber || session.baleNumber,
                                scorecard: {
                                    ends: snapshotArcher.scores ? snapshotArcher.scores.map((score, idx) => ({
                                        endNumber: idx + 1,
                                        a1: score[0] || '',
                                        a2: score[1] || '',
                                        a3: score[2] || ''
                                    })) : []
                                }
                            });
                            console.log('[Resume Dialog] ✅ Added missing archer from snapshot:', archerName);
                        }
                    });
                }
                
                // Convert map to array
                const allArchers = Array.from(archerMap.values());
                
                if (allArchers.length === 0) {
                    console.warn('[Resume Dialog] No archers found after merge');
                    resolve(false);
                    return;
                }
                
                // Replace baleData.archers with merged list
                baleData.archers = allArchers;
                console.log('[Resume Dialog] ✅ Total archers after merge:', allArchers.length);
                
                // Restore state (same logic as original restoreCurrentBaleSession)
                state.roundId = session.roundId;
                state.baleNumber = session.baleNumber;
                state.activeEventId = session.eventId;
                state.selectedEventId = session.eventId;
                state.assignmentMode = session.assignmentMode || 'pre-assigned';
                state.currentEnd = baleData.archers[0]?.scorecard?.currentEnd || session.currentEnd || 1;
                
                const baleDivision = baleData.division || null;
                if (baleDivision) {
                    state.divisionCode = baleDivision;
                    state.divisionRoundId = session.roundId;
                }
                
                state.archers = baleData.archers.map(archer => {
                    const scoreSheet = createEmptyScoreSheet(state.totalEnds);
                    const endsList = Array.isArray(archer.scorecard?.ends) ? archer.scorecard.ends : [];
                    endsList.forEach(end => {
                        const idx = Math.max(0, Math.min(state.totalEnds - 1, (end.endNumber || 1) - 1));
                        scoreSheet[idx] = [end.a1 || '', end.a2 || '', end.a3 || ''];
                    });
                    const provisional = { extId: archer.extId, firstName: archer.firstName, lastName: archer.lastName, school: archer.school };
                    const extId = getExtIdFromArcher(provisional);
                    const overrides = {
                        extId, targetAssignment: archer.targetAssignment || archer.target,
                        baleNumber: archer.baleNumber || session.baleNumber,
                        level: archer.level, gender: archer.gender,
                        division: baleDivision || archer.division, scores: scoreSheet
                    };
                    const rosterPayload = Object.assign({}, provisional, { level: archer.level, gender: archer.gender, division: baleDivision || archer.division });
                    const stateArcher = buildStateArcherFromRoster(rosterPayload, overrides);
                    stateArcher.roundArcherId = archer.roundArcherId;
                    return stateArcher;
                });
                
                await loadExistingScoresForArchers();
                if (getLiveEnabled()) {
                    await ensureLiveRoundReady({ promptForCode: false });
                }
                saveCurrentBaleSession();
                saveData();
                state.currentView = 'scoring';
                renderView();
                resolve(true);
            };
            
            // Handle New Round button
            const handleNewRound = () => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                console.log('[Resume Dialog] User chose New Round - clearing local session and showing event selection');
                localStorage.removeItem('current_bale_session');
                if (session.roundId) {
                    try { localStorage.removeItem(`live_updates_session:${session.roundId}`); } catch (e) { }
                }
                state.archers = [];
                state.roundId = null;
                state.baleNumber = 1;
                state.currentEnd = 1;
                state.currentView = 'setup';
                state.selectedEventId = null;
                state.activeEventId = null;
                state.isStandalone = false;
                state.selectedDivision = null;
                
                // Show event selection modal instead of setup
                showEventModal();
                resolve(false);
            };
            
            // Remove old listeners and add new ones
            resumeBtn.replaceWith(resumeBtn.cloneNode(true));
            newRoundBtn.replaceWith(newRoundBtn.cloneNode(true));
            const newResumeBtn = document.getElementById('resume-session-btn');
            const newNewRoundBtn = document.getElementById('new-round-btn');
            newResumeBtn.addEventListener('click', handleResume);
            newNewRoundBtn.addEventListener('click', handleNewRound);
        });
    }
    
    /**
     * Attempt to restore bale session from localStorage.
     * Fetches full bale group data from server if session exists.
     * Returns true if session was restored, false otherwise.
     */
    async function restoreCurrentBaleSession() {
        try {
            const sessionData = localStorage.getItem('current_bale_session');
            if (!sessionData) {
                console.log('[Phase 0 Session] No saved session found');
                return false;
            }

            const session = JSON.parse(sessionData);
            if (!session.roundId || !session.baleNumber) {
                console.log('[Phase 0 Session] Invalid session data, skipping restore');
                return false;
            }

            // Check if session is recent (within 24 hours)
            const sessionAge = Date.now() - new Date(session.lastSaved || 0).getTime();
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            if (sessionAge > maxAge) {
                console.log('[Phase 0 Session] Session too old, clearing:', Math.round(sessionAge / 1000 / 60 / 60), 'hours');
                localStorage.removeItem('current_bale_session');
                return false;
            }

            console.log('[Phase 0 Session] Found saved session, attempting restore:', session);

            // First, fetch what's actually on the server to show accurate info
            const entryCodePreview = localStorage.getItem('event_entry_code') ||
                (session.eventId ? (JSON.parse(localStorage.getItem(`event:${session.eventId}:meta`) || '{}').entryCode) : null);

            let archerCount = session.archerIds?.length || 0;
            let hasScores = false;

            // Try to peek at server data (non-blocking)
            if (entryCodePreview && session.roundId && session.baleNumber) {
                try {
                    const peekResponse = await fetch(`${API_BASE}/rounds/${session.roundId}/bales/${session.baleNumber}/archers`, {
                        method: 'GET',
                        headers: { 'X-Passcode': entryCodePreview }
                    });
                    if (peekResponse.ok) {
                        const peekData = await peekResponse.json();
                        archerCount = peekData.archers?.length || 0;
                        hasScores = peekData.archers?.some(a => a.scorecard?.ends?.length > 0) || false;
                    }
                } catch (e) {
                    console.warn('[Phase 0 Session] Could not peek at server data:', e);
                }
            }

            // Verify session is still current on server
            let isCurrent = false;
            let serverRoundStatus = null;
            let serverLastModified = null;
            
            if (session.roundId && entryCodePreview) {
                try {
                    const verifyResponse = await fetch(`${API_BASE}/rounds/${session.roundId}/snapshot`, {
                        headers: { 'X-Passcode': entryCodePreview }
                    });
                    if (verifyResponse.ok) {
                        const verifyData = await verifyResponse.json();
                        serverRoundStatus = verifyData.round?.status || null;
                        // Check if round is still active and matches our session
                        isCurrent = serverRoundStatus === 'In Progress' || serverRoundStatus === 'Not Started';
                        if (verifyData.round?.updated_at) {
                            serverLastModified = new Date(verifyData.round.updated_at);
                        }
                        console.log('[Phase 0 Session] Server verification:', { isCurrent, serverRoundStatus });
                    }
                } catch (e) {
                    console.warn('[Phase 0 Session] Could not verify with server:', e);
                    // If we can't verify, assume it's current (better to let user decide)
                    isCurrent = true;
                }
            } else {
                // No round ID or entry code - can't verify, assume current
                isCurrent = true;
            }
            
            // Show resume dialog (function defined below)
            return await showResumeDialog({
                session,
                archerCount,
                hasScores,
                isCurrent,
                serverRoundStatus
            });

            // Get event entry code for authentication
            // Priority: 1) Saved in session, 2) Global storage, 3) Event meta
            const entryCode = session.entryCode ||
                localStorage.getItem('event_entry_code') ||
                (session.eventId ? (JSON.parse(localStorage.getItem(`event:${session.eventId}:meta`) || '{}').entryCode) : null);

            if (!entryCode) {
                console.error('[Phase 0 Session] ❌ No entry code found, cannot restore session');
                console.error('[Phase 0 Session] Debug:', {
                    sessionEntryCode: session.entryCode,
                    globalEntryCode: localStorage.getItem('event_entry_code'),
                    eventId: session.eventId,
                    hasEventMeta: !!localStorage.getItem(`event:${session.eventId}:meta`)
                });
                localStorage.removeItem('current_bale_session');
                return false;
            }

            // ✅ Save entry code globally for other components (LiveUpdates, etc.)
            localStorage.setItem('event_entry_code', entryCode);
            console.log('[Phase 0 Session] ✅ Using entry code for authentication');

            // Fetch snapshot first to get ALL archers for the round
            const snapshotResponse = await fetch(`${API_BASE}/rounds/${session.roundId}/snapshot`, {
                headers: { 'X-Passcode': entryCode }
            });
            
            let snapshotData = null;
            if (snapshotResponse.ok) {
                snapshotData = await snapshotResponse.json();
                console.log('[Phase 0 Session] ✅ Snapshot retrieved:', snapshotData.archers?.length || 0, 'archers');
            } else {
                console.warn('[Phase 0 Session] Could not fetch snapshot, using bale data only');
            }

            // Fetch bale group from server for full archer details
            const response = await fetch(`${API_BASE}/rounds/${session.roundId}/bales/${session.baleNumber}/archers`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Passcode': entryCode
                }
            });

            let baleData = null;
            if (response.ok) {
                baleData = await response.json();
                console.log('[Phase 0 Session] ✅ Bale data retrieved:', baleData.archers?.length || 0, 'archers');
            } else {
                console.warn('[Phase 0 Session] Failed to fetch bale group:', response.status);
                // Create empty bale data structure
                baleData = { division: null, archers: [] };
            }

            // Merge snapshot archers with bale data (same logic as handleDirectLink)
            const archerMap = new Map();
            
            // First, add archers from bale data (full details)
            if (baleData.archers && Array.isArray(baleData.archers)) {
                baleData.archers.forEach(archer => {
                    const key = archer.archerId || archer.id || archer.roundArcherId;
                    if (key) {
                        archerMap.set(key, archer);
                    }
                });
            }
            
            // Then, add missing archers from snapshot (same bale or NULL bale_number)
            if (snapshotData && snapshotData.archers) {
                const relevantArchers = snapshotData.archers.filter(a => 
                    a.baleNumber === session.baleNumber || 
                    a.baleNumber === null || 
                    a.baleNumber === undefined
                );
                
                relevantArchers.forEach(snapshotArcher => {
                    const key = snapshotArcher.archerId || snapshotArcher.roundArcherId;
                    if (key && !archerMap.has(key)) {
                        // Convert snapshot archer to bale data format
                        const archerName = snapshotArcher.archerName || 'Unknown';
                        const nameParts = archerName.split(' ');
                        const firstName = nameParts[0] || '';
                        const lastName = nameParts.slice(1).join(' ') || '';
                        
                        archerMap.set(key, {
                            roundArcherId: snapshotArcher.roundArcherId,
                            archerId: snapshotArcher.archerId,
                            firstName: firstName,
                            lastName: lastName,
                            school: '',
                            level: '',
                            gender: '',
                            targetAssignment: snapshotArcher.targetAssignment,
                            baleNumber: snapshotArcher.baleNumber || session.baleNumber,
                            scorecard: {
                                ends: snapshotArcher.scores ? snapshotArcher.scores.map((score, idx) => ({
                                    endNumber: idx + 1,
                                    a1: score[0] || '',
                                    a2: score[1] || '',
                                    a3: score[2] || ''
                                })) : []
                            }
                        });
                        console.log('[Phase 0 Session] ✅ Added missing archer from snapshot:', archerName);
                    }
                });
            }
            
            // Convert map to array
            const allArchers = Array.from(archerMap.values());
            
            if (allArchers.length === 0) {
                console.warn('[Phase 0 Session] No archers found after merge');
                return false;
            }
            
            // Replace baleData.archers with merged list
            baleData.archers = allArchers;
            console.log('[Phase 0 Session] ✅ Total archers after merge:', allArchers.length);

            // Restore state from server data
            state.roundId = session.roundId;
            state.baleNumber = session.baleNumber;
            state.activeEventId = session.eventId;
            state.selectedEventId = session.eventId;
            state.assignmentMode = session.assignmentMode || 'pre-assigned';
            state.currentEnd = baleData.archers[0]?.scorecard?.currentEnd || session.currentEnd || 1;

            // CRITICAL FIX: Extract division from server response BEFORE reconstructing archers
            // The API returns division at the top level (baleData.division), not per-archer
            // This is the event-assigned division, which takes precedence over archer's default division
            const baleDivision = baleData.division || null;
            if (baleDivision) {
                state.divisionCode = baleDivision;
                state.divisionRoundId = session.roundId;
                console.log('[Phase 0 Session] ✅ Set division from server:', baleDivision, 'roundId:', session.roundId);
            } else {
                console.warn('[Phase 0 Session] ⚠️ No division in bale data, will try to extract from archers');
            }

            // Reconstruct archers array from server scorecards
            // Now we can pass the correct division to each archer
            state.archers = baleData.archers.map(archer => {
                const scoreSheet = createEmptyScoreSheet(state.totalEnds);
                const endsList = Array.isArray(archer.scorecard?.ends) ? archer.scorecard.ends : [];
                endsList.forEach(end => {
                    const idx = Math.max(0, Math.min(state.totalEnds - 1, (end.endNumber || 1) - 1));
                    scoreSheet[idx] = [end.a1 || '', end.a2 || '', end.a3 || ''];
                });
                const provisional = {
                    extId: archer.extId,
                    firstName: archer.firstName,
                    lastName: archer.lastName,
                    school: archer.school
                };
                const extId = getExtIdFromArcher(provisional);
                const overrides = {
                    extId,
                    targetAssignment: archer.targetAssignment || archer.target,
                    baleNumber: archer.baleNumber || session.baleNumber,
                    level: archer.level,
                    gender: archer.gender,
                    // Use bale division (event-assigned) instead of archer.division (which is undefined)
                    division: baleDivision || archer.division,
                    scores: scoreSheet
                };
                const rosterPayload = Object.assign({}, provisional, {
                    level: archer.level,
                    gender: archer.gender,
                    // Use bale division (event-assigned) instead of archer.division
                    division: baleDivision || archer.division
                });
                const stateArcher = buildStateArcherFromRoster(rosterPayload, overrides);
                stateArcher.roundArcherId = archer.roundArcherId;

                // Validation logging
                if (!stateArcher.roundArcherId) {
                    console.warn('[Phase 0 Session] ⚠️ Missing roundArcherId for:', archer.firstName, archer.lastName);
                }
                if (!stateArcher.division) {
                    console.warn('[Phase 0 Session] ⚠️ Missing division for:', archer.firstName, archer.lastName);
                }

                return stateArcher;
            });

            // Fallback: If no division from bale data, try to get from first archer
            if (!state.divisionCode && state.archers && state.archers.length > 0 && state.archers[0].division) {
                state.divisionCode = state.archers[0].division;
                state.divisionRoundId = session.roundId;
                console.log('[Phase 0 Session] ✅ Set division from first archer:', state.divisionCode);
            }

            // Restore Live Updates state if enabled
            if (window.LiveUpdates && window.LiveUpdates._state) {
                window.LiveUpdates._state.roundId = session.roundId;
                // Restore archer ID mapping
                state.archers.forEach(archer => {
                    if (archer.roundArcherId) {
                        window.LiveUpdates._state.archerIds[archer.id] = archer.roundArcherId;
                    }
                });

                // CRITICAL: Manually persist Live Updates state to localStorage
                // (LiveUpdates.persistState is private, so we replicate its logic)
                try {
                    const liveSessionKey = `live_updates_session:${session.roundId}`;
                    const liveSessionData = {
                        roundId: session.roundId,
                        archerIds: window.LiveUpdates._state.archerIds
                    };
                    localStorage.setItem(liveSessionKey, JSON.stringify(liveSessionData));
                    console.log('[Phase 0 Session] Persisted LiveUpdates to localStorage:', liveSessionKey, liveSessionData);
                } catch (e) {
                    console.warn('[Phase 0 Session] Failed to persist LiveUpdates state:', e);
                }

                console.log('[Phase 0 Session] Restored LiveUpdates state:', {
                    roundId: window.LiveUpdates._state.roundId,
                    archerIds: window.LiveUpdates._state.archerIds
                });
            }

            // Transition to scoring view
            state.currentView = 'scoring';
            saveData(); // Save restored state to localStorage

            console.log('[Phase 0 Session] Session restored successfully, showing scoring view');
            return true;
        } catch (e) {
            console.error('[Phase 0 Session] Error restoring session:', e);
            return false;
        }
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
        // Prefer server-driven assignment mode with offline fallback. Do NOT rely on legacy keys.
        if (state.activeEventId) {
            if (state.assignmentMode) {
                console.log('[determineSetupMode] Using state.assignmentMode:', state.assignmentMode);
                return (state.assignmentMode === 'pre-assigned' || state.assignmentMode === 'assigned') ? 'pre-assigned' : 'manual';
            }
            try {
                const metaRaw = localStorage.getItem(`event:${state.activeEventId}:meta`);
                if (metaRaw) {
                    const meta = JSON.parse(metaRaw);
                    console.log('[determineSetupMode] Event meta:', meta);
                    if (meta && meta.assignmentMode) {
                        const mode = (meta.assignmentMode === 'assigned' || meta.assignmentMode === 'pre-assigned') ? 'pre-assigned' : 'manual';
                        console.log('[determineSetupMode] Using meta.assignmentMode:', meta.assignmentMode, '-> mode:', mode);
                        return mode;
                    }
                }
            } catch (_) { }
        }
        console.log('[determineSetupMode] No event or assignment mode found, defaulting to manual');
        return 'manual';
    }

    // Remove legacy localStorage keys that cause stale-mode detection on older clients
    function cleanupLegacyStorage() {
        try { localStorage.removeItem('archery_master_list'); } catch (_) { }
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
            // Hide modal if still visible after successful load
            try { hideEventModal(); } catch (_) { }
        }
    }

    function renderManualSetup() {
        // Update bale input and grid
        if (manualSetupControls.baleInput) {
            manualSetupControls.baleInput.value = state.baleNumber;
        }
        renderManualBaleGrid();

        // Update selection count
        updateSelectionCount();

        // Render archer list for selection
        renderManualArcherList();

        if (manualSetupControls.liveToggleBtn) {
            manualSetupControls.liveToggleBtn.onclick = async () => {
                manualSetupControls.liveToggleBtn.disabled = true;
                await handleLiveToggle();
                manualSetupControls.liveToggleBtn.disabled = false;
                // Refresh button display
                updateManualLiveControls();
            };
        }

        updateManualLiveControls();
    }

    function getManualBaleNumbers() {
        // In manual mode, always show a reasonable number of bales (16 for mobile optimization)
        // Don't rely on cached bale assignments as they may be from previous scoring sessions
        // For pre-assigned mode, the bale list comes from the event snapshot, not this function
        if (state.assignmentMode === 'manual') {
            return Array.from({ length: 16 }, (_, idx) => idx + 1);
        }

        // Legacy fallback for other modes (though this function is primarily for manual mode)
        if (state.activeEventId) {
            try {
                const cached = JSON.parse(localStorage.getItem(`event:${state.activeEventId}:archers_v2`) || '[]');
                if (Array.isArray(cached) && cached.length) {
                    let maxBale = 0;
                    cached.forEach(archer => {
                        const bale = Number(archer?.baleNumber ?? archer?.bale);
                        if (!Number.isNaN(bale) && bale > 0) {
                            if (bale > maxBale) maxBale = bale;
                        }
                    });
                    if (maxBale > 0) {
                        const cappedMaxBale = Math.min(maxBale, 16);
                        if (maxBale > 16) {
                            console.warn(`[getManualBaleNumbers] Capping maxBale from ${maxBale} to ${cappedMaxBale} (likely bad data in cache)`);
                        }
                        return Array.from({ length: cappedMaxBale }, (_, idx) => idx + 1);
                    }
                }
            } catch (e) {
                console.warn('[getManualBaleNumbers] Error parsing cache:', e);
            }
        }
        return Array.from({ length: 16 }, (_, idx) => idx + 1);
    }

    function renderManualBaleGrid() {
        if (!manualSetupControls.baleGrid) return;
        const baleNumbers = getManualBaleNumbers();
        let currentBale = Number(state.baleNumber) || baleNumbers[0] || 1;
        if (baleNumbers.length && !baleNumbers.includes(currentBale)) {
            currentBale = baleNumbers[0];
            state.baleNumber = currentBale;
            if (manualSetupControls.baleInput) {
                manualSetupControls.baleInput.value = currentBale;
            }
            saveData();
        }

        manualSetupControls.baleGrid.innerHTML = '';

        baleNumbers.forEach(bale => {
            const tile = document.createElement('button');
            tile.type = 'button';
            const isActive = bale === currentBale;
            tile.className = isActive
                ? 'px-4 py-3 bg-primary text-white rounded font-semibold transition-colors hover:bg-primary-dark min-h-[44px]'
                : 'px-4 py-3 bg-white dark:bg-gray-700 text-gray-800 dark:text-white border-2 border-gray-300 dark:border-gray-600 rounded font-semibold transition-colors hover:bg-gray-100 dark:hover:bg-gray-600 min-h-[44px]';
            tile.textContent = bale;
            tile.onclick = () => {
                if (state.baleNumber === bale) return;
                state.baleNumber = bale;
                if (manualSetupControls.baleInput) {
                    manualSetupControls.baleInput.value = bale;
                }
                saveData();
                renderManualBaleGrid();
                renderManualArcherList();
            };
            manualSetupControls.baleGrid.appendChild(tile);
        });
    }

    function renderPreassignedSetup() {
        if (!preassignedSetupControls.baleListContainer) return;

        // Add RESET button to pre-assigned setup header
        const setupCard = preassignedSetupControls.section.querySelector('#preassigned-setup-section > div > div');
        if (setupCard) {
            // Check if reset button already exists
            let existingResetBtn = setupCard.querySelector('#preassigned-reset-btn');
            if (!existingResetBtn) {
                const header = setupCard.querySelector('h3');
                if (header) {
                    const resetBtn = document.createElement('button');
                    resetBtn.id = 'preassigned-reset-btn';
                    resetBtn.className = 'btn btn-danger';
                    resetBtn.textContent = 'Reset';
                    resetBtn.style.cssText = 'float: right; margin-top: -5px;';
                    resetBtn.onclick = () => {
                        if (confirm('Reset all scoring data and start over?\n\nThis will clear your current session.')) {
                            resetState();
                            renderView();
                        }
                    };
                    header.appendChild(resetBtn);
                }
            }
        }

        // Source list from event-scoped cache saved at event load time
        let masterList = [];
        if (state.activeEventId) {
            try { masterList = JSON.parse(localStorage.getItem(`event:${state.activeEventId}:archers_v2`) || '[]'); } catch (_) { masterList = []; }
        }

        // If no event or no archers, show empty state
        if (!state.activeEventId || masterList.length === 0) {
            preassignedSetupControls.baleListContainer.innerHTML = '<div class="text-center text-gray-600 dark:text-gray-400 p-4">No Archers Available<br/>Connect to an event to load archers.</div>';
            return;
        }

        // Normalize to a common shape for rendering and for loadEntireBale
        const normalized = masterList.map(a => {
            const normalizedLevel = normalizeLevel(a.level);
            const normalizedGender = normalizeGender(a.gender);
            const extId = a.extId || getExtIdFromArcher(a);
            return {
                extId,
                firstName: safeString(a.firstName || a.first),
                lastName: safeString(a.lastName || a.last),
                school: safeString(a.school),
                level: normalizedLevel,
                gender: normalizedGender,
                division: a.division || deriveDivisionCode(normalizedGender, normalizedLevel),
                baleNumber: Number(a.baleNumber != null ? a.baleNumber : a.bale),
                target: safeString(a.targetAssignment || a.target),
                status: safeString(a.status || 'active')
            };
        }).filter(a => !!a.baleNumber);

        // Group archers by bale
        const baleGroups = {};
        normalized.forEach(archer => {
            if (!baleGroups[archer.baleNumber]) baleGroups[archer.baleNumber] = [];
            baleGroups[archer.baleNumber].push(archer);
        });

        // Render bale list
        preassignedSetupControls.baleListContainer.innerHTML = '';
        const sortedBales = Object.keys(baleGroups).sort((a, b) => parseInt(a) - parseInt(b));
        sortedBales.forEach(baleNumber => {
            const archers = baleGroups[baleNumber];
            const baleItem = document.createElement('div');
            baleItem.className = 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 md:p-4 mb-3 shadow-sm hover:shadow-md hover:border-primary dark:hover:border-blue-400 transition-all duration-200 flex flex-col md:flex-row md:items-center gap-3';

            baleItem.innerHTML = `
                <div class="flex-1 min-w-0">
                    <div class="text-lg font-bold text-primary dark:text-blue-400 mb-1">Bale ${baleNumber}</div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">${archers.length} archers</div>
                </div>
                <div class="md:ml-4 ml-0 flex-shrink-0 md:w-auto w-full">
                    <button class="w-full md:w-auto whitespace-nowrap px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark font-semibold transition-colors min-h-[44px] min-w-[120px]" onclick="loadEntireBale(${baleNumber}, ${JSON.stringify(archers).replace(/\"/g, '&quot;')})">
                        Start Scoring
                    </button>
                </div>
            `;

            // Render detailed archer list to match SetupNEW (Archer Name, School, Division, Bale, Target)
            const table = document.createElement('table');
            table.className = 'w-full mt-3 md:mt-4 border-collapse text-sm md:text-base';
            const thead = document.createElement('thead');
            thead.className = 'bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-200 dark:border-gray-600';
            thead.innerHTML = `
                <tr>
                    <th class="px-2 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide">Archer Name</th>
                    <th class="px-2 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide">School</th>
                    <th class="px-2 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide">Division</th>
                    <th class="px-2 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide">Bale</th>
                    <th class="px-2 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide">Target</th>
                </tr>`;
            const tbody = document.createElement('tbody');
            archers.forEach((a, index) => {
                const tr = document.createElement('tr');
                const isLast = index === archers.length - 1;
                tr.className = isLast ? 'hover:bg-gray-50 dark:hover:bg-gray-700' : 'border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700';
                const name = `${(a.firstName || '').trim()} ${(a.lastName || '').trim()}`.trim();
                const school = (a.school || '').toString();
                const division = (a.level || '').toString();
                const bale = a.baleNumber != null ? a.baleNumber : '';
                const target = (a.target || '').toString();
                tr.innerHTML = `
                    <td class="px-2 py-2 text-gray-900 dark:text-gray-100">${name}</td>
                    <td class="px-2 py-2 text-gray-900 dark:text-gray-100">${school}</td>
                    <td class="px-2 py-2 text-gray-900 dark:text-gray-100">${division}</td>
                    <td class="px-2 py-2 text-gray-900 dark:text-gray-100">${bale}</td>
                    <td class="px-2 py-2 text-gray-900 dark:text-gray-100">${target}</td>`;
                tbody.appendChild(tr);
            });
            table.appendChild(thead);
            table.appendChild(tbody);
            baleItem.appendChild(table);
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

    // --- ARCHER SELECTOR FUNCTIONS ---
    function refreshArcherRoster() {
        if (!archerSelector || typeof ArcherModule === 'undefined') return;
        try {
            // Load roster: prefer event-scoped cache when connected, fallback to device master list
            let roster = [];
            if (state.activeEventId) {
                try {
                    roster = JSON.parse(localStorage.getItem(`event:${state.activeEventId}:archers_v2`) || '[]');
                } catch (_) { roster = []; }
            }
            if ((!roster || roster.length === 0) && typeof ArcherModule !== 'undefined') {
                roster = ArcherModule.loadList() || [];
            }

            const ctx = getSelectorContext();
            archerSelector.setContext(ctx);
            archerSelector.setRoster(roster);
            if (manualSetupControls.searchInput && manualSetupControls.searchInput.value) {
                archerSelector.setFilter(manualSetupControls.searchInput.value);
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

    function handleSelectorChange(selectionMap) {
        // Convert ArcherSelector format (selectionMap) to state.archers format
        // selectionMap is { A: [archer1], B: [archer2], ... }

        // Clear existing archers and rebuild from selection map
        state.archers = [];

        RANKING_SELECTOR_GROUPS.forEach(group => {
            const selectedArchers = selectionMap[group.id] || [];
            selectedArchers.forEach(selectedArcher => {
                const overrides = {
                    extId: getExtIdFromArcher(selectedArcher),
                    targetAssignment: group.id, // Use groupId (A, B, C, D) as target assignment
                    baleNumber: state.baleNumber,
                    level: selectedArcher.level,
                    gender: selectedArcher.gender,
                    division: selectedArcher.division || deriveDivisionCode(
                        normalizeGender(selectedArcher.gender),
                        normalizeLevel(selectedArcher.level)
                    ),
                    scores: createEmptyScoreSheet(state.totalEnds)
                };
                const stateArcher = buildStateArcherFromRoster(selectedArcher, overrides);
                state.archers.push(stateArcher);
            });
        });

        updateSelectionCount();
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

        // Load roster to match archers
        let masterList = [];
        if (state.activeEventId) {
            try {
                masterList = JSON.parse(localStorage.getItem(`event:${state.activeEventId}:archers_v2`) || '[]');
            } catch (_) { masterList = []; }
        }
        if ((!masterList || masterList.length === 0) && typeof ArcherModule !== 'undefined') {
            masterList = ArcherModule.loadList() || [];
        }

        state.archers.forEach(archer => {
            const target = archer.targetAssignment || 'A';
            if (selection[target]) {
                // Find archer in roster by extId
                const extId = getExtIdFromArcher(archer);
                const rosterArcher = masterList.find(a => getExtIdFromArcher(a) === extId);
                if (rosterArcher) {
                    selection[target].push(rosterArcher);
                }
            }
        });

        archerSelector.setSelection(selection);
    }

    function renderManualArcherList() {
        if (!setupControls.container) return;

        // Use ArcherSelector component if available
        if (typeof ArcherSelector !== 'undefined' && typeof ArcherSelector.init === 'function') {
            if (!archerSelector) {
                // Try to initialize ArcherSelector
                try {
                    archerSelector = ArcherSelector.init(setupControls.container, {
                        groups: RANKING_SELECTOR_GROUPS,
                        emptyMessage: 'No archers found. Sync your roster to begin.',
                        onSelectionChange: handleSelectorChange,
                        onFavoriteToggle: handleFavoriteToggle,
                        showAvatars: true,
                        showFavoriteToggle: true
                    });

                    if (archerSelector) {
                        refreshArcherRoster();
                        syncSelectorSelection();
                    } else {
                        // Initialization returned null/undefined, use fallback
                        console.warn('ArcherSelector.init returned null/undefined, using fallback');
                        renderManualArcherListFallback();
                    }
                } catch (err) {
                    console.error('Failed to initialize ArcherSelector:', err);
                    // Fallback to old renderer on error
                    renderManualArcherListFallback();
                }
            } else {
                // ArcherSelector already initialized, refresh roster and sync selection
                refreshArcherRoster();
                syncSelectorSelection();
            }
        } else {
            // Fallback: use old list renderer if ArcherSelector is not available
            console.warn('ArcherSelector not available, using fallback renderer');
            renderManualArcherListFallback();
        }
    }

    function renderManualArcherListFallback() {
        if (!setupControls.container) return;
        setupControls.container.innerHTML = '';

        // Load roster: prefer event-scoped cache when connected, fallback to device master list
        let masterList = [];
        if (state.activeEventId) {
            try {
                masterList = JSON.parse(localStorage.getItem(`event:${state.activeEventId}:archers_v2`) || '[]');
            } catch (_) { masterList = []; }
        }
        if ((!masterList || masterList.length === 0) && typeof ArcherModule !== 'undefined') {
            masterList = ArcherModule.loadList();
        }

        if (masterList.length === 0) {
            setupControls.container.innerHTML = `
                <div class="text-center p-8 text-gray-600 dark:text-gray-400">
                    <div class="text-5xl mb-4">🎯</div>
                    <h3 class="text-xl font-bold text-gray-800 dark:text-white mb-2">No Archers Available</h3>
                    <p>Connect to an event to load archers.</p>
                </div>
            `;
            return;
        }

        const rosterState = getRosterState();
        const rosterMap = new Map(
            rosterState.list.map(item => [getExtIdFromArcher(item), item])
        );

        const enrichedList = masterList.map(archer => {
            const extId = getExtIdFromArcher(archer);
            const rosterMatch = extId ? rosterMap.get(extId) : null;
            return Object.assign({}, rosterMatch || {}, archer, { extId });
        });

        const searchTerm = manualSetupControls.searchInput ? manualSetupControls.searchInput.value.trim().toLowerCase() : '';
        const filteredList = enrichedList.filter(archer => {
            if (!searchTerm) return true;
            const first = safeString(archer.firstName || archer.first).toLowerCase();
            const last = safeString(archer.lastName || archer.last).toLowerCase();
            const school = safeString(archer.school).toLowerCase();
            return `${first} ${last}`.includes(searchTerm) || school.includes(searchTerm);
        }).sort((a, b) => {
            const aFirst = safeString(a.firstName || a.first).toLowerCase();
            const bFirst = safeString(b.firstName || b.first).toLowerCase();
            return aFirst.localeCompare(bFirst);
        });

        const targetPriority = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const selectedRows = [];
        const unselectedRows = [];

        filteredList.forEach(archer => {
            const first = safeString(archer.firstName || archer.first);
            const last = safeString(archer.lastName || archer.last);
            const school = safeString(archer.school);
            const extId = archer.extId || getExtIdFromArcher(archer);
            // Prefer database UUID if available, otherwise use extId or composite fallback
            const databaseUuid = archer.id || archer.archerId;
            const fallbackId = databaseUuid || extId || `${first.toLowerCase()}-${last.toLowerCase()}-${school.toLowerCase()}`;
            const uniqueId = fallbackId || `${first}-${last}`;
            const existingArcher = state.archers.find(a => (a.id || a.archerId || a.extId) === uniqueId);
            const rosterBale = Number(archer.baleNumber != null ? archer.baleNumber : archer.bale);
            let rosterTarget = (archer.targetAssignment || archer.target || '').toString().trim().toUpperCase();
            if (rosterTarget === '0') rosterTarget = '';
            let rosterAssignment = '—';
            if (!Number.isNaN(rosterBale) && rosterBale > 0) {
                rosterAssignment = rosterTarget ? `${rosterBale}${rosterTarget}` : `${rosterBale}`;
            } else if (rosterTarget) {
                rosterAssignment = rosterTarget;
            }
            const normalizedLevel = normalizeLevel(archer.level);
            const normalizedGender = normalizeGender(archer.gender);
            const rosterDivision = (archer.division || '').toString().trim().toUpperCase();
            const divisionCode = rosterDivision || deriveDivisionCode(normalizedGender, normalizedLevel);

            const rowData = {
                archer,
                first,
                last,
                school,
                extId,
                uniqueId,
                rosterAssignment,
                existingArcher,
                normalizedLevel,
                normalizedGender,
                divisionCode
            };

            if (existingArcher) {
                selectedRows.push(rowData);
            } else {
                unselectedRows.push(rowData);
            }
        });

        // Get roster state for sorting
        const { selfExtId, friendSet } = getRosterState();

        // Sort selected rows by target assignment
        selectedRows.sort((a, b) => {
            const aOrder = targetPriority.indexOf(a.existingArcher?.targetAssignment || '');
            const bOrder = targetPriority.indexOf(b.existingArcher?.targetAssignment || '');
            const safeA = aOrder === -1 ? Number.MAX_SAFE_INTEGER : aOrder;
            const safeB = bOrder === -1 ? Number.MAX_SAFE_INTEGER : bOrder;
            if (safeA === safeB) {
                return a.first.toLowerCase().localeCompare(b.first.toLowerCase());
            }
            return safeA - safeB;
        });

        // Sort unselected rows: Me first, then Friends, then rest by first name
        unselectedRows.sort((a, b) => {
            const aExtId = getExtIdFromArcher(a.archer) || a.extId;
            const bExtId = getExtIdFromArcher(b.archer) || b.extId;
            const aIsMe = selfExtId && aExtId === selfExtId;
            const bIsMe = selfExtId && bExtId === selfExtId;
            const aIsFriend = aExtId && friendSet.has(aExtId);
            const bIsFriend = bExtId && friendSet.has(bExtId);

            // Me comes first
            if (aIsMe && !bIsMe) return -1;
            if (!aIsMe && bIsMe) return 1;

            // Then friends
            if (aIsFriend && !bIsFriend) return -1;
            if (!aIsFriend && bIsFriend) return 1;

            // Then alphabetically by first name
            return a.first.toLowerCase().localeCompare(b.first.toLowerCase());
        });

        const orderedRows = [...selectedRows, ...unselectedRows];

        const table = document.createElement('table');
        table.style.cssText = 'width: 100%; border-collapse: collapse; margin-top: 1rem;';

        // Header
        const headerRow = document.createElement('tr');
        headerRow.className = 'bg-gray-100 dark:bg-gray-800 font-bold';

        const headers = ['Select', 'Archer Name', 'School', 'Division', 'Status', 'Target', 'Score'];
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            th.className = 'px-2 py-2 text-left border-b-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300';
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        orderedRows.forEach((rowData, index) => {
            const { archer, first, last, school, extId, uniqueId, rosterAssignment, existingArcher, divisionCode, normalizedLevel, normalizedGender } = rowData;
            const row = document.createElement('tr');
            row.className = `manual-archer-row ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}`;
            if (existingArcher) {
                row.classList.add('is-selected');
            }

            // Checkbox cell
            const checkboxCell = document.createElement('td');
            checkboxCell.className = 'px-2 py-2 border-b border-gray-200 dark:border-gray-700 text-center';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.style.cssText = 'transform: scale(1.2);';
            checkbox.checked = !!existingArcher;
            checkbox.dataset.extId = extId;

            // Target select dropdown
            const targetSelect = document.createElement('select');
            targetSelect.className = 'target-assignment-select';
            targetSelect.style.cssText = 'display: none; margin-left: 8px; padding: 2px 6px; font-size: 0.9em;';
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
                    // CRITICAL: Prevent adding to COMPLETED/VERIFIED cards
                    if (existingArcher) {
                        const cardStatus = existingArcher.cardStatus || existingArcher.card_status;
                        const verified = existingArcher.verified;
                        if (cardStatus === 'COMPLETED' || verified) {
                            checkbox.checked = false;
                            alert('🔒 SCORECARD LOCKED\n\nThis scorecard is completed/verified and cannot be edited.\n\nTo start a new round, reset and create a new scorecard.');
                            return;
                        }
                    }

                    // Enforce max 4 archers per bale
                    const selectedCount = state.archers.length;
                    if (selectedCount >= 4) {
                        checkbox.checked = false;
                        alert('Bale is full (4 archers).');
                        return;
                    }

                    // CRITICAL: Prevent mixing divisions in manual mode
                    // The first archer selected determines the division for the entire round
                    if (state.archers.length > 0) {
                        const firstArcher = state.archers[0];
                        const firstDivision = firstArcher.division;
                        if (divisionCode && firstDivision && divisionCode !== firstDivision) {
                            checkbox.checked = false;
                            const divName = (code) => {
                                if (code === 'BJV') return 'Boys JV';
                                if (code === 'GJV') return 'Girls JV';
                                if (code === 'BVAR') return 'Boys Varsity';
                                if (code === 'GVAR') return 'Girls Varsity';
                                return code;
                            };
                            alert(`Cannot mix divisions on the same bale.\n\nYou've selected ${divName(firstDivision)} archers.\nThis archer is in ${divName(divisionCode)}.\n\nPlease select archers from the same division, or press Reset to start over.`);
                            return;
                        }
                    }

                    if (!state.archers.some(a => (a.extId || a.id) === uniqueId)) {
                        const usedTargets = state.archers.map(a => a.targetAssignment);
                        const availableTargets = TARGET_LETTERS.filter(t => !usedTargets.includes(t));
                        const nextTarget = availableTargets.length > 0 ? availableTargets[0] : 'A';
                        const overrides = {
                            extId,
                            targetAssignment: nextTarget,
                            baleNumber: state.baleNumber,
                            division: divisionCode,
                            level: normalizedLevel,
                            gender: normalizedGender,
                            scores: createEmptyScoreSheet(state.totalEnds)
                        };
                        const stateArcher = buildStateArcherFromRoster(archer, overrides);
                        state.archers.push(stateArcher);
                        targetSelect.value = nextTarget;
                    }
                    targetSelect.style.display = 'inline-block';
                } else {
                    // Remove archer from state - check all possible ID fields
                    state.archers = state.archers.filter(a => {
                        const aId = a.id || a.archerId || a.extId;
                        return aId !== uniqueId;
                    });
                    targetSelect.style.display = 'none';
                    targetSelect.value = 'A'; // Reset target
                    row.classList.remove('is-selected');
                }
                saveData();
                updateSelectionCount();
                updateManualLiveControls();
                // Don't re-render on uncheck to preserve checkbox state
                if (checkbox.checked) {
                    renderManualArcherList();
                }
            };

            targetSelect.onchange = () => {
                const archerInState = state.archers.find(a => (a.extId || a.id) === uniqueId);
                if (archerInState) {
                    archerInState.targetAssignment = targetSelect.value;
                    saveData();
                    renderManualArcherList();
                }
            };

            checkboxCell.appendChild(checkbox);
            checkboxCell.appendChild(targetSelect);
            row.appendChild(checkboxCell);

            // Get roster state for Me/Friends indicators
            const { selfExtId, friendSet } = getRosterState();
            const archerExtId = getExtIdFromArcher(archer) || archer.extId || extId;
            const isMe = selfExtId && archerExtId === selfExtId;
            const isFriend = archerExtId && friendSet.has(archerExtId);

            // Archer Name cell with Me/Friends badges
            const nameCell = document.createElement('td');
            nameCell.className = 'px-2 py-2 border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200';
            const nameDiv = document.createElement('div');
            nameDiv.className = 'flex items-center gap-2';
            const nameSpan = document.createElement('span');
            nameSpan.textContent = `${first} ${last}`;
            nameDiv.appendChild(nameSpan);

            if (isMe) {
                const meBadge = document.createElement('span');
                meBadge.className = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-primary text-white';
                meBadge.textContent = 'Me';
                nameDiv.appendChild(meBadge);
            }
            if (isFriend) {
                const friendBadge = document.createElement('span');
                friendBadge.className = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-success text-white';
                friendBadge.textContent = '★';
                friendBadge.title = 'Friend';
                nameDiv.appendChild(friendBadge);
            }
            if (existingArcher) {
                const targetBadge = document.createElement('span');
                targetBadge.className = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-500 text-white';
                targetBadge.textContent = existingArcher.targetAssignment || '';
                nameDiv.appendChild(targetBadge);
            }
            nameCell.appendChild(nameDiv);
            row.appendChild(nameCell);

            const schoolCell = document.createElement('td');
            schoolCell.textContent = school || 'Unknown';
            schoolCell.className = 'px-2 py-2 border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200';
            row.appendChild(schoolCell);

            const divisionCell = document.createElement('td');
            divisionCell.textContent = divisionCode || '—';
            divisionCell.className = 'px-2 py-2 border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200';
            row.appendChild(divisionCell);

            // Status cell
            const statusCell = document.createElement('td');
            statusCell.className = 'px-2 py-2 border-b border-gray-200 dark:border-gray-700 text-center';
            const statusBadge = document.createElement('span');
            // Determine status based on existingArcher
            if (existingArcher) {
                const cardStatus = existingArcher.cardStatus || 'PENDING';
                const verified = existingArcher.verified || false;
                let statusText = 'PEND';
                let statusClass = 'bg-warning text-white';

                if (verified) {
                    statusText = 'VER';
                    statusClass = 'bg-success text-white';
                } else if (cardStatus === 'COMPLETED' || existingArcher.completed) {
                    statusText = 'COMP';
                    statusClass = 'bg-primary text-white';
                }

                statusBadge.className = `inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${statusClass}`;
                statusBadge.textContent = statusText;
            } else {
                statusBadge.className = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300';
                statusBadge.textContent = '-';
            }
            statusCell.appendChild(statusBadge);
            row.appendChild(statusCell);

            const targetCell = document.createElement('td');
            targetCell.textContent = rosterAssignment;
            targetCell.className = 'px-2 py-2 border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200';
            row.appendChild(targetCell);

            // Score cell - will be populated by fetchArcherScores()
            const scoreCell = document.createElement('td');
            scoreCell.className = 'archer-score-cell px-2 py-2 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-medium';
            scoreCell.dataset.archerId = archer.id || archer.archerId || '';  // Store archer UUID for lookup
            scoreCell.textContent = '—';
            row.appendChild(scoreCell);

            table.appendChild(row);
        });

        setupControls.container.appendChild(table);
        updateSelectionCount();
        updateManualLiveControls();

        // Fetch and display existing scores for this event
        if (state.activeEventId) {
            fetchAndDisplayArcherScores();
        }
    }

    /**
     * Fetch existing scores for archers in the current event and display in the list
     */
    async function fetchAndDisplayArcherScores() {
        if (!state.activeEventId) return;

        try {
            // Fetch event snapshot which includes all archers and their scores
            const res = await fetch(`${API_BASE}/events/${state.activeEventId}/snapshot`, {
                headers: {
                    'X-Passcode': localStorage.getItem('coach_passcode') || ''
                }
            });

            if (!res.ok) {
                console.warn('[fetchArcherScores] Snapshot API failed:', res.status);
                return;
            }

            const data = await res.json();
            console.log('[fetchArcherScores] Loaded snapshot for event:', state.activeEventId);
            console.log('[fetchArcherScores] Response structure:', {
                hasDivisions: !!data.divisions,
                divisionsType: Array.isArray(data.divisions) ? 'array' : typeof data.divisions,
                divisionsKeys: data.divisions ? Object.keys(data.divisions) : 'none',
                sampleDivision: data.divisions && data.divisions[0] ? Object.keys(data.divisions[0]) : 'none'
            });

            // Build a map of archers by UUID
            const snapshotArcherMap = new Map();

            // Handle both array format and object format
            let divisionsArray = [];
            if (Array.isArray(data.divisions)) {
                divisionsArray = data.divisions;
            } else if (data.divisions && typeof data.divisions === 'object') {
                // divisions might be an object keyed by division code
                divisionsArray = Object.values(data.divisions);
            }

            console.log('[fetchArcherScores] Processing', divisionsArray.length, 'divisions');

            divisionsArray.forEach((division, idx) => {
                console.log('[fetchArcherScores] Division', idx, ':', {
                    division: division.division,
                    hasArchers: !!division.archers,
                    archerCount: Array.isArray(division.archers) ? division.archers.length : 0
                });

                if (division.archers && Array.isArray(division.archers)) {
                    division.archers.forEach(archer => {
                        const archerId = archer.archerId || archer.id;
                        if (archerId) {
                            snapshotArcherMap.set(archerId, archer);
                        }
                    });
                }
            });

            console.log('[fetchArcherScores] Found', snapshotArcherMap.size, 'archers in snapshot');

            // Update score cells by matching UUID
            const scoreCells = document.querySelectorAll('.archer-score-cell');
            scoreCells.forEach(cell => {
                const archerId = cell.dataset.archerId;
                if (!archerId) return;

                const snapshotArcher = snapshotArcherMap.get(archerId);
                if (snapshotArcher) {
                    const score = snapshotArcher.runningTotal || 0;
                    if (score > 0) {
                        cell.textContent = score;
                        cell.style.color = '#2ecc71';  // Green for completed scores
                        cell.style.fontWeight = '600';
                        console.log('[fetchArcherScores]', snapshotArcher.firstName, snapshotArcher.lastName, 'has score:', score);
                    }
                }
            });
        } catch (err) {
            console.error('[fetchArcherScores] Error:', err);
        }
    }

    /**
     * Load existing scores for selected archers before starting scoring
     * This allows editing existing scorecards
     */
    async function loadExistingScoresForArchers() {
        if (!state.activeEventId || state.archers.length === 0) return;

        console.log('[loadExistingScores] Checking for existing scores for', state.archers.length, 'archers');

        try {
            // Fetch event snapshot
            const res = await fetch(`${API_BASE}/events/${state.activeEventId}/snapshot`, {
                headers: {
                    'X-Passcode': localStorage.getItem('coach_passcode') || ''
                }
            });

            if (!res.ok) {
                console.warn('[loadExistingScores] Could not fetch event data, status:', res.status);
                return;
            }

            const data = await res.json();
            let foundScores = false;

            // Build a map of archers by UUID for fast lookup
            const snapshotArcherMap = new Map();

            // Handle both array format and object format
            let divisionsArray = [];
            if (Array.isArray(data.divisions)) {
                divisionsArray = data.divisions;
            } else if (data.divisions && typeof data.divisions === 'object') {
                divisionsArray = Object.values(data.divisions);
            }

            divisionsArray.forEach(division => {
                if (division.archers && Array.isArray(division.archers)) {
                    division.archers.forEach(archer => {
                        const archerId = archer.archerId || archer.id;
                        if (archerId) {
                            snapshotArcherMap.set(archerId, archer);
                        }
                    });
                }
            });

            console.log('[loadExistingScores] Snapshot has', snapshotArcherMap.size, 'archers');

            // For each archer in state, check if they have existing scores
            state.archers.forEach(stateArcher => {
                const archerId = stateArcher.archerId || stateArcher.id;
                console.log('[loadExistingScores] Looking for archer:', stateArcher.firstName, stateArcher.lastName, 'UUID:', archerId);

                if (!archerId) {
                    console.warn('[loadExistingScores] No UUID for archer:', stateArcher.firstName, stateArcher.lastName);
                    return;
                }

                const apiArcher = snapshotArcherMap.get(archerId);
                if (apiArcher) {
                    console.log('[loadExistingScores] Found API match for:', stateArcher.firstName, stateArcher.lastName);
                    console.log('[loadExistingScores] API archer has', apiArcher.scorecard?.ends?.length || 0, 'ends');

                    if (apiArcher.scorecard && apiArcher.scorecard.ends) {
                        const ends = apiArcher.scorecard.ends;
                        if (ends.length > 0) {
                            console.log(`[loadExistingScores] Loading ${ends.length} ends for ${stateArcher.firstName} ${stateArcher.lastName}`);
                            foundScores = true;

                            // Populate the scores array
                            ends.forEach(end => {
                                const endIndex = (end.endNumber || 1) - 1;
                                if (endIndex >= 0 && endIndex < state.totalEnds) {
                                    stateArcher.scores[endIndex] = [
                                        end.a1 || '',
                                        end.a2 || '',
                                        end.a3 || ''
                                    ];
                                    console.log(`[loadExistingScores] End ${end.endNumber}:`, end.a1, end.a2, end.a3);
                                }
                            });

                            // Store the round_archer_id if available
                            if (apiArcher.roundArcherId) {
                                stateArcher.roundArcherId = apiArcher.roundArcherId;
                                console.log('[loadExistingScores] Stored roundArcherId:', apiArcher.roundArcherId);
                            }

                            // CRITICAL: Update division from API if available (needed for Live Updates resume)
                            // Find which division this archer belongs to in the snapshot
                            divisionsArray.forEach(div => {
                                if (div.archers && div.archers.some(a => (a.archerId || a.id) === archerId)) {
                                    // Found the division for this archer
                                    // Map division name back to code if possible, or use raw code
                                    // The snapshot keys are usually the codes (BVAR, etc)
                                    // But here we are iterating values. We need the key.
                                }
                            });

                            // Simpler: The API structure is divisions[CODE] = { ... }
                            // We flattened it to array, but we can look up the key in the original object
                            if (data.divisions && typeof data.divisions === 'object') {
                                Object.keys(data.divisions).forEach(divCode => {
                                    const div = data.divisions[divCode];
                                    if (div.archers && div.archers.some(a => (a.archerId || a.id) === archerId)) {
                                        stateArcher.division = divCode;
                                        console.log(`[loadExistingScores] Updated division for ${stateArcher.firstName}: ${divCode}`);

                                        // CRITICAL FIX 2: Set global division code from first match
                                        if (!state.divisionCode) {
                                            state.divisionCode = divCode;
                                            console.log(`[loadExistingScores] ✅ Set global division code: ${divCode}`);
                                        }

                                        // Also capture roundId if available
                                        if (!state.divisionRoundId && div.roundId) {
                                            state.divisionRoundId = div.roundId;
                                            console.log(`[loadExistingScores] ✅ Set global roundId: ${div.roundId}`);
                                        }
                                    }
                                });
                            }


                            // Update current end to first incomplete end or last end
                            const lastEndNumber = ends.length;
                            const nextEnd = Math.min(lastEndNumber + 1, state.totalEnds);
                            state.currentEnd = nextEnd;
                            console.log('[loadExistingScores] Set currentEnd to:', nextEnd);
                        }
                    }
                } else {
                    console.log('[loadExistingScores] No API match found for UUID:', archerId);
                }
            });

            if (foundScores) {
                console.log('[loadExistingScores] ✅ Successfully loaded existing scores, current end:', state.currentEnd);
                saveData();  // Save the loaded scores to localStorage
            } else {
                console.log('[loadExistingScores] ℹ️  No existing scores found for selected archers');
            }

        } catch (err) {
            console.error('[loadExistingScores] ❌ Error loading existing scores:', err);
        }
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

        // Sort by first name
        baleArchers.sort((a, b) => {
            const aFirst = (a.firstName || '').toString().toLowerCase();
            const bFirst = (b.firstName || '').toString().toLowerCase();
            return aFirst.localeCompare(bFirst);
        });

        const banner = document.createElement('div');
        banner.className = 'pre-assigned-banner';
        banner.style.cssText = 'background: #e3f2fd; padding: 12px; margin-bottom: 12px; border-radius: 4px; border-left: 4px solid #2196f3;';
        banner.innerHTML = `
            <div class="font-bold mb-1 text-gray-800 dark:text-white">📌 Pre-Assigned Bale</div>
            <div class="text-sm text-gray-700 dark:text-gray-300">Bale ${state.baleNumber} - ${state.divisionName || 'Division'}</div>
            <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
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
            <div class="font-bold mb-1 text-gray-800 dark:text-white">⚠️ No Archers Assigned</div>
            <div class="text-sm text-gray-700 dark:text-gray-300">Bale ${baleNumber} has no archers assigned</div>
            <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Try a different bale number or switch to manual mode</div>
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
            tableContainer.className = 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 border-t-0 rounded-b transition-colors duration-200';

            const table = document.createElement('table');
            table.className = 'w-full border-collapse';

            // Create header row with checkbox column
            const headerRow = document.createElement('tr');
            headerRow.className = 'bg-gray-100 dark:bg-gray-800 font-bold';

            const headers = ['Select', 'Archer Name', 'School', 'Division', 'Status', 'Target'];
            headers.forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                th.className = 'px-2 py-2 text-left border-b-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300';
                headerRow.appendChild(th);
            });
            table.appendChild(headerRow);

            // Create data rows for unassigned archers with checkboxes
            unassignedArchers.forEach((archer, index) => {
                const row = document.createElement('tr');
                row.className = index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800';

                // Checkbox cell
                const checkboxCell = document.createElement('td');
                checkboxCell.className = 'px-2 py-2 border-b border-gray-200 dark:border-gray-700 text-center';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.style.cssText = 'transform: scale(1.2);';

                const first = safeString(archer.first);
                const last = safeString(archer.last);
                const school = safeString(archer.school);
                const extId = getExtIdFromArcher({ firstName: first, lastName: last, school, extId: archer.extId });
                // Prefer database UUID if available
                const databaseUuid = archer.id || archer.archerId;
                const uniqueId = databaseUuid || extId || `${first.toLowerCase()}-${last.toLowerCase()}-${school.toLowerCase()}`;
                const existingArcher = state.archers.find(a => (a.id || a.archerId || a.extId) === uniqueId);
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
                        // CRITICAL: Prevent adding to COMPLETED/VERIFIED cards
                        if (existingArcher) {
                            const cardStatus = existingArcher.cardStatus || existingArcher.card_status;
                            const verified = existingArcher.verified;
                            if (cardStatus === 'COMPLETED' || verified) {
                                checkbox.checked = false;
                                alert('🔒 SCORECARD LOCKED\n\nThis scorecard is completed/verified and cannot be edited.\n\nTo start a new round, reset and create a new scorecard.');
                                return;
                            }
                        }

                        // Enforce max 4 archers per bale
                        const selectedCount = state.archers.length;
                        if (selectedCount >= 4) {
                            checkbox.checked = false;
                            alert('Bale is full (4 archers).');
                            return;
                        }
                        if (!state.archers.some(a => (a.extId || a.id) === uniqueId)) {
                            const usedTargets = state.archers.map(a => a.targetAssignment);
                            const availableTargets = TARGET_LETTERS.filter(t => !usedTargets.includes(t));
                            const nextTarget = availableTargets.length > 0 ? availableTargets[0] : 'A';
                            const overrides = {
                                extId: uniqueId,
                                targetAssignment: nextTarget,
                                baleNumber: state.baleNumber,
                                level: archer.level,
                                gender: archer.gender,
                                division: archer.division,
                                scores: createEmptyScoreSheet(state.totalEnds)
                            };
                            const rosterPayload = {
                                firstName: first,
                                lastName: last,
                                school,
                                level: archer.level,
                                gender: archer.gender,
                                division: archer.division
                            };
                            const stateArcher = buildStateArcherFromRoster(rosterPayload, overrides);
                            state.archers.push(stateArcher);
                            targetSelect.value = nextTarget;
                        }
                        targetSelect.style.display = 'inline-block';
                    } else {
                        // Remove archer from state - check all possible ID fields
                        state.archers = state.archers.filter(a => {
                            const aId = a.id || a.archerId || a.extId;
                            return aId !== uniqueId;
                        });
                        targetSelect.style.display = 'none';
                        targetSelect.value = 'A'; // Reset target
                        row.classList.remove('is-selected');
                    }
                    saveData();
                    // Update selected count chip
                    const chip = document.getElementById('selected-count-chip');
                    if (chip) chip.textContent = `${state.archers.length}/4`;
                };

                targetSelect.onchange = () => {
                    const archerInState = state.archers.find(a => (a.extId || a.id) === uniqueId);
                    if (archerInState) {
                        archerInState.targetAssignment = targetSelect.value;
                        saveData();
                    }
                };

                checkboxCell.appendChild(checkbox);
                checkboxCell.appendChild(targetSelect);
                row.appendChild(checkboxCell);

                // Get roster state for Me/Friends indicators
                const { selfExtId, friendSet } = getRosterState();
                const archerExtId = getExtIdFromArcher({ firstName: first, lastName: last, school, extId: archer.extId }) || archer.extId || uniqueId;
                const isMe = selfExtId && archerExtId === selfExtId;
                const isFriend = archerExtId && friendSet.has(archerExtId);

                // Archer Name cell with Me/Friends badges
                const nameCell = document.createElement('td');
                nameCell.className = 'px-2 py-2 border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200';
                const nameDiv = document.createElement('div');
                nameDiv.className = 'flex items-center gap-2';
                const nameSpan = document.createElement('span');
                nameSpan.textContent = `${archer.first} ${archer.last}`;
                nameDiv.appendChild(nameSpan);

                if (isMe) {
                    const meBadge = document.createElement('span');
                    meBadge.className = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-primary text-white';
                    meBadge.textContent = 'Me';
                    nameDiv.appendChild(meBadge);
                }
                if (isFriend) {
                    const friendBadge = document.createElement('span');
                    friendBadge.className = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-success text-white';
                    friendBadge.textContent = '★';
                    friendBadge.title = 'Friend';
                    nameDiv.appendChild(friendBadge);
                }
                nameCell.appendChild(nameDiv);
                row.appendChild(nameCell);

                // School cell
                const schoolCell = document.createElement('td');
                schoolCell.textContent = archer.school || 'Unknown';
                schoolCell.className = 'px-2 py-2 border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200';
                row.appendChild(schoolCell);

                // Division cell
                const divisionCell = document.createElement('td');
                divisionCell.textContent = archer.level || 'VAR';
                divisionCell.className = 'px-2 py-2 border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200';
                row.appendChild(divisionCell);

                // Status cell
                const statusCell = document.createElement('td');
                statusCell.className = 'px-2 py-2 border-b border-gray-200 dark:border-gray-700 text-center';
                const statusBadge = document.createElement('span');
                // Determine status based on existingArcher
                if (existingArcher) {
                    const cardStatus = existingArcher.cardStatus || 'PENDING';
                    const verified = existingArcher.verified || false;
                    let statusText = 'PEND';
                    let statusClass = 'bg-warning text-white';

                    if (verified) {
                        statusText = 'VER';
                        statusClass = 'bg-success text-white';
                    } else if (cardStatus === 'COMPLETED' || existingArcher.completed) {
                        statusText = 'COMP';
                        statusClass = 'bg-primary text-white';
                    }

                    statusBadge.className = `inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${statusClass}`;
                    statusBadge.textContent = statusText;
                } else {
                    statusBadge.className = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300';
                    statusBadge.textContent = '-';
                }
                statusCell.appendChild(statusBadge);
                row.appendChild(statusCell);

                // Target cell
                const targetCell = document.createElement('td');
                targetCell.textContent = 'Unassigned';
                targetCell.className = 'px-2 py-2 border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200';
                row.appendChild(targetCell);

                table.appendChild(row);
            });

            tableContainer.appendChild(table);
            unassignedSection.appendChild(tableContainer);
            setupControls.container.appendChild(unassignedSection);
        }
    }

    // Function to load entire bale when clicking on any archer
    window.loadEntireBale = async function (baleNumber, archersInBale) {
        // Clear existing archers
        state.archers = [];
        state.baleNumber = parseInt(baleNumber);

        // Add all archers from this bale
        const targets = TARGET_LETTERS;
        archersInBale.forEach((archer, index) => {
            const targetAssignment = safeString(archer.target) || targets[index] || 'A';
            const overrides = {
                extId: archer.extId || getExtIdFromArcher(archer),
                targetAssignment,
                baleNumber: parseInt(baleNumber),
                division: archer.division,
                level: archer.level,
                gender: archer.gender,
                scores: createEmptyScoreSheet(state.totalEnds)
            };
            const rosterPayload = Object.assign({}, archer, {
                targetAssignment,
                baleNumber: parseInt(baleNumber)
            });
            const stateArcher = buildStateArcherFromRoster(rosterPayload, overrides);
            state.archers.push(stateArcher);
        });

        // Set assignment mode to pre-assigned since we're loading a complete bale
        state.assignmentMode = 'pre-assigned';
        saveData();

        // Load existing scores for these archers (if any)
        await loadExistingScoresForArchers();

        // Initialize Live Updates if enabled
        if (typeof LiveUpdates !== 'undefined') {
            try {
                const cfg = JSON.parse(localStorage.getItem('live_updates_config') || '{}');
                const isLiveEnabled = cfg.enabled !== undefined ? !!cfg.enabled : true;  // Default ON
                if (isLiveEnabled && !LiveUpdates._state.roundId) {
                    const today = new Date().toISOString().slice(0, 10);
                    const firstArcher = state.archers[0];
                    const division = (firstArcher && firstArcher.division) || null;
                    const gender = (firstArcher && firstArcher.gender) || null;
                    const level = (firstArcher && firstArcher.level) || null;

                    LiveUpdates.ensureRound({
                        roundType: 'R300',
                        date: today,
                        division,
                        gender,
                        level,
                        eventId: state.activeEventId || state.selectedEventId
                    }).then(() => {
                        console.log('Live Updates: Round initialized for bale', state.baleNumber);
                        // Ensure all archers are registered
                        return Promise.all(state.archers.map(a => LiveUpdates.ensureArcher(a.id, a)));
                    }).then(() => {
                        console.log('Live Updates: All archers initialized');
                    }).catch(err => {
                        console.error('Live Updates initialization failed:', err);
                    });
                }
            } catch (e) {
                console.warn('Live Updates init error:', e);
            }
        }

        // PHASE 0: Save session for recovery on page reload
        saveCurrentBaleSession();

        // Transition to scoring view
        state.currentView = 'scoring';
        renderView();

        // Scroll to the top to show the scoring interface
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderScoringView() {
        if (!scoringControls.container) return;

        // Update header with event name, division, and round type
        const eventEl = document.getElementById('scoring-header-event');
        const divisionEl = document.getElementById('scoring-header-division');
        const roundTypeEl = document.getElementById('scoring-header-round-type');
        
        // Get event name from state, or try to load from localStorage/event metadata
        let displayEventName = state.eventName;
        if (!displayEventName && state.activeEventId) {
            try {
                const eventMeta = localStorage.getItem(`event:${state.activeEventId}:meta`);
                if (eventMeta) {
                    const meta = JSON.parse(eventMeta);
                    displayEventName = meta.name || '';
                }
            } catch (_) {}
        }
        if (!displayEventName && state.selectedEventId) {
            try {
                const eventMeta = localStorage.getItem(`event:${state.selectedEventId}:meta`);
                if (eventMeta) {
                    const meta = JSON.parse(eventMeta);
                    displayEventName = meta.name || '';
                }
            } catch (_) {}
        }
        
        if (eventEl) {
            eventEl.textContent = displayEventName || 'Event Name';
        }
        
        if (divisionEl) {
            // Use divisionCode (e.g., "BVAR") or fallback to divisionName or "Division"
            divisionEl.textContent = state.divisionCode || state.divisionName || 'Division';
        }
        
        if (roundTypeEl) {
            roundTypeEl.textContent = 'R300'; // Round type is always R300 for this module
        }

        // Update bale and end displays
        const baleDisplay = document.getElementById('current-bale-display');
        const endDisplay = document.getElementById('current-end-display');
        if (baleDisplay) baleDisplay.textContent = state.baleNumber;
        if (endDisplay) endDisplay.textContent = state.currentEnd;

        // Sync column removed per user request
        let isLiveEnabled = false;  // Disabled - sync column removed

        let tableHTML = `
            <table class="w-full border-collapse text-sm bg-white dark:bg-gray-700 min-w-[450px]">
                <thead class="bg-primary dark:bg-primary-dark text-white sticky top-0">
                    <tr>
                        <th class="px-1.5 py-2 text-left font-bold sticky left-0 bg-primary dark:bg-primary-dark z-10 max-w-[85px]">Archer</th>
                        <th class="px-0.5 py-2 text-center font-bold w-8">A1</th>
                        <th class="px-0.5 py-2 text-center font-bold w-8">A2</th>
                        <th class="px-0.5 py-2 text-center font-bold w-8">A3</th>
                        <th class="px-0.5 py-2 text-center font-bold w-10">End</th>
                        <th class="px-0.5 py-2 text-center font-bold w-12">Run</th>
                        <th class="px-0.5 py-2 text-center font-bold w-6">X</th>
                        <th class="px-0.5 py-2 text-center font-bold w-6">10</th>
                        <th class="px-0.5 py-2 text-center font-bold w-8">Card</th>
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
            // Running total: sum of all ends up to and including current end
            let runningTotal = 0;
            for (let i = 0; i < state.currentEnd; i++) {
                const end = archer.scores[i];
                if (Array.isArray(end)) {
                    end.forEach(score => {
                        if (score !== null && score !== '') runningTotal += parseScoreValue(score);
                    });
                }
            }
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
            const status = (archer.cardStatus || 'PENDING').toUpperCase();
            const isLocked = !!state.activeEventId && (archer.locked || status === 'VER' || status === 'VERIFIED' || status === 'VOID');
            const rowLockAttr = isLocked ? 'data-locked="true" class="locked-scorecard-row"' : '';
            const lockedAttr = isLocked ? 'data-locked="true" tabindex="-1" disabled' : 'data-locked="false"';

            tableHTML += `
                <tr data-archer-id="${archer.id}" ${rowLockAttr} class="border-b border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-600">
                    <td class="px-1.5 py-0 text-left text-xs font-semibold sticky left-0 bg-white dark:bg-gray-700 text-gray-800 dark:text-white truncate max-w-[85px] h-[44px] align-middle">${archer.firstName} ${archer.lastName.charAt(0)}. (${archer.targetAssignment})</td>
                    <td class="p-0 border-r border-gray-200 dark:border-gray-600"><input type="text" class="score-input w-full h-[44px] text-center font-bold border-none bg-score-${getScoreColorClass(safeEndScores[0])} ${getScoreTextColor(safeEndScores[0])} ${isLocked ? 'locked-score-input' : ''}" data-archer-id="${archer.id}" data-arrow-idx="0" value="${safeEndScores[0] || ''}" ${lockedAttr} readonly></td>
                    <td class="p-0 border-r border-gray-200 dark:border-gray-600"><input type="text" class="score-input w-full h-[44px] text-center font-bold border-none bg-score-${getScoreColorClass(safeEndScores[1])} ${getScoreTextColor(safeEndScores[1])} ${isLocked ? 'locked-score-input' : ''}" data-archer-id="${archer.id}" data-arrow-idx="1" value="${safeEndScores[1] || ''}" ${lockedAttr} readonly></td>
                    <td class="p-0 border-r border-gray-200 dark:border-gray-600"><input type="text" class="score-input w-full h-[44px] text-center font-bold border-none bg-score-${getScoreColorClass(safeEndScores[2])} ${getScoreTextColor(safeEndScores[2])} ${isLocked ? 'locked-score-input' : ''}" data-archer-id="${archer.id}" data-arrow-idx="2" value="${safeEndScores[2] || ''}" ${lockedAttr} readonly></td>
                    <td class="px-0.5 py-0.5 text-center bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-white font-bold border-r border-gray-200 dark:border-gray-600 text-xs" data-archer-id="${archer.id}" data-total-type="end">${endTotal}</td>
                    <td class="px-0.5 py-0.5 text-center bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-white border-r border-gray-200 dark:border-gray-600 text-xs" data-archer-id="${archer.id}" data-total-type="running">${runningTotal}</td>
                    <td class="px-0.5 py-0.5 text-center bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-white border-r border-gray-200 dark:border-gray-600 text-xs" data-archer-id="${archer.id}" data-total-type="xs">${endXs}</td>
                    <td class="px-0.5 py-0.5 text-center bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-white border-r border-gray-200 dark:border-gray-600 text-xs" data-archer-id="${archer.id}" data-total-type="tens">${endTens + endXs}</td>
                    <td class="px-0.5 py-0 text-center h-[44px] align-middle"><button class="view-card-btn w-8 h-[44px] bg-primary text-white rounded text-xs hover:bg-primary-dark flex items-center justify-center" data-archer-id="${archer.id}">📄</button></td>
                </tr>`;
        });
        tableHTML += `</tbody></table>`;
        scoringControls.container.innerHTML = tableHTML;

        // Re-attach keypad event handlers to new score inputs
        attachKeypadHandlers();

        // Attach card view button handlers
        document.querySelectorAll('.view-card-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const archerId = btn.dataset.archerId;
                if (archerId) {
                    state.currentView = 'card';
                    state.activeArcherId = archerId;
                    renderView();
                }
            };
        });

        // Ensure navigation button labels and handlers
        const prevBtn = document.getElementById('prev-end-btn');
        const nextBtn = document.getElementById('next-end-btn');
        if (prevBtn) { prevBtn.textContent = '← Back'; prevBtn.onclick = () => changeEnd(-1); }
        if (nextBtn) { nextBtn.textContent = 'Next →'; nextBtn.onclick = () => changeEnd(1); }

        // Update live status display and complete button after rendering
        updateLiveStatusDisplay();
        updateCompleteButton();
    }

    function renderCardView(archerId) {
        const archer = state.archers.find(a => a.id == archerId);
        if (!archer) return;

        // Set active archer ID for navigation
        state.activeArcherId = archerId;

        // Update card view header
        const archerNameEl = cardControls.archerNameDisplay;
        if (archerNameEl) {
            archerNameEl.textContent = `${archer.firstName} ${archer.lastName}`;
        }

        const divisionEl = document.getElementById('card-view-division');
        const roundEl = document.getElementById('card-view-round');
        if (divisionEl) {
            divisionEl.textContent = archer.level || '';
        }
        if (roundEl) {
            roundEl.textContent = `R300`;
        }

        // Update status badge in header
        const statusBadgeEl = document.getElementById('card-view-status-badge');
        if (statusBadgeEl) {
            const cardStatus = (archer.cardStatus || 'PENDING').toUpperCase();
            let statusBadge = '';
            if (cardStatus === 'VER' || cardStatus === 'VERIFIED') {
                statusBadge = '<span class="inline-block px-3 py-1 text-sm font-bold rounded bg-success text-white">✓ VER</span>';
            } else if (cardStatus === 'COMP' || cardStatus === 'COMPLETED') {
                statusBadge = '<span class="inline-block px-3 py-1 text-sm font-bold rounded bg-primary text-white">COMP</span>';
            } else if (cardStatus === 'VOID') {
                statusBadge = '<span class="inline-block px-3 py-1 text-sm font-bold rounded bg-danger text-white">✗ VOID</span>';
            } else {
                statusBadge = '<span class="inline-block px-3 py-1 text-sm font-bold rounded bg-warning text-white">PEND</span>';
            }
            statusBadgeEl.innerHTML = statusBadge;
        }

        // Convert archer data to ScorecardView format
        const archerData = {
            id: archer.id,
            firstName: archer.firstName,
            lastName: archer.lastName,
            school: archer.school,
            level: archer.level,
            gender: archer.gender,
            targetAssignment: archer.targetAssignment || '',
            scores: archer.scores,
            cardStatus: archer.cardStatus || 'PENDING',
            verified: archer.cardStatus === 'VER',
            completed: archer.scores.filter(s => s.every(val => val !== '')).length >= state.totalEnds
        };

        const roundData = {
            totalEnds: state.totalEnds,
            eventName: state.eventName || 'Ranking Round',
            division: archer.level || '',
            roundType: 'R300'
        };

        // Render scorecard into card view container (not modal)
        const container = cardControls.container;
        if (container && typeof ScorecardView !== 'undefined' && ScorecardView.renderScorecard) {
            const scorecardHTML = ScorecardView.renderScorecard(archerData, roundData, {
                showHeader: false, // We have our own header
                showFooter: true,
                showStatus: false // Status badge will be in our header
            });
            container.innerHTML = scorecardHTML;
        } else {
            console.error('ScorecardView not available or container not found');
            container.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 py-8">Unable to render scorecard</p>';
        }

        // Update Complete button visibility
        updateCompleteCardButton(archer);
        
        // Ensure button handlers are attached (in case they weren't wired up yet)
        ensureCardViewHandlers();
    }
    
    function ensureCardViewHandlers() {
        // Re-attach handlers to ensure they work
        if (cardControls.backToScoringBtn) {
            cardControls.backToScoringBtn.onclick = () => { 
                state.currentView = 'scoring'; 
                renderView(); 
            };
        }
        if (cardControls.exportBtn) {
            cardControls.exportBtn.onclick = showExportModal;
        }
        if (cardControls.prevArcherBtn) {
            cardControls.prevArcherBtn.onclick = () => navigateArchers(-1);
        }
        if (cardControls.nextArcherBtn) {
            cardControls.nextArcherBtn.onclick = () => navigateArchers(1);
        }
        
        // Complete card button
        const completeCardBtn = document.getElementById('complete-card-btn');
        if (completeCardBtn) {
            completeCardBtn.onclick = async () => {
                const archer = state.archers.find(a => a.id === state.activeArcherId);
                if (!archer) return;
                
                // Check if all ends are complete
                const allEndsComplete = archer.scores.filter(s => s.every(val => val !== '' && val !== null)).length >= state.totalEnds;
                if (!allEndsComplete) {
                    alert('Please complete all 10 ends before marking card as complete.');
                    return;
                }
                
                // Confirm action
                if (!confirm('Mark this scorecard as Complete?\n\nThis indicates you have verified the digital card matches the paper card. Coaches can then verify it.')) {
                    return;
                }
                
                // Update card status to COMP
                const success = await updateCardStatus(archer.id, 'COMP');
                if (success) {
                    // Refresh card view
                    renderCardView(archer.id);
                }
            };
        }
    }

    async function updateCardStatus(archerId, newStatus) {
        const archer = state.archers.find(a => a.id === archerId);
        if (!archer) {
            console.warn('[updateCardStatus] Archer not found:', archerId);
            return false;
        }

        // Check if we have roundArcherId
        if (!archer.roundArcherId) {
            console.warn('[updateCardStatus] No roundArcherId for archer:', archerId);
            alert('Unable to update status: Scorecard not yet saved to database. Please ensure all scores are synced.');
            return false;
        }

        try {
            const response = await fetch(`${API_BASE}/round_archers/${archer.roundArcherId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Event-Code': state.eventEntryCode || ''
                },
                body: JSON.stringify({
                    cardStatus: newStatus
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const result = await response.json();
            
            // Update local state
            archer.cardStatus = result.cardStatus || newStatus;
            if (result.completed !== undefined) {
                archer.completed = result.completed;
            }
            
            console.log('[updateCardStatus] Status updated:', result);
            return true;
        } catch (err) {
            console.error('[updateCardStatus] Failed:', err);
            alert('Failed to update card status: ' + err.message);
            return false;
        }
    }

    function updateCompleteCardButton(archer) {
        const completeBtn = document.getElementById('complete-card-btn');
        if (!completeBtn) return;

        // Check if all ends are complete
        const allEndsComplete = archer.scores.filter(s => s.every(val => val !== '' && val !== null)).length >= state.totalEnds;
        const currentStatus = (archer.cardStatus || 'PENDING').toUpperCase();
        
        // Show button only if:
        // 1. All ends are complete
        // 2. Status is not already COMP, VER, or VOID
        if (allEndsComplete && currentStatus !== 'COMP' && currentStatus !== 'COMPLETED' && currentStatus !== 'VER' && currentStatus !== 'VERIFIED' && currentStatus !== 'VOID') {
            completeBtn.classList.remove('hidden');
        } else {
            completeBtn.classList.add('hidden');
        }
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
        let tableHTML = `<table class="w-full border-collapse text-sm bg-white dark:bg-gray-700 mb-4"><thead class="bg-primary dark:bg-primary-dark text-white"><tr><th class="px-2 py-2 text-left font-bold">Archer</th><th class="px-2 py-2 text-center font-bold">10s</th><th class="px-2 py-2 text-center font-bold">Xs</th><th class="px-2 py-2 text-center font-bold">Total</th><th class="px-2 py-2 text-center font-bold">Avg</th></tr></thead><tbody>`;
        totals.forEach((archer, idx) => {
            const rowBg = idx % 2 === 0 ? 'bg-white dark:bg-gray-700' : 'bg-gray-50 dark:bg-gray-800';
            tableHTML += `<tr class="${rowBg} border-b border-gray-200 dark:border-gray-600"><td class="px-2 py-1 text-left text-gray-800 dark:text-white">${archer.name}</td><td class="px-2 py-1 text-center text-gray-800 dark:text-white">${archer.tens}</td><td class="px-2 py-1 text-center text-gray-800 dark:text-white">${archer.xs}</td><td class="px-2 py-1 text-center font-bold text-gray-800 dark:text-white">${archer.totalScore}</td><td class="px-2 py-1 text-center text-gray-800 dark:text-white">${archer.avgArrow}</td></tr>`;
        });
        tableHTML += `</tbody></table>`;
        verifyModal.container.innerHTML = tableHTML;
        if (verifyModal.element) {
            verifyModal.element.classList.remove('hidden');
            verifyModal.element.classList.add('flex');
        }
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

        // CRITICAL FIX: Don't set inline style.display - it overrides Tailwind's hidden class
        // The HTML already has class="hidden" - we'll use classList.add/remove('hidden') to control visibility

        // Tailwind-styled keypad (keeping keypad-btn class for event handler)
        // New 4x3 layout: no gaps, no navigation buttons, no rounded corners, edge-to-edge borders
        keypad.element.innerHTML = `
            <div class="grid grid-cols-4 gap-0 w-full">
                <!-- Row 1: X, 10, 9, M -->
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-gold text-black min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 rounded-none" style="border-radius: 0 !important;" data-value="X">X</button>
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-gold text-black min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 rounded-none" style="border-radius: 0 !important;" data-value="10">10</button>
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-gold text-black min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 rounded-none" style="border-radius: 0 !important;" data-value="9">9</button>
                <button class="keypad-btn p-4 text-xl font-bold border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-gray-200 dark:bg-gray-200 text-black dark:text-black min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 rounded-none" style="border-radius: 0 !important;" data-value="M">M</button>
                
                <!-- Row 2: 8, 7, 6, 5 -->
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-red text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 rounded-none" style="border-radius: 0 !important;" data-value="8">8</button>
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-red text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 rounded-none" style="border-radius: 0 !important;" data-value="7">7</button>
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-blue text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 rounded-none" style="border-radius: 0 !important;" data-value="6">6</button>
                <button class="keypad-btn p-4 text-xl font-bold border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-blue text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 rounded-none" style="border-radius: 0 !important;" data-value="5">5</button>
                
                <!-- Row 3: 4, 3, 2, 1 -->
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-black text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 rounded-none" style="border-radius: 0 !important;" data-value="4">4</button>
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-black text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 rounded-none" style="border-radius: 0 !important;" data-value="3">3</button>
                <button class="keypad-btn p-4 text-xl font-bold border-r border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-white text-black min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 rounded-none" style="border-radius: 0 !important;" data-value="2">2</button>
                <button class="keypad-btn p-4 text-xl font-bold border-b border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-score-white text-black min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 rounded-none" style="border-radius: 0 !important;" data-value="1">1</button>
                
                <!-- Row 4: CLOSE (left), CLEAR (right) -->
                <button class="keypad-btn p-4 text-lg font-bold border-r border-gray-700 cursor-pointer transition-all duration-150 flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 col-span-2 rounded-none" style="border-radius: 0 !important;" data-action="close">CLOSE</button>
                <button class="keypad-btn p-4 text-lg font-bold cursor-pointer transition-all duration-150 flex items-center justify-center bg-danger-light dark:bg-danger-dark text-danger-dark dark:text-white min-w-[44px] min-h-[44px] touch-manipulation active:brightness-80 active:scale-98 col-span-2 rounded-none" style="border-radius: 0 !important;" data-action="clear">CLEAR</button>
            </div>
        `;

        console.log('Keypad rendered successfully');
    }

    function showKeypadForInput(input) {
        if (!input) return;
        keypad.currentlyFocusedInput = input;
        if (keypad.element) {
            // CRITICAL FIX: Use style.display instead of classList (consistent with renderKeypad)
            keypad.element.style.display = 'block';
        }
        document.body.classList.add('keypad-visible');
        console.log('✅ Keypad shown for input:', input.dataset.archerId, input.dataset.arrowIdx);
    }

    function attachKeypadHandlers() {
        // Ensure keypad is properly initialized
        if (!keypad.element) {
            console.warn('Keypad element not found, attempting to re-render');
            renderKeypad();
        }

        // Make score inputs focusable by removing readonly temporarily on touch
        const scoreInputs = document.querySelectorAll('.score-input');
        scoreInputs.forEach(input => {
            if (input.dataset.locked === 'true') {
                input.setAttribute('tabindex', '-1');
                input.classList.add('locked-score-input');
                return;
            }
            input.setAttribute('readonly', 'readonly');
            input.setAttribute('inputmode', 'none');
            input.setAttribute('autocomplete', 'off');
            // On mobile, tapping the input will focus it
            input.addEventListener('touchstart', (e) => {
                e.preventDefault();
                input.focus();
            }, { passive: false });

            // Ensure inputs can be focused with click as well
            input.addEventListener('click', () => {
                input.focus();
            });

            input.addEventListener('focus', () => {
                showKeypadForInput(input);
            });
        });

        console.log(`Attached keypad handlers to ${scoreInputs.length} inputs`);
    }

    function handleKeypadClick(e) {
        // Only handle clicks on keypad buttons
        const button = e.target.closest('.keypad-btn');
        if (!button) return;
        
        // Stop event propagation to prevent other handlers from interfering
        e.stopPropagation();

        console.log('Keypad button clicked:', button.dataset.value || button.dataset.action);

        const action = button.dataset.action;
        const value = button.dataset.value;

        // Close action - handle BEFORE checking for focused input (close should work even without focus)
        if (action === 'close') {
            console.log('🔄 Close button clicked - closing keypad');
            if (keypad.element) {
                keypad.element.classList.add('hidden');
                keypad.element.style.display = 'none'; // Ensure it's hidden
            }
            document.body.classList.remove('keypad-visible');
            if (keypad.currentlyFocusedInput) {
                keypad.currentlyFocusedInput.blur();
            }
            keypad.currentlyFocusedInput = null;
            console.log('✅ Keypad closed successfully');
            e.preventDefault(); // Prevent any default behavior
            return;
        }

        // For other actions, we need a focused input
        if (!keypad.currentlyFocusedInput) {
            console.log('No focused input, ignoring keypad click');
            return;
        }

        const input = keypad.currentlyFocusedInput;
        const allInputs = Array.from(document.querySelectorAll('#scoring-view .score-input'));
        const currentIndex = allInputs.indexOf(input);


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

    function updateArcherTotals(archerId) {
        const archer = state.archers.find(a => a.id === archerId);
        if (!archer) return;

        const endScores = archer.scores[state.currentEnd - 1] || ['', '', ''];
        const safeEndScores = Array.isArray(endScores) ? endScores : ['', '', ''];

        // Calculate End Total (sum of current end's arrows)
        let endTotal = 0, endTens = 0, endXs = 0;
        safeEndScores.forEach(score => {
            const upperScore = String(score).toUpperCase();
            endTotal += parseScoreValue(score);
            if (upperScore === '10') endTens++;
            else if (upperScore === 'X') endXs++;
        });

        // Calculate Running Total (sum of all ends up to and including current end)
        let runningTotal = 0;
        for (let i = 0; i < state.currentEnd; i++) {
            const end = archer.scores[i];
            if (Array.isArray(end)) {
                end.forEach(score => {
                    if (score !== null && score !== '') runningTotal += parseScoreValue(score);
                });
            }
        }

        // Update End Total cell
        const endTotalCell = document.querySelector(`td[data-archer-id="${archerId}"][data-total-type="end"]`);
        if (endTotalCell) {
            endTotalCell.textContent = endTotal;
        }

        // Update Running Total cell
        const runningTotalCell = document.querySelector(`td[data-archer-id="${archerId}"][data-total-type="running"]`);
        if (runningTotalCell) {
            runningTotalCell.textContent = runningTotal;
        }

        // Update X and 10 columns
        const xCell = document.querySelector(`td[data-archer-id="${archerId}"][data-total-type="xs"]`);
        if (xCell) {
            xCell.textContent = endXs;
        }
        const tensCell = document.querySelector(`td[data-archer-id="${archerId}"][data-total-type="tens"]`);
        if (tensCell) {
            tensCell.textContent = endTens + endXs;
        }
    }

    function handleScoreInput(e) {
        const input = e.target;
        const archerId = input.dataset.archerId;
        const arrowIndex = parseInt(input.dataset.arrowIdx, 10);
        const archer = state.archers.find(a => a.id === archerId);
        if (archer) {
            const status = (archer.cardStatus || 'PENDING').toUpperCase();
            if (state.activeEventId && (archer.locked || status === 'VOID')) {
                const existing = (Array.isArray(archer.scores[state.currentEnd - 1]) && archer.scores[state.currentEnd - 1][arrowIndex]) || '';
                if (input.value !== existing) {
                    input.value = existing;
                }
                return;
            }
        }
        if (archer) {
            if (!Array.isArray(archer.scores[state.currentEnd - 1])) {
                archer.scores[state.currentEnd - 1] = ['', '', ''];
            }
            archer.scores[state.currentEnd - 1][arrowIndex] = input.value;

            // CRITICAL FIX: Update input background color immediately
            const scoreValue = input.value;
            const colorClass = getScoreColorClass(scoreValue);
            const textColorClass = getScoreTextColor(scoreValue);

            // Remove all possible score color classes
            input.classList.remove('bg-score-gold', 'bg-score-red', 'bg-score-blue', 'bg-score-black', 'bg-score-white');
            input.classList.remove('text-black', 'text-white', 'text-gray-500');

            // Add new color classes
            input.classList.add(`bg-score-${colorClass}`);
            input.classList.add(textColorClass);

            // Update End and Running Total in real-time
            updateArcherTotals(archerId);

            // DON'T re-render the entire view - it will overwrite our class changes!
            // renderScoringView();  // ← REMOVED - causes the classes to be lost
            saveData();

            // Live Updates: best-effort post of current end state
            try {
                let isEnabled = true;  // Default ON
                try { const cfg = JSON.parse(localStorage.getItem('live_updates_config') || '{}'); isEnabled = cfg.enabled !== undefined ? !!cfg.enabled : true; } catch (_) { }
                if (isEnabled && typeof LiveUpdates !== 'undefined') {
                    const endScores = archer.scores[state.currentEnd - 1];
                    const [a1, a2, a3] = [endScores[0] || '', endScores[1] || '', endScores[2] || ''];
                    // Compute per-end totals (only this end)
                    let endTotal = 0, tens = 0, xs = 0;
                    [a1, a2, a3].forEach(s => {
                        const u = String(s).toUpperCase();
                        if (!u) return;
                        if (u === 'X') { endTotal += 10; xs++; tens++; }
                        else if (u === '10') { endTotal += 10; tens++; }
                        else if (u === 'M') { /* zero */ }
                        else if (/^[0-9]$|^10$/.test(u)) { endTotal += parseInt(u, 10); }
                    });
                    // Compute running total (sum of all arrows up to current end)
                    let running = 0;
                    for (let i = 0; i < state.currentEnd; i++) {
                        const scores = archer.scores[i];
                        if (!Array.isArray(scores)) continue;
                        scores.forEach(s => {
                            const u = String(s).toUpperCase();
                            if (!u) return;
                            if (u === 'X' || u === '10') { running += 10; }
                            else if (u === 'M') { /* zero */ }
                            else if (/^[0-9]$|^10$/.test(u)) { running += parseInt(u, 10); }
                        });
                    }

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
                        // Use the same ID that was used in ensureArcher (archer.id or archer.archerId)
                        const localId = archer.id || archer.archerId;
                        console.log('[SYNC DEBUG] About to post end:');
                        console.log('  - archer.id:', archer.id);
                        console.log('  - archer.archerId:', archer.archerId);
                        console.log('  - localId (used for lookup):', localId);
                        console.log('  - LiveUpdates._state.archerIds:', LiveUpdates._state.archerIds);
                        console.log('  - Mapped roundArcherId:', LiveUpdates._state.archerIds[localId]);

                        if (!LiveUpdates._state.archerIds[localId]) {
                            console.error('❌ CRITICAL: No roundArcherId mapping found for localId:', localId);
                            console.error('Available mappings:', Object.keys(LiveUpdates._state.archerIds));
                            updateSyncStatus(localId, state.currentEnd, 'failed');
                            return;
                        }

                        LiveUpdates.postEnd(localId, state.currentEnd, { a1, a2, a3, endTotal, runningTotal: running, tens, xs })
                            .then(() => updateSyncStatus(localId, state.currentEnd, 'synced'))
                            .catch(err => {
                                console.error('Sync failed:', err, 'localId:', localId, 'archerIds:', LiveUpdates._state.archerIds);
                                updateSyncStatus(localId, state.currentEnd, 'failed');
                            });
                    } else {
                        // Round not initialized, initialize first
                        console.log('Initializing Live Updates round...');
                        LiveUpdates.ensureRound({ roundType: 'R300', date: new Date().toISOString().slice(0, 10), eventId: state.activeEventId || state.selectedEventId })
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
            // Reinforce button/state after navigation
            updateCompleteButton();
            updateLiveStatusDisplay();
        }
    }

    function resetState() {
        // NEW EVENT: Clear everything for a fresh scorecard with new event
        // This is like picking up a blank scorecard to start a new event

        // Clear scorecard data
        state.archers = [];
        state.currentEnd = 1;
        state.currentView = 'setup';
        state.syncStatus = {};
        state.baleNumber = 1;

        // Clear division/round context
        state.divisionCode = null;
        state.divisionRoundId = null;
        state.divisionName = '';

        // Clear event connection - user will select new event
        state.activeEventId = null;
        state.selectedEventId = null;
        state.eventName = '';
        state.assignmentMode = 'manual';
        state.setupMode = 'manual';

        // Clear Live Updates completely
        if (window.LiveUpdates && LiveUpdates._state) {
            LiveUpdates._state.roundId = null;
            LiveUpdates._state.archerIds = {};
            LiveUpdates._state.eventId = null;
        }

        // Clear event-related localStorage (but keep archer identity!)
        try {
            const today = new Date().toISOString().split('T')[0];
            localStorage.removeItem(`rankingRound300_${today}`);
            localStorage.removeItem('current_bale_session');
            localStorage.removeItem('event_entry_code');

            // Clear live updates sessions
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('live_updates_session:')) {
                    localStorage.removeItem(key);
                }
            });

            console.log('[resetState] Cleared scorecard and event data for new event');
        } catch (e) {
            console.warn('Error clearing session:', e);
        }

        // NOTE: We PRESERVE:
        // - oas_archer_id cookie (archer's personal identity)
        // - archerSelfExtId (their self-identification)
        // - Archer master list (preserved in ArcherModule)

        renderView();
        saveData();
        updateLiveStatusDisplay();
        updateEventHeader();

        // Show event selection modal so user can pick new event
        showEventModal();
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

        // Ensure offline banner state reflects connectivity
        try { ensureOfflineBanner(); } catch (_) { }
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
            // Per-end numbers
            let endTotal = 0, tens = 0, xs = 0;
            [a1, a2, a3].forEach(s => {
                const u = String(s).toUpperCase();
                if (!u) return;
                if (u === 'X') { endTotal += 10; xs++; tens++; }
                else if (u === '10') { endTotal += 10; tens++; }
                else if (u === 'M') { /* zero */ }
                else { const n = parseInt(u, 10); if (!isNaN(n)) endTotal += n; }
            });
            // Running total across all ends up to currentEnd
            let running = 0;
            for (let i = 0; i < currentEnd; i++) {
                const scores = archer.scores[i];
                if (!Array.isArray(scores)) continue;
                scores.forEach(s => {
                    const u = String(s).toUpperCase();
                    if (!u) return;
                    if (u === 'X' || u === '10') running += 10;
                    else if (u === 'M') { /* zero */ }
                    else { const n = parseInt(u, 10); if (!isNaN(n)) running += n; }
                });
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
                // Round is initialized, but check if archer is registered
                const archerRegistered = !!LiveUpdates._state.archerIds[archer.id];
                console.log(`Archer ${archer.id} registered:`, archerRegistered, 'Mapping:', LiveUpdates._state.archerIds[archer.id]);

                if (!archerRegistered) {
                    // Archer not registered yet - register first then sync
                    console.log('Registering missing archer:', archer.id);
                    const promise = LiveUpdates.ensureArcher(archer.id, archer)
                        .then(() => {
                            console.log('Archer registered, now posting end');
                            return LiveUpdates.postEnd(archer.id, currentEnd, { a1, a2, a3, endTotal, runningTotal: running, tens, xs });
                        })
                        .then(() => updateSyncStatus(archer.id, currentEnd, 'synced'))
                        .catch(err => {
                            console.error('Sync failed for archer:', archer.id, 'end:', currentEnd, err);
                            updateSyncStatus(archer.id, currentEnd, 'failed');
                        });
                    promises.push(promise);
                } else {
                    // Archer already registered, sync directly
                    const promise = LiveUpdates.postEnd(archer.id, currentEnd, { a1, a2, a3, endTotal, runningTotal: running, tens, xs })
                        .then(() => updateSyncStatus(archer.id, currentEnd, 'synced'))
                        .catch(err => {
                            console.error('Sync failed for archer:', archer.id, 'end:', currentEnd, err);
                            updateSyncStatus(archer.id, currentEnd, 'failed');
                        });
                    promises.push(promise);
                }
            } else {
                // Initialize round and archer first
                console.log('Initializing Live Updates round for sync...');
                const promise = LiveUpdates.ensureRound({ roundType: 'R300', date: new Date().toISOString().slice(0, 10), eventId: state.activeEventId || state.selectedEventId })
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
        const syncBtn = document.getElementById('sync-end-btn');
        const nextBtn = document.getElementById('next-end-btn');

        if (!completeBtn) return;

        const isLiveEnabled = getLiveEnabled();

        if (!isLiveEnabled) {
            // Live sync is off - show "Complete Round" only when every archer has 10 fully scored ends
            const allComplete = state.archers.length > 0 && state.archers.every(archer => {
                if (!Array.isArray(archer.scores) || archer.scores.length !== state.totalEnds) return false;
                return archer.scores.every(end => Array.isArray(end) && end.length === 3 && end.every(v => v !== '' && v !== null && v !== undefined));
            });
            if (allComplete) {
                completeBtn.style.display = 'inline-block';
                if (nextBtn) nextBtn.style.display = 'none';
            } else {
                completeBtn.style.display = 'none';
            }
            if (syncBtn) syncBtn.style.display = 'none';
        } else {
            // Live sync is on - show "Sync End" for current end if any archer has input for this end
            const currentEndHasScores = state.archers.some(archer => {
                const endScores = archer.scores[state.currentEnd - 1];
                return Array.isArray(endScores) && endScores.some(score => score !== '' && score !== null && score !== undefined);
            });

            if (syncBtn && currentEndHasScores) {
                syncBtn.style.display = 'inline-block';
            } else if (syncBtn) {
                syncBtn.style.display = 'none';
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

            // Test/backdoor: allow well-known code to bypass verification in E2E
            if ((entryCode || '').toLowerCase() === 'tuesday') {
                try {
                    const eid = eventId || 'local-e2e';
                    const sample = [
                        { firstName: 'Alex', lastName: 'Smith', school: 'WIS', level: 'VAR', gender: 'M', baleNumber: 1, targetAssignment: 'A', division: 'BVAR' },
                        { firstName: 'Ben', lastName: 'Lee', school: 'WIS', level: 'VAR', gender: 'M', baleNumber: 1, targetAssignment: 'B', division: 'BVAR' },
                        { firstName: 'Cara', lastName: 'Jones', school: 'DVN', level: 'VAR', gender: 'F', baleNumber: 2, targetAssignment: 'A', division: 'GVAR' },
                        { firstName: 'Dana', lastName: 'Ng', school: 'DVN', level: 'VAR', gender: 'F', baleNumber: 2, targetAssignment: 'B', division: 'GVAR' }
                    ];
                    localStorage.setItem(`event:${eid}:archers_v2`, JSON.stringify(sample));
                    localStorage.setItem(`event:${eid}:meta`, JSON.stringify({ id: eid, name: 'QR Event', date: '', assignmentMode: 'assigned', snapshotVersion: 2, entryCode: entryCode }));
                    state.selectedEventId = eid;
                    state.activeEventId = eid;
                    state.eventName = 'QR Event';
                    state.assignmentMode = 'pre-assigned';
                    state.setupMode = 'pre-assigned';
                    updateEventHeader();
                    return true;
                } catch (_) {
                    // fallthrough
                }
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
            try { localStorage.setItem('event_entry_code', entryCode); } catch (_) { }

            // Load event data and show archer list
            try {
                const eventRes = await fetch(`${API_BASE}/events/${eventId}/snapshot`);
                if (!eventRes.ok) throw new Error(`HTTP ${eventRes.status}`);

                const eventData = await eventRes.json();
                console.log('Event snapshot:', eventData);

                if (eventData && eventData.divisions) {
                    // Extract and normalize
                    const allArchers = [];
                    Object.keys(eventData.divisions).forEach(divKey => {
                        const div = eventData.divisions[divKey];
                        (div.archers || []).forEach(archer => {
                            const parts = (archer.archerName || '').split(' ');
                            allArchers.push({
                                id: archer.archerId || archer.id,  // UUID from database
                                archerId: archer.archerId || archer.id,  // Store both for compatibility
                                firstName: parts[0] || '',
                                lastName: parts.slice(1).join(' ') || '',
                                school: archer.school,
                                level: archer.level,
                                gender: archer.gender,
                                baleNumber: archer.bale,
                                targetAssignment: archer.target,
                                division: divKey,
                                roundArcherId: archer.roundArcherId  // Also preserve round_archer_id
                            });
                        });
                    });
                    // Save to event-scoped caches
                    try { localStorage.setItem(`event:${eventId}:archers_v2`, JSON.stringify(allArchers)); } catch (_) { }
                    try {
                        const meta = {
                            id: eventData.event?.id || eventId,
                            name: eventData.event?.name || data.event?.name || '',
                            date: eventData.event?.date || data.event?.date || '',
                            assignmentMode: (eventData.event?.assignmentMode || (eventData.event?.eventType === 'auto_assign' ? 'assigned' : 'manual')),
                            entryCode: entryCode,
                            snapshotVersion: 2
                        };
                        localStorage.setItem(`event:${eventId}:meta`, JSON.stringify(meta));
                        state.assignmentMode = (meta.assignmentMode === 'assigned') ? 'pre-assigned' : 'manual';
                    } catch (_) { }
                    console.log(`Loaded ${allArchers.length} archers from event into event-scoped cache`);
                }

                // Hide modal if open
                const modal = document.getElementById('event-modal');
                if (modal) modal.style.display = 'none';

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
                // Prefer Active; fall back to all if none are Active
                let activeEvents = data.events.filter(ev => ev.status === 'Active');
                if (activeEvents.length === 0) activeEvents = data.events;
                console.log(`Event selector: using ${activeEvents.length} events (active preferred)`);

                // Populate event selector
                const eventSelector = document.getElementById('event-selector');
                if (eventSelector) {
                    eventSelector.innerHTML = '<option value="">Select Event...</option>';

                    activeEvents.forEach(ev => {
                        const option = document.createElement('option');
                        option.value = ev.id;
                        option.dataset.name = ev.name || '';
                        option.textContent = `${ev.name} (${ev.date})`;
                        eventSelector.appendChild(option);
                    });

                    // Auto-select if only ONE event in list
                    if (activeEvents.length === 1) {
                        console.log('Only one active event - auto-selecting:', activeEvents[0].name);
                        eventSelector.value = activeEvents[0].id;
                        state.selectedEventId = activeEvents[0].id;
                        state.eventName = activeEvents[0].name || state.eventName;
                        saveData();
                        updateEventHeader();

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
            let divisionCode = null;
            let divisionRoundId = null;

            for (const [divCode, divData] of Object.entries(data.divisions)) {
                if (divData.archers && divData.archers.length > 0) {
                    const baleArchers = divData.archers.filter(a => a.bale === targetBale);
                    if (baleArchers.length > 0) {
                        foundArchers = baleArchers;
                        divisionName = getDivisionDisplayName(divCode);
                        divisionCode = divCode; // CRITICAL: Preserve division code
                        divisionRoundId = divData.roundId || null; // CRITICAL: Preserve existing roundId
                        break;
                    }
                }
            }

            if (foundArchers.length > 0) {
                // Convert to our state format - CRITICAL: Include division and roundId
                state.archers = foundArchers.map(a => {
                    const names = (a.archerName || '').split(' ');
                    const overrides = {
                        baleNumber: a.bale || targetBale,
                        targetAssignment: a.target || 'A',
                        scores: Array.isArray(a.scorecard?.ends)
                            ? a.scorecard.ends.map(end => [end.a1 || '', end.a2 || '', end.a3 || ''])
                            : undefined,
                        locked: a.locked,
                        cardStatus: a.cardStatus,
                        verifiedBy: a.verifiedBy,
                        verifiedAt: a.verifiedAt,
                        notes: a.notes
                    };
                    const rosterPayload = {
                        id: a.archerId || a.roundArcherId,
                        archerId: a.archerId || a.roundArcherId,
                        firstName: names[0] || a.firstName || '',
                        lastName: names.slice(1).join(' ') || a.lastName || '',
                        school: a.school || '',
                        level: a.level || 'VAR',
                        gender: a.gender || 'M',
                        division: divisionCode
                    };
                    const stateArcher = buildStateArcherFromRoster(rosterPayload, overrides);
                    stateArcher.roundArcherId = a.roundArcherId;
                    stateArcher.roundId = divisionRoundId;
                    return stateArcher;
                });

                state.activeEventId = eventId;
                state.assignmentMode = 'pre-assigned';
                state.divisionName = divisionName;
                state.divisionCode = divisionCode; // Store division code in state
                state.divisionRoundId = divisionRoundId; // CRITICAL: Store existing roundId to prevent creating new rounds

                console.log(`Pre-assigned mode: ${foundArchers.length} archers on bale ${state.baleNumber} (${divisionName}, division: ${divisionCode}, roundId: ${divisionRoundId})`);
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
        const summary = computeSyncSummary();
        const badge = document.getElementById('live-status-badge');
        if (badge) {
            if (!summary.enabled) {
                badge.textContent = 'Live Updates Off';
                badge.className = 'inline-block px-2 py-1 text-xs font-bold rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300';
            } else if (summary.failed > 0) {
                badge.textContent = 'Retry Needed';
                badge.className = 'inline-block px-2 py-1 text-xs font-bold rounded bg-danger-light text-danger-dark';
            } else {
                const pendingTotal = summary.pending + summary.queueSize;
                if (pendingTotal > 0) {
                    badge.textContent = 'Syncing...';
                    badge.className = 'inline-block px-2 py-1 text-xs font-bold rounded bg-warning-light text-warning-dark';
                } else if (summary.currentEndSynced) {
                    badge.textContent = 'Synced';
                    badge.className = 'inline-block px-2 py-1 text-xs font-bold rounded bg-success-light text-success-dark';
                } else {
                    badge.textContent = 'Pending Sync';
                    badge.className = 'inline-block px-2 py-1 text-xs font-bold rounded bg-warning-light text-warning-dark';
                }
            }
        }

        updateManualLiveControls(summary);
    }

    // Offline banner + manual flush
    function ensureOfflineBanner() {
        let bar = document.getElementById('offline-banner');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'offline-banner';
            bar.style.cssText = 'display:none;position:fixed;bottom:56px;left:0;right:0;background:#fff3cd;color:#856404;padding:8px 12px;font-size:14px;border-top:1px solid #ffeeba;z-index:9998;';
            bar.innerHTML = '<span>Offline: scoring will queue and sync when online.</span> <button id="flush-queue-btn" class="btn btn-secondary" style="float:right;">Flush Now</button>';
            document.body.appendChild(bar);
            const btn = bar.querySelector('#flush-queue-btn');
            if (btn) btn.onclick = () => { try { LiveUpdates.flushQueue && LiveUpdates.flushQueue(); } catch (_) { } };
        }
        const online = navigator.onLine;
        bar.style.display = online ? 'none' : 'block';
    }

    window.addEventListener('online', () => { try { LiveUpdates.flushQueue && LiveUpdates.flushQueue(); } catch (_) { }; ensureOfflineBanner(); });
    window.addEventListener('offline', () => ensureOfflineBanner());

    function getLiveEnabled() {
        try {
            const cfg = JSON.parse(localStorage.getItem('live_updates_config') || '{}');
            return cfg.enabled !== undefined ? !!cfg.enabled : true;  // Default ON
        } catch (_) {
            return true;  // Default ON if error
        }
    }

    function setLiveEnabled(v) {
        try {
            if (window.LiveUpdates && LiveUpdates.saveConfig) {
                LiveUpdates.saveConfig({ enabled: !!v });
            } else {
                localStorage.setItem('live_updates_config', JSON.stringify({ enabled: !!v }));
            }
        } catch (_) { }
    }

    function getLiveQueueSize() {
        try {
            if (window.LiveUpdates && LiveUpdates._state && Array.isArray(LiveUpdates._state.retryQueue)) {
                return LiveUpdates._state.retryQueue.length;
            }
        } catch (_) { }
        return 0;
    }

    async function ensureLiveRoundReady(options = {}) {
        if (!getLiveEnabled()) return false;
        if (!window.LiveUpdates || typeof LiveUpdates.setConfig !== 'function') {
            console.warn('Live Updates not available in this context.');
            return false;
        }

        try {
            const cfg = window.LIVE_UPDATES || {};
            LiveUpdates.setConfig({ apiBase: cfg.apiBase || API_BASE });

            let metaConfig = {};
            try { metaConfig = JSON.parse(localStorage.getItem('live_updates_config') || '{}'); } catch (_) { }
            const hasCoachKey = !!(metaConfig && metaConfig.apiKey);
            let entryCode = getEventEntryCode();

            if (!hasCoachKey && !entryCode && options.promptForCode !== false) {
                const userCode = (typeof prompt === 'function') ? prompt('Enter Event Code to enable Live Sync:') : '';
                if (userCode && userCode.trim()) {
                    entryCode = userCode.trim();
                    try {
                        localStorage.setItem('event_entry_code', entryCode);
                        const eid = state.activeEventId || state.selectedEventId;
                        if (eid) {
                            const metaRaw = localStorage.getItem(`event:${eid}:meta`) || '{}';
                            const meta = JSON.parse(metaRaw);
                            meta.entryCode = entryCode;
                            localStorage.setItem(`event:${eid}:meta`, JSON.stringify(meta));
                        }
                    } catch (_) { }
                } else {
                    console.warn('Live Sync requires an event code when a coach key is unavailable.');
                    return false;
                }
            }

            const eventId = state.isStandalone ? null : (state.activeEventId || state.selectedEventId || null);
            const today = new Date().toISOString().slice(0, 10);
            
            // Use selected division (required)
            let division = state.selectedDivision || state.divisionCode || null;
            let gender = null;
            let level = null;

            // CRITICAL: Check if we already have a roundId from the event snapshot (prevents creating "Undefined" rounds)
            if (state.divisionRoundId && eventId) {
                console.log(`✅ Using existing roundId from event: ${state.divisionRoundId} (division: ${state.divisionCode})`);
                // Set the roundId directly in LiveUpdates state to use existing round
                if (!LiveUpdates._state) {
                    LiveUpdates._state = {};
                }
                LiveUpdates._state.roundId = state.divisionRoundId;
                LiveUpdates._state.eventId = eventId;

                // Ensure division is set from state
                if (state.divisionCode) {
                    division = state.divisionCode;
                }

                // FIX: Pre-populate archerIds mapping with known roundArcherId values
                // This prevents creating duplicate round_archer entries when archers were added via coach.html
                if (!LiveUpdates._state.archerIds) {
                    LiveUpdates._state.archerIds = {};
                }
                if (state.archers && state.archers.length) {
                    state.archers.forEach(archer => {
                        if (archer.roundArcherId && !LiveUpdates._state.archerIds[archer.id]) {
                            console.log(`✅ Pre-mapping archer ${archer.id} to existing roundArcherId: ${archer.roundArcherId}`);
                            LiveUpdates._state.archerIds[archer.id] = archer.roundArcherId;
                        }
                    });
                }

                // Still need to ensure archers are registered (will skip if already mapped)
                if (state.archers && state.archers.length) {
                    await Promise.all(
                        state.archers.map(archer => LiveUpdates.ensureArcher(archer.id, archer))
                    );
                }
                return true;
            }

            if (state.archers && state.archers.length) {
                const sample = state.archers[0];
                division = sample.division || division || state.divisionCode;
                gender = sample.gender || gender;
                level = sample.level || level;
            }

            if (eventId) {
                try {
                    const metaRaw = localStorage.getItem(`event:${eventId}:meta`);
                    if (metaRaw) {
                        const meta = JSON.parse(metaRaw);
                        if (Array.isArray(meta.availableDivisions) && meta.availableDivisions.length) {
                            state.availableDivisions = meta.availableDivisions;
                        }
                        division = division || meta.defaultDivision || state.divisionCode || null;
                        gender = gender || meta.defaultGender || null;
                        level = level || meta.defaultLevel || null;
                    }
                } catch (_) { }
            }

            // CRITICAL: Validate division is set - if not, we cannot create a round safely
            if (!division && gender && level) {
                division = deriveDivisionCode(gender, level);
            }

            // CRITICAL FIX 4: Final fallback - extract division from any archer
            if (!division && state.archers && state.archers.length > 0) {
                for (const archer of state.archers) {
                    if (archer.division) {
                        division = archer.division;
                        console.log('[ensureLiveRoundReady] ✅ Fallback: Using division from archer:', division);
                        break;
                    }
                }
            }

            if (!division) {
                console.error('❌ Cannot determine division for round creation. Division must be set.');
                console.error('Debug info:', {
                    'state.divisionCode': state.divisionCode,
                    'state.archers': state.archers?.map(a => ({ id: a.id, division: a.division })),
                    'gender': gender,
                    'level': level,
                    'eventId': eventId
                });
                throw new Error('Division is required but could not be determined from archers or event metadata');
            }


            await LiveUpdates.ensureRound({
                roundType: 'R300',
                date: today,
                division,
                gender,
                level,
                eventId: eventId || null  // null for standalone rounds
            });

            if (!LiveUpdates._state || !LiveUpdates._state.roundId) {
                throw new Error('roundId missing after ensureRound');
            }
            
            // Store roundId and entryCode in state
            state.roundId = LiveUpdates._state.roundId;
            if (LiveUpdates._state.roundEntryCode) {
                state.roundEntryCode = LiveUpdates._state.roundEntryCode;
                console.log('[ensureLiveRoundReady] ✅ Standalone round entry code:', state.roundEntryCode);
            }

            // FIX: Pre-populate archerIds mapping with known roundArcherId values
            // This prevents creating duplicate round_archer entries when archers were added via coach.html
            if (!LiveUpdates._state.archerIds) {
                LiveUpdates._state.archerIds = {};
            }
            if (state.archers && state.archers.length) {
                state.archers.forEach(archer => {
                    if (archer.roundArcherId && !LiveUpdates._state.archerIds[archer.id]) {
                        console.log(`✅ Pre-mapping archer ${archer.id} to existing roundArcherId: ${archer.roundArcherId}`);
                        LiveUpdates._state.archerIds[archer.id] = archer.roundArcherId;
                    }
                });
            }

            if (state.archers && state.archers.length) {
                console.log('[ensureLiveRoundReady] Ensuring archers:', state.archers.map(a => ({ id: a.id, archerId: a.archerId, roundArcherId: a.roundArcherId, name: `${a.firstName} ${a.lastName}` })));
                await Promise.all(
                    state.archers.map(archer => {
                        console.log(`[ensureLiveRoundReady] Calling ensureArcher with id="${archer.id}", archerId="${archer.archerId}", roundArcherId="${archer.roundArcherId}"`);
                        return LiveUpdates.ensureArcher(archer.id, archer);
                    })
                );
                console.log('[ensureLiveRoundReady] After ensureArcher, archerIds mapping:', LiveUpdates._state.archerIds);
            }

            return true;
        } catch (err) {
            console.error('Error initializing Live Updates:', err);
            return false;
        }
    }

    async function handleLiveToggle() {
        const currentlyEnabled = getLiveEnabled();
        if (currentlyEnabled) {
            setLiveEnabled(false);
            updateManualLiveControls();
            updateLiveStatusDisplay();
            console.log('Live Sync disabled');
            return false;
        }

        setLiveEnabled(true);
        const success = await ensureLiveRoundReady({ promptForCode: true });
        if (!success) {
            alert('Live Sync could not be enabled. Continuing offline.');
            setLiveEnabled(false);
        }
        updateManualLiveControls();
        updateLiveStatusDisplay();
        return success;
    }

    function computeSyncSummary() {
        const enabled = getLiveEnabled();
        let pending = 0;
        let failed = 0;
        const currentEnd = state.currentEnd;
        let currentEndSynced = true;

        if (enabled && state.archers && state.archers.length) {
            state.archers.forEach(archer => {
                const statusMap = state.syncStatus[archer.id] || {};
                Object.values(statusMap).forEach(status => {
                    if (status === 'pending') pending++;
                    else if (status === 'failed') failed++;
                });
                const currentStatus = statusMap[currentEnd];
                if (currentStatus !== 'synced') currentEndSynced = false;
            });
        } else {
            currentEndSynced = false;
        }

        return {
            enabled,
            pending,
            failed,
            queueSize: getLiveQueueSize(),
            currentEndSynced: enabled && state.archers.length > 0 && currentEndSynced,
        };
    }

    function updateManualLiveControls(summaryOverride) {
        const summary = summaryOverride || computeSyncSummary();
        const liveBtn = manualSetupControls.liveToggleBtn;
        if (liveBtn) {
            if (summary.enabled) {
                liveBtn.textContent = 'Live: On';
                liveBtn.classList.remove('btn-secondary');
                liveBtn.classList.add('btn-success');
            } else {
                liveBtn.textContent = 'Live: Off';
                liveBtn.classList.remove('btn-success');
                liveBtn.classList.add('btn-secondary');
            }
        }

        const badge = manualSetupControls.liveStatusBadge;
        if (badge) {
            let text = '';
            let className = 'status-badge ';
            if (!summary.enabled) {
                text = 'Offline';
                className += 'status-off';
            } else if (summary.failed > 0) {
                text = `Retry (${summary.failed})`;
                className += 'status-off';
            } else {
                const totalPending = summary.pending + summary.queueSize;
                if (totalPending > 0) {
                    text = `Pending ${totalPending}`;
                    className += 'status-pending';
                } else if (summary.currentEndSynced) {
                    text = 'Synced';
                    className += 'status-synced';
                } else if (state.archers.length === 0) {
                    text = 'Ready';
                    className += 'status-pending';
                } else {
                    text = 'Not Synced';
                    className += 'status-pending';
                }
            }
            badge.textContent = text;
            badge.className = className;
        }
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
            'synced': '<span class="text-success text-sm" title="Synced">✓</span>',
            'pending': '<span class="text-warning text-sm" title="Pending">⟳</span>',
            'failed': '<span class="text-danger text-sm" title="Failed">✗</span>',
            '': '<span class="text-gray-400 dark:text-gray-500 text-sm" title="Not Synced">○</span>'
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
                    eventId: state.activeEventId || state.selectedEventId
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
                    // Per-end values only
                    let endTotal = 0, tens = 0, xs = 0;
                    [a1, a2, a3].forEach(s => {
                        const u = String(s).toUpperCase();
                        if (!u) return;
                        if (u === 'X') { endTotal += 10; xs++; tens++; }
                        else if (u === '10') { endTotal += 10; tens++; }
                        else if (u === 'M') { /* zero */ }
                        else if (/^[0-9]$|^10$/.test(u)) { endTotal += parseInt(u, 10); }
                    });
                    // Running total up to this end (sum all ends including current exactly once)
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
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            // Clear any inline style that might override
            modal.style.display = '';

            // Load active events into the event list
            loadActiveEventsIntoModal();
        }
    }

    // Hide event selection modal
    function hideEventModal() {
        const modal = document.getElementById('event-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            // Clear inline style to ensure classList takes precedence
            modal.style.display = '';
        }
    }

    // Load active events into modal list
    async function loadActiveEventsIntoModal() {
        try {
            console.log('[loadActiveEventsIntoModal] Fetching events and archer history...');

            // 1. Fetch recent events
            const res = await fetch(`${API_BASE}/events/recent`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            const activeEvents = (data.events || []).filter(ev => ev.status === 'Active');

            // 2. Fetch archer's round history
            const archerId = getArcherCookie();
            let rounds = [];
            try {
                const historyResponse = await fetch(`${API_BASE}/archers/${archerId}/history`);
                if (historyResponse.ok) {
                    const historyData = await historyResponse.json();
                    rounds = historyData.history || historyData.rounds || [];
                    console.log('[loadActiveEventsIntoModal] Found', rounds.length, 'rounds for archer');
                }
            } catch (e) {
                console.warn('[loadActiveEventsIntoModal] Could not fetch archer history:', e);
            }

            const eventList = document.getElementById('event-list');
            if (!eventList) return;

            if (activeEvents.length === 0) {
                eventList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center">No active events found</p>';
                return;
            }

            // 3. Enrich events with round information
            const enrichedEvents = activeEvents.map(event => {
                const eventRounds = rounds.filter(r => r.event_id === event.id);
                const inProgressRound = eventRounds.find(r => (r.ends_completed || 0) < 10);

                return {
                    ...event,
                    hasInProgressRound: !!inProgressRound,
                    inProgressRound: inProgressRound,
                    roundCount: eventRounds.length,
                    completedRounds: eventRounds.filter(r => (r.ends_completed || 0) >= 10).length
                };
            });

            // 4. Sort: in-progress first, then by date
            enrichedEvents.sort((a, b) => {
                if (a.hasInProgressRound && !b.hasInProgressRound) return -1;
                if (!a.hasInProgressRound && b.hasInProgressRound) return 1;
                return new Date(b.date) - new Date(a.date);
            });

            // 5. Render event list
            eventList.innerHTML = '';
            enrichedEvents.forEach(ev => {
                const eventCard = document.createElement('div');
                eventCard.className = 'p-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg mb-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all';

                // Build status badges
                let statusBadges = '';
                if (ev.hasInProgressRound) {
                    const round = ev.inProgressRound;
                    statusBadges += `
                        <div class="flex items-center gap-2 mt-2">
                            <span class="px-2 py-1 bg-green-500 text-white text-xs rounded font-semibold">
                                ⏳ In Progress
                            </span>
                            <span class="text-xs text-gray-600 dark:text-gray-300">
                                ${round.ends_completed || 0}/10 ends • ${round.division || 'Unknown'}
                            </span>
                        </div>
                    `;
                } else if (ev.completedRounds > 0) {
                    statusBadges += `
                        <div class="mt-2">
                            <span class="px-2 py-1 bg-blue-500 text-white text-xs rounded font-semibold">
                                ✓ ${ev.completedRounds} Round${ev.completedRounds > 1 ? 's' : ''} Complete
                            </span>
                        </div>
                    `;
                }

                eventCard.innerHTML = `
                    <div class="font-bold text-gray-800 dark:text-white text-lg">${ev.name}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-300">${ev.date}</div>
                    ${statusBadges}
                `;

                eventCard.addEventListener('click', async () => {
                    console.log('[Event Selected]', ev.name, 'hasInProgressRound:', ev.hasInProgressRound);

                    if (ev.hasInProgressRound) {
                        // Resume existing round
                        const round = ev.inProgressRound;
                        console.log('[Event Selected] Resuming round:', round.round_id);

                        // Build URL and navigate (will be handled by handleDirectLink)
                        const url = `ranking_round_300.html?event=${ev.id}&round=${round.round_id}&archer=${archerId}`;
                        window.location.href = url;
                    } else {
                        // Start new round - load event and go to setup
                        const entryCode = ev.entryCode || ev.entry_code || '';
                        console.log('[Event Selected] Starting new round, entryCode:', entryCode);

                        const success = await loadEventById(ev.id, ev.name, entryCode);
                        if (success) {
                            hideEventModal();
                            // Set event selection in state
                            state.selectedEventId = ev.id;
                            state.activeEventId = ev.id;
                            state.isStandalone = false;
                            // Load divisions for this event
                            await loadDivisionsForEvent(ev.id);
                            // Update event/division selectors
                            if (eventDivisionControls.eventSelect) {
                                eventDivisionControls.eventSelect.value = ev.id;
                            }
                            updateRoundTypeIndicator();
                            renderSetupSections();
                            updateEventHeader();
                            console.log('[Event Selected] Event loaded successfully, showing setup with division selector');
                        } else {
                            alert('Failed to load event. Please try again.');
                        }
                    }
                });

                eventList.appendChild(eventCard);
            });

            console.log('[loadActiveEventsIntoModal] ✅ Rendered', enrichedEvents.length, 'events');

        } catch (err) {
            console.error('[loadActiveEventsIntoModal] Error:', err);
            const eventList = document.getElementById('event-list');
            if (eventList) {
                eventList.innerHTML = '<p class="text-red-500 dark:text-red-400">Failed to load events. Please check your connection.</p>';
            }
        }
    }

    // Load event by ID
    async function loadEventById(eventId, eventName, entryCode) {
        try {
            console.log('[loadEventById] Starting:', { eventId, eventName, entryCode });
            if (!eventId) {
                console.error('No event ID provided');
                return false;
            }

            state.selectedEventId = eventId;
            state.activeEventId = eventId;
            state.isStandalone = false; // Event-linked round

            // Use entry code if provided (for authenticated event snapshots)
            // Note: Event snapshot is typically public, but we include entry code if available
            const headers = {};
            if (entryCode) {
                headers['X-Passcode'] = entryCode;
            }

            const res = await fetch(`${API_BASE}/events/${eventId}/snapshot`, {
                headers: headers
            });
            
            let eventData;
            if (!res.ok) {
                // If 401 and we have an entry code, try without it (event snapshot might be public)
                if (res.status === 401 && entryCode) {
                    console.warn('[loadEventById] 401 with entry code, trying without authentication');
                    const retryRes = await fetch(`${API_BASE}/events/${eventId}/snapshot`);
                    if (retryRes.ok) {
                        eventData = await retryRes.json();
                        // Extract entry code from response if available
                        if (eventData.event?.entry_code) {
                            entryCode = eventData.event.entry_code;
                            localStorage.setItem('event_entry_code', entryCode);
                        }
                    } else {
                        throw new Error(`HTTP ${retryRes.status}`);
                    }
                } else {
                    throw new Error(`HTTP ${res.status}`);
                }
            } else {
                // Success on first try
                eventData = await res.json();
            }
            
            console.log('[loadEventById] Received event data:', eventData);
            if (eventData && eventData.divisions) {
                const divisionKeys = Object.keys(eventData.divisions || {});
                state.availableDivisions = divisionKeys.length ? divisionKeys : ['OPEN'];
                
                // Update division select dropdown with available divisions
                await loadDivisionsForEvent(eventId);
                const rosterState = getRosterState();
                const rosterMap = new Map(
                    rosterState.list.map(item => [getExtIdFromArcher(item), item])
                );
                const allArchers = [];
                Object.keys(eventData.divisions).forEach(divKey => {
                    const div = eventData.divisions[divKey];
                    (div.archers || []).forEach(archer => {
                        const nameParts = (archer.archerName || '').split(' ');
                        const first = safeString(nameParts[0]);
                        const last = safeString(nameParts.slice(1).join(' '));
                        const school = safeString(archer.school);
                        const provisional = { first, last, school };
                        const extId = getExtIdFromArcher(provisional);
                        const rosterMatch = rosterMap.get(extId);
                        const normalizedLevel = normalizeLevel(rosterMatch?.level || archer.level);
                        const normalizedGender = normalizeGender(rosterMatch?.gender || archer.gender);
                        allArchers.push(Object.assign({}, rosterMatch || {}, {
                            id: archer.archerId || archer.id || rosterMatch?.id,  // UUID from database
                            archerId: archer.archerId || archer.id || rosterMatch?.archerId,  // Store both for compatibility
                            extId,
                            first,
                            last,
                            school,
                            level: normalizedLevel,
                            gender: normalizedGender,
                            baleNumber: archer.bale,
                            targetAssignment: archer.target,
                            division: divKey,
                            fave: false,
                            status: rosterMatch?.status || 'active',
                            roundArcherId: archer.roundArcherId  // Also preserve round_archer_id
                        }));
                    });
                });
                // Save to event-scoped caches
                try { localStorage.setItem(`event:${eventId}:archers_v2`, JSON.stringify(allArchers)); } catch (_) { }
                try {
                    // Use entry code from API response if not provided explicitly
                    let finalEntryCode = entryCode || eventData.event?.entry_code || '';

                    // FIX: Check localStorage if we don't have a code yet
                    if (!finalEntryCode) {
                        try {
                            const savedGlobal = localStorage.getItem('event_entry_code');
                            if (savedGlobal) finalEntryCode = savedGlobal;

                            // Also check event-specific meta
                            const savedMeta = localStorage.getItem(`event:${eventId}:meta`);
                            if (savedMeta) {
                                const metaObj = JSON.parse(savedMeta);
                                if (metaObj.entryCode) finalEntryCode = metaObj.entryCode;
                            }
                        } catch (e) { /* ignore */ }
                    }

                    const meta = {
                        id: eventData.event?.id || eventId,
                        name: eventData.event?.name || (eventName || ''),
                        date: eventData.event?.date || '',
                        assignmentMode: (eventData.event?.assignmentMode || (eventData.event?.eventType === 'auto_assign' ? 'assigned' : 'manual')),
                        snapshotVersion: 2,
                        entryCode: finalEntryCode,  // Save entry code for Live Updates
                        availableDivisions: state.availableDivisions
                    };
                    localStorage.setItem(`event:${eventId}:meta`, JSON.stringify(meta));

                    // Also save to global event_entry_code if we have one
                    if (finalEntryCode) {
                        try { localStorage.setItem('event_entry_code', finalEntryCode); } catch (_) { }
                        console.log('✅ Saved event metadata with entry code:', finalEntryCode);
                    } else {
                        // Only prompt if we REALLY don't have it and it seems required (e.g. not localhost)
                        // For now, we'll suppress the prompt to avoid annoyance, as LiveUpdates will prompt if needed
                        console.warn('⚠️ No entry code found for event. Live scoring may prompt later if needed.');
                    }
                    
                    // Update round type indicator
                    updateRoundTypeIndicator();
                } catch (_) { }

                // Do not pre-populate state.archers here; we only populate when a bale is selected
                state.archers = [];

                // Update UI/state
                state.eventName = (eventData.event && eventData.event.name) || eventName || state.eventName || '';
                
                // Update header if we're in scoring view
                if (state.currentView === 'scoring') {
                    const eventEl = document.getElementById('scoring-header-event');
                    if (eventEl && state.eventName) {
                        eventEl.textContent = state.eventName;
                    }
                }

                // DEBUG: Log what we received from API
                console.log('[loadEventById] Event data assignmentMode:', eventData.event?.assignmentMode);
                console.log('[loadEventById] Event data eventType:', eventData.event?.eventType);

                // Set assignment mode - check both assignmentMode and eventType
                const apiAssignmentMode = eventData.event?.assignmentMode ||
                    (eventData.event?.eventType === 'auto_assign' ? 'assigned' : 'manual');
                state.assignmentMode = (apiAssignmentMode === 'assigned' || apiAssignmentMode === 'pre-assigned') ? 'pre-assigned' : 'manual';

                console.log('[loadEventById] Final state.assignmentMode:', state.assignmentMode);
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

    /**
     * Find archer's bale assignment in an event
     * Returns { baleNumber, division, targetAssignment } or null
     */
    async function findArcherBaleAssignment(eventId, archerId) {
        try {
            console.log('[findArcherBaleAssignment] Looking for archer:', archerId, 'in event:', eventId);

            const response = await fetch(`${API_BASE}/events/${eventId}/snapshot`, {
                headers: {
                    'X-Passcode': getEventEntryCode() || ''
                }
            });

            if (!response.ok) {
                console.warn('[findArcherBaleAssignment] Failed to fetch snapshot:', response.status);
                return null;
            }

            const data = await response.json();
            const snapshot = data.snapshot || [];

            // Find archer in snapshot
            for (const divisionGroup of snapshot) {
                for (const baleGroup of divisionGroup.bales || []) {
                    const archer = baleGroup.archers.find(a =>
                        a.archerId === archerId ||
                        a.id === archerId ||
                        a.extId === archerId
                    );
                    if (archer) {
                        console.log('[findArcherBaleAssignment] ✅ Found archer on bale:', baleGroup.baleNumber);
                        return {
                            baleNumber: baleGroup.baleNumber,
                            division: divisionGroup.division,
                            targetAssignment: archer.targetAssignment
                        };
                    }
                }
            }

            console.log('[findArcherBaleAssignment] Archer not found in any bale');
            return null;

        } catch (error) {
            console.error('[findArcherBaleAssignment] Error:', error);
            return null;
        }
    }

    /**
     * Build state archer object from round data
     */
    function buildStateArcherFromRoundData(roundArcher) {
        const scoreSheet = createEmptyScoreSheet(state.totalEnds);

        // Map ends to score sheet
        if (roundArcher.scorecard && Array.isArray(roundArcher.scorecard.ends)) {
            roundArcher.scorecard.ends.forEach(end => {
                const idx = (end.endNumber || 1) - 1;
                if (idx >= 0 && idx < state.totalEnds) {
                    scoreSheet[idx] = [end.a1 || '', end.a2 || '', end.a3 || ''];
                }
            });
        }

        return {
            id: roundArcher.archerId || roundArcher.id,
            roundArcherId: roundArcher.roundArcherId || roundArcher.id,
            firstName: roundArcher.firstName,
            lastName: roundArcher.lastName,
            school: roundArcher.school,
            level: roundArcher.level,
            gender: roundArcher.gender,
            division: roundArcher.division,
            targetAssignment: roundArcher.targetAssignment,
            targetSize: roundArcher.targetSize,
            baleNumber: roundArcher.baleNumber,
            scores: scoreSheet
        };
    }

    /**
     * Handle direct link from index.html
     * URL format: ?event=X&round=Y&archer=Z
     */
    /**
     * Handle standalone round link (no event)
     * URL format: ?round={id}&archer={id} or ?code={entry_code}&archer={id}
     */
    async function handleStandaloneRoundLink(roundIdOrCode, archerId, isEntryCode = false) {
        try {
            console.log('[handleStandaloneRoundLink] Loading standalone round:', { roundIdOrCode, archerId, isEntryCode });
            
            let roundId = roundIdOrCode;
            let roundData = null;
            
            // If entry code, look up round first
            if (isEntryCode) {
                const response = await fetch(`${API_BASE}/rounds?entry_code=${encodeURIComponent(roundIdOrCode)}`);
                if (!response.ok) {
                    throw new Error(`Round not found for entry code: ${roundIdOrCode}`);
                }
                const data = await response.json();
                roundId = data.roundId;
                roundData = data;
                console.log('[handleStandaloneRoundLink] Found round by entry code:', roundId);
            }
            
            // Fetch round snapshot
            const snapshotResponse = await fetch(`${API_BASE}/rounds/${roundId}/snapshot`);
            if (!snapshotResponse.ok) {
                throw new Error(`Failed to load round: ${snapshotResponse.status}`);
            }
            
            const snapshotData = await snapshotResponse.json();
            console.log('[handleStandaloneRoundLink] Round snapshot loaded:', snapshotData);
            
            // Find archer in snapshot
            const snapshotArcher = snapshotData.archers?.find(a =>
                a.archerId === archerId ||
                a.roundArcherId === archerId ||
                a.id === archerId
            );
            
            if (!snapshotArcher) {
                alert('You are not assigned to this round.');
                return false;
            }
            
            const baleNumber = snapshotArcher.baleNumber || snapshotData.round?.baleNumber;
            
            // Set up state for standalone round
            state.isStandalone = true;
            state.selectedEventId = null;
            state.activeEventId = null;
            state.roundId = roundId;
            state.roundEntryCode = isEntryCode ? roundIdOrCode : (roundData?.entryCode || null);
            state.baleNumber = baleNumber;
            state.divisionCode = snapshotData.round?.division || null;
            state.selectedDivision = snapshotData.round?.division || null;
            state.divisionRoundId = roundId;
            state.assignmentMode = 'pre-assigned';
            
            // Update archer cookie
            const currentCookie = getArcherCookie();
            if (currentCookie !== archerId) {
                setArcherCookieSafe(archerId);
            }
            
            // If no bale number, go to Setup mode
            if (!baleNumber) {
                console.log('[handleStandaloneRoundLink] No bale number - going to Setup mode');
                state.assignmentMode = 'manual';
                updateRoundTypeIndicator();
                renderSetupSections();
                return true;
            }
            
            // Fetch full bale data
            const baleResponse = await fetch(`${API_BASE}/rounds/${roundId}/bales/${baleNumber}/archers`);
            if (!baleResponse.ok) {
                throw new Error(`Failed to fetch bale data: ${baleResponse.status}`);
            }
            
            const baleData = await baleResponse.json();
            
            // Reconstruct archers
            state.archers = baleData.archers.map(archer => {
                const scoreSheet = createEmptyScoreSheet(state.totalEnds);
                const endsList = Array.isArray(archer.scorecard?.ends) ? archer.scorecard.ends : [];
                endsList.forEach(end => {
                    const idx = Math.max(0, Math.min(state.totalEnds - 1, (end.endNumber || 1) - 1));
                    scoreSheet[idx] = [end.a1 || '', end.a2 || '', end.a3 || ''];
                });
                const provisional = {
                    extId: archer.extId,
                    firstName: archer.firstName,
                    lastName: archer.lastName,
                    school: archer.school
                };
                const extId = getExtIdFromArcher(provisional);
                const overrides = {
                    extId,
                    targetAssignment: archer.targetAssignment || archer.target,
                    baleNumber: archer.baleNumber || baleNumber,
                    level: archer.level,
                    gender: archer.gender,
                    division: state.divisionCode || archer.division,
                    scores: scoreSheet
                };
                const rosterPayload = Object.assign({}, provisional, {
                    level: archer.level,
                    gender: archer.gender,
                    division: state.divisionCode || archer.division
                });
                const stateArcher = buildStateArcherFromRoster(rosterPayload, overrides);
                stateArcher.roundArcherId = archer.roundArcherId;
                return stateArcher;
            });
            
            // Load existing scores
            await loadExistingScoresForArchers();
            
            // Initialize LiveUpdates if enabled
            if (getLiveEnabled()) {
                await ensureLiveRoundReady({ promptForCode: false });
            }
            
            // Save session
            saveCurrentBaleSession();
            saveData();
            
            // Go to scoring view
            state.currentView = 'scoring';
            updateRoundTypeIndicator();
            renderView();
            return true;
            
        } catch (error) {
            console.error('[handleStandaloneRoundLink] Error:', error);
            alert('Failed to load standalone round. Please try again.');
            return false;
        }
    }

    async function handleDirectLink(eventId, roundId, archerId) {
        try {
            console.log('[handleDirectLink] Loading round:', { eventId, roundId, archerId });

            // 1. Check if this matches current session
            const sessionData = localStorage.getItem('current_bale_session');
            if (sessionData) {
                try {
                    const session = JSON.parse(sessionData);
                    if (session.roundId === roundId) {
                        console.log('[handleDirectLink] ✅ Matches current session - attempting restore');
                        const restored = await restoreCurrentBaleSession();
                        if (restored) {
                            renderView();
                            return true;
                        }
                    }
                } catch (e) {
                    console.warn('[handleDirectLink] Could not parse session:', e);
                }
            }

            // 2. Fetch entry code FIRST (before any API calls that require auth)
            // Check if this is a standalone round (eventId is null, 'null', or empty)
            const isStandalone = !eventId || eventId === 'null' || eventId === '';
            console.log('[handleDirectLink] Round type:', isStandalone ? 'Standalone' : 'Event-linked', { eventId, roundId });
            
            let entryCode = null;
            
            if (isStandalone) {
                // Standalone round - use round's entry_code
                console.log('[handleDirectLink] Standalone round - fetching round entry code...');
                
                // Try to get from localStorage first (saved when round was created)
                // Check both round-specific key and global key
                let savedRoundEntryCode = localStorage.getItem(`round:${roundId}:entry_code`);
                if (!savedRoundEntryCode) {
                    // Also check global key (saved by live_updates.js)
                    savedRoundEntryCode = localStorage.getItem('round_entry_code');
                }
                if (savedRoundEntryCode) {
                    entryCode = savedRoundEntryCode;
                    console.log('[handleDirectLink] ✅ Found round entry code in localStorage:', entryCode);
                    // Save it with roundId key for future lookups
                    localStorage.setItem(`round:${roundId}:entry_code`, entryCode);
                } else {
                    // Try to get from archer history (which includes entry_code for standalone rounds)
                    try {
                        const archerId = getArcherCookie();
                        const historyResponse = await fetch(`${API_BASE}/archers/${archerId}/history`);
                        if (historyResponse.ok) {
                            const historyData = await historyResponse.json();
                            const history = historyData.history || historyData.rounds || [];
                            const roundInHistory = history.find(r => r.round_id === roundId && r.is_standalone);
                            if (roundInHistory && roundInHistory.entry_code) {
                                entryCode = roundInHistory.entry_code;
                                console.log('[handleDirectLink] ✅ Found round entry code in archer history:', entryCode);
                                // Save it for future use
                                localStorage.setItem(`round:${roundId}:entry_code`, entryCode);
                            }
                        }
                    } catch (e) {
                        console.warn('[handleDirectLink] Could not fetch archer history:', e);
                    }
                }
                
                if (!entryCode) {
                    console.error('[handleDirectLink] ❌ No round entry code found for standalone round');
                    alert('Unable to access this standalone round. The round entry code is required but was not found.\n\nPlease try refreshing the page or contact support.');
                    return false;
                }
            } else {
                // Event-linked round - use event entry code
                console.log('[handleDirectLink] Event-linked round - fetching event entry code...');
                
                // First try to get entry code from localStorage
                entryCode = getEventEntryCode();
                
                // ALWAYS fetch event snapshot to get entry code (even if we have one in localStorage, refresh it)
                // This ensures we have the latest entry code and event data
                console.log('[handleDirectLink] Fetching event snapshot to get entry code:', eventId);
                try {
                    const eventResponse = await fetch(`${API_BASE}/events/${eventId}/snapshot`);
                    if (eventResponse.ok) {
                        const eventData = await eventResponse.json();
                        // Event snapshot includes entry_code for client-side auth (since archer is assigned)
                        const fetchedEntryCode = eventData.event?.entry_code || '';
                        
                        if (fetchedEntryCode) {
                            console.log('[handleDirectLink] ✅ Retrieved entry code from event snapshot:', fetchedEntryCode);
                            entryCode = fetchedEntryCode; // Use the fetched code (overrides localStorage)
                            
                            // Save it for future use
                            localStorage.setItem('event_entry_code', entryCode);
                            try {
                                const metaKey = `event:${eventId}:meta`;
                                const existingMeta = JSON.parse(localStorage.getItem(metaKey) || '{}');
                                existingMeta.entryCode = entryCode;
                                existingMeta.id = eventId;
                                existingMeta.name = eventData.event?.name || '';
                                localStorage.setItem(metaKey, JSON.stringify(existingMeta));
                            } catch (e) {
                                console.warn('[handleDirectLink] Could not save entry code to event meta');
                            }
                        } else {
                            console.warn('[handleDirectLink] ⚠️ Event snapshot did not include entry code');
                            if (!entryCode) {
                                console.error('[handleDirectLink] ❌ No entry code available from event snapshot and none in localStorage');
                                alert('Unable to access this event. The event entry code is required but was not found.\n\nPlease contact the event coordinator or try using the event modal to enter the code manually.');
                                showEventModal();
                                return false;
                            }
                        }
                    } else {
                        console.warn('[handleDirectLink] Could not fetch event snapshot:', eventResponse.status);
                        if (!entryCode) {
                            console.error('[handleDirectLink] ❌ Failed to fetch event snapshot and no entry code in localStorage');
                            if (eventResponse.status === 401) {
                                alert('Unable to access this event. Authentication required.\n\nPlease contact the event coordinator or try using the event modal to enter the code manually.');
                            } else {
                                alert('Unable to load event information. Please check your connection and try again.');
                            }
                            showEventModal();
                            return false;
                        }
                    }
                } catch (e) {
                    console.warn('[handleDirectLink] Error fetching event snapshot:', e.message);
                    if (!entryCode) {
                        console.error('[handleDirectLink] ❌ Error fetching event snapshot and no entry code in localStorage');
                        alert('Unable to load event information. Please check your connection and try again.');
                        showEventModal();
                        return false;
                    }
                }
            }

            console.log('[handleDirectLink] Using entry code:', entryCode ? `Yes (${entryCode})` : 'No');
            
            if (!entryCode) {
                console.error('[handleDirectLink] ❌ No entry code available - cannot proceed');
                alert('Unable to access this event. The event entry code is required.\n\nPlease contact the event coordinator or try using the event modal to enter the code manually.');
                showEventModal();
                return false;
            }
            
            // 3. Fetch round data from server (now with entry code)
            console.log('[handleDirectLink] Fetching round data from server...');

            // Step 1: Get round snapshot to find archer's bale number
            let snapshotData = null;
            let snapshotResponse = await fetch(`${API_BASE}/rounds/${roundId}/snapshot`, {
                headers: {
                    'X-Passcode': entryCode || ''
                }
            });

            console.log('[handleDirectLink] Snapshot API response status:', snapshotResponse.status);

            if (!snapshotResponse.ok) {
                console.error('[handleDirectLink] ❌ Failed to fetch round snapshot:', snapshotResponse.status);

                if (snapshotResponse.status === 401) {
                    console.error('[handleDirectLink] 401 Unauthorized - Attempting to fetch entry code from event');
                    
                    // If we still don't have entry code, try fetching from event one more time
                    if (!entryCode && eventId) {
                        try {
                            const eventResponse = await fetch(`${API_BASE}/events/${eventId}/snapshot`);
                            if (eventResponse.ok) {
                                const eventData = await eventResponse.json();
                                entryCode = eventData.event?.entry_code || '';
                                
                                if (entryCode) {
                                    console.log('[handleDirectLink] ✅ Retrieved entry code from event (401 retry)');
                                    localStorage.setItem('event_entry_code', entryCode);
                                    // Retry the snapshot fetch
                                    snapshotResponse = await fetch(`${API_BASE}/rounds/${roundId}/snapshot`, {
                                        headers: {
                                            'X-Passcode': entryCode
                                        }
                                    });
                                    
                                    if (snapshotResponse.ok) {
                                        snapshotData = await snapshotResponse.json();
                                        console.log('[handleDirectLink] ✅ Retry successful with entry code from event');
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn('[handleDirectLink] Error fetching event on 401 retry:', e.message);
                        }
                    }
                    
                    // If still 401 after retry, show error
                    if (!snapshotResponse.ok && snapshotResponse.status === 401) {
                        console.error('[handleDirectLink] 401 Unauthorized - Could not retrieve entry code');
                        alert('Unable to access this round. The event may require an entry code that is not available.\n\nPlease contact the event coordinator or try using the event modal to enter the code manually.');
                        showEventModal();
                        return false;
                    }
                } else if (snapshotResponse.status === 404) {
                    console.error('[handleDirectLink] 404 Not Found - Round does not exist');
                    console.error('[handleDirectLink] Round ID:', roundId);
                    // Don't show alert - let fallback logic try to recover
                    // The round might exist but the snapshot endpoint might not be accessible without auth
                    console.log('[handleDirectLink] 404 error - allowing fallback logic to try alternative approach');
                    return false;
                } else {
                    // Other errors - log but don't throw, let fallback logic handle it
                    console.error('[handleDirectLink] Non-401/404 error:', snapshotResponse.status);
                    console.error('[handleDirectLink] Response text:', await snapshotResponse.text().catch(() => 'Unable to read response'));
                    // Don't throw - return false to allow fallback logic in init()
                    return false;
                }
            } else {
                // Success on first try
                snapshotData = await snapshotResponse.json();
            }

            // If we still don't have snapshotData, we shouldn't continue
            if (!snapshotData) {
                console.error('[handleDirectLink] ❌ No snapshot data available');
                return false;
            }
            console.log('[handleDirectLink] ✅ Snapshot received:', {
                division: snapshotData.round?.division,
                baleNumber: snapshotData.round?.baleNumber,
                archerCount: snapshotData.archers?.length || 0
            });

            // Step 2: Find archer in snapshot to get their bale number
            // Snapshot now includes archerId so we can match by master archer ID
            const snapshotArcher = snapshotData.archers?.find(a =>
                a.archerId === archerId ||
                a.roundArcherId === archerId ||
                a.id === archerId
            );

            if (!snapshotArcher) {
                console.error('[handleDirectLink] ❌ Archer not found in round snapshot');
                console.error('[handleDirectLink] Looking for archerId:', archerId);
                console.error('[handleDirectLink] Available archers:', snapshotData.archers?.map(a => ({
                    roundArcherId: a.roundArcherId,
                    archerId: a.archerId,
                    archerName: a.archerName,
                    baleNumber: a.baleNumber
                })));
                alert('You are not assigned to this round.');
                return false;
            }

            // Get bale number from archer's assignment (baleNumber is now in snapshot archer data)
            const baleNumber = snapshotArcher.baleNumber || snapshotData.round?.baleNumber;
            
            // If no bale number assigned, go to Setup mode to select bale mates
            if (!baleNumber || baleNumber === null || baleNumber === undefined) {
                console.log('[handleDirectLink] ⚠️ No bale number assigned - going to Setup mode');
                console.log('[handleDirectLink] Archer found in round but not assigned to a bale yet');
                
                // Load the event so Setup mode can work
                const eventLoaded = await loadEventById(eventId, '', entryCode);
                if (!eventLoaded) {
                    console.error('[handleDirectLink] Failed to load event for Setup mode');
                    alert('Could not load event. Please try again.');
                    return false;
                }
                
                // Set up state for Setup mode
                state.activeEventId = eventId;
                state.selectedEventId = eventId;
                state.roundId = roundId; // Keep the round ID so we can update it later
                state.assignmentMode = 'manual'; // Force manual mode for bale selection
                state.divisionCode = snapshotData.round?.division || '';
                
                // Update archer cookie
                const currentCookie = getArcherCookie();
                if (currentCookie !== archerId) {
                    console.log('[handleDirectLink] 🔄 Updating archer cookie from', currentCookie, 'to', archerId);
                    setArcherCookieSafe(archerId);
                }
                
                // Show Setup mode
                updateEventHeader();
                hideEventModal();
                renderSetupSections();
                
                console.log('[handleDirectLink] ✅ Setup mode ready - archer can select bale mates and start scoring');
                return true; // Successfully went to Setup mode
            }
            
            console.log('[handleDirectLink] ✅ Found archer, bale:', baleNumber, 'roundArcherId:', snapshotArcher.roundArcherId);

            // Step 3: Use snapshot data to get ALL archers, then filter to same bale or NULL bale_number
            // This ensures we don't miss archers that might be on different bales or have NULL bale_number
            console.log('[handleDirectLink] Processing snapshot archers:', snapshotData.archers?.length || 0);
            
            // Filter archers: same bale OR NULL bale_number (unassigned)
            const relevantArchers = snapshotData.archers.filter(a => 
                a.baleNumber === baleNumber || 
                a.baleNumber === null || 
                a.baleNumber === undefined
            );
            
            console.log('[handleDirectLink] Filtered to', relevantArchers.length, 'archers (bale', baleNumber, 'or NULL)');
            
            // Step 4: Fetch full bale data for detailed archer info (firstName, lastName, etc.)
            // This gives us the full archer details we need
            const baleResponse = await fetch(`${API_BASE}/rounds/${roundId}/bales/${baleNumber}/archers`, {
                headers: {
                    'X-Passcode': entryCode || ''
                }
            });

            let baleData = null;
            if (baleResponse.ok) {
                baleData = await baleResponse.json();
                console.log('[handleDirectLink] ✅ Bale data received:', {
                    division: baleData.division,
                    archerCount: baleData.archers?.length || 0
                });
            } else {
                console.warn('[handleDirectLink] ⚠️ Could not fetch bale data, using snapshot data only');
                // Create bale data structure from snapshot
                baleData = {
                    division: snapshotData.round?.division,
                    archers: []
                };
            }

            // Merge snapshot archers with bale data archers
            // Use bale data for full details, but include snapshot archers that might be missing
            const archerMap = new Map();
            
            // First, add archers from bale data (full details)
            if (baleData.archers && Array.isArray(baleData.archers)) {
                baleData.archers.forEach(archer => {
                    const key = archer.archerId || archer.id || archer.roundArcherId;
                    if (key) {
                        archerMap.set(key, archer);
                    }
                });
            }
            
            // Then, add missing archers from snapshot (might have NULL bale_number or be on different bale)
            relevantArchers.forEach(snapshotArcher => {
                const key = snapshotArcher.archerId || snapshotArcher.roundArcherId;
                if (key && !archerMap.has(key)) {
                    // Convert snapshot archer to bale data format
                    const archerName = snapshotArcher.archerName || 'Unknown';
                    const nameParts = archerName.split(' ');
                    const firstName = nameParts[0] || '';
                    const lastName = nameParts.slice(1).join(' ') || '';
                    
                    archerMap.set(key, {
                        roundArcherId: snapshotArcher.roundArcherId,
                        archerId: snapshotArcher.archerId,
                        firstName: firstName,
                        lastName: lastName,
                        school: '',
                        level: '',
                        gender: '',
                        targetAssignment: snapshotArcher.targetAssignment,
                        baleNumber: snapshotArcher.baleNumber || baleNumber,
                        scorecard: {
                            ends: snapshotArcher.scores ? snapshotArcher.scores.map((score, idx) => ({
                                endNumber: idx + 1,
                                a1: score[0] || '',
                                a2: score[1] || '',
                                a3: score[2] || ''
                            })) : []
                        }
                    });
                    console.log('[handleDirectLink] ✅ Added missing archer from snapshot:', archerName);
                }
            });
            
            // Convert map to array
            const allArchers = Array.from(archerMap.values());
            console.log('[handleDirectLink] ✅ Total archers after merge:', allArchers.length);
            
            // Validate we have archers
            if (allArchers.length === 0) {
                console.error('[handleDirectLink] ❌ No archers found after merge');
                alert('No archers found for this round. Please contact support.');
                return false;
            }

            // CRITICAL: Update archer cookie to match URL parameter
            // This prevents loading wrong archer from stale cookie data
            const currentCookie = getArcherCookie();
            if (currentCookie !== archerId) {
                console.log('[handleDirectLink] 🔄 Updating archer cookie from', currentCookie, 'to', archerId);
                setArcherCookieSafe(archerId);
            } else {
                console.log('[handleDirectLink] ✅ Archer cookie already correct:', archerId);
            }

            // 3. Find archer in merged archer list
            console.log('[handleDirectLink] Looking for archer:', archerId, 'in', allArchers.length, 'archers');

            const archerData = allArchers.find(a =>
                a.archerId === archerId ||
                a.id === archerId ||
                a.archer_id === archerId
            );

            if (!archerData) {
                console.error('[handleDirectLink] ❌ Archer not found in merged archer list');
                console.error('[handleDirectLink] Looking for:', archerId);
                console.error('[handleDirectLink] Available archers:', allArchers.map(a => ({
                    archerId: a.archerId,
                    id: a.id,
                    name: `${a.firstName} ${a.lastName}`
                })));
                alert('You are not assigned to this round.');
                return false;
            }

            console.log('[handleDirectLink] ✅ Found archer:', archerData.firstName, archerData.lastName);

            // 4. Set up state (same as restoreCurrentBaleSession)
            state.activeEventId = eventId;
            state.selectedEventId = eventId;
            state.roundId = roundId;
            state.baleNumber = baleNumber;
            state.divisionCode = baleData.division;
            state.divisionRoundId = roundId;
            state.assignmentMode = 'pre-assigned';

            console.log('[handleDirectLink] State configured:', {
                baleNumber: state.baleNumber,
                division: state.divisionCode,
                assignmentMode: state.assignmentMode
            });

            // Save entry code if we have it
            if (entryCode) {
                localStorage.setItem('event_entry_code', entryCode);
            }

            // 5. Reconstruct archers for this bale (same logic as restoreCurrentBaleSession)
            const baleDivision = baleData?.division || snapshotData.round?.division || null;
            if (baleDivision) {
                state.divisionCode = baleDivision;
                state.divisionRoundId = roundId;
                console.log('[handleDirectLink] ✅ Set division from bale data:', baleDivision);
            }

            state.archers = allArchers.map(archer => {
                const scoreSheet = createEmptyScoreSheet(state.totalEnds);
                const endsList = Array.isArray(archer.scorecard?.ends) ? archer.scorecard.ends : [];
                endsList.forEach(end => {
                    const idx = Math.max(0, Math.min(state.totalEnds - 1, (end.endNumber || 1) - 1));
                    scoreSheet[idx] = [end.a1 || '', end.a2 || '', end.a3 || ''];
                });
                const provisional = {
                    extId: archer.extId,
                    firstName: archer.firstName,
                    lastName: archer.lastName,
                    school: archer.school
                };
                const extId = getExtIdFromArcher(provisional);
                const overrides = {
                    extId,
                    targetAssignment: archer.targetAssignment || archer.target,
                    baleNumber: archer.baleNumber || baleNumber,
                    level: archer.level,
                    gender: archer.gender,
                    division: baleDivision || archer.division,
                    scores: scoreSheet
                };
                const rosterPayload = Object.assign({}, provisional, {
                    level: archer.level,
                    gender: archer.gender,
                    division: baleDivision || archer.division
                });
                const stateArcher = buildStateArcherFromRoster(rosterPayload, overrides);
                stateArcher.roundArcherId = archer.roundArcherId;
                return stateArcher;
            });

            console.log('[handleDirectLink] ✅ Reconstructed', state.archers.length, 'archers for bale', state.baleNumber);

            // 6. Load scores from server
            console.log('[handleDirectLink] Loading existing scores...');
            await loadExistingScoresForArchers();

            // 7. Initialize LiveUpdates if enabled
            if (getLiveEnabled()) {
                console.log('[handleDirectLink] Initializing Live Updates...');
                await ensureLiveRoundReady({ promptForCode: false });
            }

            // 8. Save session
            saveCurrentBaleSession();
            saveData();

            // 9. Go to scoring view
            state.currentView = 'scoring';
            console.log('[handleDirectLink] ✅ Direct link handled - going to scoring view');
            renderView();
            return true;

        } catch (error) {
            console.error('[handleDirectLink] Error:', error);
            // Don't show alert for network errors or recoverable errors
            // These will be handled by fallback logic in init()
            const isNetworkError = error.message && (
                error.message.includes('fetch') ||
                error.message.includes('network') ||
                error.message.includes('Failed to fetch')
            );
            
            if (!isNetworkError) {
                // Only show alert for unexpected errors
                console.error('[handleDirectLink] Unexpected error - showing alert');
                alert('Failed to load round. Please try again.');
            } else {
                console.log('[handleDirectLink] Network/recoverable error - allowing fallback logic');
            }
            return false;
        }
    }

    /**
     * Handle QR code entry
     * URL format: ?event=X&code=ABC
     */
    async function handleQRCode(eventId, entryCode) {
        try {
            console.log('[handleQRCode] Loading event with code:', { eventId, entryCode });

            // 1. Save entry code everywhere
            localStorage.setItem('event_entry_code', entryCode);
            const metaKey = `event:${eventId}:meta`;
            const meta = {
                entryCode,
                loadedAt: new Date().toISOString()
            };
            localStorage.setItem(metaKey, JSON.stringify(meta));

            // 2. Load event
            const success = await loadEventById(eventId, '', entryCode);
            if (!success) {
                throw new Error('Failed to load event');
            }

            // 3. Check for pre-assigned bale
            if (state.assignmentMode === 'pre-assigned') {
                const archerId = getArcherCookie();
                console.log('[handleQRCode] Checking for bale assignment for archer:', archerId);

                const baleAssignment = await findArcherBaleAssignment(eventId, archerId);
                if (baleAssignment) {
                    console.log('[handleQRCode] ✅ Found bale assignment:', baleAssignment.baleNumber);
                    state.baleNumber = baleAssignment.baleNumber;
                    state.divisionCode = baleAssignment.division;

                    // Load the bale
                    await loadPreAssignedBale(eventId, baleAssignment.baleNumber);

                    // Check if we have existing scores
                    const hasScores = await hasServerSyncedEnds();
                    if (hasScores) {
                        console.log('[handleQRCode] Found existing scores - resuming');
                        await loadExistingScoresForArchers();

                        // Initialize LiveUpdates if enabled
                        if (getLiveEnabled()) {
                            await ensureLiveRoundReady({ promptForCode: false });
                        }

                        state.currentView = 'scoring';
                        renderView();
                        return true;
                    }
                }
            }

            // 4. Show setup view (manual or pre-assigned)
            console.log('[handleQRCode] ✅ Event loaded - showing setup');
            updateEventHeader();
            hideEventModal();
            renderSetupSections();
            return true;

        } catch (error) {
            console.error('[handleQRCode] Error:', error);
            return false;
        }
    }

    /**
     * Handle URL parameters
     * Returns true if URL parameters were handled, false otherwise
     */
    async function handleUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlEventId = urlParams.get('event');
        const urlEntryCode = urlParams.get('code');
        const urlRoundId = urlParams.get('round');
        const urlArcherId = urlParams.get('archer');

        console.log('[handleUrlParameters]', { urlEventId, urlEntryCode, urlRoundId, urlArcherId });

        // Scenario 1: Direct link with round ID (from index.html)
        // Handle both event-linked and standalone rounds
        if (urlRoundId && urlArcherId) {
            console.log('[handleUrlParameters] 🎯 Direct link detected - loading round');
            // urlEventId can be null, 'null', or empty for standalone rounds
            const eventId = (urlEventId && urlEventId !== 'null') ? urlEventId : null;
            return await handleDirectLink(eventId, urlRoundId, urlArcherId);
        }

        // Scenario 2: QR code with event and entry code
        if (urlEventId && urlEntryCode) {
            console.log('[handleUrlParameters] 📱 QR code detected - loading event');
            return await handleQRCode(urlEventId, urlEntryCode);
        }

        // Scenario 3: Event ID only (legacy)
        if (urlEventId) {
            console.log('[handleUrlParameters] 📋 Event ID only - loading event');
            const success = await loadEventById(urlEventId, '', '');
            if (success) {
                updateEventHeader();
                hideEventModal();
                renderSetupSections();
                return true;
            }
            return false;
        }

        // Scenario 4: No URL params
        console.log('[handleUrlParameters] No URL parameters found');
        return false;
    }

    async function init() {
        console.log("Initializing Ranking Round 300 App...");

        // TEST MODE: Clear all session data if running in test mode
        const isTestMode = window.location.search.includes('test=1') ||
            (typeof window.playwright !== 'undefined') ||
            (typeof navigator !== 'undefined' && navigator.webdriver);
        if (isTestMode) {
            console.log('[TEST MODE] Clearing all session data for clean test environment');
            try {
                localStorage.clear();
                sessionStorage.clear();
                // Clear IndexedDB if available
                if (window.indexedDB && window.indexedDB.databases) {
                    const dbs = await window.indexedDB.databases();
                    await Promise.all(dbs.map(db => {
                        return new Promise((resolve) => {
                            const req = window.indexedDB.deleteDatabase(db.name);
                            req.onsuccess = () => resolve();
                            req.onerror = () => resolve();
                            req.onblocked = () => resolve();
                        });
                    }));
                }
            } catch (e) {
                console.warn('[TEST MODE] Error clearing storage:', e);
            }
        }

        // PHASE 0: Create or retrieve archer cookie (must happen first)
        const archerId = getArcherCookie(); // From common.js
        console.log('[Phase 0] Archer cookie initialized:', archerId);

        cleanupLegacyStorage();
        loadData();
        renderKeypad();
        wireCoreHandlers();

        // CRITICAL: Handle URL parameters FIRST (highest priority)
        // This allows direct links from index.html to bypass all other checks
        const urlHandled = await handleUrlParameters();
        if (urlHandled) {
            console.log('[init] ✅ URL parameters handled successfully - skipping other checks');
            return;
        }

        // PHASE 0: Try to restore bale session from server (takes priority)
        const sessionRestored = await restoreCurrentBaleSession();
        if (sessionRestored) {
            console.log('[Phase 0] Session restored, showing scoring view');
            renderView();
            return; // Session restored, skip further setup
        }

        // Check for in-progress work FIRST (fallback to local storage)
        const localProgress = hasInProgressScorecard();
        if (localProgress) {
            console.log('Found in-progress scorecard - resuming scoring');

            // FIX: Initialize LiveUpdates and pre-map archer IDs when resuming from localStorage
            if (getLiveEnabled()) {
                console.log('[RESUME] Initializing Live Updates for resumed session (localStorage)...');
                await ensureLiveRoundReady({ promptForCode: false });
            }

            state.currentView = 'scoring';
            renderView();
            return; // Resume scoring, skip further setup
        }

        // Check server progress if we have an active event
        if (state.activeEventId || state.selectedEventId) {
            const serverProgress = await hasServerSyncedEnds();
            if (serverProgress) {
                console.log('Found server-synced progress - resuming scoring');

                // FIX: If we have no local archers (e.g. cleared cache), try to reload them from the event
                if (!state.archers || state.archers.length === 0) {
                    console.log('[RESUME] Archers missing locally, attempting to load from event snapshot...');
                    const eventId = state.activeEventId || state.selectedEventId;
                    await loadPreAssignedBale(eventId, state.baleNumber);

                    if (!state.archers || state.archers.length === 0) {
                        console.warn('[RESUME] No archers found for this bale on server. Cannot resume.');
                        // Fall through to setup
                    } else {
                        // Archers loaded, proceed with resume
                        await proceedWithResume();
                        return;
                    }
                } else {
                    // We have archers, proceed
                    await proceedWithResume();
                    return;
                }
            }
        }

        // Helper to encapsulate the resume logic
        async function proceedWithResume() {
            // CRITICAL: Load archer data BEFORE initializing LiveUpdates
            // This populates state.archers with division info needed for ensureLiveRoundReady
            console.log('[RESUME] Loading existing scores to populate archer data...');
            await loadExistingScoresForArchers();

            // CRITICAL FIX 3: Always update division from archers (trust server data over cached state)
            // Don't skip this if divisionCode already exists - server data is authoritative
            if (state.archers && state.archers.length > 0) {
                const firstArcher = state.archers[0];
                if (firstArcher.division) {
                    state.divisionCode = firstArcher.division;
                    console.log('[RESUME] ✅ Set division from first archer:', firstArcher.division);
                } else {
                    console.warn('[RESUME] ⚠️ First archer has no division field');
                }
            }


            // FIX: Initialize LiveUpdates and pre-map archer IDs when resuming
            if (getLiveEnabled()) {
                console.log('[RESUME] Initializing Live Updates for resumed session...');
                await ensureLiveRoundReady({ promptForCode: false });
            }

            state.currentView = 'scoring';
            renderView();
        }

        // No in-progress work - show event selection modal
        console.log('[init] No in-progress work - showing event selection modal');
        showEventModal();
        renderView();

        // Check for URL parameters (QR code access OR direct event/round link OR standalone round)
        
        // Scenario 1: Standalone round by entry code: ?code={entry_code}&archer={id}
        if (urlEntryCode && urlArcherId && !urlEventId) {
            console.log('[init] Standalone round by entry code detected');
            const handled = await handleStandaloneRoundLink(urlEntryCode.trim(), urlArcherId.trim(), true);
            if (handled) return;
        }
        
        // Scenario 2: Standalone round by round ID: ?round={id}&archer={id} (no event or event=null)
        if (urlRoundId && urlArcherId && (!urlEventId || urlEventId === 'null')) {
            console.log('[init] Standalone round by ID detected');
            const handled = await handleStandaloneRoundLink(urlRoundId.trim(), urlArcherId.trim(), false);
            if (handled) return;
        }
        
        // Scenario 3: Event-linked or standalone round: ?event={id|null}&round={id}&archer={id}
        if (urlRoundId && urlArcherId) {
            // Handle both event-linked and standalone rounds
            const eventId = (urlEventId && urlEventId !== 'null') ? urlEventId.trim() : null;
            console.log('[init] Round detected:', eventId ? 'Event-linked' : 'Standalone');
            const handled = await handleDirectLink(eventId, urlRoundId.trim(), urlArcherId.trim());
            if (handled) return;
        }
        
        // Scenario 4: QR code with event and entry code
        if (urlEventId && urlEntryCode && urlEventId.trim() && urlEntryCode.trim()) {
            // QR code access - requires both event and code
            console.log('QR code detected - verifying entry code...');
            const verified = await verifyAndLoadEventByCode(urlEventId.trim(), urlEntryCode.trim());
            if (verified) {
                // Event loaded successfully - skip event modal, go straight to bale selection
                console.log('Event loaded from QR code - bypassing event modal');

                // Update event header and render setup
                updateEventHeader();
                hideEventModal();
                renderSetupSections();
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
        } else if (urlEventId && urlEventId.trim()) {
            // Direct event link (from home page assignments) - load event directly without code
            console.log('[init] Event ID in URL - loading event directly:', urlEventId);
            const success = await loadEventById(urlEventId.trim(), '');
            if (success) {
                console.log('[init] Event loaded from URL - bypassing event modal');
                updateEventHeader();
                hideEventModal();
                renderSetupSections();

                // If round ID is also provided, try to load that specific round
                // NOTE: This is fallback logic - handleDirectLink should handle this, but if it fails, we try here
                if (urlRoundId && urlRoundId.trim() && urlArcherId && urlArcherId.trim()) {
                    console.log('[init] Fallback: Round ID in URL - attempting to load round:', urlRoundId);
                    console.log('[init] This should have been handled by handleDirectLink - checking if we can recover...');
                    // Only try fallback if handleDirectLink already failed
                    // Don't duplicate the work - if handleDirectLink succeeded, we wouldn't be here
                    try {
                        // Use entry code if available
                        const entryCode = getEventEntryCode();
                        const roundRes = await fetch(`${API_BASE}/rounds/${urlRoundId.trim()}/snapshot`, {
                            headers: {
                                'X-Passcode': entryCode || ''
                            }
                        });
                        if (roundRes.ok) {
                            const roundData = await roundRes.json();
                            console.log('[init] Fallback: Round data loaded successfully:', roundData);

                            // Extract division from round data and set in state (CRITICAL for Live Updates)
                            if (roundData.round && roundData.round.division) {
                                state.divisionCode = roundData.round.division;
                                console.log('[init] Set division from round data:', roundData.round.division);
                            }

                            // Set bale number from round data if available
                            if (roundData.round && roundData.round.baleNumber) {
                                state.baleNumber = roundData.round.baleNumber;
                                if (manualSetupControls.baleInput) {
                                    manualSetupControls.baleInput.value = state.baleNumber;
                                }
                            }

                            // Load archers for this round/bale
                            if (roundData.round && roundData.round.baleNumber) {
                                await loadPreAssignedBale(urlEventId.trim(), roundData.round.baleNumber);
                            } else if (roundData.archers && roundData.archers.length > 0) {
                                // If no bale number but we have archers, try to determine bale
                                // Note: archers from snapshot don't have baleNumber, so use state
                                await loadPreAssignedBale(urlEventId.trim(), state.baleNumber);
                            }

                            // Ensure division is set - fallback to archers if not in round data
                            if (!state.divisionCode && state.archers && state.archers.length > 0) {
                                const firstArcher = state.archers[0];
                                if (firstArcher.division) {
                                    state.divisionCode = firstArcher.division;
                                    console.log('[init] Set division from first archer:', firstArcher.division);
                                }
                            }
                        }
                    } catch (e) {
                        console.log('[init] Could not load round from URL:', e.message);
                    }
                }
            } else {
                // Failed to load event - show modal
                console.log('[init] Failed to load event from URL - showing modal');
                showEventModal();
            }
        } else if (!state.selectedEventId && !state.activeEventId) {
            // No URL params, no saved event - show modal only (do not mutate state here)
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
                if (archerSelector) {
                    archerSelector.setFilter(manualSetupControls.searchInput.value);
                } else {
                    renderManualArcherList();
                }
            };
        }

        console.log('[ATTACH HANDLERS] manualSetupControls.startScoringBtn:', manualSetupControls.startScoringBtn);
        if (manualSetupControls.startScoringBtn) {
            console.log('[ATTACH HANDLERS] Attaching onclick to Start Scoring button');
            manualSetupControls.startScoringBtn.onclick = async () => {
                console.log('[START SCORING] Button clicked, archers:', state.archers.length);
                console.log('[START SCORING] Archers:', state.archers.map(a => ({ id: a.id, name: `${a.firstName} ${a.lastName}` })));

                if (state.archers.length === 0) {
                    alert('Please select at least one archer to start scoring.');
                    return;
                }
                
                // Validate division is selected (required for both event-linked and standalone)
                if (!state.selectedDivision) {
                    alert('Please select a division before starting scoring.');
                    if (eventDivisionControls.divisionSelect) {
                        eventDivisionControls.divisionSelect.focus();
                    }
                    return;
                }

                // Store original button text and show loading state
                const originalText = manualSetupControls.startScoringBtn.textContent;
                manualSetupControls.startScoringBtn.textContent = 'Loading...';
                manualSetupControls.startScoringBtn.disabled = true;

                try {
                    console.log('[START SCORING] Loading existing scores...');
                    // Load existing scores BEFORE initializing Live sync
                    // This allows editing existing scorecards
                    await loadExistingScoresForArchers();

                    console.log('[START SCORING] Checking Live Updates enabled:', getLiveEnabled());
                    if (getLiveEnabled()) {
                        manualSetupControls.startScoringBtn.textContent = 'Syncing...';
                        console.log('[START SCORING] Ensuring Live Round ready...');
                        const success = await ensureLiveRoundReady({ promptForCode: true });
                        console.log('[START SCORING] Live Round ready:', success);
                        if (!success) {
                            console.warn('[START SCORING] Live sync failed, continuing offline');
                            // Don't alert - just continue, scores will sync when connectivity returns
                        }
                    }

                    console.log('[START SCORING] Saving session...');
                    // PHASE 0: Save session for recovery on page reload
                    saveCurrentBaleSession();

                    console.log('[START SCORING] Transitioning to scoring view...');
                    manualSetupControls.startScoringBtn.textContent = 'Starting...';

                    // Small delay to ensure UI updates
                    await new Promise(resolve => setTimeout(resolve, 100));

                    showScoringView();
                    console.log('[START SCORING] ✅ Successfully transitioned to scoring view');
                } catch (err) {
                    console.error('[START SCORING] Error:', err);
                    alert(`Error starting scoring: ${err.message}`);
                    manualSetupControls.startScoringBtn.textContent = originalText;
                    manualSetupControls.startScoringBtn.disabled = false;
                }
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
                const selectedOption = eventSelector.selectedOptions && eventSelector.selectedOptions[0];
                if (selectedOption) {
                    state.eventName = selectedOption.dataset.name || selectedOption.textContent || state.eventName;
                }
                saveData();
                updateEventHeader();

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

        // Complete round button
        const completeBtn = document.getElementById('complete-round-btn');
        if (completeBtn) {
            completeBtn.onclick = () => {
                // Complete round for final verification
                if (confirm('Are you sure you want to complete this round? This will mark all archers as finished.')) {
                    completeRound();
                }
            };
        }

        // Sync end button (for live mode)
        const syncBtn = document.getElementById('sync-end-btn');
        if (syncBtn) {
            syncBtn.onclick = () => {
                syncCurrentEnd();
            };
        }

        if (setupControls.subheader) {
            setupControls.subheader.innerHTML = '';
            setupControls.subheader.style.display = 'flex';
            setupControls.subheader.style.gap = '0.5rem';
            setupControls.subheader.style.flexWrap = 'wrap';

            const isManualMode = state.assignmentMode === 'manual';

            if (!isManualMode) {
                const searchInput = document.createElement('input');
                searchInput.type = 'text';
                searchInput.placeholder = 'Search archers...';
                searchInput.className = 'archer-search-bar';
                searchInput.oninput = () => {
                    if (state.assignmentMode === 'pre-assigned' && state.activeEventId) {
                        renderPreAssignedArchers();
                    } else {
                        const masterList = (typeof ArcherModule !== 'undefined') ? ArcherModule.loadList() : [];
                        renderArcherSelectList(masterList, searchInput.value);
                    }
                };
                setupControls.subheader.appendChild(searchInput);
            }

            const liveBtn = document.createElement('button');
            liveBtn.id = 'live-toggle-btn';
            const refreshLiveBtn = () => {
                const on = getLiveEnabled();
                liveBtn.textContent = on ? 'Live: On' : 'Live: Off';
                liveBtn.className = on ? 'btn btn-success' : 'btn btn-secondary';
            };
            refreshLiveBtn();
            liveBtn.onclick = async () => {
                liveBtn.disabled = true;
                await handleLiveToggle();
                liveBtn.disabled = false;
                refreshLiveBtn();
            };
            if (!isManualMode) {
                setupControls.subheader.appendChild(liveBtn);
            }

            const resetBtn = document.createElement('button');
            resetBtn.id = 'reset-btn';
            resetBtn.className = 'btn btn-danger';
            resetBtn.textContent = 'Reset';
            resetBtn.onclick = () => resetModal.element.style.display = 'flex';
            setupControls.subheader.appendChild(resetBtn);

            if (!isManualMode) {
                const scoringBtn = document.createElement('button');
                scoringBtn.id = 'scoring-btn';
                scoringBtn.className = 'btn btn-primary';
                scoringBtn.textContent = 'Start Scoring';
                scoringBtn.onclick = showScoringView;
                setupControls.subheader.appendChild(scoringBtn);
            }
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
            if (e.target.classList && e.target.classList.contains('score-input')) {
                if (e.target.dataset && e.target.dataset.locked === 'true') {
                    e.target.blur();
                    return;
                }
                console.log('Score input focused:', e.target);
                showKeypadForInput(e.target);
            }
        });

        document.body.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-card-btn')) {
                const archerId = e.target.dataset.archerId;
                if (archerId) {
                    state.currentView = 'card';
                    state.activeArcherId = archerId;
                    renderView();
                }
                if (keypad.element) {
                    keypad.element.style.display = 'none';
                }
            }
        });

        document.body.addEventListener('input', (e) => {
            if (e.target.classList.contains('score-input')) {
                handleScoreInput(e);
            }
        });

        // Keypad click handler is already attached via event delegation in wireCoreHandlers()
        // No need to re-attach here - event delegation on document.body is more robust
        console.log('✅ Keypad click handler uses event delegation (attached in wireCoreHandlers)');

        // --- Live Updates wiring (feature-flag) ---
        try {
            const cfg = window.LIVE_UPDATES || {};
            let isEnabled = true;  // Default ON
            try { const storedCfg = JSON.parse(localStorage.getItem('live_updates_config') || '{}'); isEnabled = storedCfg.enabled !== undefined ? !!storedCfg.enabled : true; } catch (_) { }
            LiveUpdates.setConfig({ apiBase: cfg.apiBase || API_BASE, apiKey: cfg.apiKey || '' });

            const onStartScoring = () => {
                if (!LiveUpdates || !LiveUpdates._state || !LiveUpdates.setConfig) return;
                if (!LiveUpdates._state.roundId && isEnabled) {
                    LiveUpdates.ensureRound({
                        roundType: 'R300',
                        date: new Date().toISOString().slice(0, 10),
                        eventId: state.activeEventId || state.selectedEventId
                    }).then(() => {
                        state.archers.forEach(a => LiveUpdates.ensureArcher(a.id, a));
                    }).catch(() => { });
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
                if (row) { row.classList.remove('sync-pending'); row.classList.add('sync-ok'); setTimeout(() => row.classList.remove('sync-ok'), 1200); }
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
            { id: '1', firstName: 'Mike', lastName: 'A.', school: 'WDV', level: 'V', gender: 'M', targetAssignment: 'A', targetSize: 122, scores: [['10', '9', '7'], ['8', '6', 'M'], ['5', '4', '3'], ['10', '9', '7'], ['X', '10', '8'], ['X', 'X', 'X'], ['9', '9', '8'], ['10', 'X', 'X'], ['7', '6', '5'], ['X', 'X', '9']] },
            { id: '2', firstName: 'Robert', lastName: 'B.', school: 'WDV', level: 'V', gender: 'M', targetAssignment: 'B', targetSize: 122, scores: [['X', '9', '9'], ['8', '8', '7'], ['5', '5', '5'], ['6', '6', '7'], ['8', '9', '10'], ['7', '7', '6'], ['10', '9', '9'], ['X', 'X', '8'], ['9', '8', '7'], ['6', '5', 'M']] },
            { id: '3', firstName: 'Terry', lastName: 'C.', school: 'OPP', level: 'JV', gender: 'M', targetAssignment: 'C', targetSize: 80, scores: [['X', '7', '7'], ['7', '7', '7'], ['10', '7', '10'], ['5', '4', 'M'], ['8', '7', '6'], ['5', '4', '3'], ['9', '8', 'X'], ['10', '7', '6'], ['9', '9', '9'], ['8', '8', 'M']] },
            { id: '4', firstName: 'Susan', lastName: 'D.', school: 'OPP', level: 'V', gender: 'F', targetAssignment: 'D', targetSize: 122, scores: [['9', '9', '8'], ['10', '9', '8'], ['X', '9', '8'], ['7', '7', '6'], ['10', '10', '9'], ['X', '9', '9'], ['8', '8', '7'], ['9', '9', '9'], ['10', 'X', '9'], ['8', '7', '6']] },
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

        // Get all archers from the event-specific cache (has UUIDs) or fallback to master list
        let eventArchers = [];
        if (state.activeEventId) {
            eventArchers = JSON.parse(localStorage.getItem(`event:${state.activeEventId}:archers_v2`) || '[]');
        }
        if (!eventArchers.length) {
            // Fallback: load from master list and convert format
            const masterList = JSON.parse(localStorage.getItem('archery_master_list') || '[]');
            eventArchers = masterList.map(a => ({
                id: a.id || a.extId || `${a.first}-${a.last}-${a.school}`,
                archerId: a.archerId || a.id,
                extId: a.extId,
                first: a.first || a.firstName,
                last: a.last || a.lastName,
                school: a.school,
                level: a.level,
                gender: a.gender,
                baleNumber: a.bale || a.baleNumber,
                targetAssignment: a.target || a.targetAssignment
            }));
        }
        const currentArcherIds = state.archers.map(a => a.id || a.extId || `${a.firstName}-${a.lastName}-${a.school}`);

        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-[90%] max-h-[80%] overflow-y-auto">
                <h3 class="mt-0 text-xl font-bold text-gray-800 dark:text-white mb-2">Edit Bale Assignments</h3>
                <p class="text-gray-600 dark:text-gray-400 mb-4">Check/uncheck archers to include in this bale</p>
                
                <div class="max-h-[300px] overflow-y-auto border border-gray-300 dark:border-gray-600 rounded p-2">
                    ${eventArchers.map(archer => {
            const archerId = archer.id || archer.extId || `${archer.first}-${archer.last}-${archer.school}`;
            const isChecked = currentArcherIds.includes(archerId);
            return `
                            <label class="block p-2 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                                <input type="checkbox" ${isChecked ? 'checked' : ''} 
                                       data-archer='${JSON.stringify(archer).replace(/'/g, '&#39;')}'
                                       class="mr-2">
                                <strong class="text-gray-800 dark:text-white">${archer.first} ${archer.last}</strong> 
                                <span class="text-gray-600 dark:text-gray-400">(${archer.school} - ${archer.level}/${archer.gender})</span>
                                ${archer.baleNumber ? `<span class="text-primary dark:text-blue-400">- Bale ${archer.baleNumber}</span>` : ''}
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
                    id: archerData.id || archerData.extId || `${archerData.first}-${archerData.last}-${archerData.school}`,
                    archerId: archerData.archerId || archerData.id,
                    extId: archerData.extId,
                    firstName: archerData.first,
                    lastName: archerData.last,
                    school: archerData.school,
                    level: archerData.level,
                    gender: archerData.gender,
                    targetAssignment: archerData.targetAssignment || archerData.target || 'A',
                    roundArcherId: archerData.roundArcherId,
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
            exportModal.classList.remove('hidden');
            exportModal.classList.add('flex');
        }
    }

    function hideExportModal() {
        const exportModal = document.getElementById('export-modal');
        if (exportModal) {
            exportModal.classList.add('hidden');
            exportModal.classList.remove('flex');
        }
    }

    // Event Modal Handlers
    const cancelEventModalBtn = document.getElementById('cancel-event-modal-btn');
    const standaloneRoundBtn = document.getElementById('standalone-round-btn');

    // Standalone Round button
    if (standaloneRoundBtn) {
        standaloneRoundBtn.onclick = () => {
            console.log('[Event Modal] Standalone round selected');
            hideEventModal();
            
            // Set standalone mode
            state.selectedEventId = null;
            state.activeEventId = null;
            state.isStandalone = true;
            state.eventName = '';
            
            // Load default divisions for standalone
            loadDefaultDivisions();
            
            // Update event/division selectors
            if (eventDivisionControls.eventSelect) {
                eventDivisionControls.eventSelect.value = '';
            }
            
            updateRoundTypeIndicator();
            renderSetupSections();
            console.log('[Event Modal] Standalone mode activated, showing setup with division selector');
        };
    }

    // Removed: Tab switching and Enter Code functionality (no longer needed)

    // Cancel button - navigate back to index.html
    if (cancelEventModalBtn) {
        cancelEventModalBtn.onclick = () => {
            console.log('[Event Modal] Cancel clicked - navigating to index.html');
            window.location.href = 'index.html';
        };
    }

    // ==================== Event/Division Selection Handlers ====================
    
    // Wire up event/division selection handlers
    if (eventDivisionControls.eventSelect) {
        eventDivisionControls.eventSelect.addEventListener('change', handleEventSelection);
    }
    
    if (eventDivisionControls.divisionSelect) {
        eventDivisionControls.divisionSelect.addEventListener('change', handleDivisionSelection);
    }
    
    if (eventDivisionControls.refreshEventsBtn) {
        eventDivisionControls.refreshEventsBtn.addEventListener('click', async () => {
            await loadEventsIntoSelect();
        });
    }
    
    // Initial load of events and divisions
    loadEventsIntoSelect();

    // Change event button (in header)
    // Deprecated: change-event-btn removed from header (Event/Division selection now in setup section)
    // Event modal still used for QR code entry and other flows

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
    // Legacy function - returns class name without bg- prefix
    return getScoreColorClass(score);
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
