# Bug: GAMES Event Creates Hundreds of Null-Division Rounds

**Date:** 2026-02-16  
**Area:** `POST /v1/rounds`, `LiveUpdates.ensureRound()`, GAMES event workflow  
**Severity:** High (data pollution, dashboard clutter, potential performance)  
**Status:** ✅ Fixed — branch `fix/games-event-empty-rounds`  

---

## 🐛 Bug Description

When a GAMES-format event exists, **505 rounds with `division = NULL`** were created in a ~7-minute window. All rounds have 0 archers and 0 scores. They show up on the Event Dashboard as "null - R300" entries, cluttering the UI and producing broken "View Results" links (`division=null`).

**Event:** LA Games TEST (`c9800ded-cd9f-40a5-9e99-b7ffc00a9ceb`)  
**Event type:** `manual`, format `GAMES`  
**Event created:** 2026-02-16 13:47:54  
**Null rounds created:** 2026-02-16 16:16:03 – 16:23:38 (505 rows)  

---

## 🔍 What We Know

### 1. All rounds are freshly created (not stolen from other events)
Each has a unique UUID and `created_at` from the same ~7-minute window. This is NOT the Strategy 4 round-reassignment bug (though that bug also exists and should be addressed separately).

### 2. `POST /v1/rounds` creates rounds without division
The API happily creates event-linked rounds when `division` is null. No validation prevents this.

### 3. Multiple client-side paths call `ensureRound` without division
These paths pass `eventId` but no `division`:

| Location | Line(s) | Context |
|----------|---------|---------|
| `postEndForArcherNow()` | ~4404 | Syncing a score when no round exists |
| `handleMasterSync()` | ~5693 | "Sync All" button |
| `onStartScoring()` | ~7708 | Live Updates wiring at page load |

All three use:
```javascript
LiveUpdates.ensureRound({
    roundType: 'R300',
    date: new Date().toISOString().slice(0, 10),
    eventId: state.activeEventId || state.selectedEventId
    // NO division, gender, or level
});
```

### 4. `ensureRound` does NOT deduplicate when division is null
`LiveUpdates.ensureRound()` caches `state.roundId` to avoid re-creation, but if the page reloads or multiple tabs exist, each instance calls `POST /rounds` independently.

### 5. The API dedup logic fails for null division
Strategy 1 (`eventId + division`) requires division. Strategy 4 (`roundType + date`) can match but only returns one existing round. With null division, Strategy 1 is skipped and Strategy 4 may or may not find a match depending on timing.

### 6. GAMES events don't have ranking rounds
GAMES events use Swiss brackets directly — they have no ranking divisions. The ranking round page / Live Updates code doesn't know this and tries to create R300 rounds anyway.

### 7. "Add Archers" button also creates unwanted rounds (Bug A)
`addArchersToEvent()` in `coach.js` is unaware of GAMES events. When a coach clicks "Add Archers" from the edit event modal, it checks for division rounds, finds none (GAMES events use brackets), and auto-creates an OPEN division round. This creates 1 orphan round with `division='OPEN'` per click.

---

## 🔍 Likely Trigger Scenario

Another coach was testing the system on event day, trying to add a walk-on archer:

1. Opened the coach console, clicked "Edit" on the GAMES event
2. Clicked "Add Archers" → **Bug A** triggered (created unwanted OPEN round)
3. While clicking around, navigated to `ranking_round_300.html?event={GAMES_EVENT_ID}` (via QR code or link)
4. **Bug B** triggered: `onStartScoring()` fired on page load, calling `ensureRound` without division
5. Each page load / tab / refresh created another null-division round
6. 505 rounds in 7 minutes = approximately one round per second (multiple tabs or rapid navigation)

---

## ✅ Root Cause Analysis

### The dual code-path problem

There is a well-designed function `ensureLiveRoundReady()` (line ~5218) that:
- Resolves division from state, archers, or event metadata
- **Validates** division exists before calling `ensureRound`
- Throws an error if division can't be determined

But **three call sites bypass it** and call `LiveUpdates.ensureRound()` directly without division:
- `onStartScoring()` (line ~7708) — page load / scoring button
- `postEndForArcherNow()` (line ~4404) — score sync
- `handleMasterSync()` (line ~5693) — "Sync All" button

Additionally, `addArchersToEvent()` in `coach.js` doesn't check event format and creates division rounds for GAMES events that should only use brackets.

### Why no deduplication
- API Strategy 1 (`eventId + division`) requires division → **skipped** when division is null
- API Strategy 4 (`roundType + date`) might match one existing round, but not reliably
- Client-side `LiveUpdates._state.roundId` cache is lost on page reload / new tabs

---

## ✅ Fix Implementation

### Fix 1: `coach.js` — Guard `addArchersToEvent()` for GAMES events

**File:** `js/coach.js`  
**Change:** Added `eventFormat` parameter to `addArchersToEvent()`. For GAMES events, shows an informational alert and returns without creating rounds. Updated call site in `editEvent()` to pass `event.event_format`.

### Fix 2: `ranking_round_300.js` — Route 3 call sites through `ensureLiveRoundReady()`

