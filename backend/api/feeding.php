<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

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
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $mysql->error]);
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
$postData = json_decode(file_get_contents('php://input'), true);

try {
    switch ($action) {
        case 'get_feeding_data':
            $childId = $_GET['child_id'] ?? null;
            if (!$childId) {
                echo json_encode(['status' => 'error', 'message' => 'Child ID lipsă']);
                exit;
            }
            $controller->getFeedingData($userId, $childId);
            break;

        case 'add_meal':
            $controller->addMeal($userId, $postData);
            break;

        case 'add_favorite':
            $controller->addFavorite($userId, $postData);
            break;

        case 'add_preference':
            $controller->addPreference($userId, $postData);
            break;

        case 'save_note':
            $controller->saveNote($userId, $postData);
            break;

        default:
            echo json_encode(['status' => 'error', 'message' => 'Acțiune invalidă']);
            break;
    }
    
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => 'Eroare Server: ' . $e->getMessage()]);
}
?>