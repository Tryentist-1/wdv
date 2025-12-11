# Release Notes v1.9.3

**Release Date:** December 11, 2025  
**Status:** ✅ Production  
**Branch:** `fix/standalone-round-stranded-cards`  
**Type:** Feature Enhancement + Bug Fixes

---

## 🎯 Major Feature: Extended Archer Profile for USA Archery Reporting

This release adds comprehensive coach-only profile fields to support USA Archery reporting requirements, along with several UX improvements to the archer management interface.

---

## ✨ Key Features

### Extended Archer Profile Fields (Coach-Only)
- **12 New Fields Added:**
  - Date of Birth (`dob`)
  - Secondary Email (`email2`)
  - Nationality (defaults to "U.S.A.")
  - Ethnicity
  - Discipline (Recurve, Compound, Barebow)
  - Full Mailing Address (Street, Street 2, City, State, Postal Code)
  - Disability Information
  - Camp Attendance (Y/N)

- **Coach-Only Visibility:** All new fields are only visible to users with coach API keys
- **Optional Fields:** All fields are optional with sensible defaults
- **Amber Styling:** Extended Profile section uses amber highlighting to indicate coach-only access

### CSV Export for USA Archery Reporting
- **New Export Function:** `exportCoachRosterCSV()` in ArcherModule
- **Specific Columns:** Exports exactly the fields required for USA Archery reporting:
  - First Name, Last Name, USAArcheryNo, DOB, Email1, Email2, Phone, Gender, Nationality, Ethnicity, Discipline, Street Address, Street Address 2, City, State, PostalCode, Disability, Camp
- **Export Button:** Amber "Export" button in footer (coach-only visibility)
- **File Naming:** Downloads as `coach-roster-YYYY-MM-DD.csv`

---

## 🐛 Bug Fixes

### Modal UX Improvements
- **Save Button Accessibility:** Fixed issue where Save button was cut off when dropdowns extended beyond scrollable area
  - Buttons now fixed at bottom of modal, outside scrollable form content
  - Modal uses flexbox layout for proper space distribution

- **Navigation Button Visibility:** Fixed black-on-black navigation buttons in dark mode
  - Changed from `text-white/80` to full `text-white` for better contrast
  - Added `border border-white/30` for visual definition
  - Improved hover states with `hover:bg-white/30`

- **Expanded Sections Persistence:** Fixed issue where expanded sections (like "Equipment") would collapse when navigating between archers
  - System now remembers which sections are expanded
  - Expanded state persists when using Next/Previous buttons
  - Works for all collapsible sections: Performance, Equipment, Notes, Sizes, Contact, Friends, Extended Profile

---

## 📁 Files Modified

### Database & API
- ✅ `api/sql/migration_archer_extended_profile.sql` - New migration (MySQL 5.7+ compatible)
- ✅ `api/sql/schema.mysql.sql` - Updated base schema
- ✅ `api/index.php` - Updated GET `/v1/archers` and POST `/v1/archers/bulk_upsert` endpoints

### Frontend
- ✅ `js/archer_module.js` - Added new fields to template, sync functions, and CSV export
- ✅ `archer_list.html` - Added coach-only form section, export button, and UX fixes

### Utilities
- ✅ `api/backfill_entry_codes.php` - New script for backfilling standalone round entry codes
- ✅ `api/sql/backfill_standalone_entry_codes.sql` - Supporting SQL

---

## 🔧 Technical Improvements

### Database Schema
- **12 New Columns:** All nullable with appropriate defaults
- **Index Added:** `idx_archers_nationality` for common filtering
- **Migration Safety:** Uses stored procedures for MySQL 5.7+ compatibility
- **Backward Compatible:** All fields optional, no breaking changes

### API Enhancements
- **Field Support:** All new fields included in GET and POST endpoints
- **Normalization:** Proper handling of null values and defaults
- **Bulk Operations:** New fields supported in bulk_upsert operations

