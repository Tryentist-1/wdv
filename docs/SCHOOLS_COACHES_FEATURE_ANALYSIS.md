# Schools/Clubs & Coaches Feature - Comprehensive Analysis & Implementation Plan

**Date:** November 6, 2025  
**Status:** Pre-Implementation Analysis  
**Priority:** High  
**Risk Level:** Medium (Breaking Changes Risk)

---

## 📋 Executive Summary

This document provides a comprehensive analysis for implementing Schools/Clubs and Coaches features with many-to-many relationships. The implementation must maintain **100% backward compatibility** with the existing system while adding new capabilities.

### Key Requirements:
1. Multiple coaches can be associated with a school/club
2. Multiple archers can be associated with:
   - A team (existing, match-specific)
   - A school/club (new, persistent)
   - A coach (new, persistent)

### Critical Constraint:
- **Do not break existing functionality**
- School codes (3-letter VARCHAR) are used extensively throughout the system
- Must maintain backward compatibility with existing school field on archers table

---

## 🔍 Current System Analysis

### 1.1 Current School Implementation

#### Database Schema
- **Table:** `archers`
  - Field: `school VARCHAR(3) NOT NULL`
  - Used as: 3-letter code (e.g., "WIS", "DVN")
  - Required field, no foreign key

- **Denormalized School Fields:**
  - `round_archers.school` VARCHAR(3) - Denormalized for performance
  - `team_match_archers.school` VARCHAR(3) - Denormalized
  - `team_match_teams.school` VARCHAR(3) - Denormalized
  - `solo_match_archers.school` VARCHAR(3) - Denormalized

#### Usage Patterns

**1. Archer Creation/Matching:**
```php
// api/index.php line 853-855
$stmt = $pdo->prepare('SELECT id FROM archers WHERE first_name = ? AND last_name = ? AND school = ? LIMIT 1');
$stmt->execute([$firstName, $lastName, $school]);
```
- **Impact:** School code is used for archer matching
- **Risk:** High - Changing this breaks archer identification

**2. Archer Normalization:**
```php
// api/index.php line 554
case 'school':
    return strtoupper(substr(trim($value), 0, 3)) ?: 'UNK';
```
- **Impact:** All school values normalized to 3 uppercase letters
- **Risk:** Medium - Must preserve this behavior

**3. CSV Import:**
```javascript
// js/coach.js line 1606
school: (archer.school || '').substring(0, 3).toUpperCase() || 'UNK',
```
- **Impact:** Frontend also normalizes to 3-letter uppercase
- **Risk:** Medium - Must maintain consistency

**4. Filtering/Search:**
- Coach console filters archers by school
- Event dashboard groups by school
- Results display school codes

**5. Display Throughout System:**
- Archer lists show school code
- Scorecards show school code
- Match displays show school code
- All denormalized for performance (no JOINs needed)

### 1.2 Current Coach Implementation

#### Current State:
- **No coach entity in database**
- "Coach Console" is an authentication concept, not a database entity
- Authentication via passcode: `wdva26`
- Coach identity stored as: `verified_by VARCHAR(100)` (device ID or name string)
- No relationships tracked between coaches and schools/archers

#### Coach Console Features:
- Event creation/management
- Archer management
- Scorecard verification
- QR code generation
- CSV import

#### Coach References in Database:
- `round_archers.verified_by` - String, not FK
- `solo_matches.verified_by` - String, not FK
- `team_matches.verified_by` - String, not FK

### 1.3 Current Team Implementation

**Important Distinction:**
- **Teams are match-specific, not persistent entities**
- Table: `team_match_teams` - Created per match
- Each team is tied to a specific match (`match_id`)
- Teams are temporary groupings for a single match

**User Requirement Clarification:**
- User wants persistent Clubs/Schools (different from match teams)
- User wants persistent Coaches (different from match participants)
- Match teams remain match-specific (no change needed)

### 1.4 Data Flow Analysis

