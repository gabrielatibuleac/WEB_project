<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *'); 
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Content-Security-Policy: default-src \'self\'');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$headers = getallheaders();
$token = '';

if (isset($headers['Authorization'])) {
    $auth_header = $headers['Authorization'];
    if (strpos($auth_header, 'Bearer ') === 0) {
        $token = substr($auth_header, 7);
    }
}

if (empty($token)) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Utilizator neautentificat.']);
    exit;
}

require_once '../config/db.php';

$token_hash = hash('sha256', $token);
$query = "SELECT user_id FROM auth_tokens WHERE token_hash = ? AND expires_at > NOW()";
$stmt = $mysql->prepare($query);

if (!$stmt) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database error']);
    exit;
}

$stmt->bind_param('s', $token_hash);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Token invalid sau expirat.']);
    exit;
}

$tokenData = $result->fetch_assoc();
$userId = $tokenData['user_id'];

require_once '../models/FeedingModel.php';
require_once '../controllers/FeedingController.php';

$model = new FeedingModel($mysql);
$controller = new FeedingController($model);

$action = $_GET['action'] ?? '';
$postData = json_decode(file_get_contents('php://input'), true) ?? [];
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($action) {
        case 'get_feeding_data':
            $childId = $_GET['child_id'] ?? null;
            if (!$childId) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'Child ID lipsă']);
                exit;
            }
            $controller->getFeedingData($userId, $childId);
            break;

        case 'add_meal':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
                exit;
            }
            $controller->addMeal($userId, $postData);
            break;

        case 'update_meal':
            if ($method !== 'PUT') {
                http_response_code(405);
                echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
                exit;
            }
            $mealId = $_GET['meal_id'] ?? null;
            if (!$mealId) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'Meal ID lipsă']);
                exit;
            }
            $controller->updateMeal($userId, $mealId, $postData);
            break;

        case 'add_favorite':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
                exit;
            }
            $controller->addFavorite($userId, $postData);
            break;

        case 'add_preference':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
                exit;
            }
            $controller->addPreference($userId, $postData);
            break;

        case 'save_note':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
                exit;
            }
            $controller->saveNote($userId, $postData);
            break;

        case 'delete_meal':
            if ($method !== 'DELETE') {
                http_response_code(405);
                echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
                exit;
            }
            $mealId = $_GET['meal_id'] ?? null;
            if (!$mealId) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'Meal ID lipsă']);
                exit;
            }
            $controller->deleteMeal($userId, $mealId);
            break;

        default:
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Acțiune invalidă']);
            break;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Eroare Server: ' . $e->getMessage()]);
}
?>
