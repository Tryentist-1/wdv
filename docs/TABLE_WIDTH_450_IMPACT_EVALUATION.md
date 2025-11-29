# Table Width 450px - Impact Evaluation

**Current:** `min-w-[600px]`  
**Proposed:** `min-w-[450px]`  
**Padding:** Already optimized (`px-0.5` = 2px for most columns, `px-1.5` = 6px for Archer)

---

## Column Width Calculation

### Current Column Setup:

| Column | Width Class | Padding | Total Width | Notes |
|--------|-------------|---------|-------------|-------|
| **Archer** | `max-w-[100px]` | `px-1.5` (6px) | ~106px max | Auto-sizes, truncated at 100px |
| **A1** | `w-12` (48px) | `px-0.5` (2px) | 50px | Score input cell |
| **A2** | `w-12` (48px) | `px-0.5` (2px) | 50px | Score input cell |
| **A3** | `w-12` (48px) | `px-0.5` (2px) | 50px | Score input cell |
| **End** | `w-14` (56px) | `px-0.5` (2px) | 58px | Total score (max 30) |
| **Run** | `w-14` (56px) | `px-0.5` (2px) | 58px | Running total (max 300) |
| **X** | `w-12` (48px) | `px-0.5` (2px) | 50px | X count (max ~30) |
| **10** | `w-12` (48px) | `px-0.5` (2px) | 50px | 10 count (max ~30) |
| **Card** | `w-16` (64px) | `px-0.5` (2px) | 66px | Button + badge |

### Total Width Calculation:
```
Archer:   ~100px (max, but may be narrower)
A1-A3:    150px (50px × 3)
End/Run:  116px (58px × 2)
X/10:     100px (50px × 2)
Card:     66px
───────────
Total:    ~532px (minimum with all columns at max width)
          + borders (1px each) ≈ ~540px minimum
```

**Conclusion:** With current column widths, table needs **~540px minimum** to fit all content comfortably.

---

## Impact of 450px Minimum Width

### ❌ **Problem: Content Will Overflow**

At 450px, the table would be **90px too narrow** for the current column configuration:
- Columns will be compressed
- Content may wrap or overflow
- Some columns may not display properly

### ✅ **Benefits of Lower Minimum Width:**

1. **Better iPhone XR Fit**
   - iPhone XR portrait: 414px viewport
   - With 450px min: Only 36px horizontal scroll
   - Better than 600px (186px scroll)

2. **Smaller Devices**
   - iPhone SE (375px): 75px scroll (manageable)
   - Samsung Galaxy (360px): 90px scroll (acceptable)

---

## Recommendations

### Option 1: Adjust Column Widths for 450px (Recommended)

To fit 450px, we need to reduce column widths:

```javascript
// Proposed narrower widths for 450px:
- Archer: max-w-[90px] (was 100px) - reduce by 10px
- A1/A2/A3: w-10 (40px, was 48px) - reduce by 8px each = 24px saved
- End/Run: w-12 (48px, was 56px) - reduce by 8px each = 16px saved
- X/10: w-10 (40px, was 48px) - reduce by 8px each = 16px saved
- Card: w-14 (56px, was 64px) - reduce by 8px

Total saved: ~82px (reduces from ~540px to ~458px)
```

**New Calculation:**
- Archer: ~96px (90px + 6px padding)
- A1-A3: 126px (42px × 3 with 2px padding)
- End/Run: 100px (50px × 2 with 2px padding)
- X/10: 84px (42px × 2 with 2px padding)
- Card: 58px (56px + 2px padding)
- **Total: ~464px** (fits comfortably in 450px minimum)

### Option 2: Use 500px Minimum (Safer)

Keep current column widths but set minimum to 500px:
- Still better than 600px for mobile
- Maintains current spacing
- Less risk of content overflow
- Only 86px scroll on iPhone XR (vs 186px with 600px)

### Option 3: Responsive Minimum Width

```javascript
min-w-[450px] sm:min-w-[500px] md:min-w-[600px]
```

---

## Testing Checklist

### Before Changing:
- [ ] Test with longest archer name (verify truncation works)
- [ ] Test with max scores (30 for end, 300 for running total)
- [ ] Verify all columns are readable
- [ ] Check touch targets remain 44px minimum

### After Changing to 450px + Narrower Columns:
- [ ] Verify archer names still readable at 90px max-width
- [ ] Check score inputs still fit in 40px columns
- [ ] Test totals display correctly in 48px columns
- [ ] Verify Card button is still usable at 56px width
- [ ] Test on iPhone XR (414px) - verify scrolling works
- [ ] Test on iPhone SE (375px) - verify usability

---

## Final Recommendation

**For 450px minimum width**, I recommend **Option 1** - adjust column widths:

1. Reduce Archer column: `max-w-[90px]` (from 100px)
2. Reduce A1/A2/A3: `w-10` (40px, from 48px)
3. Reduce End/Run: `w-12` (48px, from 56px)
4. Reduce X/10: `w-10` (40px, from 48px)
5. Reduce Card: `w-14` (56px, from 64px)

This will allow the table to fit in 450px while maintaining readability.

**Alternative:** Use **500px minimum** with current column widths (safer, less changes needed).

