# WDV Testing Guide — Canonical Reference

**This is the single source of truth for testing.** All other testing docs link here. When tests or scripts change, this document MUST be updated.

**Last updated:** February 2026  
**Status:** MANDATORY — Do not skip testing steps before deployment.

---

## 1. Quick Reference

### Before Every Deployment (MANDATORY)

```bash
# 1. Start local server (required for API tests)
npm run serve

# 2. Run pre-deploy test suite (in another terminal)
npm run test:pre-deploy

# 3. Manual smoke test on mobile (see §5)
# 4. Code review checklist complete
```

### Pre-Deploy Command

```bash
npm run test:pre-deploy
```

Runs: Playwright setup tests → ranking round tests → API health check. See §3 for full behavior.

---

## 2. Test Types & Locations

| Type | Framework | Location | Requires Server |
|------|-----------|----------|-----------------|
| E2E | Playwright | `tests/*.spec.js` | No (hits production or local per config) |
| API | Jest | `tests/api/**/*.test.js` | **Yes** — `npm run serve` |
| Component | Manual | `tests/components/style-guide.html` | Yes (local) |
| Manual | Human | `tests/manual_sanity_check.md` | Yes |

**Important:** Playwright ignores `tests/api/` (Jest tests use `describe`). Jest ignores `tests/*.spec.js`. No overlap.

---

## 3. Script Reference — Exact Paths

All paths are relative to the project root. Scripts live in `tests/scripts/`.

| Command | What It Does | Path |
|---------|--------------|------|
| `npm run test` | Playwright E2E (excludes LOCAL) | `playwright test --grep-invert 'LOCAL'` |
| `npm run test:local` | Playwright against localhost:8001 | `playwright.config.local.js` |
| `npm run test:remote` | Same as `test` — against production | — |
| `npm run test:setup-sections` | Playwright: setup sections only | `tests/ranking_round_setup_sections.spec.js` |
| `npm run test:ranking-round` | Playwright: main ranking round | `tests/ranking_round.spec.js` |
| `npm run test:pre-deploy` | Pre-deploy suite (see below) | — |
| `npm run test:api:core` | Jest: health, auth | `tests/api/core/` |
| `npm run test:api:archers` | Jest: archer CRUD, search | `tests/api/archers/` |
| `npm run test:api:all` | Jest: all API tests | `tests/api/` |
| `npm run test:workflow:dev` | Dev workflow (interactive) | `./tests/scripts/test-workflow.sh development` |
| `npm run test:workflow:pre` | Pre-deploy workflow | `./tests/scripts/test-workflow.sh pre-deployment` |
| `npm run test:workflow:post` | Post-deploy workflow | `./tests/scripts/test-workflow.sh post-deployment` |

**Script paths (never use `./test_api.sh` — wrong):**

| Script | Correct Path |
|--------|--------------|
| API health check (production) | `./tests/scripts/test_api.sh` |
| Local API smoke test | `./tests/scripts/test_phase1_local.sh` |
| Jest API suite runner | `./tests/scripts/test-api-suite.sh` |
| Test workflow (dev/pre/post) | `./tests/scripts/test-workflow.sh` |
| Test summary | `./tests/scripts/test-summary.sh` |

---

## 4. URLs — Canonical

| Resource | Local | Production |
|----------|-------|------------|
| Health endpoint | `http://localhost:8001/api/index.php/v1/health` | `https://archery.tryentist.com/api/v1/health` |
| API test harness | `http://localhost:8001/tests/api/harness/test_harness.html` | `https://archery.tryentist.com/api/test_harness.html` (if deployed) |
| Style guide | `http://localhost:8001/tests/components/style-guide.html` | `https://archery.tryentist.com/tests/components/style-guide.html` (tests/ not deployed) |
| Playwright baseURL | `http://localhost:8001` (local config) | `https://archery.tryentist.com` (prod config) |

**Note:** The deploy script excludes `tests/**`. The test harness at `tests/api/harness/test_harness.html` is available locally only unless copied to `api/` for deploy. Production may have `api/test_harness.html` from an earlier setup.

---

