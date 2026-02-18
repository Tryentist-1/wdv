<?php
/**
 * tests/integrity_check.php
 * 
 * Audits Solo Match set points for consistency.
 * Run this periodically to ensure data integrity.
 * 
 * Status Codes:
 * 0: Clean (No errors)
 * 1: Errors Found
 */

require_once __DIR__ . '/../api/db.php';
require_once __DIR__ . '/../api/config.php';

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

    // Get all matches with their archers
    $matchesStmt = $pdo->query("SELECT id FROM solo_matches WHERE card_status != 'VOID'");
    $matches = $matchesStmt->fetchAll(PDO::FETCH_ASSOC);

    $errorCount = 0;

    foreach ($matches as $match) {
        $matchId = $match['id'];

        // Get sets
        $setsStmt = $pdo->prepare("
            SELECT sms.*, sma.position 
            FROM solo_match_sets sms
            JOIN solo_match_archers sma ON sma.id = sms.match_archer_id
            WHERE sms.match_id = ? 
            ORDER BY sms.set_number
        ");
        $setsStmt->execute([$matchId]);
        $sets = $setsStmt->fetchAll(PDO::FETCH_ASSOC);

        // Group sets by set_number
        $setsByNum = [];
        foreach ($sets as $s) {
            $setsByNum[$s['set_number']][$s['match_archer_id']] = $s;
        }

        foreach ($setsByNum as $setNum => $pair) {
            if (count($pair) !== 2)
                continue;

            $s1 = array_values($pair)[0];
            $s2 = array_values($pair)[1];

            // Calculate totals
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
                echo "ERROR: Match $matchId Set $setNum Integrity Fail\n";
                if ($needsUpdate1)
                    echo "  Pos 1: Score $total1, DB has Total {$s1['set_total']}, Pts {$s1['set_points']} (Exp Pts $p1)\n";
                if ($needsUpdate2)
                    echo "  Pos 2: Score $total2, DB has Total {$s2['set_total']}, Pts {$s2['set_points']} (Exp Pts $p2)\n";
                $errorCount++;
            }
        }
    }

    if ($errorCount === 0) {
        echo "Integrity Check Passed: No errors found.\n";
        exit(0);
    } else {
        echo "Integrity Check Failed: $errorCount errors found.\n";
        exit(1);
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
