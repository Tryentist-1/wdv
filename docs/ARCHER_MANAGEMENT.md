# Archer Management Module

## Purpose & Scope
- Centralize management of all archers for a team/club/season
- Provide a single, editable list for use across all scoring modules (Ranking, Team, Solo, etc.)
- Support import/export for easy data syncing with Google Sheets and other tools

## Data Model
- **Canonical fields (persisted in MySQL + Live Updates)**  
  `extId`, `firstName`, `lastName`, `nickname`, `photoUrl`,  
  `school` (1–3 letter code), `grade` (`9/10/11/12/GRAD`),  
  `gender` (`M/F`), `level` (`VAR/JV/BEG`),  
  `status` (`active/inactive`), `faves` (array of extIds),  
  `domEye`, `domHand`, `heightIn`, `wingspanIn`, `drawLengthSugg`,  
  `riserHeightIn`, `limbLength`, `limbWeightLbs`,  
  `notesGear`, `notesCurrent`, `notesArchive`,  
  `email`, `phone`, `usArcheryId`, `jvPr`, `varPr`.
- **Local-only helpers**  
  Cached assignment hints (`bale`, `target`, `size`) are still stored for backward compatibility but are no longer considered authoritative.
- **Storage/versioning**  
  Local cache key is `archerList` with schema version `2`. Each save stamps `archerListMeta` with `version`, `lastFetchedAt`, and `lastSyncedAt` for sync messaging.
- **Round-tripping**  
  CSV import/export mirrors the schema above so Google Sheets or offline backups can be kept in sync with the database.

## Supported Features
- Load/save the roster from local storage with automatic schema upgrades
- Download the canonical roster from MySQL (`Load from MySQL`) using coach API key or event entry code
- Queue local edits for background upsert and show sync status (pending/synced/offline)
- Import/export CSV files that respect the canonical field list
- Add, edit, delete archers with access to the full profile (contact, equipment, notes)
- Track friend links (`faves`), nickname, photo, and PR values
- Toggle status (active/inactive) while keeping historical data intact

## UI/UX Summary
- Compressed, mobile-first Archer Details form
- Compact, touch-friendly Archer List view with search, edit, delete, and favorite
- Import/export buttons for CSV

## Integration Plan
- All scoring modules (e.g., Ranking Round) select archers from the master list
- Round/score card data references selected archers and is stored separately in local storage
- Export results for a round/bale as CSV and SMS

## Future Considerations
- Support for `app-imports/` and `app-exports/` folders for batch operations/automation
- Potential for cloud sync or multi-device support
- UI for column mapping or advanced import validation 
