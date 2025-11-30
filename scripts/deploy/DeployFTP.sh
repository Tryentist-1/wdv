#!/bin/bash

# Deployment script for Tryentist WDV (FTP-SSL, with local and remote backup)
# Loads FTP_PASSWORD from .env (which should be in .gitignore)

# --- LOAD ENV VARIABLES ---
if [ -f .env ]; then
  set +H
  set -a
  source .env
  set +a
  set -H
fi

HOST="da100.is.cc"
USER="terry@tryentist.com"
REMOTE_DIR="public_html/wdv"
LOCAL_DIR="/Users/terry/web-mirrors/tryentist/wdv"
DATESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$LOCAL_DIR/deploy_backups"
LOCAL_BACKUP_ARCHIVE="$BACKUP_DIR/wdv_backup_$DATESTAMP.tar.gz"
REMOTE_BACKUP="public_html/wdv_backup_$DATESTAMP"
REMOTE_BACKUP_LOCAL="$BACKUP_DIR/remote_backup_$DATESTAMP"
REMOTE_BACKUP_ARCHIVE="$REMOTE_BACKUP_LOCAL.tar.gz"
LOCAL_BACKUP_SUMMARY="(skipped)"
REMOTE_BACKUP_SUMMARY="(skipped)"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# --- Build lftp exclude list from .gitignore and always-excluded files ---
# Never deploy local app-imports to prod (coach uploads live CSVs there)
EXCLUDES="--exclude-glob .env* --exclude-glob .git/** --exclude-glob wdv_backup_*/** --exclude-glob remote_backup_*/** --exclude-glob deploy_backups/** --exclude-glob node_modules/** --exclude-glob docs/** --exclude-glob tests/** --exclude-glob backups/** --exclude-glob app-imports/** --exclude-glob playwright-report/** --exclude-glob test-results/** --exclude-glob .vscode/** --exclude-glob .github/** --exclude-glob '*.md' --exclude-glob '.DS_Store'"
if [ -f .gitignore ]; then
  GITEXCLUDES=$(grep -v '^#' .gitignore | grep -v '^$' | awk '{print "--exclude-glob "$1}' | xargs)
  EXCLUDES="$EXCLUDES $GITEXCLUDES"
fi

echo "Debug: Exclude patterns being used:"
echo "$EXCLUDES"
echo "---"

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
    -C "$LOCAL_DIR" . || { echo "Local backup failed."; exit 1; }
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
echo "Files that would be uploaded (excluding sensitive files):"
cd "$LOCAL_DIR"
find . -type f -not -path "*/\.*" -not -path "*/node_modules/*" -not -path "*/docs/*" -not -path "*/tests/*" -not -path "*/backups/*" -not -path "*/deploy_backups/*" -not -path "*/app-imports/*" | sort
cd - > /dev/null

# --- Step 4: Deploy to FTP ---
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
