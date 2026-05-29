<?php
require_once __DIR__ . '/../models/AuthModel.php';
require_once __DIR__ . '/../utils/token_auth.php';

class AuthController {
    private $db;
    private $model;
    private $adminCode = "2026";

    public function __construct($db) {
        $this->db = $db;
        $this->model = new AuthModel($db);
    }

    public function handleLogin($data) {
        if (empty($data["email"]) || empty($data["password"])) {
            return [
                "status" => "error",
                "message" => "Campurile sunt obligatorii"
            ];
        }

        $user = $this->model->getUserByEmail($data["email"]);

        if (!$user || !password_verify($data["password"], $user["password"])) {
            return [
                "status" => "error",
                "message" => "Email sau parola incorecta"
            ];
        }

        $auth = createAuthToken($this->db, (int)$user["id"]);

        return [
            "status" => "success",
            "message" => "Autentificare reusita!",
            "token" => $auth["token"],
            "expires_at" => $auth["expires_at"],
            "user" => [
                "id" => (int)$user["id"],
                "name" => $user["full_name"],
                "email" => $user["email"],
                "role" => $user["role"]
            ]
        ];
    }

    public function handleRegister($data) {
        if (empty($data["name"]) || empty($data["email"]) || empty($data["password"])) {
            return [
                "status" => "error",
                "message" => "Toate campurile sunt obligatorii"
            ];
        }

        if ($this->model->emailExists($data["email"])) {
            return [
                "status" => "error",
                "message" => "Email-ul exista deja"
            ];
        }

        $role = "user";

        if (!empty($data["admin_code"]) && trim($data["admin_code"]) === $this->adminCode) {
            $role = "admin";
        }

        if ($this->model->register($data["name"], $data["email"], $data["password"], $role)) {
            return [
                "status" => "success",
                "message" => $role === "admin" ? "Cont admin creat cu succes!" : "Cont creat cu succes!"
            ];
        }

        return [
            "status" => "error",
            "message" => "Eroare la salvare"
        ];
    }

    public function handleForgotPassword($email, $password) {
        if (empty($email) || empty($password)) {
            return [
                "status" => "error",
                "message" => "Toate campurile sunt obligatorii."
            ];
        }

        if (!$this->model->emailExists($email)) {
            return [
                "status" => "error",
                "message" => "Acest email nu este inregistrat in sistem."
            ];
        }

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        if ($this->model->updatePasswordDirectly($email, $hashedPassword)) {
            return [
                "status" => "success",
                "message" => "Parola a fost actualizata cu succes!"
            ];
        }

        return [
            "status" => "error",
            "message" => "A aparut o eroare la actualizarea bazei de date."
        ];
    }
}