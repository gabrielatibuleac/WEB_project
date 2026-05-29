<?php
class TimelineModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function childBelongsToUser($childId, $userId) {
        $stmt = $this->db->prepare("SELECT id FROM children WHERE id = ? AND user_id = ?");
        $stmt->bind_param("ii", $childId, $userId);
        $stmt->execute();

        return $stmt->get_result()->num_rows > 0;
    }

    public function getTimelineMoments($childId) {
        $stmt = $this->db->prepare("
            SELECT id, child_id, title, moment_type, moment_date, moment_time, description, likes, comments, created_at
            FROM timeline_moments
            WHERE child_id = ?
            ORDER BY moment_date DESC, moment_time DESC, created_at DESC
        ");
        $stmt->bind_param("i", $childId);
        $stmt->execute();

        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
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

    public function getMedicalRecords($childId) {
        $stmt = $this->db->prepare("
            SELECT id, record_type, title, description, record_date, record_time, created_at
            FROM medical_records
            WHERE child_id = ?
            ORDER BY record_date DESC, record_time DESC, created_at DESC
        ");
        $stmt->bind_param("i", $childId);
        $stmt->execute();

        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    public function createMoment($childId, $title, $type, $date, $time, $description) {
        $stmt = $this->db->prepare("
            INSERT INTO timeline_moments (
                child_id,
                title,
                moment_type,
                moment_date,
                moment_time,
                description
            ) VALUES (?, ?, ?, ?, ?, ?)
        ");

        $stmt->bind_param("isssss", $childId, $title, $type, $date, $time, $description);

        return $stmt->execute();
    }

    public function deleteMoment($momentId, $childId) {
        $stmt = $this->db->prepare("DELETE FROM timeline_moments WHERE id = ? AND child_id = ?");
        $stmt->bind_param("ii", $momentId, $childId);

        return $stmt->execute();
    }
}