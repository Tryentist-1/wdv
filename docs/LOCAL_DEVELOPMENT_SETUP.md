# Local Development Environment Setup Guide

This guide will help you set up a complete local development environment for the WDV (West Des Moines) archery scoring application. You'll be able to develop and test changes locally before deploying to production.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed:

- ✅ **MySQL** (8.0 or later recommended)
- ✅ **PHP** (7.4 or later, with MySQL PDO extension)
- ✅ **Node.js** (for running tests and npm scripts)
- ✅ **Git** (for version control)

### Verify Your Installations

```bash
# Check MySQL
mysql --version
# Should show: mysql Ver 8.0.x or similar

# Check PHP
php --version
# Should show: PHP 7.4.x or later

# Check PHP MySQL extension
php -m | grep pdo_mysql
# Should show: pdo_mysql

# Check Node.js
node --version
# Should show: v14.x or later

# Check npm
npm --version
```

---

## 🗄️ Step 1: Set Up Local MySQL Database

### 1.1 Start MySQL Service

**macOS (using Homebrew):**
```bash
# Start MySQL service
brew services start mysql

# Or if installed via MySQL installer:
sudo /usr/local/mysql/support-files/mysql.server start
```

**Linux:**
```bash
sudo systemctl start mysql
# or
sudo service mysql start
```

**Windows:**
```bash
# Start MySQL service from Services panel
# Or use MySQL Workbench to start service
```

### 1.2 Create Database and User

Open MySQL command line:

```bash
mysql -u root -p
```

Then run these commands:

```sql
-- Create the database
CREATE DATABASE wdv CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create a local development user (optional, but recommended)
CREATE USER 'wdv_dev'@'localhost' IDENTIFIED BY 'wdv_dev_password';
GRANT ALL PRIVILEGES ON wdv.* TO 'wdv_dev'@'localhost';
FLUSH PRIVILEGES;

-- Verify the database was created
SHOW DATABASES;
-- Should see 'wdv' in the list

-- Exit MySQL
EXIT;
```

**Note:** If you prefer to use the `root` user for local development, you can skip creating the new user. Just use `root` and your root password in the config file.

---

## 📦 Step 2: Import Database Schema

### 2.1 Import the Schema

From the project root directory:

```bash
cd /Users/terry/web-mirrors/tryentist/wdv

# Import the schema
mysql -u root -p wdv < api/sql/schema.mysql.sql

# Or if using the dev user:
mysql -u wdv_dev -p wdv < api/sql/schema.mysql.sql
```

### 2.2 Verify Tables Were Created

```bash
mysql -u root -p wdv

# In MySQL:
SHOW TABLES;

# Should show:
# - archers
# - events
# - rounds
# - round_archers
# - end_events

# Check table structure
DESCRIBE archers;
DESCRIBE events;
DESCRIBE rounds;
DESCRIBE round_archers;
DESCRIBE end_events;

EXIT;
```

---

## ⚙️ Step 3: Configure Local Development Settings

### 3.1 Update `api/config.local.php`

The `config.local.php` file is already in `.gitignore`, so your local credentials won't be committed.

Edit `/Users/terry/web-mirrors/tryentist/wdv/api/config.local.php`:

```php
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
define('DB_USER', 'root');  // Or 'wdv_dev' if you created that user
define('DB_PASS', '');      // Your MySQL root password (or wdv_dev_password)

// ========================================================
// API Security (for local development)
// ========================================================
// Use the same keys as production for testing, or generate new ones
define('API_KEY', 'qpeiti183djeiw930238sie75k3ha9laweithlwkeu');
define('PASSCODE', 'wdva26');

// ========================================================
// CORS (allow localhost for development)
// ========================================================
define('CORS_ORIGIN', '*');  // Allow all origins in local dev, or use 'http://localhost:8001'
```

**Important Notes:**
- Replace `DB_USER` and `DB_PASS` with your actual MySQL credentials
- If you created the `wdv_dev` user, use those credentials instead
- The `CORS_ORIGIN` set to `*` allows all origins for local development (you can restrict to `http://localhost:8001` if preferred)

---

## ✅ Step 4: Test Database Connection

### 4.1 Run the Connection Test

```bash
cd /Users/terry/web-mirrors/tryentist/wdv
php api/test_db_connection.php
```

### Expected Output (Success):

```
=================================================================
DATABASE CONNECTION TEST
=================================================================

Testing database connection...
-----------------------------------------------------------
✅ Connection successful!

Connected to:
  Database: wdv
  User: root@localhost
  Host: localhost

Checking tables...
-----------------------------------------------------------
  ✅ events (0 records)
  ✅ rounds (0 records)
  ✅ round_archers (0 records)
  ✅ end_events (0 records)
  ✅ archers (0 records)

MySQL Version: 8.0.35

=================================================================
✅ ALL TESTS PASSED - Database connection is working!
=================================================================
```

**Note:** It's normal to have 0 records initially - you'll add test data later.

### 4.2 Troubleshooting Connection Issues

**Error: "Access denied for user"**
- Check your MySQL username and password in `config.local.php`
- Verify the user exists: `SELECT User, Host FROM mysql.user;`

**Error: "Unknown database 'wdv'"**
- Make sure you created the database: `CREATE DATABASE wdv;`
- Verify: `SHOW DATABASES;`

**Error: "Can't connect to MySQL server"**
- Make sure MySQL service is running
- Check if MySQL is listening: `sudo lsof -i :3306` (macOS/Linux)

---

## 🚀 Step 5: Start Local Development Server

### 5.1 Start PHP Built-in Server

