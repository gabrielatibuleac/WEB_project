<?php
class GalleryModel {
    private $db;

    public function __construct($dbConnection) {
        $this->db = $dbConnection;
    }

    public function addMedia($userId, $childId, $fileName, $filePath, $fileType) {
        $stmt = $this->db->prepare("INSERT INTO gallery_media (user_id, child_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("iisss", $userId, $childId, $fileName, $filePath, $fileType);
        return $stmt->execute();
    }

    public function getMediaByChild($userId, $childId) {
        $stmt = $this->db->prepare("SELECT * FROM gallery_media WHERE user_id = ? AND child_id = ? ORDER BY created_at DESC");
        $stmt->bind_param("ii", $userId, $childId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result) {
            return $result->fetch_all(MYSQLI_ASSOC);
        }
        return [];
    }
    public function getMediaById($userId, $mediaId) {
        $stmt = $this->db->prepare("SELECT * FROM gallery_media WHERE id = ? AND user_id = ?");
        $stmt->bind_param("ii", $mediaId, $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result && $result->num_rows > 0) {
            return $result->fetch_assoc();
        }
        return null;
    }

    public function deleteMedia($userId, $mediaId) {
        $stmt = $this->db->prepare("DELETE FROM gallery_media WHERE id = ? AND user_id = ?");
        $stmt->bind_param("ii", $mediaId, $userId);
        return $stmt->execute();
    }

}
?>