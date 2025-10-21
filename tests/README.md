# Automated Browser Tests

## Two Testing Modes

### 🌐 **Remote Testing** (Default)
Tests your LIVE website at `https://tryentist.com/wdv`
- Tests what users actually see
- Run AFTER deploying
- Catches caching/deployment issues

### 💻 **Local Testing** 
Tests your local files BEFORE deploying
- Run BEFORE deploying
- Catches bugs early
- Faster iteration

---

## Quick Start

### 1. Install Playwright (one-time setup)
```bash
cd /Users/terry/web-mirrors/tryentist/wdv
npm install
npx playwright install
```

### 2. Run Tests

#### Test REMOTE (after deploying)
```bash
npm test                 # Headless
npm run test:headed      # Watch tests run
npm run test:ui          # Interactive UI
```

#### Test LOCAL (before deploying)
```bash
npm run test:local       # Test local files
npm run test:local:ui    # Interactive UI (local)
```

---

## What Gets Tested

### ✅ Event Modal Tests
- Modal shows on fresh start
- Select Event tab loads events (no errors)
- Enter Code tab verifies "tuesday"
- QR code bypasses modal
- Empty state shows when no event

### ✅ Bale Selection Tests  
- Sort button toggles (Bale ↔ Name)
- Bale groups show with archers
- Bale headers are clickable

---

## Test Results

After running tests, open the HTML report:
```bash
npx playwright show-report
```

**Screenshots & Videos**: Saved to `test-results/` folder when tests fail

---

## Running on Different Devices

Tests run on:
- Desktop Chrome
- Desktop Safari  
- iPhone 13

To test specific device:
```bash
npx playwright test --project="iPhone 13"
```

---

## CI/CD Integration

Add to GitHub Actions:
```yaml
- name: Run Playwright tests
  run: |
    npm ci
    npx playwright install --with-deps
    npm test
```

---

## Manual Testing Checklist

If you prefer manual testing:

### Fresh Start
1. [ ] Open https://tryentist.com/wdv/ranking_round_300.html (incognito)
2. [ ] Modal pops up automatically
3. [ ] Both tabs visible ("Enter Code" and "Select Event")

### Select Event Tab
1. [ ] Click "Select Event" tab
2. [ ] Events list loads (no "Failed to load" error)
3. [ ] Shows "Tuesday RR1" and "Wednesday Test"
4. [ ] Click an event → modal closes, archers load

### Enter Code Tab
1. [ ] Type "tuesday" in input field
2. [ ] Click "Connect to Event"
3. [ ] Modal closes, archers load
4. [ ] Sort button appears

### QR Code Flow
1. [ ] Open: https://tryentist.com/wdv/ranking_round_300.html?event=2e43821b-7b2f-4341-87e2-f85fe0831d76&code=tuesday
2. [ ] Modal does NOT show (bypassed)
3. [ ] Archers load immediately
4. [ ] Bale list shows

### Bale Selection
1. [ ] Sort button shows "Sort by: Bale Number"
2. [ ] Click sort button → changes to "Sort by: Name"
3. [ ] Bale headers show (e.g., "Bale 8")
4. [ ] Click bale header → loads all archers for that bale
5. [ ] "Begin Scoring" button works

---

**Current Test Coverage**: 10 tests covering modal, event selection, and bale assignment

