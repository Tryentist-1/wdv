# WDV Archery Suite - Event Lifecycle & User Roles

**Last Updated:** 2026-02-07  
**Purpose:** Complete guide to event flow from planning to completion, covering both Coach and Archer roles

---

## 👥 User Roles

### 🎯 Coach Role

**Access:** `coach.html` (requires passcode: `wdva26`)

**Responsibilities:**
- Create Archer Records and School Roster in Archerlist using the "Import" or "Add Archer"
- Select Positions for Brackets using the http://localhost:8001/assignment_list.html
- Create and manage events, Ranking Rounds, Solo Brackets and Team Brackets.
- Events can have Ranking ROunds, Solo Rounds Swiss or Elimination, Team Rounds Swiss or Elimination, they are all optional for the event set up. For "Games Events" that are not sanctioned events it is common to have only Swiss Solo and Swiss Team brackets.
- Add archers to events, Ranking rounds, Solo Brackets and Team Brackets
- Assign bales and targets
- Verify scorecards and match results
- Generate Elimination Brackets if needed
- Manage event lifecycle (Planned → Active → Completed)
- View analytics and results
- Determine Winners and Medals
- Medals for Ranking Rounds by Division, Solos by Division, Teams by Division and Overall School/Team score.

**Permissions:**
- ✅ Full read/write access to all data
- ✅ Delete events, rounds, archers
- ✅ Verify and finalize scores
- ✅ Create brackets and generate matches
- ✅ Export/import CSV files
- ✅ Access admin tools

---

### 🏹 Archer Role

**Access:** `index.html` → Enter event code → Select profile → Access scoring apps

**Responsibilities:**
- Select own profile from master list
- Find their Opponents and Bale Assignment in the Home Screen
- Join events using entry codes
- Score ranking rounds (300 Round)
- Score solo matches (Olympic Round)
- Score team matches (Olympic Team Round)
- Find Updates as Solo and Olympic Rounds progress through rounds ie new opponents and new bale assignements
- View own history and stats
- Select bales (if manual signup enabled)
- Challenge opponents (if Swiss bracket is Open mode)

**Permissions:**
- ✅ Read archer list (public)
- ✅ Read/write own scores (authenticated by event code)
- ✅ View event results and brackets (public)
- ❌ Cannot verify scores (coach-only)
- ❌ Cannot create events
- ❌ Cannot delete data

---

## 🔄 Complete Event Lifecycle

### **📋 Phase 1: Event Planning** (Coach)

**Timeline:** Days or weeks before event  
**Location:** `coach.html` → "Create Event"

#### Steps:
0. All Archer Profiles loaded into the ArcherList, and set to "Active" by Coaches

1. **Coach clicks "Create Event"**
   - Enter event name (e.g., "State Championships 2026")
   - Select date
   - Set status: `Planned`
   - Generate entry code (e.g., `STATE26`)

2. **Coach selects divisions**
   - Check: OPEN (Mixed), Boys Varsity, Girls Varsity, Boys JV, Girls JV
   - System creates a ranking round (R300) for each division

3. **Coach adds archers to each division** (Division Loop)
   - FOR EACH DIVISION:
     - Modal: "Add Archers to [Division] Round"
     - Search/filter master archer list
     - Select multiple archers (bulk selection)
     - Choose bale assignment mode:
       - **Auto-Assign:** Coach assigns bales (2-4 per bale, continuous numbering)
       - **Manual Signup:** Archers select their own bales via app
     - Click "Confirm"
     - Archers added to that division's round
   - Loop continues until all divisions configured

4. **Event created with archers assigned**
   - Event status: `Planned`
   - All ranking rounds have rosters
   - Bales assigned (if auto-assign) or NULL (if manual)
   - Entry code generated
   - QR code available for sharing

**Output:**
- ✅ Event exists with entry code
- ✅ Ranking rounds created for each division
- ✅ Archers assigned to rounds
- ✅ Bales assigned (if auto-assign)
- ✅ Event ready for day-of-event

---

