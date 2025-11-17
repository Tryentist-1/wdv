# Documentation Archive Candidates

**Date:** November 17, 2025  
**Purpose:** Identify docs that should be archived to keep main docs folder clean and current

---

## 🗂️ Recommended for Archiving

### ✅ Completed Work (Historical Reference Only)

#### 1. **CSS_AUDIT_COMPLETE.md**
- **Date:** November 7, 2025
- **Purpose:** CSS/HTML audit before unified design system
- **Status:** Audit completed, design system implemented
- **Reason:** Historical snapshot, audit complete
- **Archive Path:** `docs/archive/CSS_AUDIT_COMPLETE.md`

#### 2. **RANKING_ROUND_DEPLOYMENT_SUMMARY.md**
- **Date:** October 15, 2025
- **Purpose:** Deployment summary for tuning phases 1-7
- **Status:** Deployment complete, features live
- **Reason:** Historical deployment record
- **Archive Path:** `docs/archive/RANKING_ROUND_DEPLOYMENT_SUMMARY.md`

#### 3. **RANKING_ROUND_SESSION_PROGRESS.md**
- **Date:** October 15, 2025
- **Purpose:** Session progress tracking for ranking round
- **Status:** Session complete
- **Reason:** Historical session notes
- **Archive Path:** `docs/archive/RANKING_ROUND_SESSION_PROGRESS.md`

#### 4. **DARK_MODE_ISSUES_TO_FIX.md**
- **Date:** November 7, 2025
- **Purpose:** Dark mode inline style issues
- **Status:** Issues likely resolved (verify first)
- **Reason:** Issue list from specific audit
- **Archive Path:** `docs/archive/DARK_MODE_ISSUES_TO_FIX.md`

---

### 📊 Point-in-Time Inventories (May Be Outdated)

#### 5. **RANKING_ROUND_INVENTORY.md**
- **Check:** Is this current or superseded by newer docs?
- **If outdated:** Archive as historical snapshot
- **If current:** Keep as reference

#### 6. **RANKING_ROUND_MODULE_COMPLETE_INVENTORY.md**
- **Check:** Same as above
- **Note:** "COMPLETE" suggests it's a final snapshot
- **Archive Path:** `docs/archive/RANKING_ROUND_MODULE_COMPLETE_INVENTORY.md`

#### 7. **COACH_MODULE_COMPLETE_INVENTORY.md**
- **Check:** Same as above
- **Note:** "COMPLETE" suggests it's a final snapshot
- **Archive Path:** `docs/archive/COACH_MODULE_COMPLETE_INVENTORY.md`

#### 8. **ARCHER_MODULE_AUDIT.md**
- **Check:** Is audit complete?
- **If complete:** Archive
- **If ongoing:** Keep

#### 9. **AUDIT_RESULTS.md**
- **Check:** What audit is this from? Still relevant?
- **If historical:** Archive
- **If ongoing tracking:** Keep

#### 10. **AUDIT_SCRIPTS.md**
- **Check:** Are these scripts still used?
- **If deprecated:** Archive
- **If actively used:** Keep

---

### 🐛 Bug/Issue Lists (Check Status)

#### 11. **RANKING_ROUND_BUGS_AND_FEATURES.md**
- **Check:** Are bugs fixed? Are features implemented?
- **If all resolved:** Archive
- **If tracking ongoing:** Keep but rename to current status

---

### 📝 Implementation Notes (Check If Superseded)

#### 12. **RANKING_ROUND_IMPLEMENTATION_NOTES.md**
- **Check:** Are these implementation details superseded by newer docs?
- **Compare with:** LIVE_SCORING_IMPLEMENTATION.md
- **If superseded:** Archive
- **If unique value:** Keep

#### 13. **BACKEND_LIVE_UPDATES_DESIGN.md**
- **Check:** Is this superseded by LIVE_SCORING_IMPLEMENTATION.md?
- **If superseded:** Archive
- **If unique value:** Keep

#### 14. **SCORE360_DEEP_DIVE.md**
- **Check:** Is Score360 still relevant or replaced by Ranking Round?
- **If replaced:** Archive (historical reference)
- **If still used:** Keep

---

## 🔄 Special Cases

### **02-vibe_coding_roles.md**
- **Status:** Unclear if this is current AI collaboration guidance
- **Action:** Review to determine if superseded by 01-SESSION_QUICK_START.md
- **If superseded:** Archive
- **If complementary:** Keep

### **PHASE_0_TESTING_PLAN.md**
- **Status:** Phase 0 complete (per old session doc)
- **Action:** If testing complete, archive as historical test plan
- **Archive Path:** `docs/archive/PHASE_0_TESTING_PLAN.md`

### **RELEASE_NOTES_RANKING_ROUND_2.0.md**
- **Status:** Old release notes
- **Action:** Keep for historical reference, but consider moving to releases folder
- **Archive Path:** `docs/archive/releases/RELEASE_NOTES_RANKING_ROUND_2.0.md`

---

## 🎯 Current/Active Documents (Keep in Main Docs)

These should **NOT** be archived:

### Master References
- ✅ **APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md** - Current master reference
- ✅ **BALE_GROUP_SCORING_WORKFLOW.md** - Critical workflow
- ✅ **FUTURE_VISION_AND_ROADMAP.md** - Long-term plan
- ✅ **MODULE_COMPARISON_SUMMARY.md** - Current state

