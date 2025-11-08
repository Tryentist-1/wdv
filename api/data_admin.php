<?php
/**
 * Data Hygiene Admin Interface
 *
 * Allows trusted admins to locate and delete test / orphaned events along with
 * their related rounds, round archers, and end events. Also links out to other
 * maintenance tools and documentation.
 *
 * Usage:
 *   https://tryentist.com/wdv/api/data_admin.php?passcode=wdva26
 */

require_once __DIR__ . '/config.php';

// ---------------------------------------------------------------------------
// Authentication (reuse passcode flow from backup_admin.php)
// ---------------------------------------------------------------------------
$passcode = $_GET['passcode'] ?? $_POST['passcode'] ?? '';
$authorized = false;

if (strlen($passcode) > 0 && strtolower($passcode) === strtolower(PASSCODE)) {
    $authorized = true;
}

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
        <title>Data Hygiene Admin - Unauthorized</title>
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

require_once __DIR__ . '/db.php';
$pdo = db();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function h(?string $value): string {
    return htmlspecialchars($value ?? '', ENT_QUOTES, 'UTF-8');
}

function buildConditions(array $filters, array &$params): string {
    $clauses = [];

    if (!empty($filters['name_like'])) {
        $clauses[] = 'e.name LIKE ?';
        $params[] = $filters['name_like'];
    }

    if (!empty($filters['date_from'])) {
        $clauses[] = 'e.date >= ?';
        $params[] = $filters['date_from'];
    }

    if (!empty($filters['date_to'])) {
        $clauses[] = 'e.date <= ?';
        $params[] = $filters['date_to'];
    }

    if (!empty($filters['created_by'])) {
        $clauses[] = 'e.created_by = ?';
        $params[] = $filters['created_by'];
    }

    if (!empty($filters['status'])) {
        $clauses[] = 'e.status = ?';
        $params[] = $filters['status'];
    }

    return $clauses ? ('WHERE ' . implode(' AND ', $clauses)) : '';
}

