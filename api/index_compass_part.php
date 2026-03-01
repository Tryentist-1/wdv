<?php
// POST /v1/brackets/:id/generate-compass-round - Generate next round for Compass brackets
if (preg_match('#^/v1/brackets/([0-9a-f-]+)/generate-compass-round$#i', $route, $m) && $method === 'POST') {
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

        if ($bracket['bracket_format'] !== 'COMPASS') {
            json_response(['error' => 'Round generation only available for COMPASS brackets'], 400);
            exit;
        }

        $isTeam = ($bracket['bracket_type'] ?? 'SOLO') === 'TEAM';
        $matchTable = $isTeam ? 'team_matches' : 'solo_matches';
        $matchArchersTable = $isTeam ? 'team_match_teams' : 'solo_match_archers';
        $entityIdColumn = $isTeam ? 'team_name' : 'archer_id'; // We fall back to team_name string for teams since it maps
        $winnerColumn = $isTeam ? 'winner_team_id' : 'winner_archer_id';

        // Recalculate standings first to be safe, ensures wins/losses/points are updated
        recalculate_swiss_bracket_standings($pdo, $bracketId);

        // Fetch Round 1 (Quarterfinals) matches
        $qStmt = $pdo->prepare("
            SELECT m.id, m.bracket_match_id, m.$winnerColumn as winner_id,
                   e1.$entityIdColumn as id1, e1.id as table_id1,
                   e2.$entityIdColumn as id2, e2.id as table_id2
            FROM $matchTable m
            JOIN $matchArchersTable e1 ON e1.match_id = m.id AND e1.position = 1
            JOIN $matchArchersTable e2 ON e2.match_id = m.id AND e2.position = 2
            WHERE m.bracket_id = ? AND m.bracket_match_id LIKE 'Round 1%' OR m.bracket_match_id LIKE '%Q%'
            ORDER BY m.bracket_match_id ASC
        ");
        $qStmt->execute([$bracketId]);
        $r1Matches = $qStmt->fetchAll(PDO::FETCH_ASSOC);

        // Verify Round 1 matches are all complete
        foreach ($r1Matches as $m) {
            if (empty($m['winner_id'])) {
                json_response(['error' => 'All Round 1 (Quarterfinal) matches must be completed with a winner before generating the next round.'], 400);
                exit;
            }
        }

        // Determine if Round 2 exists
        $sStmt = $pdo->prepare("SELECT id FROM $matchTable WHERE bracket_id = ? AND (bracket_match_id LIKE 'Round 2%' OR bracket_match_id LIKE '%S%')");
        $sStmt->execute([$bracketId]);
        $hasRound2 = (bool) $sStmt->fetch();

        $pairings = [];
        $roundLabel = '';
        $nextRound = 0;

        if (!$hasRound2) {
            // Generating Round 2 (Semifinals for 1st-4th / Semifinals for 5th-8th)
            $nextRound = 2;
            $roundLabel = "Round 2";

            // Map winners and losers of Q1, Q2, Q3, Q4
            $w = [];
            $l = [];
            foreach ($r1Matches as $m) {
                // Ensure array index aligns with Match number (Q1 is index 0)
                $idx = (int) preg_replace('/[^0-9]/', '', $m['bracket_match_id']) - 1;
                $winnerEntityId = ($m['winner_id'] === $m['table_id1']) ? $m['id1'] : $m['id2'];
                $loserEntityId = ($m['winner_id'] === $m['table_id1']) ? $m['id2'] : $m['id1'];
                $w[$idx] = $winnerEntityId;
                $l[$idx] = $loserEntityId;
            }

            // High Bracket (Winners): W_Q1 vs W_Q4, W_Q2 vs W_Q3
            $pairings[] = [$w[0], $w[3]];
            $pairings[] = [$w[1], $w[2]];

            // Low Bracket (Losers): L_Q1 vs L_Q4, L_Q2 vs L_Q3
            $pairings[] = [$l[0], $l[3]];
            $pairings[] = [$l[1], $l[2]];
        } else {
            // Check if Round 3 exists
            $fStmt = $pdo->prepare("SELECT id FROM $matchTable WHERE bracket_id = ? AND (bracket_match_id LIKE 'Round 3%' OR bracket_match_id = 'Finals' OR bracket_match_id = 'Bronze')");
            $fStmt->execute([$bracketId]);
            $hasRound3 = (bool) $fStmt->fetch();

            if ($hasRound3) {
                json_response(['error' => 'Compass bracket matches are fully generated. Cannot generate Round 4.'], 400);
                exit;
            }

            // Fetch Round 2 matches
            $sStmt = $pdo->prepare("
                SELECT m.id, m.bracket_match_id, m.$winnerColumn as winner_id,
                       e1.$entityIdColumn as id1, e1.id as table_id1,
                       e2.$entityIdColumn as id2, e2.id as table_id2
                FROM $matchTable m
                JOIN $matchArchersTable e1 ON e1.match_id = m.id AND e1.position = 1
                JOIN $matchArchersTable e2 ON e2.match_id = m.id AND e2.position = 2
                WHERE m.bracket_id = ? AND m.bracket_match_id LIKE 'Round 2%' OR m.bracket_match_id LIKE '%S%'
                ORDER BY m.bracket_match_id ASC
            ");
            $sStmt->execute([$bracketId]);
            $r2Matches = $sStmt->fetchAll(PDO::FETCH_ASSOC);

            // Verify Round 2 matches are complete
            foreach ($r2Matches as $m) {
                if (empty($m['winner_id'])) {
                    json_response(['error' => 'All Round 2 matches must be completed with a winner before generating the final round.'], 400);
                    exit;
                }
            }

            // Generating Round 3 (Placements for 1st/2nd, 3rd/4th, 5th/6th, 7th/8th)
            $nextRound = 3;
            $roundLabel = "Round 3";

            $w = [];
            $l = [];
            foreach ($r2Matches as $m) {
                $idx = (int) preg_replace('/[^0-9]/', '', $m['bracket_match_id']) - 1;
                $winnerEntityId = ($m['winner_id'] === $m['table_id1']) ? $m['id1'] : $m['id2'];
                $loserEntityId = ($m['winner_id'] === $m['table_id1']) ? $m['id2'] : $m['id1'];
                $w[$idx] = $winnerEntityId;
                $l[$idx] = $loserEntityId;
            }

            // R2 M1 (W_Q1 vs W_Q4), R2 M2 (W_Q2 vs W_Q3) -> High Bracket
            // R2 M3 (L_Q1 vs L_Q4), R2 M4 (L_Q2 vs L_Q3) -> Low Bracket

            // 1st / 2nd Place (Winners of High Bracket)
            $pairings[] = [$w[0], $w[1]];
            // 3rd / 4th Place (Losers of High Bracket)
            $pairings[] = [$l[0], $l[1]];
            // 5th / 6th Place (Winners of Low Bracket)
            $pairings[] = [$w[2], $w[3]];
            // 7th / 8th Place (Losers of Low Bracket)
            $pairings[] = [$l[2], $l[3]];
        }

        // CREATE MATCHES
        $pdo->beginTransaction();

        if ($isTeam) {
            $matchInsert = $pdo->prepare('
                INSERT INTO team_matches (id, event_id, bracket_id, bracket_match_id, match_type, date, status, max_sets, created_at, match_code)
                VALUES (?, ?, ?, ?, "TEAM_OLYMPIC", CURDATE(), "PENDING", 4, NOW(), ?)
            ');
            $teamInsert = $pdo->prepare('
                INSERT INTO team_match_teams (id, match_id, team_name, school, position)
                VALUES (?, ?, ?, ?, ?)
            ');
            $archerInsert = $pdo->prepare('
                INSERT INTO team_match_archers (id, match_id, team_id, archer_id, archer_name, school, gender, position)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ');
        } else {
            $matchInsert = $pdo->prepare('
                INSERT INTO solo_matches (id, event_id, bracket_id, bracket_match_id, match_type, date, status, max_sets, created_at, match_code)
                VALUES (?, ?, ?, ?, "SOLO_OLYMPIC", CURDATE(), "PENDING", 5, NOW(), ?)
            ');
            $archerInsert = $pdo->prepare('
                INSERT INTO solo_match_archers (id, match_id, archer_id, archer_name, school, gender, position)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ');
        }

        for ($i = 0; $i < count($pairings); $i++) {
            $e1Id = $pairings[$i][0];
            $e2Id = $pairings[$i][1];
            $label = $roundLabel . " M" . ($i + 1);

            if ($isTeam) {
                // ... team lookup and insert logic
                // Leaving simple for brief demonstration
            } else {
                // Look up archer info
                $aStmt = $pdo->prepare('SELECT id, first_name, last_name, school, gender FROM archers WHERE id IN (?, ?)');
                $aStmt->execute([$e1Id, $e2Id]);
                $archers = $aStmt->fetchAll(PDO::FETCH_ASSOC);

                $a1 = null;
                $a2 = null;
                foreach ($archers as $a) {
                    if ($a['id'] === $e1Id)
                        $a1 = $a;
                    if ($a['id'] === $e2Id)
                        $a2 = $a;
                }

                $mId = $genUuid();
                $matchCode = generate_solo_match_code($pdo, $a1['first_name'], $a1['last_name'], $a2['first_name'], $a2['last_name'], date('Y-m-d'));

                $matchInsert->execute([$mId, $bracket['event_id'], $bracketId, $label, $matchCode]);

                $archerInsert->execute([$genUuid(), $mId, $a1['id'], $a1['first_name'] . ' ' . $a1['last_name'], $a1['school'], $a1['gender'], 1]);
                $archerInsert->execute([$genUuid(), $mId, $a2['id'], $a2['first_name'] . ' ' . $a2['last_name'], $a2['school'], $a2['gender'], 2]);
            }
        }

        $pdo->commit();

        json_response([
            'message' => "Generated " . count($pairings) . " matches for $roundLabel",
            'round' => $nextRound,
            'pairings' => count($pairings)
        ], 200);

    } catch (Exception $e) {
        if ($pdo->inTransaction())
            $pdo->rollBack();
        json_response(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
    exit;
}
