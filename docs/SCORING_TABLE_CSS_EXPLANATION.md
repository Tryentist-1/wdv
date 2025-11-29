# Scoring Table CSS Explanation

## Tailwind Width Classes

Tailwind uses a base scale where each unit = 0.25rem (4px):

- `w-6` = 24px (0.25rem × 6 = 1.5rem)
- `w-10` = 40px (0.25rem × 10 = 2.5rem)
- `w-12` = 48px (0.25rem × 12 = 3rem)
- `w-14` = 56px (0.25rem × 14 = 3.5rem)
- `w-16` = 64px (0.25rem × 16 = 4rem)
- `w-28` = 112px (0.25rem × 28 = 7rem)
- `w-36` = 144px (0.25rem × 36 = 9rem)

## Tailwind Padding Classes

Padding follows the same scale:

- `px-1` = 4px horizontal padding (0.25rem)
- `px-2` = 8px horizontal padding (0.5rem)
- `px-3` = 12px horizontal padding (0.75rem)
- `py-1` = 4px vertical padding
- `py-2` = 8px vertical padding
- `pl-2 pr-1` = 8px left, 4px right (asymmetric padding)

## Standard Scoring Table Layout (from test-components.html)

### Column Widths:
- **Archer**: No fixed width (`px-3` padding only) - auto-sizes based on content
- **A1/A2/A3**: `w-12` = 48px each
- **End/Run**: `w-14` = 56px each
- **X/10**: `w-12` = 48px each
- **Card**: `w-16` = 64px

### Padding:
- **Header (th)**: `px-3 py-2` for Archer, `px-2 py-2` for others
- **Cells (td)**: `px-3 py-1` for Archer, `px-2 py-1` for calculated cells
- **Score inputs**: `p-0` (no padding, input fills cell)

### Sticky Column:
- Archer column uses `sticky left-0` to stay visible when scrolling horizontally
- Background matches row: `bg-white` or `bg-gray-50` for alternating rows

## Current Implementation

The scoring table in `ranking_round_300.js` now matches the standard from `test-components.html`:

```html
<th class="px-3 py-2 ...">Archer</th>  <!-- No fixed width -->
<th class="px-2 py-2 w-12">A1</th>
<th class="px-2 py-2 w-12">A2</th>
<th class="px-2 py-2 w-12">A3</th>
<th class="px-2 py-2 w-14">End</th>
<th class="px-2 py-2 w-14">Run</th>
<th class="px-2 py-2 w-12">X</th>
<th class="px-2 py-2 w-12">10</th>
<th class="px-2 py-2 w-16">Card</th>
```

This ensures consistency across the application and follows the component library standard.

