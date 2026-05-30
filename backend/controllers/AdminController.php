<?php
require_once __DIR__ . '/../models/AdminModel.php';

class AdminController {
    private $model;

    public function __construct($db) {
        $this->model = new AdminModel($db);
    }

    private function isAdmin($user) {
        return isset($user["role"]) && $user["role"] === "admin";
    }

    public function dashboard($user) {
        if (!$this->isAdmin($user)) {
            http_response_code(403);

            return [
                "status" => "error",
                "message" => "Nu ai drepturi de administrator."
            ];
        }

        return [
            "status" => "success",
            "stats" => $this->model->getStats(),
            "users" => $this->model->getUsers(),
            "children" => $this->model->getChildren()
        ];
    }

    public function updateUserRole($user, $data) {
        if (!$this->isAdmin($user)) {
            http_response_code(403);

            return [
                "status" => "error",
                "message" => "Nu ai drepturi de administrator."
            ];
        }

        $userId = (int)($data["user_id"] ?? 0);
        $role = trim($data["role"] ?? "");

        if ($userId <= 0 || !in_array($role, ["user", "admin"], true)) {
            return [
                "status" => "error",
                "message" => "Date invalide."
            ];
        }

        if ($userId === (int)$user["id"] && $role !== "admin") {
            return [
                "status" => "error",
                "message" => "Nu iti poti elimina singur rolul de admin."
            ];
        }

        if ($this->model->updateUserRole($userId, $role)) {
            return [
                "status" => "success",
                "message" => "Rol actualizat."
            ];
        }

        return [
            "status" => "error",
            "message" => "Rolul nu a putut fi actualizat."
        ];
    }

    public function deleteUser($user, $data) {
        if (!$this->isAdmin($user)) {
            http_response_code(403);

            return [
                "status" => "error",
                "message" => "Nu ai drepturi de administrator."
            ];
        }

        $userId = (int)($data["user_id"] ?? 0);

        if ($userId <= 0) {
            return [
                "status" => "error",
                "message" => "Utilizator invalid."
            ];
        }

        if ($userId === (int)$user["id"]) {
            return [
                "status" => "error",
                "message" => "Nu iti poti sterge propriul cont de admin."
            ];
        }

        if ($this->model->deleteUser($userId)) {
            return [
                "status" => "success",
                "message" => "Utilizator sters."
            ];
        }

        return [
            "status" => "error",
            "message" => "Utilizatorul nu a putut fi sters."
        ];
    }

    public function deleteChild($user, $data) {
        if (!$this->isAdmin($user)) {
            http_response_code(403);

            return [
                "status" => "error",
                "message" => "Nu ai drepturi de administrator."
            ];
        }

        $childId = (int)($data["child_id"] ?? 0);

        if ($childId <= 0) {
            return [
                "status" => "error",
                "message" => "Copil invalid."
            ];
        }

        if ($this->model->deleteChild($childId)) {
            return [
                "status" => "success",
                "message" => "Copil sters."
            ];
        }

        return [
            "status" => "error",
            "message" => "Copilul nu a putut fi sters."
        ];
    }
}