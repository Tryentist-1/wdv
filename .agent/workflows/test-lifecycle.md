---
description: Creating, running, and troubleshooting tests — mandatory workflow for test changes
---

# Test Lifecycle Workflow

**When to use:** Adding tests, changing test structure, fixing failing tests, or running pre-deploy verification.

**Canonical reference:** [docs/testing/TESTING_GUIDE.md](../docs/testing/TESTING_GUIDE.md)

---

## 1. Creating New Tests

### Where to Put Tests

| Test Type | Location | Framework |
|-----------|----------|-----------|
| E2E (user flow) | `tests/<feature>.spec.js` | Playwright |
| API endpoint | `tests/api/<category>/<name>.test.js` | Jest |
| Local-only E2E | `tests/<feature>.local.spec.js` | Playwright (tag with `@LOCAL`) |

### Playwright E2E Tests

- Use `test.describe()` and `test()` from `@playwright/test`.
- Base URL comes from config: production (`archery.tryentist.com`) or local (`localhost:8001`).
- Tag local-only tests with `LOCAL` so `npm run test` excludes them: `test.describe('My Test @LOCAL', () => { ... })`.

### Jest API Tests

- Use `describe()` and `test()` from Jest.
- Require `APIClient`, `TestAssertions`, `TestDataManager` from `../helpers/test-data`.
- **Server must be running:** `npm run serve` before `npm run test:api:*`.
- Use `API_BASE_URL` env (default: `http://localhost:8001/api/index.php/v1`).

### After Creating Tests

1. **Document:** Add the new test file to `docs/testing/TESTING_GUIDE.md` §7 (Test Categories).
2. **Update structure:** If adding a new API category, update `tests/TEST_ORGANIZATION.md` and `tests/api/README.md`.

---

## 2. Running Tests

### Pre-Deploy (MANDATORY)

```bash
npm run test:pre-deploy
```

Runs: Playwright setup + ranking round + production API health check.

### Full Manual Pre-Deploy

```bash
# Terminal 1
npm run serve

# Terminal 2
npm run test:setup-sections
npm run test:ranking-round
npm run test:api:archers
./tests/scripts/test_api.sh
```

### Development

```bash
npm run test:workflow:dev
```

Interactive workflow: server check → component library → unit tests → local E2E → API tests.

### Post-Deploy

```bash
npm run test:workflow:post
```

Or: `./tests/scripts/test-workflow.sh post-deployment`

---

## 3. Troubleshooting

### Playwright: "Executable doesn't exist"

**Cause:** Browsers not installed.  
**Fix:** Run in your terminal (not sandbox):

```bash
npx playwright install
```

### Playwright: "describe is not defined"

**Cause:** Jest API tests (`tests/api/*.test.js`) are being run by Playwright.  
**Fix:** Ensure `playwright.config.js` has:

```js
testIgnore: ['**/api/**', '**/node_modules/**'],
```

### Jest API: "fetch failed" / ECONNREFUSED

**Cause:** Server not running or wrong API base URL.  
**Fix:**

1. Start server: `npm run serve`
2. Set API base if different: `export API_BASE_URL=http://localhost:8001/api/index.php/v1`

### Jest API: 401 on endpoints that need auth

**Cause:** Tests that create rounds/events need `eventId` for auth.  
**Fix:** Ensure test sends `eventId` or uses `withPasscode()` / `withApiKey()` on APIClient.

### Script not found: ./test_api.sh

**Cause:** Wrong path. Scripts live in `tests/scripts/`.  
**Fix:** Use `./tests/scripts/test_api.sh` (or `npm run test:workflow:post` for full workflow).

### Style guide 404

**Cause:** Wrong URL.  
**Fix:** Use `http://localhost:8001/tests/components/style-guide.html` (not `.../style-guide.html` at root).

---

## 4. Document Sync — MANDATORY

**When tests or scripts change, update:**

1. **`docs/testing/TESTING_GUIDE.md`** — Add/remove test files, fix commands, update URLs.
2. **`tests/TEST_ORGANIZATION.md`** — If directory structure changed.
3. **`tests/api/README.md`** — If API categories changed.
4. **`.cursor/rules/testing-requirements.mdc`** — If pre-deploy commands changed.

**Do not skip.** Out-of-date docs cause test failures and wasted time.

---

## 5. References

- **Single source of truth:** [docs/testing/TESTING_GUIDE.md](../docs/testing/TESTING_GUIDE.md)
- **Deployment:** [DEPLOYMENT_CHECKLIST.md](../../DEPLOYMENT_CHECKLIST.md)
- **Code review:** [.cursor/rules/code-review-checklist.mdc](../../.cursor/rules/code-review-checklist.mdc)
- **Post-deploy workflow:** [post-deployment-testing.md](post-deployment-testing.md)
