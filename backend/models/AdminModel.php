<?php
class AdminModel {
    private $db;

    private $allowedTables = [
        "users",
        "account_profiles",
        "account_settings",
        "children",
        "child_caregivers",
        "child_milestones",
        "emergency_contacts",
        "feeding_favorites",
        "feeding_meals",
        "feeding_notes",
        "feeding_preferences",
        "gallery_albums",
        "gallery_media",
        "medical_records",
        "notifications",
        "relations",
        "relation_notes",
        "share_records",
        "sleep_logs",
        "timeline_moments"
    ];

    private $blockedColumns = [
        "users" => ["password", "reset_token", "reset_token_expires_at"],
        "auth_tokens" => ["token_hash"]
    ];

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

    public function getAllowedTableNames() {
        return $this->allowedTables;
    }

    public function getAllowedColumns($table) {
        if (!$this->isAllowedTable($table)) {
            return null;
        }

        return $this->getRealColumns($table);
    }

    public function getTableRows($table) {
        if (!$this->isAllowedTable($table)) {
            return null;
        }

        $columns = $this->getRealColumns($table);

        if (!$columns || count($columns) === 0) {
            return [];
        }

        $escapedColumns = [];

        foreach ($columns as $column) {
            $escapedColumns[] = "`" . $column . "`";
        }

        $orderColumn = in_array("id", $columns, true) ? "id" : $columns[0];

        $sql = "SELECT " . implode(", ", $escapedColumns) . " FROM `" . $table . "` ORDER BY `" . $orderColumn . "` ASC";
        $result = $this->db->query($sql);

        if (!$result) {
            throw new Exception($this->db->error);
        }

        return $result->fetch_all(MYSQLI_ASSOC);
    }

    public function getExportData($table) {
        if ($table === "all") {
            $data = [
                "exported_at" => date("Y-m-d H:i:s"),
                "tables" => []
            ];

            foreach ($this->allowedTables as $tableName) {
                $data["tables"][$tableName] = $this->getTableRows($tableName);
            }

            return $data;
        }

        if (!$this->isAllowedTable($table)) {
            return null;
        }

        return [
            "exported_at" => date("Y-m-d H:i:s"),
            "table" => $table,
            "rows" => $this->getTableRows($table)
        ];
    }

    public function importJsonData($data, $selectedTable) {
        $imported = 0;

        if (isset($data["table"]) && isset($data["rows"]) && is_array($data["rows"])) {
            return $this->importRows($data["table"], $data["rows"]);
        }

        if (isset($data["tables"]) && is_array($data["tables"])) {
            $this->db->begin_transaction();

            try {
                foreach ($data["tables"] as $table => $rows) {
                    if (!$this->isAllowedTable($table) || !is_array($rows)) {
                        continue;
                    }

                    $imported += $this->importRowsInternal($table, $rows);
                }

                $this->db->commit();

                return [
                    "success" => true,
                    "imported" => $imported,
                    "message" => "Import complet."
                ];
            } catch (Throwable $error) {
                $this->db->rollback();

                return [
                    "success" => false,
                    "imported" => $imported,
                    "message" => "Eroare import JSON: " . $error->getMessage()
                ];
            }
        }

        if (is_array($data) && $selectedTable !== "all" && $this->isAllowedTable($selectedTable)) {
            return $this->importRows($selectedTable, $data);
        }

        return [
            "success" => false,
            "imported" => 0,
            "message" => "Structura JSON invalida."
        ];
    }

    public function importRows($table, $rows) {
        if (!$this->isAllowedTable($table)) {
            return [
                "success" => false,
                "imported" => 0,
                "message" => "Tabela invalida pentru import."
            ];
        }

        if (!is_array($rows)) {
            return [
                "success" => false,
                "imported" => 0,
                "message" => "Date invalide pentru import."
            ];
        }

        $this->db->begin_transaction();

        try {
            $imported = $this->importRowsInternal($table, $rows);
            $this->db->commit();

            return [
                "success" => true,
                "imported" => $imported,
                "message" => "Import finalizat."
            ];
        } catch (Throwable $error) {
            $this->db->rollback();

            return [
                "success" => false,
                "imported" => 0,
                "message" => "Eroare import: " . $error->getMessage()
            ];
        }
    }

    private function importRowsInternal($table, $rows) {
        $realColumns = $this->getAllRealColumns($table);
        $exportColumns = $this->getRealColumns($table);
        $imported = 0;

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $cleanRow = [];

            foreach ($exportColumns as $column) {
                if (array_key_exists($column, $row) && $row[$column] !== "") {
                    $cleanRow[$column] = $row[$column];
                }
            }

            if ($table === "users" && in_array("password", $realColumns, true) && !array_key_exists("password", $cleanRow)) {
                $cleanRow["password"] = password_hash("BainImported123!", PASSWORD_DEFAULT);
            }

            if (count($cleanRow) === 0) {
                continue;
            }

            $columns = array_keys($cleanRow);
            $placeholders = array_fill(0, count($columns), "?");
            $updates = [];

            foreach ($columns as $column) {
                if ($column !== "id" && $column !== "password") {
                    $updates[] = "`" . $column . "` = VALUES(`" . $column . "`)";
                }
            }

            if (count($updates) === 0) {
                continue;
            }

            $escapedColumns = [];

            foreach ($columns as $column) {
                $escapedColumns[] = "`" . $column . "`";
            }

            $sql = "
                INSERT INTO `" . $table . "` (" . implode(", ", $escapedColumns) . ")
                VALUES (" . implode(", ", $placeholders) . ")
                ON DUPLICATE KEY UPDATE " . implode(", ", $updates) . "
            ";

            $stmt = $this->db->prepare($sql);

            if (!$stmt) {
                throw new Exception($this->db->error);
            }

            $types = str_repeat("s", count($columns));
            $values = array_values($cleanRow);

            $stmt->bind_param($types, ...$values);

            if (!$stmt->execute()) {
                throw new Exception($stmt->error);
            }

            $imported++;
        }

        return $imported;
    }

    private function isAllowedTable($table) {
        return in_array($table, $this->allowedTables, true);
    }

    private function getRealColumns($table) {
        $columns = $this->getAllRealColumns($table);
        $blocked = $this->blockedColumns[$table] ?? [];

        return array_values(array_filter($columns, function($column) use ($blocked) {
            return !in_array($column, $blocked, true);
        }));
    }

    private function getAllRealColumns($table) {
        if (!$this->isAllowedTable($table)) {
            return [];
        }

        $result = $this->db->query("SHOW COLUMNS FROM `" . $table . "`");

        if (!$result) {
            throw new Exception($this->db->error);
        }

        $columns = [];

        while ($row = $result->fetch_assoc()) {
            $columns[] = $row["Field"];
        }

        return $columns;
    }
}