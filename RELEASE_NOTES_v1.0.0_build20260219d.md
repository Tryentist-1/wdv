# Release Notes

## Version: v1.0.0
## Build: 20260219200000 (Event Deletion Confirm Fix)
**Date:** February 19, 2026

### 🐛 Bug Fixes
* **iOS PWA Confirm Dialog Bug:** Fixed a critical bug where the "Delete Event" confirmation dialog would flash and instantly disappear when the application was run in iOS Safari standalone mode (installed to home screen). This bug prevented coaches from deleting events.

### 🛠️ Technical Details
* Replaced the native `window.confirm()` call in `js/coach.js` (`deleteEvent`) with a custom HTML-based modal dialog (`customConfirm`).
* Added the reusable `#confirm-modal` layout to the `coach.html` DOM to maintain cross-platform compatibility and bypass the WebKit native prompt bug.

### 📁 Files Changed
* `coach.html`
* `js/coach.js`
* `version.json`
* `01-SESSION_QUICK_START.md`
