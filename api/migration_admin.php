<?php
/**
 * Database Migration Admin Interface
 * 
 * Web interface for safely executing database migrations with preview and verification
 * 
 * Usage:
 *   https://tryentist.com/wdv/api/migration_admin.php?passcode=wdva26
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
        <title>Migration Admin - Unauthorized</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 5px; color: #c00; }
        </style>
    </head>
    <body>
        <div class="error">
            <h2>❌ Unauthorized</h2>
            <p>Valid passcode required to access this page.</p>
        </div>
    </body>
    </html>
    <?php
    exit;
}

try {
    require_once __DIR__ . '/db.php';
    $pdo = db();
} catch (Exception $e) {
    die("Database connection failed: " . $e->getMessage());
}

// Migration configuration
$migrations = [
    'fix_undefined_division_tryout_round2' => [
        'name' => 'Fix Undefined Division - Tryout Round 2',
        'description' => 'Move 18 archers from undefined round to OPEN division',
        'undefined_round_id' => '9319e5c5-1afb-4856-bb8c-b613105bfec0',
        'target_round_id' => 'fa473a27-989d-4f6a-ba6f-92ef36642364',
        'event_id' => '87b0fdc6-8b0a-484b-9e15-cf58e2533e4d',
        'event_name' => 'Tryout Round 2'
    ]
];

$action = $_POST['action'] ?? 'preview';
$migrationId = $_POST['migration_id'] ?? 'fix_undefined_division_tryout_round2';
$migration = $migrations[$migrationId] ?? null;

if (!$migration) {
    die("Invalid migration ID");
}

// Execute action
$result = null;
$error = null;

if ($action === 'preview') {
    // Preview what will be changed
    try {
        $preview = [];
        
        // Preview round_archers to update
        $stmt = $pdo->prepare("
            SELECT 
                ra.id as round_archer_id,
                ra.archer_name,
                ra.school,
                ra.level,
                ra.gender,
                ra.bale_number,
                ra.target_assignment,
                ra.round_id as current_round_id,
                COUNT(DISTINCT ee.id) as ends_scored,
                MAX(ee.running_total) as highest_total
            FROM round_archers ra
            LEFT JOIN end_events ee ON ee.round_archer_id = ra.id
            WHERE ra.round_id = ?
            GROUP BY ra.id, ra.archer_name, ra.school, ra.level, ra.gender, ra.bale_number, ra.target_assignment, ra.round_id
            ORDER BY ra.bale_number, ra.target_assignment
        ");
        $stmt->execute([$migration['undefined_round_id']]);
        $preview['archers'] = $stmt->fetchAll();
        
        // Preview end_events to update
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total_ends,
                COUNT(DISTINCT round_archer_id) as unique_archers,
                MIN(end_number) as min_end,
                MAX(end_number) as max_end
            FROM end_events
            WHERE round_id = ?
        ");
        $stmt->execute([$migration['undefined_round_id']]);
        $preview['end_events'] = $stmt->fetch();
        
        // Check target round
        $stmt = $pdo->prepare("
            SELECT 
                r.id,
                r.division,
                COUNT(DISTINCT ra.id) as current_archer_count,
                COUNT(DISTINCT ee.id) as current_score_count
            FROM rounds r
            LEFT JOIN round_archers ra ON ra.round_id = r.id
            LEFT JOIN end_events ee ON ee.round_id = r.id
            WHERE r.id = ?
            GROUP BY r.id, r.division
        ");
        $stmt->execute([$migration['target_round_id']]);
        $preview['target_round'] = $stmt->fetch();
        
        // Check undefined round
        $stmt = $pdo->prepare("
            SELECT 
                r.id,
                r.division,
                r.event_id,
                COUNT(DISTINCT ra.id) as archer_count,
                COUNT(DISTINCT ee.id) as score_count
            FROM rounds r
            LEFT JOIN round_archers ra ON ra.round_id = r.id
            LEFT JOIN end_events ee ON ee.round_id = r.id
            WHERE r.id = ?
            GROUP BY r.id, r.division, r.event_id
        ");
        $stmt->execute([$migration['undefined_round_id']]);
        $preview['undefined_round'] = $stmt->fetch();
        
        $result = ['type' => 'preview', 'data' => $preview];
        
    } catch (Exception $e) {
        $error = "Preview failed: " . $e->getMessage();
    }
    
} elseif ($action === 'execute') {
    // Execute the migration
    try {
        $pdo->beginTransaction();
        
        $changes = [];
        
        // Step 1: Update round_archers
        $stmt = $pdo->prepare("
            UPDATE round_archers 
            SET round_id = ?
            WHERE round_id = ?
        ");
        $stmt->execute([$migration['target_round_id'], $migration['undefined_round_id']]);
        $changes['round_archers_updated'] = $stmt->rowCount();
        
        // Step 2: Update end_events
        $stmt = $pdo->prepare("
            UPDATE end_events 
            SET round_id = ?
            WHERE round_id = ?
        ");
        $stmt->execute([$migration['target_round_id'], $migration['undefined_round_id']]);
        $changes['end_events_updated'] = $stmt->rowCount();
        
        // Step 3: Delete the undefined round
        $stmt = $pdo->prepare("DELETE FROM rounds WHERE id = ?");
        $stmt->execute([$migration['undefined_round_id']]);
        $changes['rounds_deleted'] = $stmt->rowCount();
        
        $pdo->commit();
        
        // Verify after migration
        $stmt = $pdo->prepare("
            SELECT 
                r.id,
                r.division,
                COUNT(DISTINCT ra.id) as archer_count,
                COUNT(DISTINCT ee.id) as score_count
            FROM rounds r
            LEFT JOIN round_archers ra ON ra.round_id = r.id
            LEFT JOIN end_events ee ON ee.round_id = r.id
            WHERE r.id = ?
            GROUP BY r.id, r.division
        ");
        $stmt->execute([$migration['target_round_id']]);
        $verification = $stmt->fetch();
        
        $result = [
            'type' => 'success',
            'changes' => $changes,
            'verification' => $verification
        ];
        
        error_log("Migration executed: {$migration['name']} - " . json_encode($changes));
        
    } catch (Exception $e) {
        $pdo->rollBack();
        $error = "Migration failed: " . $e->getMessage();
        error_log("Migration failed: {$migration['name']} - " . $e->getMessage());
    }
}

?>
<!DOCTYPE html>
<html>
<head>
    <title>Migration Admin</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
            max-width: 1000px; 
            margin: 20px auto; 
            padding: 20px; 
            background: #f5f5f5;
        }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { margin-top: 0; color: #333; }
        h2 { color: #555; border-bottom: 2px solid #ddd; padding-bottom: 10px; margin-top: 30px; }
        .info-box { 
            background: #e7f3ff; 
            border-left: 4px solid #007cba; 
            padding: 15px; 
            margin: 20px 0; 
            border-radius: 4px;
        }
        .warning-box { 
            background: #fff3cd; 
            border-left: 4px solid #ffc107; 
            padding: 15px; 
            margin: 20px 0; 
            border-radius: 4px;
        }
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
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 15px 0;
            background: white;
        }
        th, td { 
            padding: 12px; 
            text-align: left; 
            border-bottom: 1px solid #ddd;
        }
        th { 
            background: #f8f9fa; 
            font-weight: 600; 
            color: #333;
        }
        tr:hover { background: #f8f9fa; }
        .stat-box { 
            display: inline-block; 
            background: #f8f9fa; 
            padding: 15px 20px; 
            margin: 10px 10px 10px 0; 
            border-radius: 4px;
            border: 1px solid #dee2e6;
        }
        .stat-box .stat-value { font-size: 24px; font-weight: bold; color: #007cba; }
        .stat-box .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
        button { 
            background: #007cba; 
            color: white; 
            border: none; 
            padding: 12px 24px; 
            border-radius: 4px; 
            font-size: 16px; 
            cursor: pointer;
            margin-right: 10px;
            margin-top: 10px;
        }
        button:hover { background: #005a87; }
        button.danger { background: #dc3545; }
        button.danger:hover { background: #c82333; }
        button.secondary { background: #6c757d; }
        button.secondary:hover { background: #5a6268; }
        form { margin: 20px 0; }
        .code { 
            background: #f4f4f4; 
            padding: 2px 6px; 
            border-radius: 3px; 
            font-family: monospace; 
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔄 Database Migration Admin</h1>
        
        <div class="info-box">
            <h3><?= htmlspecialchars($migration['name']) ?></h3>
            <p><?= htmlspecialchars($migration['description']) ?></p>
            <p><strong>Event:</strong> <?= htmlspecialchars($migration['event_name']) ?></p>
        </div>
        
        <?php if ($error): ?>
            <div class="error">
                <h3>❌ Error</h3>
                <p><?= htmlspecialchars($error) ?></p>
            </div>
        <?php endif; ?>
        
        <?php if ($result && $result['type'] === 'success'): ?>
            <div class="success">
                <h3>✅ Migration Executed Successfully!</h3>
                <p><strong>Changes Made:</strong></p>
                <ul>
                    <li>round_archers updated: <?= $result['changes']['round_archers_updated'] ?></li>
                    <li>end_events updated: <?= $result['changes']['end_events_updated'] ?></li>
                    <li>rounds deleted: <?= $result['changes']['rounds_deleted'] ?></li>
                </ul>
                <?php if ($result['verification']): ?>
                    <p><strong>Verification - Target Round (<?= htmlspecialchars($result['verification']['division'] ?? 'N/A') ?>):</strong></p>
                    <ul>
                        <li>Total archers: <?= $result['verification']['archer_count'] ?></li>
                        <li>Total score entries: <?= $result['verification']['score_count'] ?></li>
                    </ul>
                <?php endif; ?>
                <p><a href="?passcode=<?= urlencode($passcode) ?>">Return to Preview</a></p>
            </div>
        <?php elseif ($result && $result['type'] === 'preview'): ?>
            <?php $preview = $result['data']; ?>
            
            <div class="warning-box">
                <h3>⚠️ Preview - Review Before Executing</h3>
                <p>This migration will:</p>
                <ol>
                    <li>Move <strong><?= count($preview['archers']) ?> archers</strong> from undefined round to OPEN division</li>
                    <li>Update <strong><?= $preview['end_events']['total_ends'] ?> score entries</strong> to point to OPEN round</li>
                    <li>Delete the empty undefined round</li>
                </ol>
            </div>
            
            <h2>Current State</h2>
            <div class="stat-box">
                <div class="stat-value"><?= $preview['undefined_round']['archer_count'] ?? 0 ?></div>
                <div class="stat-label">Archers in Undefined Round</div>
            </div>
            <div class="stat-box">
                <div class="stat-value"><?= $preview['undefined_round']['score_count'] ?? 0 ?></div>
                <div class="stat-label">Score Entries</div>
            </div>
            <div class="stat-box">
                <div class="stat-value"><?= $preview['target_round']['current_archer_count'] ?? 0 ?></div>
                <div class="stat-label">Current Archers in OPEN</div>
            </div>
            <div class="stat-box">
                <div class="stat-value"><?= ($preview['target_round']['current_archer_count'] ?? 0) + count($preview['archers']) ?></div>
                <div class="stat-label">After Migration</div>
            </div>
            
            <h2>Archers to Move</h2>
            <table>
                <thead>
                    <tr>
                        <th>Archer Name</th>
                        <th>School</th>
                        <th>Level</th>
                        <th>Gender</th>
                        <th>Bale</th>
                        <th>Target</th>
                        <th>Ends Scored</th>
                        <th>Highest Total</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($preview['archers'] as $archer): ?>
                        <tr>
                            <td><?= htmlspecialchars($archer['archer_name']) ?></td>
                            <td><?= htmlspecialchars($archer['school']) ?></td>
                            <td><?= htmlspecialchars($archer['level']) ?></td>
                            <td><?= htmlspecialchars($archer['gender']) ?></td>
                            <td><?= htmlspecialchars($archer['bale_number']) ?></td>
                            <td><?= htmlspecialchars($archer['target_assignment']) ?></td>
                            <td><?= $archer['ends_scored'] ?></td>
                            <td><?= $archer['highest_total'] ?? 'N/A' ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            
            <h2>Target Round</h2>
            <p><strong>Round ID:</strong> <span class="code"><?= htmlspecialchars($migration['target_round_id']) ?></span></p>
            <p><strong>Division:</strong> <?= htmlspecialchars($preview['target_round']['division'] ?? 'N/A') ?></p>
            <p><strong>Current Archers:</strong> <?= $preview['target_round']['current_archer_count'] ?></p>
            <p><strong>Current Scores:</strong> <?= $preview['target_round']['current_score_count'] ?></p>
            
            <form method="POST" action="" onsubmit="return confirm('⚠️ Are you absolutely sure you want to execute this migration? This cannot be undone without a database restore.');">
                <input type="hidden" name="passcode" value="<?= htmlspecialchars($passcode) ?>">
                <input type="hidden" name="action" value="execute">
                <input type="hidden" name="migration_id" value="<?= htmlspecialchars($migrationId) ?>">
                
                <button type="submit" class="danger">🚀 Execute Migration</button>
                <a href="?passcode=<?= urlencode($passcode) ?>" class="button secondary" style="text-decoration: none; display: inline-block;">Cancel</a>
            </form>
            
        <?php else: ?>
            <form method="POST" action="">
                <input type="hidden" name="passcode" value="<?= htmlspecialchars($passcode) ?>">
                <input type="hidden" name="action" value="preview">
                <input type="hidden" name="migration_id" value="<?= htmlspecialchars($migrationId) ?>">
                
                <button type="submit">📋 Preview Migration</button>
            </form>
        <?php endif; ?>
    </div>
</body>
</html>

