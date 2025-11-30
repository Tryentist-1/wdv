# Phase 2 Authentication Strategy for Solo/Team Matches

**Date:** November 17, 2025  
**Status:** Planning Document  
**Issue:** Solo/Team match endpoints require authentication, but standalone matches have no event code

---

## Problem Statement

### Current Situation
- **Solo/Team match endpoints** require `require_api_key()` authentication
- **Authentication options:**
  1. Coach API key/passcode (`wdva26`) - Archers don't have this
  2. Event entry code - Only works if match is linked to an event
- **Solo matches can be:**
  - **Linked to event** (`eventId` provided) - Should use event entry code ✅
  - **Standalone/practice** (`eventId` is null) - No auth available ❌

### Error Encountered
```
[LiveUpdates] No coach key or entry code available; request may fail.
Failed to load resource: the server responded with a status of 401 ()
Live Updates unauthorized
Failed to start match: Error: Unauthorized
```

---

## Solution Options

### Option A: Match Code Authentication (RECOMMENDED) ⭐

**Concept:** Generate a unique match code when creating a match, similar to event entry codes.

**Implementation:**
1. Add `match_code` column to `solo_matches` and `team_matches` tables
2. Generate unique code on match creation (e.g., `SOLO-ABC123`)
3. Extend `require_api_key()` to accept match codes
4. Store match code in localStorage for subsequent requests
5. Frontend sends match code in `X-Passcode` header

**Pros:**
- ✅ Works for both event-linked and standalone matches
- ✅ Consistent with event code pattern
- ✅ Secure (unique per match)
- ✅ Allows match-specific access control

**Cons:**
- ⚠️ Requires database schema change
- ⚠️ Need to handle match code lookup in auth function

**Files to Modify:**
- `api/sql/migration_phase2_solo_team_matches.sql` - Add `match_code` columns
- `api/db.php` - Extend `require_api_key()` to check match codes
- `api/index.php` - Generate match codes on creation
- `js/live_updates.js` - Store and send match codes
- `js/solo_card.js` - Store match code after creation

---

### Option B: Relaxed Auth for Standalone Matches

**Concept:** Allow public creation of standalone matches, but require auth for updates.

**Implementation:**
1. Make `POST /v1/solo-matches` public if `eventId` is null
2. Require match ownership verification for score submission
3. Use match ID + device fingerprint for ownership

**Pros:**
- ✅ No schema changes needed
- ✅ Simple implementation

**Cons:**
- ❌ Less secure (anyone can create matches)
- ❌ No access control for viewing matches
- ❌ Doesn't align with existing auth patterns

---

### Option C: Event Code Required

**Concept:** Require all matches to be linked to an event.

**Implementation:**
1. Make `eventId` required (not nullable)
2. Create a "Practice" event with a public entry code
3. All matches use event code authentication

**Pros:**
- ✅ Uses existing auth system
- ✅ No code changes needed

**Cons:**
- ❌ Forces all matches into event structure
- ❌ Less flexible for casual practice
- ❌ Doesn't match user expectations

---

## Recommended Solution: Option A (Match Code Authentication)

### Implementation Plan

#### Step 1: Database Schema Update
Add `match_code` columns to both tables:

```sql
ALTER TABLE solo_matches 
ADD COLUMN match_code VARCHAR(20) NULL UNIQUE COMMENT 'Unique access code for this match';

ALTER TABLE team_matches 
ADD COLUMN match_code VARCHAR(20) NULL UNIQUE COMMENT 'Unique access code for this match';
```

#### Step 2: Match Code Generation
Create helper function to generate unique codes:

```php
function generate_match_code(PDO $pdo, string $prefix = 'SOLO'): string {
    do {
        $code = $prefix . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
        $stmt = $pdo->prepare('SELECT id FROM solo_matches WHERE match_code = ? LIMIT 1');
        $stmt->execute([$code]);
    } while ($stmt->fetch());
    return $code;
}
```

#### Step 3: Extend Authentication Function
Update `api/db.php::require_api_key()`:

```php
function require_api_key(): void {
    $key = $_SERVER['HTTP_X_API_KEY'] ?? '';
    $pass = $_SERVER['HTTP_X_PASSCODE'] ?? '';
    
    // ... existing coach key/passcode check ...
    
    // Check event entry code
    if (!$authorized && strlen($pass) > 0) {
        try {
            $pdo = db();
            // Check events table
            $stmt = $pdo->prepare('SELECT id FROM events WHERE LOWER(entry_code) = LOWER(?) LIMIT 1');
            $stmt->execute([$pass]);
            if ($stmt->fetch()) {
                $authorized = true;
            } else {
                // Check solo matches
                $stmt = $pdo->prepare('SELECT id FROM solo_matches WHERE LOWER(match_code) = LOWER(?) LIMIT 1');
                $stmt->execute([$pass]);
                if ($stmt->fetch()) {
                    $authorized = true;
                } else {
                    // Check team matches
                    $stmt = $pdo->prepare('SELECT id FROM team_matches WHERE LOWER(match_code) = LOWER(?) LIMIT 1');
                    $stmt->execute([$pass]);
                    $authorized = (bool)$stmt->fetch();
                }
            }
        } catch (Exception $e) {
            // fall through to unauthorized
        }
    }
    
    if (!$authorized) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
}
```