### **🎯 Phase 2: Day of Event Setup** (Coach)

**Timeline:** Morning of event  
**Location:** `coach.html` → Event Dashboard

#### Steps:
1. **Coach updates event status to `Active`**
   - Edit event
   - Change status from `Planned` to `Active`
   - Save changes

2. **Coach shares access with archers**
   - Open QR Code modal
   - Display QR code on screen/projector
   - OR: Share event URL via text/email
   - Format: `ranking_round_300.html?event={id}&code={entry_code}`

3. **If Manual Signup:** Archers select bales
   - Archers open app (scan QR or enter code)
   - Select their profile
   - Choose available bale (A, B, C, or D)
   - Confirm selection

**Output:**
- ✅ Event is `Active`
- ✅ Archers can access via QR/code
- ✅ All bales assigned (auto or manual)
- ✅ Ready for scoring

---

### **🏹 Phase 3: Ranking Round Scoring** (Archers)

**Timeline:** During event (typically 1-2 hours)  
**Location:** `ranking_round_300.html`

#### Archer Steps:
1. **Join event**
   - Scan QR code OR enter event code manually
   - Select own profile from list via modal if no cookie set yet
   - Confirm bale assignment

2. **Score ranking round**
   - Enter 30 arrows (10 ends × 3 arrows)
   - System calculates running total, 10s, Xs
   - View real-time leaderboard
   - See balemates' scores (if same bale)

3. **Submit scorecard**
   - Review total score
   - Tap "Verify and Submit"
   - Card status: `PENDING` → `COMP` (Completed)
   - Card locked, waiting for coach verification

**What Archers See:**
- Own scorecard with all scores
- Running total and average
- Ranking within division
- Balemates' progress (if auto-assigned)

---

### **👮 Phase 4: Ranking Round Verification** (Coach)

**Timeline:** After archers submit (same day)  
**Location:** `coach.html` → "Verify Scorecards"

#### Coach Steps:
1. **Open verification modal**
   - Select verification type: "Ranking Rounds"
   - Select division (e.g., BVAR)
   - Select bale (or verify all bales)

2. **Review scorecards**
   - See all `COMP` (Completed) cards for selected division/bale
   - Compare digital scores to paper scorecards
   - Check signature on paper card

3. **Verify or void**
   - **Verify:** Card status: `COMP` → `VER` (Verified)
     - Score is official
     - Appears in final rankings
   - **Void:** Card status: `COMP` → `VOID`
     - Score rejected (duplicate, error, etc.)
     - Does not appear in rankings

4. **Bulk verification**
   - Click "Verify This Bale" → All cards for one bale verified
   - Click "Verify ALL Bales" → All cards for entire division verified

**Output:**
- ✅ All ranking round scores verified
- ✅ Official rankings calculated
- ✅ Ready for bracket generation

---

### **🏆 Phase 5: Bracket Creation** (Coach)

**Timeline:** After ranking rounds complete  
**Location:** `coach.html` → Event Dashboard → "Create Bracket"

#### Types of Brackets:

#### A. Solo Elimination (Top 8)
1. **Create bracket**
   - Type: Solo
   - Format: Elimination (Top 8)
   - Division: Boys Varsity
   - Size: 8 (fixed)

2. **Generate from Top 8**
   - Click "🎯 Generate from Top 8"
   - System fetches top 8 archers from verified ranking scores
   - Seeds: 1v8, 2v7, 3v6, 4v5
   - 4 Quarter-Final matches created

3. **Bracket ready**
   - Status: `OPEN` (waiting for matches)
   - Archers can see bracket on app
   - Matches appear in "My Matches"

#### B. Solo Swiss (Mixed/Open)
1. **Create bracket**
   - Type: Solo
   - Format: Swiss
   - Division: Mixed or specific
   - Mode: Auto-Assign OR Open

2. **Add archers to bracket**
   - Use "Manage Roster" feature
   - Add archers from master list
   - OR import from ranking round (Top 8 or All)

