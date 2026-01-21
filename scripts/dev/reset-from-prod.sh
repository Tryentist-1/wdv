#!/bin/bash

# Reset Local Dev Database from Production Backup
# 
# This script completely resets your local dev database by importing a production backup.
# It handles all edge cases including view INSERT issues and MySQL compatibility.
# 
# Usage:
#   ./scripts/dev/reset-from-prod.sh [backup_file.sql] [--yes]
# 
# Options:
#   backup_file.sql  - Path to backup file (default: most recent in backups/)
#   --yes            - Skip confirmation prompt (useful for automation)
#
# Examples:
#   ./scripts/dev/reset-from-prod.sh
#   ./scripts/dev/reset-from-prod.sh backups/db_backup_20260121_135139.sql
#   ./scripts/dev/reset-from-prod.sh --yes  # Auto-confirm with latest backup

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
cd "$PROJECT_ROOT"

# Parse arguments
SKIP_CONFIRM=false
BACKUP_FILE=""

for arg in "$@"; do
    if [ "$arg" = "--yes" ] || [ "$arg" = "-y" ]; then
        SKIP_CONFIRM=true
    elif [ -f "$arg" ]; then
        BACKUP_FILE="$arg"
    elif [[ "$arg" == *.sql ]]; then
        # Might be a relative path
        if [ -f "$PROJECT_ROOT/$arg" ]; then
            BACKUP_FILE="$PROJECT_ROOT/$arg"
        else
            echo -e "${RED}❌ Backup file not found: $arg${NC}"
            exit 1
        fi
    fi
done

# Get backup file if not specified
if [ -z "$BACKUP_FILE" ]; then
    # Try to find most recent backup (production or regular)
    BACKUP_FILE=$(ls -t backups/db_backup*.sql 2>/dev/null | head -1)
    if [ -z "$BACKUP_FILE" ]; then
        echo -e "${RED}❌ No backup file found in backups/ directory${NC}"
        echo ""
        echo "Usage: $0 [backup_file.sql] [--yes]"
        echo ""
        echo "Examples:"
        echo "  $0                                    # Use most recent backup"
        echo "  $0 backups/db_backup_20260121.sql    # Use specific backup"
        echo "  $0 --yes                              # Auto-confirm with latest"
        exit 1
    fi
    echo -e "${CYAN}📦 Using most recent backup: $BACKUP_FILE${NC}"
fi

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Check if Docker MySQL is running
if ! docker ps --format '{{.Names}}' | grep -q "^wdv-mysql$"; then
    echo -e "${RED}❌ MySQL Docker container is not running${NC}"
    echo ""
    echo "Please start it first:"
    echo "  wdv-start"
    echo "  or"
    echo "  ./scripts/dev/start.sh"
    exit 1
fi

# Wait for MySQL to be ready
echo -e "${BLUE}🔍 Checking MySQL connection...${NC}"
MAX_ATTEMPTS=15
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if docker exec wdv-mysql mysqladmin ping -h localhost -uroot -psecret > /dev/null 2>&1; then
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    sleep 1
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "${RED}❌ MySQL is not responding after ${MAX_ATTEMPTS} seconds${NC}"
    exit 1
fi

echo -e "${GREEN}✅ MySQL is ready${NC}"

# Display information
echo ""
echo "================================================================="
echo "RESET LOCAL DEV DATABASE FROM PRODUCTION BACKUP"
echo "================================================================="
echo ""
echo "Backup file: $BACKUP_FILE"
echo "Database:    wdv"
echo "Container:   wdv-mysql"
echo ""

# Get backup file info
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
BACKUP_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$BACKUP_FILE" 2>/dev/null || stat -c "%y" "$BACKUP_FILE" 2>/dev/null | cut -d'.' -f1)
echo "Backup size: $BACKUP_SIZE"
echo "Backup date: $BACKUP_DATE"
echo ""

echo -e "${YELLOW}⚠️  WARNING: This will DROP and recreate the local dev database!${NC}"
echo -e "${YELLOW}⚠️  All existing data in the local database will be lost!${NC}"
echo ""

# Confirmation
if [ "$SKIP_CONFIRM" = false ]; then
    read -p "Are you sure you want to continue? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo -e "${RED}❌ Reset cancelled${NC}"
        exit 1
    fi
fi

# Create temporary directory for processing
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo ""
echo "================================================================="
echo "Step 1: Preparing backup file..."
echo "================================================================="

# Create filtered backup that removes view INSERT statements
# Views are computed from tables, not stored data
FILTERED_BACKUP="$TEMP_DIR/backup_filtered.sql"

