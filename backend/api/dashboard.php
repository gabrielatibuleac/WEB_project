<?php
date_default_timezone_set('Europe/Bucharest');

header('Content-Type: application/json; charset=utf-8');

require_once '../config/db.php';
require_once '../utils/token_auth.php';
require_once '../controllers/DashboardController.php';

$user = requireAuth($mysql);
$userId = (int)$user["id"];

$controller = new DashboardController($mysql);
$action = $_GET["action"] ?? "";

switch ($action) {
    case "summary":
        $childId = (int)($_GET["child_id"] ?? 0);
        $response = $controller->summary($userId, $childId);
        break;

    default:
        $response = [
            "status" => "error",
            "message" => "Actiune invalida."
        ];
        break;
}

echo json_encode($response);