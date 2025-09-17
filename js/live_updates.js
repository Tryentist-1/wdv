// Live Updates client (feature-flagged)
// Usage: LiveUpdates.init({ enabled, apiBase, apiKey, corsOrigin })

const LiveUpdates = (() => {
  let config = {
    enabled: false,
    apiBase: 'https://tryentist.com/wdv/api/v1',
    apiKey: '',
  };

  const state = {
    roundId: null,
    archerMap: new Map(), // localId -> roundArcherId
    queue: [],
    flushing: false,
  };

  function setConfig(overrides) {
    Object.assign(config, overrides || {});
  }

  async function request(path, method, body) {
    if (!config.enabled) return null;
    const headers = { 'Content-Type': 'application/json' };
    if (config.apiKey) headers['X-API-Key'] = config.apiKey;
    const res = await fetch(`${config.apiBase}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (res.status === 204) return null;
    return res.json();
  }

  // Basic queue with retry
  function enqueue(fn) {
    state.queue.push(fn);
    flush();
  }

  async function flush() {
    if (state.flushing) return;
    state.flushing = true;
    try {
      while (state.queue.length) {
        const fn = state.queue[0];
        await fn();
        state.queue.shift();
      }
    } catch (e) {
      // backoff
      setTimeout(() => { state.flushing = false; flush(); }, 2000);
      return;
    }
    state.flushing = false;
  }

  function ensureRound({ roundType, date, baleNumber }) {
    if (!config.enabled) return Promise.resolve(null);
    if (state.roundId) return Promise.resolve(state.roundId);
    return request('/rounds', 'POST', { roundType, date, baleNumber })
      .then(json => {
        state.roundId = json.roundId;
        return state.roundId;
      });
  }

  function ensureArcher(localId, archer) {
    if (!config.enabled) return Promise.resolve(null);
    if (state.archerMap.has(localId)) return Promise.resolve(state.archerMap.get(localId));
    return request(`/rounds/${state.roundId}/archers`, 'POST', {
      archerName: `${archer.firstName} ${archer.lastName}`.trim(),
      school: archer.school || '',
      level: archer.level || '',
      gender: archer.gender || '',
      targetAssignment: archer.targetAssignment || '',
    }).then(json => {
      state.archerMap.set(localId, json.roundArcherId);
      return json.roundArcherId;
    });
  }

  function postEnd(localId, endNumber, payload) {
    if (!config.enabled) return;
    enqueue(async () => {
      const raId = state.archerMap.get(localId);
      if (!state.roundId || !raId) throw new Error('Round/Archer not initialized');
      await request(`/rounds/${state.roundId}/archers/${raId}/ends`, 'POST', {
        endNumber,
        a1: payload.a1, a2: payload.a2, a3: payload.a3,
        endTotal: payload.endTotal,
        runningTotal: payload.runningTotal,
        tens: payload.tens,
        xs: payload.xs,
        deviceTs: new Date().toISOString(),
      });
    });
  }

  return { setConfig, ensureRound, ensureArcher, postEnd, _state: state };
})();


