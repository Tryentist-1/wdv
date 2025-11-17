## Release Notes – Ranking Round 2.0 (Oct 2025)

> **⚠️ ARCHIVED November 17, 2025**
> 
> **Reason:** Historical release notes - superseded by current version (v1.3.0+)
> 
> **Current release notes:** See RELEASE_NOTES_v1.3.0.md at project root
> 
> This file is kept for historical reference only.

---

### Deployment
- New streamlined FTP deploy script (`DeployFTP.sh`):
  - Incremental uploads by default (`--only-newer`, `--parallel=4`).
  - Safer modes: `--dry-run`, `--reset` (delete extras), `--no-local-backup`, `--remote-backup`.
  - Broader excludes: docs, tests, node_modules, app-imports, playwright-report, test-results, *.md, .vscode, .github, .DS_Store, backups.
- NPM scripts wired:
  - `npm run deploy` → incremental deploy
  - `npm run deploy:dry` → preview changes
  - `npm run deploy:reset` → full re-upload + remote cleanup
  - `npm run deploy:fast` → skip local backup for speed

### Offline-first and Live Sync
- Server-driven assignmentMode in event snapshot; event-scoped caches for preassigned rosters.
- Minimal offline queue for end posts; manual Flush button and auto-flush on reconnect.
- Hotfix (Oct 28): Live Sync now authorizes with event entry code via `X-Passcode` (no coach key required on archer devices). Client auto-saves the code after event verification and uses it for sync.

### Coach Console
- “Manage Bales” UI to edit bale number/target per archer (uses new PATCH/DELETE APIs).

### Notes
- See `docs/01-SESSION_MANAGEMENT_AND_WORKFLOW.md` for updated session/assignment mode details.
# Release Notes: Ranking Round v2.0

**Release Date:** 2025-06-16
**Status:** Released

---

We are thrilled to announce the release of **Ranking Round 2.0!** This is a major update focused on completely overhauling the scoring workflow to better match how scoring is done on the field. Our new "Digital Clipboard" design makes scoring an entire bale of archers faster, more intuitive, and less error-prone.

### ✨ Key Features & Enhancements

#### 1. **New! Bale & Target Assignment**
This was a critical missing piece, and we're excited to have it in place.
*   **Set Bale Number:** When you start a new round, you can now set the official Bale Number for the session.
*   **Assign Target Letters:** As you add archers to the bale, you can assign each one a unique target letter (A-H). This information is now displayed on all screens for easy identification.

#### 2. **New! "Verify & Send" Bale Totals via SMS**
We've streamlined the process for exporting and sharing final scores.
*   **Verify First:** After scoring, go to any archer's card to review the full scoresheet.
*   **One-Click Totals:** Click the new **"Verify & Send"** button to see a summary of all archers' totals for the entire bale in a clean pop-up modal.
*   **Send with Confidence:** Once you've confirmed the totals are correct, click **"Send SMS"**. This opens your phone's messaging app with all the data perfectly formatted and ready to be pasted into a Google Sheet.

#### 3. **Improved! UX & Workflow**
*   **Logical "Send" Location:** The "Verify & Send" button is now located on the final card review screen, which is the natural place to verify and export totals.
*   **Cleaner Interface:** We've removed redundant buttons from the main scoring screen to reduce clutter and focus on the core task of entering scores.

### 🚀 How to Use the New Workflow

1.  **Setup:** On the "Setup Bale" screen, set your Bale Number and select all the archers who will be shooting on that bale. Assign a Target Letter to each.
2.  **Score:** Use the main "Scoring" screen (the "Digital Clipboard") to enter scores end-by-end for all archers.
3.  **Review:** Tap the `»` button next to any archer's name to view their complete, traditional scorecard.
4.  **Verify & Send:** On the scorecard view, tap **"Verify & Send"**. Review the totals for all archers on the bale in the pop-up.
5.  **Confirm & SMS:** Tap **"Send SMS"** to package up the results and send them off.

---

Thank you for your valuable feedback, which directly led to these improvements. We're confident that Ranking Round 2.0 will make scoring faster and easier for everyone.

**— Pam, Product Manager** 