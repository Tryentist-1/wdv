# Complete Inventory: ranking_round_300.html
**Date:** November 7, 2025  
**Purpose:** Exhaustive documentation of every UI element, pattern, and styling approach

---

## 📋 Table of Contents
1. [HTML Structure](#html-structure)
2. [Views & Layouts](#views--layouts)
3. [Tables](#tables)
4. [Buttons](#buttons)
5. [Forms & Inputs](#forms--inputs)
6. [Modals](#modals)
7. [Inline Styles Audit](#inline-styles-audit)
8. [JavaScript-Generated HTML](#javascript-generated-html)
9. [Component Patterns](#component-patterns)
10. [Proposed Unified Classes](#proposed-unified-classes)

---

## 1. HTML Structure

### Root Container
```html
<div id="app-container" class="main-container">
```
- **Purpose:** Main application wrapper
- **Current styling:** From main.css
- **Proposed:** `.app-container` (semantic, reusable)

---

## 2. Views & Layouts

### A. Setup View
**Location:** Lines 35-86  
**ID:** `#setup-view`  
**Display:** Default visible

#### Components:
1. **Page Header** (lines 36-43)
   ```html
   <div class="page-header">
       <h1>Setup Bale</h1>
       <div class="event-selector-setup">
           <button class="btn btn-secondary" style="padding: 0.5rem 1rem;">
   ```
   - ❌ **Inline style:** `style="padding: 0.5rem 1rem;"`
   - **Purpose:** Adjust button padding
   - **Proposed:** `.btn-compact` modifier class

2. **Manual Setup Section** (lines 46-70)
   - **ID:** `#manual-setup-section`
   - **Class:** `.setup-section`
   - ❌ **Inline style:** `style="display: none;"`
   - **Proposed:** Use `.is-hidden` utility class

   **Sub-components:**
   - `.manual-setup-card` - Card container
   - `.manual-bale-section` - Bale selection area
   - `.manual-bale-header` - Header with actions
   - `.manual-bale-label` - Label text
   - `.manual-bale-actions` - Button group
   - `.manual-bale-grid` - Bale number grid (JS-generated)
   - `.manual-search-section` - Search and counter
   - `.archer-search-manual` - Search wrapper
   - `.archer-search-bar` - Search input
   - `.selection-indicator` - Selected count chip

3. **Pre-assigned Setup Section** (lines 73-80)
   - **ID:** `#preassigned-setup-section`
   - **Class:** `.setup-section`
   - ❌ **Inline style:** `style="display: none;"`
   - **Container:** `#bale-list-container` (JS-populated)

4. **Archer Setup Container** (lines 84-85)
   - **ID:** `#archer-setup-container`
   - **Purpose:** JS-generated archer selection table

---

### B. Scoring View
**Location:** Lines 88-108  
**ID:** `#scoring-view`  
❌ **Inline style:** `style="display: none;"`

#### Components:
1. **Page Header** (lines 89-100)
   ```html
   <div class="page-header">
       <div class="header-left">
           <h1>R300 - E<span id="current-end-display">1</span></h1>
           <span class="status-badge status-off">Not Live Scoring</span>
       </div>
       <div class="header-right">
           <div style="font-size: 0.9em; color: #666; text-align: right;">
   ```
   - ❌ **Inline style:** `style="font-size: 0.9em; color: #666; text-align: right;"`
   - **Purpose:** Event info styling
   - **Proposed:** `.event-info-display` class

2. **Scoring Table Container** (lines 101-102)
   - **ID:** `#bale-scoring-container`
   - **Class:** `.table-wrapper`
   - **Content:** JS-generated scoring table

3. **Controls Container** (lines 103-107)
   ```html
   <div class="controls-container">
       <button id="prev-end-btn" class="btn btn-secondary">← E</button>
       <button id="next-end-btn" class="btn btn-success">E →</button>
       <button id="complete-round-btn" class="btn btn-primary" style="display: none;">
   ```
   - ❌ **Inline style:** `style="display: none;"`
   - **Proposed:** `.is-hidden` utility

---

### C. Card View
**Location:** Lines 110-128  
**ID:** `#card-view`  
**Class:** `.view`  
❌ **Inline style:** `style="display: none;"`

#### Components:
1. **View Header** (lines 111-117)
   ```html
   <header class="view-header">
       <h2 id="card-view-archer-name"></h2>
       <div class="card-details">
   ```
   - **Classes:** `.view-header`, `.card-details`
   - ✅ **Good:** Semantic classes, no inline styles

2. **Card Container** (lines 119-120)
   - **ID:** `#individual-card-container`
   - **Content:** JS-generated scorecard table

3. **View Footer** (lines 122-127)
   ```html
   <footer class="view-footer">
       <button id="back-to-scoring-btn" class="btn btn-primary">← Scoring</button>
       <button id="export-btn" class="btn btn-success">Export</button>
       <button id="prev-archer-btn" class="btn">← Prev</button>
       <button id="next-archer-btn" class="btn">Next →</button>
   </footer>
   ```
   - ✅ **Good:** Clean, semantic classes
   - **Note:** These are card-specific, not global footer buttons

---

## 3. Tables

### A. Setup Table (JS-Generated)
**Location:** `js/ranking_round_300.js` lines 960-984  
**Purpose:** Archer selection in setup view

#### Structure:
```html
<table>
    <thead>
        <tr>
            <th>Archer Name</th>
            <th>School</th>
            <th>Division</th>
            <th>Bale</th>
            <th>Target</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Name</td>
            <td>School</td>
            <td>Division</td>
            <td>Bale</td>
            <td>Target</td>
        </tr>
    </tbody>
</table>
```

#### Issues:
- ❌ No table class
- ❌ No cell classes
- ❌ No responsive design
- ❌ No mobile optimization

#### Proposed Classes:
```html
<table class="table table-setup">
    <thead class="table-header">
        <tr class="table-row">
            <th class="table-cell table-cell-header">Archer Name</th>
            ...
        </tr>
    </thead>
    <tbody class="table-body">
        <tr class="table-row table-row-selectable">
            <td class="table-cell">Name</td>
            ...
        </tr>
    </tbody>
</table>
```

---

### B. Scoring Table (JS-Generated)
**Location:** `js/ranking_round_300.js` lines 2164-2229  
**Purpose:** Main bale scoring interface

#### Current Structure:
```html
<table class="score-table">
    <thead>
        <tr>
            <th>Archer</th>
            <th>A1</th><th>A2</th><th>A3</th>
            <th>10s</th><th>X</th><th>End</th><th>Run</th><th>Avg</th>
            <th style="width: 30px;">⟳</th>  <!-- If live enabled -->
            <th>Card</th>
        </tr>
    </thead>
    <tbody>
        <tr data-archer-id="123" data-locked="false">
            <td>Name (A)</td>
            <td><input type="text" class="score-input score-gold" data-archer-id="123" data-arrow-idx="0" value="10" readonly></td>
            <td><input type="text" class="score-input score-gold" data-archer-id="123" data-arrow-idx="1" value="10" readonly></td>
            <td><input type="text" class="score-input score-gold" data-archer-id="123" data-arrow-idx="2" value="10" readonly></td>
            <td class="calculated-cell">3</td>  <!-- 10s -->
            <td class="calculated-cell">0</td>  <!-- Xs -->
            <td class="calculated-cell">30</td> <!-- End total -->
            <td class="calculated-cell">30</td> <!-- Running total -->
            <td class="calculated-cell score-gold">10.0</td> <!-- Average -->
            <td class="sync-status-indicator sync-status-ok" style="text-align: center;">✓</td>
            <td><span class="status-badge" style="background:#2ecc71;color:#fff;">VER</span><button class="btn view-card-btn" data-archer-id="123">📄</button></td>
        </tr>
    </tbody>
</table>
```

#### Issues:
- ❌ **Inline style:** `style="width: 30px;"` on sync column header
- ❌ **Inline style:** `style="text-align: center;"` on sync status cell
- ❌ **Inline style:** `style="background:#2ecc71;color:#fff;"` on status badge
- ❌ Mixed use of classes and inline styles
- ❌ No column-specific classes (can't target "End" column easily)
- ❌ No row state classes (locked, pending, verified)

#### Proposed Structure:
```html
<table class="table table-scoring">
    <thead class="table-header table-header-sticky">
        <tr class="table-row">
            <th class="table-cell table-cell-header table-cell-name">Archer</th>
            <th class="table-cell table-cell-header table-cell-arrow">A1</th>
            <th class="table-cell table-cell-header table-cell-arrow">A2</th>
            <th class="table-cell table-cell-header table-cell-arrow">A3</th>
            <th class="table-cell table-cell-header table-cell-count">10s</th>
            <th class="table-cell table-cell-header table-cell-count">X</th>
            <th class="table-cell table-cell-header table-cell-total table-cell-bold">End</th>
            <th class="table-cell table-cell-header table-cell-total">Run</th>
            <th class="table-cell table-cell-header table-cell-avg">Avg</th>
            <th class="table-cell table-cell-header table-cell-sync">⟳</th>
            <th class="table-cell table-cell-header table-cell-actions">Card</th>
        </tr>
    </thead>
    <tbody class="table-body">
        <tr class="table-row" data-archer-id="123" data-state="active">
            <td class="table-cell table-cell-name table-cell-sticky">Name (A)</td>
            <td class="table-cell table-cell-input">
                <input type="text" class="score-input score-gold" data-archer-id="123" data-arrow-idx="0" value="10" readonly>
            </td>
            <td class="table-cell table-cell-input">
                <input type="text" class="score-input score-gold" data-archer-id="123" data-arrow-idx="1" value="10" readonly>
            </td>
            <td class="table-cell table-cell-input">
                <input type="text" class="score-input score-gold" data-archer-id="123" data-arrow-idx="2" value="10" readonly>
            </td>
            <td class="table-cell table-cell-calculated">3</td>
            <td class="table-cell table-cell-calculated">0</td>
            <td class="table-cell table-cell-calculated table-cell-bold">30</td>
            <td class="table-cell table-cell-calculated">30</td>
            <td class="table-cell table-cell-calculated score-gold">10.0</td>
            <td class="table-cell table-cell-sync sync-status-ok">✓</td>
            <td class="table-cell table-cell-actions">
                <span class="status-badge status-verified">VER</span>
                <button class="btn btn-sm btn-icon" data-archer-id="123">📄</button>
            </td>
        </tr>
        <tr class="table-row table-row-locked" data-archer-id="124" data-state="locked">
            <!-- Locked row -->
        </tr>
    </tbody>
</table>
```

---

### C. Card View Table (JS-Generated)
**Location:** `js/ranking_round_300.js` lines 2264-2314  
**Purpose:** Individual archer scorecard

#### Current Structure:
```html
<table class="score-table" data-archer-id="123">
    <thead>
        <tr>
            <th>E</th>
            <th>A1</th><th>A2</th><th>A3</th>
            <th>10s</th><th>Xs</th>
            <th>END</th><th>RUN</th><th>AVG</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>1</td>
            <td class="score-cell score-gold">10</td>
            <td class="score-cell score-gold">10</td>
            <td class="score-cell score-gold">10</td>
            <td class="calculated-cell">3</td>
            <td class="calculated-cell">0</td>
            <td class="calculated-cell">30</td>
            <td class="calculated-cell">30</td>
            <td class="calculated-cell score-cell score-gold">10.0</td>
        </tr>
    </tbody>
    <tfoot>
        <tr>
            <td colspan="4" style="text-align: right; font-weight: bold;">Round Totals:</td>
            <td class="calculated-cell">30</td>
            <td class="calculated-cell">0</td>
            <td class="calculated-cell"></td>
            <td class="calculated-cell">300</td>
            <td class="calculated-cell score-cell score-gold">10.0</td>
        </tr>
    </tfoot>
</table>
```

#### Issues:
- ❌ **Inline style:** `style="text-align: right; font-weight: bold;"` on footer cell
- ❌ Inconsistent use of `.score-cell` vs `.calculated-cell`
- ❌ No column-specific classes

#### Proposed Structure:
```html
<table class="table table-card" data-archer-id="123">
    <thead class="table-header table-header-sticky">
        <tr class="table-row">
            <th class="table-cell table-cell-header table-cell-end-num">E</th>
            <th class="table-cell table-cell-header table-cell-arrow">A1</th>
            <th class="table-cell table-cell-header table-cell-arrow">A2</th>
            <th class="table-cell table-cell-header table-cell-arrow">A3</th>
            <th class="table-cell table-cell-header table-cell-count">10s</th>
            <th class="table-cell table-cell-header table-cell-count">Xs</th>
            <th class="table-cell table-cell-header table-cell-total table-cell-bold">END</th>
            <th class="table-cell table-cell-header table-cell-total">RUN</th>
            <th class="table-cell table-cell-header table-cell-avg">AVG</th>
        </tr>
    </thead>
    <tbody class="table-body">
        <tr class="table-row">
            <td class="table-cell table-cell-end-num">1</td>
            <td class="table-cell table-cell-score score-gold">10</td>
            <td class="table-cell table-cell-score score-gold">10</td>
            <td class="table-cell table-cell-score score-gold">10</td>
            <td class="table-cell table-cell-calculated">3</td>
            <td class="table-cell table-cell-calculated">0</td>
            <td class="table-cell table-cell-calculated table-cell-bold">30</td>
            <td class="table-cell table-cell-calculated">30</td>
            <td class="table-cell table-cell-calculated table-cell-avg score-gold">10.0</td>
        </tr>
    </tbody>
    <tfoot class="table-footer">
        <tr class="table-row table-row-totals">
            <td class="table-cell table-cell-label" colspan="4">Round Totals:</td>
            <td class="table-cell table-cell-calculated">30</td>
            <td class="table-cell table-cell-calculated">0</td>
            <td class="table-cell table-cell-calculated"></td>
            <td class="table-cell table-cell-calculated">300</td>
            <td class="table-cell table-cell-calculated table-cell-avg score-gold">10.0</td>
        </tr>
    </tfoot>
</table>
```

---

## 4. Buttons

### Button Types Found:

#### A. Primary Actions
```html
<button class="btn btn-primary">
```
**Uses:**
- "Start Scoring" (setup view)
- "Complete Round" (scoring view)
- "← Scoring" (card view)
- "Connect to Event" (modal)
- "Setup" (global footer)

#### B. Secondary Actions
```html
<button class="btn btn-secondary">
```
**Uses:**
- "← E" (prev end)
- "Home" (global footer)
- "Cancel" (modals)
- Event selector button

#### C. Success Actions
```html
<button class="btn btn-success">
```
**Uses:**
- "E →" (next end)
- "Live: On" toggle
- "Export" (card view)
- "Open Verify" (export modal)
- "Send SMS" (verify modal)
- "Email Coach" (export modal)

#### D. Danger Actions
```html
<button class="btn btn-danger">
```
**Uses:**
- "Reset" (reset modal)

#### E. Special Colors
```html
<button class="btn btn-purple">   <!-- Screenshot -->
<button class="btn btn-orange">   <!-- Download JSON -->
```

#### F. Icon/Small Buttons
```html
<button class="btn view-card-btn" data-archer-id="123">📄</button>
```
**Issues:**
- ❌ No size modifier class
- ❌ Custom class name instead of `.btn-sm .btn-icon`

#### G. Tab Buttons
```html
<button class="tab-btn active" style="...">
```
❌ **Inline styles** for tab styling

---

### Button Issues Summary:
1. ❌ **Inline styles** on many buttons (padding, width, display)
2. ❌ Inconsistent size modifiers (no `.btn-sm`, `.btn-lg`)
3. ❌ Custom button classes (`.view-card-btn`) instead of modifiers
4. ❌ Tab buttons have extensive inline styles
5. ❌ No `.btn-group` wrapper for related buttons

---

### Proposed Button System:

```css
/* Base */
.btn                    /* Base button */
.btn-sm                 /* Small (icon buttons, compact) */
.btn-lg                 /* Large (primary actions) */

/* Variants */
.btn-primary            /* Primary action (blue) */
.btn-secondary          /* Secondary action (gray) */
.btn-success            /* Success/confirm (green) */
.btn-danger             /* Danger/delete (red) */
.btn-warning            /* Warning (yellow) */
.btn-info               /* Info (cyan) */
.btn-purple             /* Purple variant */
.btn-orange             /* Orange variant */

/* Modifiers */
.btn-icon               /* Icon-only button */
.btn-block              /* Full width */
.btn-outline            /* Outline variant */

/* States */
.btn:hover              /* Hover state */
.btn:active             /* Active/pressed state */
.btn:disabled           /* Disabled state */
.btn.is-active          /* Active toggle state */
.btn.is-loading         /* Loading state */

/* Groups */
.btn-group              /* Button group container */
.btn-group-vertical     /* Vertical button group */
```

---

## 5. Forms & Inputs

### Input Types Found:

#### A. Score Inputs (in tables)
```html
<input type="text" 
       class="score-input score-gold locked-score-input" 
       data-archer-id="123" 
       data-arrow-idx="0" 
       value="10" 
       readonly
       data-locked="true"
       tabindex="-1"
       disabled>
```

**Classes:**
- `.score-input` - Base score input
- `.score-gold` / `.score-red` / etc. - Color classes
- `.locked-score-input` - Locked state

**Issues:**
- ❌ Uses both `readonly`, `disabled`, and `data-locked` attributes
- ❌ No consistent state management
- ✅ Good: Uses data attributes for JS hooks

#### B. Text Inputs (search, forms)
```html
<input type="text" 
       id="archer-search-manual" 
       placeholder="Search archers..." 
       class="archer-search-bar">

<input type="text" 
       id="event-code-input" 
       placeholder="Enter event code..." 
       style="width: 100%; padding: 0.75rem; font-size: 1rem; border: 2px solid #ddd; border-radius: 4px; margin-bottom: 1rem;">
```

**Issues:**
- ❌ **Extensive inline styles** on event code input
- ❌ Custom class `.archer-search-bar` instead of `.form-control`
- ❌ No consistent form styling

#### C. Number Inputs
```html
<input type="number" 
       id="bale-number-input-manual" 
       min="1" 
       max="99" 
       value="1" 
       class="manual-bale-input-visually-hidden">
```

**Issues:**
- ❌ Custom class for hiding instead of utility class
- ✅ Good: Uses proper input type and constraints

---

### Proposed Form System:

```css
/* Form Groups */
.form-group             /* Form field wrapper */
.form-row               /* Horizontal field layout */
.form-label             /* Field label */
.form-help              /* Help text */
.form-error             /* Error message */

/* Form Controls */
.form-control           /* Base input/select/textarea */
.form-control-sm        /* Small input */
.form-control-lg        /* Large input */

/* Input States */
.form-control:focus     /* Focus state */
.form-control:disabled  /* Disabled state */
.form-control.is-valid  /* Valid state */
.form-control.is-invalid /* Invalid state */

/* Special Inputs */
.score-input            /* Score entry input */
.score-input:focus      /* Score input focus */
.score-input.is-locked  /* Locked score input */

/* Search */
.search-bar             /* Search input */
.search-wrapper         /* Search container */
```

---

## 6. Modals

### Modals Found:

#### A. Event Selection Modal (lines 131-168)
```html
<div id="event-modal" class="modal-overlay" style="display: none;">
    <div class="modal-content" style="max-width: 500px; max-height: 80vh; overflow-y: auto;">
        <h2 style="margin-bottom: 1rem;">Connect to Event</h2>
        <!-- Tab navigation with inline styles -->
        <!-- Content with inline styles -->
        <button class="btn btn-secondary" style="width: 100%; margin-top: 1rem;">
```

**Issues:**
- ❌ **Inline style:** `style="display: none;"` on overlay
- ❌ **Inline style:** `style="max-width: 500px; max-height: 80vh; overflow-y: auto;"` on content
- ❌ **Inline styles** throughout content (margins, padding, colors)
- ❌ **Inline styles** on tab buttons (flex, padding, borders)
- ❌ **Inline styles** on form elements

#### B. Reset Modal (lines 170-180)
```html
<div id="reset-modal" class="modal-overlay" style="display: none;">
    <div class="modal-content">
        <h2>New R300?</h2>
        <p>Current scores will be deleted.</p>
        <div class="modal-buttons">
```

**Issues:**
- ❌ **Inline style:** `style="display: none;"`
- ✅ Good: Uses semantic classes (`.modal-buttons`)

#### C. Verify Totals Modal (lines 182-192)
Similar structure to reset modal

#### D. Export Modal (lines 194-224)
```html
<div id="export-modal" class="modal-overlay" style="display: none;">
    <div class="modal-content">
        <h2>Export Options</h2>
        <div class="export-options">
            <div class="export-option">
                <h3>✅ Verify & Send</h3>
                <p>Review bale totals and send via SMS</p>
                <button class="btn btn-success">Open Verify</button>
```

**Issues:**
- ❌ **Inline style:** `style="display: none;"`
- ✅ Good: Uses semantic classes (`.export-options`, `.export-option`)

---

### Proposed Modal System:

```css
/* Modal Structure */
.modal-overlay          /* Backdrop */
.modal-overlay.is-open  /* Visible state */
.modal-content          /* Modal container */
.modal-content-sm       /* Small modal */
.modal-content-md       /* Medium modal (default) */
.modal-content-lg       /* Large modal */
.modal-content-full     /* Full screen modal */

/* Modal Sections */
.modal-header           /* Header section */
.modal-body             /* Content section */
.modal-footer           /* Footer/actions section */

/* Modal Components */
.modal-title            /* Title */
.modal-close            /* Close button */
.modal-tabs             /* Tab navigation */
.modal-tab              /* Individual tab */
.modal-tab.is-active    /* Active tab */
```

---

## 7. Inline Styles Audit

### Summary by Type:

#### A. Display Control (Most Common)
```html
style="display: none;"          <!-- 8 instances -->
```
**Solution:** Use `.is-hidden` utility class

#### B. Layout/Sizing
```html
style="padding: 0.5rem 1rem;"
style="max-width: 500px; max-height: 80vh; overflow-y: auto;"
style="width: 100%; margin-top: 1rem;"
style="width: 30px;"
```
**Solution:** Create modifier classes or use CSS custom properties

#### C. Typography
```html
style="font-size: 0.9em; color: #666; text-align: right;"
style="margin-bottom: 1rem;"
style="color: #666; margin-bottom: 1rem;"
```
**Solution:** Create semantic classes (`.event-info`, `.modal-title`, etc.)

#### D. Flexbox/Grid
```html
style="display: flex; gap: 0.5rem; margin-bottom: 1rem; border-bottom: 2px solid #ddd;"
style="flex: 1; padding: 0.75rem; background: none; border: none; border-bottom: 3px solid #2d7dd9;"
```
**Solution:** Create tab component classes

#### E. Form Styling
```html
style="width: 100%; padding: 0.75rem; font-size: 1rem; border: 2px solid #ddd; border-radius: 4px; margin-bottom: 1rem;"
```
**Solution:** Use `.form-control` class

#### F. Colors/Backgrounds
```html
style="background:#2ecc71;color:#fff;"
style="background:#f1c40f;color:#fff;"
```
**Solution:** Use status badge variant classes

---

### Complete Inline Style List:

1. **Line 39:** `style="padding: 0.5rem 1rem;"` - Button padding
2. **Line 46:** `style="display: none;"` - Section visibility
3. **Line 73:** `style="display: none;"` - Section visibility
4. **Line 88:** `style="display: none;"` - View visibility
5. **Line 95:** `style="font-size: 0.9em; color: #666; text-align: right;"` - Event info
6. **Line 106:** `style="display: none;"` - Button visibility
7. **Line 110:** `style="display: none;"` - View visibility
8. **Line 131:** `style="display: none;"` - Modal visibility
9. **Line 132:** `style="max-width: 500px; max-height: 80vh; overflow-y: auto;"` - Modal sizing
10. **Line 133:** `style="margin-bottom: 1rem;"` - Title spacing
11. **Line 136:** `style="display: flex; gap: 0.5rem; margin-bottom: 1rem; border-bottom: 2px solid #ddd;"` - Tab container
12. **Line 137:** `style="flex: 1; padding: 0.75rem; background: none; border: none; border-bottom: 3px solid #2d7dd9; cursor: pointer; font-weight: bold;"` - Active tab
13. **Line 140:** `style="flex: 1; padding: 0.75rem; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer;"` - Inactive tab
14. **Line 147:** `style="color: #666; margin-bottom: 1rem;"` - Help text
15. **Line 149:** `style="width: 100%; padding: 0.75rem; font-size: 1rem; border: 2px solid #ddd; border-radius: 4px; margin-bottom: 1rem;"` - Input
16. **Line 150:** `style="width: 100%;"` - Button width
17. **Line 153:** `style="color: #f44336; margin-top: 0.5rem; display: none;"` - Error message
18. **Line 157:** `style="display: none;"` - Tab content visibility
19. **Line 158:** `style="color: #666; margin-bottom: 1rem;"` - Help text
20. **Line 159:** `style="max-height: 300px; overflow-y: auto;"` - List container
21. **Line 164:** `style="width: 100%; margin-top: 1rem;"` - Button
22. **Line 170:** `style="display: none;"` - Modal visibility
23. **Line 182:** `style="display: none;"` - Modal visibility
24. **Line 194:** `style="display: none;"` - Modal visibility
25. **Line 226:** `style="display: none;"` - Keypad visibility
26. **Line 228:** `style="justify-content: space-between;"` - Footer layout

**Plus JavaScript-generated inline styles:**
- Status badge colors (background, color)
- Sync status cell alignment
- Table column widths
- Row lock states

---

## 8. JavaScript-Generated HTML

### Key Patterns:

#### A. Bale Grid (Manual Setup)
**Function:** Generates bale number buttons  
**Location:** JS creates `.manual-bale-tile` elements  
**Issues:** Likely has inline styles for active state

#### B. Archer Selection Table
**Function:** Displays archer list for selection  
**Location:** Populates `#archer-setup-container`  
**Structure:** Table with checkboxes and target assignment

#### C. Scoring Table
**Function:** Main bale scoring interface  
**Location:** Populates `#bale-scoring-container`  
**Issues:**
- Inline styles on sync column header
- Inline styles on sync status cells
- Inline styles on status badges
- Mixed class/inline style approach

#### D. Card View Table
**Function:** Individual archer scorecard  
**Location:** Populates `#individual-card-container`  
**Issues:**
- Inline styles on footer row
- Inline styles on status badges

#### E. Event List
**Function:** Displays available events  
**Location:** Populates `#event-list`  
**Issues:** Likely has inline styles for event items

---

## 9. Component Patterns

### Identified Reusable Patterns:

#### 1. **Tables**
- Setup table (archer selection)
- Scoring table (bale view)
- Card table (individual scorecard)
- Verify table (totals summary)

**Common needs:**
- Sticky headers
- Sticky first column
- Responsive column hiding
- Row states (selected, locked, highlighted)
- Cell types (input, calculated, header)

#### 2. **Buttons**
- Action buttons (primary, secondary, success, danger)
- Size variants (small, default, large)
- Icon buttons
- Button groups
- Toggle buttons (Live On/Off)

#### 3. **Status Indicators**
- Status badges (VER, VOID, PENDING)
- Sync status icons (✓, ⟳, ✗)
- Live status badge

#### 4. **Forms**
- Search bars
- Text inputs
- Number inputs
- Select dropdowns
- Form groups with labels

#### 5. **Modals**
- Standard modal (reset, verify)
- Form modal (event selection)
- Content modal (export options)
- Tab modal (event selection)

#### 6. **Layouts**
- Page header (with title and actions)
- View header (card view)
- Content area (scrollable)
- Controls bar (sticky bottom)
- Global footer

#### 7. **Cards**
- Setup cards (manual, pre-assigned)
- Export option cards
- Bale list items

---

## 10. Proposed Unified Classes

### Complete Class System:

```css
/* ======================
   LAYOUT
   ====================== */
.app-container          /* Main app wrapper */
.view                   /* Full-page view */
.view.is-active         /* Active view */

/* Headers */
.page-header            /* Page-level header */
.page-header-title      /* Page title */
.page-header-actions    /* Header action buttons */
.view-header            /* View-level header */
.section-header         /* Section header */

/* Content Areas */
.content-area           /* Scrollable content */
.content-wrapper        /* Content wrapper */
.table-wrapper          /* Table container */

/* Controls */
.controls-bar           /* Sticky control bar */
.controls-group         /* Button group in controls */

/* Footer */
.global-footer          /* Global footer */
.view-footer            /* View-specific footer */

/* ======================
   TABLES
   ====================== */
/* Base */
.table                  /* Base table */
.table-setup            /* Setup variant */
.table-scoring          /* Scoring variant */
.table-card             /* Card variant */
.table-summary          /* Summary variant */

/* Structure */
.table-header           /* thead */
.table-header-sticky    /* Sticky header */
.table-body             /* tbody */
.table-footer           /* tfoot */
.table-row              /* tr */
.table-cell             /* td/th */

/* Cell Types */
.table-cell-header      /* Header cell */
.table-cell-name        /* Name column */
.table-cell-arrow       /* Arrow score column */
.table-cell-count       /* Count column (10s, Xs) */
.table-cell-total       /* Total column */
.table-cell-avg         /* Average column */
.table-cell-sync        /* Sync status column */
.table-cell-actions     /* Actions column */
.table-cell-input       /* Input cell */
.table-cell-calculated  /* Calculated cell */
.table-cell-score       /* Score display cell */

/* Cell Modifiers */
.table-cell-sticky      /* Sticky cell */
.table-cell-bold        /* Bold cell */
.table-cell-center      /* Center aligned */
.table-cell-right       /* Right aligned */

/* Row States */
.table-row-selectable   /* Selectable row */
.table-row-selected     /* Selected row */
.table-row-locked       /* Locked row */
.table-row-highlighted  /* Highlighted row */
.table-row-totals       /* Totals row */

/* ======================
   BUTTONS
   ====================== */
/* Base */
.btn                    /* Base button */
.btn-sm                 /* Small */
.btn-lg                 /* Large */

/* Variants */
.btn-primary            /* Primary (blue) */
.btn-secondary          /* Secondary (gray) */
.btn-success            /* Success (green) */
.btn-danger             /* Danger (red) */
.btn-warning            /* Warning (yellow) */
.btn-info               /* Info (cyan) */
.btn-purple             /* Purple */
.btn-orange             /* Orange */

/* Modifiers */
.btn-icon               /* Icon button */
.btn-block              /* Full width */
.btn-outline            /* Outline variant */

/* States */
.btn.is-active          /* Active state */
.btn.is-loading         /* Loading state */
.btn:disabled           /* Disabled */

/* Groups */
.btn-group              /* Button group */
.btn-group-vertical     /* Vertical group */

/* ======================
   FORMS
   ====================== */
/* Structure */
.form-group             /* Form field group */
.form-row               /* Horizontal layout */
.form-label             /* Label */
.form-help              /* Help text */
.form-error             /* Error message */

/* Controls */
.form-control           /* Base input/select/textarea */
.form-control-sm        /* Small */
.form-control-lg        /* Large */

/* States */
.form-control:focus     /* Focus */
.form-control:disabled  /* Disabled */
.form-control.is-valid  /* Valid */
.form-control.is-invalid /* Invalid */

/* Special */
.score-input            /* Score input */
.score-input.is-locked  /* Locked score */
.search-bar             /* Search input */

/* ======================
   MODALS
   ====================== */
/* Structure */
.modal-overlay          /* Backdrop */
.modal-overlay.is-open  /* Visible */
.modal-content          /* Container */
.modal-content-sm       /* Small */
.modal-content-md       /* Medium */
.modal-content-lg       /* Large */

/* Sections */
.modal-header           /* Header */
.modal-body             /* Content */
.modal-footer           /* Footer */

/* Components */
.modal-title            /* Title */
.modal-close            /* Close button */
.modal-tabs             /* Tab nav */
.modal-tab              /* Tab */
.modal-tab.is-active    /* Active tab */

/* ======================
   CARDS
   ====================== */
.card                   /* Base card */
.card-header            /* Card header */
.card-body              /* Card content */
.card-footer            /* Card footer */
.card-title             /* Card title */

/* ======================
   STATUS & BADGES
   ====================== */
/* Status Badges */
.status-badge           /* Base badge */
.status-verified        /* Verified (green) */
.status-void            /* Void (red) */
.status-pending         /* Pending (yellow) */
.status-off             /* Off (gray) */

/* Sync Status */
.sync-status            /* Base sync status */
.sync-status-ok         /* Synced (✓) */
.sync-status-pending    /* Syncing (⟳) */
.sync-status-error      /* Error (✗) */

/* ======================
   UTILITIES
   ====================== */
/* Display */
.is-hidden              /* display: none */
.is-visible             /* display: block */

/* Text */
.text-center            /* Center text */
.text-right             /* Right text */
.text-left              /* Left text */
.text-bold              /* Bold text */

/* Spacing */
.mt-1, .mt-2, .mt-3     /* Margin top */
.mb-1, .mb-2, .mb-3     /* Margin bottom */
.p-1, .p-2, .p-3        /* Padding */

/* States */
.is-active              /* Active state */
.is-disabled            /* Disabled state */
.is-loading             /* Loading state */
.is-locked              /* Locked state */
```

---

## 📊 Summary Statistics

### Current State:
- **Total inline styles in HTML:** 26
- **Total inline styles in JS:** ~111
- **Total unique classes used:** 150
- **Total unique classes defined:** 187
- **Unused classes:** 37

### Target State:
- **Inline styles in HTML:** 0
- **Inline styles in JS:** 0 (only class toggles)
- **Reusable component classes:** ~80-100
- **Utility classes:** ~20-30
- **Module-specific classes:** 0

---

## 🎯 Next Steps

1. **Review this inventory** - Confirm patterns and proposed classes
2. **Create component test page** - Build all components in isolation
3. **Refactor JavaScript** - Remove inline styles, use class toggles
4. **Migrate HTML** - Replace inline styles with classes
5. **Test thoroughly** - Verify all functionality preserved
6. **Document system** - Create usage guide

---

## ✅ Success Criteria

- [ ] Zero inline styles in HTML
- [ ] Zero inline styles in JavaScript
- [ ] All tables use same base classes
- [ ] All buttons use same base classes
- [ ] All modals use same base classes
- [ ] All forms use same base classes
- [ ] Mobile responsive (44px touch targets)
- [ ] Theme-ready (all colors from tokens)
- [ ] Easy to replicate to other modules

---

**END OF INVENTORY**

