<?php
require_once __DIR__ . '/db.php';

cors();

$genUuid = function(): string {
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40); // version 4
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80); // variant
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
};

// Generate match code: solo-[initials]-[MMDD]
// Example: solo-JSJD-1117 (John Smith vs Jane Doe on Nov 17)
function generate_solo_match_code(PDO $pdo, string $archer1FirstName, string $archer1LastName, string $archer2FirstName, string $archer2LastName, string $date): string {
    // Extract first letter of first and last name for each archer
    $initials1 = strtoupper(substr($archer1FirstName, 0, 1) . substr($archer1LastName, 0, 1));
    $initials2 = strtoupper(substr($archer2FirstName, 0, 1) . substr($archer2LastName, 0, 1));
    
    // Get MMDD from date (YYYY-MM-DD format)
    $dateParts = explode('-', $date);
    $mmdd = $dateParts[1] . $dateParts[2]; // MM + DD
    
    $code = 'solo-' . $initials1 . $initials2 . '-' . $mmdd;
    
    // Ensure uniqueness - if code exists, append a number
    $baseCode = $code;
    $counter = 1;
    do {
        $stmt = $pdo->prepare('SELECT id FROM solo_matches WHERE match_code = ? LIMIT 1');
        $stmt->execute([$code]);
        if ($stmt->fetch()) {
            $code = $baseCode . $counter;
            $counter++;
        } else {
            break;
        }
    } while (true);
    
    return $code;
}

// Generate match code: team-[INITIALS]-[MMDD]
// Example: team-TASJ-1117 (Team 1: Terry, Adam, Sarah vs Team 2: John, Jane, Joe on Nov 17)
function generate_team_match_code(PDO $pdo, array $team1Archers, array $team2Archers, string $date): string {
    // Extract first letter of first and last name for each archer (up to 3 per team)
    $initials1 = '';
    $initials2 = '';
    
    foreach ($team1Archers as $archer) {
        $name = $archer['archer_name'] ?? '';
        $parts = explode(' ', $name, 2);
        $first = $parts[0] ?? '';
        $last = $parts[1] ?? '';
        if ($first && $last) {
            $initials1 .= strtoupper(substr($first, 0, 1) . substr($last, 0, 1));
        }
    }
    
    foreach ($team2Archers as $archer) {
        $name = $archer['archer_name'] ?? '';
        $parts = explode(' ', $name, 2);
        $first = $parts[0] ?? '';
        $last = $parts[1] ?? '';
        if ($first && $last) {
            $initials2 .= strtoupper(substr($first, 0, 1) . substr($last, 0, 1));
        }
    }
    
    // Limit to fit VARCHAR(20): "team-" (5) + initials (max 10) + "-" (1) + MMDD (4) = 20
    // So max 10 initials total (5 per team, or 3 per team if we want to be safe)
    $initials1 = substr($initials1, 0, 5); // Limit to 5 chars (2-3 archers)
    $initials2 = substr($initials2, 0, 5); // Limit to 5 chars (2-3 archers)
    
    // Get MMDD from date
    $dateParts = explode('-', $date);
    $mmdd = $dateParts[1] . $dateParts[2];
    
    $code = 'team-' . $initials1 . $initials2 . '-' . $mmdd;
    
    // Ensure code doesn't exceed 20 chars (truncate if needed)
    $code = substr($code, 0, 20);
    
    // Ensure uniqueness
    $baseCode = $code;
    $counter = 1;
    do {
        $stmt = $pdo->prepare('SELECT id FROM team_matches WHERE match_code = ? LIMIT 1');
        $stmt->execute([$code]);
        if ($stmt->fetch()) {
            $code = $baseCode . $counter;
            $counter++;
        } else {
            break;
        }
    } while (true);
    
    return $code;
}