function fetchEvents(PDO $pdo, array $filters, int $limit): array {
    $params = [];
    $where = buildConditions($filters, $params);
    $limit = max(1, min($limit, 200));

    $sql = "
        SELECT
            e.id,
            e.name,
            e.date,
            e.status,
            COUNT(DISTINCT r.id) AS round_count,
            COUNT(DISTINCT ra.id) AS archer_count,
            COUNT(DISTINCT ee.id) AS end_count,
            MAX(ee.server_ts) AS last_sync,
            MAX(ra.created_at) AS last_assignment
        FROM events e
        LEFT JOIN rounds r ON r.event_id = e.id
        LEFT JOIN round_archers ra ON ra.round_id = r.id
        LEFT JOIN end_events ee ON ee.round_id = r.id
        $where
        GROUP BY e.id, e.name, e.date, e.status
        ORDER BY e.date DESC, e.id DESC
        LIMIT $limit
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function deleteEventCascade(PDO $pdo, string $eventId): array {
    $summary = [
        'event_id' => $eventId,
        'rounds_deleted' => 0,
        'archers_deleted' => 0,
        'ends_deleted' => 0,
        'success' => false,
        'error' => null,
    ];

    try {
        $pdo->beginTransaction();

        // Gather round IDs for the event
        $roundStmt = $pdo->prepare('SELECT id FROM rounds WHERE event_id = ?');
        $roundStmt->execute([$eventId]);
        $roundIds = $roundStmt->fetchAll(PDO::FETCH_COLUMN);

        if (!empty($roundIds)) {
            $placeholders = implode(',', array_fill(0, count($roundIds), '?'));

            // Delete end events
            $endsStmt = $pdo->prepare("DELETE FROM end_events WHERE round_id IN ($placeholders)");
            $endsStmt->execute($roundIds);
            $summary['ends_deleted'] = $endsStmt->rowCount();

            // Delete round archers
            $archerStmt = $pdo->prepare("DELETE FROM round_archers WHERE round_id IN ($placeholders)");
            $archerStmt->execute($roundIds);
            $summary['archers_deleted'] = $archerStmt->rowCount();

            // Delete rounds
            $roundDelStmt = $pdo->prepare("DELETE FROM rounds WHERE id IN ($placeholders)");
            $roundDelStmt->execute($roundIds);
            $summary['rounds_deleted'] = $roundDelStmt->rowCount();
        }

        // Finally delete the event
        $eventDelStmt = $pdo->prepare('DELETE FROM events WHERE id = ?');
        $eventDelStmt->execute([$eventId]);

        $pdo->commit();
        $summary['success'] = true;
    } catch (Throwable $e) {
        $pdo->rollBack();
        $summary['error'] = $e->getMessage();
    }

    return $summary;
}

// ---------------------------------------------------------------------------
// Request handling
// ---------------------------------------------------------------------------
$defaultPrefix = 'TEST';
$filters = [
    'name_like' => '',
    'date_from' => '',
    'date_to' => '',
    'created_by' => '',
    'status' => '',
];

$limit = 50;
$messages = [];
$deleteSummaries = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'delete' && !empty($_POST['event_ids']) && is_array($_POST['event_ids'])) {
        $eventIds = array_filter(array_map('trim', $_POST['event_ids']));

        if (!empty($eventIds)) {
            foreach ($eventIds as $eventId) {
                $deleteSummaries[] = deleteEventCascade($pdo, $eventId);
            }
            $messages[] = count($deleteSummaries) . " event(s) processed for deletion.";
        } else {
            $messages[] = 'No events selected for deletion.';
        }
    }

    // Persist filters after POST
    $filters['name_like'] = trim($_POST['prefix'] ?? '');
    if ($filters['name_like'] !== '') {
        if (strpos($filters['name_like'], '%') === false) {
            $filters['name_like'] .= '%';
        }
    }
    $filters['date_from'] = trim($_POST['date_from'] ?? '');
    $filters['date_to'] = trim($_POST['date_to'] ?? '');
    $filters['created_by'] = trim($_POST['created_by'] ?? '');
    $filters['status'] = trim($_POST['status'] ?? '');
    $limit = (int)($_POST['limit'] ?? 50);
} else {
    // Defaults for initial load
    $prefix = trim($_GET['prefix'] ?? $defaultPrefix);
    if ($prefix !== '') {
        $filters['name_like'] = (strpos($prefix, '%') === false) ? $prefix . '%' : $prefix;
    }
    $filters['date_from'] = trim($_GET['date_from'] ?? '');
    $filters['date_to'] = trim($_GET['date_to'] ?? '');
    $filters['created_by'] = trim($_GET['created_by'] ?? '');
    $filters['status'] = trim($_GET['status'] ?? '');
    $limit = (int)($_GET['limit'] ?? 50);
}

$limit = max(1, min($limit, 200));
$events = fetchEvents($pdo, $filters, $limit);

// Prepare filters for form (remove % suffix for display)
$displayPrefix = '';
if (!empty($filters['name_like'])) {
    $displayPrefix = rtrim($filters['name_like'], '%');
}

