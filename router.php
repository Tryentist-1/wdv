<?php
// router.php for local php -S development

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Serve index.html for root path
if ($uri === '/') {
    $uri = '/index.html';
}

// Serve existing files directly
if ($uri !== '/' && file_exists(__DIR__ . $uri)) {
    return false;
}

// Redirect API requests to api/index.php
if (strpos($uri, '/api/') === 0) {
    // We need to ensure api/index.php sees the correct environment
    chdir(__DIR__ . '/api');
    require 'index.php';
    return;
}

// Default 404
http_response_code(404);
echo "404 Not Found (Router)";
