#!/usr/bin/env php
<?php
/**
 * Migrate Brandon Garcia's scorecard from TEST EVENT to Tryout Round 1
 * This fixes the round ID contamination bug
 * 
 * Usage: php api/migrate_brandon.php
 */

echo "=================================================================\n";
echo "BRANDON GARCIA SCORECARD MIGRATION\n";
echo "=================================================================\n\n";

require_once __DIR__ . '/db.php';

try {
    $pdo = db();
    
    // Constants
    $brandon_uuid = '632012a7-2645-481c-99cb-fae78be0a72f';
    $test_event_round = '6318bd0f-ae5d-46ee-ab9c-9f9d276cc977';
    $tryout_round1_round = 'df29ec34-b9ac-4667-be49-86a118e4e73e';
    
    echo "Step 1: Current state\n";
    echo "-----------------------------------------------------------\n";
    
    // Check current state
    $stmt = $pdo->prepare("
        SELECT 
            ra.id as round_archer_id,
            ra.round_id,
            r.division,
            e.name as event_name,
            e.date as event_date,
            (SELECT COUNT(*) FROM end_events WHERE round_archer_id = ra.id) as end_count,
            (SELECT MAX(running_total) FROM end_events WHERE round_archer_id = ra.id) as final_score
        FROM round_archers ra
        JOIN rounds r ON ra.round_id = r.id
        LEFT JOIN events e ON r.event_id = e.id
        WHERE ra.archer_id = ?
        ORDER BY e.date DESC
    ");
    $stmt->execute([$brandon_uuid]);
    $records = $stmt->fetchAll();
    
    echo "Brandon's current round_archer records:\n";
    foreach ($records as $rec) {
        echo sprintf("  - %s (%s) - %d ends, score: %s\n",
            $rec['event_name'],
            $rec['division'],
            $rec['end_count'],
            $rec['final_score'] ?? 'none'
        );
    }
    echo "\n";
    
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
    
    echo "Step 2: Identified round_archer IDs\n";
    echo "-----------------------------------------------------------\n";
    echo "TEST EVENT round_archer_id: " . ($test_event_ra_id ?? 'NOT FOUND') . "\n";
    echo "Tryout Round 1 round_archer_id: " . ($tryout_round1_ra_id ?? 'NOT FOUND') . "\n\n";
    
    if (!$test_event_ra_id || !$tryout_round1_ra_id) {
        echo "❌ ERROR: Could not find required round_archer records\n";
        exit(1);
    }
    
    // Count how many ends we're moving
    $stmt = $pdo->prepare("SELECT COUNT(*) as cnt FROM end_events WHERE round_archer_id = ?");
    $stmt->execute([$test_event_ra_id]);
    $end_count = $stmt->fetch()['cnt'];
    
    echo "Step 3: Migration\n";
    echo "-----------------------------------------------------------\n";
    echo "Found $end_count end_events to migrate...\n";
    
    // Perform the migration
    $stmt = $pdo->prepare("
        UPDATE end_events 
        SET round_archer_id = ? 
        WHERE round_archer_id = ?
    ");
    $stmt->execute([$tryout_round1_ra_id, $test_event_ra_id]);
    $migrated_count = $stmt->rowCount();
    
    echo "✅ Migrated $migrated_count end_events\n\n";
    
    echo "Step 4: Verification\n";
    echo "-----------------------------------------------------------\n";
    
    // Verify the migration
    $stmt = $pdo->prepare("
        SELECT 
            ra.id as round_archer_id,
            ra.round_id,
            r.division,
            e.name as event_name,
            e.date as event_date,
            (SELECT COUNT(*) FROM end_events WHERE round_archer_id = ra.id) as end_count,
            (SELECT MAX(running_total) FROM end_events WHERE round_archer_id = ra.id) as final_score
        FROM round_archers ra
        JOIN rounds r ON ra.round_id = r.id
        LEFT JOIN events e ON r.event_id = e.id
        WHERE ra.archer_id = ?
        ORDER BY e.date DESC
    ");
    $stmt->execute([$brandon_uuid]);
    $records = $stmt->fetchAll();
    
    echo "Brandon's round_archer records after migration:\n";
    foreach ($records as $rec) {
        echo sprintf("  - %s (%s) - %d ends, score: %s\n",
            $rec['event_name'],
            $rec['division'],
            $rec['end_count'],
            $rec['final_score'] ?? 'none'
        );
    }
    echo "\n";
    
    echo "Step 5: Cleanup (optional)\n";
    echo "-----------------------------------------------------------\n";
    echo "The orphaned round_archer record in TEST EVENT can be deleted.\n";
    echo "Do you want to delete it? (y/n): ";
    
    $handle = fopen("php://stdin", "r");
    $line = fgets($handle);
    if (trim($line) == 'y' || trim($line) == 'Y') {
        $stmt = $pdo->prepare("DELETE FROM round_archers WHERE id = ?");
        $stmt->execute([$test_event_ra_id]);
        echo "✅ Deleted orphaned round_archer record from TEST EVENT\n\n";
    } else {
        echo "ℹ️  Keeping the orphaned record (no data loss)\n\n";
    }
    
    echo "=================================================================\n";
    echo "✅ MIGRATION COMPLETE!\n";
    echo "Brandon Garcia's scorecard has been moved to Tryout Round 1\n";
    echo "=================================================================\n";
    
} catch (PDOException $e) {
    echo "\n❌ DATABASE ERROR\n";
    echo "-----------------------------------------------------------\n";
    echo "Error: " . $e->getMessage() . "\n\n";
    exit(1);
} catch (Exception $e) {
    echo "\n❌ ERROR\n";
    echo "-----------------------------------------------------------\n";
    echo "Error: " . $e->getMessage() . "\n\n";
    exit(1);
}

