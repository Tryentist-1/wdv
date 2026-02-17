# Release Notes v1.9.6

## New Features
- **Consolidated Roster CSV Export**: Added a "Download Roster CSV" button to the Event Dashboard header. This allows coaches to download a single CSV file containing all archers from all brackets in the event, including their assignments (e.g., S1, T1).
  - **Location**: Event Dashboard Header (cloud download icon).
  - **Data Source**: Fetches from the master archer list to ensure all registered archers are included, even if no rounds are currently active.
  - **Fields**: Archer Name, School, Gender, Level, Assignment, Bale, Target.

## Bug Fixes
- **Empty CSV Export**: Fixed an issue where the CSV export was empty if the event had no active ranking rounds. The export now correctly pulls from the master archer list.
- **Undefined Names in CSV**: Resolved a bug where archer names appeared as "undefined undefined" in the CSV due to a property name mismatch (`first_name` vs `firstName`).

## Technical Details
- Updated `api/index.php` snapshot endpoint to include `assignment` data (though strictly not used by the final CSV logic, it improves the snapshot's completeness).
- Updated `event_dashboard.html` to implement the CSV generation logic using the `/archers` endpoint.
