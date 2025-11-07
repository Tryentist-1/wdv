<?php
require_once __DIR__ . '/db.php';

cors();

$genUuid = function(): string {
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40); // version 4
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80); // variant
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
};

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$base = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
$route = '/' . ltrim(substr($path, strlen($base)), '/');
// Remove script name from route if present (for local dev with PHP built-in server)
$scriptName = basename($_SERVER['SCRIPT_NAME']);
if (strpos($route, $scriptName) === 1) {
    $route = '/' . ltrim(substr($route, strlen('/' . $scriptName)), '/');
}

// Basic router
if ($route === '/v1/health') {
    $key = $_SERVER['HTTP_X_API_KEY'] ?? '';
    $pass = $_SERVER['HTTP_X_PASSCODE'] ?? '';
    json_response(['ok' => true, 'time' => time(), 'hasApiKey' => !!$key, 'hasPass' => !!$pass]);
    exit;
}

// Archer history endpoint (PUBLIC - archers can view their own history)
if (preg_match('#^/v1/archers/([0-9a-f-]+)/history$#i', $route, $m) && $method === 'GET') {
    $archerId = $m[1];
    $pdo = db();
    
    // Get archer info
    $archer = $pdo->prepare('SELECT id, ext_id, first_name, last_name, school, level, gender FROM archers WHERE id = ? OR ext_id = ? LIMIT 1');
    $archer->execute([$archerId, $archerId]);
    $archerData = $archer->fetch();
    
    if (!$archerData) {
        json_response(['error' => 'Archer not found'], 404);
        exit;
    }
    
    // Get all rounds this archer participated in
    $rounds = $pdo->prepare('
        SELECT 
            e.id AS event_id,
            e.name AS event_name,
            e.date AS event_date,
            r.id AS round_id,
            r.division,
            r.round_type,
            ra.id AS round_archer_id,
            ra.archer_id,
            ra.bale_number,
            ra.target_assignment,
            MAX(ee.running_total) AS final_score,
            COUNT(DISTINCT ee.end_number) AS ends_completed,
            SUM(ee.tens) AS total_tens,
            SUM(ee.xs) AS total_xs
        FROM round_archers ra
        JOIN rounds r ON r.id = ra.round_id
        LEFT JOIN events e ON e.id = r.event_id
        LEFT JOIN end_events ee ON ee.round_archer_id = ra.id
        WHERE ra.archer_id = ?
        GROUP BY ra.id, e.id, e.name, e.date, r.id, r.division, r.round_type, ra.archer_id, ra.bale_number, ra.target_assignment
        ORDER BY e.date DESC, e.name
    ');
    $rounds->execute([$archerData['id']]);
    $history = $rounds->fetchAll();
    
    json_response([
        'archer' => [
            'id' => $archerData['id'],
            'extId' => $archerData['ext_id'],
            'firstName' => $archerData['first_name'],
            'lastName' => $archerData['last_name'],
            'fullName' => trim($archerData['first_name'] . ' ' . $archerData['last_name']),
            'school' => $archerData['school'],
            'level' => $archerData['level'],
            'gender' => $archerData['gender']
        ],
        'history' => $history,
        'totalRounds' => count($history)
    ]);
    exit;
}

// Diagnostic endpoint: Check round/archer state
if (preg_match('#^/v1/debug/round/([0-9a-f-]+)$#i', $route, $m) && $method === 'GET') {
    $roundId = $m[1];
    $pdo = db();
    
    $round = $pdo->prepare('SELECT id, round_type, date, bale_number, division, event_id FROM rounds WHERE id=?');
    $round->execute([$roundId]);
    $roundData = $round->fetch();
    
    if (!$roundData) {
        json_response(['error' => 'Round not found'], 404);
        exit;
    }
    
    $archers = $pdo->prepare('SELECT id, archer_name, bale_number, target_assignment FROM round_archers WHERE round_id=?');
    $archers->execute([$roundId]);
    $archersData = $archers->fetchAll();
    
    $ends = $pdo->prepare('SELECT round_archer_id, end_number, end_total, running_total FROM end_events WHERE round_id=? ORDER BY end_number');
    $ends->execute([$roundId]);
    $endsData = $ends->fetchAll();
    
    json_response([
        'round' => $roundData,
        'archers' => $archersData,
        'ends' => $endsData,
        'stats' => [
            'archerCount' => count($archersData),
            'endCount' => count($endsData)
        ]
    ]);
    exit;
}

// Helpers
$slugify = function(string $s): string {
    $s = strtolower($s);
    $s = preg_replace('/\s+/', '-', $s);
    $s = preg_replace('/[^a-z0-9\-]/', '', $s);
    $s = preg_replace('/-+/', '-', $s);
    return trim($s, '-');
};

function decode_lock_history(?string $raw): array {
    if (!$raw) return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function process_round_archer_verification(PDO $pdo, string $roundArcherId, string $action, string $verifiedBy = '', string $notes = ''): array {
    $stmt = $pdo->prepare('SELECT ra.*, r.event_id FROM round_archers ra JOIN rounds r ON r.id = ra.round_id WHERE ra.id = ? LIMIT 1');
    $stmt->execute([$roundArcherId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        throw new Exception('Scorecard not found', 404);
    }

    if (empty($row['event_id'])) {
        throw new Exception('Practice scorecards are not part of verification workflow', 400);
    }

    $action = strtolower($action);
    $actor = $verifiedBy !== '' ? $verifiedBy : 'Coach';
    $timestamp = date('Y-m-d H:i:s');
    $history = decode_lock_history($row['lock_history'] ?? null);

    if (!in_array($action, ['lock', 'unlock', 'void'], true)) {
        throw new Exception('Invalid action', 400);
    }

    if ($action === 'lock') {
        if ((bool)$row['locked']) {
            throw new Exception('Scorecard already locked', 409);
        }
        $countStmt = $pdo->prepare('SELECT COUNT(*) FROM end_events WHERE round_archer_id = ?');
        $countStmt->execute([$roundArcherId]);
        if ((int)$countStmt->fetchColumn() === 0) {
            throw new Exception('Cannot verify an empty scorecard', 409);
        }
        $history[] = ['action' => 'lock', 'actor' => $actor, 'timestamp' => $timestamp];
        $update = $pdo->prepare('UPDATE round_archers SET locked = 1, completed = 1, card_status = ?, verified_by = ?, verified_at = ?, notes = ?, lock_history = ? WHERE id = ?');
        $newNotes = ($notes !== '') ? $notes : ($row['notes'] ?? null);
        $update->execute(['VER', $actor, $timestamp, $newNotes, json_encode($history), $roundArcherId]);
    } elseif ($action === 'unlock') {
        if (!(bool)$row['locked'] && $row['card_status'] !== 'VOID') {
            throw new Exception('Scorecard is not locked', 409);
        }
        $history[] = ['action' => 'unlock', 'actor' => $actor, 'timestamp' => $timestamp];
        $update = $pdo->prepare('UPDATE round_archers SET locked = 0, completed = 0, card_status = ?, verified_by = NULL, verified_at = NULL, notes = ?, lock_history = ? WHERE id = ?');
        $newNotes = ($notes !== '') ? $notes : ($row['notes'] ?? null);
        $update->execute(['PENDING', $newNotes, json_encode($history), $roundArcherId]);
    } else { // void
        $history[] = ['action' => 'void', 'actor' => $actor, 'timestamp' => $timestamp];
        $update = $pdo->prepare('UPDATE round_archers SET locked = 1, completed = 1, card_status = ?, verified_by = ?, verified_at = ?, notes = ?, lock_history = ? WHERE id = ?');
        $voidNotes = ($notes !== '') ? $notes : 'VOID';
        $update->execute(['VOID', $actor, $timestamp, $voidNotes, json_encode($history), $roundArcherId]);
    }

    $refetch = $pdo->prepare('SELECT ra.id, ra.round_id, ra.locked, ra.card_status, ra.verified_by, ra.verified_at, ra.notes, ra.lock_history FROM round_archers ra WHERE ra.id = ? LIMIT 1');
    $refetch->execute([$roundArcherId]);
    $updated = $refetch->fetch(PDO::FETCH_ASSOC);
    $updated['lock_history'] = decode_lock_history($updated['lock_history'] ?? null);
    return $updated;
}

// Normalize archer field values
$normalizeArcherField = function($field, $value) {
    if ($value === null || $value === '') return null;
    
    switch ($field) {
        case 'gender':
            $v = strtoupper(trim($value));
            return in_array($v, ['M', 'F']) ? $v : 'M';
        case 'level':
            $v = strtoupper(trim($value));
            return in_array($v, ['VAR', 'JV', 'BEG']) ? $v : 'VAR';
        case 'status':
            $v = strtolower(trim($value));
            return in_array($v, ['active', 'inactive']) ? $v : 'active';
        case 'school':
            return strtoupper(substr(trim($value), 0, 3)) ?: 'UNK';
        case 'grade':
            $v = strtoupper(trim($value));
            return in_array($v, ['9', '10', '11', '12', 'GRAD']) ? $v : null;
        case 'domEye':
        case 'domHand':
            $v = strtoupper(trim($value));
            return in_array($v, ['RT', 'LT']) ? $v : null;
        case 'limbLength':
            $v = strtoupper(trim($value));
            return in_array($v, ['S', 'M', 'L']) ? $v : null;
        case 'heightIn':
        case 'wingspanIn':
            return is_numeric($value) ? (int)$value : null;
        case 'drawLengthSugg':
        case 'riserHeightIn':
        case 'limbWeightLbs':
            return is_numeric($value) ? (float)$value : null;
        case 'jvPr':
        case 'varPr':
            return is_numeric($value) ? (int)$value : null;
        case 'email':
        case 'phone':
        case 'usArcheryId':
            return trim($value) ?: null;
        case 'faves':
            if (is_array($value)) return json_encode($value);
            if (is_string($value)) return $value;
            return null;
        default:
            return trim($value) ?: null;
    }
};

// Smart matching: Find existing archer by multiple criteria
$findExistingArcher = function($pdo, $data) use ($slugify) {
    // Priority 1: UUID (if provided and exists)
    if (!empty($data['id'])) {
        $stmt = $pdo->prepare('SELECT id FROM archers WHERE id = ? LIMIT 1');
        $stmt->execute([$data['id']]);
        if ($row = $stmt->fetch()) return $row['id'];
    }
    
    // Priority 2: extId
    if (!empty($data['extId'])) {
        $stmt = $pdo->prepare('SELECT id FROM archers WHERE ext_id = ? LIMIT 1');
        $stmt->execute([$data['extId']]);
        if ($row = $stmt->fetch()) return $row['id'];
    }
    
    // Priority 3: email (if unique)
    if (!empty($data['email'])) {
        $email = trim($data['email']);
        $stmt = $pdo->prepare('SELECT id FROM archers WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        if ($row = $stmt->fetch()) {
            // Verify uniqueness
            $count = $pdo->prepare('SELECT COUNT(*) FROM archers WHERE email = ?');
            $count->execute([$email]);
            if ($count->fetchColumn() == 1) return $row['id'];
        }
    }
    
    // Priority 4: phone (if unique)
    if (!empty($data['phone'])) {
        $phone = trim($data['phone']);
        $stmt = $pdo->prepare('SELECT id FROM archers WHERE phone = ? LIMIT 1');
        $stmt->execute([$phone]);
        if ($row = $stmt->fetch()) {
            $count = $pdo->prepare('SELECT COUNT(*) FROM archers WHERE phone = ?');
            $count->execute([$phone]);
            if ($count->fetchColumn() == 1) return $row['id'];
        }
    }
    
    // Priority 5: first_name + last_name + school
    $firstName = trim($data['firstName'] ?? $data['first'] ?? '');
    $lastName = trim($data['lastName'] ?? $data['last'] ?? '');
    $school = trim($data['school'] ?? '');
    if ($firstName && $lastName && $school) {
        $stmt = $pdo->prepare('SELECT id FROM archers WHERE first_name = ? AND last_name = ? AND school = ? LIMIT 1');
        $stmt->execute([$firstName, $lastName, strtoupper(substr($school, 0, 3))]);
        if ($row = $stmt->fetch()) return $row['id'];
    }
    
    // Priority 6: first_name + last_name (if unique)
    if ($firstName && $lastName) {
        $stmt = $pdo->prepare('SELECT id FROM archers WHERE first_name = ? AND last_name = ? LIMIT 1');
        $stmt->execute([$firstName, $lastName]);
        if ($row = $stmt->fetch()) {
            $count = $pdo->prepare('SELECT COUNT(*) FROM archers WHERE first_name = ? AND last_name = ?');
            $count->execute([$firstName, $lastName]);
            if ($count->fetchColumn() == 1) return $row['id'];
        }
    }
    
    return null; // No match found
};

// Bale Assignment Algorithm
// Distributes archers across bales (2-4 per bale, no singles, continuous numbering)
$assignArchersToBales = function(array $archers, int $startBaleNumber = 1): array {
    $total = count($archers);
    if ($total === 0) return [];
    
    $assignments = [];
    $baleNum = $startBaleNumber;
    $remaining = $archers;
    
    while (count($remaining) > 0) {
        $baleSize = 4; // Default to 4 per bale
        
        if (count($remaining) === 1) {
            // Single archer - add to previous bale if possible
            if (!empty($assignments) && count($assignments[count($assignments) - 1]) < 4) {
                $assignments[count($assignments) - 1][] = array_shift($remaining);
                continue;
            } else {
                // Edge case: single archer with no previous bale (shouldn't happen in practice)
                $baleSize = 1;
            }
        } elseif (count($remaining) === 2) {
            $baleSize = 2;
        } elseif (count($remaining) === 3) {
            $baleSize = 3;
        } elseif (count($remaining) === 5) {
            $baleSize = 3; // Split 5 as 3+2
        } elseif (count($remaining) >= 4) {
            $baleSize = 4;
        }
        
        $baleArchers = array_splice($remaining, 0, $baleSize);
        $assignments[] = $baleArchers;
        $baleNum++;
    }
    
    return $assignments;
};

// Get division code from gender + level
$getDivisionCode = function(string $gender, string $level): string {
    $g = strtoupper($gender);
    $l = strtoupper($level);
    if ($g === 'M' && $l === 'VAR') return 'BVAR';
    if ($g === 'M' && $l === 'JV') return 'BJV';
    if ($g === 'F' && $l === 'VAR') return 'GVAR';
    if ($g === 'F' && $l === 'JV') return 'GJV';
    return 'UNKNOWN';
};

if (preg_match('#^/v1/rounds$#', $route) && $method === 'POST') {
    require_api_key();
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $roundType = $input['roundType'] ?? 'R300';
    $date = $input['date'] ?? date('Y-m-d');
    // NOTE: baleNumber removed from rounds table in Phase 0 migration
    $division = $input['division'] ?? null;  // e.g., BJV, GJV, OPEN
    $gender = $input['gender'] ?? null;      // M/F
    $level = $input['level'] ?? null;        // VAR/JV
    $eventId = $input['eventId'] ?? null;    // Link round to event
    try {
        $pdo = db();
        // Check if round already exists (by eventId + division)
        $row = null;
        
        // Strategy 1: If eventId and division provided, find by eventId + division
        if ($eventId && $division) {
            $existing = $pdo->prepare('SELECT id, event_id FROM rounds WHERE event_id=? AND division=? LIMIT 1');
            $existing->execute([$eventId, $division]);
            $row = $existing->fetch();
            error_log("Round lookup: eventId=$eventId, division=$division -> " . ($row ? "FOUND " . $row['id'] : "NOT FOUND"));
        }
        
        // Strategy 2: Fallback to date + division (legacy support)
        if (!$row && $division) {
            $existing = $pdo->prepare('SELECT id, event_id FROM rounds WHERE round_type=? AND date=? AND division=? LIMIT 1');
            $existing->execute([$roundType, $date, $division]);
            $row = $existing->fetch();
        }
        
        // Strategy 3: Last resort (date only - least reliable)
        if (!$row) {
            $existing = $pdo->prepare('SELECT id, event_id FROM rounds WHERE round_type=? AND date=? LIMIT 1');
            $existing->execute([$roundType, $date]);
            $row = $existing->fetch();
        }
        
        if ($row) {
            // Ensure round is linked to event if provided (Phase 0 uses event_id for snapshots)
            if ($eventId && $row['event_id'] !== $eventId) {
                try {
                    $linkExisting = $pdo->prepare('UPDATE rounds SET event_id=? WHERE id=?');
                    $linkExisting->execute([$eventId, $row['id']]);
                    error_log("Round REUSED (linked to event): " . $row['id'] . " -> " . $eventId);
                    $row['event_id'] = $eventId;
                } catch (Exception $e) {
                    error_log("Round reuse link failed: " . $e->getMessage());
                }
            } else {
                error_log("Round REUSED: " . $row['id']);
            }
            json_response(['roundId' => $row['id']], 200);
        } else {
            error_log("Round CREATING NEW: eventId=$eventId, division=$division");
            // Create new round (Phase 0: bale_number removed from schema)
            $id = $genUuid();
            $columns = ['id','round_type','date','created_at'];
            $values = [$id,$roundType,$date];
            $placeholders = ['?','?','?','NOW()'];
            // Optional columns
            if ($division !== null) { $columns[]='division'; $values[]=$division; $placeholders[]='?'; }
            if ($gender !== null) { $columns[]='gender'; $values[]=$gender; $placeholders[]='?'; }
            if ($level !== null) { $columns[]='level'; $values[]=$level; $placeholders[]='?'; }
            if ($eventId !== null) { $columns[]='event_id'; $values[]=$eventId; $placeholders[]='?'; }
            $sql = 'INSERT INTO rounds (' . implode(',', $columns) . ') VALUES (' . implode(',', $placeholders) . ')';
            $stmt = $pdo->prepare($sql);
            $stmt->execute($values);
            
            // If eventId not provided, try to link to most recent event for this date (fallback)
            if (!$eventId) {
                try {
                    $event = $pdo->prepare('SELECT id FROM events WHERE date=? ORDER BY created_at DESC LIMIT 1');
                    $event->execute([$date]);
                    $eventRow = $event->fetch();
                    if ($eventRow) {
                        $link = $pdo->prepare('UPDATE rounds SET event_id=? WHERE id=?');
                        $link->execute([$eventRow['id'], $id]);
                        error_log("Round $id auto-linked to event " . $eventRow['id']);
                    }
                } catch (Exception $e) {
                    // Ignore event linking errors
                    error_log("Event auto-link failed: " . $e->getMessage());
                }
            }
            
            json_response(['roundId' => $id], 201);
        }
    } catch (Exception $e) {
        error_log("Round creation failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

if (preg_match('#^/v1/rounds/([0-9a-f-]+)/archers$#i', $route, $m) && $method === 'POST') {
    require_api_key();
    $roundId = $m[1];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    // Support both new format (firstName/lastName) and legacy format (archerName)
    $firstName = trim($input['firstName'] ?? '');
    $lastName = trim($input['lastName'] ?? '');
    $extId = $input['extId'] ?? null; // Local archer ID for sync
    $legacyName = trim($input['archerName'] ?? '');
    
    // Parse legacy name if firstName/lastName not provided
    if (!$firstName && !$lastName && $legacyName) {
        $parts = explode(' ', $legacyName, 2);
        $firstName = $parts[0];
        $lastName = $parts[1] ?? '';
    }
    
    $school = $input['school'] ?? '';
    $level = $input['level'] ?? '';
    $gender = $input['gender'] ?? '';
    $target = $input['targetAssignment'] ?? '';
    $targetSize = $input['targetSize'] ?? null;
    $baleNumber = isset($input['baleNumber']) ? (int)$input['baleNumber'] : null;
    
    if ($firstName === '' && $lastName === '') { 
        json_response(['error' => 'firstName and lastName (or archerName) required'], 400); 
        exit; 
    }
    
    try {
        $pdo = db();
        
        // Ensure round exists
        $hasRound = $pdo->prepare('SELECT id FROM rounds WHERE id=?');
        $hasRound->execute([$roundId]);
        if (!$hasRound->fetch()) {
            json_response(['error' => 'Round not found'], 404);
            exit;
        }
        
        // --- CREATE OR FIND ARCHER IN MASTER TABLE FIRST ---
        $archerId = null;
        
        // 1. Try to find by ext_id (most reliable)
        if ($extId) {
            $stmt = $pdo->prepare('SELECT id FROM archers WHERE ext_id = ? LIMIT 1');
            $stmt->execute([$extId]);
            $archerRow = $stmt->fetch();
            if ($archerRow) {
                $archerId = $archerRow['id'];
            }
        }
        
        // 2. If not found, try to find by name + school (fuzzy match)
        if (!$archerId && $firstName && $lastName && $school) {
            $stmt = $pdo->prepare('SELECT id FROM archers WHERE first_name = ? AND last_name = ? AND school = ? LIMIT 1');
            $stmt->execute([$firstName, $lastName, $school]);
            $archerRow = $stmt->fetch();
            if ($archerRow) {
                $archerId = $archerRow['id'];
            }
        }
        
        // 3. If still not found, create new archer in master table
        if (!$archerId) {
            $archerId = $genUuid();
            $stmt = $pdo->prepare('INSERT INTO archers (id, ext_id, first_name, last_name, school, level, gender, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())');
            $stmt->execute([$archerId, $extId, $firstName, $lastName, $school, $level, $gender]);
        }
        
        // --- CHECK IF ROUND_ARCHER ALREADY EXISTS FOR THIS ARCHER IN THIS ROUND ---
        // DIAGNOSTIC: Log what we're looking for
        error_log("UPSERT CHECK: roundId=$roundId, archerId=$archerId, firstName=$firstName, lastName=$lastName, extId=$extId");
        
        // First, try to find by archer_id (most reliable)
        $existing = $pdo->prepare('SELECT id FROM round_archers WHERE round_id=? AND archer_id=? LIMIT 1');
        $existing->execute([$roundId, $archerId]);
        $existingRow = $existing->fetch();
        
        if ($existingRow) {
            error_log("UPSERT: Found existing by archer_id, UPDATING round_archer_id=" . $existingRow['id']);
        }
        
        // If not found, check for orphaned entry (archer_id IS NULL) by name match
        if (!$existingRow) {
            $archerName = trim("$firstName $lastName");
            $orphanCheck = $pdo->prepare('SELECT id FROM round_archers WHERE round_id=? AND archer_name=? AND archer_id IS NULL LIMIT 1');
            $orphanCheck->execute([$roundId, $archerName]);
            $existingRow = $orphanCheck->fetch();
            if ($existingRow) {
                error_log("UPSERT: Found orphaned entry by name, UPDATING and LINKING round_archer_id=" . $existingRow['id']);
            }
        }
        
        if ($existingRow) {
            // UPDATE existing scorecard with new bale/target info AND link to master archer
            $updateSql = 'UPDATE round_archers SET archer_id=?, target_assignment=?, bale_number=?, target_size=? WHERE id=?';
            $updateStmt = $pdo->prepare($updateSql);
            $updateStmt->execute([$archerId, $target, $baleNumber, $targetSize, $existingRow['id']]);
            
            json_response(['roundArcherId' => $existingRow['id'], 'archerId' => $archerId, 'updated' => true], 200);
            exit;
        }
        
        error_log("UPSERT: No existing entry found, CREATING new round_archers entry");
        
        // --- CREATE NEW ROUND_ARCHERS SCORECARD ---
        $roundArcherId = $genUuid();
        $archerName = trim("$firstName $lastName");
        
        if ($baleNumber !== null) {
            $stmt = $pdo->prepare('INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,NOW())');
            $stmt->execute([$roundArcherId, $roundId, $archerId, $archerName, $school, $level, $gender, $target, $targetSize, $baleNumber]);
        } else {
            $stmt = $pdo->prepare('INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, created_at) VALUES (?,?,?,?,?,?,?,?,?,NOW())');
            $stmt->execute([$roundArcherId, $roundId, $archerId, $archerName, $school, $level, $gender, $target, $targetSize]);
        }
        
        json_response(['roundArcherId' => $roundArcherId, 'archerId' => $archerId, 'created' => true], 201);
    } catch (Exception $e) {
        error_log("Archer creation failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// =====================================================
// PHASE 0: Bulk create archers for a bale group
// =====================================================
if (preg_match('#^/v1/rounds/([0-9a-f-]+)/archers/bulk$#i', $route, $m) && $method === 'POST') {
    require_api_key();
    $roundId = $m[1];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $baleNumber = isset($input['baleNumber']) ? (int)$input['baleNumber'] : null;
    $archers = $input['archers'] ?? [];
    
    if ($baleNumber === null || $baleNumber < 1) {
        json_response(['error' => 'baleNumber required (1-N)'], 400);
        exit;
    }
    
    if (!is_array($archers) || count($archers) === 0) {
        json_response(['error' => 'archers array required (1-8 archers)'], 400);
        exit;
    }
    
    if (count($archers) > 8) {
        json_response(['error' => 'Maximum 8 archers per bale group'], 400);
        exit;
    }
    
    try {
        $pdo = db();
        
        // Verify round exists
        $hasRound = $pdo->prepare('SELECT id FROM rounds WHERE id=? LIMIT 1');
        $hasRound->execute([$roundId]);
        if (!$hasRound->fetch()) {
            json_response(['error' => 'Round not found'], 404);
            exit;
        }
        
        $createdIds = [];
        $updated = 0;
        $created = 0;
        
        foreach ($archers as $archer) {
            $archerId = $archer['archerId'] ?? null;
            $firstName = trim($archer['firstName'] ?? '');
            $lastName = trim($archer['lastName'] ?? '');
            $targetAssignment = $archer['targetAssignment'] ?? null;
            $school = $archer['school'] ?? '';
            $level = $archer['level'] ?? '';
            $gender = $archer['gender'] ?? '';
            $targetSize = isset($archer['targetSize']) ? (int)$archer['targetSize'] : null;
            
            if (!$archerId || ($firstName === '' && $lastName === '')) {
                continue; // Skip invalid archers
            }
            
            // Find or create archer in master table
            $masterArcherId = null;
            
            // Try to find by archerId (cookie ID)
            $stmt = $pdo->prepare('SELECT id FROM archers WHERE id = ? OR ext_id = ? LIMIT 1');
            $stmt->execute([$archerId, $archerId]);
            $archerRow = $stmt->fetch();
            
            if ($archerRow) {
                $masterArcherId = $archerRow['id'];
            } else {
                // Create new master archer
                $masterArcherId = $genUuid();
                $stmt = $pdo->prepare('INSERT INTO archers (id, ext_id, first_name, last_name, school, level, gender, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())');
                $stmt->execute([$masterArcherId, $archerId, $firstName, $lastName, $school, $level, $gender]);
            }
            
            // Check if round_archer already exists (created by coach with NULL bale/target)
            // KEY FIX: Don't check bale_number in WHERE - coach creates with NULL, we UPDATE with actual value
            $existing = $pdo->prepare('SELECT id, bale_number, target_assignment FROM round_archers WHERE round_id=? AND archer_id=? LIMIT 1');
            $existing->execute([$roundId, $masterArcherId]);
            $existingRow = $existing->fetch();
            
            if ($existingRow) {
                // Update existing (this is the coach → archer handoff!)
                // Coach created with NULL bale/target, archer fills in actual values
                $updateSql = 'UPDATE round_archers SET target_assignment=?, target_size=?, archer_name=?, bale_number=? WHERE id=?';
                $archerName = trim("$firstName $lastName");
                $updateStmt = $pdo->prepare($updateSql);
                $updateStmt->execute([$targetAssignment, $targetSize, $archerName, $baleNumber, $existingRow['id']]);
                $createdIds[] = $existingRow['id'];
                $updated++;
                error_log("Updated round_archer {$existingRow['id']}: bale {$existingRow['bale_number']}→{$baleNumber}, target {$existingRow['target_assignment']}→{$targetAssignment}");
            } else {
                // Create new
                $roundArcherId = $genUuid();
                $archerName = trim("$firstName $lastName");
                $stmt = $pdo->prepare('INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,NOW())');
                $stmt->execute([$roundArcherId, $roundId, $masterArcherId, $archerName, $school, $level, $gender, $targetAssignment, $targetSize, $baleNumber]);
                $createdIds[] = $roundArcherId;
                $created++;
            }
        }
        
        json_response([
            'roundId' => $roundId,
            'baleNumber' => $baleNumber,
            'roundArcherIds' => $createdIds,
            'created' => $created,
            'updated' => $updated,
            'total' => count($createdIds)
        ], 201);
    } catch (Exception $e) {
        error_log("Bulk archer creation failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// =====================================================
// PHASE 0: Get all archers on a bale with their scorecards
// =====================================================
if (preg_match('#^/v1/rounds/([0-9a-f-]+)/bales/([0-9]+)/archers$#i', $route, $m) && $method === 'GET') {
    $roundId = $m[1];
    $baleNumber = (int)$m[2];
    
    try {
        $pdo = db();
        
        // Get round info
        $round = $pdo->prepare('SELECT id, division, round_type FROM rounds WHERE id=? LIMIT 1');
        $round->execute([$roundId]);
        $roundData = $round->fetch();
        
        if (!$roundData) {
            json_response(['error' => 'Round not found'], 404);
            exit;
        }
        
        // Get all archers on this bale
        $archers = $pdo->prepare('
            SELECT 
                ra.id as roundArcherId,
                ra.archer_id as archerId,
                a.first_name as firstName,
                a.last_name as lastName,
                a.school,
                a.level,
                a.gender,
                ra.target_assignment as targetAssignment,
                ra.target_size as targetSize,
                ra.bale_number as baleNumber
            FROM round_archers ra
            LEFT JOIN archers a ON a.id = ra.archer_id
            WHERE ra.round_id = ? AND ra.bale_number = ?
            ORDER BY ra.target_assignment
        ');
        $archers->execute([$roundId, $baleNumber]);
        $archerList = $archers->fetchAll();
        
        // Get scorecards for each archer
        $result = [];
        foreach ($archerList as $archer) {
            // Get all ends for this archer
            $ends = $pdo->prepare('
                SELECT 
                    end_number as endNumber,
                    a1, a2, a3,
                    end_total as endTotal,
                    running_total as runningTotal,
                    tens, xs,
                    server_ts as serverTs
                FROM end_events
                WHERE round_archer_id = ?
                ORDER BY end_number
            ');
            $ends->execute([$archer['roundArcherId']]);
            $endsList = $ends->fetchAll();
            
            // Calculate current end and totals
            // CRITICAL: Recalculate running total from actual arrow scores to ensure accuracy
            $currentEnd = 1;
            $runningTotal = 0;
            $totalTens = 0;
            $totalXs = 0;
            
            foreach ($endsList as $idx => $end) {
                $currentEnd = max($currentEnd, $end['endNumber'] + 1);
                
                // Recalculate end score from arrow values for accuracy
                $a1 = strtoupper(trim($end['a1'] ?? ''));
                $a2 = strtoupper(trim($end['a2'] ?? ''));
                $a3 = strtoupper(trim($end['a3'] ?? ''));
                
                $endScore = 0;
                foreach ([$a1, $a2, $a3] as $arrow) {
                    if ($arrow === 'X' || $arrow === '10') {
                        $endScore += 10;
                    } elseif ($arrow === 'M' || $arrow === '') {
                        $endScore += 0;
                    } else {
                        $endScore += (int)$arrow;
                    }
                }
                
                $runningTotal += $endScore;
                // Update the ends array with recalculated values
                $endsList[$idx]['runningTotal'] = $runningTotal;
                $endsList[$idx]['endTotal'] = $endScore;
                
                $totalTens += $end['tens'];
                $totalXs += $end['xs'];
            }
            
            $result[] = [
                'roundArcherId' => $archer['roundArcherId'],
                'archerId' => $archer['archerId'],
                'firstName' => $archer['firstName'],
                'lastName' => $archer['lastName'],
                'school' => $archer['school'],
                'level' => $archer['level'],
                'gender' => $archer['gender'],
                'targetAssignment' => $archer['targetAssignment'],
                'targetSize' => $archer['targetSize'],
                'scorecard' => [
                    'ends' => $endsList,
                    'currentEnd' => $currentEnd,
                    'runningTotal' => $runningTotal,
                    'tens' => $totalTens,
                    'xs' => $totalXs
                ]
            ];
        }
        
        json_response([
            'roundId' => $roundId,
            'division' => $roundData['division'],
            'roundType' => $roundData['round_type'],
            'baleNumber' => $baleNumber,
            'archers' => $result
        ]);
    } catch (Exception $e) {
        error_log("Bale archers retrieval failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// =====================================================
// Get a specific archer's scorecard for a round
// =====================================================
if (preg_match('#^/v1/rounds/([0-9a-f-]+)/archers/([0-9a-f-]+)/scorecard$#i', $route, $m) && $method === 'GET') {
    $roundId = $m[1];
    $archerId = $m[2];
    
    try {
        $pdo = db();
        
        // Get round_archer record
        $ra = $pdo->prepare('
            SELECT 
                ra.id,
                ra.bale_number,
                ra.target_assignment,
                ra.target_size,
                r.division,
                r.round_type,
                e.name as event_name,
                e.date as event_date
            FROM round_archers ra
            JOIN rounds r ON ra.round_id = r.id
            LEFT JOIN events e ON r.event_id = e.id
            WHERE ra.round_id = ? AND ra.archer_id = ?
        ');
        $ra->execute([$roundId, $archerId]);
        $raData = $ra->fetch();
        
        if (!$raData) {
            json_response(['error' => 'Archer not found in this round'], 404);
            exit;
        }
        
        // Get all ends for this archer
        $ends = $pdo->prepare('
            SELECT
                end_number,
                a1, a2, a3,
                end_total,
                running_total,
                tens,
                xs
            FROM end_events
            WHERE round_archer_id = ?
            ORDER BY end_number
        ');
        $ends->execute([$raData['id']]);
        $endsList = $ends->fetchAll();
        
        // Calculate totals
        $runningTotal = 0;
        $totalTens = 0;
        $totalXs = 0;
        $endsCompleted = 0;
        
        foreach ($endsList as $end) {
            if ($end['end_total'] > 0) {
                $runningTotal = $end['running_total'];
                $totalTens += $end['tens'];
                $totalXs += $end['xs'];
                $endsCompleted++;
            }
        }
        
        json_response([
            'round_id' => $roundId,
            'archer_id' => $archerId,
            'round_archer_id' => $raData['id'],
            'division' => $raData['division'],
            'round_type' => $raData['round_type'],
            'event_name' => $raData['event_name'],
            'event_date' => $raData['event_date'],
            'bale_number' => $raData['bale_number'],
            'target_assignment' => $raData['target_assignment'],
            'target_size' => $raData['target_size'],
            'ends' => $endsList,
            'ends_completed' => $endsCompleted,
            'running_total' => $runningTotal,
            'total_tens' => $totalTens,
            'total_xs' => $totalXs,
            'verified' => false // TODO: Add verification field to schema
        ]);
    } catch (Exception $e) {
        error_log("Scorecard retrieval failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// =====================================================
// PHASE 0: Get current session for an archer (by cookie)
// =====================================================
if (preg_match('#^/v1/archers/([0-9a-f-]+)/current-session$#i', $route, $m) && $method === 'GET') {
    $cookieArcherId = $m[1];
    
    try {
        $pdo = db();
        
        // Find the most recent active round_archer for this archer
        $session = $pdo->prepare('
            SELECT 
                ra.id as roundArcherId,
                ra.round_id as roundId,
                ra.bale_number as baleNumber,
                ra.target_assignment as targetAssignment,
                r.event_id as eventId,
                r.division,
                r.round_type as roundType,
                (SELECT MAX(end_number) FROM end_events WHERE round_archer_id = ra.id) as lastEndNumber
            FROM round_archers ra
            JOIN rounds r ON r.id = ra.round_id
            JOIN archers a ON a.id = ra.archer_id
            WHERE a.id = ? OR a.ext_id = ?
            ORDER BY ra.created_at DESC
            LIMIT 1
        ');
        $session->execute([$cookieArcherId, $cookieArcherId]);
        $sessionData = $session->fetch();
        
        if (!$sessionData) {
            json_response(['error' => 'No active session found'], 404);
            exit;
        }
        
        $currentEnd = ($sessionData['lastEndNumber'] ?? 0) + 1;
        
        json_response([
            'roundArcherId' => $sessionData['roundArcherId'],
            'roundId' => $sessionData['roundId'],
            'eventId' => $sessionData['eventId'],
            'baleNumber' => $sessionData['baleNumber'],
            'targetAssignment' => $sessionData['targetAssignment'],
            'division' => $sessionData['division'],
            'roundType' => $sessionData['roundType'],
            'currentEnd' => $currentEnd,
            'lastEndNumber' => $sessionData['lastEndNumber']
        ]);
    } catch (Exception $e) {
        error_log("Archer session retrieval failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// Update a round archer (bale/target reassignment)
if (preg_match('#^/v1/rounds/([0-9a-f-]+)/archers/([0-9a-f-]+)$#i', $route, $m) && $method === 'PATCH') {
    require_api_key();
    $roundId = $m[1];
    $roundArcherId = $m[2];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $baleNumber = isset($input['baleNumber']) ? (int)$input['baleNumber'] : null;
    $target = isset($input['targetAssignment']) ? trim($input['targetAssignment']) : null;
    if ($baleNumber === null && $target === null) { json_response(['error' => 'No fields to update'], 400); exit; }
    try {
        $pdo = db();
        $updates = [];
        $params = [];
        if ($baleNumber !== null) { $updates[] = 'bale_number = ?'; $params[] = $baleNumber; }
        if ($target !== null) { $updates[] = 'target_assignment = ?'; $params[] = $target; }
        $params[] = $roundId; $params[] = $roundArcherId;
        $sql = 'UPDATE round_archers SET ' . implode(', ', $updates) . ' WHERE round_id = ? AND id = ?';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        json_response(['ok' => true]);
    } catch (Exception $e) {
        error_log("Round archer update failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// Remove a round archer (from a bale/round)
if (preg_match('#^/v1/rounds/([0-9a-f-]+)/archers/([0-9a-f-]+)$#i', $route, $m) && $method === 'DELETE') {
    require_api_key();
    $roundId = $m[1];
    $roundArcherId = $m[2];
    try {
        $pdo = db();
        $stmt = $pdo->prepare('DELETE FROM round_archers WHERE round_id = ? AND id = ?');
        $stmt->execute([$roundId, $roundArcherId]);
        json_response(['ok' => true]);
    } catch (Exception $e) {
        error_log("Round archer delete failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

if (preg_match('#^/v1/rounds/([0-9a-f-]+)/archers/([0-9a-f-]+)/ends$#i', $route, $m) && $method === 'POST') {
    require_api_key();
    $roundId = $m[1];
    $roundArcherId = $m[2];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $end = (int)($input['endNumber'] ?? 0);
    $a1 = $input['a1'] ?? null; $a2 = $input['a2'] ?? null; $a3 = $input['a3'] ?? null;
    $endTotal = (int)($input['endTotal'] ?? 0);
    $running = (int)($input['runningTotal'] ?? 0);
    $tens = (int)($input['tens'] ?? 0);
    $xs = (int)($input['xs'] ?? 0);
    $deviceTs = $input['deviceTs'] ?? null;
    if ($deviceTs) {
        try {
            $dt = new DateTime($deviceTs);
            $deviceTs = $dt->format('Y-m-d H:i:s');
        } catch (Exception $e) {
            $deviceTs = null;
        }
    }
    if ($end < 1) { json_response(['error' => 'endNumber required'], 400); exit; }
    $pdo = db();
    $cardCheck = $pdo->prepare('SELECT ra.round_id, ra.locked, r.event_id FROM round_archers ra JOIN rounds r ON r.id = ra.round_id WHERE ra.id = ? LIMIT 1');
    $cardCheck->execute([$roundArcherId]);
    $cardData = $cardCheck->fetch();
    if (!$cardData) {
        json_response(['error' => 'Scorecard not found'], 404);
        exit;
    }
    if (strcasecmp($cardData['round_id'], $roundId) !== 0) {
        json_response(['error' => 'Scorecard does not belong to this round'], 400);
        exit;
    }
    if (!empty($cardData['event_id']) && (bool)$cardData['locked']) {
        json_response(['error' => 'Scorecard is locked'], 423);
        exit;
    }
    // Upsert by (round_archer_id, end_number)
    $endId = $genUuid();
    $sql = 'INSERT INTO end_events (id,round_id,round_archer_id,end_number,a1,a2,a3,end_total,running_total,tens,xs,device_ts,server_ts)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NOW())
            ON DUPLICATE KEY UPDATE a1=VALUES(a1),a2=VALUES(a2),a3=VALUES(a3),end_total=VALUES(end_total),running_total=VALUES(running_total),tens=VALUES(tens),xs=VALUES(xs),device_ts=VALUES(device_ts),server_ts=NOW()';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$endId,$roundId,$roundArcherId,$end,$a1,$a2,$a3,$endTotal,$running,$tens,$xs,$deviceTs]);
    json_response(['ok' => true]);
    exit;
}

if (preg_match('#^/v1/round_archers/([0-9a-f-]+)/verification$#i', $route, $m) && $method === 'POST') {
    require_api_key();
    $roundArcherId = $m[1];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $input['action'] ?? 'lock';
    $verifiedBy = trim($input['verifiedBy'] ?? '');
    $notes = trim($input['notes'] ?? '');

    try {
        $pdo = db();
        $result = process_round_archer_verification($pdo, $roundArcherId, $action, $verifiedBy, $notes);
        json_response([
            'roundArcherId' => $result['id'],
            'roundId' => $result['round_id'],
            'locked' => (bool)$result['locked'],
            'cardStatus' => $result['card_status'],
            'verifiedBy' => $result['verified_by'],
            'verifiedAt' => $result['verified_at'],
            'notes' => $result['notes'],
            'history' => $result['lock_history']
        ]);
    } catch (Exception $e) {
        $status = $e->getCode();
        if ($status < 100 || $status > 599) $status = 400;
        json_response(['error' => $e->getMessage()], $status);
    }
    exit;
}

if (preg_match('#^/v1/rounds/([0-9a-f-]+)/verification/bale$#i', $route, $m) && $method === 'POST') {
    require_api_key();
    $roundId = $m[1];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $baleNumber = (int)($input['baleNumber'] ?? 0);
    $verifiedBy = trim($input['verifiedBy'] ?? '');
    $notes = trim($input['notes'] ?? '');

    if ($baleNumber <= 0) {
        json_response(['error' => 'baleNumber is required'], 400);
        exit;
    }

    try {
        $pdo = db();
        $roundStmt = $pdo->prepare('SELECT id, event_id FROM rounds WHERE id = ? LIMIT 1');
        $roundStmt->execute([$roundId]);
        $round = $roundStmt->fetch(PDO::FETCH_ASSOC);
        if (!$round) {
            throw new Exception('Round not found', 404);
        }
        if (empty($round['event_id'])) {
            throw new Exception('Practice rounds are not part of verification workflow', 400);
        }

        $archerStmt = $pdo->prepare('SELECT id, archer_name, locked, card_status FROM round_archers WHERE round_id = ? AND bale_number = ?');
        $archerStmt->execute([$roundId, $baleNumber]);
        $archers = $archerStmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($archers)) {
            throw new Exception('No scorecards found for this bale', 404);
        }

        $missing = [];
        foreach ($archers as $archer) {
            if ($archer['card_status'] === 'VOID') {
                continue;
            }
            if ((bool)$archer['locked']) {
                continue;
            }
            $countStmt = $pdo->prepare('SELECT COUNT(*) FROM end_events WHERE round_archer_id = ?');
            $countStmt->execute([$archer['id']]);
            if ((int)$countStmt->fetchColumn() === 0) {
                $missing[] = $archer['archer_name'];
            }
        }

        if (!empty($missing)) {
            throw new Exception('Some archers have no synced scores: ' . implode(', ', $missing), 409);
        }

        $locked = [];
        foreach ($archers as $archer) {
            if ($archer['card_status'] === 'VOID') {
                continue;
            }
            if ((bool)$archer['locked']) {
                $locked[] = [
                    'roundArcherId' => $archer['id'],
                    'cardStatus' => $archer['card_status'],
                    'locked' => true
                ];
                continue;
            }
            $result = process_round_archer_verification($pdo, $archer['id'], 'lock', $verifiedBy, $notes);
            $locked[] = [
                'roundArcherId' => $result['id'],
                'cardStatus' => $result['card_status'],
                'locked' => (bool)$result['locked']
            ];
        }

        json_response([
            'roundId' => $roundId,
            'baleNumber' => $baleNumber,
            'lockedCount' => count($locked),
            'details' => $locked
        ]);
    } catch (Exception $e) {
        $status = $e->getCode();
        if ($status < 100 || $status > 599) $status = 400;
        json_response(['error' => $e->getMessage()], $status);
    }
    exit;
}

if (preg_match('#^/v1/rounds/([0-9a-f-]+)/verification/close$#i', $route, $m) && $method === 'POST') {
    require_api_key();
    $roundId = $m[1];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $verifiedBy = trim($input['verifiedBy'] ?? '');
    $notes = trim($input['notes'] ?? '');

    try {
        $pdo = db();
        $roundStmt = $pdo->prepare('SELECT id, event_id FROM rounds WHERE id = ? LIMIT 1');
        $roundStmt->execute([$roundId]);
        $round = $roundStmt->fetch(PDO::FETCH_ASSOC);
        if (!$round) {
            throw new Exception('Round not found', 404);
        }
        if (empty($round['event_id'])) {
            throw new Exception('Practice rounds are not part of verification workflow', 400);
        }

        $archerStmt = $pdo->prepare('SELECT id, card_status FROM round_archers WHERE round_id = ?');
        $archerStmt->execute([$roundId]);
        $archers = $archerStmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($archers)) {
            throw new Exception('No scorecards found for this round', 404);
        }

        $locked = 0;
        $voided = 0;

        foreach ($archers as $archer) {
            $cardStatus = $archer['card_status'] ?? 'PENDING';
            if ($cardStatus === 'VOID') {
                $voided++;
                continue;
            }

            $countStmt = $pdo->prepare('SELECT COUNT(*) FROM end_events WHERE round_archer_id = ?');
            $countStmt->execute([$archer['id']]);
            $hasScores = (int)$countStmt->fetchColumn() > 0;

            if ($hasScores) {
                $result = process_round_archer_verification($pdo, $archer['id'], 'lock', $verifiedBy, $notes);
                if ($result['card_status'] === 'VER') {
                    $locked++;
                }
            } else {
                $voidResult = process_round_archer_verification($pdo, $archer['id'], 'void', $verifiedBy, $notes);
                if ($voidResult['card_status'] === 'VOID') {
                    $voided++;
                }
            }
        }

        $roundStatus = ($voided > 0) ? 'Voided' : 'Completed';
        $updateRound = $pdo->prepare('UPDATE rounds SET status = ? WHERE id = ?');
        $updateRound->execute([$roundStatus, $roundId]);

        json_response([
            'roundId' => $roundId,
            'status' => $roundStatus,
            'verifiedCards' => $locked,
            'voidedCards' => $voided
        ]);
    } catch (Exception $e) {
        $status = $e->getCode();
        if ($status < 100 || $status > 599) $status = 400;
        json_response(['error' => $e->getMessage()], $status);
    }
    exit;
}

if (preg_match('#^/v1/rounds/([0-9a-f-]+)/snapshot$#i', $route, $m) && $method === 'GET') {
    // No API key needed for public read? Keep protected for now
    require_api_key();
    $roundId = $m[1];
    $pdo = db();
    $round = $pdo->query('SELECT id, round_type as roundType, date, bale_number as baleNumber FROM rounds WHERE id=' . $pdo->quote($roundId))->fetch();
    if (!$round) { json_response(['error' => 'round not found'], 404); exit; }
    $archers = $pdo->prepare('SELECT ra.id as roundArcherId, ra.archer_name as archerName, ra.target_assignment as targetAssignment FROM round_archers ra WHERE ra.round_id=?');
    $archers->execute([$roundId]);
    $rows = $archers->fetchAll();
    foreach ($rows as &$r) {
        $stmt = $pdo->prepare('SELECT end_number as endNumber, a1,a2,a3,end_total as endTotal,running_total as runningTotal,tens,xs FROM end_events WHERE round_archer_id=? ORDER BY end_number');
        $stmt->execute([$r['roundArcherId']]);
        $ends = $stmt->fetchAll();
        $r['scores'] = array_map(function($e){ return [$e['a1'],$e['a2'],$e['a3']]; }, $ends);
        if (!empty($ends)) {
            $last = end($ends);
            $r['currentEnd'] = $last['endNumber'];
            $r['endTotal'] = $last['endTotal'];
            $r['runningTotal'] = $last['runningTotal'];
            $r['tens'] = $last['tens'];
            $r['xs'] = $last['xs'];
        } else {
            $r['currentEnd'] = 0;
            $r['endTotal'] = 0;
            $r['runningTotal'] = 0;
            $r['tens'] = 0;
            $r['xs'] = 0;
        }
    }
    json_response(['round' => $round, 'archers' => $rows]);
    exit;
}

// Recent rounds list for coach (last 50 by created_at)
if (preg_match('#^/v1/rounds/recent$#', $route) && $method === 'GET') {
    require_api_key();
    $pdo = db();
    $rows = $pdo->query('SELECT id, round_type as roundType, date, bale_number as baleNumber, created_at as createdAt FROM rounds ORDER BY created_at DESC LIMIT 50')->fetchAll();
    json_response(['rounds' => $rows]);
    exit;
}

// Create an event (and optionally seed 12 rounds)
if (preg_match('#^/v1/events$#', $route) && $method === 'POST') {
    require_api_key();
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $name = trim($input['name'] ?? 'Event');
    $date = $input['date'] ?? date('Y-m-d');
    $status = $input['status'] ?? 'Planned';
    $eventType = $input['eventType'] ?? 'auto_assign'; // auto_assign, self_select, or manual
    $autoAssign = !!($input['autoAssignBales'] ?? ($eventType === 'auto_assign'));
    $roundType = $input['roundType'] ?? 'R300';
    $entryCode = trim($input['entryCode'] ?? '');
    
    try {
        $pdo = db();
        ensure_events_schema($pdo);
        $eventId = $genUuid();
        
        // Create event
        $pdo->prepare('INSERT INTO events (id,name,date,status,event_type,entry_code,created_at) VALUES (?,?,?,?,?,?,NOW())')
            ->execute([$eventId, $name, $date, $status, $eventType, $entryCode]);
        
        // If event type is 'manual', don't create division rounds yet
        // Rounds will be created when archers are added via POST /events/{id}/archers
        if ($eventType === 'manual') {
            json_response([
                'eventId' => $eventId,
                'message' => 'Event created. Add archers to create division rounds.',
                'rounds' => [],
                'totalBales' => 0
            ], 201);
            exit;
        }
        
        // Define divisions in order: Boys Varsity, Girls Varsity, Boys JV, Girls JV
        $divisions = [
            ['code' => 'BVAR', 'gender' => 'M', 'level' => 'VAR', 'name' => 'Boys Varsity'],
            ['code' => 'GVAR', 'gender' => 'F', 'level' => 'VAR', 'name' => 'Girls Varsity'],
            ['code' => 'BJV', 'gender' => 'M', 'level' => 'JV', 'name' => 'Boys JV'],
            ['code' => 'GJV', 'gender' => 'F', 'level' => 'JV', 'name' => 'Girls JV']
        ];
        
        $responseRounds = [];
        $currentBaleNumber = 1; // Continuous bale numbering across all divisions
        
        foreach ($divisions as $div) {
            // Create division round
            $roundId = $genUuid();
            $pdo->prepare('INSERT INTO rounds (id,event_id,round_type,division,gender,level,date,status,created_at) VALUES (?,?,?,?,?,?,?,?,NOW())')
                ->execute([$roundId, $eventId, $roundType, $div['code'], $div['gender'], $div['level'], $date, 'Not Started']);
            
            $roundInfo = [
                'roundId' => $roundId,
                'division' => $div['code'],
                'gender' => $div['gender'],
                'level' => $div['level'],
                'bales' => 0,
                'archerCount' => 0
            ];
            
            // Auto-assign bales if requested
            if ($autoAssign) {
                // Get archers for this division (sorted by first name)
                $stmt = $pdo->prepare('SELECT id,first_name,last_name,school,level,gender FROM archers WHERE gender=? AND level=? ORDER BY first_name,last_name');
                $stmt->execute([$div['gender'], $div['level']]);
                $archers = $stmt->fetchAll();
                
                if (!empty($archers)) {
                    // Assign to bales
                    $baleAssignments = $assignArchersToBales($archers, $currentBaleNumber);
                    $targetLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
                    
                    foreach ($baleAssignments as $baleArchers) {
                        $baleNum = $currentBaleNumber;
                        $targetIdx = 0;
                        
                        foreach ($baleArchers as $archer) {
                            $raId = $genUuid();
                            $archerName = trim($archer['first_name'] . ' ' . $archer['last_name']);
                            $target = $targetLetters[$targetIdx] ?? 'A';
                            $targetSize = ($archer['level'] === 'VAR') ? 122 : 80;
                            
                            $pdo->prepare('INSERT INTO round_archers (id,round_id,archer_id,archer_name,school,level,gender,target_assignment,target_size,bale_number,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,NOW())')
                                ->execute([$raId, $roundId, $archer['id'], $archerName, $archer['school'], $archer['level'], $archer['gender'], $target, $targetSize, $baleNum]);
                            
                            $targetIdx++;
                        }
                        
                        $currentBaleNumber++;
                    }
                    
                    $roundInfo['bales'] = count($baleAssignments);
                    $roundInfo['archerCount'] = count($archers);
                }
            }
            
            $responseRounds[] = $roundInfo;
        }
        
        json_response([
            'eventId' => $eventId,
            'rounds' => $responseRounds,
            'totalBales' => $currentBaleNumber - 1
        ], 201);
    } catch (Exception $e) {
        error_log("Event creation failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// Update an event (PATCH)
if (preg_match('#^/v1/events/([0-9a-f-]+)$#i', $route, $m) && $method === 'PATCH') {
    require_api_key();
    $eventId = $m[1];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    try {
        $pdo = db();
        
        // Check if event exists
        $stmt = $pdo->prepare('SELECT id FROM events WHERE id=? LIMIT 1');
        $stmt->execute([$eventId]);
        if (!$stmt->fetch()) {
            json_response(['error' => 'Event not found'], 404);
            exit;
        }
        
        // Build UPDATE query dynamically based on provided fields
        $updates = [];
        $params = [];
        
        if (isset($input['name'])) {
            $updates[] = 'name = ?';
            $params[] = trim($input['name']);
        }
        
        if (isset($input['date'])) {
            $updates[] = 'date = ?';
            $params[] = $input['date'];
        }
        
        if (isset($input['status'])) {
            $updates[] = 'status = ?';
            $params[] = $input['status'];
        }
        
        if (isset($input['entryCode'])) {
            $updates[] = 'entry_code = ?';
            $params[] = trim($input['entryCode']);
        }
        
        if (isset($input['eventType'])) {
            $et = trim($input['eventType']);
            if (!in_array($et, ['auto_assign','self_select','manual'])) {
                json_response(['error' => 'Invalid eventType'], 400);
                exit;
            }
            $updates[] = 'event_type = ?';
            $params[] = $et;
        }
        
        if (empty($updates)) {
            json_response(['error' => 'No fields to update'], 400);
            exit;
        }
        
        $params[] = $eventId; // Add eventId for WHERE clause
        $sql = 'UPDATE events SET ' . implode(', ', $updates) . ' WHERE id = ?';
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        json_response(['ok' => true, 'message' => 'Event updated successfully'], 200);
    } catch (Exception $e) {
        error_log("Event update failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// =====================================================
// DEPRECATED: Old POST /v1/events/{eventId}/archers endpoint
// PHASE 0: This endpoint auto-created division rounds, which conflicts with new workflow
// Use POST /v1/events/{eventId}/rounds/{roundId}/archers instead
// =====================================================
if (preg_match('#^/v1/events/([0-9a-f-]+)/archers$#i', $route, $m) && $method === 'POST') {
    require_api_key();
    json_response([
        'error' => 'This endpoint is deprecated. Use POST /v1/events/{eventId}/rounds to create division rounds, then POST /v1/events/{eventId}/rounds/{roundId}/archers to add archers.',
        'migration' => 'Phase 0: Division Rounds workflow'
    ], 410); // 410 Gone
    exit;
}

// OLD CODE DISABLED - keeping for reference
/*
if (preg_match('#^/v1/events/([0-9a-f-]+)/archers_OLD_DISABLED$#i', $route, $m) && $method === 'POST') {
    require_api_key();
    $eventId = $m[1];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $archerIds = $input['archerIds'] ?? [];
    $assignmentMode = $input['assignmentMode'] ?? 'auto_assign'; // 'auto_assign' or 'manual'
    
    if (empty($archerIds) || !is_array($archerIds)) {
        json_response(['error'] => 'archerIds array required'], 400);
        exit;
    }
    
    try {
        $pdo = db();
        
        // Get event details
        $stmt = $pdo->prepare('SELECT id,name,date,status,event_type FROM events WHERE id=?');
        $stmt->execute([$eventId]);
        $event = $stmt->fetch();
        
        if (!$event) {
            json_response(['error' => 'Event not found'], 404);
            exit;
        }
        
        // Get archers
        $placeholders = implode(',', array_fill(0, count($archerIds), '?'));
        $stmt = $pdo->prepare("SELECT id,first_name,last_name,school,gender,level FROM archers WHERE id IN ($placeholders)");
        $stmt->execute($archerIds);
        $archers = $stmt->fetchAll();
        
        if (empty($archers)) {
            json_response(['error' => 'No valid archers found'], 400);
            exit;
        }
        
        // Group archers by division
        $divisionArchers = [];
        foreach ($archers as $archer) {
            $divCode = ($archer['gender'] === 'M' ? 'B' : 'G') . $archer['level'];
            if (!isset($divisionArchers[$divCode])) {
                $divisionArchers[$divCode] = [];
            }
            $divisionArchers[$divCode][] = $archer;
        }
        
        // Get or create division rounds
        $divisions = [
            'BVAR' => ['gender' => 'M', 'level' => 'VAR', 'name' => 'Boys Varsity'],
            'GVAR' => ['gender' => 'F', 'level' => 'VAR', 'name' => 'Girls Varsity'],
            'BJV' => ['gender' => 'M', 'level' => 'JV', 'name' => 'Boys JV'],
            'GJV' => ['gender' => 'F', 'level' => 'JV', 'name' => 'Girls JV']
        ];
        
        // Get current max bale number for this event
        $stmt = $pdo->prepare('SELECT COALESCE(MAX(ra.bale_number), 0) AS max_bale FROM round_archers ra JOIN rounds r ON ra.round_id = r.id WHERE r.event_id = ?');
        $stmt->execute([$eventId]);
        $currentBaleNumber = (int)$stmt->fetchColumn() + 1;
        
        $addedCount = 0;
        $updatedRounds = [];
        
        foreach ($divisionArchers as $divCode => $divArchers) {
            $div = $divisions[$divCode] ?? null;
            if (!$div) continue;
            
            // Get or create round for this division
            $stmt = $pdo->prepare('SELECT id FROM rounds WHERE event_id=? AND division=? LIMIT 1');
            $stmt->execute([$eventId, $divCode]);
            $roundId = $stmt->fetchColumn();
            
            if (!$roundId) {
                // Create round
                $roundId = $genUuid();
                $pdo->prepare('INSERT INTO rounds (id,event_id,round_type,division,gender,level,date,status,created_at) VALUES (?,?,?,?,?,?,?,?,NOW())')
                    ->execute([$roundId, $eventId, 'R300', $divCode, $div['gender'], $div['level'], $event['date'], 'Not Started']);
            }
            
            // Add archers to round
            if ($assignmentMode === 'auto_assign') {
                // Auto-assign to bales (2-4 per bale)
                $baleAssignments = $assignArchersToBales($divArchers, $currentBaleNumber);
                $targetLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
                
                foreach ($baleAssignments as $baleArchers) {
                    $baleNum = $currentBaleNumber;
                    $targetIdx = 0;
                    
                    foreach ($baleArchers as $archer) {
                        // Check if archer already exists in this round
                        $stmt = $pdo->prepare('SELECT id FROM round_archers WHERE round_id=? AND archer_id=?');
                        $stmt->execute([$roundId, $archer['id']]);
                        $exists = $stmt->fetchColumn();
                        
                        if (!$exists) {
                            $raId = $genUuid();
                            $archerName = trim($archer['first_name'] . ' ' . $archer['last_name']);
                            $target = $targetLetters[$targetIdx] ?? 'A';
                            $targetSize = ($archer['level'] === 'VAR') ? 122 : 80;
                            
                            $pdo->prepare('INSERT INTO round_archers (id,round_id,archer_id,archer_name,school,level,gender,target_assignment,target_size,bale_number,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,NOW())')
                                ->execute([$raId, $roundId, $archer['id'], $archerName, $archer['school'], $archer['level'], $archer['gender'], $target, $targetSize, $baleNum]);
                            
                            $addedCount++;
                        }
                        
                        $targetIdx++;
                    }
                    
                    $currentBaleNumber++;
                }
            } else {
                // Manual mode: don't assign bales/targets yet
                foreach ($divArchers as $archer) {
                    // Check if archer already exists in this round
                    $stmt = $pdo->prepare('SELECT id FROM round_archers WHERE round_id=? AND archer_id=?');
                    $stmt->execute([$roundId, $archer['id']]);
                    $exists = $stmt->fetchColumn();
                    
                    if (!$exists) {
                        $raId = $genUuid();
                        $archerName = trim($archer['first_name'] . ' ' . $archer['last_name']);
                        $targetSize = ($archer['level'] === 'VAR') ? 122 : 80;
                        
                        $pdo->prepare('INSERT INTO round_archers (id,round_id,archer_id,archer_name,school,level,gender,target_size,created_at) VALUES (?,?,?,?,?,?,?,?,NOW())')
                            ->execute([$raId, $roundId, $archer['id'], $archerName, $archer['school'], $archer['level'], $archer['gender'], $targetSize]);
                        
                        $addedCount++;
                    }
                }
            }
            
            $updatedRounds[] = $roundId;
        }
        
        json_response([
            'added' => $addedCount,
            'assignmentMode' => $assignmentMode,
            'updatedRounds' => $updatedRounds
        ], 200);
    } catch (Exception $e) {
        error_log("Add archers to event failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}
*/
// END OF DEPRECATED CODE

// List recent events (PUBLIC - no auth required for archers to see events)
if (preg_match('#^/v1/events/recent$#', $route) && $method === 'GET') {
    $pdo = db();
    ensure_events_schema($pdo);
    
    // Check if authenticated (coach gets entry_code, archer doesn't)
    $isAuthenticated = check_api_key();
    
    if ($isAuthenticated) {
        // Coach view - include entry_code
        $rows = $pdo->query('SELECT id,name,date,status,entry_code,created_at as createdAt FROM events ORDER BY created_at DESC LIMIT 50')->fetchAll();
    } else {
        // Public/Archer view - exclude entry_code for security
        $rows = $pdo->query('SELECT id,name,date,status,created_at as createdAt FROM events ORDER BY created_at DESC LIMIT 50')->fetchAll();
    }
    
    json_response(['events' => $rows]);
    exit;
}

// Verify event entry code (PUBLIC - allows archers to access event via code)
if (preg_match('#^/v1/events/verify$#', $route) && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $eventId = $input['eventId'] ?? '';
    $entryCode = trim($input['entryCode'] ?? '');
    
    if (empty($eventId) || empty($entryCode)) {
        json_response(['error' => 'Missing eventId or entryCode'], 400);
        exit;
    }
    
    $pdo = db();
    ensure_events_schema($pdo);
    
    $stmt = $pdo->prepare('SELECT id, name, date, status, entry_code FROM events WHERE id = ? LIMIT 1');
    $stmt->execute([$eventId]);
    $event = $stmt->fetch();
    
    if (!$event) {
        json_response(['verified' => false, 'error' => 'Event not found'], 404);
        exit;
    }
    
    // Check if entry code matches (case-insensitive)
    if (empty($event['entry_code']) || strtolower($event['entry_code']) !== strtolower($entryCode)) {
        json_response(['verified' => false, 'error' => 'Invalid entry code'], 403);
        exit;
    }
    
    // Success - return event info
    json_response([
        'verified' => true,
        'event' => [
            'id' => $event['id'],
            'name' => $event['name'],
            'date' => $event['date'],
            'status' => $event['status']
        ]
    ]);
    exit;
}

// Link round to event
if (preg_match('#^/v1/rounds/([0-9a-f-]+)/link-event$#i', $route, $m) && $method === 'POST') {
    require_api_key();
    $roundId = $m[1];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $eventId = $input['eventId'] ?? '';
    
    if (!$eventId) {
        json_response(['error' => 'eventId required'], 400);
        exit;
    }
    
    try {
        $pdo = db();
        $stmt = $pdo->prepare('UPDATE rounds SET event_id=? WHERE id=?');
        $stmt->execute([$eventId, $roundId]);
        
        if ($stmt->rowCount() > 0) {
            json_response(['message' => 'Round linked to event successfully'], 200);
        } else {
            json_response(['error' => 'Round not found'], 404);
        }
    } catch (Exception $e) {
        error_log("Round linking failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// Delete event
if (preg_match('#^/v1/events/([0-9a-f-]+)$#i', $route, $m) && $method === 'DELETE') {
    require_api_key();
    $eventId = $m[1];
    try {
        $pdo = db();
        // First unlink all rounds from this event
        $unlink = $pdo->prepare('UPDATE rounds SET event_id=NULL WHERE event_id=?');
        $unlink->execute([$eventId]);
        
        // Then delete the event
        $delete = $pdo->prepare('DELETE FROM events WHERE id=?');
        $delete->execute([$eventId]);
        
        if ($delete->rowCount() > 0) {
            json_response(['message' => 'Event deleted successfully'], 200);
        } else {
            json_response(['error' => 'Event not found'], 404);
        }
    } catch (Exception $e) {
        error_log("Event deletion failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// Coach utility: Reset all scoring data for an event (keeps the event itself)
if (preg_match('#^/v1/events/([0-9a-f-]+)/reset$#i', $route, $m) && $method === 'POST') {
    require_api_key();
    $eventId = $m[1];
    try {
        $pdo = db();
        // Find all rounds for this event
        $roundsStmt = $pdo->prepare('SELECT id FROM rounds WHERE event_id = ?');
        $roundsStmt->execute([$eventId]);
        $roundIds = $roundsStmt->fetchAll(PDO::FETCH_COLUMN);
        if (empty($roundIds)) {
            json_response(['message' => 'No rounds found for event. Nothing to reset.']);
            exit;
        }
        // Delete ends, then scorecards, then (optionally) rounds
        $placeholders = implode(',', array_fill(0, count($roundIds), '?'));
        // end_events cascade from round_archers, but we hard delete first for safety
        $pdo->prepare("DELETE FROM end_events WHERE round_id IN ($placeholders)")->execute($roundIds);
        $pdo->prepare("DELETE FROM round_archers WHERE round_id IN ($placeholders)")->execute($roundIds);
        // Keep rounds so coaches can reuse the event schedule; set status back to Created
        $pdo->prepare("UPDATE rounds SET status='Not Started' WHERE id IN ($placeholders)")->execute($roundIds);
        json_response(['ok' => true, 'message' => 'All entered scores deleted. Rounds reset to Created.']);
    } catch (Exception $e) {
        error_log("Event reset failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// =====================================================
// PHASE 0: Create division rounds for an event
// =====================================================
if (preg_match('#^/v1/events/([0-9a-f-]+)/rounds$#i', $route, $m) && $method === 'POST') {
    require_api_key();
    $eventId = $m[1];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $divisions = $input['divisions'] ?? [];
    $roundType = $input['roundType'] ?? 'R300';
    
    if (!is_array($divisions) || empty($divisions)) {
        json_response(['error' => 'divisions array required (e.g., ["OPEN", "BJV"])'], 400);
        exit;
    }
    
    try {
        $pdo = db();
        
        // Verify event exists
        $eventStmt = $pdo->prepare('SELECT id, date FROM events WHERE id=? LIMIT 1');
        $eventStmt->execute([$eventId]);
        $event = $eventStmt->fetch();
        
        if (!$event) {
            json_response(['error' => 'Event not found'], 404);
            exit;
        }
        
        $created = [];
        $errors = [];
        
        foreach ($divisions as $division) {
            $division = strtoupper(trim($division));
            if (!in_array($division, ['OPEN', 'BVAR', 'GVAR', 'BJV', 'GJV'])) {
                $errors[] = "Invalid division: $division";
                continue;
            }
            
            // Check if round already exists for this division
            $existing = $pdo->prepare('SELECT id FROM rounds WHERE event_id=? AND division=? LIMIT 1');
            $existing->execute([$eventId, $division]);
            $existingRound = $existing->fetch();
            
            if ($existingRound) {
                $errors[] = "Division $division already exists";
                continue;
            }
            
            // Parse division code to extract gender and level
            // Database requires gender and level (NOT NULL), so provide defaults for OPEN
            $gender = 'M'; // Default to M for OPEN division
            $level = 'VAR'; // Default to VAR for OPEN division
            
            if ($division === 'OPEN') {
                // OPEN division: mixed gender/level, use defaults
                $gender = 'M'; // Default
                $level = 'VAR'; // Default
            } else {
                // Parse division code: BVAR, GVAR, BJV, GJV
                if (strpos($division, 'B') === 0) {
                    $gender = 'M';
                } elseif (strpos($division, 'G') === 0) {
                    $gender = 'F';
                }
                if (strpos($division, 'VAR') !== false) {
                    $level = 'VAR';
                } elseif (strpos($division, 'JV') !== false) {
                    $level = 'JV';
                }
            }
            
            // Create round
            $roundId = $genUuid();
            $pdo->prepare('INSERT INTO rounds (id, event_id, round_type, division, gender, level, date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())')
                ->execute([$roundId, $eventId, $roundType, $division, $gender, $level, $event['date'], 'Not Started']);
            
            $created[] = [
                'roundId' => $roundId,
                'division' => $division,
                'roundType' => $roundType
            ];
        }
        
        json_response([
            'created' => $created,
            'errors' => $errors
        ], 201);
        
    } catch (Exception $e) {
        error_log("Division rounds creation failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// =====================================================
// PHASE 0: List division rounds for an event
// =====================================================
if (preg_match('#^/v1/events/([0-9a-f-]+)/rounds$#i', $route, $m) && $method === 'GET') {
    require_api_key();
    $eventId = $m[1];
    
    try {
        $pdo = db();
        
        // Get all rounds for this event
        $roundsStmt = $pdo->prepare('
            SELECT r.id as roundId, r.division, r.round_type as roundType, r.status,
                   COUNT(DISTINCT ra.id) as archerCount,
                   COUNT(DISTINCT ra.bale_number) as baleCount,
                   MIN(ra.bale_number) as minBale,
                   MAX(ra.bale_number) as maxBale
            FROM rounds r
            LEFT JOIN round_archers ra ON ra.round_id = r.id
            WHERE r.event_id = ?
            GROUP BY r.id, r.division, r.round_type, r.status
            ORDER BY 
                CASE r.division
                    WHEN "OPEN" THEN 1
                    WHEN "BVAR" THEN 2
                    WHEN "GVAR" THEN 3
                    WHEN "BJV" THEN 4
                    WHEN "GJV" THEN 5
                    ELSE 6
                END
        ');
        $roundsStmt->execute([$eventId]);
        $rounds = $roundsStmt->fetchAll();
        
        // Get next available bale number for this event
        $maxBaleStmt = $pdo->prepare('
            SELECT MAX(ra.bale_number) as maxBale
            FROM round_archers ra
            JOIN rounds r ON r.id = ra.round_id
            WHERE r.event_id = ?
        ');
        $maxBaleStmt->execute([$eventId]);
        $maxBaleRow = $maxBaleStmt->fetch();
        $nextAvailableBale = ($maxBaleRow && $maxBaleRow['maxBale']) ? (int)$maxBaleRow['maxBale'] + 1 : 1;
        
        // Format response
        $formattedRounds = [];
        foreach ($rounds as $round) {
            $baleNumbers = [];
            if ($round['archerCount'] > 0 && $round['minBale']) {
                for ($i = (int)$round['minBale']; $i <= (int)$round['maxBale']; $i++) {
                    $baleNumbers[] = $i;
                }
            }
            
            $formattedRounds[] = [
                'roundId' => $round['roundId'],
                'division' => $round['division'],
                'roundType' => $round['roundType'],
                'status' => $round['status'],
                'archerCount' => (int)$round['archerCount'],
                'baleCount' => (int)$round['baleCount'],
                'baleNumbers' => $baleNumbers
            ];
        }
        
        json_response([
            'rounds' => $formattedRounds,
            'nextAvailableBale' => $nextAvailableBale
        ]);
        
    } catch (Exception $e) {
        error_log("List rounds failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// =====================================================
// PHASE 0: Add archers to a division round with auto-assign
// =====================================================
if (preg_match('#^/v1/events/([0-9a-f-]+)/rounds/([0-9a-f-]+)/archers$#i', $route, $m) && $method === 'POST') {
    require_api_key();
    $eventId = $m[1];
    $roundId = $m[2];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $archerIds = $input['archerIds'] ?? [];
    $assignmentMode = $input['assignmentMode'] ?? 'auto_assign'; // 'auto_assign' or 'manual'
    
    if (!is_array($archerIds) || empty($archerIds)) {
        json_response(['error' => 'archerIds array required'], 400);
        exit;
    }
    
    try {
        $pdo = db();
        
        // Verify round exists and belongs to event
        $roundStmt = $pdo->prepare('SELECT id, division FROM rounds WHERE id=? AND event_id=? LIMIT 1');
        $roundStmt->execute([$roundId, $eventId]);
        $round = $roundStmt->fetch();
        
        if (!$round) {
            json_response(['error' => 'Round not found'], 404);
            exit;
        }
        
        // Get archers details
        $placeholders = implode(',', array_fill(0, count($archerIds), '?'));
        $archersStmt = $pdo->prepare("SELECT id, first_name, last_name, school, level, gender FROM archers WHERE id IN ($placeholders)");
        $archersStmt->execute($archerIds);
        $archers = $archersStmt->fetchAll();
        
        if (count($archers) !== count($archerIds)) {
            json_response(['error' => 'Some archers not found'], 404);
            exit;
        }
        
        if ($assignmentMode === 'manual') {
            // Manual mode: Create round_archers with NULL bale/target
            $created = 0;
            foreach ($archers as $archer) {
                $pdo->prepare('INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, bale_number, target_assignment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NOW())')
                    ->execute([
                        $genUuid(),
                        $roundId,
                        $archer['id'],
                        trim($archer['first_name'] . ' ' . $archer['last_name']),
                        $archer['school'] ?? '',
                        $archer['level'] ?? '',
                        $archer['gender'] ?? ''
                    ]);
                $created++;
            }
            
            json_response([
                'roundArchersCreated' => $created,
                'assignmentMode' => 'manual',
                'message' => 'Archers added. They will select bales when they start scoring.'
            ], 201);
            exit;
        }
        
        // AUTO-ASSIGN MODE
        
        // Get next available bale number for this event
        $maxBaleStmt = $pdo->prepare('
            SELECT MAX(ra.bale_number) as maxBale
            FROM round_archers ra
            JOIN rounds r ON r.id = ra.round_id
            WHERE r.event_id = ?
        ');
        $maxBaleStmt->execute([$eventId]);
        $maxBaleRow = $maxBaleStmt->fetch();
        $startBale = ($maxBaleRow && $maxBaleRow['maxBale']) ? (int)$maxBaleRow['maxBale'] + 1 : 1;
        
        // Auto-assign algorithm
        $numArchers = count($archers);
        $archersPerBale = 4; // Default: A, B, C, D
        $targetLetters = ['A', 'B', 'C', 'D'];
        
        // Calculate number of bales needed
        $numBales = (int)ceil($numArchers / $archersPerBale);
        
        // Check if last bale would have < 2 archers (minimum)
        if ($numBales > 1) {
            $lastBaleCount = $numArchers - (($numBales - 1) * $archersPerBale);
            if ($lastBaleCount < 2) {
                // Redistribute to avoid having only 1 archer on last bale
                $numBales--;
            }
        }
        
        // Distribute archers across bales evenly
        $basePerBale = (int)floor($numArchers / $numBales);
        $extraArchers = $numArchers % $numBales;
        
        // Create round_archers entries
        $currentBale = $startBale;
        $archerIndex = 0;
        $baleAssignments = [];
        
        for ($i = 0; $i < $numBales; $i++) {
            $archersInThisBale = $basePerBale + ($i < $extraArchers ? 1 : 0);
            $baleArchers = [];
            
            for ($j = 0; $j < $archersInThisBale && $archerIndex < $numArchers; $j++) {
                $archer = $archers[$archerIndex];
                $targetLetter = $targetLetters[$j % 4]; // A, B, C, D (cycle if > 4)
                
                $pdo->prepare('INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, bale_number, target_assignment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())')
                    ->execute([
                        $genUuid(),
                        $roundId,
                        $archer['id'],
                        trim($archer['first_name'] . ' ' . $archer['last_name']),
                        $archer['school'] ?? '',
                        $archer['level'] ?? '',
                        $archer['gender'] ?? '',
                        $currentBale,
                        $targetLetter
                    ]);
                
                $baleArchers[] = trim($archer['first_name'] . ' ' . $archer['last_name'][0] . '.');
                $archerIndex++;
            }
            
            $baleAssignments[] = [
                'baleNumber' => $currentBale,
                'archers' => $baleArchers,
                'count' => count($baleArchers)
            ];
            
            $currentBale++;
        }
        
        json_response([
            'roundArchersCreated' => $numArchers,
            'division' => $round['division'],
            'baleAssignments' => $baleAssignments,
            'nextAvailableBale' => $currentBale,
            'summary' => "$numArchers archers assigned to " . count($baleAssignments) . " bale(s)"
        ], 201);
        
    } catch (Exception $e) {
        error_log("Add archers to round failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// Get an event snapshot: division-based rounds with archer data (PUBLIC - no auth required for archers to see assignments)
if (preg_match('#^/v1/events/([0-9a-f-]+)/snapshot$#i', $route, $m) && $method === 'GET') {
    $eventId = $m[1];
    $pdo = db();
    
    // Get event info (include entry_code for client-side auth)
    $event = $pdo->prepare('SELECT id, name, date, status, event_type, entry_code FROM events WHERE id=? LIMIT 1');
    $event->execute([$eventId]);
    $eventData = $event->fetch();
    
    if (!$eventData) {
        json_response(['error' => 'Event not found'], 404);
        exit;
    }
    
    // Get division rounds for this event
    $rounds = $pdo->prepare('SELECT id, event_id, round_type as roundType, division, gender, level, status FROM rounds WHERE event_id=? ORDER BY 
        CASE division 
            WHEN \'BVAR\' THEN 1 
            WHEN \'GVAR\' THEN 2 
            WHEN \'BJV\' THEN 3 
            WHEN \'GJV\' THEN 4 
            ELSE 5 
        END');
    $rounds->execute([$eventId]);
    $rs = $rounds->fetchAll();
    
    $divisions = [];
    
    foreach ($rs as $r) {
        $divCode = $r['division'];
        
        // Get archers for this division round
        // IMPORTANT: If duplicates exist (same archer_id), prefer the one WITH bale/target
        // JOIN with archers table to get separate firstName/lastName for consistent data
        $archers = $pdo->prepare('
            SELECT ra.id as roundArcherId, ra.archer_name as archerName, 
                   a.first_name as firstName, a.last_name as lastName,
                   ra.school, ra.gender, ra.level, 
                   ra.target_assignment as target, ra.bale_number as bale, ra.completed, ra.archer_id,
                   ra.locked, ra.card_status, ra.verified_by, ra.verified_at, ra.notes
            FROM round_archers ra
            LEFT JOIN archers a ON a.id = ra.archer_id
            WHERE ra.round_id=? 
            ORDER BY ra.archer_id, 
                     (ra.target_assignment IS NOT NULL AND ra.bale_number IS NOT NULL) DESC,
                     ra.created_at DESC
        ');
        $archers->execute([$r['id']]);
        $allArchers = $archers->fetchAll();
        
        // Deduplicate: Keep only one entry per archer_id (prefer the one with bale/target)
        $seenArcherIds = [];
        $as = [];
        foreach ($allArchers as $archer) {
            $archerId = $archer['archer_id'];
            if ($archerId && isset($seenArcherIds[$archerId])) {
                continue; // Skip duplicate
            }
            if ($archerId) {
                $seenArcherIds[$archerId] = true;
            }
            $as[] = $archer;
        }
        
        $divisionArchers = [];
        
        foreach ($as as $a) {
            // Get end events for this archer
            // CRITICAL: Query by round_archer_id to get the scores (include individual arrows)
            $ee = $pdo->prepare('SELECT end_number as endNumber, a1, a2, a3, end_total as endTotal, running_total as runningTotal, tens, xs, server_ts as serverTs FROM end_events WHERE round_archer_id=? ORDER BY end_number');
            $ee->execute([$a['roundArcherId']]);
            $ends = $ee->fetchAll();
            
            // DEBUG: If this archer has no ends but should have scores, check if there's another round_archer entry
            if (count($ends) === 0 && $a['archer_id']) {
                // Check if there are end_events linked to a DIFFERENT round_archer_id for the same archer
                $alternateCheck = $pdo->prepare('
                    SELECT ee.round_archer_id, COUNT(*) as end_count
                    FROM end_events ee
                    JOIN round_archers ra ON ra.id = ee.round_archer_id
                    WHERE ra.round_id = ? AND ra.archer_id = ?
                    GROUP BY ee.round_archer_id
                ');
                $alternateCheck->execute([$r['id'], $a['archer_id']]);
                $alternateEntry = $alternateCheck->fetch();
                
                if ($alternateEntry && $alternateEntry['end_count'] > 0) {
                    // Found scores under a different round_archer_id! Use that instead
                    $ee->execute([$alternateEntry['round_archer_id']]);
                    $ends = $ee->fetchAll();
                    error_log("SCORE MISMATCH: Archer {$a['archerName']} - scores found under different round_archer_id");
                }
            }
            
            $endsCompleted = count($ends);
            $lastEnd = 0; $lastEndTotal = 0; $runningTotal = 0; $lastSyncTime = null;
            $totalTens = 0; $totalXs = 0;
            
            if ($endsCompleted > 0) {
                $last = end($ends);
                $lastEnd = (int)$last['endNumber'];
                $lastEndTotal = (int)$last['endTotal'];
                $lastSyncTime = $last['serverTs'];
                
                // CRITICAL: Recalculate running total from actual arrow scores to ensure accuracy
                // This fixes discrepancies where stored running_total may be incorrect
                $runningTotal = 0;
                foreach ($ends as $idx => $end) {
                    // Parse arrow scores (handle X, M, and numeric values)
                    $a1 = strtoupper(trim($end['a1'] ?? ''));
                    $a2 = strtoupper(trim($end['a2'] ?? ''));
                    $a3 = strtoupper(trim($end['a3'] ?? ''));
                    
                    $endScore = 0;
                    foreach ([$a1, $a2, $a3] as $arrow) {
                        if ($arrow === 'X' || $arrow === '10') {
                            $endScore += 10;
                        } elseif ($arrow === 'M' || $arrow === '') {
                            $endScore += 0;
                        } else {
                            $endScore += (int)$arrow;
                        }
                    }
                    
                    $runningTotal += $endScore;
                    // Update the running total in the ends array for accurate scorecard display
                    $ends[$idx]['runningTotal'] = $runningTotal;
                    $ends[$idx]['endTotal'] = $endScore; // Also recalculate endTotal for accuracy
                    
                    $totalTens += (int)$end['tens'];
                    $totalXs += (int)$end['xs'];
                }
            }
            
            // Calculate average per arrow
            $totalArrows = $endsCompleted * 3;
            $avgPerArrow = ($totalArrows > 0) ? round($runningTotal / $totalArrows, 2) : 0.00;
            
            $divisionArchers[] = [
                'roundArcherId' => $a['roundArcherId'],
                'archerId' => $a['archer_id'],
                'archerName' => $a['archerName'],
                'firstName' => $a['firstName'] ?? '',
                'lastName' => $a['lastName'] ?? '',
                'school' => $a['school'],
                'gender' => $a['gender'],
                'level' => $a['level'],
                'target' => $a['target'],
                'bale' => (int)$a['bale'],
                'endsCompleted' => $endsCompleted,
                'lastEnd' => $lastEnd,
                'lastEndTotal' => $lastEndTotal,
                'runningTotal' => $runningTotal,
                'avgPerArrow' => $avgPerArrow,
                'tens' => $totalTens,
                'xs' => $totalXs,
                'completed' => (bool)$a['completed'],
                'locked' => (bool)$a['locked'],
                'cardStatus' => $a['card_status'],
                'verifiedBy' => $a['verified_by'],
                'verifiedAt' => $a['verified_at'],
                'notes' => $a['notes'],
                'lastSyncTime' => $lastSyncTime,
                'scorecard' => [
                    'ends' => $ends
                ],
                'roundId' => $r['id']
            ];
        }
        
        $divisions[$divCode] = [
            'roundId' => $r['id'],
            'eventId' => $r['event_id'],
            'roundType' => $r['roundType'],
            'division' => $divCode,
            'status' => $r['status'],
            'archerCount' => count($as),
            'archers' => $divisionArchers
        ];
    }
    
    json_response([
        'event' => [
            'id' => $eventData['id'],
            'name' => $eventData['name'],
            'date' => $eventData['date'],
            'status' => $eventData['status'],
            'eventType' => $eventData['event_type'],
            'assignmentMode' => ($eventData['event_type'] === 'auto_assign' ? 'assigned' : 'manual')
        ],
        'divisions' => $divisions
    ]);
    exit;
}

// Upsert a master archer by extId (or derived composite)
if (preg_match('#^/v1/archers/upsert$#', $route) && $method === 'POST') {
    require_api_key();
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $extId = trim($input['extId'] ?? '');
    $first = trim($input['firstName'] ?? '');
    $last = trim($input['lastName'] ?? '');
    $school = trim($input['school'] ?? '');
    $level = trim($input['level'] ?? '');
    $gender = trim($input['gender'] ?? '');
    if ($first === '' || $last === '') { json_response(['error' => 'firstName and lastName required'], 400); exit; }
    if ($extId === '') {
        $extId = $slugify($first) . '-' . $slugify($last) . ($school !== '' ? '-' . $slugify($school) : '');
    }
    try {
        $pdo = db();
        // Check existing by ext_id
        $sel = $pdo->prepare('SELECT id FROM archers WHERE ext_id=? LIMIT 1');
        $sel->execute([$extId]);
        $row = $sel->fetch();
        if ($row) {
            $id = $row['id'];
            $upd = $pdo->prepare('UPDATE archers SET first_name=?, last_name=?, school=?, level=?, gender=? WHERE id=?');
            $upd->execute([$first,$last,$school,$level,$gender,$id]);
            json_response(['archerId' => $id, 'updated' => true]);
        } else {
            $id = $genUuid();
            $ins = $pdo->prepare('INSERT INTO archers (id, ext_id, first_name, last_name, school, level, gender, created_at) VALUES (?,?,?,?,?,?,?,NOW())');
            $ins->execute([$id,$extId,$first,$last,$school,$level,$gender]);
            json_response(['archerId' => $id, 'created' => true], 201);
        }
    } catch (Exception $e) {
        error_log("Archer upsert failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// NOTE: Old bulk_upsert endpoint removed - using full version below with all fields and smart matching
// See POST /v1/archers/bulk_upsert (line ~2114) for the complete implementation

// Upload CSV to app-imports (coach roster)
if (preg_match('#^/v1/upload_csv$#', $route) && $method === 'POST') {
    require_api_key();
    if (!isset($_FILES['file'])) {
        json_response(['error' => 'No file uploaded. Expected field name "file".'], 400);
        return;
    }
    $f = $_FILES['file'];
    if ($f['error'] !== UPLOAD_ERR_OK) {
        json_response(['error' => 'Upload failed', 'code' => $f['error']], 400);
        return;
    }
    $name = strtolower($f['name']);
    if (!preg_match('/\.csv$/', $name)) {
        json_response(['error' => 'Only .csv files are allowed'], 400);
        return;
    }
    if ($f['size'] > 2 * 1024 * 1024) {
        json_response(['error' => 'File too large'], 400);
        return;
    }
    $targetDir = dirname(__DIR__) . '/app-imports';
    if (!is_dir($targetDir)) @mkdir($targetDir, 0755, true);
    $target = $targetDir . '/listimport-01.csv';
    if (!move_uploaded_file($f['tmp_name'], $target)) {
        json_response(['error' => 'Could not save file'], 500);
        return;
    }
    json_response(['ok' => true, 'path' => 'app-imports/listimport-01.csv']);
    return;
}

// ==============================================================================
// ARCHER MASTER LIST ENDPOINTS
// ==============================================================================

// POST /v1/archers/bulk_upsert - Sync archer master list from client (FULL VERSION with all fields)
if (preg_match('#^/v1/archers/bulk_upsert$#', $route) && $method === 'POST') {
    require_api_key();
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    if (!is_array($input) || empty($input)) {
        json_response(['error' => 'Array of archers required'], 400);
        exit;
    }
    
    try {
        $pdo = db();
        $inserted = 0;
        $updated = 0;
        $samples = ['firstInserted' => null, 'firstUpdated' => null];
        
        foreach ($input as $archer) {
            // Extract and normalize fields (support both firstName/lastName and first/last)
            $firstName = trim($archer['firstName'] ?? $archer['first'] ?? '');
            $lastName = trim($archer['lastName'] ?? $archer['last'] ?? '');
            
            // Validate required fields
            if (empty($firstName) || empty($lastName)) continue;
            
            // Normalize all fields
            $normalized = [
                'id' => $archer['id'] ?? null,
                'extId' => trim($archer['extId'] ?? ''),
                'firstName' => $firstName,
                'lastName' => $lastName,
                'nickname' => $normalizeArcherField('nickname', $archer['nickname'] ?? null),
                'photoUrl' => $normalizeArcherField('photoUrl', $archer['photoUrl'] ?? null),
                'school' => $normalizeArcherField('school', $archer['school'] ?? null),
                'grade' => $normalizeArcherField('grade', $archer['grade'] ?? null),
                'gender' => $normalizeArcherField('gender', $archer['gender'] ?? null),
                'level' => $normalizeArcherField('level', $archer['level'] ?? null),
                'status' => $normalizeArcherField('status', $archer['status'] ?? null),
                'faves' => $normalizeArcherField('faves', $archer['faves'] ?? null),
                'domEye' => $normalizeArcherField('domEye', $archer['domEye'] ?? null),
                'domHand' => $normalizeArcherField('domHand', $archer['domHand'] ?? null),
                'heightIn' => $normalizeArcherField('heightIn', $archer['heightIn'] ?? null),
                'wingspanIn' => $normalizeArcherField('wingspanIn', $archer['wingspanIn'] ?? null),
                'drawLengthSugg' => $normalizeArcherField('drawLengthSugg', $archer['drawLengthSugg'] ?? null),
                'riserHeightIn' => $normalizeArcherField('riserHeightIn', $archer['riserHeightIn'] ?? null),
                'limbLength' => $normalizeArcherField('limbLength', $archer['limbLength'] ?? null),
                'limbWeightLbs' => $normalizeArcherField('limbWeightLbs', $archer['limbWeightLbs'] ?? null),
                'notesGear' => $normalizeArcherField('notesGear', $archer['notesGear'] ?? null),
                'notesCurrent' => $normalizeArcherField('notesCurrent', $archer['notesCurrent'] ?? null),
                'notesArchive' => $normalizeArcherField('notesArchive', $archer['notesArchive'] ?? null),
                'email' => $normalizeArcherField('email', $archer['email'] ?? null),
                'phone' => $normalizeArcherField('phone', $archer['phone'] ?? null),
                'usArcheryId' => $normalizeArcherField('usArcheryId', $archer['usArcheryId'] ?? null),
                'jvPr' => $normalizeArcherField('jvPr', $archer['jvPr'] ?? null),
                'varPr' => $normalizeArcherField('varPr', $archer['varPr'] ?? null),
            ];
            
            // Generate extId if missing
            if (empty($normalized['extId'])) {
                $normalized['extId'] = $slugify($firstName) . '-' . $slugify($lastName) . 
                    ($normalized['school'] && $normalized['school'] !== 'UNK' ? '-' . $slugify($normalized['school']) : '');
            }
            
            // Smart matching: Find existing archer
            $existingId = $findExistingArcher($pdo, $normalized);
            
            if ($existingId) {
                // UPDATE: Only update fields that are provided (partial updates)
                $updateFields = [];
                $updateValues = [];
                
                // Build dynamic UPDATE statement (only include non-null fields)
                if ($normalized['extId']) { $updateFields[] = 'ext_id = ?'; $updateValues[] = $normalized['extId']; }
                if ($normalized['firstName']) { $updateFields[] = 'first_name = ?'; $updateValues[] = $normalized['firstName']; }
                if ($normalized['lastName']) { $updateFields[] = 'last_name = ?'; $updateValues[] = $normalized['lastName']; }
                if ($normalized['nickname'] !== null) { $updateFields[] = 'nickname = ?'; $updateValues[] = $normalized['nickname']; }
                if ($normalized['photoUrl'] !== null) { $updateFields[] = 'photo_url = ?'; $updateValues[] = $normalized['photoUrl']; }
                if ($normalized['school']) { $updateFields[] = 'school = ?'; $updateValues[] = $normalized['school']; }
                if ($normalized['grade'] !== null) { $updateFields[] = 'grade = ?'; $updateValues[] = $normalized['grade']; }
                if ($normalized['gender']) { $updateFields[] = 'gender = ?'; $updateValues[] = $normalized['gender']; }
                if ($normalized['level']) { $updateFields[] = 'level = ?'; $updateValues[] = $normalized['level']; }
                if ($normalized['status']) { $updateFields[] = 'status = ?'; $updateValues[] = $normalized['status']; }
                if ($normalized['faves'] !== null) { $updateFields[] = 'faves = ?'; $updateValues[] = $normalized['faves']; }
                if ($normalized['domEye'] !== null) { $updateFields[] = 'dom_eye = ?'; $updateValues[] = $normalized['domEye']; }
                if ($normalized['domHand'] !== null) { $updateFields[] = 'dom_hand = ?'; $updateValues[] = $normalized['domHand']; }
                if ($normalized['heightIn'] !== null) { $updateFields[] = 'height_in = ?'; $updateValues[] = $normalized['heightIn']; }
                if ($normalized['wingspanIn'] !== null) { $updateFields[] = 'wingspan_in = ?'; $updateValues[] = $normalized['wingspanIn']; }
                if ($normalized['drawLengthSugg'] !== null) { $updateFields[] = 'draw_length_sugg = ?'; $updateValues[] = $normalized['drawLengthSugg']; }
                if ($normalized['riserHeightIn'] !== null) { $updateFields[] = 'riser_height_in = ?'; $updateValues[] = $normalized['riserHeightIn']; }
                if ($normalized['limbLength'] !== null) { $updateFields[] = 'limb_length = ?'; $updateValues[] = $normalized['limbLength']; }
                if ($normalized['limbWeightLbs'] !== null) { $updateFields[] = 'limb_weight_lbs = ?'; $updateValues[] = $normalized['limbWeightLbs']; }
                if ($normalized['notesGear'] !== null) { $updateFields[] = 'notes_gear = ?'; $updateValues[] = $normalized['notesGear']; }
                if ($normalized['notesCurrent'] !== null) { $updateFields[] = 'notes_current = ?'; $updateValues[] = $normalized['notesCurrent']; }
                if ($normalized['notesArchive'] !== null) { $updateFields[] = 'notes_archive = ?'; $updateValues[] = $normalized['notesArchive']; }
                if ($normalized['email'] !== null) { $updateFields[] = 'email = ?'; $updateValues[] = $normalized['email']; }
                if ($normalized['phone'] !== null) { $updateFields[] = 'phone = ?'; $updateValues[] = $normalized['phone']; }
                if ($normalized['usArcheryId'] !== null) { $updateFields[] = 'us_archery_id = ?'; $updateValues[] = $normalized['usArcheryId']; }
                if ($normalized['jvPr'] !== null) { $updateFields[] = 'jv_pr = ?'; $updateValues[] = $normalized['jvPr']; }
                if ($normalized['varPr'] !== null) { $updateFields[] = 'var_pr = ?'; $updateValues[] = $normalized['varPr']; }
                
                $updateFields[] = 'updated_at = NOW()';
                $updateValues[] = $existingId;
                
                $sql = 'UPDATE archers SET ' . implode(', ', $updateFields) . ' WHERE id = ?';
                $stmt = $pdo->prepare($sql);
                $stmt->execute($updateValues);
                
                if ($samples['firstUpdated'] === null) {
                    // Read back the updated record for verification
                    $verify = $pdo->prepare('SELECT id, ext_id, first_name, last_name, email, phone FROM archers WHERE id = ?');
                    $verify->execute([$existingId]);
                    $samples['firstUpdated'] = $verify->fetch(PDO::FETCH_ASSOC);
                }
                $updated++;
            } else {
                // INSERT: Create new record with all fields
                $newId = $genUuid();
                $stmt = $pdo->prepare('INSERT INTO archers (
                    id, ext_id, first_name, last_name, nickname, photo_url, school, grade, 
                    gender, level, status, faves, dom_eye, dom_hand, height_in, wingspan_in, 
                    draw_length_sugg, riser_height_in, limb_length, limb_weight_lbs, 
                    notes_gear, notes_current, notes_archive, email, phone, us_archery_id, 
                    jv_pr, var_pr, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())');
                
                $stmt->execute([
                    $newId,
                    $normalized['extId'],
                    $normalized['firstName'],
                    $normalized['lastName'],
                    $normalized['nickname'],
                    $normalized['photoUrl'],
                    $normalized['school'],
                    $normalized['grade'],
                    $normalized['gender'],
                    $normalized['level'],
                    $normalized['status'] ?? 'active',
                    $normalized['faves'],
                    $normalized['domEye'],
                    $normalized['domHand'],
                    $normalized['heightIn'],
                    $normalized['wingspanIn'],
                    $normalized['drawLengthSugg'],
                    $normalized['riserHeightIn'],
                    $normalized['limbLength'],
                    $normalized['limbWeightLbs'],
                    $normalized['notesGear'],
                    $normalized['notesCurrent'],
                    $normalized['notesArchive'],
                    $normalized['email'],
                    $normalized['phone'],
                    $normalized['usArcheryId'],
                    $normalized['jvPr'],
                    $normalized['varPr']
                ]);
                
                if ($samples['firstInserted'] === null) {
                    $samples['firstInserted'] = [
                        'id' => $newId,
                        'extId' => $normalized['extId'],
                        'firstName' => $normalized['firstName'],
                        'lastName' => $normalized['lastName']
                    ];
                }
                $inserted++;
            }
        }
        
        json_response([
            'ok' => true, 
            'inserted' => $inserted, 
            'updated' => $updated,
            'samples' => $samples
        ], 200);
    } catch (Exception $e) {
        error_log("Bulk upsert failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// GET /v1/archers - Load all archers from master list
if (preg_match('#^/v1/archers$#', $route) && $method === 'GET') {
    require_api_key();
    
    // Optional query params for filtering
    $division = $_GET['division'] ?? null; // BVAR, BJV, GVAR, GJV
    $gender = $_GET['gender'] ?? null;
    $level = $_GET['level'] ?? null;
    
    try {
        $pdo = db();
        // Return ALL fields from archers table
        $sql = 'SELECT 
            id, 
            ext_id as extId, 
            first_name as firstName, 
            last_name as lastName, 
            nickname, 
            photo_url as photoUrl,
            school, 
            grade, 
            gender, 
            level, 
            status,
            faves, 
            dom_eye as domEye, 
            dom_hand as domHand,
            height_in as heightIn, 
            wingspan_in as wingspanIn, 
            draw_length_sugg as drawLengthSugg,
            riser_height_in as riserHeightIn, 
            limb_length as limbLength, 
            limb_weight_lbs as limbWeightLbs,
            notes_gear as notesGear, 
            notes_current as notesCurrent, 
            notes_archive as notesArchive,
            email, 
            phone, 
            us_archery_id as usArcheryId,
            jv_pr as jvPr, 
            var_pr as varPr,
            created_at as createdAt, 
            updated_at as updatedAt
        FROM archers WHERE 1=1';
        $params = [];
        
        if ($division) {
            // Parse division code (e.g., BVAR = M + VAR)
            if ($division === 'BVAR') { $gender = 'M'; $level = 'VAR'; }
            elseif ($division === 'BJV') { $gender = 'M'; $level = 'JV'; }
            elseif ($division === 'GVAR') { $gender = 'F'; $level = 'VAR'; }
            elseif ($division === 'GJV') { $gender = 'F'; $level = 'JV'; }
        }
        
        if ($gender && in_array($gender, ['M', 'F'])) {
            $sql .= ' AND gender = ?';
            $params[] = $gender;
        }
        
        if ($level && in_array($level, ['VAR', 'JV', 'BEG'])) {
            $sql .= ' AND level = ?';
            $params[] = $level;
        }
        
        $sql .= ' ORDER BY last_name, first_name';
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $archers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Parse JSON fields
        foreach ($archers as &$archer) {
            if (!empty($archer['faves'])) {
                $decoded = json_decode($archer['faves'], true);
                $archer['faves'] = is_array($decoded) ? $decoded : [];
            } else {
                $archer['faves'] = [];
            }
        }
        
        json_response(['archers' => $archers], 200);
    } catch (Exception $e) {
        error_log("Load archers failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// POST /v1/archers - Create single archer
if (preg_match('#^/v1/archers$#', $route) && $method === 'POST') {
    require_api_key();
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    $extId = $input['extId'] ?? '';
    $firstName = trim($input['firstName'] ?? '');
    $lastName = trim($input['lastName'] ?? '');
    $school = strtoupper(substr(trim($input['school'] ?? ''), 0, 3));
    $level = strtoupper(trim($input['level'] ?? 'VAR'));
    $gender = strtoupper(substr(trim($input['gender'] ?? 'M'), 0, 1));
    
    if (empty($firstName) || empty($lastName)) {
        json_response(['error' => 'firstName and lastName required'], 400);
        exit;
    }
    
    // Normalize
    if (!in_array($level, ['VAR', 'JV'])) $level = 'VAR';
    if (!in_array($gender, ['M', 'F'])) $gender = 'M';
    if (empty($school)) $school = 'UNK';
    
    try {
        $pdo = db();
        
        // Upsert by extId if provided
        if ($extId) {
            $existing = $pdo->prepare('SELECT id FROM archers WHERE ext_id = ? LIMIT 1');
            $existing->execute([$extId]);
            $row = $existing->fetch();
            
            if ($row) {
                json_response(['archerId' => $row['id'], 'existed' => true], 200);
                exit;
            }
        }
        
        // Insert new
        $id = $genUuid();
        $stmt = $pdo->prepare('INSERT INTO archers (id, ext_id, first_name, last_name, school, level, gender, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())');
        $stmt->execute([$id, $extId, $firstName, $lastName, $school, $level, $gender]);
        
        json_response(['archerId' => $id], 201);
    } catch (Exception $e) {
        error_log("Archer creation failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

json_response(['error' => 'Not Found', 'route' => $route], 404);
