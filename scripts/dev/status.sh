#!/bin/bash

# WDV Development Server - Status Script
# Shows status of MySQL and PHP server

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Get project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

echo -e "${BLUE}📊 WDV Development Server Status${NC}"
echo ""

# Check MySQL
if docker ps --format '{{.Names}}' | grep -q "^wdv-mysql$"; then
    MYSQL_STATUS=$(docker ps --filter "name=wdv-mysql" --format "{{.Status}}")
    echo -e "${GREEN}✅ MySQL:${NC} Running ($MYSQL_STATUS)"
    
    # Test connection
    if docker exec wdv-mysql mysqladmin ping -h localhost -uroot -psecret > /dev/null 2>&1; then
        echo -e "   ${GREEN}✓ Connection: OK${NC}"
    else
        echo -e "   ${YELLOW}⚠ Connection: Not responding${NC}"
    fi
else
    echo -e "${RED}❌ MySQL:${NC} Not running"
fi

echo ""

# Check PHP server
PHP_PID=$(lsof -ti:8001 2>/dev/null || true)
if [ -n "$PHP_PID" ]; then
    echo -e "${GREEN}✅ PHP Server:${NC} Running (PID: $PHP_PID)"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/index.html 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "   ${GREEN}✓ HTTP: OK (200)${NC}"
        echo -e "   ${BLUE}📍 URL: http://localhost:8001/index.html${NC}"
    else
        echo -e "   ${YELLOW}⚠ HTTP: $HTTP_CODE${NC}"
    fi
else
    echo -e "${RED}❌ PHP Server:${NC} Not running"
fi

echo ""
