<?php
/**
 * Database Backup Admin Interface
 * 
 * Web interface for creating database backups with customizable options
 * 
 * Usage:
 *   https://archery.tryentist.com/api/backup_admin.php?passcode=wdva26
 */

require_once __DIR__ . '/config.php';

// Check passcode
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
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <title>Database Backup - Unauthorized</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 5px; color: #c00; }
        </style>
    </head>
    <body>
        <div class="error">
            <h2>❌ Unauthorized</h2>
            <p>Valid passcode required to access this page.</p>
            <p>Add <code>?passcode=YOUR_PASSCODE</code> to the URL.</p>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// Handle backup request
$action = $_POST['action'] ?? 'form';
$backupDir = __DIR__ . '/../backups';
if (!is_dir($backupDir)) {
    mkdir($backupDir, 0755, true);
}

if ($action === 'create_backup') {
    // Get parameters
    $selectedTables = $_POST['tables'] ?? [];
    $includeStructure = isset($_POST['include_structure']) && $_POST['include_structure'] === '1';
    $includeData = isset($_POST['include_data']) && $_POST['include_data'] === '1';
    $format = $_POST['format'] ?? 'sql';
    
    if (empty($selectedTables)) {
        $error = "Please select at least one table to backup.";
    } else {
        try {
            require_once __DIR__ . '/db.php';
            $pdo = db();
            
            // Get database name from DSN
            preg_match('/dbname=([^;]+)/', DB_DSN, $matches);
            $dbName = $matches[1] ?? 'wdv';
            
            $timestamp = date('Ymd_His');
            $backupFile = $backupDir . '/db_backup_' . $timestamp . '.sql';
            
            $sql = "-- Database Backup\n";
            $sql .= "-- Generated: " . date('Y-m-d H:i:s') . "\n";
            $sql .= "-- Database: $dbName\n";
            $sql .= "-- Tables: " . implode(', ', $selectedTables) . "\n\n";
            
            if ($includeStructure || $includeData) {
                $sql .= "SET FOREIGN_KEY_CHECKS=0;\n";
                $sql .= "SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';\n";
                $sql .= "SET AUTOCOMMIT=0;\n";
                $sql .= "START TRANSACTION;\n\n";
            }
            
            $totalRows = 0;
            $tableStats = [];
            
            foreach ($selectedTables as $table) {
                // Check if table exists
                $check = $pdo->prepare("SHOW TABLES LIKE ?");
                $check->execute([$table]);
                if (!$check->fetch()) {
                    $tableStats[$table] = ['rows' => 0, 'status' => 'not_found'];
                    continue;
                }
                
                if ($includeStructure) {
                    // Get table structure
                    $createTable = $pdo->query("SHOW CREATE TABLE `$table`");
                    $createRow = $createTable->fetch();
                    $sql .= "-- Table structure for `$table`\n";
                    $sql .= "DROP TABLE IF EXISTS `$table`;\n";
                    $sql .= $createRow['Create Table'] . ";\n\n";
                }
                
                if ($includeData) {
                    // Get table data
                    $stmt = $pdo->query("SELECT * FROM `$table`");
                    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    $rowCount = count($rows);
                    $totalRows += $rowCount;
                    $tableStats[$table] = ['rows' => $rowCount, 'status' => 'success'];
                    
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
            }
            
            if ($includeStructure || $includeData) {
                $sql .= "SET FOREIGN_KEY_CHECKS=1;\n";
                $sql .= "COMMIT;\n";
            }
            
            // Write to file on server
            file_put_contents($backupFile, $sql);
            $fileSize = filesize($backupFile);
            $fileSizeMB = round($fileSize / 1024 / 1024, 2);
            
            // Output or download based on format
            if ($format === 'download') {
                header('Content-Type: application/sql');
                header('Content-Disposition: attachment; filename="wdv_backup_' . $timestamp . '.sql"');
                header('Content-Length: ' . strlen($sql));
                echo $sql;
                exit;
            } else {
                // Show success message
                $success = true;
                $backupInfo = [
                    'file' => basename($backupFile),
                    'size' => $fileSizeMB,
                    'rows' => $totalRows,
                    'tables' => $tableStats
                ];
            }
            
        } catch (Exception $e) {
            $error = "Backup failed: " . $e->getMessage();
        }
    }
}

// Get available tables
try {
    require_once __DIR__ . '/db.php';
    $pdo = db();
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    
    // Get table row counts
    $tableInfo = [];
    foreach ($tables as $table) {
        $count = $pdo->query("SELECT COUNT(*) FROM `$table`")->fetchColumn();
        $tableInfo[$table] = $count;
    }
} catch (Exception $e) {
    $tables = [];
    $tableInfo = [];
    $error = "Could not connect to database: " . $e->getMessage();
}

// List existing backups
$existingBackups = [];
if (is_dir($backupDir)) {
    $files = glob($backupDir . '/db_backup_*.sql');
    rsort($files); // Most recent first
    foreach ($files as $file) {
        $existingBackups[] = [
            'name' => basename($file),
            'size' => filesize($file),
            'date' => filemtime($file)
        ];
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Database Backup Admin</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
            max-width: 900px; 
            margin: 20px auto; 
            padding: 20px; 
            background: #f5f5f5;
        }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { margin-top: 0; color: #333; }
        h2 { color: #555; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
        .form-group { margin: 20px 0; }
        label { display: block; margin-bottom: 8px; font-weight: 600; color: #444; }
        .checkbox-group { 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); 
            gap: 10px; 
            max-height: 300px; 
            overflow-y: auto;
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 4px;
            background: #fafafa;
        }
        .checkbox-item { display: flex; align-items: center; gap: 8px; }
        .checkbox-item input[type="checkbox"] { width: auto; }
        .checkbox-item label { margin: 0; font-weight: normal; }
        .table-count { color: #666; font-size: 0.9em; margin-left: 5px; }
        input[type="text"], select { 
            width: 100%; 
            padding: 10px; 
            border: 1px solid #ddd; 
            border-radius: 4px; 
            font-size: 14px;
        }
        .checkbox-options { display: flex; gap: 20px; margin: 15px 0; }
        .checkbox-options label { display: flex; align-items: center; gap: 8px; font-weight: normal; }
        button { 
            background: #007cba; 
            color: white; 
            border: none; 
            padding: 12px 24px; 
            border-radius: 4px; 
            font-size: 16px; 
            cursor: pointer;
            margin-right: 10px;
        }
        button:hover { background: #005a87; }
        button.secondary { background: #666; }
        button.secondary:hover { background: #555; }
        .success { 
            background: #d4edda; 
            border: 1px solid #c3e6cb; 
            color: #155724; 
            padding: 15px; 
            border-radius: 4px; 
            margin: 20px 0;
        }
        .error { 
            background: #f8d7da; 
            border: 1px solid #f5c6cb; 
            color: #721c24; 
            padding: 15px; 
            border-radius: 4px; 
            margin: 20px 0;
        }
        .backup-list { margin-top: 30px; }
        .backup-item { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 10px; 
            border: 1px solid #ddd; 
            margin: 5px 0; 
            border-radius: 4px;
            background: #fafafa;
        }
        .backup-item:hover { background: #f0f0f0; }
        .backup-info { flex: 1; }
        .backup-actions { display: flex; gap: 10px; }
        .backup-actions a { 
            padding: 6px 12px; 
            background: #007cba; 
            color: white; 
            text-decoration: none; 
            border-radius: 4px; 
            font-size: 14px;
        }
        .backup-actions a:hover { background: #005a87; }
        .stats { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
            gap: 15px; 
            margin: 20px 0;
        }
        .stat-box { 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 4px; 
            text-align: center;
            border: 1px solid #dee2e6;
        }
        .stat-box .stat-value { font-size: 24px; font-weight: bold; color: #007cba; }
        .stat-box .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📦 Database Backup Admin</h1>
        
        <?php if (isset($success) && $success): ?>
            <div class="success">
                <h3>✅ Backup Created Successfully!</h3>
                <p><strong>File:</strong> <?= htmlspecialchars($backupInfo['file']) ?></p>
                <p><strong>Size:</strong> <?= number_format($backupInfo['size'], 2) ?> MB</p>
                <p><strong>Total Rows:</strong> <?= number_format($backupInfo['rows']) ?></p>
                <p><strong>Tables:</strong></p>
                <ul>
                    <?php foreach ($backupInfo['tables'] as $table => $info): ?>
                        <li><?= htmlspecialchars($table) ?>: <?= number_format($info['rows']) ?> rows</li>
                    <?php endforeach; ?>
                </ul>
                <p><a href="?passcode=<?= urlencode($passcode) ?>">Create Another Backup</a></p>
            </div>
        <?php endif; ?>
        
        <?php if (isset($error)): ?>
            <div class="error">
                <h3>❌ Error</h3>
                <p><?= htmlspecialchars($error) ?></p>
            </div>
        <?php endif; ?>
        
        <form method="POST" action="">
            <input type="hidden" name="passcode" value="<?= htmlspecialchars($passcode) ?>">
            <input type="hidden" name="action" value="create_backup">
            
            <h2>Select Tables</h2>
            <div class="form-group">
                <div class="checkbox-group">
                    <?php foreach ($tables as $table): ?>
                        <div class="checkbox-item">
                            <input type="checkbox" name="tables[]" value="<?= htmlspecialchars($table) ?>" id="table_<?= htmlspecialchars($table) ?>" checked>
                            <label for="table_<?= htmlspecialchars($table) ?>">
                                <?= htmlspecialchars($table) ?>
                                <span class="table-count">(<?= number_format($tableInfo[$table] ?? 0) ?> rows)</span>
                            </label>
                        </div>
                    <?php endforeach; ?>
                </div>
                <div style="margin-top: 10px;">
                    <button type="button" onclick="document.querySelectorAll('input[type=checkbox]').forEach(c => c.checked = true)">Select All</button>
                    <button type="button" onclick="document.querySelectorAll('input[type=checkbox]').forEach(c => c.checked = false)">Deselect All</button>
                </div>
            </div>
            
            <h2>Backup Options</h2>
            <div class="form-group">
                <div class="checkbox-options">
                    <label>
                        <input type="checkbox" name="include_structure" value="1" checked>
                        Include Table Structure (CREATE TABLE)
                    </label>
                    <label>
                        <input type="checkbox" name="include_data" value="1" checked>
                        Include Data (INSERT statements)
                    </label>
                </div>
            </div>
            
            <div class="form-group">
                <label for="format">Output Format:</label>
                <select name="format" id="format">
                    <option value="save">Save to Server</option>
                    <option value="download">Download Immediately</option>
                </select>
            </div>
            
            <div class="form-group">
                <button type="submit">📥 Create Backup</button>
                <a href="?passcode=<?= urlencode($passcode) ?>" class="button secondary" style="text-decoration: none; display: inline-block;">Cancel</a>
            </div>
        </form>
        
        <?php if (!empty($existingBackups)): ?>
            <div class="backup-list">
                <h2>Existing Backups</h2>
                <?php foreach (array_slice($existingBackups, 0, 10) as $backup): ?>
                    <div class="backup-item">
                        <div class="backup-info">
                            <strong><?= htmlspecialchars($backup['name']) ?></strong><br>
                            <small><?= date('Y-m-d H:i:s', $backup['date']) ?> • <?= number_format($backup['size'] / 1024, 2) ?> KB</small>
                        </div>
                        <div class="backup-actions">
                            <a href="../backups/<?= htmlspecialchars($backup['name']) ?>" download>Download</a>
                        </div>
                    </div>
                <?php endforeach; ?>
                <?php if (count($existingBackups) > 10): ?>
                    <p><em>Showing 10 most recent backups. Total: <?= count($existingBackups) ?> backups.</em></p>
                <?php endif; ?>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>

