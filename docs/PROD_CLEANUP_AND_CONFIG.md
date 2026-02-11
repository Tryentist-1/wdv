# Production Server Cleanup and Config Guide

## Problem: Dev Files on Production

You're seeing `.cursor`, `.agent`, and other dev folders on your production server. These shouldn't be there.

## Quick Fix: Clean Up Production

### Step 1: Check What's There

Run this from your repo:
```bash
cd /Users/terry/makeitso/wdv
./scripts/deploy/check_prod_files.sh
```

This shows what dev folders exist on production.

### Step 2: Remove Dev Folders from Production

**Option A: Use FTP client (easiest)**
1. Open your FTP client (FileZilla, Cyberduck, etc.)
2. Connect to `da100.is.cc` with your FTP credentials
3. Navigate to `public_html/wdv/`
4. Delete these folders if they exist:
   - `.cursor`
   - `.agent`
   - `.git`
   - `node_modules`
   - `docs`
   - `tests`
   - `.vscode`
   - `.github`
   - `deploy_backups`
   - `backups`
   - `playwright-report`
   - `test-results`

**Option B: Use hosting File Manager**
1. Log into your hosting control panel
2. Open "File Manager"
3. Navigate to `public_html/wdv/`
4. Delete the folders listed above

### Step 3: Fix Deploy Script (Already Done ✓)

The deploy script now excludes `.cursor` and `.agent`. Future deploys won't upload them.

---

## Fix MySQL Config on Production

### Step 1: Check Current Config

```bash
cd /Users/terry/makeitso/wdv
./scripts/deploy/check_prod_config.sh
```

This shows if `api/config.local.php` exists and tests the API.

### Step 2: Find Your MySQL Credentials

1. Log into your hosting control panel (cPanel, Plesk, etc.)
2. Look for **"Databases"** or **"MySQL Databases"**
3. You should see:
   - Database name (e.g., `terry_wdv` or `aelectri_wdv`)
   - Database username (e.g., `terry_wdvuser` or `aelectri_wdvuser`)
   - Database password (click "Show" or "Reveal" to see it)

**Write these down:**
- Database name: `_________________`
- Database username: `_________________`
- Database password: `_________________`

### Step 3: Create/Edit config.local.php on Production

**Option A: Using File Manager (easiest)**
1. In hosting File Manager, go to `public_html/wdv/api/`
2. If `config.local.php` exists, right-click → Edit
3. If it doesn't exist, click "New File" → name it `config.local.php`
4. Paste this (replace with YOUR values):

```php
<?php
define('DB_DSN', 'mysql:host=localhost;dbname=YOUR_DB_NAME_HERE;charset=utf8mb4');
define('DB_USER', 'YOUR_DB_USER_HERE');
define('DB_PASS', 'YOUR_DB_PASSWORD_HERE');
?>
```

5. Save

**Option B: Using FTP**
1. Create file locally: `api/config.local.php` (temporary, just for upload)
2. Add the PHP code above with your credentials
3. Upload via FTP to `public_html/wdv/api/config.local.php`
4. Delete the local file after upload

### Step 4: Test

```bash
curl https://archery.tryentist.com/api/v1/health
```

Should return: `{"ok":true}`

If you get "Access denied" or 500 error, the credentials are wrong. Double-check them in your hosting panel.

---

## What Should Be on Production

**Folders that SHOULD be there:**
- `api/` - PHP backend
- `js/` - JavaScript files
- `css/` - Stylesheets
- `*.html` - HTML pages
- `avatars/` - User avatars (if exists)
- `icons/` - Icons (if exists)

**Folders that should NOT be there:**
- `.cursor` - Dev tool
- `.agent` - Dev tool
- `.git` - Git repo
- `node_modules` - Dependencies
- `docs/` - Documentation
- `tests/` - Test files
- `.vscode` - Editor config
- `.github` - GitHub config
- `deploy_backups` - Backup folder
- `backups` - Backup folder
- `playwright-report` - Test reports
- `test-results` - Test results
- `app-imports` - Local CSV uploads

---

## Future Deploys

The deploy script now excludes all dev folders. When you deploy, run:

```bash
cd /Users/terry/makeitso/wdv
WDV_DEPLOY_SOURCE=/Users/terry/makeitso/wdv npm run deploy:fast
```

This ensures only production files are uploaded.

---

## Still Having Issues?

1. **500 error on API:** Check `api/config.local.php` exists and has correct MySQL credentials
2. **Files still uploading:** Make sure you're using the updated deploy script
3. **Can't find MySQL credentials:** Contact your hosting support - they can tell you where to find them