#### Archer Lifecycle:
1. **Creation:**
   - CSV import → `POST /v1/archers/bulk_upsert`
   - Manual entry → `POST /v1/archers`
   - Match entry → Auto-creates if not exists
   - **All require school code**

2. **Usage:**
   - Added to rounds → Creates `round_archers` with denormalized school
   - Added to matches → Creates match-specific records with denormalized school
   - **School code is copied, not referenced**

3. **Search/Filter:**
   - Frontend filters by school code string
   - No database JOINs (denormalized)
   - Fast queries due to denormalization

#### Critical Dependencies:

**High-Risk Areas (Breaking Changes Risk):**

1. **Archer Matching Logic:**
   - File: `api/index.php` lines 853-855, 3791-3793, 4486-4488
   - Uses: `first_name + last_name + school`
   - **Action Required:** Maintain exact matching behavior

2. **School Normalization:**
   - File: `api/index.php` line 554
   - File: `js/coach.js` line 1606
   - **Action Required:** Keep normalization, sync with schools table

3. **Denormalized Fields:**
   - Multiple tables have `school VARCHAR(3)` fields
   - Used for display without JOINs
   - **Action Required:** Keep denormalized, sync when possible

4. **Default Values:**
   - `school = 'UNK'` used for unknown schools
   - **Action Required:** Handle 'UNK' gracefully in new system

**Medium-Risk Areas:**

1. **Frontend Displays:**
   - Multiple files show school codes
   - **Action Required:** Optional: Enhance to show school names

2. **Filtering:**
   - Coach console filters by school code
   - **Action Required:** Enhance to filter by school name or code

3. **CSV Export/Import:**
   - CSV includes school code
   - **Action Required:** Support both code and name

---

## 🎯 Requirements Analysis

### 2.1 Functional Requirements

#### FR1: Schools/Clubs as Entities
- **Must Have:**
  - Store full school/club information (name, address, contact)
  - Support both SCHOOL and CLUB types
  - Maintain 3-letter code for backward compatibility
  - Many-to-many with archers (archer can belong to multiple schools)
  - Track membership dates (start/end)

- **Nice to Have:**
  - Support for historical data (school changes over time)
  - School-level statistics/analytics

#### FR2: Coaches as Entities
- **Must Have:**
  - Store coach information (name, contact)
  - Many-to-many with schools (coach can coach multiple schools)
  - Track coach roles (Head Coach, Assistant, etc.)
  - Track tenure dates (start/end at each school)
  - Many-to-many with archers (coach can coach multiple archers)

- **Nice to Have:**
  - Coach-level statistics/analytics
  - Coach authentication integration

#### FR3: Relationships
- **Archer ↔ School:**
  - Many-to-many
  - Status tracking (active/inactive)
  - Date tracking (start/end membership)

- **Archer ↔ Coach:**
  - Many-to-many
  - Status tracking (active/inactive)
  - Date tracking (start/end coaching relationship)

- **School ↔ Coach:**
  - Many-to-many
  - Role tracking (Head Coach, Assistant, etc.)
  - Date tracking (start/end tenure)

### 2.2 Non-Functional Requirements

#### NFR1: Backward Compatibility
- **CRITICAL:** Existing school codes must continue to work
- Existing archer records must not break
- Existing queries must not break
- Existing frontend code must not break

#### NFR2: Performance
- Maintain fast queries (denormalized school codes)
- New JOINs should be optional (for enhanced features only)
- Indexes on all relationship tables

#### NFR3: Data Migration
- Migrate existing school codes to schools table
- Create relationships for existing archers
- Handle edge cases (NULL, 'UNK', invalid codes)

---

## 🗄️ Proposed Database Schema

### 3.1 New Tables

#### `schools` Table
```sql
CREATE TABLE schools (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(3) NOT NULL UNIQUE,  -- Maintains backward compatibility
  name VARCHAR(200) NOT NULL,
  type ENUM('SCHOOL', 'CLUB') NOT NULL DEFAULT 'SCHOOL',
  address VARCHAR(255) NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(50) NULL,
  zip VARCHAR(20) NULL,
  phone VARCHAR(20) NULL,
  email VARCHAR(200) NULL,
  website VARCHAR(255) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_schools_code (code),
  INDEX idx_schools_name (name),
  INDEX idx_schools_status (status)
);
```