echo "Filtering out view INSERT statements..."
cat "$BACKUP_FILE" | \
    # Remove INSERT statements for views (they're computed, not stored)
    sed -E '/^-- Data for table `v_/,/^UNLOCK TABLES;/d' | \
    sed '/^INSERT INTO `v_/d' | \
    sed '/^LOCK TABLES `v_/d' | \
    # Fix MySQL compatibility issues
    sed -e "s/^USE \`[^\`]*\`;/USE \`wdv\`;/g" \
        -e "s/ DEFAULT uuid()//g" \
        -e "s/ DEFAULT (uuid())//g" \
        -e "s/ DEFAULT uuid()//g" \
    > "$FILTERED_BACKUP"

echo -e "${GREEN}✅ Backup file prepared${NC}"

echo ""
echo "================================================================="
echo "Step 2: Dropping existing database..."
echo "================================================================="

# Drop database if it exists
docker exec wdv-mysql mysql -uroot -psecret -e "DROP DATABASE IF EXISTS \`wdv\`;" 2>/dev/null || true

echo -e "${GREEN}✅ Database dropped${NC}"

echo ""
echo "================================================================="
echo "Step 3: Creating fresh database..."
echo "================================================================="

# Create fresh database
docker exec wdv-mysql mysql -uroot -psecret -e "CREATE DATABASE \`wdv\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null

echo -e "${GREEN}✅ Database created${NC}"

echo ""
echo "================================================================="
echo "Step 4: Importing table data..."
echo "================================================================="

# Import backup via Docker
# Suppress password warning but check for real errors
set +e  # Temporarily disable exit on error to check exit code
docker exec -i wdv-mysql mysql -uroot -psecret wdv < "$FILTERED_BACKUP" 2>&1 | grep -v "Using a password on the command line interface can be insecure" > /dev/null
IMPORT_EXIT=${PIPESTATUS[0]}
set -e  # Re-enable exit on error

if [ $IMPORT_EXIT -ne 0 ]; then
    echo -e "${RED}❌ Import failed with exit code $IMPORT_EXIT!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Table data imported${NC}"

echo ""
echo "================================================================="
echo "Step 5: Creating database views..."
echo "================================================================="

# Create views from schema file
if [ -f "api/sql/create_readable_views.sql" ]; then
    set +e  # Temporarily disable exit on error to check exit code
    docker exec -i wdv-mysql mysql -uroot -psecret wdv < api/sql/create_readable_views.sql 2>&1 | grep -v "Using a password on the command line interface can be insecure" > /dev/null
    VIEW_EXIT=${PIPESTATUS[0]}
    set -e  # Re-enable exit on error
    
    if [ $VIEW_EXIT -ne 0 ]; then
        echo -e "${YELLOW}⚠️  Warning: Some views may not have been created (exit code $VIEW_EXIT)${NC}"
    else
        echo -e "${GREEN}✅ Views created${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  View creation script not found: api/sql/create_readable_views.sql${NC}"
fi

echo ""
echo "================================================================="
echo "Step 6: Verifying restore..."
echo "================================================================="

# Get all tables and views
ALL_OBJECTS=$(docker exec wdv-mysql mysql -uroot -psecret wdv -e "SHOW TABLES;" -s --skip-column-names 2>/dev/null)

if [ -z "$ALL_OBJECTS" ]; then
    echo -e "${RED}❌ No tables found after restore!${NC}"
    exit 1
fi

# Count tables vs views
TABLES=$(echo "$ALL_OBJECTS" | grep -v "^v_" || true)
VIEWS=$(echo "$ALL_OBJECTS" | grep "^v_" || true)

TABLE_COUNT=$(echo "$TABLES" | grep -c . || echo "0")
VIEW_COUNT=$(echo "$VIEWS" | grep -c . || echo "0")

echo -e "${GREEN}✅ Database objects restored:${NC}"
echo "  - Tables: $TABLE_COUNT"
echo "  - Views:  $VIEW_COUNT"
echo ""

# Show key table row counts
echo -e "${CYAN}Key table row counts:${NC}"
for table in archers events rounds round_archers end_events; do
    COUNT=$(docker exec wdv-mysql mysql -uroot -psecret wdv -e "SELECT COUNT(*) FROM \`$table\`;" -s --skip-column-names 2>/dev/null || echo "0")
    if [ "$COUNT" != "0" ] || [ "$table" = "events" ]; then
        printf "  - %-20s %6s rows\n" "$table:" "$COUNT"
    fi
done

echo ""
echo "================================================================="
echo -e "${GREEN}✅ RESET COMPLETE!${NC}"
echo "================================================================="
echo ""
echo "Your local dev database has been reset from production backup."
echo ""
echo -e "${CYAN}Database Details:${NC}"
echo "  Database:  wdv"
echo "  Container: wdv-mysql"
echo "  Backup:    $BACKUP_FILE"
echo ""
echo -e "${BLUE}💡 You can now access the app with production data at:${NC}"
echo "   http://localhost:8001/index.html"
echo ""
