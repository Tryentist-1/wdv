<?php
require_once 'api/db.php';
require_once 'api/config.php';

$pdo = db();
$bracketId = '4c81afa8-36a9-4e31-86db-cfa564732c6e';

echo "--- Entries for Bracket: $bracketId ---\n";
$stmt = $pdo->prepare("SELECT * FROM bracket_entries WHERE bracket_id = ?");
$stmt->execute([$bracketId]);
$entries = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Total Entries: " . count($entries) . "\n";
print_r($entries);
