# Release Notes v1.6.5 - Ranking Round UI Polish & Scorecard Editor Improvements

**Release Date:** December 2025  
**Version:** 1.6.5  
**Deployment:** Production (FTP)  
**Git Branch:** `main`

## 🎯 Overview

This release focuses on UI polish and usability improvements across the application, with particular attention to the Ranking Round scoring interface and the Scorecard Editor tool. The changes optimize mobile display, improve touch targets, and enhance the user experience for coaches managing scorecards.

## ✨ Major Features

### 📱 **Ranking Round Grid Tuning**
**Optimized scoring table for better mobile display and touch interaction**

- ✅ **Compact Column Widths** – Reduced column widths to fit 450px minimum width
  - Archer column: `max-w-[85px]` (from 100px)
  - Score input columns (A1/A2/A3): `w-8` (32px each, from 48px)
  - End column: `w-10` (40px, from 56px)
  - Run column: `w-12` (48px, from 56px)
  - X/10 columns: `w-6` (24px each, from 48px)
  - Card button: `w-8` (32px, from 64px)

- ✅ **Optimized Padding** – Tighter padding for compact display
  - Archer cell: `px-1.5 py-0` (6px horizontal, minimal vertical)
  - Score inputs: `p-0` (no padding, fills cell)
  - Calculated cells (End/Run/X/10): `px-0.5 py-0.5` (2px padding)
  - Card cell: `px-0.5 py-0` (2px horizontal, minimal vertical)

- ✅ **Consistent Row Height** – All rows set to `h-[44px]` including padding
  - Score input cells: Exact `h-[44px]` for optimal touch targets
  - Archer names: Vertically centered with `align-middle`
  - Card button: `h-[44px]` with proper vertical alignment

- ✅ **Table Minimum Width** – Reduced to `min-w-[450px]` for better mobile fit
  - Better iPhone XR compatibility (414px viewport with minimal scroll)
  - Maintains all column visibility
  - Total width: ~361px (fits comfortably within 450px minimum)

- ✅ **Vertical Alignment Fixes** – Properly centered text and buttons
  - Archer names use `align-middle` for vertical centering
  - Card button wrapped in `inline-flex` for proper alignment
  - Status badges properly aligned with card button

### 📄 **Ranking Round Header Standardization**
**Consistent two-line header layout across all ranking round modules**

- ✅ **Two-Line Layout** – Clear information hierarchy
  - Line 1: Event Name + Sync Status Badge | Bale Number
  - Line 2: Division + Round Type | End Number

- ✅ **Event Name Display** – Shows actual event name from database
  - Dynamically loaded from state or localStorage
  - Proper fallback handling for missing event data
  - Sync status badge shows live/pending state

- ✅ **Standardized Implementation** – Matching layout across modules
  - `ranking_round_300.html` updated
  - `ranking_round.html` (360) updated
  - `style-guide.html` updated with standard template

### 🔧 **Scorecard Editor Improvements**
**Enhanced usability and functionality for critical coach tool**

- ✅ **X/10 Calculation Fix** – Correct calculation and display
  - Fixed API endpoint to include `total_tens` and `total_xs` in search results
  - Updated frontend to correctly map X/10 values from API response
  - Per-end X/10 calculation in scorecard table view

- ✅ **Bottom Sheet Keypad** – Less intrusive score input interface
  - Converted full-screen modal to bottom sheet
  - Score keypad slides up from bottom
  - Screen remains visible while entering scores
  - Better mobile UX with native-like interaction

- ✅ **Subheader for Edit Functions** – Improved layout organization
  - Moved action buttons (Modify, Void, Lock, Delete) to dedicated subheader
  - Subheader below main archer info card
  - Clear visual separation with border styling
  - "Reason for edit" input field in subheader

- ✅ **Column Alignment Fix** – Unified scorecard list consistency
  - Fixed X/10 columns breaking onto separate line
  - All 6 columns always rendered for consistent alignment
  - Proper grid template columns matching header

### 📋 **Results & History Formatting**
**Fixed regression in scorecard list display**

- ✅ **Results Page (`results.html`)** – Restored proper row formatting
  - Fixed header-to-row alignment with Tailwind grid classes
  - Proper `data-columns="6"` attribute
  - Consistent spacing and styling

- ✅ **Archer History (`archer_history.html`)** – Restored proper formatting
  - Fixed scorecard list item structure
  - Proper Tailwind grid classes
  - Matching unified scorecard list component

- ✅ **Test Components Updated** – Standard reflects all changes
  - Added 6-column example for unified scorecard list
  - Updated scoring table with new column widths
  - Updated header standard with two-line layout

## 🔧 Technical Improvements

### **Column Width Optimization**
- Reduced total table width from ~540px to ~361px
- Non-touch elements (End, Run, X, 10) made smaller to save space
- Touch targets (score inputs, card button) maintained at 44px height

### **Vertical Alignment**
- Replaced `flex items-center` on table cells with `align-middle`
- Card button wrapped in `inline-flex` span for proper alignment
- Status badges properly aligned within card cell

### **Component Standardization**
- `style-guide.html` updated to reflect all UI standards
- Scoring table template with optimized widths
- Header template with two-line layout
- Unified scorecard list with 6-column example

## 📋 Changes by Component

### **Ranking Round 300 (`ranking_round_300.html` / `js/ranking_round_300.js`)**
- ✅ Updated scoring header to two-line layout
- ✅ Optimized table column widths and padding
- ✅ Fixed vertical alignment for Archer names and Card button
- ✅ Set table minimum width to 450px
- ✅ Standardized row height to 44px

