<?php
header('Content-Type: application/json'); 
require_once '../config/db.php';
require_once '../controllers/AuthController.php';
$input = json_decode(file_get_contents('php://input'), true);
$controller = new AuthController($mysql);
$response = $controller->handleLogin($input);
echo json_encode($response);