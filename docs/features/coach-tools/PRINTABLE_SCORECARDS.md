# Printable Scorecards Feature

**Date:** January 14, 2026  
**Status:** ✅ Implemented  
**Module:** Coach Console

---

## 📋 Overview

This feature allows coaches to generate printable PDF scorecards for ranking rounds. Each scorecard is designed to be 5x8 inches (portrait), with 2 scorecards per landscape page (11x8.5 inches).

---

## ✨ Features

### PDF Generation
- **Format:** PDF download via jsPDF library
- **Layout:** 5x8 inch cards, 2 per landscape page
- **Content:** Empty scorecard grid ready for manual entry during matches

### Scorecard Layout
Each scorecard includes:

**Header Section:**
- Archer avatar (1.5 inches, top-left corner)
- Archer name (bold, next to avatar)
- Event information:
  - Event name (bold)
  - Division, Bale Number, Date
  - Target assignment

**Grid Section:**
- **Column Headers:** Black background with bold white text
  - End, A1, A2, A3, Xs, 10x, Total, Run Total (8 columns)
- **Row Headers:** Light grey background with bold black text (Ends 1-10)
- **Data Cells:** Empty white cells with black grid lines
- **Totals Row:** "Total:" label in bold black text (no shading)

### Technical Details
- **PDF Library:** jsPDF 2.5.1 (loaded from CDN - no server installation needed)
- **Avatar Support:** Loads archer photos when available, falls back to initials circle
- **Grid Layout:** 10 ends with totals row
- **Printing:** Optimized for 11x8.5 inch landscape pages

---

## 🎯 Usage

1. Open Coach Console (`coach.html`)
2. Click "Edit Event" for the desired event
3. In the "Division Rounds" section, click "📄 Print" button next to any round
4. PDF downloads with scorecards for all archers in that round
5. Print on landscape paper (2 cards per page)

---

## 📁 Files Modified

- `coach.html` - Added jsPDF CDN library and printable_scorecards.js script
- `js/coach.js` - Added "Print Scorecards" button and integration
- `js/printable_scorecards.js` - New module for PDF generation

---

## 🔧 Technical Implementation

### PDF Generation Flow
1. User clicks "Print" button for a round
2. System fetches archers from event snapshot API
3. Enriches archer data with photo URLs from master archer list
4. Generates PDF using jsPDF library
5. Downloads PDF file

### API Endpoints Used
- `GET /events/{eventId}/snapshot` - Fetch archers for round
- `GET /archers` - Fetch photo URLs for avatars

### Dependencies
- jsPDF 2.5.1 (CDN: cdnjs.cloudflare.com)
- No server-side dependencies required

---

## 📝 Notes

- PDF library is loaded from CDN, works on any server
- Avatar images may not load if CORS restrictions apply (falls back to initials)
- Scorecards are empty grids - designed for manual entry during matches
- Grid lines are black, no shading on total cells (optimized for printing)
