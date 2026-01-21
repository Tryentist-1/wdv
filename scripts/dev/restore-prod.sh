#!/bin/bash

# Restore Production Backup to Local Dev Database (Docker)
# 
# This script restores a production backup SQL file to your local Docker MySQL database
# 
# Usage:
#   ./scripts/dev/restore-prod.sh [backup_file.sql]
# 
# If no file is specified, it will use the most recent production backup

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
cd "$PROJECT_ROOT"

# Get backup file
if [ -z "$1" ]; then
    # Find most recent production backup
    BACKUP_FILE=$(ls -t backups/db_backup_production*.sql 2>/dev/null | head -1)
    if [ -z "$BACKUP_FILE" ]; then
        echo -e "${RED}❌ No production backup file found in backups/ directory${NC}"
        echo "Usage: $0 [backup_file.sql]"
        exit 1
    fi
    echo -e "${YELLOW}📦 Using most recent production backup: $BACKUP_FILE${NC}"
else
    BACKUP_FILE="$1"
    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}❌ Backup file not found: $BACKUP_FILE${NC}"
        exit 1
    fi
fi

# Check if Docker MySQL is running
if ! docker ps --format '{{.Names}}' | grep -q "^wdv-mysql$"; then
    echo -e "${RED}❌ MySQL Docker container is not running${NC}"
    echo "Please start it first: wdv-start"
    exit 1
fi

# Wait for MySQL to be ready
echo -e "${BLUE}🔍 Checking MySQL connection...${NC}"
MAX_ATTEMPTS=10
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if docker exec wdv-mysql mysqladmin ping -h localhost -uroot -psecret > /dev/null 2>&1; then
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    sleep 1
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "${RED}❌ MySQL is not responding${NC}"
    exit 1
fi

echo ""
echo "================================================================="
echo "RESTORE PRODUCTION BACKUP TO LOCAL DEV DATABASE (Docker)"
echo "================================================================="
echo ""
echo "Backup file: $BACKUP_FILE"
echo "Database: wdv"
echo "Container: wdv-mysql"
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

# Drop database if it exists
docker exec wdv-mysql mysql -uroot -psecret -e "DROP DATABASE IF EXISTS \`wdv\`;" 2>/dev/null || true

echo -e "${GREEN}✅ Database dropped${NC}"

echo ""
echo "================================================================="
echo "Step 2: Creating fresh database..."
echo "================================================================="

# Create fresh database
docker exec wdv-mysql mysql -uroot -psecret -e "CREATE DATABASE \`wdv\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo -e "${GREEN}✅ Database created${NC}"

echo ""
echo "================================================================="
echo "Step 3: Restoring backup..."
echo "================================================================="

# Create a temporary file with MySQL compatibility fixes
TEMP_BACKUP=$(mktemp)
# Fix MySQL compatibility issues:
# 1. Replace any USE database statements
# 2. Remove DEFAULT uuid() - MySQL 8.0 handles UUIDs differently
sed -e "s/^USE \`[^\`]*\`;/USE \`wdv\`;/g" \
    -e "s/ DEFAULT uuid()//g" \
    -e "s/ DEFAULT (uuid())//g" \
    "$BACKUP_FILE" > "$TEMP_BACKUP"

# Restore backup via Docker
if docker exec -i wdv-mysql mysql -uroot -psecret wdv < "$TEMP_BACKUP"; then
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
TABLES=$(docker exec wdv-mysql mysql -uroot -psecret wdv -e "SHOW TABLES;" -s --skip-column-names 2>/dev/null)

if [ -z "$TABLES" ]; then
    echo -e "${RED}❌ No tables found after restore!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Tables restored:${NC}"
for table in $TABLES; do
    COUNT=$(docker exec wdv-mysql mysql -uroot -psecret wdv -e "SELECT COUNT(*) FROM \`$table\`;" -s --skip-column-names 2>/dev/null)
    echo "  - $table: $COUNT rows"
done

echo ""
echo "================================================================="
echo -e "${GREEN}✅ RESTORE COMPLETE!${NC}"
echo "================================================================="
echo ""
echo "Your local dev database now mirrors production!"
echo "Database: wdv"
echo "Backup file: $BACKUP_FILE"
echo ""
echo -e "${BLUE}💡 You can now access the app with production data at:${NC}"
echo "   http://localhost:8001/index.html"
echo ""
