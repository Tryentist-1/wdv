<?php
require_once 'api/db.php';
require_once 'api/config.php';

// disable error reporting for clean output
error_reporting(E_ALL);
ini_set('display_errors', 1);

$pdo = db();

// Find an archer involved in a recent team match
echo "Finding active team match archer...\n";
$stmt = $pdo->query("
    SELECT tma.archer_id, a.first_name, a.last_name, tm.id as match_id, tm.bracket_id
    FROM team_match_archers tma
    JOIN team_matches tm ON tm.id = tma.match_id
    JOIN archers a ON a.id = tma.archer_id
    WHERE tm.status IN ('Not Started', 'PENDING', 'In Progress')
    ORDER BY tm.created_at DESC
    LIMIT 1
");
$archer = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$archer) {
    echo "No active team match found.\n";
    exit;
}

$archerId = $archer['archer_id'];
echo "Testing for Archer: {$archer['first_name']} {$archer['last_name']} (ID: $archerId)\n";
echo "Expected Match ID: {$archer['match_id']}\n";

// Simulate the API logic
echo "\n--- Simulating API Logic ---\n";

// Get bracket entries
$stmt = $pdo->prepare('
    SELECT 
        be.id as entry_id,
        be.bracket_id,
        b.bracket_type,
        b.bracket_format
    FROM bracket_entries be
    JOIN brackets b ON b.id = be.bracket_id
    WHERE be.archer_id = ?
');
$stmt->execute([$archerId]);
$entries = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Found " . count($entries) . " bracket entries.\n";

foreach ($entries as $entry) {
    echo "Checking Entry for Bracket: {$entry['bracket_id']} ({$entry['bracket_format']})\n";

    if ($entry['bracket_format'] === 'SWISS') {
        // Test Team Match Query
        $teamMatchStmt = $pdo->prepare('
            SELECT tm.id as match_id, tm.bale_number, tm.line_number, tm.wave, tm.bracket_match_id,
                   tmt_opp.team_name as opponent_team_name, tmt_opp.school as opponent_school
            FROM team_matches tm
            JOIN team_match_archers tma ON tma.match_id = tm.id AND tma.archer_id = ?
            JOIN team_match_teams tmt_self ON tmt_self.match_id = tm.id AND tmt_self.id = tma.team_id
            JOIN team_match_teams tmt_opp ON tmt_opp.match_id = tm.id AND tmt_opp.id != tma.team_id
            WHERE tm.bracket_id = ? AND tm.status IN ("Not Started", "PENDING", "In Progress")
            ORDER BY tm.created_at DESC
            LIMIT 1
        ');
        $teamMatchStmt->execute([$archerId, $entry['bracket_id']]);
        $match = $teamMatchStmt->fetch(PDO::FETCH_ASSOC);

        if ($match) {
            echo "  [SUCCESS] Found Team Match: {$match['match_id']}\n";
            echo "  Opponent: {$match['opponent_team_name']}\n";
        } else {
            echo "  [FAIL] No Team Match found (might be Solo bracket?)\n";
        }
    }
}

echo "\n--- Testing New Supplementary Logic (Team Matches without Entries) ---\n";
$teamMatchStmt = $pdo->prepare('
    SELECT 
        tm.id as match_id, 
        tm.bracket_id, 
        tm.bracket_match_id, 
        tm.bale_number, 
        tmt_self.school as my_school, 
        tmt_self.team_name as my_team_name,
        tmt_opp.school as opp_school, 
        tmt_opp.team_name as opp_team_name
    FROM team_matches tm
    JOIN team_match_archers tma ON tma.match_id = tm.id AND tma.archer_id = ?
    JOIN brackets b ON b.id = tm.bracket_id
    JOIN team_match_teams tmt_self ON tmt_self.match_id = tm.id AND tmt_self.id = tma.team_id
    JOIN team_match_teams tmt_opp ON tmt_opp.match_id = tm.id AND tmt_opp.id != tma.team_id
    WHERE tm.status IN ("Not Started", "PENDING", "In Progress")
    ORDER BY tm.created_at DESC
');
$teamMatchStmt->execute([$archerId]);
$teamMatches = $teamMatchStmt->fetchAll(PDO::FETCH_ASSOC);

echo "Found " . count($teamMatches) . " supplemental team matches.\n";
foreach ($teamMatches as $tm) {
    echo "  [SUCCESS] Match ID: {$tm['match_id']}\n";
    echo "  My Team: {$tm['my_team_name']} ({$tm['my_school']})\n";
    echo "  Opponent: {$tm['opp_team_name']} ({$tm['opp_school']})\n";
    echo "  Bracket ID: {$tm['bracket_id']}\n";
}
