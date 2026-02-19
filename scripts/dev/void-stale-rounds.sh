#!/bin/bash

# Void stale rounds - removes them from archers' active window
# Bug fix: Old data had everyone assigned to old rounds (bale 1), showing on everyone's home
# Usage: ./scripts/dev/void-stale-rounds.sh [round_id]
#   Default round_id: df29ec34-b9ac-4667-be49-86a118e4e73e (from reported bug URL)
#
# Requires: Docker MySQL container (wdv-mysql) running

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
cd "$PROJECT_ROOT"

DB_CONTAINER="wdv-mysql"
DB_NAME="wdv"
DB_USER="root"
DB_PASS="secret"

# Default round ID from bug report URL
DEFAULT_ROUND_ID="df29ec34-b9ac-4667-be49-86a118e4e73e"
ROUND_ID="${1:-$DEFAULT_ROUND_ID}"
SQL_FILE="api/sql/void_stale_rounds.sql"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Void Stale Rounds (Dev)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    echo -e "${RED}❌ MySQL Docker container '${DB_CONTAINER}' is not running${NC}"
    echo "  ./scripts/dev/start.sh"
    exit 1
fi

if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}❌ SQL file not found: $SQL_FILE${NC}"
    exit 1
fi

echo -e "Round ID: ${BLUE}$ROUND_ID${NC}"
echo ""
echo -e "${YELLOW}This will void all scorecards in the round and set round status to Voided.${NC}"
echo -e "${YELLOW}Voided rounds will no longer appear on archers' active window.${NC}"
echo ""
read -p "Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}Cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Running migration...${NC}"
echo ""

# Substitute round ID into SQL and execute
sed "s|__ROUND_ID__|$ROUND_ID|g" "$SQL_FILE" | \
    docker exec -i "$DB_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME"

echo ""
echo -e "${GREEN}✅ Done. Voided round $ROUND_ID${NC}"
echo ""
echo -e "${BLUE}Verify:${NC} Refresh index.html as an archer - the round should no longer appear in assignments."
echo ""
