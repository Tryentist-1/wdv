#!/bin/bash

# Deployment script for Tryentist WDV (FTP-SSL, with local and remote backup)
# Loads FTP_PASSWORD from .env in the deploy source folder (which should be in .gitignore)
#
# Deploy source: Default is the current repo (the folder containing this script's repo).
# Override with WDV_DEPLOY_SOURCE to deploy from another tree. Examples:
#   (default)  # deploy from this repo, e.g. /Users/terry/makeitso/wdv
#   WDV_DEPLOY_SOURCE=/Volumes/terry/web-mirrors/tryentist/wdv   # other copy (mounted)

HOST="da100.is.cc"
USER="terry@tryentist.com"
REMOTE_DIR="public_html/wdv"

# Default: current repo root (folder that contains scripts/deploy/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SOURCE_DIR="${WDV_DEPLOY_SOURCE:-$REPO_ROOT}"
DATESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$SOURCE_DIR/deploy_backups"

# --- LOAD ENV VARIABLES from deploy source ---
if [ -f "$SOURCE_DIR/.env" ]; then
  set +H
  set -a
  source "$SOURCE_DIR/.env"
  set +a
  set -H
fi
LOCAL_BACKUP_ARCHIVE="$BACKUP_DIR/wdv_backup_$DATESTAMP.tar.gz"
REMOTE_BACKUP="public_html/wdv_backup_$DATESTAMP"
REMOTE_BACKUP_LOCAL="$BACKUP_DIR/remote_backup_$DATESTAMP"
REMOTE_BACKUP_ARCHIVE="$REMOTE_BACKUP_LOCAL.tar.gz"
LOCAL_BACKUP_SUMMARY="(skipped)"
REMOTE_BACKUP_SUMMARY="(skipped)"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Deploy source: $SOURCE_DIR"
echo "---"

# --- Build lftp exclude list from .gitignore and always-excluded files (in deploy source) ---
#
# IMPORTANT: This is a BLOCKLIST. Only production files should reach the server.
# See .cursor/rules/deployment-safety.mdc for the canonical list of what DOES deploy.
#
# If you add a new top-level directory or dev file, ADD IT HERE.
# When in doubt, exclude it. You can always add it later.

EXCLUDES=""

# --- Sensitive / environment files ---
EXCLUDES="$EXCLUDES --exclude-glob .env*"
EXCLUDES="$EXCLUDES --exclude-glob api/config.local.php"
EXCLUDES="$EXCLUDES --exclude-glob api/config.local.php.example"
EXCLUDES="$EXCLUDES --exclude-glob api/config.local.php.production"
EXCLUDES="$EXCLUDES --exclude-glob docker-compose.yml"
EXCLUDES="$EXCLUDES --exclude-glob nginx.conf"
EXCLUDES="$EXCLUDES --exclude-glob config.docker.php"

# --- IDE / tooling / repo metadata ---
EXCLUDES="$EXCLUDES --exclude-glob .git/**"
EXCLUDES="$EXCLUDES --exclude-glob .cursor/**"
EXCLUDES="$EXCLUDES --exclude-glob .agent/**"
EXCLUDES="$EXCLUDES --exclude-glob .vscode/**"
EXCLUDES="$EXCLUDES --exclude-glob .github/**"
EXCLUDES="$EXCLUDES --exclude-glob .cursorignore"
EXCLUDES="$EXCLUDES --exclude-glob .cursorrules"
EXCLUDES="$EXCLUDES --exclude-glob .dockerignore"
EXCLUDES="$EXCLUDES --exclude-glob .gitignore"
EXCLUDES="$EXCLUDES --exclude-glob .gitattributes"
EXCLUDES="$EXCLUDES --exclude-glob .markdownlint.json"

# --- Dev/tooling directories (NEVER deploy) ---
EXCLUDES="$EXCLUDES --exclude-glob scripts/**"
EXCLUDES="$EXCLUDES --exclude-glob audit/**"
EXCLUDES="$EXCLUDES --exclude-glob bugs/**"
EXCLUDES="$EXCLUDES --exclude-glob planning/**"
EXCLUDES="$EXCLUDES --exclude-glob node_modules/**"
EXCLUDES="$EXCLUDES --exclude-glob docs/**"
EXCLUDES="$EXCLUDES --exclude-glob tests/**"

