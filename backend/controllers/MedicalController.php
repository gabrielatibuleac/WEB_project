<?php
require_once __DIR__ . '/../models/MedicalModel.php';

class MedicalController {
    private $model;

    public function __construct($db) {
        $this->model = new MedicalModel($db);
    }

    private function nullableText($value) {
        $value = trim((string)($value ?? ""));
        return $value === "" ? null : $value;
    }

    private function normalizePhone($value) {
        $phone = preg_replace('/\D/', '', (string)$value);

        if (str_starts_with($phone, "0040")) {
            $phone = "0" . substr($phone, 4);
        }

        if (str_starts_with($phone, "40") && strlen($phone) === 11) {
            $phone = "0" . substr($phone, 2);
        }

        return $phone;
    }

    private function emptyMedicalData() {
        return [
            "vaccines" => [],
            "visits" => [],
            "medications" => [],
            "allergies" => [],
            "notes" => [],
            "emergency" => []
        ];
    }

    private function mapRecordTypeToList($type) {
        $map = [
            "vaccine" => "vaccines",
            "visit" => "visits",
            "medication" => "medications",
            "allergy" => "allergies",
            "note" => "notes"
        ];

        return $map[$type] ?? null;
    }

    private function getNotificationTitle($recordType) {
        switch ($recordType) {
            case "vaccine":
                return "Vaccin nou adaugat";

            case "visit":
                return "Programare medicala noua";

            case "medication":
                return "Medicatie noua adaugata";

            case "allergy":
                return "Alergie noua adaugata";

            case "note":
                return "Nota medicala noua";

            default:
                return "Actualizare medicala";
        }
    }

    private function getRecordLabel($recordType) {
        switch ($recordType) {
            case "vaccine":
                return "Vaccin";

            case "visit":
                return "Programare medicala";

            case "medication":
                return "Medicatie";

            case "allergy":
                return "Alergie";

            case "note":
                return "Nota medicala";

            default:
                return "Informatie medicala";
        }
    }

    public function listMedical($userId, $childId) {
        $childId = (int)$childId;

        if ($childId <= 0 || !$this->model->childBelongsToUser($childId, $userId)) {
            return ["status" => "error", "message" => "Copil invalid."];
        }

        $data = $this->emptyMedicalData();
        $records = $this->model->getRecords($childId);
        $contacts = $this->model->getEmergencyContacts($childId);

        foreach ($records as $record) {
            $listName = $this->mapRecordTypeToList($record["record_type"]);

            if (!$listName) {
                continue;
            }

            $data[$listName][] = [
                "id" => (int)$record["id"],
                "title" => $record["title"],
                "description" => $record["description"] ?? "",
                "date" => $record["record_date"],
                "time" => $record["record_time"],
                "record_type" => $record["record_type"]
            ];
        }

        foreach ($contacts as $contact) {
            $phone = trim((string)$contact["phone"]);
            $relation = trim((string)($contact["relation"] ?? ""));
            $details = trim((string)($contact["details"] ?? ""));

            if ($details !== "") {
                $normalizedPhone = $this->normalizePhone($phone);
                $normalizedDetails = $this->normalizePhone($details);

                if ($normalizedPhone !== "" && strpos($normalizedDetails, $normalizedPhone) === 0) {
                    $details = preg_replace('/^[\s\+\d\-\(\)\.]+[,;\-\s]*/', '', $details);
                    $details = trim($details);
                }
            }

            $descriptionParts = [];

            if ($phone !== "") {
                $descriptionParts[] = $phone;
            }

            if ($relation !== "") {
                $descriptionParts[] = $relation;
            }

            if ($details !== "") {
                $descriptionParts[] = $details;
            }

            $data["emergency"][] = [
                "id" => (int)$contact["id"],
                "title" => $contact["name"],
                "description" => implode(" - ", $descriptionParts),
                "phone" => $phone,
                "relation" => $relation,
                "details" => $details
            ];
        }

        return [
            "status" => "success",
            "data" => $data
        ];
    }

