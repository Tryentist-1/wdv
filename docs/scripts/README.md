# Scripts & Operational Utilities

This folder documents helper scripts that ship with the project. Each script lives at the repo root (or in `/api`) and can be launched from the repository root unless noted otherwise.

## Deployment

**Primary Production Deployment Script:** `scripts/deploy/DeployFTP.sh`

**IMPORTANT FOR LLMs:** When asked to "promote to prod", "deploy to production", or "FTP deploy", use this script:
```bash
./scripts/deploy/DeployFTP.sh
```

The script supports optional flags:
- `--dry-run` - Preview what would be deployed without making changes
- `--reset` - Reset remote files before deployment
- `--no-local-backup` - Skip local backup creation
- `--remote-backup` - Create backup on remote server

Reads credentials from `.env` and honours the exclusion list defined in the script (mirrors `.gitignore` plus additional safety filters).
- `deploy_backups/` (directory) — populated automatically by `DeployFTP.sh` when local or remote backups are created. Never deploy or commit its contents.

## Testing & QA
- `tests/scripts/test-summary.sh` — convenience wrapper for running the Playwright suite (`npm test`) and summarising results for local debugging.
- `tests/scripts/test_api.sh` — curls the public API endpoints to verify health before or after a deployment. Requires network access to the production server.
- `docs/testing/manual-runs/` — contains session-by-session notes, screenshots, and other artefacts created while executing the manual testing checklist.

## API Utilities
- `tests/api/harness/test_harness.html` — browser-based UI for invoking REST endpoints (GET/POST/PUT) against the Live Updates API. Supports both coach API key and event passcode auth modes.
- `tests/api/harness/test_harness.php` — CLI-oriented runner that exercises the API workflow end-to-end using PHP.

## Local Development

For setting up a local development environment, see:
- **Quick Start:** `QUICK_START_LOCAL.md` (5-minute setup guide)
- **Full Guide:** `docs/LOCAL_DEVELOPMENT_SETUP.md` (comprehensive setup instructions)
- **Setup Script:** `scripts/dev/setup_local.sh` (automated setup helper)

## Usage Notes
1. Always run scripts from the repository root unless the script documentation specifies otherwise.
2. Review each script before executing it in production—several accept flags that control backups, dry runs, or destructive resets.
3. Keep `.env` up to date with the credentials required by deployment and cache-purge steps. The file is excluded from git and FTP uploads.
4. For local development, use `api/config.local.php` to configure your local database connection (this file is gitignored for security).