3. **Generate first round**
   - **Auto-Assign:** Coach clicks "Generate Round"
     - System creates pairings (random or seeded)
     - Archers see assigned matches
   - **Open:** Archers self-select opponents
     - Archers see standings and available opponents
     - Challenge system

#### C. Team Elimination/Swiss
- Similar to Solo but with team entries
- Top schools ranked by combined scores
- Team bracket seeding

**Output:**
- ✅ Brackets created and seeded
- ✅ Matches generated (Elimination) or ready (Swiss)
- ✅ Archers can see their bracket matches

---

### **🏹 Phase 6: Bracket Match Play** (Archers)

**Timeline:** During/after ranking rounds  
**Location:** `solo_card.html` or `team_card.html`

#### Archer Steps:

#### A. Elimination Matches (Assigned)
1. **View "My Matches"**
   - See assigned opponent and target
   - Match appears in home page dashboard

2. **Navigate to match**
   - Click match from dashboard
   - OR scan bracket-specific QR code
   - Opens `solo_card.html?match={matchId}`

3. **Confirm and score**
   - Both archers confirm they're ready
   - Score 5 sets (3 arrows per set)
   - System calculates set points
   - First to 6 set points wins

4. **Submit match**
   - Tap "Sign & Submit"
   - Match status: `PENDING` → `COMP`
   - Locked, waiting for coach verification

#### B. Swiss Matches (Challenge)
1. **View standings**
   - See current W-L record
   - See available opponents

2. **Select opponent** (if Open mode)
   - Choose from eligible opponents
   - System prevents duplicate matches
   - Click "Start Match"

3. **Score and submit**
   - Same as elimination (5 sets, first to 6)
   - Submit for verification

**What Archers See:**
- Current match status
- Bracket standings
- W-L record
- Next opponent (Elimination) or opponent selection (Swiss)

---

### **👮 Phase 7: Match Verification** (Coach)

**Timeline:** After each match completes  
**Location:** `coach.html` → "Verify Scorecards"

#### Coach Steps:
1. **Open verification modal**
   - Select verification type: "Solo Matches" or "Team Matches"
   - Select event
   - Select bracket

2. **Review completed matches**
   - See all `COMP` matches
   - Compare digital scores to paper cards
   - Check both archers signed

3. **Verify or void**
   - **Verify:** Match status: `COMP` → `VER`
     - Winner recorded
     - Loser recorded
     - **Elimination:** Winner auto-advances to next round
     - **Swiss:** W-L records updated
   - **Void:** Match status: `COMP` → `VOID`
     - Match rejected, must be re-shot

**Elimination Bracket Progression:**
- QF Winner → Semi-Final
- SF Winner → Final
- Final Winner → Champion
- Losers → Placement matches (3rd/4th)

**Swiss Bracket Progression:**
- W-L records update after each match
- Coach generates next round when ready
- Continues until champion determined

**Output:**
- ✅ Matches verified
- ✅ Winners/losers recorded
- ✅ Brackets progress automatically
- ✅ Standings updated

---

### **🏆 Phase 8: Event Completion** (Coach)

**Timeline:** After all matches complete  
**Location:** `coach.html` → Event Dashboard

#### Coach Steps:
1. **Verify all matches verified**
   - Check all ranking rounds verified
   - Check all bracket matches verified
   - No `COMP` or `PENDING` cards remain

2. **Review results**
   - View final rankings
   - View bracket results
   - View winners and placements

3. **Update event status**
   - Edit event
   - Change status from `Active` to `Completed`
   - Save changes

4. **Generate reports** (optional)
   - Export results to CSV
   - Download bracket results
   - Generate awards lists

**Output:**
- ✅ Event status: `Completed`
- ✅ All scores verified and final
- ✅ Winners determined
- ✅ Historical record created

---

