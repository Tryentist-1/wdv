# Complete CSS & HTML Audit - Archery Score Management

> **⚠️ DEPRECATED - ARCHIVED November 17, 2025**
> 
> **Reason:** Audit completed, design system implemented
> 
> This file is kept for historical reference only. The audit results informed the current design system implementation.

---

**Date:** November 7, 2025  
**Purpose:** Comprehensive analysis before unified design system implementation

---

## Current State Analysis

### Existing CSS Files
1. **tokens.css** (12KB) - ✅ NEW - Design tokens foundation
2. **components.css** (17KB) - ✅ NEW - Component library
3. **score-colors.css** (11KB) - ✅ NEW - Score color system
4. **main.css** (35KB) - ❌ LEGACY - Needs analysis
5. **score.css** (8KB) - ❌ LEGACY - Feature-specific
6. **team_round.css** (14KB) - ❌ LEGACY - Feature-specific
7. **keypad.css** (3KB) - ❌ LEGACY - Keypad styles
8. **keypad-css-button-fix.css** (1KB) - ❌ LEGACY - Keypad fixes

### HTML Files to Audit
1. **ranking_round_300.html** - Primary scoring interface
2. **solo_card.html** - Solo match scoring
3. **team_card.html** - Team match scoring
4. **archer_list.html** - Archer management
5. **coach.html** - Coach dashboard
6. **index.html** - Landing page

---

## Step 2: Deep Dive Analysis Required

### What We Need to Document

#### A. All HTML Elements & Their Current Styling
For each HTML file, catalog:
- [ ] Tables (structure, headers, cells, classes)
- [ ] Buttons (types, states, locations)
- [ ] Headers (page, section, view)
- [ ] Modals (structure, content, controls)
- [ ] Forms (inputs, selects, labels)
- [ ] Layout containers (divs, sections, wrappers)
- [ ] Navigation elements
- [ ] Status indicators

#### B. All CSS Classes Currently Used
- [ ] Extract all class names from HTML
- [ ] Map which CSS file defines each class
- [ ] Identify duplicates across files
- [ ] Find unused classes
- [ ] Document inline styles

#### C. All JavaScript-Generated HTML
- [ ] Identify where JS creates HTML strings
- [ ] Document inline styles set by JS
- [ ] Find CSS classes toggled by JS
- [ ] Map dynamic styling logic

#### D. Component Patterns
Identify reusable patterns:
- [ ] Score tables (different types)
- [ ] Button groups
- [ ] Modal structures
- [ ] Form layouts
- [ ] Card/panel layouts
- [ ] Navigation patterns

---

## Step 3: Proposed Unified Component System

### Core Components Needed

#### 1. Tables
```
.table-base          - Base table styling
.table-scoring       - Scoring table variant
.table-card          - Card view variant
.table-setup         - Setup table variant
.table-sticky-header - Sticky header behavior
.table-sticky-col    - Sticky first column
```

#### 2. Table Cells
```
.cell-input          - Score input cells
.cell-calculated     - Calculated cells (totals, averages)
.cell-bold           - Bold cells (End totals)
.cell-header         - Header cells
.cell-sticky         - Sticky cells
```

#### 3. Buttons
```
.btn                 - Base button
.btn-primary         - Primary action
.btn-secondary       - Secondary action
.btn-success         - Success/confirm
.btn-danger          - Danger/delete
.btn-sm              - Small size
.btn-lg              - Large size
.btn-group           - Button group container
```

#### 4. Layout
```
.view                - Full page view
.view-header         - View header
.view-content        - Scrollable content
.view-controls       - Control buttons area
.page-header         - Page-level header
.section-header      - Section header
```

#### 5. Modals
```
.modal-overlay       - Modal backdrop
.modal-content       - Modal container
.modal-header        - Modal header
.modal-body          - Modal content
.modal-footer        - Modal actions
```

#### 6. Forms
```
.form-group          - Form field group
.form-label          - Field label
.form-control        - Input/select/textarea
.form-row            - Horizontal field layout
```

#### 7. Score Colors (Already Done)
```
.score-gold
.score-red
.score-blue
.score-black
.score-white
.score-m
```

---

## Step 4: Implementation Plan

