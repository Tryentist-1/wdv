#!/bin/bash

# Dev Database Cleanup Script
# Purpose: Clean up dev database to start fresh (preserves archers only)
# Usage: ./cleanup-dev-db.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database connection
DB_NAME="wdv_local"
DB_USER="root"
SQL_FILE="api/sql/cleanup_dev_database_fresh_start.sql"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Dev Database Cleanup: Fresh Start${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if SQL file exists
if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}❌ Error: SQL file not found: $SQL_FILE${NC}"
    exit 1
fi

# Warn user
echo -e "${YELLOW}⚠️  WARNING: This will delete ALL competition data!${NC}"
echo -e "${YELLOW}   Only the archers master list will be preserved.${NC}"
echo ""
echo -e "Database: ${BLUE}$DB_NAME${NC}"
echo -e "SQL File: ${BLUE}$SQL_FILE${NC}"
echo ""

# Confirm
read -p "Are you sure you want to continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}Cancelled. No changes made.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Step 1: Previewing data to be deleted...${NC}"
echo ""

# Preview what will be deleted (first part of SQL file)
mysql -u "$DB_USER" -p "$DB_NAME" << 'EOF' 2>/dev/null || mysql -u "$DB_USER" "$DB_NAME" << 'EOF'
SELECT 
    '--- PREVIEW: What will be DELETED ---' AS info
UNION ALL
SELECT 
    CONCAT('events: ', COUNT(*), ' records') AS preview
FROM events
UNION ALL
SELECT 
    CONCAT('rounds: ', COUNT(*), ' records') AS preview
FROM rounds
UNION ALL
SELECT 
    CONCAT('round_archers: ', COUNT(*), ' records') AS preview
FROM round_archers
UNION ALL
SELECT 
    CONCAT('end_events: ', COUNT(*), ' records') AS preview
FROM end_events
UNION ALL
SELECT 
    CONCAT('solo_matches: ', COUNT(*), ' records') AS preview
FROM solo_matches
UNION ALL
SELECT 
    CONCAT('team_matches: ', COUNT(*), ' records') AS preview
FROM team_matches
UNION ALL
SELECT 
    CONCAT('brackets: ', COUNT(*), ' records') AS preview
FROM brackets
UNION ALL
SELECT 
    CONCAT('bracket_entries: ', COUNT(*), ' records') AS preview
FROM bracket_entries;

SELECT 
    '--- What will be KEPT ---' AS info
UNION ALL
SELECT 
    CONCAT('archers: ', COUNT(*), ' records (MASTER LIST PRESERVED)') AS kept
FROM archers;
EOF

echo ""
echo -e "${YELLOW}Review the preview above.${NC}"
read -p "Continue with deletion? (yes/no): " confirm2
if [ "$confirm2" != "yes" ]; then
    echo -e "${YELLOW}Cancelled. No changes made.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Step 2: Running cleanup script...${NC}"
echo ""

# Run the cleanup script
if mysql -u "$DB_USER" -p "$DB_NAME" < "$SQL_FILE" 2>/dev/null || mysql -u "$DB_USER" "$DB_NAME" < "$SQL_FILE"; then
    echo ""
    echo -e "${GREEN}✅ Cleanup completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Step 3: Verifying results...${NC}"
    echo ""
    
    # Quick verification
    mysql -u "$DB_USER" -p "$DB_NAME" << 'EOF' 2>/dev/null || mysql -u "$DB_USER" "$DB_NAME" << 'EOF'
SELECT 
    '--- VERIFICATION ---' AS info,
    (SELECT COUNT(*) FROM events) AS events_count,
    (SELECT COUNT(*) FROM rounds) AS rounds_count,
    (SELECT COUNT(*) FROM round_archers) AS round_archers_count,
    (SELECT COUNT(*) FROM end_events) AS end_events_count,
    (SELECT COUNT(*) FROM archers) AS archers_count;
EOF
    
    echo ""
    echo -e "${GREEN}✅ All competition data deleted${NC}"
    echo -e "${GREEN}✅ Archers master list preserved${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "  1. Open coach console: http://localhost:8001/coach.html"
    echo "  2. Create a fresh test event"
    echo "  3. Test resume round functionality"
    echo ""
else
    echo -e "${RED}❌ Error: Cleanup failed${NC}"
    exit 1
fi

