# Release Notes v1.8.4 - USA Archery Fields & Coach Actions

**Release Date:** December 15, 2025  
**Version:** 1.8.4  
**Deployment:** Production (FTP)  
**Git Branch:** `main`  
**Type:** Feature Release (USA Archery Integration & Bug Fixes)

## 🎯 Overview

This release adds USA Archery field support for CSV import/export, implements a mobile-friendly Coach Actions menu, and fixes critical button visibility issues caused by missing Tailwind CSS classes.

## ✨ Major Features

### USA Archery CSV Import/Export
**NEW:** Full support for USA Archery's 30-column CSV template format

- **Import USA Archery CSV:** Imports archer data from USA Archery export files
- **Export USA Archery CSV:** Exports in exact format required by USA Archery
- **Flexible Field Mapping:** Accepts multiple header name variations (e.g., `First`, `First Name`, `first`)
- **Tab & Comma Support:** Handles both TSV and CSV formats automatically

### Coach Actions Menu (Mobile-First)
**NEW:** Consolidated coach-only actions into single button with action sheet

- **Coach Button:** Orange button in footer (visible only to coaches)
- **Action Sheet Modal:** Three actions - Import USA, Export USA, Export Roster
- **Mobile Optimized:** Designed for 99% mobile user base
- **Consistent Styling:** Uses project style guide colors (`bg-orange`)

### 12 New USA Archery Database Fields
**NEW:** Extended archer profile with USA Archery-specific fields

1. `valid_from` - Membership validity start date
2. `club_state` - Club's state location
3. `membership_type` - USA Archery membership type
4. `address_country` - Mailing address country
5. `address_line3` - Third address line
6. `disability_list` - Disability details
7. `military_service` - Military service flag
8. `introduction_source` - How archer was introduced to archery
9. `introduction_other` - Other introduction details
10. `nfaa_member_no` - NFAA Membership Number
11. `school_type` - Type of school
12. `school_full_name` - Full school name

## 🐛 Bug Fixes

### Coach Button Invisible (Critical)
**FIXED:** Coach buttons were invisible due to missing Tailwind CSS classes

- **Root Cause:** `bg-amber-*` classes were not in compiled `tailwind-compiled.css`
- **Result:** White text on white background = invisible button
- **Fix:** Changed to `bg-orange` which IS in compiled CSS

### Modal Not Displaying
**FIXED:** Coach Actions modal wasn't visually appearing

- **Root Cause:** `bg-opacity-50` syntax not compiled (Tailwind 2.x)
- **Fix:** Changed to `bg-black/50` (Tailwind 3.x syntax)
- **Fix:** Aligned modal structure with working `archer-modal` pattern

### CSV Import Rejecting Valid Files
**FIXED:** Import failed with "Missing required fields" errors

- **Root Cause:** Header mapping too strict (expected `First Name`, got `First`)
- **Fix:** Added 50+ header name variations to field mapping
- **Supported Now:** `First`, `first`, `FirstName`, `First Name` all map to `first`

## 🔧 Technical Details

### Files Modified
- `archer_list.html` - Coach Actions modal, button styling, visibility logic
- `js/archer_module.js` - Flexible CSV import, USA Archery export, new field mappings
- `api/index.php` - Added 12 new fields to bulk_upsert and GET endpoints

### Database Migration
**Required:** Run `api/sql/migration_usa_archery_fields.sql` on production

```sql
-- Adds 12 new columns to archers table
ALTER TABLE archers ADD COLUMN valid_from DATE DEFAULT NULL;
ALTER TABLE archers ADD COLUMN club_state VARCHAR(50) DEFAULT NULL;
-- ... (see migration file for complete list)
```

### CSS/Styling Notes
- Only use colors that exist in `tailwind-compiled.css`
- Use `bg-black/50` not `bg-black bg-opacity-50` (Tailwind 3.x syntax)
- Run `npm run build:css` if adding new Tailwind classes

## ✅ Testing Checklist

- [x] Coach button visible with orange background
- [x] Coach Actions modal opens on button click
- [x] Modal closes on "Close" button or backdrop click
- [x] Import USA Archery CSV works with Wiseburn team file
- [x] Export USA Archery CSV downloads correctly
- [x] Export Coach Roster CSV works
- [x] New fields appear in Extended Profile section
- [x] Data persists after save and refresh

## 📱 User Experience

### For Coaches
1. Log in as coach (passcode: `wdva26`)
2. Navigate to Archer List
3. Tap orange **Coach** button in footer
4. Choose from:
   - **Import USA Archery CSV** - Upload archer data
   - **Export USA Archery CSV** - Download for USA Archery submission
   - **Export Coach Roster CSV** - Download team roster

### For Archers
- No visible changes (coach actions are coach-only)
- Extended profile fields available if coach adds data

## 🚀 Deployment Notes

### Pre-Deployment
- [x] Database migration prepared
- [x] All changes tested locally
- [x] No breaking API changes

### Deployment Steps
1. Run database migration: `migration_usa_archery_fields.sql`
2. Deploy code via FTP
3. Verify coach button visible on mobile
4. Test import with sample CSV file
5. Verify export downloads correctly

### Post-Deployment Verification
- [ ] Coach button visible (orange, in footer)
- [ ] Modal opens and closes correctly
- [ ] Import processes without errors
- [ ] Export generates valid CSV
- [ ] Extended Profile fields visible to coaches

## 📚 Documentation

### Updated
- `docs/sessions/2025-12-15_USA_ARCHERY_FIELDS_IMPLEMENTATION.md` - Complete session log
- `docs/analysis/USA_ARCHERY_FIELD_MAPPING_COMPLETE.md` - Field mapping reference

### Related
- `.agent/workflows/coach-login-start.md` - Coach login guide
- `.agent/workflows/post-deployment-testing.md` - Testing procedures

## 🎉 Summary

This release completes the USA Archery integration, enabling coaches to easily import/export archer data in USA Archery's official format. The mobile-first Coach Actions menu provides easy access to these features, and the flexible CSV parser handles real-world data variations gracefully.

---

**Previous Release:** [v1.8.3](RELEASE_NOTES_v1.8.3.md) - Progressive Web App (PWA) Support

**Deployed By:** _____________  
**Deployment Date:** December 15, 2025  
**Git Commit:** _____________  
**Production URL:** https://tryentist.com/wdv/

