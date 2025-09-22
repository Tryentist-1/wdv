(() => {
  const API_BASE = 'https://tryentist.com/wdv/api/v1';
  const STORAGE_KEY = 'coach_api_key';

  function getKey() {
    return localStorage.getItem(STORAGE_KEY) || '';
  }
  function setKey(k) {
    localStorage.setItem(STORAGE_KEY, k || '');
    try { if (window.LiveUpdates && window.LiveUpdates.saveConfig) LiveUpdates.saveConfig({ apiKey: k }); } catch (_) {}
  }

  async function req(path, method = 'GET', body = null) {
    const keyInput = document.getElementById('api-key-input');
    const key = (keyInput && keyInput.value && keyInput.value.trim()) || getKey();
    const usePasscode = /^\w{4,}$/.test(key) && key.length <= 16; // heuristic: short word-like => passcode
    if (!key) throw new Error('Passcode missing. Enter it above and click Save.');
    const headers = { 'Content-Type': 'application/json' };
    // Send both headers to avoid heuristics issues; server accepts either
    headers['X-Passcode'] = key;
    headers['X-API-Key'] = key;
    const res = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { msg += `: ${await res.text()}`; } catch (_) {}
      throw new Error(msg);
    }
    return res.json();
  }

  async function loadRounds() {
    const container = document.getElementById('rounds-list');
    container.innerHTML = '<div class="loading">Loading rounds...</div>';
    try {
      // Show recent events with a leaderboard link
      const events = await req('/events/recent');
      const rows = events.events || [];
      let html = '<table class="score-table"><thead><tr><th>Date</th><th>Event</th><th>Actions</th></tr></thead><tbody>';
      rows.forEach(ev => {
        html += `<tr><td>${ev.date}</td><td>${ev.name}</td><td><button class="btn btn-primary" data-event-id="${ev.id}">Open Leaderboard</button></td></tr>`;
      });
      html += '</tbody></table>';
      container.innerHTML = html;
      container.querySelectorAll('button[data-event-id]').forEach(btn => {
        btn.onclick = async () => {
          try {
            const evId = btn.getAttribute('data-event-id');
            const snap = await req(`/events/${evId}/snapshot`);
            renderLeaderboard(container, snap);
          } catch (e) {
            alert('Load failed: ' + e.message);
          }
        };
      });
    } catch (e) {
      container.innerHTML = `<div class="error">Failed to load rounds: ${e.message}</div>`;
    }
  }

  function renderLeaderboard(container, snap) {
    // Flatten archers across rounds
    const all = [];
    (snap.rounds || []).forEach(r => {
      (r.archers || []).forEach(a => {
        all.push({
          name: a.archerName,
          gender: (a.gender||'').toUpperCase(),
          level: (a.level||'').toUpperCase(),
          lastEnd: a.lastEnd||0,
          endScore: a.endScore||0,
          runningTotal: a.runningTotal||0,
        });
      });
    });
    // Group by Girls V, Girls JV, Boys V, Boys JV
    const groups = [
      { key: 'GV', title: 'Girls V', filter: x => x.gender==='F' && x.level.startsWith('V') },
      { key: 'GJV', title: 'Girls JV', filter: x => x.gender==='F' && x.level.startsWith('J') },
      { key: 'BV', title: 'Boys V', filter: x => x.gender==='M' && x.level.startsWith('V') },
      { key: 'BJV', title: 'Boys JV', filter: x => x.gender==='M' && x.level.startsWith('J') },
    ];
    let html = '';
    groups.forEach(g => {
      const arr = all.filter(g.filter).sort((a,b)=> b.runningTotal - a.runningTotal);
      html += `<div class="features"><h2>${g.title}</h2>`;
      html += '<table class="score-table"><thead><tr><th>Name</th><th>End</th><th>EndScore</th><th>Running</th></tr></thead><tbody>';
      arr.forEach(p => {
        const short = p.name.replace(/^(\S+)\s+(\S).*$/, '$1 $2.');
        html += `<tr><td>${short}</td><td>${p.lastEnd||''}</td><td>${p.endScore||''}</td><td>${p.runningTotal||0}</td></tr>`;
      });
      html += '</tbody></table></div>';
    });
    container.innerHTML = html;
  }

  async function createEventAndRounds() {
    const date = new Date().toISOString().slice(0, 10);
    const name = prompt('Event name:', `Event ${date}`) || `Event ${date}`;
    try {
      const res = await req('/events', 'POST', { name, date, seedRounds: true });
      alert(`Event created: ${res.eventId}`);
      loadRounds();
    } catch (e) {
      alert('Create event failed: ' + e.message);
    }
  }

  async function createRound() {
    const date = new Date().toISOString().slice(0, 10);
    const type = prompt('Round Type (R300/R360):', 'R300') || 'R300';
    const bale = parseInt(prompt('Bale Number:', '1') || '1', 10);
    try {
      const res = await req('/rounds', 'POST', { roundType: type, date, baleNumber: bale });
      alert(`Round created: ${res.roundId}`);
      loadRounds();
    } catch (e) {
      alert('Create failed: ' + e.message);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const keyInput = document.getElementById('api-key-input');
    keyInput.value = getKey();
    const toggleBtn = document.getElementById('toggle-key-btn');
    toggleBtn.onclick = () => {
      keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
      toggleBtn.textContent = keyInput.type === 'password' ? 'Show' : 'Hide';
    };
    document.getElementById('save-key-btn').onclick = () => { setKey(keyInput.value.trim()); loadRounds(); };
    document.getElementById('new-round-btn').onclick = createEventAndRounds;
    loadRounds();
  });
})();


