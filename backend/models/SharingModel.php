<?php
class SharingModel {
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

    public function timelineMomentBelongsToChild($momentId, $childId) {
        $stmt = $this->db->prepare("SELECT id FROM timeline_moments WHERE id = ? AND child_id = ?");
        $stmt->bind_param("ii", $momentId, $childId);
        $stmt->execute();

        return $stmt->get_result()->num_rows > 0;
    }

    public function getShares($childId) {
        $stmt = $this->db->prepare("
            SELECT id, child_id, moment_id, title, channel, privacy, share_link, status, created_at
            FROM share_records
            WHERE child_id = ?
            ORDER BY created_at DESC
        ");

        $stmt->bind_param("i", $childId);
        $stmt->execute();

        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    public function createShare($childId, $momentId, $title, $channel, $privacy, $shareLink, $status) {
        $stmt = $this->db->prepare("
            INSERT INTO share_records (
                child_id,
                moment_id,
                title,
                channel,
                privacy,
                share_link,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->bind_param(
            "iisssss",
            $childId,
            $momentId,
            $title,
            $channel,
            $privacy,
            $shareLink,
            $status
        );

        if (!$stmt->execute()) {
            return false;
        }

        return $this->db->insert_id;
    }

    public function deleteShare($shareId, $childId) {
        $stmt = $this->db->prepare("DELETE FROM share_records WHERE id = ? AND child_id = ?");
        $stmt->bind_param("ii", $shareId, $childId);

        return $stmt->execute();
    }

    public function clearShares($childId) {
        $stmt = $this->db->prepare("DELETE FROM share_records WHERE child_id = ?");
        $stmt->bind_param("i", $childId);

        return $stmt->execute();
    }
}