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

  // Save archer list to localStorage
  saveList(list) {
    localStorage.setItem(ARCHER_LIST_KEY, JSON.stringify(list));
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
      const resp = await fetch('app-imports/listimport-01.csv');
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