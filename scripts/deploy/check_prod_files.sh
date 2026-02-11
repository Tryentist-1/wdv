#!/bin/bash

# Simple script to check what files/folders are on production
# Usage: ./check_prod_files.sh

# Load FTP credentials from .env
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

echo "Checking production server for files that shouldn't be there..."
echo "---"

# List all files/folders on production
lftp -c "set ssl:verify-certificate no; set ftp:ssl-force true; set ftp:ssl-protect-data true; open -u $USER,$FTP_PASSWORD $HOST; ls -la $REMOTE_DIR" | head -50

echo ""
echo "---"
echo "Checking for problematic folders:"
echo ""

# Check for .cursor
echo -n ".cursor folder: "
lftp -c "set ssl:verify-certificate no; set ftp:ssl-force true; set ftp:ssl-protect-data true; open -u $USER,$FTP_PASSWORD $HOST; ls $REMOTE_DIR/.cursor" 2>&1 | grep -q "not found" && echo "NOT FOUND ✓" || echo "EXISTS ✗"

# Check for .agent
echo -n ".agent folder: "
lftp -c "set ssl:verify-certificate no; set ftp:ssl-force true; set ftp:ssl-protect-data true; open -u $USER,$FTP_PASSWORD $HOST; ls $REMOTE_DIR/.agent" 2>&1 | grep -q "not found" && echo "NOT FOUND ✓" || echo "EXISTS ✗"

# Check for .git
echo -n ".git folder: "
lftp -c "set ssl:verify-certificate no; set ftp:ssl-force true; set ftp:ssl-protect-data true; open -u $USER,$FTP_PASSWORD $HOST; ls $REMOTE_DIR/.git" 2>&1 | grep -q "not found" && echo "NOT FOUND ✓" || echo "EXISTS ✗"

# Check for node_modules
echo -n "node_modules folder: "
lftp -c "set ssl:verify-certificate no; set ftp:ssl-force true; set ftp:ssl-protect-data true; open -u $USER,$FTP_PASSWORD $HOST; ls $REMOTE_DIR/node_modules" 2>&1 | grep -q "not found" && echo "NOT FOUND ✓" || echo "EXISTS ✗"

# Check for docs
echo -n "docs folder: "
lftp -c "set ssl:verify-certificate no; set ftp:ssl-force true; set ftp:ssl-protect-data true; open -u $USER,$FTP_PASSWORD $HOST; ls $REMOTE_DIR/docs" 2>&1 | grep -q "not found" && echo "NOT FOUND ✓" || echo "EXISTS ✗"

echo ""
echo "Done!"
