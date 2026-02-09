# How to Seed Test Data for Bracket Testing

**Purpose:** Generate completed ranking round scores so you can test bracket seeding

---

## 📝 The Script

**Location:** `api/seed_test_data.php`

**What it does:**
1. Finds an event by name (default: "Hybrid Event Final")
2. Gets all R300 ranking rounds for that event
3. Finds all active archers from HRO and HST schools
4. Assigns them to appropriate division rounds based on gender/level
5. **Generates random scores** for all 10 ends (3 arrows each)
6. Marks scorecards as **completed and verified**
7. Calculates running totals, 10s, Xs

---

## 🚀 How to Use

### Step 1: Create an event with ranking rounds
```
1. Go to http://localhost:8001/coach.html
2. Click "Create Event"
3. Name: "Test Bracket Event"
4. Check: OPEN, Boys Varsity, Girls Varsity
5. Click "Create Event"
6. For each division:
   - Skip adding archers (click Cancel)
   - Or add a few if you want
7. Event created with empty rounds
```

### Step 2: Edit the script to use your event name
```bash
# Open api/seed_test_data.php
# Line 16: Change event name to match yours

$eventName = 'Test Bracket Event'; // Change this to your event name
```

### Step 3: Run the script
```bash
# From project root
cd /Users/terry/makeitso/wdv
php api/seed_test_data.php
```

### Expected Output:
```
DSN: mysql:host=localhost;port=3306;dbname=wdv;charset=utf8mb4
Seeding Test Data for HRO and HST schools...
Found Event: Test Bracket Event (abc123-...)
All Rounds found:
Array(...)
R300 Rounds:
Array(...)
Found 45 active archers from HRO/HST.
Assigned and Scored: John Doe -> BVAR (245)
Assigned and Scored: Jane Smith -> GVAR (268)
Assigned and Scored: Bob Jones -> BJV (189)
...
Done. Assigned 45 archers.
```

### Step 4: Verify in UI
```
1. Go to event dashboard
2. Click on any round
3. You should see archers with completed scores
4. View results to see rankings
```

---

## 🎯 What Gets Generated

### Scores:
- **Varsity archers:** Random scores between 6-10 per arrow (180-300 total)
- **JV archers:** Random scores between 3-9 per arrow (90-270 total)
- **10 ends** of 3 arrows each
- **10s and Xs** counted automatically
- **Running totals** calculated

### Archer Assignment:
- Boys Varsity → BVAR round
- Girls Varsity → GVAR round
- Boys JV/Beginner → BJV round
- Girls JV/Beginner → GJV round
- Fallback to OPEN if division doesn't exist

### Status:
- `completed = 1`
- `verified_at = NOW()`
- `card_status = 'VER'`
- Ready for bracket seeding!

---

## 🔧 Customization Options

### Change Schools
```php
// Line 48
$schools = ['HRO', 'HST']; // Add more schools
```

### Change Event Name
```php
// Line 16
$eventName = 'Your Event Name Here';
```

### Change Score Ranges
```php
// Line 114-115
$minScore = ($archer['level'] === 'VAR') ? 6 : 3;
// Increase min score for better scores
```

### Manually Control Scores
You can edit the script to give specific archers specific scores for testing seeding logic.

---

## 🧪 Testing Bracket Seeding

### After running the script:

#### 1. Check Rankings
```
1. Go to event dashboard
2. View results for each division
3. Verify Top 8 archers have good scores
4. Note the rankings (1st, 2nd, 3rd, etc.)
```

#### 2. Create Elimination Bracket
```
1. Edit event
2. Click "Create Bracket"
3. Type: Solo
4. Format: Elimination (Top 8)
5. Division: Boys Varsity
6. Click "Create Bracket"
```

#### 3. Generate from Top 8
```
1. Click "Edit" on the bracket
2. Click "🎯 Generate from Top 8"
3. Should populate:
   - Seed 1 vs Seed 8
   - Seed 2 vs Seed 7
   - Seed 3 vs Seed 6
   - Seed 4 vs Seed 5
```

#### 4. Verify Seeding
```
- Check that archers are seeded correctly
- Verify names and schools match
- Check bracket results page shows matches
```

---

## 🐛 Troubleshooting

### "Event not found"
```
- Check event name exactly matches (case-sensitive)
- Or change line 17 to ORDER BY created_at DESC LIMIT 1
  to use most recent event
```

### "No rounds found"
```
- Make sure you created ranking rounds (R300)
- Check rounds table: SELECT * FROM rounds WHERE event_id = 'xxx'
```

### "No archers found"
```
- Make sure you have archers from HRO or HST schools
- Check archers table: SELECT * FROM archers WHERE school IN ('HRO', 'HST')
- Add more schools to $schools array
```

### Script fails midway
```
- Check MySQL connection
- Look for error messages in output
- Check database permissions
```

---

## 📊 Quick Test Recipe

**Goal:** Test elimination bracket seeding in 5 minutes

```bash
# 1. Create event with ranking rounds
# (via UI - takes 2 minutes)

# 2. Update script
sed -i '' 's/Hybrid Event Final/Test Bracket Event/g' api/seed_test_data.php

# 3. Run script
php api/seed_test_data.php

# 4. Verify in browser
# - Check event dashboard
# - See completed scores
# - Create elimination bracket
# - Generate from Top 8
# - View bracket results

# Done! 🎉
```

---

## 🔮 Future Enhancements

Could add to this script:
- Command-line arguments for event name
- Option to specify number of archers
- Option to control score distribution
- Generate team scores for team brackets
- Seed Swiss bracket entries
- Generate some completed matches

---

**Last Updated:** 2026-02-07  
**Status:** ✅ WORKING  
**Location:** `api/seed_test_data.php`
