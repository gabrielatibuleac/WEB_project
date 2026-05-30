<?php
header('Content-Type: application/json; charset=utf-8');

require_once '../config/db.php';
require_once '../utils/token_auth.php';
require_once '../controllers/TimelineController.php';

$user = requireAuth($mysql);
$userId = (int)$user["id"];

$controller = new TimelineController($mysql);
$action = $_GET["action"] ?? "";
$input = getJsonInput();

switch ($action) {
    case "list":
        $childId = (int)($_GET["child_id"] ?? 0);
        $response = $controller->listTimeline($userId, $childId);
        break;

    case "create":
        $response = $controller->createMoment($userId, $input);
        break;

    case "delete":
        $response = $controller->deleteMoment($userId, $input);
        break;

    default:
        $response = [
            "status" => "error",
            "message" => "Actiune invalida."
        ];
        break;
}

echo json_encode($response);