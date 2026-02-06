# Release Notes v1.9.5

**Release Date:** February 3, 2026  
**Status:** ✅ Production  
**Branch:** `main`  
**Type:** Bug fixes + documentation

---

## 🎯 Summary

Fixes 404s on home page, Solo Match “Complete Match,” and Team Match when using the PHP built-in server or Docker (no URL rewrite). Adds environment and deployment documentation.

---

## 🐛 Bug Fixes

### Home page (index.html)
- **Issue:** Archers list and assignments returned 404 on local dev (`php -S` or Docker).
- **Fix:** Use relative API base `api/index.php/v1` for all fetch calls (archers, history, bracket-assignments, search).
- **Ref:** `docs/bugs/INDEX_HOME_PAGE_ERRORS.md`

### Solo Match – Complete Match button
- **Issue:** PATCH to update match status returned 404; events/recent and other direct API calls also 404’d.
- **Fix:** Added `getApiBase()` in `solo_card.js`; all fetches use `api/index.php/v1` on localhost and production URL otherwise (event snapshot, brackets, entries, status PATCH, events/recent, bracket assignments, archer search).
- **Ref:** `docs/bugs/COMPLETE_MATCH_BUTTON_404.md`

### Team Match – Complete Match and events
- **Issue:** Same 404 pattern for status PATCH and events/recent, events/…/brackets.
- **Fix:** Added `getApiBase()` in `team_card.js`; all fetches use the same API base logic.

---

## 📚 Documentation

- **API base and environments:** `docs/guides/API_BASE_AND_ENVIRONMENTS.md` – when the app works or 404s, one-rule recommendation.
- **Environments and optimum setup:** `docs/guides/ENVIRONMENTS_AND_OPTIMUM_SETUP.md` – M1/M5/Interserver, Docker, branches, deploy.
- **Bug write-ups:** `docs/bugs/INDEX_HOME_PAGE_ERRORS.md`, `docs/bugs/COMPLETE_MATCH_BUTTON_404.md`.

---

## 📋 Files Changed

- `index.html` – API_BASE for archers, history, bracket-assignments, search
- `js/solo_card.js` – getApiBase(); all API fetches use it
- `js/team_card.js` – getApiBase(); status + events fetches use it
- `docs/bugs/INDEX_HOME_PAGE_ERRORS.md` – new
- `docs/bugs/COMPLETE_MATCH_BUTTON_404.md` – new
- `docs/guides/API_BASE_AND_ENVIRONMENTS.md` – new
- `docs/guides/ENVIRONMENTS_AND_OPTIMUM_SETUP.md` – new
- `01-SESSION_QUICK_START.md` – status update (ranking round sync)
- `QUICK_START_LOCAL.md` – env/setup notes
- `tests/components/style-guide.html` – headers/layout preference

---

## ✅ Production

- No server config change required; production continues to use existing API URL.
- Post-deploy: verify home page loads archers, Solo/Team “Complete Match” works, and `https://archery.tryentist.com/api/v1/health` returns `{"ok":true}`.
