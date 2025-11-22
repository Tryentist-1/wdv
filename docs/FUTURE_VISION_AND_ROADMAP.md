# WDV Archery Suite - Future Vision & Extended Roadmap

**Date:** November 17, 2025  
**Status:** Vision Document  
**Horizon:** 6-12 months

---

## 🎯 The Vision Evolution

### Where We Started (2024)
> "A one-page app to keep scores that enhances paper flow"

**Simple scoring apps** for practice and competition

---

### Where We Are Now (Nov 2025)
> "Managing a team and their progress, managing events"

**Integrated platform** with:
- ✅ Database-backed scoring (Ranking Rounds)
- ✅ Live score sync across devices
- ✅ Coach console for event management
- ✅ Real-time leaderboards
- ✅ Master archer roster
- ✅ Event creation & QR code access

---

### Where We're Going (2026+)
> "Manage coach-athlete collaboration, tournament brackets, and full team competitions"

**Complete team management & tournament platform** with:
- 🎯 Solo/Team Olympic match integration (Phase 2)
- 🤝 Coach-athlete progress tracking & collaboration
- 🏆 Tournament bracket management
- 📊 Season-long analytics & growth tracking
- 👥 Team-wide competition management
- 📈 Individual improvement plans

---

## 🗺️ Extended Development Roadmap

### ✅ Phase 0 - COMPLETE (2024)
**Foundation**
- Git structure
- Local/remote database
- Deployment pipeline

---

### ✅ Phase 1 - COMPLETE (2025 Q1-Q3)
**Live Scoring Platform**
- Ranking Round 360 & 300
- Live score sync
- Coach console
- Event management
- QR code access
- Master archer roster
- Real-time leaderboard

**Status:** ✅ Production (v1.3.0)

---

### 🚧 Phase 2 - IN PROGRESS (2025 Q4)
**Olympic Match Integration**

**Goal:** Integrate Solo & Team Olympic matches with same database/auth pattern as Ranking Rounds

**Deliverables:**
- [ ] Solo match database schema & API
- [ ] Team match database schema & API
- [ ] Frontend integration (both modules)
- [ ] Coach console integration
- [ ] Cross-device sync for matches
- [ ] Event-linked matches

**Estimated:** 32-40 hours  
**Target:** December 2025

**Documented:** [APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md](APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md)

---

### 📅 Phase 3 - Coach-Athlete Collaboration (2026 Q1)
**Goal:** Enable coaches to work directly with individual archers on improvement

#### 3.1 Archer Progress Tracking

**Individual Archer Dashboard:**
```
┌─────────────────────────────────────────────────────┐
│ Sarah Johnson - VAR - Bale 2A                       │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Season Stats:                                        │
│   Avg Score: 278/300 (↑ +12 from last month)       │
│   Avg Arrow: 9.27 (↑ +0.4)                         │
│   X Count: 42% (↑ +8%)                             │
│   Consistency: 92% (within 5pts per end)           │
│                                                      │
│ Recent Rounds:                                       │
│   Nov 15: 282/300 (Personal Best!)                 │
│   Nov 10: 276/300                                   │
│   Nov 08: 274/300                                   │
│                                                      │
│ Improvement Areas:                                   │
│   ⚠️ End 8-10: Score drop (fatigue?)               │
│   ✅ Strong starts (End 1-3)                       │
│   💡 Coach Note: "Work on stamina"                 │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Features:**
- Historical score tracking (all rounds)
- Trend analysis (graphs over time)
- Personal bests & milestones
- Consistency metrics
- Pattern recognition (strong/weak ends)

**Database Extensions:**
```sql
-- Archer performance summaries (cached analytics)
CREATE TABLE archer_stats (
  archer_id CHAR(36) PRIMARY KEY,
  season VARCHAR(20),
  total_rounds INT,
  avg_score DECIMAL(5,2),
  avg_arrow DECIMAL(4,2),
  x_count INT,
  ten_count INT,
  personal_best INT,
  last_updated TIMESTAMP,
  FOREIGN KEY (archer_id) REFERENCES archers(id)
);
```

---

#### 3.2 Coach Notes & Feedback System

**Coach Console Enhancement:**
```
┌─────────────────────────────────────────────────────┐
│ Practice Meet - Nov 17, 2025                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Bale 2: Sarah J (282), Mike C (268), Alex R (271)  │
│                                                      │
│ [+] Add Coach Note                                  │
│                                                      │
│ Coach Notes:                                         │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 📝 Sarah - Great improvement on stamina!        │ │
│ │    Focus next: Follow-through consistency       │ │
│ │    Private note ✓ | Visible to archer □        │ │
│ │    [Save] [Delete]                 Nov 17, 4:30pm│ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Features:**
- Per-archer notes (private or shared)
- Per-round feedback
- Technique observations
- Goals & action items
- Milestone celebrations

