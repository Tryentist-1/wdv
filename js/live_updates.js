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
            enabled: false,
        },
        retryQueue: [],
        isProcessing: false,
    };

    // --- CORE FUNCTIONS ---
    function setConfig(overrides) {
        const stored = JSON.parse(localStorage.getItem('live_updates_config') || '{}');
        Object.assign(state.config, stored || {}, overrides || {});
        // Persist (without enabling unless explicitly requested)
        try {
            const toStore = Object.assign({}, stored, overrides || {}, { enabled: (overrides && typeof overrides.enabled!== 'undefined') ? !!overrides.enabled : (stored.enabled || false) });
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
        if (key) { headers['X-API-Key'] = key; headers['X-Passcode'] = key; }
        
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

    function ensureRound({ roundType, date, baleNumber }) {
        if (!state.config.enabled) return Promise.resolve(null);
        if (state.roundId) return Promise.resolve(state.roundId);
        return request('/rounds', 'POST', { roundType, date, baleNumber })
            .then(json => {
                if (!json || !json.roundId) {
                    throw new Error('Round creation failed: missing roundId');
                }
                state.roundId = json.roundId;
                return state.roundId;
            });
    }

    function ensureArcher(localId, archer) {
        if (!state.config.enabled) return Promise.resolve(null);
        if (state.archerIds[localId]) return Promise.resolve(state.archerIds[localId]);
        return request(`/rounds/${state.roundId}/archers`, 'POST', {
            archerName: `${archer.firstName} ${archer.lastName}`.trim(),
            school: archer.school || '',
            level: archer.level || '',
            gender: archer.gender || '',
            targetAssignment: archer.targetAssignment || '',
        }).then(json => {
            if (!json || !json.roundArcherId) {
                throw new Error('Archer ensure failed: missing roundArcherId');
            }
            state.archerIds[localId] = json.roundArcherId;
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
        _state: state,
    };

    init(); // Initialize on script load

    window.LiveUpdates = publicApi;

})(window);


