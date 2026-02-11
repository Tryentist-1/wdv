# Testing Workflow Evaluation

**Date:** February 2026  
**Purpose:** Assess current testing setup, identify what’s still relevant, and what has drifted.

---

## Executive Summary

Testing has drifted in several ways:
- **Docs and reality differ:** File structure, URLs, and script paths are often wrong.
- **Jest API tests:** Require a running server and likely use the wrong API base URL.
- **Rules are still valid:** `.cursorrules` and `testing-requirements.mdc` are still appropriate.
- **Core workflow is intact:** Playwright E2E, test harness, and deployment checklist are the main sources of truth.

---

## 1. What’s Still Relevant ✓

### Rules & Checklists
- **`.cursorrules`** — Pre-deploy: “All tests pass, mobile tested, dark mode tested.” Still valid.
- **`testing-requirements.mdc`** — Commands and philosophy are correct.
- **`code-review-checklist.mdc`** — Testing section (Section 6) is still relevant.
- **`DEPLOYMENT_CHECKLIST.md`** — Pre-deploy testing steps are realistic.

### Actual Test Infrastructure
- **Playwright** — `playwright.config.js` uses `archery.tryentist.com` correctly.
- **`api/test_harness.html`** — Browser-based API testing in use.
- **`tests/components/style-guide.html`** — Component reference for UI.
- **`tests/scripts/test_api.sh`** — Production API health check.
- **`tests/scripts/test_phase1_local.sh`** — Local API smoke test.
- **`tests/scripts/test-workflow.sh`** — Dev / pre / post deploy flows.
- **`tests/scripts/test-api-suite.sh`** — Jest API test runner.

### `package.json` Scripts (Mostly Correct)
- `test`, `test:local`, `test:ui`, `test:headed` — Playwright.
- `test:setup-sections`, `test:ranking-round` — Playwright subsets.
- `test:api:core`, `test:api:archers`, `test:api:all`, etc. — Jest.

---

## 2. What’s Outdated or Wrong ✗

### Documentation vs Reality

| Doc | Issue |
|-----|-------|
| **TEST_ORGANIZATION.md** | Describes `tests/e2e/` and `tests/unit/` but specs live in `tests/*.spec.js` and there is no `tests/unit/` |
| **tests/README.md** | `open http://localhost:8001/style-guide.html` — should be `tests/components/style-guide.html` |
| **tests/README.md** | `./test_api.sh` — should be `./tests/scripts/test_api.sh` |
| **tests/README.md** | `./test_phase1_local.sh` — should be `./tests/scripts/test_phase1_local.sh` |
| **AUTOMATED_TESTING.md** | Uses `tryentist.com/wdv`; production is `archery.tryentist.com` |
| **AUTOMATED_TESTING.md** | States “Local - Not Working Yet” — local Playwright config exists and should work |
| **tests/verification.spec.js** | Uses `tryentist.com/wdv` in one branch |
| **tests/api/README.md** | References `tests/api/brackets/` — folder does not exist |

### API Base URL (Jest Tests)
- **Current:** `http://localhost:8001/api/v1` in `tests/api/helpers/test-data.js`
- **Actual local setup:** Often `http://localhost:8001/api/index.php/v1` (PHP built-in server)
- **Effect:** Jest API tests fail with “fetch failed” when server uses `api/index.php/v1` and tests use `/api/v1`.

### Missing Items
- **`tests/api/brackets/`** — `npm run test:api:brackets` exists but directory is missing.
- **Environment variable for API base** — Jest config does not expose `API_BASE_URL` for local vs prod.

### Duplicate / Confusing References
- **`test:api:integration`** — Defined twice in `package.json`.
- **`tests/unit/`** — Mentioned in docs but specs and QUnit runner are in `tests/` root.

---

## 3. Where the Workflow Broke

