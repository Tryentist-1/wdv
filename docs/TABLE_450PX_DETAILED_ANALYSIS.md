# Table Width 450px - Detailed Impact Analysis

## Current State Analysis

### Column Widths (Current):
```
Archer:  max-w-[100px] + px-1.5 (6px) = ~106px max
A1:      w-12 (48px) + px-0.5 (2px) = 50px
A2:      w-12 (48px) + px-0.5 (2px) = 50px
A3:      w-12 (48px) + px-0.5 (2px) = 50px
End:     w-14 (56px) + px-0.5 (2px) = 58px
Run:     w-14 (56px) + px-0.5 (2px) = 58px
X:       w-12 (48px) + px-0.5 (2px) = 50px
10:      w-12 (48px) + px-0.5 (2px) = 50px
Card:    w-16 (64px) + px-0.5 (2px) = 66px
─────────────────────────────────────────
TOTAL:   ~538px (minimum)
         + borders (~2-10px) = ~540-548px actual minimum
```

### Current min-width: 600px
### Proposed min-width: 450px
### Difference: -150px reduction

---

## Impact Analysis

### ⚠️ **CRITICAL ISSUE: Width Mismatch**

**Problem:** Current columns need ~540px, but minimum width would be 450px  
**Result:** Browser will force columns to compress, causing:
- Content overflow or wrapping
- Columns may become unreadable
- Score inputs may be too narrow
- Totals may not display correctly

---

## Options to Make 450px Work

### Option A: Reduce Column Widths (Recommended)

Reduce column widths to fit 450px:

| Column | Current | Proposed | Savings |
|--------|---------|----------|---------|
| Archer | max-w-[100px] | max-w-[85px] | -15px |
| A1/A2/A3 | w-12 (48px) | w-10 (40px) | -24px total |
| End/Run | w-14 (56px) | w-12 (48px) | -16px total |
| X/10 | w-12 (48px) | w-10 (40px) | -16px total |
| Card | w-16 (64px) | w-14 (56px) | -8px |
| **TOTAL** | **~538px** | **~459px** | **-79px** |

**New Calculation:**
- Archer: ~91px (85px + 6px padding)
- A1-A3: 126px (42px × 3)
- End/Run: 100px (50px × 2)
- X/10: 84px (42px × 2)
- Card: 58px (56px + 2px)
- **Total: ~459px** ✅ Fits in 450px minimum

### Option B: Use 500px Minimum (Safer)

Keep current column widths, set minimum to 500px:
- Better than 600px for mobile
- Maintains current spacing
- Less risk of issues
- Only 86px scroll on iPhone XR

### Option C: Responsive Minimum

```html
min-w-[450px] sm:min-w-[500px] md:min-w-[600px]
```

---

## Device Impact Comparison

### iPhone XR (414px viewport):
- **600px min:** 186px horizontal scroll
- **500px min:** 86px horizontal scroll
- **450px min:** 36px horizontal scroll ✅ Best

### iPhone SE (375px viewport):
- **600px min:** 225px horizontal scroll
- **500px min:** 125px horizontal scroll
- **450px min:** 75px horizontal scroll ✅ Best

### Samsung Galaxy (360px viewport):
- **600px min:** 240px horizontal scroll
- **500px min:** 140px horizontal scroll
- **450px min:** 90px horizontal scroll ✅ Best

---

## Recommendation

**For 450px minimum width:**

1. ✅ **Change minimum width to 450px**
2. ⚠️ **Reduce column widths** to fit:
   - Archer: `max-w-[85px]` (from 100px)
   - A1/A2/A3: `w-10` (40px, from 48px)
   - End/Run: `w-12` (48px, from 56px)
   - X/10: `w-10` (40px, from 48px)
   - Card: `w-14` (56px, from 64px)

**OR** use **500px minimum** with current column widths (safer, less changes).

Let me know which approach you prefer!

