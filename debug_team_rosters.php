<?php
require_once 'api/db.php';
require_once 'api/config.php';

$pdo = db();
$bracketId = '4c81afa8-36a9-4e31-86db-cfa564732c6e'; // Local verified bracket

echo "--- Debugging Team Rosters for Bracket: $bracketId ---\n";

// 1. Get Bracket Entries (All Types)
$stmt = $pdo->prepare("SELECT * FROM bracket_entries WHERE bracket_id = ?");
$stmt->execute([$bracketId]);
$entries = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Found " . count($entries) . " total entries.\n";
foreach ($entries as $e) {
    echo "  Entry ID: {$e['id']} | School: {$e['school_id']} | Type: {$e['entry_type']}\n";
}

// 2. Find Team Match Teams to see if they link to entries
echo "\n--- Inspecting Team Match Teams ---\n";
$stmt = $pdo->prepare("
    SELECT 
        tmt.id as team_id,
        tmt.match_id,
        tmt.team_name,
        tmt.school
    FROM team_matches tm
    JOIN team_match_teams tmt ON tmt.match_id = tm.id
    WHERE tm.bracket_id = ?
    LIMIT 10
");
$stmt->execute([$bracketId]);
$teams = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($teams as $t) {
    echo "  Match {$t['match_id']} | Team: {$t['team_name']} ({$t['school']}) | ID: {$t['team_id']}\n";
}

// 3. Find Archers linked to teams
echo "\n--- Inspecting Archers in Matches ---\n";
$stmt = $pdo->prepare("
    SELECT 
        tmt.team_name,
        tmt.school,
        GROUP_CONCAT(CONCAT(a.first_name, ' ', a.last_name) SEPARATOR ', ') as roster
    FROM team_matches tm
    JOIN team_match_teams tmt ON tmt.match_id = tm.id
    JOIN team_match_archers tma ON tma.team_id = tmt.id
    JOIN archers a ON a.id = tma.archer_id
    WHERE tm.bracket_id = ?
    GROUP BY tmt.team_name, tmt.school
    ORDER BY tmt.school, tmt.team_name
");
$stmt->execute([$bracketId]);
$rosters = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($rosters as $r) {
    echo "  School: {$r['school']} | Team: {$r['team_name']} -> {$r['roster']}\n";
}
