---
description: Complete workflow for reporting, analyzing, fixing, and deploying bug fixes
---

# Bug Fix Workflow

This workflow guides the process from bug discovery through deployment and verification.

## 1. Bug Discovery & Initial Assessment

### When a Bug is Found

**Check if it's already documented:**
- Search `docs/bugs/` for similar issues
- Check `docs/fixes/` for related fixes
- Review `01-SESSION_QUICK_START.md` current issues section
- Check recent release notes for known issues

**Quick Start:** If you need to document a bug quickly, see [How to Log a Bug](log-bug.md) for a minimal template.

**Quick Triage:**
- **Critical:** Blocks core functionality, data loss, security issue
- **High:** Major feature broken, affects many users
- **Medium:** Minor feature broken, workaround exists
- **Low:** Cosmetic, edge case, rarely encountered

### Create Branch

```bash
# Always work in a branch for bug fixes
git checkout -b fix/bug-description

# Example: fix/modal-button-dark-mode
# Example: fix/resume-round-filtering
```

## 2. Bug Documentation

### Create Bug Analysis Document

**Location:** `docs/bugs/[MODULE]_[BUG_DESCRIPTION].md`

**Template Structure:**

```markdown
# [Module] Bug: [Short Description]

**Date:** YYYY-MM-DD
**Page/Module:** [specific file or feature]
**Severity:** Critical | High | Medium | Low
**Status:** 🔴 Open | 🟡 In Progress | ✅ Fixed

---

## 🐛 Bug Description

Clear description of what's wrong.

**User Impact:**
- What users experience
- How it affects their workflow
- Mobile vs desktop impact (99% mobile users)

---

## 🔍 Steps to Reproduce

1. Step 1
2. Step 2
3. Step 3
4. Observe: [what happens]
5. Expected: [what should happen]

---

## 🔍 Root Cause Analysis

### The Problem

Technical explanation of why it's happening.

### Code Flow

```javascript
// Relevant code snippets showing the issue
```

### Why This Happens

Explanation of underlying cause.

---

## ✅ Solution

### Fix Strategy

Approach to fixing the issue.

### Implementation

**File:** `path/to/file.js`
**Location:** Line numbers or function names

**Changes:**
- What was changed
- Why the change fixes it

### Code Changes

Before/after code comparison or explanation.

---

## 🧪 Testing Plan

### Test Cases

1. **Primary Fix Test**
   - Steps to verify fix
   - Expected result

2. **Regression Tests**
   - Related features that could break
   - Edge cases to check

3. **Mobile Testing** ⚠️ **CRITICAL**
   - Test on actual mobile device (iPhone SE minimum)
   - Touch interactions
   - Screen size considerations

### Test Devices

- iPhone (Safari) - Primary
- Android (Chrome) - Secondary
- Desktop - Regression check

---

## 📋 Implementation Checklist

- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Code tested locally
- [ ] Mobile device tested
- [ ] Regression tests passed
- [ ] Documentation updated
- [ ] Ready for deployment

---

## 🔗 Related Issues

- Links to similar bugs
- Related fixes
- Dependencies

---

**Status:** [Current status]
**Priority:** [Priority level]
**Fix Applied:** [Date and summary]
```

## 3. Root Cause Analysis

### Investigation Steps

1. **Reproduce the bug consistently**
   - Document exact steps
   - Note environment (mobile/desktop, browser, OS)
   - Capture console errors if any

2. **Identify affected code**
   - Use browser dev tools to trace execution
   - Check network requests (API issues)
   - Review recent changes (git log, git blame)

3. **Understand the root cause**
   - Why does this happen?
   - Is it a recent regression?
   - Is it a design flaw or implementation bug?

### Tools for Investigation

- **Browser Dev Tools:**
  - Console for errors
  - Network tab for API issues
  - Elements inspector for DOM issues
  - Application tab for localStorage/cookies

- **Git:**
  ```bash
  # Find when bug was introduced
  git log --all --grep="related keyword"
  git blame path/to/file.js
  
  # Check recent changes
  git diff HEAD~5 path/to/file.js
  ```

- **API Test Harness:**
  - Use `api/test_harness.html` for API-related bugs
  - Isolate backend vs frontend issues

## 4. Fix Implementation

### Before Coding

