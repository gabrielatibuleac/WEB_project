<?php
class FeedingController {
    private $model;

    public function __construct($model) {
        $this->model = $model;
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

    public function getFeedingData($childId) {
        $today = date('Y-m-d');
        
        $mealsRaw = $this->model->getMealsByDate($childId, $today);
        $favorites = $this->model->getFavorites($childId);
        $preferences = $this->model->getPreferences($childId);

        $journal = [];
        $totalLiquids = 0;
        $totalCalories = 0; 

        foreach ($mealsRaw as $meal) {
            $timeFormatted = date('H:i', strtotime($meal['meal_time']));
            
            $journal[] = [
                'time' => $timeFormatted,
                'type' => $meal['meal_type'],
                'icon' => $this->getIconForMeal($meal['meal_type']),
                'qty' => $meal['quantity'],
                'obs' => $meal['observations']
            ];

            if (stripos($meal['quantity'], 'ml') !== false) {
                preg_match('/\d+/', $meal['quantity'], $matches);
                if (isset($matches[0])) {
                    $totalLiquids += (int)$matches[0];
                }
            }

           if ($meal['meal_type'] === 'Prânz' || $meal['meal_type'] === 'Cină') $totalCalories += 250;
            if ($meal['meal_type'] === 'Mic dejun' || $meal['meal_type'] === 'Lapte') $totalCalories += 150; 
            if ($meal['meal_type'] === 'Gustare') $totalCalories += 100;
        }

        $journalDesc = array_reverse($journal);
        $lastMeal = !empty($journalDesc) ? $journalDesc[0] : null;

        $response = [
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
        ];

        echo json_encode(['status' => 'success', 'data' => $response]);
    }

    public function addMeal($data) {
        if (empty($data['child_id']) || empty($data['time']) || empty($data['type']) || empty($data['qty'])) {
            echo json_encode(['status' => 'error', 'message' => 'Toate câmpurile sunt obligatorii.']);
            return;
        }
        $today = date('Y-m-d');
        $success = $this->model->addMeal($data['child_id'], $today, $data['time'], $data['type'], $data['qty'], $data['obs'] ?? '');
        echo json_encode(['status' => $success ? 'success' : 'error']);
    }

    public function addFavorite($data) {
        if (empty($data['child_id']) || empty($data['food_name'])) {
            echo json_encode(['status' => 'error', 'message' => 'Numele alimentului este obligatoriu.']);
            return;
        }
        $success = $this->model->addFavorite($data['child_id'], $data['food_name']);
        echo json_encode(['status' => $success ? 'success' : 'error']);
    }

    public function addPreference($data) {
        if (empty($data['child_id']) || empty($data['type']) || empty($data['text'])) {
            echo json_encode(['status' => 'error', 'message' => 'Toate câmpurile sunt obligatorii.']);
            return;
        }
        $success = $this->model->addPreference($data['child_id'], $data['type'], $data['text']);
        echo json_encode(['status' => $success ? 'success' : 'error']);
    }
    public function saveNote($data) {
        if (empty($data['child_id']) || empty($data['content'])) {
            echo json_encode(['status' => 'error', 'message' => 'Notița nu poate fi goală.']);
            return;
        }
        $today = date('Y-m-d');
        $success = $this->model->addNote($data['child_id'], $today, $data['content']);
        echo json_encode(['status' => $success ? 'success' : 'error']);
    }
}
?>