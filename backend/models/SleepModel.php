<?php
class SleepModel {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function addSleep($child_id, $sleep_type, $start_time, $end_time, $notes, $quality) {
        $query = "INSERT INTO sleep_logs (child_id, sleep_type, start_time, end_time, notes, quality) 
                  VALUES (?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->conn->prepare($query);
        
        if (!$stmt) {
            return false;
        }

        $stmt->bind_param("issssi", $child_id, $sleep_type, $start_time, $end_time, $notes, $quality);
        
        return $stmt->execute();
    }

    public function getSleepData($child_id) {
        $query = "SELECT * FROM sleep_logs WHERE child_id = ? ORDER BY created_at DESC";
        
        $stmt = $this->conn->prepare($query);
        if (!$stmt) return []; 

        $stmt->bind_param("i", $child_id);
        $stmt->execute();
        
        $result = $stmt->get_result();
        $data = [];
        
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        
        return $data; 
    }
}
?>