### Likely Causes
1. **Docs not updated** when tests moved from `e2e/` and `unit/` to root.
2. **Production URL change** from `tryentist.com/wdv` to `archery.tryentist.com` not reflected everywhere.
3. **Jest API tests** added without clear “server must be running” and API base URL docs.
4. **Script paths** documented as `./test_api.sh` instead of `./tests/scripts/test_api.sh`.

### Rules vs Practice
- Rules say “All tests pass” before deploy.
- Not enforced automatically (no CI).
- No single “run this before deploy” script that everyone uses.
- Jest API tests are rarely run because they need a server and may use the wrong URL.

---

## 4. Recommendations

### High Priority
1. **Fix Jest API base URL**  
   Use `API_BASE_URL` env var (default `http://localhost:8001/api/index.php/v1`) and document that the server must be running.
2. **Fix script paths in docs**  
   Replace `./test_api.sh` with `./tests/scripts/test_api.sh` (and similar).
3. **Remove or fix `test:api:brackets`**  
   Either add `tests/api/brackets/` or remove the script.
4. **Update URLs**  
   Replace `tryentist.com/wdv` with `archery.tryentist.com` everywhere.

### Medium Priority
5. **Align TEST_ORGANIZATION.md**  
   Describe actual layout: `tests/*.spec.js`, `tests/api/`, `tests/components/`.
6. **Single pre-deploy command**  
   e.g. `npm run test:pre-deploy` that runs the minimal set: Playwright subset + API health (or Jest if server is up).
7. **Add testing to QUICK_START or docs**  
   “Before deploy: run X, Y, Z.”

### Lower Priority
8. **Consider CI**  
   GitHub Actions or similar to run tests on push.
9. **Consolidate testing docs**  
   One page for “how to test” and link to it from rules and deployment checklist.

---

## 5. Minimal “Truth” for Testing

Use this as the canonical reference:

### Before Deploy
```bash
# 1. Start server (for API tests)
npm run serve

# 2. Playwright (against production or local)
npm run test:setup-sections   # 42 tests
npm run test:ranking-round    # Main ranking round

# 3. API (requires server)
npm run test:api:archers      # Critical for field validation
# OR: npm run test:api:all

# 4. Test harness (manual)
open https://archery.tryentist.com/api/test_harness.html
# Run Test 1 (Health) and Test 6 (Full Workflow)

# 5. Manual smoke test on mobile
# Per DEPLOYMENT_CHECKLIST.md §4
```

### Test Harness
- **Prod:** `https://archery.tryentist.com/api/test_harness.html`
- **Local:** `http://localhost:8001/api/test_harness.html`

### Style Guide
- **Path:** `tests/components/style-guide.html`
- **Local:** `http://localhost:8001/tests/components/style-guide.html`

---

## 6. Files to Update (If Proceeding)

| File | Change |
|------|--------|
| `tests/api/helpers/test-data.js` | Use `API_BASE_URL` env, default `api/index.php/v1` |
| `jest.config.js` | Document `API_BASE_URL` |
| `tests/README.md` | Fix style-guide and script paths |
| `TEST_ORGANIZATION.md` | Match actual structure |
| `docs/testing/AUTOMATED_TESTING.md` | Fix URLs, remove “Not Working Yet” |
| `tests/verification.spec.js` | Fix prod URL |
| `package.json` | Remove duplicate `test:api:integration`; fix or remove `test:api:brackets` |
| `testing-requirements.mdc` | Add “server must be running” for API tests |
| `DEPLOYMENT_CHECKLIST.md` | Add explicit test harness URL |

---

**Next step:** Decide whether to apply these updates now or tackle them in phases (e.g. URL fixes first, then Jest config, then docs).

---

## Update (February 2026)

The above changes were applied in branch `fix/testing-workflow-docs`:
- Jest API base URL uses `API_BASE_URL` env, default `api/index.php/v1`
- Removed `test:api:brackets` (no tests/api/brackets)
- Fixed script paths in docs (`./tests/scripts/`)
- Fixed URLs (archery.tryentist.com)
- Updated TEST_ORGANIZATION.md to match actual structure
- Updated testing-requirements.mdc
