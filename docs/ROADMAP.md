# Archery Score Management Suite: Development Roadmap

**Version:** 1.1
**Date:** 2025-06-10
**Status:** Defined

---

This document outlines the planned phases for developing the Archery Score Management Suite.

Phase 0: Implement a Git structure for local and remote management

### Phase 1: Refactor CSS and Javascript and UX

*   **Goal:** 
*	Finalize the visual style and deliver the first complete app with core export features and a robust technical foundation.
*   **Tasks:**
	0. Create Technical Documentation of existing Apps in an .md file to be used for alignement
		Note any technical oddities in the code for analysis
	0. Create Unit Tests for core functions
    1.  **Create Master Stylesheet:** 
    Develop a structured `.css` that defines the shared visual theme (colors, fonts, tables, modals) for all apps.
    2.  **Refactor:**
        *   Apply the new master styles to `score360.html`, `team_round.html`, `solo_round.html` and as much as possible `gemini-one-shot.html`.
        *   Unify the approach to Keypad Entry for Score360 to align with team_round and solo_round.
    3.  **Implement Persistence:** 
    Add local storage functionality to save and load practice rounds.
    4.  **Implement Export Features:**
        *   Create a reusable JavaScript module for the "Save as Image" feature.
        *   Create a reusable JavaScript module for the "Copy as Text" feature.
    5.  **Final Review:** Polish the UI/UX and confirm all Ranking App requirements from the PRD are met.

### Phase 2: Refactor CSS and Javascript and UX
*   **Goal:** 
*	Implement a new separate version with shared backend of data for archers, schools, rounds and scores.
