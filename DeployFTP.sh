#!/bin/bash

# Deployment script for Tryentist WDV (FTP-SSL, with local and remote backup)

# --- CONFIG ---
HOST="da100.is.cc"
USER="terry@tryentist.com"
REMOTE_DIR="public_html/wdv"
LOCAL_DIR="/Users/terry/web-mirrors/tryentist/wdv"
DATESTAMP=$(date +%Y%m%d_%H%M%S)
LOCAL_BACKUP="$LOCAL_DIR/../wdv_backup_$DATESTAMP"
REMOTE_BACKUP="public_html/wdv_backup_$DATESTAMP"
REMOTE_BACKUP_LOCAL="$LOCAL_DIR/../remote_backup_$DATESTAMP"

# --- PROMPT FOR PASSWORD ---
read -sp "FTP Password: " PASS

echo -e "\n\n--- Step 1: Local backup ---"
mkdir -p "$LOCAL_BACKUP"
cp -r "$LOCAL_DIR"/* "$LOCAL_BACKUP"
echo "Local backup created at $LOCAL_BACKUP"

# --- Step 2: Remote backup (download to local) ---
echo -e "\n--- Step 2: Downloading remote backup to $REMOTE_BACKUP_LOCAL ---"
lftp -u "$USER","$PASS" -e "\
set ftp:ssl-force true; \
set ftp:ssl-protect-data true; \
set ftp:ssl-protect-list true; \
set ftp:ssl-auth TLS; \
mirror --verbose $REMOTE_DIR $REMOTE_BACKUP_LOCAL; \
bye\
" $HOST
echo "Remote backup downloaded to $REMOTE_BACKUP_LOCAL"

# --- Step 3: Deploy (upload) ---
echo -e "\n--- Step 3: Deploying local files to remote server ---"
lftp -u "$USER","$PASS" -e "\
set ftp:ssl-force true; \
set ftp:ssl-protect-data true; \
set ftp:ssl-protect-list true; \
set ftp:ssl-auth TLS; \
mirror -R --only-newer --verbose $LOCAL_DIR $REMOTE_DIR; \
bye\
" $HOST
echo "Deployment complete!"

# --- Done ---
echo -e "\nAll done! Local backup: $LOCAL_BACKUP | Remote backup (downloaded): $REMOTE_BACKUP_LOCAL"