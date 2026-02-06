# Index (Home Page) Bugs: Duplicate Script & Header

**Date:** 2026-02-03
**Page/Module:** `index.html`, home page (http://localhost:8001/index.html)
**Severity:** Medium (duplicate script); Low (header consistency)
**Status:** 🟡 In Progress

---

## 🐛 Bug Description

**What's broken:**
1. **Duplicate `common.js` load** — `js/common.js` is included twice: once in `<head>` (for early `initDarkMode()`) and again at the bottom of `<body>` before other scripts. Double-loading can cause duplicate event listeners, double initialization, and subtle bugs.
2. **Header consistency** — Style guide preference is "headers for information and alerts only." Home header has title + dark mode toggle only; no settings/gear link. If a settings or alerts area was intended, it is missing or deferred.

**User Impact:**
- Duplicate script: Possible double-firing of dark mode or other common.js logic; wasted parse/execute; harder to reason about init order.
- Header: Minor; home is a landing page. No functional breakage from missing settings icon if not designed.

---

## 🔍 Steps to Reproduce

1. Open `http://localhost:8001/index.html`.
2. Open browser DevTools → Network tab; filter by "JS" or search for `common.js`.
3. Observe: `common.js` appears twice (two requests).
4. Expected: `common.js` loaded once (e.g. only in head for early theme, or only at bottom with other scripts).

---

## 🔍 Root Cause

- **Duplicate load:** Historical or copy-paste left `common.js` in both places. Head load is used so `initDarkMode()` runs before body render; the body load is redundant and should be removed.

---

## ✅ Solution

### Fix

- **Remove the second `<script src="js/common.js"></script>`** from the bottom of `index.html` (the one just before `archer_module.js`). Keep the single load in `<head>` so dark mode still initializes early.

### Optional (not required for this bug)

- If a settings/gear entry point is desired on the home page, add it in a follow-up (e.g. link to a settings or archer-list page) and keep header to info/alerts per style guide.

---

## 🧪 Testing Plan

1. **Primary:** Load index.html → Network tab shows one request for `common.js`.
2. **Regression:** Dark mode toggle still works; identity section and footer buttons work; no console errors.
3. **Mobile:** Quick check that home page still renders and toggles work on a small viewport.

---

## 📋 Implementation Checklist

- [x] Remove duplicate `common.js` from body
- [ ] Verify single load in Network tab
- [ ] Verify dark mode and other behavior unchanged
- [ ] No new console errors

---

**Status:** ✅ Fixed (pending verification)
**Priority:** Medium (duplicate script)
**Fix branch:** fix/index-home-page-errors
**Fix applied:** Removed second `<script src="js/common.js"></script>` from body; single load in `<head>` retained for early `initDarkMode()`.
