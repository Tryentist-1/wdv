# Automated Browser Testing with Playwright

## Overview

This project uses **Playwright** for automated browser testing to ensure the Ranking Round application works correctly across different devices and browsers before and after deployment.

---

## 🎯 **Why Automated Testing?**

- **Catches bugs early** - Find issues before deploying to production
- **Saves time** - No need for manual testing on every change
- **Multi-browser** - Tests on Chromium, WebKit (Safari), and iPhone 13 automatically
- **Confidence** - Deploy knowing what works and what doesn't

---

## 📋 **Test Coverage**

### Remote Tests (Production)
Tests the live site: `https://tryentist.com/wdv`

**Event Modal Tests:**
- ✅ Shows modal on fresh start
- ✅ Loads active events in "Select Event" tab
- ✅ Verifies entry codes (e.g., "tuesday")
- ✅ Handles QR code URL parameters
- ✅ Shows empty state when canceling with no event

**Bale Selection Tests:**
- ✅ Shows sort button (Bale ↔ Name)
- ✅ Toggles sort mode correctly
- ✅ Shows bale groups with archers
- ✅ Displays bale and target assignments
- 🔄 (Planned) Manual roster selection, bale grid, and Live badge state on `ranking_round_300.html`
- 🔄 (Planned) Offline → online recovery for pending Live Updates queue

**Browser Coverage:**
- Chromium (Desktop)
- WebKit/Safari (Desktop)
- iPhone 13 (Mobile)

---

## 🚀 **How to Run Tests**

### **Before Deploying** (Local - Not Working Yet)
```bash
npm run test:local
```
> ⚠️ **Note**: Local testing requires disabling authentication on localhost:8000. Currently skipped.

### **After Deploying** (Remote - Production)
```bash
npm test
```
This runs tests against `https://tryentist.com/wdv` and is the **primary testing mode**.

### **Interactive UI Mode**
```bash
npm run test:ui
```
Opens a visual interface where you can:
- See tests in real-time
- Click through test steps
- Debug failures
- Take screenshots

### **Headed Mode** (See Browser)
```bash
npm run test:headed
```
Runs tests with visible browser windows (slower but great for debugging).

---

## 📊 **Understanding Test Results**

### Successful Run
```
Running 24 tests using 4 workers
  24 passed (23.7s)

To open last HTML report run:
  npx playwright show-report
```

### Failed Run
```
Running 24 tests using 4 workers
  1) [chromium] › tests/ranking_round.spec.js:38:3 › should verify entry code "tuesday"
     Error: expect(locator).not.toBeVisible()
     Expected: not visible
     Received: visible

  21 failed
  3 passed (59.3s)
```

### View Detailed Report
```bash
npx playwright show-report
```
Opens an HTML report in your browser with:
- Screenshots of failures
- Step-by-step trace
- Error details
- Timing information

---

## 📁 **Test Files**

```
tests/
├── ranking_round.spec.js        # Remote tests (production)
├── ranking_round.local.spec.js  # Local tests (development)
├── README.md                    # Quick reference guide
└── index.html                   # Manual QUnit tests (legacy)

playwright.config.js              # Remote test configuration
playwright.config.local.js        # Local test configuration
```

> **Coming soon:** Add `tests/ranking_round_300.manual.spec.js` targeting the manual roster workflow and Live badge states once the Playwright fixtures are in place.

---

## 🐛 **Recent Bugs Found by Tests**

### Bug 1: Entry Code Verification Broken
**Test**: `should verify entry code "tuesday"`
**Issue**: API didn't return `entry_code` to public users
**Fix**: Loop through events and call `/events/verify` API
**Status**: ✅ Fixed

### Bug 2: Score Colors Wrong
**Test**: Manual testing on phone
**Issue**: 9 was red (should be gold), 5 was black (should be blue)
**Fix**: Corrected `getScoreColor()` function mappings
**Status**: ✅ Fixed