### Current Authentication
- ✅ **AUTHENTICATION_ANALYSIS.md** - Complete auth system
- ✅ **AUTHENTICATION_FLOWS.md** - Flow diagrams
- ✅ **AUTHENTICATION_QUICK_REFERENCE.md** - Quick lookup
- ✅ **CLEANUP_ACTION_PLAN.md** - Ongoing cleanup tasks

### Current Implementation
- ✅ **LIVE_SCORING_IMPLEMENTATION.md** - Current API docs
- ✅ **ARCHER_SCORING_WORKFLOW.md** - Current user workflow
- ✅ **SPRINT_VERIFY_SCORECARDS.md** - Current verification spec

### Active Planning
- ✅ **ROADMAP.md** - Current roadmap
- ✅ **FIX_SUMMARY_NOV17.md** - Recent fix
- ✅ **PRODUCT_REQUIREMENTS.md** - Original PRD (historical but important)

### Development Tools
- ✅ **AUTOMATED_TESTING.md** - Current testing
- ✅ **MANUAL_TESTING_CHECKLIST.md** - Active checklist
- ✅ **DEVELOPMENT_WORKFLOW.md** - Current workflow
- ✅ **LOCAL_DEVELOPMENT_SETUP.md** - Setup guide
- ✅ **CLOUDFLARE_CACHE_PURGE_SETUP.md** - Deployment tool

### Current Archer Management
- ✅ **ARCHER_MANAGEMENT.md** - If current
- ✅ **ARCHER_MANAGEMENT_INTEGRATION_PLAN.md** - If current
- ✅ **ARCHER_DATA_UNIFICATION_PHASE1.md** - If ongoing

### Current Coach Tools
- ✅ **COACH_CONSOLE_REDESIGN.md** - If current design
- ✅ **COACH_LIVE_UPDATES_IMPLEMENTATION_PLAN.md** - If ongoing

### Other
- ✅ **TECHNICAL_DOCUMENTATION.md** - General tech reference
- ✅ **QR_CODE_EVENT_ACCESS.md** - Current feature
- ✅ **KEYPAD_FLOW_DOCUMENTATION.md** - Current feature
- ✅ **RANKING_ROUND_TUTORIAL.md** - User tutorial
- ✅ **RANKING_ROUND_WORKFLOW.md** - Current workflow

---

## 📋 Recommended Actions

### Immediate (High Confidence)
```bash
# Archive completed work
git mv docs/CSS_AUDIT_COMPLETE.md docs/archive/
git mv docs/RANKING_ROUND_DEPLOYMENT_SUMMARY.md docs/archive/
git mv docs/RANKING_ROUND_SESSION_PROGRESS.md docs/archive/
git mv docs/PHASE_0_TESTING_PLAN.md docs/archive/

# Archive point-in-time snapshots
git mv docs/RANKING_ROUND_MODULE_COMPLETE_INVENTORY.md docs/archive/
git mv docs/COACH_MODULE_COMPLETE_INVENTORY.md docs/archive/

# Archive old release notes to releases subfolder
mkdir -p docs/archive/releases
git mv docs/RELEASE_NOTES_RANKING_ROUND_2.0.md docs/archive/releases/
```

### Verify First (Need Review)
- **DARK_MODE_ISSUES_TO_FIX.md** - Check if issues resolved
- **RANKING_ROUND_BUGS_AND_FEATURES.md** - Check if bugs fixed
- **AUDIT_RESULTS.md** - Check if audit complete
- **AUDIT_SCRIPTS.md** - Check if scripts still used
- **SCORE360_DEEP_DIVE.md** - Check if Score360 still relevant
- **02-vibe_coding_roles.md** - Check if superseded

### Add Deprecation Notices
For each archived file, add header:
```markdown
> **⚠️ DEPRECATED - ARCHIVED November 17, 2025**
> 
> [Reason for archiving]
> 
> **Superseded by:** [Link to new doc if applicable]
> 
> This file is kept for historical reference only.
```

---

## 🎯 Benefits of Archiving

1. **Cleaner Main Docs Folder**
   - Easier to find current docs
   - Less confusion about what's current
   - Faster navigation

2. **Historical Record Preserved**
   - All work documented
   - Audit trail maintained
   - Can reference old approaches

3. **Better Documentation Hygiene**
   - Current docs stand out
   - Deprecated docs clearly marked
   - New developers not misled

---

## 📁 Proposed Folder Structure

```
docs/
├── [Current master docs]
├── [Current implementation docs]
├── [Current planning docs]
└── archive/
    ├── 01-SESSION_MANAGEMENT_AND_WORKFLOW.md (✅ done)
    ├── SESSION_SUMMARY.md (already here)
    ├── CSS_AUDIT_COMPLETE.md (to add)
    ├── RANKING_ROUND_DEPLOYMENT_SUMMARY.md (to add)
    ├── RANKING_ROUND_SESSION_PROGRESS.md (to add)
    ├── PHASE_0_TESTING_PLAN.md (to add)
    ├── RANKING_ROUND_MODULE_COMPLETE_INVENTORY.md (to add)
    ├── COACH_MODULE_COMPLETE_INVENTORY.md (to add)
    └── releases/
        └── RELEASE_NOTES_RANKING_ROUND_2.0.md (to add)
```

---

**Next Step:** Review this list, verify status of "Verify First" items, then run archiving commands.

**Created:** November 17, 2025  
**Delete this file after archiving complete**

