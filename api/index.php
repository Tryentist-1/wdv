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

// Basic router
if ($route === '/v1/health') {
    $key = $_SERVER['HTTP_X_API_KEY'] ?? '';
    $pass = $_SERVER['HTTP_X_PASSCODE'] ?? '';
    json_response(['ok' => true, 'time' => time(), 'hasApiKey' => !!$key, 'hasPass' => !!$pass]);
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
    $bale = (int)($input['baleNumber'] ?? 1);
    try {
        $pdo = db();
        // Check if round already exists
        $existing = $pdo->prepare('SELECT id FROM rounds WHERE round_type=? AND date=? AND bale_number=? LIMIT 1');
        $existing->execute([$roundType, $date, $bale]);
        $row = $existing->fetch();
        
        if ($row) {
            // Return existing round ID
            json_response(['roundId' => $row['id']], 200);
        } else {
            // Create new round
            $id = $genUuid();
            $stmt = $pdo->prepare('INSERT INTO rounds (id,round_type,date,bale_number,created_at) VALUES (?,?,?,?,NOW())');
            $stmt->execute([$id,$roundType,$date,$bale]);
            
            // Try to link to most recent event for this date
            try {
                $event = $pdo->prepare('SELECT id FROM events WHERE date=? ORDER BY created_at DESC LIMIT 1');
                $event->execute([$date]);
                $eventRow = $event->fetch();
                if ($eventRow) {
                    $link = $pdo->prepare('UPDATE rounds SET event_id=? WHERE id=?');
                    $link->execute([$eventRow['id'], $id]);
                }
            } catch (Exception $e) {
                // Ignore event linking errors
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
    $name = trim($input['archerName'] ?? '');
    $school = $input['school'] ?? '';
    $level = $input['level'] ?? '';
    $gender = $input['gender'] ?? '';
    $target = $input['targetAssignment'] ?? '';
    $targetSize = $input['targetSize'] ?? null;
    if ($name === '') { json_response(['error' => 'archerName required'], 400); exit; }
    try {
        $pdo = db();
        // Check if archer already exists for this round/target
        $existing = $pdo->prepare('SELECT id FROM round_archers WHERE round_id=? AND target_assignment=? LIMIT 1');
        $existing->execute([$roundId, $target]);
        $row = $existing->fetch();
        
        if ($row) {
            // Return existing archer ID
            json_response(['roundArcherId' => $row['id']], 200);
        } else {
            // Create new archer
            $id = $genUuid();
            $stmt = $pdo->prepare('INSERT INTO round_archers (id, round_id, archer_name, school, level, gender, target_assignment, target_size, created_at) VALUES (?,?,?,?,?,?,?,?,NOW())');
            $stmt->execute([$id,$roundId,$name,$school,$level,$gender,$target,$targetSize]);
            json_response(['roundArcherId' => $id], 201);
        }
    } catch (Exception $e) {
        error_log("Archer creation failed: " . $e->getMessage());
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
    if ($end < 1) { json_response(['error' => 'endNumber required'], 400); exit; }
    $pdo = db();
    // Upsert by (round_archer_id, end_number)
    $sql = 'INSERT INTO end_events (round_id,round_archer_id,end_number,a1,a2,a3,end_total,running_total,tens,xs,device_ts,server_ts) VALUES (?,?,?,?,?,?,?,?,?,?,?,NOW())
            ON DUPLICATE KEY UPDATE a1=VALUES(a1),a2=VALUES(a2),a3=VALUES(a3),end_total=VALUES(end_total),running_total=VALUES(running_total),tens=VALUES(tens),xs=VALUES(xs),device_ts=VALUES(device_ts),server_ts=NOW()';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$roundId,$roundArcherId,$end,$a1,$a2,$a3,$endTotal,$running,$tens,$xs,$deviceTs]);
    json_response(['ok' => true]);
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
                ->execute([$roundId, $eventId, $roundType, $div['code'], $div['gender'], $div['level'], $date, 'Created']);
            
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
                // Get archers for this division
                $stmt = $pdo->prepare('SELECT id,first_name,last_name,school,level,gender FROM archers WHERE gender=? AND level=? ORDER BY last_name,first_name');
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

// Add archers to an event (creates/updates division rounds and assigns bales)
if (preg_match('#^/v1/events/([0-9a-f-]+)/archers$#i', $route, $m) && $method === 'POST') {
    require_api_key();
    $eventId = $m[1];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $archerIds = $input['archerIds'] ?? [];
    $assignmentMode = $input['assignmentMode'] ?? 'auto_assign'; // 'auto_assign' or 'manual'
    
    if (empty($archerIds) || !is_array($archerIds)) {
        json_response(['error' => 'archerIds array required'], 400);
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
                    ->execute([$roundId, $eventId, 'R300', $divCode, $div['gender'], $div['level'], $event['date'], 'Created']);
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
        $pdo->prepare("UPDATE rounds SET status='Created' WHERE id IN ($placeholders)")->execute($roundIds);
        json_response(['ok' => true, 'message' => 'All entered scores deleted. Rounds reset to Created.']);
    } catch (Exception $e) {
        error_log("Event reset failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// Get an event snapshot: division-based rounds with archer data (PUBLIC - no auth required for archers to see assignments)
if (preg_match('#^/v1/events/([0-9a-f-]+)/snapshot$#i', $route, $m) && $method === 'GET') {
    $eventId = $m[1];
    $pdo = db();
    
    // Get event info
    $event = $pdo->prepare('SELECT id, name, date, status FROM events WHERE id=? LIMIT 1');
    $event->execute([$eventId]);
    $eventData = $event->fetch();
    
    if (!$eventData) {
        json_response(['error' => 'Event not found'], 404);
        exit;
    }
    
    // Get division rounds for this event
    $rounds = $pdo->prepare('SELECT id, round_type as roundType, division, gender, level, status FROM rounds WHERE event_id=? ORDER BY 
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
        $archers = $pdo->prepare('SELECT ra.id as roundArcherId, ra.archer_name as archerName, ra.school, ra.gender, ra.level, ra.target_assignment as target, ra.bale_number as bale, ra.completed FROM round_archers ra WHERE ra.round_id=? ORDER BY ra.bale_number, ra.target_assignment');
        $archers->execute([$r['id']]);
        $as = $archers->fetchAll();
        
        $divisionArchers = [];
        
        foreach ($as as $a) {
            // Get end events for this archer
            $ee = $pdo->prepare('SELECT end_number as endNumber, end_total as endTotal, running_total as runningTotal, tens, xs, server_ts as serverTs FROM end_events WHERE round_archer_id=? ORDER BY end_number');
            $ee->execute([$a['roundArcherId']]);
            $ends = $ee->fetchAll();
            
            $endsCompleted = count($ends);
            $lastEnd = 0; $lastEndTotal = 0; $runningTotal = 0; $lastSyncTime = null;
            $totalTens = 0; $totalXs = 0;
            
            if ($endsCompleted > 0) {
                $last = end($ends);
                $lastEnd = (int)$last['endNumber'];
                $lastEndTotal = (int)$last['endTotal'];
                $runningTotal = (int)$last['runningTotal'];
                $lastSyncTime = $last['serverTs'];
                
                foreach ($ends as $end) {
                    $totalTens += (int)$end['tens'];
                    $totalXs += (int)$end['xs'];
                }
            }
            
            // Calculate average per arrow
            $totalArrows = $endsCompleted * 3;
            $avgPerArrow = ($totalArrows > 0) ? round($runningTotal / $totalArrows, 2) : 0.00;
            
            $divisionArchers[] = [
                'roundArcherId' => $a['roundArcherId'],
                'archerName' => $a['archerName'],
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
                'lastSyncTime' => $lastSyncTime,
            ];
        }
        
        $divisions[$divCode] = [
            'roundId' => $r['id'],
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
            'status' => $eventData['status']
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

// Bulk upsert master archers
if (preg_match('#^/v1/archers/bulk_upsert$#', $route) && $method === 'POST') {
    require_api_key();
    $items = json_decode(file_get_contents('php://input'), true) ?? [];
    if (!is_array($items)) { json_response(['error' => 'array body required'], 400); exit; }
    try {
        $pdo = db();
        $upserted = 0; $created = 0; $updated = 0;
        $sel = $pdo->prepare('SELECT id FROM archers WHERE ext_id=? LIMIT 1');
        $ins = $pdo->prepare('INSERT INTO archers (id, ext_id, first_name, last_name, school, level, gender, created_at) VALUES (?,?,?,?,?,?,?,NOW())');
        $upd = $pdo->prepare('UPDATE archers SET first_name=?, last_name=?, school=?, level=?, gender=? WHERE id=?');
        foreach ($items as $it) {
            $first = trim($it['firstName'] ?? '');
            $last = trim($it['lastName'] ?? '');
            if ($first === '' || $last === '') continue;
            $school = trim($it['school'] ?? '');
            $level = trim($it['level'] ?? '');
            $gender = trim($it['gender'] ?? '');
            $extId = trim($it['extId'] ?? '');
            if ($extId === '') { $extId = $slugify($first) . '-' . $slugify($last) . ($school !== '' ? '-' . $slugify($school) : ''); }
            $sel->execute([$extId]);
            $row = $sel->fetch();
            if ($row) {
                $upd->execute([$first,$last,$school,$level,$gender,$row['id']]);
                $updated++;
            } else {
                $id = $genUuid();
                $ins->execute([$id,$extId,$first,$last,$school,$level,$gender]);
                $created++;
            }
            $upserted++;
        }
        json_response(['upserted' => $upserted, 'created' => $created, 'updated' => $updated]);
    } catch (Exception $e) {
        error_log("Bulk archer upsert failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

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

// POST /v1/archers/bulk_upsert - Sync archer master list from client
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
        
        foreach ($input as $archer) {
            $extId = $archer['extId'] ?? '';
            $firstName = trim($archer['firstName'] ?? '');
            $lastName = trim($archer['lastName'] ?? '');
            $school = strtoupper(substr(trim($archer['school'] ?? ''), 0, 3));
            $level = strtoupper(trim($archer['level'] ?? 'VAR'));
            $gender = strtoupper(substr(trim($archer['gender'] ?? 'M'), 0, 1));
            
            // Validate required fields
            if (empty($firstName) || empty($lastName)) continue;
            
            // Normalize values
            if (!in_array($level, ['VAR', 'JV'])) $level = 'VAR';
            if (!in_array($gender, ['M', 'F'])) $gender = 'M';
            if (empty($school)) $school = 'UNK';
            
            // Upsert by extId
            $existing = $pdo->prepare('SELECT id FROM archers WHERE ext_id = ? LIMIT 1');
            $existing->execute([$extId]);
            $row = $existing->fetch();
            
            if ($row) {
                // Update existing
                $stmt = $pdo->prepare('UPDATE archers SET first_name=?, last_name=?, school=?, level=?, gender=? WHERE id=?');
                $stmt->execute([$firstName, $lastName, $school, $level, $gender, $row['id']]);
                $updated++;
            } else {
                // Insert new
                $id = $genUuid();
                $stmt = $pdo->prepare('INSERT INTO archers (id, ext_id, first_name, last_name, school, level, gender, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())');
                $stmt->execute([$id, $extId, $firstName, $lastName, $school, $level, $gender]);
                $inserted++;
            }
        }
        
        json_response(['ok' => true, 'inserted' => $inserted, 'updated' => $updated], 200);
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
        $sql = 'SELECT id, ext_id as extId, first_name as firstName, last_name as lastName, school, level, gender, created_at as createdAt FROM archers WHERE 1=1';
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
        
        if ($level && in_array($level, ['VAR', 'JV'])) {
            $sql .= ' AND level = ?';
            $params[] = $level;
        }
        
        $sql .= ' ORDER BY last_name, first_name';
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $archers = $stmt->fetchAll();
        
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


