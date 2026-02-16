# Bug: GAMES Event Creates Hundreds of Null-Division Rounds

**Date:** 2026-02-16  
**Area:** `POST /v1/rounds`, `LiveUpdates.ensureRound()`, GAMES event workflow  
**Severity:** High (data pollution, dashboard clutter, potential performance)  
**Status:** 🔴 Open — needs investigation session  

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

---

## 🔍 What We Don't Know Yet

1. **Exact trigger flow** — Which page(s) were open when the 505 rounds were created? (ranking_round_300.html? QR code link? dashboard?)
2. **Why 505** — Was this many tabs? A polling loop? Many users scanning QR codes?
3. **Why 2.5 hours after event creation** — What happened at ~16:16 that started the burst?
4. **Server logs** — No PHP/nginx logs were checked yet for `POST /v1/rounds` during the window.

---

## 📋 Investigation Plan

### Phase 1: Reproduce locally
1. Reset local dev database to clean state
2. Create a GAMES event via coach console (manual, GAMES format)
3. Import roster (creates Swiss brackets)
4. Open various pages that an archer/coach might visit:
   - `ranking_round_300.html?event={id}&code={code}`
   - `event_dashboard.html?event={id}`
   - `index.html` (archer home)
   - `solo_card.html?match={id}`
5. Monitor network tab for `POST /v1/rounds` calls
6. Check: does any page auto-trigger `ensureRound` for the GAMES event?

### Phase 2: Check server logs (if available)
1. Look for `POST /v1/rounds` requests between 16:16–16:24 UTC on 2026-02-16
2. Check referrer/origin headers to identify source page
3. Check if requests came from one IP or many (one user vs many)

### Phase 3: End-to-end flow testing
1. Document complete GAMES event lifecycle: create → import roster → generate rounds → archers score → complete
2. At each step, verify which API calls are made
3. Identify any step that triggers ranking-round flows for a GAMES event

### Phase 4: Fix assessment
Based on findings, evaluate these potential fixes:
- **API guard:** Reject `POST /rounds` with `eventId` but no `division`
- **Client guard:** Skip `ensureRound` calls for GAMES events (no ranking rounds)
- **Dashboard filter:** Exclude null-division rounds from event overview
- **Strategy 4 removal:** Remove the date-only round matching that can reassign rounds across events

---

## 📁 Relevant Files

| File | What to check |
|------|---------------|
| `api/index.php` ~1136–1290 | `POST /v1/rounds` — creation + dedup strategies |
| `api/index.php` ~4042–4170 | `GET /events/{id}/overview` — dashboard data |
| `js/live_updates.js` ~316–400 | `ensureRound()` — client-side round creation |
| `js/ranking_round_300.js` ~4404 | `postEndForArcherNow` — no-division ensureRound |
| `js/ranking_round_300.js` ~5693 | `handleMasterSync` — no-division ensureRound |
| `js/ranking_round_300.js` ~7708 | `onStartScoring` — no-division ensureRound |
| `js/ranking_round_300.js` ~5218 | `ensureLiveRoundReady` — division resolution logic |
| `js/coach.js` ~487–540 | GAMES event creation path |
| `api/sql/check_undefined_divisions.sql` | Diagnostic queries for null-division data |

---

## 🧹 Cleanup (after fix)

Once the root cause is fixed, clean up the polluted data:

```sql
-- Preview: Count null-division rounds per event
SELECT r.event_id, e.name, COUNT(*) as null_rounds
FROM rounds r
LEFT JOIN events e ON e.id = r.event_id
WHERE (r.division IS NULL OR r.division = '')
GROUP BY r.event_id, e.name;

-- Delete null-division rounds with 0 archers (safe)
DELETE r FROM rounds r
LEFT JOIN round_archers ra ON ra.round_id = r.id
WHERE (r.division IS NULL OR r.division = '')
  AND ra.id IS NULL;
```

---

## Related Issues

- **Strategy 4 round reassignment** — `POST /rounds` can reassign rounds from other events when division is null (separate bug, lower priority since GAMES events are the main trigger)
- **Pre-deploy tests hanging** — See `docs/bugs/PRE_DEPLOY_TESTS_HANG_BLOCK_DEPLOYMENT.md`
