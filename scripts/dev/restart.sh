#!/bin/bash

# WDV Development Server - Restart Script
# Restarts PHP server and optionally MySQL

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

echo -e "${BLUE}🔄 Restarting WDV Development Servers...${NC}"
echo ""

# Stop first
"$SCRIPT_DIR/stop.sh" "$@"

# Wait a moment
sleep 2

# Start again
echo ""
"$SCRIPT_DIR/start.sh"