**Database Extensions:**
```sql
CREATE TABLE coach_notes (
  id CHAR(36) PRIMARY KEY,
  archer_id CHAR(36) NOT NULL,
  round_id CHAR(36),              -- Optional: specific round
  coach_id CHAR(36) NOT NULL,     -- Future: multi-coach support
  note_text TEXT,
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (archer_id) REFERENCES archers(id),
  FOREIGN KEY (round_id) REFERENCES rounds(id),
  INDEX idx_archer (archer_id),
  INDEX idx_round (round_id)
);
```

---

#### 3.3 Goal Setting & Achievement Tracking

**Archer Goal Dashboard:**
```
┌─────────────────────────────────────────────────────┐
│ My Goals - Sarah Johnson                            │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Current Season Goals:                                │
│                                                      │
│ 🎯 Break 285/300                                    │
│    Progress: 282/285 (99%) ━━━━━━━━━━━━━━━━━━━━━─ │
│    Deadline: Dec 15, 2025                           │
│    Coach Note: "So close! One more clean round."    │
│                                                      │
│ 🎯 50% X-rate                                       │
│    Progress: 42%/50% (84%) ━━━━━━━━━━━━━━━━━━━────│
│    Deadline: End of season                          │
│    Coach Note: "Focus on follow-through"            │
│                                                      │
│ ✅ Consistency <5pt variance                        │
│    ACHIEVED! Nov 10, 2025                           │
│                                                      │
│ [+ Add New Goal]                                    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Features:**
- SMART goal creation (coach or archer-initiated)
- Progress tracking with visuals
- Achievement badges/milestones
- Goal suggestions based on stats
- Shared goal ownership (coach + archer)

**Database Extensions:**
```sql
CREATE TABLE archer_goals (
  id CHAR(36) PRIMARY KEY,
  archer_id CHAR(36) NOT NULL,
  goal_type VARCHAR(50),          -- score, x_count, consistency, etc
  target_value DECIMAL(10,2),
  current_value DECIMAL(10,2),
  deadline DATE,
  status VARCHAR(20),             -- active, achieved, expired
  created_by VARCHAR(20),         -- coach or archer
  achieved_at TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (archer_id) REFERENCES archers(id)
);
```

---

### 📅 Phase 4 - Tournament Bracket Management (2026 Q2)
**Goal:** Support full tournament workflows with brackets for Solo & Team competitions

#### 4.1 Tournament Structure

**Tournament Types:**
1. **Single Elimination** (knockout)
2. **Double Elimination** (loser's bracket)
3. **Round Robin** (everyone plays everyone)
4. **Swiss System** (paired by record)

**Example: Solo Olympic Tournament**
```
Tournament: Spring Invitational - Solo Varsity Boys
Format: Single Elimination (16 archers)
Date: March 15, 2026

QUARTERFINALS          SEMIFINALS          FINALS
┌─────────────┐
│ Archer A    │─┐
└─────────────┘ │      ┌─────────────┐
                ├──────┤ Winner A/B  │─┐
┌─────────────┐ │      └─────────────┘ │
│ Archer B    │─┘                       │
└─────────────┘                         │     ┌─────────────┐
                                        ├─────┤   CHAMPION  │
┌─────────────┐                         │     └─────────────┘
│ Archer C    │─┐                       │
└─────────────┘ │      ┌─────────────┐ │
                ├──────┤ Winner C/D  │─┘
