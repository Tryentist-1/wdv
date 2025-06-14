# Archery Team : LLM Session Management & Workflow Guide

This document is designed to help us (User and LLM) start, conduct, and pause/end our collaborative sessions effectively. Its main purpose is to ensure we stay on track, can easily resume work, and maintain clarity on the project's current state.

## 1. Starting a New Session (LLM Warm-up)

**User Instructions:**

*   At the start of a new session, please provide this document to the LLM.
*   Briefly state your main goal(s) for *this specific session*.

**LLM Instructions:**

1.  **Review Current Project State:** Carefully read the "Current Project State" section (Section 3.1 below) to understand the last known status of development.
2.  **Review Core Interaction Guides:**
    *   Refresh understanding of "My LLM Interaction Style (Global Directives for ALL Personas)" from `docs/02-vibe_coding_roles.md`.
    *   Note the "Last Vibe Persona Active" (from "Current Project State") and be prepared to adopt it or discuss a change with the user.
3.  **Confirm Session Goals:** Ask the user to confirm or clarify their immediate goal(s) for the current session.

## 2. During a Session (Staying on Track)

*   **Defining Session Goals:** At the beginning of our work, or if we pivot to a new major task, we will explicitly state 1-3 immediate goals for the current work block (e.g., "Implement the user login," "Write tests for the scoring function," "Debug the navigation bar display issue").
*   **Focus and Re-direction:** If we find ourselves going "off the rails" or diverging too much from the stated session goals, Axel (AI UX/CX Lead persona) or the user can gently guide the conversation back or suggest tabling the divergent topic.

## 3. Pausing or Ending a Session (Leaving Effective Breadcrumbs)

**Process:**

1.  **User Signal:** The user will indicate they wish to pause or end the session.
2.  **LLM Responsibility (State Summary):** The LLM will take the lead in drafting an update to the "Current Project State" section below. This involves:
    *   Querying the user for any manual observations (e.g., "I was just looking into X before we paused").
    *   Using its tools (e.g., looking at file modification history if available through the IDE) to gather objective information.
    *   Synthesizing this into the structured "Current Project State" format.
3.  **User Responsibility (Review & Augment):** The user will review the LLM-drafted state summary for accuracy and add any personal notes, reminders, or next thoughts.
4.  **Git Workflow (If Applicable):**
    *   The LLM (likely as Devin or Archie) will ask if any completed, stable work should be committed.
    *   If yes, the LLM will perform the git add, and suggest a commit message.

---

### SESSION SUMMARY TEMPLATE (for LLM to fill at end of session)

*   **Session End Date & Time:** `YYYY-MM-DD HH:MM TZ`
*   **Last Vibe Persona Active:** `(e.g., Devin, Pam)`
*   **Session Goals for This Past Session (Key Achievements):**
    *   `Goal 1 summary` - `Achieved/In Progress/Blocked`
    *   `Goal 2 summary`
*   **Key Files Modified (and their status):**
    *   `path/to/file.ext`: `Brief description of change.`
*   **Key System Changes:**
    *   `High-level summary of architectural or functional changes.`
*   **Uncommitted Changes (Summary):**
    *   `Description of uncommitted work, if any.`
*   **Untested Changes (Summary):**
    *   `Description of changes that need testing.`
*   **Next Immediate Steps (for next session):**
    *   `1. Action item for user or LLM.`
    *   `2. ...`
*   **Blockers/Open Questions:**
    *   `Any issues preventing progress.`
*   **User's Personal Notes/Reminders:**
    *   `User-specific notes.`

---

### 3.1. Current Project State

*   **Project:** Archery Score Management Suite
*   **Vision:** A suite of distinct, mobile-first web apps for scoring the primary formats of OAS archery: Ranking, Solo Match, and Team Match.
*   **Current Phase:** Project Definition & Foundation.
*   **Immediate Goal:** Solidify project requirements and create a foundational, shared CSS framework before proceeding with app development.

*   **Session Start Date & Time:** `2025-06-11`
*   **Active Persona:** Pam (acting as Product Manager)
*   **Next Immediate Steps:**
    1.  Configure git local and remote.
    1.  Finalize and document the Product Requirements Document (PRD) and Development Roadmap.
    2.  Review the structure of CSS stylesheets (`css/`) to define the visual theme for all apps.
    3.  Produce Technical Documentation and Unit Tests.
