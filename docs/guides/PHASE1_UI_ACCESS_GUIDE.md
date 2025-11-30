# Phase 1 UI Access Guide - Archer Data Unification

**Date:** November 5, 2025  
**Purpose:** Explain how Phase 1 changes (full field sync, smart matching, CSV UUID) are accessed in the UI

---

## 📍 Current UI Structure

### **1. Archer Management** (`archer_list.html`)
**Location:** Home → "Archer Setup" button  
**Purpose:** Individual archer management, local storage sync, CSV file operations

**Current Buttons:**
- ✅ **Load from MySQL** - Downloads all archers from database to local storage
- ✅ **Sync to MySQL** - Uploads local storage changes to database
- ✅ **Import CSV** - Currently loads from server CSV file (`app-imports/listimport-01.csv`)
- ✅ **Export CSV** - Downloads current local list as CSV (with UUID now!)

**User Type:** Archers, Coaches, Anyone

---

### **2. Coach Console** (`coach.html`)
**Location:** Home → "Coaches" button  
**Purpose:** Event management, bulk archer operations, CSV uploads

**Current Buttons:**
- ✅ **Import CSV** - Upload CSV file → Parse → Upsert to database (bulk operation)
- ✅ **Create Event** - Event management
- ✅ **Add Archers to Event** - Select archers from database for events

**User Type:** Coaches only (requires passcode)

---

## 🔄 Phase 1 Changes & How They're Accessed

### **What Changed:**

1. **GET /v1/archers** - Now returns ALL 30 fields (was 8)
2. **POST /v1/archers/bulk_upsert** - Smart matching + all fields (was 5 fields)
3. **CSV Export** - Now includes UUID as first column
4. **CSV Import** - Preserves UUIDs and uses smart matching

---

## 🎯 How Users Access New Features

### **Scenario 1: Coach Bulk CSV Upload** (Coach Console)

**Location:** `coach.html` → "Import CSV" button

**What Happens:**
1. Coach clicks "Import CSV" button
2. Selects CSV file (may be incomplete - missing UUID, missing columns)
3. CSV is parsed with smart matching:
   - If CSV has `id` (UUID) → matches by UUID
   - If CSV has `extId` → matches by extId
   - If CSV has `email` → matches by email (if unique)
   - If CSV has `phone` → matches by phone (if unique)
   - If CSV has `first + last + school` → matches by composite
   - If CSV has `first + last` → matches by name (if unique)
   - If no match → creates new archer
4. All fields are synced to database (not just 5 basic fields!)
5. Summary modal shows: created/updated counts

**Use Case:** 
- Coach uploads roster CSV from school system
- CSV may be incomplete (no UUIDs, missing columns)
- System intelligently matches existing archers
- Updates database with all available data

**Smart Matching Priority:**
```
UUID → extId → email → phone → name+school → name
```

---

### **Scenario 2: Archer Sync Local ↔ Database** (Archer Management)

**Location:** `archer_list.html` → Footer buttons

#### **A. Load from MySQL** (Database → Local Storage)

**What Happens:**
1. User clicks "Load from MySQL"
2. Calls `GET /v1/archers` - **Now returns ALL 30 fields!**
3. Downloads complete archer profiles (nickname, email, phone, notes, PRs, etc.)
4. Stores in local storage (`archerList`)
5. Displays in UI with full profile data

**What's New:**
- ✅ Previously: Only 8 fields (id, extId, firstName, lastName, school, level, gender, createdAt)
- ✅ Now: All 30 fields (nickname, photoUrl, grade, status, email, phone, notes, PRs, physiology, etc.)

**Use Case:**
- Archer wants to see their full profile
- Coach wants to edit archer details offline
- Sync latest database changes to device

---

#### **B. Sync to MySQL** (Local Storage → Database)

**What Happens:**
1. User clicks "Sync to MySQL"
2. Gets local storage list
3. Calls `POST /v1/archers/bulk_upsert` with all archers
4. **Smart matching happens on server:**
   - Matches existing archers by UUID, extId, email, phone, or name
   - Only updates fields that are provided (partial updates)
   - Creates new archers if no match found
