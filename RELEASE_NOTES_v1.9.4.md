# Release Notes v1.9.4

**Release Date:** January 13, 2026  
**Status:** ✅ Production  
**Branch:** `main`  
**Type:** Feature Enhancement

---

## 🎯 Major Feature: Export Shirt Order for Custom Apparel

This release adds a new export feature to the Coach Actions menu, allowing coaches to export archer data in a format ready for custom jersey/apparel ordering.

---

## ✨ Key Features

### Export Shirt Order CSV
- **New Export Function:** `exportShirtOrderCSV()` in ArcherModule
- **Coach Actions Menu:** New "Export Shirt Order" button with t-shirt icon
- **Formatted Export:** Exports archers with fields matching shirt order form requirements:
  - **Name on Jersey:** LastName
  - **Number:** blank (ready for manual entry)
  - **Size:** Gender prefix (W or M) + "-" + ShirtSize (e.g., "M-L", "W-XL", "M-2X")
  - **Name on Front:** Nickname (or FirstName if no nickname)
  - **Style:** "archery 1/4 zip" (hardcoded)
  - **Note:** blank (ready for manual entry)
- **File Naming:** Downloads as `shirt-order-YYYY-MM-DD.csv`
- **Data Handling:** Gracefully handles missing data (empty shirt sizes, missing nicknames)

### Technical Details
- Follows existing export pattern for consistency
- Proper CSV escaping for commas, quotes, and newlines
- Mobile-friendly button placement in Coach Actions modal
- JSDoc documentation added for maintainability

---

## 🔧 Related Fixes

### API Field Completeness
- **GET /v1/archers Endpoint:** Now returns all fields including `shirtSize`, `pantSize`, and `hatSize`
- **Field Verification:** Created verification scripts to ensure all database fields are properly exposed in API endpoints
- **Database Migration:** Size fields (`shirt_size`, `pant_size`, `hat_size`) now properly synced to/from database

---

## 📋 Files Changed

- `archer_list.html` - Added Export Shirt Order button to Coach Actions modal
- `js/archer_module.js` - Added `exportShirtOrderCSV()` function
- `api/index.php` - Fixed GET /v1/archers to return size fields (from previous fix)

---

## 🧪 Testing

- ✅ Export function tested with various data scenarios
- ✅ Handles missing shirt sizes gracefully
- ✅ Handles missing nicknames (falls back to first name)
- ✅ CSV formatting verified (proper escaping)
- ✅ Mobile UI tested (button accessible in Coach Actions modal)

---

## 📝 Usage

1. Navigate to "Manage Archers" page
2. Click "Coach" button in footer
3. Select "Export Shirt Order" from Coach Actions menu
4. CSV file downloads automatically
5. Open CSV in spreadsheet application or upload to shirt order form

---

## 🔗 Related Documentation

- **Shirt Sizes Feature:** See previous release notes for shirt size entry functionality
- **Coach Actions:** See `archer_list.html` for Coach Actions modal implementation
- **Export Functions:** See `js/archer_module.js` for all export functions

---

## 🚀 Deployment

- **Deployed:** January 13, 2026
- **Deployment Method:** Fast deployment (no backups)
- **Cache:** Cloudflare cache purged
- **Status:** ✅ Live in production

---

**Next Steps:**
- Monitor for any export issues
- Consider adding filtering options (e.g., export only archers with shirt sizes)
- Consider adding style selection if multiple apparel types are needed
