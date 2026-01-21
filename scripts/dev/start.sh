#!/bin/bash

# WDV Development Server - Start Script
# Starts MySQL (Docker) and PHP development server

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Get project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
cd "$PROJECT_ROOT"

echo -e "${BLUE}🚀 Starting WDV Development Servers...${NC}"
echo ""

# 1. Check Docker
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running${NC}"
    echo "Please start Docker Desktop/OrbStack and try again."
    exit 1
fi

# 2. Build CSS if needed
if [ ! -f "$PROJECT_ROOT/css/tailwind-compiled.css" ] || [ "$PROJECT_ROOT/css/tailwind.css" -nt "$PROJECT_ROOT/css/tailwind-compiled.css" ]; then
    echo -e "${BLUE}🎨 Building Tailwind CSS...${NC}"
    npm run build:css
    echo ""
fi

# 3. Start MySQL
echo -e "${BLUE}📦 Starting MySQL...${NC}"
if docker ps --format '{{.Names}}' | grep -q "^wdv-mysql$"; then
    echo -e "${GREEN}✅ MySQL is already running${NC}"
elif docker ps -a --format '{{.Names}}' | grep -q "^wdv-mysql$"; then
    docker start wdv-mysql > /dev/null
    echo -e "${GREEN}✅ MySQL container started${NC}"
else
    docker-compose up -d mysql > /dev/null
    echo -e "${GREEN}✅ MySQL container created and started${NC}"
fi

# 4. Wait for MySQL
echo -e "${BLUE}🔍 Waiting for MySQL to be ready...${NC}"
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if docker exec wdv-mysql mysqladmin ping -h localhost -uroot -psecret > /dev/null 2>&1; then
        echo -e "${GREEN}✅ MySQL is ready${NC}"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    echo -n "."
    sleep 1
done
echo ""

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "${RED}❌ MySQL did not become ready in time${NC}"
    exit 1
fi

# 5. Check/import schema
TABLE_COUNT=$(docker exec wdv-mysql mysql -uroot -psecret wdv -e "SHOW TABLES;" 2>/dev/null | wc -l | tr -d ' ')
if [ "$TABLE_COUNT" -lt 2 ]; then
    echo -e "${YELLOW}⚠️  Importing database schema...${NC}"
    if [ -f "$PROJECT_ROOT/api/sql/schema.mysql.sql" ]; then
        docker exec -i wdv-mysql mysql -uroot -psecret wdv < "$PROJECT_ROOT/api/sql/schema.mysql.sql" > /dev/null 2>&1
        echo -e "${GREEN}✅ Schema imported${NC}"
    fi
fi

# 6. Check if PHP server is already running
if lsof -ti:8001 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  PHP server is already running on port 8001${NC}"
    echo -e "${BLUE}📍 Access: http://localhost:8001/index.html${NC}"
    exit 0
fi

# 7. Start PHP server
echo -e "${BLUE}🌐 Starting PHP development server...${NC}"
echo ""
echo -e "${GREEN}📍 Access points:${NC}"
echo "   • Main app:        http://localhost:8001/index.html"
echo "   • Coach console:   http://localhost:8001/coach.html"
echo "   • Style guide:     http://localhost:8001/tests/components/style-guide.html"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

# Start PHP server in foreground
npm run serve
