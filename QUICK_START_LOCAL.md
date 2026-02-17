# Quick Start: Local Development Setup

This is a quick reference guide. For detailed instructions, see `docs/LOCAL_DEVELOPMENT_SETUP.md`.

---

## 🚀 Quick Setup (OrbStack + Docker Compose)

The entire dev environment runs in Docker via OrbStack. **Open OrbStack and everything auto-starts.**

### Services (all managed by `docker-compose.yml`)

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| `wdv_web` | nginx:alpine | **:8001** | Web server (serves HTML, JS, CSS; routes API to PHP) |
| `wdv_php` | php:8.2-fpm-alpine | (internal) | PHP-FPM application server |
| `wdv-mysql` | mysql:8.0 | **:3306** | MySQL database (persistent named volume) |

All containers use `restart: unless-stopped`, so they auto-start when OrbStack launches.

### First Time Setup

```bash
# Start everything (pulls images on first run)
docker compose up -d
```

### Daily Workflow

1. **Open OrbStack** — containers auto-start, everything is ready
2. **Open browser** — http://localhost:8001/index.html
3. **Done.** No manual server starts needed.

### Access Points

- **Main app:** http://localhost:8001/index.html
- **Coach console:** http://localhost:8001/coach.html
- **Style guide:** http://localhost:8001/tests/components/style-guide.html
- **API health:** http://localhost:8001/api/v1/health

### DBeaver / Database Client

| Setting | Value |
|---------|-------|
| Host | `127.0.0.1` |
| Port | `3306` |
| Database | `wdv` |
| User | `wdv_user` |
| Password | `wdv_dev_password` |

### Managing the Stack

```bash
# View container status
docker compose ps

# View logs
docker compose logs -f        # All services
docker compose logs -f web    # Nginx only
docker compose logs -f php    # PHP only
docker compose logs -f db     # MySQL only

# Restart after config changes (e.g., nginx.conf)
docker compose restart web

# Stop everything (keeps data)
docker compose stop

# Stop and remove containers (keeps data volume)
docker compose down
```

### Build Tailwind CSS

If you change styling in `css/tailwind.css`, rebuild the compiled CSS:

```bash
npm run build:css
```

**Note:** The compiled CSS file (`css/tailwind-compiled.css`) is volume-mounted into the container, so changes are immediate after rebuild.

---

## ⚠️ Important Notes

- **Never commit `config.local.php`** — it's in `.gitignore`
- **Always use local database for development** — avoid accidentally modifying production
- **Database data persists** in Docker named volume `wdv_wdv_mysql_data` — survives `docker compose down`
- **`config.docker.php`** is mounted into the container as `config.local.php` — edit `config.docker.php` for Docker credentials

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

### Consolidated Roster Export (v1.9.6+)
- **Feature**: Export a single CSV containing all archers and their assignments from the Event Dashboard.
- **Usage**: Click the "Download Roster CSV" button (cloud icon) in the Event Dashboard header.

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

**Containers not starting?**
```bash
# Check OrbStack is running, then:
docker compose ps
docker compose logs
```

**API returning errors?**
```bash
docker compose logs php
```

**Port 8001 in use?**
```bash
lsof -ti:8001
```

**Database connection refused?**
```bash
docker exec wdv-mysql mysqladmin ping -u wdv_user -pwdv_dev_password
```

---

## 📚 Full Documentation

See `docs/LOCAL_DEVELOPMENT_SETUP.md` for complete setup instructions.
