<?php
header('Content-Type: application/json');

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

if (!empty($_SESSION["isLoggedIn"])) {
    echo json_encode([
        "status" => "success",
        "user" => [
            "id" => $_SESSION["user_id"] ?? null,
            "name" => $_SESSION["username"] ?? "User",
            "email" => $_SESSION["email"] ?? ""
        ]
    ]);
    exit;
}

http_response_code(401);

echo json_encode([
    "status" => "error",
    "message" => "User not authenticated"
]);