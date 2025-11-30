#!/bin/bash
# Local Development Environment Setup Script
# This script helps set up the local development environment

set -e

echo "================================================================="
echo "WDV Local Development Environment Setup"
echo "================================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if MySQL is running
echo "Step 1: Checking MySQL..."
if command -v mysql &> /dev/null; then
    if mysqladmin ping -h localhost &> /dev/null; then
        echo -e "${GREEN}✅ MySQL is running${NC}"
    else
        echo -e "${YELLOW}⚠️  MySQL is not running${NC}"
        echo "Please start MySQL first:"
        echo "  macOS: brew services start mysql"
        echo "  Linux: sudo systemctl start mysql"
        exit 1
    fi
else
    echo -e "${RED}❌ MySQL not found. Please install MySQL first.${NC}"
    exit 1
fi

# Check if PHP is installed
echo ""
echo "Step 2: Checking PHP..."
if command -v php &> /dev/null; then
    PHP_VERSION=$(php -r 'echo PHP_VERSION;')
    echo -e "${GREEN}✅ PHP is installed (version $PHP_VERSION)${NC}"
    
    # Check for PDO MySQL extension
    if php -m | grep -q pdo_mysql; then
        echo -e "${GREEN}✅ PDO MySQL extension is available${NC}"
    else
        echo -e "${RED}❌ PDO MySQL extension not found${NC}"
        echo "Please install php-mysql or php-pdo-mysql"
        exit 1
    fi
else
    echo -e "${RED}❌ PHP not found. Please install PHP first.${NC}"
    exit 1
fi

# Check if database exists
echo ""
echo "Step 3: Checking database..."
read -p "MySQL root password (or press Enter if no password): " -s MYSQL_PASS
echo ""

if [ -z "$MYSQL_PASS" ]; then
    MYSQL_CMD="mysql -u root"
else
    MYSQL_CMD="mysql -u root -p$MYSQL_PASS"
fi

if $MYSQL_CMD -e "USE wdv" &> /dev/null; then
    echo -e "${GREEN}✅ Database 'wdv' exists${NC}"
else
    echo -e "${YELLOW}⚠️  Database 'wdv' does not exist${NC}"
    read -p "Create database 'wdv' now? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        $MYSQL_CMD -e "CREATE DATABASE wdv CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        echo -e "${GREEN}✅ Database 'wdv' created${NC}"
        
        # Import schema
        read -p "Import database schema now? (y/n): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if [ -f "api/sql/schema.mysql.sql" ]; then
                $MYSQL_CMD wdv < api/sql/schema.mysql.sql
                echo -e "${GREEN}✅ Schema imported${NC}"
            else
                echo -e "${RED}❌ Schema file not found: api/sql/schema.mysql.sql${NC}"
            fi
        fi
    else
        echo "Please create the database manually and run this script again."
        exit 1
    fi
fi

# Check config.local.php
echo ""
echo "Step 4: Checking configuration..."
if [ -f "api/config.local.php" ]; then
    echo -e "${GREEN}✅ config.local.php exists${NC}"
    
    # Check if it's configured for local
    if grep -q "localhost" api/config.local.php && grep -q "dbname=wdv" api/config.local.php; then
        echo -e "${GREEN}✅ config.local.php appears to be configured for local database${NC}"
    else
        echo -e "${YELLOW}⚠️  config.local.php may be configured for remote database${NC}"
        echo "Please review and update api/config.local.php for local development"
    fi
else
    echo -e "${YELLOW}⚠️  config.local.php does not exist${NC}"
    echo "Creating template config.local.php..."
    
    cat > api/config.local.php << 'EOF'
<?php
/**
 * Local configuration overrides
 * This file is in .gitignore - safe to add real credentials here
 * 
 * LOCAL DEVELOPMENT SETUP
 */

// ========================================================
// LOCAL DATABASE CONFIGURATION
// ========================================================
define('DB_DSN', 'mysql:host=localhost;dbname=wdv;charset=utf8mb4');
define('DB_USER', 'root');  // Change if using different user
define('DB_PASS', '');      // Your MySQL root password

// ========================================================
// API Security (for local development)
// ========================================================
define('API_KEY', 'qpeiti183djeiw930238sie75k3ha9laweithlwkeu');
define('PASSCODE', 'wdva26');

// ========================================================
// CORS (allow localhost for development)
// ========================================================
define('CORS_ORIGIN', '*');  // Or use 'http://localhost:8000'
EOF
    
    echo -e "${GREEN}✅ Template config.local.php created${NC}"
    echo "Please edit api/config.local.php and add your MySQL password"
fi

# Test database connection
echo ""
echo "Step 5: Testing database connection..."
if php api/test_db_connection.php 2>&1 | grep -q "Connection successful"; then
    echo -e "${GREEN}✅ Database connection test passed${NC}"
else
    echo -e "${RED}❌ Database connection test failed${NC}"
    echo "Please check your config.local.php settings"
    echo "Run manually: php api/test_db_connection.php"
fi

# Summary
echo ""
echo "================================================================="
echo "Setup Summary"
echo "================================================================="
echo ""
echo "Next steps:"
echo "1. Review and update api/config.local.php with your MySQL credentials"
echo "2. Start the PHP server: npm run serve"
echo "3. Open http://localhost:8000/index.html in your browser"
echo ""
echo "For detailed instructions, see: docs/LOCAL_DEVELOPMENT_SETUP.md"
echo ""
echo -e "${GREEN}Setup complete!${NC}"

