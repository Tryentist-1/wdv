// Live Updates client (feature-flagged)
// Usage: LiveUpdates.init({ enabled, apiBase, apiKey, corsOrigin })

(function(window) {
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
        } catch (_) {}
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
        } catch (_) {}
    }

    async function request(path, method, body, _retried) {
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
                                } catch (_) {}
                            }
                        }
                    }
                } catch(_) {}
            }
            if (entryCode) {
                headers['X-Passcode'] = entryCode;
                console.log('[LiveUpdates] Using event entry code for request.');
            } else {
                console.warn('[LiveUpdates] No coach key or entry code available; request may fail.');
            }
        }
        
        const res = await fetch(`${state.config.apiBase}${path}`, {
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
          .then(() => { try { window.dispatchEvent(new CustomEvent('liveSyncSuccess', { detail: { archerId: localId, endNumber } })); } catch(_) {} });
        
        // Basic offline queue: persist if request fails due to network, flush later
        return doRequest().catch(e => {
            const isNetwork = (e && (e.name === 'TypeError' || /NetworkError|Failed to fetch/i.test(String(e))));
            if (isNetwork) {
                try {
                    const key = `luq:${state.roundId}`;
                    const q = JSON.parse(localStorage.getItem(key) || '[]');
                    q.push({ archerId: localId, endNumber, body: reqBody });
                    localStorage.setItem(key, JSON.stringify(q));
                    try { window.dispatchEvent(new CustomEvent('liveSyncPending', { detail: { archerId: localId, endNumber } })); } catch(_) {}
                    return; // resolve quietly; will be retried later
                } catch(_) {}
            }
            try { window.dispatchEvent(new CustomEvent('liveSyncPending', { detail: { archerId: localId, endNumber } })); } catch(_) {}
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
        } catch(_) { return Promise.resolve(); }
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
    
    function ensureSoloMatch({ date, location, eventId, maxSets = 5 }) {
        if (!state.config.enabled) return Promise.resolve(null);
        
        // Check if we have a cached matchId for the same event
        const matchKey = `solo_match:${eventId || 'standalone'}:${date}`;
        const cached = localStorage.getItem(matchKey);
        if (cached) {
            try {
                const cachedData = JSON.parse(cached);
                if (cachedData.matchId && cachedData.eventId === eventId) {
                    console.log('✅ Reusing existing solo match:', cachedData.matchId);
                    state.soloMatchId = cachedData.matchId;
                    state.soloEventId = eventId;
                    return Promise.resolve(cachedData.matchId);
                }
            } catch (e) {
                console.warn('Failed to parse cached solo match:', e);
            }
        }
        
        return request('/solo-matches', 'POST', { date, location, eventId, maxSets })
            .then(json => {
                if (!json || !json.matchId) {
                    throw new Error('Solo match creation failed: missing matchId');
                }
                state.soloMatchId = json.matchId;
                state.soloEventId = eventId;
                // Cache matchId
                localStorage.setItem(matchKey, JSON.stringify({ matchId: json.matchId, eventId, date }));
                console.log('Solo match created:', json.matchId);
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
                } catch (_) {}
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
                    } catch (_) {}
                    return; // resolve quietly; will be retried later
                } catch (_) {}
            }
            try {
                window.dispatchEvent(new CustomEvent('soloSyncPending', { detail: { matchArcherId, setNumber } }));
            } catch (_) {}
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
        request,
        clearSession: clearPersistedState,  // Expose for debugging/new events
        _state: state,
    };

    init(); // Initialize on script load

    window.LiveUpdates = publicApi;

})(window);
