# 🚨 URGENT: Fix Production Config

## The Problem

Your production server has **LOCAL DEVELOPMENT** config active. That's why you're getting "Access denied" errors.

**Current (WRONG) on prod:**
- Trying to connect to `127.0.0.1:3306` (localhost Docker)
- Using `wdv_user` / `wdv_dev_password` (Docker credentials)
- These don't exist on your production server!

**Should be (CORRECT) on prod:**
- Connect to `localhost` (production MySQL)
- Use your production DB credentials from your hosting panel

---

## Quick Fix (2 minutes)

### Step 1: Log into Production File Manager

1. Go to your hosting control panel
2. Open "File Manager"
3. Navigate to: `public_html/wdv/api/`

### Step 2: Edit config.local.php

1. Right-click `config.local.php` → **Edit**
2. **DELETE everything** in the file
3. **PASTE this exact code:**

```php
<?php
/**
 * Production configuration overrides
 * This file is in .gitignore - safe to add real credentials here
 * 
 * PRODUCTION SERVER CONFIGURATION
 */

// ========================================================
// PRODUCTION DATABASE (tryentist.com) - ACTIVE
// ========================================================
define('DB_DSN', 'mysql:host=localhost;dbname=YOUR_DB_NAME;charset=utf8mb4');
define('DB_USER', 'YOUR_DB_USER');
define('DB_PASS', 'YOUR_DB_PASSWORD');

// ========================================================
// API Security (production)
// ========================================================
define('API_KEY', 'qpeiti183djeiw930238sie75k3ha9laweithlwkeu');
define('PASSCODE', 'wdva26');

// ========================================================
// CORS (production domain)
// ========================================================
define('CORS_ORIGIN', 'https://archery.tryentist.com');
```

4. **Save**

### Step 3: Test

```bash
curl https://archery.tryentist.com/api/v1/health
```

Should return: `{"ok":true}`

---

## What Changed

**Before (WRONG):**
- Option 1 (production) was **commented out** `//`
- Option 2 (local Docker) was **active** `define(...)`

**After (CORRECT):**
- Production config is **active** (no `//`)
- Local Docker config is **commented out** `//`

---

## Why This Happened

The `config.local.php` file got deployed from your local machine where you're developing with Docker. The deploy script now excludes `api/config.local.php` so this won't happen again.

---

## Still Not Working?

1. **Double-check:** Make sure there are NO `//` in front of the production `define()` lines
2. **Check credentials:** Verify database name, username, and password in your hosting panel

If credentials are wrong, update them in the file and save.