- [ ] Understand root cause fully
- [ ] Have a clear fix strategy
- [ ] Consider edge cases and regressions
- [ ] Review similar code patterns in codebase

### Coding Standards

Follow project rules:
- ✅ Mobile-first design
- ✅ Tailwind CSS only (no custom CSS)
- ✅ JSDoc comments for functions
- ✅ UUIDs for IDs (never sequential)
- ✅ Database as source of truth
- ✅ Coach verification workflow preserved

### Implementation Checklist

```bash
# 1. Make your changes
# Edit files as needed

# 2. Test locally
npm run serve
# Test the fix in browser

# 3. Run automated tests
npm run test:setup-sections
npm run test:ranking-round
npm run test:api:all

# 4. Manual mobile test (CRITICAL)
# Test on actual iPhone/Android device

# 5. Check for console errors
# Open browser console, verify no new errors

# 6. Test edge cases
# Related features, error states, boundary conditions
```

## 5. Testing & Verification

### Required Tests

#### 1. Automated Tests

```bash
# Run relevant test suites
npm run test:setup-sections      # For ranking round bugs
npm run test:ranking-round       # For ranking round bugs
npm run test:api:all            # For API bugs

# All tests should pass
```

#### 2. Manual Smoke Test

**For Frontend Bugs:**
- [ ] Reproduce original bug → Should be fixed
- [ ] Test related workflows → Should still work
- [ ] Test on mobile device (iPhone SE minimum)
- [ ] Test in dark mode and light mode
- [ ] Test offline behavior (if applicable)
- [ ] Check browser console for errors

**For API Bugs:**
- [ ] Use `api/test_harness.html` to verify
- [ ] Test all related endpoints
- [ ] Test error cases (invalid input, missing data)
- [ ] Verify database changes (if any)

#### 3. Regression Testing

**Check these don't break:**
- Core scoring workflow
- Live sync functionality
- Offline queue behavior
- Coach verification flow
- Mobile interactions

#### 4. Mobile Testing ⚠️ **CRITICAL**

**99% of users are on mobile - always test on real device:**

- [ ] Test on iPhone (Safari) - primary
- [ ] Test on Android (Chrome) - secondary
- [ ] Touch targets work (44px minimum)
- [ ] Scrolling works correctly
- [ ] Modals display properly
- [ ] Buttons are tappable
- [ ] No layout issues on small screens

## 6. Code Review & Documentation

### Update Bug Document

```markdown
**Status:** ✅ Fixed
**Fix Applied:** YYYY-MM-DD
**Files Changed:**
- `path/to/file1.js` - Description of changes
- `path/to/file2.php` - Description of changes
```

### Update Session Notes (if applicable)

If working in `01-SESSION_QUICK_START.md`:
- Mark bug as fixed
- Note what was changed
- Update current status

### Commit Changes

```bash
# Commit with clear message
git add .
git commit -m "Fix: [Clear description of bug and fix]

- What was wrong
- How it was fixed
- Impact/scope of fix

Fixes: [reference to bug doc or issue]"
```

**Good commit message example:**
```
Fix: Modal buttons invisible in dark mode

- Changed navigation buttons from text-white/80 to text-white
- Added border border-white/30 for visual definition
- Improved hover states with hover:bg-white/30

Fixes: docs/bugs/MODAL_BUTTON_DARK_MODE.md
```

## 7. Pre-Deployment Checklist

Before deploying, verify:

- [ ] Bug is fixed and tested
- [ ] All automated tests pass
- [ ] Manual testing completed
- [ ] Mobile testing completed (actual device)
- [ ] No console errors introduced
- [ ] No regressions found
- [ ] Code committed to git
- [ ] Bug documentation updated
- [ ] Ready for deployment

## 8. Deployment

### Deploy to Production

```bash
# Fast deploy (no local backup)
npm run deploy:fast
```

**What gets deployed:**
- Modified files
- Cloudflare cache purged automatically

### Post-Deployment Verification

**Immediate Checks:**

1. **API Health:**
   - [ ] https://tryentist.com/wdv/api/v1/health → `{"ok":true}`

2. **Frontend Check:**
   - [ ] Relevant page loads correctly
   - [ ] Bug is fixed in production
   - [ ] No console errors

