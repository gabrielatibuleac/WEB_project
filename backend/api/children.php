<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

try {
    require_once __DIR__ . '/../config/db.php';
    require_once __DIR__ . '/../utils/token_auth.php';
    require_once __DIR__ . '/../controllers/ChildController.php';

    $user = requireAuth($mysql);
    $userId = (int)$user["id"];

    $method = $_SERVER["REQUEST_METHOD"];
    $action = $_GET["action"] ?? "";
    $input = getJsonInput();

    $controller = new ChildController($mysql);

    if ($method === "GET" && $action === "list") {
        echo json_encode($controller->listChildren($userId));
        exit;
    }

    if ($method === "GET" && $action === "profile") {
        $childId = (int)($_GET["id"] ?? 0);
        echo json_encode($controller->getProfile($userId, $childId));
        exit;
    }

    if ($method === "POST" && $action === "create") {
        echo json_encode($controller->createChild($userId, $input));
        exit;
    }

    if ($method === "POST" && $action === "update") {
        echo json_encode($controller->updateChild($userId, $input));
        exit;
    }

    if ($method === "POST" && $action === "delete") {
        echo json_encode($controller->deleteChild($userId, $input));
        exit;
    }

    if ($method === "POST" && $action === "add_milestone") {
        echo json_encode($controller->addMilestone($userId, $input));
        exit;
    }

    if ($method === "POST" && $action === "add_caregiver") {
        echo json_encode($controller->addCaregiver($userId, $input));
        exit;
    }

    echo json_encode([
        "status" => "error",
        "message" => "Actiune invalida"
    ]);
} catch (Throwable $error) {
    http_response_code(500);

    echo json_encode([
        "status" => "error",
        "message" => "Eroare server.",
        "debug" => $error->getMessage()
    ]);
}