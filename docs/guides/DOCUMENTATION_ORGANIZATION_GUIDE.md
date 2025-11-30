# Documentation Organization Guide

**Date:** November 17, 2025  
**Purpose:** Clear rules for where documentation files should live

---

## 🎯 The Golden Rule

> **Root-level docs = HIGH-FREQUENCY actions**  
> **docs/ folder = REFERENCE material**

---

## 📁 Root Level (.md files at project root)

### ✅ SHOULD Be in Root

**Criteria:** Files accessed FREQUENTLY by multiple roles

#### 1. **Entry Points** (First thing people see)
- ✅ `README.md` - Project overview (EVERYONE reads first)
- ✅ `01-SESSION_QUICK_START.md` - Session start (EVERY session)

**Why root:** These are the doorway to your project. Need immediate visibility.

---

#### 2. **Setup/Onboarding** (One-time setup actions)
- ✅ `QUICK_START_LOCAL.md` - Local dev setup (ALL new developers)
- ✅ `SETUP_REMOTE_DATABASE.md` - Database setup (DEVOPS/initial setup)

**Why root:** Critical path for getting started. People need these IMMEDIATELY.

**Pattern:** If someone needs it in their first hour/day, it goes in root.

---

#### 3. **Deployment** (Frequent operational tasks)
- ✅ `DEPLOYMENT_CHECKLIST.md` - Pre-deploy checklist (EVERY deployment)

**Why root:** Used frequently during active development. Quick access critical.

**Pattern:** If used weekly or more, consider root.

---

#### 4. **Release Information** (Current version reference)
- ✅ `RELEASE_NOTES_v1.3.0.md` - Current release notes (CURRENT version only)

**Why root:** Frequently referenced for "what changed recently?"

**Pattern:** Only CURRENT release notes in root. Archive old ones to `docs/archive/releases/`

---

### ❌ Should NOT Be in Root

**Anti-patterns:**
- ❌ Historical documentation (use `docs/archive/`)
- ❌ Detailed technical specs (use `docs/`)
- ❌ Phase-specific docs (use `docs/`)
- ❌ Multiple versions of same doc (consolidate or archive old)

---

## 📚 docs/ Folder

### ✅ SHOULD Be in docs/

**Criteria:** Reference material, deep dives, historical records

#### 1. **Architecture & Technical Design**
- ✅ `APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md` - System architecture
- ✅ `BALE_GROUP_SCORING_WORKFLOW.md` - Core workflow
- ✅ `AUTHENTICATION_ANALYSIS.md` - Auth system
- ✅ `FUTURE_VISION_AND_ROADMAP.md` - Long-term vision

**Why docs/:** Deep reference material. Read once deeply, reference occasionally.

**Pattern:** If it's >500 lines or deep technical detail, it goes in docs/.

---

#### 2. **Implementation Details**
- ✅ `LIVE_SCORING_IMPLEMENTATION.md` - API documentation
- ✅ `ARCHER_SCORING_WORKFLOW.md` - User workflows
- ✅ `SPRINT_VERIFY_SCORECARDS.md` - Feature specs

**Why docs/:** Implementation reference. Developers read when working on specific features.

**Pattern:** Feature-specific or component-specific docs go in docs/.

---

#### 3. **Process & Planning**
- ✅ `ROADMAP.md` - Development roadmap
- ✅ `CLEANUP_ACTION_PLAN.md` - Cleanup tasks
- ✅ `PRODUCT_REQUIREMENTS.md` - Original PRD

**Why docs/:** Strategic planning. Referenced occasionally, not daily.

**Pattern:** Planning, process, and strategy docs go in docs/.

---

#### 4. **Testing & Quality**
- ✅ `AUTOMATED_TESTING.md` - Test infrastructure
- ✅ `MANUAL_TESTING_CHECKLIST.md` - Test procedures
- ✅ `PHASE_0_TESTING_PLAN.md` - Test plans

**Why docs/:** Testing reference. Used when writing/running tests, not constantly.

**Pattern:** Testing docs go in docs/ unless it's a critical pre-deploy checklist.

---

#### 5. **Historical & Archive**
- ✅ `docs/archive/` - Completed work, old versions, deprecated docs

**Why docs/archive/:** Historical record. Referenced rarely, preserved for context.

**Pattern:** Anything marked DEPRECATED or completed phases goes in archive.

---

## 🎯 Decision Matrix

### Quick Decision Tree

