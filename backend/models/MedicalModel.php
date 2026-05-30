<?php
class MedicalModel {
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

    public function getRecords($childId) {
        $stmt = $this->db->prepare("
            SELECT id, child_id, record_type, title, description, record_date, record_time, created_at
            FROM medical_records
            WHERE child_id = ?
            ORDER BY record_date DESC, created_at DESC
        ");

        $stmt->bind_param("i", $childId);
        $stmt->execute();

        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    public function createRecord($childId, $recordType, $title, $description, $recordDate, $recordTime) {
        $stmt = $this->db->prepare("
            INSERT INTO medical_records (
                child_id,
                record_type,
                title,
                description,
                record_date,
                record_time
            ) VALUES (?, ?, ?, ?, ?, ?)
        ");

        $stmt->bind_param(
            "isssss",
            $childId,
            $recordType,
            $title,
            $description,
            $recordDate,
            $recordTime
        );

        return $stmt->execute();
    }

    public function deleteRecord($recordId, $childId) {
        $stmt = $this->db->prepare("DELETE FROM medical_records WHERE id = ? AND child_id = ?");
        $stmt->bind_param("ii", $recordId, $childId);

        return $stmt->execute();
    }

    public function getEmergencyContacts($childId) {
        $stmt = $this->db->prepare("
            SELECT id, child_id, name, phone, relation, details, created_at
            FROM emergency_contacts
            WHERE child_id = ?
            ORDER BY created_at DESC
        ");

        $stmt->bind_param("i", $childId);
        $stmt->execute();

        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    public function createEmergencyContact($childId, $name, $phone, $relation, $details) {
        $stmt = $this->db->prepare("
            INSERT INTO emergency_contacts (
                child_id,
                name,
                phone,
                relation,
                details
            ) VALUES (?, ?, ?, ?, ?)
        ");

        $stmt->bind_param(
            "issss",
            $childId,
            $name,
            $phone,
            $relation,
            $details
        );

        return $stmt->execute();
    }

    public function deleteEmergencyContact($contactId, $childId) {
        $stmt = $this->db->prepare("DELETE FROM emergency_contacts WHERE id = ? AND child_id = ?");
        $stmt->bind_param("ii", $contactId, $childId);

        return $stmt->execute();
    }

    public function getLastErrorCode() {
        return $this->db->errno;
    }
    public function createNotification($userId, $childId, $title, $message, $type) {
    $stmt = $this->db->prepare("
        INSERT INTO notifications (user_id, child_id, title, message, notification_type)
        VALUES (?, ?, ?, ?, ?)
    ");

    $stmt->bind_param("iisss", $userId, $childId, $title, $message, $type);
    return $stmt->execute();
}
}