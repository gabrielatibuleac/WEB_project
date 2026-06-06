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

    private function denyAdmin() {
        http_response_code(403);

        return [
            "status" => "error",
            "message" => "Nu ai drepturi de administrator."
        ];
    }

    public function dashboard($user) {
        if (!$this->isAdmin($user)) {
            return $this->denyAdmin();
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
            return $this->denyAdmin();
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
            return $this->denyAdmin();
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
            return $this->denyAdmin();
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

    public function exportJson($user) {
        if (!$this->isAdmin($user)) {
            http_response_code(403);
            echo json_encode($this->denyAdmin());
            return;
        }

        $table = $_GET["table"] ?? "all";
        $data = $this->model->getExportData($table);

        if ($data === null) {
            http_response_code(400);
            echo json_encode([
                "status" => "error",
                "message" => "Tabela invalida pentru export."
            ]);
            return;
        }

        $filename = $table === "all" ? "bain_export_all.json" : "bain_export_" . $table . ".json";

        header('Content-Type: application/json; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');

        echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }

    public function exportCsv($user) {
        if (!$this->isAdmin($user)) {
            http_response_code(403);
            echo json_encode($this->denyAdmin());
            return;
        }

        $table = $_GET["table"] ?? "";

        if ($table === "" || $table === "all") {
            http_response_code(400);
            echo json_encode([
                "status" => "error",
                "message" => "Pentru CSV trebuie selectata o singura tabela."
            ]);
            return;
        }

        $rows = $this->model->getTableRows($table);
        $columns = $this->model->getAllowedColumns($table);

        if ($rows === null || $columns === null) {
            http_response_code(400);
            echo json_encode([
                "status" => "error",
                "message" => "Tabela invalida pentru export CSV."
            ]);
            return;
        }

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="bain_export_' . $table . '.csv"');

        $output = fopen('php://output', 'w');

        fputcsv($output, $columns);

        foreach ($rows as $row) {
            $line = [];

            foreach ($columns as $column) {
                $line[] = $row[$column] ?? "";
            }

            fputcsv($output, $line);
        }

        fclose($output);
    }

    public function importJson($user) {
        if (!$this->isAdmin($user)) {
            return $this->denyAdmin();
        }

        if (!isset($_FILES["file"]) || $_FILES["file"]["error"] !== UPLOAD_ERR_OK) {
            return [
                "status" => "error",
                "message" => "Fisier JSON lipsa sau invalid."
            ];
        }

        $content = file_get_contents($_FILES["file"]["tmp_name"]);
        $decoded = json_decode($content, true);

        if (!is_array($decoded)) {
            return [
                "status" => "error",
                "message" => "Fisier JSON invalid."
            ];
        }

        $selectedTable = $_POST["table"] ?? ($_GET["table"] ?? "all");
        $result = $this->model->importJsonData($decoded, $selectedTable);

        if (!$result["success"]) {
            return [
                "status" => "error",
                "message" => $result["message"]
            ];
        }

        return [
            "status" => "success",
            "message" => "Import JSON finalizat. Randuri importate: " . $result["imported"]
        ];
    }

    public function importCsv($user) {
        if (!$this->isAdmin($user)) {
            return $this->denyAdmin();
        }

        $table = $_POST["table"] ?? ($_GET["table"] ?? "");

        if ($table === "" || $table === "all") {
            return [
                "status" => "error",
                "message" => "Pentru CSV trebuie selectata o singura tabela."
            ];
        }

        if (!isset($_FILES["file"]) || $_FILES["file"]["error"] !== UPLOAD_ERR_OK) {
            return [
                "status" => "error",
                "message" => "Fisier CSV lipsa sau invalid."
            ];
        }

        $rows = [];
        $handle = fopen($_FILES["file"]["tmp_name"], "r");

        if (!$handle) {
            return [
                "status" => "error",
                "message" => "Fisierul CSV nu poate fi citit."
            ];
        }

        $headers = fgetcsv($handle);

        if (!$headers || count($headers) === 0) {
            fclose($handle);

            return [
                "status" => "error",
                "message" => "Fisier CSV fara antet."
            ];
        }

        while (($data = fgetcsv($handle)) !== false) {
            $row = [];

            foreach ($headers as $index => $header) {
                $row[$header] = $data[$index] ?? "";
            }

            $rows[] = $row;
        }

        fclose($handle);

        $result = $this->model->importRows($table, $rows);

        if (!$result["success"]) {
            return [
                "status" => "error",
                "message" => $result["message"]
            ];
        }

        return [
            "status" => "success",
            "message" => "Import CSV finalizat. Randuri importate: " . $result["imported"]
        ];
    }
}