# --- Backup / temp directories ---
EXCLUDES="$EXCLUDES --exclude-glob backups/**"
EXCLUDES="$EXCLUDES --exclude-glob deploy_backups/**"
EXCLUDES="$EXCLUDES --exclude-glob wdv_backup_*/**"
EXCLUDES="$EXCLUDES --exclude-glob remote_backup_*/**"
EXCLUDES="$EXCLUDES --exclude-glob app-imports/**"

# --- Test output ---
EXCLUDES="$EXCLUDES --exclude-glob playwright-report/**"
EXCLUDES="$EXCLUDES --exclude-glob test-results/**"

# --- Build/test config files (root level) ---
EXCLUDES="$EXCLUDES --exclude-glob jest.config.js"
EXCLUDES="$EXCLUDES --exclude-glob 'playwright.config*'"
EXCLUDES="$EXCLUDES --exclude-glob postcss.config.js"
EXCLUDES="$EXCLUDES --exclude-glob tailwind.config.js"
EXCLUDES="$EXCLUDES --exclude-glob package.json"
EXCLUDES="$EXCLUDES --exclude-glob package-lock.json"
EXCLUDES="$EXCLUDES --exclude-glob router.php"

# --- Dev-only HTML pages ---
# NOTE: gemini-oneshot.html is a PRODUCTION page (Practice Target, linked from index.html)
EXCLUDES="$EXCLUDES --exclude-glob test-coach-buttons.html"
EXCLUDES="$EXCLUDES --exclude-glob 'test-*.html'"
EXCLUDES="$EXCLUDES --exclude-glob 'test_*.html'"
EXCLUDES="$EXCLUDES --exclude-glob 'test_*.sql'"
EXCLUDES="$EXCLUDES --exclude-glob 'test_*.php'"
EXCLUDES="$EXCLUDES --exclude-glob 'test-*.js'"

# --- API dev tools, migrations, seeds (NEVER deploy) ---
EXCLUDES="$EXCLUDES --exclude-glob api/sql/**"
EXCLUDES="$EXCLUDES --exclude-glob api/seed_*.php"
EXCLUDES="$EXCLUDES --exclude-glob api/*migrate*.php"
EXCLUDES="$EXCLUDES --exclude-glob api/migration_*.php"
EXCLUDES="$EXCLUDES --exclude-glob api/check_and_migrate.php"
EXCLUDES="$EXCLUDES --exclude-glob api/cleanup_*.php"
EXCLUDES="$EXCLUDES --exclude-glob api/diagnostic_*.php"
EXCLUDES="$EXCLUDES --exclude-glob api/backfill_*.php"
EXCLUDES="$EXCLUDES --exclude-glob api/add_size_columns.php"
EXCLUDES="$EXCLUDES --exclude-glob api/backup_database_remote.sh"
EXCLUDES="$EXCLUDES --exclude-glob api/restore_backup_to_dev.sh"

# --- Icon dev tools ---
EXCLUDES="$EXCLUDES --exclude-glob icons/generate-icons.sh"
EXCLUDES="$EXCLUDES --exclude-glob 'icons/*.html'"

# --- CSS source (only compiled CSS deploys) ---
EXCLUDES="$EXCLUDES --exclude-glob css/tailwind-input.css"

# --- Catch-all patterns ---
EXCLUDES="$EXCLUDES --exclude-glob '*.md'"
EXCLUDES="$EXCLUDES --exclude-glob '.DS_Store'"
if [ -f "$SOURCE_DIR/.gitignore" ]; then
  GITEXCLUDES=$(grep -v '^#' "$SOURCE_DIR/.gitignore" | grep -v '^$' | awk '{print "--exclude-glob "$1}' | xargs)
  EXCLUDES="$EXCLUDES $GITEXCLUDES"
fi

# --- Parse command-line arguments ---
RESET_MODE=0
DRY_RUN=0
SKIP_LOCAL_BACKUP=0
DO_REMOTE_BACKUP=0

for arg in "$@"; do
  case "$arg" in
    --reset) RESET_MODE=1 ;;
    --dry-run) DRY_RUN=1 ;;
    --no-local-backup) SKIP_LOCAL_BACKUP=1 ;;
    --remote-backup) DO_REMOTE_BACKUP=1 ;;
  esac
done