```
Is this doc accessed EVERY session?
├─ YES → Root (e.g., SESSION_QUICK_START.md)
└─ NO → Continue...

Is this needed for initial setup?
├─ YES → Root (e.g., QUICK_START_LOCAL.md)
└─ NO → Continue...

Is this used WEEKLY or more?
├─ YES → Root (e.g., DEPLOYMENT_CHECKLIST.md)
└─ NO → Continue...

Is this CURRENT release notes?
├─ YES → Root (e.g., RELEASE_NOTES_v1.3.0.md)
└─ NO → Continue...

Is this deep technical reference?
├─ YES → docs/ (e.g., AUTHENTICATION_ANALYSIS.md)
└─ NO → Continue...

Is this feature/component specific?
├─ YES → docs/ (e.g., LIVE_SCORING_IMPLEMENTATION.md)
└─ NO → Continue...

Is this historical/completed?
└─ YES → docs/archive/
```

---

## 📊 Frequency Analysis

| Location | Access Frequency | User Type | Size |
|----------|-----------------|-----------|------|
| **Root** | Daily/Weekly | All roles | Usually <200 lines |
| **docs/** | Monthly/As-needed | Developers | Any size |
| **docs/archive/** | Rarely | Historical reference | Any size |

---

## 🎨 Real Examples from Your Project

### ✅ Good: In Root
```
01-SESSION_QUICK_START.md
├─ Purpose: Session entry point
├─ Frequency: EVERY session
├─ Users: AI assistants, developers
└─ Verdict: ✅ CORRECT - High frequency

README.md
├─ Purpose: Project overview
├─ Frequency: First visit, occasional reference
├─ Users: Everyone
└─ Verdict: ✅ CORRECT - Universal entry point

QUICK_START_LOCAL.md
├─ Purpose: Local setup
├─ Frequency: Once per developer + troubleshooting
├─ Users: New developers
└─ Verdict: ✅ CORRECT - Critical setup path
```

### ✅ Good: In docs/
```
docs/APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md
├─ Purpose: Complete system architecture
├─ Frequency: Deep dive, occasional reference
├─ Users: Developers, planning
└─ Verdict: ✅ CORRECT - Reference material

docs/BALE_GROUP_SCORING_WORKFLOW.md
├─ Purpose: Core workflow details
├─ Frequency: Read once, reference when needed
├─ Users: Developers working on scoring
└─ Verdict: ✅ CORRECT - Detailed reference
```

### ⚠️ Edge Cases to Consider

**SETUP_REMOTE_DATABASE.md** (Currently in root)
```
Current: Root
├─ Purpose: Remote DB setup
├─ Frequency: Once ever (or very rarely)
├─ Users: DevOps, initial setup
└─ Question: Move to docs/?

DECISION: Could go either way
├─ Keep in root: If setup happens often (multiple environments)
├─ Move to docs/: If truly one-time setup
└─ Recommendation: Keep in root for now (visible for multi-env setups)
```

---

## 🔄 Migration Rules

### When to Move From Root → docs/

**Trigger:** Document is no longer high-frequency

**Example:**
```
# Old release notes
RELEASE_NOTES_v1.2.0.md (root)
  ↓
  New release published (v1.3.0)
  ↓
RELEASE_NOTES_v1.2.0.md → docs/archive/releases/

# Only current release stays in root
RELEASE_NOTES_v1.3.0.md (root) ✅
```

---

### When to Move From docs/ → Root

**Trigger:** Document becomes high-frequency

**Example:**
```
# Feature becomes core to daily workflow
docs/DEPLOYMENT_CHECKLIST.md
  ↓
  Used every deploy (weekly)
  ↓
DEPLOYMENT_CHECKLIST.md (root) ✅
```

---

## 📏 Size Guidelines

### Root Files
- **Recommended:** <500 lines
- **Maximum:** 1000 lines
- **Reasoning:** Quick reference, not deep dives

### docs/ Files
- **No limit** - Can be comprehensive
- **Encouraged:** Break very large docs (>2000 lines) into multiple files

### Exception
- `01-SESSION_QUICK_START.md` can be longer (currently 513 lines) because it's a complete reference for rapid onboarding

---

## 🎯 Your Current Structure Analysis

### ✅ Excellent Choices (Keep as-is)

**Root Level:**
```
01-SESSION_QUICK_START.md (513 lines)
├─ Every session entry point
└─ ✅ PERFECT for root

README.md (448 lines)
├─ Project overview
└─ ✅ PERFECT for root

QUICK_START_LOCAL.md
├─ Initial setup
└─ ✅ PERFECT for root

DEPLOYMENT_CHECKLIST.md
├─ Weekly deployments
└─ ✅ PERFECT for root

RELEASE_NOTES_v1.3.0.md
├─ Current release
└─ ✅ PERFECT for root
```

**docs/ Folder:**
```
APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md (724 lines)
├─ Deep technical reference
└─ ✅ PERFECT for docs/

BALE_GROUP_SCORING_WORKFLOW.md
├─ Core workflow details
└─ ✅ PERFECT for docs/

FUTURE_VISION_AND_ROADMAP.md (677 lines)
├─ Long-term planning
└─ ✅ PERFECT for docs/
```

---

## 🤔 Debatable Files

### SETUP_REMOTE_DATABASE.md (Currently in root)

**Arguments for ROOT:**
- Critical setup step
- Needed for multiple environments (dev, staging, prod)
- Visible during initial setup

**Arguments for docs/:**
- Truly one-time setup
- Most developers never touch production DB
- DevOps-specific

**Recommendation:** **Keep in root** for now
- Reason: Multi-environment setup makes it relevant
- If you move to managed DB service, archive it

---

## 🎓 Best Practices Summary

### ✅ DO

1. **Keep root clean** - Only high-frequency, high-visibility files
2. **Use clear naming** - `01-SESSION_QUICK_START.md` sorts to top
3. **Move old releases** - Archive when new version comes out
4. **Consolidate similar docs** - Don't have 3 deployment guides
5. **Add deprecation notices** - When moving to archive

### ❌ DON'T

1. **Don't dump everything in root** - It becomes cluttered
2. **Don't hide critical docs in docs/** - Setup guides need visibility
3. **Don't keep multiple versions** - Archive old, keep current
4. **Don't mix historical with current** - Use docs/archive/
5. **Don't use obscure names** - Be explicit about purpose

---

## 📝 Naming Conventions

### Root Level Files

**Pattern:** `[NUMBER-]SCREAMING_CASE.md` or `CamelCase.md`

**Examples:**
- ✅ `01-SESSION_QUICK_START.md` (numbered for sorting)
- ✅ `README.md` (standard convention)
- ✅ `DEPLOYMENT_CHECKLIST.md` (action-oriented)
- ✅ `QUICK_START_LOCAL.md` (clear purpose)

**Why:** Uppercase stands out in file browsers, numbers control sort order

---

### docs/ Folder Files

**Pattern:** `UPPERCASE_WITH_UNDERSCORES.md`

**Examples:**
- ✅ `APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md`
- ✅ `BALE_GROUP_SCORING_WORKFLOW.md`
- ✅ `AUTHENTICATION_ANALYSIS.md`

**Why:** Consistent with root, easy to read, clear hierarchy

---

## 🎯 Your Perfect Documentation Structure

```
Project Root/
│
├── 01-SESSION_QUICK_START.md        ← Start EVERY session here
├── README.md                         ← Project overview (everyone)
├── QUICK_START_LOCAL.md              ← Setup (new devs)
├── DEPLOYMENT_CHECKLIST.md           ← Deploy (weekly)
├── SETUP_REMOTE_DATABASE.md          ← DB setup (rare but important)
├── RELEASE_NOTES_v1.3.0.md          ← Current release only
│
├── [Application code...]
│
└── docs/
    ├── APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md  ← System design
    ├── BALE_GROUP_SCORING_WORKFLOW.md                ← Core workflow
    ├── FUTURE_VISION_AND_ROADMAP.md                  ← Long-term plan
    ├── AUTHENTICATION_ANALYSIS.md                     ← Auth system
    ├── LIVE_SCORING_IMPLEMENTATION.md                 ← API docs
    ├── [40 other reference docs...]
    │
    └── archive/
        ├── [Historical docs]
        ├── scripts/
        │   └── [Archived scripts]
        └── releases/
            └── [Old release notes]
```

---

## 🔄 Maintenance Schedule

### When New Release Published

```bash
# Archive old release notes
git mv RELEASE_NOTES_v1.3.0.md docs/archive/releases/

# Add new release notes to root
git add RELEASE_NOTES_v1.4.0.md

# Keep only current in root
```

### Quarterly Review

- Review root folder for low-frequency files
- Move to docs/ if usage decreased
- Archive completed phase documentation
- Consolidate duplicate information

---

## 💡 Pro Tips

### 1. **Use README.md as Hub**
Link to all major docs from README - it's your table of contents

### 2. **Number Important Root Files**
`01-SESSION_QUICK_START.md` sorts first, making it obvious

### 3. **Keep docs/ Organized**
Consider subdirectories if you have >60 docs:
- `docs/architecture/`
- `docs/testing/`
- `docs/guides/`

### 4. **Link Everything**
Every root doc should link to relevant docs/ files

### 5. **One Source of Truth**
Don't duplicate information. Link instead.

---

## 📏 Current Score: 9/10

Your current organization is **excellent**! 

**Strengths:**
- ✅ Clean root folder (only high-frequency files)
- ✅ Well-organized docs/ folder
- ✅ Clear archive structure
- ✅ Consistent naming

**Minor Opportunity:**
- Consider if `SETUP_REMOTE_DATABASE.md` is truly high-frequency
- If not, could move to `docs/` (but current placement is fine)

---

**Bottom Line:** Your documentation organization is already following best practices! The principles outlined here codify what you're already doing right.

---

**Last Updated:** November 17, 2025  
**Review:** When file organization feels cluttered

