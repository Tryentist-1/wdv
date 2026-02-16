# Pre-Deploy Tests Frequently Hang / Fail — Block Deployment

**Date:** 2026-02-16  
**Area:** `npm run test:pre-deploy`, Playwright E2E, deployment workflow  
**Severity:** Medium (blocks prod deploys)  
**Status:** 🟡 Open

---

## 🐛 Bug Description

The pre-deploy test suite (`npm run test:pre-deploy`) frequently hangs, fails, or takes too long, which blocks the deployment-to-production process. Deploys are often skipped or run without the mandatory pre-deploy verification, creating risk and friction.

**User Impact:**
- Cannot reliably run `npm run test:pre-deploy` before deploying
- Tests may hang for minutes with no clear progress
- Failures/skips (×, F symbols in output) without clear cause
- Developers bypass tests and deploy anyway, undermining the safety net

---

## 🔍 What the Pre-Deploy Suite Runs

```bash
npm run test:pre-deploy
# Runs: test:setup-sections && test:ranking-round && test_api.sh
```

| Step | Command | What |
|------|---------|------|
| 1 | `test:setup-sections` | Playwright: `tests/ranking_round_setup_sections.spec.js` (78 tests) |
| 2 | `test:ranking-round` | Playwright: `tests/ranking_round.spec.js` |
| 3 | `test_api.sh` | API health check (production) |

The Playwright tests use the default config and typically run against production (or localhost depending on baseURL). They can:
- Hang indefinitely
- Fail (F) or skip (×) without clear reason
- Take 2+ minutes even when partially passing

---

## 🔍 Observed Behavior

- Playwright output shows `×` (skipped) and `F` (failed) symbols
- Tests can run 2+ minutes with no completion
- No clear indication whether failure is due to: server not running, production state, flaky assertions, timeouts, or environment mismatch
- `test_api.sh` (API health) is quick; the Playwright steps are the bottleneck

---

## 📋 Proposed Actions (Pick One or More)

### Option A: Fix the Tests
- [ ] Identify which Playwright tests fail/skip/hang
- [ ] Add timeouts or retries where appropriate
- [ ] Ensure tests run against correct target (local vs prod)
- [ ] Fix or skip tests that depend on production data/state
- [ ] Add clearer error output when tests fail

### Option B: Simplify Pre-Deploy
- [ ] Reduce pre-deploy to: CSS build + API health check only (no Playwright)
- [ ] Move full Playwright suite to CI or manual run
- [ ] Update `TESTING_GUIDE.md` and `DEPLOYMENT_CHECKLIST.md`

### Option C: Make Pre-Deploy Optional / Non-Blocking
- [ ] Add `npm run deploy:skip-tests` or `--skip-tests` flag for emergency deploys
- [ ] Keep `test:pre-deploy` as recommended but not blocking
- [ ] Document when it's safe to skip

### Option D: Run Playwright Against Localhost
- [ ] Change pre-deploy to run Playwright with `playwright.config.local.js` (requires `npm run serve` in another terminal)
- [ ] Add script that starts server, runs tests, stops server
- [ ] Reduces dependency on production state

---

## 📁 Relevant Files

| File | Purpose |
|------|---------|
| `package.json` | `test:pre-deploy` script |
| `tests/ranking_round_setup_sections.spec.js` | Setup sections Playwright tests |
| `tests/ranking_round.spec.js` | Ranking round Playwright tests |
| `tests/scripts/test_api.sh` | API health check |
| `docs/testing/TESTING_GUIDE.md` | Canonical testing reference |
| `DEPLOYMENT_CHECKLIST.md` | Pre-deploy verification steps |

---

## Acceptance Criteria

- [ ] Pre-deploy suite completes in under 2 minutes when environment is correct
- [ ] Failures produce actionable error messages
- [ ] Deployment process is not blocked by flaky tests
- [ ] Testing docs updated to reflect any changes

---

## Notes

- Playwright default config targets production (`https://archery.tryentist.com`) per `playwright.config.js`
- Jest API tests (`npm run test:api:archers`, etc.) require `npm run serve` and are NOT part of `test:pre-deploy`
- `test_workflow.sh pre-deployment` runs `npm test` (full E2E) + API health + manual checks — different from `test:pre-deploy`
