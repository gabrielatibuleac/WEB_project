<?php
class AdminModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getStats() {
        $stats = [];

        $queries = [
            "users" => "SELECT COUNT(*) AS total FROM users",
            "children" => "SELECT COUNT(*) AS total FROM children",
            "medical" => "SELECT COUNT(*) AS total FROM medical_records",
            "timeline" => "SELECT COUNT(*) AS total FROM timeline_moments",
            "shares" => "SELECT COUNT(*) AS total FROM share_records"
        ];

        foreach ($queries as $key => $sql) {
            $result = $this->db->query($sql);
            $stats[$key] = (int)$result->fetch_assoc()["total"];
        }

        return $stats;
    }

    public function getUsers() {
        $stmt = $this->db->prepare("
            SELECT 
                u.id,
                u.full_name,
                u.email,
                u.role,
                u.created_at,
                COUNT(c.id) AS children_count
            FROM users u
            LEFT JOIN children c ON c.user_id = u.id
            GROUP BY u.id, u.full_name, u.email, u.role, u.created_at
            ORDER BY u.created_at DESC
        ");

        $stmt->execute();

        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    public function getChildren() {
        $stmt = $this->db->prepare("
            SELECT 
                c.id,
                c.name,
                c.birth_date,
                c.gender,
                c.education_level,
                c.institution_name,
                c.created_at,
                u.full_name AS parent_name,
                u.email AS parent_email
            FROM children c
            INNER JOIN users u ON u.id = c.user_id
            ORDER BY c.created_at DESC
        ");

        $stmt->execute();

        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    public function updateUserRole($userId, $role) {
        $stmt = $this->db->prepare("UPDATE users SET role = ? WHERE id = ?");
        $stmt->bind_param("si", $role, $userId);

        return $stmt->execute();
    }

    public function deleteUser($userId) {
        $stmt = $this->db->prepare("DELETE FROM users WHERE id = ?");
        $stmt->bind_param("i", $userId);

        return $stmt->execute();
    }

    public function deleteChild($childId) {
        $stmt = $this->db->prepare("DELETE FROM children WHERE id = ?");
        $stmt->bind_param("i", $childId);

        return $stmt->execute();
    }
}