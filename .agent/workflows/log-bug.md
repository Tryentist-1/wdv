---
description: Quick reference for logging a new bug - what to include and how to document it
---

# How to Log a Bug

Quick checklist for reporting bugs in the WDV project.

## Quick Checklist

When you discover a bug, document these essentials:

- [ ] **What's broken?** (Clear description)
- [ ] **Where?** (Which page/module/file)
- [ ] **How to reproduce?** (Exact steps)
- [ ] **What should happen?** (Expected behavior)
- [ ] **What actually happens?** (Actual behavior)
- [ ] **Severity?** (Critical/High/Medium/Low)
- [ ] **Screenshots/console errors?** (If applicable)
- [ ] **Mobile or desktop?** (99% users are mobile)
- [ ] **Browser/device?** (iPhone, Android, Chrome, Safari)

## Creating the Bug Document

### Step 1: Create Bug File

**Location:** `docs/bugs/[MODULE]_[SHORT_DESCRIPTION].md`

**Naming examples:**
- `ranking_round_resume_filtering_bug.md`
- `modal_button_dark_mode_bug.md`
- `api_entry_code_401_bug.md`
- `archer_selector_mobile_touch_bug.md`

### Step 2: Use This Template

```markdown
# [Module] Bug: [Short Description]

**Date:** YYYY-MM-DD
**Page/Module:** [specific file or feature]
**Severity:** Critical | High | Medium | Low
**Status:** 🔴 Open

---

## 🐛 Bug Description

**What's broken:**
[1-2 sentence summary of the problem]

**User Impact:**
- [How this affects users]
- [What they can't do because of this]
- [Mobile vs desktop impact]

---

## 🔍 Steps to Reproduce

1. [First step]
2. [Second step]
3. [Third step]
4. [Observe:] [What happens]
5. [Expected:] [What should happen]

**Environment:**
- Device: [iPhone 12, Android, Desktop]
- Browser: [Safari, Chrome, Firefox]
- Page: [URL or filename]

---

## 📸 Evidence

**Console Errors:**
```
[Paste any console errors here]
```

**Network Errors:**
- [API endpoint that fails]
- [Error code: 401, 500, etc.]

**Screenshots:**
- [Path to screenshot if available]

---

## 🔍 Initial Investigation

**What I've checked:**
- [ ] Console for JavaScript errors
- [ ] Network tab for API failures
- [ ] Tested on mobile device
- [ ] Tested on desktop (if relevant)
- [ ] Checked related features

**Suspected cause:**
[If you have a theory, note it here. Otherwise leave blank]

---

## 🔗 Related

- [Link to similar bugs if any]
- [Related features that might be affected]
- [Recent changes that might have caused this]

---

**Status:** 🔴 Open
**Priority:** [Critical/High/Medium/Low]
**Reported by:** [Your name/initials]
```

## Minimal Bug Report (Quick Version)

If you're in a hurry, include at minimum:

```markdown
# [Module] Bug: [Description]

**Date:** YYYY-MM-DD
**Severity:** Critical/High/Medium/Low
**Status:** 🔴 Open

## What's broken?
[Brief description]

## How to reproduce?
1. [Step]
2. [Step]
3. [Step]
4. See: [what happens]

## Expected?
[What should happen]

## Actual?
[What actually happens]
```

## Severity Guide

### 🔴 Critical
- **Examples:**
  - Can't score rounds at all
  - Data loss or corruption
  - Security vulnerability
  - Complete feature breakage
  - Mobile app frozen/unusable

- **Timeline:** Fix ASAP (within 24 hours)

### 🟠 High
- **Examples:**
  - Major feature broken
  - Affects many users
  - Significant UX problem
  - Workaround exists but difficult

- **Timeline:** Fix within 1-3 days

### 🟡 Medium
- **Examples:**
  - Minor feature broken
  - Workaround exists
  - Cosmetic but noticeable
  - Affects some users

- **Timeline:** Fix within 1 week

### 🟢 Low
- **Examples:**
  - Edge case
  - Cosmetic only
  - Rarely encountered
  - Easy workaround

- **Timeline:** Fix when convenient

## Mobile-First Checklist

Since 99% of users are on mobile, always check:

- [ ] **Tested on actual mobile device?** (Not just browser dev tools)
- [ ] **Which device?** (iPhone SE, iPhone 12, Android, etc.)
- [ ] **Touch targets work?** (44px minimum)
- [ ] **Buttons tappable?**
- [ ] **Scrolling works?**
- [ ] **Layout correct on small screen?**
- [ ] **Modals display properly?**
- [ ] **Dark mode tested?** (if applicable)

## Console Error Checklist

If there are console errors, capture:

- [ ] **Error message** (full text)
- [ ] **Error stack trace** (which file/line)
- [ ] **When it happens** (on page load, after action, etc.)
- [ ] **Network errors** (failed API calls, 401, 500, etc.)
- [ ] **Warnings** (less critical but note them)

## API Bug Checklist

For API-related bugs:

- [ ] **Which endpoint?** (GET /v1/archers, POST /v1/rounds, etc.)
- [ ] **Request method?** (GET, POST, PUT, DELETE)
- [ ] **Request payload?** (if POST/PUT)
- [ ] **Response status code?** (200, 401, 500, etc.)
- [ ] **Response body?** (error message or data)
- [ ] **Authentication?** (entry code, coach API key, etc.)

## Common Bug Locations

### Frontend Bugs
- `js/ranking_round_300.js` - Ranking round logic
- `js/archer_module.js` - Archer management
- `js/live_updates.js` - API sync and offline queue
- `js/coach.js` - Coach console
- `*.html` files - Page-specific issues

### Backend Bugs
- `api/index.php` - API routing and endpoints
- `api/db.php` - Database queries and auth
- `api/sql/*.sql` - Database schema/migrations

### Integration Bugs
- Live sync between devices
- Offline queue behavior
- Event code authentication
- Coach verification workflow

## After Logging

1. **Create branch for fix** (if you're fixing it):
   ```bash
   git checkout -b fix/bug-description
   ```

2. **Follow the full bug workflow:**
   - See [Bug Fix Workflow](bug-workflow.md) for complete process
   - Document root cause
   - Implement fix
   - Test thoroughly
   - Deploy using [Post-Deployment Testing](post-deployment-testing.md)

3. **Update bug status:**
   - 🔴 Open → 🟡 In Progress → ✅ Fixed

## Examples from Project

See these for reference:
- `docs/bugs/PRACTICE_PAGE_MOBILE_FREEZE_ANALYSIS.md` - Detailed bug analysis
- `docs/fixes/ARCHER_SELECTION_DEBUG.md` - Debugging process
- `docs/fixes/FRESH_ROUND_TESTING_BUGS.md` - Multiple bugs in one doc

---

**Quick Start:** Copy the minimal template above, fill in the essentials, save to `docs/bugs/[name].md`