### Bug 3: App "Hung" on Start Scoring
**Test**: Manual testing on phone
**Issue**: Blocking `prompt()` dialog for Live Updates passcode
**Fix**: Silently disable Live Updates on 401, no blocking dialogs
**Status**: ✅ Fixed

---

## 🔧 **Adding New Tests**

Edit `tests/ranking_round.spec.js`:

```javascript
test('should do something new', async ({ page }) => {
    await page.goto('/ranking_round_300.html');
    
    // Your test code here
    await expect(page.locator('#some-element')).toBeVisible();
    await page.click('#some-button');
    
    // Assertions
    const text = await page.locator('#result').textContent();
    expect(text).toBe('Expected Value');
});
```

---

## 📝 **Best Practices**

1. **Always run tests after making changes**
   ```bash
   npm test
   ```

2. **Run tests before deploying**
   - Catches regressions
   - Ensures QA on multiple browsers
   - Saves time debugging in production

3. **Check the HTML report for failures**
   ```bash
   npx playwright show-report
   ```

4. **Use headed mode to debug**
   ```bash
   npm run test:headed
   ```

5. **Update tests when adding features**
   - Keep test coverage up-to-date
   - Document expected behavior

---

## 🎯 **Test Workflow**

### Development Cycle
```
1. Make code changes
   ↓
2. npm test (verify remote tests still pass)
   ↓
3. Fix any failures
   ↓
4. bash DeployFTP.sh (deploy to production)
   ↓
5. npm test (verify deployed changes)
   ↓
6. Check HTML report for any issues
```

### Bug Fix Cycle
```
1. Bug reported
   ↓
2. Write test that reproduces bug (should fail)
   ↓
3. Fix the code
   ↓
4. npm test (test should now pass)
   ↓
5. Deploy
   ↓
6. npm test (verify fix in production)
```

---

## 🔄 **Continuous Testing**

**After every deployment:**
```bash
npm test
```

**What this catches:**
- Broken QR code flows
- Event modal issues
- Bale selection problems
- JavaScript errors
- API connectivity issues
- Mobile-specific bugs

---

## 📞 **Troubleshooting**

### Tests won't run
```bash
# Install Playwright browsers
npx playwright install

# Install dependencies
npm install
```

### Tests timing out
```bash
# Increase timeout in playwright.config.js
timeout: 30000  // 30 seconds
```

### Can't see what's happening
```bash
# Use headed mode
npm run test:headed

# Or use UI mode
npm run test:ui
```

### Need to debug a specific test
```bash
# Run only one test
npx playwright test -g "should verify entry code"

# Run with debug inspector
npx playwright test --debug
```

---

## 📚 **Resources**

- **Playwright Docs**: https://playwright.dev/
- **Test Configuration**: `playwright.config.js`
- **Test Files**: `tests/ranking_round.spec.js`
- **Report Location**: `playwright-report/index.html`

---

## ⚠️ **Important Reminders**

### 🔔 **REMEMBER TO RUN TESTS!**

**Before deploying:**
```bash
npm test
```

**After deploying:**
```bash
npm test
```

**When fixing a bug:**
```bash
npm test
```

**When adding a feature:**
```bash
npm test
```

**Every single time:**
```bash
npm test
```

---

## 📈 **Test History**

| Date | Tests Run | Status | Notes |
|------|-----------|--------|-------|
| 2025-10-21 | 24 | ✅ All Pass | Fixed entry code verification bug |
| 2025-10-21 | 33 | ❌ 21 Failed | Found entry code bug, score color bug |
| 2025-10-21 | 24 | ✅ All Pass | Score colors fixed, prompts removed |

---

## 🎉 **Success Metrics**

- **Test Execution Time**: ~24 seconds
- **Browsers Tested**: 3 (Chromium, WebKit, iPhone 13)
- **Test Cases**: 24
- **Code Coverage**: Event modal, bale selection, QR codes
- **Bugs Caught**: 3 major issues before user impact

---

**Last Updated**: October 21, 2025  
**Maintained By**: AI Assistant & Terry  
**Status**: ✅ Active & Working
