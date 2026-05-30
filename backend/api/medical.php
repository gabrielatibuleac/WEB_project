<?php
header('Content-Type: application/json; charset=utf-8');

require_once '../config/db.php';
require_once '../utils/token_auth.php';
require_once '../controllers/MedicalController.php';

$user = requireAuth($mysql);
$userId = (int)$user["id"];

$controller = new MedicalController($mysql);
$action = $_GET["action"] ?? "";
$input = getJsonInput();

switch ($action) {
    case "list":
        $childId = (int)($_GET["child_id"] ?? 0);
        $response = $controller->listMedical($userId, $childId);
        break;

    case "create_record":
        $response = $controller->createRecord($userId, $input);
        break;

    case "delete_record":
        $response = $controller->deleteRecord($userId, $input);
        break;

    case "create_emergency":
        $response = $controller->createEmergencyContact($userId, $input);
        break;

    case "delete_emergency":
        $response = $controller->deleteEmergencyContact($userId, $input);
        break;

    default:
        $response = [
            "status" => "error",
            "message" => "Actiune invalida."
        ];
        break;
}

echo json_encode($response);