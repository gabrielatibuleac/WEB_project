<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST");

require_once '../config/db.php';
require_once '../controllers/SleepController.php';

$controller = new SleepController($mysql);

if($_SERVER ['REQUEST_METHOD']=== 'POST')
    {
          if (isset($_GET['action']) && $_GET['action'] === 'add') {
         $rawData = file_get_contents("php://input");
    
         $data = json_decode($rawData);
         $answer= $controller->createSleep($data);
         echo json_encode($answer);
    }
    }

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['action']) && $_GET['action'] === 'getMetrics') {
        $child_id = isset($_GET['child_id']) ? $_GET['child_id'] : null;
        
        $answer = $controller->getMetrics($child_id);
        
        echo json_encode($answer);
    }
}
    ?>
