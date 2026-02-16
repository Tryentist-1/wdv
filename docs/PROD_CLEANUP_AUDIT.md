# Production Cleanup Audit

**Date:** February 14, 2026  
**Purpose:** Files/folders currently on `archery.tryentist.com/wdv/` that should NOT be there  
**Action:** REVIEW ONLY — do not delete until confirmed safe

> **How to clean:** Use `--reset` mode on deploy script (deletes remote files not present locally after applying excludes), OR manually delete via FTP/cPanel File Manager.

---

## CRITICAL — Security/Data Risk

| Path | Risk | Notes |
|------|------|-------|
| `api/config.local.php.example` | Low | Template file, no real credentials — but unnecessary |
| `api/config.local.php.production` | **MEDIUM** | May contain or hint at prod credentials |
| `api/seed_test_data.php` | **HIGH** | CLI-only, but exposes seeding logic |
| `api/create_test_bracket_data.php` | **HIGH** | Can create test data if web-accessible |
| `api/test_db_connection.php` | **HIGH** | Exposes DB connection details |
| `api/test_harness.html` | Medium | Test interface on production |
| `api/test_harness.php` | Medium | Test backend on production |
| `api/test_assign_positions.php` | Medium | Test script |
| `api/route_debug.txt` | Low | Debug output file |
| `api/restore_backup_to_dev.sh` | Low | Shell script, won't execute via web |
| `api/backup_database_remote.sh` | Low | Shell script, won't execute via web |

## Directories to Remove (entire folder + contents)

| Directory | File Count | Why Remove |
|-----------|-----------|------------|
| `scripts/` | ~18 files | Deploy scripts, dev scripts, test PHP — all dev tooling |
| `scripts/deploy/` | 3 files | DeployFTP.sh, check scripts |
| `scripts/dev/` | 13 files | Docker, restart, status, cleanup scripts |
| `audit/` | 2 files | css_classes.txt, html_classes.txt |
| `bugs/` | 1 file | locking_and_persistence.md |
| `planning/` | 2 files | bracket_workflow_v2.md, coach_module_restoration_plan.md |
| `playwright-report/` | 2+ files | Test report HTML + data/ |
| `test-results/` | ~25+ dirs | Playwright test artifacts, screenshots |
| `backups/` | ~14 files | **SQL database dumps on public server!** |
| `logs/` | unknown | Server log files |
| `app-exports/` | unknown | Export data |
| `cgi-bin/` | unknown | Likely empty, default hosting folder |

## API Dev Tools to Remove

| File | Why |
|------|-----|
| `api/sql/` (entire dir, ~48 files) | Migration scripts, cleanup SQL, diagnostic queries, test data SQL |
| `api/seed_test_data.php` | CLI test data seeder |
| `api/create_test_bracket_data.php` | Test bracket data creator |
| `api/test_db_connection.php` | DB connection test |
| `api/test_harness.html` | Test harness UI |
| `api/test_harness.php` | Test harness backend |
| `api/test_assign_positions.php` | Position assignment test |
| `api/admin_migrate_scorecard.php` | One-off migration |
| `api/migrate_brandon.php` | One-off migration for specific archer |
| `api/migration_admin.php` | Web migration admin tool |
| `api/check_and_migrate.php` | Migration check script |
| `api/cleanup_orphaned_round_archers.php` | Cleanup script |
| `api/diagnostic_undefined_divisions.php` | Diagnostic tool |
| `api/backfill_entry_codes.php` | One-off backfill |
| `api/add_size_columns.php` | One-off migration |
| `api/config.local.php.example` | Template file |
| `api/config.local.php.production` | Credential hints |
| `api/restore_backup_to_dev.sh` | Dev restore script |
| `api/backup_database_remote.sh` | Remote backup script |
| `api/route_debug.txt` | Debug output |

## Root-Level Files to Remove

| File | Why |
|------|-----|
| `.cursorignore` | IDE config |
| `.cursorrules` | IDE config |
| `.dockerignore` | Docker config |
| `.gitattributes` | Git config |
| `.gitignore` | Git config |
| `.markdownlint.json` | Linter config |
| `DeployFTP.sh` | Old deploy script at root (moved to scripts/) |
| `docker-compose.yml` | Docker config |
| `jest.config.js` | Test config |
| `playwright.config.js` | Test config |
| `playwright.config.local.js` | Test config |
| `playwright.config.no-server.js` | Test config |
| `postcss.config.js` | Build config |
| `tailwind.config.js` | Build config |
| `package.json` | NPM config |
| `package-lock.json` | NPM lockfile |
| `router.php` | PHP dev server router |
| `server.log` | Dev server log |

