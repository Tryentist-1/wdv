# Docs Folder Organization Guide

**Purpose:** Clean, maintainable docs folder structure that helps LLMs understand context without overwhelming  
**Last Updated:** December 2025

---

## 🎯 Current Problem

**107 markdown files** in a flat structure makes it:
- ❌ Hard to find relevant docs
- ❌ Overwhelming for LLMs
- ❌ Difficult to maintain
- ❌ No clear categorization

---

## ✅ Proposed Structure

### New Folder Organization

```
docs/
├── README.md                          ← Start here! Index of all docs
│
├── core/                              ← Essential reference docs (5-10 files)
│   ├── APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md
│   ├── BALE_GROUP_SCORING_WORKFLOW.md
│   ├── AUTHENTICATION_ANALYSIS.md
│   ├── OAS_RULES.md
│   └── PRODUCT_REQUIREMENTS.md
│
├── guides/                            ← How-to guides and best practices
│   ├── LLM_ONBOARDING_BEST_PRACTICES.md
│   ├── SESSION_WRAP_UP_BEST_PRACTICES.md
│   ├── RELEASE_NOTES_FOR_LLMS.md
│   ├── DOCUMENTATION_ORGANIZATION_GUIDE.md
│   ├── DEVELOPMENT_WORKFLOW.md
│   └── LOCAL_DEVELOPMENT_SETUP.md
│
├── features/                          ← Feature documentation
│   ├── ranking-rounds/
│   │   ├── RANKING_ROUND_TUTORIAL.md
│   │   ├── RANKING_ROUND_WORKFLOW.md
│   │   └── RANKING_ROUND_STATUS_WORKFLOW.md
│   ├── solo-matches/
│   ├── team-matches/
│   ├── brackets/
│   └── event-dashboard/
│
├── implementation/                    ← Implementation plans and details
│   ├── LIVE_SCORING_IMPLEMENTATION.md
│   ├── PHASE2_AUTH_IMPLEMENTATION.md
│   ├── PHASE2_TEAM_MIGRATION_PLAN.md
│   └── TAILWIND_MIGRATION_PLAN.md
│
├── testing/                           ← Testing documentation
│   ├── AUTOMATED_TESTING.md
│   ├── MANUAL_TESTING_CHECKLIST.md
│   └── BRACKET_RESULTS_TEST_PLAN.md
│
├── planning/                          ← Roadmaps and future vision
│   ├── FUTURE_VISION_AND_ROADMAP.md
│   ├── ROADMAP.md
│   └── Feature_*.md
│
├── fixes/                             ← Bug fixes and resolutions (archive after 6 months)
│   ├── ARCHER_SELECTION_FIX.md
│   ├── KEYPAD_FIX_SUMMARY.md
│   └── RESUME_ROUND_DIVISION_FIX_SUMMARY.md
│
├── analysis/                          ← Analysis and evaluation docs
│   ├── EVENT_TRACKING_DETAILS_ENHANCEMENT_EVALUATION.md
│   ├── SCHOOLS_COACHES_FEATURE_ANALYSIS.md
│   └── TABLE_WIDTH_IMPACT_ANALYSIS.md
│
├── archive/                           ← Historical/completed work
│   ├── releases/
│   ├── completed-phases/
│   └── deprecated/
│
└── scripts/                           ← Operational scripts (already exists)
```

---

## 📋 Categorization Rules

### Core (5-10 files)
**Essential reference docs that define the system**

**Criteria:**
- ✅ Master reference documents
- ✅ Critical workflow documentation
- ✅ System architecture
- ✅ Read by every developer

**Examples:**
- `APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md`
- `BALE_GROUP_SCORING_WORKFLOW.md`
- `AUTHENTICATION_ANALYSIS.md`
- `OAS_RULES.md`

### Guides (10-15 files)
**How-to guides and best practices**

**Criteria:**
- ✅ Step-by-step instructions
- ✅ Best practices
- ✅ Workflow guides
- ✅ Setup instructions

**Examples:**
- `LLM_ONBOARDING_BEST_PRACTICES.md`
- `SESSION_WRAP_UP_BEST_PRACTICES.md`
- `DEVELOPMENT_WORKFLOW.md`
- `LOCAL_DEVELOPMENT_SETUP.md`

### Features (20-30 files)
**Feature-specific documentation organized by feature**

**Structure:**
```
features/
├── ranking-rounds/
├── solo-matches/
├── team-matches/
├── brackets/
├── event-dashboard/
└── archer-management/
```

**Criteria:**
- ✅ Feature-specific docs
- ✅ User guides for features
- ✅ Feature workflows

### Implementation (15-20 files)
**Implementation plans and technical details**