## 📊 Event Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                     EVENT LIFECYCLE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PHASE 1: Planning (Coach)                                      │
│  ├─ Create event with divisions                                 │
│  ├─ Add archers to ranking rounds (division loop)               │
│  ├─ Assign bales (auto or manual)                               │
│  └─ Status: PLANNED ✅                                           │
│      ↓                                                           │
│                                                                  │
│  PHASE 2: Day-of Setup (Coach)                                  │
│  ├─ Change status to ACTIVE                                     │
│  ├─ Share QR code with archers                                  │
│  ├─ Manual bale signup (if enabled)                             │
│  └─ Status: ACTIVE ✅                                            │
│      ↓                                                           │
│                                                                  │
│  PHASE 3: Ranking Round Scoring (Archers)                       │
│  ├─ Scan QR / enter code                                        │
│  ├─ Select profile and bale                                     │
│  ├─ Score 30 arrows (10 ends × 3)                               │
│  └─ Submit scorecard (PENDING → COMP) ✅                         │
│      ↓                                                           │
│                                                                  │
│  PHASE 4: Ranking Verification (Coach)                          │
│  ├─ Review completed scorecards                                 │
│  ├─ Compare digital to paper cards                              │
│  ├─ Verify or void each card                                    │
│  └─ Status: COMP → VER ✅                                        │
│      ↓                                                           │
│                                                                  │
│  PHASE 5: Bracket Creation (Coach)                              │
│  ├─ Create Solo/Team brackets                                   │
│  ├─ Choose Elimination or Swiss                                 │
│  ├─ Generate from Top 8 (Elimination)                           │
│  └─ OR add archers + generate matches (Swiss) ✅                │
│      ↓                                                           │
│                                                                  │
│  PHASE 6: Match Play (Archers)                                  │
│  ├─ View assigned matches (Elimination)                         │
│  ├─ OR select opponents (Swiss Open)                            │
│  ├─ Score matches (5 sets, first to 6 pts)                      │
│  └─ Submit match results (PENDING → COMP) ✅                     │
│      ↓                                                           │
│                                                                  │
│  PHASE 7: Match Verification (Coach)                            │
│  ├─ Review completed matches                                    │
│  ├─ Verify or void each match                                   │
│  ├─ Winners auto-advance (Elimination)                          │
│  └─ Standings update (Swiss) ✅                                  │
│      ↓                                                           │
│                                                                  │
│  PHASE 8: Event Completion (Coach)                              │
│  ├─ Verify all rounds and matches complete                      │
│  ├─ Review final results                                        │
│  ├─ Export reports                                              │
│  └─ Change status to COMPLETED ✅                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Detailed Workflow by Event Component

### **1. Ranking Rounds (R300)**

**Purpose:** Initial seeding, determine rankings, qualify for brackets

#### Coach Flow:
```
1. Create event with ranking divisions ✅
2. Add archers to each division (division loop) ✅
3. Assign bales (auto or manual) ✅
4. Share QR code with archers ✅
5. Monitor scoring progress (live updates) 👀
6. Verify completed scorecards ✅
7. View final rankings 📊
```

#### Archer Flow:
```
1. Scan QR code or enter event code ✅
2. Select own profile from list ✅
3. Select bale (if manual signup) ✅
4. Score 30 arrows (10 ends × 3) 🎯
5. View running total and ranking 📈
6. Submit scorecard ✅
7. Wait for coach verification ⏳
8. View verified results 📊
```

---

### **2. Solo Elimination Brackets (Top 8)**

**Purpose:** Head-to-head Olympic Round competition, top archers

#### Coach Flow:
```
1. Create bracket (Solo, Elimination, Division) ✅
2. Click "Generate from Top 8" ✅
3. System seeds: 1v8, 2v7, 3v6, 4v5 ✅
4. 4 Quarter-Final matches created ✅
5. Archers see matches in "My Matches" ✅
6. Monitor match progress 👀
7. Verify completed matches ✅
8. Winner auto-advances to next round ↗️
9. Repeat for Semi-Finals → Finals ✅
10. Champion determined! 🏆
```

#### Archer Flow:
```
1. View "My Matches" on home page ✅
2. See assigned opponent and target 🎯
3. Navigate to match card ✅
4. Both archers confirm ready ✅
5. Score 5 sets (3 arrows per set) 🏹
6. First to 6 set points wins 🎯
7. Submit match ✅
8. Wait for coach verification ⏳
9. Winner advances, loser eliminated ↗️❌
10. Continue until champion crowned 🏆
```

