<?php
require_once __DIR__ . '/db.php';

// Check if run from CLI
if (php_sapi_name() !== 'cli') {
    die("This script must be run from the command line.\n");
}

$pdo = db();

echo "DSN: " . DB_DSN . "\n";

echo "Seeding Test Data for HRO and HST schools...\n";

// 1. Find the target event
$eventName = 'Hybrid Event Final'; // The event we verified
$stmt = $pdo->prepare("SELECT id FROM events WHERE name = ? ORDER BY created_at DESC LIMIT 1");
$stmt->execute([$eventName]);
$eventId = $stmt->fetchColumn();

if (!$eventId) {
    die("Error: Event '$eventName' not found.\n");
}
echo "Found Event: $eventName ($eventId)\n";

// 2. Get rounds for this event
$stmt = $pdo->prepare("SELECT id, division, round_type FROM rounds WHERE event_id = ?");
$stmt->execute([$eventId]);
$allRounds = $stmt->fetchAll();
echo "All Rounds found:\n";
print_r($allRounds);

$stmt = $pdo->prepare("SELECT division, id FROM rounds WHERE event_id = ? AND round_type = 'R300'");
$stmt->execute([$eventId]);
$rounds = $stmt->fetchAll(PDO::FETCH_KEY_PAIR); // [division => id]
echo "R300 Rounds:\n";
print_r($rounds);

// Validate we have the standard ranking rounds
$requiredDivisions = ['BVAR', 'GVAR', 'BJV', 'GJV', 'OPEN'];
foreach ($requiredDivisions as $div) {
    if (!isset($rounds[$div]) && $div !== 'OPEN') { // OPEN might be optional depending on creation
        echo "Warning: Round for division $div not found in this event.\n";
    }
}

// 3. Find target archers
$schools = ['HRO', 'HST'];
$inSchools = "'" . implode("','", $schools) . "'";
$stmt = $pdo->query("SELECT id, first_name, last_name, gender, level, school FROM archers WHERE school IN ($inSchools) AND status='active'");
$archers = $stmt->fetchAll();

echo "Found " . count($archers) . " active archers from HRO/HST.\n";

$assignedCount = 0;

foreach ($archers as $archer) {
    // Determine target round
    $targetDiv = '';
    if ($archer['level'] === 'VAR') {
        $targetDiv = ($archer['gender'] === 'M') ? 'BVAR' : 'GVAR';
    } else { // JV or BEG -> JV
        $targetDiv = ($archer['gender'] === 'M') ? 'BJV' : 'GJV';
    }

    // Fallback to OPEN if specific div not active
    if (!isset($rounds[$targetDiv])) {
        if (isset($rounds['OPEN'])) {
            $targetDiv = 'OPEN';
        } else {
            echo "Skipping {$archer['first_name']} {$archer['last_name']} ({$archer['school']}) - No matching round.\n";
            continue;
        }
    }

    $roundId = $rounds[$targetDiv];

    // Check if already assigned
    $stmt = $pdo->prepare("SELECT id FROM round_archers WHERE round_id = ? AND archer_id = ?");
    $stmt->execute([$roundId, $archer['id']]);
    if ($stmt->fetch()) {
        // echo "Archer {$archer['first_name']} already assigned.\n";
        continue;
    }

    // Assign Archer
    // Generate a random bale number (simple approach, just incrementing)
    $baleNum = rand(1, 20);

    try {
        $pdo->beginTransaction();

        // keys: id, round_id, archer_id, archer_name, school, level, gender, bale_number
        $raStmt = $pdo->prepare("INSERT INTO round_archers (id, round_id, archer_id, archer_name, school, level, gender, bale_number) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)");
        $raStmt->execute([
            $roundId,
            $archer['id'],
            $archer['first_name'] . ' ' . $archer['last_name'],
            $archer['school'],
            $archer['level'],
            $archer['gender'],
            $baleNum
        ]);

        // Get the ID we just inserted
        // Since we insert UUID() we need to look it up or generate it in PHP. 
        // Let's look it up by archer_id/round_id combo
        $idStmt = $pdo->prepare("SELECT id FROM round_archers WHERE round_id = ? AND archer_id = ?");
        $idStmt->execute([$roundId, $archer['id']]);
        $roundArcherId = $idStmt->fetchColumn();

        // Generate Scores (30 arrows, 10 ends of 3)
        // Simulate skill: VAR gets 7-10, JV gets 4-9
        $minScore = ($archer['level'] === 'VAR') ? 6 : 3;

        $runningTotal = 0;

        for ($end = 1; $end <= 10; $end++) {
            $a1 = rand($minScore, 10);
            $a2 = rand($minScore, 10);
            $a3 = rand($minScore, 10);

            // Xs count as 10 but stored as 'X' string in UI? DB schema says a1 is VARCHAR(3).
            // Usually we store '10' or 'X' or 'M'. 
            // For simplicity let's stick to numbers 0-10. 10s can be Xs.

            $endTotal = $a1 + $a2 + $a3;
            $runningTotal += $endTotal;
            $tens = 0;
            $xs = 0;
            if ($a1 == 10)
                $tens++;
            if ($a2 == 10)
                $tens++;
            if ($a3 == 10)
                $tens++;

            $scoreStmt = $pdo->prepare("INSERT INTO end_events (id, round_id, round_archer_id, end_number, a1, a2, a3, end_total, running_total, tens, xs) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $scoreStmt->execute([
                $roundId,
                $roundArcherId,
                $end,
                (string) $a1,
                (string) $a2,
                (string) $a3,
                $endTotal,
                $runningTotal,
                $tens,
                $xs
            ]);
        }

        // Mark as completed
        $updateStmt = $pdo->prepare("UPDATE round_archers SET completed = 1, verified_at = NOW(), card_status = 'VER' WHERE id = ?");
        $updateStmt->execute([$roundArcherId]);

        $pdo->commit();
        $assignedCount++;
        echo "Assigned and Scored: {$archer['first_name']} {$archer['last_name']} -> $targetDiv ($runningTotal)\n";

    } catch (Exception $e) {
        $pdo->rollBack();
        echo "Error assigning {$archer['first_name']}: " . $e->getMessage() . "\n";
    }
}

echo "Done. Assigned $assignedCount archers.\n";
