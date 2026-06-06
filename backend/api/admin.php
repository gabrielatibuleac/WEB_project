<?php
header('Content-Type: application/json; charset=utf-8');

require_once '../config/db.php';
require_once '../utils/token_auth.php';
require_once '../controllers/AdminController.php';

$user = requireAuth($mysql);
$controller = new AdminController($mysql);

$action = $_GET["action"] ?? "";

if ($action === "export_json") {
    $controller->exportJson($user);
    exit;
}

if ($action === "export_csv") {
    $controller->exportCsv($user);
    exit;
}

$input = getJsonInput();

switch ($action) {
    case "dashboard":
        $response = $controller->dashboard($user);
        break;

    case "update_role":
        $response = $controller->updateUserRole($user, $input);
        break;

    case "delete_user":
        $response = $controller->deleteUser($user, $input);
        break;

    case "delete_child":
        $response = $controller->deleteChild($user, $input);
        break;

    case "import_json":
        $response = $controller->importJson($user);
        break;

    case "import_csv":
        $response = $controller->importCsv($user);
        break;

    default:
        $response = [
            "status" => "error",
            "message" => "Actiune invalida."
        ];
        break;
}

echo json_encode($response);