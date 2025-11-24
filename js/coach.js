/**
 * Coach Console - Redesigned Interface
 * Features: Authentication, Event Management, Archer Management, Results
 */

(() => {
  // Use local API when running on localhost, otherwise use production
  const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `${window.location.protocol}//${window.location.hostname}:${window.location.port || 8001}/api/index.php/v1`
    : 'https://tryentist.com/wdv/api/v1';
  const COACH_COOKIE_NAME = 'coach_auth';
  const COACH_PASSCODE = 'wdva26'; // The actual passcode
  const COOKIE_DAYS = 90;

  // State
  let currentEventId = null;
  let selectedArchers = [];
  let allArchers = [];
  let verifyState = null;
  let archerSelector = null; // ArcherSelector component instance
  
  // PHASE 0: Division rounds workflow
  let pendingDivisions = []; // Divisions to configure after event creation
  let currentDivision = null; // Current division being configured
  let divisionRounds = {}; // Map of division -> roundId

  function persistCoachCredentials() {
    try {
      localStorage.setItem('coach_api_key', COACH_PASSCODE);
      localStorage.setItem('coach_passcode', COACH_PASSCODE);
      if (window.LiveUpdates && typeof window.LiveUpdates.saveConfig === 'function') {
        window.LiveUpdates.saveConfig({ apiKey: COACH_PASSCODE, enabled: true });
      }
    } catch (err) {
      console.warn('Failed to persist coach credentials to localStorage', err);
    }
  }

  // ==================== Cookie Management ====================
  
  function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  }

  function getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
  }

  // ==================== Authentication ====================
  
  function checkAuthentication() {
    const auth = getCookie(COACH_COOKIE_NAME);
    if (auth === 'true') {
      persistCoachCredentials();
      return true;
    }
    showAuthModal();
    return false;
  }

  function showAuthModal() {
    const modal = document.getElementById('coach-auth-modal');
    modal.style.display = 'flex';
    
    const input = document.getElementById('coach-passcode-input');
    const errorDiv = document.getElementById('auth-error');
    const submitBtn = document.getElementById('auth-submit-btn');
    const cancelBtn = document.getElementById('auth-cancel-btn');

    input.focus();
    
    // Handle submit
    const handleSubmit = () => {
      const passcode = input.value.trim();
      if (passcode === COACH_PASSCODE) {
        // Correct passcode
        setCookie(COACH_COOKIE_NAME, 'true', COOKIE_DAYS);
        persistCoachCredentials();
        modal.style.display = 'none';
        init(); // Initialize the coach console
      } else {
        // Incorrect passcode
        errorDiv.style.display = 'block';
        input.value = '';
        input.focus();
      }
    };

    submitBtn.onclick = handleSubmit;
    input.onkeypress = (e) => {
      if (e.key === 'Enter') handleSubmit();
    };

    cancelBtn.onclick = () => {
      window.location.href = 'index.html';
    };
  }

  // ==================== API Functions ====================
  
  async function req(path, method = 'GET', body = null) {
    const headers = {
      'Content-Type': 'application/json',
      'X-Passcode': COACH_PASSCODE,
      'X-API-Key': COACH_PASSCODE
    };

    // Debug logging for auth
    if (method === 'PATCH') {
      console.log('[Coach Auth Debug] PATCH request to:', path);
      console.log('[Coach Auth Debug] Headers:', { 
        'X-Passcode': headers['X-Passcode'],
        'X-API-Key': headers['X-API-Key']
      });
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[Coach API Error]', method, path, 'Status:', res.status, 'Response:', text);
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    return res.json();
  }

  // ==================== Event Management ====================
  
  async function loadEvents() {
    const container = document.getElementById('events-list');
    container.innerHTML = '<div class="loading">Loading events...</div>';

    try {
      const data = await req('/events/recent');
      const events = data.events || [];

      if (events.length === 0) {
        container.innerHTML = '<p style="padding: 2rem; text-align: center; color: #7f8c8d;">No events yet. Click "Create Event" to get started.</p>';
        return;
      }

      let html = `
        <table class="w-full border-collapse bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
          <thead class="bg-gray-700 dark:bg-gray-600 text-white">
            <tr>
              <th class="px-4 py-3 text-left font-semibold">Event</th>
              <th class="px-4 py-3 text-left font-semibold">Date</th>
              <th class="px-4 py-3 text-left font-semibold">Status</th>
              <th class="px-4 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="text-gray-700 dark:text-gray-300">
      `;

      events.forEach(ev => {
        const eventData = encodeURIComponent(JSON.stringify(ev));
        // Format date without year: "Oct 15" instead of "2024-10-15"
        const dateObj = new Date(ev.date + 'T00:00:00');
        const shortDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Truncate event name on mobile
        const maxNameLength = 20;
        const displayName = ev.name.length > maxNameLength ? ev.name.substring(0, maxNameLength) + '...' : ev.name;
        
        const statusColors = {
          'active': 'bg-success text-white',
          'planned': 'bg-gray-400 dark:bg-gray-500 text-white',
          'completed': 'bg-gray-600 dark:bg-gray-700 text-white'
        };
        const statusClass = statusColors[ev.status.toLowerCase()] || 'bg-gray-400 text-white';
        
        html += `
          <tr class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <td class="px-4 py-3 font-semibold">${displayName}</td>
            <td class="px-4 py-3 whitespace-nowrap">${shortDate}</td>
            <td class="px-4 py-3"><span class="px-2 py-1 rounded text-xs font-semibold ${statusClass}">${ev.status}</span></td>
            <td class="px-4 py-3 whitespace-nowrap">
              <button class="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm transition-colors" onclick="coach.showQRCode('${eventData}')" title="QR Code">QR</button>
              <button class="px-3 py-1 bg-primary hover:bg-primary-dark text-white rounded text-sm transition-colors" onclick="coach.viewResults('${ev.id}')" title="View Results">📊 Results</button>
              <button class="px-3 py-1 bg-primary hover:bg-primary-dark text-white rounded text-sm transition-colors" onclick="coach.verifyEvent('${eventData}')" title="Verify Scorecards">🛡️ Validate</button>
              <button class="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm transition-colors" onclick="coach.editEvent('${eventData}')" title="Edit Event">✏️ Edit</button>
            </td>
          </tr>
        `;
      });

      html += '</tbody></table>';
      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<p class="error">Error loading events: ${err.message}</p>`;
    }
  }

  // ==================== Bale Management ====================

  async function manageBales(eventId, eventName) {
    try {
      // Fetch event snapshot to build UI (divisions and round_archers)
      const snap = await req(`/events/${eventId}/snapshot`, 'GET');
      const dlg = document.createElement('div');
      dlg.className = 'fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center overflow-y-auto';
      dlg.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-8 rounded-xl max-w-4xl w-11/12 max-h-[90vh] overflow-y-auto shadow-2xl my-8">
          <h2 class="text-2xl font-bold text-gray-800 dark:text-white mb-6">Manage Bales — ${eventName}</h2>
          <div id="bale-mgr-body" class="max-h-[60vh] overflow-auto"></div>
          <div class="flex gap-2 mt-6">
            <button id="bale-mgr-close" class="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors min-h-[44px]">Close</button>
          </div>
        </div>`;
      document.body.appendChild(dlg);

      const body = dlg.querySelector('#bale-mgr-body');
      const render = () => {
        body.innerHTML = '';
        const divisions = snap.divisions || {};
        Object.keys(divisions).forEach(divCode => {
          const div = divisions[divCode];
          const section = document.createElement('div');
          section.className = 'mb-6';
          section.innerHTML = `<h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-3">${divCode}</h3>`;
          const tbl = document.createElement('table');
          tbl.className = 'w-full border-collapse bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden';
          tbl.innerHTML = `<thead class="bg-gray-700 dark:bg-gray-600 text-white"><tr><th class="px-3 py-2 text-left text-sm">Archer</th><th class="px-3 py-2 text-left text-sm">School</th><th class="px-3 py-2 text-left text-sm">Bale</th><th class="px-3 py-2 text-left text-sm">Target</th><th class="px-3 py-2 text-left text-sm">Actions</th></tr></thead>`;
          const tb = document.createElement('tbody');
          tb.className = 'text-gray-700 dark:text-gray-300';

          // Add Archer row (from master list)
          const addRow = document.createElement('tr');
          addRow.className = 'border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700';
          addRow.innerHTML = `
            <td colspan="5" class="px-3 py-3">
              <div class="flex gap-2 items-center flex-wrap">
                <select class="flex-1 min-w-[220px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" data-role="add-archer-select">
                  <option value="">Select Archer (master list)</option>
                </select>
                <input type="number" placeholder="Bale #" data-role="add-bale" class="w-[90px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                <input type="text" placeholder="Target (A-H)" maxlength="1" data-role="add-target" class="w-[90px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                <button class="px-3 py-2 bg-primary hover:bg-primary-dark text-white rounded transition-colors" data-role="add-confirm">Add</button>
              </div>
            </td>`;
          tb.appendChild(addRow);

          // Populate master list filtered by division
          (async () => {
            try {
              const list = await req(`/archers?division=${divCode}`);
              const select = addRow.querySelector('[data-role="add-archer-select"]');
              (list.archers||[]).forEach(a => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify(a);
                opt.textContent = `${a.lastName}, ${a.firstName} (${a.school})`;
                select.appendChild(opt);
              });
            } catch(_) {}
          })();

          addRow.querySelector('[data-role="add-confirm"]').onclick = async () => {
            const select = addRow.querySelector('[data-role="add-archer-select"]');
            const baleInp = addRow.querySelector('[data-role="add-bale"]');
            const tgtInp = addRow.querySelector('[data-role="add-target"]');
            if (!select.value) { alert('Select an archer'); return; }
            const ar = JSON.parse(select.value);
            const archerName = `${ar.firstName} ${ar.lastName}`.trim();
            const baleNumber = parseInt(baleInp.value,10);
            const targetAssignment = (tgtInp.value||'').toUpperCase().substring(0,1);
            if (!baleNumber || !targetAssignment) { alert('Enter Bale and Target'); return; }
            try {
              const targetSize = (ar.level === 'VAR') ? 122 : 80;
              await req(`/rounds/${div.roundId}/archers`, 'POST', {
                archerName,
                school: ar.school,
                level: ar.level,
                gender: ar.gender,
                targetAssignment,
                targetSize,
                baleNumber
              });
              div.archers = div.archers || [];
              div.archers.push({
                roundArcherId: 'temp_'+Math.random().toString(36).slice(2),
                archerName,
                school: ar.school,
                gender: ar.gender,
                level: ar.level,
                target: targetAssignment,
                bale: baleNumber
              });
              baleInp.value = '';
              tgtInp.value = '';
              select.value = '';
              render();
            } catch(e) { alert('Add failed: '+e.message); }
          };
          (div.archers||[]).forEach(a => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors';
            tr.innerHTML = `
              <td class="px-3 py-2">${a.archerName}</td>
              <td class="px-3 py-2">${a.school||''}</td>
              <td class="px-3 py-2"><input type="number" min="1" value="${a.bale||''}" class="w-[70px] px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></td>
              <td class="px-3 py-2"><input type="text" value="${a.target||''}" class="w-[70px] px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" maxlength="1" /></td>
              <td class="px-3 py-2">
                <button class="px-2 py-1 bg-primary hover:bg-primary-dark text-white rounded text-sm transition-colors mr-1" data-act="save">Save</button>
                <button class="px-2 py-1 bg-danger hover:bg-red-700 text-white rounded text-sm transition-colors" data-act="remove">Remove</button>
              </td>`;
            const [baleInp, tgtInp] = tr.querySelectorAll('input');
            tr.querySelector('[data-act="save"]').onclick = async () => {
              try {
                await req(`/rounds/${div.roundId}/archers/${a.roundArcherId}`, 'PATCH', {
                  baleNumber: parseInt(baleInp.value,10)||null,
                  targetAssignment: (tgtInp.value||'').toUpperCase().substring(0,1)
                });
                a.bale = parseInt(baleInp.value,10)||a.bale;
                a.target = (tgtInp.value||'').toUpperCase().substring(0,1);
                alert('Saved');
              } catch(e) { alert('Save failed: '+e.message); }
            };
            tr.querySelector('[data-act="remove"]').onclick = async () => {
              if (!confirm('Remove this archer from the round?')) return;
              try {
                await req(`/rounds/${div.roundId}/archers/${a.roundArcherId}`, 'DELETE');
                // remove from local snapshot and re-render
                div.archers = (div.archers||[]).filter(x => x.roundArcherId !== a.roundArcherId);
                render();
              } catch(e) { alert('Remove failed: '+e.message); }
            };
            tb.appendChild(tr);
          });
          tbl.appendChild(tb);
          section.appendChild(tbl);
          body.appendChild(section);
        });
      };
      render();

      dlg.style.display = 'flex';
      dlg.querySelector('#bale-mgr-close').onclick = () => { dlg.remove(); };
    } catch (e) {
      alert('Error loading event snapshot: ' + e.message);
    }
  }

  function showCreateEventModal() {
    const modal = document.getElementById('create-event-modal');
    const nameInput = document.getElementById('event-name');
    const dateInput = document.getElementById('event-date');
    const statusSelect = document.getElementById('event-status');
    const codeInput = document.getElementById('event-code');

    // Set defaults
    nameInput.value = '';
    dateInput.value = new Date().toISOString().split('T')[0];
    statusSelect.value = 'Planned';
    codeInput.value = '';

    modal.style.display = 'flex';
    nameInput.focus();

    document.getElementById('cancel-event-btn').onclick = () => {
      modal.style.display = 'none';
    };

    document.getElementById('submit-event-btn').onclick = async () => {
      const name = nameInput.value.trim();
      const date = dateInput.value;
      const status = statusSelect.value;
      const entryCode = codeInput.value.trim();

      if (!name) {
        alert('Please enter an event name');
        return;
      }

      // PHASE 0: Get selected divisions
      const divisions = [];
      ['open', 'bvar', 'gvar', 'bjv', 'gjv'].forEach(div => {
        const checkbox = document.getElementById(`division-${div}`);
        if (checkbox && checkbox.checked) {
          divisions.push(div.toUpperCase());
        }
      });

      if (divisions.length === 0) {
        alert('Please select at least one division round');
        return;
      }

      try {
        const btn = document.getElementById('submit-event-btn');
        btn.disabled = true;
        btn.textContent = 'Creating...';

        // Step 1: Create event
        const result = await req('/events', 'POST', {
          name,
          date,
          status,
          entryCode,
          eventType: 'manual',
          autoAssignBales: false
        });

        const eventId = result.eventId;
        currentEventId = eventId;

        // Step 2: Create division rounds
        const roundsResult = await req(`/events/${eventId}/rounds`, 'POST', {
          divisions,
          roundType: 'R300'
        });

        // Store round IDs by division
        divisionRounds = {};
        roundsResult.created.forEach(r => {
          divisionRounds[r.division] = r.roundId;
        });

        modal.style.display = 'none';

        // Step 3: Configure archers for each division
        pendingDivisions = [...divisions];
        processNextDivision(name);

      } catch (err) {
        alert(`Error creating event: ${err.message}`);
      } finally {
        const btn = document.getElementById('submit-event-btn');
        btn.disabled = false;
        btn.textContent = 'Create Event';
      }
    };
  }

  async function deleteEvent(eventId, eventName) {
    if (!confirm(`Are you sure you want to delete "${eventName}"?\n\nThis will delete all rounds and scores for this event.`)) {
      return;
    }

    try {
      await req(`/events/${eventId}`, 'DELETE');
      alert(`Event "${eventName}" deleted successfully.`);
      loadEvents();
    } catch (err) {
      alert(`Error deleting event: ${err.message}`);
    }
  }

  function viewResults(eventId) {
    window.location.href = `results.html?event=${eventId}`;
  }

  // ==================== Verification Workflow ====================

  async function loadVerifySnapshot() {
    const snap = await req(`/events/${verifyState.eventId}/snapshot`, 'GET');
    verifyState.snapshot = snap;
  }

  function getDivisionCodes() {
    const divisions = verifyState.snapshot?.divisions || {};
    return Object.keys(divisions);
  }

  function getBalesForDivision(divCode) {
    const division = verifyState.snapshot?.divisions?.[divCode];
    if (!division) return [];
    const bales = new Set();
    (division.archers || []).forEach(archer => {
      if (archer.bale && Number(archer.bale) > 0) {
        bales.add(Number(archer.bale));
      }
    });
    return Array.from(bales).sort((a, b) => a - b);
  }

  function populateVerifySelectors() {
    const divisionSelect = document.getElementById('verify-division-select');
    const baleSelect = document.getElementById('verify-bale-select');

    const divisions = getDivisionCodes();
    divisionSelect.innerHTML = '';
    if (divisions.length === 0) {
      divisionSelect.innerHTML = '<option value="">No divisions</option>';
      baleSelect.innerHTML = '<option value="">No bales</option>';
      verifyState.division = null;
      verifyState.bale = null;
      return;
    }

    if (!verifyState.division || !divisions.includes(verifyState.division)) {
      verifyState.division = divisions[0];
    }

    divisions.forEach(code => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = code;
      if (code === verifyState.division) opt.selected = true;
      divisionSelect.appendChild(opt);
    });

    const bales = getBalesForDivision(verifyState.division);
    baleSelect.innerHTML = '';
    if (bales.length === 0) {
      baleSelect.innerHTML = '<option value="">No bales</option>';
      verifyState.bale = null;
    } else {
      if (!verifyState.bale || !bales.includes(Number(verifyState.bale))) {
        verifyState.bale = bales[0];
      }
      bales.forEach(num => {
        const opt = document.createElement('option');
        opt.value = num;
        opt.textContent = `Bale ${num}`;
        if (Number(verifyState.bale) === num) opt.selected = true;
        baleSelect.appendChild(opt);
      });
    }
  }

  function formatStatusBadge(status) {
    const normalized = (status || 'PENDING').toUpperCase();
    let color = '#f1c40f';
    if (normalized === 'VER') color = '#2ecc71';
    if (normalized === 'VOID') color = '#e74c3c';
    return `<span class="status-badge" style="background:${color};color:#fff;">${normalized}</span>`;
  }

  function formatTimestamp(ts) {
    if (!ts) return '—';
    try {
      const d = new Date(ts.replace(' ', 'T'));
      if (Number.isNaN(d.getTime())) return ts;
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch (_) {
      return ts;
    }
  }

  function renderVerifyTable() {
    const container = document.getElementById('verify-table-container');
    if (!verifyState || !verifyState.snapshot) {
      container.innerHTML = '<p style="padding:1rem;color:#7f8c8d;">No data loaded.</p>';
      return;
    }
    if (!verifyState.division) {
      container.innerHTML = '<p style="padding:1rem;color:#7f8c8d;">Select a division to begin verification.</p>';
      return;
    }
    const division = verifyState.snapshot.divisions?.[verifyState.division];
    if (!division) {
      container.innerHTML = '<p style="padding:1rem;color:#e74c3c;">Division not found.</p>';
      return;
    }
    const roundId = division.roundId;
    if (!roundId) {
      container.innerHTML = '<p style="padding:1rem;color:#e74c3c;">Round ID missing for this division.</p>';
      return;
    }

    const baleNumber = verifyState.bale != null ? Number(verifyState.bale) : null;
    const archers = (division.archers || []).filter(a => {
        if (baleNumber === null) return true;
        return Number(a.bale) === baleNumber;
    });

    if (archers.length === 0) {
      container.innerHTML = '<p style="padding:1rem;color:#7f8c8d;">No archers assigned to this bale yet.</p>';
      return;
    }

    const statusOrder = { 'PENDING': 0, 'VER': 1, 'VOID': 2 };
    archers.sort((a, b) => {
      const statusA = (a.cardStatus || 'PENDING').toUpperCase();
      const statusB = (b.cardStatus || 'PENDING').toUpperCase();
      if (statusOrder[statusA] !== statusOrder[statusB]) {
        return statusOrder[statusA] - statusOrder[statusB];
      }
      return (a.target || '').localeCompare(b.target || '');
    });

    let html = `
      <table class="score-table">
        <thead>
          <tr>
            <th>Archer</th>
            <th>Ends</th>
            <th>Total</th>
            <th>Last Sync</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
    `;

    archers.forEach(a => {
      const status = (a.cardStatus || 'PENDING').toUpperCase();
      const locked = !!a.locked;
      let actions = '';
      if (status === 'VER' && locked) {
        actions = `<button class="btn btn-secondary btn-sm" data-action="unlock" data-round-archer-id="${a.roundArcherId}">Unlock</button>`;
      } else if (status === 'VOID') {
        actions = `<button class="btn btn-secondary btn-sm" data-action="unlock" data-round-archer-id="${a.roundArcherId}">Reopen</button>`;
      } else {
        actions = `
          <button class="btn btn-primary btn-sm" data-action="lock" data-round-archer-id="${a.roundArcherId}">Validate</button>
          <button class="btn btn-danger btn-sm" data-action="void" data-round-archer-id="${a.roundArcherId}">Void</button>
        `;
      }

      html += `
        <tr>
          <td>
            <strong>${a.archerName || `${a.firstName || ''} ${a.lastName || ''}`}</strong><br>
            <span style="font-size:0.75rem;color:#7f8c8d;">Target ${a.target || '—'} • Bale ${a.bale || '—'}</span>
          </td>
          <td>${a.endsCompleted || 0}</td>
          <td>${a.runningTotal || 0}</td>
          <td>${formatTimestamp(a.lastSyncTime)}</td>
          <td>${formatStatusBadge(status)}</td>
          <td style="white-space:nowrap;display:flex;gap:0.25rem;flex-wrap:wrap;">
            ${actions}
          </td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.onclick = async (e) => {
        const action = e.currentTarget.dataset.action;
        const roundArcherId = e.currentTarget.dataset.roundArcherId;
        if (!roundArcherId) return;

        if (action === 'void') {
          const confirmVoid = confirm('Mark this scorecard as VOID? This hides it from leaderboards until reopened.');
          if (!confirmVoid) return;
        }
        if (action === 'unlock') {
          const confirmUnlock = confirm('Unlock this scorecard for edits? Verification status will reset.');
          if (!confirmUnlock) return;
        }

        try {
          const { verifiedBy, notes } = getVerifyInputs();
          if (!verifiedBy && action !== 'unlock') {
            alert('Enter who is verifying the scorecard before proceeding.');
            return;
          }
          await req(`/round_archers/${roundArcherId}/verification`, 'POST', {
            action,
            verifiedBy,
            notes
          });
          await loadVerifySnapshot();
          populateVerifySelectors();
          renderVerifyTable();
        } catch (err) {
          alert(`Verification error: ${err.message}`);
        }
      };
    });
  }

  function getVerifyInputs() {
    const verifiedBy = document.getElementById('verify-actor-input').value.trim();
    const notes = document.getElementById('verify-notes-input').value.trim();
    return { verifiedBy, notes };
  }

  async function handleLockAllForBale() {
    if (!verifyState?.division || !verifyState?.bale) {
      alert('Select a division and bale before locking.');
      return;
    }
    const { verifiedBy, notes } = getVerifyInputs();
    if (!verifiedBy) {
      alert('Enter who is verifying before locking all.');
      return;
    }
    const division = verifyState.snapshot.divisions?.[verifyState.division];
    if (!division?.roundId) {
      alert('Round ID missing for this division.');
      return;
    }
    try {
      const result = await req(`/rounds/${division.roundId}/verification/bale`, 'POST', {
        baleNumber: Number(verifyState.bale),
        verifiedBy,
        notes
      });
      alert(`Locked ${result.lockedCount} scorecards on Bale ${verifyState.bale}.`);
      await loadVerifySnapshot();
      populateVerifySelectors();
      renderVerifyTable();
    } catch (err) {
      alert(`Lock All failed: ${err.message}`);
    }
  }

  async function handleVerifyAndCloseRound() {
    if (!verifyState?.division) {
      alert('Select a division first.');
      return;
    }
    const { verifiedBy, notes } = getVerifyInputs();
    if (!verifiedBy) {
      alert('Enter who is verifying before closing the round.');
      return;
    }
    const division = verifyState.snapshot.divisions?.[verifyState.division];
    if (!division?.roundId) {
      alert('Round ID missing for this division.');
      return;
    }
    const confirmClose = confirm('Verify and close this round? Incomplete scorecards will be marked VOID.');
    if (!confirmClose) return;
    try {
      const result = await req(`/rounds/${division.roundId}/verification/close`, 'POST', {
        verifiedBy,
        notes
      });
      alert(`Round status: ${result.status}. Verified: ${result.verifiedCards}, Voided: ${result.voidedCards}.`);
      await loadVerifySnapshot();
      populateVerifySelectors();
      renderVerifyTable();
    } catch (err) {
      alert(`Close Round failed: ${err.message}`);
    }
  }

  async function verifyEvent(encodedEventData) {
    const event = JSON.parse(decodeURIComponent(encodedEventData));
    verifyState = {
      eventId: event.id,
      eventName: event.name,
      division: null,
      bale: null,
      snapshot: null
    };
    const modal = document.getElementById('verify-modal');
    document.getElementById('verify-modal-title').textContent = `Verify Scorecards — ${event.name}`;
    document.getElementById('verify-actor-input').value = '';
    document.getElementById('verify-notes-input').value = '';

    try {
      await loadVerifySnapshot();
      populateVerifySelectors();
      renderVerifyTable();
      modal.style.display = 'flex';
    } catch (err) {
      alert(`Unable to load verification data: ${err.message}`);
    }

    const divisionSelect = document.getElementById('verify-division-select');
    const baleSelect = document.getElementById('verify-bale-select');
    const refreshBtn = document.getElementById('verify-refresh-btn');
    const closeBtn = document.getElementById('verify-modal-close-btn');
    const lockAllBtn = document.getElementById('verify-lock-all-btn');
    const closeRoundBtn = document.getElementById('verify-close-round-btn');

    divisionSelect.onchange = () => {
      verifyState.division = divisionSelect.value;
      const bales = getBalesForDivision(verifyState.division);
      if (bales.length > 0) {
        verifyState.bale = bales.includes(Number(verifyState.bale)) ? verifyState.bale : bales[0];
      } else {
        verifyState.bale = null;
      }
      populateVerifySelectors();
      renderVerifyTable();
    };

    baleSelect.onchange = () => {
      verifyState.bale = baleSelect.value ? Number(baleSelect.value) : null;
      renderVerifyTable();
    };

    refreshBtn.onclick = async () => {
      try {
        await loadVerifySnapshot();
        populateVerifySelectors();
        renderVerifyTable();
      } catch (err) {
        alert(`Refresh failed: ${err.message}`);
      }
    };

    closeBtn.onclick = () => {
      modal.style.display = 'none';
    };

    lockAllBtn.onclick = () => {
      handleLockAllForBale();
    };

    closeRoundBtn.onclick = () => {
      handleVerifyAndCloseRound();
    };
  }

  // ==================== PHASE 0: Division Round Management ====================
  
  async function processNextDivision(eventName) {
    if (pendingDivisions.length === 0) {
      // All divisions configured!
      alert(`✓ Event "${eventName}" created with all division rounds!\n\nArchers have been assigned to bales.`);
      loadEvents();
      return;
    }

    // Get next division
    currentDivision = pendingDivisions.shift();
    const divisionName = {
      'OPEN': 'OPEN (Mixed)',
      'BVAR': 'Boys Varsity',
      'GVAR': 'Girls Varsity',
      'BJV': 'Boys JV',
      'GJV': 'Girls JV'
    }[currentDivision] || currentDivision;

    // Show archer selection modal for this division
    await showAddArchersModalForDivision(currentDivision, divisionName, eventName);
  }

  async function showAddArchersModalForDivision(division, divisionName, eventName) {
    // Reset selection
    selectedArchers = [];
    archerSelector = null;

    // Load master archer list if not already loaded
    if (allArchers.length === 0) {
      try {
        await loadMasterArcherList();
      } catch (err) {
        alert('Error loading archer list: ' + err.message);
        return;
      }
    }

    // Update modal title
    document.getElementById('division-title').textContent = `${divisionName} Round`;

    // Show modal
    const modal = document.getElementById('add-archers-modal');
    modal.style.display = 'flex';

    // Populate filters
    populateFilters();

    // Clear search input
    const searchInput = document.getElementById('archer-search');
    if (searchInput) {
      searchInput.value = '';
    }

    // Initialize ArcherSelector
    initializeArcherSelector();

    // Setup event handlers
    document.getElementById('cancel-add-archers-btn').onclick = () => {
      modal.style.display = 'none';
      archerSelector = null;
      // Skip this division
      processNextDivision(eventName);
    };

    document.getElementById('submit-add-archers-btn').onclick = () => {
      if (selectedArchers.length === 0) {
        // Skip this division if no archers selected
        modal.style.display = 'none';
        archerSelector = null;
        processNextDivision(eventName);
        return;
      }
      modal.style.display = 'none';
      archerSelector = null;
      showAssignmentModeModalForDivision(division, divisionName, eventName);
    };

    // Filter change handlers - update ArcherSelector roster
    ['filter-school', 'filter-gender', 'filter-level'].forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.onchange = () => {
          updateArcherSelectorRoster();
        };
      }
    });

    // Search handler - ArcherSelector has built-in search, but we can also filter the roster
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        updateArcherSelectorRoster();
      });
    }

    // Select All button
    const selectAllBtn = document.getElementById('select-all-btn');
    if (selectAllBtn) {
      selectAllBtn.replaceWith(selectAllBtn.cloneNode(true));
      const newSelectAllBtn = document.getElementById('select-all-btn');

      newSelectAllBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        if (!archerSelector) return;

        const selection = archerSelector.getSelection();
        const currentSelected = selection.selected || [];
        const filteredArchers = applyFiltersToArchers();
        
        // Check if all filtered archers are selected
        const allSelected = filteredArchers.every(archer => {
          const archerId = archer.id || archer.extId;
          return currentSelected.some(sel => (sel.id || sel.extId) === archerId);
        });

        if (allSelected) {
          // Deselect all
          archerSelector.setSelection({ selected: [] });
        } else {
          // Select all filtered archers
          archerSelector.setSelection({ selected: filteredArchers });
        }
      });
    }
  }

  function showAssignmentModeModalForDivision(division, divisionName, eventName) {
    const modal = document.getElementById('assignment-mode-modal');
    modal.querySelector('h2').textContent = `${divisionName} - Bale Assignment`;
    modal.style.display = 'flex';

    document.getElementById('cancel-assignment-btn').onclick = () => {
      modal.style.display = 'none';
      // Re-open archer modal
      showAddArchersModalForDivision(division, divisionName, eventName);
    };

    document.getElementById('submit-assignment-btn').onclick = async () => {
      const mode = document.querySelector('input[name="assignment-mode"]:checked').value;
      const roundId = divisionRounds[division];

      console.log('[Phase 0 Debug] Assignment mode selected:', mode);
      console.log('[Phase 0 Debug] Current event ID:', currentEventId);
      console.log('[Phase 0 Debug] Round ID:', roundId);

      try {
        const btn = document.getElementById('submit-assignment-btn');
        btn.disabled = true;
        btn.textContent = 'Processing...';

        // PHASE 0: Call new endpoint
        const result = await req(`/events/${currentEventId}/rounds/${roundId}/archers`, 'POST', {
          archerIds: selectedArchers,
          assignmentMode: mode
        });
        console.log('[Phase 0 Debug] Archers added result:', result);

        // PHASE 0 FIX: If auto-assign was used, update event's eventType
        if (mode === 'auto_assign') {
          console.log('[Phase 0] Attempting to update event eventType to auto_assign...');
          try {
            const updateResult = await req(`/events/${currentEventId}`, 'PATCH', {
              eventType: 'auto_assign'
            });
            console.log('✅ Event eventType updated to "auto_assign"', updateResult);
          } catch (err) {
            console.error('❌ Failed to update event eventType:', err);
            alert('Warning: Event was created but assignment mode may not be set correctly. You may need to manually select archers from bales.');
          }
        } else {
          console.log('[Phase 0 Debug] Mode is not auto_assign, skipping event update');
        }

        const summary = result.baleAssignments ? 
          `\n\nBale Assignments:\n${result.baleAssignments.map(b => `Bale ${b.baleNumber}: ${b.archers.join(', ')}`).join('\n')}` :
          '';

        alert(`✓ ${result.roundArchersCreated} archers added to ${divisionName}!${summary}`);

        modal.style.display = 'none';

        // Process next division
        processNextDivision(eventName);

      } catch (err) {
        alert('Error adding archers: ' + err.message);
      } finally {
        const btn = document.getElementById('submit-assignment-btn');
        btn.disabled = false;
        btn.textContent = 'Confirm';
      }
    };
  }

  // ==================== Archer Management ====================
  
  async function loadMasterArcherList() {
    try {
      const data = await req('/archers');
      allArchers = data.archers || [];
      console.log(`Loaded ${allArchers.length} archers from master list`);
      return allArchers;
    } catch (err) {
      console.error('Error loading archers:', err);
      throw err;
    }
  }

  async function addArchersToEvent(eventId, eventName) {
    currentEventId = eventId;
    selectedArchers = [];

    // Ensure rounds exist; if none, create OPEN by default
    let roundsResp;
    try {
      roundsResp = await req(`/events/${eventId}/rounds`, 'GET');
    } catch (e) {
      alert('Failed to load event rounds: ' + e.message);
      return;
    }
    let rounds = (roundsResp && roundsResp.rounds) || [];
    if (!rounds.length) {
      try {
        const created = await req(`/events/${eventId}/rounds`, 'POST', { divisions: ['OPEN'], roundType: 'R300' });
        rounds = created.created || [];
      } catch (e) {
        alert('Could not create default OPEN division: ' + e.message);
        return;
      }
    }

    // Map division -> roundId
    divisionRounds = {};
    rounds.forEach(r => { divisionRounds[r.division] = r.roundId || r.roundId; });

    // Choose division
    let divisionCode = null;
    if (rounds.length === 1) {
      divisionCode = rounds[0].division;
    } else {
      const choices = rounds.map(r => r.division).join(', ');
      const input = prompt(`Which division do you want to add archers to?\nOptions: ${choices}`, rounds.find(r => r.division === 'OPEN') ? 'OPEN' : rounds[0].division);
      if (!input) return;
      divisionCode = input.toUpperCase().trim();
      if (!divisionRounds[divisionCode]) {
        alert('Invalid division selected.');
        return;
      }
    }

    const divisionName = {
      'OPEN': 'OPEN (Mixed)',
      'BVAR': 'Boys Varsity',
      'GVAR': 'Girls Varsity',
      'BJV': 'Boys JV',
      'GJV': 'Girls JV'
    }[divisionCode] || divisionCode;

    // Load master archer list
    try {
      await loadMasterArcherList();
    } catch (err) {
      alert('Error loading archer list: ' + err.message);
      return;
    }

    // Open division-aware modal
    showAddArchersModalForDivision(divisionCode, divisionName, eventName);
  }

  function populateFilters() {
    // Populate school filter
    const schoolFilter = document.getElementById('filter-school');
    const schools = [...new Set(allArchers.map(a => a.school))].sort();
    schoolFilter.innerHTML = '<option value="">All Schools</option>';
    schools.forEach(school => {
      const option = document.createElement('option');
      option.value = school;
      option.textContent = school;
      schoolFilter.appendChild(option);
    });
  }

  // ==================== ArcherSelector Integration ====================
  
  /**
   * Apply filters to archer list and return filtered array
   * Note: Search filtering is handled by ArcherSelector internally
   */
  function applyFiltersToArchers() {
    const schoolFilter = document.getElementById('filter-school')?.value || '';
    const genderFilter = document.getElementById('filter-gender')?.value || '';
    const levelFilter = document.getElementById('filter-level')?.value || '';

    // Filter archers by school, gender, and level (AND logic - must match all)
    // Search filtering is handled by ArcherSelector.setFilter()
    const filtered = allArchers.filter(archer => {
      // School filter
      if (schoolFilter && archer.school !== schoolFilter) return false;
      
      // Gender filter
      if (genderFilter && archer.gender !== genderFilter) return false;
      
      // Level filter
      if (levelFilter && archer.level !== levelFilter) return false;
      
      return true;
    });

    // Sort by firstName (alphabetically)
    return filtered.sort((a, b) => {
      const nameA = (a.firstName || a.first_name || '').toLowerCase();
      const nameB = (b.firstName || b.first_name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }

  /**
   * Initialize ArcherSelector component
   */
  function initializeArcherSelector() {
    const container = document.getElementById('archer-selection-container');
    if (!container) {
      console.warn('ArcherSelector container not found.');
      return;
    }
    if (typeof ArcherSelector === 'undefined' || typeof ArcherSelector.init !== 'function') {
      console.warn('ArcherSelector component unavailable.');
      return;
    }

    // Multi-select configuration for coach module
    const COACH_SELECTOR_GROUPS = [
      { 
        id: 'selected', 
        label: 'Selected Archers', 
        buttonText: 'Selected', 
        max: null, // No limit for multi-select
        accentClass: 'bg-primary text-white' 
      }
    ];

    archerSelector = ArcherSelector.init(container, {
      groups: COACH_SELECTOR_GROUPS,
      emptyMessage: 'No archers found. Import archers or sync roster.',
      onSelectionChange: handleSelectorChange,
      onFavoriteToggle: handleFavoriteToggle,
      showAvatars: true,
      showFavoriteToggle: true
    });

    // Load context (favorites, etc.)
    const context = getSelectorContext();
    archerSelector.setContext(context);

    // Apply filters and set roster
    updateArcherSelectorRoster();
  }

  /**
   * Get selector context (favorites, self archer)
   */
  function getSelectorContext() {
    if (typeof ArcherModule === 'undefined') {
      return { favorites: new Set(), selfExtId: '' };
    }
    const selfArcher = typeof ArcherModule.getSelfArcher === 'function' ? ArcherModule.getSelfArcher() : null;
    const favorites = new Set((selfArcher?.faves || []).filter(Boolean));
    const selfExtId = selfArcher?.extId || (typeof ArcherModule.getSelfExtId === 'function' ? ArcherModule.getSelfExtId() : '');
    return { favorites, selfExtId };
  }

  /**
   * Update ArcherSelector roster with filtered archers
   */
  function updateArcherSelectorRoster() {
    if (!archerSelector) return;
    
    const filtered = applyFiltersToArchers();
    archerSelector.setRoster(filtered);
    
    // Apply search filter to ArcherSelector (it has built-in search)
    const searchInput = document.getElementById('archer-search');
    if (searchInput && searchInput.value) {
      archerSelector.setFilter(searchInput.value);
    } else {
      archerSelector.setFilter('');
    }
  }

  /**
   * Handle ArcherSelector selection change
   */
  function handleSelectorChange() {
    if (!archerSelector) return;
    
    const selection = archerSelector.getSelection();
    // Map to selectedArchers array format (archer IDs)
    selectedArchers = (selection.selected || []).map(archer => archer.id || archer.extId).filter(Boolean);
    
    // Update selection count display
    const countEl = document.getElementById('selected-count');
    if (countEl) {
      countEl.textContent = selectedArchers.length;
    }
  }

  /**
   * Handle favorite toggle
   */
  async function handleFavoriteToggle(archer) {
    if (!archer || typeof ArcherModule === 'undefined' || typeof ArcherModule.toggleFriend !== 'function') {
      return;
    }
    const extId = archer.extId || archer.id;
    if (!extId) return;
    const selfExtId = typeof ArcherModule.getSelfExtId === 'function' ? ArcherModule.getSelfExtId() : '';
    if (!selfExtId) {
      // For coach, favorites might not be critical, so we can skip the alert
      console.log('No self archer set - favorite toggle skipped');
      return;
    }
    try {
      await ArcherModule.toggleFriend(extId);
      // Refresh context and roster
      const context = getSelectorContext();
      if (archerSelector) {
        archerSelector.setContext(context);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  }

  function showAssignmentModeModal(eventName) {
    const modal = document.getElementById('assignment-mode-modal');
    modal.style.display = 'flex';

    document.getElementById('cancel-assignment-btn').onclick = () => {
      modal.style.display = 'none';
      // Re-open add archers modal
      document.getElementById('add-archers-modal').style.display = 'flex';
    };

    document.getElementById('submit-assignment-btn').onclick = async () => {
      const mode = document.querySelector('input[name="assignment-mode"]:checked').value;
      
      try {
        const btn = document.getElementById('submit-assignment-btn');
        btn.disabled = true;
        btn.textContent = 'Processing...';

        // Call API to add archers to event
        const result = await req(`/events/${currentEventId}/archers`, 'POST', {
          archerIds: selectedArchers,
          assignmentMode: mode
        });
        
        const modeText = mode === 'auto_assign' ? 'Auto-Assigned to bales' : 'Added (manual signup)';
        alert(`✓ ${result.added} archers added to "${eventName}"!\n\n${modeText}`);
        
        modal.style.display = 'none';
        loadEvents();
      } catch (err) {
        alert('Error adding archers: ' + err.message);
      } finally {
        const btn = document.getElementById('submit-assignment-btn');
        btn.disabled = false;
        btn.textContent = 'Confirm';
      }
    };
  }

  // ==================== CSV Import ====================
  
  function setupCSVImport() {
    const csvInput = document.getElementById('csv-input');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    
    csvInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const result = parseCSV(text);
        
        if (result.errors.length > 0) {
          alert(`CSV parsing errors:\n${result.errors.join('\n')}`);
          return;
        }

        // Upsert archers
        const summary = await upsertArchers(result.archers);
        showImportSummary(summary);
        
        // Reset input
        csvInput.value = '';
      } catch (err) {
        alert('Error importing CSV: ' + err.message);
        csvInput.value = '';
      }
    };

    // Export CSV from Database
    if (exportCsvBtn) {
      exportCsvBtn.onclick = async () => {
        try {
          exportCsvBtn.disabled = true;
          exportCsvBtn.textContent = 'Exporting...';
          
          // Get all archers from database
          let response;
          try {
            response = await req('/archers', 'GET');
          } catch (err) {
            console.error('Export CSV API error:', err);
            alert(`Error fetching archers from database: ${err.message}\n\nCheck browser console for details.`);
            exportCsvBtn.disabled = false;
            exportCsvBtn.innerHTML = '<i class="fas fa-file-export"></i> Export CSV from Database';
            return;
          }
          
          const archers = response.archers || [];
          
          if (archers.length === 0) {
            alert('No archers found in database.');
            exportCsvBtn.disabled = false;
            exportCsvBtn.innerHTML = '<i class="fas fa-file-export"></i> Export CSV from Database';
            return;
          }

          // Convert to CSV format (matching archer_module.js export format)
          const headers = [
            'id',           // Database UUID (first column)
            'extId',
            'first',
            'last',
            'nickname',
            'photoUrl',
            'school',
            'grade',
            'gender',
            'level',
            'status',
            'email',
            'phone',
            'usArcheryId',
            'jvPr',
            'varPr',
            'domEye',
            'domHand',
            'heightIn',
            'wingspanIn',
            'drawLengthSugg',
            'riserHeightIn',
            'limbLength',
            'limbWeightLbs',
            'notesGear',
            'notesCurrent',
            'notesArchive',
            'faves'
          ];

          // Escape CSV values
          const escapeCSV = (value) => {
            if (value === null || value === undefined) return '';
            const str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          };

          // Build CSV rows
          const rows = archers.map(archer => {
            // Map database field names to CSV format
            const faves = Array.isArray(archer.faves) ? archer.faves.join(';') : (archer.faves || '');
            
            return headers.map(header => {
              let value = '';
              switch (header) {
                case 'id':
                  value = archer.id || '';
                  break;
                case 'extId':
                  value = archer.extId || '';
                  break;
                case 'first':
                  value = archer.firstName || '';
                  break;
                case 'last':
                  value = archer.lastName || '';
                  break;
                case 'nickname':
                  value = archer.nickname || '';
                  break;
                case 'photoUrl':
                  value = archer.photoUrl || '';
                  break;
                case 'school':
                  value = archer.school || '';
                  break;
                case 'grade':
                  value = archer.grade || '';
                  break;
                case 'gender':
                  value = archer.gender || '';
                  break;
                case 'level':
                  value = archer.level || '';
                  break;
                case 'status':
                  value = archer.status || 'active';
                  break;
                case 'email':
                  value = archer.email || '';
                  break;
                case 'phone':
                  value = archer.phone || '';
                  break;
                case 'usArcheryId':
                  value = archer.usArcheryId || '';
                  break;
                case 'jvPr':
                  value = archer.jvPr || '';
                  break;
                case 'varPr':
                  value = archer.varPr || '';
                  break;
                case 'domEye':
                  value = archer.domEye || '';
                  break;
                case 'domHand':
                  value = archer.domHand || '';
                  break;
                case 'heightIn':
                  value = archer.heightIn || '';
                  break;
                case 'wingspanIn':
                  value = archer.wingspanIn || '';
                  break;
                case 'drawLengthSugg':
                  value = archer.drawLengthSugg || '';
                  break;
                case 'riserHeightIn':
                  value = archer.riserHeightIn || '';
                  break;
                case 'limbLength':
                  value = archer.limbLength || '';
                  break;
                case 'limbWeightLbs':
                  value = archer.limbWeightLbs || '';
                  break;
                case 'notesGear':
                  value = archer.notesGear || '';
                  break;
                case 'notesCurrent':
                  value = archer.notesCurrent || '';
                  break;
                case 'notesArchive':
                  value = archer.notesArchive || '';
                  break;
                case 'faves':
                  value = faves;
                  break;
                default:
                  value = '';
              }
              return escapeCSV(value);
            }).join(',');
          });

          // Build complete CSV
          const csv = [headers.join(','), ...rows].join('\n');

          // Download CSV file
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const timestamp = new Date().toISOString().slice(0, 10);
          link.download = `archer-list-database-${timestamp}.csv`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          alert(`Exported ${archers.length} archers to CSV.`);
        } catch (err) {
          console.error('Export CSV failed:', err);
          alert('Error exporting CSV: ' + err.message);
        } finally {
          exportCsvBtn.disabled = false;
          exportCsvBtn.innerHTML = '<i class="fas fa-file-export"></i> Export CSV from Database';
        }
      };
    }
  }

  // Hook up on load (coach page)
  document.addEventListener('DOMContentLoaded', () => {
    setupCSVImport();
    // Note: Reset button handler now set up in editEvent() function
  });

  function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const archers = [];
    const errors = [];

    // Helper to safely parse CSV values (handle quoted fields)
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++; // Skip next quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim()); // Add last field
      return result;
    };

    const slugify = (s) => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').trim();

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const archer = {};

      headers.forEach((header, idx) => {
        archer[header] = (values[idx] || '').trim();
      });

      // Validate required fields (at minimum need first and last)
      if (!archer.first || !archer.last) {
        errors.push(`Line ${i + 1}: Missing required fields (first, last)`);
        continue;
      }

      // Build archer object with all available fields
      // CRITICAL: Preserve UUID (id) if present in CSV for database matching
      const archerData = {
        id: archer.id || archer.uuid || undefined,  // Preserve UUID if present
        extId: archer.extid || archer.ext_id || '',
        firstName: archer.first || archer.firstname || '',
        lastName: archer.last || archer.lastname || '',
        nickname: archer.nickname || '',
        photoUrl: archer.photourl || archer.photo_url || archer.photo || '',
        school: (archer.school || '').substring(0, 3).toUpperCase() || 'UNK',
        grade: archer.grade || '',
        gender: (archer.gender || 'M').toUpperCase() === 'F' ? 'F' : 'M',
        level: (archer.level || 'VAR').toUpperCase() === 'JV' ? 'JV' : (archer.level || 'VAR').toUpperCase() === 'BEG' ? 'BEG' : 'VAR',
        status: (archer.status || 'active').toLowerCase(),
        email: archer.email || '',
        phone: archer.phone || '',
        usArcheryId: archer.usarcheryid || archer.us_archery_id || archer.usarchery || '',
        jvPr: archer.jvpr || archer.jv_pr ? parseInt(archer.jvpr || archer.jv_pr) : undefined,
        varPr: archer.varpr || archer.var_pr ? parseInt(archer.varpr || archer.var_pr) : undefined,
        domEye: (archer.domeye || archer.dom_eye || '').toUpperCase() || undefined,
        domHand: (archer.domhand || archer.dom_hand || '').toUpperCase() || undefined,
        heightIn: archer.heightin || archer.height_in ? parseInt(archer.heightin || archer.height_in) : undefined,
        wingspanIn: archer.wingspanin || archer.wingspan_in ? parseInt(archer.wingspanin || archer.wingspan_in) : undefined,
        drawLengthSugg: archer.drawlengthsugg || archer.draw_length_sugg ? parseFloat(archer.drawlengthsugg || archer.draw_length_sugg) : undefined,
        riserHeightIn: archer.riserheightin || archer.riser_height_in ? parseFloat(archer.riserheightin || archer.riser_height_in) : undefined,
        limbLength: (archer.limblength || archer.limb_length || '').toUpperCase() || undefined,
        limbWeightLbs: archer.limbweightlbs || archer.limb_weight_lbs ? parseFloat(archer.limbweightlbs || archer.limb_weight_lbs) : undefined,
        notesGear: archer.notesgear || archer.notes_gear || '',
        notesCurrent: archer.notescurrent || archer.notes_current || '',
        notesArchive: archer.notesarchive || archer.notes_archive || ''
      };

      // Generate extId if missing (for smart matching fallback)
      if (!archerData.extId) {
        archerData.extId = `${slugify(archerData.firstName)}-${slugify(archerData.lastName)}-${slugify(archerData.school)}`;
      }

      // Remove undefined fields (only send fields that have values)
      Object.keys(archerData).forEach(key => {
        if (archerData[key] === undefined || archerData[key] === '') {
          delete archerData[key];
        }
      });

      archers.push(archerData);
    }

    return { archers, errors };
  }

  async function upsertArchers(archers) {
    try {
      const result = await req('/archers/bulk_upsert', 'POST', archers);
      return result;
    } catch (err) {
      throw new Error(`Upsert failed: ${err.message}`);
    }
  }

  function showImportSummary(summary) {
    const modal = document.getElementById('import-summary-modal');
    const summaryDiv = document.getElementById('import-summary');

    const total = (summary.inserted || 0) + (summary.updated || 0);

    summaryDiv.innerHTML = `
      <ul style="list-style: none; padding: 0;">
        <li style="padding: 0.5rem 0; font-size: 1.1rem;">📊 <strong>${total}</strong> archers processed</li>
        <li style="padding: 0.5rem 0; color: #27ae60;">✓ <strong>${summary.inserted || 0}</strong> created (new)</li>
        <li style="padding: 0.5rem 0; color: #3498db;">↻ <strong>${summary.updated || 0}</strong> updated (existing)</li>
        <li style="padding: 0.5rem 0; color: #e74c3c;">✗ <strong>0</strong> errors</li>
      </ul>
    `;

    modal.style.display = 'flex';

    document.getElementById('close-import-btn').onclick = () => {
      modal.style.display = 'none';
      // Reload archer list for adding to events
      loadMasterArcherList();
    };
  }

  // ==================== Initialization ====================
  
  function init() {
    console.log('Coach Console initialized');
    
    // Setup event handlers
    document.getElementById('create-event-btn').onclick = showCreateEventModal;
    setupCSVImport();
    
    // Load events
    loadEvents();
  }

  // ==================== Page Load ====================
  
  document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (checkAuthentication()) {
      init();
    }
  });

  // ==================== Edit Event ====================
  
  let currentEditEventId = null;
  
  async function loadEventRounds(eventId) {
    const roundsList = document.getElementById('edit-event-rounds-list');
    
    try {
      // Fetch event data (for event_type) and rounds separately
      const [eventData, roundsData] = await Promise.all([
        req(`/events/${eventId}/snapshot`).catch(() => ({ event: {} })),
        req(`/events/${eventId}/rounds`).catch(() => ({ rounds: [] }))
      ]);
      
      const event = eventData.event || {};
      const rounds = roundsData.rounds || [];
      
      if (rounds.length === 0) {
        roundsList.innerHTML = '<div style="color: #7f8c8d; text-align: center;">No rounds configured for this event.</div>';
        return;
      }
      
      // Display rounds
      let roundsHTML = '<div style="display: flex; flex-direction: column; gap: 0.5rem;">';
      rounds.forEach(round => {
        const eventType = event.event_type || event.eventType || 'manual';
        const assignmentType = eventType === 'auto_assign' ? 'Auto-Assigned' : 'Manual';
        const assignmentBadge = eventType === 'auto_assign' 
          ? '<span style="background: #3498db; color: white; padding: 0.15rem 0.5rem; border-radius: 3px; font-size: 0.85rem; margin-left: 0.5rem;">Auto</span>'
          : '<span style="background: #95a5a6; color: white; padding: 0.15rem 0.5rem; border-radius: 3px; font-size: 0.85rem; margin-left: 0.5rem;">Manual</span>';
        
        roundsHTML += `
          <div style="padding: 0.5rem; background: white; border: 1px solid #ddd; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>${round.division || 'N/A'}</strong> - ${round.roundType || 'R300'}
              ${assignmentBadge}
            </div>
            <div style="font-size: 0.85rem; color: #7f8c8d;">
              ${round.archerCount || 0} archers
            </div>
          </div>
        `;
      });
      roundsHTML += '</div>';
      
      roundsList.innerHTML = roundsHTML;
    } catch (err) {
      console.error('Error loading rounds:', err);
      roundsList.innerHTML = '<div style="color: #e74c3c; text-align: center;">Error loading rounds</div>';
    }
  }
  
  async function editEvent(encodedEventData) {
    const event = JSON.parse(decodeURIComponent(encodedEventData));
    currentEditEventId = event.id;
    
    const modal = document.getElementById('edit-event-modal');
    const nameInput = document.getElementById('edit-event-name');
    const dateInput = document.getElementById('edit-event-date');
    const statusSelect = document.getElementById('edit-event-status');
    const codeInput = document.getElementById('edit-event-code');
    
    // Populate with current values
    nameInput.value = event.name || '';
    dateInput.value = event.date || '';
    statusSelect.value = event.status || 'Planned';
    codeInput.value = event.entry_code || '';
    
    modal.style.display = 'flex';
    
    // Load and display rounds
    await loadEventRounds(event.id);
    
    // Load and display matches
    await loadEventBrackets(event.id);
    
    document.getElementById('cancel-edit-event-btn').onclick = () => {
      modal.style.display = 'none';
      currentEditEventId = null;
    };
    
    // Add Archers button - opens Add Archers modal
    document.getElementById('edit-add-archers-btn').onclick = () => {
      addArchersToEvent(event.id, event.name);
    };
    
    // Bale Settings button - opens Bale Settings modal
    document.getElementById('edit-bale-settings-btn').onclick = () => {
      manageBales(event.id, event.name);
    };
    
    // Delete Event button
    document.getElementById('edit-delete-event-btn').onclick = () => {
      deleteEvent(event.id, event.name);
    };
    
    // Match management buttons
    document.getElementById('create-bracket-btn').onclick = () => openCreateBracketModal();
    document.getElementById('refresh-brackets-btn').onclick = () => loadEventBrackets(event.id);
    
    document.getElementById('submit-edit-event-btn').onclick = async () => {
      const name = nameInput.value.trim();
      const date = dateInput.value;
      const status = statusSelect.value;
      const entryCode = codeInput.value.trim();
      
      if (!name) {
        alert('Please enter an event name');
        return;
      }
      
      try {
        const btn = document.getElementById('submit-edit-event-btn');
        btn.disabled = true;
        btn.textContent = 'Saving...';
        
        // Call API to update event
        await req(`/events/${currentEditEventId}`, 'PATCH', {
          name,
          date,
          status,
          entryCode
        });
        
        modal.style.display = 'none';
        alert(`Event "${name}" updated successfully!`);
        loadEvents();
      } catch (err) {
        alert(`Error updating event: ${err.message}`);
      } finally {
        const btn = document.getElementById('submit-edit-event-btn');
        btn.disabled = false;
        btn.textContent = 'Save Changes';
        currentEditEventId = null;
      }
    };
  }
  
  // ==================== QR Code Display ====================
  
  function showQRCode(encodedEventData) {
    const event = JSON.parse(decodeURIComponent(encodedEventData));
    
    // Check if event has an entry code
    if (!event.entry_code) {
      alert('This event does not have an entry code.\n\nPlease edit the event and add an entry code first.');
      return;
    }
    
    const modal = document.getElementById('qr-code-modal');
    const qrContainer = document.getElementById('qr-code-container');
    const urlDisplay = document.getElementById('qr-url-display');
    const eventNameDisplay = document.getElementById('qr-event-name');
    
    // Build the URL
    const baseUrl = window.location.origin + window.location.pathname.replace('coach.html', '');
    const fullUrl = `${baseUrl}ranking_round_300.html?event=${event.id}&code=${event.entry_code}`;
    
    // Update displays
    eventNameDisplay.textContent = `${event.name} - QR Code`;
    urlDisplay.value = fullUrl;
    
    // Clear previous QR code
    qrContainer.innerHTML = '';
    
    // Generate QR code (responsive size)
    try {
      const isMobile = window.innerWidth < 768;
      const qrSize = isMobile ? 200 : 256;
      
      new QRCode(qrContainer, {
        text: fullUrl,
        width: qrSize,
        height: qrSize,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    } catch (err) {
      console.error('QR Code generation error:', err);
      qrContainer.innerHTML = '<p style="color: red;">Error generating QR code</p>';
    }
    
    modal.style.display = 'flex';
    
    // Copy URL button
    document.getElementById('copy-url-btn').onclick = () => {
      urlDisplay.select();
      document.execCommand('copy');
      
      const btn = document.getElementById('copy-url-btn');
      const originalText = btn.textContent;
      btn.textContent = '✓ Copied!';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    };
    
    // Close button
    document.getElementById('close-qr-btn').onclick = () => {
      modal.style.display = 'none';
    };
  }
  
  // ==================== Bracket Management ====================
  
  let currentBracketId = null;
  
  async function loadEventBrackets(eventId) {
    try {
      const response = await req(`/events/${eventId}/brackets`, 'GET');
      renderBrackets(response.brackets || []);
    } catch (err) {
      console.error('Error loading brackets:', err);
      document.getElementById('brackets-list').innerHTML = '<div class="text-red-500 text-sm py-2">Error loading brackets</div>';
    }
  }
  
  function renderBrackets(brackets) {
    const container = document.getElementById('brackets-list');
    if (!brackets || brackets.length === 0) {
      container.innerHTML = '<div class="text-gray-500 dark:text-gray-400 text-center text-sm py-4">No brackets yet. Create a bracket after ranking rounds are complete.</div>';
      return;
    }
    
    let html = '';
    brackets.forEach(bracket => {
      const status = bracket.status || 'OPEN';
      const statusColor = status === 'COMPLETED' ? 'text-success' : status === 'IN_PROGRESS' ? 'text-primary' : 'text-gray-600';
      const entryCount = bracket.entry_count || 0;
      
      html += `
        <div class="p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
          <div class="flex justify-between items-start mb-2">
            <div class="flex-1">
              <div class="font-semibold text-gray-800 dark:text-white text-sm">
                ${bracket.bracket_type} ${bracket.bracket_format} - ${bracket.division}
              </div>
              <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                <span class="${statusColor}">${status}</span>
                ${entryCount > 0 ? ` • ${entryCount} entries` : ' • No entries'}
                ${bracket.bracket_size ? ` • Size: ${bracket.bracket_size}` : ''}
              </div>
            </div>
            <div class="flex gap-1 ml-2">
              <button onclick="coach.editBracket('${bracket.id}')" 
                class="px-2 py-1 bg-primary hover:bg-primary-dark text-white rounded text-xs font-semibold transition-colors">
                Edit
              </button>
            </div>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  }
  
  function openCreateBracketModal() {
    if (!currentEditEventId) {
      alert('No event selected');
      return;
    }
    
    const modal = document.getElementById('create-bracket-modal');
    const typeSelect = document.getElementById('bracket-type');
    const formatSelect = document.getElementById('bracket-format');
    const divisionSelect = document.getElementById('bracket-division');
    const sizeInput = document.getElementById('bracket-size');
    
    // Reset form
    typeSelect.value = 'SOLO';
    formatSelect.value = 'ELIMINATION';
    divisionSelect.value = 'BV';
    sizeInput.value = '8';
    
    modal.style.display = 'flex';
    
    // Update size input based on format
    formatSelect.onchange = () => {
      if (formatSelect.value === 'ELIMINATION') {
        sizeInput.value = '8';
        sizeInput.disabled = true;
      } else {
        sizeInput.disabled = false;
      }
    };
    formatSelect.onchange(); // Initial call
    
    document.getElementById('cancel-create-bracket-btn').onclick = () => {
      modal.style.display = 'none';
    };
    
    document.getElementById('submit-create-bracket-btn').onclick = async () => {
      const bracketType = typeSelect.value;
      const bracketFormat = formatSelect.value;
      const division = divisionSelect.value;
      const bracketSize = parseInt(sizeInput.value);
      
      if (bracketFormat === 'ELIMINATION' && bracketSize !== 8) {
        alert('Elimination brackets must be size 8');
        return;
      }
      
      try {
        const btn = document.getElementById('submit-create-bracket-btn');
        btn.disabled = true;
        btn.textContent = 'Creating...';
        
        const response = await req(`/events/${currentEditEventId}/brackets`, 'POST', {
          bracketType,
          bracketFormat,
          division,
          bracketSize,
          createdBy: 'Coach'
        });
        
        modal.style.display = 'none';
        alert('Bracket created successfully!');
        
        // Refresh brackets list
        await loadEventBrackets(currentEditEventId);
        
        btn.disabled = false;
        btn.textContent = 'Create Bracket';
      } catch (err) {
        alert('Error creating bracket: ' + (err.message || 'Unknown error'));
        btn.disabled = false;
        btn.textContent = 'Create Bracket';
      }
    };
  }
  
  async function editBracket(bracketId) {
    currentBracketId = bracketId;
    
    try {
      // Load bracket details
      const bracketResponse = await req(`/brackets/${bracketId}`, 'GET');
      const bracket = bracketResponse.bracket;
      
      // Load bracket entries
      const entriesResponse = await req(`/brackets/${bracketId}/entries`, 'GET');
      const entries = entriesResponse.entries || [];
      
      // Update modal
      const modal = document.getElementById('edit-bracket-modal');
      const title = document.getElementById('edit-bracket-title');
      const statusSelect = document.getElementById('bracket-status');
      const entriesList = document.getElementById('bracket-entries-list');
      
      title.textContent = `${bracket.bracket_type} ${bracket.bracket_format} - ${bracket.division}`;
      statusSelect.value = bracket.status || 'OPEN';
      
      // Render entries
      if (entries.length === 0) {
        entriesList.innerHTML = '<div class="text-gray-500 dark:text-gray-400 text-center text-sm py-4">No entries yet</div>';
      } else {
        let html = '';
        entries.forEach(entry => {
          const name = entry.entry_type === 'ARCHER' 
            ? `${entry.first_name || ''} ${entry.last_name || ''}`.trim() || 'Unknown Archer'
            : entry.school_id || 'Unknown Team';
          const seed = entry.seed_position ? `Seed ${entry.seed_position}` : '';
          const swiss = bracket.bracket_format === 'SWISS' 
            ? ` • W-L: ${entry.swiss_wins || 0}-${entry.swiss_losses || 0} (${entry.swiss_points || 0} pts)`
            : '';
          
          html += `
            <div class="p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded mb-2 flex justify-between items-center">
              <div>
                <span class="font-medium text-sm">${name}</span>
                ${seed ? `<span class="text-xs text-gray-500 ml-2">${seed}</span>` : ''}
                ${swiss ? `<span class="text-xs text-gray-500 ml-2">${swiss}</span>` : ''}
              </div>
              <button onclick="coach.removeBracketEntry('${bracketId}', '${entry.id}')" 
                class="px-2 py-1 bg-danger hover:bg-red-700 text-white rounded text-xs font-semibold transition-colors">
                Remove
              </button>
            </div>
          `;
        });
        entriesList.innerHTML = html;
      }
      
      modal.style.display = 'flex';
      
      // Set up event handlers
      document.getElementById('cancel-edit-bracket-btn').onclick = () => {
        modal.style.display = 'none';
        currentBracketId = null;
      };
      
      document.getElementById('generate-bracket-btn').onclick = async () => {
        if (bracket.bracket_format !== 'ELIMINATION') {
          alert('Auto-generation only available for ELIMINATION brackets');
          return;
        }
        
        if (!confirm('This will generate bracket entries from Top 8 ranking scores. Continue?')) {
          return;
        }
        
        try {
          const btn = document.getElementById('generate-bracket-btn');
          btn.disabled = true;
          btn.textContent = 'Generating...';
          
          await req(`/brackets/${bracketId}/generate`, 'POST', {});
          
          alert('Bracket generated successfully!');
          
          // Refresh bracket data
          await editBracket(bracketId);
          
          btn.disabled = false;
          btn.textContent = '🎯 Generate from Top 8';
        } catch (err) {
          alert('Error generating bracket: ' + (err.message || 'Unknown error'));
          btn.disabled = false;
          btn.textContent = '🎯 Generate from Top 8';
        }
      };
      
      document.getElementById('bracket-status').onchange = async () => {
        const newStatus = statusSelect.value;
        try {
          await req(`/brackets/${bracketId}`, 'PATCH', { status: newStatus });
          alert('Bracket status updated');
        } catch (err) {
          alert('Error updating status: ' + (err.message || 'Unknown error'));
        }
      };
      
      document.getElementById('view-bracket-results-btn').onclick = () => {
        window.location.href = `bracket_results.html?bracketId=${bracketId}`;
      };
      
      document.getElementById('delete-bracket-btn').onclick = async () => {
        if (!confirm('Are you sure you want to delete this bracket? This cannot be undone.')) {
          return;
        }
        
        try {
          await req(`/brackets/${bracketId}`, 'DELETE');
          alert('Bracket deleted');
          modal.style.display = 'none';
          await loadEventBrackets(bracket.event_id);
        } catch (err) {
          alert('Error deleting bracket: ' + (err.message || 'Unknown error'));
        }
      };
      
    } catch (err) {
      alert('Error loading bracket: ' + (err.message || 'Unknown error'));
    }
  }
  
  async function removeBracketEntry(bracketId, entryId) {
    if (!confirm('Remove this entry from the bracket?')) {
      return;
    }
    
    try {
      await req(`/brackets/${bracketId}/entries/${entryId}`, 'DELETE');
      await editBracket(bracketId); // Refresh
    } catch (err) {
      alert('Error removing entry: ' + (err.message || 'Unknown error'));
    }
  }
  
  // Expose functions globally
  window.coach = window.coach || {};
  window.coach.editBracket = editBracket;
  window.coach.removeBracketEntry = removeBracketEntry;
  
  // ==================== Global Functions (for inline onclick) ====================
  
  window.coach = {
    viewResults,
    addArchersToEvent,
    deleteEvent,
    editEvent,
    manageBales,
    showQRCode,
    verifyEvent,
    editBracket,
    removeBracketEntry
  };

})();
