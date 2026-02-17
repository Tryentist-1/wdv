# Release Notes v1.9.7

## Bug Fixes
- **Event Deletion Cascading**: Fixed a bug where deleting an event left orphaned records in the database (brackets, matches, scores). The deletion process now correctly cascades to all related tables, ensuring a clean removal of the event and its associated data.

## Technical Details
- Updated `DELETE /events/:id` endpoint in `api/index.php` to include explicit deletion steps for `brackets`, `solo_matches`, `team_matches`, and their related sub-tables (`matches`, `teams`, `archers`, `sets`) before deleting the event itself.
