# Coach Bug: Event Deletion Modal Flashes and Disappears

**Date:** 2026-02-19
**Page/Module:** `coach.html` / `js/coach.js`
**Severity:** High
**Status:** ✅ Fixed

---

## 🐛 Bug Description

**What's broken:**
Clicking "Delete Event" flashes a confirmation dialog that instantly disappears, preventing the coach from successfully deleting the event.

**User Impact:**
- Coaches cannot delete events when using the iOS Safari Progressive Web App (PWA) in standalone mode. 
- Prevents proper event management and cleanup from iPhones or iPads when saved to the home screen.

---

## 🔍 Steps to Reproduce

1. Open the WDV Coach interface (`coach.html`) as a PWA saved to the iOS home screen.
2. Authenticate and click the "Edit Event" (pencil) icon on an existing event.
3. Click the red "Delete Event" button at the bottom of the modal.
4. **Observe:** The native `window.confirm()` dialog flashes on the screen momentarily and then vanishes. The deletion process halts.
5. **Expected:** A confirmation dialog should appear and wait for the user to confirm or cancel the deletion.

**Environment:**
- Device: iOS (iPhone/iPad)
- Browser: Safari (Standalone PWA Mode)
- Page: `coach.html`

---

## 📸 Evidence

**Console Errors:**
None. WebKit silently aborts the native dialog in this context.

**Network Errors:**
None. The API request is never sent because the confirmation fails.

---

## 🔍 Initial Investigation

**What I've checked:**
- [x] Console for JavaScript errors
- [x] Network tab for API failures
- [x] Tested on mobile device
- [x] Checked related features

**Suspected cause:**
This is a known WebKit bug where native `window.confirm`, `alert`, and `prompt` dialogs often dismiss instantly or freeze the app when invoked in a PWA standalone mode context, particularly when triggered from asynchronous handlers or modal stacks.

---

## 🔗 Related

- Fixed via PR/Commit: `ac790b6` (Fix iOS PWA event deletion confirm bug)

---

**Status:** ✅ Fixed
**Priority:** High
**Reported by:** User / AI Assistant
