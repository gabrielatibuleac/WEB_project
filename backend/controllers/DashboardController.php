<?php
require_once __DIR__ . '/../models/DashboardModel.php';

class DashboardController {
    private $model;

    public function __construct($db) {
        $this->model = new DashboardModel($db);
    }

    public function summary($userId, $childId) {
        $childId = (int)$childId;
        $child = $this->model->childBelongsToUser($childId, $userId);

        if (!$child) {
            return [
                "status" => "error",
                "message" => "Copil invalid."
            ];
        }

        $today = date("Y-m-d");

        $medicalRecords = $this->model->getMedicalRecords($childId);
        $timelineMoments = $this->model->getTimelineMoments($childId);
        $milestones = $this->model->getMilestones($childId);
        $meals = $this->model->getTodayMeals($childId, $today);
        $sleepLogs = $this->model->getTodaySleepLogs($childId, $today);

        $schedule = [];
        $recentMoments = [];

        foreach ($medicalRecords as $record) {
            $recordDate = $this->normalizeDate($record["record_date"] ?? null);
            $recordTime = $record["record_time"] ?: "Astazi";
            $label = $this->getMedicalLabel($record["record_type"]);

            if ($recordDate === $today) {
                $schedule[] = [
                    "time" => $recordTime,
                    "title" => $record["title"],
                    "description" => $label . ": " . ($record["description"] ?? ""),
                    "type" => "medical"
                ];
            }

            $recentMoments[] = [
                "date" => $recordDate,
                "time" => $record["record_time"] ?: "00:00",
                "title" => $record["title"],
                "description" => $label . ": " . ($record["description"] ?? ""),
                "type" => "medical",
                "icon" => "✚",
                "likes" => 0
            ];
        }

        foreach ($timelineMoments as $moment) {
            if ($moment["moment_date"] === $today) {
                $schedule[] = [
                    "time" => $moment["moment_time"] ?: "Astazi",
                    "title" => $moment["title"],
                    "description" => $moment["description"] ?? "",
                    "type" => $moment["moment_type"]
                ];
            }

            $recentMoments[] = [
                "date" => $moment["moment_date"],
                "time" => $moment["moment_time"] ?: "00:00",
                "title" => $moment["title"],
                "description" => $moment["description"] ?? "",
                "type" => $moment["moment_type"],
                "icon" => $this->getTypeIcon($moment["moment_type"]),
                "likes" => (int)$moment["likes"]
            ];
        }

        foreach ($milestones as $milestone) {
            $recentMoments[] = [
                "date" => $milestone["milestone_date"],
                "time" => "00:00",
                "title" => $milestone["title"],
                "description" => "Reper important adaugat in profilul copilului.",
                "type" => "progress",
                "icon" => "☆",
                "likes" => 0
            ];
        }

        foreach ($meals as $meal) {
            $schedule[] = [
                "time" => $meal["meal_time"],
                "title" => $meal["meal_type"],
                "description" => "Hranire: " . $meal["quantity"],
                "type" => "feeding"
            ];
        }

        foreach ($sleepLogs as $sleep) {
            $schedule[] = [
                "time" => $sleep["start_time"] ?: "Astazi",
                "title" => $sleep["sleep_type"],
                "description" => $sleep["notes"] ?: "Somn adaugat.",
                "type" => "sleep"
            ];
        }

        usort($recentMoments, function ($a, $b) {
            return strcmp(($b["date"] ?? "") . " " . ($b["time"] ?? "00:00"), ($a["date"] ?? "") . " " . ($a["time"] ?? "00:00"));
        });

        usort($schedule, function ($a, $b) {
            return strcmp($a["time"] ?? "", $b["time"] ?? "");
        });

        $sleepMinutes = $this->calculateSleepMinutes($sleepLogs);
        $medicalCount = count($medicalRecords);
        $memoryCount = count($timelineMoments) + count($milestones) + count($medicalRecords);

        return [
        "status" => "success",
        "child" => $child,
        "summary" => [
            "feeding_count" => count($meals),
            "sleep_minutes" => $sleepMinutes,
            "medical_count" => $medicalCount,
            "memory_count" => $memoryCount,
            "caregivers_count" => $this->model->getCaregiversCount($childId),
            "emergency_count" => $this->model->getEmergencyContactsCount($childId),
            "today_schedule" => array_slice($schedule, 0, 6),
            "recent_moments" => array_slice($recentMoments, 0, 5),
            "notifications" => $this->model->getNotifications($userId)
        ]
    ];
    }

    private function calculateSleepMinutes($sleepLogs) {
        $total = 0;

        foreach ($sleepLogs as $sleep) {
            if (empty($sleep["start_time"]) || empty($sleep["end_time"])) {
                continue;
            }

            $start = strtotime("1970-01-01 " . $sleep["start_time"]);
            $end = strtotime("1970-01-01 " . $sleep["end_time"]);

            if ($end < $start) {
                $end += 24 * 60 * 60;
            }

            $total += (int)(($end - $start) / 60);
        }

        return $total;
    }

    private function getMedicalLabel($type) {
        $labels = [
            "vaccine" => "Vaccin",
            "visit" => "Programare medicala",
            "medication" => "Medicatie",
            "allergy" => "Alergie",
            "note" => "Nota medicala"
        ];

        return $labels[$type] ?? "Medical";
    }

    private function getTypeIcon($type) {
        $icons = [
            "feeding" => "🍼",
            "sleep" => "☾",
            "progress" => "☆",
            "medical" => "✚",
            "social" => "♧"
        ];

        return $icons[$type] ?? "☆";
    }
    private function normalizeDate($date) {
    if (!$date) {
        return null;
    }

    return date("Y-m-d", strtotime($date));
}
}