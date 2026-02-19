<?php
// debug_check_api_code.php
header('Content-Type: text/plain');

$file = 'api/index.php';
if (!file_exists($file)) {
    die("File not found");
}

$lines = file($file);
$start = 8900;
$end = 8920;

echo "--- Checking lines $start to $end of $file ---\n";
for ($i = $start; $i <= $end; $i++) {
    if (isset($lines[$i - 1])) {
        echo "$i: " . $lines[$i - 1];
    }
}
echo "\n--- End Check ---\n";
