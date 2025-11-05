# Phase 1 Local Testing Guide

**Date:** November 5, 2025  
**Server:** http://localhost:8001

---

## ✅ What to Test

### **1. Coach Console - Export CSV from Database**

**Steps:**
1. Open http://localhost:8001/coach.html
2. Enter coach passcode: `wdva26`
3. Click "Export CSV from Database" button
4. Verify CSV downloads with:
   - ✅ UUID as first column
   - ✅ All 30 fields included
   - ✅ Filename: `archer-list-database-YYYY-MM-DD.csv`

**Expected Result:**
- CSV file downloads
- UUID column present (first column)
- All fields included (id, extId, first, last, nickname, email, phone, etc.)
- At least 1 archer (John Doe from previous test)

---

### **2. Coach Console - Import CSV (Smart Matching)**

**Steps:**
1. Create a test CSV file with incomplete data:
   ```csv
   first,last,email,phone,grade
   John,Doe,john.doe@test.com,555-9999,12
   Jane,Smith,jane.smith@test.com,555-8888,11
   ```
2. In Coach Console, click "Import CSV"
3. Upload the test CSV
4. Verify smart matching:
   - ✅ John Doe should be UPDATED (matched by email)
   - ✅ Jane Smith should be CREATED (new archer)

**Expected Result:**
- Import summary shows: "1 updated, 1 created"
- John Doe's phone updated to 555-9999
- John Doe's grade updated to 12
- Jane Smith created as new archer

---

### **3. Archer Management - Load from MySQL**

**Steps:**
1. Open http://localhost:8001/archer_list.html
2. Click "Load from MySQL" button
3. Verify archers load:
   - ✅ All archers visible (John Doe, Jane Smith)
   - ✅ Full profiles with all fields
   - ✅ Email, phone, grade visible

**Expected Result:**
- All archers from database appear
- Full profile data visible
- All 30 fields loaded

---

### **4. Archer Management - Export CSV**

**Steps:**
1. In Archer Management, click "Export CSV"
2. Verify CSV downloads:
   - ✅ UUID as first column
   - ✅ All fields included
   - ✅ Filename: `archer-list-YYYY-MM-DD.csv`

**Expected Result:**
- CSV file downloads
- UUID column present
- Matches format from Coach Console export

---

### **5. Archer Management - Sync to MySQL**

**Steps:**
1. Edit an archer (click on archer row)
2. Change nickname, email, or phone
3. Save changes
4. Click "Sync to MySQL" button
5. Verify sync:
   - ✅ Sync status shows "X updated"
   - ✅ Changes saved to database

**Expected Result:**
- Sync status: "1 updated, 0 inserted"
- Changes persist in database
- Can reload and see changes

---

### **6. CSV Round-Trip Test**

**Steps:**
1. Export CSV from Coach Console
2. Open CSV in Excel/Google Sheets
3. Edit some fields (e.g., change phone numbers)
4. Save CSV
5. Import CSV back into Coach Console
6. Verify:
   - ✅ UUIDs preserved
   - ✅ Changes applied (smart matching works)
   - ✅ Existing archers updated, not duplicated

**Expected Result:**
- UUIDs preserved in CSV
- Smart matching updates existing archers
- No duplicate records created

---

## 🐛 Troubleshooting

### **Issue: Export CSV button not visible**
- Check: Is coach passcode entered?
- Check: Is button in page-subheader?
- Check: Browser console for errors

### **Issue: CSV export fails**
- Check: Are there archers in database?
- Check: Browser console for API errors
- Check: Network tab for failed requests

### **Issue: Smart matching not working**
- Check: Does CSV have email/phone fields?
- Check: Are email/phone values unique?
- Check: API response in Network tab

### **Issue: UUID not in CSV**
- Check: First column should be "id"
- Check: CSV headers include "id"
- Check: Database has UUIDs for archers

---

## 📊 Test Checklist

- [ ] Coach Console - Export CSV downloads
- [ ] Coach Console - Export CSV has UUID column
- [ ] Coach Console - Export CSV has all fields
- [ ] Coach Console - Import CSV with smart matching
- [ ] Archer Management - Load from MySQL works
- [ ] Archer Management - Load shows all fields
- [ ] Archer Management - Export CSV works
- [ ] Archer Management - Export CSV has UUID
- [ ] Archer Management - Sync to MySQL works
- [ ] CSV round-trip preserves UUIDs
- [ ] CSV round-trip updates existing archers

---

## 🎯 Success Criteria

✅ All tests pass  
✅ UUIDs preserved in CSV round-trips  
✅ Smart matching works (email, phone, name)  
✅ All 30 fields sync correctly  
✅ No duplicate records created  
✅ Partial updates work (only update provided fields)

---

**Ready to test!** Open http://localhost:8001 and start testing.

