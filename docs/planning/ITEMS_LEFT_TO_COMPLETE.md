# Items Left to Complete

**Purpose:** Focused list of remaining work  
**Last Updated:** February 2026

---

## ✅ Recently Completed (Feb 2026)

- **Solo card keypad fix:** Migrated from inline keypad to shared `ScoreKeypad` module (`js/score_keypad.js`), fixing keypad not appearing and auto-advance broken on mobile
- **Match code restoration on hydration:** `hydrateSoloMatch()` and `hydrateTeamMatch()` now restore `match_code` from server response after "Reset Data", fixing 401 sync failures
- **Sync status indicators on solo card:** End rows now show sync status icons (checkmark / spinner / error)
- **LiveUpdates setter methods:** Added `setSoloMatchCode()` and `setTeamMatchCode()` to public API
- **Deploy script overhaul:** Comprehensive exclusion list (40+ patterns), accurate Step 3 verification, canonical whitelist in `deployment-safety.mdc`
- **Deployment safety rule rewrite:** Added positive "What DOES Deploy" whitelist; no more guessing what goes to prod
- Position filter (S1–S8, T1–T6) for Games Events
- Import Roster Games CSV
- Assignment list: Active/Inactive/All filter, sort (School → Gender → VJV → Position)
- Deploy script: exclude `.cursor`, `.agent`, `config.local.php`
- Config best practices: `config.local.php.example`, CONFIG_SETUP.md
- Production config fix (local vs prod credentials)

---

## 🎯 Near-Term (Q1–Q2 2026)

### Environment / DevOps
- **Local PHP version alignment:** Downgrade local from 8.5 to 8.3 to match prod (prod capped at 8.3 in control panel). Not blocking; do when convenient.

### Event Dashboard (Phase 2.5)
- Core dashboard with overview
- Real-time updates and auto-refresh
- Timeline view and alerts

### Bracket Enhancements
- Double elimination (loser's bracket)
- Round robin
- Print/export bracket views
- Advanced bracket visualization

### Coach–Athlete Collaboration (Phase 3)
- Archer progress tracking
- Coach notes and feedback
- Goal setting and achievement tracking

---

## 📅 Later (Q3–Q4 2026+)

### Team Competition (Phase 5)
- Team-wide events
- Season tracking
- Season analytics

### Advanced (Phase 6)
- Mobile native apps
- Advanced analytics (ML)
- USA Archery / integrations

---

## 🔗 Full Roadmap

- [ROADMAP.md](ROADMAP.md) — Phased development plan
- [FUTURE_VISION_AND_ROADMAP.md](FUTURE_VISION_AND_ROADMAP.md) — Extended vision
