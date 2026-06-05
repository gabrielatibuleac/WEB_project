<?php
class FeedingModel {
    private $mysql; 

    public function __construct($mysql) {
        $this->mysql = $mysql;
    }

    public function addMeal($childId, $date, $time, $type, $qty, $obs) {
        $sql = "INSERT INTO feeding_meals (child_id, meal_date, meal_time, meal_type, quantity, observations) 
                VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $this->mysql->prepare($sql);
        
        if (!$stmt) {
            return false;
        }
        
        $stmt->bind_param("isssss", $childId, $date, $time, $type, $qty, $obs);
        return $stmt->execute();
    }

    public function updateMeal($mealId, $time, $type, $qty, $obs) {
        $sql = "UPDATE feeding_meals 
                SET meal_time = ?, meal_type = ?, quantity = ?, observations = ? 
                WHERE id = ?";
        $stmt = $this->mysql->prepare($sql);
        
        if (!$stmt) {
            return false;
        }
        
        $stmt->bind_param("ssssi", $time, $type, $qty, $obs, $mealId);
        return $stmt->execute();
    }

    public function getMealsByDate($childId, $date) {
        $sql = "SELECT id, child_id, meal_date, meal_time, meal_type, quantity, observations 
                FROM feeding_meals 
                WHERE child_id = ? AND meal_date = ? 
                ORDER BY meal_time ASC";
        $stmt = $this->mysql->prepare($sql);
        
        if (!$stmt) {
            return [];
        }
        
        $stmt->bind_param("is", $childId, $date);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_all(MYSQLI_ASSOC);
    }

    public function deleteMeal($mealId) {
        $sql = "DELETE FROM feeding_meals WHERE id = ?";
        $stmt = $this->mysql->prepare($sql);
        
        if (!$stmt) {
            return false;
        }
        
        $stmt->bind_param("i", $mealId);
        return $stmt->execute();
    }

    public function addFavorite($childId, $foodName) {
        $sql = "INSERT INTO feeding_favorites (child_id, food_name) VALUES (?, ?)";
        $stmt = $this->mysql->prepare($sql);
        
        if (!$stmt) {
            return false;
        }
        
        $stmt->bind_param("is", $childId, $foodName);
        return $stmt->execute();
    }

    public function getFavorites($childId) {
        $sql = "SELECT id, food_name FROM feeding_favorites WHERE child_id = ? ORDER BY id DESC LIMIT 20";
        $stmt = $this->mysql->prepare($sql);
        
        if (!$stmt) {
            return [];
        }
        
        $stmt->bind_param("i", $childId);
        $stmt->execute();
        $result = $stmt->get_result();
        $arrayResult = $result->fetch_all(MYSQLI_ASSOC);
        return array_column($arrayResult, 'food_name');
    }

    public function addPreference($childId, $type, $text) {
        $sql = "INSERT INTO feeding_preferences (child_id, pref_type, description) VALUES (?, ?, ?)";
        $stmt = $this->mysql->prepare($sql);
        
        if (!$stmt) {
            return false;
        }
        
        $stmt->bind_param("iss", $childId, $type, $text);
        return $stmt->execute();
    }

    public function getPreferences($childId) {
        $sql = "SELECT id, pref_type as type, description as text 
                FROM feeding_preferences 
                WHERE child_id = ? 
                ORDER BY id DESC 
                LIMIT 20";
        $stmt = $this->mysql->prepare($sql);
        
        if (!$stmt) {
            return [];
        }
        
        $stmt->bind_param("i", $childId);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_all(MYSQLI_ASSOC);
    }

    public function getNotes($childId, $date) {
        $sql = "SELECT id, content 
                FROM feeding_notes 
                WHERE child_id = ? AND note_date = ? 
                ORDER BY id DESC 
                LIMIT 10";
        $stmt = $this->mysql->prepare($sql);
        
        if (!$stmt) {
            return [];
        }
        
        $stmt->bind_param("is", $childId, $date);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $notes = [];
        while ($row = $result->fetch_assoc()) {
            $notes[] = $row['content'];
        }
        return $notes;
    }

    public function addNote($childId, $date, $content) {
        $sql = "INSERT INTO feeding_notes (child_id, note_date, content) VALUES (?, ?, ?)";
        $stmt = $this->mysql->prepare($sql);
        
        if (!$stmt) {
            return false;
        }
        
        $stmt->bind_param("iss", $childId, $date, $content);
        return $stmt->execute();
    }
}
?>