# --- Step 1: Local backup (optional) ---
if [[ $SKIP_LOCAL_BACKUP -eq 0 ]]; then
  echo -e "\n--- Step 1: Local backup ---"
  mkdir -p "$BACKUP_DIR"
  tar -czf "$LOCAL_BACKUP_ARCHIVE" \
    --exclude='./deploy_backups' \
    --exclude='./node_modules' \
    --exclude='./.git' \
    --exclude='./playwright-report' \
    --exclude='./test-results' \
    --exclude='./app-imports' \
    -C "$SOURCE_DIR" . || { echo "Local backup failed."; exit 1; }
  echo "Local backup written to $LOCAL_BACKUP_ARCHIVE"
  LOCAL_BACKUP_SUMMARY="$LOCAL_BACKUP_ARCHIVE"
else
  echo -e "\n--- Step 1: Skipping local backup (per flag) ---"
fi

# --- Step 2: Remote backup (optional) ---
if [[ $DO_REMOTE_BACKUP -eq 1 ]]; then
  echo -e "\n--- Step 2: Downloading remote backup to $REMOTE_BACKUP_LOCAL ---"
  mkdir -p "$REMOTE_BACKUP_LOCAL"
  lftp -u "$USER","$FTP_PASSWORD" -e "\
  set ftp:ssl-force true; \
  set ftp:ssl-protect-data true; \
  set ftp:ssl-protect-list true; \
  set ftp:ssl-auth TLS; \
  mirror --verbose $REMOTE_DIR $REMOTE_BACKUP_LOCAL; \
  bye\
  " $HOST
  # Compress remote backup
  tar -czf "$REMOTE_BACKUP_ARCHIVE" -C "$REMOTE_BACKUP_LOCAL" .
  rm -rf "$REMOTE_BACKUP_LOCAL"  # Remove uncompressed backup
  echo "Remote backup compressed to $REMOTE_BACKUP_ARCHIVE"
  REMOTE_BACKUP_SUMMARY="$REMOTE_BACKUP_ARCHIVE"
else
  echo -e "\n--- Step 2: Skipping remote backup (use --remote-backup to enable) ---"
fi

# --- Step 3: Verify files to be uploaded ---
echo -e "\n--- Step 3: Verifying files to be uploaded ---"
echo "Production files that would be uploaded (all dev/test/config files excluded):"
cd "$SOURCE_DIR"
# Note: Uses specific dot-directory excludes instead of '*/.*' to preserve .htaccess files
VERIFY_EXCLUDES="\
  -not -path '*/.git/*' \
  -not -path '*/.cursor/*' \
  -not -path '*/.agent/*' \
  -not -path '*/.vscode/*' \
  -not -path '*/.github/*' \
  -not -path '*/node_modules/*' \
  -not -path '*/docs/*' \
  -not -path '*/tests/*' \
  -not -path '*/backups/*' \
  -not -path '*/deploy_backups/*' \
  -not -path '*/app-imports/*' \
  -not -path '*/scripts/*' \
  -not -path '*/audit/*' \
  -not -path '*/bugs/*' \
  -not -path '*/planning/*' \
  -not -path '*/playwright-report/*' \
  -not -path '*/test-results/*' \
  -not -path '*/wdv_backup_*/*' \
  -not -path '*/remote_backup_*/*' \
  -not -path '*/api/sql/*' \
  -not -path '*/icons/*.html' \
  -not -name '.env*' \
  -not -name '.DS_Store' \
  -not -name '.cursorignore' \
  -not -name '.cursorrules' \
  -not -name '.dockerignore' \
  -not -name '.gitignore' \
  -not -name '.gitattributes' \
  -not -name '.markdownlint.json' \
  -not -name '*.md' \
  -not -name '*.config.js' \
  -not -name 'playwright.config*' \
  -not -name 'jest.config.js' \
  -not -name 'postcss.config.js' \
  -not -name 'tailwind.config.js' \
  -not -name 'package.json' \
  -not -name 'package-lock.json' \
  -not -name 'router.php' \
  -not -name 'docker-compose.yml' \
  -not -name 'nginx.conf' \
  -not -name 'config.docker.php' \
  -not -name 'test-coach-buttons.html' \
  -not -name 'test-*.html' \
  -not -name 'test_*.html' \
  -not -name 'test_*.sql' \
  -not -name 'test_*.php' \
  -not -name 'test-*.js' \
  -not -name 'generate-icons.sh' \
  -not -name 'tailwind-input.css' \
  -not -name '*.log' \
  -not -name '*.sh' \
  -not -name 'seed_*.php' \
  -not -name '*migrate*.php' \
  -not -name 'migration_*.php' \
  -not -name 'check_and_migrate.php' \
  -not -name 'cleanup_*.php' \
  -not -name 'diagnostic_*.php' \
  -not -name 'backfill_*.php' \
  -not -name 'add_size_columns.php' \
  -not -name 'config.local.php*' \
  -not -name 'route_debug.txt'"

