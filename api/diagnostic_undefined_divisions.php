<?php
/**
 * Diagnostic Endpoint: Check for "Undefined" Division Issue
 * 
 * Secured with passcode authentication
 * 
 * Usage:
 *   curl "https://tryentist.com/wdv/api/diagnostic_undefined_divisions.php?passcode=wdva26"
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/config.php';

// Check passcode
$passcode = $_GET['passcode'] ?? '';
$authorized = false;

if (strlen($passcode) > 0 && strtolower($passcode) === strtolower(PASSCODE)) {
    $authorized = true;
}

// Also check X-Passcode header
if (!$authorized) {
    $headerPasscode = $_SERVER['HTTP_X_PASSCODE'] ?? '';
    if (strlen($headerPasscode) > 0 && strtolower($headerPasscode) === strtolower(PASSCODE)) {
        $authorized = true;
    }
}

if (!$authorized) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Unauthorized - valid passcode required']);
    exit;
}

try {
    $pdo = db();
    $results = [];
    
    // Part 1: Rounds with NULL/empty division
    $query1 = "
        SELECT 
            r.id as round_id,
            r.division,
            r.round_type,
            r.event_id,
            e.name as event_name,
            e.date as event_date,
            COUNT(DISTINCT ra.id) as archer_count,
            COUNT(DISTINCT ee.id) as score_count
        FROM rounds r
        LEFT JOIN events e ON e.id = r.event_id
        LEFT JOIN round_archers ra ON ra.round_id = r.id
        LEFT JOIN end_events ee ON ee.round_id = r.id
        WHERE (r.division IS NULL OR r.division = '' OR r.division = 'Undefined')
        GROUP BY r.id, r.division, r.round_type, r.event_id, e.name, e.date
        ORDER BY e.date DESC, r.created_at DESC
    ";
    $stmt1 = $pdo->query($query1);
    $results['undefined_rounds'] = $stmt1->fetchAll();
    
    // Part 2: Archers in undefined rounds
    $query2 = "
        SELECT 
            ra.id as round_archer_id,
            ra.archer_name,
            ra.school,
            ra.level,
            ra.gender,
            ra.bale_number,
            ra.target_assignment,
            r.id as round_id,
            r.division as round_division,
            e.id as event_id,
            e.name as event_name,
            COUNT(DISTINCT ee.id) as ends_scored,
            MAX(ee.running_total) as highest_running_total
        FROM round_archers ra
        JOIN rounds r ON r.id = ra.round_id
        LEFT JOIN events e ON e.id = r.event_id
        LEFT JOIN end_events ee ON ee.round_archer_id = ra.id
        WHERE (r.division IS NULL OR r.division = '' OR r.division = 'Undefined')
        GROUP BY ra.id, ra.archer_name, ra.school, ra.level, ra.gender, ra.bale_number, 
                 ra.target_assignment, r.id, r.division, e.id, e.name
        ORDER BY e.date DESC, ra.bale_number, ra.archer_name
    ";
    $stmt2 = $pdo->query($query2);
    $results['undefined_archers'] = $stmt2->fetchAll();
    
    // Part 3: Summary by event
    $query3 = "
        SELECT 
            e.id as event_id,
            e.name as event_name,
            e.date as event_date,
            COUNT(DISTINCT r.id) as undefined_rounds,
            COUNT(DISTINCT ra.id) as archers_in_undefined,
            COUNT(DISTINCT ee.id) as total_score_entries
        FROM events e
        JOIN rounds r ON r.event_id = e.id
        LEFT JOIN round_archers ra ON ra.round_id = r.id
        LEFT JOIN end_events ee ON ee.round_id = r.id
        WHERE (r.division IS NULL OR r.division = '' OR r.division = 'Undefined')
        GROUP BY e.id, e.name, e.date
        ORDER BY e.date DESC
    ";
    $stmt3 = $pdo->query($query3);
    $results['event_summary'] = $stmt3->fetchAll();
    
    // Part 4: Division comparison
    $query4 = "
        SELECT 
            e.id as event_id,
            e.name as event_name,
            COALESCE(r.division, 'NULL/Undefined') as division,
            COUNT(DISTINCT ra.id) as archer_count,
            COUNT(DISTINCT ee.id) as score_count
        FROM events e
        JOIN rounds r ON r.event_id = e.id
        LEFT JOIN round_archers ra ON ra.round_id = r.id
        LEFT JOIN end_events ee ON ee.round_id = r.id
        WHERE e.id IN (
            SELECT DISTINCT event_id 
            FROM rounds 
            WHERE (division IS NULL OR division = '' OR division = 'Undefined')
        )
        GROUP BY e.id, e.name, r.division
        ORDER BY e.date DESC, r.division
    ";
    $stmt4 = $pdo->query($query4);
    $results['division_comparison'] = $stmt4->fetchAll();
    
    // Summary stats
    $results['summary'] = [
        'total_undefined_rounds' => count($results['undefined_rounds']),
        'total_undefined_archers' => count($results['undefined_archers']),
        'events_affected' => count($results['event_summary']),
        'total_score_entries' => array_sum(array_column($results['undefined_rounds'], 'score_count'))
    ];
    
    header('Content-Type: application/json');
    echo json_encode($results, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Diagnostic failed',
        'message' => $e->getMessage()
    ]);
    error_log("Diagnostic query failed: " . $e->getMessage());
}

