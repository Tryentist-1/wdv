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

  // Normalize values to database standards
  _normalizeGender(gender) {
    if (!gender) return 'M'; // default
    const g = String(gender).toUpperCase().trim();
    if (g === 'F' || g === 'FEMALE' || g === 'GIRL' || g === 'GIRLS') return 'F';
    return 'M'; // Default to M for Male, Boys, or anything else
  },

  _normalizeLevel(level) {
    if (!level) return 'VAR'; // default
    const l = String(level).toUpperCase().trim();
    if (l === 'JV' || l === 'JUNIOR VARSITY' || l === 'JUNIOR') return 'JV';
    // V, VAR, VARSITY all become VAR
    return 'VAR';
  },

  _normalizeSchool(school) {
    if (!school) return 'UNK'; // Unknown
    return String(school).substring(0, 3).toUpperCase().trim();
  },

  // Sync current master list to DB via API bulk upsert
  async bulkUpsertMasterList() {
    if (!window.LiveUpdates || !window.LiveUpdates.request) {
      alert('Live Updates API is not available. Please ensure live_updates.js is loaded.');
      return { ok: false };
    }
    
    const list = this.loadList();
    if (!Array.isArray(list) || list.length === 0) {
      alert('No master list found in local storage to sync.');
      return { ok: false };
    }
    
    // Normalize data before sending to database
    const payload = list.map(a => ({
      extId: this._buildExtId(a),
      firstName: a.first || '',
      lastName: a.last || '',
      school: this._normalizeSchool(a.school),
      level: this._normalizeLevel(a.level),
      gender: this._normalizeGender(a.gender)
    }));
    
    try {
      const result = await window.LiveUpdates.request('/archers/bulk_upsert', 'POST', payload);
      return result;
    } catch (error) {
      console.error('Bulk upsert failed:', error);
      throw error;
    }
  },

  // Load master list from MySQL database
  async loadFromMySQL() {
    if (!window.LiveUpdates || !window.LiveUpdates.request) {
      throw new Error('Live Updates API is not available');
    }
    
    try {
      const result = await window.LiveUpdates.request('/archers', 'GET');
      return result.archers || [];
    } catch (error) {
      console.error('Load from MySQL failed:', error);
      throw error;
    }
  },

  // Sync: Push localStorage to MySQL (one-way sync)
  async syncToMySQL() {
    try {
      const result = await this.bulkUpsertMasterList();
      console.log('Sync to MySQL complete:', result);
      return result;
    } catch (error) {
      console.error('Sync to MySQL failed:', error);
      alert('Failed to sync archer list to database: ' + error.message);
      return { ok: false, error: error.message };
    }
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