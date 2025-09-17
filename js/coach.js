(() => {
  const API_BASE = 'https://tryentist.com/wdv/api/v1';
  const STORAGE_KEY = 'coach_api_key';

  function getKey() {
    return localStorage.getItem(STORAGE_KEY) || '';
  }
  function setKey(k) {
    localStorage.setItem(STORAGE_KEY, k || '');
  }

  async function req(path, method = 'GET', body = null) {
    const key = getKey();
    const headers = { 'Content-Type': 'application/json' };
    if (key) headers['X-API-Key'] = key;
    const res = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function loadRounds() {
    const container = document.getElementById('rounds-list');
    container.innerHTML = '<div class="loading">Loading rounds...</div>';
    try {
      const data = await req('/rounds/recent');
      const rows = data.rounds || [];
      let html = '<table class="score-table"><thead><tr><th>Date</th><th>Type</th><th>Bale</th><th>ID</th><th>Actions</th></tr></thead><tbody>';
      rows.forEach(r => {
        html += `<tr><td>${r.date}</td><td>${r.roundType}</td><td>${r.baleNumber}</td><td style="font-size:0.8em;">${r.id}</td><td><button class="btn btn-primary" data-round-id="${r.id}">Open Snapshot</button></td></tr>`;
      });
      html += '</tbody></table>';
      container.innerHTML = html;
      container.querySelectorAll('button[data-round-id]').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.getAttribute('data-round-id');
          const snap = await req(`/rounds/${id}/snapshot`);
          alert(`Round ${snap.round.roundType} Bale ${snap.round.baleNumber} with ${snap.archers.length} archers loaded.`);
        };
      });
    } catch (e) {
      container.innerHTML = `<div class="error">Failed to load rounds: ${e.message}</div>`;
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
    document.getElementById('save-key-btn').onclick = () => { setKey(keyInput.value.trim()); loadRounds(); };
    document.getElementById('new-round-btn').onclick = createRound;
    loadRounds();
  });
})();


