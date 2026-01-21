#!/bin/bash

# WDV Docker Development Server Startup Script
# This script starts MySQL in Docker and the PHP development server

set -e  # Exit on error

echo "🚀 Starting WDV Development Servers (Docker)..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
cd "$PROJECT_ROOT"

# 1. Check if Docker is running
echo -e "${BLUE}🐳 Checking Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running${NC}"
    echo "Please start Docker Desktop and try again."
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# 2. Start MySQL container
echo -e "${BLUE}📦 Starting MySQL container...${NC}"
if docker ps --format '{{.Names}}' | grep -q "^wdv-mysql$"; then
    echo -e "${GREEN}✅ MySQL container is already running${NC}"
elif docker ps -a --format '{{.Names}}' | grep -q "^wdv-mysql$"; then
    echo -e "${YELLOW}⚠️  MySQL container exists but is stopped. Starting...${NC}"
    docker start wdv-mysql
    echo -e "${GREEN}✅ MySQL container started${NC}"
else
    echo -e "${YELLOW}⚠️  MySQL container doesn't exist. Creating...${NC}"
    docker-compose up -d mysql
    echo -e "${GREEN}✅ MySQL container created and started${NC}"
fi
echo ""

# 3. Wait for MySQL to be ready
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

# 4. Check if database schema is imported
echo -e "${BLUE}🔍 Checking database schema...${NC}"
TABLE_COUNT=$(docker exec wdv-mysql mysql -uroot -psecret wdv -e "SHOW TABLES;" 2>/dev/null | wc -l | tr -d ' ')
if [ "$TABLE_COUNT" -lt 2 ]; then
    echo -e "${YELLOW}⚠️  Database schema not found. Importing...${NC}"
    if [ -f "$PROJECT_ROOT/api/sql/schema.mysql.sql" ]; then
        docker exec -i wdv-mysql mysql -uroot -psecret wdv < "$PROJECT_ROOT/api/sql/schema.mysql.sql"
        echo -e "${GREEN}✅ Schema imported${NC}"
    else
        echo -e "${RED}❌ Schema file not found at api/sql/schema.mysql.sql${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Database schema exists${NC}"
fi
echo ""

# 5. Start PHP development server
echo -e "${BLUE}🌐 Starting PHP development server on http://localhost:8001${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""
echo -e "${GREEN}📍 Access points:${NC}"
echo "   • Main app:        http://localhost:8001/index.html"
echo "   • Coach console:   http://localhost:8001/coach.html"
echo "   • Style guide:     http://localhost:8001/tests/components/style-guide.html"
echo "   • API test:        http://localhost:8001/tests/api/harness/test_harness.html"
echo ""
echo -e "${BLUE}💡 To stop MySQL: docker-compose stop mysql${NC}"
echo -e "${BLUE}💡 To remove MySQL: docker-compose down${NC}"
echo ""

# Start the PHP server (this will run in foreground)
npm run serve