From the project root:

```bash
cd /Users/terry/web-mirrors/tryentist/wdv

# Option 1: Use npm script (recommended)
npm run serve

# Option 2: Run PHP directly
php -S localhost:8001
```

The server will start on `http://localhost:8001`

### 5.2 Test the Application

1. **Open your browser** and navigate to:
   - Main app: `http://localhost:8001/index.html`
   - Coach console: `http://localhost:8001/coach.html`
   - Ranking round: `http://localhost:8001/ranking_round.html`

2. **Test API endpoints:**
   - Health check: `http://localhost:8001/api/index.php`
   - API test harness: `http://localhost:8001/api/test_harness.html`

3. **Check browser console** for any JavaScript errors

---

## 🧪 Step 6: Add Test Data (Optional)

### 6.1 Import Test Data

If you want sample data to work with:

```bash
# Import simple test data
mysql -u root -p wdv < api/sql/test_data_simple.sql

# Or import more comprehensive test data
mysql -u root -p wdv < api/sql/test_data.sql
```

### 6.2 Verify Test Data

```bash
mysql -u root -p wdv

# Check records
SELECT COUNT(*) FROM archers;
SELECT COUNT(*) FROM events;
SELECT COUNT(*) FROM rounds;

EXIT;
```

---

## 🔧 Step 7: Development Workflow

### 7.1 Typical Development Session

```bash
# 1. Start MySQL (if not running)
brew services start mysql  # macOS
# or
sudo systemctl start mysql  # Linux

# 2. Start PHP server
npm run serve

# 3. In another terminal, make your code changes
# Edit files in your IDE

# 4. Refresh browser to see changes
# (No need to restart PHP server for most changes)

# 5. Test API changes
php api/test_db_connection.php
```

### 7.2 Running Tests

```bash
# Run all tests (requires server running)
npm test

# Run local tests only
npm run test:local

# Run tests with UI
npm run test:local:ui
```

### 7.3 Stopping the Server

Press `Ctrl+C` in the terminal where the PHP server is running.

---

## 📝 Step 8: Switching Between Local and Production

### Using Local Database (Current Setup)

Your `config.local.php` is already configured for local development. Just make sure:
- MySQL is running locally
- Database `wdv` exists
- Credentials in `config.local.php` match your local MySQL

### Switching to Production Database (for testing)

If you need to test against production data temporarily:

1. Edit `api/config.local.php`
2. Comment out local database config
3. Uncomment production database config (from `SETUP_REMOTE_DATABASE.md`)
4. Make sure remote MySQL access is enabled on your hosting provider

**Important:** Always switch back to local database for development to avoid accidentally modifying production data!

---

## 🐛 Common Issues and Solutions

### Issue: "PDO Exception: could not find driver"

**Solution:**
```bash
# macOS
brew install php@7.4
# or reinstall PHP with MySQL support

# Linux
sudo apt-get install php-mysql  # Ubuntu/Debian
sudo yum install php-mysql      # CentOS/RHEL
```

### Issue: "Port 8001 already in use"

**Solution:**
```bash
# Find what's using the port
lsof -i :8001

# Kill the process or use a different port
php -S localhost:8002
# (Then update package.json and docs to match)
```

### Issue: "CORS errors when accessing API"

**Solution:**
- Make sure `CORS_ORIGIN` in `config.local.php` includes your localhost URL
- Or set it to `*` for local development (not recommended for production)

### Issue: "Database connection works but tables are empty"

**Solution:**
- This is normal for a fresh install
- Import test data: `mysql -u root -p wdv < api/sql/test_data_simple.sql`

---

## 📚 Next Steps

Once your local environment is set up:

1. **Read the documentation:**
   - `docs/OAS_RANKING_ONLINE_3.0_REQUIREMENTS.md` - Full project requirements
   - `docs/DEVELOPMENT_WORKFLOW.md` - Git workflow and best practices
   - `docs/scripts/README.md` - Available scripts and utilities

2. **Familiarize yourself with the codebase:**
   - Frontend: `js/` directory (JavaScript files)
   - Backend: `api/` directory (PHP API endpoints)
   - Database: `api/sql/` directory (schema and migrations)

3. **Start developing:**
   - Create a feature branch
   - Make your changes
   - Test locally
   - Commit and push

4. **Test before deploying:**
   - Run `npm test` to ensure tests pass
   - Manually test the feature in your browser
   - Check for console errors

---

## 🔒 Security Reminders

1. **Never commit `config.local.php`** - It's in `.gitignore` for a reason
2. **Use different credentials** for local vs production
3. **Don't share your local config** with others
4. **Use strong passwords** even for local development

---

## 📞 Need Help?

If you encounter issues:

1. Check the error message carefully
2. Review the troubleshooting section above
3. Check MySQL logs: `tail -f /usr/local/var/mysql/*.err` (macOS)
4. Verify PHP error logs: `php -i | grep error_log`

---

## ✅ Setup Checklist

- [ ] MySQL installed and running
- [ ] PHP installed with MySQL PDO extension
- [ ] Database `wdv` created
- [ ] Schema imported (`api/sql/schema.mysql.sql`)
- [ ] `config.local.php` configured with local database credentials
- [ ] Database connection test passes (`php api/test_db_connection.php`)
- [ ] PHP server starts successfully (`npm run serve`)
- [ ] Application loads in browser (`http://localhost:8001/index.html`)
- [ ] API endpoints respond (`http://localhost:8001/api/index.php`)
- [ ] Test data imported (optional)

**Once all items are checked, you're ready to develop locally! 🎉**

