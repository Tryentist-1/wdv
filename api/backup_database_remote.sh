#!/bin/bash
# Remote Database Backup Script
# 
# This script should be run on the production server to backup the database
# 
# Usage on server:
#   ssh user@server
#   cd /path/to/wdv/api
#   php backup_database.php
#
# Or via web request (if you set up a protected endpoint):
#   curl https://archery.tryentist.com/api/backup_database.php?token=SECRET_TOKEN
#
# For direct MySQL dump (if you have SSH access):
#   mysqldump -u wdv_user -p wdv events rounds round_archers end_events archers > backup_$(date +%Y%m%d_%H%M%S).sql

echo "📦 Production Database Backup"
echo "============================="
echo ""
echo "Option 1: Run backup script on server via SSH"
echo "---------------------------------------------"
echo "ssh user@da100.is.cc"
echo "cd public_html/api"
echo "php backup_database.php"
echo ""
echo "Option 2: Use mysqldump directly (if you have SSH access)"
echo "---------------------------------------------------------"
echo "mysqldump -u [db_user] -p wdv events rounds round_archers end_events archers > backup_\$(date +%Y%m%d_%H%M%S).sql"
echo ""
echo "Option 3: Create a protected web endpoint (recommended for regular backups)"
echo "---------------------------------------------------------------------------"
echo "See: api/backup_database_web.php (to be created)"
echo ""

