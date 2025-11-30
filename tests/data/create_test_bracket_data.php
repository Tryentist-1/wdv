<?php
/**
 * Test Data Generation Script for Bracket Testing
 * 
 * Usage:
 *   php create_test_bracket_data.php create [event_name] [division]
 *   php create_test_bracket_data.php delete [event_name]
 *   php create_test_bracket_data.php list
 * 
 * Examples:
 *   php create_test_bracket_data.php create "Test Tournament" BV
 *   php create_test_bracket_data.php delete "Test Tournament"
 *   php create_test_bracket_data.php list
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/config.php';

function genUuid() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

function createTestData($eventName, $division) {
    $pdo = db();
    $pdo->beginTransaction();
    
    try {
        echo "Creating test data for event: $eventName, division: $division\n";
        
        // 1. Create or get event
        $eventStmt = $pdo->prepare('SELECT id FROM events WHERE name = ? LIMIT 1');
        $eventStmt->execute([$eventName]);
        $event = $eventStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$event) {
            $eventId = genUuid();
            $pdo->prepare('INSERT INTO events (id, name, date, status, created_at) VALUES (?, ?, CURDATE(), "ACTIVE", NOW())')
                ->execute([$eventId, $eventName]);
            echo "  ✓ Created event: $eventName\n";
        } else {
            $eventId = $event['id'];
            echo "  ✓ Using existing event: $eventName\n";
        }
        
        // 2. Get or create archers for this division
        $gender = strpos($division, 'G') === 0 ? 'F' : 'M';
        $level = strpos($division, 'VAR') !== false ? 'VAR' : 'JV';
        
        $archersStmt = $pdo->prepare('
            SELECT id, first_name, last_name, school 
            FROM archers 
            WHERE gender = ? AND level = ?
            LIMIT 12
        ');
        $archersStmt->execute([$gender, $level]);
        $archers = $archersStmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (count($archers) < 8) {
            echo "  ⚠ Warning: Only " . count($archers) . " archers found. Need at least 8 for bracket.\n";
            echo "    Creating additional test archers...\n";
            
            $schools = ['Test High', 'Demo Academy', 'Sample School', 'Example Prep'];
            for ($i = count($archers); $i < 12; $i++) {
                $archerId = genUuid();
                $firstName = $gender === 'F' ? ['Sarah', 'Emma', 'Olivia', 'Sophia'][$i % 4] : ['Mike', 'Alex', 'Chris', 'David'][$i % 4];
                $lastName = ['Johnson', 'Smith', 'Williams', 'Brown'][$i % 4];
                $school = $schools[$i % 4];
                
                $pdo->prepare('
                    INSERT INTO archers (id, first_name, last_name, school, gender, level, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, NOW())
                ')->execute([$archerId, $firstName, $lastName, $school, $gender, $level]);
                
                $archers[] = [
                    'id' => $archerId,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'school' => $school
                ];
            }
            echo "  ✓ Created " . (12 - count($archers)) . " test archers\n";
        }
        
        // 3. Create ranking round
        $roundId = genUuid();
        $pdo->prepare('
            INSERT INTO rounds (id, event_id, round_type, division, date, created_at)
            VALUES (?, ?, "R300", ?, CURDATE(), NOW())
        ')->execute([$roundId, $eventId, $division]);
        echo "  ✓ Created ranking round: $division\n";
        
        // 4. Add archers to round and assign to bales
        $baleNumber = 1;
        $targetLetters = ['A', 'B', 'C', 'D'];
        $targetIdx = 0;
        
        foreach ($archers as $index => $archer) {
            $raId = genUuid();
            $archerName = trim($archer['first_name'] . ' ' . $archer['last_name']);
            $target = $targetLetters[$targetIdx % 4];
            
            $pdo->prepare('
                INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, target_assignment, target_size, bale_number, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 122, ?, NOW())
            ')->execute([
                $raId, $roundId, $archer['id'], $archerName, 
                $archer['school'], $level, $gender, $target, $baleNumber
            ]);
            
            // Generate scores (10 ends, 3 arrows each)
            // Top archers get higher scores
            $baseScore = 650 - ($index * 5); // Range from 650 down to ~590
            $runningTotal = 0;
            
            for ($end = 1; $end <= 10; $end++) {
                // Add some variance
                $endTotal = (int)($baseScore / 10) + mt_rand(-2, 3);
                $endTotal = max(20, min(30, $endTotal)); // Clamp between 20-30
                $runningTotal += $endTotal;
                
                // Calculate tens and xs (roughly 30% tens, 10% xs)
                $tens = mt_rand(0, 2);
                $xs = mt_rand(0, 1);
                
                $pdo->prepare('
                    INSERT INTO end_events (id, round_id, round_archer_id, end_number, a1, a2, a3, end_total, running_total, tens, xs, server_ts)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                ')->execute([
                    genUuid(), $roundId, $raId, $end,
                    min(10, $endTotal / 3 + mt_rand(-1, 1)),
                    min(10, $endTotal / 3 + mt_rand(-1, 1)),
                    min(10, $endTotal / 3 + mt_rand(-1, 1)),
                    $endTotal, $runningTotal, $tens, $xs
                ]);
            }
            
            // Mark as verified and locked
            $pdo->prepare('
                UPDATE round_archers 
                SET card_status = "VER", locked = 1, completed = 1
                WHERE id = ?
            ')->execute([$raId]);
            
            $targetIdx++;
            if ($targetIdx % 4 === 0) {
                $baleNumber++;
            }
        }
        
        echo "  ✓ Created ranking scores for " . count($archers) . " archers\n";
        
        // 5. Create elimination bracket
        $bracketId = genUuid();
        $pdo->prepare('
            INSERT INTO brackets (id, event_id, bracket_type, bracket_format, division, bracket_size, status, created_at, created_by)
            VALUES (?, ?, "SOLO", "ELIMINATION", ?, 8, "OPEN", NOW(), "test_script")
        ')->execute([$bracketId, $eventId, $division]);
        echo "  ✓ Created elimination bracket\n";
        
        // 6. Get Top 8 archers and add to bracket entries
        $top8Stmt = $pdo->prepare('
            SELECT 
                ra.archer_id,
                a.first_name,
                a.last_name,
                a.school,
                SUM(ee.end_total) as total_score
            FROM round_archers ra
            JOIN archers a ON a.id = ra.archer_id
            LEFT JOIN end_events ee ON ee.round_archer_id = ra.id
            WHERE ra.round_id = ?
            GROUP BY ra.archer_id, a.first_name, a.last_name, a.school
            ORDER BY total_score DESC, SUM(ee.tens) DESC, SUM(ee.xs) DESC
            LIMIT 8
        ');
        $top8Stmt->execute([$roundId]);
        $top8 = $top8Stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($top8 as $index => $archer) {
            $entryId = genUuid();
            $pdo->prepare('
                INSERT INTO bracket_entries (id, bracket_id, entry_type, archer_id, seed_position, created_at)
                VALUES (?, ?, "ARCHER", ?, ?, NOW())
            ')->execute([$entryId, $bracketId, $archer['archer_id'], $index + 1]);
        }
        
        echo "  ✓ Added Top 8 archers to bracket (seeded 1-8)\n";
        
        $pdo->commit();
        
        echo "\n✅ Test data created successfully!\n";
        echo "   Event ID: $eventId\n";
        echo "   Round ID: $roundId\n";
        echo "   Bracket ID: $bracketId\n";
        echo "   View bracket: bracket_results.html?bracketId=$bracketId\n";
        
    } catch (Exception $e) {
        $pdo->rollBack();
        echo "❌ Error: " . $e->getMessage() . "\n";
        exit(1);
    }
}

function deleteTestData($eventName) {
    $pdo = db();
    $pdo->beginTransaction();
    
    try {
        echo "Deleting test data for event: $eventName\n";
        
        // Get event
        $eventStmt = $pdo->prepare('SELECT id FROM events WHERE name = ? LIMIT 1');
        $eventStmt->execute([$eventName]);
        $event = $eventStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$event) {
            echo "  ⚠ Event not found: $eventName\n";
            $pdo->rollBack();
            return;
        }
        
        $eventId = $event['id'];
        
        // Delete in order (respecting foreign keys)
        // 1. Delete bracket entries
        $pdo->prepare('DELETE be FROM bracket_entries be JOIN brackets b ON b.id = be.bracket_id WHERE b.event_id = ?')->execute([$eventId]);
        echo "  ✓ Deleted bracket entries\n";
        
        // 2. Delete brackets
        $pdo->prepare('DELETE FROM brackets WHERE event_id = ?')->execute([$eventId]);
        echo "  ✓ Deleted brackets\n";
        
        // 3. Delete end events
        $pdo->prepare('DELETE ee FROM end_events ee JOIN round_archers ra ON ra.id = ee.round_archer_id JOIN rounds r ON r.id = ra.round_id WHERE r.event_id = ?')->execute([$eventId]);
        echo "  ✓ Deleted end events\n";
        
        // 4. Delete round archers
        $pdo->prepare('DELETE ra FROM round_archers ra JOIN rounds r ON r.id = ra.round_id WHERE r.event_id = ?')->execute([$eventId]);
        echo "  ✓ Deleted round archers\n";
        
        // 5. Delete rounds
        $pdo->prepare('DELETE FROM rounds WHERE event_id = ?')->execute([$eventId]);
        echo "  ✓ Deleted rounds\n";
        
        // 6. Delete event
        $pdo->prepare('DELETE FROM events WHERE id = ?')->execute([$eventId]);
        echo "  ✓ Deleted event\n";
        
        $pdo->commit();
        echo "\n✅ Test data deleted successfully!\n";
        
    } catch (Exception $e) {
        $pdo->rollBack();
        echo "❌ Error: " . $e->getMessage() . "\n";
        exit(1);
    }
}

function listTestEvents() {
    $pdo = db();
    
    $stmt = $pdo->prepare('
        SELECT e.id, e.name, e.date, COUNT(DISTINCT r.id) as round_count, COUNT(DISTINCT b.id) as bracket_count
        FROM events e
        LEFT JOIN rounds r ON r.event_id = e.id
        LEFT JOIN brackets b ON b.event_id = e.id
        WHERE e.name LIKE "Test%" OR e.name LIKE "%Tournament%"
        GROUP BY e.id, e.name, e.date
        ORDER BY e.date DESC
    ');
    $stmt->execute();
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($events) === 0) {
        echo "No test events found.\n";
        return;
    }
    
    echo "Test Events:\n";
    echo str_repeat("-", 80) . "\n";
    printf("%-36s %-30s %-12s %-8s %-8s\n", "Event ID", "Name", "Date", "Rounds", "Brackets");
    echo str_repeat("-", 80) . "\n";
    
    foreach ($events as $event) {
        printf("%-36s %-30s %-12s %-8s %-8s\n", 
            $event['id'], 
            substr($event['name'], 0, 30),
            $event['date'],
            $event['round_count'],
            $event['bracket_count']
        );
    }
}

// Main execution
if ($argc < 2) {
    echo "Usage:\n";
    echo "  php create_test_bracket_data.php create [event_name] [division]\n";
    echo "  php create_test_bracket_data.php delete [event_name]\n";
    echo "  php create_test_bracket_data.php list\n";
    echo "\n";
    echo "Examples:\n";
    echo "  php create_test_bracket_data.php create \"Test Tournament\" BV\n";
    echo "  php create_test_bracket_data.php delete \"Test Tournament\"\n";
    echo "  php create_test_bracket_data.php list\n";
    exit(1);
}

$command = $argv[1];

switch ($command) {
    case 'create':
        if ($argc < 4) {
            echo "Error: Missing arguments for create command\n";
            echo "Usage: php create_test_bracket_data.php create [event_name] [division]\n";
            echo "Division options: BV, BJV, GV, GJV\n";
            exit(1);
        }
        $eventName = $argv[2];
        $division = strtoupper($argv[3]);
        
        if (!in_array($division, ['BV', 'BJV', 'GV', 'GJV'])) {
            echo "Error: Invalid division. Must be one of: BV, BJV, GV, GJV\n";
            exit(1);
        }
        
        createTestData($eventName, $division);
        break;
        
    case 'delete':
        if ($argc < 3) {
            echo "Error: Missing event name for delete command\n";
            echo "Usage: php create_test_bracket_data.php delete [event_name]\n";
            exit(1);
        }
        $eventName = $argv[2];
        deleteTestData($eventName);
        break;
        
    case 'list':
        listTestEvents();
        break;
        
    default:
        echo "Error: Unknown command: $command\n";
        echo "Valid commands: create, delete, list\n";
        exit(1);
}

