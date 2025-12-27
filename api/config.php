<?php
// Load local overrides if present
if (file_exists(__DIR__ . '/config.local.php')) {
    require __DIR__ . '/config.local.php';
}

// Defaults (override in config.local.php)
if (!defined('DB_DSN')) {
    // Example: mysql:host=localhost;dbname=wdv;charset=utf8mb4
    define('DB_DSN', 'mysql:host=localhost;dbname=wdv;charset=utf8mb4');
}
if (!defined('DB_USER')) {
    define('DB_USER', 'wdv_user');
}
if (!defined('DB_PASS')) {
    define('DB_PASS', 'change_me');
}
if (!defined('API_KEY')) {
    define('API_KEY', 'set-a-strong-key');
}
if (!defined('PASSCODE')) {
    // Shared coach passcode (can be rotated in config.local.php)
    define('PASSCODE', 'wdva26');
}
if (!defined('CORS_ORIGIN')) {
    define('CORS_ORIGIN', 'https://archery.tryentist.com');
}


