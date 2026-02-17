<?php
require_once 'api/db.php';
require_once 'api/config.php';

$pdo = db();
$archerId = '3c5b458b-4d0e-4156-91ad-5b542e631e52'; // Ethan De La Torre

echo "--- Debugging Archer: $archerId ---\n";

// 1. Check direct bracket entries
$stmt = $pdo->prepare("SELECT * FROM bracket_entries WHERE archer_id = ?");
$stmt->execute([$archerId]);
$entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Direct Bracket Entries: " . count($entries) . "\n";
print_r($entries);

// 2. Check team match archers
$stmt = $pdo->prepare("SELECT * FROM team_match_archers WHERE archer_id = ?");
$stmt->execute([$archerId]);
$matches = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Team Match Archers Entries: " . count($matches) . "\n";
print_r($matches);

// 3. Check if team match has a valid bracket
if (!empty($matches)) {
    $matchId = $matches[0]['match_id'];
    $stmt = $pdo->prepare("SELECT id, bracket_id FROM team_matches WHERE id = ?");
    $stmt->execute([$matchId]);
    $match = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Match Info:\n";
    print_r($match);

    if ($match) {
        $stmt = $pdo->prepare("SELECT * FROM brackets WHERE id = ?");
        $stmt->execute([$match['bracket_id']]);
        $bracket = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "Bracket Info:\n";
        print_r($bracket);
    }
}
