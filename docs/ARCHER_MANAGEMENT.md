# Archer Management Module

## Purpose & Scope
- Centralize management of all archers for a team/club/season
- Provide a single, editable list for use across all scoring modules (Ranking, Team, Solo, etc.)
- Support import/export for easy data syncing with Google Sheets and other tools

## Data Model
- Fields: First, Last, School, Grade, Gender, Level, Bale, Target, Size, FAVE, JV PR, VAR PR
- Local storage key: `archerList`
- CSV format matches Google Sheets for round-tripping

## Supported Features
- Load/save archer list from/to local storage
- Import from CSV (manual upload)
- Export to CSV (download)
- Add, edit, delete archers in the UI
- Mark favorites (FAVE)
- Store PRs (JV PR, VAR PR)

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