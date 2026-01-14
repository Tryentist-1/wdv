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
  email2: '',
  phone: '',
  dob: '',
  nationality: 'U.S.A.',
  ethnicity: '',
  discipline: '',
  streetAddress: '',
  streetAddress2: '',
  city: '',
  state: '',
  postalCode: '',
  disability: '',
  campAttendance: '',
  // USA Archery fields
  validFrom: '',
  clubState: '',
  membershipType: '',
  addressCountry: 'USA',
  addressLine3: '',
  disabilityList: '',
  militaryService: 'No',
  introductionSource: '',
  introductionOther: '',
  nfaaMemberNo: '',
  schoolType: '',
  schoolFullName: '',
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
    // Match on extId, id (UUID), or built extId
    const found = Array.isArray(list) ? list.find(a => 
      a.extId === extId || 
      a.id === extId || 
      this._buildExtId(a) === extId
    ) : null;
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
      email2: this._safeString(data.email2),
      phone: this._safeString(data.phone),
      dob: this._safeString(data.dob),
      nationality: this._safeString(data.nationality) || 'U.S.A.',
      ethnicity: this._safeString(data.ethnicity),
      discipline: this._safeString(data.discipline),
      streetAddress: this._safeString(data.streetAddress),
      streetAddress2: this._safeString(data.streetAddress2),
      city: this._safeString(data.city),
      state: this._safeString(data.state),
      postalCode: this._safeString(data.postalCode),
      disability: this._safeString(data.disability),
      campAttendance: this._safeString(data.campAttendance),
      validFrom: this._safeString(data.validFrom),
      clubState: this._safeString(data.clubState),
      membershipType: this._safeString(data.membershipType),
      addressCountry: this._safeString(data.addressCountry) || 'USA',
      addressLine3: this._safeString(data.addressLine3),
      disabilityList: this._safeString(data.disabilityList),
      militaryService: this._safeString(data.militaryService) || 'No',
      introductionSource: this._safeString(data.introductionSource),
      introductionOther: this._safeString(data.introductionOther),
      nfaaMemberNo: this._safeString(data.nfaaMemberNo),
      schoolType: this._safeString(data.schoolType),
      schoolFullName: this._safeString(data.schoolFullName),
      usArcheryId: this._safeString(data.usArcheryId),
      jvPr: this._toNullableInt(data.jvPr),
      varPr: this._toNullableInt(data.varPr),
      shirtSize: this._safeString(data.shirtSize),
      pantSize: this._safeString(data.pantSize),
      hatSize: this._safeString(data.hatSize)
    };
    return payload;
  },

  // Update archer's own profile (magical self-edit - no auth required!)
  async updateSelfProfile(archer) {
    if (!window.LiveUpdates || !window.LiveUpdates.request) {
      throw new Error('Live Updates API is not available');
    }
    
    // Use the new self-update endpoint that doesn't require authentication
    const payload = this._prepareForSync(archer);
    const result = await window.LiveUpdates.request('/archers/self', 'POST', payload);
    this._setLastSynced();
    return result;
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
      email2: this._safeString(apiArcher.email2),
      phone: this._safeString(apiArcher.phone),
      dob: this._safeString(apiArcher.dob),
      nationality: this._safeString(apiArcher.nationality) || 'U.S.A.',
      ethnicity: this._safeString(apiArcher.ethnicity),
      discipline: this._safeString(apiArcher.discipline),
      streetAddress: this._safeString(apiArcher.streetAddress ?? apiArcher.street_address),
      streetAddress2: this._safeString(apiArcher.streetAddress2 ?? apiArcher.street_address2),
      city: this._safeString(apiArcher.city),
      state: this._safeString(apiArcher.state),
      postalCode: this._safeString(apiArcher.postalCode ?? apiArcher.postal_code),
      disability: this._safeString(apiArcher.disability),
      campAttendance: this._safeString(apiArcher.campAttendance ?? apiArcher.camp_attendance),
      validFrom: this._safeString(apiArcher.validFrom ?? apiArcher.valid_from),
      clubState: this._safeString(apiArcher.clubState ?? apiArcher.club_state),
      membershipType: this._safeString(apiArcher.membershipType ?? apiArcher.membership_type),
      addressCountry: this._safeString(apiArcher.addressCountry ?? apiArcher.address_country) || 'USA',
      addressLine3: this._safeString(apiArcher.addressLine3 ?? apiArcher.address_line3),
      disabilityList: this._safeString(apiArcher.disabilityList ?? apiArcher.disability_list),
      militaryService: this._safeString(apiArcher.militaryService ?? apiArcher.military_service) || 'No',
      introductionSource: this._safeString(apiArcher.introductionSource ?? apiArcher.introduction_source),
      introductionOther: this._safeString(apiArcher.introductionOther ?? apiArcher.introduction_other),
      nfaaMemberNo: this._safeString(apiArcher.nfaaMemberNo ?? apiArcher.nfaa_member_no),
      schoolType: this._safeString(apiArcher.schoolType ?? apiArcher.school_type),
      schoolFullName: this._safeString(apiArcher.schoolFullName ?? apiArcher.school_full_name),
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
    
    // Detect delimiter (tab or comma)
    const firstLine = rows[0];
    const hasTabs = firstLine.includes('\t');
    const delimiter = hasTabs ? '\t' : ',';
    
    // Parse CSV/TSV line with proper quote handling
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
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim()); // Add last field
      return result;
    };
    
    // Parse headers - preserve original case for mapping, but also store lowercase for lookup
    const rawHeaders = parseCSVLine(rows[0]).map(h => h.replace(/^"|"$/g, '').trim());
    const headers = rawHeaders.map(h => h.toLowerCase());
    
    const list = rows
      .slice(1)
      .map(line => {
        if (!line.trim()) return null;
        const cols = parseCSVLine(line).map(col => col.replace(/^"|"$/g, '').trim());
        const row = {};
        // Store both original and lowercase versions for flexible lookup
        rawHeaders.forEach((rawHeader, idx) => {
          const lowerHeader = rawHeader.toLowerCase();
          row[lowerHeader] = cols[idx] || '';
          row[rawHeader] = cols[idx] || ''; // Also store original case
        });
        return this._fromCsvRow(row);
      })
      .filter(Boolean);
    this.saveList(list, { source: 'csv-import', lastImportedAt: Date.now() });
    return list;
  },

  _fromCsvRow(row = {}) {
    const lookup = key => {
      // Try multiple variations: exact match, lowercase, with/without underscores
      const variations = [
        key,
        key.toLowerCase(),
        key.toUpperCase(),
        key.replace(/_/g, ''),
        key.replace(/_/g, '').toLowerCase(),
        key.replace(/_/g, '').toUpperCase(),
        // Handle common variations like "First Name" vs "First"
        key === 'first' ? 'first name' : null,
        key === 'last' ? 'last name' : null,
        key === 'first name' ? 'first' : null,
        key === 'last name' ? 'last' : null
      ].filter(Boolean);
      
      for (const variant of variations) {
        if (row[variant] !== undefined && row[variant] !== null && row[variant] !== '') {
          return String(row[variant]).trim();
        }
      }
      return '';
    };
    // CRITICAL: Preserve UUID (id) from CSV if present (for database matching)
    const id = lookup('id') || lookup('uuid') || '';
    const parsed = Object.assign({}, DEFAULT_ARCHER_TEMPLATE, {
      id: id || undefined,  // Only set if UUID exists (don't set empty string)
      archerId: id || undefined,  // Also set archerId for compatibility
      extId: lookup('extid') || '',
      first: lookup('first') || lookup('first name') || lookup('First') || lookup('First Name'),
      last: lookup('last') || lookup('last name') || lookup('Last') || lookup('Last Name'),
      nickname: lookup('nickname'),
      photoUrl: lookup('photo') || lookup('photourl'),
      school: lookup('school'),
      grade: lookup('grade'),
      gender: lookup('gender') || lookup('gener'), // Handle typo "Gener"
      level: lookup('level'),
      status: lookup('status') || 'active',
      email: lookup('email') || lookup('email 2') || lookup('email2'), // Handle "Email 2" column
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
      // Address fields
      streetAddress: lookup('street_address') || lookup('streetaddress') || lookup('address1') || lookup('Address1'),
      streetAddress2: lookup('street_address2') || lookup('streetaddress2') || lookup('address2') || lookup('Address2'),
      city: lookup('city') || lookup('City'),
      state: lookup('state') || lookup('State'),
      postalCode: lookup('postal_code') || lookup('postalcode') || lookup('PostalCode') || lookup('zip'),
      // Basic profile fields
      dob: lookup('dob') || lookup('DOB'),
      nationality: lookup('nationality') || lookup('Nationality'),
      ethnicity: lookup('ethnicity') || lookup('Ethnicity'),
      discipline: lookup('discipline') || lookup('Discipline'),
      disability: lookup('disability') || lookup('Disability?'), // Handle "Disability?" column
      // USA Archery fields (for CSV import compatibility)
      validFrom: lookup('valid_from') || lookup('validfrom'),
      clubState: lookup('club_state') || lookup('clubstate'),
      membershipType: lookup('membership_type') || lookup('membershiptype'),
      addressCountry: lookup('address_country') || lookup('addresscountry') || lookup('Address_Country') || 'USA',
      addressLine3: lookup('address_line3') || lookup('addressline3') || lookup('address3'),
      disabilityList: lookup('disability_list') || lookup('disabilitylist'),
      militaryService: lookup('military_service') || lookup('militaryservice') || 'No',
      introductionSource: lookup('introduction_source') || lookup('introductionsource') || lookup('Intro_to_Archery') || lookup('Intro to Archery'),
      introductionOther: lookup('introduction_other') || lookup('introductionother'),
      nfaaMemberNo: lookup('nfaa_member_no') || lookup('nfaamemberno') || lookup('nfaa'),
      schoolType: lookup('school_type') || lookup('schooltype'),
      schoolFullName: lookup('school_full_name') || lookup('schoolfullname'),
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

  // Export coach roster CSV with specific fields for USA Archery reporting
  exportCoachRosterCSV() {
    const list = this.loadList();
    if (!list.length) {
      alert('No archers to export.');
      return '';
    }
    // Coach roster specific columns as requested
    const headers = [
      'First Name',
      'Last Name',
      'USAArcheryNo',
      'DOB',
      'Email1',
      'Email2',
      'Phone',
      'Gender',
      'Nationality',
      'Ethnicity',
      'Discipline',
      'Street Address',
      'Street Address 2',
      'City',
      'State',
      'PostalCode',
      'Disability',
      'Camp'
    ];
    
    // Map internal field names to CSV headers
    const fieldMap = {
      'First Name': 'first',
      'Last Name': 'last',
      'USAArcheryNo': 'usArcheryId',
      'DOB': 'dob',
      'Email1': 'email',
      'Email2': 'email2',
      'Phone': 'phone',
      'Gender': 'gender',
      'Nationality': 'nationality',
      'Ethnicity': 'ethnicity',
      'Discipline': 'discipline',
      'Street Address': 'streetAddress',
      'Street Address 2': 'streetAddress2',
      'City': 'city',
      'State': 'state',
      'PostalCode': 'postalCode',
      'Disability': 'disability',
      'Camp': 'campAttendance'
    };

    const rows = list.map(archer => {
      const normalized = this._applyTemplate(archer);
      return headers.map(header => {
        const fieldName = fieldMap[header];
        let value = normalized[fieldName];
        if (value === undefined || value === null) value = '';
        const str = String(value);
        // Quote values that contain commas, quotes, or newlines
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
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
      link.download = `coach-roster-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export Coach Roster CSV failed', err);
    }
    return csv;
  },

  /**
   * Export shirt order CSV for custom jersey/apparel ordering.
   * Exports archers with fields formatted for shirt order forms:
   * - Name on Jersey: LastName
   * - Number: blank
   * - Size: Gender (W or M) + "-" + ShirtSize (e.g., "M-L" or "W-XL")
   * - Name on Front: Nickname (or FirstName if no Nickname)
   * - Style: "archery 1/4 zip"
   * - Note: blank
   * 
   * Fetches fresh data from the API before exporting to ensure production data.
   * 
   * @returns {Promise<string>} CSV content (also triggers download)
   */
  async exportShirtOrderCSV() {
    // Fetch fresh data from API first to ensure we're exporting production data
    let list = [];
    try {
      console.log('[Export Shirt Order] Fetching fresh data from API...');
      list = await this.loadFromMySQL();
      console.log(`[Export Shirt Order] Loaded ${list.length} archers from production database`);
    } catch (error) {
      console.warn('[Export Shirt Order] Failed to fetch from API, using cached data:', error);
      // Fallback to localStorage if API fails
      list = this.loadList();
      if (list.length > 0) {
        const useCached = confirm(
          'Could not fetch fresh data from server.\n\n' +
          'Using cached data. This may be from a different environment.\n\n' +
          'Click "Refresh" button first to load production data, then try exporting again.\n\n' +
          'Export cached data anyway?'
        );
        if (!useCached) {
          return '';
        }
      }
    }
    
    if (!list.length) {
      alert('No archers to export. Please refresh the list first.');
      return '';
    }
    
    // Shirt order columns matching the form format
    const headers = [
      'Name on Jersey',
      'Number',
      'Size',
      'Name on Front (if necessary)',
      'Style',
      'Note'
    ];
    
    const rows = list.map(archer => {
      const normalized = this._applyTemplate(archer);
      
      // Name on Jersey: LastName
      const nameOnJersey = this._safeString(normalized.last) || '';
      
      // Number: blank
      const number = '';
      
      // Size: Gender (W or M) + "-" + ShirtSize
      const genderPrefix = (normalized.gender === 'F' || normalized.gender === 'W') ? 'W' : 'M';
      const shirtSize = this._safeString(normalized.shirtSize) || '';
      const size = shirtSize ? `${genderPrefix}-${shirtSize}` : '';
      
      // Name on Front: Nickname (or FirstName if no Nickname)
      const nameOnFront = this._safeString(normalized.nickname) || this._safeString(normalized.first) || '';
      
      // Style: "archery 1/4 zip"
      const style = 'archery 1/4 zip';
      
      // Note: blank
      const note = '';
      
      // Build row with proper CSV escaping
      const row = [
        nameOnJersey,
        number,
        size,
        nameOnFront,
        style,
        note
      ].map(value => {
        const str = String(value);
        // Quote values that contain commas, quotes, or newlines
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      
      return row.join(',');
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `shirt-order-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export Shirt Order CSV failed', err);
      alert('Failed to export shirt order: ' + err.message);
    }
    return csv;
  },

  /**
   * Import archers from a USA Archery CSV file (30-column template format).
   * Parses CSV text, maps headers to archer fields, and merges with existing archers.
   * Supports 50+ header name variations for flexible import.
   * After saving locally, syncs imported archers to MySQL database.
   * 
   * @param {string} csvText - Raw CSV text content to parse
   * @returns {{list: Object[], errors: string[], addedCount?: number, updatedCount?: number}} 
   *   Object containing:
   *   - list: Array of parsed archer objects
   *   - errors: Array of error messages (if any)
   *   - addedCount: Number of new archers added (if import succeeded)
   *   - updatedCount: Number of existing archers updated (if import succeeded)
   */
  importUSAArcheryCSV(csvText) {
    if (!csvText || !csvText.trim()) {
      return { list: [], errors: ['Empty CSV content'] };
    }

    const errors = [];
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
    
    const rows = csvText.split('\n').filter(line => line.trim());
    if (rows.length < 2) {
      return { list: [], errors: ['CSV must have at least a header row and one data row'] };
    }

    // Parse header row - USA Archery template has specific column names
    const headers = parseCSVLine(rows[0]).map(h => h.replace(/^"|"$/g, '').trim());
    
    // Map USA Archery column names to our field names
    // Includes official names AND common alternatives/variations
    const headerToFieldMap = {
      // Email variations
      'Email': 'email',
      'Email 2': 'email',
      'email': 'email',
      
      // Name variations
      'First Name': 'first',
      'First': 'first',
      'first': 'first',
      'FirstName': 'first',
      'Last Name': 'last',
      'Last': 'last',
      'last': 'last',
      'LastName': 'last',
      
      // Gender variations
      'Gender': 'gender',
      'Gener': 'gender', // Common typo
      'gender': 'gender',
      
      // DOB variations
      'DOB': 'dob',
      'dob': 'dob',
      'Date of Birth': 'dob',
      'Birth Date': 'dob',
      'Birthdate': 'dob',
      
      // USA Archery ID
      'Membership Number Look Up': 'usArcheryId',
      'Membership Number': 'usArcheryId',
      'Member ID': 'usArcheryId',
      'USA Archery ID': 'usArcheryId',
      
      'Valid From': 'validFrom',
      
      // State/Club
      'State': 'clubState',
      'Clubs': 'schoolFullName',
      'Club': 'schoolFullName',
      
      'Membership Type': 'membershipType',
      
      // Discipline variations
      'What is your Primary Discipline?': 'discipline',
      'Discipline': 'discipline',
      'discipline': 'discipline',
      'Primary Discipline': 'discipline',
      
      // Ethnicity variations
      'Race/Ethnicity': 'ethnicity',
      'Ethnicity': 'ethnicity',
      'ethnicity': 'ethnicity',
      'Race': 'ethnicity',
      
      // Address variations
      'Address - Addr 1': 'streetAddress',
      'Address1': 'streetAddress',
      'Address 1': 'streetAddress',
      'Street Address': 'streetAddress',
      'Address': 'streetAddress',
      
      'Address - Addr 2': 'streetAddress2',
      'Address2': 'streetAddress2',
      'Address 2': 'streetAddress2',
      
      'Address - Addr 3': 'addressLine3',
      'Address3': 'addressLine3',
      
      'Address - Addr City': 'city',
      'City': 'city',
      'city': 'city',
      
      'Address - Addr State': 'state',
      // Note: 'State' maps to clubState above; use context
      
      'Address - Addr Zip Code': 'postalCode',
      'PostalCode': 'postalCode',
      'Postal Code': 'postalCode',
      'Zip': 'postalCode',
      'Zip Code': 'postalCode',
      
      'Address - Addr Country': 'addressCountry',
      'Address_Country': 'addressCountry',
      'Country': 'addressCountry',
      
      // Phone variations
      'Primary Phone Number': 'phone',
      'Phone': 'phone',
      'phone': 'phone',
      'Phone Number': 'phone',
      
      // Disability variations
      'Do you consider yourself to have a disability?': 'disability',
      'Disability?': 'disability',
      'Disability': 'disability',
      'Please select all that apply.': 'disabilityList',
      
      // Military
      'Have you ever served in the US Armed Forces?': 'militaryService',
      'Military Service': 'militaryService',
      
      // Introduction to archery
      'Please tell us where you were first introduced to archery.': 'introductionSource',
      'Intro_to_Archery': 'introductionSource',
      'Introduction to Archery': 'introductionSource',
      'How Introduced': 'introductionSource',
      'Other': 'introductionOther',
      
      // Nationality
      'Select Your Citizenship Country': 'nationality',
      'Nationality': 'nationality',
      'Citizenship': 'nationality',
      
      // NFAA
      'NFAA Membership Number': 'nfaaMemberNo',
      'NFAA Number': 'nfaaMemberNo',
      
      // School
      'School Type': 'schoolType',
      'Grade in School': 'grade',
      'Grade': 'grade',
      'School Name': 'schoolFullName',
      'School': 'schoolFullName'
    };

    const list = [];
    for (let i = 1; i < rows.length; i++) {
      const line = rows[i];
      if (!line.trim()) continue;

      const cols = parseCSVLine(line).map(col => col.replace(/^"|"$/g, '').trim());
      
      // Build row object from headers
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = cols[idx] || '';
      });

      // Map to our field names
      const archerData = Object.assign({}, DEFAULT_ARCHER_TEMPLATE);
      
      // Map each field
      headers.forEach(header => {
        const fieldName = headerToFieldMap[header];
        if (fieldName && row[header] !== undefined && row[header] !== '') {
          archerData[fieldName] = String(row[header]).trim();
        }
      });

      // Validate required fields
      if (!archerData.first || !archerData.last) {
        errors.push(`Line ${i + 1}: Missing required fields (first name, last name)`);
        continue;
      }

      // Apply defaults if not provided
      if (!archerData.gender) archerData.gender = 'M';
      if (!archerData.level) archerData.level = 'VAR';
      if (!archerData.status) archerData.status = 'active';
      if (!archerData.nationality) archerData.nationality = 'U.S.A.';
      if (!archerData.addressCountry) archerData.addressCountry = 'USA';
      if (!archerData.militaryService) archerData.militaryService = 'No';

      // Build extId if not provided
      if (!archerData.extId) {
        archerData.extId = this._buildExtId(archerData);
      }

      // Normalize fields
      archerData.gender = this._normalizeGender(archerData.gender);
      archerData.level = this._normalizeLevel(archerData.level);
      archerData.status = this._normalizeStatus(archerData.status);
      archerData.school = this._normalizeSchool(archerData.school);

      list.push(archerData);
    }

    if (list.length > 0) {
      // MERGE with existing archers instead of replacing
      const existingList = this.loadList();
      const mergedList = [...existingList];
      let addedCount = 0;
      let updatedCount = 0;
      
      list.forEach(imported => {
        // Find existing archer by extId, email, or name match
        const existingIndex = mergedList.findIndex(existing => {
          if (imported.extId && existing.extId === imported.extId) return true;
          if (imported.email && existing.email && imported.email.toLowerCase() === existing.email.toLowerCase()) return true;
          if (imported.first && imported.last && existing.first && existing.last &&
              imported.first.toLowerCase() === existing.first.toLowerCase() &&
              imported.last.toLowerCase() === existing.last.toLowerCase()) return true;
          return false;
        });
        
        if (existingIndex >= 0) {
          // Merge: update existing archer with imported data, preserving existing fields
          const existing = mergedList[existingIndex];
          mergedList[existingIndex] = Object.assign({}, existing, 
            // Only overwrite with non-empty imported values
            Object.fromEntries(
              Object.entries(imported).filter(([k, v]) => v !== '' && v !== null && v !== undefined)
            )
          );
          updatedCount++;
        } else {
          // Add new archer
          mergedList.push(imported);
          addedCount++;
        }
      });
      
      this.saveList(mergedList, { source: 'usa-archery-csv-import', lastImportedAt: Date.now() });
      console.log(`[Import] Added ${addedCount} new archers, updated ${updatedCount} existing archers`);
      
      // Sync imported/updated archers to MySQL (the master database)
      // This is async but we don't block the UI - it will sync in background
      this._syncImportedToMySQL(list).then(result => {
        if (result.ok) {
          console.log(`[Import] Synced ${list.length} archers to MySQL`);
        } else {
          console.warn('[Import] MySQL sync failed - data saved locally, will retry on next sync');
        }
      }).catch(err => {
        console.error('[Import] MySQL sync error:', err);
      });
    }

    return { list, errors, addedCount, updatedCount };
  },
  
  /**
   * Sync imported archers to MySQL database via bulk_upsert API.
   * Called automatically after CSV import to persist data to server.
   * If sync fails, archers are queued for pending retry.
   * 
   * @private
   * @param {Object[]} importedList - Array of archer objects to sync
   * @returns {Promise<{ok: boolean, result?: Object, error?: Error|string}>}
   *   Object containing:
   *   - ok: true if sync succeeded, false otherwise
   *   - result: API response (if successful)
   *   - error: Error object or message (if failed)
   */
  async _syncImportedToMySQL(importedList) {
    if (!window.LiveUpdates || !window.LiveUpdates.request) {
      console.warn('[Import] Live Updates not available - cannot sync to MySQL');
      return { ok: false, error: 'Live Updates not available' };
    }
    
    try {
      const payload = importedList.map(a => this._prepareForSync(a));
      const result = await window.LiveUpdates.request('/archers/bulk_upsert', 'POST', payload);
      this._setLastSynced();
      return { ok: true, result };
    } catch (error) {
      console.error('[Import] Failed to sync to MySQL:', error);
      // Queue for later sync
      importedList.forEach(archer => this._queuePendingUpsert(archer));
      return { ok: false, error };
    }
  },

  /**
   * Export archers to USA Archery CSV format (30-column template).
   * Downloads a CSV file with exact column order required by USA Archery.
   * Loads archers from localStorage and formats according to template.
   * 
   * @returns {string} The generated CSV content (also triggers download)
   */
  exportUSAArcheryCSV() {
    const list = this.loadList();
    if (!list.length) {
      alert('No archers to export.');
      return '';
    }
    
    // USA Archery template columns in exact order (30 columns)
    const headers = [
      'Email',
      'First Name',
      'Last Name',
      'Gender',
      'DOB',
      'Membership Number Look Up',
      'Valid From',
      'State',
      'Clubs',
      'Membership Type',
      'What is your Primary Discipline?',
      'Race/Ethnicity',
      'Address - Addr 1',
      'Address - Addr 2',
      'Address - Addr 3',
      'Address - Addr City',
      'Address - Addr State',
      'Address - Addr Zip Code',
      'Address - Addr Country',
      'Primary Phone Number',
      'Do you consider yourself to have a disability?',
      'Please select all that apply.',
      'Have you ever served in the US Armed Forces?',
      'Please tell us where you were first introduced to archery.',
      'Other',
      'Select Your Citizenship Country',
      'NFAA Membership Number',
      'School Type',
      'Grade in School',
      'School Name'
    ];
    
    // Map USA Archery columns to our internal field names
    const fieldMap = {
      'Email': 'email',
      'First Name': 'first',
      'Last Name': 'last',
      'Gender': 'gender',
      'DOB': 'dob',
      'Membership Number Look Up': 'usArcheryId',
      'Valid From': 'validFrom',
      'State': 'clubState', // Club state (not address state)
      'Clubs': 'schoolFullName', // Full school name
      'Membership Type': 'membershipType',
      'What is your Primary Discipline?': 'discipline',
      'Race/Ethnicity': 'ethnicity',
      'Address - Addr 1': 'streetAddress',
      'Address - Addr 2': 'streetAddress2',
      'Address - Addr 3': 'addressLine3',
      'Address - Addr City': 'city',
      'Address - Addr State': 'state', // Address state
      'Address - Addr Zip Code': 'postalCode',
      'Address - Addr Country': 'addressCountry',
      'Primary Phone Number': 'phone',
      'Do you consider yourself to have a disability?': 'disability',
      'Please select all that apply.': 'disabilityList',
      'Have you ever served in the US Armed Forces?': 'militaryService',
      'Please tell us where you were first introduced to archery.': 'introductionSource',
      'Other': 'introductionOther',
      'Select Your Citizenship Country': 'nationality',
      'NFAA Membership Number': 'nfaaMemberNo',
      'School Type': 'schoolType',
      'Grade in School': 'grade',
      'School Name': 'schoolFullName'
    };

    const rows = list.map(archer => {
      const normalized = this._applyTemplate(archer);
      return headers.map(header => {
        const fieldName = fieldMap[header];
        let value = fieldName ? normalized[fieldName] : '';
        if (value === undefined || value === null) value = '';
        const str = String(value);
        // Quote values that contain commas, quotes, or newlines
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
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
      link.download = `usa-archery-roster-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export USA Archery CSV failed', err);
      alert('Failed to export CSV. Please check console for details.');
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
