#!/bin/bash

# WDV Development Server - Setup Terminal Aliases
# Adds convenient shortcuts to your shell

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

# Detect shell
SHELL_NAME=$(basename "$SHELL")
SHELL_RC=""

if [ "$SHELL_NAME" = "zsh" ]; then
    SHELL_RC="$HOME/.zshrc"
elif [ "$SHELL_NAME" = "bash" ]; then
    SHELL_RC="$HOME/.bashrc"
    # macOS bash might use .bash_profile
    if [ -f "$HOME/.bash_profile" ] && [ ! -f "$HOME/.bashrc" ]; then
        SHELL_RC="$HOME/.bash_profile"
    fi
else
    echo -e "${YELLOW}⚠️  Unsupported shell: $SHELL_NAME${NC}"
    echo "Please manually add aliases to your shell config file."
    exit 1
fi

echo -e "${BLUE}🔧 Setting up WDV terminal aliases...${NC}"
echo ""

# Aliases to add
ALIASES="
# WDV Development Server Aliases
alias wdv-start='$PROJECT_ROOT/scripts/dev/start.sh'
alias wdv-stop='$PROJECT_ROOT/scripts/dev/stop.sh'
alias wdv-restart='$PROJECT_ROOT/scripts/dev/restart.sh'
alias wdv-status='$PROJECT_ROOT/scripts/dev/status.sh'
alias wdv-restore-prod='$PROJECT_ROOT/scripts/dev/restore-prod.sh'
"

# Check if aliases already exist
if grep -q "# WDV Development Server Aliases" "$SHELL_RC" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Aliases already exist in $SHELL_RC${NC}"
    echo ""
    read -p "Do you want to update them? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Cancelled${NC}"
        exit 0
    fi
    # Remove old aliases
    sed -i.bak '/# WDV Development Server Aliases/,/^alias wdv-restore-prod=/d' "$SHELL_RC" 2>/dev/null || \
    sed -i '' '/# WDV Development Server Aliases/,/^alias wdv-restore-prod=/d' "$SHELL_RC" 2>/dev/null
fi

# Add aliases
echo "$ALIASES" >> "$SHELL_RC"

echo -e "${GREEN}✅ Aliases added to $SHELL_RC${NC}"
echo ""
echo -e "${BLUE}📋 Available commands:${NC}"
echo "   ${GREEN}wdv-start${NC}        - Start MySQL and PHP server"
echo "   ${GREEN}wdv-stop${NC}         - Stop PHP server (MySQL keeps running)"
echo "   ${GREEN}wdv-stop --all${NC}   - Stop both PHP server and MySQL"
echo "   ${GREEN}wdv-restart${NC}      - Restart PHP server"
echo "   ${GREEN}wdv-status${NC}       - Check server status"
echo "   ${GREEN}wdv-restore-prod${NC} - Restore production database backup"
echo ""
echo -e "${YELLOW}⚠️  To use the aliases now, run:${NC}"
echo "   source $SHELL_RC"
echo ""
echo -e "${BLUE}Or open a new terminal window.${NC}"