eval "find . -type f $VERIFY_EXCLUDES" | sort
FILE_COUNT=$(eval "find . -type f $VERIFY_EXCLUDES" | wc -l | tr -d ' ')
echo "--- Total production files: $FILE_COUNT ---"
cd - > /dev/null

# --- Step 3.5: Set app version build for cache busting (version.json + sw.js) ---
BUILD=$(date +%Y%m%d%H%M%S)
if [ -f "$SOURCE_DIR/version.json" ]; then
  if sed --version >/dev/null 2>&1; then
    sed -i "s/\"build\": *\"[^\"]*\"/\"build\": \"$BUILD\"/" "$SOURCE_DIR/version.json"
  else
    sed -i '' "s/\"build\": *\"[^\"]*\"/\"build\": \"$BUILD\"/" "$SOURCE_DIR/version.json"
  fi
  echo "Set version.json build to $BUILD"
fi
if [ -f "$SOURCE_DIR/sw.js" ]; then
  if sed --version >/dev/null 2>&1; then
    sed -i "s/__BUILD__/$BUILD/g" "$SOURCE_DIR/sw.js"
  else
    sed -i '' "s/__BUILD__/$BUILD/g" "$SOURCE_DIR/sw.js"
  fi
  echo "Set sw.js cache version to $BUILD"
fi

# --- Step 4: Deploy to FTP (from SOURCE_DIR so backup, verify, and upload use same tree) ---
echo -e "\n--- Step 4: Deploying to FTP ---"
if [[ $RESET_MODE -eq 1 ]]; then
  # Full reset: force upload and delete remote files not present locally
  LFTP_CMD="mirror --reverse --verbose --parallel=4 --delete --only-newer $EXCLUDES ./ $REMOTE_DIR"
  echo "RESET MODE: Full re-upload and remote cleanup (remote files not present locally will be deleted)."
else
  # Normal: only changed files, no deletes
  LFTP_CMD="mirror --reverse --verbose --parallel=4 --only-newer $EXCLUDES ./ $REMOTE_DIR"
fi

if [[ $DRY_RUN -eq 1 ]]; then
  LFTP_CMD="$LFTP_CMD --dry-run"
  echo "DRY RUN: showing planned changes. No files will be uploaded."
fi

cd "$SOURCE_DIR" || { echo "Cannot cd to $SOURCE_DIR"; exit 1; }
lftp -c "set cmd:fail-exit yes; set ssl:verify-certificate no; set net:timeout 20; set net:max-retries 2; set net:reconnect-interval-base 5; set ftp:ssl-force true; set ftp:ssl-protect-data true; set ftp:prefer-epsv true; open -u $USER,$FTP_PASSWORD $HOST; $LFTP_CMD"

# Clean up
# rm deploy_files.txt
echo "Deployment complete!"

# --- Step 5: Purge Cloudflare Cache (Optional) ---
if [ -n "$CLOUDFLARE_API_TOKEN" ] && [ -n "$CLOUDFLARE_ZONE_ID" ]; then
  echo -e "\n--- Step 5: Purging Cloudflare cache ---"
  
  PURGE_RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"purge_everything":true}')
  
  # Check if purge was successful (handle both "success":true and "success": true)
  if echo "$PURGE_RESPONSE" | grep -q '"success"'; then
    if echo "$PURGE_RESPONSE" | grep -q 'true'; then
      echo "✓ Cloudflare cache purged successfully!"
    else
      echo "✗ Cloudflare cache purge failed:"
      echo "$PURGE_RESPONSE"
    fi
  else
    echo "✗ Cloudflare cache purge failed:"
    echo "$PURGE_RESPONSE"
  fi
else
  echo -e "\n--- Step 5: Skipping Cloudflare cache purge (credentials not set) ---"
  echo "To enable cache purging, add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID to .env"
fi

# --- Done ---
echo -e "\nAll done! Local backup: $LOCAL_BACKUP_SUMMARY | Remote backup: $REMOTE_BACKUP_SUMMARY"
