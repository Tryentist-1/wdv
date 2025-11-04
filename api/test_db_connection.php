#!/usr/bin/env php
<?php
/**
 * Database Connection Test Script
 * Run this to verify your database credentials work
 * 
 * Usage: php api/test_db_connection.php
 */

echo "=================================================================\n";
echo "DATABASE CONNECTION TEST\n";
echo "=================================================================\n\n";

// Load config
require_once __DIR__ . '/db.php';

try {
    echo "Testing database connection...\n";
    echo "-----------------------------------------------------------\n";
    
    $pdo = db();
    
    // Test 1: Connection successful
    echo "✅ Connection successful!\n\n";
    
    // Test 2: Show connection details (without password)
    $stmt = $pdo->query("SELECT DATABASE() as db_name, USER() as user, @@hostname as host");
    $info = $stmt->fetch();
    echo "Connected to:\n";
    echo "  Database: " . $info['db_name'] . "\n";
    echo "  User: " . $info['user'] . "\n";
    echo "  Host: " . $info['host'] . "\n\n";
    
    // Test 3: Check if required tables exist
    echo "Checking tables...\n";
    echo "-----------------------------------------------------------\n";
    $tables = ['events', 'rounds', 'round_archers', 'end_events', 'archers'];
    foreach ($tables as $table) {
        $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
        if ($stmt->rowCount() > 0) {
            $count = $pdo->query("SELECT COUNT(*) as cnt FROM $table")->fetch()['cnt'];
            echo "  ✅ $table ({$count} records)\n";
        } else {
            echo "  ❌ $table (NOT FOUND)\n";
        }
    }
    echo "\n";
    
    // Test 4: MySQL version
    $version = $pdo->query("SELECT VERSION() as version")->fetch()['version'];
    echo "MySQL Version: $version\n\n";
    
    echo "=================================================================\n";
    echo "✅ ALL TESTS PASSED - Database connection is working!\n";
    echo "=================================================================\n";
    
} catch (PDOException $e) {
    echo "\n❌ CONNECTION FAILED\n";
    echo "-----------------------------------------------------------\n";
    echo "Error: " . $e->getMessage() . "\n\n";
    
    echo "Common issues:\n";
    echo "  1. Wrong credentials in config.local.php\n";
    echo "  2. Remote MySQL access not enabled on hosting\n";
    echo "  3. Your IP address not whitelisted\n";
    echo "  4. Firewall blocking port 3306\n";
    echo "  5. Wrong hostname (try 'localhost' if on same server)\n\n";
    
    exit(1);
} catch (Exception $e) {
    echo "\n❌ ERROR\n";
    echo "-----------------------------------------------------------\n";
    echo "Error: " . $e->getMessage() . "\n\n";
    exit(1);
}