?>
<!DOCTYPE html>
<html>
<head>
    <title>Data Hygiene Admin</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            max-width: 1100px;
            margin: 20px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.08);
        }
        h1 {
            margin-top: 0;
            color: #333;
        }
        h2 {
            color: #444;
            border-bottom: 2px solid #eee;
            padding-bottom: 8px;
            margin-top: 30px;
        }
        .notice {
            background: #fff8e1;
            border-left: 4px solid #ffc107;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
            color: #795548;
        }
        .messages {
            margin-bottom: 20px;
        }
        .messages .msg {
            background: #e8f5e9;
            border-left: 4px solid #2e7d32;
            padding: 10px 15px;
            border-radius: 4px;
            margin-bottom: 10px;
            color: #1b5e20;
        }
        form.filter-form {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
            margin-bottom: 25px;
        }
        form.filter-form label {
            font-weight: 600;
            color: #555;
            display: block;
            margin-bottom: 4px;
        }
        form.filter-form input,
        form.filter-form select {
            width: 100%;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
        form.filter-form .actions {
            grid-column: 1 / -1;
            display: flex;
            gap: 10px;
        }
        form.filter-form button {
            padding: 10px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.95rem;
        }
        .btn-primary { background: #1976d2; color: white; }
        .btn-secondary { background: #607d8b; color: white; }
        .btn-danger { background: #d32f2f; color: white; }
        .btn-link {
            background: none;
            color: #1976d2;
            padding: 0;
            border: none;
            cursor: pointer;
            text-decoration: underline;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }
        th, td {
            padding: 10px 12px;
            border-bottom: 1px solid #eee;
            text-align: left;
            vertical-align: top;
            font-size: 0.95rem;
        }
        th {
            background: #f0f4f8;
            font-weight: 600;
        }
        tr:nth-child(even) td {
            background: #fafafa;
        }
        .table-actions {
            display: flex;
            gap: 6px;
            align-items: center;
            flex-wrap: wrap;
        }
        .link-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 10px;
            margin-top: 10px;
        }
        .link-card {
            background: #e3f2fd;
            padding: 12px;
            border-radius: 6px;
            border: 1px solid #bbdefb;
        }
        .link-card strong {
            display: block;
            margin-bottom: 4px;
            color: #0d47a1;
        }
        .delete-summary {
            margin-top: 20px;
        }
        .delete-summary table td,
        .delete-summary table th {
            font-size: 0.9rem;
        }
        .muted { color: #777; font-size: 0.9rem; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧹 Data Hygiene Admin</h1>

        <div class="notice">
            Use this page to locate and delete test / orphaned events. Deletions remove associated rounds, round archers, and end events. <strong>Actions are irreversible.</strong> Always preview data and back up before large cleanups.
        </div>

        <?php if (!empty($messages)): ?>
            <div class="messages">
                <?php foreach ($messages as $msg): ?>
                    <div class="msg"><?= h($msg) ?></div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>

        <form method="get" class="filter-form">
            <input type="hidden" name="passcode" value="<?= h($passcode) ?>">
            <div>
                <label for="prefix">Name starts with</label>
                <input type="text" id="prefix" name="prefix" placeholder="e.g. TEST" value="<?= h($displayPrefix) ?>">
            </div>
            <div>
                <label for="date_from">Date from</label>
                <input type="date" id="date_from" name="date_from" value="<?= h($filters['date_from']) ?>">
            </div>
            <div>
                <label for="date_to">Date to</label>
                <input type="date" id="date_to" name="date_to" value="<?= h($filters['date_to']) ?>">
            </div>
            <div>
                <label for="created_by">Created by / Coach</label>
                <input type="text" id="created_by" name="created_by" placeholder="optional" value="<?= h($filters['created_by']) ?>">
            </div>
            <div>
                <label for="status">Status</label>
                <select id="status" name="status">
                    <option value="">Any</option>
                    <option value="Planned" <?= $filters['status'] === 'Planned' ? 'selected' : '' ?>>Planned</option>
                    <option value="Active" <?= $filters['status'] === 'Active' ? 'selected' : '' ?>>Active</option>
                    <option value="Completed" <?= $filters['status'] === 'Completed' ? 'selected' : '' ?>>Completed</option>
                </select>
            </div>
            <div>
                <label for="limit">Result limit</label>
                <input type="number" id="limit" name="limit" min="1" max="200" value="<?= h((string)$limit) ?>">
            </div>
            <div class="actions">
                <button type="submit" class="btn-primary">Apply Filters</button>
                <a class="btn-link" href="?passcode=<?= urlencode($passcode) ?>&prefix=<?= urlencode($defaultPrefix) ?>">Reset to defaults</a>
            </div>
        </form>

        <?php if (empty($events)): ?>
            <p>No events matched the current filters.</p>
        <?php else: ?>
            <form method="post">
                <input type="hidden" name="passcode" value="<?= h($passcode) ?>">
                <input type="hidden" name="prefix" value="<?= h($displayPrefix) ?>">
                <input type="hidden" name="date_from" value="<?= h($filters['date_from']) ?>">
                <input type="hidden" name="date_to" value="<?= h($filters['date_to']) ?>">
                <input type="hidden" name="created_by" value="<?= h($filters['created_by']) ?>">
                <input type="hidden" name="status" value="<?= h($filters['status']) ?>">
                <input type="hidden" name="limit" value="<?= h((string)$limit) ?>">

                <table>
                    <thead>
                        <tr>
                            <th>Select</th>
                            <th>Event</th>
                            <th>Counts</th>
                            <th>Latest Activity</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($events as $event): ?>
                            <tr>
                                <td>
                                    <input type="checkbox" name="event_ids[]" value="<?= h($event['id']) ?>">
                                </td>
                                <td>
                                    <strong><?= h($event['name']) ?></strong><br>
                                    <span class="muted"><?= h($event['id']) ?></span><br>
                                    <span class="muted">Date: <?= h($event['date']) ?> · Status: <?= h($event['status']) ?></span>
                                </td>
                                <td>
                                    Rounds: <strong><?= (int)$event['round_count'] ?></strong><br>
                                    Archers: <strong><?= (int)$event['archer_count'] ?></strong><br>
                                    Ends: <strong><?= (int)$event['end_count'] ?></strong>
                                </td>
                                <td>
                                    Last Score Sync:<br>
                                    <strong><?= h($event['last_sync'] ?? '—') ?></strong><br>
                                    Last Assignment:<br>
                                    <strong><?= h($event['last_assignment'] ?? '—') ?></strong>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>

                <p class="muted">
                    Selecting events removes the event record and any associated rounds, round archers, and end events.
                </p>

                <div class="table-actions">
                    <button type="submit" name="action" value="delete" class="btn-danger" onclick="return confirm('Are you sure you want to delete the selected events and all related data? This cannot be undone.');">
                        🗑️ Delete Selected Events
                    </button>
                </div>
            </form>
        <?php endif; ?>

        <?php if (!empty($deleteSummaries)): ?>
            <div class="delete-summary">
                <h2>Deletion Summary</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Event ID</th>
                            <th>Rounds</th>
                            <th>Archers</th>
                            <th>End Events</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($deleteSummaries as $summary): ?>
                            <tr>
                                <td><?= h($summary['event_id']) ?></td>
                                <td><?= (int)$summary['rounds_deleted'] ?></td>
                                <td><?= (int)$summary['archers_deleted'] ?></td>
                                <td><?= (int)$summary['ends_deleted'] ?></td>
                                <td>
                                    <?php if ($summary['success']): ?>
                                        ✅ Deleted
                                    <?php else: ?>
                                        ❌ <?= h($summary['error']) ?>
                                    <?php endif; ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>

        <hr style="margin: 40px 0; border: none; border-top: 2px solid #ddd;">

        <h2>🧹 Clean Up Unstarted Scorecards</h2>
        <p>Remove scorecard entries that were created but never had any scoring data recorded (0 ends). These appear in archer history with "Ends: 0" and "Score: 0".</p>
        
        <?php
        // Handle unstarted cards cleanup
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'cleanup_unstarted') {
            $cleanupMode = $_POST['cleanup_mode'] ?? 'safe';
            $cutoffDate = $_POST['cutoff_date'] ?? null;
            
            try {
                $pdo->beginTransaction();
                
                // First, get preview of what will be deleted
                $previewStmt = $pdo->query("
                    SELECT 
                        e.name AS event_name,
                        e.date AS event_date,
                        r.name AS round_name,
                        ra.archer_name,
                        ra.school,
                        ra.card_status,
                        ra.created_at
                    FROM round_archers ra
                    INNER JOIN rounds r ON ra.round_id = r.id
                    LEFT JOIN events e ON r.event_id = e.id
                    LEFT JOIN end_events ee ON ra.id = ee.round_archer_id
                    WHERE ee.id IS NULL
                    " . ($cleanupMode === 'safe' ? "AND ra.completed = FALSE AND ra.card_status = 'PENDING'" : "") . "
                    " . ($cutoffDate ? "AND e.date < ?" : "") . "
                    ORDER BY e.date DESC, ra.archer_name
                    LIMIT 100
                ");
                
                if ($cutoffDate) {
                    $previewStmt->execute([$cutoffDate]);
                } else {
                    $previewStmt->execute();
                }
                
                $affectedCards = $previewStmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Execute deletion based on mode
                if ($cleanupMode === 'aggressive') {
                    // Delete ALL unstarted cards
                    $deleteStmt = $pdo->prepare("
                        DELETE ra FROM round_archers ra
                        LEFT JOIN end_events ee ON ra.id = ee.round_archer_id
                        WHERE ee.id IS NULL
                    ");
                    $deleteStmt->execute();
                } elseif ($cleanupMode === 'date') {
                    // Delete unstarted cards older than cutoff date
                    if (!$cutoffDate) {
                        throw new Exception("Cutoff date required for date-based cleanup");
                    }
                    $deleteStmt = $pdo->prepare("
                        DELETE ra FROM round_archers ra
                        LEFT JOIN end_events ee ON ra.id = ee.round_archer_id
                        INNER JOIN rounds r ON ra.round_id = r.id
                        INNER JOIN events e ON r.event_id = e.id
                        WHERE ee.id IS NULL
                          AND ra.completed = FALSE
                          AND ra.card_status = 'PENDING'
                          AND e.date < ?
                    ");
                    $deleteStmt->execute([$cutoffDate]);
                } else {
                    // Safe mode: Delete only pending, incomplete cards
                    $deleteStmt = $pdo->prepare("
                        DELETE ra FROM round_archers ra
                        LEFT JOIN end_events ee ON ra.id = ee.round_archer_id
                        WHERE ee.id IS NULL
                          AND ra.completed = FALSE
                          AND ra.card_status = 'PENDING'
                    ");
                    $deleteStmt->execute();
                }
                
                $deletedCount = $deleteStmt->rowCount();
                
                $pdo->commit();
                
                echo '<div class="success">';
                echo '<h3>✅ Cleanup Complete</h3>';
                echo '<p><strong>' . $deletedCount . '</strong> unstarted scorecard(s) deleted.</p>';
                if (!empty($affectedCards)) {
                    echo '<details><summary>View deleted cards (first 100)</summary>';
                    echo '<table style="margin-top: 10px;"><thead><tr>';
                    echo '<th>Event</th><th>Round</th><th>Archer</th><th>School</th><th>Status</th><th>Created</th>';
                    echo '</tr></thead><tbody>';
                    foreach ($affectedCards as $card) {
                        echo '<tr>';
                        echo '<td>' . h($card['event_name']) . '<br><small>' . h($card['event_date']) . '</small></td>';
                        echo '<td>' . h($card['round_name']) . '</td>';
                        echo '<td>' . h($card['archer_name']) . '</td>';
                        echo '<td>' . h($card['school']) . '</td>';
                        echo '<td>' . h($card['card_status']) . '</td>';
                        echo '<td><small>' . h($card['created_at']) . '</small></td>';
                        echo '</tr>';
                    }
                    echo '</tbody></table></details>';
                }
                echo '</div>';
                
            } catch (Exception $e) {
                $pdo->rollBack();
                echo '<div class="error">';
                echo '<h3>❌ Cleanup Failed</h3>';
                echo '<p>' . h($e->getMessage()) . '</p>';
                echo '</div>';
            }
        }
        
        // Preview unstarted cards
        $previewStmt = $pdo->query("
            SELECT 
                COUNT(*) AS total_unstarted,
                COUNT(DISTINCT ra.round_id) AS affected_rounds,
                COUNT(DISTINCT ra.archer_name) AS affected_archers,
                SUM(CASE WHEN ra.card_status = 'PENDING' AND ra.completed = FALSE THEN 1 ELSE 0 END) AS safe_cleanup_count
            FROM round_archers ra
            LEFT JOIN end_events ee ON ra.id = ee.round_archer_id
            WHERE ee.id IS NULL
        ");
        $preview = $previewStmt->fetch(PDO::FETCH_ASSOC);
        ?>
        
        <div class="info" style="background: #e3f2fd; border-color: #2196f3;">
            <h3>📊 Unstarted Cards Preview</h3>
            <ul>
                <li><strong><?= (int)$preview['total_unstarted'] ?></strong> total unstarted scorecard(s)</li>
                <li><strong><?= (int)$preview['affected_rounds'] ?></strong> round(s) affected</li>
                <li><strong><?= (int)$preview['affected_archers'] ?></strong> unique archer name(s)</li>
                <li><strong><?= (int)$preview['safe_cleanup_count'] ?></strong> safe to clean (PENDING + not completed)</li>
            </ul>
        </div>
        
        <?php if ($preview['total_unstarted'] > 0): ?>
        <form method="post" style="margin-top: 20px;">
            <input type="hidden" name="passcode" value="<?= h($passcode) ?>">
            
            <div style="margin-bottom: 20px;">
                <label><strong>Cleanup Mode:</strong></label>
                <div style="margin-top: 10px;">
                    <label style="display: block; margin-bottom: 10px;">
                        <input type="radio" name="cleanup_mode" value="safe" checked>
                        <strong>Safe Mode (Recommended)</strong> - Only delete PENDING, incomplete cards
                        <br><small style="margin-left: 24px;">Deletes <?= (int)$preview['safe_cleanup_count'] ?> card(s)</small>
                    </label>
                    <label style="display: block; margin-bottom: 10px;">
                        <input type="radio" name="cleanup_mode" value="date">
                        <strong>Date-Based</strong> - Delete pending cards older than specified date
                        <br><small style="margin-left: 24px;">Requires cutoff date below</small>
                    </label>
                    <label style="display: block; margin-bottom: 10px;">
                        <input type="radio" name="cleanup_mode" value="aggressive">
                        <strong>Aggressive (Caution!)</strong> - Delete ALL unstarted cards regardless of status
                        <br><small style="margin-left: 24px; color: #d32f2f;">Deletes <?= (int)$preview['total_unstarted'] ?> card(s) - Use with extreme caution!</small>
                    </label>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label for="cutoff_date"><strong>Cutoff Date (for Date-Based mode):</strong></label>
                <input type="date" id="cutoff_date" name="cutoff_date" value="<?= date('Y-m-d', strtotime('-7 days')) ?>">
                <small>Only cards from events before this date will be deleted</small>
            </div>
            
            <div class="table-actions">
                <button type="submit" name="action" value="cleanup_unstarted" class="btn-danger" 
                        onclick="return confirm('Are you sure you want to delete unstarted scorecards? This cannot be undone.\n\nRecommendation: Use Safe Mode for first-time cleanup.');">
                    🧹 Clean Up Unstarted Cards
                </button>
            </div>
        </form>
        <?php else: ?>
        <p style="color: #4caf50; font-weight: bold;">✅ No unstarted cards found. Database is clean!</p>
        <?php endif; ?>

        <hr style="margin: 40px 0; border: none; border-top: 2px solid #ddd;">

        <h2>Helpful Tools & References</h2>
        <div class="link-list">
            <div class="link-card">
                <strong>📦 Database Backups</strong>
                <a href="backup_admin.php?passcode=<?= urlencode($passcode) ?>">backup_admin.php</a>
            </div>
            <div class="link-card">
                <strong>🛠 Migration Admin</strong>
                <a href="migration_admin.php?passcode=<?= urlencode($passcode) ?>">migration_admin.php</a>
            </div>
            <div class="link-card">
                <strong>🔍 Undefined Division Diagnostic</strong>
                <a href="diagnostic_undefined_divisions.php?passcode=<?= urlencode($passcode) ?>">diagnostic_undefined_divisions.php</a>
            </div>
            <div class="link-card">
                <strong>📗 Data Hygiene Plan</strong>
                <a href="../docs/ADMIN_DATA_HYGIENE_PAGE.md" target="_blank">ADMIN_DATA_HYGIENE_PAGE.md</a>
            </div>
            <div class="link-card">
                <strong>📂 SQL Helper Scripts</strong>
                <a href="https://github.com/Tryentist-1/wdv/tree/main/api/sql" target="_blank">
                    View on GitHub
                </a>
            </div>
            <div class="link-card">
                <strong>🧪 Playwright Failures Notes</strong>
                <a href="https://github.com/Tryentist-1/wdv/blob/main/docs/TEST_FAILURES_ANALYSIS.md" target="_blank">
                    View on GitHub
                </a>
            </div>
        </div>
    </div>
</body>
</html>

