// Live Updates client (feature-flagged)
// Usage: LiveUpdates.init({ enabled, apiBase, apiKey, corsOrigin })

(function (window) {
    // --- PRIVATE STATE ---
    // Detect localhost and use local API, otherwise use production
    const getApiBase = () => {
        if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            const port = window.location.port || '8001';
            return `${window.location.protocol}//${window.location.hostname}:${port}/api/index.php/v1`;
        }
        return 'https://tryentist.com/wdv/api/v1';
    };

    const state = {
        roundId: null,
        eventId: null,  // Track which event this round belongs to
        archerIds: {},
        config: {
            apiBase: getApiBase(),
            apiKey: '',
            enabled: true,  // Default ON for reliability
        },
        retryQueue: [],
        isProcessing: false,
    };

    // Generate session key (scoped to roundId for isolation between bales/divisions)
    function getSessionKey() {
        // If roundId is set, use it as the key (most reliable)
        if (state.roundId) {
            return `live_updates_session:${state.roundId}`;
        }
        // Fallback to generic key during initialization
        return 'live_updates_session:temp';
    }

    // Load persisted session state from localStorage (for recovery after refresh)
    function loadPersistedState() {
        try {
            // Try to load from the current roundId-specific key first
            let key = getSessionKey();
            let saved = localStorage.getItem(key);

            // If no roundId yet, check for any recent session and use it
            if (!saved) {
                const allKeys = Object.keys(localStorage).filter(k => k.startsWith('live_updates_session:'));
                if (allKeys.length > 0) {
                    // Sort by timestamp and use most recent
                    const sessions = allKeys.map(k => {
                        try {
                            const data = JSON.parse(localStorage.getItem(k) || '{}');
                            return { key: k, data, timestamp: data.lastUpdated || 0 };
                        } catch { return null; }
                    }).filter(Boolean).sort((a, b) => b.timestamp - a.timestamp);

                    if (sessions[0]) {
                        saved = JSON.stringify(sessions[0].data);
                        console.log('💾 Using most recent session:', sessions[0].key);
                    }
                }
            }

            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.roundId) state.roundId = parsed.roundId;
                if (parsed.eventId) state.eventId = parsed.eventId;  // Restore eventId
                if (parsed.archerIds) state.archerIds = parsed.archerIds;
                console.log('💾 Restored Live Updates session:', { roundId: state.roundId, eventId: state.eventId, archerCount: Object.keys(state.archerIds).length });
            }
        } catch (e) {
            console.warn('Failed to restore Live Updates session:', e);
        }
    }

    // Save state to localStorage for persistence across page reloads
    function persistState() {
        try {
            const key = getSessionKey();
            localStorage.setItem(key, JSON.stringify({
                roundId: state.roundId,
                eventId: state.eventId,  // Persist eventId to prevent cross-event contamination
                archerIds: state.archerIds,
                lastUpdated: Date.now()
            }));
        } catch (e) {
            console.warn('Failed to persist Live Updates session:', e);
        }
    }

    // Clear session (useful when starting a new event/round)
    function clearPersistedState(roundId) {
        try {
            if (roundId) {
                localStorage.removeItem(`live_updates_session:${roundId}`);
                console.log('🗑️ Cleared Live Updates session for round:', roundId);
            } else {
                // Clear all sessions
                Object.keys(localStorage).filter(k => k.startsWith('live_updates_session:')).forEach(k => {
                    localStorage.removeItem(k);
                });
                state.roundId = null;
                state.archerIds = {};
                console.log('🗑️ Cleared all Live Updates sessions');
            }
        } catch (e) {
            console.warn('Failed to clear Live Updates session:', e);
        }
    }

    // --- CORE FUNCTIONS ---
    function setConfig(overrides) {
        const stored = JSON.parse(localStorage.getItem('live_updates_config') || '{}');
        const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        const detectedApiBase = getApiBase();

        // If on localhost, don't use stored production URL
        if (isLocalhost && stored.apiBase && stored.apiBase.includes('tryentist.com')) {
            delete stored.apiBase;
        }

        Object.assign(state.config, stored || {}, overrides || {});

        // Always use detected API base when on localhost (unless explicitly overridden)
        if (isLocalhost && !overrides?.apiBase) {
            state.config.apiBase = detectedApiBase;
        }

        // Persist (default enabled=true unless explicitly set)
        try {
            const toStore = Object.assign({}, stored, overrides || {}, {
                enabled: (overrides && typeof overrides.enabled !== 'undefined') ? !!overrides.enabled : (stored.enabled !== undefined ? stored.enabled : true),
                // Always store detected API base when on localhost
                apiBase: (isLocalhost && !overrides?.apiBase) ? detectedApiBase : (overrides?.apiBase || stored.apiBase || detectedApiBase)
            });
            localStorage.setItem('live_updates_config', JSON.stringify(toStore));
        } catch (_) { }
    }

    function saveConfig(partial) {
        try {
            const current = JSON.parse(localStorage.getItem('live_updates_config') || '{}');
            const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
            const detectedApiBase = getApiBase();

            // If on localhost, don't save production URL
            if (isLocalhost && partial?.apiBase && partial.apiBase.includes('tryentist.com')) {
                console.log('[LiveUpdates] Preventing save of production URL on localhost');
                delete partial.apiBase;
            }

            const merged = Object.assign({}, current, partial || {});

            // Always use detected API base when on localhost
            if (isLocalhost && !partial?.apiBase) {
                merged.apiBase = detectedApiBase;
            }

            localStorage.setItem('live_updates_config', JSON.stringify(merged));
            Object.assign(state.config, merged);
        } catch (_) { }
    }

    function sanitizeRequestPath(path) {
        if (typeof path !== 'string') return null;
        let cleaned = path.trim();
        if (!cleaned.startsWith('/')) {
            cleaned = `/${cleaned}`;
        }
        if (!/^\/[A-Za-z0-9_\-\/]+$/.test(cleaned)) {
            console.warn('[LiveUpdates] Invalid request path skipped:', path);
            return null;
        }
        return cleaned;
    }

    async function request(path, method, body, _retried) {
        const normalizedPath = sanitizeRequestPath(path);
        if (!normalizedPath) {
            throw new Error(`Invalid LiveUpdates path: ${path}`);
        }
        // Debug: Log API base being used
        const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        if (isLocalhost && state.config.apiBase && state.config.apiBase.includes('tryentist.com')) {
            console.error('[LiveUpdates] ERROR: Using production API on localhost! apiBase:', state.config.apiBase);
            console.error('[LiveUpdates] Detected hostname:', window.location.hostname);
            console.error('[LiveUpdates] Expected local API:', getApiBase());
            // Force correct API base
            state.config.apiBase = getApiBase();
            console.log('[LiveUpdates] Corrected API base to:', state.config.apiBase);
        }

        // Prefer working without an API key on archer devices; include key if present
        const key = state.config.apiKey || localStorage.getItem('coach_api_key') || '';
        const headers = { 'Content-Type': 'application/json' };
        if (key) {
            headers['X-API-Key'] = key;
            headers['X-Passcode'] = key;
            console.log('[LiveUpdates] Using coach API key for request.');
        }
        else {
            // Fall back to event entry code so archers can sync without coach key
            let entryCode = localStorage.getItem('event_entry_code') || '';
            if (!entryCode) {
                try {
                    // Find latest RankingRound300 session and extract event IDs
                    let latestKey = null; let latestTs = 0; let stateObj = null;
                    for (let i = 0; i < localStorage.length; i++) {
                        const k = localStorage.key(i);
                        if (k && k.startsWith('rankingRound300_')) {
                            // Parse date suffix to sort newest
                            const suffix = k.substring('rankingRound300_'.length);
                            const ts = Date.parse(suffix) || 0;
                            if (ts >= latestTs) { latestTs = ts; latestKey = k; }
                        }
                    }
                    if (latestKey) {
                        stateObj = JSON.parse(localStorage.getItem(latestKey) || '{}');
                    }
                    const eventId = (stateObj && (stateObj.activeEventId || stateObj.selectedEventId)) || '';
                    if (eventId) {
                        const metaRaw = localStorage.getItem(`event:${eventId}:meta`);
                        if (metaRaw) {
                            const meta = JSON.parse(metaRaw);
                            entryCode = meta.entryCode || '';
                        }
                    }
                    // As final fallback, scan any event:*:meta for an entryCode
                    if (!entryCode) {
                        for (let i = 0; i < localStorage.length; i++) {
                            const k = localStorage.key(i);
                            if (k && k.startsWith('event:') && k.endsWith(':meta')) {
                                try {
                                    const meta = JSON.parse(localStorage.getItem(k) || '{}');
                                    if (meta && meta.entryCode) { entryCode = meta.entryCode; break; }
                                } catch (_) { }
                            }
                        }
                    }
                } catch (_) { }
            }
            if (entryCode) {
                headers['X-Passcode'] = entryCode;
                console.log('[LiveUpdates] Using event entry code for request.');
            } else {
                // Check for solo match code if this is a solo match request
                if (normalizedPath.includes('/solo-matches/')) {
                    const matchIdMatch = normalizedPath.match(/\/solo-matches\/([0-9a-f-]+)/);
                    if (matchIdMatch) {
                        const matchId = matchIdMatch[1];
                        let matchCode = localStorage.getItem(`solo_match_code:${matchId}`);
                        if (!matchCode && state.soloMatchCode) {
                            matchCode = state.soloMatchCode;
                        }
                        if (matchCode) {
                            headers['X-Passcode'] = matchCode;
                            console.log('[LiveUpdates] Using solo match code for request.');
                        } else {
                            console.warn('[LiveUpdates] No coach key, entry code, or match code available; request may fail.');
                        }
                    } else {
                        console.warn('[LiveUpdates] No coach key or entry code available; request may fail.');
                    }
                } else if (normalizedPath.includes('/team-matches/')) {
                    // Check for team match code if this is a team match request
                    const matchIdMatch = normalizedPath.match(/\/team-matches\/([0-9a-f-]+)/);
                    if (matchIdMatch) {
                        const matchId = matchIdMatch[1];
                        let matchCode = localStorage.getItem(`team_match_code:${matchId}`);
                        if (!matchCode && state.teamMatchCode) {
                            matchCode = state.teamMatchCode;
                        }
                        if (matchCode) {
                            headers['X-Passcode'] = matchCode;
                            console.log('[LiveUpdates] Using team match code for request.');
                        } else {
                            console.warn('[LiveUpdates] No coach key, entry code, or match code available; request may fail.');
                        }
                    } else {
                        console.warn('[LiveUpdates] No coach key or entry code available; request may fail.');
                    }
                } else {
                    console.warn('[LiveUpdates] No coach key or entry code available; request may fail.');
                }
            }
        }

        const apiBase = state.config.apiBase || getApiBase();
        const res = await fetch(`${apiBase}${normalizedPath}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (res.status === 401 && !_retried) {
            // If unauthorized and no key, surface error but do not disable entirely
            console.warn('Live Updates unauthorized');
            throw new Error('Unauthorized');
        }

        if (!res.ok) {
            const errorText = await res.text().catch(() => 'Unknown error');
            throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        if (res.status === 204) return null;
        return res.json();
    }

    function ensureRound({ roundType, date, division, gender, level, eventId }) {
        if (!state.config.enabled) return Promise.resolve(null);

        // Check if we have a cached roundId and if it's for the same event
        if (state.roundId && state.eventId === eventId) {
            console.log('✅ Reusing existing round for same event:', state.roundId);
            return Promise.resolve(state.roundId);
        }

        // If switching to a different event, clear the old round session
        if (state.roundId && state.eventId !== eventId) {
            console.log('⚠️ Event changed - clearing old round session. Old event:', state.eventId, 'New event:', eventId);
            state.roundId = null;
            state.archerIds = {};
            state.eventId = null;
        }

        // PHASE 0: baleNumber removed from rounds table, now lives in round_archers
        return request('/rounds', 'POST', { roundType, date, division, gender, level, eventId })
            .then(json => {
                if (!json || !json.roundId) {
                    throw new Error('Round creation failed: missing roundId');
                }
                state.roundId = json.roundId;
                state.eventId = eventId;  // Store the eventId to track which event this round belongs to
                persistState();  // Save roundId and eventId for recovery
                console.log('Round created and linked to event:', eventId, 'roundId:', state.roundId);
                return state.roundId;
            });
    }

    function ensureArcher(localId, archer) {
        if (!state.config.enabled) return Promise.resolve(null);

        const alreadyMapped = !!state.archerIds[localId];
        if (alreadyMapped) {
            console.log(`🔄 Archer ${localId} already mapped to ${state.archerIds[localId]}, updating bale/target if needed`);
        } else {
            console.log(`🔄 Ensuring archer ${localId}:`, {
                firstName: archer.firstName,
                lastName: archer.lastName,
                baleNumber: archer.baleNumber,
                targetAssignment: archer.targetAssignment
            });
        }

        return request(`/rounds/${state.roundId}/archers`, 'POST', {
            extId: localId,  // Send local ID for master archer lookup/creation
            firstName: archer.firstName || '',
            lastName: archer.lastName || '',
            school: archer.school || '',
            level: archer.level || '',
            gender: archer.gender || '',
            targetAssignment: archer.targetAssignment || '',
            baleNumber: archer.baleNumber || undefined,
        }).then(json => {
            if (!json || !json.roundArcherId) {
                throw new Error('Archer ensure failed: missing roundArcherId');
            }
            state.archerIds[localId] = json.roundArcherId;
            persistState();  // Save archer mapping for recovery
            // Store the master archer ID for future reference
            if (json.archerId) {
                const action = alreadyMapped ? 'updated' : (json.updated ? 'updated' : 'created');
                console.log(`✅ Archer ${localId} ${action}: roundArcherId=${json.roundArcherId}, masterId=${json.archerId}, bale=${archer.baleNumber}, target=${archer.targetAssignment}`);
            }
            return json.roundArcherId;
        });
    }

    function postEnd(localId, endNumber, payload) {
        if (!state.config.enabled) return Promise.resolve();
        const reqBody = {
            endNumber,
            a1: payload.a1, a2: payload.a2, a3: payload.a3,
            endTotal: payload.endTotal,
            runningTotal: payload.runningTotal,
            tens: payload.tens,
            xs: payload.xs,
            deviceTs: new Date().toISOString(),
        };
        console.log('📤 Posting end:', {
            roundId: state.roundId,
            archerId: state.archerIds[localId],
            localId,
            endNumber,
            payload: reqBody
        });
        const doRequest = () => request(`/rounds/${state.roundId}/archers/${state.archerIds[localId]}/ends`, 'POST', reqBody)
            .then(() => { try { window.dispatchEvent(new CustomEvent('liveSyncSuccess', { detail: { archerId: localId, endNumber } })); } catch (_) { } });

        // Basic offline queue: persist if request fails due to network, flush later
        return doRequest().catch(e => {
            const isNetwork = (e && (e.name === 'TypeError' || /NetworkError|Failed to fetch/i.test(String(e))));
            if (isNetwork) {
                try {
                    const key = `luq:${state.roundId}`;
                    const q = JSON.parse(localStorage.getItem(key) || '[]');
                    q.push({ archerId: localId, endNumber, body: reqBody });
                    localStorage.setItem(key, JSON.stringify(q));
                    try { window.dispatchEvent(new CustomEvent('liveSyncPending', { detail: { archerId: localId, endNumber } })); } catch (_) { }
                    return; // resolve quietly; will be retried later
                } catch (_) { }
            }
            try { window.dispatchEvent(new CustomEvent('liveSyncPending', { detail: { archerId: localId, endNumber } })); } catch (_) { }
            throw e;
        });
    }

    // Flush queued posts on init or when explicitly called
    function flushQueue() {
        try {
            const key = `luq:${state.roundId}`;
            const q = JSON.parse(localStorage.getItem(key) || '[]');
            if (!Array.isArray(q) || q.length === 0) return Promise.resolve();
            const tasks = q.map(item => request(`/rounds/${state.roundId}/archers/${state.archerIds[item.archerId]}/ends`, 'POST', item.body));
            return Promise.allSettled(tasks).then(results => {
                const remaining = [];
                results.forEach((res, idx) => { if (res.status !== 'fulfilled') remaining.push(q[idx]); });
                localStorage.setItem(key, JSON.stringify(remaining));
            });
        } catch (_) { return Promise.resolve(); }
    }

    // --- RECONNECT & HYDRATION METHODS ---

    /**
     * Fetch full round details including all archers and their scores.
     * Used for hydrating a session when rejoining an active round.
     * @param {string} roundId - The UUID of the round to fetch
     * @returns {Promise<Object>} - Standardized round object with archers and scores
     */
    function fetchFullRound(roundId) {
        if (!state.config.enabled) return Promise.resolve(null);

        console.log('🔄 Fetching full round details:', roundId);

        return request(`/rounds/${roundId}`, 'GET')
            .then(json => {
                if (!json || !json.round) {
                    throw new Error('Round fetch failed: missing round data');
                }

                const round = json.round;
                const archers = json.archers || [];

                // Update internal state
                state.roundId = round.id;
                state.eventId = round.event_id;

                // Map archers to internal state.archerIds
                state.archerIds = {};
                archers.forEach(a => {
                    // Use ext_id if available, otherwise fallback to id
                    const localId = a.ext_id || a.id;
                    state.archerIds[localId] = a.id; // Map local ID to server round_archer_id
                });

                persistState();

                console.log(`✅ Hydrated round ${roundId} with ${archers.length} archers`);
                return { round, archers };
            });
    }

    /**
     * Check if an active round already exists for a given event and bale.
     * Used to prevent duplicate round creation.
     * @param {string} eventId - The event ID
     * @param {number} baleNumber - The bale number
     * @returns {Promise<Object|null>} - The existing round object or null
     */
    function findActiveRound(eventId, baleNumber) {
        if (!state.config.enabled) return Promise.resolve(null);

        console.log(`🔍 Checking for active round: Event ${eventId}, Bale ${baleNumber}`);

        // We need a specific endpoint or query param for this.
        // Assuming GET /rounds?event_id=...&bale_number=... exists or we filter client-side.
        // For now, we'll use the generic rounds list and filter.
        // TODO: Optimize with backend endpoint if needed.

        return request(`/rounds?event_id=${eventId}&bale_number=${baleNumber}`, 'GET')
            .then(json => {
                const rounds = json.rounds || [];
                // Find a round that is NOT completed/voided
                const active = rounds.find(r => r.status !== 'Completed' && r.status !== 'Voided');

                if (active) {
                    console.log('⚠️ Found existing active round:', active.id);
                    return active;
                }
                return null;
            })
            .catch(e => {
                console.warn('Failed to check for active round:', e);
                return null;
            });
    }

    // --- INITIALIZATION ---
    function init(overrides) {
        const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        const detectedApiBase = getApiBase();

        // On localhost, always start fresh - don't trust localStorage
        let storedConfig = {};
        if (!isLocalhost) {
            // Only read from localStorage if not on localhost
            storedConfig = JSON.parse(localStorage.getItem('live_updates_config') || '{}');
        } else {
            // On localhost, clear any production URLs from localStorage
            try {
                const raw = localStorage.getItem('live_updates_config');
                if (raw) {
                    storedConfig = JSON.parse(raw);
                    if (storedConfig.apiBase && storedConfig.apiBase.includes('tryentist.com')) {
                        console.log('[LiveUpdates] Clearing production API URL from localStorage (localhost detected)');
                        delete storedConfig.apiBase;
                        localStorage.setItem('live_updates_config', JSON.stringify(storedConfig));
                    }
                }
            } catch (e) {
                storedConfig = {};
            }
        }

        const coachKey = localStorage.getItem('coach_api_key');
        if (coachKey && !storedConfig.apiKey) {
            storedConfig.apiKey = coachKey;
        }

        const config = {
            ...storedConfig,
            ...overrides,
            // Always use detected API base when on localhost
            apiBase: (isLocalhost && !overrides?.apiBase) ? detectedApiBase : (overrides?.apiBase || storedConfig.apiBase || detectedApiBase || 'https://tryentist.com/wdv/api/v1')
        };

        setConfig(config);
        loadPersistedState();  // Restore roundId and archerIds from previous session
    }

    // =====================================================
    // PHASE 2: SOLO MATCH METHODS
    // =====================================================

    function ensureSoloMatch({ date, location, eventId, bracketId, maxSets = 5, forceNew = false }) {
        if (!state.config.enabled) return Promise.resolve(null);

        // Build match key for caching (used both for checking cache and storing new match)
        const matchKey = `solo_match:${eventId || 'standalone'}:${bracketId || 'none'}:${date}`;

        // If forceNew is true, skip cache and create a new match
        if (!forceNew) {
            // Check if we have a cached matchId for the same event
            const cached = localStorage.getItem(matchKey);
            if (cached) {
                try {
                    const cachedData = JSON.parse(cached);
                    if (cachedData.matchId && cachedData.eventId === eventId && cachedData.bracketId === bracketId) {
                        console.log('✅ Reusing existing solo match:', cachedData.matchId);
                        state.soloMatchId = cachedData.matchId;
                        state.soloEventId = eventId;
                        if (cachedData.matchCode) {
                            state.soloMatchCode = cachedData.matchCode;
                            localStorage.setItem(`solo_match_code:${cachedData.matchId}`, cachedData.matchCode);
                        }
                        return Promise.resolve(cachedData.matchId);
                    }
                } catch (e) {
                    console.warn('Failed to parse cached solo match:', e);
                }
            }
        }

        return request('/solo-matches', 'POST', { date, location, eventId, bracketId, maxSets })
            .then(json => {
                if (!json || !json.matchId) {
                    throw new Error('Solo match creation failed: missing matchId');
                }
                state.soloMatchId = json.matchId;
                state.soloEventId = eventId;
                // Cache matchId and match code if available
                const cacheData = { matchId: json.matchId, eventId, date };
                if (json.matchCode) {
                    cacheData.matchCode = json.matchCode;
                    localStorage.setItem(`solo_match_code:${json.matchId}`, json.matchCode);
                    state.soloMatchCode = json.matchCode;
                }
                localStorage.setItem(matchKey, JSON.stringify(cacheData));
                console.log('Solo match created:', json.matchId, json.matchCode ? `(code: ${json.matchCode})` : '');
                return json.matchId;
            });
    }

    function ensureSoloArcher(matchId, localId, archer, position) {
        if (!state.config.enabled) return Promise.resolve(null);

        const mappingKey = `solo_archer:${matchId}:${position}`;
        const alreadyMapped = localStorage.getItem(mappingKey);
        if (alreadyMapped) {
            try {
                const mapped = JSON.parse(alreadyMapped);
                console.log(`🔄 Solo archer ${localId} position ${position} already mapped to ${mapped.matchArcherId}`);
                return Promise.resolve(mapped.matchArcherId);
            } catch (e) {
                console.warn('Failed to parse cached archer mapping:', e);
            }
        }

        return request(`/solo-matches/${matchId}/archers`, 'POST', {
            extId: localId,
            firstName: archer.first || archer.firstName || '',
            lastName: archer.last || archer.lastName || '',
            school: archer.school || '',
            level: archer.level || '',
            gender: archer.gender || '',
            position: position
        }).then(json => {
            if (!json || !json.matchArcherId) {
                throw new Error('Solo archer ensure failed: missing matchArcherId');
            }
            // Cache mapping
            localStorage.setItem(mappingKey, JSON.stringify({ matchArcherId: json.matchArcherId, position }));
            console.log(`✅ Solo archer ${localId} position ${position} mapped: ${json.matchArcherId}`);

            // Store match code if returned (generated when second archer is added)
            if (json.matchCode) {
                localStorage.setItem(`solo_match_code:${matchId}`, json.matchCode);
                state.soloMatchCode = json.matchCode;
                console.log(`🔑 Solo match code stored: ${json.matchCode}`);
            }

            return json.matchArcherId;
        });
    }

    function postSoloSet(matchId, matchArcherId, setNumber, payload) {
        if (!state.config.enabled) return Promise.resolve();

        const reqBody = {
            setNumber,
            a1: payload.a1 || null,
            a2: payload.a2 || null,
            a3: payload.a3 || null,
            setTotal: payload.setTotal || 0,
            setPoints: payload.setPoints || 0,
            runningPoints: payload.runningPoints || 0,
            tens: payload.tens || 0,
            xs: payload.xs || 0,
            deviceTs: new Date().toISOString(),
        };

        console.log('📤 Posting solo set:', { matchId, matchArcherId, setNumber, payload: reqBody });

        const doRequest = () => request(`/solo-matches/${matchId}/archers/${matchArcherId}/sets`, 'POST', reqBody)
            .then(() => {
                try {
                    window.dispatchEvent(new CustomEvent('soloSyncSuccess', { detail: { matchArcherId, setNumber } }));
                } catch (_) { }
            });

        // Basic offline queue: persist if request fails due to network, flush later
        return doRequest().catch(e => {
            const isNetwork = (e && (e.name === 'TypeError' || /NetworkError|Failed to fetch/i.test(String(e))));
            if (isNetwork) {
                try {
                    const key = `luq:solo:${matchId}`;
                    const q = JSON.parse(localStorage.getItem(key) || '[]');
                    q.push({ matchArcherId, setNumber, body: reqBody });
                    localStorage.setItem(key, JSON.stringify(q));
                    try {
                        window.dispatchEvent(new CustomEvent('soloSyncPending', { detail: { matchArcherId, setNumber } }));
                    } catch (_) { }
                    return; // resolve quietly; will be retried later
                } catch (_) { }
            }
            try {
                window.dispatchEvent(new CustomEvent('soloSyncPending', { detail: { matchArcherId, setNumber } }));
            } catch (_) { }
            throw e;
        });
    }

    function flushSoloQueue(matchId) {
        try {
            const key = `luq:solo:${matchId}`;
            const q = JSON.parse(localStorage.getItem(key) || '[]');
            if (!Array.isArray(q) || q.length === 0) return Promise.resolve();
            const tasks = q.map(item => request(`/solo-matches/${matchId}/archers/${item.matchArcherId}/sets`, 'POST', item.body));
            return Promise.allSettled(tasks).then(results => {
                const remaining = [];
                results.forEach((res, idx) => {
                    if (res.status !== 'fulfilled') remaining.push(q[idx]);
                });
                localStorage.setItem(key, JSON.stringify(remaining));
                if (remaining.length === 0) {
                    console.log('✅ Solo match queue flushed successfully');
                } else {
                    console.warn(`⚠️ Solo match queue: ${remaining.length} items failed to sync`);
                }
            });
        } catch (_) {
            return Promise.resolve();
        }
    }

    // =====================================================
    // PHASE 2: TEAM MATCH METHODS
    // =====================================================

    function ensureTeamMatch({ date, location, eventId, bracketId, maxSets = 4, forceNew = false }) {
        if (!state.config.enabled) {
            console.warn('[TeamMatch] LiveUpdates disabled, skipping match creation');
            return Promise.resolve(null);
        }

        console.log('[TeamMatch] ensureTeamMatch called:', { date, location, eventId, maxSets, forceNew });

        // Build match key for caching
        const matchKey = `team_match:${eventId || 'standalone'}:${bracketId || 'none'}:${date}`;

        // If forceNew is true, skip cache and create a new match
        if (!forceNew) {
            // Check if we have a cached matchId for the same event
            const cached = localStorage.getItem(matchKey);
            if (cached) {
                try {
                    const cachedData = JSON.parse(cached);
                    if (cachedData.matchId && cachedData.eventId === eventId && cachedData.bracketId === bracketId) {
                        console.log('[TeamMatch] ✅ Reusing existing team match:', cachedData.matchId);
                        state.teamMatchId = cachedData.matchId;
                        state.teamEventId = eventId;
                        if (cachedData.matchCode) {
                            state.teamMatchCode = cachedData.matchCode;
                            localStorage.setItem(`team_match_code:${cachedData.matchId}`, cachedData.matchCode);
                            console.log('[TeamMatch] Match code restored:', cachedData.matchCode);
                        }
                        return Promise.resolve(cachedData.matchId);
                    }
                } catch (e) {
                    console.warn('[TeamMatch] Failed to parse cached team match:', e);
                }
            }
        } else {
            console.log('[TeamMatch] forceNew=true, skipping cache');
        }

        console.log('[TeamMatch] Creating new team match in database...');
        return request('/team-matches', 'POST', { date, location, eventId, bracketId, maxSets })
            .then(json => {
                if (!json || !json.matchId) {
                    console.error('[TeamMatch] ❌ Match creation failed: missing matchId', json);
                    throw new Error('Team match creation failed: missing matchId');
                }
                state.teamMatchId = json.matchId;
                state.teamEventId = eventId;
                // Cache matchId and match code if available
                const cacheData = { matchId: json.matchId, eventId, date };
                if (json.matchCode) {
                    cacheData.matchCode = json.matchCode;
                    localStorage.setItem(`team_match_code:${json.matchId}`, json.matchCode);
                    state.teamMatchCode = json.matchCode;
                    console.log('[TeamMatch] 🔑 Match code received:', json.matchCode);
                }
                localStorage.setItem(matchKey, JSON.stringify(cacheData));
                console.log('[TeamMatch] ✅ Team match created:', json.matchId, json.matchCode ? `(code: ${json.matchCode})` : '(no code yet)');
                return json.matchId;
            })
            .catch(e => {
                console.error('[TeamMatch] ❌ Failed to create team match:', e);
                throw e;
            });
    }

    function ensureTeam(matchId, teamNumber, teamName, school) {
        if (!state.config.enabled) return Promise.resolve(null);

        console.log(`[TeamMatch] ensureTeam called: matchId=${matchId}, teamNumber=${teamNumber}, school=${school}`);

        const mappingKey = `team_match_team:${matchId}:${teamNumber}`;
        const alreadyMapped = localStorage.getItem(mappingKey);
        if (alreadyMapped) {
            try {
                const mapped = JSON.parse(alreadyMapped);
                console.log(`[TeamMatch] 🔄 Team ${teamNumber} already mapped to ${mapped.teamId}`);
                return Promise.resolve(mapped.teamId);
            } catch (e) {
                console.warn('[TeamMatch] Failed to parse cached team mapping:', e);
            }
        }

        console.log(`[TeamMatch] Creating team ${teamNumber} in database...`);
        return request(`/team-matches/${matchId}/teams`, 'POST', {
            teamName: teamName || null,
            school: school || '',
            position: teamNumber
        }).then(json => {
            if (!json || !json.teamId) {
                console.error(`[TeamMatch] ❌ Team ${teamNumber} creation failed: missing teamId`, json);
                throw new Error('Team ensure failed: missing teamId');
            }
            localStorage.setItem(mappingKey, JSON.stringify({ teamId: json.teamId, position: teamNumber }));
            console.log(`[TeamMatch] ✅ Team ${teamNumber} created: ${json.teamId}`);
            return json.teamId;
        })
            .catch(e => {
                console.error(`[TeamMatch] ❌ Failed to create team ${teamNumber}:`, e);
                throw e;
            });
    }

    function ensureTeamArcher(matchId, teamId, localId, archer, position) {
        if (!state.config.enabled) return Promise.resolve(null);

        const archerName = `${archer.first || archer.firstName || ''} ${archer.last || archer.lastName || ''}`.trim();
        console.log(`[TeamMatch] ensureTeamArcher called: matchId=${matchId}, teamId=${teamId}, archer=${archerName}, position=${position}`);

        const mappingKey = `team_archer:${matchId}:${teamId}:${position}`;
        const alreadyMapped = localStorage.getItem(mappingKey);
        if (alreadyMapped) {
            try {
                const mapped = JSON.parse(alreadyMapped);
                console.log(`[TeamMatch] 🔄 Team archer ${archerName} (pos ${position}) already mapped to ${mapped.matchArcherId}`);
                return Promise.resolve(mapped.matchArcherId);
            } catch (e) {
                console.warn('[TeamMatch] Failed to parse cached archer mapping:', e);
            }
        }

        console.log(`[TeamMatch] Adding archer ${archerName} to team ${teamId}...`);
        return request(`/team-matches/${matchId}/teams/${teamId}/archers`, 'POST', {
            extId: localId,
            firstName: archer.first || archer.firstName || '',
            lastName: archer.last || archer.lastName || '',
            school: archer.school || '',
            level: archer.level || '',
            gender: archer.gender || '',
            position: position
        }).then(json => {
            if (!json || !json.matchArcherId) {
                console.error(`[TeamMatch] ❌ Archer ${archerName} creation failed: missing matchArcherId`, json);
                throw new Error('Team archer ensure failed: missing matchArcherId');
            }
            localStorage.setItem(mappingKey, JSON.stringify({ matchArcherId: json.matchArcherId, position }));
            console.log(`[TeamMatch] ✅ Team archer ${archerName} (pos ${position}) created: ${json.matchArcherId}`);

            // Store match code if returned (generated when second team is complete)
            if (json.matchCode) {
                localStorage.setItem(`team_match_code:${matchId}`, json.matchCode);
                state.teamMatchCode = json.matchCode;
                console.log(`[TeamMatch] 🔑 Match code generated and stored: ${json.matchCode}`);
            }

            return json.matchArcherId;
        })
            .catch(e => {
                console.error(`[TeamMatch] ❌ Failed to add archer ${archerName}:`, e);
                throw e;
            });
    }

    function postTeamSet(matchId, teamId, matchArcherId, setNumber, payload) {
        if (!state.config.enabled) {
            console.warn('[TeamMatch] LiveUpdates disabled, skipping set post');
            return Promise.resolve();
        }

        const reqBody = {
            setNumber,
            a1: payload.a1 || null,
            setTotal: payload.setTotal || 0,
            setPoints: payload.setPoints || 0,
            runningPoints: payload.runningPoints || 0,
            tens: payload.tens || 0,
            xs: payload.xs || 0,
            deviceTs: new Date().toISOString(),
        };

        console.log('[TeamMatch] 📤 Posting team set:', { matchId, teamId, matchArcherId, setNumber, arrow: reqBody.a1, setTotal: reqBody.setTotal, setPoints: reqBody.setPoints });

        const doRequest = () => request(`/team-matches/${matchId}/teams/${teamId}/archers/${matchArcherId}/sets`, 'POST', reqBody)
            .then((response) => {
                console.log(`[TeamMatch] ✅ Set ${setNumber} posted successfully for archer ${matchArcherId}`);
                try {
                    window.dispatchEvent(new CustomEvent('teamSyncSuccess', { detail: { matchArcherId, setNumber } }));
                } catch (_) { }
                return response;
            });

        return doRequest().catch(e => {
            const isNetwork = (e && (e.name === 'TypeError' || /NetworkError|Failed to fetch/i.test(String(e))));
            if (isNetwork) {
                console.warn(`[TeamMatch] ⚠️ Network error, queuing set ${setNumber} for archer ${matchArcherId}`);
                try {
                    const key = `luq:team:${matchId}`;
                    const q = JSON.parse(localStorage.getItem(key) || '[]');
                    q.push({ teamId, matchArcherId, setNumber, body: reqBody });
                    localStorage.setItem(key, JSON.stringify(q));
                    console.log(`[TeamMatch] 💾 Queued set ${setNumber} (queue size: ${q.length})`);
                    try {
                        window.dispatchEvent(new CustomEvent('teamSyncPending', { detail: { matchArcherId, setNumber } }));
                    } catch (_) { }
                    return;
                } catch (err) {
                    console.error('[TeamMatch] ❌ Failed to queue set:', err);
                }
            } else {
                console.error(`[TeamMatch] ❌ Failed to post set ${setNumber} for archer ${matchArcherId}:`, e);
            }
            try {
                window.dispatchEvent(new CustomEvent('teamSyncPending', { detail: { matchArcherId, setNumber } }));
            } catch (_) { }
            throw e;
        });
    }

    function flushTeamQueue(matchId) {
        try {
            const key = `luq:team:${matchId}`;
            const q = JSON.parse(localStorage.getItem(key) || '[]');
            if (!Array.isArray(q) || q.length === 0) return Promise.resolve();
            const tasks = q.map(item => request(`/team-matches/${matchId}/teams/${item.teamId}/archers/${item.matchArcherId}/sets`, 'POST', item.body));
            return Promise.allSettled(tasks).then(results => {
                const remaining = [];
                results.forEach((res, idx) => {
                    if (res.status !== 'fulfilled') remaining.push(q[idx]);
                });
                localStorage.setItem(key, JSON.stringify(remaining));
                if (remaining.length === 0) {
                    console.log('✅ Team match queue flushed successfully');
                } else {
                    console.warn(`⚠️ Team match queue: ${remaining.length} items failed to sync`);
                }
            });
        } catch (_) {
            return Promise.resolve();
        }
    }

    // --- PUBLIC API ---
    const publicApi = {
        setConfig,
        saveConfig,
        ensureRound,
        ensureArcher,
        postEnd,
        flushQueue,
        // Phase 2: Solo match methods
        ensureSoloMatch,
        ensureSoloArcher,
        postSoloSet,
        flushSoloQueue,
        // Phase 2: Team match methods
        ensureTeamMatch,
        ensureTeam,
        ensureTeamArcher,
        postTeamSet,

        // Reconnect / Hydration
        fetchFullRound,
        findActiveRound,

        flushTeamQueue,
        request,
        clearSession: clearPersistedState,  // Expose for debugging/new events
        _state: state,
    };

    init(); // Initialize on script load

    window.LiveUpdates = publicApi;

})(window);
