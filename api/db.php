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
    if ($key !== API_KEY && $pass !== PASSCODE) {
        json_response(['error' => 'Unauthorized'], 401);
        exit;
    }
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



