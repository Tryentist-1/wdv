# App Bug: Stale Local Cache After Update / Doesn't Connect

**Date:** 2025-02-12
**Page/Module:** index.html, sw.js, localStorage, service worker
**Severity:** High
**Status:** 🟡 In Progress

---

## 🐛 Bug Description

When the app is updated (deploy), especially anything that affects sync or API contracts, the webapp's local cache becomes stale and the app may fail to connect or show outdated data/behavior.

**User Impact:**
- After a deploy, users may keep running old JavaScript from the service worker cache.
- Cached session/localStorage state (rounds, events, sync config) can be incompatible with the new backend or new app logic.
- No foolproof way to "get latest app + fresh data from MySQL" without manually clearing data and understanding Reset Data vs. cache.

---

## 🔍 Steps to Reproduce

1. Use the app (open home, optionally start a round or sync).
2. Deploy a new version (e.g. API or JS changes).
3. Reload or return to the app (without clearing cache).
4. Observe: Old JS may run (SW cache-first); localStorage may still reference old shapes; sync or API may fail or behave oddly.
5. Expected: App either auto-refreshes to new version and refetches from MySQL, or user has a single clear action to "get latest app and data".

---

## 🔍 Root Cause Analysis

### The Problem

1. **Service worker**: Uses static `CACHE_NAME = 'oas-score-v1'`. Static assets (JS/CSS) are cache-first, so after deploy clients keep receiving old files until the cache is invalidated.
2. **No version check**: The app does not compare its version to the server; it never auto-invalidates cache or prompts for refresh.
3. **localStorage**: Session/cache keys (ranking rounds, events, live_updates_session, etc.) persist across deploys and can be stale or incompatible with the new backend.
4. **Single "Reset Data"** clears everything including cookies (logs user out); there is no "refresh app and data from server" that keeps identity but forces fresh assets + fresh data.

### Code Flow

- `sw.js`: Cache-first for `/js/`, `/css/` with fixed cache name → old assets served indefinitely.
- `index.html`: `clearAppData()` clears localStorage, Cache API, cookies, then reloads with `?nocache=`. No version check on load.
- Health endpoint returns only `{ ok, time, hasApiKey, hasPass }` — no app version.

### Why This Happens

- PWA and offline support intentionally cache aggressively; without a versioning strategy, deploys don't invalidate that cache.
- Database-is-source-of-truth is correct, but the client must be prompted or forced to refetch; stale local state + old JS prevent that.

---

## ✅ Solution

### Fix Strategy

1. **Server exposes app version/build**  
   Health endpoint returns a `version` and `build` (e.g. from `version.json` or deploy-generated file). Deploy script updates build (or full version) when deploying.

2. **Client checks version on load**  
   Before rendering, fetch `/api/v1/health`. If response `version` or `build` differs from `localStorage.app_version`, run a **full refresh**: clear cache/session localStorage (not cookies), clear Cache API, unregister service worker, set `app_version` to server value, then hard-reload. New load gets new SW and fresh assets, and app re-fetches from MySQL.

3. **Service worker cache versioning**  
   Use cache name that includes build/version (e.g. `oas-score-{build}`). Deploy script updates `sw.js` (or we inject at deploy) so new deploy = new cache name; activate handler deletes old caches.

4. **Manual "Refresh app"**  
   Add a button or existing entry point that does the same full refresh (or at least: clear caches + unregister SW + reload) so users can force "get latest version and data" without logging out.

### Implementation

- **File:** `version.json` (new) – holds `version` and `build`; deploy can overwrite `build`.
- **File:** `api/index.php` – health handler reads version from `../version.json` and returns it.
- **File:** `sw.js` – `CACHE_NAME` includes build (set at deploy or from a placeholder replaced by deploy).
- **File:** `index.html` – Early script: fetch health, compare `app_version`, run full refresh if changed; add `fullRefresh()` and wire "Refresh app" (or reuse Reset Data with a less nuclear variant that doesn’t clear cookies).
- **File:** `scripts/deploy/DeployFTP.sh` – Optionally write `version.json` build and replace cache name in `sw.js`.

### Code Changes

- Health response: `{ ok, time, version?, build?, hasApiKey, hasPass }`.
- New `fullRefresh()`: clear session/cache localStorage keys (same list as clearAppData but without cookies), clear caches, unregister SW, set `localStorage.app_version = serverBuild`, `location.href = path + '?nocache=' + Date.now()`.
- Version check: on load (early, before DOM), fetch health; if `(data.build || data.version) !== localStorage.app_version` then fullRefresh().
- "Refresh app" button: calls fullRefresh() (or a variant that doesn’t clear cookies if we want to keep one "nuclear" Reset Data).

---

## 🧪 Testing Plan

### Test Cases

1. **Primary: New version triggers full refresh**
   - Set server version/build to a new value (or mock health).
   - Load app; expect one reload and then app_version stored and no loop.
   - Confirm new JS runs (e.g. console log or visible change).

2. **Regression: Same version does not reload**
   - Load app twice; second load should not reload (same version).

3. **Manual "Refresh app"**
   - Click Refresh app; expect caches cleared and page reload; user still logged in (cookies intact).

4. **Mobile** – Test on real device: version check and refresh button work; touch target ≥ 44px.

### Test Devices

- iPhone (Safari), Android (Chrome), Desktop for regression.

---

## 📋 Implementation Checklist

- [x] Root cause identified
- [x] Fix implemented
- [ ] Code tested locally
- [ ] Mobile device tested
- [ ] Regression tests passed
- [x] Documentation updated
- [ ] Ready for deployment

---

## 🔗 Related Issues

- `docs/core/DATA_SYNCHRONIZATION_STRATEGY.md` – Database source of truth; cache is cache only.
- `docs/PWA_OFFLINE_QUEUE_INTEGRATION.md` – SW and offline queue.
- `index.html` – `clearAppData()` and SW registration.

---

**Status:** ✅ Fixed (pending verification)  
**Priority:** High  
**Fix Applied:** 2025-02-12

**Files changed:**
- `version.json` (new) – version + build; deploy script updates `build`.
- `api/index.php` – health response includes `version` and `build` from `version.json`.
- `sw.js` – `CACHE_NAME`/`RUNTIME_CACHE` use `__BUILD__` placeholder; deploy replaces with build timestamp.
- `scripts/deploy/DeployFTP.sh` – Step 3.5: set `version.json` build and replace `__BUILD__` in `sw.js` before upload.
- `index.html` – Early version check (fetch health, compare to `app_version`); on mismatch, full refresh (clear cache/session, unregister SW, reload).

**Update (2025-02):** Consolidated to single **Reset Data** button. It now also unregisters the Service Worker (same as former Refresh), so it does both "get latest app" and "full reset". Removed separate Refresh button.
