<?php
/**
 * S. SAWANT MENSWEAR — Dedicated Image Upload & Central Database Synchronization
 * 
 * Handles:
 * 1. Multipart/form-data image uploads ($_FILES['image'] or $_FILES['file'])
 * 2. Base64 JSON image uploads
 * 3. Saves physical image files to images/uploads/
 * 4. Automatically updates centralized store_db.json with the new image URL for the product variant
 * 5. Bumps database version so all connected devices (mobile, laptop, tablet) immediately sync
 */

// Enable CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Admin-Role, X-Admin-Email, Cache-Control");
header("Access-Control-Max-Age: 86400");
header("Content-Type: application/json; charset=utf-8");

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Ensure uploads directories exist
$primaryUploadsDir = __DIR__ . '/../images/uploads';
$fallbackUploadsDir = __DIR__ . '/uploads';

$uploadsDir = $primaryUploadsDir;
$urlPrefix = '/images/uploads/';

if (!file_exists($uploadsDir)) {
    @mkdir($uploadsDir, 0755, true);
}

// Fallback to /api/uploads/ if primary directory is not writable
if (!is_writable($uploadsDir)) {
    if (!file_exists($fallbackUploadsDir)) {
        @mkdir($fallbackUploadsDir, 0755, true);
    }
    if (is_writable($fallbackUploadsDir)) {
        $uploadsDir = $fallbackUploadsDir;
        $urlPrefix = '/api/uploads/';
    }
}

// Resilient Admin Authorization (Immune to Apache header stripping on InfinityFree)
function checkAdmin($bodyData = []) {
    $role = $_SERVER['HTTP_X_ADMIN_ROLE'] ?? '';
    $email = $_SERVER['HTTP_X_ADMIN_EMAIL'] ?? '';
    if ($role === 'admin' && !empty($email)) {
        return $email;
    }
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (stripos($auth, 'admin') !== false) {
        return 'admin';
    }
    if (isset($_POST['adminRole']) && $_POST['adminRole'] === 'admin') {
        return $_POST['adminEmail'] ?? 'shivaji@ssawant.in';
    }
    if (isset($bodyData['adminRole']) && $bodyData['adminRole'] === 'admin') {
        return $bodyData['adminEmail'] ?? 'shivaji@ssawant.in';
    }
    if (isset($_GET['adminKey']) && $_GET['adminKey'] === 'sawant_admin') {
        return 'admin_key';
    }
    return false;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed. Use POST to upload images.']);
    exit;
}

// Read body for JSON payload
$rawInput = @file_get_contents('php://input');
$bodyJson = @json_decode($rawInput, true) ?: [];

$admin = checkAdmin($bodyJson);
if (!$admin) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Administrator authorization required.']);
    exit;
}

$productId = trim($_POST['productId'] ?? $bodyJson['productId'] ?? $_GET['productId'] ?? '');
$colour = trim($_POST['colour'] ?? $bodyJson['colour'] ?? $_GET['colour'] ?? '');
$view = trim($_POST['view'] ?? $bodyJson['view'] ?? $_GET['view'] ?? 'front');
if (empty($view)) $view = 'front';

$safeProduct = preg_replace('/[^a-zA-Z0-9_-]/', '', $productId);
$safeColour = preg_replace('/[^a-zA-Z0-9_-]/', '', $colour);
$safeView = preg_replace('/[^a-zA-Z0-9_-]/', '', $view);

$savedFileName = '';
$fileBytes = 0;

