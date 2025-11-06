## Admin Data Hygiene Page – Draft Plan

### Goal
Provide a dedicated, authenticated admin interface so QA and coaches can identify and remove test artifacts (events, rounds, score data) in production without manual SQL work. The page should also act as a hub that links to other diagnostic/cleanup tooling (backups, migrations, existing SQL scripts).

### Scope
1. **Authentication**
   - Reuse the existing passcode mechanism (`PASSCODE` / `coach` credentials).
   - Page should live under `api/` alongside `backup_admin.php`, `migration_admin.php`.

2. **Dashboard Sections**
   1. **Test Event Finder**
      - Search/filter by name prefix (e.g., `TEST`, `QA`, `E2E`), date range, coach passcode, or creator.
      - List summary counts (events, rounds, archers, end events).
      - Provide preview mode and irreversible delete (with double confirmation).
   2. **Bulk Cleanup**
      - Predefined quick actions: “Delete events older than 30 days with `TEST` prefix”, etc.
      - Allow CSV upload of event IDs for targeted deletion.
   3. **Link Hub**
      - Link to existing admin tools:
        - `backup_admin.php`
        - `migration_admin.php`
        - `diagnostic_undefined_divisions.php`
        - SQL helper scripts directory (`api/sql/`)
        - Playwright test docs (`docs/TEST_FAILURES_ANALYSIS.md`, `docs/PHASE1_UI_ACCESS_GUIDE.md`, etc.)
   4. **Audit Log / History**
      - Record actions (timestamp, user identifier, counts deleted).
      - Simple table stored in DB (`admin_actions` table) or log file.

3. **Deletion Strategy**
   - For selected events:
     - Delete `end_events` → `round_archers` → `rounds` → `events`.
     - Optional: cleanup related cache/localStorage keys (provide browser snippet for QA).
   - Provide SQL preview before execution.

4. **Safety Checks**
   - Confirm there are child records before deletion and display them.
   - Prevent deletion of active events unless `I understand` checkbox ticked.
   - Offer JSON/CSV export of data before deletion (download snapshot).

5. **Implementation Outline**
   - New file `api/data_admin.php` modeled after `backup_admin.php`.
   - Shared CSS/JS from existing admin pages for consistent styling.
   - Use prepared statements to avoid accidental deletion of non-target data.
   - Time permitting, add API endpoints (optional) to support AJAX filtering.

6. **Follow-up Tasks**
   - Write Playwright smoke test for admin page (ensuring links render, filters show expected mock data in staging).
   - Update QA checklist to include “Run data hygiene tool” after production tests.
   - Document naming convention for test events (prefix).
   - Decide on retention policy (auto-clean old test data via cron?).

### Next Steps
1. Create Jira/story item: “Admin Data Hygiene Page”.
2. Implement page + add link in existing admin menu (or create new admin index).
3. Deploy and validate in staging, then prod.