### **Ranking Round 360 (`ranking_round.html` / `js/ranking_round.js`)**
- ✅ Updated scoring header to match two-line layout standard
- ✅ Consistent header implementation

### **Scorecard Editor (`scorecard_editor.html`)**
- ✅ Fixed X/10 calculation in search results and scorecard table
- ✅ Converted score input modal to bottom sheet
- ✅ Moved edit action buttons to subheader
- ✅ Fixed column alignment in scorecard list
- ✅ Updated API configuration for X/10 data

### **Results (`results.html`)**
- ✅ Fixed scorecard list formatting regression
- ✅ Restored proper Tailwind grid classes
- ✅ Fixed column alignment with 6-column layout

### **Archer History (`archer_history.html`)**
- ✅ Fixed scorecard list formatting regression
- ✅ Restored proper Tailwind grid classes
- ✅ Consistent with unified scorecard list component

### **Unified Scorecard List (`js/unified_scorecard_list.js`)**
- ✅ Fixed column rendering to always show all 6 columns
- ✅ Prevents dynamic column hiding that caused misalignment
- ✅ Proper X/10 field mapping from API response

### **Test Components (`style-guide.html`)**
- ✅ Added "Scoring Header (Ranking Round Standard)" section
- ✅ Updated scoring table with optimized column widths
- ✅ Added 6-column unified scorecard list example
- ✅ Updated vertical alignment examples

### **API (`api/index.php`)**
- ✅ Updated `/v1/archers/search` endpoint to include `total_tens` and `total_xs`
- ✅ Proper field mapping for scorecard list display

## 🐛 Bug Fixes

### **Critical**
- ✅ **X/10 Values Showing Zero** – Fixed calculation in scorecard editor
  - **Root Cause:** API not returning X/10 totals in search results
  - **Impact:** Coaches couldn't see accurate X/10 counts
  - **Resolution:** Updated API endpoint and frontend mapping

- ✅ **Column Alignment Broken** – Fixed X/10 columns wrapping to new line
  - **Root Cause:** Dynamic column hiding causing grid misalignment
  - **Impact:** Unreadable scorecard lists
  - **Resolution:** Always render all 6 columns for consistent layout

### **UI/UX**
- ✅ **Ranking Round Table Too Wide** – Optimized for mobile display
- ✅ **Archer Names Not Centered** – Fixed vertical alignment
- ✅ **Card Button Not Centered** – Fixed vertical alignment
- ✅ **Scorecard Editor Modal Too Intrusive** – Converted to bottom sheet
- ✅ **Edit Buttons Cluttering Header** – Moved to dedicated subheader
- ✅ **Results/History Formatting Lost** – Restored proper Tailwind classes

## 📊 Impact

### **User Experience**
- **Mobile Optimization** – Better fit on iPhone XR and smaller devices
- **Touch Targets** – Maintained 44px height for score inputs and buttons
- **Visual Clarity** – Improved header layout shows key information clearly
- **Coach Workflow** – Scorecard editor more user-friendly with bottom sheet
- **Data Accuracy** – X/10 calculations now correct throughout

### **Code Quality**
- **Consistency** – Standardized header and table layouts
- **Maintainability** – Test components updated to reflect standards
- **Component Reuse** – Unified scorecard list properly used across modules
- **Mobile-First** – Optimized for 99% phone usage

## 📁 Files Changed

### **HTML Files**
- `ranking_round_300.html` – Header layout update
- `ranking_round.html` – Header layout update
- `scorecard_editor.html` – Bottom sheet keypad, subheader, column fixes
- `results.html` – Formatting restoration
- `archer_history.html` – Formatting restoration
- `style-guide.html` – Standard updates

### **JavaScript Files**
- `js/ranking_round_300.js` – Column widths, padding, alignment, header updates
- `js/ranking_round.js` – Header updates
- `js/unified_scorecard_list.js` – Column rendering fixes

### **API Files**
- `api/index.php` – X/10 totals in search results

## 🚀 Deployment Notes

### **Pre-Deployment Checklist**
- ✅ Column width optimization verified
- ✅ Vertical alignment fixes tested
- ✅ Header layout standardized
- ✅ Scorecard editor improvements tested
- ✅ X/10 calculations verified
- ✅ Results/history formatting restored
- ✅ Test components updated
- ✅ Mobile responsiveness tested

### **Post-Deployment**
- ✅ Verify ranking round table fits on mobile devices
- ✅ Test scorecard editor bottom sheet keypad
- ✅ Verify X/10 values display correctly
- ✅ Check column alignment in scorecard lists
- ✅ Test header display on ranking rounds
- ✅ Verify vertical alignment of text and buttons

## 📚 Documentation Updates

- **01-SESSION_QUICK_START.md** – Updated with v1.6.5 status
- **style-guide.html** – Component library updated with all standards

## 🎯 Next Steps

### **Completed**
- ✅ Ranking Round grid optimization
- ✅ Header standardization
- ✅ Scorecard editor improvements
- ✅ Formatting regression fixes

### **Future Enhancements**
- ⏳ Additional mobile optimizations
- ⏳ Further UI polish across modules
- ⏳ Enhanced coach tools

## 🙏 Acknowledgments

This release focuses on UI polish and usability improvements, making the application more mobile-friendly and easier to use. The optimized scoring table and improved scorecard editor enhance the daily workflow for archers and coaches.

---

**Release Status:** ✅ **Ready for Deployment**  
**Critical Bugs Fixed:** 2 (X/10 Calculation, Column Alignment)  
**UI Improvements:** 8 (Grid Tuning, Header, Keypad, Subheader, Alignment, Formatting)  
**Code Quality:** Improved consistency and mobile optimization

