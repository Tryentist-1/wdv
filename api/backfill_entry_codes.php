<?php
/**
 * Backfill entry codes for standalone rounds that were created without them
 * 
 * Run this script to fix standalone rounds that have entry_code = NULL
 * 
 * Usage (CLI): php backfill_entry_codes.php [--dry-run]
 * Usage (Web): /api/backfill_entry_codes.php?passcode=xxx&action=execute
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

// Check if running from CLI or web
$isCli = php_sapi_name() === 'cli';

// Web authentication
if (!$isCli) {
    $passcode = $_GET['passcode'] ?? $_POST['passcode'] ?? '';
    $authorized = false;
    
    if (strlen($passcode) > 0 && strtolower($passcode) === strtolower(PASSCODE)) {
        $authorized = true;
    }
    
    // Also check X-Passcode header
    if (!$authorized) {
        $headerPasscode = $_SERVER['HTTP_X_PASSCODE'] ?? '';
        if (strlen($headerPasscode) > 0 && strtolower($headerPasscode) === strtolower(PASSCODE)) {
            $authorized = true;
        }
    }
    
    if (!$authorized) {
        http_response_code(401);
        header('Content-Type: text/plain');
        echo "Unauthorized. Passcode required.\n";
        exit;
    }
    
    header('Content-Type: text/plain');
}

// Parse arguments
$dryRun = $isCli 
    ? in_array('--dry-run', $argv ?? [])
    : ($_GET['action'] ?? 'preview') !== 'execute';

echo "=== Backfill Entry Codes for Standalone Rounds ===\n";
echo "Mode: " . ($dryRun ? "DRY RUN (no changes will be made)" : "LIVE (changes will be committed)") . "\n\n";

// Include the entry code generation function from index.php
function generate_round_entry_code(PDO $pdo, string $roundType, string $level, string $date): string {
    // Map level to target size
    $targetSize = (strtoupper($level) === 'VAR' || strtoupper($level) === 'VARSITY') ? '40CM' : '60CM';
    
    // Get MMDD from date (YYYY-MM-DD format)
    $dateParts = explode('-', $date);
    $mmdd = ($dateParts[1] ?? '01') . ($dateParts[2] ?? '01'); // MM + DD
    
    // Generate random 3-character alphanumeric suffix (A-Z, 0-9)
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $random = '';
    for ($i = 0; $i < 3; $i++) {
        $random .= $chars[random_int(0, strlen($chars) - 1)];
    }
    
    // Format: {ROUNDTYPE}-{TARGETSIZE}-{MMDD}-{RANDOM}
    // Example: R300-60CM-1201-A2D
    $roundTypeUpper = strtoupper($roundType);
    $baseCode = "{$roundTypeUpper}-{$targetSize}-{$mmdd}-";
    $code = $baseCode . $random;
    
    // Check for uniqueness
    $attempts = 0;
    
    do {
        $stmt = $pdo->prepare('SELECT id FROM rounds WHERE entry_code = ? LIMIT 1');
        $stmt->execute([$code]);
        if ($stmt->fetch()) {
            // Regenerate random suffix
            $random = '';
            for ($i = 0; $i < 3; $i++) {
                $random .= $chars[random_int(0, strlen($chars) - 1)];
            }
            $code = $baseCode . $random;
            $attempts++;
        } else {
            break;
        }
    } while ($attempts < 10);
    
    // If still not unique after 10 attempts, add a counter
    if ($attempts >= 10) {
        $counter = 1;
        do {
            $code = $baseCode . $random . $counter;
            $stmt = $pdo->prepare('SELECT id FROM rounds WHERE entry_code = ? LIMIT 1');
            $stmt->execute([$code]);
            if ($stmt->fetch()) {
                $counter++;
            } else {
                break;
            }
        } while (true);
    }
    
    return $code;
}

try {
    $pdo = db();
    
    // Find all standalone rounds without entry codes
    $stmt = $pdo->query("
        SELECT 
            r.id,
            r.round_type,
            r.division,
            r.level,
            r.date,
            r.created_at,
            COUNT(ra.id) as archer_count
        FROM rounds r
        LEFT JOIN round_archers ra ON ra.round_id = r.id
        WHERE r.event_id IS NULL 
          AND r.entry_code IS NULL
        GROUP BY r.id, r.round_type, r.division, r.level, r.date, r.created_at
        ORDER BY r.created_at DESC
    ");
    
    $rounds = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($rounds)) {
        echo "✅ No standalone rounds found with missing entry codes.\n";
        exit(0);
    }
    
    echo "Found " . count($rounds) . " standalone round(s) without entry codes:\n\n";
    
    $updated = 0;
    $errors = 0;
    
    foreach ($rounds as $round) {
        $id = $round['id'];
        $roundType = $round['round_type'] ?? 'R300';
        $level = $round['level'] ?? 'JV'; // Default to JV if level unknown
        $date = $round['date'] ?? date('Y-m-d');
        $archerCount = $round['archer_count'];
        
        echo "Round: {$id}\n";
        echo "  Type: {$roundType}, Level: {$level}, Date: {$date}\n";
        echo "  Archers: {$archerCount}, Created: {$round['created_at']}\n";
        
        // Generate entry code
        $entryCode = generate_round_entry_code($pdo, $roundType, $level, $date);
        echo "  Generated code: {$entryCode}\n";
        
        if (!$dryRun) {
            try {
                $update = $pdo->prepare('UPDATE rounds SET entry_code = ? WHERE id = ?');
                $update->execute([$entryCode, $id]);
                echo "  ✅ Updated successfully\n";
                $updated++;
            } catch (Exception $e) {
                echo "  ❌ Error: " . $e->getMessage() . "\n";
                $errors++;
            }
        } else {
            echo "  (dry run - no changes made)\n";
            $updated++;
        }
        
        echo "\n";
    }
    
    echo "=== Summary ===\n";
    echo "Total rounds processed: " . count($rounds) . "\n";
    echo "Successfully updated: {$updated}\n";
    echo "Errors: {$errors}\n";
    
    if ($dryRun) {
        echo "\nThis was a DRY RUN. Run without --dry-run to apply changes.\n";
    }
    
} catch (Exception $e) {
    echo "❌ Fatal error: " . $e->getMessage() . "\n";
    exit(1);
}

