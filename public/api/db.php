<?php
/**
 * S. SAWANT MENSWEAR — Centralized Backend Database Engine
 * 
 * Provides persistent, centralized storage for products, fabrics,
 * site configuration, banners, announcements, pricing, coupons,
 * orders, and appointments across all client devices.
 */

// Enable CORS for frontend applications
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

$dataDir = __DIR__ . '/data';
if (!file_exists($dataDir)) {
    @mkdir($dataDir, 0755, true);
}

$dbFile = $dataDir . '/store_db.json';
$auditFile = $dataDir . '/audit_log.json';

// Initial seed data if database is not created yet
function getInitialSeed() {
    return [
        'version' => round(microtime(true) * 1000),
        'updatedAt' => date('c'),
        'updatedBy' => 'System Initializer',
        'siteConfig' => [
            'heroEyebrow' => 'The art of fine tailoring · Chhatrapati Sambhajinagar',
            'heroTitle' => 'Timeless elegance.',
            'heroTitleAccent' => 'Tailored for you.',
            'heroSubtitle' => 'Experience the art of bespoke Indian menswear with considered fabrics, thoughtful details and a fit that feels unmistakably yours.',
            'heroImage' => '/images/editorial/hero-bespoke.jpg',
            'openingHours' => 'Monday – Saturday: 10:00 AM – 8:00 PM · Sunday: By Appointment',
            'upiId' => 'omawant170604@okicici',
            'announcementText' => 'Complimentary delivery over ₹10,000 ✦ Bespoke Indian Menswear · Chhatrapati Sambhajinagar',
            'announcementEnabled' => true,
            'announcementLink' => '/shop',
            'promotionalBannerText' => 'Wedding & Festive Season Atelier Booking Open',
            'promotionalBannerActive' => true,
            'contactPhone' => '+91 83088 78204',
            'contactEmail' => 'contact@ssawant.in',
            'contactAddress' => 'Opp. Tapadiya Park, Town Centre, CIDCO, Chhatrapati Sambhajinagar, Maharashtra 431003',
            'categoryImages' => [
                'shirts' => '/images/products/shirts/black-front.jpeg',
                'trousers' => '/images/products/trousers/light-grey-front.jpeg',
                'blazers' => '/images/editorial/hero-bespoke.jpg',
                'two-piece-suits' => '/images/products/suits/navy-two-piece-front.jpeg',
                'three-piece-suits' => '/images/products/waistcoats/navy-front.jpeg',
                'kurtas' => '/images/products/kurtas/ivory-front.png',
                'waistcoats' => '/images/products/waistcoats/navy-front.jpeg',
                'wedding-collection' => '/images/editorial/hero-bespoke.jpg',
            ],
        ],
        'products' => [],
        'fabricBrands' => ["Raymond", "Siyaram's", "Arvind Mills", "Linen Club", "J. Hampstead", "Graviera"],
        'fabricCatalog' => [],
        'pricing' => [
            'fabricPremiums' => [
                'Raymond' => 0,
                "Siyaram's" => 0,
                'Arvind Mills' => 0,
                'Linen Club' => 0,
                'J. Hampstead' => 0,
                'Graviera' => 0,
            ],
            'optionPremiums' => [
                'premiumButtons' => 0,
                'lining' => 0,
                'embroidery' => 0,
                'monogram' => 0,
            ],
            'priceRules' => [],
            'coupons' => [
                [
                    'code' => 'SAWANT10',
                    'discountPercent' => 10,
                    'active' => true,
                    'description' => '10% off your bespoke order',
                ],
            ],
        ],
        'orders' => [],
        'appointments' => [],
        'customers' => [],
    ];
}