// Generate round entry code: R300-[TARGET_SIZE]-[MMDD]-[RANDOM]
// Example: R300-60CM-1201-A2D (R300 round, 60cm target, Dec 1, random suffix A2D)
function generate_round_entry_code(PDO $pdo, string $roundType, string $level, string $date): string {
    // Map level to target size
    $targetSize = (strtoupper($level) === 'VAR' || strtoupper($level) === 'VARSITY') ? '40CM' : '60CM';
    
    // Get MMDD from date (YYYY-MM-DD format)
    $dateParts = explode('-', $date);
    $mmdd = $dateParts[1] . $dateParts[2]; // MM + DD
    
    // Generate random 3-character alphanumeric suffix (A-Z, 0-9)
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $random = '';
    for ($i = 0; $i < 3; $i++) {
        $random .= $chars[random_int(0, strlen($chars) - 1)];
    }
    
    $code = $roundType . '-' . $targetSize . '-' . $mmdd . '-' . $random;
    
    // Ensure uniqueness - if code exists, regenerate random suffix
    $baseCode = $roundType . '-' . $targetSize . '-' . $mmdd . '-';
    $maxAttempts = 10;
    $attempts = 0;
    
    do {
        $stmt = $pdo->prepare('SELECT id FROM rounds WHERE entry_code = ? LIMIT 1');
        $stmt->execute([$code]);
        if ($stmt->fetch()) {
            // Regenerate random suffix
            $random = '';
            for ($i = 0; $i < 3; $i++) {
                $random .= $chars[random_int(0, strlen($chars) - 1)];
            }
            $code = $baseCode . $random;
            $attempts++;
        } else {
            break;
        }
    } while ($attempts < $maxAttempts);
    
    // If still not unique after max attempts, append counter
    if ($attempts >= $maxAttempts) {
        $counter = 1;
        do {
            $code = $baseCode . $random . $counter;
            $stmt = $pdo->prepare('SELECT id FROM rounds WHERE entry_code = ? LIMIT 1');
            $stmt->execute([$code]);
            if ($stmt->fetch()) {
                $counter++;
            } else {
                break;
            }
        } while (true);
    }
    
    return $code;
}

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
    try {
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
        
        $history = [];
        
        // Get all ranking rounds this archer participated in (including standalone rounds)
        $rounds = $pdo->prepare('
        SELECT 
            e.id AS event_id,
            e.name AS event_name,
            e.date AS event_date,
            r.id AS round_id,
            r.division,
            r.round_type,
            r.entry_code,
            r.date AS round_date,
            ra.id AS round_archer_id,
            ra.archer_id,
            ra.bale_number,
            ra.target_assignment,
            ra.card_status,
            ra.locked,
            MAX(ee.running_total) AS final_score,
            COUNT(DISTINCT ee.end_number) AS ends_completed,
            SUM(ee.tens) AS total_tens,
            SUM(ee.xs) AS total_xs
        FROM round_archers ra
        JOIN rounds r ON r.id = ra.round_id
        LEFT JOIN events e ON e.id = r.event_id
        LEFT JOIN end_events ee ON ee.round_archer_id = ra.id
        WHERE ra.archer_id = ?
        GROUP BY ra.id, e.id, e.name, e.date, r.id, r.division, r.round_type, r.entry_code, r.date, ra.archer_id, ra.bale_number, ra.target_assignment, ra.card_status, ra.locked
        ORDER BY COALESCE(e.date, r.date) DESC, e.name, r.division
    ');
        $rounds->execute([$archerData['id']]);
        $rankingRounds = $rounds->fetchAll();
        
        // Add type field and format for history (include standalone round info)
        foreach ($rankingRounds as $round) {
            $round['type'] = 'ranking';
            // For standalone rounds, set event_name to indicate standalone
            if (!$round['event_id']) {
                $round['event_name'] = 'Standalone Round';
                $round['is_standalone'] = true;
            } else {
                $round['is_standalone'] = false;
            }
            $history[] = $round;
        }
        
        // Get all solo matches this archer participated in
        // Calculate sets_won from set_points in solo_match_sets (more accurate than denormalized field)
        $soloMatches = $pdo->prepare('
        SELECT 
            sm.id AS match_id,
            sm.event_id,
            sm.match_code,
            sm.date AS event_date,
            sm.status,
            sm.card_status,
            sm.locked,
            sm.winner_archer_id,
            e.name AS event_name,
            sma1.id AS archer1_match_archer_id,
            sma1.archer_id AS archer1_id,
            sma1.archer_name AS archer1_name,
            sma1.winner AS archer1_winner,
            sma2.id AS archer2_match_archer_id,
            sma2.archer_id AS archer2_id,
            sma2.archer_name AS archer2_name,
            sma2.winner AS archer2_winner
        FROM solo_matches sm
        JOIN solo_match_archers sma1 ON sma1.match_id = sm.id AND sma1.position = 1
        JOIN solo_match_archers sma2 ON sma2.match_id = sm.id AND sma2.position = 2
        LEFT JOIN events e ON e.id = sm.event_id
        WHERE sma1.archer_id = ? OR sma2.archer_id = ?
        ORDER BY sm.date DESC, sm.created_at DESC
    ');
        $soloMatches->execute([$archerData['id'], $archerData['id']]);
        $soloResults = $soloMatches->fetchAll();
        
        // Format solo matches for history and calculate accurate totals
        foreach ($soloResults as $match) {
            $isArcher1 = $match['archer1_id'] === $archerData['id'];
            $opponentName = $isArcher1 ? $match['archer2_name'] : $match['archer1_name'];
            $myMatchArcherId = $isArcher1 ? $match['archer1_match_archer_id'] : $match['archer2_match_archer_id'];
            $opponentMatchArcherId = $isArcher1 ? $match['archer2_match_archer_id'] : $match['archer1_match_archer_id'];
            $isWinner = $isArcher1 ? $match['archer1_winner'] : $match['archer2_winner'];
            
            // Calculate sets_won from set_points (count sets where set_points = 2)
            $setsStmt = $pdo->prepare('
                SELECT 
                    COUNT(CASE WHEN set_points = 2 THEN 1 END) as sets_won,
                    SUM(set_total) as total_score
                FROM solo_match_sets
                WHERE match_archer_id = ? AND set_number <= 5
            ');
            $setsStmt->execute([$myMatchArcherId]);
            $myStats = $setsStmt->fetch(PDO::FETCH_ASSOC);
            $setsWon = (int)($myStats['sets_won'] ?? 0);
            $totalScore = (int)($myStats['total_score'] ?? 0);
            
            $setsStmt->execute([$opponentMatchArcherId]);
            $opponentStats = $setsStmt->fetch(PDO::FETCH_ASSOC);
            $opponentSetsWon = (int)($opponentStats['sets_won'] ?? 0);
            
            $history[] = [
                'type' => 'solo',
                'match_id' => $match['match_id'],
                'event_id' => $match['event_id'],
                'match_code' => $match['match_code'], // Include match code for authentication
                'event_name' => $match['event_name'] ?: 'Solo Match',
                'event_date' => $match['event_date'],
                'card_status' => $match['card_status'],
                'locked' => $match['locked'],
                'opponent_name' => $opponentName,
                'sets_won' => $setsWon,
                'opponent_sets_won' => $opponentSetsWon,
                'final_score' => $totalScore,
                'is_winner' => $isWinner,
                'ends_completed' => 0, // Not applicable for matches
                'total_tens' => 0, // Could be calculated from sets if needed
                'total_xs' => 0 // Could be calculated from sets if needed
            ];
        }
        
        // Get all team matches this archer participated in
        $teamMatches = $pdo->prepare('
            SELECT 
            tm.id AS match_id,
            tm.event_id,
            tm.date AS event_date,
            tm.status,
            tm.card_status,
            tm.locked,
            tm.winner_team_id,
            e.name AS event_name,
            tmt1.id AS team1_id,
            tmt1.team_name AS team1_name,
            tmt1.school AS team1_school,
            tmt1.sets_won AS team1_sets_won,
            tmt1.winner AS team1_winner,
            tmt2.id AS team2_id,
            tmt2.team_name AS team2_name,
            tmt2.school AS team2_school,
            tmt2.sets_won AS team2_sets_won,
            tmt2.winner AS team2_winner,
            tma.team_id AS archer_team_id,
            tma.position AS archer_position
        FROM team_matches tm
        JOIN team_match_archers tma ON tma.match_id = tm.id
        JOIN team_match_teams tmt1 ON tmt1.match_id = tm.id AND tmt1.position = 1
        JOIN team_match_teams tmt2 ON tmt2.match_id = tm.id AND tmt2.position = 2
        LEFT JOIN events e ON e.id = tm.event_id
        WHERE tma.archer_id = ?
        GROUP BY tm.id, tm.event_id, tm.date, tm.status, tm.card_status, tm.locked, tm.winner_team_id, e.name, 
                 tmt1.id, tmt1.team_name, tmt1.school, tmt1.sets_won, tmt1.winner,
                 tmt2.id, tmt2.team_name, tmt2.school, tmt2.sets_won, tmt2.winner, tma.team_id, tma.position
        ORDER BY tm.date DESC, tm.created_at DESC
    ');
        $teamMatches->execute([$archerData['id']]);
        $teamResults = $teamMatches->fetchAll();
        
        // Format team matches for history
        foreach ($teamResults as $match) {
            $isTeam1 = $match['team1_id'] === $match['archer_team_id'];
            $myTeam = $isTeam1 ? [
                'id' => $match['team1_id'],
                'name' => $match['team1_name'],
                'school' => $match['team1_school'],
                'sets_won' => $match['team1_sets_won'],
                'winner' => $match['team1_winner']
            ] : [
                'id' => $match['team2_id'],
                'name' => $match['team2_name'],
                'school' => $match['team2_school'],
                'sets_won' => $match['team2_sets_won'],
                'winner' => $match['team2_winner']
            ];
            $opponentTeam = $isTeam1 ? [
                'name' => $match['team2_name'],
                'school' => $match['team2_school'],
                'sets_won' => $match['team2_sets_won']
            ] : [
                'name' => $match['team1_name'],
                'school' => $match['team1_school'],
                'sets_won' => $match['team1_sets_won']
            ];
            
            $opponentDisplay = $opponentTeam['name'] ?: $opponentTeam['school'] ?: 'Opponent Team';
            
            $history[] = [
                'type' => 'team',
                'match_id' => $match['match_id'],
                'event_id' => $match['event_id'],
                'event_name' => $match['event_name'] ?: 'Team Match',
                'event_date' => $match['event_date'],
                'card_status' => $match['card_status'],
                'locked' => $match['locked'],
                'team_name' => $myTeam['name'] ?: $myTeam['school'] ?: 'My Team',
                'opponent_team' => $opponentDisplay,
                'sets_won' => $myTeam['sets_won'],
                'opponent_sets_won' => $opponentTeam['sets_won'],
                'final_score' => 0, // Team matches don't have individual scores
                'is_winner' => $myTeam['winner'],
                'ends_completed' => 0, // Not applicable for matches
                'total_tens' => 0,
                'total_xs' => 0
            ];
        }
        
        // Sort all history by date (most recent first)
        usort($history, function($a, $b) {
            $dateA = $a['event_date'] ?? '';
            $dateB = $b['event_date'] ?? '';
            if ($dateA === $dateB) return 0;
            return $dateA > $dateB ? -1 : 1;
        });
        
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
    } catch (PDOException $e) {
        error_log("GET /v1/archers/{id}/history PDO error: " . $e->getMessage() . "\nSQL State: " . $e->getCode() . "\n" . $e->getTraceAsString());
        json_response(['error' => 'Database error: ' . $e->getMessage(), 'type' => 'PDOException'], 500);
    } catch (Exception $e) {
        error_log("GET /v1/archers/{id}/history error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
        json_response(['error' => 'Server error: ' . $e->getMessage(), 'type' => 'Exception'], 500);
    } catch (Error $e) {
        error_log("GET /v1/archers/{id}/history fatal error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
        json_response(['error' => 'Fatal error: ' . $e->getMessage(), 'type' => 'Error'], 500);
    }
    exit;
}

// GET /v1/archers/:id/matches - Get all matches (bracket and informal) for an archer
if (preg_match('#^/v1/archers/([0-9a-f-]+)/matches$#i', $route, $m) && $method === 'GET') {
    $archerId = $m[1];
    
    try {
        $pdo = db();
        
        // Get archer info
        $archerStmt = $pdo->prepare('SELECT * FROM archers WHERE id = ? LIMIT 1');
        $archerStmt->execute([$archerId]);
        $archerData = $archerStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$archerData) {
            json_response(['error' => 'Archer not found'], 404);
            exit;
        }
        
        // Get all solo matches where this archer participated
        $matchesStmt = $pdo->prepare('
            SELECT 
                sm.id,
                sm.event_id,
                sm.bracket_id,
                sm.bracket_match_id,
                sm.date,
                sm.location,
                sm.status,
                sm.match_code,
                sm.winner_archer_id,
                e.name as event_name,
                b.bracket_format,
                b.division as bracket_division,
                sma1.archer_id as archer1_id,
                sma1.archer_name as archer1_name,
                sma2.archer_id as archer2_id,
                sma2.archer_name as archer2_name,
                CASE 
                    WHEN sm.bracket_id IS NOT NULL THEN "bracket"
                    ELSE "informal"
                END as match_type
            FROM solo_matches sm
            JOIN solo_match_archers sma1 ON sma1.match_id = sm.id AND sma1.position = 1
            JOIN solo_match_archers sma2 ON sma2.match_id = sm.id AND sma2.position = 2
            LEFT JOIN events e ON e.id = sm.event_id
            LEFT JOIN brackets b ON b.id = sm.bracket_id
            WHERE sma1.archer_id = ? OR sma2.archer_id = ?
            ORDER BY sm.date DESC, sm.created_at DESC
        ');
        $matchesStmt->execute([$archerId, $archerId]);
        $matches = $matchesStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Enrich with set scores
        foreach ($matches as &$match) {
            $isArcher1 = $match['archer1_id'] === $archerId;
            $opponentId = $isArcher1 ? $match['archer2_id'] : $match['archer1_id'];
            $opponentName = $isArcher1 ? $match['archer2_name'] : $match['archer1_name'];
            $myArcherData = $isArcher1 ? 
                ['id' => $match['archer1_id'], 'name' => $match['archer1_name']] :
                ['id' => $match['archer2_id'], 'name' => $match['archer2_name']];
            
            // Get my sets
            $mySetsStmt = $pdo->prepare('
                SELECT sms.set_number, sms.set_total, sms.set_points, sms.xs
                FROM solo_match_sets sms
                JOIN solo_match_archers sma ON sma.id = sms.match_archer_id
                WHERE sma.match_id = ? AND sma.archer_id = ?
                ORDER BY sms.set_number
            ');
            $mySetsStmt->execute([$match['id'], $archerId]);
            $mySets = $mySetsStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get opponent sets
            $oppSetsStmt = $pdo->prepare('
                SELECT sms.set_number, sms.set_total, sms.set_points, sms.xs
                FROM solo_match_sets sms
                JOIN solo_match_archers sma ON sma.id = sms.match_archer_id
                WHERE sma.match_id = ? AND sma.archer_id = ?
                ORDER BY sms.set_number
            ');
            $oppSetsStmt->execute([$match['id'], $opponentId]);
            $oppSets = $oppSetsStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Calculate totals
            $myTotalSetPoints = array_sum(array_column($mySets, 'set_points'));
            $oppTotalSetPoints = array_sum(array_column($oppSets, 'set_points'));
            $isWinner = $match['winner_archer_id'] === $archerId;
            
            $match['opponent'] = [
                'id' => $opponentId,
                'name' => $opponentName
            ];
            $match['my_sets'] = $mySets;
            $match['opponent_sets'] = $oppSets;
            $match['my_total_set_points'] = $myTotalSetPoints;
            $match['opponent_total_set_points'] = $oppTotalSetPoints;
            $match['is_winner'] = $isWinner;
            $match['result'] = $isWinner ? 'W' : ($myTotalSetPoints === $oppTotalSetPoints ? 'T' : 'L');
        }
        
        json_response([
            'archer' => [
                'id' => $archerData['id'],
                'first_name' => $archerData['first_name'],
                'last_name' => $archerData['last_name'],
                'full_name' => trim($archerData['first_name'] . ' ' . $archerData['last_name'])
            ],
            'matches' => $matches,
            'total_matches' => count($matches),
            'bracket_matches' => count(array_filter($matches, fn($m) => $m['match_type'] === 'bracket')),
            'informal_matches' => count(array_filter($matches, fn($m) => $m['match_type'] === 'informal'))
        ], 200);
    } catch (Exception $e) {
        error_log("Archer matches failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
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

function process_solo_match_verification(PDO $pdo, string $matchId, string $action, string $verifiedBy = '', string $notes = ''): array {
    $stmt = $pdo->prepare('SELECT id, event_id, status, locked, card_status, verified_by, verified_at, notes, lock_history FROM solo_matches WHERE id = ? LIMIT 1');
    $stmt->execute([$matchId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        throw new Exception('Match not found', 404);
    }

    if (empty($row['event_id'])) {
        throw new Exception('Standalone matches are not part of verification workflow', 400);
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
            throw new Exception('Match already locked', 409);
        }
        if ($row['status'] !== 'Completed') {
            throw new Exception('Cannot verify an incomplete match. Match must be Completed.', 409);
        }
        // Verify match has sets scored
        $countStmt = $pdo->prepare('SELECT COUNT(*) FROM solo_match_sets WHERE match_id = ?');
        $countStmt->execute([$matchId]);
        if ((int)$countStmt->fetchColumn() === 0) {
            throw new Exception('Cannot verify an empty match', 409);
        }
        $history[] = ['action' => 'lock', 'actor' => $actor, 'timestamp' => $timestamp, 'notes' => $notes ?: null];
        $update = $pdo->prepare('UPDATE solo_matches SET locked = 1, card_status = ?, verified_by = ?, verified_at = ?, notes = ?, lock_history = ? WHERE id = ?');
        $newNotes = ($notes !== '') ? $notes : ($row['notes'] ?? null);
        $update->execute(['VER', $actor, $timestamp, $newNotes, json_encode($history), $matchId]);
    } elseif ($action === 'unlock') {
        if (!(bool)$row['locked'] && $row['card_status'] !== 'VOID') {
            throw new Exception('Match is not locked', 409);
        }
        // Check if event is closed (cannot unlock after event closure)
        $eventStmt = $pdo->prepare('SELECT status FROM events WHERE id = ? LIMIT 1');
        $eventStmt->execute([$row['event_id']]);
        $event = $eventStmt->fetch(PDO::FETCH_ASSOC);
        if ($event && $event['status'] === 'Completed') {
            throw new Exception('Cannot unlock match after event is closed', 409);
        }
        $history[] = ['action' => 'unlock', 'actor' => $actor, 'timestamp' => $timestamp, 'notes' => $notes ?: null];
        $update = $pdo->prepare('UPDATE solo_matches SET locked = 0, card_status = ?, verified_by = NULL, verified_at = NULL, notes = ?, lock_history = ? WHERE id = ?');
        $newNotes = ($notes !== '') ? $notes : ($row['notes'] ?? null);
        $update->execute(['PENDING', $newNotes, json_encode($history), $matchId]);
    } else { // void
        $history[] = ['action' => 'void', 'actor' => $actor, 'timestamp' => $timestamp, 'notes' => $notes ?: null];
        $update = $pdo->prepare('UPDATE solo_matches SET locked = 1, card_status = ?, verified_by = ?, verified_at = ?, notes = ?, lock_history = ? WHERE id = ?');
        $voidNotes = ($notes !== '') ? $notes : 'VOID';
        $update->execute(['VOID', $actor, $timestamp, $voidNotes, json_encode($history), $matchId]);
    }

    $refetch = $pdo->prepare('SELECT id, event_id, status, locked, card_status, verified_by, verified_at, notes, lock_history FROM solo_matches WHERE id = ? LIMIT 1');
    $refetch->execute([$matchId]);
    $updated = $refetch->fetch(PDO::FETCH_ASSOC);
    $updated['lock_history'] = decode_lock_history($updated['lock_history'] ?? null);
    return $updated;
}

function process_team_match_verification(PDO $pdo, string $matchId, string $action, string $verifiedBy = '', string $notes = ''): array {
    $stmt = $pdo->prepare('SELECT id, event_id, status, locked, card_status, verified_by, verified_at, notes, lock_history FROM team_matches WHERE id = ? LIMIT 1');
    $stmt->execute([$matchId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        throw new Exception('Match not found', 404);
    }

    if (empty($row['event_id'])) {
        throw new Exception('Standalone matches are not part of verification workflow', 400);
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
            throw new Exception('Match already locked', 409);
        }
        if ($row['status'] !== 'Completed') {
            throw new Exception('Cannot verify an incomplete match. Match must be Completed.', 409);
        }
        // Verify match has sets scored
        $countStmt = $pdo->prepare('SELECT COUNT(*) FROM team_match_sets WHERE match_id = ?');
        $countStmt->execute([$matchId]);
        if ((int)$countStmt->fetchColumn() === 0) {
            throw new Exception('Cannot verify an empty match', 409);
        }
        $history[] = ['action' => 'lock', 'actor' => $actor, 'timestamp' => $timestamp, 'notes' => $notes ?: null];
        $update = $pdo->prepare('UPDATE team_matches SET locked = 1, card_status = ?, verified_by = ?, verified_at = ?, notes = ?, lock_history = ? WHERE id = ?');
        $newNotes = ($notes !== '') ? $notes : ($row['notes'] ?? null);
        $update->execute(['VER', $actor, $timestamp, $newNotes, json_encode($history), $matchId]);
    } elseif ($action === 'unlock') {
        if (!(bool)$row['locked'] && $row['card_status'] !== 'VOID') {
            throw new Exception('Match is not locked', 409);
        }
        // Check if event is closed (cannot unlock after event closure)
        $eventStmt = $pdo->prepare('SELECT status FROM events WHERE id = ? LIMIT 1');
        $eventStmt->execute([$row['event_id']]);
        $event = $eventStmt->fetch(PDO::FETCH_ASSOC);
        if ($event && $event['status'] === 'Completed') {
            throw new Exception('Cannot unlock match after event is closed', 409);
        }
        $history[] = ['action' => 'unlock', 'actor' => $actor, 'timestamp' => $timestamp, 'notes' => $notes ?: null];
        $update = $pdo->prepare('UPDATE team_matches SET locked = 0, card_status = ?, verified_by = NULL, verified_at = NULL, notes = ?, lock_history = ? WHERE id = ?');
        $newNotes = ($notes !== '') ? $notes : ($row['notes'] ?? null);
        $update->execute(['PENDING', $newNotes, json_encode($history), $matchId]);
    } else { // void
        $history[] = ['action' => 'void', 'actor' => $actor, 'timestamp' => $timestamp, 'notes' => $notes ?: null];
        $update = $pdo->prepare('UPDATE team_matches SET locked = 1, card_status = ?, verified_by = ?, verified_at = ?, notes = ?, lock_history = ? WHERE id = ?');
        $voidNotes = ($notes !== '') ? $notes : 'VOID';
        $update->execute(['VOID', $actor, $timestamp, $voidNotes, json_encode($history), $matchId]);
    }

    $refetch = $pdo->prepare('SELECT id, event_id, status, locked, card_status, verified_by, verified_at, notes, lock_history FROM team_matches WHERE id = ? LIMIT 1');
    $refetch->execute([$matchId]);
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
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $roundType = $input['roundType'] ?? 'R300';
    $date = $input['date'] ?? date('Y-m-d');
    // NOTE: baleNumber removed from rounds table in Phase 0 migration
    $division = $input['division'] ?? null;  // e.g., BJV, GJV, OPEN
    $gender = $input['gender'] ?? null;      // M/F
    $level = $input['level'] ?? null;        // VAR/JV
    $eventId = isset($input['eventId']) ? $input['eventId'] : null;    // Link round to event (null for standalone)
    $archers = $input['archers'] ?? [];      // Optional: archers for atomic creation
    
    // Derive level/gender from division if not provided
    // Division codes: BVAR, GVAR, BJV, GJV, OPEN
    if ($division && (!$level || !$gender)) {
        $divUpper = strtoupper($division);
        if (!$gender) {
            if (strpos($divUpper, 'B') === 0) $gender = 'M';
            else if (strpos($divUpper, 'G') === 0) $gender = 'F';
        }
        if (!$level) {
            if (strpos($divUpper, 'VAR') !== false) $level = 'VAR';
            else if (strpos($divUpper, 'JV') !== false) $level = 'JV';
            else if ($divUpper === 'OPEN') $level = 'JV'; // Default OPEN to JV (60cm target)
        }
        error_log("Derived level/gender from division: division=$division, gender=$gender, level=$level");
    }
    
    // Require auth only if round is linked to an event (standalone rounds don't need auth)
    if ($eventId !== null) {
        require_api_key();
    }
    try {
        $pdo = db();
        // Check if round already exists (by eventId + division)
        $row = null;
        
        // Strategy 1: If eventId and division provided, find by eventId + division
        if ($eventId !== null && $division) {
            $existing = $pdo->prepare('SELECT id, event_id FROM rounds WHERE event_id=? AND division=? LIMIT 1');
            $existing->execute([$eventId, $division]);
            $row = $existing->fetch();
            error_log("Round lookup: eventId=$eventId, division=$division -> " . ($row ? "FOUND " . $row['id'] : "NOT FOUND"));
        }
        
        // Strategy 2: For standalone rounds, check by entry_code if provided
        if (!$row && $eventId === null && isset($input['entryCode'])) {
            $existing = $pdo->prepare('SELECT id, event_id, entry_code FROM rounds WHERE entry_code=? LIMIT 1');
            $existing->execute([$input['entryCode']]);
            $row = $existing->fetch();
            error_log("Standalone round lookup by entry_code: " . ($row ? "FOUND " . $row['id'] : "NOT FOUND"));
        }
        
        // Strategy 3: Fallback to date + division (legacy support, only for event-linked)
        if (!$row && $eventId !== null && $division) {
            $existing = $pdo->prepare('SELECT id, event_id FROM rounds WHERE round_type=? AND date=? AND division=? AND event_id IS NOT NULL LIMIT 1');
            $existing->execute([$roundType, $date, $division]);
            $row = $existing->fetch();
        }
        
        // Strategy 4: Last resort (date only - least reliable, only for event-linked)
        if (!$row && $eventId !== null) {
            $existing = $pdo->prepare('SELECT id, event_id FROM rounds WHERE round_type=? AND date=? AND event_id IS NOT NULL LIMIT 1');
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
            error_log("Round CREATING NEW: eventId=" . ($eventId ?? 'NULL') . ", division=$division");
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
            
            // Generate entry code for standalone rounds
            $entryCode = null;
            if ($eventId === null) {
                // Standalone round - ALWAYS generate entry code (critical for cross-session access)
                // Use level if available, otherwise default to JV (60cm target)
                $entryCodeLevel = $level ?? 'JV';
                $entryCode = generate_round_entry_code($pdo, $roundType, $entryCodeLevel, $date);
                $columns[] = 'entry_code';
                $values[] = $entryCode;
                $placeholders[] = '?';
                error_log("Generated entry code for standalone round: $entryCode (level used: $entryCodeLevel)");
            }
            
            $sql = 'INSERT INTO rounds (' . implode(',', $columns) . ') VALUES (' . implode(',', $placeholders) . ')';
            $stmt = $pdo->prepare($sql);
            $stmt->execute($values);
            
            // DO NOT auto-link standalone rounds to events (eventId === null means standalone)
            // Only auto-link if eventId was not provided at all (legacy behavior)
            if (!isset($input['eventId']) && $eventId === null) {
                // Legacy: eventId not in input at all - try to link to most recent event for this date
                try {
                    $event = $pdo->prepare('SELECT id FROM events WHERE date=? ORDER BY created_at DESC LIMIT 1');
                    $event->execute([$date]);
                    $eventRow = $event->fetch();
                    if ($eventRow) {
                        $link = $pdo->prepare('UPDATE rounds SET event_id=?, entry_code=NULL WHERE id=?');
                        $link->execute([$eventRow['id'], $id]);
                        error_log("Round $id auto-linked to event " . $eventRow['id'] . " (legacy behavior)");
                        $entryCode = null; // Clear entry code since it's now event-linked
                    }
                } catch (Exception $e) {
                    // Ignore event linking errors
                    error_log("Event auto-link failed: " . $e->getMessage());
                }
            }
            
            $response = ['roundId' => $id];
            if ($entryCode !== null) {
                $response['entryCode'] = $entryCode;
            }
            
            // ATOMIC ARCHER CREATION: If archers provided, create them in same transaction
            if (!empty($archers) && is_array($archers)) {
                $createdArchers = [];
                $targetLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
                $targetIdx = 0;
                
                foreach ($archers as $archerData) {
                    $archerId = $archerData['archerId'] ?? $archerData['extId'] ?? null;
                    $firstName = $archerData['firstName'] ?? '';
                    $lastName = $archerData['lastName'] ?? '';
                    $school = $archerData['school'] ?? '';
                    $archerLevel = $archerData['level'] ?? $level ?? '';
                    $archerGender = $archerData['gender'] ?? $gender ?? '';
                    $targetAssignment = $archerData['targetAssignment'] ?? $targetLetters[$targetIdx % 8];
                    $baleNumber = $archerData['baleNumber'] ?? 1;
                    
                    // Create or find master archer
                    $masterArcherId = null;
                    if ($archerId) {
                        // Check if archer exists
                        $existingArcher = $pdo->prepare('SELECT id FROM archers WHERE id = ? OR ext_id = ? LIMIT 1');
                        $existingArcher->execute([$archerId, $archerId]);
                        $existingRow = $existingArcher->fetch();
                        
                        if ($existingRow) {
                            $masterArcherId = $existingRow['id'];
                        } else {
                            // Create new master archer
                            $masterArcherId = $genUuid();
                            $insertArcher = $pdo->prepare('INSERT INTO archers (id, ext_id, first_name, last_name, school, level, gender, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())');
                            $insertArcher->execute([$masterArcherId, $archerId, $firstName, $lastName, $school, $archerLevel, $archerGender]);
                        }
                    }
                    
                    // Create round_archer entry
                    $roundArcherId = $genUuid();
                    $archerName = trim("$firstName $lastName");
                    $insertRoundArcher = $pdo->prepare('INSERT INTO round_archers (id, round_id, archer_id, archer_name, target_assignment, bale_number, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())');
                    $insertRoundArcher->execute([$roundArcherId, $id, $masterArcherId, $archerName, $targetAssignment, $baleNumber]);
                    
                    $createdArchers[] = [
                        'roundArcherId' => $roundArcherId,
                        'archerId' => $masterArcherId,
                        'archerName' => $archerName,
                        'targetAssignment' => $targetAssignment,
                        'baleNumber' => $baleNumber
                    ];
                    
                    $targetIdx++;
                }
                
                $response['archers'] = $createdArchers;
                error_log("Atomic round+archer creation: round=$id, archers=" . count($createdArchers));
            }
            
            json_response($response, 201);
        }
    } catch (Exception $e) {
        error_log("Round creation failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// GET /v1/rounds?entry_code={code} - Get round by entry code (for standalone rounds)
if (preg_match('#^/v1/rounds$#', $route) && $method === 'GET') {
    $entryCode = $_GET['entry_code'] ?? null;
    
    if (!$entryCode) {
        json_response(['error' => 'entry_code parameter required'], 400);
        exit;
    }
    
    try {
        $pdo = db();
        $stmt = $pdo->prepare('
            SELECT 
                id,
                event_id,
                round_type,
                division,
                gender,
                level,
                date,
                status,
                entry_code,
                created_at
            FROM rounds 
            WHERE LOWER(entry_code) = LOWER(?)
            LIMIT 1
        ');
        $stmt->execute([$entryCode]);
        $round = $stmt->fetch();
        
        if (!$round) {
            json_response(['error' => 'Round not found'], 404);
            exit;
        }
        
        json_response([
            'roundId' => $round['id'],
            'eventId' => $round['event_id'],
            'roundType' => $round['round_type'],
            'division' => $round['division'],
            'gender' => $round['gender'],
            'level' => $round['level'],
            'date' => $round['date'],
            'status' => $round['status'],
            'entryCode' => $round['entry_code'],
            'createdAt' => $round['created_at']
        ], 200);
    } catch (Exception $e) {
        error_log("Round lookup by entry_code failed: " . $e->getMessage());
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
                ra.locked,
                ra.card_status,
                ra.verified_at,
                ra.verified_by,
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
            'verified' => (bool)$raData['locked'],
            'card_status' => $raData['card_status'] ?? 'PENDING',
            'verified_at' => $raData['verified_at'],
            'verified_by' => $raData['verified_by']
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
    $roundId = $m[1];
    $roundArcherId = $m[2];
    
    // Check if this is archer self-deletion
    $archerSelf = $_SERVER['HTTP_X_ARCHER_SELF'] ?? '';
    $archerIdHeader = $_SERVER['HTTP_X_ARCHER_ID'] ?? '';
    
    $isArcherSelfDelete = false;
    if ($archerSelf === 'true' && !empty($archerIdHeader)) {
        // Verify the archer ID matches the scorecard owner
        try {
            $pdo = db();
            $checkStmt = $pdo->prepare('
                SELECT ra.archer_id, ra.locked, ra.card_status 
                FROM round_archers ra 
                WHERE ra.id = ? AND ra.round_id = ?
            ');
            $checkStmt->execute([$roundArcherId, $roundId]);
            $scorecard = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($scorecard && $scorecard['archer_id'] === $archerIdHeader) {
                // Check if scorecard is locked/verified
                if ($scorecard['locked'] || $scorecard['card_status'] === 'VER') {
                    json_response(['error' => 'Cannot delete locked or verified scorecard'], 403);
                    exit;
                }
                $isArcherSelfDelete = true;
            }
        } catch (Exception $e) {
            error_log("Archer self-delete check failed: " . $e->getMessage());
            json_response(['error' => 'Database error during authorization check'], 500);
            exit;
        }
    }
    
    // If not archer self-delete, require coach API key
    if (!$isArcherSelfDelete) {
        require_api_key();
    }
    
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

// POST /v1/rounds/{roundId}/archers/{roundArcherId}/ends - Submit end scores
// PUBLIC ENDPOINT - Archers can submit scores without authentication
// Security: Only prevents editing locked scorecards
if (preg_match('#^/v1/rounds/([0-9a-f-]+)/archers/([0-9a-f-]+)/ends$#i', $route, $m) && $method === 'POST') {
    // REMOVED: require_api_key() - This endpoint is PUBLIC for archers to submit scores
    // The only security check is that the scorecard is not locked (see line below)
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
    // SECURITY CHECK: Prevent editing locked scorecards
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


// GET /v1/round_archers/{id} - Fetch scorecard details with scores
if (preg_match('#^/v1/round_archers/([0-9a-f-]+)$#i', $route, $m) && $method === 'GET') {
    $roundArcherId = $m[1];
    
    try {
        $pdo = db();
        
        // Fetch round_archer with round and event details
        $stmt = $pdo->prepare('
            SELECT 
                ra.*,
                r.round_type,
                r.division,
                e.name as event_name,
                e.date as event_date
            FROM round_archers ra
            LEFT JOIN rounds r ON ra.round_id = r.id
            LEFT JOIN events e ON r.event_id = e.id
            WHERE ra.id = ?
            LIMIT 1
        ');
        $stmt->execute([$roundArcherId]);
        $card = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$card) {
            json_response(['error' => 'Scorecard not found'], 404);
            exit;
        }
        
        // Fetch scores from end_events
        $scoresStmt = $pdo->prepare('
            SELECT end_number, a1, a2, a3
            FROM end_events
            WHERE round_archer_id = ?
            ORDER BY end_number ASC
        ');
        $scoresStmt->execute([$roundArcherId]);
        $endEvents = $scoresStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Convert to scores array format
        $scores = [];
        foreach ($endEvents as $end) {
            $scores[] = [
                'arrows' => [
                    $end['a1'],
                    $end['a2'],
                    $end['a3']
                ]
            ];
        }
        
        $card['scores'] = $scores;
        $card['lock_history'] = decode_lock_history($card['lock_history'] ?? null);
        
        json_response($card);
    } catch (Exception $e) {
        error_log("GET /v1/round_archers/{id} error: " . $e->getMessage());
        json_response(['error' => $e->getMessage(), 'details' => $e->getTraceAsString()], 500);
    }
    exit;
}

// PUT /v1/round_archers/{id}/scores - Update scorecard scores
if (preg_match('#^/v1/round_archers/([0-9a-f-]+)/scores$#i', $route, $m) && $method === 'PUT') {
    $roundArcherId = $m[1];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $scores = $input['scores'] ?? [];
    
    try {
        $pdo = db();
        
        // Check if card is locked and get round_id
        $checkStmt = $pdo->prepare('SELECT locked, card_status, round_id FROM round_archers WHERE id = ? LIMIT 1');
        $checkStmt->execute([$roundArcherId]);
        $card = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$card) {
            json_response(['error' => 'Scorecard not found'], 404);
            exit;
        }
        
        if ((bool)$card['locked']) {
            json_response(['error' => 'Cannot update locked scorecard'], 403);
            exit;
        }
        
        // Validate scores data before making any changes
        if (!is_array($scores) || empty($scores)) {
            json_response(['error' => 'Invalid scores data: scores must be a non-empty array'], 400);
            exit;
        }
        
        // Pre-validate all score data
        $validatedEnds = [];
        $runningTotal = 0;
        
        foreach ($scores as $endIndex => $end) {
            if (!isset($end['arrows']) || !is_array($end['arrows'])) continue;
            
            $arrows = $end['arrows'];
            $a1 = $arrows[0] ?? null;
            $a2 = $arrows[1] ?? null;
            $a3 = $arrows[2] ?? null;
            
            // Only process if at least one arrow has a value
            if ($a1 !== null || $a2 !== null || $a3 !== null) {
                // Calculate end total, tens, and xs
                $endTotal = 0;
                $tens = 0;
                $xs = 0;
                
                foreach ([$a1, $a2, $a3] as $arrow) {
                    if ($arrow === null || $arrow === '') continue;
                    $upper = strtoupper($arrow);
                    if ($upper === 'X') {
                        $endTotal += 10;
                        $xs++;
                    } elseif ($upper === '10') {
                        $endTotal += 10;
                        $tens++;
                    } elseif ($upper === 'M') {
                        $endTotal += 0;
                    } else {
                        $val = intval($arrow);
                        $endTotal += max(0, min(10, $val));
                    }
                }
                
                $runningTotal += $endTotal;
                
                $validatedEnds[] = [
                    'end_number' => $endIndex + 1,
                    'a1' => $a1,
                    'a2' => $a2,
                    'a3' => $a3,
                    'end_total' => $endTotal,
                    'running_total' => $runningTotal,
                    'tens' => $tens,
                    'xs' => $xs
                ];
            }
        }
        
        if (empty($validatedEnds)) {
            json_response(['error' => 'No valid score data to save'], 400);
            exit;
        }
        
        // Start transaction - all or nothing
        $pdo->beginTransaction();
        
        try {
            // Delete existing scores
            $deleteStmt = $pdo->prepare('DELETE FROM end_events WHERE round_archer_id = ?');
            $deleteStmt->execute([$roundArcherId]);
            
            // Insert new scores with calculated totals
            $insertStmt = $pdo->prepare('
                INSERT INTO end_events (id, round_id, round_archer_id, end_number, a1, a2, a3, end_total, running_total, tens, xs, server_ts)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ');
            
            foreach ($validatedEnds as $end) {
                $insertStmt->execute([
                    $genUuid(), // Generate UUID for each end_event
                    $card['round_id'],
                    $roundArcherId,
                    $end['end_number'],
                    $end['a1'],
                    $end['a2'],
                    $end['a3'],
                    $end['end_total'],
                    $end['running_total'],
                    $end['tens'],
                    $end['xs']
                ]);
            }
            
            // Commit transaction
            $pdo->commit();
            
            json_response(['success' => true, 'message' => 'Scores updated', 'ends_saved' => count($validatedEnds)]);
        } catch (Exception $e) {
            // Rollback on any error - restores original scores
            $pdo->rollBack();
            error_log("Score update transaction failed: " . $e->getMessage());
            throw new Exception('Failed to save scores: ' . $e->getMessage());
        }
    } catch (Exception $e) {
        error_log("PUT /v1/round_archers/{id}/scores error: " . $e->getMessage());
        json_response(['error' => $e->getMessage()], 500);
    }
    exit;
}

// POST /v1/round_archers/{id}/verify - Lock/Unlock/Void scorecard
if (preg_match('#^/v1/round_archers/([0-9a-f-]+)/verify$#i', $route, $m) && $method === 'POST') {
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
        $status = (int)$e->getCode();
        if ($status < 100 || $status > 599) $status = 400;
        json_response(['error' => $e->getMessage()], $status);
    }
    exit;
}

// Legacy endpoint for backwards compatibility
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
        $status = (int)$e->getCode();
        if ($status < 100 || $status > 599) $status = 400;
        json_response(['error' => $e->getMessage()], $status);
    }
    exit;
}

// PATCH /v1/round_archers/{id}/status - Update card status (for COMP status from scorer)
if (preg_match('#^/v1/round_archers/([0-9a-f-]+)/status$#i', $route, $m) && $method === 'PATCH') {
    $roundArcherId = $m[1];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $newStatus = strtoupper(trim($input['cardStatus'] ?? ''));
    
    // Validate status value
    $allowedStatuses = ['PENDING', 'COMP', 'COMPLETED', 'VER', 'VERIFIED', 'VOID'];
    if (!in_array($newStatus, $allowedStatuses, true)) {
        json_response(['error' => 'Invalid status. Allowed: ' . implode(', ', $allowedStatuses)], 400);
        exit;
    }
    
    try {
        $pdo = db();
        
        // Check if scorecard exists and get current state
        $checkStmt = $pdo->prepare('SELECT locked, card_status, round_id FROM round_archers WHERE id = ? LIMIT 1');
        $checkStmt->execute([$roundArcherId]);
        $card = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$card) {
            json_response(['error' => 'Scorecard not found'], 404);
            exit;
        }
        
        // Normalize status (COMP/COMPLETED -> COMPLETED, VER/VERIFIED -> VERIFIED)
        $normalizedStatus = $newStatus;
        if ($newStatus === 'COMP') $normalizedStatus = 'COMPLETED';
        if ($newStatus === 'VER') $normalizedStatus = 'VERIFIED';
        
        // Prevent status changes on locked cards (except unlocking via verification endpoint)
        if ((bool)$card['locked'] && $normalizedStatus !== 'VERIFIED' && $normalizedStatus !== 'VOID') {
            json_response(['error' => 'Cannot change status of locked scorecard'], 403);
            exit;
        }
        
        // Update status
        $updateStmt = $pdo->prepare('UPDATE round_archers SET card_status = ? WHERE id = ?');
        $updateStmt->execute([$normalizedStatus, $roundArcherId]);
        
        // If setting to COMPLETED, also set completed flag
        if ($normalizedStatus === 'COMPLETED') {
            $completedStmt = $pdo->prepare('UPDATE round_archers SET completed = 1 WHERE id = ?');
            $completedStmt->execute([$roundArcherId]);
        }
        
        // Return updated card
        $refetch = $pdo->prepare('SELECT id, round_id, locked, card_status, completed FROM round_archers WHERE id = ? LIMIT 1');
        $refetch->execute([$roundArcherId]);
        $updated = $refetch->fetch(PDO::FETCH_ASSOC);
        
        json_response([
            'roundArcherId' => $updated['id'],
            'roundId' => $updated['round_id'],
            'locked' => (bool)$updated['locked'],
            'cardStatus' => $updated['card_status'],
            'completed' => (bool)$updated['completed']
        ]);
    } catch (Exception $e) {
        $status = (int)$e->getCode();
        if ($status < 100 || $status > 599) $status = 500;
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
        $status = (int)$e->getCode();
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
        $status = (int)$e->getCode();
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
    $round = $pdo->query('SELECT id, round_type as roundType, date, bale_number as baleNumber, division FROM rounds WHERE id=' . $pdo->quote($roundId))->fetch();
    if (!$round) { json_response(['error' => 'round not found'], 404); exit; }
    // Include archerId so we can match by master archer ID (not just roundArcherId)
    $archers = $pdo->prepare('SELECT ra.id as roundArcherId, ra.archer_id as archerId, ra.archer_name as archerName, ra.target_assignment as targetAssignment, ra.bale_number as baleNumber FROM round_archers ra WHERE ra.round_id=?');
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
            'assignmentMode' => ($eventData['event_type'] === 'auto_assign' ? 'assigned' : 'manual'),
            'entry_code' => $eventData['entry_code'] ?? null  // Include entry_code for client-side auth (archer is already assigned)
        ],
        'divisions' => $divisions
    ]);
    exit;
}

// GET /v1/events/:id/overview - Get comprehensive event overview with progress tracking
if (preg_match('#^/v1/events/([0-9a-f-]+)/overview$#i', $route, $m) && $method === 'GET') {
    require_api_key();
    $eventId = $m[1];
    $pdo = db();
    
    try {
        // Get event info
        $event = $pdo->prepare('SELECT id, name, date, status, event_type, entry_code FROM events WHERE id=? LIMIT 1');
        $event->execute([$eventId]);
        $eventData = $event->fetch();
        
        if (!$eventData) {
            json_response(['error' => 'Event not found'], 404);
            exit;
        }
        
        // Get rounds with progress - including started scorecards count
        // NOTE: Use COUNT(DISTINCT) for completed to avoid double-counting when LEFT JOIN creates multiple rows
        $roundsStmt = $pdo->prepare('
            SELECT 
                r.id,
                r.division,
                r.round_type,
                r.status,
                COUNT(DISTINCT ra.id) as total_scorecards,
                COUNT(DISTINCT CASE WHEN ra.completed = TRUE THEN ra.id END) as completed_scorecards,
                COUNT(DISTINCT CASE WHEN ee.id IS NOT NULL THEN ra.id END) as started_scorecards,
                COUNT(DISTINCT ra.bale_number) as bale_count,
                AVG(
                    (SELECT MAX(ee2.running_total) 
                     FROM end_events ee2 
                     WHERE ee2.round_archer_id = ra.id)
                ) as avg_score
            FROM rounds r
            LEFT JOIN round_archers ra ON ra.round_id = r.id
            LEFT JOIN end_events ee ON ee.round_archer_id = ra.id
            WHERE r.event_id = ?
            GROUP BY r.id, r.division, r.round_type, r.status
            ORDER BY 
                CASE r.division 
                    WHEN \'BVAR\' THEN 1 
                    WHEN \'GVAR\' THEN 2 
                    WHEN \'BJV\' THEN 3 
                    WHEN \'GJV\' THEN 4 
                    ELSE 5 
                END
        ');
        $roundsStmt->execute([$eventId]);
        $rounds = $roundsStmt->fetchAll();
        
        // Calculate round progress and status
        $roundsData = [];
        foreach ($rounds as $r) {
            $total = (int)$r['total_scorecards'];
            $completed = (int)$r['completed_scorecards'];
            $started = (int)$r['started_scorecards'];
            $notStarted = $total - $started;
            $progress = $total > 0 ? round(($completed / $total) * 100, 1) : 0;
            
            // Calculate round status dynamically
            $calculatedRoundStatus = 'Not Started';
            if ($total === 0) {
                $calculatedRoundStatus = 'Not Started';
            } elseif ($completed === $total && $total > 0) {
                $calculatedRoundStatus = 'Completed';
            } elseif ($started > 0) {
                $calculatedRoundStatus = 'In Progress';
            } else {
                $calculatedRoundStatus = 'Not Started';
            }
            
            $roundsData[] = [
                'id' => $r['id'],
                'division' => $r['division'],
                'round_type' => $r['round_type'],
                'status' => $calculatedRoundStatus, // Use calculated status instead of stored
                'archer_count' => $total,
                'completed_scorecards' => $completed,
                'started_scorecards' => $started,
                'not_started_scorecards' => $notStarted,
                'total_scorecards' => $total,
                'progress_percentage' => $progress,
                'bale_count' => (int)$r['bale_count'],
                'average_score' => $r['avg_score'] ? round((float)$r['avg_score'], 1) : null
            ];
        }
        
        // Get brackets with match progress
        $bracketsStmt = $pdo->prepare('
            SELECT 
                b.id,
                b.bracket_type,
                b.bracket_format,
                b.division,
                b.status,
                COUNT(DISTINCT be.id) as entry_count
            FROM brackets b
            LEFT JOIN bracket_entries be ON be.bracket_id = b.id
            WHERE b.event_id = ?
            GROUP BY b.id, b.bracket_type, b.bracket_format, b.division, b.status
            ORDER BY b.bracket_type, b.division, b.created_at
        ');
        $bracketsStmt->execute([$eventId]);
        $brackets = $bracketsStmt->fetchAll();
        
        // Get match counts separately for each bracket
        foreach ($brackets as &$bracket) {
            if ($bracket['bracket_type'] === 'SOLO') {
                $matchesStmt = $pdo->prepare('
                    SELECT 
                        COUNT(*) as total_matches,
                        SUM(CASE WHEN status = \'COMPLETED\' THEN 1 ELSE 0 END) as completed_matches
                    FROM solo_matches
                    WHERE bracket_id = ? AND event_id = ?
                ');
                $matchesStmt->execute([$bracket['id'], $eventId]);
            } else {
                $matchesStmt = $pdo->prepare('
                    SELECT 
                        COUNT(*) as total_matches,
                        SUM(CASE WHEN status = \'COMPLETED\' THEN 1 ELSE 0 END) as completed_matches
                    FROM team_matches
                    WHERE bracket_id = ? AND event_id = ?
                ');
                $matchesStmt->execute([$bracket['id'], $eventId]);
            }
            $matchData = $matchesStmt->fetch();
            $bracket['total_matches'] = (int)($matchData['total_matches'] ?? 0);
            $bracket['completed_matches'] = (int)($matchData['completed_matches'] ?? 0);
        }
        unset($bracket); // Break reference
        
        // Calculate bracket progress
        $bracketsData = [];
        foreach ($brackets as $b) {
            $totalMatches = (int)$b['total_matches'];
            $completedMatches = (int)$b['completed_matches'];
            $progress = $totalMatches > 0 ? round(($completedMatches / $totalMatches) * 100, 1) : 0;
            
            $bracketsData[] = [
                'id' => $b['id'],
                'bracket_type' => $b['bracket_type'],
                'format' => $b['bracket_format'],
                'division' => $b['division'],
                'status' => $b['status'],
                'entry_count' => (int)$b['entry_count'],
                'total_matches' => $totalMatches,
                'completed_matches' => $completedMatches,
                'progress_percentage' => $progress
            ];
        }
        
        // Calculate summary statistics
        $totalRounds = count($roundsData);
        $completedRounds = count(array_filter($roundsData, fn($r) => $r['status'] === 'Completed'));
        $totalBrackets = count($bracketsData);
        $completedBrackets = count(array_filter($bracketsData, fn($b) => $b['status'] === 'COMPLETED'));
        
        $totalScorecards = array_sum(array_column($roundsData, 'total_scorecards'));
        $completedScorecards = array_sum(array_column($roundsData, 'completed_scorecards'));
        
        // Count matches from brackets
        $totalMatches = array_sum(array_column($bracketsData, 'total_matches'));
        $completedMatches = array_sum(array_column($bracketsData, 'completed_matches'));
        
        // Calculate overall progress (weighted average of rounds and brackets)
        $roundProgress = $totalRounds > 0 ? ($completedRounds / $totalRounds) * 100 : 0;
        $bracketProgress = $totalBrackets > 0 ? ($completedBrackets / $totalBrackets) * 100 : 0;
        $overallProgress = $totalRounds + $totalBrackets > 0 
            ? round((($completedRounds + $completedBrackets) / ($totalRounds + $totalBrackets)) * 100, 1)
            : 0;
        
        // Count unique archers across all rounds
        $archersStmt = $pdo->prepare('
            SELECT COUNT(DISTINCT ra.archer_id) as total_archers
            FROM rounds r
            JOIN round_archers ra ON ra.round_id = r.id
            WHERE r.event_id = ? AND ra.archer_id IS NOT NULL
        ');
        $archersStmt->execute([$eventId]);
        $archersData = $archersStmt->fetch();
        $totalArchers = (int)($archersData['total_archers'] ?? 0);
        
        // Calculate event status dynamically based on round activity
        // Event is "Active" if any scorecards (round_archers) exist, even without scores yet
        // Event is "Completed" if all rounds are completed
        $hasActiveRounds = false;
        $hasCompletedRounds = false;
        $hasAnyRounds = $totalRounds > 0;
        $scorecardCount = 0;
        
        if ($hasAnyRounds) {
            // Check if any round has scorecards created (round_archers exist)
            // This indicates the event has been started, even if no scores entered yet
            // Use the same data we already fetched from rounds query to avoid extra query
            // The $roundsData already has total_scorecards, so we can use that
            $scorecardCount = $totalScorecards; // Already calculated above
            $hasActiveRounds = $scorecardCount > 0;
            
            // Also double-check with a direct query to be sure
            if (!$hasActiveRounds) {
                $activeCheckStmt = $pdo->prepare('
                    SELECT COUNT(DISTINCT ra.id) as scorecard_count
                    FROM rounds r
                    LEFT JOIN round_archers ra ON ra.round_id = r.id
                    WHERE r.event_id = ? AND ra.id IS NOT NULL
                ');
                $activeCheckStmt->execute([$eventId]);
                $activeCheck = $activeCheckStmt->fetch();
                $directCount = (int)($activeCheck['scorecard_count'] ?? 0);
                if ($directCount > 0) {
                    $scorecardCount = $directCount;
                    $hasActiveRounds = true;
                }
            }
            
            // Check if all rounds are completed
            $hasCompletedRounds = $completedRounds === $totalRounds && $totalRounds > 0;
        }
        
        // Determine event status
        // Normalize stored status first (handle case variations)
        $storedStatus = ucfirst(strtolower(trim($eventData['status'] ?? 'Planned')));
        if (!in_array($storedStatus, ['Planned', 'Active', 'Completed'])) {
            $storedStatus = 'Planned'; // Default to Planned if invalid
        }
        
        $calculatedStatus = $storedStatus; // Default to normalized stored status
        if ($hasCompletedRounds && $totalRounds > 0) {
            $calculatedStatus = 'Completed';
        } elseif ($hasActiveRounds) {
            // Any scorecards created means event is active
            $calculatedStatus = 'Active';
        } elseif ($hasAnyRounds) {
            // Has rounds but no scorecards created yet
            $calculatedStatus = 'Planned';
        }
        // If no rounds exist, keep the normalized stored status (likely 'Planned')
        
        // Debug logging (remove in production if needed)
        error_log("Event status calculation for {$eventId}: stored={$eventData['status']}, normalized={$storedStatus}, calculated={$calculatedStatus}, rounds={$totalRounds}, scorecards={$scorecardCount}, hasActive={$hasActiveRounds}, hasCompleted={$hasCompletedRounds}");
        
        json_response([
            'event' => [
                'id' => $eventData['id'],
                'name' => $eventData['name'],
                'date' => $eventData['date'],
                'status' => $calculatedStatus,
                'entry_code' => $eventData['entry_code'] ?? null
            ],
            'summary' => [
                'total_rounds' => $totalRounds,
                'completed_rounds' => $completedRounds,
                'total_brackets' => $totalBrackets,
                'completed_brackets' => $completedBrackets,
                'total_archers' => $totalArchers,
                'total_scorecards' => $totalScorecards,
                'completed_scorecards' => $completedScorecards,
                'total_matches' => $totalMatches,
                'completed_matches' => $completedMatches,
                'overall_progress' => $overallProgress
            ],
            'rounds' => $roundsData,
            'brackets' => $bracketsData,
            'last_updated' => date('c') // ISO 8601 format
        ], 200);
    } catch (Exception $e) {
        error_log("Event overview failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
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

// POST /v1/archers/self - Update archer's own profile (no auth required for self-updates)
if (preg_match('#^/v1/archers/self$#', $route) && $method === 'POST') {
    // Allow archers to update their own profile without requiring coach/event codes
    // This makes the self-edit experience "magical" - no barriers!
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $archerId = trim($input['id'] ?? $input['archerId'] ?? '');
    $extId = trim($input['extId'] ?? '');
    
    if (empty($archerId) && empty($extId)) {
        json_response(['error' => 'Archer ID or extId required'], 400);
        exit;
    }
    
    try {
        $pdo = db();
        
        // Find the archer by ID or extId
        $findStmt = $pdo->prepare('SELECT id, ext_id FROM archers WHERE id = ? OR ext_id = ? LIMIT 1');
        $findStmt->execute([$archerId ?: $extId, $extId ?: $archerId]);
        $existing = $findStmt->fetch();
        
        if (!$existing) {
            json_response(['error' => 'Archer not found'], 404);
            exit;
        }
        
        $targetId = $existing['id'];
        
        // Normalize fields (same as bulk_upsert)
        $firstName = trim($input['firstName'] ?? $input['first'] ?? '');
        $lastName = trim($input['lastName'] ?? $input['last'] ?? '');
        
        if (empty($firstName) || empty($lastName)) {
            json_response(['error' => 'firstName and lastName required'], 400);
            exit;
        }
        
        // Build update (only non-null fields)
        $normalized = [
            'firstName' => $firstName,
            'lastName' => $lastName,
            'nickname' => $normalizeArcherField('nickname', $input['nickname'] ?? null),
            'photoUrl' => $normalizeArcherField('photoUrl', $input['photoUrl'] ?? null),
            'school' => $normalizeArcherField('school', $input['school'] ?? null),
            'grade' => $normalizeArcherField('grade', $input['grade'] ?? null),
            'gender' => $normalizeArcherField('gender', $input['gender'] ?? null),
            'level' => $normalizeArcherField('level', $input['level'] ?? null),
            'status' => $normalizeArcherField('status', $input['status'] ?? null),
            'faves' => $normalizeArcherField('faves', $input['faves'] ?? null),
            'domEye' => $normalizeArcherField('domEye', $input['domEye'] ?? null),
            'domHand' => $normalizeArcherField('domHand', $input['domHand'] ?? null),
            'heightIn' => $normalizeArcherField('heightIn', $input['heightIn'] ?? null),
            'wingspanIn' => $normalizeArcherField('wingspanIn', $input['wingspanIn'] ?? null),
            'drawLengthSugg' => $normalizeArcherField('drawLengthSugg', $input['drawLengthSugg'] ?? null),
            'riserHeightIn' => $normalizeArcherField('riserHeightIn', $input['riserHeightIn'] ?? null),
            'limbLength' => $normalizeArcherField('limbLength', $input['limbLength'] ?? null),
            'limbWeightLbs' => $normalizeArcherField('limbWeightLbs', $input['limbWeightLbs'] ?? null),
            'notesGear' => $normalizeArcherField('notesGear', $input['notesGear'] ?? null),
            'notesCurrent' => $normalizeArcherField('notesCurrent', $input['notesCurrent'] ?? null),
            'notesArchive' => $normalizeArcherField('notesArchive', $input['notesArchive'] ?? null),
            'email' => $normalizeArcherField('email', $input['email'] ?? null),
            'phone' => $normalizeArcherField('phone', $input['phone'] ?? null),
            'usArcheryId' => $normalizeArcherField('usArcheryId', $input['usArcheryId'] ?? null),
            'jvPr' => $normalizeArcherField('jvPr', $input['jvPr'] ?? null),
            'varPr' => $normalizeArcherField('varPr', $input['varPr'] ?? null),
        ];
        
        $updateFields = [];
        $updateValues = [];
        
        if ($normalized['firstName']) { $updateFields[] = 'first_name = ?'; $updateValues[] = $normalized['firstName']; }
        if ($normalized['lastName']) { $updateFields[] = 'last_name = ?'; $updateValues[] = $normalized['lastName']; }
        if ($normalized['nickname'] !== null) { $updateFields[] = 'nickname = ?'; $updateValues[] = $normalized['nickname']; }
        if ($normalized['photoUrl'] !== null) { $updateFields[] = 'photo_url = ?'; $updateValues[] = $normalized['photoUrl']; }
        if ($normalized['school'] !== null) { $updateFields[] = 'school = ?'; $updateValues[] = $normalized['school']; }
        if ($normalized['grade'] !== null) { $updateFields[] = 'grade = ?'; $updateValues[] = $normalized['grade']; }
        if ($normalized['gender'] !== null) { $updateFields[] = 'gender = ?'; $updateValues[] = $normalized['gender']; }
        if ($normalized['level'] !== null) { $updateFields[] = 'level = ?'; $updateValues[] = $normalized['level']; }
        if ($normalized['status'] !== null) { $updateFields[] = 'status = ?'; $updateValues[] = $normalized['status']; }
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
        
        if (empty($updateFields)) {
            json_response(['error' => 'No fields to update'], 400);
            exit;
        }
        
        $updateFields[] = 'updated_at = NOW()';
        $updateValues[] = $targetId;
        
        $sql = 'UPDATE archers SET ' . implode(', ', $updateFields) . ' WHERE id = ?';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($updateValues);
        
        // Return updated archer
        $verify = $pdo->prepare('SELECT id, ext_id, first_name, last_name FROM archers WHERE id = ?');
        $verify->execute([$targetId]);
        $updated = $verify->fetch(PDO::FETCH_ASSOC);
        
        json_response(['archerId' => $targetId, 'updated' => true, 'archer' => $updated], 200);
    } catch (Exception $e) {
        error_log("Archer self-update failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

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
                'email2' => $normalizeArcherField('email', $archer['email2'] ?? null),
                'phone' => $normalizeArcherField('phone', $archer['phone'] ?? null),
                'dob' => $normalizeArcherField('dob', $archer['dob'] ?? null),
                'nationality' => $normalizeArcherField('nationality', $archer['nationality'] ?? null),
                'ethnicity' => $normalizeArcherField('ethnicity', $archer['ethnicity'] ?? null),
                'discipline' => $normalizeArcherField('discipline', $archer['discipline'] ?? null),
                'streetAddress' => $normalizeArcherField('streetAddress', $archer['streetAddress'] ?? null),
                'streetAddress2' => $normalizeArcherField('streetAddress2', $archer['streetAddress2'] ?? null),
                'city' => $normalizeArcherField('city', $archer['city'] ?? null),
                'state' => $normalizeArcherField('state', $archer['state'] ?? null),
                'postalCode' => $normalizeArcherField('postalCode', $archer['postalCode'] ?? null),
                'disability' => $normalizeArcherField('disability', $archer['disability'] ?? null),
                'campAttendance' => $normalizeArcherField('campAttendance', $archer['campAttendance'] ?? null),
                'validFrom' => $normalizeArcherField('validFrom', $archer['validFrom'] ?? null),
                'clubState' => $normalizeArcherField('clubState', $archer['clubState'] ?? null),
                'membershipType' => $normalizeArcherField('membershipType', $archer['membershipType'] ?? null),
                'addressCountry' => $normalizeArcherField('addressCountry', $archer['addressCountry'] ?? null),
                'addressLine3' => $normalizeArcherField('addressLine3', $archer['addressLine3'] ?? null),
                'disabilityList' => $normalizeArcherField('disabilityList', $archer['disabilityList'] ?? null),
                'militaryService' => $normalizeArcherField('militaryService', $archer['militaryService'] ?? null),
                'introductionSource' => $normalizeArcherField('introductionSource', $archer['introductionSource'] ?? null),
                'introductionOther' => $normalizeArcherField('introductionOther', $archer['introductionOther'] ?? null),
                'nfaaMemberNo' => $normalizeArcherField('nfaaMemberNo', $archer['nfaaMemberNo'] ?? null),
                'schoolType' => $normalizeArcherField('schoolType', $archer['schoolType'] ?? null),
                'schoolFullName' => $normalizeArcherField('schoolFullName', $archer['schoolFullName'] ?? null),
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
                if ($normalized['email2'] !== null) { $updateFields[] = 'email2 = ?'; $updateValues[] = $normalized['email2']; }
                if ($normalized['phone'] !== null) { $updateFields[] = 'phone = ?'; $updateValues[] = $normalized['phone']; }
                if ($normalized['dob'] !== null) { $updateFields[] = 'dob = ?'; $updateValues[] = $normalized['dob'] ?: null; }
                if ($normalized['nationality'] !== null) { $updateFields[] = 'nationality = ?'; $updateValues[] = $normalized['nationality']; }
                if ($normalized['ethnicity'] !== null) { $updateFields[] = 'ethnicity = ?'; $updateValues[] = $normalized['ethnicity']; }
                if ($normalized['discipline'] !== null) { $updateFields[] = 'discipline = ?'; $updateValues[] = $normalized['discipline']; }
                if ($normalized['streetAddress'] !== null) { $updateFields[] = 'street_address = ?'; $updateValues[] = $normalized['streetAddress']; }
                if ($normalized['streetAddress2'] !== null) { $updateFields[] = 'street_address2 = ?'; $updateValues[] = $normalized['streetAddress2']; }
                if ($normalized['city'] !== null) { $updateFields[] = 'city = ?'; $updateValues[] = $normalized['city']; }
                if ($normalized['state'] !== null) { $updateFields[] = 'state = ?'; $updateValues[] = $normalized['state']; }
                if ($normalized['postalCode'] !== null) { $updateFields[] = 'postal_code = ?'; $updateValues[] = $normalized['postalCode']; }
                if ($normalized['disability'] !== null) { $updateFields[] = 'disability = ?'; $updateValues[] = $normalized['disability']; }
                if ($normalized['campAttendance'] !== null) { $updateFields[] = 'camp_attendance = ?'; $updateValues[] = $normalized['campAttendance']; }
                if ($normalized['validFrom'] !== null) { $updateFields[] = 'valid_from = ?'; $updateValues[] = $normalized['validFrom'] ?: null; }
                if ($normalized['clubState'] !== null) { $updateFields[] = 'club_state = ?'; $updateValues[] = $normalized['clubState']; }
                if ($normalized['membershipType'] !== null) { $updateFields[] = 'membership_type = ?'; $updateValues[] = $normalized['membershipType']; }
                if ($normalized['addressCountry'] !== null) { $updateFields[] = 'address_country = ?'; $updateValues[] = $normalized['addressCountry']; }
                if ($normalized['addressLine3'] !== null) { $updateFields[] = 'address_line3 = ?'; $updateValues[] = $normalized['addressLine3']; }
                if ($normalized['disabilityList'] !== null) { $updateFields[] = 'disability_list = ?'; $updateValues[] = $normalized['disabilityList']; }
                if ($normalized['militaryService'] !== null) { $updateFields[] = 'military_service = ?'; $updateValues[] = $normalized['militaryService']; }
                if ($normalized['introductionSource'] !== null) { $updateFields[] = 'introduction_source = ?'; $updateValues[] = $normalized['introductionSource']; }
                if ($normalized['introductionOther'] !== null) { $updateFields[] = 'introduction_other = ?'; $updateValues[] = $normalized['introductionOther']; }
                if ($normalized['nfaaMemberNo'] !== null) { $updateFields[] = 'nfaa_member_no = ?'; $updateValues[] = $normalized['nfaaMemberNo']; }
                if ($normalized['schoolType'] !== null) { $updateFields[] = 'school_type = ?'; $updateValues[] = $normalized['schoolType']; }
                if ($normalized['schoolFullName'] !== null) { $updateFields[] = 'school_full_name = ?'; $updateValues[] = $normalized['schoolFullName']; }
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
                    notes_gear, notes_current, notes_archive, email, email2, phone, 
                    dob, nationality, ethnicity, discipline, street_address, street_address2,
                    city, state, postal_code, disability, camp_attendance,
                    valid_from, club_state, membership_type, address_country, address_line3,
                    disability_list, military_service, introduction_source, introduction_other,
                    nfaa_member_no, school_type, school_full_name,
                    us_archery_id, jv_pr, var_pr, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())');
                
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
                    $normalized['email2'],
                    $normalized['phone'],
                    $normalized['dob'] ?: null,
                    $normalized['nationality'] ?: 'U.S.A.',
                    $normalized['ethnicity'],
                    $normalized['discipline'],
                    $normalized['streetAddress'],
                    $normalized['streetAddress2'],
                    $normalized['city'],
                    $normalized['state'],
                    $normalized['postalCode'],
                    $normalized['disability'],
                    $normalized['campAttendance'],
                    $normalized['validFrom'] ?: null,
                    $normalized['clubState'],
                    $normalized['membershipType'],
                    $normalized['addressCountry'] ?: 'USA',
                    $normalized['addressLine3'],
                    $normalized['disabilityList'],
                    $normalized['militaryService'] ?: 'No',
                    $normalized['introductionSource'],
                    $normalized['introductionOther'],
                    $normalized['nfaaMemberNo'],
                    $normalized['schoolType'],
                    $normalized['schoolFullName'],
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
// PUBLIC ENDPOINT - No authentication required
// Archers need access to roster for profile selection on first app open
if (preg_match('#^/v1/archers$#', $route) && $method === 'GET') {
    // No authentication required - this is a public endpoint
    
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
            email2,
            phone, 
            dob,
            nationality,
            ethnicity,
            discipline,
            street_address as streetAddress,
            street_address2 as streetAddress2,
            city,
            state,
            postal_code as postalCode,
            disability,
            camp_attendance as campAttendance,
            valid_from as validFrom,
            club_state as clubState,
            membership_type as membershipType,
            address_country as addressCountry,
            address_line3 as addressLine3,
            disability_list as disabilityList,
            military_service as militaryService,
            introduction_source as introductionSource,
            introduction_other as introductionOther,
            nfaa_member_no as nfaaMemberNo,
            school_type as schoolType,
            school_full_name as schoolFullName,
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

// GET /v1/archers/search - Public endpoint to search archers and get their scorecards
if (preg_match('#^/v1/archers/search$#', $route) && $method === 'GET') {
    $query = trim($_GET['q'] ?? '');
    
    if (strlen($query) < 2) {
        json_response(['error' => 'Query must be at least 2 characters'], 400);
        exit;
    }
    
    try {
        $pdo = db();
        
        // Search archers by name
        $searchPattern = '%' . $query . '%';
        $stmt = $pdo->prepare('
            SELECT 
                id, 
                first_name as firstName, 
                last_name as lastName, 
                school, 
                gender, 
                level
            FROM archers 
            WHERE CONCAT(first_name, " ", last_name) LIKE ?
            ORDER BY last_name, first_name
            LIMIT 20
        ');
        $stmt->execute([$searchPattern]);
        $archers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // For each archer, get their scorecards
        $result = [];
        foreach ($archers as $archer) {
            $cardsStmt = $pdo->prepare('
                SELECT 
                    ra.id as roundArcherId,
                    ra.card_status as cardStatus,
                    ra.completed,
                    ra.locked,
                    r.round_type as roundType,
                    r.division,
                    r.date,
                    e.name as eventName,
                    e.date as eventDate,
                    (SELECT SUM(end_total) FROM end_events WHERE round_archer_id = ra.id) as totalScore
                FROM round_archers ra
                LEFT JOIN rounds r ON r.id = ra.round_id
                LEFT JOIN events e ON e.id = r.event_id
                WHERE ra.archer_id = ?
                ORDER BY r.date DESC, e.date DESC
                LIMIT 50
            ');
            $cardsStmt->execute([$archer['id']]);
            $cards = $cardsStmt->fetchAll(PDO::FETCH_ASSOC);
            
            $result[] = [
                'archer' => $archer,
                'scorecards' => $cards
            ];
        }
        
        json_response(['results' => $result], 200);
    } catch (Exception $e) {
        error_log("Archer search failed: " . $e->getMessage());
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// =====================================================
// PHASE 2: SOLO OLYMPIC MATCH ENDPOINTS
// =====================================================

// POST /v1/solo-matches - Create new solo match
// Note: For standalone matches (no eventId), we allow creation without auth.
// Match code will be generated when second archer is added, then used for auth.
if (preg_match('#^/v1/solo-matches$#', $route) && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    $eventId = $input['eventId'] ?? null;
    $bracketId = $input['bracketId'] ?? null;
    $date = $input['date'] ?? date('Y-m-d');
    $location = $input['location'] ?? null;
    $maxSets = $input['maxSets'] ?? 5;
    $bracketMatchId = null;
    
    // Require auth only if match is linked to an event
    if ($eventId) {
        require_api_key();
    }
    
    try {
        $pdo = db();
        
        // If bracketId is provided, validate it and get bracket info
        if ($bracketId) {
            $bracketStmt = $pdo->prepare('SELECT id, event_id, bracket_type, bracket_format, division FROM brackets WHERE id = ?');
            $bracketStmt->execute([$bracketId]);
            $bracket = $bracketStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$bracket) {
                json_response(['error' => 'Bracket not found'], 404);
                exit;
            }
            
            // Verify bracket type is SOLO
            if ($bracket['bracket_type'] !== 'SOLO') {
                json_response(['error' => 'Bracket type must be SOLO for solo matches'], 400);
                exit;
            }
            
            // Ensure eventId matches bracket's event
            if ($eventId && $eventId !== $bracket['event_id']) {
                json_response(['error' => 'Event ID does not match bracket event'], 400);
                exit;
            }
            
            $eventId = $bracket['event_id']; // Use bracket's event ID
        }
        
        $matchId = $genUuid();
        
        // Note: bracket_match_id will be generated when archers are added (we need their IDs)
        $stmt = $pdo->prepare('INSERT INTO solo_matches (id, event_id, bracket_id, date, location, max_sets, status, created_at) VALUES (?, ?, ?, ?, ?, ?, "Not Started", NOW())');
        $stmt->execute([$matchId, $eventId, $bracketId, $date, $location, $maxSets]);
        
        json_response(['matchId' => $matchId, 'bracketId' => $bracketId], 201);
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// POST /v1/solo-matches/:id/archers - Add archer to solo match
// Note: For standalone matches, we allow adding first archer without auth.
// Once match code is generated (when second archer added), it's required for subsequent requests.
if (preg_match('#^/v1/solo-matches/([0-9a-f-]+)/archers$#i', $route, $m) && $method === 'POST') {
    $matchId = $m[1];
    
    // Check if match exists and if it has a match code
    try {
        $pdo = db();
        $matchCheck = $pdo->prepare('SELECT event_id, match_code FROM solo_matches WHERE id=?');
        $matchCheck->execute([$matchId]);
        $matchData = $matchCheck->fetch();
        
        if (!$matchData) {
            json_response(['error' => 'Match not found'], 404);
            exit;
        }
        
        // Require auth if match is linked to event OR if match code already exists
        if ($matchData['event_id'] || $matchData['match_code']) {
            require_api_key();
        }
    } catch (Exception $e) {
        // If we can't check, require auth to be safe
        require_api_key();
    }
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    $firstName = trim($input['firstName'] ?? '');
    $lastName = trim($input['lastName'] ?? '');
    $extId = $input['extId'] ?? null;
    $school = $input['school'] ?? '';
    $level = $input['level'] ?? '';
    $gender = $input['gender'] ?? '';
    $position = (int)($input['position'] ?? 0);
    
    if ($firstName === '' || $lastName === '' || $position < 1 || $position > 2) {
        json_response(['error' => 'firstName, lastName, and position (1 or 2) required'], 400);
        exit;
    }
    
    try {
        $pdo = db();
        
        // Ensure match exists
        $hasMatch = $pdo->prepare('SELECT id FROM solo_matches WHERE id=?');
        $hasMatch->execute([$matchId]);
        if (!$hasMatch->fetch()) {
            json_response(['error' => 'Match not found'], 404);
            exit;
        }
        
        // Find or create archer in master table
        $archerId = null;
        if ($extId) {
            $stmt = $pdo->prepare('SELECT id FROM archers WHERE ext_id = ? LIMIT 1');
            $stmt->execute([$extId]);
            $archerRow = $stmt->fetch();
            if ($archerRow) {
                $archerId = $archerRow['id'];
            }
        }
        
        if (!$archerId && $firstName && $lastName && $school) {
            $stmt = $pdo->prepare('SELECT id FROM archers WHERE first_name = ? AND last_name = ? AND school = ? LIMIT 1');
            $stmt->execute([$firstName, $lastName, $school]);
            $archerRow = $stmt->fetch();
            if ($archerRow) {
                $archerId = $archerRow['id'];
            }
        }
        
        if (!$archerId) {
            $archerId = $genUuid();
            $stmt = $pdo->prepare('INSERT INTO archers (id, ext_id, first_name, last_name, school, level, gender, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())');
            $stmt->execute([$archerId, $extId, $firstName, $lastName, $school, $level, $gender]);
        }
        
        // Check if archer already exists in this match at this position
        $existing = $pdo->prepare('SELECT id FROM solo_match_archers WHERE match_id=? AND position=? LIMIT 1');
        $existing->execute([$matchId, $position]);
        $existingRow = $existing->fetch();
        
        if ($existingRow) {
            // Update existing
            $updateStmt = $pdo->prepare('UPDATE solo_match_archers SET archer_id=?, archer_name=?, school=?, level=?, gender=? WHERE id=?');
            $archerName = trim("$firstName $lastName");
            $updateStmt->execute([$archerId, $archerName, $school, $level, $gender, $existingRow['id']]);
            json_response(['matchArcherId' => $existingRow['id'], 'archerId' => $archerId, 'updated' => true], 200);
            exit;
        }
        
        // Create new
        $matchArcherId = $genUuid();
        $archerName = trim("$firstName $lastName");
        $stmt = $pdo->prepare('INSERT INTO solo_match_archers (id, match_id, archer_id, archer_name, school, level, gender, position, created_at) VALUES (?,?,?,?,?,?,?,?,NOW())');
        $stmt->execute([$matchArcherId, $matchId, $archerId, $archerName, $school, $level, $gender, $position]);
        
        // Check if this is the second archer - if so, generate bracket_match_id if bracket exists
        $archerCountStmt = $pdo->prepare('SELECT COUNT(*) as count FROM solo_match_archers WHERE match_id = ?');
        $archerCountStmt->execute([$matchId]);
        $archerCount = $archerCountStmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        if ($archerCount === 2) {
            // Get match info to check for bracket
            $matchInfoStmt = $pdo->prepare('SELECT bracket_id FROM solo_matches WHERE id = ?');
            $matchInfoStmt->execute([$matchId]);
            $matchInfo = $matchInfoStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($matchInfo && $matchInfo['bracket_id']) {
                $bracketFormat = null;
                $bracketStmt = $pdo->prepare('SELECT bracket_format FROM brackets WHERE id = ?');
                $bracketStmt->execute([$matchInfo['bracket_id']]);
                $bracketRow = $bracketStmt->fetch(PDO::FETCH_ASSOC);
                if ($bracketRow) {
                    $bracketFormat = $bracketRow['bracket_format'];
                }

                // Get both archer IDs
                $archersStmt = $pdo->prepare('SELECT archer_id, position FROM solo_match_archers WHERE match_id = ? ORDER BY position');
                $archersStmt->execute([$matchId]);
                $archers = $archersStmt->fetchAll(PDO::FETCH_ASSOC);
                
                if (count($archers) === 2) {
                    $archer1Id = $archers[0]['archer_id'];
                    $archer2Id = $archers[1]['archer_id'];
                    
                    // For elimination brackets, we need round and match number from bracket structure
                    // For now, generate a simple ID - will be refined when bracket structure is clearer
                    if ($bracketFormat === 'ELIMINATION') {
                        // For elimination, bracket_match_id format: {DIVISION}{ROUND}{MATCH}-{INITIALS1}-{INITIALS2}
                        // We'll need to determine round and match number from bracket structure
                        // For now, use a placeholder that can be updated later
                        $bracketMatchId = generate_elimination_match_id($pdo, $matchInfo['bracket_id'], 'quarter', 1, $archer1Id, $archer2Id);
                    } else {
                        // For Swiss, use existing match code system
                        $bracketMatchId = null; // Will use match_code instead
                    }
                    
                    if ($bracketMatchId) {
                        $updateMatchStmt = $pdo->prepare('UPDATE solo_matches SET bracket_match_id = ? WHERE id = ?');
                        $updateMatchStmt->execute([$bracketMatchId, $matchId]);
                    }
                }
            }
        }
        
        // Generate match code when second archer is added
        $matchCode = null;
        $archers = $pdo->prepare('SELECT archer_name, position FROM solo_match_archers WHERE match_id = ? ORDER BY position');
        $archers->execute([$matchId]);
        $archerRows = $archers->fetchAll();
        
        if (count($archerRows) === 2) {
            // Parse archer names to get first/last names
            $archer1Name = $archerRows[0]['archer_name'];
            $archer2Name = $archerRows[1]['archer_name'];
            
            $archer1Parts = explode(' ', $archer1Name, 2);
            $archer2Parts = explode(' ', $archer2Name, 2);
            
            $archer1First = $archer1Parts[0] ?? '';
            $archer1Last = $archer1Parts[1] ?? '';
            $archer2First = $archer2Parts[0] ?? '';
            $archer2Last = $archer2Parts[1] ?? '';
            
            // Get match date
            $matchStmt = $pdo->prepare('SELECT date FROM solo_matches WHERE id = ?');
            $matchStmt->execute([$matchId]);
            $matchDate = $matchStmt->fetchColumn();
            
            if ($archer1First && $archer1Last && $archer2First && $archer2Last && $matchDate) {
                $matchCode = generate_solo_match_code($pdo, $archer1First, $archer1Last, $archer2First, $archer2Last, $matchDate);
                
                // Update match with code
                $updateStmt = $pdo->prepare('UPDATE solo_matches SET match_code = ? WHERE id = ?');
                $updateStmt->execute([$matchCode, $matchId]);
                error_log("[SoloMatch] Generated match code: $matchCode for match: $matchId");
            }
        }
        
        $response = ['matchArcherId' => $matchArcherId, 'archerId' => $archerId, 'created' => true];
        if ($matchCode) {
            $response['matchCode'] = $matchCode;
        }
        json_response($response, 201);
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// POST /v1/solo-matches/:id/archers/:archerId/sets - Submit set scores
// Note: Requires match code (for standalone) or event code/coach key (for event-linked)
if (preg_match('#^/v1/solo-matches/([0-9a-f-]+)/archers/([0-9a-f-]+)/sets$#i', $route, $m) && $method === 'POST') {
    require_api_key(); // This now accepts match codes via require_api_key()
    $matchId = $m[1];
    $matchArcherId = $m[2];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    $setNumber = (int)($input['setNumber'] ?? 0);
    $a1 = $input['a1'] ?? null;
    $a2 = $input['a2'] ?? null;
    $a3 = $input['a3'] ?? null;
    $setTotal = (int)($input['setTotal'] ?? 0);
    $setPoints = (int)($input['setPoints'] ?? 0);
    $runningPoints = (int)($input['runningPoints'] ?? 0);
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
    
    if ($setNumber < 1) {
        json_response(['error' => 'setNumber required'], 400);
        exit;
    }
    
    try {
        $pdo = db();
        
        // Check if set already exists
        $existing = $pdo->prepare('SELECT id FROM solo_match_sets WHERE match_archer_id=? AND set_number=? LIMIT 1');
        $existing->execute([$matchArcherId, $setNumber]);
        $existingRow = $existing->fetch();
        
        if ($existingRow) {
            // Update existing
            $updateStmt = $pdo->prepare('UPDATE solo_match_sets SET a1=?, a2=?, a3=?, set_total=?, set_points=?, running_points=?, tens=?, xs=?, device_ts=? WHERE id=?');
            $updateStmt->execute([$a1, $a2, $a3, $setTotal, $setPoints, $runningPoints, $tens, $xs, $deviceTs, $existingRow['id']]);
            json_response(['setId' => $existingRow['id'], 'updated' => true], 200);
            exit;
        }
        
        // Create new
        $setId = $genUuid();
        $stmt = $pdo->prepare('INSERT INTO solo_match_sets (id, match_id, match_archer_id, set_number, a1, a2, a3, set_total, set_points, running_points, tens, xs, device_ts, server_ts) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())');
        $stmt->execute([$setId, $matchId, $matchArcherId, $setNumber, $a1, $a2, $a3, $setTotal, $setPoints, $runningPoints, $tens, $xs, $deviceTs]);
        
        // Update match status to In Progress
        $updateMatch = $pdo->prepare('UPDATE solo_matches SET status="In Progress" WHERE id=? AND status="Not Started"');
        $updateMatch->execute([$matchId]);
        
        json_response(['setId' => $setId, 'created' => true], 201);
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// GET /v1/solo-matches/:id - Get solo match details
// Allow read-only access without authentication (for match restoration from URL)
// Match code or event code still required for editing operations (POST/PATCH)
if (preg_match('#^/v1/solo-matches/([0-9a-f-]+)$#i', $route, $m) && $method === 'GET') {
    // No authentication required for read-only GET requests
    // This allows match restoration from URL parameters
    $matchId = $m[1];
    
    try {
        $pdo = db();
        
        // Get match details
        $matchStmt = $pdo->prepare('SELECT * FROM solo_matches WHERE id=?');
        $matchStmt->execute([$matchId]);
        $match = $matchStmt->fetch();
        
        if (!$match) {
            json_response(['error' => 'Match not found'], 404);
            exit;
        }
        
        // Get archers
        $archersStmt = $pdo->prepare('SELECT * FROM solo_match_archers WHERE match_id=? ORDER BY position');
        $archersStmt->execute([$matchId]);
        $archers = $archersStmt->fetchAll();
        
        // Get sets for each archer
        foreach ($archers as &$archer) {
            $setsStmt = $pdo->prepare('SELECT * FROM solo_match_sets WHERE match_archer_id=? ORDER BY set_number');
            $setsStmt->execute([$archer['id']]);
            $archer['sets'] = $setsStmt->fetchAll();
        }
        
        $match['archers'] = $archers;
        json_response(['match' => $match], 200);
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// GET /v1/events/:id/solo-matches - Get all solo matches for an event
// Query params: bracket_id (optional), status (optional), locked (optional), card_status (optional)
if (preg_match('#^/v1/events/([0-9a-f-]+)/solo-matches$#i', $route, $m) && $method === 'GET') {
    require_api_key();
    $eventId = $m[1];
    
    // Parse query parameters
    $bracketId = $_GET['bracket_id'] ?? null;
    $statusFilter = $_GET['status'] ?? null;
    $lockedFilter = $_GET['locked'] ?? null;
    $cardStatusFilter = $_GET['card_status'] ?? null;
    
    try {
        $pdo = db();
        
        // Build WHERE clause with filters
        $whereConditions = ['sm.event_id = ?'];
        $params = [$eventId];
        
        if ($bracketId) {
            $whereConditions[] = 'sm.bracket_id = ?';
            $params[] = $bracketId;
        }
        
        if ($statusFilter) {
            $whereConditions[] = 'sm.status = ?';
            $params[] = $statusFilter;
        }
        
        if ($lockedFilter !== null) {
            $whereConditions[] = 'sm.locked = ?';
            $params[] = $lockedFilter === 'true' ? 1 : 0;
        }
        
        if ($cardStatusFilter) {
            $whereConditions[] = 'sm.card_status = ?';
            $params[] = $cardStatusFilter;
        }
        
        $whereClause = implode(' AND ', $whereConditions);
        
        // Get all matches for this event with filters
        $matchesStmt = $pdo->prepare("
            SELECT 
                sm.id,
                sm.event_id,
                sm.bracket_id,
                sm.date,
                sm.location,
                sm.status,
                sm.locked,
                sm.card_status,
                sm.verified_at,
                sm.verified_by,
                sm.winner_archer_id,
                sm.match_code,
                sm.created_at
            FROM solo_matches sm
            WHERE {$whereClause}
            ORDER BY sm.date DESC, sm.created_at DESC
        ");
        $matchesStmt->execute($params);
        $matches = $matchesStmt->fetchAll();
        
        // Calculate summary statistics
        $summary = [
            'total' => count($matches),
            'pending' => 0,
            'completed' => 0,
            'verified' => 0,
            'voided' => 0
        ];
        
        // For each match, get archers and their scores
        foreach ($matches as &$match) {
            // Update summary counts
            $cardStatus = strtoupper($match['card_status'] ?? 'PENDING');
            if ($cardStatus === 'VER' || $cardStatus === 'VERIFIED') {
                $summary['verified']++;
            } elseif ($cardStatus === 'VOID') {
                $summary['voided']++;
            } elseif ($cardStatus === 'COMP' || $cardStatus === 'COMPLETED') {
                $summary['completed']++;
            } else {
                $summary['pending']++;
            }
            
            $archersStmt = $pdo->prepare('
                SELECT 
                    sma.id,
                    sma.position,
                    sma.archer_name,
                    sma.school,
                    sma.archer_id
                FROM solo_match_archers sma
                WHERE sma.match_id = ?
                ORDER BY sma.position
            ');
            $archersStmt->execute([$match['id']]);
            $archers = $archersStmt->fetchAll();
            
            // Calculate sets_won for each archer (count sets where set_points = 2)
            foreach ($archers as &$archer) {
                $setsWonStmt = $pdo->prepare('
                    SELECT 
                        COUNT(CASE WHEN set_points = 2 THEN 1 END) as sets_won,
                        SUM(set_total) as total_score
                    FROM solo_match_sets
                    WHERE match_archer_id = ? AND set_number <= 5
                ');
                $setsWonStmt->execute([$archer['id']]);
                $stats = $setsWonStmt->fetch(PDO::FETCH_ASSOC);
                $archer['sets_won'] = (int)($stats['sets_won'] ?? 0);
                $archer['total_score'] = (int)($stats['total_score'] ?? 0);
            }
            
            // Determine winner name
            $match['archer1'] = $archers[0] ?? null;
            $match['archer2'] = $archers[1] ?? null;
            
            // Add sets_won to match for easy access
            $match['archer1_sets_won'] = $match['archer1']['sets_won'] ?? 0;
            $match['archer2_sets_won'] = $match['archer2']['sets_won'] ?? 0;
            
            if ($match['winner_archer_id']) {
                foreach ($archers as $archer) {
                    if ($archer['archer_id'] === $match['winner_archer_id']) {
                        $match['winner_name'] = $archer['archer_name'];
                        break;
                    }
                }
            }
            
            // Format as "Archer A vs Archer B"
            if ($match['archer1'] && $match['archer2']) {
                $match['match_display'] = $match['archer1']['archer_name'] . ' vs ' . $match['archer2']['archer_name'];
            }
            
            // Add bracket name if bracket_id exists
            if ($match['bracket_id']) {
                $bracketStmt = $pdo->prepare('SELECT id, division, bracket_format, bracket_type FROM brackets WHERE id = ? LIMIT 1');
                $bracketStmt->execute([$match['bracket_id']]);
                $bracket = $bracketStmt->fetch(PDO::FETCH_ASSOC);
                if ($bracket) {
                    $match['bracket_name'] = ($bracket['bracket_type'] === 'SOLO' ? 'Solo ' : 'Team ') . 
                                             ($bracket['bracket_format'] === 'ELIMINATION' ? 'Elimination' : 'Swiss') . 
                                             ' - ' . $bracket['division'];
                }
            }
        }
        
        json_response(['matches' => $matches, 'summary' => $summary], 200);
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// GET /v1/events/:id/team-matches - Get all team matches for an event
if (preg_match('#^/v1/events/([0-9a-f-]+)/team-matches$#i', $route, $m) && $method === 'GET') {
    require_api_key();
    $eventId = $m[1];
    
    try {
        $pdo = db();
        
        // Get all matches for this event
        $matchesStmt = $pdo->prepare('
            SELECT 
                tm.id,
                tm.event_id,
                tm.date,
                tm.location,
                tm.status,
                tm.locked,
                tm.card_status,
                tm.verified_at,
                tm.verified_by,
                tm.winner_team_id,
                tm.match_code,
                tm.created_at
            FROM team_matches tm
            WHERE tm.event_id = ?
            ORDER BY tm.date DESC, tm.created_at DESC
        ');
        $matchesStmt->execute([$eventId]);
        $matches = $matchesStmt->fetchAll();
        
        // For each match, get teams and their scores
        foreach ($matches as &$match) {
            $teamsStmt = $pdo->prepare('
                SELECT 
                    tmt.id,
                    tmt.position,
                    tmt.team_name,
                    tmt.school,
                    tmt.sets_won,
                    COALESCE(MAX(tms.running_points), 0) as total_set_points,
                    COUNT(DISTINCT tms.set_number) as sets_completed
                FROM team_match_teams tmt
                LEFT JOIN team_match_sets tms ON tms.team_id = tmt.id
                WHERE tmt.match_id = ?
                GROUP BY tmt.id, tmt.position, tmt.team_name, tmt.school, tmt.sets_won
                ORDER BY tmt.position
            ');
            $teamsStmt->execute([$match['id']]);
            $teams = $teamsStmt->fetchAll();
            
            // Get archers for each team
            foreach ($teams as &$team) {
                $archersStmt = $pdo->prepare('
                    SELECT archer_name, school, position
                    FROM team_match_archers
                    WHERE team_id = ?
                    ORDER BY position
                ');
                $archersStmt->execute([$team['id']]);
                $team['archers'] = $archersStmt->fetchAll();
            }
            
            $match['team1'] = $teams[0] ?? null;
            $match['team2'] = $teams[1] ?? null;
            
            // Determine winner team name
            if ($match['winner_team_id']) {
                foreach ($teams as $team) {
                    if ($team['id'] === $match['winner_team_id']) {
                        $match['winner_name'] = $team['team_name'] ?: $team['school'];
                        break;
                    }
                }
            }
            
            // Format as "Team A vs Team B"
            if ($match['team1'] && $match['team2']) {
                $team1Name = $match['team1']['team_name'] ?: $match['team1']['school'] ?: 'Team 1';
                $team2Name = $match['team2']['team_name'] ?: $match['team2']['school'] ?: 'Team 2';
                $match['match_display'] = $team1Name . ' vs ' . $team2Name;
            }
        }
        
        json_response(['matches' => $matches], 200);
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// POST /v1/solo-matches/:id/verify - Lock/Unlock/Void match
if (preg_match('#^/v1/solo-matches/([0-9a-f-]+)/verify$#i', $route, $m) && $method === 'POST') {
    require_api_key();
    $matchId = $m[1];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = trim($input['action'] ?? '');
    $verifiedBy = trim($input['verifiedBy'] ?? '');
    $notes = trim($input['notes'] ?? '');

    if (empty($action)) {
        json_response(['error' => 'Action is required (lock, unlock, or void)'], 400);
        exit;
    }

    try {
        $pdo = db();
        $result = process_solo_match_verification($pdo, $matchId, $action, $verifiedBy, $notes);
        json_response([
            'matchId' => $result['id'],
            'eventId' => $result['event_id'],
            'status' => $result['status'],
            'locked' => (bool)$result['locked'],
            'cardStatus' => $result['card_status'],
            'verifiedBy' => $result['verified_by'],
            'verifiedAt' => $result['verified_at'],
            'notes' => $result['notes'],
            'history' => $result['lock_history']
        ]);
    } catch (Exception $e) {
        $status = (int)$e->getCode();
        if ($status < 100 || $status > 599) $status = 400;
        json_response(['error' => $e->getMessage()], $status);
    }
    exit;
}

// PATCH /v1/solo-matches/:id - Update match (winner, status, verification)
// NOTE: Direct locking via PATCH is deprecated. Use POST /v1/solo-matches/:id/verify instead.
if (preg_match('#^/v1/solo-matches/([0-9a-f-]+)$#i', $route, $m) && $method === 'PATCH') {
    require_api_key();
    $matchId = $m[1];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    try {
        $pdo = db();
        
        $updates = [];
        $params = [];
        
        if (isset($input['status'])) {
            $updates[] = 'status=?';
            $params[] = $input['status'];
        }
        if (isset($input['winnerArcherId'])) {
            $updates[] = 'winner_archer_id=?';
            $params[] = $input['winnerArcherId'];
        }
        if (isset($input['shootOff'])) {
            $updates[] = 'shoot_off=?';
            $params[] = $input['shootOff'] ? 1 : 0;
        }
        // Deprecated: Direct locking via PATCH. Use POST /v1/solo-matches/:id/verify instead.
        // Keeping for backward compatibility but adding warning.
        if (isset($input['locked']) || isset($input['cardStatus'])) {
            if (isset($input['locked'])) {
                $updates[] = 'locked=?';
                $params[] = $input['locked'] ? 1 : 0;
            }
            if (isset($input['cardStatus'])) {
                $updates[] = 'card_status=?';
                $params[] = $input['cardStatus'];
            }
        }
        if (isset($input['notes'])) {
            $updates[] = 'notes=?';
            $params[] = $input['notes'];
        }
        
        if (empty($updates)) {
            json_response(['error' => 'No fields to update'], 400);
            exit;
        }
        
        $updates[] = 'updated_at=NOW()';
        $params[] = $matchId;
        
        $sql = 'UPDATE solo_matches SET ' . implode(', ', $updates) . ' WHERE id=?';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        json_response(['message' => 'Match updated successfully'], 200);
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// =====================================================
// PHASE 2: TEAM OLYMPIC MATCH ENDPOINTS
// =====================================================

// POST /v1/team-matches - Create new team match
// Note: For standalone matches (no eventId), we allow creation without auth.
// Match code will be generated when second team is fully populated (3 archers each).
if (preg_match('#^/v1/team-matches$#', $route) && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    $eventId = $input['eventId'] ?? null;
    $bracketId = $input['bracketId'] ?? null;
    $date = $input['date'] ?? date('Y-m-d');
    $location = $input['location'] ?? null;
    $maxSets = $input['maxSets'] ?? 4;
    $bracketMatchId = null;
    
    // Require auth only if match is linked to an event
    if ($eventId) {
        require_api_key();
    }
    
    try {
        $pdo = db();
        
        // If bracketId is provided, validate it and get bracket info
        if ($bracketId) {
            $bracketStmt = $pdo->prepare('SELECT id, event_id, bracket_type, bracket_format, division FROM brackets WHERE id = ?');
            $bracketStmt->execute([$bracketId]);
            $bracket = $bracketStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$bracket) {
                json_response(['error' => 'Bracket not found'], 404);
                exit;
            }
            
            // Verify bracket type is TEAM
            if ($bracket['bracket_type'] !== 'TEAM') {
                json_response(['error' => 'Bracket type must be TEAM for team matches'], 400);
                exit;
            }
            
            // Ensure eventId matches bracket's event
            if ($eventId && $eventId !== $bracket['event_id']) {
                json_response(['error' => 'Event ID does not match bracket event'], 400);
                exit;
            }
            
            $eventId = $bracket['event_id']; // Use bracket's event ID
        }
        
        $matchId = $genUuid();
        
        // Note: bracket_match_id will be generated when teams are added (we need their IDs)
        $stmt = $pdo->prepare('INSERT INTO team_matches (id, event_id, bracket_id, date, location, max_sets, status, created_at) VALUES (?, ?, ?, ?, ?, ?, "Not Started", NOW())');
        $stmt->execute([$matchId, $eventId, $bracketId, $date, $location, $maxSets]);
        
        json_response(['matchId' => $matchId, 'bracketId' => $bracketId], 201);
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// POST /v1/team-matches/:id/teams - Add team to match
// Note: For standalone matches, we allow adding first team without auth.
// Once match code is generated (when second team complete), it's required for subsequent requests.
if (preg_match('#^/v1/team-matches/([0-9a-f-]+)/teams$#i', $route, $m) && $method === 'POST') {
    $matchId = $m[1];
    
    // Check if match exists and if it has a match code
    try {
        $pdo = db();
        $matchCheck = $pdo->prepare('SELECT event_id, match_code FROM team_matches WHERE id=?');
        $matchCheck->execute([$matchId]);
        $matchData = $matchCheck->fetch();
        
        if (!$matchData) {
            json_response(['error' => 'Match not found'], 404);
            exit;
        }
        
        // Require auth if match is linked to event OR if match code already exists
        if ($matchData['event_id'] || $matchData['match_code']) {
            require_api_key();
        }
    } catch (Exception $e) {
        // If we can't check, require auth to be safe
        require_api_key();
    }
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    $teamName = $input['teamName'] ?? null;
    $school = substr(trim($input['school'] ?? ''), 0, 3); // Limit to 3 chars for VARCHAR(3)
    $position = (int)($input['position'] ?? 0);
    
    if ($position < 1 || $position > 2) {
        json_response(['error' => 'position (1 or 2) required'], 400);
        exit;
    }
    
    try {
        $pdo = db();
        
        // Ensure match exists
        $hasMatch = $pdo->prepare('SELECT id FROM team_matches WHERE id=?');
        $hasMatch->execute([$matchId]);
        if (!$hasMatch->fetch()) {
            json_response(['error' => 'Match not found'], 404);
            exit;
        }
        
        // Check if team already exists at this position
        $existing = $pdo->prepare('SELECT id FROM team_match_teams WHERE match_id=? AND position=? LIMIT 1');
        $existing->execute([$matchId, $position]);
        $existingRow = $existing->fetch();
        
        if ($existingRow) {
            // Update existing
            $updateStmt = $pdo->prepare('UPDATE team_match_teams SET team_name=?, school=? WHERE id=?');
            $updateStmt->execute([$teamName, $school, $existingRow['id']]);
            json_response(['teamId' => $existingRow['id'], 'updated' => true], 200);
            exit;
        }
        
        // Create new
        $teamId = $genUuid();
        $stmt = $pdo->prepare('INSERT INTO team_match_teams (id, match_id, team_name, school, position, created_at) VALUES (?,?,?,?,?,NOW())');
        $stmt->execute([$teamId, $matchId, $teamName, $school, $position]);
        
        json_response(['teamId' => $teamId, 'created' => true], 201);
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// POST /v1/team-matches/:id/teams/:teamId/archers - Add archer to team
// Note: Generate match code when second team is complete (3 archers each)
// Note: For standalone matches, we allow adding archers to first team without auth.
// Once match code is generated (when second team complete), it's required for subsequent requests.
if (preg_match('#^/v1/team-matches/([0-9a-f-]+)/teams/([0-9a-f-]+)/archers$#i', $route, $m) && $method === 'POST') {
    $matchId = $m[1];
    $teamId = $m[2];
    
    // Check if match exists and if it has a match code
    try {
        $pdo = db();
        $matchCheck = $pdo->prepare('SELECT event_id, match_code FROM team_matches WHERE id=?');
        $matchCheck->execute([$matchId]);
        $matchData = $matchCheck->fetch();
        
        if (!$matchData) {
            json_response(['error' => 'Match not found'], 404);
            exit;
        }
        
        // Require auth if match is linked to event OR if match code already exists
        if ($matchData['event_id'] || $matchData['match_code']) {
            require_api_key(); // This now accepts match codes via require_api_key()
        }
    } catch (Exception $e) {
        // If we can't check, require auth to be safe
        require_api_key();
    }
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    $firstName = trim($input['firstName'] ?? '');
    $lastName = trim($input['lastName'] ?? '');
    $extId = $input['extId'] ?? null;
    $school = $input['school'] ?? '';
    $level = $input['level'] ?? '';
    $gender = $input['gender'] ?? '';
    $position = (int)($input['position'] ?? 0);
    
    if ($firstName === '' || $lastName === '' || $position < 1 || $position > 3) {
        json_response(['error' => 'firstName, lastName, and position (1-3) required'], 400);
        exit;
    }
    
    try {
        $pdo = db();
        
        // Ensure team exists
        $hasTeam = $pdo->prepare('SELECT id FROM team_match_teams WHERE id=? AND match_id=?');
        $hasTeam->execute([$teamId, $matchId]);
        if (!$hasTeam->fetch()) {
            json_response(['error' => 'Team not found'], 404);
            exit;
        }
        
        // Find or create archer in master table
        $archerId = null;
        if ($extId) {
            $stmt = $pdo->prepare('SELECT id FROM archers WHERE ext_id = ? LIMIT 1');
            $stmt->execute([$extId]);
            $archerRow = $stmt->fetch();
            if ($archerRow) {
                $archerId = $archerRow['id'];
            }
        }
        
        if (!$archerId && $firstName && $lastName && $school) {
            $stmt = $pdo->prepare('SELECT id FROM archers WHERE first_name = ? AND last_name = ? AND school = ? LIMIT 1');
            $stmt->execute([$firstName, $lastName, $school]);
            $archerRow = $stmt->fetch();
            if ($archerRow) {
                $archerId = $archerRow['id'];
            }
        }
        
        if (!$archerId) {
            $archerId = $genUuid();
            $stmt = $pdo->prepare('INSERT INTO archers (id, ext_id, first_name, last_name, school, level, gender, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())');
            $stmt->execute([$archerId, $extId, $firstName, $lastName, $school, $level, $gender]);
        }
        
        // Check if archer already exists in this team at this position
        $existing = $pdo->prepare('SELECT id FROM team_match_archers WHERE team_id=? AND position=? LIMIT 1');
        $existing->execute([$teamId, $position]);
        $existingRow = $existing->fetch();
        
        if ($existingRow) {
            // Update existing
            $updateStmt = $pdo->prepare('UPDATE team_match_archers SET archer_id=?, archer_name=?, school=?, level=?, gender=? WHERE id=?');
            $archerName = trim("$firstName $lastName");
            $updateStmt->execute([$archerId, $archerName, $school, $level, $gender, $existingRow['id']]);
            
            // Check if match code should be generated (after update too)
            $matchCode = null;
            $teams = $pdo->prepare('SELECT t.id, t.position, COUNT(tma.id) as archer_count 
                                     FROM team_match_teams t 
                                     LEFT JOIN team_match_archers tma ON t.id = tma.team_id 
                                     WHERE t.match_id = ? 
                                     GROUP BY t.id, t.position 
                                     ORDER BY t.position');
            $teams->execute([$matchId]);
            $teamRows = $teams->fetchAll();
            
            if (count($teamRows) === 2) {
                $team1Count = (int)($teamRows[0]['archer_count'] ?? 0);
                $team2Count = (int)($teamRows[1]['archer_count'] ?? 0);
                
                // Both teams have 3 archers - generate match code
                if ($team1Count === 3 && $team2Count === 3) {
                    // Get all archers for both teams
                    $team1Archers = $pdo->prepare('SELECT archer_name FROM team_match_archers tma 
                                                    JOIN team_match_teams t ON tma.team_id = t.id 
                                                    WHERE t.match_id = ? AND t.position = 1 
                                                    ORDER BY tma.position');
                    $team1Archers->execute([$matchId]);
                    $team1ArcherRows = $team1Archers->fetchAll();
                    
                    $team2Archers = $pdo->prepare('SELECT archer_name FROM team_match_archers tma 
                                                    JOIN team_match_teams t ON tma.team_id = t.id 
                                                    WHERE t.match_id = ? AND t.position = 2 
                                                    ORDER BY tma.position');
                    $team2Archers->execute([$matchId]);
                    $team2ArcherRows = $team2Archers->fetchAll();
                    
                    // Get match date
                    $matchStmt = $pdo->prepare('SELECT date FROM team_matches WHERE id = ?');
                    $matchStmt->execute([$matchId]);
                    $matchDate = $matchStmt->fetchColumn();
                    
                    // Check if match code already exists
                    $existingCodeStmt = $pdo->prepare('SELECT match_code FROM team_matches WHERE id = ?');
                    $existingCodeStmt->execute([$matchId]);
                    $existingCode = $existingCodeStmt->fetchColumn();
                    
                    if (!$existingCode && count($team1ArcherRows) === 3 && count($team2ArcherRows) === 3 && $matchDate) {
                        $matchCode = generate_team_match_code($pdo, $team1ArcherRows, $team2ArcherRows, $matchDate);
                        
                        // Update match with code
                        $updateStmt = $pdo->prepare('UPDATE team_matches SET match_code = ? WHERE id = ?');
                        $updateStmt->execute([$matchCode, $matchId]);
                    }
                }
            }
            
            $response = ['matchArcherId' => $existingRow['id'], 'archerId' => $archerId, 'updated' => true];
            if ($matchCode) {
                $response['matchCode'] = $matchCode;
            }
            json_response($response, 200);
            exit;
        }
        
        // Create new
        $matchArcherId = $genUuid();
        $archerName = trim("$firstName $lastName");
        $stmt = $pdo->prepare('INSERT INTO team_match_archers (id, match_id, team_id, archer_id, archer_name, school, level, gender, position, created_at) VALUES (?,?,?,?,?,?,?,?,?,NOW())');
        $stmt->execute([$matchArcherId, $matchId, $teamId, $archerId, $archerName, $school, $level, $gender, $position]);
        
        // Generate match code when both teams are complete (3 archers each)
        $matchCode = null;
        $teams = $pdo->prepare('SELECT t.id, t.position, COUNT(tma.id) as archer_count 
                                 FROM team_match_teams t 
                                 LEFT JOIN team_match_archers tma ON t.id = tma.team_id 
                                 WHERE t.match_id = ? 
                                 GROUP BY t.id, t.position 
                                 ORDER BY t.position');
        $teams->execute([$matchId]);
        $teamRows = $teams->fetchAll();
        
        if (count($teamRows) === 2) {
            $team1Count = (int)($teamRows[0]['archer_count'] ?? 0);
            $team2Count = (int)($teamRows[1]['archer_count'] ?? 0);
            
            // Both teams have 3 archers - generate match code
            if ($team1Count === 3 && $team2Count === 3) {
                // Get all archers for both teams
                $team1Archers = $pdo->prepare('SELECT archer_name FROM team_match_archers tma 
                                                JOIN team_match_teams t ON tma.team_id = t.id 
                                                WHERE t.match_id = ? AND t.position = 1 
                                                ORDER BY tma.position');
                $team1Archers->execute([$matchId]);
                $team1ArcherRows = $team1Archers->fetchAll();
                
                $team2Archers = $pdo->prepare('SELECT archer_name FROM team_match_archers tma 
                                                JOIN team_match_teams t ON tma.team_id = t.id 
                                                WHERE t.match_id = ? AND t.position = 2 
                                                ORDER BY tma.position');
                $team2Archers->execute([$matchId]);
                $team2ArcherRows = $team2Archers->fetchAll();
                
                // Get match date
                $matchStmt = $pdo->prepare('SELECT date FROM team_matches WHERE id = ?');
                $matchStmt->execute([$matchId]);
                $matchDate = $matchStmt->fetchColumn();
                
                if (count($team1ArcherRows) === 3 && count($team2ArcherRows) === 3 && $matchDate) {
                    $matchCode = generate_team_match_code($pdo, $team1ArcherRows, $team2ArcherRows, $matchDate);
                    
                    // Update match with code
                    $updateStmt = $pdo->prepare('UPDATE team_matches SET match_code = ? WHERE id = ?');
                    $updateStmt->execute([$matchCode, $matchId]);
                    error_log("[TeamMatch] Generated match code: $matchCode for match: $matchId");
                }
            }
        }
        
        $response = ['matchArcherId' => $matchArcherId, 'archerId' => $archerId, 'created' => true];
        if ($matchCode) {
            $response['matchCode'] = $matchCode;
        }
        json_response($response, 201);
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// POST /v1/team-matches/:id/teams/:teamId/archers/:archerId/sets - Submit set scores
if (preg_match('#^/v1/team-matches/([0-9a-f-]+)/teams/([0-9a-f-]+)/archers/([0-9a-f-]+)/sets$#i', $route, $m) && $method === 'POST') {
    require_api_key();
    $matchId = $m[1];
    $teamId = $m[2];
    $matchArcherId = $m[3];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    $setNumber = (int)($input['setNumber'] ?? 0);
    $a1 = $input['a1'] ?? null;
    $setTotal = (int)($input['setTotal'] ?? 0);
    $setPoints = (int)($input['setPoints'] ?? 0);
    $runningPoints = (int)($input['runningPoints'] ?? 0);
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
    
    if ($setNumber < 1) {
        json_response(['error' => 'setNumber required'], 400);
        exit;
    }
    
    try {
        $pdo = db();
        
        // Check if set already exists
        $existing = $pdo->prepare('SELECT id FROM team_match_sets WHERE match_archer_id=? AND set_number=? LIMIT 1');
        $existing->execute([$matchArcherId, $setNumber]);
        $existingRow = $existing->fetch();
        
        if ($existingRow) {
            // Update existing
            $updateStmt = $pdo->prepare('UPDATE team_match_sets SET a1=?, set_total=?, set_points=?, running_points=?, tens=?, xs=?, device_ts=? WHERE id=?');
            $updateStmt->execute([$a1, $setTotal, $setPoints, $runningPoints, $tens, $xs, $deviceTs, $existingRow['id']]);
            json_response(['setId' => $existingRow['id'], 'updated' => true], 200);
            exit;
        }
        
        // Create new
        $setId = $genUuid();
        $stmt = $pdo->prepare('INSERT INTO team_match_sets (id, match_id, team_id, match_archer_id, set_number, a1, set_total, set_points, running_points, tens, xs, device_ts, server_ts) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NOW())');
        $stmt->execute([$setId, $matchId, $teamId, $matchArcherId, $setNumber, $a1, $setTotal, $setPoints, $runningPoints, $tens, $xs, $deviceTs]);
        
        // Update match status to In Progress
        $updateMatch = $pdo->prepare('UPDATE team_matches SET status="In Progress" WHERE id=? AND status="Not Started"');
        $updateMatch->execute([$matchId]);
        
        json_response(['setId' => $setId, 'created' => true], 201);
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// GET /v1/team-matches/:id - Get team match details
// Allow read-only access without authentication (for match restoration from URL)
// Match code or event code still required for editing operations (POST/PATCH)
if (preg_match('#^/v1/team-matches/([0-9a-f-]+)$#i', $route, $m) && $method === 'GET') {
    // No authentication required for read-only GET requests
    // This allows match restoration from URL parameters
    $matchId = $m[1];
    
    try {
        $pdo = db();
        
        // Get match details
        $matchStmt = $pdo->prepare('SELECT * FROM team_matches WHERE id=?');
        $matchStmt->execute([$matchId]);
        $match = $matchStmt->fetch();
        
        if (!$match) {
            json_response(['error' => 'Match not found'], 404);
            exit;
        }
        
        // Get teams
        $teamsStmt = $pdo->prepare('SELECT * FROM team_match_teams WHERE match_id=? ORDER BY position');
        $teamsStmt->execute([$matchId]);
        $teams = $teamsStmt->fetchAll();
        
        // Get archers and sets for each team
        foreach ($teams as &$team) {
            $archersStmt = $pdo->prepare('SELECT * FROM team_match_archers WHERE team_id=? ORDER BY position');
            $archersStmt->execute([$team['id']]);
            $archers = $archersStmt->fetchAll();
            
            foreach ($archers as &$archer) {
                $setsStmt = $pdo->prepare('SELECT * FROM team_match_sets WHERE match_archer_id=? ORDER BY set_number');
                $setsStmt->execute([$archer['id']]);
                $archer['sets'] = $setsStmt->fetchAll();
            }
            
            $team['archers'] = $archers;
        }
        
        $match['teams'] = $teams;
        json_response(['match' => $match], 200);
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// POST /v1/team-matches/:id/verify - Lock/Unlock/Void match
if (preg_match('#^/v1/team-matches/([0-9a-f-]+)/verify$#i', $route, $m) && $method === 'POST') {
    require_api_key();
    $matchId = $m[1];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = trim($input['action'] ?? '');
    $verifiedBy = trim($input['verifiedBy'] ?? '');
    $notes = trim($input['notes'] ?? '');

    if (empty($action)) {
        json_response(['error' => 'Action is required (lock, unlock, or void)'], 400);
        exit;
    }

    try {
        $pdo = db();
        $result = process_team_match_verification($pdo, $matchId, $action, $verifiedBy, $notes);
        json_response([
            'matchId' => $result['id'],
            'eventId' => $result['event_id'],
            'status' => $result['status'],
            'locked' => (bool)$result['locked'],
            'cardStatus' => $result['card_status'],
            'verifiedBy' => $result['verified_by'],
            'verifiedAt' => $result['verified_at'],
            'notes' => $result['notes'],
            'history' => $result['lock_history']
        ]);
    } catch (Exception $e) {
        $status = (int)$e->getCode();
        if ($status < 100 || $status > 599) $status = 400;
        json_response(['error' => $e->getMessage()], $status);
    }
    exit;
}

// PATCH /v1/team-matches/:id - Update match (winner, status, verification)
// NOTE: Direct locking via PATCH is deprecated. Use POST /v1/team-matches/:id/verify instead.
if (preg_match('#^/v1/team-matches/([0-9a-f-]+)$#i', $route, $m) && $method === 'PATCH') {
    require_api_key();
    $matchId = $m[1];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    try {
        $pdo = db();
        
        $updates = [];
        $params = [];
        
        if (isset($input['status'])) {
            $updates[] = 'status=?';
            $params[] = $input['status'];
        }
        if (isset($input['winnerTeamId'])) {
            $updates[] = 'winner_team_id=?';
            $params[] = $input['winnerTeamId'];
        }
        if (isset($input['shootOff'])) {
            $updates[] = 'shoot_off=?';
            $params[] = $input['shootOff'] ? 1 : 0;
        }
        // Deprecated: Direct locking via PATCH. Use POST /v1/team-matches/:id/verify instead.
        // Keeping for backward compatibility but adding warning.
        if (isset($input['locked']) || isset($input['cardStatus'])) {
            if (isset($input['locked'])) {
                $updates[] = 'locked=?';
                $params[] = $input['locked'] ? 1 : 0;
            }
            if (isset($input['cardStatus'])) {
                $updates[] = 'card_status=?';
                $params[] = $input['cardStatus'];
            }
        }
        if (isset($input['notes'])) {
            $updates[] = 'notes=?';
            $params[] = $input['notes'];
        }
        
        if (empty($updates)) {
            json_response(['error' => 'No fields to update'], 400);
            exit;
        }
        
        $updates[] = 'updated_at=NOW()';
        $params[] = $matchId;
        
        $sql = 'UPDATE team_matches SET ' . implode(', ', $updates) . ' WHERE id=?';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        json_response(['message' => 'Match updated successfully'], 200);
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// =====================================================
// PHASE 2 ENHANCEMENT: BRACKET MANAGEMENT ENDPOINTS
// =====================================================

// Helper function: Get archer initials (first letter of first and last name)
function get_archer_initials(string $firstName, string $lastName): string {
    $first = strtoupper(substr(trim($firstName), 0, 1));
    $last = strtoupper(substr(trim($lastName), 0, 1));
    return $first . $last;
}

// Helper function: Get school abbreviation (first 2 letters, uppercase)
function get_school_abbrev(string $school): string {
    return strtoupper(substr(trim($school), 0, 2));
}

// Helper function: Generate bracket match ID for elimination
// Format: {DIVISION}{ROUND}{MATCH}-{ARCHER1_INITIALS}-{ARCHER2_INITIALS}
// Example: BVARQ1-TC-AG (Boys Varsity, Quarter Final 1, Trenton Cowles vs Alex Gilliam)
function generate_elimination_match_id(PDO $pdo, string $bracketId, string $round, int $matchNumber, string $archer1Id, string $archer2Id): string {
    // Get bracket division
    $bracketStmt = $pdo->prepare('SELECT division, bracket_type FROM brackets WHERE id = ?');
    $bracketStmt->execute([$bracketId]);
    $bracket = $bracketStmt->fetch(PDO::FETCH_ASSOC);
    if (!$bracket) {
        throw new Exception('Bracket not found', 404);
    }
    
    $division = $bracket['division'];
    $type = $bracket['bracket_type'];
    
    // Round codes: Q = Quarter, S = Semi, F = Final, B = Bronze
    $roundCode = '';
    if ($round === 'quarter') $roundCode = 'Q';
    elseif ($round === 'semi') $roundCode = 'S';
    elseif ($round === 'final') $roundCode = 'F';
    elseif ($round === 'bronze') $roundCode = 'B';
    
    // For teams, add 'T' after division
    $prefix = $type === 'TEAM' ? $division . 'TA' : $division;
    
    // Get archer/team names for initials
    if ($type === 'SOLO') {
        $archer1Stmt = $pdo->prepare('SELECT first_name, last_name FROM archers WHERE id = ?');
        $archer1Stmt->execute([$archer1Id]);
        $archer1 = $archer1Stmt->fetch(PDO::FETCH_ASSOC);
        
        $archer2Stmt = $pdo->prepare('SELECT first_name, last_name FROM archers WHERE id = ?');
        $archer2Stmt->execute([$archer2Id]);
        $archer2 = $archer2Stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$archer1 || !$archer2) {
            throw new Exception('Archers not found', 404);
        }
        
        $initials1 = get_archer_initials($archer1['first_name'], $archer1['last_name']);
        $initials2 = get_archer_initials($archer2['first_name'], $archer2['last_name']);
    } else {
        // For teams, use school abbreviations
        $team1Stmt = $pdo->prepare('SELECT DISTINCT school FROM team_match_teams tmt JOIN team_matches tm ON tm.id = tmt.match_id WHERE tm.id IN (SELECT match_id FROM team_match_archers WHERE archer_id = ?) LIMIT 1');
        $team1Stmt->execute([$archer1Id]);
        $team1 = $team1Stmt->fetch(PDO::FETCH_ASSOC);
        
        $team2Stmt = $pdo->prepare('SELECT DISTINCT school FROM team_match_teams tmt JOIN team_matches tm ON tm.id = tmt.match_id WHERE tm.id IN (SELECT match_id FROM team_match_archers WHERE archer_id = ?) LIMIT 1');
        $team2Stmt->execute([$archer2Id]);
        $team2 = $team2Stmt->fetch(PDO::FETCH_ASSOC);
        
        $initials1 = $team1 ? get_school_abbrev($team1['school']) : 'T1';
        $initials2 = $team2 ? get_school_abbrev($team2['school']) : 'T2';
    }
    
    return $prefix . $roundCode . $matchNumber . '-' . $initials1 . '-' . $initials2;
}

// POST /v1/events/:id/brackets - Create bracket
if (preg_match('#^/v1/events/([0-9a-f-]+)/brackets$#i', $route, $m) && $method === 'POST') {
    require_api_key();
    $eventId = $m[1];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    $bracketType = strtoupper($input['bracketType'] ?? '');
    $bracketFormat = strtoupper($input['bracketFormat'] ?? '');
    $division = $input['division'] ?? '';
    $bracketSize = (int)($input['bracketSize'] ?? 8);
    $createdBy = trim($input['createdBy'] ?? 'Coach');
    
    if (!in_array($bracketType, ['SOLO', 'TEAM'], true)) {
        json_response(['error' => 'bracketType must be SOLO or TEAM'], 400);
        exit;
    }
    
    if (!in_array($bracketFormat, ['ELIMINATION', 'SWISS'], true)) {
        json_response(['error' => 'bracketFormat must be ELIMINATION or SWISS'], 400);
        exit;
    }
    
    if (empty($division)) {
        json_response(['error' => 'division is required'], 400);
        exit;
    }
    
    // For elimination, bracket size must be 8
    if ($bracketFormat === 'ELIMINATION' && $bracketSize !== 8) {
        $bracketSize = 8;
    }
    
    try {
        $pdo = db();
        
        // Verify event exists
        $eventStmt = $pdo->prepare('SELECT id FROM events WHERE id = ?');
        $eventStmt->execute([$eventId]);
        if (!$eventStmt->fetch()) {
            json_response(['error' => 'Event not found'], 404);
            exit;
        }
        
        $bracketId = $genUuid();
        $stmt = $pdo->prepare('
            INSERT INTO brackets (id, event_id, bracket_type, bracket_format, division, bracket_size, status, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([$bracketId, $eventId, $bracketType, $bracketFormat, $division, $bracketSize, 'OPEN', $createdBy]);
        
        json_response([
            'bracketId' => $bracketId,
            'eventId' => $eventId,
            'bracketType' => $bracketType,
            'bracketFormat' => $bracketFormat,
            'division' => $division,
            'bracketSize' => $bracketSize,
            'status' => 'OPEN'
        ], 201);
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// GET /v1/events/:id/brackets - List all brackets for event
// Public endpoint - archers need to see brackets for their events
if (preg_match('#^/v1/events/([0-9a-f-]+)/brackets$#i', $route, $m) && $method === 'GET') {
    // No auth required - brackets are public info
    $eventId = $m[1];
    
    try {
        $pdo = db();
        $stmt = $pdo->prepare('
            SELECT 
                b.id,
                b.event_id,
                b.bracket_type,
                b.bracket_format,
                b.division,
                b.bracket_size,
                b.status,
                b.created_at,
                b.created_by,
                COUNT(be.id) as entry_count
            FROM brackets b
            LEFT JOIN bracket_entries be ON be.bracket_id = b.id
            WHERE b.event_id = ?
            GROUP BY b.id, b.event_id, b.bracket_type, b.bracket_format, b.division, b.bracket_size, b.status, b.created_at, b.created_by
            ORDER BY b.bracket_type, b.division, b.created_at
        ');
        $stmt->execute([$eventId]);
        $brackets = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        json_response(['brackets' => $brackets], 200);
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// GET /v1/brackets/:id - Get bracket details
if (preg_match('#^/v1/brackets/([0-9a-f-]+)$#i', $route, $m) && $method === 'GET') {
    require_api_key();
    $bracketId = $m[1];
    
    try {
        $pdo = db();
        $stmt = $pdo->prepare('
            SELECT 
                b.*,
                COUNT(be.id) as entry_count
            FROM brackets b
            LEFT JOIN bracket_entries be ON be.bracket_id = b.id
            WHERE b.id = ?
            GROUP BY b.id
        ');
        $stmt->execute([$bracketId]);
        $bracket = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$bracket) {
            json_response(['error' => 'Bracket not found'], 404);
            exit;
        }
        
        json_response(['bracket' => $bracket], 200);
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// PATCH /v1/brackets/:id - Update bracket
if (preg_match('#^/v1/brackets/([0-9a-f-]+)$#i', $route, $m) && $method === 'PATCH') {
    require_api_key();
    $bracketId = $m[1];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    try {
        $pdo = db();
        
        $updates = [];
        $params = [];
        
        if (isset($input['status'])) {
            $updates[] = 'status=?';
            $params[] = $input['status'];
        }
        if (isset($input['bracketSize'])) {
            $updates[] = 'bracket_size=?';
            $params[] = (int)$input['bracketSize'];
        }
        
        if (empty($updates)) {
            json_response(['error' => 'No fields to update'], 400);
            exit;
        }
        
        $updates[] = 'updated_at=NOW()';
        $params[] = $bracketId;
        
        $sql = 'UPDATE brackets SET ' . implode(', ', $updates) . ' WHERE id=?';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        json_response(['message' => 'Bracket updated successfully'], 200);
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// DELETE /v1/brackets/:id - Delete bracket
if (preg_match('#^/v1/brackets/([0-9a-f-]+)$#i', $route, $m) && $method === 'DELETE') {
    require_api_key();
    $bracketId = $m[1];
    
    try {
        $pdo = db();
        
        // Verify bracket exists
        $checkStmt = $pdo->prepare('SELECT id FROM brackets WHERE id = ?');
        $checkStmt->execute([$bracketId]);
        if (!$checkStmt->fetch()) {
            json_response(['error' => 'Bracket not found'], 404);
            exit;
        }
        
        // Delete bracket (cascade will delete entries)
        $stmt = $pdo->prepare('DELETE FROM brackets WHERE id = ?');
        $stmt->execute([$bracketId]);
        
        json_response(['message' => 'Bracket deleted successfully'], 200);
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// POST /v1/brackets/:id/entries - Add archer/team to bracket
if (preg_match('#^/v1/brackets/([0-9a-f-]+)/entries$#i', $route, $m) && $method === 'POST') {
    require_api_key();
    $bracketId = $m[1];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    $entryType = strtoupper($input['entryType'] ?? '');
    $archerId = $input['archerId'] ?? null;
    $schoolId = $input['schoolId'] ?? null;
    $seedPosition = isset($input['seedPosition']) ? (int)$input['seedPosition'] : null;
    
    if (!in_array($entryType, ['ARCHER', 'TEAM'], true)) {
        json_response(['error' => 'entryType must be ARCHER or TEAM'], 400);
        exit;
    }
    
    if ($entryType === 'ARCHER' && !$archerId) {
        json_response(['error' => 'archerId is required for ARCHER entry type'], 400);
        exit;
    }
    
    if ($entryType === 'TEAM' && !$schoolId) {
        json_response(['error' => 'schoolId is required for TEAM entry type'], 400);
        exit;
    }
    
    try {
        $pdo = db();
        
        // Verify bracket exists
        $bracketStmt = $pdo->prepare('SELECT id, bracket_type, bracket_format FROM brackets WHERE id = ?');
        $bracketStmt->execute([$bracketId]);
        $bracket = $bracketStmt->fetch(PDO::FETCH_ASSOC);
        if (!$bracket) {
            json_response(['error' => 'Bracket not found'], 404);
            exit;
        }
        
        // Verify entry type matches bracket type
        $expectedType = $bracket['bracket_type'] === 'SOLO' ? 'ARCHER' : 'TEAM';
        if ($entryType !== $expectedType) {
            json_response(['error' => "Entry type must be {$expectedType} for this bracket"], 400);
            exit;
        }
        
        // Check if entry already exists
        if ($entryType === 'ARCHER') {
            $checkStmt = $pdo->prepare('SELECT id FROM bracket_entries WHERE bracket_id = ? AND archer_id = ?');
            $checkStmt->execute([$bracketId, $archerId]);
        } else {
            $checkStmt = $pdo->prepare('SELECT id FROM bracket_entries WHERE bracket_id = ? AND school_id = ?');
            $checkStmt->execute([$bracketId, $schoolId]);
        }
        
        if ($checkStmt->fetch()) {
            json_response(['error' => 'Entry already exists in bracket'], 409);
            exit;
        }
        
        $entryId = $genUuid();
        $stmt = $pdo->prepare('
            INSERT INTO bracket_entries (id, bracket_id, entry_type, archer_id, school_id, seed_position)
            VALUES (?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([$entryId, $bracketId, $entryType, $archerId, $schoolId, $seedPosition]);
        
        json_response([
            'entryId' => $entryId,
            'bracketId' => $bracketId,
            'entryType' => $entryType
        ], 201);
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// GET /v1/brackets/:id/archer-assignment/:archerId - Get archer's assigned match in elimination bracket
// Also supports name-based lookup: /v1/brackets/:id/archer-assignment/by-name/:firstName/:lastName
// NOTE: This must come BEFORE the UUID-based route to match correctly
if (preg_match('#^/v1/brackets/([0-9a-f-]+)/archer-assignment/by-name/(.+?)/(.+?)$#i', $route, $matches) && $method === 'GET') {
    // Public endpoint - name-based lookup
    $bracketId = $matches[1];
    $firstName = urldecode($matches[2]);
    $lastName = urldecode($matches[3]);
    
    try {
        $pdo = db();
        
        // Find archer by name
        $archerStmt = $pdo->prepare('SELECT id FROM archers WHERE LOWER(first_name) = LOWER(?) AND LOWER(last_name) = LOWER(?) LIMIT 1');
        $archerStmt->execute([$firstName, $lastName]);
        $archer = $archerStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$archer) {
            json_response(['error' => 'Archer not found'], 404);
            exit;
        }
        
        $archerId = $archer['id'];
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
        exit;
    }
} elseif (preg_match('#^/v1/brackets/([0-9a-f-]+)/archer-assignment/([0-9a-f-]+)$#i', $route, $m) && $method === 'GET') {
    // Public endpoint - UUID-based lookup
    $bracketId = $m[1];
    $archerId = $m[2];
    
    try {
        $pdo = db();
        
        // Get bracket info
        $bracketStmt = $pdo->prepare('SELECT * FROM brackets WHERE id = ?');
        $bracketStmt->execute([$bracketId]);
        $bracket = $bracketStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$bracket) {
            json_response(['error' => 'Bracket not found'], 404);
            exit;
        }
        
        // Get archer's entry in bracket
        $entryStmt = $pdo->prepare('SELECT * FROM bracket_entries WHERE bracket_id = ? AND archer_id = ?');
        $entryStmt->execute([$bracketId, $archerId]);
        $entry = $entryStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$entry) {
            json_response(['error' => 'Archer not in this bracket'], 404);
            exit;
        }
        
        $seed = $entry['seed_position'];
        
        // For elimination brackets, calculate opponent based on bracket structure
        if ($bracket['bracket_format'] === 'ELIMINATION') {
            // Standard 8-person elimination bracket structure:
            // Q1: Seed 1 vs Seed 8
            // Q2: Seed 2 vs Seed 7
            // Q3: Seed 3 vs Seed 6
            // Q4: Seed 4 vs Seed 5
            
            $quarterFinalMatch = null;
            $opponentSeed = null;
            
            if ($seed === 1) {
                $quarterFinalMatch = 1;
                $opponentSeed = 8;
            } elseif ($seed === 2) {
                $quarterFinalMatch = 2;
                $opponentSeed = 7;
            } elseif ($seed === 3) {
                $quarterFinalMatch = 3;
                $opponentSeed = 6;
            } elseif ($seed === 4) {
                $quarterFinalMatch = 4;
                $opponentSeed = 5;
            } elseif ($seed === 5) {
                $quarterFinalMatch = 4;
                $opponentSeed = 4;
            } elseif ($seed === 6) {
                $quarterFinalMatch = 3;
                $opponentSeed = 3;
            } elseif ($seed === 7) {
                $quarterFinalMatch = 2;
                $opponentSeed = 2;
            } elseif ($seed === 8) {
                $quarterFinalMatch = 1;
                $opponentSeed = 1;
            }
            
            // Get opponent info
            $opponentEntry = null;
            if ($opponentSeed) {
                $oppStmt = $pdo->prepare('
                    SELECT be.*, a.first_name, a.last_name
                    FROM bracket_entries be
                    JOIN archers a ON a.id = be.archer_id
                    WHERE be.bracket_id = ? AND be.seed_position = ?
                ');
                $oppStmt->execute([$bracketId, $opponentSeed]);
                $opponentEntry = $oppStmt->fetch(PDO::FETCH_ASSOC);
            }
            
            // Check if match already exists
            $matchStmt = $pdo->prepare('
                SELECT sm.id, sm.bracket_match_id, sm.status
                FROM solo_matches sm
                WHERE sm.bracket_id = ? 
                  AND sm.bracket_match_id LIKE ?
            ');
            $matchPattern = $bracket['division'] . 'Q' . $quarterFinalMatch . '%';
            $matchStmt->execute([$bracketId, $matchPattern]);
            $existingMatch = $matchStmt->fetch(PDO::FETCH_ASSOC);
            
            // Generate match ID
            $matchId = $bracket['division'] . 'Q' . $quarterFinalMatch;
            
            json_response([
                'bracket' => [
                    'id' => $bracket['id'],
                    'division' => $bracket['division'],
                    'format' => $bracket['bracket_format']
                ],
                'archer' => [
                    'id' => $archerId,
                    'seed' => $seed
                ],
                'assignment' => [
                    'round' => 'quarterfinals',
                    'match_number' => $quarterFinalMatch,
                    'match_id' => $matchId,
                    'opponent' => $opponentEntry ? [
                        'id' => $opponentEntry['archer_id'],
                        'name' => trim($opponentEntry['first_name'] . ' ' . $opponentEntry['last_name']),
                        'seed' => $opponentEntry['seed_position']
                    ] : null,
                    'existing_match' => $existingMatch ? [
                        'id' => $existingMatch['id'],
                        'bracket_match_id' => $existingMatch['bracket_match_id'],
                        'status' => $existingMatch['status']
                    ] : null
                ]
            ], 200);
        } else {
            // Swiss bracket - no pre-assignment
            json_response([
                'bracket' => [
                    'id' => $bracket['id'],
                    'division' => $bracket['division'],
                    'format' => $bracket['bracket_format']
                ],
                'archer' => [
                    'id' => $archerId,
                    'seed' => null
                ],
                'assignment' => [
                    'round' => null,
                    'match_number' => null,
                    'match_id' => null,
                    'opponent' => null,
                    'message' => 'Swiss bracket - select any opponent'
                ]
            ], 200);
        }
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// GET /v1/archers/:id/bracket-assignments - Get all bracket assignments for an archer (efficient single query)
// This replaces the need to check each bracket individually, avoiding 404 noise
if (preg_match('#^/v1/archers/([0-9a-f-]+)/bracket-assignments$#i', $route, $m) && $method === 'GET') {
    // Public endpoint - archers can see their own bracket assignments
    $archerId = $m[1];
    
    try {
        $pdo = db();
        
        // Verify archer exists
        $archerStmt = $pdo->prepare('SELECT id, first_name, last_name FROM archers WHERE id = ?');
        $archerStmt->execute([$archerId]);
        $archer = $archerStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$archer) {
            json_response(['error' => 'Archer not found'], 404);
            exit;
        }
        
        // Get all bracket entries for this archer with bracket and event info
        $stmt = $pdo->prepare('
            SELECT 
                be.id as entry_id,
                be.seed_position,
                be.swiss_points,
                be.swiss_wins,
                be.swiss_losses,
                b.id as bracket_id,
                b.event_id,
                b.bracket_type,
                b.bracket_format,
                b.division,
                b.bracket_size,
                b.status as bracket_status,
                e.name as event_name,
                e.date as event_date,
                e.status as event_status
            FROM bracket_entries be
            JOIN brackets b ON b.id = be.bracket_id
            LEFT JOIN events e ON e.id = b.event_id
            WHERE be.archer_id = ?
            ORDER BY e.date DESC, b.created_at DESC
        ');
        $stmt->execute([$archerId]);
        $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // For each entry, calculate opponent info if it's an elimination bracket
        $assignments = [];
        foreach ($entries as $entry) {
            $assignment = [
                'entry_id' => $entry['entry_id'],
                'bracket_id' => $entry['bracket_id'],
                'event_id' => $entry['event_id'],
                'event_name' => $entry['event_name'],
                'event_date' => $entry['event_date'],
                'event_status' => $entry['event_status'],
                'bracket_type' => $entry['bracket_type'],
                'bracket_format' => $entry['bracket_format'],
                'division' => $entry['division'],
                'bracket_size' => $entry['bracket_size'],
                'bracket_status' => $entry['bracket_status'],
                'seed' => $entry['seed_position'],
                'swiss_points' => $entry['swiss_points'],
                'swiss_wins' => $entry['swiss_wins'],
                'swiss_losses' => $entry['swiss_losses'],
                'opponent' => null,
                'round' => null,
                'match_id' => null
            ];
            
            // Calculate opponent for elimination brackets
            if ($entry['bracket_format'] === 'ELIMINATION') {
                $seed = $entry['seed_position'];
                $opponentSeed = null;
                $round = 'Quarter-Finals';
                
                // Standard 8-person bracket pairings
                if ($seed === 1) { $opponentSeed = 8; }
                elseif ($seed === 2) { $opponentSeed = 7; }
                elseif ($seed === 3) { $opponentSeed = 6; }
                elseif ($seed === 4) { $opponentSeed = 5; }
                elseif ($seed === 5) { $opponentSeed = 4; }
                elseif ($seed === 6) { $opponentSeed = 3; }
                elseif ($seed === 7) { $opponentSeed = 2; }
                elseif ($seed === 8) { $opponentSeed = 1; }
                
                if ($opponentSeed) {
                    // Get opponent info
                    $oppStmt = $pdo->prepare('
                        SELECT be.seed_position, a.id, a.first_name, a.last_name
                        FROM bracket_entries be
                        JOIN archers a ON a.id = be.archer_id
                        WHERE be.bracket_id = ? AND be.seed_position = ?
                    ');
                    $oppStmt->execute([$entry['bracket_id'], $opponentSeed]);
                    $opponent = $oppStmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($opponent) {
                        $assignment['opponent'] = [
                            'id' => $opponent['id'],
                            'name' => $opponent['first_name'] . ' ' . $opponent['last_name'],
                            'seed' => $opponent['seed_position']
                        ];
                        $assignment['round'] = $round;
                    }
                }
            }
            
            $assignments[] = $assignment;
        }
        
        json_response([
            'archer' => [
                'id' => $archer['id'],
                'name' => $archer['first_name'] . ' ' . $archer['last_name']
            ],
            'assignments' => $assignments
        ], 200);
        
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// GET /v1/brackets/:id/entries - List bracket entries
if (preg_match('#^/v1/brackets/([0-9a-f-]+)/entries$#i', $route, $m) && $method === 'GET') {
    require_api_key();
    $bracketId = $m[1];
    
    try {
        $pdo = db();
        
        // Get entries with archer/team details
        $stmt = $pdo->prepare('
            SELECT 
                be.id,
                be.bracket_id,
                be.entry_type,
                be.archer_id,
                be.school_id,
                be.seed_position,
                be.swiss_wins,
                be.swiss_losses,
                be.swiss_points,
                be.created_at,
                a.first_name,
                a.last_name,
                a.school as archer_school
            FROM bracket_entries be
            LEFT JOIN archers a ON a.id = be.archer_id
            WHERE be.bracket_id = ?
            ORDER BY be.seed_position ASC, be.swiss_points DESC, be.swiss_wins DESC
        ');
        $stmt->execute([$bracketId]);
        $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        json_response(['entries' => $entries], 200);
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// DELETE /v1/brackets/:id/entries/:entryId - Remove entry from bracket
if (preg_match('#^/v1/brackets/([0-9a-f-]+)/entries/([0-9a-f-]+)$#i', $route, $m) && $method === 'DELETE') {
    require_api_key();
    $bracketId = $m[1];
    $entryId = $m[2];
    
    try {
        $pdo = db();
        
        // Verify entry exists and belongs to bracket
        $checkStmt = $pdo->prepare('SELECT id FROM bracket_entries WHERE id = ? AND bracket_id = ?');
        $checkStmt->execute([$entryId, $bracketId]);
        if (!$checkStmt->fetch()) {
            json_response(['error' => 'Entry not found'], 404);
            exit;
        }
        
        $stmt = $pdo->prepare('DELETE FROM bracket_entries WHERE id = ?');
        $stmt->execute([$entryId]);
        
        json_response(['message' => 'Entry removed successfully'], 200);
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// POST /v1/brackets/:id/generate - Auto-generate elimination bracket from Top 8 ranking
if (preg_match('#^/v1/brackets/([0-9a-f-]+)/generate$#i', $route, $m) && $method === 'POST') {
    require_api_key();
    $bracketId = $m[1];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    
    try {
        $pdo = db();
        
        // Get bracket details
        $bracketStmt = $pdo->prepare('SELECT b.*, e.id as event_id FROM brackets b JOIN events e ON e.id = b.event_id WHERE b.id = ?');
        $bracketStmt->execute([$bracketId]);
        $bracket = $bracketStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$bracket) {
            json_response(['error' => 'Bracket not found'], 404);
            exit;
        }
        
        if ($bracket['bracket_format'] !== 'ELIMINATION') {
            json_response(['error' => 'Auto-generation only available for ELIMINATION brackets'], 400);
            exit;
        }
        
        // Get Top 8 archers/teams from ranking rounds for this division
        $division = $bracket['division'];
        $bracketType = $bracket['bracket_type'];
        
        if ($bracketType === 'SOLO') {
            // Get Top 8 archers from ranking rounds
            $rankingStmt = $pdo->prepare('
                SELECT 
                    ra.archer_id,
                    a.first_name,
                    a.last_name,
                    a.school,
                    SUM(ee.end_total) as total_score,
                    SUM(ee.tens) as total_10s,
                    SUM(ee.xs) as total_xs
                FROM round_archers ra
                JOIN rounds r ON r.id = ra.round_id
                JOIN events e ON e.id = r.event_id
                JOIN archers a ON a.id = ra.archer_id
                LEFT JOIN end_events ee ON ee.round_archer_id = ra.id
                WHERE e.id = ? 
                  AND r.division = ?
                  AND ra.card_status = "VER"
                  AND ra.locked = 1
                GROUP BY ra.archer_id, a.first_name, a.last_name, a.school
                ORDER BY total_score DESC, total_10s DESC, total_xs DESC
                LIMIT 8
            ');
            $rankingStmt->execute([$bracket['event_id'], $division]);
            $topArchers = $rankingStmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (count($topArchers) < 8) {
                json_response(['error' => 'Not enough verified ranking scores. Need 8 archers with verified scores.'], 400);
                exit;
            }
            
            // Add archers to bracket entries with seed positions
            $pdo->beginTransaction();
            try {
                foreach ($topArchers as $index => $archer) {
                    $seedPosition = $index + 1;
                    $entryId = $genUuid();
                    $entryStmt = $pdo->prepare('
                        INSERT INTO bracket_entries (id, bracket_id, entry_type, archer_id, seed_position)
                        VALUES (?, ?, "ARCHER", ?, ?)
                    ');
                    $entryStmt->execute([$entryId, $bracketId, $archer['archer_id'], $seedPosition]);
                }
                
                // Update bracket status
                $updateStmt = $pdo->prepare('UPDATE brackets SET status = "IN_PROGRESS" WHERE id = ?');
                $updateStmt->execute([$bracketId]);
                
                $pdo->commit();
                
                json_response([
                    'message' => 'Bracket generated successfully',
                    'entriesAdded' => count($topArchers),
                    'bracketId' => $bracketId
                ], 200);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
        } else {
            // TEAM bracket - get Top 8 schools
            // For now, use school from archers (simplified - will need team eligibility logic later)
            $teamStmt = $pdo->prepare('
                SELECT 
                    a.school,
                    SUM(ee.end_total) as total_score,
                    SUM(ee.tens) as total_10s,
                    SUM(ee.xs) as total_xs,
                    COUNT(DISTINCT ra.archer_id) as archer_count
                FROM round_archers ra
                JOIN rounds r ON r.id = ra.round_id
                JOIN events e ON e.id = r.event_id
                JOIN archers a ON a.id = ra.archer_id
                LEFT JOIN end_events ee ON ee.round_archer_id = ra.id
                WHERE e.id = ? 
                  AND r.division = ?
                  AND ra.card_status = "VER"
                  AND ra.locked = 1
                GROUP BY a.school
                HAVING archer_count >= 3
                ORDER BY total_score DESC, total_10s DESC, total_xs DESC
                LIMIT 8
            ');
            $teamStmt->execute([$bracket['event_id'], $division]);
            $topSchools = $teamStmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (count($topSchools) < 8) {
                json_response(['error' => 'Not enough schools with 3+ verified archers. Need 8 schools.'], 400);
                exit;
            }
            
            // Add schools to bracket entries
            $pdo->beginTransaction();
            try {
                foreach ($topSchools as $index => $school) {
                    $seedPosition = $index + 1;
                    $entryId = $genUuid();
                    // For teams, we use school as identifier (school_id will be NULL for now, using school name)
                    $entryStmt = $pdo->prepare('
                        INSERT INTO bracket_entries (id, bracket_id, entry_type, school_id, seed_position)
                        VALUES (?, ?, "TEAM", ?, ?)
                    ');
                    // Note: school_id is CHAR(36) but we're storing school code for now
                    // This may need adjustment based on actual school table structure
                    $entryStmt->execute([$entryId, $bracketId, $school['school'], $seedPosition]);
                }
                
                $updateStmt = $pdo->prepare('UPDATE brackets SET status = "IN_PROGRESS" WHERE id = ?');
                $updateStmt->execute([$bracketId]);
                
                $pdo->commit();
                
                json_response([
                    'message' => 'Team bracket generated successfully',
                    'entriesAdded' => count($topSchools),
                    'bracketId' => $bracketId
                ], 200);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
        }
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

// GET /v1/brackets/:id/results - Get bracket results for results module
// Public endpoint - bracket results should be viewable by anyone
if (preg_match('#^/v1/brackets/([0-9a-f-]+)/results$#i', $route, $m) && $method === 'GET') {
    // No auth required - bracket results are public
    $bracketId = $m[1];
    
    try {
        $pdo = db();
        
        // Get bracket info with event name
        $bracketStmt = $pdo->prepare('
            SELECT b.*, e.name as event_name
            FROM brackets b
            LEFT JOIN events e ON e.id = b.event_id
            WHERE b.id = ?
        ');
        $bracketStmt->execute([$bracketId]);
        $bracket = $bracketStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$bracket) {
            json_response(['error' => 'Bracket not found'], 404);
            exit;
        }
        
        $result = [
            'bracket' => $bracket,
            'qualification' => [],
            'rounds' => [
                'quarterfinals' => [],
                'semifinals' => [],
                'finals' => []
            ]
        ];
        
        // Helper function to enrich match with detailed set scores
        $enrichMatchWithSets = function($pdo, $match) {
            // Get archer details with sets
            $archersStmt = $pdo->prepare('
                SELECT sma.*, 
                       a.first_name, a.last_name, a.school as archer_school
                FROM solo_match_archers sma
                LEFT JOIN archers a ON a.id = sma.archer_id
                WHERE sma.match_id = ?
                ORDER BY sma.position
            ');
            $archersStmt->execute([$match['id']]);
            $archers = $archersStmt->fetchAll(PDO::FETCH_ASSOC);
            
            $enrichedArchers = [];
            foreach ($archers as $archer) {
                // Get sets for this archer
                $setsStmt = $pdo->prepare('
                    SELECT set_number, a1, a2, a3, set_total, set_points, tens, xs
                    FROM solo_match_sets
                    WHERE match_archer_id = ?
                    ORDER BY set_number
                ');
                $setsStmt->execute([$archer['id']]);
                $sets = $setsStmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Format sets for display
                $formattedSets = [];
                foreach ($sets as $set) {
                    if ($set['set_number'] <= 5) {
                        $formattedSets[] = [
                            'end' => $set['set_number'],
                            'score' => $set['set_total'],
                            'xs' => $set['xs'],
                            'set_points' => $set['set_points'],
                            'display' => $set['set_total'] . '(' . $set['xs'] . ')'
                        ];
                    }
                }
                
                // Get bracket entry for rank/seed
                $entryStmt = $pdo->prepare('
                    SELECT seed_position
                    FROM bracket_entries
                    WHERE bracket_id = ? AND archer_id = ?
                ');
                $entryStmt->execute([$match['bracket_id'], $archer['archer_id']]);
                $entry = $entryStmt->fetch(PDO::FETCH_ASSOC);
                
                $enrichedArchers[] = [
                    'id' => $archer['id'],
                    'archer_id' => $archer['archer_id'],
                    'position' => $archer['position'],
                    'name' => $archer['archer_name'],
                    'school' => $archer['school'] ?: $archer['archer_school'],
                    'seed' => $entry['seed_position'] ?? null,
                    'total_set_points' => $archer['cumulative_score'] ?? 0,
                    'sets' => $formattedSets
                ];
            }
            
            $match['archer1'] = $enrichedArchers[0] ?? null;
            $match['archer2'] = $enrichedArchers[1] ?? null;
            $match['winner_archer_id'] = $match['winner_archer_id'] ?? null;
            
            return $match;
        };
        
        // Get qualification ranking (Top 8 from ranking rounds)
        if ($bracket['bracket_type'] === 'SOLO') {
            $qualStmt = $pdo->prepare('
                SELECT 
                    ra.archer_id,
                    a.first_name,
                    a.last_name,
                    a.school,
                    SUM(ee.end_total) as total_score,
                    SUM(ee.tens) as total_10s,
                    SUM(ee.xs) as total_xs
                FROM round_archers ra
                JOIN rounds r ON r.id = ra.round_id
                JOIN events e ON e.id = r.event_id
                JOIN archers a ON a.id = ra.archer_id
                LEFT JOIN end_events ee ON ee.round_archer_id = ra.id
                WHERE e.id = ? 
                  AND r.division = ?
                  AND ra.card_status = "VER"
                  AND ra.locked = 1
                GROUP BY ra.archer_id, a.first_name, a.last_name, a.school
                ORDER BY total_score DESC, total_10s DESC, total_xs DESC
                LIMIT 8
            ');
            $qualStmt->execute([$bracket['event_id'], $bracket['division']]);
            $qualResults = $qualStmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($qualResults as $index => $row) {
                $result['qualification'][] = [
                    'rank' => $index + 1,
                    'archer_id' => $row['archer_id'],
                    'archer_name' => trim($row['first_name'] . ' ' . $row['last_name']),
                    'school' => $row['school'],
                    'total_score' => (int)$row['total_score'],
                    'total_10s' => (int)$row['total_10s'],
                    'total_xs' => (int)$row['total_xs']
                ];
            }
        }
        
        // Get matches for each round
        if ($bracket['bracket_format'] === 'ELIMINATION') {
            // Quarter Finals (Q1-Q4)
            $qStmt = $pdo->prepare('
                SELECT sm.*, sma1.archer_name as archer1_name, sma1.archer_id as archer1_id,
                       sma2.archer_name as archer2_name, sma2.archer_id as archer2_id
                FROM solo_matches sm
                JOIN solo_match_archers sma1 ON sma1.match_id = sm.id AND sma1.position = 1
                JOIN solo_match_archers sma2 ON sma2.match_id = sm.id AND sma2.position = 2
                WHERE sm.bracket_id = ? AND sm.bracket_match_id LIKE ?
                ORDER BY sm.bracket_match_id
            ');
            $qStmt->execute([$bracketId, $bracket['division'] . 'Q%']);
            $quarters = $qStmt->fetchAll(PDO::FETCH_ASSOC);
            $result['rounds']['quarterfinals'] = array_map(function($m) use ($pdo, $enrichMatchWithSets) {
                return $enrichMatchWithSets($pdo, $m);
            }, $quarters);
            
            // Semi Finals (S1-S2)
            $sStmt = $pdo->prepare('
                SELECT sm.*, sma1.archer_name as archer1_name, sma1.archer_id as archer1_id,
                       sma2.archer_name as archer2_name, sma2.archer_id as archer2_id
                FROM solo_matches sm
                JOIN solo_match_archers sma1 ON sma1.match_id = sm.id AND sma1.position = 1
                JOIN solo_match_archers sma2 ON sma2.match_id = sm.id AND sma2.position = 2
                WHERE sm.bracket_id = ? AND sm.bracket_match_id LIKE ?
                ORDER BY sm.bracket_match_id
            ');
            $sStmt->execute([$bracketId, $bracket['division'] . 'S%']);
            $semis = $sStmt->fetchAll(PDO::FETCH_ASSOC);
            $result['rounds']['semifinals'] = array_map(function($m) use ($pdo, $enrichMatchWithSets) {
                return $enrichMatchWithSets($pdo, $m);
            }, $semis);
            
            // Finals (F1, B1)
            $fStmt = $pdo->prepare('
                SELECT sm.*, sma1.archer_name as archer1_name, sma1.archer_id as archer1_id,
                       sma2.archer_name as archer2_name, sma2.archer_id as archer2_id
                FROM solo_matches sm
                JOIN solo_match_archers sma1 ON sma1.match_id = sm.id AND sma1.position = 1
                JOIN solo_match_archers sma2 ON sma2.match_id = sm.id AND sma2.position = 2
                WHERE sm.bracket_id = ? AND (sm.bracket_match_id LIKE ? OR sm.bracket_match_id LIKE ?)
                ORDER BY sm.bracket_match_id
            ');
            $fStmt->execute([$bracketId, $bracket['division'] . 'F%', $bracket['division'] . 'B%']);
            $finals = $fStmt->fetchAll(PDO::FETCH_ASSOC);
            $result['rounds']['finals'] = array_map(function($m) use ($pdo, $enrichMatchWithSets) {
                return $enrichMatchWithSets($pdo, $m);
            }, $finals);
        } else {
            // Swiss format - return all matches
            $swissStmt = $pdo->prepare('
                SELECT sm.*, sma1.archer_name as archer1_name, sma1.archer_id as archer1_id,
                       sma2.archer_name as archer2_name, sma2.archer_id as archer2_id
                FROM solo_matches sm
                JOIN solo_match_archers sma1 ON sma1.match_id = sm.id AND sma1.position = 1
                JOIN solo_match_archers sma2 ON sma2.match_id = sm.id AND sma2.position = 2
                WHERE sm.bracket_id = ?
                ORDER BY sm.created_at
            ');
            $swissStmt->execute([$bracketId]);
            $swissMatches = $swissStmt->fetchAll(PDO::FETCH_ASSOC);
            $result['rounds']['swiss'] = array_map(function($m) use ($pdo, $enrichMatchWithSets) {
                return $enrichMatchWithSets($pdo, $m);
            }, $swissMatches);
            
            // Build Swiss leaderboard from bracket_entries
            $leaderboardStmt = $pdo->prepare('
                SELECT be.*, a.first_name, a.last_name, a.school
                FROM bracket_entries be
                LEFT JOIN archers a ON a.id = be.archer_id
                WHERE be.bracket_id = ? AND be.entry_type = "ARCHER"
                ORDER BY be.swiss_points DESC, be.swiss_wins DESC, be.swiss_losses ASC
            ');
            $leaderboardStmt->execute([$bracketId]);
            $leaderboard = $leaderboardStmt->fetchAll(PDO::FETCH_ASSOC);
            $result['leaderboard'] = array_map(function($entry, $index) {
                return [
                    'rank' => $index + 1,
                    'archer_id' => $entry['archer_id'],
                    'archer_name' => trim(($entry['first_name'] ?? '') . ' ' . ($entry['last_name'] ?? '')),
                    'school' => $entry['school'],
                    'wins' => $entry['swiss_wins'],
                    'losses' => $entry['swiss_losses'],
                    'points' => $entry['swiss_points'],
                    'record' => $entry['swiss_wins'] . '-' . $entry['swiss_losses']
                ];
            }, $leaderboard, array_keys($leaderboard));
        }
        
        json_response($result, 200);
    } catch (Exception $e) {
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}

json_response(['error' => 'Not Found', 'route' => $route], 404);
