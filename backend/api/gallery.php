<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Utilizator neautentificat."]);
    exit;
}

$userId = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

require_once '../config/db.php';
require_once '../models/GalleryModel.php';
require_once '../controllers/GalleryController.php';

$galleryModel = new GalleryModel($mysql);
$galleryController = new GalleryController($galleryModel);

if ($method === 'POST') {
    $action = $_POST['action'] ?? '';
    $childId = $_POST['child_id'] ?? null;

    if ($action === 'delete_media') {
        $mediaId = $_POST['media_id'] ?? null;
        $response = $galleryController->deleteMedia($userId, $mediaId);
        echo json_encode($response);
        exit;
    }
    $files = $_FILES['files'] ?? null;
    $response = $galleryController->handleUpload($userId, $childId, $files);
    echo json_encode($response);
    exit;
}

if ($method === 'GET') {
    $action = $_GET['action'] ?? '';
    $childId = $_GET['child_id'] ?? null;

    if ($action === 'get_all') {
        $response = $galleryController->getGallery($userId, $childId);
        echo json_encode($response);
        exit;
    }
}

echo json_encode(["status" => "error", "message" => "Endpoint invalid."]);
?>