<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST");
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

require_once '../controllers/SleepController.php';

$controller = new SleepController($mysql);

if($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_GET['action']) && $_GET['action'] === 'add') {
        $rawData = file_get_contents("php://input");
        $data = json_decode($rawData);
        
        $answer = $controller->createSleep($userId, $data);
        echo json_encode($answer);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['action']) && $_GET['action'] === 'getMetrics') {
        $child_id = isset($_GET['child_id']) ? $_GET['child_id'] : null;
        
        if (!$child_id) {
            echo json_encode(['status' => 'error', 'message' => 'Child ID lipsă']);
            exit;
        }
        
        $answer = $controller->getMetrics($userId, $child_id);
        echo json_encode($answer);
    }
}
?>