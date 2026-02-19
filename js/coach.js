/**
 * Coach Console - Redesigned Interface
 * Features: Authentication, Event Management, Archer Management, Results
 */

(() => {
  // API Base URL - relative path works for both local (via router.php) and prod
  const API_BASE = '/api/v1';
  const COACH_COOKIE_NAME = 'coach_auth';
  const COACH_PASSCODE = 'wdva26'; // The actual passcode
  const COOKIE_DAYS = 90;

  // ==================== Modal Helper Functions ====================

  /**
   * Shows a modal by removing 'hidden' class and adding 'flex' class
   * Handles Tailwind's !important on 'hidden' class
   * @param {HTMLElement|string} modalOrId - Modal element or ID
   */
  function showModal(modalOrId) {
    const modal = typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId;
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  /**
   * Hides a modal by removing 'flex' class and adding 'hidden' class
   * @param {HTMLElement|string} modalOrId - Modal element or ID
   */
  function hideModal(modalOrId) {
    const modal = typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId;
    if (modal) {
      modal.classList.remove('flex');
      modal.classList.add('hidden');
    }
  }

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

  // Roster management state
  let rosterArcherSelector = null; // ArcherSelector for roster modal
  let rosterAllArchers = []; // Full archer list for roster modal
  let rosterSelectedArchers = []; // Selected archers for roster modal

  /**
   * Get today's date in local timezone as YYYY-MM-DD format
   * Uses local date methods to avoid timezone issues with toISOString()
   * @returns {string} Date string in YYYY-MM-DD format
   */
  function getLocalDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

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
    modal.classList.remove('hidden');
    modal.classList.add('flex');

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
        modal.classList.remove('flex');
        modal.classList.add('hidden');
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

      let html = '<div class="space-y-3">';

      events.forEach(ev => {
        const eventData = encodeURIComponent(JSON.stringify(ev));
        // Format date without year: "Oct 15" instead of "2024-10-15"
        const dateObj = new Date(ev.date + 'T00:00:00');
        const shortDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const statusColors = {
          'active': 'bg-success text-white',
          'planned': 'bg-gray-400 dark:bg-gray-500 text-white',
          'completed': 'bg-gray-600 dark:bg-gray-700 text-white'
        };
        const statusClass = statusColors[ev.status.toLowerCase()] || 'bg-gray-400 text-white';

        html += `
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow p-4">
            <!-- Line 1: Event Name + Date + Status + Edit -->
            <div class="flex items-center gap-3 mb-3 flex-wrap">
              <div class="flex-1 min-w-0">
                <h3 class="text-lg font-semibold text-gray-800 dark:text-white truncate">${ev.name}</h3>
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                ${shortDate}
              </div>
              <div class="flex-shrink-0 flex gap-1">
                <span class="px-2 py-1 rounded text-xs font-semibold ${statusClass}">${ev.status}</span>
                ${ev.event_format ? `<span class="px-2 py-1 rounded text-xs font-semibold ${ev.event_format === 'GAMES' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'}">${ev.event_format}</span>` : ''}
              </div>
              <button class="px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm transition-colors min-h-[32px] flex items-center justify-center" onclick="coach.editEvent('${eventData}')" title="Edit Event">
                <i class="fas fa-pen-to-square"></i>
              </button>
            </div>
            <!-- Line 2: Actions (QR Code, Dashboard, Results, Brackets, Validate) -->
            <div class="flex flex-wrap gap-2">
              <button class="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm transition-colors min-h-[32px] flex items-center justify-center" onclick="coach.showQRCode('${eventData}')" title="QR Code">
                <i class="fas fa-qrcode"></i>
              </button>
              <button class="px-3 py-1 bg-primary hover:bg-primary-dark text-white rounded text-sm transition-colors min-h-[32px] flex items-center justify-center gap-1 whitespace-nowrap" onclick="coach.viewDashboard('${ev.id}')" title="Event Dashboard">
                <i class="fas fa-table-list"></i> Dashboard
              </button>
              <button class="px-3 py-1 bg-primary hover:bg-primary-dark text-white rounded text-sm transition-colors min-h-[32px] flex items-center justify-center gap-1 whitespace-nowrap" onclick="coach.viewResults('${ev.id}')" title="View Results">
                <i class="fas fa-list-ol"></i> Results
              </button>
              <button class="px-3 py-1 bg-primary hover:bg-primary-dark text-white rounded text-sm transition-colors min-h-[32px] flex items-center justify-center gap-1 whitespace-nowrap" onclick="coach.viewBrackets('${ev.id}')" title="View Brackets">
                <i class="fas fa-trophy"></i> Brackets
              </button>
              <button class="px-3 py-1 bg-primary hover:bg-primary-dark text-white rounded text-sm transition-colors min-h-[32px] flex items-center justify-center gap-1 whitespace-nowrap" onclick="coach.verifyEvent('${eventData}')" title="Verify Scorecards">
                <i class="fas fa-user-check"></i> Verify
              </button>
              ${ev.event_format === 'GAMES' ? `<button class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors min-h-[32px] flex items-center justify-center gap-1 whitespace-nowrap" onclick="coach.importRoster('${ev.id}')" title="Import Roster from Assignments">
                <i class="fas fa-file-import"></i> Import Roster
              </button>` : ''}
            </div>
          </div>
        `;
      });

      html += '</div>';
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
              (list.archers || []).forEach(a => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify(a);
                opt.textContent = `${a.lastName}, ${a.firstName} (${a.school})`;
                select.appendChild(opt);
              });
            } catch (_) { }
          })();

          addRow.querySelector('[data-role="add-confirm"]').onclick = async () => {
            const select = addRow.querySelector('[data-role="add-archer-select"]');
            const baleInp = addRow.querySelector('[data-role="add-bale"]');
            const tgtInp = addRow.querySelector('[data-role="add-target"]');
            if (!select.value) { alert('Select an archer'); return; }
            const ar = JSON.parse(select.value);
            const archerName = `${ar.firstName} ${ar.lastName}`.trim();
            const baleNumber = parseInt(baleInp.value, 10);
            const targetAssignment = (tgtInp.value || '').toUpperCase().substring(0, 1);
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
                roundArcherId: 'temp_' + Math.random().toString(36).slice(2),
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
            } catch (e) { alert('Add failed: ' + e.message); }
          };
          (div.archers || []).forEach(a => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors';
            tr.innerHTML = `
              <td class="px-3 py-2">${a.archerName}</td>
              <td class="px-3 py-2">${a.school || ''}</td>
              <td class="px-3 py-2"><input type="number" min="1" value="${a.bale || ''}" class="w-[70px] px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></td>
              <td class="px-3 py-2"><input type="text" value="${a.target || ''}" class="w-[70px] px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" maxlength="1" /></td>
              <td class="px-3 py-2">
                <button class="px-2 py-1 bg-primary hover:bg-primary-dark text-white rounded text-sm transition-colors mr-1" data-act="save">Save</button>
                <button class="px-2 py-1 bg-danger hover:bg-red-700 text-white rounded text-sm transition-colors" data-act="remove">Remove</button>
              </td>`;
            const [baleInp, tgtInp] = tr.querySelectorAll('input');
            tr.querySelector('[data-act="save"]').onclick = async () => {
              try {
                await req(`/rounds/${div.roundId}/archers/${a.roundArcherId}`, 'PATCH', {
                  baleNumber: parseInt(baleInp.value, 10) || null,
                  targetAssignment: (tgtInp.value || '').toUpperCase().substring(0, 1)
                });
                a.bale = parseInt(baleInp.value, 10) || a.bale;
                a.target = (tgtInp.value || '').toUpperCase().substring(0, 1);
                alert('Saved');
              } catch (e) { alert('Save failed: ' + e.message); }
            };
            tr.querySelector('[data-act="remove"]').onclick = async () => {
              if (!confirm('Remove this archer from the round?')) return;
              try {
                await req(`/rounds/${div.roundId}/archers/${a.roundArcherId}`, 'DELETE');
                // remove from local snapshot and re-render
                div.archers = (div.archers || []).filter(x => x.roundArcherId !== a.roundArcherId);
                render();
              } catch (e) { alert('Remove failed: ' + e.message); }
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
    const formatSelect = document.getElementById('event-format');
    const baleConfig = document.getElementById('games-bale-config');

    // Set defaults
    nameInput.value = '';
    dateInput.value = getLocalDateString(); // Use local timezone to avoid date offset issues
    statusSelect.value = 'Planned';
    codeInput.value = '';
    if (formatSelect) formatSelect.value = '';
    if (baleConfig) baleConfig.classList.add('hidden');

    // Toggle sections based on event format
    const gamesSections = document.getElementById('games-event-sections');
    const sanctionedSections = document.getElementById('sanctioned-event-sections');
    const updateFormatSections = () => {
      const isGames = formatSelect && formatSelect.value === 'GAMES';
      if (baleConfig) baleConfig.classList.toggle('hidden', !isGames);
      if (gamesSections) gamesSections.classList.toggle('hidden', !isGames);
      if (sanctionedSections) sanctionedSections.classList.toggle('hidden', isGames);
    };
    if (formatSelect) {
      formatSelect.onchange = updateFormatSections;
      updateFormatSections();
    }

    // Initialize component toggle logic
    const linkToggle = (chkId, optId) => {
      const chk = document.getElementById(chkId);
      const opt = document.getElementById(optId);
      if (chk && opt) {
        chk.onchange = () => { opt.classList.toggle('hidden', !chk.checked); };
        // Trigger initial state
        opt.classList.toggle('hidden', !chk.checked);
      }
    };

    linkToggle('include-ranking', 'ranking-options');
    linkToggle('include-solo', 'solo-options');
    linkToggle('include-team', 'team-options');

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

      // Determine event format
      const eventFormat = formatSelect ? formatSelect.value : '';

      // =========================================================
      // GAMES EVENT PATH - separate flow from Sanctioned/Standard
      // =========================================================
      if (eventFormat === 'GAMES') {
        try {
          const btn = document.getElementById('submit-event-btn');
          btn.disabled = true;
          btn.textContent = 'Creating...';

          const totalBalesEl = document.getElementById('total-bales');
          const targetsPerBaleEl = document.getElementById('targets-per-bale');

          // Step 1: Create the Games Event
          const result = await req('/events', 'POST', {
            name,
            date,
            status,
            entryCode,
            eventType: 'manual',
            autoAssignBales: false,
            eventFormat: 'GAMES',
            totalBales: parseInt(totalBalesEl?.value, 10) || 16,
            targetsPerBale: parseInt(targetsPerBaleEl?.value, 10) || 4
          });

          const eventId = result.eventId;
          currentEventId = eventId;

          // Step 2: Close modal
          modal.style.display = 'none';

          // Step 3: Ask to Import Roster immediately
          const doImport = confirm(
            `Games Event "${name}" created!\n\n` +
            `Import active archers from roster assignments now?\n\n` +
            `This reads S1-S4 (Solo) and T1-T2 (Team) assignments and creates Swiss brackets for each division.`
          );

          if (doImport) {
            await importRoster(eventId);
          } else {
            alert('Event created. You can import the roster later using the "Import Roster" button on the event card.');
          }

          loadEvents();
        } catch (err) {
          alert(`Error creating Games Event: ${err.message}`);
          console.error(err);
        } finally {
          const btn = document.getElementById('submit-event-btn');
          btn.disabled = false;
          btn.textContent = 'Create Event';
        }
        return; // Exit - don't fall through to Sanctioned path
      }

      // =========================================================
      // SANCTIONED / STANDARD EVENT PATH (existing flow)
      // =========================================================

      // Collect Configuration
      const config = {
        ranking: { enabled: document.getElementById('include-ranking').checked, divisions: [] },
        solo: { enabled: document.getElementById('include-solo').checked, type: null },
        team: { enabled: document.getElementById('include-team').checked, type: null, open: false }
      };

      // 1. Ranking Divisions
      if (config.ranking.enabled) {
        ['open', 'bvar', 'gvar', 'bjv', 'gjv'].forEach(d => {
          if (document.getElementById(`rank-div-${d}`).checked) config.ranking.divisions.push(d.toUpperCase());
        });
        if (config.ranking.divisions.length === 0) { alert('Select at least one Ranking division'); return; }
      }

      // 2. Solo Configuration
      if (config.solo.enabled) {
        config.solo.type = document.querySelector('input[name="solo-type"]:checked').value;
      }

      // 3. Team Configuration
      if (config.team.enabled) {
        config.team.type = document.querySelector('input[name="team-type"]:checked').value;
        config.team.open = document.getElementById('team-div-open').checked;
      }

      if (!config.ranking.enabled && !config.solo.enabled && !config.team.enabled) {
        alert('Please enable at least one component (Ranking, Solo, or Team)');
        return;
      }

      try {
        const btn = document.getElementById('submit-event-btn');
        btn.disabled = true;
        btn.textContent = 'Creating...';

        // Step 1: Create event
        const totalBalesEl = document.getElementById('total-bales');
        const targetsPerBaleEl = document.getElementById('targets-per-bale');
        const eventBody = {
          name,
          date,
          status,
          entryCode,
          eventType: 'manual',
          autoAssignBales: false
        };
        if (eventFormat) {
          eventBody.eventFormat = eventFormat;
        }
        const result = await req('/events', 'POST', eventBody);

        const eventId = result.eventId;
        currentEventId = eventId;

        let roundsCreated = false;

        // Step 2A: Create Ranking Rounds
        if (config.ranking.enabled) {
          await req(`/events/${eventId}/rounds`, 'POST', {
            divisions: config.ranking.divisions,
            roundType: 'R300'
          });
          roundsCreated = true;

          // Get created rounds to map division -> roundId
          const roundsResp = await req(`/events/${eventId}/rounds`, 'GET');
          const rounds = (roundsResp && roundsResp.rounds) || [];

          // Populate pendingDivisions for loop workflow
          pendingDivisions = config.ranking.divisions.slice(); // Copy array

          // Map division -> roundId
          divisionRounds = {};
          rounds.forEach(r => {
            divisionRounds[r.division] = r.id || r.roundId;
          });

          // Close create event modal
          modal.style.display = 'none';

          // Start division loop workflow to add archers
          await processNextDivision(name);
          return; // Don't call loadEvents() yet - processNextDivision will call it when loop completes
        }

        // Step 2B: Create Solo Swiss Rounds (if selected)
        // Note: Elimination brackets are created LATER from ranking data, so no round created now.
        if (config.solo.enabled && config.solo.type === 'SWISS') {
          // For Swiss, we create VAR and JV rounds (simplified divisions)
          // Check if Ranking is also enabled? If so, we might have duplication if we make rounds here.
          // DESIGN DECISION: Swiss Rounds are separate entities from Ranking Rounds.
          // We will create them as 'VAR-SWISS', 'JV-SWISS' to distinguish? 
          // LIMITATION: 'rounds' table key is (event_id, division). 
          // We cannot have 'VAR' (Ranking) and 'VAR' (Swiss) in same event if they share division code.
          // BUT Ranking uses 'BVAR/GVAR', Swiss uses 'VAR'. distinct codes. OK.

          await req(`/events/${eventId}/rounds`, 'POST', {
            divisions: ['VAR', 'JV'],
            roundType: 'SWISS'
          });
          roundsCreated = true;
        }

        // Step 2C: Create Team Swiss Rounds (if selected)
        if (config.team.enabled && config.team.type === 'SWISS') {
          if (config.team.open) {
            await req(`/events/${eventId}/rounds`, 'POST', {
              divisions: ['OPEN'], // This might conflict if Ranking also has OPEN
              // FIX: If Ranking OPEN exists, we can't create Team OPEN round yet without schema change.
              // For now, assume if Ranking OPEN exists, we use that? No, one is Target, one is Match.
              // WORKAROUND: Team rounds might need a distinct division code like 'T-OPEN'?
              // For this implementation, we will skip creating Team Round row for now and just rely on bracket logic later.
              // OR allow it if Ranking OPEN is NOT selected.
              roundType: 'SWISS'
            });
          }
        }

        // Refresh (if no ranking rounds were created, or if ranking workflow finished)
        modal.style.display = 'none';
        loadEvents();

      } catch (err) {
        alert(`Error creating event: ${err.message}`);
        console.error(err);
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

  /**
   * Import active archers into Swiss brackets based on assignment field.
   * S1-S8 go to Solo Swiss brackets, T1-T6 go to Team Swiss brackets.
   * @param {string} eventId - UUID of the Games Event
   */
  async function importRoster(eventId) {
    if (!confirm('Import active archers from assignments into Swiss brackets?\n\nThis will create Solo and Team Swiss brackets for each division based on archer assignment positions (S1-S4 = Solo, T1-T2 = Team).')) {
      return;
    }

    try {
      const result = await req(`/events/${eventId}/import-roster`, 'POST', {});

      let message = `Roster imported!\n\n`;
      message += `Brackets created: ${result.brackets?.length || 0}\n`;
      message += `Solo archers: ${result.totalSoloArchers || 0}\n`;
      message += `Teams: ${result.totalTeams || 0}\n`;

      if (result.brackets && result.brackets.length > 0) {
        message += `\nBrackets:\n`;
        result.brackets.forEach(b => {
          if (b.type === 'SOLO') {
            message += `  - Solo ${b.division}: ${b.archerCount} archers\n`;
          } else {
            message += `  - Team ${b.division}: ${b.teamCount} teams\n`;
          }
        });
      }

      if (result.warnings && result.warnings.length > 0) {
        message += `\nWarnings:\n`;
        result.warnings.forEach(w => { message += `  - ${w}\n`; });
      }

      alert(message);
      loadEvents();
    } catch (err) {
      alert(`Error importing roster: ${err.message}`);
      console.error('Import roster error:', err);
    }
  }

  function viewResults(eventId) {
    window.location.href = `results.html?event=${eventId}`;
  }

  function viewDashboard(eventId) {
    window.location.href = `event_dashboard.html?event=${eventId}`;
  }

  async function viewBrackets(eventId) {
    try {
      // Fetch brackets for the event
      const data = await req(`/events/${eventId}/brackets`);
      const brackets = data.brackets || [];

      if (brackets.length === 0) {
        // No brackets yet, go to event dashboard where they can create one
        window.location.href = `event_dashboard.html?event=${eventId}`;
        return;
      }

      // Navigate to the first bracket's results page
      const firstBracket = brackets[0];
      window.location.href = `bracket_results.html?bracket=${firstBracket.id}`;
    } catch (err) {
      console.error('Error loading brackets:', err);
      // On error, fallback to event dashboard
      window.location.href = `event_dashboard.html?event=${eventId}`;
    }
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
    let color = '#f1c40f'; // Yellow for PENDING
    let displayText = normalized;

    if (normalized === 'VER' || normalized === 'VERIFIED') {
      color = '#2ecc71'; // Green
      displayText = 'VER';
    } else if (normalized === 'VOID') {
      color = '#e74c3c'; // Red
      displayText = 'VOID';
    } else if (normalized === 'COMP' || normalized === 'COMPLETED') {
      color = '#3498db'; // Blue/Primary
      displayText = 'COMP';
    } else {
      displayText = 'PEND';
    }

    return `<span class="status-badge" style="background:${color};color:#fff;">${displayText}</span>`;
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

    // Handle solo/team matches
    if (verifyState?.matchType === 'solo-matches' || verifyState?.matchType === 'team-matches') {
      renderMatchesVerifyTable(container);
      return;
    }

    // Handle ranking rounds (original logic)
    if (!verifyState || !verifyState.snapshot) {
      container.innerHTML = '<p class="p-4 text-gray-500 dark:text-gray-400">No data loaded.</p>';
      return;
    }
    if (!verifyState.division) {
      container.innerHTML = '<p class="p-4 text-gray-500 dark:text-gray-400">Select a division to begin verification.</p>';
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

    // Use Unified Scorecard List pattern
    let html = `
      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
        <div class="scorecard-list-header verify-list-header grid gap-2 items-center bg-gray-200 dark:bg-gray-600 px-3 py-2 rounded font-semibold text-sm text-gray-800 dark:text-white" 
             style="grid-template-columns: minmax(0, 2fr) minmax(60px, 1fr) minmax(70px, 1fr) minmax(80px, 1fr) minmax(70px, 1fr) minmax(120px, 1fr);"
             data-columns="6">
          <div class="text-center">Archer</div>
          <div class="text-center">Ends</div>
          <div class="text-center">Total</div>
          <div class="text-center">Last Sync</div>
          <div class="text-center">Status</div>
          <div class="text-center">Actions</div>
        </div>
        <div class="mt-2 space-y-1">
    `;

    archers.forEach(a => {
      const status = (a.cardStatus || 'PENDING').toUpperCase();
      const locked = !!a.locked;
      const archerName = a.archerName || `${a.firstName || ''} ${a.lastName || ''}`.trim();
      const targetInfo = `Target ${a.target || '—'} • Bale ${a.bale || '—'}`;

      // Status badge
      let statusBadge = '';
      if (status === 'VER' || status === 'VERIFIED') {
        statusBadge = '<span class="inline-block px-2 py-1 rounded bg-success-light text-success-dark text-xs font-bold">VER</span>';
      } else if (status === 'VOID') {
        statusBadge = '<span class="inline-block px-2 py-1 rounded bg-danger-light text-danger-dark text-xs font-bold">VOID</span>';
      } else if (status === 'COMP' || status === 'COMPLETED') {
        statusBadge = '<span class="inline-block px-2 py-1 rounded bg-primary text-white text-xs font-bold">COMP</span>';
      } else {
        statusBadge = '<span class="inline-block px-2 py-1 rounded bg-warning-light text-warning-dark text-xs font-bold">PEND</span>';
      }

      // Actions
      let actions = '';
      const editUrl = `scorecard_editor.html?id=${a.roundArcherId}&mode=coach`;
      const editButton = `<a href="${editUrl}" class="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" title="Edit Scorecard">
        <i class="fas fa-edit"></i>
        <span>Edit</span>
      </a>`;

      if (status === 'VER' && locked) {
        actions = `
          <div class="flex gap-1 justify-center flex-wrap">
            ${editButton}
            <button class="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" data-action="unlock" data-round-archer-id="${a.roundArcherId}">Unlock</button>
          </div>
        `;
      } else if (status === 'VOID') {
        actions = `
          <div class="flex gap-1 justify-center flex-wrap">
            ${editButton}
            <button class="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" data-action="unlock" data-round-archer-id="${a.roundArcherId}">Reopen</button>
          </div>
        `;
      } else {
        actions = `
          <div class="flex gap-1 justify-center flex-wrap">
            ${editButton}
            <button class="px-2 py-1 bg-primary hover:bg-primary-dark text-white rounded text-xs font-semibold transition-colors" data-action="lock" data-round-archer-id="${a.roundArcherId}">Validate</button>
            <button class="px-2 py-1 bg-danger hover:bg-red-700 text-white rounded text-xs font-semibold transition-colors" data-action="void" data-round-archer-id="${a.roundArcherId}">Void</button>
          </div>
        `;
      }

      html += `
        <div class="scorecard-list-item verify-list-item grid gap-2 items-center bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600 px-3 py-2 min-h-[2.75rem] min-w-0 transition-all duration-200 sm:gap-2 sm:px-3 sm:py-2.5 sm:min-h-[3rem]"
             style="grid-template-columns: minmax(0, 2fr) minmax(60px, 1fr) minmax(70px, 1fr) minmax(80px, 1fr) minmax(70px, 1fr) minmax(120px, 1fr);"
             data-columns="6">
          <div class="flex flex-col gap-0.5 min-w-0 overflow-hidden">
            <div class="text-[13px] font-semibold text-gray-900 dark:text-white overflow-hidden text-ellipsis whitespace-nowrap leading-tight sm:text-sm">${archerName}</div>
            <div class="text-[11px] text-gray-600 dark:text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap leading-tight sm:text-xs">${targetInfo}</div>
          </div>
          <div class="text-[13px] font-semibold text-gray-900 dark:text-white text-center flex items-center justify-center min-w-0 whitespace-nowrap sm:text-sm">${a.endsCompleted || 0}</div>
          <div class="text-[15px] font-bold text-blue-600 dark:text-blue-400 text-center flex items-center justify-center min-w-0 whitespace-nowrap sm:text-base">${a.runningTotal || 0}</div>
          <div class="text-[11px] text-gray-600 dark:text-gray-400 text-center flex items-center justify-center min-w-0 whitespace-nowrap sm:text-xs">${formatTimestamp(a.lastSyncTime)}</div>
          <div class="text-center flex items-center justify-center min-w-0">${statusBadge}</div>
          <div class="text-center flex items-center justify-center min-w-0">${actions}</div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
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

  function renderMatchesVerifyTable(container) {
    if (!container) container = document.getElementById('verify-table-container');
    if (!container) return;

    if (!verifyState || !verifyState.matches || verifyState.matches.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center text-gray-500 dark:text-gray-400">
          <i class="fas fa-search text-4xl mb-3 opacity-50"></i>
          <p class="text-lg">No completed matches found.</p>
          <p class="text-sm mt-1">Try selecting a different bracket or event.</p>
        </div>
      `;
      return;
    }

    // Sort matches: Verified first, then by Match Code
    const sortedMatches = [...verifyState.matches].sort((a, b) => {
      // Prioritize "PENDING" (card_status != VRFD/VER/VERIFIED/VOID)
      const isVerifiedA = ['VRFD', 'VER', 'VERIFIED'].includes(a.card_status);
      const isVerifiedB = ['VRFD', 'VER', 'VERIFIED'].includes(b.card_status);
      const isVoidA = a.card_status === 'VOID';
      const isVoidB = b.card_status === 'VOID';

      const aPending = !isVerifiedA && !isVoidA;
      const bPending = !isVerifiedB && !isVoidB;

      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;
      return (a.match_code || '').localeCompare(b.match_code || '');
    });

    let html = `
      <div class="px-4 pb-2">
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">`;

    sortedMatches.forEach(match => {
      const matchType = verifyState.matchType === 'solo-matches' ? 'solo' : 'team';
      // Allow legacy 'VER' or 'VERIFIED' status codes from backend
      const isVerified = ['VRFD', 'VER', 'VERIFIED'].includes(match.card_status);
      const isVoid = match.card_status === 'VOID';

      let cardStatusBadge = '';
      if (isVerified) {
        cardStatusBadge = `<span class="inline-block px-2 py-1 text-xs font-bold rounded bg-success-light text-success-dark"><i class="fas fa-check-circle mr-1"></i>VERIFIED</span>`;
      } else if (isVoid) {
        cardStatusBadge = `<span class="inline-block px-2 py-1 text-xs font-bold rounded bg-gray-200 text-gray-600">VOID</span>`;
      } else if (match.status === 'Completed') {
        // Only show Ready to Verify for actually completed matches
        cardStatusBadge = `<span class="inline-block px-2 py-1 text-xs font-bold rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">READY TO VERIFY</span>`;
      } else {
        // Fallback for In Progress / Not Started if they somehow get loaded
        cardStatusBadge = `<span class="inline-block px-2 py-1 text-xs font-bold rounded bg-gray-100 text-gray-500 border border-gray-200">${match.status || 'Pending'}</span>`;
      }

      // Edit Button (Consistent across all states)
      let editButton = '';
      if (matchType === 'solo' && match.id) {
        const editUrl = `scorecard_editor.html?match=${match.id}&mode=coach`;
        editButton = `
            <a href="${editUrl}" class="flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" title="Edit Match">
                <i class="fas fa-edit"></i>
            </a>
         `;
      }

      // Actions
      let actionButtons = '';
      if (isVerified || isVoid) {
        actionButtons = `
            <div class="flex gap-2">
                <button class="px-3 py-1 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 bg-transparent border border-gray-300 dark:border-gray-600 rounded" data-action="unlock" data-match-id="${match.id}" data-match-type="${matchType}">
                    Unlock
                </button>
            </div>
          `;
      } else {
        actionButtons = `
            <button class="flex-1 bg-success hover:bg-success-dark text-white font-bold py-2 px-3 rounded shadow-sm transition-colors flex items-center justify-center gap-2" data-action="lock" data-match-id="${match.id}" data-match-type="${matchType}">
                 <i class="fas fa-check"></i> Verify
            </button>
            <button class="flex-1 bg-danger hover:bg-danger-dark text-white font-bold py-2 px-3 rounded shadow-sm transition-colors flex items-center justify-center gap-2" data-action="void" data-match-id="${match.id}" data-match-type="${matchType}">
                 <i class="fas fa-ban"></i> Void
            </button>
          `;
      }

      // Determine match score for display
      let setsScore = '—';
      if (match.team1 && match.team2) {
        // Team Match Score
        const s1 = match.team1.sets_won !== undefined ? match.team1.sets_won : 0;
        const s2 = match.team2.sets_won !== undefined ? match.team2.sets_won : 0;
        setsScore = `${s1}-${s2}`;
      } else if (match.archer1_sets_won !== undefined && match.archer2_sets_won !== undefined) {
        // Solo Match Score
        setsScore = `${match.archer1_sets_won}-${match.archer2_sets_won}`;
      }

      // Format team names with division/position if available
      const team1Name = match.team1
        ? `${match.team1.team_name || match.team1.school} <span class="text-xs text-gray-500 font-normal">(${match.bracket_name ? match.bracket_name.split(' - ').pop() : ''}-T${match.team1.position})</span>`
        : 'Team 1';
      const team2Name = match.team2
        ? `${match.team2.team_name || match.team2.school} <span class="text-xs text-gray-500 font-normal">(${match.bracket_name ? match.bracket_name.split(' - ').pop() : ''}-T${match.team2.position})</span>`
        : 'Team 2';

      // Get archer names
      const getArcherNames = (team) => {
        if (!team || !team.archers || !Array.isArray(team.archers)) return '';
        return team.archers.map(a => a.archer_name.split(' ')[0]).join(', ');
      };
      const team1Archers = getArcherNames(match.team1);
      const team2Archers = getArcherNames(match.team2);

      // Determine display title
      const title = match.team1 && match.team2 ? `${team1Name} vs ${team2Name}` : (match.match_display || 'Match Details');
      const subTitle = match.team1 && match.team2
        ? `<div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
             <div><span class="font-bold text-primary">Team 1:</span> ${team1Archers}</div>
             <div><span class="font-bold text-primary">Team 2:</span> ${team2Archers}</div>
           </div>`
        : '';

      html += `
        <div class="bg-white dark:bg-gray-700 rounded-lg shadow border-l-4 ${isVerified ? 'border-l-success' : (isVoid ? 'border-l-gray-400' : 'border-l-blue-500')} border-y border-r border-gray-200 dark:border-gray-600 flex flex-col overflow-hidden ${isVerified ? 'opacity-75 hover:opacity-100 transition-opacity' : ''} ${isVoid ? 'opacity-60 grayscale hover:grayscale-0 transition-all' : ''}">
            <!-- Header -->
            <div class="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
                <div class="flex items-center gap-2">
                    ${match.match_code ? `<span class="font-mono text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 px-1.5 py-0.5 rounded">${match.match_code}</span>` : ''}
                </div>
                <div>${cardStatusBadge}</div>
            </div>

            <!-- Body -->
            <div class="p-3 flex-1">
                <h3 class="text-base font-bold text-gray-800 dark:text-white leading-tight mb-1">
                    ${title}
                </h3>
                ${subTitle}
                <div class="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">
                    ${match.bracket_name || 'Tournament Filter'}
                </div>
                ${setsScore !== '—' ? `<div class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Score: ${setsScore}</div>` : ''}
                
                ${match.winner_name ? `
                    <div class="mt-2 text-sm bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded border border-green-100 dark:border-green-900 inline-block">
                        <span class="text-gray-500 dark:text-gray-400 text-xs">Winner:</span> 
                        <span class="font-bold text-success-dark dark:text-success-light">${match.winner_name}</span>
                    </div>
                ` : ''}
                
                ${match.verified_by ? `
                    <div class="mt-2 text-xs text-gray-400">
                        Verified by ${match.verified_by} • ${formatTimestamp(match.verified_at)}
                    </div>
                ` : ''}
            </div>

            <!-- Actions Footer -->
            <div class="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center gap-3">
                 ${isVerified ? '<span class="text-xs text-gray-400 italic">No actions needed</span>' : ''}
                 ${isVoid ? '<span class="text-xs text-gray-400 italic">Match Voided</span>' : ''}
                 
                 <div class="flex gap-2 w-full justify-end items-center">
                    ${editButton} 
                    ${actionButtons}
                 </div>
            </div>
        </div>
      `;
    });

    html += `</div>`;
    // Spacer for bottom safe area
    html += `<div class="h-8 md:hidden"></div>`;

    container.innerHTML = html;

    // Add action handlers for match verification (Event Delegation Re-attachment)
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.onclick = async (e) => {
        const action = e.currentTarget.dataset.action;
        const matchId = e.currentTarget.dataset.matchId;
        const matchType = e.currentTarget.dataset.matchType;
        if (!matchId) return;

        if (action === 'void') {
          const confirmVoid = confirm('Mark this match as VOID? This hides it from results until reopened.');
          if (!confirmVoid) return;
        }
        if (action === 'unlock') {
          const confirmUnlock = confirm('Unlock this match for edits? Verification status will reset.');
          if (!confirmUnlock) return;
        }

        try {
          const { verifiedBy, notes } = getVerifyInputs();
          if (!verifiedBy && action !== 'unlock') {
            alert('Enter who is verifying the match before proceeding.');
            return;
          }
          await req(`/${matchType}-matches/${matchId}/verify`, 'POST', {
            action,
            verifiedBy,
            notes
          });
          await loadMatchesForVerification();
          renderVerifyTable();
        } catch (err) {
          alert(`Verification error: ${err.message}`);
        }
      };
    });
  }

  function formatMatchStatus(status) {
    const statusMap = {
      'Not Started': '<span class="px-2 py-1 bg-gray-400 text-white rounded text-xs font-semibold">Not Started</span>',
      'In Progress': '<span class="px-2 py-1 bg-yellow-500 text-white rounded text-xs font-semibold">In Progress</span>',
      'Completed': '<span class="px-2 py-1 bg-primary text-white rounded text-xs font-semibold">Completed</span>',
      'Voided': '<span class="px-2 py-1 bg-gray-500 text-white rounded text-xs font-semibold">Voided</span>'
    };
    return statusMap[status] || `<span class="px-2 py-1 bg-gray-400 text-white rounded text-xs font-semibold">${status}</span>`;
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
      snapshot: null,
      matchType: 'ranking-rounds', // 'ranking-rounds', 'solo-matches', 'team-matches'
      eventIdForMatches: event.id, // Pre-select current event for solo/team matches
      bracketId: null, // For solo/team matches
      eventsWithBrackets: [],
      matches: [],
      matchesSummary: {}
    };
    const modal = document.getElementById('verify-modal');
    document.getElementById('verify-modal-title').textContent = `Verify Scorecards — ${event.name}`;
    document.getElementById('verify-actor-input').value = '';
    document.getElementById('verify-notes-input').value = '';

    // Set default match type to ranking-rounds and update radio button
    const rankingRadio = document.querySelector('input[name="verify-type-selector"][value="ranking-rounds"]');
    if (rankingRadio) rankingRadio.checked = true;
    updateVerifyMatchType('ranking-rounds');

    try {
      await loadVerifySnapshot();
      populateVerifySelectors();
      renderVerifyTable();
      modal.style.display = 'flex';
    } catch (err) {
      alert(`Unable to load verification data: ${err.message}`);
    }

    // Radio buttons have inline onclick handlers in HTML, but we re-attach to be safe
    document.querySelectorAll('input[name="verify-type-selector"]').forEach(radio => {
      radio.onchange = (e) => updateVerifyMatchType(e.target.value);
    });


    const divisionSelect = document.getElementById('verify-division-select');
    const baleSelect = document.getElementById('verify-bale-select');
    const eventSelect = document.getElementById('verify-event-select');
    const bracketSelect = document.getElementById('verify-bracket-select');
    const refreshBtn = document.getElementById('verify-refresh-btn');
    const closeBtn = document.getElementById('verify-modal-close-btn');
    const thisBaleBtn = document.getElementById('verify-this-bale-btn');
    const allBalesBtn = document.getElementById('verify-all-bales-btn');

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

    // Event selector handler for solo/team matches
    if (eventSelect) {
      eventSelect.onchange = async () => {
        verifyState.eventIdForMatches = eventSelect.value || null;
        verifyState.bracketId = null;
        populateBracketSelector();
        await loadMatchesForVerification();
        renderVerifyTable();
      };
    }

    // Bracket selector handler for solo/team matches
    if (bracketSelect) {
      bracketSelect.onchange = async () => {
        verifyState.bracketId = bracketSelect.value || null;
        await loadMatchesForVerification();
        renderVerifyTable();
      };
    }

    refreshBtn.onclick = async () => {
      try {
        if (verifyState.matchType === 'ranking-rounds') {
          await loadVerifySnapshot();
          populateVerifySelectors();
        } else {
          await loadEventsWithBrackets();
          populateMatchSelectors();
          await loadMatchesForVerification();
        }
        renderVerifyTable();
      } catch (err) {
        alert(`Refresh failed: ${err.message}`);
      }
    };

    closeBtn.onclick = () => {
      modal.style.display = 'none';
    };

    thisBaleBtn.onclick = () => {
      handleLockAllForBale();
    };

    allBalesBtn.onclick = () => {
      handleVerifyAndCloseRound();
    };
  }



  // Update verification UI based on match type selection
  async function updateVerifyMatchType(matchType) {
    if (!verifyState) return;

    verifyState.matchType = matchType;
    verifyState.bracketId = undefined; // Clear bracket selection when changing types
    const rankingSelectors = document.getElementById('verify-ranking-selectors');
    const matchSelectors = document.getElementById('verify-match-selectors');

    if (matchType === 'ranking-rounds') {
      rankingSelectors.classList.remove('hidden');
      matchSelectors.classList.add('hidden');

      // Load ranking round data
      try {
        await loadVerifySnapshot();
        populateVerifySelectors();
        renderVerifyTable();
      } catch (err) {
        console.error('Error loading ranking round snapshot:', err);
      }
    } else {
      // Solo or Team matches
      rankingSelectors.classList.add('hidden');
      matchSelectors.classList.remove('hidden');

      // Load events with brackets
      await loadEventsWithBrackets();
      populateMatchSelectors();

      // Load matches for current event/bracket
      if (verifyState.eventIdForMatches) {
        await loadMatchesForVerification();
      }
      renderVerifyTable();
    }
  }
  // Expose to window for radio button onclick handlers
  window.setVerifyMatchType = updateVerifyMatchType;

  // Load events that have brackets
  async function loadEventsWithBrackets() {
    try {
      const eventsRes = await req('/events/recent', 'GET');
      const events = eventsRes.events || [];

      // Filter to only events with brackets
      const eventsWithBrackets = [];
      for (const event of events) {
        try {
          const bracketsRes = await fetch(`${API_BASE}/events/${event.id}/brackets`);
          if (bracketsRes.ok) {
            const bracketsData = await bracketsRes.json();
            const brackets = bracketsData.brackets || [];
            const matchType = verifyState.matchType === 'solo-matches' ? 'SOLO' : 'TEAM';
            const hasBrackets = brackets.some(b => b.bracket_type === matchType);
            if (hasBrackets) {
              eventsWithBrackets.push({ ...event, brackets });
            }
          }
        } catch (err) {
          console.error(`Error loading brackets for event ${event.id}:`, err);
        }
      }

      verifyState.eventsWithBrackets = eventsWithBrackets;

      // Set default event if not set
      if (!verifyState.eventIdForMatches && eventsWithBrackets.length > 0) {
        verifyState.eventIdForMatches = eventsWithBrackets[0].id;
      }
    } catch (err) {
      console.error('Error loading events with brackets:', err);
      verifyState.eventsWithBrackets = [];
    }
  }

  // Populate event and bracket selectors for solo/team matches
  function populateMatchSelectors() {
    const eventSelect = document.getElementById('verify-event-select');
    const bracketSelect = document.getElementById('verify-bracket-select');

    if (!eventSelect || !bracketSelect) return;

    // Populate event selector
    eventSelect.innerHTML = '<option value="">Select Event...</option>';
    const events = verifyState.eventsWithBrackets || [];

    // Check if we should hide the event selector (context already set)
    if (verifyState.eventIdForMatches) {
      eventSelect.parentElement.classList.add('hidden');
    } else {
      eventSelect.parentElement.classList.remove('hidden');
    }

    events.forEach(event => {
      const option = document.createElement('option');
      option.value = event.id;
      option.textContent = `${event.name} (${event.date})`;
      if (event.id === verifyState.eventIdForMatches) {
        option.selected = true;
      }
      eventSelect.appendChild(option);
    });

    // Populate bracket selector
    populateBracketSelector();
  }

  // Populate bracket selector based on selected event
  function populateBracketSelector() {
    const bracketSelect = document.getElementById('verify-bracket-select');
    if (!bracketSelect || !verifyState.eventIdForMatches) {
      if (bracketSelect) bracketSelect.innerHTML = '<option value="">Select Event First</option>';
      return;
    }

    const event = verifyState.eventsWithBrackets?.find(e => e.id === verifyState.eventIdForMatches);
    if (!event || !event.brackets) {
      bracketSelect.innerHTML = '<option value="">No Brackets Found</option>';
      return;
    }

    const matchType = verifyState.matchType === 'solo-matches' ? 'SOLO' : 'TEAM';
    const brackets = event.brackets.filter(b => b.bracket_type === matchType);

    bracketSelect.innerHTML = '<option value="">All Brackets</option>';
    brackets.forEach(bracket => {
      const option = document.createElement('option');
      option.value = bracket.id;
      const formatName = bracket.bracket_format === 'ELIMINATION' ? 'Elimination' : 'Swiss';
      option.textContent = `${formatName} - ${bracket.division || 'N/A'}`;
      if (bracket.id === verifyState.bracketId) {
        option.selected = true;
      }
      bracketSelect.appendChild(option);
    });

    // Set default bracket if not set
    if (verifyState.bracketId === undefined) {
      verifyState.bracketId = '';
      bracketSelect.value = '';
    }
  }

  // Load solo or team matches for verification
  async function loadMatchesForVerification() {
    if (!verifyState.eventIdForMatches) {
      verifyState.matches = [];
      return;
    }

    try {
      const matchType = verifyState.matchType === 'solo-matches' ? 'solo' : 'team';
      const url = `/events/${verifyState.eventIdForMatches}/${matchType}-matches`;
      const params = new URLSearchParams();
      if (verifyState.bracketId) {
        params.append('bracket_id', verifyState.bracketId);
      }
      params.append('status', 'Completed'); // Only show completed matches for verification

      const queryString = params.toString();
      const fullUrl = queryString ? `${url}?${queryString}` : url;
      const matchesRes = await req(fullUrl, 'GET');
      verifyState.matches = matchesRes.matches || [];
      verifyState.matchesSummary = matchesRes.summary || {};
    } catch (err) {
      console.error('Error loading matches for verification:', err);
      verifyState.matches = [];
      verifyState.matchesSummary = {};
    }
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

    // Set status filter to 'active' by default (if not already set)
    const statusFilter = document.getElementById('filter-status');
    if (statusFilter && !statusFilter.value) {
      statusFilter.value = 'active';
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
    ['filter-status', 'filter-school', 'filter-gender', 'filter-level'].forEach(id => {
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

      newSelectAllBtn.addEventListener('click', function (e) {
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
      const data = await req('/archers?status=all');
      allArchers = data.archers || [];
      console.log(`Loaded ${allArchers.length} archers from master list`);
      return allArchers;
    } catch (err) {
      console.error('Error loading archers:', err);
      throw err;
    }
  }

  /**
   * Add archers to an event's division rounds.
   * GAMES events use brackets (not division rounds), so this function is not applicable.
   * @param {string} eventId - Event UUID
   * @param {string} eventName - Display name
   * @param {string} [eventFormat] - Event format ('GAMES', 'SANCTIONED', or null)
   */
  async function addArchersToEvent(eventId, eventName, eventFormat) {
    // GAMES events use Swiss brackets, not division rounds
    if (eventFormat === 'GAMES') {
      alert(
        'Games Events use Swiss brackets, not division rounds.\n\n' +
        'To add archers, use "Import Roster" to update bracket entries from roster assignments.'
      );
      return;
    }

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
    const statusFilter = document.getElementById('filter-status')?.value || '';
    const schoolFilter = document.getElementById('filter-school')?.value || '';
    const genderFilter = document.getElementById('filter-gender')?.value || '';
    const levelFilter = document.getElementById('filter-level')?.value || '';

    // Filter archers by status, school, gender, and level (AND logic - must match all)
    // Search filtering is handled by ArcherSelector.setFilter()
    const filtered = allArchers.filter(archer => {
      // Status filter (defaults to 'active' if not set)
      if (statusFilter) {
        const archerStatus = (archer.status || 'active').toLowerCase();
        if (archerStatus !== statusFilter.toLowerCase()) return false;
      }

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

          // Get all archers from database (include inactive for full export)
          let response;
          try {
            response = await req('/archers?status=all', 'GET');
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

    // Check for query params
    const urlParams = new URLSearchParams(window.location.search);
    const bracketToEdit = urlParams.get('editBracket');
    if (bracketToEdit) {
      editBracket(bracketToEdit);
    }

    const rosterRoundId = urlParams.get('manageRoster');
    if (rosterRoundId) {
      const roundName = urlParams.get('roundName') || 'Round Roster';
      // Clean up URL without reload
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.pushState({ path: newUrl }, '', newUrl);

      openManageRoster(rosterRoundId, roundName);
    }

    const eventToVerify = urlParams.get('verifyEvent');
    if (eventToVerify) {
      // Clean up URL without reload
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.pushState({ path: newUrl }, '', newUrl);

      // Fetch event and open verify modal
      req(`/events/${eventToVerify}/snapshot`)
        .then(data => {
          if (data && data.event) {
            verifyEvent(encodeURIComponent(JSON.stringify(data.event)));
          }
        })
        .catch(err => {
          console.error('[Coach] Failed to load event for verification:', err);
          alert('Could not load event for verification');
        });
    }

    // Setup roster modal event listeners
    setupRosterModalListeners();

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

        const roundId = round.roundId || round.id;
        roundsHTML += `
          <div style="padding: 0.5rem; background: white; border: 1px solid #ddd; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>${round.division || 'N/A'}</strong> - ${round.roundType || 'R300'}
              ${assignmentBadge}
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="font-size: 0.85rem; color: #7f8c8d;">
                ${round.archerCount || 0} archers
              </div>
              <button class="print-scorecards-btn" data-round-id="${roundId}" data-round-division="${round.division || ''}" data-round-type="${round.roundType || 'R300'}" style="padding: 0.25rem 0.5rem; background: #0d6efd; color: white; border: none; border-radius: 3px; font-size: 0.75rem; cursor: pointer; white-space: nowrap;">📄 Print</button>
            </div>
          </div>
        `;
      });
      roundsHTML += '</div>';

      roundsList.innerHTML = roundsHTML;

      // Wire up print scorecards buttons
      roundsList.querySelectorAll('.print-scorecards-btn').forEach(btn => {
        btn.onclick = async () => {
          const roundId = btn.getAttribute('data-round-id');
          const division = btn.getAttribute('data-round-division');
          const roundType = btn.getAttribute('data-round-type');

          if (!roundId) {
            alert('Round ID missing');
            return;
          }

          try {
            btn.disabled = true;
            btn.textContent = 'Generating...';

            if (typeof PrintableScorecards === 'undefined' || typeof PrintableScorecards.generateScorecardsPDF !== 'function') {
              alert('Print scorecards module not loaded. Please refresh the page.');
              return;
            }

            await PrintableScorecards.generateScorecardsPDF(
              roundId,
              eventId,
              {
                eventName: event.name || '',
                division: division,
                roundType: roundType,
                date: event.date || ''
              },
              API_BASE
            );
          } catch (err) {
            console.error('Error generating scorecards:', err);
            alert('Error generating scorecards: ' + err.message);
          } finally {
            btn.disabled = false;
            btn.textContent = '📄 Print Scorecards';
          }
        };
      });
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
    const addArchersBtn = document.getElementById('edit-add-archers-btn');
    if (addArchersBtn) {
      addArchersBtn.onclick = async () => {
        try {
          // Close edit event modal before opening add archers modal
          modal.style.display = 'none';
          await addArchersToEvent(event.id, event.name, event.event_format);
        } catch (err) {
          console.error('Error opening Add Archers modal:', err);
          alert('Error opening Add Archers: ' + err.message);
          // Re-open edit modal on error
          modal.style.display = 'flex';
        }
      };
    }

    // Bale Settings button - opens Bale Settings modal
    document.getElementById('edit-bale-settings-btn').onclick = () => {
      manageBales(event.id, event.name);
    };

    // Print Bale Assignments button
    document.getElementById('edit-print-bale-assignments-btn').onclick = () => {
      showBaleAssignmentsPrint(event.id, event.name, event.date, event.event_format);
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

  // ==================== Bale Assignments Print ====================

  /** Division code to display name mapping */
  const DIVISION_LABELS = {
    BVAR: 'Boys Varsity',
    GVAR: 'Girls Varsity',
    BJV: 'Boys JV',
    GJV: 'Girls JV',
    OPEN: 'Open (Mixed)'
  };

  /**
   * Build a slot block HTML (photo + name when available).
   * @param {string} target - A, B, C, or D
   * @param {string} name - Archer name
   * @param {string|null} photoUrl - Full URL to photo (or null)
   * @param {string} baseUrl - Origin for relative URLs
   * @returns {string} HTML string
   */
  function buildSlotHtml(target, name, photoUrl, baseUrl) {
    const n = name || '—';
    const imgSrc = photoUrl ? (photoUrl.startsWith('http') ? photoUrl : baseUrl + photoUrl) : '';
    const imgHtml = imgSrc
      ? `<img src="${imgSrc}" alt="${n}" class="bale-slot-photo" onerror="this.style.display='none'">`
      : '';
    return `
      <div class="bale-slot">
        <div class="bale-slot-label">${target}</div>
        ${imgHtml}
        <div class="bale-slot-name">${escapeHtml(n)}</div>
      </div>
    `;
  }

  /** Escape HTML for safe insertion */
  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  /**
   * Open bale assignments in a new window (standalone HTML) for correct print output.
   * For Games Events (Swiss brackets), pulls bale data from match assignments.
   * For Sanctioned Events (Ranking Rounds), pulls from the event snapshot.
   * @param {string} eventId - Event ID
   * @param {string} eventName - Event name
   * @param {string} eventDate - Event date (YYYY-MM-DD)
   * @param {string} [eventFormat] - Event format (GAMES or SANCTIONED)
   */
  async function showBaleAssignmentsPrint(eventId, eventName, eventDate, eventFormat) {
    const baseUrl = window.location.origin;
    const dateStr = eventDate ? new Date(eventDate + 'T00:00:00').toLocaleDateString() : '';

    try {
      // Games Events: build bale view from match data
      if (eventFormat === 'GAMES') {
        const [soloData, teamData] = await Promise.all([
          req(`/events/${eventId}/solo-matches`),
          req(`/events/${eventId}/team-matches`)
        ]);

        const soloMatches = soloData.matches || [];
        const teamMatches = teamData.matches || [];

        if (soloMatches.length === 0 && teamMatches.length === 0) {
          alert('No matches with bale assignments yet. Import roster and generate rounds first.');
          return;
        }

        // Find latest round
        let maxRound = 0, maxRoundLabel = '';
        soloMatches.forEach(m => {
          const rm = (m.bracket_match_id || '').match(/Round\s+(\d+)/i);
          if (rm) { const rn = parseInt(rm[1]); if (rn > maxRound) { maxRound = rn; maxRoundLabel = m.bracket_match_id; } }
        });
        teamMatches.forEach(m => {
          const rm = (m.bracket_match_id || '').match(/Round\s+(\d+)/i);
          if (rm) { const rn = parseInt(rm[1]); if (rn > maxRound) { maxRound = rn; maxRoundLabel = m.bracket_match_id; } }
        });

        const filteredSolo = maxRoundLabel ? soloMatches.filter(m => m.bracket_match_id === maxRoundLabel) : soloMatches;
        const filteredTeam = maxRoundLabel ? teamMatches.filter(m => m.bracket_match_id === maxRoundLabel) : teamMatches;

        // Build bale map
        const bales = {};
        filteredSolo.forEach(m => {
          const bn = m.bale_number;
          if (!bn) return;
          if (!bales[bn]) bales[bn] = {};
          const lk = `line${m.line_number || 1}`;
          const a1 = m.archer1 || {};
          const a2 = m.archer2 || {};
          const tgts = m.line_number === 2 ? ['C', 'D'] : ['A', 'B'];
          bales[bn][lk] = {
            bracketName: m.bracket_name || '',
            slots: [
              { target: a1.target_assignment || tgts[0], name: a1.archer_name || '—', school: a1.school || '' },
              { target: a2.target_assignment || tgts[1], name: a2.archer_name || '—', school: a2.school || '' }
            ]
          };
        });
        filteredTeam.forEach(m => {
          const bn = m.bale_number;
          if (!bn) return;
          if (!bales[bn]) bales[bn] = {};
          const lk = `line${m.line_number || 1}`;
          const t1 = m.team1 || {};
          const t2 = m.team2 || {};
          const tgts = m.line_number === 2 ? ['C', 'D'] : ['A', 'B'];
          bales[bn][lk] = {
            bracketName: m.bracket_name || '',
            slots: [
              { target: tgts[0], name: t1.team_name || t1.school || '—', school: t1.school || '', archers: (t1.archers || []).map(a => a.archer_name).join(', ') },
              { target: tgts[1], name: t2.team_name || t2.school || '—', school: t2.school || '', archers: (t2.archers || []).map(a => a.archer_name).join(', ') }
            ]
          };
        });

        const baleNumbers = Object.keys(bales).map(Number).sort((a, b) => a - b);
        if (baleNumbers.length === 0) {
          alert('No bale assignments found for matches. Check that rounds have been generated.');
          return;
        }

        let bodyHtml = `<div class="round-label">${escapeHtml(maxRoundLabel || 'All Matches')}</div>`;
        bodyHtml += '<div class="bales-grid">';
        for (const bn of baleNumbers) {
          const bd = bales[bn];
          bodyHtml += `<div class="bale-block"><div class="bale-header">BALE ${bn}</div><div class="bale-lines">`;
          for (const lineNum of [1, 2]) {
            const ld = bd[`line${lineNum}`];
            const lineLabel = lineNum === 1 ? 'Line 1 (A/B)' : 'Line 2 (C/D)';
            if (ld) {
              bodyHtml += `<div class="bale-line"><div class="line-label">${lineLabel} <span class="bracket-name">${escapeHtml(ld.bracketName)}</span></div><div class="bale-slots">`;
              for (const s of ld.slots) {
                const archersHtml = s.archers ? `<div class="bale-slot-archers">${escapeHtml(s.archers)}</div>` : '';
                bodyHtml += `<div class="bale-slot"><div class="bale-slot-label">${s.target}</div><div class="bale-slot-name">${escapeHtml(s.name)}</div><div class="bale-slot-school">${escapeHtml(s.school)}</div>${archersHtml}</div>`;
              }
              bodyHtml += '</div></div>';
            } else {
              bodyHtml += `<div class="bale-line empty"><div class="line-label">${lineLabel}</div><div class="empty-text">— empty —</div></div>`;
            }
          }
          bodyHtml += '</div></div>';
        }
        bodyHtml += '</div>';

        const fullHtml = buildBaleAssignmentsPrintPage(eventName, dateStr, bodyHtml, true);
        const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
        if (win) { win.document.write(fullHtml); win.document.close(); }
        else { alert('Pop-up blocked. Please allow pop-ups for this site.'); }
        return;
      }

      // Sanctioned Events: original snapshot-based approach
      const [data, archersResp] = await Promise.all([
        req(`/events/${eventId}/snapshot`),
        fetch(`${API_BASE}/archers`).then(r => r.ok ? r.json() : { archers: [] })
      ]);

      const divisions = data.divisions || {};
      const photoUrlMap = {};
      (archersResp.archers || []).forEach(a => {
        if (a.id && a.photoUrl) photoUrlMap[a.id] = a.photoUrl;
      });

      if (Object.keys(divisions).length === 0) {
        alert('No divisions with archers yet. Add archers to see bale assignments.');
        return;
      }

      let bodyHtml = '';
      for (const [divCode, divData] of Object.entries(divisions)) {
        const label = DIVISION_LABELS[divCode] || divCode;
        const archers = divData.archers || [];

        const bales = {};
        for (const a of archers) {
          const bale = a.bale || a.baleNumber || a.bale_number || 0;
          if (!bales[bale]) bales[bale] = { A: {}, B: {}, C: {}, D: {} };
          const target = (a.target || a.targetAssignment || a.target_assignment || 'A').toUpperCase().charAt(0);
          const name = a.archerName || [a.firstName || a.first_name, a.lastName || a.last_name].filter(Boolean).join(' ') || '—';
          const archerId = a.archerId || a.archer_id;
          if (['A', 'B', 'C', 'D'].includes(target)) {
            bales[bale][target] = { name, photoUrl: photoUrlMap[archerId] || null };
          }
        }

        const baleNumbers = Object.keys(bales).map(Number).sort((a, b) => a - b);
        bodyHtml += `<div class="division-section">`;
        bodyHtml += `<h2 class="division-title">DIVISION ${escapeHtml(label.toUpperCase())}</h2>`;
        bodyHtml += `<div class="bales-grid">`;

        for (const baleNum of baleNumbers) {
          const slots = bales[baleNum];
          bodyHtml += `<div class="bale-block">`;
          bodyHtml += `<div class="bale-header">BALE ${baleNum}</div>`;
          bodyHtml += `<div class="bale-slots">`;
          for (const t of ['A', 'B', 'C', 'D']) {
            const s = slots[t] || {};
            bodyHtml += buildSlotHtml(t, s.name, s.photoUrl || null, baseUrl);
          }
          bodyHtml += `</div></div>`;
        }
        bodyHtml += `</div></div>`;
      }

      const fullHtml = buildBaleAssignmentsPrintPage(eventName, dateStr, bodyHtml, false);
      const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
      if (win) { win.document.write(fullHtml); win.document.close(); }
      else { alert('Pop-up blocked. Please allow pop-ups for this site.'); }
    } catch (err) {
      console.error('Error loading bale assignments:', err);
      alert('Error loading bale assignments: ' + err.message);
    }
  }

  /**
   * Builds the full HTML page for bale assignments print view.
   * @param {string} eventName - Event name
   * @param {string} dateStr - Formatted date string
   * @param {string} bodyHtml - Inner HTML content
   * @param {boolean} isGamesFormat - Whether this is a Games Event (match-based layout)
   * @returns {string} Complete HTML document
   */
  function buildBaleAssignmentsPrintPage(eventName, dateStr, bodyHtml, isGamesFormat) {
    const extraStyles = isGamesFormat ? `
    .round-label { font-size: 1.1rem; font-weight: 700; color: #374151; margin-bottom: 1rem; }
    .bale-block { flex: 0 0 240px; width: 240px; }
    .bale-lines { }
    .bale-line { padding: 0.375rem 0.5rem; }
    .bale-line + .bale-line { border-top: 1px dashed #d1d5db; }
    .bale-line.empty .empty-text { text-align: center; color: #d1d5db; font-size: 0.75rem; padding: 0.25rem; }
    .line-label { font-size: 0.65rem; color: #6b7280; margin-bottom: 0.25rem; }
    .bracket-name { font-weight: 400; font-size: 0.6rem; color: #9ca3af; }
    .bale-slot-school { font-size: 0.65rem; color: #9ca3af; }
    .bale-slot-archers { font-size: 0.6rem; color: #9ca3af; }
    ` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bale Assignments - ${escapeHtml(eventName || 'Event')}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 1rem; color: #1f2937; max-width: 100%; }
    .header { margin-bottom: 1.5rem; }
    .header h1 { font-size: 1.5rem; margin: 0; }
    .header .date { font-size: 1rem; color: #6b7280; margin-top: 0.25rem; }
    .division-section { margin-bottom: 2rem; break-inside: avoid; }
    .division-title { font-size: 1rem; font-weight: 700; border-bottom: 2px solid #9ca3af; padding-bottom: 0.5rem; margin: 0 0 1rem; }
    .bales-grid { display: flex; flex-wrap: wrap; gap: 1rem; }
    .bale-block { flex: 0 0 160px; width: 160px; min-width: 0; overflow: hidden; border: 2px solid #9ca3af; border-radius: 0.5rem; padding: 0.5rem; background: #f9fafb; }
    .bale-header { font-size: 0.75rem; font-weight: 700; color: #6b7280; margin-bottom: 0.5rem; }
    .bale-slots { display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem; }
    .bale-slot { min-width: 0; overflow: hidden; border: 1px solid #d1d5db; border-radius: 0.25rem; padding: 0.375rem; text-align: center; min-height: 2.5rem; background: white; }
    .bale-slot-label { font-size: 0.7rem; color: #6b7280; }
    .bale-slot-photo { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; margin: 0.25rem auto; display: block; }
    .bale-slot-name { font-size: 0.75rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .print-actions { margin-top: 1.5rem; display: flex; gap: 0.5rem; }
    .btn { padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer; font-size: 0.875rem; }
    .btn-print { background: #2563eb; color: white; }
    .btn-close { background: #e5e7eb; color: #374151; }
    @media print { .print-actions { display: none !important; } }
    ${extraStyles}
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(eventName || 'Event')}</h1>
    <div class="date">${escapeHtml(dateStr)}</div>
  </div>
  ${bodyHtml}
  <div class="print-actions">
    <button class="btn btn-print" onclick="window.print()">Print</button>
    <button class="btn btn-close" onclick="window.close()">Close</button>
  </div>
</body>
</html>`;
  }

  // ==================== QR Code Display ====================

  function showQRCode(encodedEventData) {
    const event = JSON.parse(decodeURIComponent(encodedEventData));

    const modal = document.getElementById('qr-code-modal');
    const qrContainer = document.getElementById('qr-code-container');
    const urlDisplay = document.getElementById('qr-url-display');
    const eventNameDisplay = document.getElementById('qr-event-name');

    // Build the URL
    const baseUrl = window.location.origin + window.location.pathname.replace('coach.html', '');
    const fullUrl = `${baseUrl}event_dashboard.html?event=${event.id}`;

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
    let formatSelect = document.getElementById('bracket-format');
    const divisionSelect = document.getElementById('bracket-division');
    const sizeInput = document.getElementById('bracket-size');

    // Reset form
    typeSelect.value = 'SOLO';
    formatSelect.value = 'ELIMINATION';
    divisionSelect.value = 'BV';
    sizeInput.value = '8';

    modal.style.display = 'flex';

    // Update size input based on format and division
    const updateSizeInput = async () => {
      if (formatSelect.value === 'ELIMINATION') {
        sizeInput.value = '8';
        sizeInput.disabled = true;
        sizeInput.removeAttribute('max');
      } else {
        // Swiss bracket - set max based on division archer count
        sizeInput.disabled = false;
        sizeInput.min = '4';

        // Get archer count for selected division
        try {
          const eventResponse = await req(`/events/${currentEditEventId}`, 'GET');
          const division = divisionSelect.value;
          const divisionData = eventResponse.event?.divisions?.[division];

          if (divisionData && divisionData.archerCount) {
            const maxArchers = divisionData.archerCount;
            sizeInput.max = maxArchers;
            // Update help text if it exists
            const helpText = sizeInput.parentElement.querySelector('p');
            if (helpText) {
              helpText.textContent = `Elimination brackets are always 8. Swiss brackets limited to ${maxArchers} archers in ${division} division.`;
            }
          } else {
            // Fallback: remove max if we can't determine count
            sizeInput.removeAttribute('max');
            const helpText = sizeInput.parentElement.querySelector('p');
            if (helpText) {
              helpText.textContent = 'Elimination brackets are always 8. Swiss brackets limited only by number of archers in the division.';
            }
          }
        } catch (err) {
          console.warn('Could not load division archer count:', err);
          sizeInput.removeAttribute('max');
        }
      }
    };


    // Mode toggle logic
    formatSelect = document.getElementById('bracket-format');
    const modeContainer = document.getElementById('bracket-mode-container');
    if (formatSelect && modeContainer) {
      formatSelect.addEventListener('change', () => {
        if (formatSelect.value === 'SWISS') {
          modeContainer.classList.remove('hidden');
        } else {
          modeContainer.classList.add('hidden');
        }
      });
    }

    document.getElementById('create-bracket-btn').onclick = () => {
      // Reset mode visibility
      if (formatSelect && modeContainer) {
        formatSelect.value = 'ELIMINATION';
        modeContainer.classList.add('hidden');
      }
      openCreateBracketModal();
    };

    document.getElementById('cancel-create-bracket-btn').onclick = () => {
      modal.style.display = 'none';
    };

    document.getElementById('submit-create-bracket-btn').onclick = async () => {
      const bracketType = typeSelect.value;
      const bracketFormat = formatSelect.value;
      const division = divisionSelect.value;
      const bracketSize = parseInt(sizeInput.value);

      let mode = 'OPEN';
      if (bracketFormat === 'SWISS') {
        const modeEl = document.querySelector('input[name="bracket-mode"]:checked');
        if (modeEl) mode = modeEl.value;
      }

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
          mode,
          createdBy: 'Coach'
        });

        modal.style.display = 'none';
        alert('Bracket created successfully!');

        // Refresh brackets list
        await loadEventBrackets(currentEditEventId);

        btn.disabled = false;
        btn.textContent = 'Create Bracket';
      } catch (err) {
        console.error(err);
        alert('Error creating bracket: ' + err.message);
      } finally {
        const btn = document.getElementById('submit-create-bracket-btn');
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Create Bracket';
        }
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

  // ==================== Manage Roster (Phase 7: Bracket Workflow) ====================

  let currentRosterRoundId = null;

  /**
   * Opens the roster management modal for a specific round/bracket
   * Allows coaches to view, add, remove archers and generate matches
   * @param {string} roundId - UUID of the round to manage
   * @param {string} roundName - Display name of the round
   */
  async function openManageRoster(roundId, roundName) {
    currentRosterRoundId = roundId;
    const modal = document.getElementById('manage-roster-modal');
    document.getElementById('roster-round-name').textContent = roundName;

    // Show/Hide Generate Matches based on round type (simple check for now)
    // We can check if it's SWISS by name or fetch round details
    const isSwiss = roundName.toUpperCase().includes('SWISS');
    const genBtn = document.getElementById('generate-matches-btn');
    if (isSwiss) {
      genBtn.classList.remove('hidden');
    } else {
      genBtn.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    await loadRoster(roundId);
  }

  /**
   * Loads and displays the roster of archers for a given round
   * Fetches from API and renders archer cards with remove buttons
   * @param {string} roundId - UUID of the round
   */
  async function loadRoster(roundId) {
    const list = document.getElementById('roster-list');
    list.innerHTML = '<div class="text-center py-8 text-gray-500">Loading archers...</div>';

    try {
      // Use existing endpoint to get roster
      const roster = await req(`/rounds/${roundId}/roster`);
      document.getElementById('roster-count').textContent = `${roster.length} Archers`;

      if (roster.length === 0) {
        list.innerHTML = '<div class="text-center py-8 text-gray-400">No archers in this round.<br>Import from Ranking to begin.</div>';
        return;
      }

      list.innerHTML = '';
      roster.sort((a, b) => a.archer_name.localeCompare(b.archer_name));

      roster.forEach(ra => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700';
        div.innerHTML = `
          <div class="flex items-center gap-3">
             <div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
               ${ra.archer_name.charAt(0)}
             </div>
             <div>
               <div class="font-medium text-gray-900 dark:text-white">${ra.archer_name}</div>
               <div class="text-xs text-gray-500">${ra.school || ''} • ${ra.gender || ''}${ra.level || ''}</div>
             </div>
          </div>
          <button onclick="coach.removeRosterArcher('${ra.id}')" class="text-gray-400 hover:text-red-500 transition-colors" title="Remove">
            <i class="fas fa-trash-alt"></i>
          </button>
        `;
        list.appendChild(div);
      });

    } catch (err) {
      list.innerHTML = `<div class="text-center py-8 text-red-500">Error loading roster: ${err.message}</div>`;
    }
  }

  /**
   * Removes an archer from the round roster
   * Prompts for confirmation before deletion
   * @param {string} id - UUID of the round_archer entry to remove
   */
  async function removeRosterArcher(id) {
    if (!confirm('Remove this archer from the round?')) return;
    try {
      await req(`/round_archers/${id}`, 'DELETE');
      loadRoster(currentRosterRoundId);
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  /**
   * Sets up event listeners for roster management modals
   * Called once during initialization to wire up all roster UI interactions
   */
  function setupRosterModalListeners() {
    // Check if roster modals exist
    const rosterModal = document.getElementById('manage-roster-modal');
    if (!rosterModal) {
      console.log('[Roster] Roster modals not found in DOM, skipping setup');
      return;
    }

    console.log('[Roster] Setting up roster modal event listeners');

    // Add Archer button - opens modal and initializes ArcherSelector
    document.getElementById('add-archer-roster-btn').onclick = async () => {
      const modal = document.getElementById('add-archer-modal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');

      // Set modal title
      try {
        const round = await req(`/rounds/${currentRosterRoundId}`);
        document.getElementById('roster-modal-title').textContent = `${round.division} Round`;
      } catch (e) {
        document.getElementById('roster-modal-title').textContent = 'Round';
      }

      // Load master archer list (all statuses for roster management)
      try {
        const res = await req('/archers?status=all');
        rosterAllArchers = res.archers || [];

        // Populate school filter
        const schools = [...new Set(rosterAllArchers.map(a => a.school).filter(Boolean))].sort();
        const schoolFilter = document.getElementById('roster-filter-school');
        schoolFilter.innerHTML = '<option value="">All Schools</option>';
        schools.forEach(school => {
          const opt = document.createElement('option');
          opt.value = school;
          opt.textContent = school;
          schoolFilter.appendChild(opt);
        });

        // Initialize ArcherSelector with single selection group
        const container = document.getElementById('roster-archer-selection-container');
        rosterArcherSelector = new window.ArcherSelector(container, {
          groups: [{
            id: 'selected',
            label: 'Selected Archers',
            max: null // No limit on selection
          }],
          emptyMessage: 'No archers match your filters.',
          onSelectionChange: (selectionMap) => {
            rosterSelectedArchers = selectionMap['selected'] || [];
            updateRosterSelectionCount();
          },
          onFavoriteToggle: (archer, isFavorite) => {
            // Optional: Handle favorite toggle if needed
            console.log('Favorite toggled:', archer, isFavorite);
          },
          showAvatars: true,
          showFavoriteToggle: true
        });

        // Set initial roster and context
        rosterArcherSelector.setRoster(rosterAllArchers);
        rosterArcherSelector.setContext({
          favorites: [], // Could load from localStorage if needed
          selfExtId: ''
        });

        // Apply initial filters
        applyRosterFilters();

      } catch (e) {
        console.error('Failed to load archers:', e);
        document.getElementById('roster-archer-selection-container').innerHTML =
          '<div class="text-center py-8 text-red-500">Error loading archer list</div>';
      }
    };

    // Cancel add archer
    document.getElementById('cancel-add-archer-btn').onclick = () => {
      document.getElementById('add-archer-modal').classList.add('hidden');
      document.getElementById('add-archer-modal').classList.remove('flex');
      rosterSelectedArchers = [];
      if (rosterArcherSelector) {
        rosterArcherSelector.setSelection({ selected: [] });
      }
    };

    // Confirm add archer - adds selected archers to round roster
    document.getElementById('confirm-add-archer-btn').onclick = async () => {
      if (rosterSelectedArchers.length === 0) {
        alert('Please select at least one archer.');
        return;
      }

      try {
        // Add each selected archer to the roster
        let addedCount = 0;
        let errorCount = 0;

        for (const archer of rosterSelectedArchers) {
          try {
            await req(`/rounds/${currentRosterRoundId}/archers`, 'POST', {
              firstName: archer.first || archer.firstName,
              lastName: archer.last || archer.lastName,
              school: archer.school,
              level: archer.level,
              gender: archer.gender,
              baleNumber: null
            });
            addedCount++;
          } catch (e) {
            console.error('Failed to add archer:', archer, e);
            errorCount++;
          }
        }

        // Show summary
        if (addedCount > 0) {
          alert(`Successfully added ${addedCount} archer(s)` + (errorCount > 0 ? ` (${errorCount} failed)` : ''));
        } else {
          alert('Failed to add archers. They may already be in the roster.');
        }

        // Close modal and refresh roster
        document.getElementById('add-archer-modal').classList.add('hidden');
        document.getElementById('add-archer-modal').classList.remove('flex');
        rosterSelectedArchers = [];
        if (rosterArcherSelector) {
          rosterArcherSelector.setSelection({ selected: [] });
        }
        loadRoster(currentRosterRoundId);
      } catch (e) {
        alert('Failed to add archers: ' + e.message);
      }
    };

    // Search filter
    document.getElementById('roster-archer-search').addEventListener('input', (e) => {
      if (rosterArcherSelector) {
        rosterArcherSelector.setFilter(e.target.value);
      }
    });

    // Filter dropdowns
    ['roster-filter-status', 'roster-filter-school', 'roster-filter-gender', 'roster-filter-level', 'roster-filter-position'].forEach(id => {
      document.getElementById(id).addEventListener('change', applyRosterFilters);
    });

    // Select All Filtered button
    document.getElementById('roster-select-all-btn').onclick = () => {
      if (!rosterArcherSelector) return;

      // Get currently filtered/visible archers
      const filtered = getFilteredRosterArchers();

      // Add all filtered archers to selection
      rosterArcherSelector.setSelection({
        selected: filtered
      });
    };

    // Import from ranking button - opens import source selection modal
    document.getElementById('import-roster-btn').onclick = async () => {
      const modal = document.getElementById('import-source-modal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');

      try {
        const round = await req(`/rounds/${currentRosterRoundId}`);
        const rounds = await req(`/events/${round.event_id}/rounds`);

        const select = document.getElementById('import-source-select');
        select.innerHTML = '';

        rounds.forEach(r => {
          if (r.id === currentRosterRoundId) return;
          const opt = document.createElement('option');
          opt.value = r.id;
          opt.textContent = `${r.division} - ${r.round_type}`;
          select.appendChild(opt);
        });

        if (rounds.length <= 1) {
          select.innerHTML = '<option disabled>No other rounds available in this event</option>';
        }
      } catch (e) {
        console.error(e);
        alert('Error loading source rounds');
      }
    };

    // Close roster modal buttons
    const closeRosterModal = () => {
      document.getElementById('manage-roster-modal').classList.add('hidden');
      document.getElementById('manage-roster-modal').classList.remove('flex');
      currentRosterRoundId = null;
    };
    document.getElementById('close-roster-btn').onclick = closeRosterModal;
    document.getElementById('close-roster-footer-btn').onclick = closeRosterModal;

    // Cancel import
    document.getElementById('cancel-import-btn').onclick = () => {
      document.getElementById('import-source-modal').classList.add('hidden');
      document.getElementById('import-source-modal').classList.remove('flex');
    };

    // Confirm import - imports archers from selected ranking round
    document.getElementById('confirm-import-btn').onclick = async () => {
      const sourceId = document.getElementById('import-source-select').value;
      if (!sourceId) return;

      const limit = document.querySelector('input[name="import-limit"]:checked').value;

      try {
        await req(`/rounds/${currentRosterRoundId}/import`, 'POST', {
          sourceRoundId: sourceId,
          limit: parseInt(limit)
        });
        alert('Import successful');
        document.getElementById('import-source-modal').classList.add('hidden');
        document.getElementById('import-source-modal').classList.remove('flex');
        loadRoster(currentRosterRoundId);
      } catch (e) {
        alert('Import failed: ' + e.message);
      }
    };

    // Generate matches button - creates Swiss round pairings
    document.getElementById('generate-matches-btn').onclick = async () => {
      if (!confirm('Generate match pairings for this round? Existing matches may be cleared.')) return;
      try {
        const result = await req(`/rounds/${currentRosterRoundId}/generate`, 'POST');
        alert(`Generated ${result.matches || 0} matches.`);
      } catch (e) {
        alert('Generation failed: ' + e.message);
      }
    };
  }


  /**
   * Updates the selection count display for roster modal
   */
  function updateRosterSelectionCount() {
    const count = rosterSelectedArchers.length;
    document.getElementById('roster-selected-count').textContent = count;
  }

  /**
   * Applies filters to the roster archer list
   * Filters by status, school, gender, and level
   */
  function applyRosterFilters() {
    if (!rosterArcherSelector) return;

    const filtered = getFilteredRosterArchers();
    rosterArcherSelector.setRoster(filtered);
  }

  /**
   * Gets filtered list of archers based on current filter settings
   * @returns {Array} Filtered archer list
   */
  function getFilteredRosterArchers() {
    const statusFilter = document.getElementById('roster-filter-status').value;
    const schoolFilter = document.getElementById('roster-filter-school').value;
    const genderFilter = document.getElementById('roster-filter-gender').value;
    const levelFilter = document.getElementById('roster-filter-level').value;
    const positionFilter = document.getElementById('roster-filter-position').value;

    return rosterAllArchers.filter(archer => {
      // Status filter
      if (statusFilter === 'active' && archer.status !== 'active') return false;
      if (statusFilter === 'inactive' && archer.status === 'active') return false;

      // School filter
      if (schoolFilter && archer.school !== schoolFilter) return false;

      // Gender filter
      if (genderFilter && archer.gender !== genderFilter) return false;

      // Level filter
      if (levelFilter && archer.level !== levelFilter) return false;

      // Position filter
      if (positionFilter && archer.assignment !== positionFilter) return false;

      return true;
    });
  }

  window.coach = {
    viewResults,
    viewDashboard,
    viewBrackets,
    addArchersToEvent,
    deleteEvent,
    editEvent,
    manageBales,
    showQRCode,
    verifyEvent,
    editBracket,
    removeBracketEntry,
    openManageRoster,
    removeRosterArcher,
    importRoster
  };

})();
