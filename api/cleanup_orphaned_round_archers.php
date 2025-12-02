<?php
/**
 * Cleanup Script: Orphaned round_archers Entries
 * 
 * This script helps clean up dirty data in the dev database:
 * 1. Removes round_archers entries with NULL archer_id (orphaned "test" entries)
 * 2. Fixes standalone rounds that have multiple archer assignments
 * 3. Removes duplicate archer assignments to the same round
 * 
 * Usage: php api/cleanup_orphaned_round_archers.php [--dry-run] [--delete-orphaned] [--fix-standalone] [--fix-duplicates]
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

$pdo = db();
$dryRun = in_array('--dry-run', $argv);
$deleteOrphaned = in_array('--delete-orphaned', $argv);
$fixStandalone = in_array('--fix-standalone', $argv);
$fixDuplicates = in_array('--fix-duplicates', $argv);

echo "========================================\n";
echo "Cleanup: Orphaned round_archers Entries\n";
echo "========================================\n";
if ($dryRun) {
    echo "⚠️  DRY RUN MODE - No changes will be made\n";
}
echo "\n";

// =====================================================
// 1. Find and report orphaned entries (NULL archer_id)
// =====================================================
echo "1. Checking for orphaned entries (NULL archer_id)...\n";
$orphaned = $pdo->query("
    SELECT 
        ra.id as round_archer_id,
        ra.round_id,
        ra.archer_name,
        r.event_id,
        r.division,
        r.date as round_date,
        ra.created_at
    FROM round_archers ra
    JOIN rounds r ON r.id = ra.round_id
    WHERE ra.archer_id IS NULL
    ORDER BY ra.created_at DESC
")->fetchAll();

echo "   Found " . count($orphaned) . " orphaned entries\n";
if (count($orphaned) > 0) {
    echo "   Sample entries:\n";
    foreach (array_slice($orphaned, 0, 5) as $entry) {
        echo "     - Round: {$entry['round_id']}, Name: {$entry['archer_name']}, Date: {$entry['round_date']}\n";
    }
    
    if ($deleteOrphaned && !$dryRun) {
        $stmt = $pdo->prepare("DELETE FROM round_archers WHERE archer_id IS NULL AND created_at < DATE_SUB(NOW(), INTERVAL 1 DAY)");
        $stmt->execute();
        $deleted = $stmt->rowCount();
        echo "   ✅ Deleted {$deleted} orphaned entries (older than 1 day)\n";
    } elseif ($deleteOrphaned) {
        echo "   [DRY RUN] Would delete orphaned entries older than 1 day\n";
    }
}
echo "\n";

// =====================================================
// 2. Find standalone rounds with multiple archers
// =====================================================
echo "2. Checking standalone rounds with multiple archer assignments...\n";
$standaloneMulti = $pdo->query("
    SELECT 
        r.id as round_id,
        r.division,
        r.date,
        COUNT(DISTINCT ra.archer_id) as archer_count,
        GROUP_CONCAT(DISTINCT ra.archer_id) as archer_ids
    FROM rounds r
    JOIN round_archers ra ON ra.round_id = r.id
    WHERE r.event_id IS NULL
      AND ra.archer_id IS NOT NULL
    GROUP BY r.id, r.division, r.date
    HAVING archer_count > 1
    ORDER BY r.date DESC
")->fetchAll();

echo "   Found " . count($standaloneMulti) . " standalone rounds with multiple archers\n";
if (count($standaloneMulti) > 0) {
    echo "   Problematic rounds:\n";
    foreach ($standaloneMulti as $round) {
        echo "     - Round: {$round['round_id']}, Archers: {$round['archer_count']}, IDs: {$round['archer_ids']}\n";
    }
    
    if ($fixStandalone && !$dryRun) {
        // Keep only the first archer (by created_at) for each standalone round
        $stmt = $pdo->prepare("
            DELETE ra FROM round_archers ra
            INNER JOIN (
                SELECT 
                    r.id as round_id,
                    MIN(ra2.created_at) as first_created,
                    MIN(ra2.archer_id) as creator_archer_id
                FROM rounds r
                JOIN round_archers ra2 ON ra2.round_id = r.id
                WHERE r.event_id IS NULL
                  AND ra2.archer_id IS NOT NULL
                GROUP BY r.id
            ) creator ON creator.round_id = ra.round_id
            WHERE ra.round_id IN (SELECT id FROM rounds WHERE event_id IS NULL)
            AND ra.archer_id != creator.creator_archer_id
        ");
        $stmt->execute();
        $deleted = $stmt->rowCount();
        echo "   ✅ Removed {$deleted} extra archer assignments from standalone rounds\n";
    } elseif ($fixStandalone) {
        echo "   [DRY RUN] Would remove extra archer assignments from standalone rounds\n";
    }
}
echo "\n";

// =====================================================
// 3. Find duplicate archer assignments
// =====================================================
echo "3. Checking for duplicate archer assignments...\n";
$duplicates = $pdo->query("
    SELECT 
        ra.round_id,
        ra.archer_id,
        COUNT(*) as duplicate_count,
        GROUP_CONCAT(ra.id) as round_archer_ids
    FROM round_archers ra
    WHERE ra.archer_id IS NOT NULL
    GROUP BY ra.round_id, ra.archer_id
    HAVING duplicate_count > 1
    ORDER BY duplicate_count DESC
")->fetchAll();

echo "   Found " . count($duplicates) . " rounds with duplicate archer assignments\n";
if (count($duplicates) > 0) {
    echo "   Problematic assignments:\n";
    foreach (array_slice($duplicates, 0, 5) as $dup) {
        echo "     - Round: {$dup['round_id']}, Archer: {$dup['archer_id']}, Count: {$dup['duplicate_count']}\n";
    }
    
    if ($fixDuplicates && !$dryRun) {
        // Keep the entry with bale/target, delete others
        $stmt = $pdo->prepare("
            DELETE ra1 FROM round_archers ra1
            INNER JOIN round_archers ra2 
            WHERE ra1.round_id = ra2.round_id
              AND ra1.archer_id = ra2.archer_id
              AND ra1.archer_id IS NOT NULL
              AND ra1.id != ra2.id
              AND (ra1.bale_number IS NULL OR ra1.target_assignment IS NULL)
              AND (ra2.bale_number IS NOT NULL AND ra2.target_assignment IS NOT NULL)
        ");
        $stmt->execute();
        $deleted = $stmt->rowCount();
        echo "   ✅ Removed {$deleted} duplicate archer assignments\n";
    } elseif ($fixDuplicates) {
        echo "   [DRY RUN] Would remove duplicate archer assignments\n";
    }
}
echo "\n";

// =====================================================
// Summary
// =====================================================
echo "========================================\n";
echo "Summary\n";
echo "========================================\n";
echo "Orphaned entries: " . count($orphaned) . "\n";
echo "Standalone rounds with multiple archers: " . count($standaloneMulti) . "\n";
echo "Duplicate assignments: " . count($duplicates) . "\n";
echo "\n";

if ($dryRun) {
    echo "To apply fixes, run without --dry-run:\n";
    echo "  php api/cleanup_orphaned_round_archers.php --delete-orphaned --fix-standalone --fix-duplicates\n";
} else {
    echo "Done!\n";
}

