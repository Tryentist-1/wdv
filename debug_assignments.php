<?php
require_once 'api/db.php';
require_once 'api/config.php';

$pdo = db();

echo "--- Recent Team Matches (Last 10) ---\n";
$stmt = $pdo->query("SELECT id, date, status, card_status, created_at FROM team_matches ORDER BY date DESC LIMIT 10");
$matches = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($matches as $m) {
    echo "Match ID: {$m['id']}\n";
    echo "  Date: {$m['date']}\n";
    echo "  Status: {$m['status']} / Card: {$m['card_status']}\n";
    echo "  Created: {$m['created_at']}\n";

    // Check teams
    $tStmt = $pdo->prepare("SELECT id, position, team_name FROM team_match_teams WHERE match_id = ?");
    $tStmt->execute([$m['id']]);
    $teams = $tStmt->fetchAll(PDO::FETCH_ASSOC);
    echo "  Teams: " . count($teams) . "\n";
    foreach ($teams as $t) {
        $aStmt = $pdo->prepare("SELECT count(*) FROM team_match_archers WHERE team_id = ?");
        $aStmt->execute([$t['id']]);
        $count = $aStmt->fetchColumn();
        echo "    Pos {$t['position']} ({$t['team_name']}): $count archers\n";
    }
    echo "\n";
}

echo "--- Stale Pending Matches Check (> 7 days old) ---\n";
$staleStmt = $pdo->query("SELECT id, date, status FROM team_matches WHERE (card_status = 'PENDING' OR card_status = 'PEND') AND date < DATE_SUB(NOW(), INTERVAL 7 DAY) LIMIT 5");
$staleMatches = $staleStmt->fetchAll(PDO::FETCH_ASSOC);
if (empty($staleMatches)) {
    echo "No stale pending matches found.\n";
} else {
    foreach ($staleMatches as $m) {
        echo "STALE MATCH: ID {$m['id']}, Date: {$m['date']}, Status: {$m['status']}\n";
    }
}