*   **Blockers/Open Questions:**
    *   Need specific scoring rules for Solo and Team match shoot-offs from the user-provided `OAS-Program+Handbook+Feb.2025+Rev..pdf`.
*   **User's Personal Notes/Reminders:**
    *   Past efforts were challenged by data type conversions ('X', 'M'), real-time calculations, and color-coding. These need robust, centralized solutions.
    *   Export features (screenshots, text copy) are critical for all three apps.

---

## Architectural Learnings (As of 2025-06-12)

A major refactoring effort on the Ranking Round app, while ultimately rolled back due to implementation flaws, revealed a superior architectural pattern that should be adopted for all future development.

### Previous Flawed Architecture:

*   **Multiple, Independent Rendering Functions:** The application used separate functions (`renderSetupForm`, `renderScoringView`, `renderCardView`, etc.) that directly manipulated different parts of the DOM.
*   **Scattered Event Listeners:** Event listeners were attached in various places, some directly in the `init()` function and others incorrectly re-attached inside rendering functions.
*   **State & DOM Unsynchronized:** The application state was often updated by reading values directly from the DOM, creating an unreliable source of truth.

This architecture proved to be fragile, difficult to debug, and led to cascading bugs, such as unresponsive buttons and inconsistent UI states.

### New, Preferred Architecture: The State-Driven UI

All new application development should follow this more robust pattern:

1.  **Single Source of Truth:** A comprehensive `state` object is the sole authority for all application data (e.g., `currentView`, `archers`, `currentEnd`, `focusedInput`). The UI is a direct, read-only representation of this state.

2.  **Centralized `render()` Function:** A single, master `render()` function is responsible for all DOM manipulation.
    *   It is called after any state change.
    *   It clears and redraws the necessary parts of the UI based *only* on the data in the `state` object.
    *   It uses a `switch` statement on `state.currentView` to determine which primary view to display.

3.  **Centralized, Delegated Event Handling:**
    *   A single, primary event listener is attached to a static parent container (e.g., `#app-container`).
    *   This listener uses event delegation to capture all user interactions (clicks, changes, etc.).
    *   **The Golden Rule:** The *only* job of an event handler is to update the `state` object and then call the master `render()` function. Event handlers should **never** manipulate the DOM directly.

This pattern ensures a predictable, one-way data flow (State -> Render -> DOM), which dramatically improves stability, simplifies debugging, and makes the application's behavior much easier to reason about.

---

## Current Troubleshooting Status (as of 2025-06-02 16:30 UTC)


**Root Cause Analysis:**

**Complicating Factors:**


**Current Action by User:**


**Next Steps (Post-Reboot):**


**Overall Goal:** 

## Progress
- Designed and iterated Archer Module UI/UX mockups (compressed detail form, list view)
- Defined CSV import/export structure matching Google Sheets for easy data round-tripping
- Established folder structure: `app-imports/` and `app-exports/` for future automation
- Agreed on using local storage for the master archer list, accessible across all scoring modules
- Planned for import/export features and SMS export for results

## Plan
1. **Implement Archer Management Module**
   - Load/save archer list from/to local storage
   - Import from CSV (manual or via file picker)
   - Add, edit, delete archers in the UI
   - Export current list as CSV
2. **Integrate with Ranking Round App**
   - Select archers from the master list for each round
   - Store round data (archers + scores) in local storage
   - Export round/bale results as CSV and SMS

## Notes
- All archer data is managed in local storage for now (per device/browser)
- Import/export folders (`app-imports/`, `app-exports/`) will support future automation and batch operations
- CSV format is kept consistent for easy syncing with Google Sheets 

## Integration Plan: Archer List with Ranking Round
- Created a feature branch (`feature/ranking-round-archer-integration`) for safe, isolated development
- Tagged the current MVP as `archer-list-mvp` for easy rollback if needed
- Goal: Allow the Ranking Round app to select archers from the master list managed by the Archer Management module
- All integration work will be committed incrementally to the feature branch
- If any issues arise, we can revert to the `archer-list-mvp` tag for a stable baseline 