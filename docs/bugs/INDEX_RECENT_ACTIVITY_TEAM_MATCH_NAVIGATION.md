# index.html + team_card.js Bugs: Recent Activity Hidden & Team Match Deep-Link

**Date:** 2026-02-18  
**Page/Module:** `index.html` (Archer Window), `js/team_card.js`  
**Severity:** Medium  
**Status:** ✅ Fixed  

---

## 🐛 Bug 1 — Recent Activity Hidden for Archers with No Open Assignments

### Description

The "Recent Activity" section on `index.html` never rendered for archers who had completed
all their rounds and had no active open assignments (e.g. Alina Vizcarra post-event).

Additionally, switching from an archer with active assignments to one without left the
previous archer's Recent Activity cards visible (stale data).

**User Impact:**
- Archer opens their dashboard after completing all rounds — "Recent Activity" is invisible
  even though they have a full history of completed matches and ranking rounds.
- Switching archer shows the wrong person's history.

---

## 🔍 Steps to Reproduce

1. Select an archer with no open assignments (all rounds completed)
2. Observe "Recent Activity" section → hidden / missing
3. Switch from an archer WITH open assignments to one WITHOUT
4. Observe → previous archer's Recent Activity persists (stale)

---

## 🔍 Root Cause Analysis

### The Problem

In `index.html`, `loadOpenAssignments()` contained this flow:

```javascript
// … clear list elements …

if (assignments.length === 0) {
    return;    // ← Early return fires for archers with no active work
}

// … render assignments …

renderRecentActivity(fullHistory, archerId);  // ← Never reached!
```

`renderRecentActivity()` was positioned *after* the `assignments.length === 0` early return,
so it was unreachable for archers with no open assignments.

The same early return also meant nothing cleaned up the previous archer's Recent Activity
DOM nodes, causing stale data to persist.

---

## ✅ Solution

**File:** `index.html`  
**Function:** `loadOpenAssignments()`

Moved `renderRecentActivity(fullHistory, archerId)` to **before** the early return:

```javascript
// Before
if (assignments.length === 0) { return; }
// … render assignments …
renderRecentActivity(fullHistory, archerId);

// After
renderRecentActivity(fullHistory, archerId);   // ← Runs regardless
if (assignments.length === 0) { return; }
// … render assignments …
```

`renderRecentActivity()` itself already handles the case where there are no completed items
(it hides the container). So this change has no side-effects for archers with no history.

Removed the now-duplicate `renderRecentActivity()` call at the bottom of the assignments block.

---

## 🐛 Bug 2 — Team Match Deep-Link Opens Setup View Instead of Scoring View

### Description

Clicking a completed team match in "Recent Activity" (link: `team_card.html?match=UUID`)
loads `team_card.html` but shows the **Setup View** instead of the **Scoring View**, even
though the match is fully hydrated from the database.

**User Impact:**
- Users cannot view a completed team match scorecard from Recent Activity.
- Dev/test matches with 1 or 2 archers per side are always broken.

---

## 🔍 Steps to Reproduce

1. Select an archer with a completed team match in Recent Activity
2. Click the team match item
3. `team_card.html?match=<UUID>` loads
4. **Expected:** Scoring view with filled-in scores
5. **Actual:** Setup view (select teams screen)

---

## 🔍 Root Cause Analysis

In `js/team_card.js`, inside `init()`:

```javascript
// Too restrictive — requires exactly 3 archers per side
if (state.currentView === 'scoring' && state.team1.length === 3 && state.team2.length === 3) {
    renderScoringView();
} else {
    state.currentView = 'setup';
    renderSetupView();
}
```

`hydrateTeamMatch()` correctly sets `state.currentView = 'scoring'` for loaded matches, but
the guard also required **exactly 3 archers per team**. Any match with 1 or 2 archers per
side (common in dev/test) would fall through to the setup view.

---

## ✅ Solution

**File:** `js/team_card.js`  
**Function:** `init()`

Relaxed the guard from a hardcoded `=== 3` to any valid equal-sized team:

```javascript
// Before
if (state.currentView === 'scoring' && state.team1.length === 3 && state.team2.length === 3) {

// After
if (state.currentView === 'scoring' && state.team1.length > 0 && state.team1.length === state.team2.length) {
```

This allows 1-archer, 2-archer, or 3-archer team matches to all restore into the scoring view correctly.

---

## 🧪 Testing

- ✅ Alina Vizcarra (0 open assignments) — Recent Activity shows 4 items
- ✅ Clicking team match link → scoring view loads
- ✅ Switching Alina → Bryce → Alina — Recent Activity updates correctly each time
- ✅ Production health check passes — `build: 20260218151545`

---

## 📋 Files Changed

| File | Change |
|------|--------|
| `index.html` | Moved `renderRecentActivity()` before early-return guard; removed duplicate call |
| `js/team_card.js` | Relaxed `=== 3` archer count check to `> 0 && equal` |

---

**Status:** ✅ Fixed and deployed  
**Build:** `20260218151545`  
**Git Commit:** `0da4d15` + merged as `78723c9` on `main`  
**Deployed:** 2026-02-18
