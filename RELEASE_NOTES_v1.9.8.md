# Release Notes v1.9.8

## Bug Fixes
- **Team Match Assignments**: Fixed an issue where active Team Matches were not appearing on the home page or in the "Open Assignments" list. The system now correctly queries for team matches even when standard bracket entries are not directly linked to individual archers.

## Technical Details
- Updated `GET /v1/archers/:id/bracket-assignments` in `api/index.php` to include a supplementary query for `team_matches` involving the archer.