**Match Scoring:**
- 5 sets maximum
- 3 arrows per set (30 points max)
- Win set: 2 points
- Tie set: 1 point each
- First to 6 set points wins
- Shoot-off if tied 5-5 after 5 sets

---

### **3. Solo Swiss Brackets (Mixed/Open)**

**Purpose:** Round-robin style, more matches per archer

#### Coach Flow (Auto-Assign Mode):
```
1. Create bracket (Solo, Swiss, Auto) ✅
2. Add archers via "Manage Roster" ✅
3. Click "Generate Round 1" ✅
4. System creates random/seeded pairings ✅
5. Archers see assigned matches ✅
6. Verify completed matches ✅
7. Click "Generate Round 2" (after Round 1 done) ✅
8. System pairs by record (1-0 vs 1-0, etc.) ✅
9. Repeat until champion emerges ✅
10. Final standings calculated 📊
```

#### Archer Flow (Open Mode):
```
1. View Swiss bracket standings 📊
2. See own W-L record ✅
3. Select available opponent from list 🎯
4. System prevents duplicate matches ✅
5. Start match ✅
6. Score and submit ✅
7. Wait for verification ⏳
8. Record updates (W or L) ✅
9. Repeat until no more matches ✅
10. Final placement determined 📊
```

**Swiss Standings:**
- Ranked by: Points (2 per win, 1 per tie)
- Then: Total wins
- Then: Total losses (fewer is better)
- Then: Head-to-head result
- Then: Random

---

### **4. Team Brackets (School vs School)**

**Purpose:** Team competition, represents school

#### Coach Flow:
```
1. Create bracket (Team, Elimination/Swiss) ✅
2. Generate from top schools (based on ranking totals) ✅
3. System creates team matches ✅
4. Teams see matches in app ✅
5. Verify completed team matches ✅
6. Winning school advances ✅
7. Champion school determined 🏆
```

#### Archer Flow:
```
1. View team matches (3 archers per team) ✅
2. See teammates and opponents 🎯
3. Navigate to team card ✅
4. All 6 archers confirm ready ✅
5. Score team match (4 sets max) 🏹
   - Each archer shoots 1 arrow per set
   - Team total compared
   - Win set: 2 points, Tie: 1 point each
   - First team to 5 points wins
6. Submit match ✅
7. Wait for verification ⏳
8. Winning team advances ✅
```

---

## 🔑 Key Authentication Flows

### Coach Authentication
```
coach.html
  ↓
Modal: "Enter Passcode"
  ↓
Enter: wdva26
  ↓
Cookie stored (90 days)
  ↓
Full access granted ✅
```

### Archer Authentication
```
index.html
  ↓
Scan QR OR enter code: STATE26
  ↓
Select profile from list
  ↓
Event-specific access granted ✅
  ↓
Can score for this event only
```

---

## 🗄️ Data Flow (Source of Truth)

### Database Tables:
- `events` - Event metadata (name, date, status, entry_code)
- `rounds` - Ranking rounds (one per division per event)
- `round_archers` - Archer assignments to rounds (with bale/target)
- `end_events` - Individual end scores (30 arrows per archer)
- `brackets` - Bracket metadata (type, format, division, mode)
- `bracket_entries` - Archers/teams in brackets (with seeds, W-L records)
- `solo_matches` - Individual match records (with bracket_id)
- `solo_match_archers` - Archer pairings for matches
- `solo_values` - Arrow-by-arrow scores for matches
- `team_matches` - Team match records
- `team_match_participants` - Team rosters for matches
- `team_values` - Arrow scores for team matches

### Cache/Local Storage:
- **localStorage:** Temporary cache only (not source of truth)
  - Scorecard drafts (before submission)
  - Archer profile selection
  - UI preferences (dark mode, etc.)
- **Database:** Source of truth for all verified data

---

