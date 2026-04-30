<?php
header('Content-Type: application/json');
require_once '../config/db.php';
require_once '../controllers/AuthController.php';
$input = json_decode(file_get_contents('php://input'), true);
$controller = new AuthController($mysql);
if (isset($input['email']) && isset($input['password'])) {
    $response = $controller->handleForgotPassword($input['email'], $input['password']);
} else {
    $response = ["status" => "error", "message" => "Date incomplete."];
}
echo json_encode($response);