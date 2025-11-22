// js/archer_module.js
// Archer Management Module
// Handles loading, saving, and managing the master archer list in localStorage

const ARCHER_LIST_KEY = 'archerList';
const ARCHER_LIST_META_KEY = 'archerListMeta';
const ARCHER_SCHEMA_VERSION = 2;
const ARCHER_PENDING_UPSERT_KEY = 'archerListPendingUpserts';
const ARCHER_SELF_KEY = 'archerSelfExtId';

// Archer data model example
// {
//   extId: '', first: '', last: '', nickname: '', photoUrl: '',
//   school: '', grade: '', gender: '', level: '',
//   status: 'active', coachFavorite: false,
//   faves: [], domEye: '', domHand: '',
//   heightIn: '', wingspanIn: '', drawLengthSugg: '',
//   riserHeightIn: '', limbLength: '', limbWeightLbs: '',
//   notesGear: '', notesCurrent: '', notesArchive: '',
//   email: '', phone: '', usArcheryId: '',
//   jvPr: '', varPr: '',
//   /* legacy compatibility fields (not synced) */
//   fave: false, bale: '', target: '', size: ''
// }

const DEFAULT_ARCHER_TEMPLATE = {
  extId: '',
  first: '',
  last: '',
  nickname: '',
  photoUrl: '',
  school: '',
  grade: '',
  gender: 'M',
  level: 'VAR',
  status: 'active',
  coachFavorite: false,
  fave: false, // legacy convenience flag (mirrors coachFavorite)
  faves: [],
  domEye: '',
  domHand: '',
  heightIn: '',
  wingspanIn: '',
  drawLengthSugg: '',
  riserHeightIn: '',
  limbLength: '',
  limbWeightLbs: '',
  notesGear: '',
  notesCurrent: '',
  notesArchive: '',
  email: '',
  phone: '',
  usArcheryId: '',
  jvPr: '',
  varPr: '',
  shirtSize: '',
  pantSize: '',
  hatSize: '',
  // Legacy local-only fields kept for backward compatibility until scoring apps migrate
  bale: '',
  target: '',
  size: '',
  __schemaVersion: ARCHER_SCHEMA_VERSION
};

