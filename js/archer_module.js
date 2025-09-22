// js/archer_module.js
// Archer Management Module
// Handles loading, saving, and managing the master archer list in localStorage

const ARCHER_LIST_KEY = 'archerList';

// Archer data model example
// {
//   first: '', last: '', school: '', grade: '', gender: '', level: '',
//   bale: '', target: '', size: '', fave: false, jvPr: '', varPr: ''
// }

const ArcherModule = {
  // Load archer list from localStorage
  loadList() {
    const data = localStorage.getItem(ARCHER_LIST_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse archer list:', e);
      return [];
    }
  },

  // Utility: slugify
  _slug(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  },

  // Build extId from fields (first-last-school)
  _buildExtId(archer) {
    const a = archer || {};
    const first = this._slug(a.first);
    const last = this._slug(a.last);
    const school = this._slug(a.school);
    return [first, last, school].filter(Boolean).join('-');
  },

  // Sync current master list to DB via API bulk upsert
  async bulkUpsertMasterList() {
    const cfg = (window && window.LIVE_UPDATES) ? window.LIVE_UPDATES : {};
    if (!cfg || !cfg.apiBase || !cfg.apiKey) {
      alert('Live Updates API is not configured. Please set window.LIVE_UPDATES.apiBase and apiKey.');
      return { ok: false };
    }
    const list = this.loadList();
    if (!Array.isArray(list) || list.length === 0) {
      alert('No master list found in local storage to sync.');
      return { ok: false };
    }
    const payload = list.map(a => ({
      extId: this._buildExtId(a),
      firstName: a.first || '',
      lastName: a.last || '',
      school: a.school || '',
      level: a.level || '',
      gender: a.gender || ''
    }));
    const res = await fetch(`${cfg.apiBase}/archers/bulk_upsert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': cfg.apiKey
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Bulk upsert failed (HTTP ${res.status}): ${txt}`);
    }
    return res.json();
  },

  // Save archer list to localStorage
  saveList(list) {
    localStorage.setItem(ARCHER_LIST_KEY, JSON.stringify(list));
  },

  getArcherById(id) {
    const list = this.loadList();
    return list.find(archer => {
      const archerId = `${(archer.first || '').trim()}-${(archer.last || '').trim()}`;
      return archerId === id;
    });
  },

  clearList() {
    localStorage.removeItem(ARCHER_LIST_KEY);
  },

  // Add a new archer
  addArcher(archer) {
    const list = this.loadList();
    list.push(archer);
    this.saveList(list);
  },

  // Edit an archer by index
  editArcher(index, updatedArcher) {
    const list = this.loadList();
    if (index >= 0 && index < list.length) {
      list[index] = updatedArcher;
      this.saveList(list);
    }
  },

  // Delete an archer by index
  deleteArcher(index) {
    const list = this.loadList();
    if (index >= 0 && index < list.length) {
      list.splice(index, 1);
      this.saveList(list);
    }
  },

  // Import from CSV (stub)
  importCSV(csvText) {
    // TODO: Parse CSV and merge/replace archer list
    // Use PapaParse or similar in the UI
    console.warn('importCSV not implemented');
  },

  // Export to CSV (stub)
  exportCSV() {
    // TODO: Generate CSV from archer list
    // Use PapaParse or similar in the UI
    console.warn('exportCSV not implemented');
  },

  // Load default CSV if localStorage is empty
  loadDefaultCSVIfNeeded: async function(force = false) {
    if (!force && localStorage.getItem(ARCHER_LIST_KEY)) return; // Already loaded
    try {
      const url = force ? `app-imports/listimport-01.csv?v=${Date.now()}` : 'app-imports/listimport-01.csv';
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Failed to fetch CSV');
      const text = await resp.text();
      const lines = text.trim().split(/\r?\n/);
      const headers = lines[0].split(',');
      const list = lines.slice(1).map(line => {
        const vals = line.split(',');
        // Map CSV columns to archer model
        return {
          first: vals[0] || '',
          last: vals[1] || '',
          school: vals[2] || '',
          grade: vals[3] || '',
          gender: vals[4] || '',
          level: vals[5] || '',
          bale: vals[6] || '',
          target: vals[7] || '',
          size: vals[8] || '',
          varPr: vals[9] || '',
          fave: false // default
        };
      });
      ArcherModule.saveList(list); // Always overwrite if force is true
    } catch (e) {
      console.error('Failed to load default CSV:', e);
      alert('Error: Could not load the default archer list from "app-imports/listimport-01.csv".\n\nPlease check that the file exists and the server is running correctly.\n\nDetails: ' + e.message);
    }
  }
};

// Make available globally
window.ArcherModule = ArcherModule; 

const refreshBtn = document.getElementById('refresh-master-list-btn'); 
console.log('Button at attach time:', refreshBtn); 

console.log('Refresh Master List button clicked!'); 