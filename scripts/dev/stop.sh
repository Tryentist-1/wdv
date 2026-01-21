#!/bin/bash

# WDV Development Server - Stop Script
# Stops PHP server and optionally MySQL

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
cd "$PROJECT_ROOT"

echo -e "${BLUE}🛑 Stopping WDV Development Servers...${NC}"
echo ""

# Stop PHP server
PHP_PID=$(lsof -ti:8001 2>/dev/null || true)
if [ -n "$PHP_PID" ]; then
    echo -e "${BLUE}🌐 Stopping PHP server (PID: $PHP_PID)...${NC}"
    kill $PHP_PID 2>/dev/null || true
    sleep 1
    if ! lsof -ti:8001 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PHP server stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  PHP server may still be running${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  PHP server is not running${NC}"
fi

# Check if user wants to stop MySQL too
if [ "$1" = "--all" ] || [ "$1" = "-a" ]; then
    echo ""
    echo -e "${BLUE}📦 Stopping MySQL...${NC}"
    if docker ps --format '{{.Names}}' | grep -q "^wdv-mysql$"; then
        docker-compose stop mysql > /dev/null 2>&1 || docker stop wdv-mysql > /dev/null 2>&1
        echo -e "${GREEN}✅ MySQL stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  MySQL is not running${NC}"
    fi
else
    echo ""
    echo -e "${BLUE}💡 MySQL is still running (data preserved)${NC}"
    echo -e "${BLUE}   To stop MySQL too: wdv-stop --all${NC}"
fi

echo ""
echo -e "${GREEN}✅ Done${NC}"
