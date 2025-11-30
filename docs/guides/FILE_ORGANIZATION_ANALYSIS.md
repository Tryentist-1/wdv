# File Organization Analysis

**Date:** December 2025  
**Purpose:** Identify orphaned files, misplaced files, and organizational improvements

---

## 🔍 Analysis Summary

### Files Analyzed
- Root directory files (HTML, JS, SH, JSON)
- Script references and usage
- Documentation references
- File purposes and relationships

---

## ❌ Orphaned Files (No References or Purpose)

### 1. **diagnostic_tool.html** ⚠️ ORPHANED
- **Location:** Root
- **Size:** 1 line (essentially empty)
- **References:** Only in `api/data_admin.php` (links to it, but file is empty)
- **Purpose:** Unknown - appears to be a placeholder
- **Recommendation:** 
  - **DELETE** if not needed
  - **OR** Implement if it was intended for diagnostics
  - **OR** Move to `docs/archive/` if historical

### 2. **temp_package_scripts.json** ⚠️ TEMPORARY
- **Location:** Root
- **Size:** 11 lines
- **References:** Only in `tests/scripts/create-api-test-suite.sh`
- **Purpose:** Temporary file for package.json script generation
- **Recommendation:** 
  - **DELETE** - Temporary files shouldn't be in repo
  - **OR** Move to `.gitignore` if needed for generation process

### 3. **archer_trading_card_mockup.html** ⚠️ MOCKUP/ORPHANED
- **Location:** Root
- **Size:** 697 lines
- **References:** **NONE FOUND**
- **Purpose:** Visual mockup of trading card design
- **Recommendation:**
  - **MOVE** to `docs/archive/mockups/` if historical
  - **OR** **DELETE** if no longer needed
  - **OR** **MOVE** to `docs/features/` if it's a planned feature

---

## 📁 Files That Should Be Moved

### Development/Utility Scripts → `scripts/` folder

These scripts are utility/development tools that should be organized:

#### 1. **cleanup-dev-db.sh** → `scripts/dev/cleanup-dev-db.sh`
- **Current:** Root
- **Purpose:** Clean dev database (preserves archers)
- **References:** 
  - `docs/guides/FRESH_START_PROCESS.md`
  - `docs/guides/DEV_DATABASE_CLEANUP_PROCESS.md`
- **Recommendation:** Move to `scripts/dev/` (create folder)

#### 2. **setup-autostart.sh** → `scripts/dev/setup-autostart.sh`
- **Current:** Root
- **Purpose:** Configure auto-start for dev servers
- **References:**
  - `docs/guides/DEV_SERVER_MANAGEMENT.md`
- **Recommendation:** Move to `scripts/dev/` (create folder)

#### 3. **setup_local.sh** → `scripts/dev/setup_local.sh`
- **Current:** Root
- **Purpose:** Local development setup automation
- **References:**
  - `docs/scripts/README.md`
  - `QUICK_START_LOCAL.md`
- **Recommendation:** Move to `scripts/dev/` (create folder)

#### 4. **start-dev.sh** → `scripts/dev/start-dev.sh`
- **Current:** Root
- **Purpose:** Start development servers
- **References:**
  - `docs/guides/DEV_SERVER_MANAGEMENT.md`
  - `setup-autostart.sh` (references it)
  - `package.json` (npm scripts)
- **Recommendation:** Move to `scripts/dev/` (create folder)
- **Note:** Will need to update `setup-autostart.sh` reference

#### 5. **DeployFTP.sh** → `scripts/deploy/DeployFTP.sh`
- **Current:** Root
- **Purpose:** Primary deployment pipeline
- **References:**
  - `docs/scripts/README.md`
  - `package.json` (npm scripts)
- **Recommendation:** Move to `scripts/deploy/` (create folder)

---

## ✅ Files That Are Fine in Root

### HTML Application Files (Keep in Root)
These are the main application pages accessed directly:
- `index.html` - Landing page ✅
- `coach.html` - Coach console ✅
- `ranking_round_300.html` - 300 round scoring ✅
- `solo_card.html` - Solo matches ✅
- `team_card.html` - Team matches ✅
- `solo_round.html` - Solo round ✅
- `event_dashboard.html` - Event dashboard ✅
- `results.html` - Live leaderboard ✅
- `archer_list.html` - Roster management ✅
- `archer_history.html` - Archer history ✅
- `archer_matches.html` - Archer matches ✅
- `bracket_results.html` - Bracket results ✅
- `scorecard_editor.html` - Scorecard editor ✅

### HTML Tools/Features (Keep in Root - Active)
- `gemini-oneshot.html` - Practice target tool (995 lines, actively used) ✅
- `archer_results_pivot.html` - Analytics pivot view (actively used) ✅

### Configuration Files (Keep in Root)
- `package.json` ✅
- `package-lock.json` ✅
- `jest.config.js` ✅
- `playwright.config.js` ✅
- `playwright.config.local.js` ✅
- `postcss.config.js` ✅
- `tailwind.config.js` ✅

