<?php
/**
 * Database Backup Script
 * 
 * Safely exports critical production tables to SQL dump file
 * 
 * Usage: php api/backup_database.php
 * 
 * Output: backups/db_backup_YYYYMMDD_HHMMSS.sql
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/config.php';

// Create backups directory if it doesn't exist
$backupDir = __DIR__ . '/../backups';
if (!is_dir($backupDir)) {
    mkdir($backupDir, 0755, true);
}

$timestamp = date('Ymd_His');
$backupFile = $backupDir . '/db_backup_' . $timestamp . '.sql';

echo "📦 Database Backup Script\n";
echo "========================\n\n";

try {
    $pdo = db();
    
    // Test connection
    $pdo->query('SELECT 1');
    echo "✅ Database connection successful\n\n";
    
    // Get database name from DSN
    preg_match('/dbname=([^;]+)/', DB_DSN, $matches);
    $dbName = $matches[1] ?? 'wdv';
    
    echo "📋 Backing up database: $dbName\n";
    echo "📁 Output file: $backupFile\n\n";
    
    // Tables to backup (critical production data)
    $tables = [
        'events',
        'rounds', 
        'round_archers',
        'end_events',
        'archers'
    ];
    
    $sql = "-- Database Backup\n";
    $sql .= "-- Generated: " . date('Y-m-d H:i:s') . "\n";
    $sql .= "-- Database: $dbName\n\n";
    $sql .= "SET FOREIGN_KEY_CHECKS=0;\n";
    $sql .= "SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';\n";
    $sql .= "SET AUTOCOMMIT=0;\n";
    $sql .= "START TRANSACTION;\n\n";
    
    $totalRows = 0;
    
    foreach ($tables as $table) {
        echo "📊 Backing up table: $table ... ";
        
        // Check if table exists
        $check = $pdo->prepare("SHOW TABLES LIKE ?");
        $check->execute([$table]);
        if (!$check->fetch()) {
            echo "⚠️  Table not found, skipping\n";
            continue;
        }
        
        // Get table structure
        $createTable = $pdo->query("SHOW CREATE TABLE `$table`");
        $createRow = $createTable->fetch();
        $sql .= "-- Table structure for `$table`\n";
        $sql .= "DROP TABLE IF EXISTS `$table`;\n";
        $sql .= $createRow['Create Table'] . ";\n\n";
        
        // Get table data
        $stmt = $pdo->query("SELECT * FROM `$table`");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $rowCount = count($rows);
        $totalRows += $rowCount;
        
        if ($rowCount > 0) {
            $sql .= "-- Data for table `$table` ($rowCount rows)\n";
            $sql .= "LOCK TABLES `$table` WRITE;\n";
            
            // Get column names
            $columns = array_keys($rows[0]);
            $columnList = '`' . implode('`, `', $columns) . '`';
            
            // Insert data in batches
            $batchSize = 100;
            for ($i = 0; $i < $rowCount; $i += $batchSize) {
                $batch = array_slice($rows, $i, $batchSize);
                $sql .= "INSERT INTO `$table` ($columnList) VALUES\n";
                
                $values = [];
                foreach ($batch as $row) {
                    $rowValues = [];
                    foreach ($row as $value) {
                        if ($value === null) {
                            $rowValues[] = 'NULL';
                        } else {
                            // Escape and quote
                            $escaped = str_replace(['\\', "'", "\n", "\r"], ['\\\\', "\\'", "\\n", "\\r"], $value);
                            $rowValues[] = "'$escaped'";
                        }
                    }
                    $values[] = '(' . implode(', ', $rowValues) . ')';
                }
                
                $sql .= implode(",\n", $values) . ";\n";
            }
            
            $sql .= "UNLOCK TABLES;\n\n";
        } else {
            $sql .= "-- No data in table `$table`\n\n";
        }
        
        echo "✅ $rowCount rows\n";
    }
    
    $sql .= "SET FOREIGN_KEY_CHECKS=1;\n";
    $sql .= "COMMIT;\n";
    
    // Write to file
    file_put_contents($backupFile, $sql);
    
    $fileSize = filesize($backupFile);
    $fileSizeMB = round($fileSize / 1024 / 1024, 2);
    
    echo "\n";
    echo "✅ Backup completed successfully!\n";
    echo "📊 Total rows backed up: $totalRows\n";
    echo "💾 File size: $fileSizeMB MB\n";
    echo "📁 Location: $backupFile\n";
    echo "\n";
    
    // Also create a summary of what was backed up
    $summaryFile = $backupDir . '/db_backup_' . $timestamp . '_summary.txt';
    $summary = "Database Backup Summary\n";
    $summary .= "======================\n\n";
    $summary .= "Timestamp: " . date('Y-m-d H:i:s') . "\n";
    $summary .= "Database: $dbName\n";
    $summary .= "Backup file: db_backup_$timestamp.sql\n";
    $summary .= "File size: $fileSizeMB MB\n\n";
    $summary .= "Tables backed up:\n";
    foreach ($tables as $table) {
        $count = $pdo->query("SELECT COUNT(*) FROM `$table`")->fetchColumn();
        $summary .= "  - $table: $count rows\n";
    }
    $summary .= "\nTotal rows: $totalRows\n";
    
    file_put_contents($summaryFile, $summary);
    echo "📄 Summary saved to: $summaryFile\n";
    
} catch (Exception $e) {
    echo "\n❌ ERROR: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}

