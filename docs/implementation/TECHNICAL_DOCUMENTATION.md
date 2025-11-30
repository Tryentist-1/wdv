# Technical Documentation: Archery Score Management Suite

**Version:** 1.0
**Date:** 2025-06-11

---

## 1. Overview

This document provides a technical overview of the four existing HTML applications in the Archery Score Management Suite. The suite is composed of four separate, single-page web applications, each designed for a specific archery scoring scenario. There is significant divergence in their implementation, including CSS, HTML structure, and JavaScript logic.

The primary goal of the current development phase (Phase 1 of the Roadmap) is to refactor these applications to use a shared codebase, a unified user interface, and consistent programming patterns.

---

## 2. Application Analysis

### 2.1. `score360.html` - Ranking Round Scorer

*   **Purpose:** Scores a standard 360-arrow ranking round for up to 4 archers.
*   **Corresponds to PRD:** App 2: Ranking Round Scorer.
*   **Structure:**
    *   A single HTML file with a minimal body structure.
    *   The UI (archer tabs, score tables) is dynamically generated at runtime.
    *   A setup modal is used to configure archer details before scoring begins.
*   **Styling:**
    *   Uses a single stylesheet: `css/score_app_style.css`.
*   **JavaScript:**
    *   Configuration is managed by a single `initConfig` object embedded in the HTML.
    *   All client-side logic is handled by `js/score-with-keypad.js`.
    *   Features a shared on-screen keypad for score entry.
*   **Key Refactoring Needs:**
    *   Integrate with the new master stylesheet.
    *   The dynamic UI generation logic is a good candidate for becoming a reusable component.
    *   The `initConfig` object should be replaced with a more robust state management solution.

### 2.2. `team_round.html` - Team Olympic Match Scorer

*   **Purpose:** Scores a head-to-head Olympic-style match between two teams of three archers.
*   **Corresponds to PRD:** App 4: Team Olympic Match Scorer.
*   **Structure:**
    *   The entire scorecard is a large, static HTML table.
    *   Each score input field and total cell has a unique `id`.
    *   The setup modal is part of the static HTML.
*   **Styling:**
    *   Uses two separate stylesheets: `css/score.css` and `css/team_round.css`.
*   **JavaScript:**
    *   Logic is handled by `js/team_round.js` and `js/common.js`.
    *   The code likely relies heavily on direct DOM manipulation using the unique IDs of each element.
    *   Uses an on-screen keypad for score input.
*   **Key Refactoring Needs:**
    *   This app is a prime candidate for complete refactoring. The static HTML table should be replaced with a dynamically generated one based on a template.
    *   CSS needs to be consolidated into the master stylesheet.
    *   JavaScript logic should be abstracted away from hardcoded element IDs.

### 2.3. `solo_round.html` - Solo Olympic Match Scorer

*   **Purpose:** Scores a head-to-head Olympic-style match between two individual archers.
*   **Corresponds to PRD:** App 3: Solo Olympic Match Scorer.
*   **Structure:**
    *   Very similar to `team_round.html`.
    *   The scorecard is a large, static HTML table with unique `id`s for all elements.
    *   Setup modal is also static HTML.
*   **Styling:**
    *   Uses `css/score.css` and `css/team_round.css`.
    *   Contains an inline `<style>` block for specific adjustments, indicating CSS fragmentation.
*   **JavaScript:**
    *   Assumed to use `js/solo_round.js` (needs verification).
    *   Logic is expected to be tightly coupled to the static HTML structure.
*   **Key Refactoring Needs:**
    *   Same as `team_round.html`. The structure and logic are so similar that they should both be generated from the same reusable components after refactoring.

### 2.4. `gemini-oneshot.html` - Interactive Olympic Scorer

*   **Purpose:** An interactive tool for an individual archer to score practice rounds by plotting arrow impacts on a graphical target.
*   **Corresponds to PRD:** App 1: Interactive Olympic Scorer.
*   **Structure:**
    *   A completely self-contained application.
    *   Uses the `p5.js` library to create an interactive `<canvas>` element.
*   **Styling:**
    *   All styles are defined within an internal `<style>` block in the `<head>` of the document.
*   **JavaScript:**
    *   All application logic is contained within a large `<script>` tag in the `<body>`.
    *   Does not use the shared keypad; input is via mouse clicks on the canvas.
    *   Includes advanced features like calculating the center of the arrow group and rescoring from a new center point.
*   **Key Refactoring Needs:**
    *   Due to its reliance on `p5.js`, a full code-level integration is not feasible.
    *   Refactoring should focus on UI/UX consistency: apply the master stylesheet to the non-canvas elements (header, buttons) to create a shared look and feel.
    *   The `p5.js` code itself is complex and should be isolated.

---

## 3. Key Technical Challenges & Recommendations

Based on the PRD and code review, the following technical challenges must be addressed during refactoring.

*   **Divergent Codebases:** The three main scoring apps (`score360`, `solo_round`, `team_round`) have three different approaches to UI generation and logic.
    *   **Recommendation:** Develop a single, unified model for generating scorecards. Create reusable JavaScript modules and CSS components that can be configured for each game type. The dynamic approach of `score360.html` is a better foundation than the static tables of the other two.

*   **CSS Fragmentation:** There are at least four separate CSS sources (`score_app_style.css`, `score.css`, `team_round.css`, and inline styles).
    *   **Recommendation:** As per the roadmap, create a single `master_style.css` (or similar) that all applications will use. It should contain a consistent design system (colors, fonts, spacing, components).

*   **State Management:** State is currently managed through a mix of embedded JS objects (`initConfig`) and direct DOM manipulation. The PRD requires state persistence.
    *   **Recommendation:** Implement a simple, unified state management pattern. For each app, a single JavaScript object should represent the entire state of the match. This object will be used to render the UI, and it will be saved to/loaded from the browser's `localStorage` to meet the persistence requirement.

*   **Core Logic Duplication:** Functions for parsing scores (e.g., 'X' -> 10, 'M' -> 0) and calculating totals are likely duplicated across the different JS files.
    *   **Recommendation:** Create a `common.js` or `utils.js` file for shared functions as outlined in the PRD, such as `parseScoreValue()` and `getScoreColor()`. These functions must be covered by unit tests. 