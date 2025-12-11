<?php
require_once __DIR__ . '/config.php';

try {
    $pdo = new PDO(DB_DSN, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    
    echo "Checking rounds table schema...\n";
    
    // Check if entry_code column exists
    $stmt = $pdo->query("SHOW COLUMNS FROM rounds LIKE 'entry_code'");
    $columnExists = $stmt->rowCount() > 0;
    
    if ($columnExists) {
        echo "✅ entry_code column already exists\n";
        
        // Verify the column details
        $stmt = $pdo->query("SHOW COLUMNS FROM rounds WHERE Field = 'entry_code'");
        $column = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "   Type: {$column['Type']}\n";
        echo "   Null: {$column['Null']}\n";
        
        // Check if index exists
        $stmt = $pdo->query("SHOW INDEX FROM rounds WHERE Key_name = 'idx_rounds_entry_code'");
        $indexExists = $stmt->rowCount() > 0;
        
        if ($indexExists) {
            echo "✅ idx_rounds_entry_code index already exists\n";
        } else {
            echo "⚠️  Index missing, adding...\n";
            $pdo->exec("ALTER TABLE rounds ADD UNIQUE INDEX idx_rounds_entry_code (entry_code)");
            echo "✅ Index added\n";
        }
    } else {
        echo "❌ entry_code column does not exist\n";
        echo "Running migration...\n";
        
        // Add column
        $pdo->exec("ALTER TABLE rounds ADD COLUMN entry_code VARCHAR(25) NULL COMMENT 'Entry code for standalone rounds (e.g., R300-60CM-1201-A2D)'");
        echo "✅ Added entry_code column\n";
        
        // Add index
        $pdo->exec("ALTER TABLE rounds ADD UNIQUE INDEX idx_rounds_entry_code (entry_code)");
        echo "✅ Added idx_rounds_entry_code index\n";
    }
    
    echo "\nMigration complete!\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}