## Root-Level Shell Scripts to Remove

| File | Why |
|------|-----|
| `audit_dark_mode.sh` | Dev audit script |
| `cleanup-dev-db.sh` | Dev cleanup (dup of scripts/dev/) |
| `create-api-test-suite.sh` | Test creation script |
| `daily-api-testing.sh` | Test runner |
| `setup-autostart.sh` | Dev setup (dup of scripts/dev/) |
| `setup_local.sh` | Dev setup (dup of scripts/dev/) |
| `start-dev.sh` | Dev start (dup of scripts/dev/) |
| `temp_fix_event.sh` | Temp fix script |
| `test-api-suite.sh` | Test runner |
| `test-summary.sh` | Test summary |
| `test-workflow.sh` | Test workflow |
| `test_api.sh` | API test |
| `test_cloudflare.sh` | Cloudflare test |
| `test_phase1_local.sh` | Phase 1 test |

## Root-Level Test/Dev HTML & JS to Remove

| File | Why |
|------|-----|
| `test-coach-buttons.html` | Test page |
| `test-components.html` | Test page |
| `test_import_bhs.html` | Test page |
| `test-button-check.js` | Test script |
| `test-coach-button-verification.js` | Test script |
| `debug_live.html` | Debug page |
| `diagnostic_tool.html` | Diagnostic page |
| `archer_trading_card_mockup.html` | Mockup page |
| `score360-with-keypad.html` | Legacy/dev page |
| `ranking_round.html` | Legacy (replaced by ranking_round_300.html) |

## Other Files to Remove

| File | Why |
|------|-----|
| `test_position_filter.sql` | Test SQL file |
| `dev_schema_report.txt` | Dev diagnostic output |
| `temp_package_scripts.json` | Temp file |

## CSS File to Remove

| File | Why |
|------|-----|
| `css/tailwind-input.css` | Tailwind source file (not compiled output) |

## Icon Dev Tools to Remove

| File | Why |
|------|-----|
| `icons/create-placeholder-icon.html` | Dev tool |
| `icons/generate-icons.sh` | Dev tool |

---

## DO NOT Remove (Production Files)

These are on prod and SHOULD stay:

- `api/config.local.php` — **CRITICAL: Production credentials. NEVER touch this.**
- `api/.htaccess`, `api/index.php`, `api/db.php`, `api/config.php`, `api/index_swiss_part.php`
- `api/upload_avatar.php`, `api/data_admin.php`
- `api/backup_admin.php`, `api/backup_database.php`, `api/backup_database_web.php`
- All `*.html` production pages (index, coach, ranking_round_300, solo_card, etc.)
- `js/`, `css/` (compiled), `icons/*.png`, `avatars/`, `targetface/`
- `sw.js`, `manifest.json`, `version.json`
- `app-imports/` — Coach CSV uploads live here on prod (may have live data)

---

## Summary

| Category | Count | Severity |
|----------|-------|----------|
| Directories to remove | 10 | High (backups, test-results, scripts) |
| API dev tools | 20 files | High (test/seed/migration scripts) |
| Root shell scripts | 14 files | Medium |
| Root test/dev pages | 10 files | Medium |
| Config/build files | 18 files | Low |
| SQL scripts (`api/sql/`) | ~48 files | Medium |
| **Total files to remove** | **~120+** | |

---

## Cleanup Options

### Option A: Manual via cPanel File Manager (Safest)
1. Log into cPanel → File Manager → `public_html/wdv/`
2. Delete directories and files from this list
3. Verify site still works after each batch

### Option B: `--reset` Deploy (Automated)
```bash
npm run deploy:fast -- --reset --no-local-backup
```
This will delete remote files not present in local deploy (after applying excludes). **Warning:** This also deletes files that exist only on the server (like `api/config.local.php` would be safe since it's in excludes, but `app-imports/` content uploaded by coaches would be deleted if not in local).

### Option C: Targeted FTP Delete Script (Recommended)
Create a script that deletes only the files listed in this audit. Safest automated approach.

---

**IMPORTANT:** Back up the `backups/` directory content before deleting — those are real database dumps that may be useful for disaster recovery, even though they shouldn't be publicly accessible.

**IMPORTANT:** `api/config.local.php` on production contains real credentials. NEVER delete it. It is NOT in this removal list.
