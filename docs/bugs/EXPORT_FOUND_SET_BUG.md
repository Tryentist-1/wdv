# Export Functions Not Using Found Set (Filtered Results)

**Status:** 🔴 Open  
**Priority:** Medium  
**Created:** January 13, 2026  
**Affected:** All export functions in archer_list.html

---

## Problem Description

When users filter or search for archers in the "Manage Archers" page, export functions (Shirt Order Export, Coach Roster Export, USA Archery Export) export the **entire archer list** instead of only the **filtered/found set** that is currently displayed.

### Current Behavior

1. User searches for "Smith" → Shows 3 archers matching "Smith"
2. User clicks "Export Shirt Order" → Exports **all archers** in the database, not just the 3 filtered results
3. User filters by status "Active" → Shows only active archers
4. User clicks "Export Coach Roster CSV" → Exports **all archers** (active and inactive)

### Expected Behavior

Export functions should export only the archers that are currently visible in the filtered/found set, respecting:
- Search filter (text search)
- Status filter (Active/Inactive/All)
- Favorites filter (if enabled)
- Any other active filters

---

## Root Cause

Export functions call `ArcherModule.loadList()` which returns the **entire archer list** from localStorage, ignoring any filters applied in the UI.

### Affected Functions

1. **`exportShirtOrderCSV()`** in `js/archer_module.js`
   - Currently: `const list = await this.loadFromMySQL();` or `this.loadList()`
   - Should: Use filtered results from current view

2. **`exportCoachRosterCSV()`** in `js/archer_module.js`
   - Currently: `const list = this.loadList();`
   - Should: Use filtered results from current view

3. **`exportUSAArcheryCSV()`** in `js/archer_module.js`
   - Currently: `const list = this.loadList();`
   - Should: Use filtered results from current view

### Filtering Logic Location

The filtering logic exists in `renderList()` and `renderShirtSizesList()` functions in `archer_list.html`:

```javascript
// Lines 448-474 in archer_list.html
const filter = searchInput.value.toLowerCase();
let items = list.map((archer, index) => ({ archer, index }));

// Status filter
if (statusValue !== 'all') {
    items = items.filter(item => (item.archer.status || 'active').toLowerCase() === statusValue);
}

// Search filter
if (filter) {
    items = items.filter(({ archer }) =>
        `${archer.first} ${archer.last}`.toLowerCase().includes(filter) ||
        (archer.nickname || '').toLowerCase().includes(filter) ||
        (archer.school || '').toLowerCase().includes(filter)
    );
}

// Favorites filter
if (showFavoritesOnly) {
    items = items.filter(({ archer }) => 
        friendSet.has(archer.extId) || (selfExtId && archer.extId === selfExtId)
    );
}
```

The filtered `items` array contains the "found set" but is not accessible to export functions.

---

## Impact

### User Impact
- **High frustration:** Users expect to export only what they see
- **Data quality issues:** Exports contain unwanted data
- **Workflow disruption:** Users must manually filter exported CSV files
- **Confusion:** Export doesn't match what's displayed on screen

### Use Cases Affected
1. Coach wants to export shirt orders for only "Active" archers
2. Coach searches for specific archers and wants to export only those
3. Coach filters by favorites and wants to export only friends
4. Any filtered view export scenario

---

## Proposed Solution

### Option 1: Pass Filtered List to Export Functions (Recommended)

Modify export functions to accept an optional filtered list parameter:

```javascript
// In js/archer_module.js
exportShirtOrderCSV(filteredList = null) {
    const list = filteredList || await this.loadFromMySQL();
    // ... rest of function
}
```

Then in `archer_list.html`, extract the filtered items and pass them:

```javascript
// In export button handler
coachActionExportShirtOrderBtn.onclick = async () => {
    closeCoachActionsModal();
    
    // Get current filtered set
    const state = getRosterState();
    const { list } = state;
    const filter = searchInput.value.toLowerCase();
    const statusValue = statusFilter.value;
    
    // Apply same filters as renderList()
    let filteredItems = list.map((archer, index) => ({ archer, index }));
    
    if (statusValue !== 'all') {
        filteredItems = filteredItems.filter(item => 
            (item.archer.status || 'active').toLowerCase() === statusValue
        );
    }
    
    if (filter) {
        filteredItems = filteredItems.filter(({ archer }) =>
            `${archer.first} ${archer.last}`.toLowerCase().includes(filter) ||
            (archer.nickname || '').toLowerCase().includes(filter) ||
            (archer.school || '').toLowerCase().includes(filter)
        );
    }
    
    if (showFavoritesOnly) {
        const { selfExtId, friendSet } = state;
        filteredItems = filteredItems.filter(({ archer }) => 
            friendSet.has(archer.extId) || (selfExtId && archer.extId === selfExtId)
        );
    }
    
    // Extract just the archer objects
    const filteredArchers = filteredItems.map(item => item.archer);
    
    // Export filtered list
    await ArcherModule.exportShirtOrderCSV(filteredArchers);
};
```

### Option 2: Create Shared Filter Function

Extract filtering logic into a reusable function:

```javascript
function getFilteredArchers(state, searchFilter, statusFilter, showFavoritesOnly) {
    // Centralized filtering logic
    // Returns filtered archer list
}
```

### Option 3: Store Filtered Set in Global State

Store the current filtered set in a global variable that export functions can access:

```javascript
let currentFilteredArchers = [];

// In renderList(), after filtering:
currentFilteredArchers = items.map(item => item.archer);

// In export functions:
const list = currentFilteredArchers.length > 0 ? currentFilteredArchers : this.loadList();
```

---

## Implementation Notes

### Considerations

1. **Shirt Sizes View:** The `renderShirtSizesList()` function also applies filters. Export should respect the current view mode.

2. **View Mode:** Need to check if `viewMode === 'shirtSizes'` and use appropriate filtering logic.

3. **Sort Order:** Should exports maintain the current sort order? (Currently sorted by name/level)

4. **Empty Results:** What happens if no archers match the filter? Should export be disabled or show a message?

5. **Backward Compatibility:** If no filtered list is provided, should fall back to full list (current behavior)?

### Testing Checklist

- [ ] Export with search filter active
- [ ] Export with status filter active
- [ ] Export with favorites filter active
- [ ] Export with multiple filters active
- [ ] Export with no filters (should export all)
- [ ] Export from shirt sizes view
- [ ] Export with empty results (should show message)
- [ ] Verify all three export functions work correctly

---

## Related Files

- `archer_list.html` - Contains filtering logic and export button handlers
- `js/archer_module.js` - Contains export functions:
  - `exportShirtOrderCSV()`
  - `exportCoachRosterCSV()`
  - `exportUSAArcheryCSV()`

---

## Acceptance Criteria

✅ Export functions export only the currently visible/filtered archers  
✅ Filters include: search text, status, favorites  
✅ Works in both regular list view and shirt sizes view  
✅ Falls back to full list if no filters are active (or shows message)  
✅ All three export functions (Shirt Order, Coach Roster, USA Archery) are fixed  
✅ No breaking changes to existing functionality  

---

## Priority Justification

**Medium Priority** because:
- Affects user workflow and data quality
- Not a critical bug (system still functions)
- Easy to work around (manual CSV filtering)
- High user frustration when discovered
- Common use case (filtered exports)

---

## References

- Filtering logic: `archer_list.html` lines 436-502 (`renderList()`)
- Shirt sizes filtering: `archer_list.html` lines 708-735 (`renderShirtSizesList()`)
- Export handlers: `archer_list.html` lines 2920-2931 (Shirt Order), 2870-2881 (Coach Roster), 2916-2931 (USA Archery)
