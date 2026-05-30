<?php
header('Content-Type: application/json; charset=utf-8');

require_once '../config/db.php';
require_once '../utils/token_auth.php';

deleteCurrentAuthToken($mysql);

echo json_encode([
    "status" => "success",
    "message" => "Logout successful"
]);