**Key Design Decisions:**
- `code` field maintains exact compatibility with existing `archers.school`
- UNIQUE constraint on code ensures one school per code
- Optional contact fields for future expansion

#### `coaches` Table
```sql
CREATE TABLE coaches (
  id CHAR(36) PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  nickname VARCHAR(100) NULL,
  email VARCHAR(200) NULL,
  phone VARCHAR(20) NULL,
  photo_url VARCHAR(255) NULL,
  notes TEXT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_coaches_name (last_name, first_name),
  INDEX idx_coaches_status (status)
);
```

#### `school_coaches` Junction Table
```sql
CREATE TABLE school_coaches (
  id CHAR(36) PRIMARY KEY,
  school_id CHAR(36) NOT NULL,
  coach_id CHAR(36) NOT NULL,
  role VARCHAR(50) NULL,  -- 'Head Coach', 'Assistant Coach', etc.
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  start_date DATE NULL,
  end_date DATE NULL,  -- NULL if currently active
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_school_coach (school_id, coach_id),
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE,
  INDEX idx_sc_school (school_id),
  INDEX idx_sc_coach (coach_id),
  INDEX idx_sc_status (status)
);
```

#### `archer_schools` Junction Table
```sql
CREATE TABLE archer_schools (
  id CHAR(36) PRIMARY KEY,
  archer_id CHAR(36) NOT NULL,
  school_id CHAR(36) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  start_date DATE NULL,
  end_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (archer_id) REFERENCES archers(id) ON DELETE CASCADE,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  INDEX idx_as_archer (archer_id),
  INDEX idx_as_school (school_id),
  INDEX idx_as_status (status),
  INDEX idx_as_dates (start_date, end_date)
);
```

#### `archer_coaches` Junction Table
```sql
CREATE TABLE archer_coaches (
  id CHAR(36) PRIMARY KEY,
  archer_id CHAR(36) NOT NULL,
  coach_id CHAR(36) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  start_date DATE NULL,
  end_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (archer_id) REFERENCES archers(id) ON DELETE CASCADE,
  FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE,
  INDEX idx_ac_archer (archer_id),
  INDEX idx_ac_coach (coach_id),
  INDEX idx_ac_status (status)
);
```

### 3.2 Existing Table Modifications

#### `archers` Table
**NO CHANGES REQUIRED** - Maintain backward compatibility
- Keep `school VARCHAR(3)` field
- No foreign key constraint
- Continue using for fast queries

**Strategy:**
- Add helper views/functions to sync `archers.school` with `archer_schools` relationships
- Primary school relationship determined by:
  1. Most recent active `archer_schools` relationship
  2. Fallback to `archers.school` code

### 3.3 Data Migration Strategy

#### Phase 1: Populate Schools Table
```sql
-- Extract unique school codes from archers
INSERT INTO schools (id, code, name, type, created_at)
SELECT 
    UUID() as id,
    school as code,
    CONCAT(school, ' School/Club') as name,  -- Placeholder name
    'SCHOOL' as type,
    NOW() as created_at
FROM (
    SELECT DISTINCT school 
    FROM archers 
    WHERE school IS NOT NULL AND school != '' AND school != 'UNK'
) AS unique_schools
ON DUPLICATE KEY UPDATE code=code;
```

#### Phase 2: Create Archer-School Relationships
```sql
-- Create active relationships for existing archers
INSERT INTO archer_schools (id, archer_id, school_id, status, created_at)
SELECT 
    UUID() as id,
    a.id as archer_id,
    s.id as school_id,
    'active' as status,
    NOW() as created_at
FROM archers a
INNER JOIN schools s ON a.school = s.code
WHERE a.school IS NOT NULL AND a.school != '' AND a.school != 'UNK'
ON DUPLICATE KEY UPDATE archer_id=archer_id;
```

