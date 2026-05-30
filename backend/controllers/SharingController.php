<?php
require_once __DIR__ . '/../models/SharingModel.php';

class SharingController {
    private $model;

    public function __construct($db) {
        $this->model = new SharingModel($db);
    }

    public function listShares($userId, $childId) {
        $childId = (int)$childId;

        if ($childId <= 0 || !$this->model->childBelongsToUser($childId, $userId)) {
            return [
                "status" => "error",
                "message" => "Copil invalid."
            ];
        }

        return [
            "status" => "success",
            "shares" => $this->model->getShares($childId)
        ];
    }

    public function createShare($userId, $data) {
        $childId = (int)($data["child_id"] ?? 0);
        $momentDbId = isset($data["moment_db_id"]) && $data["moment_db_id"] !== "" ? (int)$data["moment_db_id"] : null;
        $momentSource = trim($data["moment_source"] ?? "");
        $title = trim($data["title"] ?? "");
        $channel = trim($data["channel"] ?? "");
        $privacy = trim($data["privacy"] ?? "only_me");

        $allowedChannels = ["family", "link", "social", "rss"];
        $allowedPrivacy = ["only_me", "family", "private_link", "public"];

        if ($childId <= 0 || !$this->model->childBelongsToUser($childId, $userId)) {
            return [
                "status" => "error",
                "message" => "Copil invalid."
            ];
        }

        if ($title === "" || !in_array($channel, $allowedChannels, true) || !in_array($privacy, $allowedPrivacy, true)) {
            return [
                "status" => "error",
                "message" => "Date invalide pentru partajare."
            ];
        }

        if ($momentSource !== "timeline") {
            $momentDbId = null;
        }

        if ($momentDbId !== null && !$this->model->timelineMomentBelongsToChild($momentDbId, $childId)) {
            return [
                "status" => "error",
                "message" => "Moment invalid."
            ];
        }

        if ($channel === "social" && $privacy !== "public") {
            return [
                "status" => "error",
                "message" => "Pentru publicare sociala seteaza confidentialitatea pe Public."
            ];
        }

        $shareLink = null;

        if ($channel === "link" || $channel === "rss") {
            $shareLink = $this->generateShareLink($childId, $title, $channel);
        }

        $status = $this->getStatus($channel, $shareLink);
        $shareId = $this->model->createShare($childId, $momentDbId, $title, $channel, $privacy, $shareLink, $status);

        if (!$shareId) {
            return [
                "status" => "error",
                "message" => "Partajarea nu a putut fi salvata."
            ];
        }

        return [
            "status" => "success",
            "message" => $this->getMessage($channel),
            "share" => [
                "id" => $shareId,
                "child_id" => $childId,
                "moment_id" => $momentDbId,
                "title" => $title,
                "channel" => $channel,
                "privacy" => $privacy,
                "share_link" => $shareLink,
                "status" => $status
            ]
        ];
    }

    public function deleteShare($userId, $data) {
        $childId = (int)($data["child_id"] ?? 0);
        $shareId = (int)($data["id"] ?? 0);

        if ($childId <= 0 || !$this->model->childBelongsToUser($childId, $userId)) {
            return [
                "status" => "error",
                "message" => "Copil invalid."
            ];
        }

        if ($shareId <= 0) {
            return [
                "status" => "error",
                "message" => "Partajare invalida."
            ];
        }

        if ($this->model->deleteShare($shareId, $childId)) {
            return [
                "status" => "success",
                "message" => "Partajare stearsa."
            ];
        }

        return [
            "status" => "error",
            "message" => "Partajarea nu a putut fi stearsa."
        ];
    }

    public function clearShares($userId, $data) {
        $childId = (int)($data["child_id"] ?? 0);

        if ($childId <= 0 || !$this->model->childBelongsToUser($childId, $userId)) {
            return [
                "status" => "error",
                "message" => "Copil invalid."
            ];
        }

        if ($this->model->clearShares($childId)) {
            return [
                "status" => "success",
                "message" => "Istoricul distribuirilor a fost sters."
            ];
        }

        return [
            "status" => "error",
            "message" => "Istoricul nu a putut fi sters."
        ];
    }

    private function generateShareLink($childId, $title, $channel) {
        $token = hash("sha256", $childId . $title . $channel . microtime(true) . random_int(1000, 999999));
        return "/WEB_project/frontend/app/pages/sharing/shared.html?child=" . $childId . "&token=" . $token;
    }

    private function getStatus($channel, $shareLink) {
        $statuses = [
            "family" => "Distribuit familiei",
            "link" => "Link privat generat",
            "social" => "Distribuire publica salvata",
            "rss" => "Adaugat in fluxul RSS"
        ];

        if ($channel === "link" && $shareLink) {
            return "Link privat generat: " . $shareLink;
        }

        if ($channel === "rss" && $shareLink) {
            return "Flux RSS actualizat: " . $shareLink;
        }

        return $statuses[$channel] ?? "Partajare salvata";
    }

    private function getMessage($channel) {
        $messages = [
            "family" => "Moment distribuit familiei.",
            "link" => "Link generat.",
            "social" => "Moment publicat.",
            "rss" => "Moment adaugat in fluxul RSS."
        ];

        return $messages[$channel] ?? "Partajare salvata.";
    }
}