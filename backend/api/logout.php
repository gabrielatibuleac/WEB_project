<?php
header('Content-Type: application/json');

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

session_unset();
session_destroy();

echo json_encode([
    "status" => "success",
    "message" => "Logout successful"
]);