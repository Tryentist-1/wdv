# Phase 1: Archer Data Unification with Smart Matching and Full Field Sync

> **⚠️ DEPRECATED - ARCHIVED November 17, 2025**
> 
> **Reason:** Historical PR description from Phase 1 - work completed
> 
> This file is kept for historical reference only.

---

## 🎯 Overview

This PR implements Phase 1 of the archer data unification plan, making MySQL the single source of truth with complete field synchronization, smart matching, and UUID preservation.

## ✅ What's Changed

### API Endpoints (Phase 1.1)

#### GET /v1/archers
- **Before:** Returned only 8 fields (id, extId, firstName, lastName, school, level, gender, createdAt)
- **After:** Returns all 30 fields including nickname, photoUrl, grade, status, email, phone, notes, PRs, physiology fields, etc.
- **Impact:** Full archer profiles available when loading from database

#### POST /v1/archers/bulk_upsert
- **Before:** Only handled 5 fields (firstName, lastName, school, level, gender), matched only by extId
- **After:** 
  - Handles all 30 fields
  - Smart matching with priority: UUID → extId → email → phone → name+school → name
  - Partial updates (only update provided fields)
  - Field normalization and validation
  - Sync verification (returns samples of inserted/updated records)
- **Impact:** Complete data sync with intelligent duplicate prevention

### CSV Import/Export (Phase 1.2)

#### CSV Export
- **Before:** No UUID column
- **After:** UUID (`id`) as first column for database matching
- **Impact:** CSV round-trips preserve database relationships

#### CSV Import
- **Before:** UUID not preserved, basic field matching
- **After:** 
  - Preserves UUIDs from CSV
  - Smart matching via API (handles incomplete CSV columns)
  - Proper quote handling for fields with commas
- **Impact:** CSV imports can match existing archers even with incomplete data

### UI Enhancements

#### Coach Console
- Added "Export CSV from Database" button
- Downloads authoritative CSV directly from MySQL
- Includes all fields with UUIDs

#### Archer Management
- UUID preservation when loading from MySQL
- Export CSV includes UUID (if available in local storage)
- Better error handling and user feedback

### Infrastructure

#### Localhost Detection
- `coach.js` and `live_updates.js` now detect localhost and use local API
- Automatic switching between local and production APIs
- All buttons work correctly in local development

#### Bug Fixes
- Fixed event creation: gender/level fields required for rounds
- Fixed API base URL detection for local development

## 🔧 Technical Details

### Smart Matching Logic

Priority order for matching existing archers:
1. **UUID** (if provided in CSV/request)
2. **extId** (first-last-school composite)
3. **Email** (if unique)
4. **Phone** (if unique)
5. **Name + School** (first + last + school composite)
6. **Name only** (if unique match)

### Field Normalization

All fields are validated and normalized server-side:
- Gender: M/F (defaults to M)
- Level: VAR/JV/BEG (defaults to VAR)
- Status: active/inactive (defaults to active)
- School: Uppercase, max 3 characters
- Numeric fields: Proper type conversion
- JSON fields: Proper encoding/decoding

### Partial Updates

When updating existing archers:
- Only fields that are provided are updated
- Missing fields (NULL) don't overwrite existing data
- Preserves existing data when CSV is incomplete

## 📊 Files Changed

### Core API
- `api/index.php` - Enhanced GET/POST /v1/archers endpoints, smart matching, field normalization

### Frontend
- `js/archer_module.js` - CSV export with UUID, UUID preservation, improved import
- `js/coach.js` - Export CSV from Database, localhost API detection
- `js/live_updates.js` - Localhost API detection
- `coach.html` - Export CSV button

### Documentation
- `docs/ARCHER_DATA_UNIFICATION_PHASE1.md` - Complete Phase 1 plan and recommendations
- `docs/PHASE1_UI_ACCESS_GUIDE.md` - UI access guide for Phase 1 features

## 🧪 Testing

### Local Testing Completed
- ✅ GET /v1/archers returns all 30 fields
- ✅ POST /v1/archers/bulk_upsert smart matching works
- ✅ CSV export includes UUID
- ✅ CSV import preserves UUIDs
- ✅ Coach Console export works
- ✅ Archer Management sync works
- ✅ Localhost API detection works

### Test Scripts
- `test_phase1_local.sh` - Automated API testing
- `test_phase1_local_guide.md` - Manual testing guide

## 🚀 Deployment Notes

### Database
- No schema changes required (uses existing fields)
- Backward compatible with existing data

### Breaking Changes
- None - all changes are additive and backward compatible

### Migration
- Existing archers will get UUIDs on next sync
- CSV exports will include UUIDs going forward
- Old CSV files without UUIDs will still work (smart matching)

## 📝 Next Steps

After this PR is merged:
1. Test on production with real data
2. Phase 1.3: Add sync verification UI
3. Phase 1.4: Create database export endpoint (already implemented in Coach Console)
4. Phase 2: Enhanced CSV validation and error reporting

## 🔗 Related Issues

- Phase 1 of archer data unification plan
- Makes MySQL single source of truth
- Enables complete field synchronization

## ✅ Checklist

- [x] Code tested locally
- [x] All API endpoints working
- [x] CSV import/export working
- [x] Smart matching verified
- [x] UUID preservation verified
- [x] Localhost detection working
- [x] Documentation updated
- [x] No breaking changes
- [x] Backward compatible

---

**Ready for review and testing!** 🎉