#### Step 4: Generate Codes on Match Creation
Update `POST /v1/solo-matches`:

```php
if (preg_match('#^/v1/solo-matches$#', $route) && $method === 'POST') {
    require_api_key(); // Still require auth to create (event code or coach)
    // ... existing code ...
    
    $matchCode = generate_match_code($pdo, 'SOLO');
    $stmt = $pdo->prepare('INSERT INTO solo_matches (id, event_id, match_code, date, location, max_sets, status, created_at) VALUES (?, ?, ?, ?, ?, ?, "Not Started", NOW())');
    $stmt->execute([$matchId, $eventId, $matchCode, $date, $location, $maxSets]);
    
    json_response(['matchId' => $matchId, 'matchCode' => $matchCode], 201);
}
```

#### Step 5: Frontend Integration
Update `js/live_updates.js`:

```javascript
function ensureSoloMatch({ date, location, eventId, maxSets = 5 }) {
    // ... existing caching logic ...
    
    return request('/solo-matches', 'POST', { date, location, eventId, maxSets })
        .then(json => {
            if (!json || !json.matchId) {
                throw new Error('Solo match creation failed: missing matchId');
            }
            state.soloMatchId = json.matchId;
            state.soloEventId = eventId;
            
            // Store match code for future requests
            if (json.matchCode) {
                localStorage.setItem(`solo_match_code:${json.matchId}`, json.matchCode);
                // Also store in request state for immediate use
                state.soloMatchCode = json.matchCode;
            }
            
            localStorage.setItem(matchKey, JSON.stringify({ 
                matchId: json.matchId, 
                eventId, 
                date,
                matchCode: json.matchCode 
            }));
            return json.matchId;
        });
}
```

Update `request()` function to check for match codes:

```javascript
async function request(path, method = 'GET', body = null) {
    // ... existing coach key check ...
    
    if (!headers['X-Passcode']) {
        // Check for event entry code (existing logic)
        // ...
        
        // Check for solo match code
        if (path.includes('/solo-matches/')) {
            const matchIdMatch = path.match(/\/solo-matches\/([0-9a-f-]+)/);
            if (matchIdMatch) {
                const matchId = matchIdMatch[1];
                let matchCode = localStorage.getItem(`solo_match_code:${matchId}`);
                if (!matchCode) {
                    // Try to get from cached match data
                    const cached = localStorage.getItem(`solo_match:${state.soloEventId || 'standalone'}:${date}`);
                    if (cached) {
                        const cachedData = JSON.parse(cached);
                        matchCode = cachedData.matchCode;
                    }
                }
                if (matchCode) {
                    headers['X-Passcode'] = matchCode;
                    console.log('[LiveUpdates] Using solo match code for request.');
                }
            }
        }
        
        // Similar for team matches...
    }
    
    // ... rest of request function ...
}
```

---

## Alternative: Hybrid Approach

If we want to support both patterns:

1. **Event-linked matches:** Use event entry code (existing)
2. **Standalone matches:** Use match code (new)

Frontend logic:
```javascript
// In ensureSoloMatch()
if (eventId) {
    // Use event entry code (existing logic)
    // Match code still generated but not required
} else {
    // Standalone match - require match code
    // Store and use match code for all subsequent requests
}
```

---

## Testing Plan

1. **Standalone Match Creation:**
   - Create match without eventId
   - Verify match code is generated and returned
   - Verify match code is stored in localStorage
   - Verify subsequent requests use match code

2. **Event-Linked Match Creation:**
   - Create match with eventId
   - Verify event entry code still works
   - Verify match code is optional but available

3. **Score Submission:**
   - Submit scores using match code
   - Verify authentication succeeds
   - Verify scores are saved correctly

4. **Match Retrieval:**
   - Retrieve match using match code
   - Verify data is returned correctly

---

## Migration Notes

- **Backward Compatibility:** Existing matches without codes will need migration
- **Code Generation:** Ensure uniqueness across both solo and team matches
- **Code Format:** Use prefix to distinguish (SOLO-XXX, TEAM-XXX)

---

## Decision Required

**Which approach should we implement?**

1. ✅ **Option A: Match Code Authentication** (Recommended)
2. ⚠️ **Option B: Relaxed Auth**
3. ❌ **Option C: Event Code Required**

**Recommendation:** Option A provides the best balance of security, flexibility, and consistency with existing patterns.

