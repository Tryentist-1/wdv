// Live Updates client (feature-flagged)
// Usage: LiveUpdates.init({ enabled, apiBase, apiKey, corsOrigin })

(function(window) {
    // --- PRIVATE STATE ---
    const state = {
        roundId: null,
        archerIds: {},
        config: {
            apiBase: 'https://tryentist.com/wdv/api/v1',
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
                if (parsed.archerIds) state.archerIds = parsed.archerIds;
                console.log('💾 Restored Live Updates session:', { roundId: state.roundId, archerCount: Object.keys(state.archerIds).length });
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
        Object.assign(state.config, stored || {}, overrides || {});
        // Persist (default enabled=true unless explicitly set)
        try {
            const toStore = Object.assign({}, stored, overrides || {}, { 
                enabled: (overrides && typeof overrides.enabled !== 'undefined') ? !!overrides.enabled : (stored.enabled !== undefined ? stored.enabled : true) 
            });
            localStorage.setItem('live_updates_config', JSON.stringify(toStore));
        } catch (_) {}
    }

    function saveConfig(partial) {
        try {
            const current = JSON.parse(localStorage.getItem('live_updates_config') || '{}');
            const merged = Object.assign({}, current, partial || {});
            localStorage.setItem('live_updates_config', JSON.stringify(merged));
            Object.assign(state.config, merged);
        } catch (_) {}
    }

    async function request(path, method, body, _retried) {
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
        if (state.roundId) return Promise.resolve(state.roundId);
        // PHASE 0: baleNumber removed from rounds table, now lives in round_archers
        return request('/rounds', 'POST', { roundType, date, division, gender, level, eventId })
            .then(json => {
                if (!json || !json.roundId) {
                    throw new Error('Round creation failed: missing roundId');
                }
                state.roundId = json.roundId;
                persistState();  // Save roundId for recovery
                console.log('Round created and linked to event:', eventId);
                return state.roundId;
            });
    }

    function ensureArcher(localId, archer) {
        if (!state.config.enabled) return Promise.resolve(null);
        if (state.archerIds[localId]) {
            console.log(`✅ Archer ${localId} already ensured: ${state.archerIds[localId]}`);
            return Promise.resolve(state.archerIds[localId]);
        }
        console.log(`🔄 Ensuring archer ${localId}:`, { 
            firstName: archer.firstName, 
            lastName: archer.lastName, 
            baleNumber: archer.baleNumber,
            targetAssignment: archer.targetAssignment 
        });
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
                console.log(`✅ Archer ${localId} ${json.updated ? 'updated' : 'created'}: roundArcherId=${json.roundArcherId}, masterId=${json.archerId}`);
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
    function init() {
        const storedConfig = JSON.parse(localStorage.getItem('live_updates_config') || '{}');
        const coachKey = localStorage.getItem('coach_api_key');
        if (coachKey && !storedConfig.apiKey) {
            storedConfig.apiKey = coachKey;
        }
        setConfig(storedConfig);
        loadPersistedState();  // Restore roundId and archerIds from previous session
    }

    // --- PUBLIC API ---
    const publicApi = {
        setConfig,
        saveConfig,
        ensureRound,
        ensureArcher,
        postEnd,
        flushQueue,
        request,
        clearSession: clearPersistedState,  // Expose for debugging/new events
        _state: state,
    };

    init(); // Initialize on script load

    window.LiveUpdates = publicApi;

})(window);
