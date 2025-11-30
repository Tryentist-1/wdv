# Test Sprawl Analysis & Organization Proposal

**Purpose:** Analyze current test file organization and propose cleaner structure  
**Date:** December 2025

---

## 🔍 Current State Analysis

### Root Level Test Files (8 scripts + 1 HTML)

**Test Scripts:**
- `test-api-suite.sh` - API test suite runner
- `daily-api-testing.sh` - Daily API testing
- `test-summary.sh` - Test summary generator
- `test-workflow.sh` - Test workflow runner
- `test_api.sh` - Production API health check
- `test_cloudflare.sh` - Cloudflare cache testing
- `test_phase1_local.sh` - Local API testing
- `create-api-test-suite.sh` - API test suite creation

**Test HTML:**
- `style-guide.html` - Component library (visual testing)

### API Folder Test Files (7 files)

**Test Utilities:**
- `api/test_harness.html` - Interactive API testing UI
- `api/test_harness.php` - CLI API testing
- `api/test_db_connection.php` - Database connection testing
- `api/create_test_bracket_data.php` - Test data creation

**Test SQL:**
- `api/sql/test_data.sql` - Test data
- `api/sql/test_data_simple.sql` - Simple test data
- `api/sql/cleanup_test_rounds.sql` - Test cleanup

### Tests Folder (Well Organized)

**Structure:**
- `tests/api/` - API test files (well organized)
- `tests/helpers/` - Test utilities
- `tests/*.spec.js` - E2E test files
- `tests/manual_sanity_check.md` - Manual test checklist
- `tests/README.md` - Test documentation
- `tests/TEST_ORGANIZATION.md` - Test organization guide

---

## 🎯 Problems Identified

### 1. **Test Scripts Scattered in Root**
- ❌ 8 test scripts in root directory
- ❌ Hard to find all test-related files
- ❌ No clear organization
- ❌ Clutters root directory

### 2. **Test Utilities in API Folder**
- ❌ Test harness files mixed with production API code
- ❌ Test SQL files in production SQL folder
- ❌ Unclear separation of test vs production code

### 3. **Test Components HTML in Root**
- ❌ `style-guide.html` in root (should be in tests/)
- ❌ Referenced in documentation but location unclear

### 4. **Inconsistent Organization**
- ✅ `tests/` folder is well organized
- ❌ Root-level scripts not organized
- ❌ API test utilities not in tests folder

---

## ✅ Proposed Organization

### New Structure

```
tests/
├── README.md                    ← Test suite documentation (keep)
├── TEST_ORGANIZATION.md         ← Test organization guide (keep)
├── manual_sanity_check.md       ← Manual test checklist (keep)
│
├── scripts/                     ← 🆕 All test scripts
│   ├── test-api-suite.sh
│   ├── daily-api-testing.sh
│   ├── test-summary.sh
│   ├── test-workflow.sh
│   ├── test_api.sh
│   ├── test_cloudflare.sh
│   ├── test_phase1_local.sh
│   └── create-api-test-suite.sh
│
├── components/                  ← 🆕 Component testing
│   └── style-guide.html     ← Move from root
│
├── api/                         ← Keep existing structure
│   ├── [existing test files]
│   └── harness/                 ← 🆕 Test harness utilities
│       ├── test_harness.html    ← Move from api/
│       ├── test_harness.php     ← Move from api/
│       └── test_db_connection.php ← Move from api/
│
├── data/                        ← 🆕 Test data files
│   ├── create_test_bracket_data.php ← Move from api/
│   └── sql/                     ← 🆕 Test SQL files
│       ├── test_data.sql        ← Move from api/sql/
│       ├── test_data_simple.sql ← Move from api/sql/
│       └── cleanup_test_rounds.sql ← Move from api/sql/
│
├── e2e/                         ← 🆕 E2E tests (if reorganizing)
│   └── [*.spec.js files]
│
├── helpers/                     ← Keep existing
│   └── [helper files]
│
└── [other existing files]
```

