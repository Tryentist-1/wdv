/**
 * Coach Console - Redesigned Interface
 * Features: Authentication, Event Management, Archer Management, Results
 */

(() => {
  const API_BASE = 'https://tryentist.com/wdv/api/v1';
  const COACH_COOKIE_NAME = 'coach_auth';
  const COACH_PASSCODE = 'wdva26'; // The actual passcode
  const COOKIE_DAYS = 90;

  // State
  let currentEventId = null;
  let selectedArchers = [];
  let allArchers = [];
  
  // PHASE 0: Division rounds workflow
  let pendingDivisions = []; // Divisions to configure after event creation
  let currentDivision = null; // Current division being configured
  let divisionRounds = {}; // Map of division -> roundId

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

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
      const text = await res.text();
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
        <table class="score-table">
          <thead>
            <tr>
              <th style="width: 35%;">Event</th>
              <th style="width: 15%;">Date</th>
              <th style="width: 18%;">Status</th>
              <th style="width: 32%;">Actions</th>
            </tr>
          </thead>
          <tbody>
      `;

      events.forEach(ev => {
        const eventData = encodeURIComponent(JSON.stringify(ev));
        // Format date without year: "Oct 15" instead of "2024-10-15"
        const dateObj = new Date(ev.date + 'T00:00:00');
        const shortDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Truncate event name on mobile
        const maxNameLength = 20;
        const displayName = ev.name.length > maxNameLength ? ev.name.substring(0, maxNameLength) + '...' : ev.name;
        
        html += `
          <tr>
            <td><strong>${displayName}</strong></td>
            <td style="white-space: nowrap;">${shortDate}</td>
            <td><span class="status-badge status-${ev.status.toLowerCase()}">${ev.status}</span></td>
            <td style="white-space: nowrap;">
              <button class="btn btn-primary btn-sm" onclick="coach.showQRCode('${eventData}')" title="QR Code">📱</button>
              <button class="btn btn-secondary btn-sm" onclick="coach.editEvent('${eventData}')" title="Edit">✏️</button>
              <button class="btn btn-secondary btn-sm" onclick="coach.addArchersToEvent('${ev.id}', '${ev.name}')" title="Add Archers">➕</button>
              <button class="btn btn-primary btn-sm" onclick="coach.viewResults('${ev.id}')" title="Results">📊</button>
              <button class="btn btn-secondary btn-sm" onclick="coach.manageBales('${ev.id}', '${ev.name}')" title="Manage Bales">⚙️</button>
              <button class="btn btn-danger btn-sm" onclick="coach.deleteEvent('${ev.id}', '${ev.name}')" title="Delete">🗑️</button>
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
      dlg.className = 'modal';
      dlg.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
          <h2>Manage Bales — ${eventName}</h2>
          <div id="bale-mgr-body" style="max-height:60vh;overflow:auto;"></div>
          <div class="modal-buttons">
            <button id="bale-mgr-close" class="btn btn-secondary" style="flex:1;">Close</button>
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
          section.style.marginBottom = '1rem';
          section.innerHTML = `<h3 style="margin:.25rem 0;">${divCode}</h3>`;
          const tbl = document.createElement('table');
          tbl.className = 'score-table';
          tbl.innerHTML = `<thead><tr><th>Archer</th><th>School</th><th>Bale</th><th>Target</th><th>Actions</th></tr></thead>`;
          const tb = document.createElement('tbody');

          // Add Archer row (from master list)
          const addRow = document.createElement('tr');
          addRow.innerHTML = `
            <td colspan="5">
              <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;">
                <select class="styled-select" data-role="add-archer-select" style="min-width:220px;">
                  <option value="">Select Archer (master list)</option>
                </select>
                <input type="number" placeholder="Bale #" data-role="add-bale" style="width:90px;" />
                <input type="text" placeholder="Target (A-H)" maxlength="1" data-role="add-target" style="width:90px;" />
                <button class="btn btn-secondary btn-sm" data-role="add-confirm">Add</button>
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
            tr.innerHTML = `
              <td>${a.archerName}</td>
              <td>${a.school||''}</td>
              <td><input type="number" min="1" value="${a.bale||''}" style="width:70px" /></td>
              <td><input type="text" value="${a.target||''}" style="width:70px" maxlength="1" /></td>
              <td>
                <button class="btn btn-secondary btn-sm" data-act="save">Save</button>
                <button class="btn btn-danger btn-sm" data-act="remove">Remove</button>
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

  // ==================== PHASE 0: Division Round Management ====================
  
  function processNextDivision(eventName) {
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
    showAddArchersModalForDivision(currentDivision, divisionName, eventName);
  }

  function showAddArchersModalForDivision(division, divisionName, eventName) {
    // Reset selection
    selectedArchers = [];

    // Update modal title
    document.getElementById('division-title').textContent = `${divisionName} Round`;

    // Show modal
    const modal = document.getElementById('add-archers-modal');
    modal.style.display = 'flex';

    // Populate filters and render list
    populateFilters();
    renderArcherList();

    // Setup event handlers
    document.getElementById('cancel-add-archers-btn').onclick = () => {
      modal.style.display = 'none';
      // Skip this division
      processNextDivision(eventName);
    };

    document.getElementById('submit-add-archers-btn').onclick = () => {
      if (selectedArchers.length === 0) {
        // Skip this division if no archers selected
        modal.style.display = 'none';
        processNextDivision(eventName);
        return;
      }
      modal.style.display = 'none';
      showAssignmentModeModalForDivision(division, divisionName, eventName);
    };

    // Filter change handlers
    ['filter-school', 'filter-gender', 'filter-level'].forEach(id => {
      document.getElementById(id).onchange = renderArcherList;
    });

    // PHASE 0: Search handler
    const searchInput = document.getElementById('archer-search');
    if (searchInput) {
      searchInput.value = ''; // Clear search
      searchInput.oninput = renderArcherList;
    }

    // Select All button
    const selectAllBtn = document.getElementById('select-all-btn');
    selectAllBtn.replaceWith(selectAllBtn.cloneNode(true));
    const newSelectAllBtn = document.getElementById('select-all-btn');

    newSelectAllBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      const container = document.getElementById('archer-list');
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      const allSelected = Array.from(checkboxes).every(cb => cb.checked);

      if (allSelected) {
        // Deselect all
        checkboxes.forEach(cb => {
          cb.checked = false;
          const archerId = cb.id.replace('archer-', '');
          selectedArchers = selectedArchers.filter(id => id !== archerId);
        });
      } else {
        // Select all
        checkboxes.forEach(cb => {
          cb.checked = true;
          const archerId = cb.id.replace('archer-', '');
          if (!selectedArchers.includes(archerId)) {
            selectedArchers.push(archerId);
          }
        });
      }

      updateSelectedCount();
    });
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

      try {
        const btn = document.getElementById('submit-assignment-btn');
        btn.disabled = true;
        btn.textContent = 'Processing...';

        // PHASE 0: Call new endpoint
        const result = await req(`/events/${currentEventId}/rounds/${roundId}/archers`, 'POST', {
          archerIds: selectedArchers,
          assignmentMode: mode
        });

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

    // Load master archer list
    try {
      await loadMasterArcherList();
    } catch (err) {
      alert('Error loading archer list: ' + err.message);
      return;
    }

    // Show modal
    const modal = document.getElementById('add-archers-modal');
    modal.style.display = 'flex';

    // Populate filters
    populateFilters();
    
    // Render archer list
    renderArcherList();

    // Setup event handlers
    document.getElementById('cancel-add-archers-btn').onclick = () => {
      modal.style.display = 'none';
    };

    document.getElementById('submit-add-archers-btn').onclick = () => {
      if (selectedArchers.length === 0) {
        alert('Please select at least one archer');
        return;
      }
      modal.style.display = 'none';
      showAssignmentModeModal(eventName);
    };

    // Filter change handlers
    ['filter-school', 'filter-gender', 'filter-level'].forEach(id => {
      document.getElementById(id).onchange = renderArcherList;
    });
    
    // Select All button - use addEventListener for better mobile compatibility
    const selectAllBtn = document.getElementById('select-all-btn');
    
    // Remove any existing listeners
    selectAllBtn.replaceWith(selectAllBtn.cloneNode(true));
    const newSelectAllBtn = document.getElementById('select-all-btn');
    
    newSelectAllBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('Select All clicked');
      
      const container = document.getElementById('archer-list');
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      
      console.log('Found checkboxes:', checkboxes.length);
      
      // Check if all are currently selected
      const allSelected = Array.from(checkboxes).every(cb => cb.checked);
      
      console.log('All selected?', allSelected);
      
      if (allSelected) {
        // Deselect all
        checkboxes.forEach(cb => {
          cb.checked = false;
          const archerId = cb.id.replace('archer-', '');
          selectedArchers = selectedArchers.filter(id => id !== archerId);
        });
        newSelectAllBtn.textContent = 'Select All Filtered';
      } else {
        // Select all
        checkboxes.forEach(cb => {
          cb.checked = true;
          const archerId = cb.id.replace('archer-', '');
          if (!selectedArchers.includes(archerId)) {
            selectedArchers.push(archerId);
          }
        });
        newSelectAllBtn.textContent = 'Deselect All';
      }
      
      updateSelectionCount();
    });
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

  function renderArcherList() {
    const container = document.getElementById('archer-list');
    const schoolFilter = document.getElementById('filter-school').value;
    const genderFilter = document.getElementById('filter-gender').value;
    const levelFilter = document.getElementById('filter-level').value;
    
    // PHASE 0: Get search term
    const searchInput = document.getElementById('archer-search');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    // Filter archers (AND logic - must match all)
    const filtered = allArchers.filter(archer => {
      // School filter
      if (schoolFilter && archer.school !== schoolFilter) return false;
      
      // Gender filter
      if (genderFilter && archer.gender !== genderFilter) return false;
      
      // Level filter
      if (levelFilter && archer.level !== levelFilter) return false;
      
      // PHASE 0: Search filter (matches first name or last name)
      if (searchTerm) {
        const fullName = `${archer.first_name || ''} ${archer.last_name || ''}`.toLowerCase();
        if (!fullName.includes(searchTerm)) return false;
      }
      
      return true;
    });

    // PHASE 0: Sort by firstName (alphabetically)
    const sorted = filtered.sort((a, b) => {
      const nameA = (a.first_name || '').toLowerCase();
      const nameB = (b.first_name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // Render list
    container.innerHTML = '';
    sorted.forEach(archer => {
      const item = document.createElement('div');
      item.className = 'archer-item';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `archer-${archer.id}`;
      checkbox.checked = selectedArchers.includes(archer.id);
      checkbox.onchange = () => {
        if (checkbox.checked) {
          if (!selectedArchers.includes(archer.id)) {
            selectedArchers.push(archer.id);
          }
        } else {
          selectedArchers = selectedArchers.filter(id => id !== archer.id);
        }
        updateSelectionCount();
      };

      const label = document.createElement('label');
      label.htmlFor = `archer-${archer.id}`;
      label.innerHTML = `
        <strong>${archer.firstName} ${archer.lastName}</strong>
        <span class="archer-details">(${archer.school}, ${archer.gender === 'M' ? 'Boys' : 'Girls'}, ${archer.level})</span>
      `;

      item.appendChild(checkbox);
      item.appendChild(label);
      container.appendChild(item);
    });

    updateSelectionCount();
  }

  function updateSelectionCount() {
    document.getElementById('selected-count').textContent = selectedArchers.length;
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
  }

  // ==================== Reset Event Data ====================
  function setupResetEventDataInline() {
    const btn = document.getElementById('reset-event-data-btn');
    if (!btn) return;
    btn.onclick = async () => {
      if (!currentEditEventId) { alert('Open Edit Event to reset.'); return; }
      const eventId = currentEditEventId;
      const confirmMsg = 'Reset Event Data\n\nALL ENTERED SCORES WILL BE DELETED.\nScorecards (round_archers) and End data will be removed, rounds set back to Created.\n\nAre you sure?';
      if (!confirm(confirmMsg)) return;
      try {
        // Use the same authenticated coach API helper as the rest of the console
        await req(`/events/${eventId}/reset`, 'POST');
        alert('Event data reset. All entered scores were deleted.');
      } catch (e) {
        alert('Reset failed: ' + (e && e.message ? e.message : e));
      }
    };
  }

  // Hook up on load (coach page)
  document.addEventListener('DOMContentLoaded', () => {
    setupCSVImport();
    setupResetEventDataInline();
  });

  function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const archers = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const archer = {};

      headers.forEach((header, idx) => {
        archer[header] = values[idx] || '';
      });

      // Validate required fields
      if (!archer.first || !archer.last || !archer.school) {
        errors.push(`Line ${i + 1}: Missing required fields (first, last, school)`);
        continue;
      }

      // Build ext_id: first-last-school (slugified)
      const slugify = (s) => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').trim();
      const extId = `${slugify(archer.first)}-${slugify(archer.last)}-${slugify(archer.school)}`;

      archers.push({
        extId,
        firstName: archer.first,
        lastName: archer.last,
        school: archer.school.substring(0, 3).toUpperCase(),
        level: (archer.level || 'VAR').toUpperCase() === 'JV' ? 'JV' : 'VAR',
        gender: (archer.gender || 'M').toUpperCase() === 'F' ? 'F' : 'M'
      });
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
  
  function editEvent(encodedEventData) {
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
    
    document.getElementById('cancel-edit-event-btn').onclick = () => {
      modal.style.display = 'none';
      currentEditEventId = null;
    };
    
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
  
  // ==================== Global Functions (for inline onclick) ====================
  
  window.coach = {
    viewResults,
    addArchersToEvent,
    deleteEvent,
    editEvent,
    manageBales,
    showQRCode
  };

})();