3. **Full Workflow Test:**
   - [ ] Test the complete workflow that was broken
   - [ ] Verify fix works end-to-end
   - [ ] Check mobile device (if possible)

4. **Regression Check:**
   - [ ] Related features still work
   - [ ] No new issues introduced

### Monitor Production

**Watch for:**
- New console errors
- User reports of issues
- API errors in server logs
- Unexpected behavior

**First 24 hours:**
- Check production regularly
- Monitor for related issues
- Be ready to rollback if needed

## 9. Post-Deployment

### Update Documentation

- [ ] Mark bug as fixed in bug document
- [ ] Update release notes if significant
- [ ] Update `01-SESSION_QUICK_START.md` if needed
- [ ] Archive bug doc to `docs/archive/bugs/` if long-term

### Monitor & Follow-up

**After 48 hours:**
- [ ] Verify no user reports of regression
- [ ] Confirm fix is working in production
- [ ] Document any lessons learned

## 10. Rollback Plan (If Needed)

If the fix causes issues:

### Quick Fix Available

```bash
# Fix code locally
# Test with npm run test:setup-sections
npm run deploy:fast
# Verify fix on production
```

### Need Full Rollback

```bash
# Find last good commit
git log --oneline -10

# Deploy previous version
git checkout {commit-hash}
npm run deploy:fast

# Then return to current branch
git checkout fix/bug-description
```

### Emergency: Disable Feature

If a feature is causing critical issues:
- Disable via coach console (if applicable)
- Add feature flag in code
- Deploy quick disable fix

## Bug Severity Guidelines

### Critical 🔴

**Deploy immediately or within 24 hours:**
- Data loss or corruption
- Security vulnerabilities
- Complete feature breakage blocking users
- Mobile app completely unusable

**Process:** Fix → Test → Deploy ASAP

### High 🟠

**Deploy within 1-3 days:**
- Major feature broken
- Affects many users
- Significant UX degradation
- Workaround exists but difficult

**Process:** Standard workflow, prioritize over features

### Medium 🟡

**Deploy within 1 week:**
- Minor feature broken
- Workaround exists
- Affects some users
- Cosmetic but noticeable

**Process:** Standard workflow, plan into sprint

### Low 🟢

**Deploy when convenient:**
- Edge cases
- Cosmetic only
- Rarely encountered
- Easy workaround

**Process:** Batch with other fixes or feature work

## Common Bug Patterns

### Mobile-Specific Bugs

**Common Issues:**
- Touch events not working
- Buttons too small (less than 44px)
- Canvas capturing all touches (p5.js)
- Scrolling issues
- Modal display problems

**Fix Approach:**
1. Test on actual device first
2. Use `elementFromPoint()` for touch detection
3. Check touch target sizes
4. Verify `pointer-events` and `z-index`

### API Bugs

**Common Issues:**
- 401 Unauthorized errors
- Missing data in responses
- Incorrect filtering
- Race conditions in sync

**Fix Approach:**
1. Use `api/test_harness.html` to isolate
2. Check `api/db.php` for auth issues
3. Verify SQL queries
4. Test with different user roles

### State Management Bugs

**Common Issues:**
- State pollution between rounds
- localStorage not syncing
- Race conditions
- Stale data

**Fix Approach:**
1. Clear state when needed
2. Verify database is source of truth
3. Check offline queue behavior
4. Use proper state locks

## Notes

- **Always test on mobile** - 99% of users are on phones
- **Database is source of truth** - localStorage is cache only
- **Coach verification is sacred** - Never bypass verification workflow
- **Use UUIDs for IDs** - Never sequential numbers
- **Follow existing patterns** - Check Ranking Round 300 for reference

## Related Workflows

- **Logging Bugs:** [How to Log a Bug](log-bug.md) - Quick reference for bug documentation
- **Post-Deployment:** [Post-Deployment Testing](post-deployment-testing.md) - Testing after deploying fixes
- **Development Setup:** [Start Development Servers](start-dev-servers.md) - Local environment setup

## References

- Deployment: `DEPLOYMENT_CHECKLIST.md`
- Testing: `docs/testing/AUTOMATED_TESTING.md`
- Git workflow: `docs/guides/VIBE_CODING_GIT_WORKFLOW.md`
- Bug example: `docs/bugs/PRACTICE_PAGE_MOBILE_FREEZE_ANALYSIS.md`
