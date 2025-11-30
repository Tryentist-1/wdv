# Schools/Clubs & Coaches Feature - Quick Reference

**Date:** November 6, 2025  
**Status:** Analysis Complete - Awaiting Approval

---

## 📄 Main Documentation

**Full Analysis & Implementation Plan:**
👉 [`SCHOOLS_COACHES_FEATURE_ANALYSIS.md`](./SCHOOLS_COACHES_FEATURE_ANALYSIS.md)

This quick reference summarizes the key points. Read the full analysis document before proceeding with implementation.

---

## 🎯 Feature Overview

### Requirements:
- ✅ Multiple coaches can be associated with a school/club
- ✅ Multiple archers can be associated with:
  - A team (existing, match-specific - no changes)
  - A school/club (new, persistent entity)
  - A coach (new, persistent entity)

### Key Constraint:
- **MUST maintain 100% backward compatibility** with existing system
- School codes (3-letter VARCHAR) are used extensively
- Cannot break existing functionality

---

## 🏗️ Database Changes

### New Tables (Additive Only):
1. `schools` - Stores school/club information
2. `coaches` - Stores coach information
3. `school_coaches` - Many-to-many: coaches ↔ schools
4. `archer_schools` - Many-to-many: archers ↔ schools
5. `archer_coaches` - Many-to-many: archers ↔ coaches

### Existing Tables:
- **NO CHANGES** to `archers` table
- `school VARCHAR(3)` field remains unchanged
- All denormalized school fields remain unchanged

### Migration:
- Migrate existing school codes to `schools` table
- Create relationships for existing archers
- Handle edge cases ('UNK', NULL, invalid codes)

---

## ⚠️ Critical Risks

### 🔴 HIGH RISK:
1. **Breaking Archer Matching** - Must maintain exact matching logic
2. **Data Inconsistency** - Sync between `archers.school` and `archer_schools`
3. **Performance** - Must keep denormalized fields for fast queries

### 🟡 MEDIUM RISK:
1. **Migration Data Loss** - Need thorough testing
2. **Frontend Incompatibility** - Must test all screens

---

## 📋 Implementation Phases

1. **Phase 1: Database Schema** (Days 1-2)
   - Create new tables
   - Run data migration
   - Test on dev database

2. **Phase 2: API Endpoints** (Days 3-5)
   - Schools CRUD endpoints
   - Coaches CRUD endpoints
   - Relationship management endpoints
   - **All existing endpoints remain unchanged**

3. **Phase 3: Sync Logic** (Days 6-7)
   - Sync `archers.school` ↔ `archer_schools`
   - Update archer creation endpoints
   - Maintain backward compatibility

4. **Phase 4: Frontend** (Days 8-10)
   - School/coach management UI
   - Relationship management UI
   - Enhanced displays (optional)

5. **Phase 5: Testing & Docs** (Days 11-12)
   - Backward compatibility testing
   - Documentation
   - Training materials

---

## ✅ Backward Compatibility Guarantees

### What Will NOT Change:
- ✅ `archers.school` field (remains VARCHAR(3), required)
- ✅ Archer matching logic (first_name + last_name + school)
- ✅ School normalization (3 uppercase letters)
- ✅ Denormalized school fields in all tables
- ✅ Existing API endpoints (all work as before)
- ✅ Frontend displays (still show school codes)

### What Will Be Added (Additive Only):
- ➕ New tables for schools and coaches
- ➕ New API endpoints (don't replace existing)
- ➕ Optional enhancements (show school names, etc.)
- ➕ Sync logic (maintains compatibility)

---

## 🚀 Next Steps

1. **Review Analysis Document:**
   - Read: `docs/SCHOOLS_COACHES_FEATURE_ANALYSIS.md`
   - Review migration script: `api/sql/migration_add_schools_coaches.sql`
   - Approve implementation plan

2. **Pre-Implementation:**
   - Create database backup strategy
   - Set up dev environment for testing
   - Review migration with database admin

3. **Begin Phase 1:**
   - Finalize migration script
   - Test on dev database
   - Get approval to proceed

---

## 📞 Questions to Answer

1. School code uniqueness: Globally unique? (Recommendation: Yes)
2. Primary school: How to determine if multiple schools? (Recommendation: Most recent active)
3. Auto-create schools: Create placeholder if unknown code? (Recommendation: Yes)
4. Coach authentication: Integrate with auth system? (Recommendation: Phase 2)
5. Team vs School: Teams remain match-specific? (Recommendation: Yes, per requirements)

---

**See full analysis document for detailed implementation plan, todo list, and risk mitigation strategies.**

