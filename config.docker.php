<?php
// Docker Environment Configuration
define('DB_DSN', 'mysql:host=db;dbname=wdv;charset=utf8mb4');
define('DB_USER', 'wdv_user');
define('DB_PASS', 'wdv_dev_password');

// API Security
define('API_KEY', 'qpeiti183djeiw930238sie75k3ha9laweithlwkeu');
define('PASSCODE', 'wdva26');

// Allow Tailscale/Local access
define('CORS_ORIGIN', '*');
