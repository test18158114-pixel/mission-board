<?php
// ========================================================
// DATABASE CONFIGURATION AND CORS HEADERS (INFINITYFREE)
// ========================================================

// Allow CORS preflight and standard requests
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle OPTIONS preflight requests immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database Credentials
// Replace with your actual InfinityFree MySQL settings from cPanel
define('DB_HOST', 'sql204.infinityfree.com'); 
define('DB_NAME', 'if0_42287754_mission_board');
define('DB_USER', 'if0_42287754');
define('DB_PASS', 'C0ao1o0Rry3Fmh2');

try {
    $conn = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    // Set the PDO error mode to exception
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $e) {
    echo json_encode([
        "error" => "Database Connection Failed: " . $e->getMessage()
    ]);
    exit();
}
?>
