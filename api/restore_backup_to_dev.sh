#!/bin/bash

# Restore Production Backup to Local Dev Database
# 
# This script restores a production backup SQL file to your local dev MySQL database
# 
# Usage:
#   ./api/restore_backup_to_dev.sh [backup_file.sql]
# 
# If no file is specified, it will use the most recent backup in backups/

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get backup file
if [ -z "$1" ]; then
    # Find most recent backup
    BACKUP_FILE=$(ls -t backups/db_backup_*.sql 2>/dev/null | head -1)
    if [ -z "$BACKUP_FILE" ]; then
        echo -e "${RED}❌ No backup file found in backups/ directory${NC}"
        echo "Usage: $0 [backup_file.sql]"
        exit 1
    fi
    echo -e "${YELLOW}📦 Using most recent backup: $BACKUP_FILE${NC}"
else
    BACKUP_FILE="$1"
    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}❌ Backup file not found: $BACKUP_FILE${NC}"
        exit 1
    fi
fi

# Load database config from config.local.php
# Extract database name from DSN
if [ -f api/config.local.php ]; then
    # Get DB_DSN line (OPTION 2 should be active for local)
    DB_DSN_LINE=$(grep "define('DB_DSN'" api/config.local.php | grep -v "^//" | grep "localhost" | head -1)
    if [ -n "$DB_DSN_LINE" ]; then
        DB_NAME=$(echo "$DB_DSN_LINE" | sed "s/.*dbname=\([^;']*\).*/\1/")
    fi
    
    # Get DB_USER (OPTION 2 should be active for local)
    DB_USER_LINE=$(grep "define('DB_USER'" api/config.local.php | grep -v "^//" | grep -v "aelectri_wdv" | head -1)
    if [ -n "$DB_USER_LINE" ]; then
        DB_USER=$(echo "$DB_USER_LINE" | sed "s/.*'\([^']*\)'.*/\1/")
    fi
    
    # Get DB_PASS (OPTION 2 should be active for local)
    DB_PASS_LINE=$(grep "define('DB_PASS'" api/config.local.php | grep -v "^//" | grep "''" | head -1)
    if [ -n "$DB_PASS_LINE" ]; then
        DB_PASS=$(echo "$DB_PASS_LINE" | sed "s/.*'\([^']*\)'.*/\1/" | sed "s/''//")
    fi
fi

# Defaults if not found
DB_NAME=${DB_NAME:-wdv}
DB_USER=${DB_USER:-root}
DB_PASS=${DB_PASS:-}

# If password is empty, use empty string, otherwise use -p flag
if [ -z "$DB_PASS" ]; then
    MYSQL_PASS=""
else
    MYSQL_PASS="-p$DB_PASS"
fi

echo "================================================================="
echo "RESTORE PRODUCTION BACKUP TO LOCAL DEV DATABASE"
echo "================================================================="
echo ""
echo "Backup file: $BACKUP_FILE"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""
echo -e "${YELLOW}⚠️  WARNING: This will DROP and recreate the local dev database!${NC}"
echo -e "${YELLOW}⚠️  All existing data in the local database will be lost!${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}❌ Restore cancelled${NC}"
    exit 1
fi

echo ""
echo "================================================================="
echo "Step 1: Dropping existing database..."
echo "================================================================="

# Drop database if it exists (ignore errors if it doesn't)
mysql -u "$DB_USER" $MYSQL_PASS -e "DROP DATABASE IF EXISTS \`$DB_NAME\`;" 2>/dev/null || true

echo -e "${GREEN}✅ Database dropped${NC}"

echo ""
echo "================================================================="
echo "Step 2: Creating fresh database..."
echo "================================================================="

# Create fresh database
mysql -u "$DB_USER" $MYSQL_PASS -e "CREATE DATABASE \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo -e "${GREEN}✅ Database created${NC}"

echo ""
echo "================================================================="
echo "Step 3: Restoring backup..."
echo "================================================================="

# Create a temporary file with database name replaced and MySQL version compatibility fixes
TEMP_BACKUP=$(mktemp)
# Fix MySQL compatibility issues:
# 1. Replace any USE database statements
# 2. Remove DEFAULT uuid() - MySQL 9 doesn't support it the same way, we'll generate UUIDs in PHP
sed -e "s/^USE \`[^\`]*\`;/USE \`$DB_NAME\`;/g" \
    -e "s/ DEFAULT uuid()//g" \
    -e "s/ DEFAULT (uuid())//g" \
    "$BACKUP_FILE" > "$TEMP_BACKUP"

# Restore backup
if mysql -u "$DB_USER" $MYSQL_PASS "$DB_NAME" < "$TEMP_BACKUP"; then
    echo -e "${GREEN}✅ Backup restored successfully!${NC}"
    rm -f "$TEMP_BACKUP"
else
    echo -e "${RED}❌ Restore failed!${NC}"
    rm -f "$TEMP_BACKUP"
    exit 1
fi

echo ""
echo "================================================================="
echo "Step 4: Verifying restore..."
echo "================================================================="

# Check table counts
TABLES=$(mysql -u "$DB_USER" $MYSQL_PASS "$DB_NAME" -e "SHOW TABLES;" -s --skip-column-names)

if [ -z "$TABLES" ]; then
    echo -e "${RED}❌ No tables found after restore!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Tables restored:${NC}"
for table in $TABLES; do
    COUNT=$(mysql -u "$DB_USER" $MYSQL_PASS "$DB_NAME" -e "SELECT COUNT(*) FROM \`$table\`;" -s --skip-column-names)
    echo "  - $table: $COUNT rows"
done

echo ""
echo "================================================================="
echo -e "${GREEN}✅ RESTORE COMPLETE!${NC}"
echo "================================================================="
echo ""
echo "Your local dev database now mirrors production!"
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"
echo ""