### Phase 1: Audit & Documentation (DO THIS FIRST)
1. **Run automated extraction**
   - Extract all classes from HTML files
   - Extract all CSS selectors from CSS files
   - Extract all JS-generated HTML
   - Create cross-reference matrix

2. **Manual review**
   - Identify component patterns
   - Group similar elements
   - Document current behavior
   - Note mobile-specific needs

3. **Create component map**
   - List all needed components
   - Define component API (classes, modifiers)
   - Document usage examples
   - Plan migration strategy

### Phase 2: Build Unified Components
1. **Consolidate into components.css**
   - Tables (all variants)
   - Buttons (all variants)
   - Forms
   - Modals
   - Layout containers

2. **Test each component**
   - Create test HTML page
   - Verify all variants work
   - Test mobile responsiveness
   - Document any limitations

### Phase 3: Migrate HTML Files (One at a Time)
1. **Start with ranking_round_300.html**
   - Replace inline styles with classes
   - Use new component classes
   - Test thoroughly
   - Document changes

2. **Refactor JavaScript**
   - Replace inline style manipulation
   - Use class toggles instead
   - Maintain functionality
   - Test all interactions

3. **Repeat for other modules**
   - solo_card.html
   - team_card.html
   - archer_list.html
   - coach.html
   - index.html

### Phase 4: Cleanup
1. **Remove legacy CSS files**
   - main.css (after extracting needed parts)
   - score.css (replaced by score-colors.css)
   - team_round.css (replaced by components)
   - keypad.css (will create unified version)

2. **Verify nothing breaks**
3. **Document final system**

---

## Step 5: Automated Audit Tools

### Commands to Run

```bash
# Extract all classes from HTML
grep -roh 'class="[^"]*"' *.html | sort -u > html_classes.txt

# Extract all CSS selectors
grep -roh '^\.[a-zA-Z0-9_-]*' css/*.css | sort -u > css_classes.txt

# Find inline styles in HTML
grep -rn 'style="' *.html > inline_styles_html.txt

# Find inline styles in JS
grep -rn 'style\s*=' js/*.js > inline_styles_js.txt

# Find all table structures
grep -rn '<table' *.html > tables.txt

# Find all button types
grep -rn '<button' *.html > buttons.txt
```

---

## Next Steps

1. **Run the automated audit** (commands above)
2. **Review ranking_round_300.html in detail**
3. **Create component inventory**
4. **Build test page with all components**
5. **Migrate one module completely**
6. **Replicate to other modules**

---

## Success Criteria

✅ **Unified System:**
- One component library (components.css)
- Reusable classes across all modules
- No duplicate styling
- No inline styles in HTML
- Minimal inline styles in JS

✅ **Mobile Optimized:**
- Touch targets 44px minimum
- Safe-area-inset support
- Responsive breakpoints
- Smooth scrolling
- Proper keyboard handling

✅ **Theme Ready:**
- All colors from tokens
- Light/dark variants defined
- Easy to switch themes
- Consistent across modules

✅ **Maintainable:**
- Clear component documentation
- Easy to add new features
- Easy to modify existing features
- Minimal technical debt

---

## Questions to Answer

1. **What table variants do we actually need?**
   - Scoring table (bale view)
   - Card table (individual archer)
   - Setup table (archer selection)
   - Summary table (totals)
   - Others?

2. **What button variants do we actually need?**
   - Primary, secondary, success, danger
   - Small, medium, large
   - Icon buttons
   - Button groups
   - Others?

3. **What layout patterns do we actually need?**
   - Full-page views
   - Modal overlays
   - Sticky headers/footers
   - Scrollable content areas
   - Split views
   - Others?

4. **What mobile-specific components do we need?**
   - Keypad
   - Touch-friendly controls
   - Swipe gestures
   - Bottom sheets
   - Others?

---

## Audit Status

- [ ] HTML class extraction complete
- [ ] CSS selector extraction complete
- [ ] Inline style audit complete
- [ ] JavaScript styling audit complete
- [ ] Component patterns identified
- [ ] Component API designed
- [ ] Test page created
- [ ] Migration plan finalized

**DO NOT PROCEED WITH IMPLEMENTATION UNTIL AUDIT IS COMPLETE**