#### Phase 3: Handle Edge Cases
- **'UNK' school code:** Create special "Unknown School" entry or skip
- **Invalid codes:** Log and create placeholder schools
- **NULL school:** Skip (shouldn't exist due to NOT NULL constraint)

---

## ⚠️ Risk Analysis

### 4.1 High-Risk Areas

#### Risk 1: Breaking Archer Matching
**Risk Level:** 🔴 CRITICAL  
**Impact:** Archer creation/matching fails  
**Mitigation:**
- Maintain exact school code matching logic
- Test all archer creation paths
- Keep normalization function unchanged

#### Risk 2: Data Inconsistency
**Risk Level:** 🟠 HIGH  
**Impact:** `archers.school` out of sync with `archer_schools`  
**Mitigation:**
- Create sync triggers/functions
- Add validation in API endpoints
- Document sync strategy clearly

#### Risk 3: Performance Degradation
**Risk Level:** 🟠 HIGH  
**Impact:** Slow queries if JOINs required  
**Mitigation:**
- Keep denormalized fields
- Make JOINs optional (enhanced features only)
- Add indexes on all junction tables

### 4.2 Medium-Risk Areas

#### Risk 4: Migration Data Loss
**Risk Level:** 🟡 MEDIUM  
**Impact:** Some archers lose school association  
**Mitigation:**
- Backup database before migration
- Test migration on dev database
- Handle edge cases ('UNK', NULL, invalid codes)

#### Risk 5: Frontend Incompatibility
**Risk Level:** 🟡 MEDIUM  
**Impact:** UI breaks or shows incorrect data  
**Mitigation:**
- Maintain backward compatibility in API
- Optional enhancements (show school names) are additive only
- Test all frontend screens

### 4.3 Low-Risk Areas

#### Risk 6: Feature Adoption
**Risk Level:** 🟢 LOW  
**Impact:** New features not used  
**Mitigation:**
- Gradual rollout
- Documentation
- Training materials

---

## 📐 Implementation Strategy

### 5.1 Backward Compatibility Approach

#### Strategy: Dual-Path System

**Path 1: Legacy (Current System)**
- `archers.school` VARCHAR(3) - continues to work exactly as before
- Denormalized school codes in all match/round tables
- No JOINs required for core functionality

**Path 2: Enhanced (New System)**
- `schools` table stores full information
- Junction tables track relationships
- JOINs available for enhanced features

**Sync Strategy:**
- When archer's school changes via new API → update both `archers.school` and `archer_schools`
- When archer created via legacy API → auto-create relationship in `archer_schools`
- Views/functions available to query enhanced data

#### Implementation Phases

**Phase 0: Preparation (No Code Changes)**
- ✅ Complete this analysis document
- Review with stakeholders
- Create backup strategy

**Phase 1: Database Schema (Additive Only)**
- Create new tables (schools, coaches, junction tables)
- Run data migration
- Test migration on dev database
- **No changes to existing tables**

**Phase 2: API Endpoints (Additive Only)**
- Add new endpoints for schools/coaches CRUD
- Add relationship management endpoints
- **All existing endpoints remain unchanged**

**Phase 3: Sync Logic (Enhancement)**
- Add sync between `archers.school` and `archer_schools`
- Update archer creation endpoints to create relationships
- **Maintain backward compatibility**

**Phase 4: Frontend Enhancements (Optional)**
- Add school/club management UI
- Add coach management UI
- Enhance displays to show school names
- **All changes are enhancements, not replacements**

**Phase 5: Documentation & Training**
- Update API documentation
- Create user guides
- Train coaches on new features

### 5.2 Testing Strategy

#### Unit Tests
- Test all new database functions
- Test migration scripts
- Test API endpoints

#### Integration Tests
- Test backward compatibility
- Test sync between legacy and new systems
- Test all archer creation paths

#### Manual Testing Checklist
- ✅ Existing archer creation still works
- ✅ Archer matching still works
- ✅ School filtering still works
- ✅ CSV import still works
- ✅ Match creation still works
- ✅ All displays still show school codes

---

## 📝 Detailed Implementation Plan

### Phase 1: Database Schema (Days 1-2)

#### Tasks:
1. **Create Migration Script**
   - File: `api/sql/migration_add_schools_coaches.sql`
   - Create all new tables
   - Add indexes
   - Add foreign keys
   - ✅ **Status:** Already created (needs review)

2. **Create Data Migration Script**
   - Extract unique school codes
   - Populate schools table
   - Create archer_school relationships
   - Handle edge cases

3. **Test Migration on Dev Database**
   - Backup dev database
   - Run migration
   - Verify data integrity
   - Check all relationships created correctly

4. **Document Migration Process**
   - Step-by-step instructions
   - Rollback procedure
   - Verification queries

#### Deliverables:
- ✅ Migration SQL file
- Migration test results
- Migration documentation

### Phase 2: API Endpoints (Days 3-5)

#### New Endpoints Required:

**Schools/Clubs:**
- `GET /v1/schools` - List all schools (with filters)
- `GET /v1/schools/{id}` - Get school details
- `POST /v1/schools` - Create school
- `PATCH /v1/schools/{id}` - Update school
- `DELETE /v1/schools/{id}` - Delete school (soft delete)

**Coaches:**
- `GET /v1/coaches` - List all coaches
- `GET /v1/coaches/{id}` - Get coach details
- `POST /v1/coaches` - Create coach
- `PATCH /v1/coaches/{id}` - Update coach
- `DELETE /v1/coaches/{id}` - Delete coach (soft delete)

**Relationships:**
- `GET /v1/schools/{id}/coaches` - Get coaches at school
- `POST /v1/schools/{id}/coaches` - Add coach to school
- `DELETE /v1/schools/{id}/coaches/{coachId}` - Remove coach from school
- `GET /v1/archers/{id}/schools` - Get archer's schools
- `POST /v1/archers/{id}/schools` - Add archer to school
- `DELETE /v1/archers/{id}/schools/{schoolId}` - Remove archer from school
- `GET /v1/archers/{id}/coaches` - Get archer's coaches
- `POST /v1/archers/{id}/coaches` - Add coach to archer
- `DELETE /v1/archers/{id}/coaches/{coachId}` - Remove coach from archer

**Enhanced Queries:**
- `GET /v1/schools/{id}/archers` - Get all archers at school
- `GET /v1/coaches/{id}/archers` - Get all archers coached by coach
- `GET /v1/coaches/{id}/schools` - Get all schools where coach works

#### Tasks:
1. **Design API Contracts**
   - Request/response formats
   - Error handling
   - Authentication requirements

2. **Implement Schools Endpoints**
   - Add to `api/index.php`
   - Follow existing patterns
   - Add authentication checks

3. **Implement Coaches Endpoints**
   - Add to `api/index.php`
   - Follow existing patterns

4. **Implement Relationship Endpoints**
   - Junction table operations
   - Validation logic

5. **Add Sync Logic to Archer Endpoints**
   - When archer created/updated, sync `archer_schools`
   - Maintain backward compatibility

#### Deliverables:
- API endpoints implemented
- API documentation updated
- Endpoint tests written

### Phase 3: Sync Logic (Days 6-7)

#### Tasks:
1. **Create Sync Function**
   - Sync `archers.school` → `archer_schools`
   - Handle primary school selection
   - Handle 'UNK' and edge cases

2. **Update Archer Creation Endpoints**
   - `POST /v1/archers` - Create relationship
   - `POST /v1/archers/bulk_upsert` - Create relationships
   - Match creation endpoints - Create relationships

3. **Update Archer Update Endpoints**
   - `PATCH /v1/archers/{id}` - Sync on school change
   - Handle school code changes

4. **Add Validation**
   - Ensure school code exists in schools table
   - Auto-create school if code doesn't exist (optional)
   - Log warnings for invalid codes

#### Deliverables:
- Sync functions implemented
- All archer endpoints updated
- Validation added

### Phase 4: Frontend Enhancements (Days 8-10)

#### Tasks:
1. **School Management UI**
   - List schools/clubs
   - Create/edit school form
   - School details view

2. **Coach Management UI**
   - List coaches
   - Create/edit coach form
   - Coach details view

3. **Relationship Management UI**
   - Assign coaches to schools
   - Assign archers to schools/coaches
   - View relationships

4. **Enhanced Displays (Optional)**
   - Show school names alongside codes
   - Filter by school name
   - Coach attribution in displays

#### Deliverables:
- New UI pages/components
- Enhanced existing displays (optional)
- Mobile-optimized (99% phone usage)

### Phase 5: Testing & Documentation (Days 11-12)

#### Tasks:
1. **Backward Compatibility Testing**
   - Test all existing functionality
   - Verify no breaking changes
   - Performance testing

2. **New Feature Testing**
   - Test all new endpoints
   - Test relationship management
   - Test sync logic

3. **Documentation**
   - Update API documentation
   - Create user guide
   - Migration guide

4. **Training Materials**
   - Coach training
   - Admin training

#### Deliverables:
- Test results
- Documentation
- Training materials

---

## ✅ Detailed Todo List

### Pre-Implementation Checklist
- [ ] Review and approve this analysis document
- [ ] Create database backup strategy
- [ ] Set up dev environment for testing
- [ ] Review migration script with database admin

### Phase 1: Database Schema
- [ ] Review and finalize migration SQL script
- [ ] Test migration on copy of production data
- [ ] Create data migration script
- [ ] Test data migration script
- [ ] Document migration procedure
- [ ] Create rollback procedure
- [ ] Get approval to run migration on production

### Phase 2: API Endpoints - Schools
- [ ] Design API contracts for schools endpoints
- [ ] Implement GET /v1/schools (list)
- [ ] Implement GET /v1/schools/{id} (detail)
- [ ] Implement POST /v1/schools (create)
- [ ] Implement PATCH /v1/schools/{id} (update)
- [ ] Implement DELETE /v1/schools/{id} (soft delete)
- [ ] Add authentication/authorization
- [ ] Write API tests
- [ ] Document endpoints

### Phase 2: API Endpoints - Coaches
- [ ] Design API contracts for coaches endpoints
- [ ] Implement GET /v1/coaches (list)
- [ ] Implement GET /v1/coaches/{id} (detail)
- [ ] Implement POST /v1/coaches (create)
- [ ] Implement PATCH /v1/coaches/{id} (update)
- [ ] Implement DELETE /v1/coaches/{id} (soft delete)
- [ ] Add authentication/authorization
- [ ] Write API tests
- [ ] Document endpoints

### Phase 2: API Endpoints - Relationships
- [ ] Implement school-coach relationship endpoints
- [ ] Implement archer-school relationship endpoints
- [ ] Implement archer-coach relationship endpoints
- [ ] Add validation logic
- [ ] Add error handling
- [ ] Write API tests
- [ ] Document endpoints

### Phase 3: Sync Logic
- [ ] Design sync strategy
- [ ] Create sync function (archers.school → archer_schools)
- [ ] Update POST /v1/archers to create relationship
- [ ] Update POST /v1/archers/bulk_upsert to create relationships
- [ ] Update match creation endpoints to create relationships
- [ ] Update PATCH /v1/archers/{id} to sync on school change
- [ ] Add validation (school code must exist)
- [ ] Handle edge cases ('UNK', invalid codes)
- [ ] Test sync logic thoroughly

### Phase 4: Frontend - School Management
- [ ] Design school management UI (mobile-first)
- [ ] Create school list page
- [ ] Create school form (create/edit)
- [ ] Create school details view
- [ ] Add school filtering to archer lists
- [ ] Test on mobile devices

### Phase 4: Frontend - Coach Management
- [ ] Design coach management UI (mobile-first)
- [ ] Create coach list page
- [ ] Create coach form (create/edit)
- [ ] Create coach details view
- [ ] Test on mobile devices

### Phase 4: Frontend - Relationship Management
- [ ] Design relationship management UI
- [ ] Create assign coaches to schools interface
- [ ] Create assign archers to schools interface
- [ ] Create assign archers to coaches interface
- [ ] Add relationship displays to existing pages
- [ ] Test on mobile devices

### Phase 5: Testing
- [ ] Test backward compatibility (all existing features)
- [ ] Test new endpoints (all CRUD operations)
- [ ] Test relationship management
- [ ] Test sync logic
- [ ] Performance testing (ensure no degradation)
- [ ] Mobile testing (99% phone usage)
- [ ] Edge case testing

### Phase 5: Documentation
- [ ] Update API documentation
- [ ] Create user guide for coaches
- [ ] Create admin guide
- [ ] Document migration procedure
- [ ] Create troubleshooting guide

### Deployment
- [ ] Final database backup
- [ ] Run migration on production
- [ ] Verify migration success
- [ ] Deploy API changes
- [ ] Deploy frontend changes
- [ ] Monitor for errors
- [ ] Train coaches on new features

---

## 🔄 Backward Compatibility Guarantees

### What Will NOT Change:

1. ✅ **`archers.school` field** - Remains VARCHAR(3), required, no FK
2. ✅ **Archer matching logic** - Still uses first_name + last_name + school
3. ✅ **School normalization** - Still normalizes to 3 uppercase letters
4. ✅ **Denormalized school fields** - All match/round tables keep school VARCHAR(3)
5. ✅ **Existing API endpoints** - All work exactly as before
6. ✅ **Frontend displays** - Still show school codes (optionally enhanced)
7. ✅ **CSV import/export** - Still uses school codes
8. ✅ **Default 'UNK' school** - Still handled as before

### What Will Be Added (Additive Only):

1. ➕ New `schools` table with full information
2. ➕ New `coaches` table
3. ➕ New relationship tables
4. ➕ New API endpoints (don't replace existing ones)
5. ➕ Optional enhancements (show school names, etc.)
6. ➕ Sync logic (maintains compatibility)

---

## 📊 Success Criteria

### Must Have:
- ✅ No breaking changes to existing functionality
- ✅ All existing tests pass
- ✅ Migration completes successfully
- ✅ Schools and coaches can be created/managed
- ✅ Relationships can be established
- ✅ Backward compatibility maintained

### Nice to Have:
- ✅ Frontend UI for management
- ✅ Enhanced displays (school names)
- ✅ Analytics/reporting on relationships
- ✅ Coach authentication integration

---

## 🚨 Rollback Plan

If issues arise after deployment:

1. **Immediate Rollback:**
   - Revert API code changes
   - Revert frontend changes
   - Database tables remain (additive, non-breaking)

2. **Database Rollback (if needed):**
   - Drop new tables (if safe)
   - Restore from backup (if critical issues)

3. **Partial Rollback:**
   - Disable new endpoints (return 503)
   - Keep database changes (they don't break existing code)
   - Fix issues and re-enable

---

## 📞 Questions & Decisions Needed

1. **School Code Uniqueness:**
   - Q: Should school codes be globally unique or per organization?
   - **Recommendation:** Globally unique (current system assumes this)

2. **Primary School:**
   - Q: If archer belongs to multiple schools, which is primary?
   - **Recommendation:** Most recent active relationship, fallback to `archers.school`

3. **Auto-Create Schools:**
   - Q: If archer created with unknown school code, auto-create school?
   - **Recommendation:** Yes, with placeholder name that can be edited

4. **Coach Authentication:**
   - Q: Integrate coaches table with authentication system?
   - **Recommendation:** Phase 2 enhancement, not in initial release

5. **Team vs School:**
   - Q: Should teams be persistent or remain match-specific?
   - **Recommendation:** Remain match-specific (per requirements)

---

## 📚 References

- Current Schema: `api/sql/schema.mysql.sql`
- Archer API: `api/index.php`
- Coach Console: `js/coach.js`, `coach.html`
- Migration Pattern: `api/sql/migration_phase2_solo_team_matches.sql`

---

**Next Steps:**
1. Review this document
2. Approve implementation plan
3. Begin Phase 1: Database Schema

