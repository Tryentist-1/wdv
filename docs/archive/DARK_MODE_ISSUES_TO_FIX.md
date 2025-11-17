# Dark Mode Issues to Fix

> **⚠️ DEPRECATED - ARCHIVED November 17, 2025**
> 
> **Reason:** Issues list from November 7 audit - likely resolved in current codebase
> 
> This file is kept for historical reference only. Check current code for dark mode status.

---

**Generated:** November 7, 2025  
**Source:** audit_dark_mode.sh output

---

## Priority 1: Inline Styles in ranking_round_300.js

These inline styles use hardcoded colors that won't adapt to dark mode:

### Lines with inline color styles:

1. **Line 915** - "No Archers Available" message
   ```javascript
   '<div style="text-align:center;color:#666;padding:1rem;">No Archers Available...'
   ```
   **Fix:** Use Tailwind classes: `text-center text-gray-600 dark:text-gray-400 p-4`

2. **Line 1029** - Empty state message
   ```javascript
   '<div style="text-align: center; padding: 2rem; color: #666;">...'
   ```
   **Fix:** Use Tailwind classes: `text-center p-8 text-gray-600 dark:text-gray-400`

3. **Line 1523** - Helper text
   ```javascript
   '<div style="font-size: 0.85em; color: #666; margin-top: 4px;">...'
   ```
   **Fix:** Use Tailwind classes: `text-sm text-gray-600 dark:text-gray-400 mt-1`

4. **Line 1617** - Error message helper text
   ```javascript
   '<div style="font-size: 0.85em; color: #666; margin-top: 4px;">Try a different bale...'
   ```
   **Fix:** Use Tailwind classes: `text-sm text-gray-600 dark:text-gray-400 mt-1`

5. **Line 2239** - Status badge (inline style)
   ```javascript
   `<span class="status-badge" style="background:${badgeColor};color:#fff;margin-right:0.35rem;">${status}</span>`
   ```
   **Fix:** Use Tailwind classes with conditional logic for badge colors

6. **Line 2299** - Status badge (inline style)
   ```javascript
   `<span class="status-badge" style="background:${statusColor};color:#fff;">${status}</span>`
   ```
   **Fix:** Use Tailwind classes with conditional logic

7. **Lines 3580-3583** - Sync status icons
   ```javascript
   'synced': '<span style="color: #4caf50; font-size: 0.9em;" title="Synced">✓</span>',
   'pending': '<span style="color: #ff9800; font-size: 0.9em;" title="Pending">⟳</span>',
   'failed': '<span style="color: #f44336; font-size: 0.9em;" title="Failed">✗</span>',
   '': '<span style="color: #9e9e9e; font-size: 0.9em;" title="Not Synced">○</span>'
   ```
   **Fix:** Use Tailwind classes: `text-success`, `text-warning`, `text-danger`, `text-gray-400 dark:text-gray-500`

8. **Line 3748** - "No active events" message
   ```javascript
   '<p style="color: #999; text-align: center;">No active events found</p>'
   ```
   **Fix:** Use Tailwind classes: `text-gray-500 dark:text-gray-400 text-center`

9. **Line 3759** - Event date text
   ```javascript
   `<div style="font-size: 0.85em; color: #666;">${ev.date}</div>`
   ```
   **Fix:** Use Tailwind classes: `text-sm text-gray-600 dark:text-gray-400`

10. **Line 3780** - Error message
    ```javascript
    '<p style="color: #f44336;">Failed to load events</p>'
    ```
    **Fix:** Use Tailwind classes: `text-danger dark:text-red-400`

11. **Line 4593** - Modal helper text
    ```javascript
    '<p style="color: #666; margin-bottom: 16px;">Check/uncheck archers...'
    ```
    **Fix:** Use Tailwind classes: `text-gray-600 dark:text-gray-400 mb-4`

12. **Line 4605** - Archer info text
    ```javascript
    `<span style="color: #666;">(${archer.school} - ${archer.level}/${archer.gender})</span>`
    ```
    **Fix:** Use Tailwind classes: `text-gray-600 dark:text-gray-400`

13. **Line 4606** - Bale number indicator
    ```javascript
    `<span style="color: #2196f3;">- Bale ${archer.baleNumber}</span>`
    ```
    **Fix:** Use Tailwind classes: `text-primary dark:text-blue-400`

---

## Priority 2: Inline Styles in Other JS Files

### archer_list.html

1. **Line 318** - "No archers found" message
2. **Lines 360, 371** - User icons with inline colors
3. **Lines 414, 432** - Heart icon colors
4. **Line 456** - History button icon color

### js/coach.js

1. **Line 155** - "No events yet" message
2. **Line 543** - Status badge inline style
3. **Lines 560, 564, 569, 574** - Various error/info messages

---

## Priority 3: CSS Classes Without Dark Mode (main.css)

### Status Classes (lines 99-103)
```css
.status-off { background: #f8d7da; color: #842029; }
.status-pending { background: #fff3cd; color: #664d03; }
.status-ok { background: #d1e7dd; color: #0f5132; }
.status-synced { background: #d1e7dd; color: #0f5132; font-weight: bold; }
.status-active { background: #fff3cd; color: #664d03; font-weight: bold; }
```

**Recommendation:** These are legacy classes. Replace usage with Tailwind badge classes.

---

## Low Priority: Container Backgrounds Without Text Colors

These are **mostly fine** because they're container elements where text color is inherited:
- `<body>` tags with `bg-gray-* dark:bg-gray-*`
- `<section>` and `<div>` wrappers
- Modal containers

**Only fix if text visibility issues are reported.**

---

## Recommended Approach

1. **Phase 1:** Fix all inline styles in `ranking_round_300.js` (13 instances)
2. **Phase 2:** Fix inline styles in `archer_list.html` and `coach.js`
3. **Phase 3:** Replace legacy status badge classes with Tailwind

**Estimated Time:** 30-45 minutes for Phase 1

---

## Testing Checklist

After fixes:
- [ ] Test all views in dark mode
- [ ] Check empty states (no archers, no events)
- [ ] Check error messages
- [ ] Check status badges
- [ ] Check sync indicators
- [ ] Test on mobile (iOS Safari, Android Chrome)

