<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, DELETE');
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
    echo json_encode(['status' => 'error', 'message' => 'Database error']);
    exit;
}

$stmt->bind_param('s', $token_hash);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Token invalid']);
    exit;
}

$tokenData = $result->fetch_assoc();
$userId = $tokenData['user_id'];

require_once '../models/RelationsModel.php';
require_once '../controllers/RelationsController.php';

$model = new RelationsModel($mysql);
$controller = new RelationsController($model);

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
    $controller->getRelations($userId);
} 
elseif ($method === 'POST') {
    $postData = json_decode(file_get_contents('php://input'), true);
    
    if ($action === 'add') {
        $controller->addRelation($userId, $postData);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Acțiune invalidă']);
    }
} 
elseif ($method === 'DELETE') {
    $postData = json_decode(file_get_contents('php://input'), true);
    $controller->deleteRelation($userId, $postData['relation_id'] ?? null);
}
?>