**Criteria:**
- ✅ Implementation plans
- ✅ Migration plans
- ✅ Technical implementation details
- ✅ API documentation

**Examples:**
- `LIVE_SCORING_IMPLEMENTATION.md`
- `PHASE2_AUTH_IMPLEMENTATION.md`
- `TAILWIND_MIGRATION_PLAN.md`

### Testing (5-10 files)
**Testing documentation**

**Criteria:**
- ✅ Test plans
- ✅ Testing guides
- ✅ Test checklists

### Planning (5-10 files)
**Roadmaps and future vision**

**Criteria:**
- ✅ Roadmaps
- ✅ Future vision
- ✅ Feature planning docs

### Fixes (Archive after 6 months)
**Bug fixes and resolutions**

**Criteria:**
- ✅ Fix summaries
- ✅ Bug resolutions
- ✅ Debug notes

**Maintenance:** Archive to `archive/fixes/` after 6 months

### Analysis (10-15 files)
**Analysis and evaluation documents**

**Criteria:**
- ✅ Feature evaluations
- ✅ Impact analyses
- ✅ Technical evaluations

---

## 🚀 Migration Plan

### Phase 1: Create Structure (5 min)
```bash
cd docs
mkdir -p core guides features/{ranking-rounds,solo-matches,team-matches,brackets,event-dashboard} implementation testing planning fixes analysis
```

### Phase 2: Move Core Docs (10 min)
```bash
# Move essential reference docs
mv APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md core/
mv BALE_GROUP_SCORING_WORKFLOW.md core/
mv AUTHENTICATION_ANALYSIS.md core/
mv OAS_RULES.md core/
mv PRODUCT_REQUIREMENTS.md core/
```

### Phase 3: Move Guides (10 min)
```bash
# Move guides and best practices
mv LLM_ONBOARDING_BEST_PRACTICES.md guides/
mv SESSION_WRAP_UP_BEST_PRACTICES.md guides/
mv RELEASE_NOTES_FOR_LLMS.md guides/
mv DEVELOPMENT_WORKFLOW.md guides/
mv LOCAL_DEVELOPMENT_SETUP.md guides/
```

### Phase 4: Organize Features (15 min)
```bash
# Create feature subfolders and move docs
mv RANKING_ROUND_*.md features/ranking-rounds/
mv *SOLO*.md features/solo-matches/  # Review first!
mv *TEAM*.md features/team-matches/  # Review first!
mv *BRACKET*.md features/brackets/
mv *EVENT_DASHBOARD*.md features/event-dashboard/
```

### Phase 5: Move Implementation Docs (10 min)
```bash
mv *IMPLEMENTATION*.md implementation/
mv *MIGRATION*.md implementation/
mv LIVE_SCORING_IMPLEMENTATION.md implementation/
```

### Phase 6: Move Fixes (5 min)
```bash
mv *FIX*.md fixes/
mv *BUG*.md fixes/
mv *DEBUG*.md fixes/
mv *SUMMARY*.md fixes/  # Review first - some might be analysis
```

### Phase 7: Move Analysis (5 min)
```bash
mv *ANALYSIS*.md analysis/
mv *EVALUATION*.md analysis/
mv *IMPACT*.md analysis/
```

### Phase 8: Create README.md (10 min)
Create `docs/README.md` as index (see template below)

---

## 📝 Docs README Template

```markdown
# Documentation Index

**Purpose:** Quick reference to all documentation  
**Last Updated:** [Date]

## 🎯 Start Here

### Essential Reading (In Order)
1. **[BALE_GROUP_SCORING_WORKFLOW.md](core/BALE_GROUP_SCORING_WORKFLOW.md)** - Critical workflow
2. **[APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md](core/APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md)** - System architecture
3. **[OAS_RULES.md](core/OAS_RULES.md)** - Tournament rules

## 📚 Documentation by Category

### Core Reference
- [APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md](core/APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md)
- [BALE_GROUP_SCORING_WORKFLOW.md](core/BALE_GROUP_SCORING_WORKFLOW.md)
- [AUTHENTICATION_ANALYSIS.md](core/AUTHENTICATION_ANALYSIS.md)
- [OAS_RULES.md](core/OAS_RULES.md)

### Guides & Best Practices
- [LLM_ONBOARDING_BEST_PRACTICES.md](guides/LLM_ONBOARDING_BEST_PRACTICES.md)
- [SESSION_WRAP_UP_BEST_PRACTICES.md](guides/SESSION_WRAP_UP_BEST_PRACTICES.md)
- [DEVELOPMENT_WORKFLOW.md](guides/DEVELOPMENT_WORKFLOW.md)

### Features
- [Ranking Rounds](features/ranking-rounds/)
- [Solo Matches](features/solo-matches/)
- [Team Matches](features/team-matches/)
- [Brackets](features/brackets/)
- [Event Dashboard](features/event-dashboard/)

### Implementation
- [LIVE_SCORING_IMPLEMENTATION.md](implementation/LIVE_SCORING_IMPLEMENTATION.md)
- [PHASE2_AUTH_IMPLEMENTATION.md](implementation/PHASE2_AUTH_IMPLEMENTATION.md)

### Testing
- [AUTOMATED_TESTING.md](testing/AUTOMATED_TESTING.md)
- [MANUAL_TESTING_CHECKLIST.md](testing/MANUAL_TESTING_CHECKLIST.md)

### Planning
- [FUTURE_VISION_AND_ROADMAP.md](planning/FUTURE_VISION_AND_ROADMAP.md)
- [ROADMAP.md](planning/ROADMAP.md)

## 🔍 Finding Documentation

**By Topic:**
- Architecture → `core/`
- How-to guides → `guides/`
- Feature docs → `features/[feature-name]/`
- Implementation → `implementation/`
- Testing → `testing/`
- Planning → `planning/`
- Bug fixes → `fixes/` (archive after 6 months)

**By Purpose:**
- Understanding system → `core/`
- Getting started → `guides/`
- Working on feature → `features/[feature-name]/`
- Implementing → `implementation/`
- Testing → `testing/`
```

