<?php
header('Content-Type: application/json; charset=utf-8');
require_once '../config/db.php';
require_once '../utils/token_auth.php';
require_once '../controllers/AccountController.php';

$user = requireAuth($mysql);
$userId = (int)$user["id"];
$controller = new AccountController($mysql);
$action = $_GET["action"] ?? "";
$input = getJsonInput();

switch ($action) {
    case "get":
        $response = $controller->getAccount($userId);
        break;

    case "update_profile":
        $response = $controller->updateProfile($userId, $input);
        break;

    case "update_settings":
        $response = $controller->updateSettings($userId, $input);
        break;

    default:
        $response = [
            "status" => "error",
            "message" => "Actiune invalida."
        ];
        break;
}
echo json_encode($response);