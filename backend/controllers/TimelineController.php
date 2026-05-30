<?php
require_once __DIR__ . '/../models/TimelineModel.php';

class TimelineController {
    private $model;

    public function __construct($db) {
        $this->model = new TimelineModel($db);
    }

    private function nullableText($value) {
        $value = trim((string)($value ?? ""));
        return $value === "" ? null : $value;
    }

    public function listTimeline($userId, $childId) {
        $childId = (int)$childId;

        if ($childId <= 0 || !$this->model->childBelongsToUser($childId, $userId)) {
            return [
                "status" => "error",
                "message" => "Copil invalid."
            ];
        }

        $items = [];

        foreach ($this->model->getTimelineMoments($childId) as $moment) {
            $items[] = [
                "id" => "timeline_" . $moment["id"],
                "db_id" => (int)$moment["id"],
                "title" => $moment["title"],
                "description" => $moment["description"] ?? "",
                "type" => $moment["moment_type"],
                "date" => $moment["moment_date"],
                "time" => $moment["moment_time"] ?: "00:00",
                "likes" => (int)$moment["likes"],
                "comments" => (int)$moment["comments"],
                "source" => "timeline",
                "icon" => $this->getTypeIcon($moment["moment_type"])
            ];
        }

        foreach ($this->model->getMilestones($childId) as $milestone) {
            $items[] = [
                "id" => "milestone_" . $milestone["id"],
                "db_id" => (int)$milestone["id"],
                "title" => $milestone["title"],
                "description" => "Reper important adaugat in profilul copilului.",
                "type" => "progress",
                "date" => $milestone["milestone_date"],
                "time" => "00:00",
                "likes" => 0,
                "comments" => 0,
                "source" => "milestone",
                "icon" => "☆"
            ];
        }

        foreach ($this->model->getMedicalRecords($childId) as $record) {
            $items[] = [
                "id" => "medical_" . $record["id"],
                "db_id" => (int)$record["id"],
                "title" => $record["title"],
                "description" => $this->getMedicalLabel($record["record_type"]) . ": " . ($record["description"] ?? ""),
                "type" => "medical",
                "date" => $record["record_date"],
                "time" => $record["record_time"] ?: "00:00",
                "likes" => 0,
                "comments" => 0,
                "source" => "medical",
                "sourceLabel" => $this->getMedicalLabel($record["record_type"]),
                "icon" => "✚"
            ];
        }

        usort($items, function ($a, $b) {
            return strcmp(($b["date"] ?? "") . " " . ($b["time"] ?? "00:00"), ($a["date"] ?? "") . " " . ($a["time"] ?? "00:00"));
        });

        return [
            "status" => "success",
            "items" => $items
        ];
    }

    public function createMoment($userId, $data) {
        $childId = (int)($data["child_id"] ?? 0);
        $title = trim($data["title"] ?? "");
        $type = trim($data["type"] ?? "");
        $date = trim($data["date"] ?? "");
        $time = $this->nullableText($data["time"] ?? null);
        $description = $this->nullableText($data["description"] ?? null);

        $allowedTypes = ["feeding", "sleep", "progress", "medical", "social"];

        if ($childId <= 0 || !$this->model->childBelongsToUser($childId, $userId)) {
            return [
                "status" => "error",
                "message" => "Copil invalid."
            ];
        }

        if ($title === "" || $date === "" || !in_array($type, $allowedTypes, true)) {
            return [
                "status" => "error",
                "message" => "Date incomplete sau tip invalid."
            ];
        }

        if ($this->model->createMoment($childId, $title, $type, $date, $time, $description)) {
            return [
                "status" => "success",
                "message" => "Moment adaugat cu succes."
            ];
        }

        return [
            "status" => "error",
            "message" => "Momentul nu a putut fi adaugat."
        ];
    }

    public function deleteMoment($userId, $data) {
        $childId = (int)($data["child_id"] ?? 0);
        $momentId = (int)($data["id"] ?? 0);

        if ($childId <= 0 || !$this->model->childBelongsToUser($childId, $userId)) {
            return [
                "status" => "error",
                "message" => "Copil invalid."
            ];
        }

        if ($momentId <= 0) {
            return [
                "status" => "error",
                "message" => "Moment invalid."
            ];
        }

        if ($this->model->deleteMoment($momentId, $childId)) {
            return [
                "status" => "success",
                "message" => "Moment sters."
            ];
        }

        return [
            "status" => "error",
            "message" => "Momentul nu a putut fi sters."
        ];
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
}