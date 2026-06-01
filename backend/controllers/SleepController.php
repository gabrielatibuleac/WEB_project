<?php
require_once '../models/SleepModel.php';

class SleepController {
    private $model;

    public function __construct($db) {
        $this->model = new SleepModel($db);
    }

    public function createSleep($userId, $data) {
        if(empty($data->child_id) || empty($data->type)) {
            return [
                "status" => "error",
                "message" => "ID-ul copilului și tipul acțiunii sunt obligatorii!"
            ];
        }

        $child_id = $data->child_id;
        $sleep_type = $data->type;

        $start_time = !empty($data->start_time) ? $data->start_time : null;
        $end_time = !empty($data->end_time) ? $data->end_time : null;
        $notes = !empty($data->notes) ? $data->notes : null;
        $quality = !empty($data->quality) ? $data->quality : null; 
         
        if($this->model->addSleep($child_id, $sleep_type, $start_time, $end_time, $notes, $quality)) {
            return [
                "status" => "success", 
                "message" => "Datele au fost salvate cu succes!"
            ];
        } else {
            return [
                "status" => "error", 
                "message" => "Eroare la salvarea în baza de date!"
            ];
        }
    } 

    public function getMetrics($userId, $child_id) {
        if(empty($child_id)) {
            return ["status" => "error", "message" => "Lipsește ID-ul copilului."];
        }

        $records = $this->model->getSleepData($child_id);

        return [
            "status" => "success",
            "data" => $records
        ];
    }

    public function updateSleep($userId, $data) {
        if(empty($data->id) || empty($data->child_id)) {
            return [
                "status" => "error",
                "message" => "ID-ul somnului și copilului sunt obligatorii!"
            ];
        }

        $sleep_id = $data->id;
        $child_id = $data->child_id;
        $sleep_type = !empty($data->type) ? $data->type : null;
        $start_time = !empty($data->start_time) ? $data->start_time : null;
        $end_time = !empty($data->end_time) ? $data->end_time : null;
        $notes = !empty($data->notes) ? $data->notes : null;
        $quality = !empty($data->quality) ? $data->quality : null;

        if($this->model->updateSleep($sleep_id, $child_id, $sleep_type, $start_time, $end_time, $notes, $quality)) {
            return [
                "status" => "success",
                "message" => "Datele au fost actualizate cu succes!"
            ];
        } else {
            return [
                "status" => "error",
                "message" => "Eroare la actualizarea datelor!"
            ];
        }
    }

    public function deleteSleep($userId, $data) {
        if(empty($data->id) || empty($data->child_id)) {
            return [
                "status" => "error",
                "message" => "ID-ul somnului și copilului sunt obligatorii!"
            ];
        }

        $sleep_id = $data->id;
        $child_id = $data->child_id;

        if($this->model->deleteSleep($sleep_id, $child_id)) {
            return [
                "status" => "success",
                "message" => "Înregistrarea a fost ștearsă cu succes!"
            ];
        } else {
            return [
                "status" => "error",
                "message" => "Eroare la ștergerea datelor!"
            ];
        }
    }
}