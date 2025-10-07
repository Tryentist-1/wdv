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
BACKUP_DIR="$LOCAL_DIR/../backups"
LOCAL_BACKUP="$BACKUP_DIR/wdv_backup_$DATESTAMP"
REMOTE_BACKUP="public_html/wdv_backup_$DATESTAMP"
REMOTE_BACKUP_LOCAL="$BACKUP_DIR/remote_backup_$DATESTAMP"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# --- Build lftp exclude list from .gitignore and always-excluded files ---
# Never deploy local app-imports to prod (coach uploads live CSVs there)
EXCLUDES="--exclude-glob .env* --exclude-glob .git/** --exclude-glob wdv_backup_*/** --exclude-glob remote_backup_*/** --exclude-glob node_modules/** --exclude-glob docs/** --exclude-glob tests/** --exclude-glob backups/** --exclude-glob app-imports/**"
if [ -f .gitignore ]; then
  GITEXCLUDES=$(grep -v '^#' .gitignore | grep -v '^$' | awk '{print "--exclude-glob "$1}' | xargs)
  EXCLUDES="$EXCLUDES $GITEXCLUDES"
fi

echo "Debug: Exclude patterns being used:"
echo "$EXCLUDES"
echo "---"

# --- Parse command-line arguments for reset mode ---
RESET_MODE=0
if [[ "$1" == "--reset" ]]; then
  RESET_MODE=1
fi

# --- Step 1: Local backup ---
echo -e "\n--- Step 1: Local backup ---"
mkdir -p "$LOCAL_BACKUP"
cp -r "$LOCAL_DIR"/* "$LOCAL_BACKUP"
echo "Local backup created at $LOCAL_BACKUP"
# Compress local backup
tar -czf "$LOCAL_BACKUP.tar.gz" -C "$LOCAL_BACKUP" .
rm -rf "$LOCAL_BACKUP"  # Remove uncompressed backup
echo "Local backup compressed to $LOCAL_BACKUP.tar.gz"

# --- Step 2: Remote backup (download to local) ---
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
tar -czf "$REMOTE_BACKUP_LOCAL.tar.gz" -C "$REMOTE_BACKUP_LOCAL" .
rm -rf "$REMOTE_BACKUP_LOCAL"  # Remove uncompressed backup
echo "Remote backup compressed to $REMOTE_BACKUP_LOCAL.tar.gz"

# --- Step 3: Verify files to be uploaded ---
echo -e "\n--- Step 3: Verifying files to be uploaded ---"
echo "Files that would be uploaded (excluding sensitive files):"
cd "$LOCAL_DIR"
find . -type f -not -path "*/\.*" -not -path "*/node_modules/*" -not -path "*/docs/*" -not -path "*/tests/*" -not -path "*/backups/*" -not -path "*/app-imports/*" | sort
cd - > /dev/null

# --- Step 4: Deploy to FTP ---
echo -e "\n--- Step 4: Deploying to FTP ---"
if [[ $RESET_MODE -eq 1 ]]; then
  # Full reset: force upload and delete remote files not present locally
  LFTP_CMD="mirror --reverse --verbose --delete $EXCLUDES ./ $REMOTE_DIR"
  echo "RESET MODE: Full re-upload and remote cleanup (remote files not present locally will be deleted)."
else
  # Normal: only changed files, no deletes
  LFTP_CMD="mirror --reverse --verbose $EXCLUDES ./ $REMOTE_DIR"
fi

lftp -c "set ssl:verify-certificate no; open -u $USER,$FTP_PASSWORD $HOST; $LFTP_CMD"

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
echo -e "\nAll done! Local backup: $LOCAL_BACKUP.tar.gz | Remote backup: $REMOTE_BACKUP_LOCAL.tar.gz"