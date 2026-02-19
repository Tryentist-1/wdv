#!/bin/bash

# Dev Database Cleanup Script
# Purpose: Clean up dev database to start fresh (preserves archers only)
# Usage: ./scripts/dev/cleanup-dev-db.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get project root to ensure correct paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
cd "$PROJECT_ROOT"

# Database connection details (Docker)
DB_CONTAINER="wdv-mysql"
DB_NAME="wdv"
DB_USER="root"
DB_PASS="secret"
SQL_FILE="api/sql/cleanup_dev_database_fresh_start.sql"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Dev Database Cleanup: Fresh Start${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Docker MySQL is running
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    echo -e "${RED}❌ MySQL Docker container '${DB_CONTAINER}' is not running${NC}"
    echo ""
    echo "Please start it first:"
    echo "  ./scripts/dev/start.sh"
    exit 1
fi

# Check if SQL file exists
if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}❌ Error: SQL file not found: $SQL_FILE${NC}"
    exit 1
fi

# Warn user
echo -e "${YELLOW}⚠️  WARNING: This will delete ALL competition data from the Docker database!${NC}"
echo -e "${YELLOW}   Only the archers master list will be preserved.${NC}"
echo ""
echo -e "Container: ${BLUE}$DB_CONTAINER${NC}"
echo -e "Database:  ${BLUE}$DB_NAME${NC}"
echo -e "SQL File:  ${BLUE}$SQL_FILE${NC}"
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
# We use sed to extract just the SELECT statements before the DELETEs if possible, 
# but the SQL file is structured to show preview first then delete. 
# However, piping the whole file will execute the DELETEs too if we aren't careful.
# The original script piped a separate HEREDOC for preview. Let's do that for safety.

docker exec -i "$DB_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" << 'EOF'
SELECT 
    '--- PREVIEW: What will be DELETED ---' AS info
UNION ALL
SELECT CONCAT('events: ', COUNT(*), ' records') FROM events
UNION ALL
SELECT CONCAT('rounds: ', COUNT(*), ' records') FROM rounds
UNION ALL
SELECT CONCAT('round_archers: ', COUNT(*), ' records') FROM round_archers
UNION ALL
SELECT CONCAT('end_events: ', COUNT(*), ' records') FROM end_events
UNION ALL
SELECT CONCAT('solo_matches: ', COUNT(*), ' records') FROM solo_matches
UNION ALL
SELECT CONCAT('team_matches: ', COUNT(*), ' records') FROM team_matches
UNION ALL
SELECT CONCAT('brackets: ', COUNT(*), ' records') FROM brackets
UNION ALL
SELECT CONCAT('bracket_entries: ', COUNT(*), ' records') FROM bracket_entries;

SELECT 
    '--- What will be KEPT ---' AS info
UNION ALL
SELECT CONCAT('archers: ', COUNT(*), ' records (MASTER LIST PRESERVED)') FROM archers;
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
if docker exec -i "$DB_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$SQL_FILE"; then
    echo ""
    echo -e "${GREEN}✅ Cleanup completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Step 3: Verifying results...${NC}"
    echo ""
    
    # Quick verification
    docker exec -i "$DB_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" << 'EOF'
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

