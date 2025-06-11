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

## Current Troubleshooting Status (as of 2025-06-02 16:30 UTC)


**Root Cause Analysis:**

**Complicating Factors:**


**Current Action by User:**


**Next Steps (Post-Reboot):**


**Overall Goal:** 