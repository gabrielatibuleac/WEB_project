<?php
class ChildModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getChildrenByUser($userId) {
        $stmt = $this->db->prepare("SELECT * FROM children WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    public function getChildById($childId, $userId) {
        $stmt = $this->db->prepare("SELECT * FROM children WHERE id = ? AND user_id = ?");
        $stmt->bind_param("ii", $childId, $userId);
        $stmt->execute();
        return $stmt->get_result()->fetch_assoc();
    }

    public function createChild($userId, $data) {
        $stmt = $this->db->prepare("INSERT INTO children (user_id, name, birth_date, blood_type, allergies, kindergarten_name, kindergarten_group, educator_name, height_cm, weight_kg, bmi, favorite_activities, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param(
            "isssssssdddss",
            $userId,
            $data["name"],
            $data["birth_date"],
            $data["blood_type"],
            $data["allergies"],
            $data["kindergarten_name"],
            $data["kindergarten_group"],
            $data["educator_name"],
            $data["height_cm"],
            $data["weight_kg"],
            $data["bmi"],
            $data["favorite_activities"],
            $data["description"]
        );
        return $stmt->execute();
    }

    public function updateChild($childId, $userId, $data) {
        $stmt = $this->db->prepare("UPDATE children SET name = ?, birth_date = ?, blood_type = ?, allergies = ?, kindergarten_name = ?, kindergarten_group = ?, educator_name = ?, height_cm = ?, weight_kg = ?, bmi = ?, favorite_activities = ?, description = ? WHERE id = ? AND user_id = ?");
        $stmt->bind_param(
            "sssssssdddssii",
            $data["name"],
            $data["birth_date"],
            $data["blood_type"],
            $data["allergies"],
            $data["kindergarten_name"],
            $data["kindergarten_group"],
            $data["educator_name"],
            $data["height_cm"],
            $data["weight_kg"],
            $data["bmi"],
            $data["favorite_activities"],
            $data["description"],
            $childId,
            $userId
        );
        return $stmt->execute();
    }

    public function deleteChild($childId, $userId) {
        $stmt = $this->db->prepare("DELETE FROM children WHERE id = ? AND user_id = ?");
        $stmt->bind_param("ii", $childId, $userId);
        return $stmt->execute();
    }

    public function getMilestones($childId) {
        $stmt = $this->db->prepare("SELECT * FROM child_milestones WHERE child_id = ? ORDER BY milestone_date DESC");
        $stmt->bind_param("i", $childId);
        $stmt->execute();
        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    public function addMilestone($childId, $title, $date) {
        $stmt = $this->db->prepare("INSERT INTO child_milestones (child_id, title, milestone_date) VALUES (?, ?, ?)");
        $stmt->bind_param("iss", $childId, $title, $date);
        return $stmt->execute();
    }

    public function getCaregivers($childId) {
        $stmt = $this->db->prepare("SELECT * FROM child_caregivers WHERE child_id = ? ORDER BY created_at DESC");
        $stmt->bind_param("i", $childId);
        $stmt->execute();
        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    public function addCaregiver($childId, $name, $role, $accessLevel) {
        $stmt = $this->db->prepare("INSERT INTO child_caregivers (child_id, name, role, access_level) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("isss", $childId, $name, $role, $accessLevel);
        return $stmt->execute();
    }
}