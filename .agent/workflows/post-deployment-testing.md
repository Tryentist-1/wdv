---
description: Comprehensive testing workflow after deployment to verify production functionality
---

# Post-Deployment Testing Workflow

This workflow guides testing after deploying changes to production to ensure everything works correctly.

## Quick Start

```bash
# Run automated post-deployment tests
npm run test:workflow:post

# Or run the script directly
./tests/scripts/test-workflow.sh post-deployment
```

---

## Automated Testing Steps

### 1. Production E2E Tests

Run Playwright tests against production:

```bash
npm run test:remote
```

**Expected:** All production E2E tests pass

**What it tests:**
- Critical user journeys
- Cross-browser compatibility
- Mobile-first functionality

---

### 2. Production API Health Check

Verify API endpoints are working:

```bash
./test_api.sh
```

**Or manually check:**
- https://archery.tryentist.com/api/v1/health → `{"ok":true}`

**What it tests:**
- API server is responding
- Database connectivity
- Authentication endpoints

---

### 3. Production Component Library Verification

**URL:** https://archery.tryentist.com/tests/components/style-guide.html (if deployed; tests/ is excluded from deploy by default)

**Verify:**
- [ ] All components load correctly
- [ ] Styling is consistent (no broken CSS)
- [ ] Mobile responsiveness works
- [ ] Dark mode functions properly
- [ ] Touch targets are properly sized (44px minimum)

---

### 4. Cache Purge

If Cloudflare cache purge script is available:

```bash
./tests/scripts/test_cloudflare.sh
```

**Or manually purge cache via Cloudflare dashboard**

**Why:** Ensures new code/assets are served immediately

---

### 5. Generate Test Summary

```bash
./tests/scripts/test-summary.sh
```

**Note:** Run from project root.

**What it does:** Generates a summary report of all test results

---

## Manual Verification Steps

### 1. API Sanity Check

- [ ] https://archery.tryentist.com/api/v1/health → `{"ok":true}`
- [ ] https://archery.tryentist.com/api/test_harness.html → Opens correctly

**If health check fails:**
- Check server logs
- Verify database connection
- Check for PHP errors

---

### 2. Frontend Page Load Checks

**Critical Pages:**
- [ ] https://archery.tryentist.com/index.html → Loads correctly
- [ ] https://archery.tryentist.com/coach.html → Loads, can log in
- [ ] https://archery.tryentist.com/archer_list.html → Loads archer list
- [ ] https://archery.tryentist.com/ranking_round_300.html → Loads, modal shows
- [ ] https://archery.tryentist.com/results.html → Loads (even without event param)

**Check for:**
- No JavaScript console errors
- No broken images/icons
- CSS loads correctly
- Mobile layout works

---

### 3. Feature-Specific Testing

Based on what was deployed, test the specific features:

#### For USA Archery Fields (Current Feature)
- [ ] Open archer_list.html
- [ ] Click to edit an archer (coach mode required)
- [ ] Verify Extended Profile section is visible (amber highlighted)
- [ ] Verify all 12 new fields appear:
  - [ ] Membership Valid From
  - [ ] Membership Type
  - [ ] Club State
  - [ ] NFAA Member #
  - [ ] Address Line 3
  - [ ] Address Country
  - [ ] Disability List
  - [ ] Military Service
  - [ ] Introduction Source (with conditional "Other" field)
  - [ ] School Type
  - [ ] Full School Name
- [ ] Fill in some test data and save
- [ ] Verify data persists after page refresh
- [ ] Test USA Archery export button (coach-only)
- [ ] Test USA Archery import button (coach-only)

#### For Database Migrations
- [ ] Verify new columns exist in database
- [ ] Test that existing data is not affected
- [ ] Verify nullable columns work correctly

#### For API Changes
- [ ] Test affected endpoints with API test harness
- [ ] Verify request/response formats are correct
- [ ] Test error handling

---

### 4. Full Workflow Test

Test the complete user journey:

1. **Coach Workflow:**
   - [ ] Coach creates event with entry code
   - [ ] Coach adds archers to event
   - [ ] Coach generates QR code
   - [ ] QR code URL works correctly

