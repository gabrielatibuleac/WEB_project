<?php
class DashboardModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function childBelongsToUser($childId, $userId) {
        $stmt = $this->db->prepare("SELECT id, name, birth_date FROM children WHERE id = ? AND user_id = ?");
        $stmt->bind_param("ii", $childId, $userId);
        $stmt->execute();

        return $stmt->get_result()->fetch_assoc();
    }

    public function getMedicalRecords($childId) {
        $stmt = $this->db->prepare("
            SELECT id, record_type, title, description, record_date, record_time, created_at
            FROM medical_records
            WHERE child_id = ?
            ORDER BY record_date DESC, created_at DESC
        ");
        $stmt->bind_param("i", $childId);
        $stmt->execute();

        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    public function getEmergencyContactsCount($childId) {
        $stmt = $this->db->prepare("SELECT COUNT(*) AS total FROM emergency_contacts WHERE child_id = ?");
        $stmt->bind_param("i", $childId);
        $stmt->execute();

        return (int)$stmt->get_result()->fetch_assoc()["total"];
    }

    public function getCaregiversCount($childId) {
        $stmt = $this->db->prepare("SELECT COUNT(*) AS total FROM child_caregivers WHERE child_id = ?");
        $stmt->bind_param("i", $childId);
        $stmt->execute();

        return (int)$stmt->get_result()->fetch_assoc()["total"];
    }

    public function getMilestones($childId) {
        $stmt = $this->db->prepare("
            SELECT id, title, milestone_date, created_at
            FROM child_milestones
            WHERE child_id = ?
            ORDER BY milestone_date DESC
        ");
        $stmt->bind_param("i", $childId);
        $stmt->execute();

        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    public function getTimelineMoments($childId) {
        $stmt = $this->db->prepare("
            SELECT id, title, moment_type, moment_date, moment_time, description, likes, comments, created_at
            FROM timeline_moments
            WHERE child_id = ?
            ORDER BY moment_date DESC, moment_time DESC, created_at DESC
        ");
        $stmt->bind_param("i", $childId);
        $stmt->execute();

        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    public function getTodayMeals($childId, $today) {
        $stmt = $this->db->prepare("
            SELECT id, meal_time, meal_type, quantity, observations
            FROM feeding_meals
            WHERE child_id = ? AND meal_date = ?
            ORDER BY meal_time ASC
        ");
        $stmt->bind_param("is", $childId, $today);
        $stmt->execute();

        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }
    public function getNotifications($userId) {
    $stmt = $this->db->prepare("
        SELECT id, title, message, notification_type, is_read, created_at
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 10
    ");

    $stmt->bind_param("i", $userId);
    $stmt->execute();

    return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
}
    public function getTodaySleepLogs($childId, $today) {
        $stmt = $this->db->prepare("
            SELECT id, sleep_type, start_time, end_time, notes, quality
            FROM sleep_logs
            WHERE child_id = ? AND sleep_date = ?
            ORDER BY start_time ASC
        ");
        $stmt->bind_param("is", $childId, $today);
        $stmt->execute();

        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }
}