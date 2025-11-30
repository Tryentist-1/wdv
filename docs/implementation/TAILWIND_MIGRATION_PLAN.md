# Complete Tailwind CSS Migration Plan

**Date:** November 2025  
**Goal:** Remove all legacy CSS and use 100% Tailwind CSS  
**Status:** In Progress

---

## 📊 Current State Analysis

### Legacy CSS Files Still Loaded

1. **`css/main.css`** (35KB) - ❌ Still loaded in:
   - `ranking_round_300.html` (line 77)
   - `solo_card.html` (line 68)
   - `team_card.html` (line 68)

2. **Legacy CSS Files (Potentially Unused):**
   - `css/keypad.css` - ❌ No longer needed (keypad now uses Tailwind)
   - `css/keypad-css-button-fix.css` - ❌ No longer needed
   - `css/team_round.css` - ❌ Check if still used
   - `css/score.css` - ❌ Check if still used

### Legacy CSS Classes Still in Use

1. **`main-container`** - Used in:
   - `solo_card.html` (line 74)
   - `team_card.html` (line 72)
   - **Action:** Replace with Tailwind classes

2. **`modal-overlay`** - Used in:
   - `solo_card.html` (line 115)
   - **Action:** Replace with Tailwind classes

3. **`score-input`** - Used in:
   - Multiple files (but this is OK - it's a utility class)
   - **Action:** Keep as utility class, ensure it works with Tailwind

4. **`locked-score-input`** - Used in:
   - `js/ranking_round_300.js`
   - **Action:** Replace with Tailwind classes

---

## 🎯 Migration Tasks

### Phase 1: Replace Legacy Container Classes

#### Task 1.1: Replace `main-container` class

**Files to update:**
- `solo_card.html`
- `team_card.html`

**Current:**
```html
<div id="app-container" class="main-container">
```

**Replace with:**
```html
<div id="app-container" class="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
```

**Legacy CSS to remove from `css/main.css`:**
- `.main-container` styles (lines ~100-150)

---

#### Task 1.2: Replace `modal-overlay` class

**Files to update:**
- `solo_card.html` (export modal)

**Current:**
```html
<div id="export-modal" class="modal-overlay" style="display: none;">
```

**Replace with:**
```html
<div id="export-modal" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 hidden">
```

**Legacy CSS to remove from `css/main.css`:**
- `.modal-overlay` styles

---

### Phase 2: Replace Legacy CSS Classes in JavaScript

#### Task 2.1: Replace `locked-score-input` class

**Files to update:**
- `js/ranking_round_300.js`

**Current:**
```javascript
input.classList.add('locked-score-input');
```

**Replace with:**
```javascript
input.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
```

**Legacy CSS to remove from `css/main.css`:**
- `.locked-score-input` styles

---

#### Task 2.2: Audit JavaScript inline styles

**Files to check:**
- `js/ranking_round_300.js`
- `js/solo_card.js`
- `js/team_card.js`

**Action:** Find all `element.style.` assignments and convert to Tailwind class toggles

**Examples:**
- `element.style.display = 'none'` → `element.classList.add('hidden')`
- `element.style.display = 'block'` → `element.classList.remove('hidden')`
- `element.style.backgroundColor = 'red'` → `element.classList.add('bg-red-500')`

---

### Phase 3: Remove Legacy CSS File Imports

#### Task 3.1: Remove `css/main.css` import

**Files to update:**
- `ranking_round_300.html` (line 77)
- `solo_card.html` (line 68)
- `team_card.html` (line 68)

**Current:**
```html
<link rel="stylesheet" href="css/main.css?v=20250922b" onerror="console.error('Failed to load main.css')">
```

**Action:** Remove this line entirely

**⚠️ Warning:** Make sure all styles from `main.css` are replaced with Tailwind first!

---

#### Task 3.2: Verify no other CSS imports

**Action:** Search for all `<link rel="stylesheet"` tags and verify they're either:
- Tailwind CDN (keep)
- Font Awesome (keep)
- Other necessary libraries (keep)
- Legacy CSS files (remove)

---

### Phase 4: Clean Up Unused CSS Files

#### Task 4.1: Archive/Remove unused CSS files

**Files to remove:**
- `css/keypad.css` - ✅ No longer needed (keypad uses Tailwind)
- `css/keypad-css-button-fix.css` - ✅ No longer needed
- `css/team_round.css` - ⚠️ Verify not used first
- `css/score.css` - ⚠️ Verify not used first

**Action:**
1. Search codebase for references to these files
2. If unused, move to `css/archive/` or delete
3. Update any documentation

---

### Phase 5: Convert Remaining Inline Styles

#### Task 5.1: Find all inline styles

**Action:** Search for `style="` in HTML and JS files

**Common patterns to replace:**
- `style="display: none"` → `class="hidden"`
- `style="display: block"` → Remove (default) or `class="block"`
- `style="color: red"` → `class="text-red-500"`
- `style="background-color: blue"` → `class="bg-blue-500"`

---

#### Task 5.2: Convert JavaScript style assignments

**Action:** Find all `element.style.property = value` and convert to class toggles

**Example conversion:**
```javascript
// Before
keypad.element.style.display = 'none';
document.body.classList.remove('keypad-visible');

// After
keypad.element.classList.add('hidden');
document.body.classList.remove('keypad-visible');
```

---

### Phase 6: Update Score Input Utility Class

#### Task 6.1: Ensure `score-input` works with Tailwind

**Current:** `score-input` is defined in `css/main.css` and inline `<style>` blocks

**Action:**
1. Move `score-input` styles to Tailwind-compatible utility
2. Or replace with Tailwind classes directly in HTML

**Option A: Keep as utility class**
```css
/* In inline <style> block or separate utility file */
.score-input {
  @apply w-full h-full min-h-[44px] text-center font-bold border-none bg-transparent;
}
```

**Option B: Use Tailwind classes directly**
```html
<input type="text" class="w-full h-full min-h-[44px] text-center font-bold border-none bg-transparent score-input bg-score-gold text-black" ...>
```

---

### Phase 7: Final Verification

#### Task 7.1: Visual regression testing

**Action:** Test all modules visually:
- [ ] Ranking Round 300
- [ ] Solo Card
- [ ] Team Card
- [ ] Scorecard Editor
- [ ] Coach Console
- [ ] Archer List

**Check:**
- [ ] All layouts look correct
- [ ] Dark mode works everywhere
- [ ] Mobile responsive
- [ ] No broken styles

---

#### Task 7.2: Remove legacy CSS file

**Action:** After all migrations complete:
1. Move `css/main.css` to `css/archive/main.css.legacy`
2. Or delete if confident all styles migrated

---

## 📋 Migration Checklist

### Phase 1: Container Classes
- [ ] Replace `main-container` in `solo_card.html`
- [ ] Replace `main-container` in `team_card.html`
- [ ] Replace `modal-overlay` in `solo_card.html`

### Phase 2: JavaScript Classes
- [ ] Replace `locked-score-input` in `ranking_round_300.js`
- [ ] Audit and convert inline styles in `ranking_round_300.js`
- [ ] Audit and convert inline styles in `solo_card.js`
- [ ] Audit and convert inline styles in `team_card.js`

### Phase 3: Remove CSS Imports
- [ ] Remove `css/main.css` from `ranking_round_300.html`
- [ ] Remove `css/main.css` from `solo_card.html`
- [ ] Remove `css/main.css` from `team_card.html`
- [ ] Verify no other legacy CSS imports

### Phase 4: Clean Up Files
- [ ] Verify `css/keypad.css` not used → Remove
- [ ] Verify `css/keypad-css-button-fix.css` not used → Remove
- [ ] Verify `css/team_round.css` not used → Remove or archive
- [ ] Verify `css/score.css` not used → Remove or archive

### Phase 5: Inline Styles
- [ ] Convert all `style="display: none"` to `class="hidden"`
- [ ] Convert all other inline styles to Tailwind classes
- [ ] Convert JavaScript style assignments to class toggles

### Phase 6: Score Input
- [ ] Ensure `score-input` utility works with Tailwind
- [ ] Test all score input fields

### Phase 7: Verification
- [ ] Visual regression test all modules
- [ ] Test dark mode
- [ ] Test mobile responsive
- [ ] Archive or remove `css/main.css`

---

## 🚨 Critical Warnings

1. **Don't remove `css/main.css` until ALL styles are migrated**
   - Some styles might be used in unexpected places
   - Test thoroughly before removal

2. **Keep `score-input` utility class**
   - It's used extensively and provides consistent styling
   - Just ensure it's Tailwind-compatible

3. **Test dark mode after each change**
   - Legacy CSS might have dark mode styles that need migration
   - Verify all text is visible in dark mode

4. **Mobile testing required**
   - Some legacy CSS might handle mobile-specific cases
   - Ensure Tailwind responsive classes cover all cases

---

## 📚 Reference Files

- **Tailwind Config:** Already in all HTML files (Tailwind CDN with config)
- **Component Reference:** `style-guide.html` (shows all Tailwind components)
- **Legacy CSS:** `css/main.css` (to be removed after migration)

---

## ✅ Success Criteria

Migration is complete when:

- [ ] No `<link rel="stylesheet" href="css/main.css">` in any HTML file
- [ ] No legacy CSS classes used (`main-container`, `modal-overlay`, etc.)
- [ ] All inline styles converted to Tailwind classes
- [ ] All JavaScript style assignments use class toggles
- [ ] All modules visually identical to current state
- [ ] Dark mode works everywhere
- [ ] Mobile responsive works everywhere
- [ ] `css/main.css` archived or removed
- [ ] Unused CSS files removed

---

**Last Updated:** November 2025  
**Status:** Ready for Implementation

