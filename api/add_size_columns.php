<?php
/**
 * Quick migration script to add shirt_size, pant_size, hat_size columns
 * Run this once on production database
 * 
 * Usage: php add_size_columns.php
 * Or visit: https://archery.tryentist.com/api/add_size_columns.php
 */

require_once __DIR__ . '/db.php';

try {
    $pdo = db();
    
    // Check and add shirt_size
    $check = $pdo->query("SHOW COLUMNS FROM archers LIKE 'shirt_size'");
    if ($check->rowCount() === 0) {
        $pdo->exec("ALTER TABLE archers ADD COLUMN shirt_size VARCHAR(10) NULL COMMENT 'Shirt size (S, M, L, XL, 2X, 3X, XS)' AFTER var_pr");
        echo "✅ Added shirt_size column\n";
    } else {
        echo "ℹ️  shirt_size column already exists\n";
    }
    
    // Check and add pant_size
    $check = $pdo->query("SHOW COLUMNS FROM archers LIKE 'pant_size'");
    if ($check->rowCount() === 0) {
        $pdo->exec("ALTER TABLE archers ADD COLUMN pant_size VARCHAR(10) NULL COMMENT 'Pant size' AFTER shirt_size");
        echo "✅ Added pant_size column\n";
    } else {
        echo "ℹ️  pant_size column already exists\n";
    }
    
    // Check and add hat_size
    $check = $pdo->query("SHOW COLUMNS FROM archers LIKE 'hat_size'");
    if ($check->rowCount() === 0) {
        $pdo->exec("ALTER TABLE archers ADD COLUMN hat_size VARCHAR(10) NULL COMMENT 'Hat size' AFTER pant_size");
        echo "✅ Added hat_size column\n";
    } else {
        echo "ℹ️  hat_size column already exists\n";
    }
    
    echo "\n✅ Migration complete! All size columns added.\n";
    
    // If run via web, return JSON
    if (php_sapi_name() !== 'cli') {
        header('Content-Type: application/json');
        echo json_encode(['ok' => true, 'message' => 'Size columns added successfully']);
    }
    
} catch (Exception $e) {
    $error = "Migration failed: " . $e->getMessage();
    echo "❌ $error\n";
    
    if (php_sapi_name() !== 'cli') {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => $error]);
    }
    exit(1);
}