5. Shows sync status: "X inserted, Y updated"

**What's New:**
- ✅ Previously: Only synced 5 fields (firstName, lastName, school, level, gender)
- ✅ Now: Syncs ALL 30 fields
- ✅ Smart matching prevents duplicates
- ✅ Partial updates (only update provided fields)

**Use Case:**
- Archer edits their profile locally
- Coach updates archer details offline
- Sync changes back to database

---

#### **C. Export CSV** (Local Storage → CSV File)

**What Happens:**
1. User clicks "Export CSV"
2. Gets local storage list
3. Generates CSV with **UUID as first column** (NEW!)
4. Includes all fields (id, extId, first, last, nickname, email, phone, etc.)
5. Downloads CSV file

**What's New:**
- ✅ Previously: No UUID column
- ✅ Now: UUID as first column for database matching
- ✅ All 30 fields included

**Use Case:**
- Coach wants to backup archer list
- Coach wants to edit CSV in Excel/Google Sheets
- Coach wants to share archer list with another coach

---

#### **D. Import CSV** (CSV File → Local Storage)

**What Happens:**
1. User clicks "Import CSV"
2. Currently: Loads from server CSV file (`app-imports/listimport-01.csv`)
3. **Future:** Could allow file upload (currently server file only)
4. Parses CSV with **UUID preservation** (NEW!)
5. Stores in local storage

**What's New:**
- ✅ Previously: UUID not preserved
- ✅ Now: UUID preserved from CSV for database matching
- ✅ Proper quote handling for fields with commas

**Use Case:**
- Coach wants to load default roster from server
- Coach wants to import CSV they edited
- Round-trip: Export → Edit → Import

---

## 🎨 Recommended UI Organization

### **Coach Console = Bulk Operations**
**Purpose:** Large-scale archer management, CSV uploads, database operations

**Features:**
- ✅ **Import CSV** (bulk upload) - Already exists
- ➕ **Export CSV from Database** (NEW) - Download authoritative CSV from MySQL
- ➕ **Sync Status Dashboard** (NEW) - Show sync health, pending syncs

**Why Here:**
- Coaches manage entire roster
- Bulk operations require coach permissions
- Database is the source of truth

---

### **Archer Management = Individual Operations**
**Purpose:** Individual archer editing, local sync, personal profile management

**Features:**
- ✅ **Load from MySQL** - Download full profiles
- ✅ **Sync to MySQL** - Upload changes
- ✅ **Export CSV** - Download local list
- ✅ **Import CSV** - Load from server file
- ✅ **Add/Edit Archer** - Individual archer management

**Why Here:**
- Archers can manage their own profile
- Coaches can edit individual archers
- Works offline (local storage)

---

## 🔄 Recommended Workflow

### **Coach Workflow: Initial Roster Setup**

1. **Coach Console** → "Import CSV"
   - Upload roster CSV (may be incomplete)
   - Smart matching updates existing archers
   - Creates new archers for unmatched rows
   - ✅ All fields synced to database

2. **Archer Management** → "Load from MySQL"
   - Download complete roster to local storage
   - ✅ All 30 fields downloaded

3. **Archer Management** → "Export CSV"
   - Download CSV with UUIDs
   - ✅ CSV includes UUID for future matching
   - ✅ CSV includes all fields

4. **Coach Console** → "Export CSV from Database" (NEW)
   - Download authoritative CSV from MySQL
   - ✅ Always up-to-date with database
   - ✅ Includes UUIDs

---

### **Archer Workflow: Profile Management**

1. **Archer Management** → "Load from MySQL"
   - Download their profile
   - ✅ Full profile with all fields

2. **Archer Management** → Edit profile
   - Update nickname, email, phone, notes, etc.
   - ✅ All fields editable

3. **Archer Management** → "Sync to MySQL"
   - Upload changes
   - ✅ Smart matching updates correct record
   - ✅ Only updated fields are changed

---

### **Coach Workflow: CSV Round-Trip**

1. **Coach Console** → "Export CSV from Database" (NEW)
   - Download CSV with UUIDs
   - ✅ UUID in first column