**File:** `js/ranking_round_300.js`  
**Change:** Replaced direct `LiveUpdates.ensureRound()` calls in all three locations with calls to `ensureLiveRoundReady()`, which validates division and will safely refuse to create rounds when division can't be determined (as with GAMES events).

| Location | Before | After |
|----------|--------|-------|
| `onStartScoring()` | `LiveUpdates.ensureRound({...})` | `ensureLiveRoundReady()` |
| `postEndForArcherNow()` | `LiveUpdates.ensureRound({...})` | `ensureLiveRoundReady()` |
| `handleMasterSync()` | `LiveUpdates.ensureRound({...})` | `ensureLiveRoundReady()` with ready-check |

### Fix 3: `api/index.php` — API guard (defense-in-depth)

**File:** `api/index.php`  
**Change:** Added validation in `POST /v1/rounds` to reject event-linked rounds when division is null/empty. Returns 400 with descriptive error. This prevents any future client-side bug from creating garbage rounds.

---

## 🧪 Testing Plan

### Test Cases

1. **GAMES event — "Add Archers" button**
   - Create a GAMES event, edit it, click "Add Archers"
   - Expected: Alert explaining GAMES uses brackets, no round created

2. **GAMES event — Ranking round page**
   - Open `ranking_round_300.html?event={GAMES_EVENT_ID}&code={CODE}`
   - Expected: No `POST /v1/rounds` call, no null-division round created

3. **API guard — null division rejection**
   - Send `POST /v1/rounds` with `eventId` but no `division`
   - Expected: 400 error response

4. **Sanctioned event — Normal flow (regression)**
   - Create a Sanctioned event, add archers, score a round
   - Expected: Division rounds created normally, Live Updates works

5. **Standalone round — No regression**
   - Start a standalone round (no event)
   - Expected: Round created normally with entry code

### Test Devices
- iPhone (Safari) — Primary
- Desktop (Chrome) — Regression

---

## 📋 Implementation Checklist

- [x] Root cause identified
- [x] Fix implemented (3 layers of defense)
- [ ] Code tested locally
- [ ] Mobile device tested
- [ ] Regression tests passed
- [ ] Documentation updated
- [ ] Ready for deployment

---

## 🧹 Cleanup (after fix deployed)

Once the fix is deployed, clean up the polluted data:

```sql
-- Preview: Count null-division rounds per event
SELECT r.event_id, e.name, COUNT(*) as null_rounds
FROM rounds r
LEFT JOIN events e ON e.id = r.event_id
WHERE (r.division IS NULL OR r.division = '')
GROUP BY r.event_id, e.name;

-- Also check for orphan OPEN rounds on GAMES events
SELECT r.id, r.division, r.event_id, e.name, e.event_format
FROM rounds r
JOIN events e ON e.id = r.event_id
WHERE e.event_format = 'GAMES'
  AND r.division = 'OPEN';

-- Delete null-division rounds with 0 archers (safe)
DELETE r FROM rounds r
LEFT JOIN round_archers ra ON ra.round_id = r.id
WHERE (r.division IS NULL OR r.division = '')
  AND ra.id IS NULL;

-- Delete orphan OPEN rounds on GAMES events with 0 archers (safe)
DELETE r FROM rounds r
LEFT JOIN round_archers ra ON ra.round_id = r.id
JOIN events e ON e.id = r.event_id
WHERE e.event_format = 'GAMES'
  AND r.division = 'OPEN'
  AND ra.id IS NULL;
```

---

## 📁 Relevant Files

| File | What to check |
|------|---------------|
| `api/index.php` ~1168–1180 | `POST /v1/rounds` — new API guard |
| `api/index.php` ~1146–1300 | `POST /v1/rounds` — creation + dedup strategies |
| `api/index.php` ~4042–4170 | `GET /events/{id}/overview` — dashboard data (read-only) |
| `js/live_updates.js` ~316–400 | `ensureRound()` — client-side round creation |
| `js/ranking_round_300.js` ~4404 | `postEndForArcherNow` — now uses `ensureLiveRoundReady` |
| `js/ranking_round_300.js` ~5693 | `handleMasterSync` — now uses `ensureLiveRoundReady` |
| `js/ranking_round_300.js` ~7708 | `onStartScoring` — now uses `ensureLiveRoundReady` |
| `js/ranking_round_300.js` ~5218 | `ensureLiveRoundReady` — division resolution logic |
| `js/coach.js` ~1787 | `addArchersToEvent` — new GAMES event guard |
| `js/coach.js` ~2598 | Edit modal "Add Archers" — passes event_format |

---

## Related Issues

- **Strategy 4 round reassignment** — `POST /rounds` can reassign rounds from other events when division is null (separate bug, lower priority since GAMES events are the main trigger)
- **Pre-deploy tests hanging** — See `docs/bugs/PRE_DEPLOY_TESTS_HANG_BLOCK_DEPLOYMENT.md`

---

**Status:** ✅ Fixed  
**Priority:** High  
**Fix Applied:** 2026-02-16 — Branch `fix/games-event-empty-rounds`
