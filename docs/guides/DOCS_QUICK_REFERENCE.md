# Docs Folder Quick Reference

**Purpose:** Quick lookup for where docs should go  
**Last Updated:** December 2025

---

## 🎯 Where Does This Doc Go?

### Decision Tree

```
Is this essential system reference?
├─ YES → core/
└─ NO → Continue...

Is this a how-to guide or best practice?
├─ YES → guides/
└─ NO → Continue...

Is this feature-specific?
├─ YES → features/[feature-name]/
└─ NO → Continue...

Is this an implementation plan?
├─ YES → implementation/
└─ NO → Continue...

Is this a test plan?
├─ YES → testing/
└─ NO → Continue...

Is this a roadmap or future vision?
├─ YES → planning/
└─ NO → Continue...

Is this a bug fix or resolution?
├─ YES → fixes/ (archive after 6 months)
└─ NO → Continue...

Is this an analysis or evaluation?
└─ YES → analysis/
```

---

## 📋 Quick Lookup Table

| Doc Type | Location | Examples |
|----------|----------|----------|
| **Master Reference** | `core/` | APP_ARCHITECTURE, BALE_GROUP_SCORING_WORKFLOW |
| **How-to Guide** | `guides/` | LLM_ONBOARDING, SESSION_WRAP_UP |
| **Feature Doc** | `features/[feature]/` | RANKING_ROUND_TUTORIAL, ARCHER_SCORING_WORKFLOW |
| **Implementation Plan** | `implementation/` | PHASE2_AUTH_IMPLEMENTATION, TAILWIND_MIGRATION |
| **Test Plan** | `testing/` | AUTOMATED_TESTING, MANUAL_TESTING_CHECKLIST |
| **Roadmap** | `planning/` | FUTURE_VISION, ROADMAP |
| **Bug Fix** | `fixes/` | KEYPAD_FIX_SUMMARY, ARCHER_SELECTION_FIX |
| **Analysis** | `analysis/` | EVENT_TRACKING_EVALUATION, TABLE_WIDTH_IMPACT |

---

## 🔍 Common Patterns

### Naming Patterns

**Core Docs:**
- `APP_ARCHITECTURE_*.md`
- `BALE_GROUP_*.md`
- `AUTHENTICATION_*.md`
- `OAS_RULES.md`

**Feature Docs:**
- `RANKING_ROUND_*.md` → `features/ranking-rounds/`
- `*SOLO*.md` → `features/solo-matches/`
- `*TEAM*.md` → `features/team-matches/`
- `*BRACKET*.md` → `features/brackets/`
- `*EVENT_DASHBOARD*.md` → `features/event-dashboard/`

**Implementation:**
- `*IMPLEMENTATION*.md` → `implementation/`
- `*MIGRATION*.md` → `implementation/`
- `PHASE*_*.md` → `implementation/` (if implementation plan)

**Fixes:**
- `*FIX*.md` → `fixes/`
- `*BUG*.md` → `fixes/`
- `*DEBUG*.md` → `fixes/`
- `*SUMMARY*.md` → `fixes/` (if fix summary)

**Analysis:**
- `*ANALYSIS*.md` → `analysis/`
- `*EVALUATION*.md` → `analysis/`
- `*IMPACT*.md` → `analysis/`

---

## ✅ Checklist: Adding New Doc

- [ ] Determine category using decision tree
- [ ] Check if similar doc exists (consolidate if needed)
- [ ] Place in correct folder
- [ ] Update `docs/README.md` index
- [ ] Follow naming conventions
- [ ] Add to relevant section in README

---

## 🗑️ Archive Rules

**Move to `archive/` when:**
- ✅ Fix is >6 months old
- ✅ Phase is completed
- ✅ Feature is deprecated
- ✅ Doc is superseded by newer version

**Archive locations:**
- `archive/fixes/` - Old bug fixes
- `archive/completed-phases/` - Completed phase docs
- `archive/deprecated/` - Deprecated features

---

## 📚 Full Guide

For complete organization guide, see:
- **[DOCS_FOLDER_ORGANIZATION.md](DOCS_FOLDER_ORGANIZATION.md)** - Complete guide
- **[README.md](README.md)** - Documentation index

