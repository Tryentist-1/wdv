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
    json_response(['ok' => true, 'time' => time()]);
    exit;
}

if (preg_match('#^/v1/rounds$#', $route) && $method === 'POST') {
    require_api_key();
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $roundType = $input['roundType'] ?? 'R300';
    $date = $input['date'] ?? date('Y-m-d');
    $bale = (int)($input['baleNumber'] ?? 1);
    $pdo = db();
    $id = $genUuid();
    $pdo->prepare('INSERT INTO rounds (id,round_type,date,bale_number,created_at) VALUES (?,?,?,?,NOW())')->execute([$id,$roundType,$date,$bale]);
    json_response(['roundId' => $id], 201);
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
    $pdo = db();
    $id = $genUuid();
    $stmt = $pdo->prepare('INSERT INTO round_archers (id, round_id, archer_name, school, level, gender, target_assignment, created_at) VALUES (?,?,?,?,?,?,?,NOW())');
    $stmt->execute([$id,$roundId,$name,$school,$level,$gender,$target]);
    json_response(['roundArcherId' => $id], 201);
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

json_response(['error' => 'Not Found', 'route' => $route], 404);


