<?php
class RelationsController {
    private $model;

    public function __construct($model) {
        $this->model = $model;
    }

    public function getRelations($userId) {
        $relations = $this->model->getRelationsByUser($userId);
        echo json_encode(['status' => 'success', 'relationships' => $relations]);
    }

    public function addRelation($userId, $data) {
        if (empty($data['child_id']) || empty($data['related_name']) || empty($data['relation_type'])) {
            echo json_encode(['status' => 'error', 'message' => 'Date incomplete']);
            return;
        }

        $success = $this->model->addRelation(
            $userId,
            $data['child_id'],
            $data['related_name'],
            $data['relation_type'],
            $data['notes'] ?? ''
        );

        echo json_encode(['status' => $success ? 'success' : 'error']);
    }

    public function deleteRelation($userId, $relationId) {
        if (!$relationId) {
            echo json_encode(['status' => 'error', 'message' => 'ID lipsă']);
            return;
        }

        $success = $this->model->deleteRelation($userId, $relationId);
        echo json_encode(['status' => $success ? 'success' : 'error']);
    }
}
?>