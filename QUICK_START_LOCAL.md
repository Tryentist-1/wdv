# Quick Start: Local Development Setup

This is a quick reference guide. For detailed instructions, see `docs/LOCAL_DEVELOPMENT_SETUP.md`.

---

## 🚀 Quick Setup (5 minutes)

### 1. Start MySQL
```bash
# macOS
brew services start mysql

# Linux
sudo systemctl start mysql
```

### 2. Create Database
```bash
mysql -u root -p
```

```sql
CREATE DATABASE wdv CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 3. Import Schema
```bash
mysql -u root -p wdv < api/sql/schema.mysql.sql
```

### 4. Configure Local Database Connection

Edit `api/config.local.php` and **comment out the production config, uncomment the local config**:

```php
// ========================================================
// OPTION 1: PRODUCTION DATABASE (tryentist.com) - COMMENT THIS OUT
// ========================================================
// define('DB_DSN', 'mysql:host=da100.is.cc;dbname=aelectri_wdv;charset=utf8mb4');
// define('DB_USER', 'aelectri_wdv_remote');
// define('DB_PASS', 'Bigdistraction976');

// ========================================================
// OPTION 2: LOCAL DATABASE - UNCOMMENT THIS
// ========================================================
define('DB_DSN', 'mysql:host=localhost;dbname=wdv;charset=utf8mb4');
define('DB_USER', 'root');
define('DB_PASS', '');  // Your MySQL root password here

// Also update CORS for local development:
define('CORS_ORIGIN', '*');  // Or 'http://localhost:8001'
```

### 5. Test Connection
```bash
php api/test_db_connection.php
```

Should show: ✅ Connection successful!

### 6. Build Tailwind CSS
```bash
# Compile Tailwind CSS (required for styling)
npm run build:css
```

**Note:** The project uses compiled Tailwind CSS instead of CDN for reliability. After editing `css/tailwind.css`, run `npm run build:css` to regenerate `css/tailwind-compiled.css`.

**Dark Mode:** Dark mode is configured using Tailwind v4's `@custom-variant` directive. If dark mode isn't working, verify that `css/tailwind.css` contains the dark mode variant configuration.

### 7. Start Server
```bash
npm run serve
```

### 8. Open Browser
- **Main app:** http://localhost:8001/index.html
- **Coach console:** http://localhost:8001/coach.html
- **Component library:** http://localhost:8001/test-components.html
- **API test harness:** http://localhost:8001/api/test_harness.html

---

## 🔄 Switching Between Local and Production

### To Use Local Database:
1. Comment out production config (OPTION 1)
2. Uncomment local config (OPTION 2)
3. Update `DB_PASS` with your MySQL password
4. Set `CORS_ORIGIN` to `'*'` or `'http://localhost:8001'`

### To Use Production Database:
1. Comment out local config (OPTION 2)
2. Uncomment production config (OPTION 1)
3. Set `CORS_ORIGIN` back to `'https://tryentist.com'`

---

## ⚠️ Important Notes

- **Never commit `config.local.php`** - it's in `.gitignore`
- **Always use local database for development** to avoid accidentally modifying production
- **Switch back to local** after testing with production data

---

## 🧩 Standardized Components (v1.5.0)

The application now includes reusable UI components for consistent user experience:

### ArcherSelector Component
**File:** `js/archer_selector.js`  
**Status:** ✅ Integrated in Team module  
**Features:** Search, favorites, avatars, mobile-first design

**Test it:**
1. Visit `http://localhost:8001/team_card.html`
2. See the beautiful archer selection interface
3. Try search, team assignment (T1/T2), and favorites

### ScoreKeypad Component  
**File:** `js/score_keypad.js`  
**Status:** ✅ Available for integration  
**Features:** Touch-optimized 4×3 layout, score colors, auto-advance

### Enhanced ScorecardView
**File:** `js/scorecard_view.js`  
**Status:** ✅ Enhanced with `renderArcherTable()`  
**Features:** Consistent table rendering across modules

### Integration Status
- ✅ **Team Module** - Complete ArcherSelector integration
- ⏳ **Solo Module** - Next integration target
- ⏳ **Ranking Rounds** - Future integration target

**Documentation:** See `docs/APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md#shared-ui-standardization`

---

## 🧪 Testing Your Setup

### Verify Everything Works
```bash
# 1. Test component library (visual verification)
open http://localhost:8001/test-components.html

# 2. Run local E2E tests
npm run test:local

# 3. Test API endpoints
./test_phase1_local.sh

# 4. Manual sanity check
cat tests/manual_sanity_check.md
```

### Testing Resources
- **📋 [TESTING_STRATEGY.md](TESTING_STRATEGY.md)** - Complete testing overview
- **🎨 Component Library** - http://localhost:8001/test-components.html
- **📁 Test Organization** - [tests/TEST_ORGANIZATION.md](tests/TEST_ORGANIZATION.md)

---

## 🐛 Troubleshooting

**MySQL not running?**
```bash
brew services start mysql  # macOS
sudo systemctl start mysql  # Linux
```

**Connection fails?**
- Check MySQL username/password in `config.local.php`
- Verify database exists: `mysql -u root -p -e "SHOW DATABASES;"`
- Check MySQL is running: `mysqladmin ping -h localhost`

**Port 8001 in use?**
```bash
# Use different port
php -S localhost:8002
# (Then update package.json to match)
```

---

## 📚 Full Documentation

See `docs/LOCAL_DEVELOPMENT_SETUP.md` for complete setup instructions.

