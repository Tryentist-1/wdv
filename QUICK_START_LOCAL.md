# Quick Start: Local Development Setup

This is a quick reference guide. For detailed instructions, see `docs/LOCAL_DEVELOPMENT_SETUP.md`.

---

## 🚀 Quick Setup (5 minutes)

### Option 1: Docker (Recommended)
The easiest way to get started is using Docker. This will create the database, configure PHP, and start the web server automatically.

```bash
docker-compose up -d
```
The app will be available at http://localhost:8001/index.html.

To stop the environment: `docker-compose down`

### Option 2: Hybrid Setup (Local App + Docker DB)
This is the **preferred method for active development**. It runs the database in Docker (clean, isolated) but runs the PHP application locally for faster feedback.

### 1. Start Database (Docker Required)
The database **MUST** be run via Docker to ensure compatibility and correct credentials.

```bash
# Start only the database container
docker-compose up -d db
```

### 2. Configure Local Connection
Edit `api/config.local.php` and use the following verified credentials:

```php
// ========================================================
// OPTION 1: PRODUCTION DATABASE (tryentist.com) - COMMENT THIS OUT
// ========================================================
// define('DB_DSN', 'mysql:host=da100.is.cc;dbname=aelectri_wdv;charset=utf8mb4');
// define('DB_USER', 'aelectri_wdv_remote');
// define('DB_PASS', 'Bigdistraction976');

// ========================================================
// OPTION 2: LOCAL DATABASE (Docker) - UNCOMMENT THIS
// ========================================================
define('DB_DSN', 'mysql:host=127.0.0.1;port=3306;dbname=wdv;charset=utf8mb4');
define('DB_USER', 'wdv_user');        // Confirmed Docker configuration
define('DB_PASS', 'wdv_dev_password'); // Confirmed Docker configuration

// Also update CORS for local development:
define('CORS_ORIGIN', '*');
```

### 5. Test Connection
```bash
php tests/api/harness/test_db_connection.php
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
Run the local development server (uses `router.php` for clean URLs):

```bash
npm run serve
```

### 8. Open Browser
- **Main app:** http://localhost:8001/index.html
- **Coach console:** http://localhost:8001/coach.html
- **Style guide:** http://localhost:8001/tests/components/style-guide.html
- **API test harness:** http://localhost:8001/tests/api/harness/test_harness.html

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

## 🧩 Standardized Components (v1.6.0+)

The application now includes reusable UI components for consistent user experience across all modules:

### ArcherSelector Component
**File:** `js/archer_selector.js`  
**Status:** ✅ Integrated in all modules (v1.6.0)  
**Features:** Search, favorites, avatars, mobile-first design, two-line stacked layout

**Test it:**
1. Visit `http://localhost:8001/team_card.html` - Team module
2. Visit `http://localhost:8001/solo_card.html` - Solo module
3. Visit `http://localhost:8001/ranking_round_300.html` - Ranking Round module
4. See the beautiful archer selection interface with avatars
5. Try search, assignment (T1/T2, A1/A2, Target A/B/C/D), and favorites

### ScoreKeypad Component  
**File:** `js/score_keypad.js`  
**Status:** ✅ Integrated in all modules (v1.6.0)  
**Features:** Touch-optimized 4×3 layout, score colors, auto-advance, no navigation buttons

### Enhanced ScorecardView
**File:** `js/scorecard_view.js`  
**Status:** ✅ Enhanced with `renderArcherTable()`  
**Features:** Consistent table rendering across modules

### Tailwind CSS Migration (v1.6.0)
**Status:** ✅ 100% Complete  
**Features:**
- All modules use compiled Tailwind CSS exclusively
- Zero legacy CSS dependencies
- Complete dark mode support
- Mobile-first responsive design
- Unified score color system

### Integration Status
- ✅ **Team Module** - Complete ArcherSelector + Tailwind integration
- ✅ **Solo Module** - Complete ArcherSelector + Tailwind integration
- ✅ **Ranking Round 300** - Complete ArcherSelector + Tailwind integration (v1.6.0)
- ✅ **Ranking Round 360** - Complete Tailwind integration (v1.6.0)
- ⏳ **Coach Console** - Archer list views need ArcherSelector integration (future work)

**Documentation:** See `docs/APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md#shared-ui-standardization`

### 🎯 Future Work: Coach Console Archer List Updates

**Priority:** High  
**Status:** Planned

The Coach Console (`coach.html`) currently uses a basic checkbox list for archer selection in event edits and setup. This should be updated to:

1. **Use ArcherSelector Component** - Replace the current checkbox list with the standardized `ArcherSelector` component for consistency across all modules
   - Avatars and two-line stacked layout (name + school/level)
   - Search functionality
   - Consistent styling with other modules

2. **Add "Active" Status Filtering** - Add filtering capability to show only active archers when editing events or setting up bales
   - Filter by archer status (Active/Inactive)
   - Default to showing only active archers in event setup
   - Allow coaches to toggle between "Active Only" and "All Archers"

**Files to Update:**
- `coach.html` - Update archer list modal structure
- `js/coach.js` - Replace `renderArcherList()` with ArcherSelector integration
- Add status filtering logic to archer selection workflow

**Reference Implementation:**
- See `js/ranking_round_300.js` for ArcherSelector integration example
- See `js/archer_selector.js` for component API and options

---

## 🏆 Bracket Management Features (v1.5.3+)

The application now supports tournament bracket management for Solo and Team matches:

### Bracket Types
- **Elimination Brackets**: Auto-generated from Top 8 ranking results
- **Swiss Brackets**: Open format with manual match creation

### Key Features
- ✅ Event-linked bracket creation and management
- ✅ Automatic bracket assignment for archers
- ✅ Bracket results viewing (`bracket_results.html`)
- ✅ Archer match history (`archer_matches.html`)
- ✅ Home page assignment display with direct links
- ✅ Auto-population of archers in Solo match setup

### Testing Bracket Features
1. **Create Test Data:**
   ```bash
   php api/create_test_bracket_data.php
   ```

2. **View Bracket Results:**
   - Visit `http://localhost:8001/bracket_results.html?bracketId=<bracket-id>`
   - See detailed match scores and progression

3. **Archer Match History:**
   - Visit `http://localhost:8001/archer_matches.html`
   - Filter by tournament matches or standalone matches

4. **Test Assignment Flow:**
   - Log in as an archer with bracket assignments
   - Click assignment from home page
   - Verify auto-population in Solo match setup

**Documentation:**
- [Bracket Management Implementation](docs/BRACKET_MANAGEMENT_IMPLEMENTATION_PLAN.md)
- [Event & Bracket UI](docs/EVENT_BRACKET_UI_IMPLEMENTATION.md)
- [Bracket Test Plan](docs/BRACKET_RESULTS_TEST_PLAN.md)

---

## 🧪 Testing Your Setup

### Verify Everything Works
```bash
# 1. Test component library (visual verification)
open http://localhost:8001/tests/components/style-guide.html

# 2. Run local E2E tests
npm run test:local

# 3. Test API endpoints
./test_phase1_local.sh

# 4. Manual sanity check
cat tests/manual_sanity_check.md
```

### Testing Resources
- **📋 [TESTING_STRATEGY.md](TESTING_STRATEGY.md)** - Complete testing overview
- **🎨 Style Guide** - http://localhost:8001/tests/components/style-guide.html
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

