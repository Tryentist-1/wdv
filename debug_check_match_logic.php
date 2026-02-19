<?php
// debug_check_match_logic.php
header('Content-Type: text/plain');

$file = 'api/index.php';
if (!file_exists($file)) {
    die("File not found");
}

$lines = file($file);
$start = 9160;
$end = 9180;

echo "--- Checking lines $start to $end of $file ---\n";
for ($i = $start; $i <= $end; $i++) {
    if (isset($lines[$i - 1])) {
        echo "$i: " . $lines[$i - 1];
    }
}
echo "\n--- End Check ---\n";
