# Archer Management Integration Plan

## 1. Objective
Align the master archer roster across local storage, Live Updates API, and database so the server becomes the source of truth while retaining offline usability for tournaments with unreliable connectivity.

-## 2. Canonical Data Model
- Persist the master roster fields identified in `ARCHER_MANAGEMENT.md`, excluding event-specific assignments:
  - Identity: `firstName`, `lastName`, `nickname`, `extId`, `status`
  - Roster metadata: `schoolCode` (1–3 letters), `grade` (`9`/`10`/`11`/`12`/`GRAD`), `gender` (`M`/`F`), `level` (`VAR`/`JV`/`BEG`)
  - Contact & profile: `photoUrl`, `email`, `phone`, `usArcheryId`
  - Relationships: `faves` (array of UUIDs for friends/training partners)
  - Physiology: `domEye`, `domHand`, `heightIn`, `wingspanIn`, `drawLengthSuggested`, `riserHeightIn`, `limbLength`, `limbWeightLbs`
  - Coaching notes: `notesGear`, `notesCurrent`, `notesArchive`
- Use the server schema as canonical; the browser maintains a cached copy tagged with a schema/version number to support migrations.
- `extId` continues to link local cache entries with remote records.

## 3. Backend Updates
- **Database schema (`api/sql/schema.mysql.sql`)**
  - Add columns covering the full roster profile (nickname, photo, contact, physiology, notes, status, etc.).
  - Write migration scripts for production + test data (`api/sql/migration_division_refactor.sql`, `api/sql/test_data.sql`).
- **API adjustments (`api/db.php`, future controllers)**
  - Update `/archers` GET/POST payloads to include the new fields.
  - Validate and normalise incoming data (gender, level, school code) server-side to match the client helper logic.
  - Ensure `/archers/bulk_upsert` returns read-after-write data for accurate local refresh.
  - Harden 401/403 responses for sync endpoints so offline retries know when to fall back.

## 4. Frontend Module Changes
- **`js/archer_module.js`**
  - Expand local model to mirror the backend schema; normalise values before save/sync.
  - Version cached data (e.g., `archerList:v2`) and write a migration helper to upgrade prior saves.
  - Flesh out `importCSV` / `exportCSV` to support uploads and downloads that match the new model.
  - Add sync status reporting (success/error timestamps) to feed into UI messaging.
- **`archer_list.html`**
  - Update forms to handle the full field set (active toggle, PRs, contact info).
  - Surface sync controls with clearer offline messaging (last synced, pending changes).
  - Provide conflict resolution prompts when local edits diverge from the latest server payload.
- **CSS (`css/main.css`)**
  - Add styles for new form controls and status indicators.

## 5. Scoring App Integration
Each scoring module reads from the master list; ensure they tolerate the new schema and persist only necessary subsets.
- `js/ranking_round.js` and `js/ranking_round_300.js`
  - Update selectors and local storage handling to read `status` and tolerate the expanded profile object while ignoring fields they do not need.
  - Adjust session serialisation so restored rounds pick up schema v2 data.
- `js/solo_round.js`, `js/solo_card.js`, `js/team_card.js`
  - Confirm roster selectors use the expanded data (e.g., show grade/level badges).
  - Audit exports or summaries that list archer info and ensure they pull from the canonical fields.
- Shared utilities (`js/common.js`)
  - Introduce helper(s) for canonical name formatting and badge labels to keep UI consistent.

## 6. Offline Sync Strategy
- Treat the server as authoritative; the client caches a snapshot plus a mutation queue.
- On load:
  1. Read local cache; if outdated schema, migrate.
  2. Attempt remote fetch; on success overwrite cache and clear stale mutations.
  3. On failure, continue with cached data and mark the UI as offline.
- When editing locally:
  - Save to cache immediately and enqueue mutation(s) for background sync.
  - Retry sync automatically when network returns; surface errors inline.
- Provide a manual “Sync Now” button that attempts `bulk_upsert` followed by a GET refresh so coaches can confirm the server state before events start.

## 7. Testing & QA
- Expand automated coverage in `tests/`:
  - Unit tests for migration helpers, normalisation, and CSV import/export.
  - Mocked integration tests around Live Updates requests (e.g., `tests/ranking_round_live_sync.spec.js`).
- Manual checklist (`docs/MANUAL_TESTING_CHECKLIST.md`)
  - Add cases for: offline launch, sync after reconnect, conflict resolution, CSV round-trip, scoring modules consuming new roster.
- Include a lightweight mock server or fixture JSON for development runs where the real API is inaccessible.

## 8. Deployment Considerations
- Coordinate schema migration and client release; temporarily disable automated sync (or warn users) until both sides deploy.
- Because production data is minimal and backed up, we can run destructive migrations, but snapshot current tables before changes.
- After deploy, run a test sync session end-to-end (create roster, sync, fetch) to confirm Live Updates endpoints keep parity.

## 9. Next Steps Checklist
1. Implement DB and API schema expansions.
2. Update `ArcherModule` data model + migration helpers.
3. Refresh Archer Management UI for new fields and sync messaging.
4. Patch scoring modules to consume schema v2 and re-test offline flows.
5. Add automated/mocked tests and update manual checklist.
6. Validate deploy pipeline (FTP) and run production smoke tests.