### Frontend Architecture
- **Coach Detection:** `isCoachMode()` helper function checks for API key
- **Conditional Rendering:** Extended Profile section only renders for coaches
- **State Management:** Expanded sections state tracked across navigation
- **Export Functionality:** Client-side CSV generation with proper escaping

---

## 🎨 UI/UX Improvements

### Modal Layout
- **Flexbox Structure:** Modal now uses `flex flex-col` for proper layout
- **Fixed Buttons:** Save/Cancel buttons always visible at bottom
- **Scrollable Content:** Form content scrolls independently
- **Safe Areas:** iOS safe area support for button container

### Visual Feedback
- **Amber Highlighting:** Coach-only sections clearly marked
- **Button Contrast:** Navigation buttons clearly visible in all modes
- **State Persistence:** User preferences (expanded sections) remembered

### Mobile Optimization
- **Touch Targets:** All buttons meet 44px minimum height
- **Scrollable Areas:** Proper overflow handling prevents content loss
- **Responsive Design:** Works correctly on all screen sizes

---

## 📚 Documentation

### Updated Documents
- ✅ `01-SESSION_QUICK_START.md` - Updated with today's session work
- ✅ `api/sql/migration_archer_extended_profile.sql` - Comprehensive migration script with comments

### New Documentation
- Migration script includes detailed comments and verification queries
- Export function documented in ArcherModule.js

---

## ✅ Testing Performed

### Database
- ✅ Migration tested on local MySQL 5.7+
- ✅ All 12 columns created successfully
- ✅ Default values applied correctly
- ✅ Index created successfully

### API
- ✅ GET `/v1/archers` returns all new fields
- ✅ POST `/v1/archers/bulk_upsert` accepts and stores new fields
- ✅ Null values handled correctly
- ✅ Default values applied on insert

### Frontend
- ✅ Coach-only section only visible with API key
- ✅ Export button only visible to coaches
- ✅ CSV export generates correct columns
- ✅ Modal buttons always accessible
- ✅ Navigation buttons visible in dark mode
- ✅ Expanded sections persist across navigation

### Mobile
- ✅ Modal layout works on small screens
- ✅ Buttons accessible when form is long
- ✅ Dropdowns don't block Save button
- ✅ Touch targets meet requirements

---

## 🚨 Breaking Changes

**None** - All changes are additive. Existing functionality unchanged.

---

## 🔄 Migration Notes

### For Database Administrators
1. Run migration: `api/sql/migration_archer_extended_profile.sql`
2. Migration is idempotent (safe to run multiple times)
3. Uses stored procedures for MySQL 5.7+ compatibility
4. Verification query included in migration

### For Developers
- **New Fields:** Access via `archer.dob`, `archer.email2`, etc.
- **Coach Check:** Use `isCoachMode()` helper in archer_list.html
- **Export:** Call `ArcherModule.exportCoachRosterCSV()` for CSV generation

### For Users
- **No Action Required** - All improvements are transparent
- **Coaches:** Extended Profile section appears automatically when editing archers
- **Export:** Use amber "Export" button in footer to download roster CSV

---

## 🚀 Deployment Notes

### Pre-Deployment Checklist
- [x] Database migration tested on local
- [x] API endpoints tested with new fields
- [x] Frontend coach detection working
- [x] Export function tested
- [x] Modal UX fixes verified
- [x] Dark mode navigation buttons visible
- [x] Expanded sections persistence working

### Post-Deployment
- ✅ Database migration applied to production
- ✅ All files deployed via FTP
- ✅ Cloudflare cache purged
- ✅ No errors reported

---

## 🔗 Related Documentation

- **Previous Release:** [v1.9.2](RELEASE_NOTES_v1.9.2.md) - Footer Standardization
- **Session Notes:** `01-SESSION_QUICK_START.md`
- **Migration Script:** `api/sql/migration_archer_extended_profile.sql`

---

**Version:** 1.9.3  
**Previous Version:** 1.9.2  
**Next Version:** TBD