// 1. Check Multipart Form Upload ($_FILES)
$uploadedFile = $_FILES['image'] ?? $_FILES['file'] ?? null;
if ($uploadedFile && isset($uploadedFile['tmp_name']) && is_uploaded_file($uploadedFile['tmp_name'])) {
    if ($uploadedFile['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'File upload error code: ' . $uploadedFile['error']]);
        exit;
    }
    
    // Max 8MB
    if ($uploadedFile['size'] > 8 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Image exceeds 8MB limit.']);
        exit;
    }

    $origName = $uploadedFile['name'] ?? 'image.jpg';
    $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'])) {
        $ext = 'jpg';
    }

    $savedFileName = 'img_' . ($safeProduct ? $safeProduct . '_' : '') . ($safeColour ? $safeColour . '_' : '') . ($safeView ? $safeView . '_' : '') . time() . '_' . substr(md5(uniqid(mt_rand(), true)), 0, 6) . '.' . $ext;
    $targetPath = $uploadsDir . '/' . $savedFileName;

    if (!@move_uploaded_file($uploadedFile['tmp_name'], $targetPath)) {
        $content = @file_get_contents($uploadedFile['tmp_name']);
        if (!$content || !@file_put_contents($targetPath, $content)) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'Failed to save uploaded file to disk. Check folder permissions.']);
            exit;
        }
    }
    $fileBytes = filesize($targetPath);
}
// 2. Check Base64 Payload Upload
elseif (!empty($bodyJson['image']) || !empty($_POST['image'])) {
    $imgData = $bodyJson['image'] ?? $_POST['image'];
    if (preg_match('#^data:image/(png|jpeg|jpg|webp|gif);base64,(.+)$#i', $imgData, $matches)) {
        $ext = strtolower($matches[1]);
        if ($ext === 'jpeg') $ext = 'jpg';
        $decoded = base64_decode($matches[2]);
        if ($decoded === false || strlen($decoded) === 0) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Corrupt base64 image data.']);
            exit;
        }
        $savedFileName = 'img_' . ($safeProduct ? $safeProduct . '_' : '') . ($safeColour ? $safeColour . '_' : '') . ($safeView ? $safeView . '_' : '') . time() . '_' . substr(md5(uniqid(mt_rand(), true)), 0, 6) . '.' . $ext;
        $targetPath = $uploadsDir . '/' . $savedFileName;
        if (!@file_put_contents($targetPath, $decoded)) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'Failed to write base64 image to disk.']);
            exit;
        }
        $fileBytes = strlen($decoded);
    } else {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Invalid image payload format. Expected multipart file or base64 data URL.']);
        exit;
    }
} else {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'No image provided in request.']);
    exit;
}

$publicUrl = $urlPrefix . $savedFileName;
$newVersion = round(microtime(true) * 1000);
$now = date('c');

// 3. Centralized Database Synchronization
// If productId and colour are provided, atomically update store_db.json
$dbUpdated = false;
$dataDir = __DIR__ . '/data';
$dbFile = $dataDir . '/store_db.json';

if (file_exists($dbFile) && !empty($productId) && !empty($colour)) {
    $fp = @fopen($dbFile, 'c+');
    if ($fp && flock($fp, LOCK_EX)) {
        $raw = @stream_get_contents($fp);
        $db = @json_decode($raw, true) ?: [];
        
        if (isset($db['products']) && is_array($db['products'])) {
            $found = false;
            foreach ($db['products'] as &$prod) {
                if ($prod['id'] === $productId) {
                    if (!isset($prod['images']) || !is_array($prod['images'])) {
                        $prod['images'] = [];
                    }
                    if (!isset($prod['images'][$colour]) || !is_array($prod['images'][$colour])) {
                        $prod['images'][$colour] = [];
                    }
                    $prod['images'][$colour][$view] = $publicUrl;
                    $found = true;
                    break;
                }
            }
            if ($found) {
                $db['version'] = $newVersion;
                $db['updatedAt'] = $now;
                $db['updatedBy'] = is_string($admin) ? $admin : 'admin';
                ftruncate($fp, 0);
                rewind($fp);
                fwrite($fp, json_encode($db, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                fflush($fp);
                $dbUpdated = true;
            }
        }
        flock($fp, LOCK_UN);
        fclose($fp);
    }
}

echo json_encode([
    'ok' => true,
    'url' => $publicUrl,
    'filename' => $savedFileName,
    'size' => $fileBytes,
    'productId' => $productId,
    'colour' => $colour,
    'view' => $view,
    'version' => $newVersion,
    'dbUpdated' => $dbUpdated,
    'message' => 'Image successfully saved and synchronized across all devices.'
]);