### Documentation Files (Keep in Root - High Frequency)
- `README.md` ✅
- `01-SESSION_QUICK_START.md` ✅
- `QUICK_START_LOCAL.md` ✅
- `DEPLOYMENT_CHECKLIST.md` ✅
- `RELEASE_NOTES_v1.8.0.md` ✅
- `SETUP_REMOTE_DATABASE.md` ✅

---

## 📊 Proposed New Structure

```
wdv/
├── scripts/                    ← 🆕 New folder for utility scripts
│   ├── dev/                    ← 🆕 Development utilities
│   │   ├── start-dev.sh
│   │   ├── setup_local.sh
│   │   ├── setup-autostart.sh
│   │   └── cleanup-dev-db.sh
│   └── deploy/                 ← 🆕 Deployment scripts
│       └── DeployFTP.sh
│
├── docs/
│   └── archive/
│       └── mockups/            ← 🆕 For mockup files
│           └── archer_trading_card_mockup.html
│
└── [existing structure]
```

---

## 🎯 Migration Plan

### Phase 1: Create Structure
```bash
mkdir -p scripts/dev scripts/deploy docs/archive/mockups
```

### Phase 2: Move Development Scripts
```bash
mv start-dev.sh scripts/dev/
mv setup_local.sh scripts/dev/
mv setup-autostart.sh scripts/dev/
mv cleanup-dev-db.sh scripts/dev/
```

### Phase 3: Move Deployment Scripts
```bash
mv DeployFTP.sh scripts/deploy/
```

### Phase 4: Handle Orphaned Files
```bash
# Option 1: Delete temporary file
rm temp_package_scripts.json

# Option 2: Archive mockup
mv archer_trading_card_mockup.html docs/archive/mockups/

# Option 3: Delete or implement diagnostic_tool.html
# (Decision needed: delete, implement, or archive)
```

### Phase 5: Update References
- Update `package.json` scripts to use new paths
- Update `setup-autostart.sh` to reference new `start-dev.sh` path
- Update documentation references
- Update `QUICK_START_LOCAL.md` references

---

## 📝 Files Needing Decision

### diagnostic_tool.html
**Status:** Empty placeholder (1 line)  
**Question:** What was this intended for?  
**Options:**
1. Delete if not needed
2. Implement if it was planned
3. Archive if historical

### archer_trading_card_mockup.html
**Status:** Mockup file, no references  
**Question:** Is this a planned feature or historical?  
**Options:**
1. Move to `docs/archive/mockups/` if historical
2. Move to `docs/features/` if planned feature
3. Delete if no longer relevant

### temp_package_scripts.json
**Status:** Temporary file  
**Question:** Is this needed for generation process?  
**Options:**
1. Delete if not needed
2. Add to `.gitignore` if needed for generation

---

## ✅ Benefits of Reorganization

### For Developers
- ✅ Clear organization of utility scripts
- ✅ Easier to find development tools
- ✅ Cleaner root directory
- ✅ Better separation of concerns

### For LLMs
- ✅ Clear file organization
- ✅ Easier to understand project structure
- ✅ Less cognitive load
- ✅ Better context finding

### For Maintenance
- ✅ Clear rules for where scripts go
- ✅ Easy to find and update utilities
- ✅ Better organization for new scripts

---

## 🔄 Script Path Updates Needed

### package.json
```json
{
  "scripts": {
    "serve": "php -S localhost:8001",
    "deploy": "bash ./scripts/deploy/DeployFTP.sh",
    "deploy:dry": "bash ./scripts/deploy/DeployFTP.sh --dry-run",
    "deploy:reset": "bash ./scripts/deploy/DeployFTP.sh --reset",
    "deploy:fast": "bash ./scripts/deploy/DeployFTP.sh --no-local-backup"
  }
}
```

### setup-autostart.sh
```bash
<string>${SCRIPT_DIR}/scripts/dev/start-dev.sh</string>
```

### Documentation Updates
- `docs/scripts/README.md` - Update script paths
- `docs/guides/DEV_SERVER_MANAGEMENT.md` - Update paths
- `QUICK_START_LOCAL.md` - Update script references

---

## 📋 Summary

### Orphaned Files (3)
1. `diagnostic_tool.html` - Empty, needs decision
2. `temp_package_scripts.json` - Temporary, should delete
3. `archer_trading_card_mockup.html` - Mockup, needs decision

### Files to Move (5 scripts)
1. `start-dev.sh` → `scripts/dev/`
2. `setup_local.sh` → `scripts/dev/`
3. `setup-autostart.sh` → `scripts/dev/`
4. `cleanup-dev-db.sh` → `scripts/dev/`
5. `DeployFTP.sh` → `scripts/deploy/`

### Files to Keep in Root (All others)
- Application HTML files (13 files)
- Configuration files (6 files)
- High-frequency documentation (6 files)

---

## 🚀 Next Steps

1. **Review this analysis** - Confirm decisions on orphaned files
2. **Create folder structure** - Run Phase 1 commands
3. **Move scripts** - Execute Phases 2-3
4. **Handle orphaned files** - Execute Phase 4 (with decisions)
5. **Update references** - Phase 5 (update paths)
6. **Test** - Verify all scripts still work
7. **Commit** - Commit the reorganization

---

**Last Updated:** December 2025

