# Archery Score Management Suite: Development Roadmap

**Version:** 1.3
**Date:** 2025-09-16
**Status:** Updated

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
    6.  [Completed 2025-09-16] Introduce Ranking Round 300 default (10x3) and consolidate export actions under one modal; update home link.

### Phase 2: Complete Solo and Team Card Apps
*   **Goal:** 
*	Complete the Solo and Team Card applications with full functionality.
*   **Tasks:**
    1. **Complete Solo Card App:**
        * Implement set points calculation (first to 6 set points wins)
        * Add 1-arrow shoot-off handling for 5-5 ties
        * Complete scoring interface and match progression
        * Add export functionality
    2. **Complete Team Card App:**
        * Implement team scoring logic (6 arrows per team per end)
        * Add set points calculation (first to 5 set points wins)
        * Implement 3-arrow shoot-off for 4-4 ties
        * Add export functionality
    3. **Add Export Features:**
        * Create reusable "Save as Image" module
        * Create reusable "Copy as Text" module
        * Integrate with Solo and Team Card apps

### Phase 3: Comprehensive Tutorial System
*   **Goal:** 
*	Create detailed, step-by-step tutorials for each scoring application to improve user onboarding and reduce support requests.
*   **Tasks:**
    1. **Ranking Round Tutorial:**
        * Setup tutorial (Bale Number, Group Members, Scoring button)
        * Score entry tutorial (Navigate Ends, Score Card access)
        * Individual archer card navigation
        * Save and Send functionality
    2. **Solo Card Tutorial:**
        * Archer selection and setup
        * Match progression and set points
        * Shoot-off handling
        * Export and sharing
    3. **Team Card Tutorial:**
        * Team setup and archer assignment
        * Team scoring workflow
        * Shoot-off procedures
        * Results export
    4. **Practice App Tutorial:**
        * Target face interaction
        * Arrow placement and scoring
        * Group analysis features
        * Session management

### Phase 4: Advanced Features and Optimization
*   **Goal:** 
*	Implement advanced features and optimize performance for mobile use.
*   **Tasks:**
    1. **Performance Optimization:**
        * Optimize for offline use
        * Improve mobile responsiveness
        * Reduce loading times
    2. **Advanced Features:**
        * Data backup and restore
        * Advanced analytics
        * Custom scoring rules
    3. **Integration Features:**
        * Cloud sync capabilities
        * Multi-device support
        * API integration

### Phase 5: Documentation and Training
*   **Goal:** 
*	Complete comprehensive documentation and training materials.
*   **Tasks:**
    1. **User Documentation:**
        * Complete user manuals
        * Video tutorials
        * FAQ sections
    2. **Technical Documentation:**
        * API documentation
        * Deployment guides
        * Maintenance procedures
    3. **Training Materials:**
        * Coach training guides
        * Tournament official guides
        * Student training materials
