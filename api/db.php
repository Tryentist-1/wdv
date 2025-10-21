<?php
require_once __DIR__ . '/config.php';

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(DB_DSN, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}

function json_response($data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
}

function require_api_key(): void {
    $key = $_SERVER['HTTP_X_API_KEY'] ?? '';
    $pass = $_SERVER['HTTP_X_PASSCODE'] ?? '';
    $passOk = (strlen($pass) > 0) && (strtolower($pass) === strtolower(PASSCODE));
    if ($key !== API_KEY && !$passOk) {
        throw new Exception('Unauthorized');
    }
}

function check_api_key(): bool {
    $key = $_SERVER['HTTP_X_API_KEY'] ?? '';
    $pass = $_SERVER['HTTP_X_PASSCODE'] ?? '';
    $passOk = (strlen($pass) > 0) && (strtolower($pass) === strtolower(PASSCODE));
    return ($key === API_KEY || $passOk);
}

function cors(): void {
    header('Access-Control-Allow-Origin: ' . CORS_ORIGIN);
    header('Access-Control-Allow-Headers: Content-Type, X-API-Key, X-Passcode');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

// Ensure minimal schema for events feature exists (idempotent)
function ensure_events_schema(PDO $pdo): void {
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS events (
            id CHAR(36) NOT NULL,
            name VARCHAR(200) NOT NULL,
            date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_events_date (date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    } catch (Exception $e) { /* ignore */ }
    try { $pdo->exec("ALTER TABLE rounds ADD COLUMN event_id CHAR(36) NULL"); } catch (Exception $e) { /* ignore if exists */ }
    try { $pdo->exec("CREATE INDEX idx_rounds_event ON rounds (event_id)"); } catch (Exception $e) { /* ignore */ }
    try { $pdo->exec("CREATE INDEX idx_rounds_date ON rounds (date)"); } catch (Exception $e) { /* ignore */ }
}



