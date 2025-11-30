# UI Hierarchy Improvement Plan
## Making Events → Rounds → Brackets More Visible

**Problem Statement:**
The current UI obscures the relationship between Events, Rounds, and Brackets, making:
- Verification process harder (can't see which round/bracket you're verifying)
- Archer history confusing (rounds and brackets not clearly distinguished)
- Results tracking confusing (hierarchy not visible)

**Current State:**
- Events table shows only event name, date, status
- Edit Event modal shows rounds and brackets in separate lists, but no hierarchy
- Verify modal shows division/bale but not round/bracket context
- Archer history shows rounds but brackets are unclear
- Results page shows divisions but rounds/brackets are hidden

---

## Proposed Solutions

### 1. Events Table Enhancement
**Current:** Just shows event name, date, status, actions
**Proposed:** Add expandable rows or summary badges

**Options:**
- **Option A:** Add summary badges showing "3 Rounds, 2 Brackets"
- **Option B:** Expandable rows showing rounds/brackets inline
- **Option C:** Add a "View Structure" button that opens hierarchy view

**Recommendation:** Option A (badges) + Option C (hierarchy view)

### 2. Edit Event Modal - Hierarchy View
**Current:** Rounds and brackets in separate flat lists
**Proposed:** Tree/hierarchy view showing:
```
Event: Fall Tournament
├── Rounds
│   ├── OPEN - R300 (18 archers) [View] [Verify]
│   ├── BVAR - R300 (12 archers) [View] [Verify]
│   └── GVAR - R300 (8 archers) [View] [Verify]
└── Brackets
    ├── Solo Elimination - BVAR (8 entries) [View Results]
    └── Team Swiss - OPEN (6 entries) [View Results]
```

**Benefits:**
- Clear visual hierarchy
- Quick access to round/bracket actions
- Shows relationships

### 3. Verify Modal - Round/Bracket Context
**Current:** Shows division and bale only
**Proposed:** Add breadcrumb or header showing:
```
Verify Scorecards - Fall Tournament
Round: OPEN - R300 | Bale: 3
```

**Benefits:**
- Always know which round you're verifying
- Can navigate to bracket if applicable

### 4. Archer History - Round/Bracket Distinction
**Current:** Shows rounds but brackets unclear
**Proposed:** 
- Add visual distinction (badges/icons)
- Show round type vs bracket type
- Add links to bracket results if applicable

**Example:**
```
Event: Fall Tournament
├── OPEN - R300 (Ranking Round) - Score: 285
└── BVAR Elimination (Bracket) - Match: Q1 vs Alex
```

### 5. Results Page - Round/Bracket Navigation
**Current:** Shows divisions only
**Proposed:**
- Add tabs or sections for Rounds vs Brackets
- Show round results and bracket results separately
- Add navigation between rounds and brackets

### 6. Navigation Improvements
**Proposed:**
- Add "View Round" links from events table
- Add "View Bracket" links from events table
- Add breadcrumbs: Event > Round > Bracket
- Add quick navigation between related rounds/brackets

---

## Implementation Priority

### Phase 1: Quick Wins (High Impact, Low Effort)
1. ✅ Add round/bracket count badges to events table
2. ✅ Add round/bracket context to verify modal header
3. ✅ Add visual distinction in archer history (round vs bracket)

### Phase 2: Hierarchy View (Medium Effort)
4. ✅ Create expandable hierarchy view in Edit Event modal
5. ✅ Add breadcrumb navigation

### Phase 3: Full Integration (Higher Effort)
6. ✅ Update results page with round/bracket tabs
7. ✅ Add round/bracket navigation throughout app
8. ✅ Create dedicated round/bracket detail views

---

## Design Considerations

### Visual Hierarchy
- Use indentation or tree structure
- Use icons to distinguish rounds vs brackets
- Use color coding (rounds = blue, brackets = green)
- Use badges for counts and status

### Mobile Optimization
- Collapsible sections
- Touch-friendly navigation
- Clear visual separation

### Consistency
- Apply same hierarchy pattern across all views
- Use same terminology everywhere
- Maintain same navigation patterns

---

## Next Steps

1. Review and approve plan
2. Start with Phase 1 quick wins
3. Test with users
4. Iterate based on feedback
5. Continue with Phase 2 and 3

