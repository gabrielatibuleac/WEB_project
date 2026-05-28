<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/db.php'; 
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
            $controller->getFeedingData($childId);
            break;

        case 'add_meal':
            $controller->addMeal($postData);
            break;

        case 'add_favorite':
            $controller->addFavorite($postData);
            break;

        case 'add_preference':
            $controller->addPreference($postData);
            break;
        case 'save_note':
            $controller->saveNote($postData);
            break;

        default:
            echo json_encode(['status' => 'error', 'message' => 'Acțiune invalidă']);
            break;
    }
    
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => 'Eroare Server: ' . $e->getMessage()]);
}
?>