2. Edit CSV in Excel/Google Sheets
   - Update archer details
   - Add new archers
   - ✅ UUID preserved for matching

3. **Coach Console** → "Import CSV"
   - Upload edited CSV
   - ✅ Smart matching updates existing archers
   - ✅ Creates new archers for new rows
   - ✅ All fields synced

---

## 📊 Feature Comparison Matrix

| Feature | Archer Management | Coach Console | Notes |
|---------|------------------|---------------|-------|
| **Load from MySQL** | ✅ | ❌ | Individual/offline use |
| **Sync to MySQL** | ✅ | ❌ | Individual/offline use |
| **Export CSV** | ✅ | ➕ (NEW) | Export from local vs database |
| **Import CSV** | ✅ (server file) | ✅ (file upload) | Different sources |
| **Add/Edit Archer** | ✅ | ❌ | Individual management |
| **Bulk Upload** | ❌ | ✅ | Coach-only operation |
| **Smart Matching** | ✅ (via API) | ✅ (via API) | Both use same API |
| **UUID Preservation** | ✅ | ✅ | Both preserve UUIDs |

---

## 🚀 New Features to Add (Future)

### **Coach Console Enhancements:**

1. **"Export CSV from Database" Button**
   - Downloads authoritative CSV from MySQL
   - Includes all fields with UUIDs
   - Always up-to-date

2. **"Sync Status Dashboard"**
   - Shows last sync time
   - Shows pending syncs
   - Shows sync health (local vs database)

3. **"Download Template CSV"**
   - Downloads CSV template with headers
   - Shows required vs optional fields
   - Includes examples

---

### **Archer Management Enhancements:**

1. **"Import CSV from File"** (Currently only server file)
   - Allow file upload
   - Parse and import to local storage
   - Preserve UUIDs

2. **"Sync Status Indicator"**
   - Shows if local storage is in sync with database
   - Shows last sync time
   - Warns if out of sync

---

## ✅ Summary

### **Phase 1 Changes Are Mostly Transparent:**

- ✅ **GET /v1/archers** - Automatically returns more fields (no UI change needed)
- ✅ **POST /v1/archers/bulk_upsert** - Automatically uses smart matching (no UI change needed)
- ✅ **CSV Export** - Automatically includes UUID (no UI change needed)
- ✅ **CSV Import** - Automatically preserves UUIDs (no UI change needed)

### **Current UI Works As-Is:**

- **Coach Console** → "Import CSV" button already uses smart matching
- **Archer Management** → "Load from MySQL" already gets all fields
- **Archer Management** → "Sync to MySQL" already syncs all fields
- **Archer Management** → "Export CSV" already includes UUID

### **Recommended Additions:**

1. **Coach Console** → "Export CSV from Database" button (download authoritative CSV)
2. **Both** → Sync status indicators (show sync health)

---

## 🎯 Key Takeaways

1. **List Management = Coach Function** ✅
   - Bulk CSV uploads belong in Coach Console
   - Database operations belong in Coach Console

2. **Individual Management = Archer Management** ✅
   - Individual archer editing
   - Local storage sync
   - Personal profile management

3. **Both Use Same API** ✅
   - Smart matching works in both places
   - Full field sync works in both places
   - UUID preservation works in both places

4. **Phase 1 Changes Are Backend** ✅
   - UI buttons stay the same
   - Functionality is enhanced automatically
   - Better data sync without UI changes

---

## 📝 Next Steps

1. ✅ Phase 1.1 & 1.2 complete (API + CSV)
2. ➕ Add "Export CSV from Database" to Coach Console
3. ➕ Add sync status indicators to both UIs
4. ➕ Add "Import CSV from File" to Archer Management
5. ➕ Test CSV round-trip workflow

---

**Questions?** Review the code:
- `archer_list.html` - Archer Management UI
- `coach.html` - Coach Console UI
- `js/archer_module.js` - CSV export/import logic
- `js/coach.js` - CSV upload logic
- `api/index.php` - API endpoints (GET /v1/archers, POST /v1/archers/bulk_upsert)

