# Archery Team : LLM Session Management & Workflow Guide

This document is designed to help us (User and LLM) start, conduct, and pause/end our collaborative sessions effectively. Its main purpose is to ensure we stay on track, can easily resume work, and maintain clarity on the project's current state.

## 1. Starting a New Session (LLM Warm-up)

**User Instructions:**

* At the start of a new session, please provide this document to the LLM.
* Briefly state your main goal(s) for *this specific session*.

**LLM Instructions:**

1. **Review Current Project State:** Carefully read the "Current Project State" section (Section 3.1 below) to understand the last known status of development.
2. **Review Core Interaction Guides:**
    * Refresh understanding of "My LLM Interaction Style (Global Directives for ALL Personas)" from `docs/02-vibe_coding_roles.md`.
    * Note the "Last Vibe Persona Active" (from "Current Project State") and be prepared to adopt it or discuss a change with the user.
3. **Confirm Session Goals:** Ask the user to confirm or clarify their immediate goal(s) for the current session.

## 2. During a Session (Staying on Track)

* **Defining Session Goals:** At the beginning of our work, or if we pivot to a new major task, we will explicitly state 1-3 immediate goals for the current work block (e.g., "Implement the user login," "Write tests for the scoring function," "Debug the navigation bar display issue").
* **Focus and Re-direction:** If we find ourselves going "off the rails" or diverging too much from the stated session goals, Axel (AI UX/CX Lead persona) or the user can gently guide the conversation back or suggest tabling the divergent topic.

## 3. Pausing or Ending a Session (Leaving Effective Breadcrumbs)

**Process:**

1. **User Signal:** The user will indicate they wish to pause or end the session.
2. **LLM Responsibility (State Summary):** The LLM will take the lead in drafting an update to the "Current Project State" section below. This involves:
    * Querying the user for any manual observations (e.g., "I was just looking into X before we paused").
    * Using its tools (e.g., looking at file modification history if available through the IDE) to gather objective information.
    * Synthesizing this into the structured "Current Project State" format.
3. **User Responsibility (Review & Augment):** The user will review the LLM-drafted state summary for accuracy and add any personal notes, reminders, or next thoughts.
4. **Git Workflow (If Applicable):**
    * The LLM (likely as Devin or Archie) will ask if any completed, stable work should be committed.
    * If yes, the LLM will perform the git add, and suggest a commit message.

---

### SESSION SUMMARY TEMPLATE (for LLM to fill at end of session)

* **Session End Date & Time:** `2025-09-16`  
* **Last Vibe Persona Active:** `Pam (Product Manager)`
* **Session Goals for This Past Session (Key Achievements):**
    *   Implemented Ranking Round 300 (10 ends of 3) as default entry point.
    *   Consolidated export controls into a single Export modal (Verify, Screenshot, JSON, Email).
    *   Updated Ranking UI with "← Scoring" back label and Prev/Next archer cycling.
* **Key Files Modified (and their status):**
    *   `ranking_round_300.html`: New 300-round entry page. (Uncommitted/Committed as applicable)
    *   `js/ranking_round_300.js`: New 300-round logic (totalEnds=10). (Uncommitted/Committed)
    *   `ranking_round.html`: Card footer + export modal integration. (Uncommitted/Committed)
    *   `js/ranking_round.js`: Export modal wiring; archer cycling. (Uncommitted/Committed)
    *   `index.html`: Ranking button now links to 300 round. (Uncommitted/Committed)
* **Key System Changes:**
    *   Default Ranking experience points to a 300-round flow while preserving the 360 page.
    *   Export functions unified behind a single modal to streamline user actions.
* **Uncommitted Changes (Summary):**
    *   Review working tree for pending edits across HTML/JS.
* **Untested Changes (Summary):**
    *   Manual testing recommended for export modal flows and archer cycling.
* **Next Immediate Steps (for next session):**
    *   Optional: Add round selector (300/360) in setup to toggle `totalEnds` without separate pages.
    *   Update tutorial docs to reflect Export modal and 300-round flow.
* **Blockers/Open Questions:**
    *   None currently.
