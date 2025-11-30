#!/bin/bash

# WDV Development Server Startup Script
# This script starts MySQL and the PHP development server for local development

set -e  # Exit on error

echo "🚀 Starting WDV Development Servers..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 1. Start MySQL
echo -e "${BLUE}📦 Starting MySQL...${NC}"
if brew services list | grep mysql | grep started > /dev/null; then
    echo -e "${GREEN}✅ MySQL is already running${NC}"
else
    brew services start mysql
    echo -e "${GREEN}✅ MySQL started${NC}"
fi
echo ""

# 2. Wait a moment for MySQL to be ready
sleep 1

# 3. Verify MySQL is responding
echo -e "${BLUE}🔍 Checking MySQL connection...${NC}"
if mysqladmin ping -h localhost > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MySQL is responding${NC}"
else
    echo -e "${YELLOW}⚠️  MySQL is not responding yet, waiting...${NC}"
    sleep 2
    if mysqladmin ping -h localhost > /dev/null 2>&1; then
        echo -e "${GREEN}✅ MySQL is now responding${NC}"
    else
        echo -e "${YELLOW}⚠️  Warning: MySQL may not be fully ready${NC}"
    fi
fi
echo ""

# 4. Start PHP development server
echo -e "${BLUE}🌐 Starting PHP development server on http://localhost:8001${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""
echo -e "${GREEN}📍 Access points:${NC}"
echo "   • Main app:        http://localhost:8001/index.html"
echo "   • Coach console:   http://localhost:8001/coach.html"
echo "   • Components:      http://localhost:8001/test-components.html"
echo "   • API test:        http://localhost:8001/api/test_harness.html"
echo ""

# Start the PHP server (this will run in foreground)
npm run serve
