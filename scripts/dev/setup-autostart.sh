#!/bin/bash

# WDV Auto-Start Setup Script
# This script helps you configure the dev servers to start automatically on login/reboot

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PLIST_NAME="com.wdv.devserver"
PLIST_FILE="$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"

show_usage() {
    echo "Usage: $0 [install|uninstall|status]"
    echo ""
    echo "Commands:"
    echo "  install    - Set up auto-start on login"
    echo "  uninstall  - Remove auto-start"
    echo "  status     - Check if auto-start is enabled"
    echo ""
}

install_autostart() {
    echo -e "${BLUE}📦 Installing auto-start for WDV dev servers...${NC}"
    echo ""
    
    # Create LaunchAgents directory if it doesn't exist
    mkdir -p "$HOME/Library/LaunchAgents"
    
    # Create the plist file
    cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_NAME}</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>${SCRIPT_DIR}/scripts/dev/start-dev.sh</string>
    </array>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <false/>
    
    <key>WorkingDirectory</key>
    <string>${SCRIPT_DIR}</string>
    
    <key>StandardOutPath</key>
    <string>${SCRIPT_DIR}/dev-server.log</string>
    
    <key>StandardErrorPath</key>
    <string>${SCRIPT_DIR}/dev-server-error.log</string>
</dict>
</plist>
EOF
    
    echo -e "${GREEN}✅ Created LaunchAgent plist at:${NC}"
    echo "   $PLIST_FILE"
    echo ""
    
    # Load the agent
    launchctl load "$PLIST_FILE" 2>/dev/null || true
    
    echo -e "${GREEN}✅ Auto-start installed!${NC}"
    echo ""
    echo -e "${YELLOW}Note:${NC} The dev server will now start automatically when you log in."
    echo "      MySQL will be started by Homebrew services (already configured)."
    echo ""
    echo "Logs will be written to:"
    echo "  • ${SCRIPT_DIR}/dev-server.log"
    echo "  • ${SCRIPT_DIR}/dev-server-error.log"
    echo ""
}

uninstall_autostart() {
    echo -e "${BLUE}🗑️  Removing auto-start for WDV dev servers...${NC}"
    echo ""
    
    if [ -f "$PLIST_FILE" ]; then
        # Unload the agent
        launchctl unload "$PLIST_FILE" 2>/dev/null || true
        
        # Remove the plist file
        rm "$PLIST_FILE"
        
        echo -e "${GREEN}✅ Auto-start removed!${NC}"
        echo ""
        echo -e "${YELLOW}Note:${NC} MySQL will continue to run (managed by Homebrew)."
        echo "      To stop MySQL: brew services stop mysql"
    else
        echo -e "${YELLOW}⚠️  Auto-start is not installed${NC}"
    fi
    echo ""
}

check_status() {
    echo -e "${BLUE}📊 Checking auto-start status...${NC}"
    echo ""
    
    # Check MySQL
    if brew services list | grep mysql | grep started > /dev/null; then
        echo -e "${GREEN}✅ MySQL: Running (Homebrew service)${NC}"
    else
        echo -e "${RED}❌ MySQL: Not running${NC}"
    fi
    
    # Check LaunchAgent
    if [ -f "$PLIST_FILE" ]; then
        echo -e "${GREEN}✅ PHP Dev Server: Auto-start enabled${NC}"
        echo "   Plist: $PLIST_FILE"
        
        # Check if it's loaded
        if launchctl list | grep "$PLIST_NAME" > /dev/null; then
            echo -e "${GREEN}✅ LaunchAgent: Loaded${NC}"
        else
            echo -e "${YELLOW}⚠️  LaunchAgent: Not loaded (will load on next login)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  PHP Dev Server: Auto-start not configured${NC}"
        echo "   Run: ./setup-autostart.sh install"
    fi
    
    echo ""
}

# Main script
case "${1:-}" in
    install)
        install_autostart
        ;;
    uninstall)
        uninstall_autostart
        ;;
    status)
        check_status
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
