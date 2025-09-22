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
            $stmt = $pdo->prepare('INSERT INTO round_archers (id, round_id, archer_name, school, level, gender, target_assignment, created_at) VALUES (?,?,?,?,?,?,?,NOW())');
            $stmt->execute([$id,$roundId,$name,$school,$level,$gender,$target]);
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
    $seed = !!($input['seedRounds'] ?? false);
    try {
        $pdo = db();
        ensure_events_schema($pdo);
        $eventId = $genUuid();
        $pdo->prepare('INSERT INTO events (id,name,date,created_at) VALUES (?,?,?,NOW())')->execute([$eventId,$name,$date]);
        if ($seed) {
            $ins = $pdo->prepare('INSERT INTO rounds (id,event_id,round_type,date,bale_number,created_at) VALUES (?,?,?,?,?,NOW())');
            for ($b = 1; $b <= 12; $b++) {
                // Check if round already exists before creating
                $existing = $pdo->prepare('SELECT id FROM rounds WHERE round_type=? AND date=? AND bale_number=? LIMIT 1');
                $existing->execute(['R300', $date, $b]);
                $existingRound = $existing->fetch();
                
                if ($existingRound) {
                    // Link existing round to this event
                    $link = $pdo->prepare('UPDATE rounds SET event_id=? WHERE id=?');
                    $link->execute([$eventId, $existingRound['id']]);
                } else {
                    // Create new round
                    $rid = $genUuid();
                    $ins->execute([$rid,$eventId,'R300',$date,$b]);
                }
            }
        }
        json_response(['eventId' => $eventId], 201);
    } catch (Exception $e) {
        error_log("Event creation failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// List recent events
if (preg_match('#^/v1/events/recent$#', $route) && $method === 'GET') {
    require_api_key();
    $pdo = db();
    ensure_events_schema($pdo);
    $rows = $pdo->query('SELECT id,name,date,created_at as createdAt FROM events ORDER BY created_at DESC LIMIT 50')->fetchAll();
    json_response(['events' => $rows]);
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

// Get an event snapshot: rounds and their latest state
if (preg_match('#^/v1/events/([0-9a-f-]+)/snapshot$#i', $route, $m) && $method === 'GET') {
    require_api_key();
    $eventId = $m[1];
    $pdo = db();
    // Get rounds for this event, plus any unlinked rounds for the same date
    $event = $pdo->prepare('SELECT date FROM events WHERE id=? LIMIT 1');
    $event->execute([$eventId]);
    $eventDate = $event->fetch()['date'] ?? date('Y-m-d');
    
    $rounds = $pdo->prepare('SELECT id, round_type as roundType, date, bale_number as baleNumber FROM rounds WHERE (event_id=? OR (event_id IS NULL AND date=?)) ORDER BY bale_number');
    $rounds->execute([$eventId, $eventDate]);
    $rs = $rounds->fetchAll();
    // Attach quick archer counts and totals
    foreach ($rs as &$r) {
        $archers = $pdo->prepare('SELECT ra.id as roundArcherId, ra.archer_name as archerName, ra.gender as gender, ra.level as level, ra.target_assignment as target FROM round_archers ra WHERE ra.round_id=?');
        $archers->execute([$r['id']]);
        $as = $archers->fetchAll();
        $r['archers'] = [];
        $r['totalArchers'] = count($as);
        $r['archerCount'] = count($as); // For backward compatibility
        foreach ($as as $a) {
            $ee = $pdo->prepare('SELECT end_number as endNumber, end_total as endTotal, running_total as runningTotal, tens, xs, server_ts as serverTs FROM end_events WHERE round_archer_id=? ORDER BY end_number');
            $ee->execute([$a['roundArcherId']]);
            $ends = $ee->fetchAll();
            $completed = count($ends);
            $lastEnd = 0; $endScore = 0; $running = 0; $updatedAt = null;
            $totalTens = 0; $totalXs = 0;
            if ($completed) {
                $last = end($ends);
                $lastEnd = (int)$last['endNumber'];
                $endScore = (int)$last['endTotal'];
                $running = (int)$last['runningTotal'];
                $updatedAt = (string)$last['serverTs'];
                foreach ($ends as $end) {
                    $totalTens += (int)$end['tens'];
                    $totalXs += (int)$end['xs'];
                }
            }
            $r['archers'][] = [
                'roundArcherId' => $a['roundArcherId'],
                'archerName' => $a['archerName'],
                'gender' => $a['gender'],
                'level' => $a['level'],
                'target' => $a['target'],
                'endsCompleted' => $completed,
                'lastEnd' => $lastEnd,
                'endScore' => $endScore,
                'runningTotal' => $running,
                'tens' => $totalTens,
                'xs' => $totalXs,
                'updatedAt' => $updatedAt,
            ];
        }
    }
    json_response(['eventId' => $eventId, 'rounds' => $rs]);
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

json_response(['error' => 'Not Found', 'route' => $route], 404);


