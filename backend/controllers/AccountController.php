<?php
require_once __DIR__ . '/../models/AccountModel.php';

class AccountController {
    private $model;

    public function __construct($db) {
        $this->model = new AccountModel($db);
    }

    private function defaultNotifications() {
        return [
            "feeding" => true,
            "medical" => true,
            "gallery" => true,
            "sharing" => false,
            "weekly" => true
        ];
    }

    private function defaultSettings() {
        return [
            "language" => "ro",
            "theme" => "light",
            "timezone" => "Europe/Bucharest",
            "defaultPage" => "dashboard",
            "notifications" => $this->defaultNotifications(),
            "security" => [
                "twoFactor" => false
            ]
        ];
    }

    public function getAccount($userId) {
        $user = $this->model->getUser($userId);

        if (!$user) {
            return [
                "status" => "error",
                "message" => "Utilizator invalid."
            ];
        }

        $profile = $this->model->getProfile($userId);
        $settings = $this->mapSettings($this->model->getSettings($userId));
        $children = $this->model->getChildren($userId);
        $caregivers = $this->model->getCaregivers($userId);
        $notifications = $this->model->getNotifications($userId);

        return [
            "status" => "success",
            "user" => [
                "id" => (int)$user["id"],
                "name" => $user["full_name"],
                "email" => $user["email"],
                "role" => $user["role"] ?? "user",
                "created_at" => $user["created_at"]
            ],
            "profile" => [
                "phone" => $profile["phone"] ?? "",
                "location" => $profile["location"] ?? "",
                "photo" => $profile["profile_photo"] ?? ""
            ],
            "settings" => $settings,
            "children" => $children,
            "caregivers" => $caregivers,
            "notifications" => $notifications
        ];
    }

    public function updateProfile($userId, $data) {
        $name = trim($data["name"] ?? "");
        $email = trim($data["email"] ?? "");
        $phone = trim($data["phone"] ?? "");
        $location = trim($data["location"] ?? "");
        $photo = $data["photo"] ?? "";

        if ($name === "" || $email === "") {
            return [
                "status" => "error",
                "message" => "Numele si emailul sunt obligatorii."
            ];
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return [
                "status" => "error",
                "message" => "Email invalid."
            ];
        }

        if (!$this->model->updateUser($userId, $name, $email)) {
            if ($this->model->getLastErrorCode() === 1062) {
                return [
                    "status" => "error",
                    "message" => "Emailul este deja folosit."
                ];
            }

            return [
                "status" => "error",
                "message" => "Profilul nu a putut fi actualizat."
            ];
        }

        if (!$this->model->upsertProfile($userId, $phone, $location, $photo)) {
            return [
                "status" => "error",
                "message" => "Datele de profil nu au putut fi salvate."
            ];
        }

        return [
            "status" => "success",
            "message" => "Profil salvat."
        ];
    }

    public function updateSettings($userId, $data) {
        $current = $this->mapSettings($this->model->getSettings($userId));

        $language = trim($data["language"] ?? $current["language"]);
        $theme = trim($data["theme"] ?? $current["theme"]);
        $timezone = trim($data["timezone"] ?? $current["timezone"]);
        $defaultPage = trim($data["defaultPage"] ?? $current["defaultPage"]);
        $notifications = $data["notifications"] ?? $current["notifications"];
        $twoFactor = isset($data["security"]["twoFactor"]) ? (bool)$data["security"]["twoFactor"] : (bool)$current["security"]["twoFactor"];

        if (!in_array($language, ["ro", "en"], true)) {
            $language = "ro";
        }

        if (!in_array($theme, ["light", "dark"], true)) {
            $theme = "light";
        }

        $notifications = array_merge($this->defaultNotifications(), is_array($notifications) ? $notifications : []);
        $notificationsJson = json_encode($notifications);

        if ($this->model->upsertSettings($userId, $language, $theme, $timezone, $defaultPage, $notificationsJson, $twoFactor ? 1 : 0)) {
            return [
                "status" => "success",
                "message" => "Setari salvate."
            ];
        }

        return [
            "status" => "error",
            "message" => "Setarile nu au putut fi salvate."
        ];
    }

    private function mapSettings($row) {
        $defaults = $this->defaultSettings();

        if (!$row) {
            return $defaults;
        }

        $notifications = json_decode($row["notifications_json"] ?? "", true);

        if (!is_array($notifications)) {
            $notifications = $this->defaultNotifications();
        }

        return [
            "language" => $row["language_code"] ?? $defaults["language"],
            "theme" => $row["theme"] ?? $defaults["theme"],
            "timezone" => $row["timezone"] ?? $defaults["timezone"],
            "defaultPage" => $row["default_page"] ?? $defaults["defaultPage"],
            "notifications" => array_merge($this->defaultNotifications(), $notifications),
            "security" => [
                "twoFactor" => (bool)($row["two_factor_enabled"] ?? 0)
            ]
        ];
    }
}