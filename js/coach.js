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
              <th>Event Name</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
      `;

      events.forEach(ev => {
        const eventData = encodeURIComponent(JSON.stringify(ev));
        html += `
          <tr>
            <td><strong>${ev.name}</strong></td>
            <td>${ev.date}</td>
            <td><span class="status-badge status-${ev.status.toLowerCase()}">${ev.status}</span></td>
            <td>
              <button class="btn btn-primary btn-sm" onclick="coach.showQRCode('${eventData}')" title="Show QR Code">📱 QR Code</button>
              <button class="btn btn-secondary btn-sm" onclick="coach.editEvent('${eventData}')" title="Edit Event">✏️ Edit</button>
              <button class="btn btn-secondary btn-sm" onclick="coach.addArchersToEvent('${ev.id}', '${ev.name}')" title="Add Archers">➕ Add Archers</button>
              <button class="btn btn-primary btn-sm" onclick="coach.viewResults('${ev.id}')" title="View Results">📊 Results</button>
              <button class="btn btn-danger btn-sm" onclick="coach.deleteEvent('${ev.id}', '${ev.name}')" title="Delete Event">🗑️ Delete</button>
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

      try {
        const btn = document.getElementById('submit-event-btn');
        btn.disabled = true;
        btn.textContent = 'Creating...';

        // Create event WITHOUT creating division rounds
        // Rounds will be created when archers are added
        const result = await req('/events', 'POST', {
          name,
          date,
          status,
          entryCode,
          eventType: 'manual', // Don't auto-create rounds yet
          autoAssignBales: false
        });

        modal.style.display = 'none';
        alert(`Event "${name}" created successfully!\n\nNext step: Add archers to this event.`);
        loadEvents();
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

    // Filter archers
    const filtered = allArchers.filter(archer => {
      if (schoolFilter && archer.school !== schoolFilter) return false;
      if (genderFilter && archer.gender !== genderFilter) return false;
      if (levelFilter && archer.level !== levelFilter) return false;
      return true;
    });

    // Render list
    container.innerHTML = '';
    filtered.forEach(archer => {
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
    
    // Generate QR code
    try {
      new QRCode(qrContainer, {
        text: fullUrl,
        width: 256,
        height: 256,
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
    showQRCode
  };

})();