    public function createRecord($userId, $data) {
        $childId = (int)($data["child_id"] ?? 0);
        $recordType = trim($data["record_type"] ?? "");
        $title = trim($data["title"] ?? "");
        $description = $this->nullableText($data["description"] ?? null);
        $recordDate = trim($data["record_date"] ?? "");
        $recordTime = $this->nullableText($data["record_time"] ?? null);

        $allowedTypes = ["vaccine", "visit", "medication", "allergy", "note"];

        if ($childId <= 0 || !$this->model->childBelongsToUser($childId, $userId)) {
            return ["status" => "error", "message" => "Copil invalid."];
        }

        if (!in_array($recordType, $allowedTypes, true)) {
            return ["status" => "error", "message" => "Tip medical invalid."];
        }

        if ($title === "" || $recordDate === "") {
            return ["status" => "error", "message" => "Titlul si data sunt obligatorii."];
        }

        if ($recordType === "visit" && $recordDate < date("Y-m-d")) {
            return ["status" => "error", "message" => "Nu poti adauga o programare medicala in trecut."];
        }

        $created = $this->model->createRecord($childId, $recordType, $title, $description, $recordDate, $recordTime);

        if ($created) {
            $notificationTitle = $this->getNotificationTitle($recordType);
            $recordLabel = $this->getRecordLabel($recordType);
            $notificationMessage = $recordLabel . " adaugat: " . $title;

            $this->model->createNotification(
                $userId,
                $childId,
                $notificationTitle,
                $notificationMessage,
                "medical"
            );

            return ["status" => "success", "message" => "Informatie medicala salvata."];
        }

        return ["status" => "error", "message" => "Informatia medicala nu a putut fi salvata."];
    }

    public function deleteRecord($userId, $data) {
        $childId = (int)($data["child_id"] ?? 0);
        $recordId = (int)($data["id"] ?? 0);

        if ($childId <= 0 || !$this->model->childBelongsToUser($childId, $userId)) {
            return ["status" => "error", "message" => "Copil invalid."];
        }

        if ($recordId <= 0) {
            return ["status" => "error", "message" => "Inregistrare invalida."];
        }

        if ($this->model->deleteRecord($recordId, $childId)) {
            return ["status" => "success", "message" => "Inregistrare stearsa."];
        }

        return ["status" => "error", "message" => "Inregistrarea nu a putut fi stearsa."];
    }

    public function createEmergencyContact($userId, $data) {
        $childId = (int)($data["child_id"] ?? 0);
        $name = trim($data["name"] ?? "");
        $phone = $this->normalizePhone($data["phone"] ?? "");
        $relation = $this->nullableText($data["relation"] ?? null);
        $details = $this->nullableText($data["details"] ?? null);

        if ($childId <= 0 || !$this->model->childBelongsToUser($childId, $userId)) {
            return ["status" => "error", "message" => "Copil invalid."];
        }

        if ($name === "" || $phone === "") {
            return ["status" => "error", "message" => "Numele si telefonul sunt obligatorii."];
        }

        $created = $this->model->createEmergencyContact($childId, $name, $phone, $relation, $details);

        if ($created) {
            $this->model->createNotification(
                $userId,
                $childId,
                "Contact urgent adaugat",
                "A fost adaugat contactul urgent: " . $name,
                "medical"
            );

            return ["status" => "success", "message" => "Contact urgent salvat."];
        }

        if ($this->model->getLastErrorCode() === 1062) {
            return ["status" => "error", "message" => "Acest numar de telefon exista deja la contactele urgente."];
        }

        return ["status" => "error", "message" => "Contactul urgent nu a putut fi salvat."];
    }

    public function deleteEmergencyContact($userId, $data) {
        $childId = (int)($data["child_id"] ?? 0);
        $contactId = (int)($data["id"] ?? 0);

        if ($childId <= 0 || !$this->model->childBelongsToUser($childId, $userId)) {
            return ["status" => "error", "message" => "Copil invalid."];
        }

        if ($contactId <= 0) {
            return ["status" => "error", "message" => "Contact invalid."];
        }

        if ($this->model->deleteEmergencyContact($contactId, $childId)) {
            return ["status" => "success", "message" => "Contact urgent sters."];
        }

        return ["status" => "error", "message" => "Contactul urgent nu a putut fi sters."];
    }
}