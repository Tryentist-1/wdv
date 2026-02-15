# Keypad Score Entry Flow Documentation

## Overview
The keypad is a critical component for mobile score entry across multiple modules (ranking rounds, solo matches, team matches). This document captures the complete flow, dependencies, and requirements to ensure no regressions during CSS refactoring.

## Architecture

### Shared Keypad Module
**`js/score_keypad.js`** (`ScoreKeypad`) is the canonical shared keypad implementation. Modules initialize it with configuration options rather than duplicating keypad logic.

### Modules Using Keypad
1. **ranking_round_300.js** - Primary ranking round scoring (uses `ScoreKeypad`)
2. **solo_card.js** - 1v1 match scoring (migrated to `ScoreKeypad` Feb 2026)
3. **team_card.js** - Team match scoring (uses `ScoreKeypad`)
4. **score-with-keypad.js** - Legacy scoring with keypad
5. **solo_round.js** - Legacy solo round scoring

### Common Pattern (ScoreKeypad Module)
All modern implementations use `ScoreKeypad.init()` with configuration:
- `inputSelector` - CSS selector for score input elements
- `getInputKey` - Function to generate unique key per input (for tracking)
- `onShow` / `onHide` - Callbacks for body class toggling
- Handles focus management, auto-advance, and `readonly` input compatibility
- Fixed position keypad at bottom of screen
- Grid layout (4 columns)
- Score buttons (X, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, M)
- Navigation buttons (prev, next, clear, close)

```javascript
// Example: solo_card.js initialization
scoreKeypad = ScoreKeypad.init(keypadElement, {
    inputSelector: '#scoring-view input[type="text"]',
    getInputKey: (input) => [input.dataset.archer, input.dataset.end, input.dataset.arrow].join('|'),
    onShow: () => document.body.classList.add('keypad-visible'),
    onHide: () => document.body.classList.remove('keypad-visible')
});
```

## CSS Dependencies

### Critical Selectors (DO NOT BREAK)
```css
.keypad-container          /* Fixed positioning, z-index, safe-area padding */
.keypad                    /* Grid layout (4 columns) */
.keypad-btn                /* Button sizing, touch targets */
.keypad-btn:active         /* Touch feedback */
.keypad-btn[data-value="X"] /* Score-specific colors */
.keypad-btn[data-action="clear"] /* Action button colors */
```

### Layout Requirements
- **Position**: `fixed` at `bottom: 0` or `bottom: calc(var(--footer-height) + 10px)`
- **Z-index**: Must be above content (1001+) but below modals (2000+)
- **Width**: 100% of viewport
- **Height**: ~240px (adjusts on mobile)
- **Safe Area**: `padding-bottom: env(safe-area-inset-bottom)` for iOS
- **Grid**: `grid-template-columns: repeat(4, 1fr)`
- **Gap**: 8px (5px on mobile)

### Touch Target Requirements
- **Minimum size**: 44x44px (iOS HIG, Android Material)
- **Current desktop**: 15px padding, 1.2em font
- **Current mobile**: 10px padding, 1em font
- **Smallest screen**: 55x55px buttons with 44px minimum

### Color System (Score Buttons)
```
X, 10, 9  → Gold (#FFCC00, #ffc107) - black text
8, 7      → Red (#DD0000, #dc3545) - white text
6, 5      → Blue (#66CCFF, #0dcaf0) - black text
4, 3      → Black (#333333, #000000) - white text
2, 1      → White (#FFFFFF) - black text
M         → White - gray text (#999, #adb5bd)
```

### Action Button Colors
```
prev/next → Orange (#fd7e14, #f28c18)
clear     → Red (#d92d20, #dc3545)
close     → Blue (#2d7dd9, #007bff)
```

## JavaScript Hooks

### State Management (ScoreKeypad Module)
The shared module manages state internally. Modules interact via `showForInput()`:
```javascript
// Module event handlers call showForInput() — all state managed by ScoreKeypad
document.body.addEventListener('focusin', (e) => {
    if (e.target.matches('#scoring-view input[type="text"]') && scoreKeypad) {
        if (state.locked) { e.target.blur(); return; }
        scoreKeypad.showForInput(e.target);
    }
});
// Click handler as fallback for readonly inputs on mobile
scoreTableContainer.addEventListener('click', (e) => {
    const input = e.target.closest('#scoring-view input[type="text"]');
    if (!input || state.locked || !scoreKeypad) return;
    scoreKeypad.showForInput(input);
});
```

### Critical Event Handlers
1. **Input Focus (`focusin`)** - Calls `scoreKeypad.showForInput(input)` — shows keypad, sets focused input
2. **Input Click (fallback)** - Same as above, needed because `readonly` inputs may not fire `focusin` on mobile tap
3. **Keypad Click** - ScoreKeypad handles score entry, navigation, auto-advance internally
4. **Body Class** - `keypad-visible` toggled via `onShow`/`onHide` callbacks

### Flow Sequence
```
1. User taps score input field
   → focusin or click handler fires
   → scoreKeypad.showForInput(input)
   → ScoreKeypad tracks currentlyFocusedInput internally
   → onShow callback: document.body.classList.add('keypad-visible')

2. User taps keypad button
   → ScoreKeypad handles internally
   → Extract data-value or data-action
   → Update input.value
   → input.dispatchEvent(new Event('input'))
   → Apply score color class to parent cell
   → Auto-advance to next input

3. User taps close or navigates away
   → ScoreKeypad hides keypad
   → onHide callback: document.body.classList.remove('keypad-visible')
   → input.blur()
```

