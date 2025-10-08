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
      let html = '<table class="score-table"><thead><tr><th>Date</th><th>Event</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
      rows.forEach(ev => {
        html += `<tr><td>${ev.date}</td><td>${ev.name}</td><td>${ev.status || 'Upcoming'}</td><td><button class="btn btn-primary" data-event-id="${ev.id}">Open Leaderboard</button> <button class="btn btn-danger" data-delete-event="${ev.id}" style="margin-left: 0.5rem;">Delete</button></td></tr>`;
      });
      html += '</tbody></table>';
      console.log('Events HTML:', html);
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
      
      container.querySelectorAll('button[data-delete-event]').forEach(btn => {
        btn.onclick = async () => {
          if (confirm('Are you sure you want to delete this event? This cannot be undone.')) {
            try {
              const evId = btn.getAttribute('data-delete-event');
              await req(`/events/${evId}`, 'DELETE');
              loadRounds(); // Refresh the list
            } catch (e) {
              alert('Delete failed: ' + e.message);
            }
          }
        };
      });
    } catch (e) {
      container.innerHTML = `<div class="error">Failed to load rounds: ${e.message}</div>`;
    }
  }

  function renderLeaderboard(container, snap) {
    let html = '<div class="features">';
    html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">';
    html += `<h2>${snap.event?.name || 'Event'} - Live Leaderboard</h2>`;
    html += '<button id="back-to-events-btn" class="btn btn-secondary">← Back to Events</button>';
    html += '</div>';
    
    // Division tabs/cards
    const divisions = snap.divisions || {};
    const divisionOrder = ['BVAR', 'GVAR', 'BJV', 'GJV'];
    const divisionNames = {
      'BVAR': 'Boys Varsity',
      'GVAR': 'Girls Varsity',
      'BJV': 'Boys JV',
      'GJV': 'Girls JV'
    };
    
    divisionOrder.forEach(divCode => {
      const div = divisions[divCode];
      if (!div || !div.archers || div.archers.length === 0) return;
      
      // Sort archers by running total (descending)
      const sortedArchers = [...div.archers].sort((a, b) => b.runningTotal - a.runningTotal);
      
      html += `<div class="features" style="margin-top: 1.5rem;">`;
      html += `<h2>${divisionNames[divCode]} (${sortedArchers.length})</h2>`;
      html += '<div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">';
      html += '<table class="score-table" style="min-width: 100%;"><thead><tr>';
      html += '<th style="width: 40px;">Rank</th><th style="min-width: 100px;">Name</th><th style="width: 50px;">Scho</th><th style="width: 45px;">Bale</th><th style="width: 50px;">End</th><th style="width: 55px;">Total</th><th style="width: 50px;">Avg</th><th style="width: 35px;">Xs</th><th style="width: 40px;">10s</th><th style="width: 75px;">Status</th>';
      html += '</tr></thead><tbody>';
      
      sortedArchers.forEach((archer, idx) => {
        const statusClass = archer.completed ? 'status-synced' : (archer.runningTotal > 0 ? 'status-active' : 'status-pending');
        const statusText = archer.completed ? '✓' : (archer.runningTotal > 0 ? '●' : '○');
        const statusTitle = archer.completed ? 'Complete' : (archer.runningTotal > 0 ? 'Active' : 'Ready');
        
        html += '<tr>';
        html += `<td>${idx + 1}</td>`;
        html += `<td style="text-align: left; padding-left: 8px;">${archer.archerName}</td>`;
        html += `<td>${archer.school || 'N/A'}</td>`;
        html += `<td>${archer.bale || '-'}</td>`;
        html += `<td>${archer.endsCompleted}/10</td>`;
        html += `<td><strong>${archer.runningTotal}</strong></td>`;
        html += `<td>${archer.avgPerArrow.toFixed(2)}</td>`;
        html += `<td>${archer.xs || 0}</td>`;
        html += `<td>${archer.tens || 0}</td>`;
        html += `<td><span class="status-badge ${statusClass}" title="${statusTitle}">${statusText}</span></td>`;
        html += '</tr>';
      });
      
      html += '</div>';
    });
    
    container.innerHTML = html;
    
    // Add back button handler
    const backBtn = container.querySelector('#back-to-events-btn');
    if (backBtn) {
      backBtn.onclick = () => loadRounds();
    }
  }

  async function createEventAndRounds() {
    const date = new Date().toISOString().slice(0, 10);
    const name = prompt('Event name:', `Event ${date}`) || `Event ${date}`;
    const entryCode = prompt('Entry code (for archers to access via QR code):', '');
    const eventType = confirm('Auto-assign archers to bales?\n\nOK = Auto-assign (recommended)\nCancel = Self-select at bales') ? 'auto_assign' : 'self_select';
    const status = 'Planned'; // Events start as Planned by default
    
    try {
      const res = await req('/events', 'POST', { 
        name, 
        date, 
        entryCode,
        status,
        eventType,
        autoAssignBales: eventType === 'auto_assign',
        roundType: 'R300'
      });
      
      let message = `Event created: ${res.eventId}\n\n`;
      if (res.rounds && res.rounds.length > 0) {
        message += 'Division Rounds:\n';
        res.rounds.forEach(r => {
          message += `- ${r.division}: ${r.archerCount} archers on ${r.bales} bale(s)\n`;
        });
        message += `\nTotal Bales: ${res.totalBales}`;
      }
      
      alert(message);
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
    const csvInput = document.getElementById('csv-input');
    csvInput.onchange = async () => {
      const file = csvInput.files && csvInput.files[0];
      if (!file) return;
      const key = (keyInput && keyInput.value && keyInput.value.trim()) || getKey();
      const fd = new FormData();
      fd.append('file', file, 'listimport-01.csv');
      try {
        const res = await fetch(`${API_BASE}/upload_csv`, { method: 'POST', headers: { 'X-Passcode': key, 'X-API-Key': key }, body: fd });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        alert('CSV uploaded. Tap Refresh on Ranking to load.');
      } catch (e) {
        alert('Upload failed: ' + e.message);
      } finally {
        csvInput.value = '';
      }
    };
    loadRounds();
  });
})();


