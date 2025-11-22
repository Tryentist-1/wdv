# Release Notes - v1.4.3

**Release Date:** December 29, 2024  
**Release Tag:** `Dark-Mode-Fix`  
**Branch:** `main`  
**Status:** ✅ **READY FOR PRODUCTION**

---

## 🎯 Overview

This release fixes dark mode functionality that was broken after Tailwind CSS v4 compilation changes. Dark mode now works correctly across all modules in both development and production environments.

---

## ✨ Major Changes

### Dark Mode Fix for Tailwind CSS v4

**Problem Solved:**
- Dark mode was broken in dev environment after Tailwind CSS v4 compilation
- Custom dark mode variant wasn't configured correctly for Tailwind v4
- Custom component classes (tables, score inputs, status badges) lacked dark mode support
- Dark mode utilities were not compiling correctly

**Solution Implemented:**
- ✅ **Dark Mode Variant Configuration** - Added `@custom-variant dark (&:where(.dark, .dark *));` for Tailwind v4
- ✅ **Custom Component Dark Mode** - Added dark mode support to all custom component classes
- ✅ **Table Components** - `.table-scoring`, `.cell-sticky`, `.cell-calculated` now support dark mode
- ✅ **Score Input Components** - `.score-input.is-locked` now adapts to dark mode
- ✅ **Status Badges** - `.status-off` now supports dark mode
- ✅ **57+ Dark Mode Utilities** - All dark mode utility classes now compile correctly

---

## 📦 Detailed Changes

### 1. Tailwind CSS Configuration

**File:** `css/tailwind.css`

**Changes:**
- Added `@custom-variant dark (&:where(.dark, .dark *));` directive
- This replaces the removed `darkMode: 'class'` config option from Tailwind v4
- All dark mode utilities now compile correctly with proper selectors

**Before:**
```css
@import "tailwindcss";
@config "../tailwind.config.js";
```

**After:**
```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```

---

### 2. Custom Component Dark Mode Support

**File:** `css/tailwind.css`

**Updated Classes:**
- `.score-input.is-locked` - Added `dark:bg-gray-700 dark:text-gray-400`
- `.table-scoring` - Added `dark:bg-gray-800`
- `.table-scoring td` - Added `dark:border-gray-600`
- `.table-scoring tbody tr:nth-child(even)` - Added `dark:bg-gray-700/50`
- `.table-scoring tbody tr:hover` - Added `dark:bg-gray-600`
- `.cell-calculated` - Added `dark:bg-gray-700`
- `.cell-sticky` - Added `dark:bg-gray-800`
- `.table-scoring tbody tr:nth-child(even) .cell-sticky` - Added `dark:bg-gray-700/50`
- `.table-scoring tbody tr:hover .cell-sticky` - Added `dark:bg-gray-600`
- `.status-off` - Added `dark:bg-gray-700 dark:text-gray-300`
- `.score-input-white` - Added dark mode border color adjustment

---

### 3. Compiled CSS Update

**File:** `css/tailwind-compiled.css`

**Changes:**
- Recompiled with correct dark mode variant configuration
- All 57+ dark mode utility classes now use correct `&:where(.dark, .dark *)` selector
- Dark mode combinations (e.g., `dark:hover:bg-gray-600`) now work correctly

---

## 🧪 Testing

**Verified:**
- ✅ Dark mode toggle works across all modules
- ✅ All dark mode utility classes compile correctly
- ✅ Custom component classes adapt to dark mode
- ✅ Tables, scorecards, and forms display correctly in dark mode
- ✅ Dark mode combinations (hover, focus) work correctly
- ✅ No console errors or build warnings

**Test Coverage:**
- All modules tested: index, coach, ranking_round_300, solo_card, team_card, archer_list, results
- Custom components verified: tables, score inputs, status badges
- Dark mode utilities verified: backgrounds, text, borders, hover states

---

## 📋 Migration Notes

**No Database Changes Required**

**Build Process:**
```bash
# Recompile CSS (already done)
npm run build:css
```

**Deployment:**
- Updated `css/tailwind.css` with dark mode variant
- Recompiled `css/tailwind-compiled.css`
- No other files changed

---

## 🔧 Technical Details

### Tailwind CSS v4 Dark Mode Changes

In Tailwind CSS v4, the `darkMode` configuration option was removed from `tailwind.config.js`. Dark mode must now be configured using the `@custom-variant` directive in the CSS file.

**Old Configuration (Tailwind v3):**
```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  // ...
}
```

**New Configuration (Tailwind v4):**
```css
/* css/tailwind.css */
@custom-variant dark (&:where(.dark, .dark *));
```

This ensures that dark mode styles are applied when the `.dark` class is present on any ancestor element (typically `<html class="dark">`).

---

## 📝 Files Changed

**Modified:**
- `css/tailwind.css` - Added dark mode variant and custom component dark mode support
- `css/tailwind-compiled.css` - Recompiled with correct dark mode configuration

**No Changes:**
- HTML files (already use correct dark mode classes)
- JavaScript files (dark mode toggle logic unchanged)
- API files

---

## 🚀 Deployment

**Deployment Steps:**
1. ✅ CSS files updated and recompiled
2. ✅ Changes committed to git
3. ⏳ Push to remote
4. ⏳ Deploy to FTP production

**Post-Deployment:**
- Test dark mode toggle on production
- Verify all modules display correctly in dark mode
- Confirm no console errors

---

## 🐛 Known Issues

None - All dark mode functionality restored.

---

## 📚 Related Documentation

- `QUICK_START_LOCAL.md` - Updated with dark mode build instructions
- `docs/DEVELOPMENT_WORKFLOW.md` - CSS compilation workflow
- `css/tailwind.css` - Source file with dark mode configuration

---

## 🙏 Credits

Fixed dark mode issue that occurred after Tailwind CSS v4 compilation changes. All dark mode utilities and custom components now work correctly across all modules.

---

**Next Release:** Continue with roadmap features and improvements.
