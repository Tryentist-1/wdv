# Table Width Change Impact Analysis

## Current Configuration

**Current Minimum Width:** 600px  
**Proposed Minimum Width:** 450px  
**Padding:** Already adjusted to `px-0.5` (2px) for most columns, `px-1.5` (6px) for Archer column

---

## Column Width Breakdown

### Current Column Widths (with padding):
- **Archer**: `max-w-[100px]` + `px-1.5` (6px) = ~106px max
- **A1/A2/A3**: `w-12` (48px) + `px-0.5` (2px) = 52px each = **156px total**
- **End/Run**: `w-14` (56px) + `px-0.5` (2px) = 58px each = **116px total**
- **X/10**: `w-12` (48px) + `px-0.5` (2px) = 52px each = **104px total**
- **Card**: `w-16` (64px) + `px-0.5` (2px) = 66px

### Estimated Total Width (content + padding):
- Archer: ~106px (max)
- Score columns: 156px (A1-A3)
- Totals: 116px (End + Run)
- Counts: 104px (X + 10)
- Card: 66px
- **TOTAL: ~548px**

With borders and spacing, this is roughly **~560-570px total**.

---

## Impact of Changing to 450px Minimum

### ✅ Benefits:

1. **Better iPhone XR Fit**
   - iPhone XR viewport: 414px wide (portrait)
   - With 450px min-width, table will be:
     - **414px viewport** → 36px horizontal scroll (minimal)
     - **896px viewport** (landscape) → Fits comfortably

2. **Tighter Mobile Experience**
   - Less horizontal scrolling on most phones
   - More content visible without scrolling
   - Still allows all columns to be accessible

3. **Consistent with Optimized Padding**
   - With `px-0.5` (2px) padding already in place, 450px is realistic
   - Better matches the compact design goals

### ⚠️ Potential Issues:

1. **Content Overflow Risk**
   - If columns are too narrow, text may wrap or truncate
   - Archer names might truncate more aggressively with `max-w-[100px]`
   - Score totals (End/Run) should still fit in 56px columns

2. **Column Squeeze**
   - At 450px, columns will be tighter
   - Score inputs (44px min-height) should still fit
   - May need to verify all columns remain readable

3. **Minimum Width Constraint**
   - 450px may be too tight if we need more space
   - Could limit future column additions
   - Should test with longest archer names

---

## Recommended Test Cases

### Before Changing:
1. **Longest Archer Name Test**
   - Test with longest archer name (e.g., "Christopher M. (A)")
   - Verify truncation works correctly with `max-w-[100px]`
   - Check that tooltip/hover shows full name

2. **Score Display Test**
   - Verify totals up to 30 (End total) fit in `w-14` (56px) columns
   - Verify running totals up to 300 fit in `w-14` (56px) columns
   - Check X/10 counts display correctly

3. **Touch Target Test**
   - Ensure score input cells remain 44px minimum (touch-friendly)
   - Verify buttons in Card column remain usable

### After Changing to 450px:

1. **iPhone XR Portrait Test** (414px viewport)
   - Table will scroll horizontally by 36px
   - Verify sticky Archer column works correctly
   - Test scrolling experience

2. **iPhone SE Test** (375px viewport)
   - Table will scroll horizontally by 75px
   - More scrolling but acceptable
   - Verify usability

3. **Samsung Galaxy Test** (360px viewport)
   - Table will scroll horizontally by 90px
   - Should still be usable with sticky column

---

## Column Width Recommendations for 450px

With current padding (`px-0.5` = 2px):

| Column | Current Width | Padding | Total | Status |
|--------|--------------|---------|-------|--------|
| Archer | max-w-[100px] | px-1.5 (6px) | ~106px | ✅ OK |
| A1/A2/A3 | w-12 (48px) | px-0.5 (2px) | 52px each | ✅ OK |
| End/Run | w-14 (56px) | px-0.5 (2px) | 58px each | ✅ OK |
| X/10 | w-12 (48px) | px-0.5 (2px) | 52px each | ✅ OK |
| Card | w-16 (64px) | px-0.5 (2px) | 66px | ✅ OK |

**Total Estimated:** ~548px (content) + borders/spacing = ~560-570px

**Recommendation:** 450px minimum is **TOO TIGHT** - will cause content overflow

**Better Option:** Use **500px minimum** to allow comfortable spacing while still being mobile-friendly.

---

## Alternative: Responsive Minimum Width

Consider using different minimum widths based on screen size:

```html
<table class="min-w-[450px] sm:min-w-[500px] md:min-w-[600px]">
```

Or use a calculation:
```html
<table class="min-w-[max(450px,100%)]">
```

---

## Final Recommendation

**Option 1 (Recommended):** Set to **500px minimum**
- Allows comfortable spacing with current padding
- Better fit on iPhone XR (only 86px scroll instead of 36px)
- Still compact enough for mobile

**Option 2:** Set to **450px minimum** but reduce column widths slightly
- Reduce Archer column to `max-w-[90px]`
- Consider reducing End/Run to `w-12` (48px)
- May require tighter padding adjustments

**Option 3:** Keep **600px minimum** but optimize padding further
- Maintains current spacing
- More horizontal scroll on mobile (acceptable trade-off)

