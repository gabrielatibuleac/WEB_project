<?php
$hostname = "localhost";
$username = "root";
$password = "";
$database = "bain_db"; 
$mysql = new mysqli($hostname, $username, $password, $database);
if ($mysql->connect_error) {
    die(json_encode(["status" => "error", "message" => "Conexiunea la DB a esuat"]));
}