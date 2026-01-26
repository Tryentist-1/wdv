<?php
// Docker Environment Configuration
define('DB_DSN', 'mysql:host=db;dbname=wdv;charset=utf8mb4');
define('DB_USER', 'wdv_user');
define('DB_PASS', 'wdv_password');

// Allow Tailscale/Local access
define('CORS_ORIGIN', '*');

// Default Passcode
if (!defined('PASSCODE')) {
    define('PASSCODE', 'wdva26');
}
