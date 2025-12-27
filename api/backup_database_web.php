<?php
/**
 * Web-Accessible Database Backup Endpoint
 * 
 * Secured with passcode authentication
 * 
 * Usage:
 *   curl "https://archery.tryentist.com/api/backup_database_web.php?passcode=wdva26" -o backup.sql
 * 
 * Or via browser (will download file):
 *   https://archery.tryentist.com/api/backup_database_web.php?passcode=wdva26
 */

require_once __DIR__ . '/config.php';

// Check passcode
$passcode = $_GET['passcode'] ?? '';
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
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Unauthorized - valid passcode required']);
    exit;
}

// Create backups directory on server
$backupDir = __DIR__ . '/../backups';
if (!is_dir($backupDir)) {
    mkdir($backupDir, 0755, true);
}

$timestamp = date('Ymd_His');
$backupFile = $backupDir . '/db_backup_' . $timestamp . '.sql';

try {
    require_once __DIR__ . '/db.php';
    $pdo = db();
    
    // Get database name from DSN
    preg_match('/dbname=([^;]+)/', DB_DSN, $matches);
    $dbName = $matches[1] ?? 'wdv';
    
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
    $tableStats = [];
    
    foreach ($tables as $table) {
        // Check if table exists
        $check = $pdo->prepare("SHOW TABLES LIKE ?");
        $check->execute([$table]);
        if (!$check->fetch()) {
            $tableStats[$table] = 0;
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
        $tableStats[$table] = $rowCount;
        
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
    }
    
    $sql .= "SET FOREIGN_KEY_CHECKS=1;\n";
    $sql .= "COMMIT;\n";
    
    // Write to file on server
    file_put_contents($backupFile, $sql);
    
    // Also output to browser/download
    header('Content-Type: application/sql');
    header('Content-Disposition: attachment; filename="wdv_backup_' . $timestamp . '.sql"');
    header('Content-Length: ' . strlen($sql));
    
    echo $sql;
    
    // Log backup creation (server-side only)
    error_log("Database backup created: $backupFile (Total rows: $totalRows)");
    
} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Backup failed',
        'message' => $e->getMessage()
    ]);
    error_log("Database backup failed: " . $e->getMessage());
    exit(1);
}