---

## 🎯 Benefits for LLMs

### Before (Flat Structure)
- ❌ 107 files in one folder
- ❌ Hard to find relevant docs
- ❌ No clear categorization
- ❌ Overwhelming

### After (Organized Structure)
- ✅ Clear categories
- ✅ Easy to find relevant docs
- ✅ Logical grouping
- ✅ README.md as index
- ✅ Easier to maintain

### LLM Benefits
1. **Faster Context Finding:** LLM can go to `features/ranking-rounds/` instead of scanning 107 files
2. **Better Understanding:** Clear categorization helps LLM understand doc purpose
3. **Less Overwhelming:** Organized structure reduces cognitive load
4. **Easier Maintenance:** Clear rules for where new docs go

---

## 🔄 Maintenance Rules

### When Adding New Docs

**Ask:**
1. What category does this belong to?
2. Is it feature-specific? → `features/[feature-name]/`
3. Is it a guide? → `guides/`
4. Is it implementation? → `implementation/`
5. Is it a fix? → `fixes/` (archive after 6 months)

### Quarterly Cleanup

**Every 3 months:**
1. Review `fixes/` folder - archive old fixes (>6 months)
2. Review `analysis/` folder - archive completed analyses
3. Update `docs/README.md` index
4. Consolidate duplicate docs

### Archive Rules

**Move to `archive/` when:**
- ✅ Fix is >6 months old
- ✅ Phase is completed
- ✅ Feature is deprecated
- ✅ Doc is superseded by newer version

---

## 📋 Quick Reference

### Where Does This Doc Go?

| Doc Type | Location | Example |
|----------|----------|---------|
| Master reference | `core/` | APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md |
| How-to guide | `guides/` | LLM_ONBOARDING_BEST_PRACTICES.md |
| Feature doc | `features/[feature]/` | RANKING_ROUND_TUTORIAL.md |
| Implementation plan | `implementation/` | PHASE2_AUTH_IMPLEMENTATION.md |
| Test plan | `testing/` | AUTOMATED_TESTING.md |
| Roadmap | `planning/` | FUTURE_VISION_AND_ROADMAP.md |
| Bug fix | `fixes/` | KEYPAD_FIX_SUMMARY.md |
| Analysis | `analysis/` | EVENT_TRACKING_DETAILS_ENHANCEMENT_EVALUATION.md |

---

## ✅ Success Criteria

**You know the organization is working when:**

- ✅ LLM can find relevant docs quickly
- ✅ New docs have clear place to go
- ✅ `docs/README.md` is up-to-date
- ✅ No more than 20 files in any category
- ✅ Fixes are archived after 6 months
- ✅ Easy to maintain

---

## 🚀 Next Steps

1. **Review this guide** - Does the structure make sense?
2. **Create folders** - Run Phase 1 commands
3. **Move files gradually** - Start with core, then guides
4. **Create README.md** - Use template above
5. **Update links** - Update any broken links in docs
6. **Test with LLM** - See if it can find docs easier

---

## 📚 Related Documentation

- **[DOCUMENTATION_ORGANIZATION_GUIDE.md](DOCUMENTATION_ORGANIZATION_GUIDE.md)** - Root vs docs/ organization
- **[LLM_ONBOARDING_BEST_PRACTICES.md](guides/LLM_ONBOARDING_BEST_PRACTICES.md)** - LLM onboarding guide

