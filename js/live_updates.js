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
        if (!state.config.enabled) return null;
        const headers = { 'Content-Type': 'application/json' };
        let key = state.config.apiKey || localStorage.getItem('coach_api_key') || '';
        if (!key) {
            try {
                key = prompt('Enter coach passcode for Live Updates:', '') || '';
                if (key) {
                    saveConfig({ apiKey: key });
                    localStorage.setItem('coach_api_key', key);
                }
            } catch (_) {}
        }
        if (key) { headers['X-API-Key'] = key; headers['X-Passcode'] = key; }
        const res = await fetch(`${state.config.apiBase}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        if (res.status === 401 && !_retried) {
            // Prompt once and retry
            try {
                const retryKey = prompt('Passcode required for Live Updates:', '') || '';
                if (retryKey) {
                    saveConfig({ apiKey: retryKey });
                    localStorage.setItem('coach_api_key', retryKey);
                    return request(path, method, body, true);
                }
            } catch (_) {}
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (res.status === 204) return null;
        return res.json();
    }

    function ensureRound({ roundType, date, baleNumber }) {
        if (!state.config.enabled) return Promise.resolve(null);
        if (state.roundId) return Promise.resolve(state.roundId);
        return request('/rounds', 'POST', { roundType, date, baleNumber })
            .then(json => {
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
            state.archerIds[localId] = json.roundArcherId;
            return json.roundArcherId;
        });
    }

    function postEnd(localId, endNumber, payload) {
        if (!state.config.enabled) return;
        // The original enqueue and flush logic are removed as per the new_code.
        // The request and event dispatching are kept.
        request(`/rounds/${state.roundId}/archers/${state.archerIds[localId]}/ends`, 'POST', {
            endNumber,
            a1: payload.a1, a2: payload.a2, a3: payload.a3,
            endTotal: payload.endTotal,
            runningTotal: payload.runningTotal,
            tens: payload.tens,
            xs: payload.xs,
            deviceTs: new Date().toISOString(),
        })
        .then(() => {
            try { window.dispatchEvent(new CustomEvent('liveSyncSuccess', { detail: { archerId: localId, endNumber } })); } catch(_) {}
        })
        .catch(e => {
            try { window.dispatchEvent(new CustomEvent('liveSyncPending', { detail: { archerId: localId, endNumber } })); } catch(_) {}
            // The original backoff logic is removed as per the new_code.
            // The error is re-thrown to be handled by the caller if needed.
            throw e;
        });
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
        request,
        _state: state,
    };

    init(); // Initialize on script load

    window.LiveUpdates = publicApi;

})(window);


