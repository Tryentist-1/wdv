# Remote Database Access Setup Guide

This guide will help you connect to your production database at tryentist.com from your local machine.

---

## 📋 Step 1: Find Your Database Credentials

### Where to Look:

**Option A: Check your hosting control panel**
1. Log into your web hosting account (where tryentist.com is hosted)
2. Find the MySQL or Database section
3. Look for database credentials

**Option B: Check existing config files on the server**
1. Log into your server via FTP/SFTP or hosting file manager
2. Look for existing config files in your API directory
3. The production site must already have these credentials somewhere

**Option C: Check phpMyAdmin login**
1. Open phpMyAdmin from your hosting control panel
2. The credentials you use to log in there are your database credentials

### Credentials You Need:

```
Host: _____________________ (e.g., localhost, mysql.tryentist.com, or IP address)
Port: 3306_________________ (usually 3306, default MySQL port)
Database: _________________ (probably 'wdv' or similar)
Username: _________________ (from hosting control panel)
Password: _________________ (from hosting control panel)
```

---

## 🔓 Step 2: Enable Remote MySQL Access

### Most hosting providers (cPanel, Plesk, etc.):

1. **Log into your hosting control panel**

2. **Find "Remote MySQL" or "Remote Database Access"**
   - In cPanel: Look for "Remote MySQL®" icon
   - In Plesk: Databases → Your Database → Remote Access
   - In other panels: Search for "remote" or "MySQL access"

3. **Add your IP address to the whitelist**
   - First, find your current IP address: https://whatismyipaddress.com/
   - Add it to the "Access Hosts" list
   - Some hosts allow `%` (any IP) but this is less secure

4. **Save changes**

### Common Hosting Providers:

**cPanel:**
```
Home → Databases → Remote MySQL®
→ Add Access Host → Enter your IP → Add Host
```

**Plesk:**
```
Databases → [Your Database] → Remote Access
→ Allow connections from: [Your IP] → OK
```

**HostGator/Bluehost/Similar:**
```
Usually in cPanel under "Remote MySQL"
```

**VPS/Dedicated Server:**
```
You may need to modify MySQL config:
- Edit /etc/mysql/mysql.conf.d/mysqld.cnf
- Change bind-address from 127.0.0.1 to 0.0.0.0
- Restart MySQL: sudo systemctl restart mysql
- Open firewall port 3306
```

---

## ⚙️ Step 3: Configure config.local.php

1. **Open** `/Users/terry/web-mirrors/tryentist/wdv/api/config.local.php`

2. **Replace placeholders** with your actual credentials:

```php
// OPTION 1: PRODUCTION DATABASE (tryentist.com)
define('DB_DSN', 'mysql:host=YOUR_HOST_HERE;dbname=wdv;charset=utf8mb4');
define('DB_USER', 'YOUR_USERNAME_HERE');
define('DB_PASS', 'YOUR_PASSWORD_HERE');
```

**Example configurations:**

If database is on **same server as website**:
```php
define('DB_DSN', 'mysql:host=localhost;dbname=wdv;charset=utf8mb4');
```

If database is on **separate MySQL server**:
```php
define('DB_DSN', 'mysql:host=mysql.tryentist.com;dbname=wdv;charset=utf8mb4');
```

If using **IP address**:
```php
define('DB_DSN', 'mysql:host=123.45.67.89;dbname=wdv;charset=utf8mb4');
```

If using **non-standard port** (not 3306):
```php
define('DB_DSN', 'mysql:host=tryentist.com;port=3307;dbname=wdv;charset=utf8mb4');
```

3. **Save the file**

---

## ✅ Step 4: Test the Connection

Run the test script I created:

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
  User: your_username@your_ip
  Host: tryentist.com

Checking tables...
-----------------------------------------------------------
  ✅ events (12 records)
  ✅ rounds (48 records)
  ✅ round_archers (156 records)
  ✅ end_events (1240 records)
  ✅ archers (45 records)

MySQL Version: 8.0.35

=================================================================
✅ ALL TESTS PASSED - Database connection is working!
=================================================================
```

### Common Errors and Solutions:

**Error: "Access denied for user"**
- ❌ Wrong username or password
- ✅ Double-check credentials in config.local.php

**Error: "Can't connect to MySQL server"**
- ❌ Remote access not enabled or wrong host
- ✅ Check hosting control panel "Remote MySQL" settings
- ✅ Verify host is correct (might be 'localhost' if on same server)

**Error: "Host '123.45.67.89' is not allowed to connect"**
- ❌ Your IP not whitelisted
- ✅ Add your IP to "Access Hosts" in hosting control panel

**Error: "Connection refused"**
- ❌ Firewall blocking port 3306
- ✅ Check with hosting provider about firewall rules

**Error: "Unknown database 'wdv'"**
- ❌ Wrong database name
- ✅ Check actual database name in hosting control panel

---

## 🚀 Step 5: Run Database Diagnostics

Once connection is working, I can run diagnostics:

```bash
cd /Users/terry/web-mirrors/tryentist/wdv
php api/check_orphans.php  # I'll create this once connection works
```

Or I can run queries directly via terminal commands.

---

## 🔒 Security Notes

1. **config.local.php is in .gitignore** - Your credentials won't be committed to git ✅

2. **Use strong passwords** - Make sure database password is strong

3. **Whitelist only your IP** - Don't use `%` (any IP) unless necessary

4. **Consider SSH tunnel** - For extra security, you could use SSH tunnel instead:
   ```bash
   ssh -L 3307:localhost:3306 user@tryentist.com
   # Then connect to localhost:3307 locally
   ```

5. **Revoke access when done** - If you don't need remote access later, remove your IP from whitelist

---

## 📞 Need Help?

If you get stuck, share:
1. What hosting provider you're using (cPanel, Plesk, etc.)
2. The exact error message from `test_db_connection.php`
3. Your current IP address (from whatismyipaddress.com)

I can help troubleshoot!