---

## 📋 Migration Plan

### Phase 1: Create Structure (2 min)
```bash
cd tests
mkdir -p scripts components api/harness data/sql
```

### Phase 2: Move Test Scripts (1 min)
```bash
# Move all test scripts from root to tests/scripts/
mv ../test-*.sh scripts/
mv ../create-api-test-suite.sh scripts/
mv ../daily-api-testing.sh scripts/
```

### Phase 3: Move Test Components (1 min)
```bash
# Move style-guide.html
mv ../style-guide.html components/
```

### Phase 4: Move API Test Utilities (1 min)
```bash
# Move test harness files
mv ../api/test_harness.html api/harness/
mv ../api/test_harness.php api/harness/
mv ../api/test_db_connection.php api/harness/
```

### Phase 5: Move Test Data Files (1 min)
```bash
# Move test data creation
mv ../api/create_test_bracket_data.php data/

# Move test SQL files
mv ../api/sql/test_data.sql data/sql/
mv ../api/sql/test_data_simple.sql data/sql/
mv ../api/sql/cleanup_test_rounds.sql data/sql/
```

### Phase 6: Update References (5 min)
- Update `package.json` scripts to use new paths
- Update documentation references
- Update test workflow scripts
- Update README.md references

---

## 🎯 Benefits

### For Developers
- ✅ All test files in one place (`tests/`)
- ✅ Clear organization by type (scripts, components, data)
- ✅ Easy to find test utilities
- ✅ Cleaner root directory

### For LLMs
- ✅ Clear test file organization
- ✅ Easy to understand test structure
- ✅ Less cognitive load
- ✅ Better context finding

### For Maintenance
- ✅ Clear rules for where new test files go
- ✅ Easy to find and update test scripts
- ✅ Better separation of test vs production code

---

## 📝 Updated File Locations

### Test Scripts
**Before:** Root directory (8 files)  
**After:** `tests/scripts/` (8 files)

### Test Components
**Before:** `style-guide.html` in root  
**After:** `tests/components/style-guide.html`

### Test Harness
**Before:** `api/test_harness.*`  
**After:** `tests/api/harness/test_harness.*`

### Test Data
**Before:** `api/create_test_bracket_data.php`, `api/sql/test_*.sql`  
**After:** `tests/data/create_test_bracket_data.php`, `tests/data/sql/test_*.sql`

---

## 🔄 Script Path Updates Needed

### package.json Scripts
```json
{
  "scripts": {
    "test": "playwright test",
    "test:local": "playwright test --config=playwright.config.local.js",
    "test:workflow": "./tests/scripts/test-workflow.sh",
    "test:api": "./tests/scripts/test_api.sh"
  }
}
```

### Documentation Updates
- `README.md` - Update test script paths
- `tests/README.md` - Update script locations
- `docs/testing/*.md` - Update references
- `01-SESSION_QUICK_START.md` - Update test commands

---

## ✅ Success Criteria

**Organization is successful when:**
- ✅ All test files in `tests/` folder
- ✅ Root directory has no test scripts
- ✅ API folder has no test utilities
- ✅ Clear separation of test vs production code
- ✅ Easy to find test files
- ✅ Documentation updated

---

## 🚀 Next Steps

1. **Review this proposal** - Does the structure make sense?
2. **Create folders** - Run Phase 1 commands
3. **Move files** - Execute Phases 2-5
4. **Update references** - Phase 6 (update paths)
5. **Test** - Verify all scripts still work
6. **Commit** - Commit the reorganization

---

## 📚 Related Documentation

- **[tests/TEST_ORGANIZATION.md](../tests/TEST_ORGANIZATION.md)** - Current test organization
- **[tests/README.md](../tests/README.md)** - Test suite documentation
- **[docs/testing/TESTING_STRATEGY.md](testing/TESTING_STRATEGY.md)** - Testing strategy

