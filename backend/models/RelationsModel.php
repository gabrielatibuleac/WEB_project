<?php
class RelationsModel {
    private $db;

    public function __construct($dbConnection) {
        $this->db = $dbConnection;
    }

    public function getRelationsByUser($userId) {
        $query = "SELECT * FROM relationships WHERE user_id = ? ORDER BY created_at DESC";
        $stmt = $this->db->prepare($query);
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_all(MYSQLI_ASSOC);
    }

    public function addRelation($userId, $childId, $relatedName, $relationType, $notes = '') {
        $query = "INSERT INTO relationships (user_id, child_id, related_name, relation_type, notes) 
                  VALUES (?, ?, ?, ?, ?)";
        $stmt = $this->db->prepare($query);
        $stmt->bind_param("iisss", $userId, $childId, $relatedName, $relationType, $notes);
        return $stmt->execute();
    }

    public function deleteRelation($userId, $relationId) {
        $query = "DELETE FROM relationships WHERE id = ? AND user_id = ?";
        $stmt = $this->db->prepare($query);
        $stmt->bind_param("ii", $relationId, $userId);
        return $stmt->execute();
    }

    public function updateRelation($userId, $relationId, $childId, $relatedName, $relationType, $notes = '') {
        $query = "UPDATE relationships SET child_id = ?, related_name = ?, relation_type = ?, notes = ? 
                  WHERE id = ? AND user_id = ?";
        $stmt = $this->db->prepare($query);
        $stmt->bind_param("isssii", $childId, $relatedName, $relationType, $notes, $relationId, $userId);
        return $stmt->execute();
    }
}
?>