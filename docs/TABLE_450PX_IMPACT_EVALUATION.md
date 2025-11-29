# Table Width 450px - Impact Evaluation

## Current Configuration

**Table Minimum Width:** 600px → **450px** (proposed)  
**Current Padding:** `px-0.5` (2px) for most columns, `px-1.5` (6px) for Archer

---

## Column Width Breakdown

### Current Column Widths (with padding):

| Column | Width | Padding | Total Width | Content Type |
|--------|-------|---------|-------------|--------------|
| **Archer** | `max-w-[100px]` | `px-1.5` (6px) | ~106px max | Name + target (truncated) |
| **A1** | `w-12` (48px) | `px-0.5` (2px) | 50px | Score input (X-10) |
| **A2** | `w-12` (48px) | `px-0.5` (2px) | 50px | Score input (X-10) |
| **A3** | `w-12` (48px) | `px-0.5` (2px) | 50px | Score input (X-10) |
| **End** | `w-14` (56px) | `px-0.5` (2px) | 58px | Total (max 30) |
| **Run** | `w-14` (56px) | `px-0.5` (2px) | 58px | Running total (max 300) |
| **X** | `w-12` (48px) | `px-0.5` (2px) | 50px | X count (0-30) |
| **10** | `w-12` (48px) | `px-0.5` (2px) | 50px | 10 count (0-30) |
| **Card** | `w-16` (64px) | `px-0.5` (2px) | 66px | Button + badge |

### Total Width Calculation:
```
Archer:    106px (max-width with padding)
A1-A3:     150px (50px × 3)
End/Run:   116px (58px × 2)
X/10:      100px (50px × 2)
Card:       66px
───────────────────
Subtotal:  538px (column content + padding)
Borders:   ~8px (1px border between each column)
───────────────────
TOTAL:     ~546px minimum width needed
```

---

## Impact Analysis: 600px → 450px

### ⚠️ **Critical Issue: Width Mismatch**

**Current columns require:** ~546px minimum  
**Proposed minimum width:** 450px  
**Shortfall:** ~96px (columns will be compressed)

### What Will Happen at 450px:

1. **Browser Behavior:**
   - Browser will compress columns to fit 450px
   - Fixed-width columns (`w-12`, `w-14`, etc.) will be forced smaller
   - `max-w-[100px]` on Archer will be respected, but other columns will shrink

2. **Content Issues:**
   - Score inputs may become too narrow (< 40px)
   - Totals may overflow or become hard to read
   - Archer names will truncate more aggressively
   - Touch targets may fall below 44px minimum

3. **Visual Problems:**
   - Columns may look cramped
   - Text may be too small or wrap
   - Buttons in Card column may be too small

---

## Device Impact Comparison

### iPhone XR (414px viewport width):
- **Current (600px):** 186px horizontal scroll
- **Proposed (450px):** 36px horizontal scroll ✅ **Much better**
- **Impact:** Minimal scrolling needed

### iPhone SE (375px viewport):
- **Current (600px):** 225px horizontal scroll
- **Proposed (450px):** 75px horizontal scroll ✅ **Much better**
- **Impact:** Manageable scrolling with sticky column

### Samsung Galaxy (360px viewport):
- **Current (600px):** 240px horizontal scroll
- **Proposed (450px):** 90px horizontal scroll ✅ **Much better**
- **Impact:** Acceptable scrolling

---

## Options to Make 450px Work

### Option A: Reduce Column Widths (Make Table Fit)

To fit comfortably in 450px, reduce column widths:

| Column | Current | Proposed | Change | New Total |
|--------|---------|----------|--------|-----------|
| Archer | max-w-[100px] | max-w-[85px] | -15px | ~91px |
| A1/A2/A3 | w-12 (48px) | w-10 (40px) | -8px each | 126px total |
| End/Run | w-14 (56px) | w-12 (48px) | -8px each | 100px total |
| X/10 | w-12 (48px) | w-10 (40px) | -8px each | 84px total |
| Card | w-16 (64px) | w-14 (56px) | -8px | 58px |

**New Total: ~459px** (fits in 450px minimum with some buffer)

**Trade-offs:**
- ✅ Fits in 450px
- ⚠️ Score inputs smaller (40px vs 48px)
- ⚠️ Archer names more truncated
- ⚠️ Totals may be tighter but should still fit

### Option B: Use 500px Minimum (Safer Balance)

Keep current column widths, use 500px minimum:
- ✅ Better than 600px for mobile
- ✅ Maintains current spacing
- ✅ Less risk of content issues
- ⚠️ Still 86px scroll on iPhone XR (acceptable)

### Option C: Responsive Minimum Width

Different minimums for different screen sizes:
```html
min-w-[450px] sm:min-w-[500px] md:min-w-[600px]
```

---

## Row Height Explanation

**What sets row height:**

1. **Score Input Cells:** `min-h-[44px]` (44px minimum)
   - This is the primary driver - ensures touch-friendly targets
   - iOS/Android guidelines recommend 44px minimum for touch

2. **Cell Padding:** `py-1` = 4px top + 4px bottom = 8px total
   - Applied to all cells except score inputs (which have `p-0`)

3. **Total Row Height:** ~52px (44px input + 8px padding)

**Note:** Score input cells use `p-0` (no padding) so the 44px input fills the cell, then `py-1` padding on calculated cells (End, Run, X, 10) adds 8px total height to those cells.

---

## Recommendations

### For 450px Minimum Width:

**Option 1 (Recommended if you want 450px):**
1. Change minimum width to 450px ✅ (already done)
2. Reduce column widths to fit:
   - Archer: `max-w-[85px]` (from 100px)
   - A1/A2/A3: `w-10` (40px, from 48px)
   - End/Run: `w-12` (48px, from 56px)
   - X/10: `w-10` (40px, from 48px)
   - Card: `w-14` (56px, from 64px)

**Option 2 (Safer):**
- Use **500px minimum** with current column widths
- Better balance between mobile fit and content space

---

## Testing Checklist

After implementing 450px minimum:

- [ ] Verify Archer names truncate correctly at max-width
- [ ] Test score inputs at 40px width (if using Option 1)
- [ ] Verify totals (30, 300) display correctly in narrower columns
- [ ] Check Card button is still usable
- [ ] Test on iPhone XR (414px) - verify scrolling experience
- [ ] Test on iPhone SE (375px) - verify usability
- [ ] Verify touch targets remain 44px minimum
- [ ] Check all columns are readable

---

## Summary

**Current State:**
- Table needs ~546px minimum with current columns
- Minimum width is 600px (allows comfortable spacing)
- 186px horizontal scroll on iPhone XR

**With 450px Minimum:**
- Will compress columns by ~96px
- Better mobile experience (36px scroll on iPhone XR)
- **BUT** columns may be too tight unless we reduce column widths

**Recommendation:** Either reduce column widths (Option 1) OR use 500px minimum (Option 2) for better balance.

