// POST /v1/brackets/:id/generate-round - Generate next round for Swiss brackets
if (preg_match('#^/v1/brackets/([0-9a-f-]+)/generate-round$#i', $route, $m) && $method === 'POST') {
require_api_key();
$bracketId = $m[1];

try {
$pdo = db();

// Get bracket details
$bracketStmt = $pdo->prepare('SELECT * FROM brackets WHERE id = ?');
$bracketStmt->execute([$bracketId]);
$bracket = $bracketStmt->fetch(PDO::FETCH_ASSOC);

if (!$bracket) {
json_response(['error' => 'Bracket not found'], 404);
exit;
}

if ($bracket['bracket_format'] !== 'SWISS') {
json_response(['error' => 'Round generation only available for Swiss brackets'], 400);
exit;
}

// AUTO mode check - we allow logic to descend gracefully if mode is missing (older db)
$isAuto = isset($bracket['mode']) && $bracket['mode'] === 'AUTO';
// Note: We might allow manual triggering even for OPEN brackets if requested, but for now stick to AUTO plan
// if (!$isAuto) { json_response(['error' => 'Bracket mode must be AUTO'], 400); exit; }

// Recalculate standings first to be safe
recalculate_swiss_bracket_standings($pdo, $bracketId);

// Get active archers sorted by points
$stmt = $pdo->prepare('
SELECT * FROM bracket_entries
WHERE bracket_id = ? AND entry_type = "ARCHER"
ORDER BY swiss_points DESC, swiss_wins DESC, swiss_losses ASC, RAND()
');
$stmt->execute([$bracketId]);
$allEntries = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (count($allEntries) < 2) { json_response(['error'=> 'Not enough archers to generate a round'], 400);
    exit;
    }

    // Find existing matches to avoid repeats
    $existingStmt = $pdo->prepare('
    SELECT sma1.archer_id as a1, sma2.archer_id as a2
    FROM solo_matches sm
    JOIN solo_match_archers sma1 ON sma1.match_id = sm.id AND sma1.position = 1
    JOIN solo_match_archers sma2 ON sma2.match_id = sm.id AND sma2.position = 2
    WHERE sm.bracket_id = ?
    ');
    $existingStmt->execute([$bracketId]);
    $existingMatches = $existingStmt->fetchAll(PDO::FETCH_ASSOC);

    $playedMap = [];
    foreach ($existingMatches as $em) {
    $k1 = $em['a1'] . ':' . $em['a2'];
    $k2 = $em['a2'] . ':' . $em['a1'];
    $playedMap[$k1] = true;
    $playedMap[$k2] = true;
    }

    // Determine next Round Number
    $roundStmt = $pdo->prepare('
    SELECT MAX(CAST(SUBSTRING_INDEX(bracket_match_id, " ", -1) AS UNSIGNED)) as max_round
    FROM solo_matches
    WHERE bracket_id = ? AND bracket_match_id LIKE "Round %"
    ');
    $roundStmt->execute([$bracketId]);
    $res = $roundStmt->fetch(PDO::FETCH_ASSOC);
    $nextRound = ($res['max_round'] ?? 0) + 1;
    $roundLabel = "Round " . $nextRound;

    // PAIRING LOGIC (High-High, avoid repeats)
    $pairings = [];
    $usedIndices = [];
    $entriesCount = count($allEntries);

    // Simple greedy pairing
    for ($i = 0; $i < $entriesCount; $i++) { if (isset($usedIndices[$i])) continue; $p1=$allEntries[$i];
        $bestOpponentIdx=-1; // Look for best available opponent for ($j=$i + 1; $j < $entriesCount; $j++) { if
        (isset($usedIndices[$j])) continue; $p2=$allEntries[$j]; // Check if played $key=$p1['archer_id'] . ':' .
        $p2['archer_id']; if (!isset($playedMap[$key])) { $bestOpponentIdx=$j; break; // Found one! Since list is sorted
        by score, this is High-High } } // If no unplayed opponent found, take the next best available (rematch) // Or
        leave for bye? For now, force pair if possible if ($bestOpponentIdx===-1) { for ($j=$i + 1; $j < $entriesCount;
        $j++) { if (!isset($usedIndices[$j])) { $bestOpponentIdx=$j; break; } } } if ($bestOpponentIdx !==-1) {
        $pairings[]=[$p1, $allEntries[$bestOpponentIdx]]; $usedIndices[$i]=true; $usedIndices[$bestOpponentIdx]=true; }
        else { // Odd number? Bye? // For now, ignore leftovers or assign Bye } } if (empty($pairings)) {
        json_response(['message'=> 'No new pairings could be generated.', 'round' => $nextRound], 200);
        exit;
        }

        // CREATE MATCHES
        $pdo->beginTransaction();

        $matchInsert = $pdo->prepare('
        INSERT INTO solo_matches (id, event_id, bracket_id, bracket_match_id, match_type, date, status, max_sets,
        created_at, match_code)
        VALUES (?, ?, ?, ?, "SOLO_OLYMPIC", CURDATE(), "PENDING", 5, NOW(), ?)
        ');

        $archerInsert = $pdo->prepare('
        INSERT INTO solo_match_archers (id, match_id, archer_id, archer_name, school, gender, position)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ');

        foreach ($pairings as $pair) {
        $entries = [];
        // Need to fetch archer names (not in bracket_entries)
        // Or rely on a separate query. Let's do a quick fetch or join in original query.
        // Optimized: updated original query to select * (which is just entries), need archer details
        // Re-fetch details for these 2

        foreach ($pair as $p) {
        $aStmt = $pdo->prepare('SELECT * FROM archers WHERE id = ?');
        $aStmt->execute([$p['archer_id']]);
        $entries[] = $aStmt->fetch(PDO::FETCH_ASSOC);
        }

        $a1 = $entries[0];
        $a2 = $entries[1];

        $mId = $genUuid();
        // Generate match code
        $matchCode = generate_solo_match_code($pdo, $a1['first_name'], $a1['last_name'], $a2['first_name'],
        $a2['last_name'], date('Y-m-d'));

        $matchInsert->execute([$mId, $bracket['event_id'], $bracketId, $roundLabel, $matchCode]);

        // Archer 1
        $archerInsert->execute([
        $genUuid(), $mId, $a1['id'],
        $a1['first_name'] . ' ' . $a1['last_name'],
        $a1['school'], $a1['gender'], 1
        ]);

        // Archer 2
        $archerInsert->execute([
        $genUuid(), $mId, $a2['id'],
        $a2['first_name'] . ' ' . $a2['last_name'],
        $a2['school'], $a2['gender'], 2
        ]);
        }

        $pdo->commit();

        json_response([
        'message' => 'Generated ' . count($pairings) . ' matches for ' . $roundLabel,
        'round' => $nextRound,
        'pairings' => count($pairings)
        ], 200);

        } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
        }
        exit;
        }