function readDatabase($filePath) {
    if (!file_exists($filePath)) {
        $initial = getInitialSeed();
        file_put_contents($filePath, json_encode($initial, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        return $initial;
    }
    $raw = @file_get_contents($filePath);
    $data = @json_decode($raw, true);
    if (!$data || !is_array($data)) {
        $initial = getInitialSeed();
        file_put_contents($filePath, json_encode($initial, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        return $initial;
    }
    return $data;
}

function writeDatabase($filePath, $data) {
    $fp = @fopen($filePath, 'c+');
    if (!$fp) return false;
    if (flock($fp, LOCK_EX)) {
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
        return true;
    }
    fclose($fp);
    return false;
}

function appendAudit($auditPath, $entry) {
    $current = [];
    if (file_exists($auditPath)) {
        $current = @json_decode(@file_get_contents($auditPath), true) ?: [];
    }
    array_unshift($current, $entry);
    if (count($current) > 200) {
        $current = array_slice($current, 0, 200);
    }
    @file_put_contents($auditPath, json_encode($current, JSON_PRETTY_PRINT));
}

function isAdmin() {
    $role = $_SERVER['HTTP_X_ADMIN_ROLE'] ?? '';
    $email = $_SERVER['HTTP_X_ADMIN_EMAIL'] ?? '';
    if ($role === 'admin' && !empty($email)) {
        return $email;
    }
    // Also check Authorization Bearer token header if present
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (stripos($auth, 'admin') !== false) {
        return 'admin_token';
    }
    return false;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'all';

// GET: Version only (Ultra-lightweight real-time sync polling endpoint)
if ($method === 'GET' && $action === 'version') {
    $db = readDatabase($dbFile);
    echo json_encode([
        'ok' => true,
        'version' => $db['version'] ?? 0,
        'updatedAt' => $db['updatedAt'] ?? date('c'),
    ]);
    exit;
}

// GET: Single key
if ($method === 'GET' && $action === 'get') {
    $key = $_GET['key'] ?? '';
    if (!$key) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Missing key parameter.']);
        exit;
    }
    $db = readDatabase($dbFile);
    $value = $db[$key] ?? null;
    echo json_encode([
        'ok' => true,
        'key' => $key,
        'value' => $value,
        'version' => $db['version'] ?? 0,
        'updatedAt' => $db['updatedAt'] ?? date('c'),
    ]);
    exit;
}

// GET: All store collections (Public read for customer and admin pages)
if ($method === 'GET') {
    $db = readDatabase($dbFile);
    echo json_encode([
        'ok' => true,
        'version' => $db['version'] ?? 0,
        'updatedAt' => $db['updatedAt'] ?? date('c'),
        'data' => $db,
    ]);
    exit;
}

// POST: Save changes (Requires administrator authorization)
if ($method === 'POST') {
    $adminEmail = isAdmin();
    if (!$adminEmail) {
        http_response_code(403);
        echo json_encode([
            'ok' => false,
            'error' => 'Administrator authorization required (X-Admin-Role and X-Admin-Email header must be provided).',
        ]);
        exit;
    }

    $raw = file_get_contents('php://input');
    $payload = @json_decode($raw, true);
    if (!is_array($payload)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Invalid JSON payload.']);
        exit;
    }

    $db = readDatabase($dbFile);
    $newVersion = round(microtime(true) * 1000);
    $now = date('c');

    $changedKeys = [];

    // Batch update mode
    if (isset($payload['batch']) && is_array($payload['batch'])) {
        foreach ($payload['batch'] as $k => $v) {
            $db[$k] = $v;
            $changedKeys[] = $k;
        }
    }
    // Single key update mode
    elseif (isset($payload['key'])) {
        $k = $payload['key'];
        $db[$k] = $payload['value'] ?? null;
        $changedKeys[] = $k;
    }
    // Direct object update mode
    else {
        foreach ($payload as $k => $v) {
            if ($k !== 'version' && $k !== 'updatedAt' && $k !== 'updatedBy') {
                $db[$k] = $v;
                $changedKeys[] = $k;
            }
        }
    }

    $db['version'] = $newVersion;
    $db['updatedAt'] = $now;
    $db['updatedBy'] = $adminEmail;

    $saved = writeDatabase($dbFile, $db);
    if (!$saved) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Failed to write changes to database file.']);
        exit;
    }

    appendAudit($auditFile, [
        'timestamp' => $now,
        'version' => $newVersion,
        'admin' => $adminEmail,
        'changedKeys' => $changedKeys,
    ]);

    echo json_encode([
        'ok' => true,
        'message' => 'Changes permanently committed to database.',
        'version' => $newVersion,
        'updatedAt' => $now,
        'changedKeys' => $changedKeys,
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Method not allowed.']);