const ArcherModule = {
  loadList() {
    const raw = this._readRawList();
    const upgraded = this._upgradeList(raw);
    // Opportunistically try to sync any pending upserts
    this._flushPendingUpserts().catch(err => console.warn('Pending upsert flush failed:', err));
    return upgraded;
  },

  saveList(list, metaOverrides = {}) {
    if (!Array.isArray(list)) list = [];
    const normalized = list.map(archer => this._applyTemplate(archer));
    this._writeList(normalized);

    const currentMeta = this._loadMeta();
    const meta = Object.assign({}, currentMeta, metaOverrides, {
      version: ARCHER_SCHEMA_VERSION,
      updatedAt: Date.now()
    });
    this._saveMeta(meta);
  },

  getMeta() {
    return this._loadMeta();
  },

  // Load archer list from localStorage
  _readRawList() {
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
    const first = this._slug(a.first || a.firstName);
    const last = this._slug(a.last || a.lastName);
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
    if (l === 'BEG' || l === 'BEGINNER') return 'BEG';
    // V, VAR, VARSITY all become VAR
    return 'VAR';
  },

  _normalizeStatus(status) {
    const valid = ['ACTIVE', 'INACTIVE'];
    const value = String(status || 'active').toUpperCase();
    return valid.includes(value) ? value.toLowerCase() : 'active';
  },

  _normalizeSchool(school) {
    if (!school) return 'UNK'; // Unknown
    return String(school).substring(0, 3).toUpperCase().trim();
  },

  _normalizeDom(value) {
    const v = String(value || '').toUpperCase().trim();
    if (v === 'RT' || v === 'LT') return v;
    if (v === 'R' || v === 'RIGHT') return 'RT';
    if (v === 'L' || v === 'LEFT') return 'LT';
    return '';
  },

  _normalizeLimbLength(value) {
    const v = String(value || '').toUpperCase().trim();
    if (['S', 'M', 'L'].includes(v)) return v;
    if (v.startsWith('SHORT')) return 'S';
    if (v.startsWith('MED')) return 'M';
    if (v.startsWith('LONG')) return 'L';
    return '';
  },

  _toNullableInt(value) {
    if (value === null || value === undefined || value === '') return null;
    const num = parseInt(value, 10);
    return Number.isNaN(num) ? null : num;
  },

  _toNullableDecimal(value) {
    if (value === null || value === undefined || value === '') return null;
    const num = parseFloat(value);
    return Number.isNaN(num) ? null : num;
  },

  _safeString(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  },

  _parseFaves(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch (_) {
        // Not JSON - treat as comma/semicolon list
      }
      return value
        .split(/[,;]+/)
        .map(s => s.trim())
        .filter(Boolean);
    }
    return [];
  },

  _applyTemplate(archer) {
    const merged = Object.assign({}, DEFAULT_ARCHER_TEMPLATE, archer || {});
    merged.extId = merged.extId || this._buildExtId(merged);
    merged.gender = this._normalizeGender(merged.gender);
    merged.level = this._normalizeLevel(merged.level);
    merged.status = this._normalizeStatus(merged.status);
    merged.domEye = this._normalizeDom(merged.domEye);
    merged.domHand = this._normalizeDom(merged.domHand);
    merged.limbLength = this._normalizeLimbLength(merged.limbLength);
    merged.faves = this._parseFaves(merged.faves);
    merged.coachFavorite = !!merged.coachFavorite;
    merged.fave = !!merged.coachFavorite || !!merged.fave; // maintain legacy flag
    merged.__schemaVersion = ARCHER_SCHEMA_VERSION;
    return merged;
  },

  _upgradeArcher(legacy = {}) {
    const upgraded = Object.assign({}, DEFAULT_ARCHER_TEMPLATE, {
      extId: legacy.extId || this._buildExtId(legacy),
      first: this._safeString(legacy.first || legacy.firstName),
      last: this._safeString(legacy.last || legacy.lastName),
      nickname: this._safeString(legacy.nickname),
      photoUrl: this._safeString(legacy.photoUrl),
      school: this._safeString(legacy.school),
      grade: this._safeString(legacy.grade),
      gender: legacy.gender || legacy.sex || 'M',
      level: legacy.level || legacy.division || '',
      status: legacy.status || (legacy.active === false ? 'inactive' : 'active'),
      domEye: legacy.domEye || '',
      domHand: legacy.domHand || '',
      heightIn: legacy.heightIn || legacy.height || '',
      wingspanIn: legacy.wingspanIn || legacy.wingspan || '',
      drawLengthSugg: legacy.drawLengthSugg || legacy.draw || '',
      riserHeightIn: legacy.riserHeightIn || legacy.riser || '',
      limbLength: legacy.limbLength || '',
      limbWeightLbs: legacy.limbWeightLbs || legacy.limbWeight || '',
      notesGear: legacy.notesGear || '',
      notesCurrent: legacy.notesCurrent || '',
      notesArchive: legacy.notesArchive || '',
      email: this._safeString(legacy.email),
      phone: this._safeString(legacy.phone),
      usArcheryId: this._safeString(legacy.usArcheryId || legacy.usarchery || legacy.us_archery_id),
      jvPr: legacy.jvPr || legacy.jv_pr || '',
      varPr: legacy.varPr || legacy.var_pr || '',
      shirtSize: legacy.shirtSize || '',
      pantSize: legacy.pantSize || '',
      hatSize: legacy.hatSize || '',
      coachFavorite: !!legacy.coachFavorite || !!legacy.fave,
      fave: !!legacy.coachFavorite || !!legacy.fave,
      faves: this._parseFaves(legacy.faves),
      bale: legacy.bale || '',
      target: legacy.target || '',
      size: legacy.size || ''
    });
    upgraded.gender = this._normalizeGender(upgraded.gender);
    upgraded.level = this._normalizeLevel(upgraded.level);
    upgraded.status = this._normalizeStatus(upgraded.status);
    upgraded.domEye = this._normalizeDom(upgraded.domEye);
    upgraded.domHand = this._normalizeDom(upgraded.domHand);
    upgraded.limbLength = this._normalizeLimbLength(upgraded.limbLength);
    upgraded.faves = this._parseFaves(upgraded.faves);
    upgraded.__schemaVersion = ARCHER_SCHEMA_VERSION;
    return upgraded;
  },

  _upgradeList(rawList) {
    if (!Array.isArray(rawList)) return [];
    let changed = false;
    const upgraded = rawList.map(archer => {
      if (!archer || archer.__schemaVersion !== ARCHER_SCHEMA_VERSION) {
        changed = true;
        return this._upgradeArcher(archer);
      }
      return this._applyTemplate(archer);
    });
    if (changed) {
      this.saveList(upgraded);
    }
    return upgraded;
  },

  _writeList(list) {
    localStorage.setItem(ARCHER_LIST_KEY, JSON.stringify(list));
  },

  _loadMeta() {
    try {
      const raw = localStorage.getItem(ARCHER_LIST_META_KEY);
      if (!raw) return { version: ARCHER_SCHEMA_VERSION };
      const parsed = JSON.parse(raw);
      return Object.assign({ version: ARCHER_SCHEMA_VERSION }, parsed || {});
    } catch (e) {
      console.warn('Failed to parse archer list meta', e);
      return { version: ARCHER_SCHEMA_VERSION };
    }
  },

  _saveMeta(meta) {
    try {
      localStorage.setItem(ARCHER_LIST_META_KEY, JSON.stringify(meta || {}));
    } catch (e) {
      console.warn('Failed to persist archer list meta', e);
    }
  },

  _getStoredEventCode() {
    try {
      const direct = localStorage.getItem('event_entry_code') || '';
      if (direct && direct.trim()) return direct.trim();
    } catch (_) {}

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('event:') && key.endsWith(':meta')) {
          try {
            const meta = JSON.parse(localStorage.getItem(key) || '{}');
            const code = (meta && meta.entryCode) ? String(meta.entryCode).trim() : '';
            if (code) return code;
          } catch (_) { /* ignore bad meta */ }
        }
      }
    } catch (_) {}

    return '';
  },

  _storeEventEntryCode(code) {
    if (!code) return;
    const trimmed = String(code).trim();
    if (!trimmed) return;
    try { localStorage.setItem('event_entry_code', trimmed); } catch (_) {}
  },

  _ensureArcherApiAccess(options = {}) {
    const { forcePrompt = false } = options || {};
    try {
      const configRaw = localStorage.getItem('live_updates_config') || '{}';
      const config = JSON.parse(configRaw);
      const coachKey = (config && config.apiKey) || localStorage.getItem('coach_api_key') || '';
      if (coachKey && coachKey.trim()) return true;
    } catch (_) {}

    const existingCode = this._getStoredEventCode();
    if (existingCode) return true;

    if (!forcePrompt) return false;

    if (typeof prompt === 'function') {
      const entered = prompt('Enter the event code to sync with the master roster:');
      if (entered && entered.trim()) {
        this._storeEventEntryCode(entered);
        return true;
      }
    }

    return false;
  },

  _loadPendingUpserts() {
    try {
      const raw = localStorage.getItem(ARCHER_PENDING_UPSERT_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(item => item && item.extId);
    } catch (e) {
      console.warn('Failed to parse pending upserts', e);
      return [];
    }
  },

  _savePendingUpserts(list) {
    try {
      localStorage.setItem(ARCHER_PENDING_UPSERT_KEY, JSON.stringify(list || []));
    } catch (e) {
      console.warn('Failed to persist pending upserts', e);
    }
  },

  getSelfExtId() {
    return localStorage.getItem(ARCHER_SELF_KEY) || '';
  },

  async setSelfExtId(extId) {
    if (!extId) {
      localStorage.removeItem(ARCHER_SELF_KEY);
      return null;
    }
    localStorage.setItem(ARCHER_SELF_KEY, extId);
    return this.getSelfArcher();
  },

  async setSelf(extId) {
    return this.setSelfExtId(extId);
  },

  clearSelf() {
    localStorage.removeItem(ARCHER_SELF_KEY);
  },

  getSelfArcher() {
    const extId = this.getSelfExtId();
    if (!extId) return null;
    const list = this._readRawList();
    const found = Array.isArray(list) ? list.find(a => (a.extId || this._buildExtId(a)) === extId) : null;
    if (!found) return null;
    return this._applyTemplate(found);
  },

  getPendingCount() {
    return this._loadPendingUpserts().length;
  },

  async flushPending() {
    return this._flushPendingUpserts();
  },

  _setLastFetched() {
    const meta = this._loadMeta();
    meta.lastFetchedAt = Date.now();
    meta.version = ARCHER_SCHEMA_VERSION;
    this._saveMeta(meta);
  },

  _setLastSynced() {
    const meta = this._loadMeta();
    meta.lastSyncedAt = Date.now();
    meta.version = ARCHER_SCHEMA_VERSION;
    this._saveMeta(meta);
  },

  _prepareForSync(archer) {
    const data = this._applyTemplate(archer);
    const payload = {
      extId: data.extId || this._buildExtId(data),
      firstName: this._safeString(data.first),
      lastName: this._safeString(data.last),
      nickname: this._safeString(data.nickname),
      photoUrl: this._safeString(data.photoUrl),
      school: this._normalizeSchool(data.school),
      grade: this._safeString(data.grade),
      gender: this._normalizeGender(data.gender),
      level: this._normalizeLevel(data.level),
      status: this._normalizeStatus(data.status),
      faves: data.faves.filter(Boolean),
      domEye: this._normalizeDom(data.domEye),
      domHand: this._normalizeDom(data.domHand),
      heightIn: this._toNullableInt(data.heightIn),
      wingspanIn: this._toNullableInt(data.wingspanIn),
      drawLengthSugg: this._toNullableDecimal(data.drawLengthSugg),
      riserHeightIn: this._toNullableDecimal(data.riserHeightIn),
      limbLength: this._normalizeLimbLength(data.limbLength),
      limbWeightLbs: this._toNullableDecimal(data.limbWeightLbs),
      notesGear: this._safeString(data.notesGear),
      notesCurrent: this._safeString(data.notesCurrent),
      notesArchive: this._safeString(data.notesArchive),
      email: this._safeString(data.email),
      phone: this._safeString(data.phone),
      usArcheryId: this._safeString(data.usArcheryId),
      jvPr: this._toNullableInt(data.jvPr),
      varPr: this._toNullableInt(data.varPr),
      shirtSize: this._safeString(data.shirtSize),
      pantSize: this._safeString(data.pantSize),
      hatSize: this._safeString(data.hatSize)
    };
    return payload;
  },

  async _sendUpsert(payload) {
    if (!window.LiveUpdates || !window.LiveUpdates.request) {
      throw new Error('Live Updates API is not available');
    }
    const body = Array.isArray(payload) ? payload : [payload];
    const result = await window.LiveUpdates.request('/archers/bulk_upsert', 'POST', body);
    this._setLastSynced();
    return result;
  },

  _queuePendingUpsert(archer) {
    const pending = this._loadPendingUpserts();
    const payload = this._prepareForSync(archer);
    payload.__queuedAt = Date.now();
    const existingIndex = pending.findIndex(item => item.extId === payload.extId);
    if (existingIndex >= 0) {
      pending[existingIndex] = payload;
    } else {
      pending.push(payload);
    }
    this._savePendingUpserts(pending);
    return this._flushPendingUpserts();
  },

  async _flushPendingUpserts() {
    if (this._isFlushingUpserts) {
      return this._lastFlushPromise || { ok: true, processed: 0, pending: this.getPendingCount() };
    }
    const pending = this._loadPendingUpserts();
    if (!pending.length) return { ok: true, processed: 0, pending: 0 };

    this._isFlushingUpserts = true;
    const summary = { ok: true, processed: 0, failed: 0 };

    const flushPromise = (async () => {
      while (pending.length) {
        const item = pending[0];
        try {
          await this._sendUpsert(item);
          pending.shift();
          summary.processed += 1;
        } catch (error) {
          summary.failed += 1;
          summary.ok = false;
          console.warn('Upsert failed (will retry later):', error);
          break;
        }
      }
      this._savePendingUpserts(pending);
      this._isFlushingUpserts = false;
      summary.pending = pending.length;
      return summary;
    })();

    this._lastFlushPromise = flushPromise;
    return flushPromise;
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
    const payload = list.map(a => this._prepareForSync(a));
    
    try {
      const result = await window.LiveUpdates.request('/archers/bulk_upsert', 'POST', payload);
      this._setLastSynced();
      return result;
    } catch (error) {
      console.error('Bulk upsert failed:', error);
      throw error;
    }
  },

  // Load master list from MySQL database (PUBLIC - no auth required)
  async loadFromMySQL() {
    if (!window.LiveUpdates || !window.LiveUpdates.request) {
      throw new Error('Live Updates API is not available');
    }
    
    try {
      const result = await window.LiveUpdates.request('/archers', 'GET');
      console.log('API Response:', result); // Debug logging
      
      if (!result) {
        throw new Error('API returned null/undefined response');
      }
      
      if (!result.archers) {
        console.error('Unexpected API response format:', result);
        throw new Error('API response missing "archers" property');
      }

      const apiArchers = Array.isArray(result.archers) ? result.archers : [];
      const convertedList = apiArchers.map(apiArcher => this._fromApiArcher(apiArcher));
      this.saveList(convertedList, { lastFetchedAt: Date.now() });
      this._setLastFetched();
      return convertedList;
    } catch (error) {
      const err = (error instanceof Error) ? error : new Error(String(error));
      console.error('Load from MySQL failed:', err);
      
      // Reading the master list is public - no authentication prompt
      // If there's an error, just throw it without prompting for credentials
      throw err;
    }
  },

  _fromApiArcher(apiArcher = {}) {
    // CRITICAL: Preserve UUID (id) from database
    const databaseUuid = apiArcher.id || undefined;
    const converted = Object.assign({}, DEFAULT_ARCHER_TEMPLATE, {
      id: databaseUuid,  // Preserve UUID from database
      archerId: databaseUuid,  // Also store as archerId for compatibility
      extId: apiArcher.extId || apiArcher.id || this._buildExtId(apiArcher),
      first: this._safeString(apiArcher.firstName || apiArcher.first),
      last: this._safeString(apiArcher.lastName || apiArcher.last),
      nickname: this._safeString(apiArcher.nickname),
      photoUrl: this._safeString(apiArcher.photoUrl),
      school: this._safeString(apiArcher.school),
      grade: this._safeString(apiArcher.grade),
      gender: this._safeString(apiArcher.gender || 'M'),
      level: this._safeString(apiArcher.level || 'VAR'),
      status: this._safeString(apiArcher.status || 'active'),
      faves: this._parseFaves(apiArcher.faves),
      domEye: this._safeString(apiArcher.domEye),
      domHand: this._safeString(apiArcher.domHand),
      heightIn: apiArcher.heightIn ?? apiArcher.height_in ?? '',
      wingspanIn: apiArcher.wingspanIn ?? apiArcher.wingspan_in ?? '',
      drawLengthSugg: apiArcher.drawLengthSugg ?? apiArcher.draw_length_sugg ?? '',
      riserHeightIn: apiArcher.riserHeightIn ?? apiArcher.riser_height_in ?? '',
      limbLength: this._safeString(apiArcher.limbLength ?? apiArcher.limb_length),
      limbWeightLbs: apiArcher.limbWeightLbs ?? apiArcher.limb_weight_lbs ?? '',
      notesGear: this._safeString(apiArcher.notesGear ?? apiArcher.notes_gear),
      notesCurrent: this._safeString(apiArcher.notesCurrent ?? apiArcher.notes_current),
      notesArchive: this._safeString(apiArcher.notesArchive ?? apiArcher.notes_archive),
      email: this._safeString(apiArcher.email),
      phone: this._safeString(apiArcher.phone),
      usArcheryId: this._safeString(apiArcher.usArcheryId ?? apiArcher.us_archery_id),
      jvPr: apiArcher.jvPr ?? apiArcher.jv_pr ?? '',
      varPr: apiArcher.varPr ?? apiArcher.var_pr ?? '',
      shirtSize: this._safeString(apiArcher.shirtSize ?? apiArcher.shirt_size),
      pantSize: this._safeString(apiArcher.pantSize ?? apiArcher.pant_size),
      hatSize: this._safeString(apiArcher.hatSize ?? apiArcher.hat_size),
      coachFavorite: !!apiArcher.coachFavorite,
      fave: !!apiArcher.coachFavorite,
      bale: '',
      target: '',
      size: ''
    });
    converted.gender = this._normalizeGender(converted.gender);
    converted.level = this._normalizeLevel(converted.level);
    converted.status = this._normalizeStatus(converted.status);
    converted.domEye = this._normalizeDom(converted.domEye);
    converted.domHand = this._normalizeDom(converted.domHand);
    converted.limbLength = this._normalizeLimbLength(converted.limbLength);
    converted.faves = this._parseFaves(converted.faves);
    converted.__schemaVersion = ARCHER_SCHEMA_VERSION;
    return converted;
  },

  // Sync: Push localStorage to MySQL (one-way sync)
  async syncToMySQL() {
    try {
      const list = this.loadList();
      if (!Array.isArray(list) || list.length === 0) {
        alert('No master list found in local storage to sync.');
        return { ok: false };
      }

      const pendingBefore = this.getPendingCount();
      list.forEach(archer => {
        this._queuePendingUpsert(archer);
      });
      const flushSummary = await this._flushPendingUpserts();
      console.log('Sync to MySQL complete:', flushSummary);
      return Object.assign({ ok: flushSummary.ok }, flushSummary, { previouslyPending: pendingBefore });
    } catch (error) {
      console.error('Sync to MySQL failed:', error);
      alert('Failed to sync archer list to database: ' + error.message);
      return { ok: false, error: error.message };
    }
  },

  // Save archer list to localStorage (legacy signature)
  saveListLegacy(list) {
    this.saveList(list);
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
    localStorage.removeItem(ARCHER_LIST_META_KEY);
    localStorage.removeItem(ARCHER_PENDING_UPSERT_KEY);
    this.clearSelf();
  },

  // Add a new archer
  async addArcher(archer) {
    const list = this.loadList();
    const normalized = this._applyTemplate(Object.assign({}, archer, {
      extId: archer.extId || this._buildExtId(archer),
      coachFavorite: !!archer.coachFavorite || !!archer.fave,
      fave: !!archer.coachFavorite || !!archer.fave
    }));
    list.push(normalized);
    this.saveList(list);
    const syncResult = await this._queuePendingUpsert(normalized);
    return { archer: normalized, sync: syncResult };
  },

  // Edit an archer by index
  async editArcher(index, updatedArcher) {
    const list = this.loadList();
    if (index >= 0 && index < list.length) {
      const merged = Object.assign({}, list[index], updatedArcher);
      merged.extId = merged.extId || this._buildExtId(merged);
      list[index] = this._applyTemplate(merged);
      this.saveList(list);
      const syncResult = await this._queuePendingUpsert(list[index]);
      return { archer: list[index], sync: syncResult };
    }
    return { archer: null, sync: { ok: false, pending: this.getPendingCount() } };
  },

  async toggleFriend(friendExtId) {
    const selfExtId = this.getSelfExtId();
    if (!selfExtId) {
      throw new Error('Self archer not set');
    }
    const list = this.loadList();
    const index = list.findIndex(a => a.extId === selfExtId);
    if (index === -1) {
      this.clearSelf();
      throw new Error('Self archer no longer exists');
    }
    const archer = Object.assign({}, list[index]);
    const current = new Set((archer.faves || []).filter(Boolean));
    if (friendExtId === selfExtId) {
      current.clear();
    } else if (current.has(friendExtId)) {
      current.delete(friendExtId);
    } else {
      current.add(friendExtId);
    }
    archer.faves = Array.from(current);
    list[index] = this._applyTemplate(archer);
    this.saveList(list);
    const sync = await this._queuePendingUpsert(list[index]);
    return { archer: list[index], sync };
  },

  // Delete an archer by index
  deleteArcher(index) {
    const list = this.loadList();
    if (index >= 0 && index < list.length) {
      list.splice(index, 1);
      this.saveList(list);
    }
  },

  // Import from CSV (overwrites current list)
  importCSV(csvText) {
    if (!csvText) throw new Error('CSV text is required');
    const rows = csvText.trim().split(/\r?\n/);
    if (rows.length < 2) return [];
    
    // Parse CSV line with proper quote handling
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++; // Skip next quote (escaped quote)
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
    
    const headers = parseCSVLine(rows[0]).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
    const list = rows
      .slice(1)
      .map(line => {
        if (!line.trim()) return null;
        const cols = parseCSVLine(line).map(col => col.replace(/^"|"$/g, '').trim());
        const row = {};
        headers.forEach((header, idx) => {
          row[header] = cols[idx] || '';
        });
        return this._fromCsvRow(row);
      })
      .filter(Boolean);
    this.saveList(list, { source: 'csv-import', lastImportedAt: Date.now() });
    return list;
  },

  _fromCsvRow(row = {}) {
    const lookup = key => {
      const val = row[key] || row[key.replace(/_/g, '')];
      return val !== undefined && val !== null && val !== '' ? String(val).trim() : '';
    };
    // CRITICAL: Preserve UUID (id) from CSV if present (for database matching)
    const id = lookup('id') || lookup('uuid') || '';
    const parsed = Object.assign({}, DEFAULT_ARCHER_TEMPLATE, {
      id: id || undefined,  // Only set if UUID exists (don't set empty string)
      archerId: id || undefined,  // Also set archerId for compatibility
      extId: lookup('extid') || '',
      first: lookup('first'),
      last: lookup('last'),
      nickname: lookup('nickname'),
      photoUrl: lookup('photo') || lookup('photourl'),
      school: lookup('school'),
      grade: lookup('grade'),
      gender: lookup('gender'),
      level: lookup('level'),
      status: lookup('status') || 'active',
      email: lookup('email'),
      phone: lookup('phone'),
        usArcheryId: lookup('usa_archery_id') || lookup('usaarcheryid') || lookup('usaarchery'),
        jvPr: lookup('jv_pr') || lookup('jvpr'),
        varPr: lookup('var_pr') || lookup('varpr'),
        shirtSize: lookup('shirt_size') || lookup('shirtsize'),
        pantSize: lookup('pant_size') || lookup('pantsize'),
        hatSize: lookup('hat_size') || lookup('hatsize'),
      domEye: lookup('dom_eye') || lookup('domeye'),
      domHand: lookup('dom_hand') || lookup('domhand'),
      heightIn: lookup('height') || lookup('height_in'),
      wingspanIn: lookup('wingspan') || lookup('wingspan_in'),
      drawLengthSugg: lookup('draw_length_sugg') || lookup('drawlengthsugg'),
      riserHeightIn: lookup('riser_height') || lookup('riser_height_in'),
      limbLength: lookup('limb_length'),
      limbWeightLbs: lookup('limb_weight') || lookup('limb_weight_lbs'),
      notesGear: lookup('notes_gear'),
      notesCurrent: lookup('notes_current'),
      notesArchive: lookup('notes_archive'),
      faves: this._parseFaves(lookup('faves')),
      coachFavorite: lookup('coach_favorite') === 'true' || lookup('coachfavorite') === 'true',
      fave: lookup('coach_favorite') === 'true' || lookup('coachfavorite') === 'true'
    });
    parsed.gender = this._normalizeGender(parsed.gender);
    parsed.level = this._normalizeLevel(parsed.level);
    parsed.status = this._normalizeStatus(parsed.status);
    parsed.domEye = this._normalizeDom(parsed.domEye);
    parsed.domHand = this._normalizeDom(parsed.domHand);
    parsed.limbLength = this._normalizeLimbLength(parsed.limbLength);
    parsed.faves = this._parseFaves(parsed.faves);
    parsed.extId = parsed.extId || this._buildExtId(parsed);
    parsed.__schemaVersion = ARCHER_SCHEMA_VERSION;
    return parsed;
  },

  // Export to CSV (client download)
  exportCSV() {
    const list = this.loadList();
    if (!list.length) {
      alert('No archers to export.');
      return '';
    }
    // CRITICAL: UUID (id) as first column for database matching
    const headers = [
      'id',           // Database UUID (first column for visibility and matching)
      'extId',        // Composite ID: first-last-school (alternate identifier)
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
      'faves',
      'shirtSize',
      'pantSize',
      'hatSize'
    ];
    const rows = list.map(archer => {
      const normalized = this._applyTemplate(archer);
      const faves = (normalized.faves || []).join(';');
      return headers.map(header => {
        // Handle id field (may be stored as id or archerId)
        let value = normalized[header];
        if (header === 'id') {
          // Try multiple sources for UUID
          value = normalized.id || normalized.archerId || normalized._id || '';
          // If still no UUID, leave empty (will be generated on next sync)
          if (!value) {
            console.warn(`Archer ${normalized.first} ${normalized.last} has no UUID in local storage. Sync from MySQL to get UUID.`);
          }
        }
        if (value === undefined) value = '';
        if (header === 'faves') return `"${faves.replace(/"/g, '""')}"`;
        const str = value === null || value === undefined ? '' : String(value);
        if (str.includes(',') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');

    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `archer-list-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export CSV failed', err);
    }
    return csv;
  },

  // Load default CSV if localStorage is empty
  loadDefaultCSVIfNeeded: async function(force = false) {
    if (!force && localStorage.getItem(ARCHER_LIST_KEY)) return; // Already loaded
    try {
      const url = force ? `app-imports/listimport-01.csv?v=${Date.now()}` : 'app-imports/listimport-01.csv';
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Failed to fetch CSV');
      const text = await resp.text();
      this.importCSV(text);
    } catch (e) {
      console.error('Failed to load default CSV:', e);
      alert('Error: Could not load the default archer list from "app-imports/listimport-01.csv".\n\nPlease check that the file exists and the server is running correctly.\n\nDetails: ' + e.message);
    }
  }
};

// Make available globally
window.ArcherModule = ArcherModule;
