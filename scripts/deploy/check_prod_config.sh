#!/bin/bash

# Check production MySQL config (without exposing credentials)
# Usage: ./check_prod_config.sh

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

echo "Checking production config files..."
echo "---"

# Check if config.local.php exists
echo "1. Checking api/config.local.php:"
lftp -c "set ssl:verify-certificate no; set ftp:ssl-force true; set ftp:ssl-protect-data true; open -u $USER,$FTP_PASSWORD $HOST; ls -la $REMOTE_DIR/api/config.local.php" 2>&1 | grep -q "not found" && echo "   ✗ MISSING - Production needs this file with MySQL credentials" || echo "   ✓ EXISTS"

echo ""
echo "2. Checking api/config.php:"
lftp -c "set ssl:verify-certificate no; set ftp:ssl-force true; set ftp:ssl-protect-data true; open -u $USER,$FTP_PASSWORD $HOST; ls -la $REMOTE_DIR/api/config.php" 2>&1 | grep -q "not found" && echo "   ✗ MISSING" || echo "   ✓ EXISTS"

echo ""
echo "3. Downloading config.local.php to check what's active..."
TEMP_FILE="/tmp/prod_config_check_$$.php"
lftp -c "set ssl:verify-certificate no; set ftp:ssl-force true; set ftp:ssl-protect-data true; open -u $USER,$FTP_PASSWORD $HOST; get $REMOTE_DIR/api/config.local.php -o $TEMP_FILE" 2>&1 > /dev/null

if [ -f "$TEMP_FILE" ]; then
  echo ""
  echo "   Current config content (passwords masked):"
  echo "   ---"
  # Show which DB config is active (commented or not)
  if grep -q "^define('DB_DSN', 'mysql:host=127.0.0.1" "$TEMP_FILE" 2>/dev/null; then
    echo "   ⚠️  PROBLEM: LOCAL Docker config is ACTIVE (127.0.0.1:3306)"
    echo "      This is why production is failing!"
  fi
  if grep -q "^define('DB_DSN', 'mysql:host=localhost" "$TEMP_FILE" 2>/dev/null; then
    echo "   ✓ Production config is ACTIVE (localhost)"
  fi
  if grep -q "^// define('DB_DSN', 'mysql:host=localhost" "$TEMP_FILE" 2>/dev/null; then
    echo "   ⚠️  PROBLEM: Production config is COMMENTED OUT"
    echo "      Uncomment it and comment out the local config!"
  fi
  echo "   ---"
  rm "$TEMP_FILE"
else
  echo "   Could not download config file"
fi

echo ""
echo "4. Testing API health (this will show if MySQL connection works):"
API_RESPONSE=$(curl -s "https://archery.tryentist.com/api/v1/health")
echo "   $API_RESPONSE"
if echo "$API_RESPONSE" | grep -q "ok"; then
  echo "   ✓ API is working!"
else
  echo "   ✗ API is failing - check config above"
fi

echo ""
echo ""
echo "---"
echo "🚨 IF YOU SEE 'LOCAL Docker config is ACTIVE' ABOVE:"
echo ""
echo "See: docs/FIX_PROD_CONFIG_NOW.md for exact fix instructions"
echo ""
echo "Quick fix: Edit public_html/wdv/api/config.local.php on production"
echo "  - Comment out the local Docker config (add // in front)"
echo "  - Uncomment the production config (remove //)"
echo ""
