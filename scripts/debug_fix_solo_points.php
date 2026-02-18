<?php
/**
 * debug_fix_solo_points.php
 * 
 * Audits and fixes Solo Match set points.
 * 1. Iterates through all solo matches.
 * 2. For each match, checks all sets.
 * 3. Recalculates set points based on arrow scores.
 * 4. Updates DB if discrepancies found.
 * 5. Recalculates match winner and Swiss standings if changed.
 */

require_once 'api/db.php';
require_once 'api/config.php';

// Helper to parse score
function parseScore($val)
{
    if ($val === null || $val === '')
        return 0;
    if (strtoupper($val) === 'X')
        return 10;
    if (strtoupper($val) === 'M')
        return 0;
    return (int) $val;
}

try {
    $pdo = db();
    echo "Starting Solo Match Point Audit...\n";

    // Get all matches with their archers
    $matchesStmt = $pdo->query("SELECT id, bracket_id, card_status FROM solo_matches ORDER BY date DESC");
    $matches = $matchesStmt->fetchAll(PDO::FETCH_ASSOC);

    $fixedSets = 0;
    $fixedMatches = 0;

    foreach ($matches as $match) {
        $matchId = $match['id'];

        // Get archers
        $archersStmt = $pdo->prepare("SELECT id, position, archer_id FROM solo_match_archers WHERE match_id = ? ORDER BY position");
        $archersStmt->execute([$matchId]);
        $archers = $archersStmt->fetchAll(PDO::FETCH_ASSOC);

        if (count($archers) !== 2)
            continue; // Skip if not a 2-person match

        $a1 = $archers[0]; // Position 1
        $a2 = $archers[1]; // Position 2

        // Get sets
        $setsStmt = $pdo->prepare("SELECT * FROM solo_match_sets WHERE match_id = ? ORDER BY set_number");
        $setsStmt->execute([$matchId]);
        $sets = $setsStmt->fetchAll(PDO::FETCH_ASSOC);

        // Group sets by set_number
        $setsByNum = [];
        foreach ($sets as $s) {
            $setsByNum[$s['set_number']][$s['match_archer_id']] = $s;
        }

        $matchChanged = false;

        foreach ($setsByNum as $setNum => $pair) {
            // Need both archers to have a record for this set to compare
            if (!isset($pair[$a1['id']]) || !isset($pair[$a2['id']]))
                continue;

            $s1 = $pair[$a1['id']];
            $s2 = $pair[$a2['id']];

            // Calculate totals from arrows (verify total integrity too)
            $total1 = parseScore($s1['a1']) + parseScore($s1['a2']) + parseScore($s1['a3']);
            $total2 = parseScore($s2['a1']) + parseScore($s2['a2']) + parseScore($s2['a3']);

            // Determine correct points
            $p1 = 1;
            $p2 = 1;
            if ($total1 > $total2) {
                $p1 = 2;
                $p2 = 0;
            } elseif ($total2 > $total1) {
                $p1 = 0;
                $p2 = 2;
            }

            // Check correctness
            $needsUpdate1 = ((int) $s1['set_points'] !== $p1) || ((int) $s1['set_total'] !== $total1);
            $needsUpdate2 = ((int) $s2['set_points'] !== $p2) || ((int) $s2['set_total'] !== $total2);

            if ($needsUpdate1 || $needsUpdate2) {
                echo "Mismatch in Match $matchId Set $setNum:\n";
                echo "  A1 (Pos 1): Scored $total1, DB has Total {$s1['set_total']}, Pts {$s1['set_points']} -> Should be Pts $p1\n";
                echo "  A2 (Pos 2): Scored $total2, DB has Total {$s2['set_total']}, Pts {$s2['set_points']} -> Should be Pts $p2\n";

                // Update DB
                $upd = $pdo->prepare("UPDATE solo_match_sets SET set_total = ?, set_points = ? WHERE id = ?");
                if ($needsUpdate1)
                    $upd->execute([$total1, $p1, $s1['id']]);
                if ($needsUpdate2)
                    $upd->execute([$total2, $p2, $s2['id']]);

                $fixedSets++;
                $matchChanged = true;
            }
        }

        if ($matchChanged) {
            $fixedMatches++;
            echo "Match $matchId updated. Recalculating winner...\n";

            // Recalculate sets won
            $setsWonStmt = $pdo->prepare("
                SELECT sma.id, SUM(COALESCE(sms.set_points, 0)) as sets_won 
                FROM solo_match_archers sma
                LEFT JOIN solo_match_sets sms ON sms.match_archer_id = sma.id AND sms.set_number <= 5
                WHERE sma.match_id = ?
                GROUP BY sma.id
            ");
            $setsWonStmt->execute([$matchId]);
            $wins = $setsWonStmt->fetchAll(PDO::FETCH_KEY_PAIR);

            $w1 = min(6, $wins[$a1['id']] ?? 0);
            $w2 = min(6, $wins[$a2['id']] ?? 0);

            // Update winner
            $win1 = ($w1 > $w2) ? 1 : 0;
            $win2 = ($w2 > $w1) ? 1 : 0;
            // Tie remains 0 for known winner fields unless we have shoot-off logic here, 
            // but primarily we fix the definite wins.

            $pdo->prepare("UPDATE solo_match_archers SET winner = ? WHERE id = ?")->execute([$win1, $a1['id']]);
            $pdo->prepare("UPDATE solo_match_archers SET winner = ? WHERE id = ?")->execute([$win2, $a2['id']]);

            // If match is complete, ensure solo_matches.winner_archer_id is set
            if ($match['card_status'] === 'COMP' || $match['card_status'] === 'VERIFIED' || $match['card_status'] === 'VER') {
                $winnerArcherId = null;
                if ($win1)
                    $winnerArcherId = $a1['archer_id'];
                if ($win2)
                    $winnerArcherId = $a2['archer_id'];

                $pdo->prepare("UPDATE solo_matches SET winner_archer_id = ? WHERE id = ?")->execute([$winnerArcherId, $matchId]);
            }

            // Trigger Swiss update
            if ($match['bracket_id']) {
                echo "Recalculating Swiss standings for bracket {$match['bracket_id']}...\n";
                // We need to require the file that has this function, usually index.php or a lib
                // Assuming it's in api/index.php is hard because index.php is a router.
                // We'll reimplement or require a specific file if needed.
                // For now, let's just output that it NEEDS recalc.
                // Or better, we can manually trigger the SQL update for this bracket.

                // Call the API via internal request or copy logic? 
                // Let's create a minimal version of recalculate_swiss_bracket_standings here.
                recalc_swiss($pdo, $match['bracket_id']);
            }
        }
    }

    echo "Audit Complete. Fixed $fixedSets sets across $fixedMatches matches.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

function recalc_swiss($pdo, $bracketId)
{
    // 1. Reset
    $pdo->prepare("UPDATE bracket_entries SET swiss_wins=0, swiss_losses=0, swiss_points=0 WHERE bracket_id=?")->execute([$bracketId]);

    // 2. Tally
    $matchesStmt = $pdo->prepare("
        SELECT winner_archer_id 
        FROM solo_matches 
        WHERE bracket_id = ? AND (card_status='COMP' OR card_status='VERIFIED' OR card_status='VER' OR card_status='COMPLETED') AND winner_archer_id IS NOT NULL
    ");
    $matchesStmt->execute([$bracketId]);
    $winners = $matchesStmt->fetchAll(PDO::FETCH_COLUMN);

    // 3. Update Wins/Points
    foreach ($winners as $archerId) {
        $pdo->prepare("
            UPDATE bracket_entries 
            SET swiss_wins = swiss_wins + 1, swiss_points = swiss_wins + 1 
            WHERE bracket_id = ? AND archer_id = ?
        ")->execute([$bracketId, $archerId]);
    }

    // 4. Update Losses (if needed for SOS/tiebreakers, though points is 1-per-win now)
    // Find losers
    $losersStmt = $pdo->prepare("
        SELECT sma.archer_id 
        FROM solo_matches sm
        JOIN solo_match_archers sma ON sma.match_id = sm.id
        WHERE sm.bracket_id = ? AND (sm.card_status='COMP' OR sm.card_status='VERIFIED' OR sm.card_status='VER' OR sm.card_status='COMPLETED')
        AND sm.winner_archer_id IS NOT NULL AND sm.winner_archer_id != sma.archer_id
    ");
    $losersStmt->execute([$bracketId]);
    $losers = $losersStmt->fetchAll(PDO::FETCH_COLUMN);

    foreach ($losers as $archerId) {
        $pdo->prepare("
            UPDATE bracket_entries 
            SET swiss_losses = swiss_losses + 1 
            WHERE bracket_id = ? AND archer_id = ?
        ")->execute([$bracketId, $archerId]);
    }
}
