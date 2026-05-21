<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

try {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }

    $dbPath = __DIR__ . '/../config/db.php';
    $controllerPath = __DIR__ . '/../controllers/ChildController.php';

    if (!file_exists($dbPath)) {
        echo json_encode([
            "status" => "error",
            "message" => "Fisierul db.php nu exista.",
            "path" => $dbPath
        ]);
        exit;
    }

    if (!file_exists($controllerPath)) {
        echo json_encode([
            "status" => "error",
            "message" => "Fisierul ChildController.php nu exista.",
            "path" => $controllerPath
        ]);
        exit;
    }

    require_once $dbPath;
    require_once $controllerPath;

    if (empty($_SESSION["isLoggedIn"]) || empty($_SESSION["user_id"])) {
        http_response_code(401);
        echo json_encode([
            "status" => "error",
            "message" => "User not authenticated"
        ]);
        exit;
    }

    $userId = (int)$_SESSION["user_id"];
    $method = $_SERVER["REQUEST_METHOD"];
    $action = $_GET["action"] ?? "";
    $input = json_decode(file_get_contents("php://input"), true) ?? [];

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