┌─────────────┐ │      └─────────────┘
│ Archer D    │─┘
└─────────────┘

[Auto-advance winners] [Manual override] [View results]
```

---

#### 4.2 Bracket Features

**Tournament Dashboard (Coach):**
- Create tournament (name, date, format, divisions)
- Seed archers (by ranking, random, manual)
- Generate bracket automatically
- Track match progress in real-time
- Auto-advance winners (or manual control)
- Print/export bracket view
- Results summary & awards

**Archer Experience:**
- See tournament bracket
- View next opponent
- Receive notifications for upcoming matches
- Record match scores (integrated with Solo/Team modules)
- See placement in real-time

**Database Extensions:**
```sql
-- Tournament definitions
CREATE TABLE tournaments (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(200),
  tournament_type VARCHAR(50),    -- solo, team, ranking
  format VARCHAR(50),              -- single_elim, double_elim, round_robin
  start_date DATE,
  end_date DATE,
  divisions JSON,                  -- ['BVAR', 'GVAR', 'BJV', 'GJV']
  status VARCHAR(20),              -- upcoming, in_progress, completed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tournament bracket structure
CREATE TABLE tournament_brackets (
  id CHAR(36) PRIMARY KEY,
  tournament_id CHAR(36) NOT NULL,
  division VARCHAR(10),
  round_number INT,                -- 1=QF, 2=SF, 3=F
  match_number INT,                -- Position in round
  participant1_id CHAR(36),        -- Archer or team ID
  participant2_id CHAR(36),
  winner_id CHAR(36),
  match_id CHAR(36),               -- Links to solo_matches or team_matches
  status VARCHAR(20),              -- pending, in_progress, completed
  scheduled_time TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
  FOREIGN KEY (match_id) REFERENCES solo_matches(id)  -- or team_matches
);

-- Tournament seeding
CREATE TABLE tournament_seeds (
  id CHAR(36) PRIMARY KEY,
  tournament_id CHAR(36) NOT NULL,
  participant_id CHAR(36) NOT NULL,
  seed_number INT,
  ranking_score DECIMAL(10,2),    -- Used for seeding
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
);
```

---

#### 4.3 Auto-Bracket Generation

**Seeding Options:**
1. **By Ranking Score** - Use recent 300/360 scores
2. **Random** - Draw names from hat
3. **Manual** - Coach assigns seeds
4. **By Record** - If season tracking exists

**Smart Features:**
- Auto-fill byes for non-power-of-2 entries
- Balance bracket (avoid same-school early matches)
- Handle forfeits/withdrawals
- Reschedule matches
- Live score updates in bracket view

---

### 📅 Phase 5 - Team Competition Management (2026 Q3)
**Goal:** Support team-vs-team season tracking and rankings

#### 5.1 Team-Wide Events

**Example: Dual Meet**
```
WDV Warriors vs. Lincoln Archers
Date: Oct 5, 2026
Location: Home Range

VARSITY BOYS                Score    Result
Ranking Round (combined)    1650     WIN (+75)
Solo Matches (4)            3-1      WIN
Team Match                  1-0      WIN

VARSITY GIRLS               Score    Result  
Ranking Round (combined)    1580     LOSS (-20)
Solo Matches (4)            2-2      TIE
Team Match                  0-1      LOSS

OVERALL: WDV WINS 8-3
```

**Features:**
- Schedule dual meets & tri-meets
- Track head-to-head records
- Combined team scores (ranking rounds)
- Match play results (solo/team)
- Overall meet winner
- Season standings

---

#### 5.2 Season Tracking

**Team Dashboard:**
```
WDV Warriors - 2025-26 Season

Record: 8-2 (4-1 home, 4-1 away)
League Standing: 2nd (out of 12 teams)

Recent Results:
  Nov 15: W vs Lincoln (8-3)
  Nov 10: W vs Jefferson (9-2)
  Nov 03: L vs Roosevelt (4-7)
  Oct 28: W vs Adams (7-4)

Upcoming:
  Nov 22: @ Madison (Conference match)
  Nov 29: vs Kennedy (Senior night)

Top Performers:
  Sarah J: 285 avg, 12-1 solo record
  Mike C: 278 avg, 10-3 solo record
  Alex R: 276 avg, 8-4 solo record
```

**Database Extensions:**
```sql
-- Team definitions
CREATE TABLE teams (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(200),
  school VARCHAR(100),
  season VARCHAR(20),
  coach_id CHAR(36),
  home_range VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dual meets
CREATE TABLE dual_meets (
  id CHAR(36) PRIMARY KEY,
  home_team_id CHAR(36),
  away_team_id CHAR(36),
  meet_date DATE,
  location VARCHAR(200),
  home_points INT,
  away_points INT,
  winner_id CHAR(36),
  status VARCHAR(20),
  FOREIGN KEY (home_team_id) REFERENCES teams(id),
  FOREIGN KEY (away_team_id) REFERENCES teams(id)
);

-- Meet components (links to actual rounds/matches)
CREATE TABLE meet_components (
  id CHAR(36) PRIMARY KEY,
  meet_id CHAR(36) NOT NULL,
  component_type VARCHAR(20),     -- ranking, solo, team
  division VARCHAR(10),
  event_id CHAR(36),              -- Links to events table
  home_score INT,
  away_score INT,
  winner VARCHAR(10),             -- home, away, tie
  FOREIGN KEY (meet_id) REFERENCES dual_meets(id)
);
```

---

#### 5.3 Season Analytics

**Coach Analytics Dashboard:**
- Team record & standings
- Individual archer performance trends
- Division breakdowns (BVAR, BJV, GVAR, GJV)
- Home vs. away splits
- Head-to-head records against opponents
- Strength of schedule
- Export season summary

**Archer Season View:**
- Personal record & stats
- Contribution to team wins
- Division ranking
- Improvement over season
- Best performances
- Goals progress

---

### 📅 Phase 6 - Advanced Features (2026 Q4+)
**Goal:** Polish, mobile apps, and advanced analytics

#### 6.1 Mobile Native Apps
- iOS & Android apps (React Native or Flutter)
- Offline-first architecture
- Push notifications
- Native camera for QR codes
- Better mobile UX

#### 6.2 Advanced Analytics
- Predictive scoring (ML-based)
- Archer clustering (find similar profiles)
- Practice recommendations
- Ideal training load
- Injury risk factors
- Peak performance timing

#### 6.3 Integrations
- USA Archery database sync
- Google Calendar integration
- Team communication (Slack/Discord)
- Video analysis tools
- Equipment tracking

---

## 🎯 Success Metrics

### Phase 2 (Olympic Integration)
- ✅ 100% of matches visible to coaches
- ✅ Cross-device sync working
- ✅ Zero data loss from localStorage
- ✅ Matches linked to events

### Phase 3 (Coach-Athlete)
- ✅ Coaches using notes for >50% of archers
- ✅ 80% of archers have active goals
- ✅ Progress dashboards viewed weekly
- ✅ Measurable improvement correlation

### Phase 4 (Tournaments)
- ✅ Successfully run 5+ bracket tournaments
- ✅ Auto-bracket generation working
- ✅ Real-time updates functional
- ✅ Coach satisfaction >90%

### Phase 5 (Team Management)
- ✅ Track full season (10+ meets)
- ✅ Team standings accurate
- ✅ Season reports generated
- ✅ Athletic director approved

---

## 💡 Key Principles Going Forward

### 1. Build on What Works
- ✅ Storage pattern established (DB + localStorage + cookies)
- ✅ Authentication model proven
- ✅ API design consistent
- **→ Apply same patterns to all new features**

### 2. Mobile-First Always
- 99% usage on phones [[memory:10705663]]
- Test on real devices
- Optimize for small screens
- Fast, simple UX

### 3. Coach-Centric Design
- Coaches manage events & teams
- Archers execute (score, compete)
- Everything coach-visible eventually
- Easy export/reporting

### 4. Progressive Enhancement
- Core features work offline
- Advanced features when online
- Graceful degradation
- No breaking changes

### 5. Data Integrity
- Database is source of truth
- Offline queue preserves data
- Validation on server
- Audit trails for critical operations

---

## 🗓️ Estimated Timeline

```
2025 Q4: Phase 2 - Olympic Integration           (6-8 weeks)
2026 Q1: Phase 3 - Coach-Athlete Collaboration   (8-10 weeks)
2026 Q2: Phase 4 - Tournament Brackets           (10-12 weeks)
2026 Q3: Phase 5 - Team Competition Management   (8-10 weeks)
2026 Q4: Phase 6 - Advanced Features             (Ongoing)
```

**Total to "Complete Platform": ~40-45 weeks** (assuming steady part-time development)

---

## 🎨 Recent UI Standardization (November 2025)

### Unified Scorecard List Implementation
**Problem Solved:** Fragmented scorecard display across different views with inconsistent styling and layouts.

**Solution Implemented:**
- **Created `js/unified_scorecard_list.js`** - Reusable component for consistent scorecard rendering
- **Created `css/unified-scorecard-list.css`** - Mobile-first compact 2-line grid layout
- **Updated all scorecard display locations:**
  - `archer_history.html` - Historical scorecard view
  - `results.html` - Live event leaderboard  
  - `scorecard_editor.html` - Search results
  - `index.html` - Open assignments section

**Key Features:**
- **Compact 2-line layout** with header row (Event, Status, Total, Avg, Xs, 10s)
- **Standardized status labels** (PEND, COMP, VER, VOID, LOCK)
- **Mobile-optimized** responsive design for 99% phone usage
- **Click-to-view** functionality for detailed scorecards
- **Consistent data structure** across all implementations

**Impact:** Eliminated UI fragmentation and provided consistent user experience across all scorecard views.

---

## 🚀 Immediate Next Steps

### This Month (November 2025)
1. ✅ Complete Phase 2 documentation
2. ✅ Create unified README
3. ✅ Capture future vision (this doc)
4. ✅ **Unified Scorecard List Implementation** - Created reusable component for consistent scorecard display
5. ✅ **Archer Dashboard Improvements** - Added size fields, notes history, open assignments detection
6. ✅ **UI Standardization** - Implemented mobile-first compact 2-line layout across all scorecard views
7. [ ] Begin Phase 2 backend work

### Next Month (December 2025)
1. [ ] Complete Solo integration
2. [ ] Complete Team integration
3. [ ] Deploy Phase 2 to production
4. [ ] Begin Phase 3 planning

### Q1 2026
1. [ ] Phase 3: Archer progress tracking
2. [ ] Phase 3: Coach notes system
3. [ ] Phase 3: Goal setting features
4. [ ] Test with real coaching workflows

---

## 📚 Related Documentation

**Current State:**
- [APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md](APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md) - Current architecture
- [README.md](../README.md) - Project overview
- [ROADMAP.md](ROADMAP.md) - Original roadmap (needs update)

**This Document:**
- Extends original roadmap through 2026
- Details Phase 3-6 features
- Provides database schema guidance
- Captures the long-term vision

---

## 💬 Notes

### From One-Page App to Platform

**The Journey:**
1. **2024:** Simple scoring → Paper replacement
2. **2025:** Database + sync → Event management
3. **2026:** Coach tools → Team management platform
4. **2027+:** Analytics + mobile → Complete ecosystem

**The Pattern:**
Each phase builds naturally on the previous foundation. No "big rewrites" - just steady, thoughtful expansion.

### Why This Works

**Strong Foundation:**
- ✅ Proven storage pattern
- ✅ Working authentication
- ✅ Stable API design
- ✅ Clean codebase
- ✅ Good documentation

**Clear Vision:**
- Know what we're building
- Know why it matters
- Know who it serves
- Know how to get there

### What Makes This Different

**Not a generic scoring app** - Built specifically for:
- OAS archery scoring rules
- High school team management
- Coach-athlete collaboration
- Mobile-first environment
- Real archery coaching workflows

**Purpose-built** beats general-purpose every time.

---

**Vision Document Owner:** Development Team  
**Last Updated:** November 17, 2025  
**Review Cadence:** Quarterly or after major phase completion

**This is a living document** - Update as priorities shift, new ideas emerge, or requirements evolve.

