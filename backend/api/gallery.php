<?php
header('Content-Type: application/json');

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

require_once '../models/GalleryModel.php';
require_once '../controllers/GalleryController.php';

$galleryModel = new GalleryModel($mysql);
$galleryController = new GalleryController($galleryModel);

$method = $_SERVER['REQUEST_METHOD'];
$action = '';
$childId = null;
$mediaId = null;

if ($method === 'POST') {
    $content_type = $_SERVER['CONTENT_TYPE'] ?? '';
    if (strpos($content_type, 'application/json') !== false) {
        $json = json_decode(file_get_contents('php://input'), true);
        $action = $json['action'] ?? '';
        $childId = $json['child_id'] ?? null;
        $mediaId = $json['media_id'] ?? null;
    } else {
        $action = $_POST['action'] ?? '';
        $childId = $_POST['child_id'] ?? null;
        $mediaId = $_POST['media_id'] ?? null;
    }

    if ($action === 'delete_media') {
        if (!$mediaId) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Media ID mancat.']);
            exit;
        }
        
        $response = $galleryController->deleteMedia($userId, $mediaId);
        echo json_encode($response);
        exit;
    }
    $files = $_FILES['files'] ?? null;
    if ($files) {
        $response = $galleryController->handleUpload($userId, $childId, $files);
        echo json_encode($response);
        exit;
    }

    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Actiune invalida.']);
    exit;
}

if ($method === 'GET') {
    $action = $_GET['action'] ?? '';
    $childId = $_GET['child_id'] ?? null;

    if ($action === 'get_all') {
        if (!$childId) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Child ID mancat.']);
            exit;
        }
        
        $response = $galleryController->getGallery($userId, $childId);
        echo json_encode($response);
        exit;
    }
}

http_response_code(400);
echo json_encode(['status' => 'error', 'message' => 'Endpoint invalid.']);
?>