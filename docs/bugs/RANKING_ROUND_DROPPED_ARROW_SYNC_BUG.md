# Ranking Round Bug: Dropped Arrow Scores (Sync / Ordering)

**Date:** 2025-02-03
**Page/Module:** `js/ranking_round_300.js`, `js/live_updates.js`, ranking rounds
**Severity:** Critical
**Status:** 🟡 In Progress

---

## 🐛 Bug Description

**What's broken:**
Arrow scores are sometimes missing on archers' devices—scores that were entered appear dropped. Behavior points to sync/ordering issues: disconnection, or not waiting for a sync to finish before changing ends or leaving the page.

**User Impact:**
- Archers lose entered scores; ends show partial or wrong totals.
- Running totals can be wrong (ends counted and added to total but arrows missing).
- Halfway-through rounds in production are at risk; need to check integrity (ends vs totals) before restart.

---

## 🔍 Root Cause Analysis

### 1. Out-of-order POSTs (primary)

- On every **arrow keystroke** we call `LiveUpdates.postEnd(archerId, currentEnd, { a1, a2, a3, ... })` with the **full** end state.
- So for one end we can fire **3 requests** (one per arrow). The API does **last-write-wins** (`ON DUPLICATE KEY UPDATE`).
- If requests complete **out of order** (e.g. request 1 “only a1” completes *after* request 2 “a1,a2” or 3 “a1,a2,a3”), the server is overwritten with the older payload → **dropped arrows**.

### 2. No debounce

- Sending immediately on each tap/score input (one POST per arrow) maximizes the chance of out-of-order completion, especially on slow or flaky mobile networks.

### 3. Disconnect / queue

- When the request fails (e.g. offline), we queue to `luq:${roundId}` and resolve (no throw). Queue is flushed on `online` and via manual “Sync” in ranking_round_300.
- If the user never reconnects or never hits “Sync”, queued data stays local. Not the main cause of “random” drops; ordering is.

### 4. Correcting an earlier end (e.g. end 3 when on end 5)
- User goes back (← Back) to end 3 and corrects arrow 2. We POST only end 3 (correct a1,a2,a3 and running_total = sum 1..3). The API updates only that row; ends 4 and 5 in the DB keep their stored `running_total`. When anyone **fetches** the round (GET), the API **recalculates** running totals from arrow values (see api/index.php ~3482 and ~1644), so display is correct. Offline: the correction is queued and sent when back online.

### 5. Integrity (production)
- Need to detect existing bad data: ends where `end_total` / arrow sum doesn’t match, or `running_total` on last end doesn’t match sum of all `end_total` for that round_archer.

---

## 🔧 Fix Plan

1. **Debounce per (archer, end)** in `ranking_round_300.js`: after any tap/score input for an end, schedule a single POST for that (archer, end) after a short delay (e.g. 500ms). Cancel/reset the timer on each new tap for that same (archer, end). Send **one** POST with current full end state when the timer fires. This removes out-of-order overwrites.
2. **Flush queue on init** in `live_updates.js`: when `roundId` is restored from persisted state, call `flushQueue()` so queued ends from a previous session are sent after reload/reconnect.
3. **Integrity check**: Add a small diagnostic (SQL or API) to list round_archers where the sum of `end_events.end_total` does not match the last end’s `running_total`, for ranking rounds.

---

## 🔗 Related

- `api/index.php` POST `/v1/rounds/{id}/archers/{id}/ends` — upsert by (round_archer_id, end_number).
- `js/live_updates.js` — `postEnd`, offline queue `luq:${roundId}`, `flushQueue`.
- `js/ranking_round_300.js` — `handleScoreInput`, `syncCurrentEnd`, `mergeScoresWithSyncStatus`.

---

**Fixes applied (fix/ranking-round-dropped-arrow-sync):**
- Debounce: one POST per (archer, end) after 500ms of no score input (taps); prevents out-of-order overwrites.
- Flush queue on LiveUpdates init when roundId is restored (reconnect/refresh).
- syncCurrentEnd and handleScoreInput share postEndForArcherNow for single source of truth.
- Integrity check: `api/sql/check_ranking_round_integrity.sql` — run to list round_archers where sum(end_total) != last running_total.

**Status:** ✅ Fixed (pending deploy)
**Priority:** Critical
**Reported by:** User (session 2025-02-03)
