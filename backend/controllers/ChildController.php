<?php
require_once __DIR__ . '/../models/ChildModel.php';

class ChildController {
    private $model;

    public function __construct($db) {
        $this->model = new ChildModel($db);
    }

    private function nullableText($value) {
        $value = trim((string)($value ?? ""));
        return $value === "" ? null : $value;
    }

    private function nullableNumber($value) {
        if ($value === null || $value === "") {
            return null;
        }

        return is_numeric($value) ? (float)$value : null;
    }

    private function cleanChildData($data) {
        return [
            "name" => trim($data["name"] ?? ""),
            "birth_date" => trim($data["birth_date"] ?? ""),
            "gender" => $this->nullableText($data["gender"] ?? null),
            "blood_type" => $this->nullableText($data["blood_type"] ?? null),
            "allergies" => $this->nullableText($data["allergies"] ?? null),
            "education_level" => $this->nullableText($data["education_level"] ?? null),
            "institution_name" => $this->nullableText($data["institution_name"] ?? null),
            "group_or_class" => $this->nullableText($data["group_or_class"] ?? null),
            "responsible_person" => $this->nullableText($data["responsible_person"] ?? null),
            "height_cm" => $this->nullableNumber($data["height_cm"] ?? null),
            "weight_kg" => $this->nullableNumber($data["weight_kg"] ?? null),
            "bmi" => $this->nullableNumber($data["bmi"] ?? null),
            "favorite_activities" => $this->nullableText($data["favorite_activities"] ?? null),
            "description" => $this->nullableText($data["description"] ?? null)
        ];
    }

    public function listChildren($userId) {
        return [
            "status" => "success",
            "children" => $this->model->getChildrenByUser($userId)
        ];
    }

    public function createChild($userId, $data) {
        $child = $this->cleanChildData($data);

        if ($child["name"] === "" || $child["birth_date"] === "") {
            return ["status" => "error", "message" => "Numele si data nasterii sunt obligatorii."];
        }

        if ($this->model->createChild($userId, $child)) {
            return ["status" => "success", "message" => "Copil adaugat cu succes."];
        }

        return ["status" => "error", "message" => "Copilul nu a putut fi adaugat."];
    }

    public function updateChild($userId, $data) {
        $childId = (int)($data["id"] ?? 0);
        $child = $this->cleanChildData($data);

        if ($childId <= 0) {
            return ["status" => "error", "message" => "Copil invalid."];
        }

        if ($this->model->updateChild($childId, $userId, $child)) {
            return ["status" => "success", "message" => "Profil actualizat cu succes."];
        }

        return ["status" => "error", "message" => "Profilul nu a putut fi actualizat."];
    }

    public function deleteChild($userId, $data) {
        $childId = (int)($data["id"] ?? 0);

        if ($childId <= 0) {
            return ["status" => "error", "message" => "Copil invalid."];
        }

        if ($this->model->deleteChild($childId, $userId)) {
            return ["status" => "success", "message" => "Copil sters cu succes."];
        }

        return ["status" => "error", "message" => "Copilul nu a putut fi sters."];
    }

    public function getProfile($userId, $childId) {
        $child = $this->model->getChildById($childId, $userId);

        if (!$child) {
            return ["status" => "error", "message" => "Copilul nu exista."];
        }

        return [
            "status" => "success",
            "child" => $child,
            "milestones" => $this->model->getMilestones($childId),
            "caregivers" => $this->model->getCaregivers($childId)
        ];
    }

    public function addMilestone($userId, $data) {
        $childId = (int)($data["child_id"] ?? 0);
        $title = trim($data["title"] ?? "");
        $date = trim($data["milestone_date"] ?? "");

        if (!$this->model->getChildById($childId, $userId)) {
            return ["status" => "error", "message" => "Copil invalid."];
        }

        if ($title === "" || $date === "") {
            return ["status" => "error", "message" => "Date incomplete."];
        }

        if ($this->model->addMilestone($childId, $title, $date)) {
            return ["status" => "success", "message" => "Reper adaugat cu succes."];
        }

        return ["status" => "error", "message" => "Reperul nu a putut fi adaugat."];
    }

    public function addCaregiver($userId, $data) {
        $childId = (int)($data["child_id"] ?? 0);
        $name = trim($data["name"] ?? "");
        $role = trim($data["role"] ?? "");
        $accessLevel = trim($data["access_level"] ?? "");

        if (!$this->model->getChildById($childId, $userId)) {
            return ["status" => "error", "message" => "Copil invalid."];
        }

        if ($name === "" || $role === "" || $accessLevel === "") {
            return ["status" => "error", "message" => "Date incomplete."];
        }

        if ($this->model->addCaregiver($childId, $name, $role, $accessLevel)) {
            return ["status" => "success", "message" => "Ingrijitor adaugat cu succes."];
        }

        return ["status" => "error", "message" => "Ingrijitorul nu a putut fi adaugat."];
    }
}