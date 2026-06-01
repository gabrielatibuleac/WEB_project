<?php
class FeedingController {
    private $model;

    private $validMealTypes = ['Mic dejun', 'Gustare', 'Prânz', 'Cină', 'Apă'];
    private $validPreferenceTypes = ['check', 'warn'];

    public function __construct($model) {
        $this->model = $model;
    }

    private function validateChildId($childId) {
        if (!is_numeric($childId) || (int)$childId <= 0) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Child ID invalid']);
            exit;
        }
        return (int)$childId;
    }


    private function validateTime($time) {
        if (!preg_match('/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/', $time)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Format timp invalid. Folosește HH:MM']);
            exit;
        }
        return $time;
    }


    private function validateMealType($type) {
        if (!in_array($type, $this->validMealTypes)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Tip masă invalid']);
            exit;
        }
        return $type;
    }

 
    private function validatePreferenceType($type) {
        if (!in_array($type, $this->validPreferenceTypes)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Tip preferință invalid']);
            exit;
        }
        return $type;
    }


    private function validateQuantity($qty) {
        if (empty(trim($qty))) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Cantitatea nu poate fi goală']);
            exit;
        }
        if (strlen($qty) > 100) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Cantitatea prea lungă (max 100 caractere)']);
            exit;
        }
        return trim($qty);
    }

    private function calculateCalories($mealType) {
        $calorieMap = [
            'Mic dejun' => 150,
            'Gustare' => 100,
            'Prânz' => 250,
            'Cină' => 250,
            'Apă' => 0 
        ];
        return $calorieMap[$mealType] ?? 0;
    }

    private function getIconForMeal($type) {
        $icons = [
            'Mic dejun' => '🍳',
            'Gustare' => '🍎',
            'Prânz' => '🥣',
            'Cină' => '🍲',
            'Apă' => '💧'
        ];
        return $icons[$type] ?? '🍽️';
    }

    public function getFeedingData($userId, $childId) {
        $childId = $this->validateChildId($childId);
        $today = date('Y-m-d');
        
        $mealsRaw = $this->model->getMealsByDate($childId, $today);
        $favorites = $this->model->getFavorites($childId);
        $preferences = $this->model->getPreferences($childId);

        $journal = [];
        $totalLiquids = 0;
        $totalCalories = 0;

        foreach ($mealsRaw as $meal) {
            $timeFormatted = date('H:i', strtotime($meal['meal_time']));
            $mealType = $meal['meal_type'];
            
            $journal[] = [
                'id' => $meal['id'],
                'time' => $timeFormatted,
                'type' => $mealType,
                'icon' => $this->getIconForMeal($mealType),
                'qty' => $meal['quantity'],
                'obs' => $meal['observations'] ?? ''
            ];

            if ($mealType === 'Apă') {
                preg_match('/\d+/', $meal['quantity'], $matches);
                if (isset($matches[0])) {
                    $totalLiquids += (int)$matches[0];
                }
            }

            $totalCalories += $this->calculateCalories($mealType);
        }

        $journalDesc = array_reverse($journal);
        $lastMeal = !empty($journalDesc) ? $journalDesc[0] : null;

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'data' => [
                'summary' => [
                    'meals' => count($journal),
                    'liquids' => $totalLiquids,
                    'calories' => $totalCalories
                ],
                'journal' => $journalDesc,
                'lastMeal' => $lastMeal,
                'notes' => $this->model->getNotes($childId, $today),
                'favorites' => $favorites,
                'preferences' => $preferences
            ]
        ]);
    }

    public function addMeal($userId, $data) {
        if (empty($data['child_id']) || empty($data['time']) || empty($data['type']) || empty($data['qty'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Toate câmpurile sunt obligatorii']);
            return;
        }

        $childId = $this->validateChildId($data['child_id']);
        $time = $this->validateTime($data['time']);
        $type = $this->validateMealType($data['type']);
        $qty = $this->validateQuantity($data['qty']);
        $obs = isset($data['obs']) ? substr(trim($data['obs']), 0, 500) : '';

        $today = date('Y-m-d');
        $success = $this->model->addMeal($childId, $today, $time, $type, $qty, $obs);
        
        if ($success) {
            http_response_code(201);
            echo json_encode(['status' => 'success', 'message' => 'Masă adăugată']);
        } else {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Eroare la adăugare masă']);
        }
    }

    public function updateMeal($userId, $mealId, $data) {
        if (empty($data['child_id']) || empty($data['time']) || empty($data['type']) || empty($data['qty'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Toate câmpurile sunt obligatorii']);
            return;
        }

        $childId = $this->validateChildId($data['child_id']);
        if (!is_numeric($mealId) || (int)$mealId <= 0) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Meal ID invalid']);
            return;
        }

        $time = $this->validateTime($data['time']);
        $type = $this->validateMealType($data['type']);
        $qty = $this->validateQuantity($data['qty']);
        $obs = isset($data['obs']) ? substr(trim($data['obs']), 0, 500) : '';

        $success = $this->model->updateMeal((int)$mealId, $time, $type, $qty, $obs);
        
        if ($success) {
            http_response_code(200);
            echo json_encode(['status' => 'success', 'message' => 'Masă actualizată']);
        } else {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Eroare la actualizare masă']);
        }
    }

    public function addFavorite($userId, $data) {
        if (empty($data['child_id']) || empty($data['food_name'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Toate câmpurile sunt obligatorii']);
            return;
        }

        $childId = $this->validateChildId($data['child_id']);
        $foodName = substr(trim($data['food_name']), 0, 100);

        if (empty($foodName)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Numele alimentului nu poate fi gol']);
            return;
        }

        $success = $this->model->addFavorite($childId, $foodName);
        
        if ($success) {
            http_response_code(201);
            echo json_encode(['status' => 'success', 'message' => 'Aliment adăugat']);
        } else {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Eroare la adăugare aliment']);
        }
    }

    public function addPreference($userId, $data) {
        if (empty($data['child_id']) || empty($data['type']) || empty($data['text'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Toate câmpurile sunt obligatorii']);
            return;
        }

        $childId = $this->validateChildId($data['child_id']);
        $type = $this->validatePreferenceType($data['type']);
        $text = substr(trim($data['text']), 0, 255);

        if (empty($text)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Descrierea nu poate fi goală']);
            return;
        }

        $success = $this->model->addPreference($childId, $type, $text);
        
        if ($success) {
            http_response_code(201);
            echo json_encode(['status' => 'success', 'message' => 'Preferință adăugată']);
        } else {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Eroare la adăugare preferință']);
        }
    }

    public function saveNote($userId, $data) {
        if (empty($data['child_id']) || empty($data['content'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Notița nu poate fi goală']);
            return;
        }

        $childId = $this->validateChildId($data['child_id']);
        $content = substr(trim($data['content']), 0, 1000);

        $today = date('Y-m-d');
        $success = $this->model->addNote($childId, $today, $content);
        
        if ($success) {
            http_response_code(201);
            echo json_encode(['status' => 'success', 'message' => 'Notă salvată']);
        } else {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Eroare la salvare notă']);
        }
    }

    public function deleteMeal($userId, $mealId) {
        if (!is_numeric($mealId) || (int)$mealId <= 0) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Meal ID invalid']);
            return;
        }

        $success = $this->model->deleteMeal((int)$mealId);
        
        if ($success) {
            http_response_code(200);
            echo json_encode(['status' => 'success', 'message' => 'Masă ștearsă']);
        } else {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Masă nu găsită']);
        }
    }
}
?>
