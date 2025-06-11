# Technical Deep Dive: `score360-with-keypad.html`

**Document Owner:** Gemini (Technical Analyst)
**Status:** Analysis Complete
**Date:** 2025-06-12

---

### 1. Executive Summary

This document provides a detailed analysis of the `score360-with-keypad.html` application and its JavaScript, `js/score-with-keypad.js`. The application is a highly-optimized, single-page web app designed for efficient, mobile-first scoring of a 360-style archery round. Its architecture prioritizes a responsive user interface, robust state management, and an event-driven model to ensure data integrity and a seamless user experience. The design choices clearly reflect a deep understanding of the on-the-ground scoring process.

---

### 2. Core Architectural Principles

The application is built on three key principles that work in concert:

1.  **Centralized State Management:** There is a single source of truth for all application data, held in memory as JavaScript arrays (`scores`, `archerNames`, etc.). This state is rigorously loaded from and saved to the browser's `localStorage`, providing seamless session persistence.
2.  **Dynamic Rendering:** The user interface is not static. The HTML serves as a template, and JavaScript functions (`buildTabs`, `buildArcherTables`, `updateArcherScoreTable`) are responsible for dynamically generating the entire scoring interface based on the current state. This is the key to its flexibility and responsiveness.
3.  **Event-Driven Logic:** User actions (clicking a tab, entering a score) do not directly manipulate disparate parts of the UI. Instead, they trigger a cascade of well-defined functions: update the state, save the state, and then re-render the entire view from the fresh state. This ensures consistency and prevents data synchronization errors.

---

### 3. Detailed Component Breakdown

#### 3.1. State Management (The "Brain")

*   **In-Memory State:**
    *   `scores`: A 2D array (`TOTAL_ARCHERS` x `TOTAL_ROUNDS`) of objects, e.g., `{ arrow1: '10', arrow2: 'X', arrow3: '9' }`. This is the core data structure.
    *   `archerNames`, `archerSchools`, etc.: Parallel arrays that hold metadata for each archer, indexed identically to the `scores` array.
    *   `currentTab`: A simple integer that tracks which archer's scorecard is currently visible.
    *   `initConfig`: A global object in the HTML that provides boot-time configuration (archer count, round type, etc.), allowing for easy adaptation.

*   **Persistence (`localStorage`):**
    *   `sessionKey`: A unique key is generated for each day's session (e.g., `archeryScores_360_WDV_2025-6-12`). This cleverly scopes the data, preventing conflicts.
    *   `saveData()`: This function is called after *any* state change. It serializes the entire state (all data arrays) into a single JSON object and writes it to `localStorage`.
    *   `loadData()`: On application start, this function reads the JSON from `localStorage`. It includes robust error handling to validate the stored data's structure, preventing app crashes from corrupted data. If no data exists, it calls `initializeDefaultScores()` to build a clean state.

#### 3.2. UI Rendering (The "Face")

This is how the app achieves its "tightly crafted" layout without scrolling.

*   **`buildTabs()` & `buildArcherTables()`:** These functions run once at initialization. They create the main structural components: the colored tabs for each archer and the `<div>` containers for each archer's scorecard table. They do *not* fill in the scores themselves.
*   **`updateArcherScoreTable(archerIndex)`:** This is the heart of the UI. It's responsible for rendering the *entire* scorecard for a single archer.
    *   It intelligently iterates from End 1 to End 12.
    *   For each end, it generates a single `<tr>` (table row).
    *   **Crucially, it uses `readonly` `<input>` elements for scores.** This is the key to preventing the mobile keyboard from appearing while still allowing focus and custom keypad entry.
    *   As it builds the rows, it performs on-the-fly calculations for the `END` total.
    *   After rendering all arrow inputs, it calculates and injects the `TOT` (running total) and `AVG` for that end.
*   **`updateTotalsTable()`:** This function populates the summary table at the bottom, providing an overview of all archers. It runs after any score change.

#### 3.3. Event Handling & Data Flow (The "Nervous System")

This is how the rapid entry is achieved.

*   **Focus Handling:**
    *   `handleScoreInputFocus(e.target)`: When a user taps a score `input`, this function is triggered. It stores a reference to that specific input in the `currentlyFocusedInput` variable and displays the keypad.
*   **Keypad Logic:**
    *   `handleKeypadClick(event)`: When a keypad button is pressed:
        1.  It gets the score `value` from the button's `data-value` attribute.
        2.  It updates the `.value` of the `currentlyFocusedInput`.
        3.  It updates the in-memory `scores` array at the correct archer/round/arrow index.
        4.  It calls `focusNextInput()`.
*   **Rapid Entry (`focusNextInput` / `focusPreviousInput`):**
    *   These functions get all score inputs on the page into a list.
    *   They find the index of the `currentlyFocusedInput` in that list.
    *   They then simply call `.focus()` on the next (or previous) input in the list. This seamless handoff is what allows for continuous keypad entry across the entire scorecard.
*   **The Update Cascade:**
    *   The keypad's click handler calls `handleScoreChange()` after a value is entered.
    *   `handleScoreChange()` acts as a master controller:
        1.  Calls `updateArcherScoreTable()` to re-render the current archer's card with new totals and colors.
        2.  Calls `updateTotalsTable()` to update the summary view.
        3.  Calls `saveData()` to persist the new state to `localStorage`.

This event-driven, state-first architecture is why the original application is so robust and feels so responsive. It's a closed loop that ensures the data and the UI are always in sync. My refactoring effort broke this loop, which is what I must now fix. 