2. **Archer Workflow:**
   - [ ] Open QR URL in incognito/different browser
   - [ ] Pre-assigned bale list shown
   - [ ] Click "Start Scoring" on Bale 1
   - [ ] Enter scores: 10, 9, 8
   - [ ] Click "Sync End"
   - [ ] Score syncs successfully

3. **Results View:**
   - [ ] Open `results.html?event={id}`
   - [ ] Score shows correctly (27)
   - [ ] Leaderboard updates
   - [ ] No console errors

---

### 5. Mobile Testing ⚠️ **CRITICAL**

**99% of users are on mobile - always test on real device:**

- [ ] Test on iPhone (Safari) - primary
- [ ] Test on Android (Chrome) - secondary
- [ ] Touch targets work (44px minimum)
- [ ] Scrolling works correctly
- [ ] Modals display properly
- [ ] Buttons are tappable
- [ ] No layout issues on small screens
- [ ] Forms are usable on mobile

---

### 6. Cross-Browser Testing

Test on different browsers:

- [ ] Chrome (Desktop)
- [ ] Safari (Desktop)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

### 7. Regression Testing

Verify existing features still work:

- [ ] Core scoring workflow
- [ ] Live sync functionality
- [ ] Offline queue behavior
- [ ] Coach verification flow
- [ ] Archer profile editing
- [ ] Event management
- [ ] Results display

---

## Monitoring & Alerts

### Watch for First 24 Hours

- [ ] Monitor for user reports of issues
- [ ] Check browser console for errors (on client devices)
- [ ] Monitor API error logs
- [ ] Check for 401 Unauthorized responses
- [ ] Watch for failed POST requests
- [ ] Verify offline queue is flushing correctly

### Common Issues to Watch

| Issue | Cause | Fix |
|-------|-------|-----|
| 401 on archer sync | Entry code not in localStorage | Coach needs to regenerate QR, or manually set in console |
| Scores don't sync | Live toggle off | Enable in scoring view |
| Leaderboard empty | Event ID mismatch | Verify URL param matches event.id |
| Double scores | Multiple devices on same bale | Coordinate which device syncs |
| New fields not showing | Database migration not run | Run migration script on production |
| Export fails | Function not available | Check browser console for errors |

---

## Success Criteria

✅ **Deployment Successful If:**
- Health endpoint responds 200
- All automated tests pass
- Manual verification passes
- No console errors on key pages
- Feature works end-to-end
- Mobile testing successful
- No regressions found

---

## Rollback Plan

If critical issues occur during post-deployment testing:

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
git checkout feature/your-branch
```

### Emergency Offline Mode

- Disable Live Updates via coach console
- Users continue with offline functionality
- Manually import CSV exports post-event

---

## Documentation Updates

After successful deployment:

- [ ] Update release notes if significant changes
- [ ] Document any new features in relevant docs
- [ ] Update user-facing documentation if needed
- [ ] Archive any related bug docs if issues were fixed

---

## Related Workflows

- **Bug Fixes:** [Bug Fix Workflow](bug-workflow.md) - Complete bug fix process
- **Development Setup:** [Start Development Servers](start-dev-servers.md) - Local environment setup
- **Coach Testing:** [Coach Login Start](coach-login-start.md) - Testing coach features

## References

- **Canonical:** [docs/testing/TESTING_GUIDE.md](../docs/testing/TESTING_GUIDE.md)
- **Deployment Checklist:** `DEPLOYMENT_CHECKLIST.md`
- **Manual Testing:** `docs/testing/MANUAL_TESTING_CHECKLIST.md`
- **Automated Tests:** `tests/README.md`
- **Test Workflow Script:** `tests/scripts/test-workflow.sh`

---

## Notes

- **Always test on mobile** - 99% of users are on phones
- **Test on actual devices** - Emulators can miss issues
- **Check console errors** - Many issues show up there first
- **Monitor for 24 hours** - Some issues only appear under load
- **Have rollback ready** - Know how to revert if needed