## 5. API Tests — Server Required

**Jest API tests require a running server.** They use `API_BASE_URL`:

- **Default:** `http://localhost:8001/api/index.php/v1`
- **Override:** `export API_BASE_URL=http://your-host/api/index.php/v1`

```bash
# Terminal 1: Start server
npm run serve

# Terminal 2: Run API tests
npm run test:api:archers
# or
npm run test:api:all
```

**Common failure:** "fetch failed" or "ECONNREFUSED" → Server not running or wrong `API_BASE_URL`.

---

## 6. Playwright Tests — Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Executable doesn't exist` | Browsers not installed | `npx playwright install` (run in your terminal, not sandbox) |
| `describe is not defined` | Jest tests picked up by Playwright | Ensure `playwright.config.js` has `testIgnore: ['**/api/**']` |
| Tests fail against production | Production data/config differs | Run `npm run test:local` against localhost instead |
| Timeout | 378 tests × 6 projects = long run | Use `--project=chromium` for quicker runs |

---

## 7. Test Categories (By Feature)

### E2E (Playwright) — `tests/*.spec.js`

| File | Feature |
|------|---------|
| `ranking_round.spec.js` | Event modal, manual/pre-assigned setup, scoring |
| `ranking_round_setup_sections.spec.js` | Setup UI components |
| `ranking_round_archer_selector.spec.js` | Archer selector component |
| `ranking_round_live_sync.spec.js` | Live sync to server |
| `ranking_round.local.spec.js` | Local-only tests (excluded by default) |
| `resume_round_flow.spec.js` | Resume from index → Open Rounds |
| `resume_round_standalone_flow.spec.js` | Standalone round resume |
| `verification.spec.js` | Scorecard verification, locking |
| `smart_reconnect.spec.js` | Reconnect flow |
| `archer_results_pivot.spec.js` | Results pivot table |
| `diagnostic-ranking-round.spec.js` | Diagnostics (404 capture) |

### API (Jest) — `tests/api/**/*.test.js`

| Directory | Feature |
|-----------|---------|
| `core/` | Health, authentication |
| `archers/` | CRUD, search, bulk, self-update |
| `events/` | Event CRUD, verification |
| `rounds/` | Round CRUD, round archers |
| `matches/` | Solo matches, team matches, integration |
| `scoring/` | Match scoring, validation, workflows, performance |
| `verification/` | Verification workflows, security, smoke |
| `integration/` | Event-round integration, workflow validation |

---

## 8. Document Sync Rule — MANDATORY

**When you add, move, or remove tests:**

1. Update this file (`docs/testing/TESTING_GUIDE.md`).
2. Update `tests/TEST_ORGANIZATION.md` if structure changed.
3. Update `package.json` if adding/changing scripts.
4. Update `.cursor/rules/testing-requirements.mdc` if commands change.

**When you add or change test scripts:**

1. Use path `./tests/scripts/<script>.sh` (never `./test_xyz.sh` at root).
2. Document the script in this guide.
3. Add to `test:pre-deploy` or workflow if it's part of pre-deploy.

---

## 9. Version Check & Refresh (Post-Deploy)

After a deploy, the app detects a new version via `/api/v1/health` (response `version`/`build`) and auto-refreshes: clears cache/session (not cookies), unregisters the service worker, and reloads so users get latest JS and refetch from MySQL. Manual option: **Refresh** button on the home footer (next to Reset Data) does the same without logging out. To verify: see **docs/bugs/STALE_CACHE_AFTER_UPDATE.md** (testing plan).

---

## 10. References

- **Deployment:** `DEPLOYMENT_CHECKLIST.md`
- **Code review:** `.cursor/rules/code-review-checklist.mdc`
- **Testing rule:** `.cursor/rules/testing-requirements.mdc`
- **Test lifecycle:** `.agent/workflows/test-lifecycle.md`
- **Test structure:** `tests/TEST_ORGANIZATION.md`
- **Manual checklist:** `tests/manual_sanity_check.md`
- **Stale cache / version refresh bug:** `docs/bugs/STALE_CACHE_AFTER_UPDATE.md`