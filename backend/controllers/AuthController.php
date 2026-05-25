<?php
require_once '../config/db.php';
require_once '../models/AuthModel.php';
class AuthController {
    private $model;
    public function __construct($db) {
        $this->model = new AuthModel($db);
    }
   public function handleLogin($data) {
    if (empty($data['email']) || empty($data['password'])) {
        return ["status" => "error", "message" => "Campurile sunt obligatorii"];
    }

    $user = $this->model->getUserByEmail($data['email']);

    if ($user && password_verify($data['password'], $user['password'])) {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }

        $_SESSION["isLoggedIn"] = true;
        $_SESSION["user_id"] = $user["id"];
        $_SESSION["username"] = $user["full_name"];
        $_SESSION["email"] = $user["email"];

        return ["status" => "success", "message" => "Autentificare reusita!"];
    }

    return ["status" => "error", "message" => "Email sau parola incorecta"];
}
public function handleForgotPassword($email, $password) {
    if (empty($email) || empty($password)) {
        return ["status" => "error", "message" => "Toate campurile sunt obligatorii."];
    }

    if (!$this->model->emailExists($email)) {
        return ["status" => "error", "message" => "Acest email nu este inregistrat in sistem."];
    }
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    if ($this->model->updatePasswordDirectly($email, $hashedPassword)) {
        return ["status" => "success", "message" => "Parola a fost actualizata cu succes!"];
    }

    return ["status" => "error", "message" => "A aparut o eroare la actualizarea bazei de date."];
}
    public function handleRegister($data) {
        if (empty($data['name']) || empty($data['email']) || empty($data['password'])) {
            return ["status" => "error", "message" => "Toate campurile sunt obligatorii"];
        }
        
        if ($this->model->emailExists($data['email'])) {
            return ["status" => "error", "message" => "Email-ul exista deja"];
        }

        if ($this->model->register($data['name'], $data['email'], $data['password'])) {
            return ["status" => "success", "message" => "Cont creat cu succes!"];
        }
        
        return ["status" => "error", "message" => "Eroare la salvare"];
    }
}