## 🎓 Coach vs Archer Permissions

| Action | Coach | Archer |
|--------|-------|--------|
| **Create events** | ✅ | ❌ |
| **Add archers to events** | ✅ | ❌ |
| **Assign bales** | ✅ | ❌ (can select if manual) |
| **View archer list** | ✅ | ✅ (public) |
| **Score ranking rounds** | ✅ | ✅ |
| **Score matches** | ✅ | ✅ |
| **Submit scorecards** | ✅ | ✅ |
| **Verify scorecards** | ✅ | ❌ |
| **Verify matches** | ✅ | ❌ |
| **Create brackets** | ✅ | ❌ |
| **Generate matches** | ✅ | ❌ (can select opponent if Swiss Open) |
| **View results** | ✅ | ✅ (public) |
| **Delete data** | ✅ | ❌ |
| **Export CSV** | ✅ | ❌ |
| **Import CSV** | ✅ | ❌ |
| **Access admin tools** | ✅ | ❌ |

---

## 🎯 Quick Reference: Where to Do What

### Coach Tasks:
| Task | Location |
|------|----------|
| Create event | `coach.html` → "Create Event" |
| Add archers to event | During event creation (division loop) |
| Edit event | `coach.html` → Click event → "Edit" |
| Manage roster | Event Dashboard → Round → "Manage Roster" |
| Create bracket | Event Dashboard → "Create Bracket" |
| Verify scorecards | `coach.html` → "Verify Scorecards" button |
| View results | Event Dashboard → "View Results" |
| Export data | `coach.html` → "Export CSV" |
| Admin tools | Footer → "Admin" |

### Archer Tasks:
| Task | Location |
|------|----------|
| Join event | `index.html` → Scan QR or enter code |
| Select profile | After entering code → Select from list |
| Score ranking round | `ranking_round_300.html` |
| View ranking results | Ranking Round → "Results" tab |
| View my matches | `index.html` → "My Matches" section |
| Score solo match | `solo_card.html` |
| Score team match | `team_card.html` |
| View bracket | `bracket_results.html` (link from home) |
| View history | `archer_history.html` |

---

## 🔄 Event Status Lifecycle

```
PLANNED
  ↓
  └─ Coach creates event
  └─ Adds archers to ranking rounds
  └─ Assigns bales
  └─ Event ready but not started
  
ACTIVE (Day of Event)
  ↓
  └─ Coach changes status to Active
  └─ Archers can scan QR code
  └─ Scoring begins
  └─ Ranking rounds in progress
  └─ Brackets created and matches scored
  └─ Verification ongoing
  
COMPLETED (After Event)
  ↓
  └─ All rounds verified
  └─ All matches verified
  └─ Winners determined
  └─ Coach changes status to Completed
  └─ Historical record archived
```

---

## 📱 Typical Event Timeline

### **Week Before Event:**
- Coach creates event (Planned)
- Coach adds archers from roster
- Coach assigns bales (auto-assign)
- Coach shares entry code with archers

### **Day of Event:**

**8:00 AM** - Setup
- Coach arrives, changes event to Active
- Displays QR code on projector
- Archers arrive and join event

**9:00 AM - 11:00 AM** - Ranking Rounds
- Archers score ranking rounds (30 arrows)
- Running leaderboard visible
- Archers submit scorecards

**11:00 AM - 12:00 PM** - Verification & Break
- Coach verifies all ranking scorecards
- Rankings finalized
- Lunch break

**12:00 PM** - Bracket Creation
- Coach creates elimination brackets
- Generates Top 8 from rankings
- Seeds calculated automatically

**12:30 PM - 3:00 PM** - Elimination Matches
- Quarter-Finals (4 matches)
- Semi-Finals (2 matches)
- Finals (1 match)
- Coach verifies after each match
- Winners auto-advance

**3:00 PM - 3:30 PM** - Finals & Awards
- Championship match
- Coach verifies final match
- Winners announced
- Awards ceremony

**3:30 PM** - Event Complete
- Coach changes event to Completed
- Results finalized
- Historical record saved

