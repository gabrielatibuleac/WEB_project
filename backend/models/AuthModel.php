<?php
class AuthModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function emailExists($email) {
        $stmt = $this->db->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();

        return $stmt->get_result()->num_rows > 0;
    }

    public function getUserByEmail($email) {
        $stmt = $this->db->prepare("SELECT id, full_name, email, password, role FROM users WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();

        return $stmt->get_result()->fetch_assoc();
    }

    public function register($name, $email, $password, $role) {
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $this->db->prepare("
            INSERT INTO users (full_name, email, password, role)
            VALUES (?, ?, ?, ?)
        ");

        $stmt->bind_param("ssss", $name, $email, $hashedPassword, $role);

        return $stmt->execute();
    }

    public function updatePasswordDirectly($email, $hashedPassword) {
        $stmt = $this->db->prepare("UPDATE users SET password = ? WHERE email = ?");
        $stmt->bind_param("ss", $hashedPassword, $email);

        return $stmt->execute();
    }
}