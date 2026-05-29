<?php
header('Content-Type: application/json; charset=utf-8');

require_once '../config/db.php';
require_once '../utils/token_auth.php';
require_once '../controllers/SharingController.php';

$user = requireAuth($mysql);
$userId = (int)$user["id"];

$controller = new SharingController($mysql);
$action = $_GET["action"] ?? "";
$input = getJsonInput();

switch ($action) {
    case "list":
        $childId = (int)($_GET["child_id"] ?? 0);
        $response = $controller->listShares($userId, $childId);
        break;

    case "create":
        $response = $controller->createShare($userId, $input);
        break;

    case "delete":
        $response = $controller->deleteShare($userId, $input);
        break;

    case "clear":
        $response = $controller->clearShares($userId, $input);
        break;

    default:
        $response = [
            "status" => "error",
            "message" => "Actiune invalida."
        ];
        break;
}

echo json_encode($response);