### Important: `readonly` Input Compatibility
Score inputs use `readonly` to prevent the native keyboard from appearing on mobile. This means:
- `focusin` may NOT fire on tap in some mobile browsers
- A `click` event listener is required as a fallback
- Do NOT check `e.target.readOnly` in handlers — the `state.locked` flag is the correct guard
- The ScoreKeypad module handles `.focus()` calls for auto-advance correctly with readonly inputs

### Data Attributes Used
- `data-value="X"` - Score values (X, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, M)
- `data-action="prev"` - Navigate to previous input
- `data-action="next"` - Navigate to next input
- `data-action="clear"` - Clear current input
- `data-action="close"` - Hide keypad

### Input Element Requirements
Score input elements must have:
- `type="text"`
- `class="score-input"`
- Data attributes for state tracking (archer, end, arrow, team, etc.)
- Parent element that receives score color classes

## Mobile Behaviors

### iOS Safari Specific
- **Safe Area**: Bottom padding must use `env(safe-area-inset-bottom)`
- **Tap Highlight**: `-webkit-tap-highlight-color: transparent`
- **Touch Action**: `touch-action: manipulation` prevents zoom
- **Viewport**: `user-scalable=no` prevents pinch zoom (current setting)

### Android Chrome Specific
- **Touch Targets**: Minimum 48dp (roughly 44-48px)
- **Ripple Effect**: Native button active state
- **Keyboard**: Must not conflict with system keyboard

### Responsive Breakpoints
```css
@media (max-width: 600px) {
  .keypad { gap: 5px; }
  .keypad-btn { padding: 10px 5px; font-size: 1em; }
}

@media (max-width: 350px) {
  .keypad { max-width: 220px; gap: 0.15rem; }
  .keypad-btn { width: 55px; height: 55px; min-width: 44px; min-height: 44px; }
}
```

## Visual States

### Button States
1. **Default** - Base colors per score value
2. **Active/Touch** - `filter: brightness(0.8)` or darker background
3. **Disabled** - Not currently used, but may be needed for locked scores

### Keypad Visibility
- **Hidden**: `display: none`
- **Visible**: `display: grid`
- No transitions currently (instant show/hide)

## Integration Points

### With Score Tables
- Input elements are rendered inside table cells
- Parent `<td>` receives score color classes
- Cell classes: `.score-x`, `.score-10`, `.score-9`, etc.

### With Modals
- Keypad z-index (1001) must be below modal z-index (2000+)
- Modals should hide keypad when opened

### With Footer
- Global footer has z-index 1000
- Keypad positioned above footer: `bottom: calc(var(--footer-height) + 10px)`

## Testing Requirements

### Critical Test Cases
1. ✅ Keypad appears on input focus
2. ✅ Score buttons update input value
3. ✅ Score colors apply correctly to cells
4. ✅ Navigation (prev/next) moves between inputs
5. ✅ Clear button empties input
6. ✅ Close button hides keypad
7. ✅ Auto-advance after score entry works
8. ✅ Touch targets meet minimum size (44px)
9. ✅ Safe area padding works on iOS notched devices
10. ✅ No conflicts with system keyboard

### Device Testing Matrix
- iPhone SE (small screen)
- iPhone 14 Pro (notch + safe area)
- iPad (larger touch targets)
- Android phone (Chrome)
- Android tablet

### Regression Checklist
- [ ] Keypad positioning unchanged
- [ ] Button colors match exactly
- [ ] Touch targets still meet minimum size
- [ ] Safe area padding preserved
- [ ] Grid layout maintains 4 columns
- [ ] Score entry flow uninterrupted
- [ ] Auto-advance behavior unchanged
- [ ] Navigation buttons work correctly

## Migration Strategy

### Phase 1: Extract to Tokens (Safe)
- Convert hard-coded colors to CSS variables
- Keep all selectors and specificity unchanged
- Test on real devices after each change

### Phase 2: Consolidate Duplicates (Careful)
- Merge duplicate keypad styles across files
- Maintain exact visual output
- Test all modules using keypad

### Phase 3: Theme Support (New Feature)
- Add dark mode color variants
- Ensure contrast meets WCAG AA
- Test legibility in both themes

## Known Issues & Quirks

### Current Implementation Variations
1. **main.css** - Most complete, uses CSS variables
2. **team_round.css** - Standalone, hard-coded colors
3. **keypad.css** - Duplicate of team_round.css
4. **keypad-css-button-fix.css** - Fixes for 4/3 button colors

### Inconsistencies to Resolve
- Multiple definitions of same selectors
- Varying z-index values (2500 vs 1001)
- Different safe-area implementations
- Inconsistent responsive breakpoints

### Must Preserve
- Exact button colors (users are trained on color coding)
- Touch target sizes (accessibility requirement)
- Auto-advance behavior (workflow efficiency)
- Safe area padding (iOS notch compatibility)

## References

### Files to Review
- `js/score_keypad.js` - **Shared keypad module (canonical implementation)**
- `css/main.css` (lines 432-901)
- `css/keypad.css` (entire file)
- `css/team_round.css` (lines 470-690)
- `css/keypad-css-button-fix.css` (entire file)
- `js/ranking_round_300.js` - Uses ScoreKeypad
- `js/solo_card.js` - Uses ScoreKeypad (migrated Feb 2026)
- `js/team_card.js` - Uses ScoreKeypad

### Design System Integration
When creating design tokens, ensure these keypad-specific tokens exist:
- `--keypad-height`
- `--keypad-gap`
- `--keypad-button-padding`
- `--keypad-button-font-size`
- `--keypad-z-index`
- Score color tokens (already exist as `--score-gold`, etc.)
- Action button color tokens

---

**Last Updated**: 2026-02-12  
**Status**: Updated — All modules now use shared `ScoreKeypad` module (`js/score_keypad.js`). Solo card migrated from inline keypad (Feb 2026).

