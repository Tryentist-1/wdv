# Module Comparison & UI Consistency Summary

**Date:** November 23, 2025  
**Purpose:** Quick visual snapshot after Phase 2 integration + the gaps we still need to close.

---

## 🎯 Big Picture

```
✅ Ranking Round 360  ┐
✅ Ranking Round 300  ├─ Fully integrated (DB + LiveUpdates + Auth)
✅ Solo Olympic Match ┤
✅ Team Olympic Match ┘

🏹 Practice Analyzer  – intentionally standalone (p5.js, local-only)
```

All four production scoring modules now share the same backend stack (MySQL, `/api/v1`, LiveUpdates queue). The remaining inconsistencies are in the UI layer: ranking rounds still run on legacy CSS, while Solo/Team/Results use Tailwind and new shared components.

---

## 📊 Module Status Snapshot

| Feature | Ranking 360 | Ranking 300 | Solo Match | Team Match |
|---------|-------------|-------------|------------|------------|
| **Database** | ✅ rounds, round_archers, end_events | ✅ same | ✅ solo_matches + sets | ✅ team_matches + sets |
| **Local Storage** | Session cache + offline queue | Session cache + offline queue | Session cache + offline queue | Session cache + offline queue |
| **Authentication** | Event code + coach key | Event code + coach key | Event code or match code | Event code or match code |
| **Coach Visibility** | ✅ `results.html`, Coach Console | ✅ | ✅ `/v1/events/:id/solo-matches` | ✅ `/v1/events/:id/team-matches` |
| **Live Sync** | ✅ LiveUpdates (`postEnd`) | ✅ | ✅ `ensureSoloMatch/postSoloSet` | ✅ `ensureTeamMatch/postTeamSet` |
| **UI Framework** | Legacy CSS (`css/main.css`) | Legacy CSS | Tailwind + safe-area classes | Tailwind + safe-area classes |
| **Scorecard Renderer** | Custom table per page | Custom table per page | Shared ScorecardView + keypad | Shared ScorecardView + keypad |

---

## ⚠️ Inconsistencies to Fix

### 1. UI Framework Split
- Ranking pages still import `css/main.css` and bespoke `.score-input` styles, so they ignore safe-area padding, dark mode, and 44px targets that we enforce elsewhere.
- Solo/Team/Coach/Results are already Tailwind-first (`css/tailwind-compiled.css`).

### 2. Archer List Logic Duplicated
- `getRosterState` + selector rendering lives in `js/ranking_round.js`, `js/ranking_round_300.js`, `js/solo_card.js`, `js/team_card.js`, and `archer_list.html`.
- Favorites, search, and “self archer” badges behave slightly differently in each module.

### 3. Scorecard & Results Rendering Fragmented
- Ranking rounds render their own scoring table (`js/ranking_round.js:626+`), Solo/Team use ScorecardView, and results pages (`results.html`, `archer_results_pivot.html`, `archer_history.html`) each reinvent leaderboard tables.
- Helper functions like `parseScoreValue` / `getScoreColor` are defined in five places even though `js/common.js` exists.

### 4. Legacy Artifacts Still in Tree
- `js/score.js`, `solo_round.html/js`, and `team_round.css` are legacy but still show up in searches, making it easy to edit the wrong file.

---

## ✅ Action Plan (mirrors Architecture doc §3)

1. **Archer Selector Component**
   - Build `js/archer_selector.js` on top of `ArcherModule`.
   - Support `multi`, `dual`, and `team` modes so every scoring page uses identical markup + logic.

2. **ScorecardView Everywhere**
   - Extend `js/scorecard_view.js` so it can power editable tables.
   - Adopt Tailwind in `ranking_round*.html` and drop `css/main.css`.
   - Extract the keypad logic from `js/solo_card.js:579-640` into a shared module.

3. **Results View Platform**
   - Create `js/results_view.js` to normalize `/events/:id/snapshot` + `/archers/:id/history`.
   - Reuse it in `results.html`, `archer_results_pivot.html`, `archer_history.html`, and Coach Console tabs.

4. **Document & Flag Legacy Files**
   - Mark archived files at the top (e.g., banner comment “LEGACY – DO NOT EDIT”).
   - Update `README.md` and `docs/DEVELOPMENT_WORKFLOW.md` to point contributors at the modern Solo/Team files.

---

## 🔗 References
- `js/ranking_round.js:151-360` – current selector + table code.
- `js/solo_card.js:188-520` / `js/team_card.js:205-520` – Tailwind-based selectors & score tables.
- `results.html:200-334`, `archer_results_pivot.html:334-520`, `archer_history.html:200-282` – independent leaderboard/render logic.
- `js/scorecard_view.js` – shared per-archer modal component.
