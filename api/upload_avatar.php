<?php
// api/upload_avatar.php
// Handle avatar/photo uploads for archers
// Resizes images to standard sizes and saves to avatars directory

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Configuration
define('UPLOAD_DIR', __DIR__ . '/../avatars/');
define('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB
define('THUMB_SIZE', 128); // Thumbnail size (square)
define('FULL_SIZE', 512);  // Full size (square)
define('ALLOWED_TYPES', ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

// Ensure upload directory exists
if (!is_dir(UPLOAD_DIR)) {
    if (!mkdir(UPLOAD_DIR, 0755, true)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to create upload directory']);
        exit;
    }
}

// Check if file was uploaded
if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
    $errorMsg = 'No file uploaded';
    if (isset($_FILES['avatar']['error'])) {
        switch ($_FILES['avatar']['error']) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                $errorMsg = 'File too large';
                break;
            case UPLOAD_ERR_PARTIAL:
                $errorMsg = 'File upload incomplete';
                break;
            case UPLOAD_ERR_NO_FILE:
                $errorMsg = 'No file selected';
                break;
            default:
                $errorMsg = 'Upload error: ' . $_FILES['avatar']['error'];
        }
    }
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $errorMsg]);
    exit;
}

$file = $_FILES['avatar'];

// Validate file size
if ($file['size'] > MAX_FILE_SIZE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'File too large (max 10MB)']);
    exit;
}

// Validate file type
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, ALLOWED_TYPES)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid file type. Only JPEG, PNG, GIF, and WebP allowed']);
    exit;
}

// Generate unique filename
$extension = match($mimeType) {
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/gif' => 'gif',
    'image/webp' => 'webp',
    default => 'jpg'
};

$timestamp = time();
$random = bin2hex(random_bytes(8));
$baseFilename = $timestamp . '_' . $random;

// Load image
$sourceImage = match($mimeType) {
    'image/jpeg' => @imagecreatefromjpeg($file['tmp_name']),
    'image/png' => @imagecreatefrompng($file['tmp_name']),
    'image/gif' => @imagecreatefromgif($file['tmp_name']),
    'image/webp' => @imagecreatefromwebp($file['tmp_name']),
    default => false
};

if (!$sourceImage) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to process image']);
    exit;
}

// Get original dimensions
$origWidth = imagesx($sourceImage);
$origHeight = imagesy($sourceImage);

/**
 * Resize and crop image to square
 */
function resizeAndCrop($sourceImage, $origWidth, $origHeight, $targetSize) {
    // Calculate crop dimensions (center crop to square)
    $cropSize = min($origWidth, $origHeight);
    $cropX = ($origWidth - $cropSize) / 2;
    $cropY = ($origHeight - $cropSize) / 2;
    
    // Create target image
    $targetImage = imagecreatetruecolor($targetSize, $targetSize);
    
    // Preserve transparency for PNG/GIF
    imagealphablending($targetImage, false);
    imagesavealpha($targetImage, true);
    $transparent = imagecolorallocatealpha($targetImage, 0, 0, 0, 127);
    imagefill($targetImage, 0, 0, $transparent);
    imagealphablending($targetImage, true);
    
    // Resize and crop
    imagecopyresampled(
        $targetImage, $sourceImage,
        0, 0,                    // Destination x, y
        $cropX, $cropY,          // Source x, y
        $targetSize, $targetSize, // Destination width, height
        $cropSize, $cropSize     // Source width, height
    );
    
    return $targetImage;
}

// Create thumbnail
$thumbImage = resizeAndCrop($sourceImage, $origWidth, $origHeight, THUMB_SIZE);
$thumbFilename = $baseFilename . '_thumb.' . $extension;
$thumbPath = UPLOAD_DIR . $thumbFilename;

// Create full size
$fullImage = resizeAndCrop($sourceImage, $origWidth, $origHeight, FULL_SIZE);
$fullFilename = $baseFilename . '_full.' . $extension;
$fullPath = UPLOAD_DIR . $fullFilename;

// Save images
$thumbSaved = match($extension) {
    'jpg' => imagejpeg($thumbImage, $thumbPath, 90),
    'png' => imagepng($thumbImage, $thumbPath, 9),
    'gif' => imagegif($thumbImage, $thumbPath),
    'webp' => imagewebp($thumbImage, $thumbPath, 90),
    default => false
};

$fullSaved = match($extension) {
    'jpg' => imagejpeg($fullImage, $fullPath, 90),
    'png' => imagepng($fullImage, $fullPath, 9),
    'gif' => imagegif($fullImage, $fullPath),
    'webp' => imagewebp($fullImage, $fullPath, 90),
    default => false
};

// Clean up
imagedestroy($sourceImage);
imagedestroy($thumbImage);
imagedestroy($fullImage);

if (!$thumbSaved || !$fullSaved) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to save images']);
    exit;
}

// Return URLs (relative to web root)
// Dynamically determine base path from script location
// Handles both production (root /api/upload_avatar.php) and dev (/api/upload_avatar.php)
// Use REQUEST_URI if available (more reliable), fallback to SCRIPT_NAME
$requestPath = $_SERVER['REQUEST_URI'] ?? $_SERVER['SCRIPT_NAME'] ?? '/api/upload_avatar.php';
// Extract just the path part (remove query string if present)
$pathOnly = parse_url($requestPath, PHP_URL_PATH);
$scriptDir = dirname($pathOnly); // e.g., '/api' (root domain)

// Remove '/api' from the end if present to get the base path
$basePath = rtrim($scriptDir, '/');
if (substr($basePath, -4) === '/api') {
    $basePath = substr($basePath, 0, -4);
}
$basePath = rtrim($basePath, '/');

// Construct the avatar URL path
// If basePath is empty, we're at root, otherwise use the basePath
// Ensure we always have a leading slash and proper format
if ($basePath === '') {
    $baseUrl = '/avatars/';
} else {
    $baseUrl = '/' . ltrim($basePath, '/') . '/avatars/';
}

$response = [
    'success' => true,
    'urls' => [
        'thumb' => $baseUrl . $thumbFilename,
        'full' => $baseUrl . $fullFilename
    ],
    'photoUrl' => $baseUrl . $fullFilename, // Default to full size for photoUrl field
    'sizes' => [
        'thumb' => filesize($thumbPath),
        'full' => filesize($fullPath)
    ]
];

echo json_encode($response);

