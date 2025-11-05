# Scripts & Operational Utilities

This folder documents helper scripts that ship with the project. Each script lives at the repo root (or in `/api`) and can be launched from the repository root unless noted otherwise.

## Deployment
- `DeployFTP.sh` — primary deploy pipeline. Supports optional `--dry-run`, `--reset`, `--no-local-backup`, and `--remote-backup` flags. Reads credentials from `.env` and honours the exclusion list defined in the script (mirrors `.gitignore` plus additional safety filters).
- `deploy_backups/` (directory) — populated automatically by `DeployFTP.sh` when local or remote backups are created. Never deploy or commit its contents.

## Testing & QA
- `test-summary.sh` — convenience wrapper for running the Playwright suite (`npm test`) and summarising results for local debugging.
- `test_api.sh` — curls the public API endpoints to verify health before or after a deployment. Requires network access to the production server.
- `docs/testing/manual-runs/` — contains session-by-session notes, screenshots, and other artefacts created while executing the manual testing checklist.

## API Utilities
- `api/test_harness.html` — browser-based UI for invoking REST endpoints (GET/POST/PUT) against the Live Updates API. Supports both coach API key and event passcode auth modes.
- `api/test_harness.php` — CLI-oriented runner that exercises the API workflow end-to-end using PHP.

## Local Development

For setting up a local development environment, see:
- **Quick Start:** `QUICK_START_LOCAL.md` (5-minute setup guide)
- **Full Guide:** `docs/LOCAL_DEVELOPMENT_SETUP.md` (comprehensive setup instructions)
- **Setup Script:** `setup_local.sh` (automated setup helper)

## Usage Notes
1. Always run scripts from the repository root unless the script documentation specifies otherwise.
2. Review each script before executing it in production—several accept flags that control backups, dry runs, or destructive resets.
3. Keep `.env` up to date with the credentials required by deployment and cache-purge steps. The file is excluded from git and FTP uploads.
4. For local development, use `api/config.local.php` to configure your local database connection (this file is gitignored for security).
