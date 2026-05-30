<?php
class GalleryController {
    private $galleryModel;

    public function __construct($galleryModel) {
        $this->galleryModel = $galleryModel;
    }

   public function handleUpload($userId, $childId, $files) {
    if (!$childId || empty($files['name'][0])) {
        return ["status" => "error", "message" => "Date incomplete sau niciun fisier selectat."];
    }

    $uploadDir = __DIR__ . '/../../uploads/gallery/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true); 
    }

    $uploadedFilesCount = 0;

    foreach ($files['name'] as $key => $name) {
        if ($files['error'][$key] == 0) {
            $tmp_name = $files['tmp_name'][$key];
            $file_type = $files['type'][$key];
            
            $unique_name = time() . '_' . uniqid() . '_' . basename($name);
            $destination = $uploadDir . $unique_name;
            $db_file_path = '/WEB_project/uploads/gallery/' . $unique_name;  // ✅ SLASH HERE

            if (move_uploaded_file($tmp_name, $destination)) {
                $this->galleryModel->addMedia($userId, $childId, $name, $db_file_path, $file_type);
                $uploadedFilesCount++;
            }
        }
    }
    return ["status" => "success", "message" => "$uploadedFilesCount fisiere incarcate cu succes."];
}

    public function deleteMedia($userId, $mediaId) {
        if (!$mediaId) {
            return ["status" => "error", "message" => "ID fisier lipsa."];
        }
        $media = $this->galleryModel->getMediaById($userId, $mediaId);
        if (!$media) {
            return ["status" => "error", "message" => "Fisierul nu exista sau nu ai permisiunea."];
        }
        $fileName = basename($media['file_path']); 
        $physicalPath = __DIR__ . '/../../uploads/gallery/' . $fileName;

        if (file_exists($physicalPath)) {
            unlink($physicalPath); 
        }

        $success = $this->galleryModel->deleteMedia($userId, $mediaId);

        if ($success) {
            return ["status" => "success", "message" => "Fisier sters cu succes."];
        } else {
            return ["status" => "error", "message" => "Eroare la stergerea din baza de date."];
        }
    }
   public function getGallery($userId, $childId) {
        if (!$childId) {
            return ["status" => "error", "message" => "ID Copil lipsa."];
        }

        $media = $this->galleryModel->getMediaByChild($userId, $childId);

        $formatted_media = array_map(function($item) {
            return [
                "id" => $item['id'],
                "file_url" => $item['file_path'], 
                "capture_date" => $item['created_at'],
                "type" => strpos($item['file_type'], 'video') !== false ? 'video' : 'image'
            ];
        }, $media);

        return ["status" => "success", "media" => $formatted_media];
    }
}
?>  