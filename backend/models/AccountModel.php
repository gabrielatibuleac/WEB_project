<?php
class AccountModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getUser($userId) {
        $stmt = $this->db->prepare("SELECT id, full_name, email, role, created_at FROM users WHERE id = ?");
        $stmt->bind_param("i", $userId);
        $stmt->execute();

        return $stmt->get_result()->fetch_assoc();
    }

    public function updateUser($userId, $name, $email) {
        $stmt = $this->db->prepare("UPDATE users SET full_name = ?, email = ? WHERE id = ?");
        $stmt->bind_param("ssi", $name, $email, $userId);

        return $stmt->execute();
    }

    public function getProfile($userId) {
        $stmt = $this->db->prepare("SELECT phone, location, profile_photo FROM account_profiles WHERE user_id = ?");
        $stmt->bind_param("i", $userId);
        $stmt->execute();

        return $stmt->get_result()->fetch_assoc();
    }

    public function upsertProfile($userId, $phone, $location, $photo) {
        $stmt = $this->db->prepare("
            INSERT INTO account_profiles (user_id, phone, location, profile_photo)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                phone = VALUES(phone),
                location = VALUES(location),
                profile_photo = VALUES(profile_photo)
        ");

        $stmt->bind_param("isss", $userId, $phone, $location, $photo);

        return $stmt->execute();
    }

    public function getSettings($userId) {
        $stmt = $this->db->prepare("
            SELECT language_code, theme, timezone, default_page, notifications_json, two_factor_enabled
            FROM account_settings
            WHERE user_id = ?
        ");

        $stmt->bind_param("i", $userId);
        $stmt->execute();

        return $stmt->get_result()->fetch_assoc();
    }

    public function upsertSettings($userId, $language, $theme, $timezone, $defaultPage, $notificationsJson, $twoFactor) {
        $stmt = $this->db->prepare("
            INSERT INTO account_settings (
                user_id,
                language_code,
                theme,
                timezone,
                default_page,
                notifications_json,
                two_factor_enabled
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                language_code = VALUES(language_code),
                theme = VALUES(theme),
                timezone = VALUES(timezone),
                default_page = VALUES(default_page),
                notifications_json = VALUES(notifications_json),
                two_factor_enabled = VALUES(two_factor_enabled)
        ");

        $stmt->bind_param(
            "isssssi",
            $userId,
            $language,
            $theme,
            $timezone,
            $defaultPage,
            $notificationsJson,
            $twoFactor
        );

        return $stmt->execute();
    }

    public function getChildren($userId) {
        $stmt = $this->db->prepare("
            SELECT id, name, birth_date, gender, created_at
            FROM children
            WHERE user_id = ?
            ORDER BY created_at DESC
        ");

        $stmt->bind_param("i", $userId);
        $stmt->execute();

        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    public function getCaregivers($userId) {
        $stmt = $this->db->prepare("
            SELECT cc.id, cc.child_id, cc.name, cc.role, cc.access_level, c.name AS child_name
            FROM child_caregivers cc
            INNER JOIN children c ON c.id = cc.child_id
            WHERE c.user_id = ?
            ORDER BY cc.created_at DESC
        ");

        $stmt->bind_param("i", $userId);
        $stmt->execute();

        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    public function getNotifications($userId) {
        $stmt = $this->db->prepare("
            SELECT id, title, message, notification_type, is_read, created_at
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 20
        ");

        $stmt->bind_param("i", $userId);
        $stmt->execute();

        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    public function getLastErrorCode() {
        return $this->db->errno;
    }
}