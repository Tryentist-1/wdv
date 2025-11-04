<?php
/**
 * Admin Tool: Migrate a scorecard between rounds
 * This fixes the round ID contamination bug for Brandon Garcia
 * 
 * Access: https://tryentist.com/wdv/api/admin_migrate_scorecard.php?key=wdva26
 */

header('Content-Type: application/json');

// Security check
$adminKey = $_GET['key'] ?? '';
if ($adminKey !== 'wdva26') {
    http_response_code(403);
    echo json_encode(['error' => 'Access denied']);
    exit;
}

require_once __DIR__ . '/db.php';

try {
    $pdo = db();
    
    // Constants
    $brandon_uuid = '632012a7-2645-481c-99cb-fae78be0a72f';
    $test_event_round = '6318bd0f-ae5d-46ee-ab9c-9f9d276cc977';
    $tryout_round1_round = 'df29ec34-b9ac-4667-be49-86a118e4e73e';
    
    // Get the round_archer IDs
    $stmt = $pdo->prepare("
        SELECT ra.id 
        FROM round_archers ra
        WHERE ra.archer_id = ? AND ra.round_id = ?
        LIMIT 1
    ");
    
    $stmt->execute([$brandon_uuid, $test_event_round]);
    $test_event_ra = $stmt->fetch();
    $test_event_ra_id = $test_event_ra ? $test_event_ra['id'] : null;
    
    $stmt->execute([$brandon_uuid, $tryout_round1_round]);
    $tryout_round1_ra = $stmt->fetch();
    $tryout_round1_ra_id = $tryout_round1_ra ? $tryout_round1_ra['id'] : null;
    
    if (!$test_event_ra_id || !$tryout_round1_ra_id) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Could not find required round_archer records',
            'test_event_ra_id' => $test_event_ra_id,
            'tryout_round1_ra_id' => $tryout_round1_ra_id
        ]);
        exit;
    }
    
    // Count how many ends we're moving
    $stmt = $pdo->prepare("SELECT COUNT(*) as cnt FROM end_events WHERE round_archer_id = ?");
    $stmt->execute([$test_event_ra_id]);
    $end_count = $stmt->fetch()['cnt'];
    
    if ($end_count == 0) {
        echo json_encode([
            'success' => true,
            'message' => 'No migration needed - no end_events found in TEST EVENT',
            'end_count' => 0
        ]);
        exit;
    }
    
    // Perform the migration
    $stmt = $pdo->prepare("
        UPDATE end_events 
        SET round_archer_id = ? 
        WHERE round_archer_id = ?
    ");
    $stmt->execute([$tryout_round1_ra_id, $test_event_ra_id]);
    $migrated_count = $stmt->rowCount();
    
    // Verify the migration
    $stmt = $pdo->prepare("
        SELECT 
            ra.id as round_archer_id,
            r.id as round_id,
            r.division,
            e.name as event_name,
            (SELECT COUNT(*) FROM end_events WHERE round_archer_id = ra.id) as end_count,
            (SELECT MAX(running_total) FROM end_events WHERE round_archer_id = ra.id) as final_score
        FROM round_archers ra
        JOIN rounds r ON ra.round_id = r.id
        LEFT JOIN events e ON r.event_id = e.id
        WHERE ra.archer_id = ?
        ORDER BY e.date DESC
    ");
    $stmt->execute([$brandon_uuid]);
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'message' => "Migrated $migrated_count end_events from TEST EVENT to Tryout Round 1",
        'migrated_count' => $migrated_count,
        'end_count' => $end_count,
        'brandon_records' => $records
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Migration failed',
        'message' => $e->getMessage()
    ]);
}