---

## 🎓 Best Practices

### For Coaches:
1. **Create events days in advance** - Don't wait until day-of
2. **Use auto-assign bales** - Faster than manual, less confusion
3. **Test the QR code** - Make sure it works before event
4. **Verify scorecards promptly** - Don't let them pile up
5. **Generate brackets only after all ranking verified** - Ensure accurate seeding
6. **Monitor "My Matches" dashboard** - See what archers see
7. **Use "Manage Roster"** - Add/remove archers after event creation
8. **Export data regularly** - Backup results

### For Archers:
1. **Test app before event** - Make sure you can access it
2. **Bring paper card** - Required for verification
3. **Sign paper card** - Coach needs signature
4. **Submit promptly** - Don't hold up verification
5. **Check "My Matches"** - See upcoming bracket matches
6. **Arrive on time for bracket matches** - Don't miss your match
7. **Confirm with opponent** - Both must confirm before scoring

---

## 🚨 Common Issues & Solutions

### "Can't access event"
- ✅ Check entry code is correct
- ✅ Event must be Active status
- ✅ Try manual entry if QR doesn't work

### "Can't find my profile"
- ✅ Search by first or last name
- ✅ Profile must exist in master list
- ✅ Ask coach to add you if not found

### "Bale is full"
- ✅ Only 4 archers per bale (A, B, C, D)
- ✅ Choose different bale
- ✅ Ask coach if auto-assigned wrong

### "Can't submit scorecard"
- ✅ Must complete all 30 arrows
- ✅ Check for missing scores
- ✅ Verify end totals calculated

### "Match opponent not showing up"
- ✅ Check match time/target
- ✅ Verify opponent confirmed
- ✅ Ask coach if issue persists

### "Bracket not generating"
- ✅ Verify ranking rounds are verified (not just completed)
- ✅ Check minimum 8 archers in division
- ✅ Check division codes match (BV vs BVAR)

---

## 📊 Event Types

### **Type 1: Ranking Only**
- Phases: 1-4 only
- Just ranking rounds
- No brackets or matches
- Fastest event type (2-3 hours)

### **Type 2: Ranking + Elimination**
- Phases: 1-8
- Ranking rounds + Top 8 brackets
- Traditional tournament format
- Typical event (4-5 hours)

### **Type 3: Ranking + Swiss**
- Phases: 1-8
- Ranking rounds + Swiss brackets
- More matches per archer
- Longer event (5-6 hours)

### **Type 4: Full Tournament**
- Phases: 1-8
- Ranking + Solo Elimination + Team Elimination + Swiss
- Complete OAS tournament
- Full day event (6-8 hours)

---

## 🔗 Related Documentation

- **Technical Details:** `docs/planning/Feature_EventPlanning_Product.md`
- **Bracket Workflow:** `planning/bracket_workflow_v2.md`
- **Authentication:** `docs/core/AUTHENTICATION_FLOWS.md`
- **Architecture:** `docs/core/APP_ARCHITECTURE_AND_INTEGRATION_STRATEGY.md`
- **API Endpoints:** `docs/implementation/PHASE2_API_ENDPOINTS.md`
- **Verification:** See various scorecard workflow docs

---

## 🎉 Summary

### Coach Role = Event Orchestrator
- Creates and configures events
- Manages rosters and assignments
- Verifies all scores and matches
- Controls event lifecycle
- Generates reports

### Archer Role = Competitor
- Joins events
- Scores rounds and matches
- Views results and standings
- Challenges opponents (Swiss Open)
- Focuses on competition

### Event Flow = Linear Progression
- Planning → Setup → Ranking → Verification → Brackets → Matches → Completion
- Each phase builds on previous phase
- Coach gates progression through verification
- Database is source of truth
- Archers and coaches collaborate to complete event

---

**This document is the comprehensive guide for understanding WDV Archery Suite event management.**

---

**Last Updated:** 2026-02-07  
**Status:** ✅ COMPLETE  
**Audience:** Coaches, Archers, Developers, Documentation