* **User's Personal Notes/Reminders:**
    *   Verify SMS formatting with coaches ahead of first tournament.

---

### 3.1. Current Project State

* **Project:** Archery Score Management Suite
* **Vision:** A suite of distinct, mobile-first web apps for scoring the primary formats of OAS archery: Ranking, Solo, and Team, with robust integration and automation.
* **Current Phase:** UI/UX Cleanup + Season 2025 prep
* **Immediate Goal:** Ship Ranking Round 300 and consolidate export actions.

* **Session Start Date & Time:** `2025-09-16`
* **Active Persona:** Pam (Product Manager)
* **Next Immediate Steps:**
    *   Consider adding a setup-time round selector to flex between 300/360.
    *   Confirm copy and styling on the Export modal.
* **Blockers/Open Questions:**
* None at this time
* **User's Personal Notes/Reminders:**
* Use the deploy script for releases; validate on-device UX before events.

---

## FTP Deployment Process (Automated Deployments)

All production deployments are handled via the `DeployFTP.sh` script in the project root. This process ensures safe, versioned, and repeatable deployments to the remote server, with robust backup and exclusion of sensitive files.

**Deployment Steps:**

1. **Local Backup:**
    * The script creates a timestamped backup of the current local project directory and compresses it to the `backups/` folder.
2. **Remote Backup:**
    * Before uploading, the script downloads a full backup of the current remote deployment and stores it locally, also compressed in `backups/`.
3. **File Exclusion:**
    * The script reads `.gitignore` and always-excludes sensitive files/folders (e.g., `.env`, `.git/`, `node_modules/`, `docs/`, `tests/`, `backups/`).
    * Only necessary production files are uploaded.
4. **FTP Upload:**
    * Uses `lftp` with FTP-SSL for secure transfer.
    * No files or directories are deleted from the remote server (the `--delete` flag is NOT used).
    * Only new or changed files are uploaded; existing files are overwritten as needed.
5. **Safety:**
    * No destructive actions are performed on the remote server.
    * All backups are timestamped for easy rollback.
    * The script loads FTP credentials from `.env` (never committed to git).

**To deploy:**

```bash
bash DeployFTP.sh
```

**Manual Cleanup:**

* If any files or directories need to be removed from the remote server, do so manually via FTP or your hosting control panel. The deploy script will never delete remote files.

**Best Practices:**

* Always run the script from the project root.
* Confirm the exclude patterns and backup locations before deploying.
* Review the output for any errors or unexpected uploads.
* Test the deployed site after each deploy.

---

## Architectural Learnings (As of 2025-06-12)

Mobile Web App
Usability on Phones with Safari and Chrome mixed and local storage.
No Horizantal Scrolling Interface

---

## Current Troubleshooting Status (as of 2025-06-02 16:30 UTC)

**Root Cause Analysis:**

**Complicating Factors:**

**Current Action by User:**

**Next Steps (Post-Reboot):**

**Overall Goal:**

## Progress

* Designed and iterated Archer Module UI/UX mockups (compressed detail form, list view)

* Defined CSV import/export structure matching Google Sheets for easy data round-tripping
* Established folder structure: `app-imports/` and `app-exports/` for future automation
* Agreed on using local storage for the master archer list, accessible across all scoring modules
* Planned for import/export features and SMS export for results

## Plan

1. **Implement Archer Management Module**
   * Optimize Archer Module Subheader and Buttons
   
2. **Integrate with Ranking Round App**
   * Select archers from the master list for each round
   * Store round data (archers + scores) in local storage
   * Export round/bale results as CSV and SMS

## Notes

* All archer data is managed in local storage for now (per device/browser)

* Import/export folders (`app-imports/`, `app-exports/`) will support future automation and batch operations
* CSV format is kept consistent for easy syncing with Google Sheets

## Integration Plan: Archer List with Ranking Round

* Created a development branch (`development`) for safe, isolated development

* Tagged the current MVP as `archer-list-mvp` for easy rollback if needed
* Goal: Allow the Ranking Round app to select archers from the master list managed by the Archer Management module
* All integration work will be committed incrementally to the feature branch
