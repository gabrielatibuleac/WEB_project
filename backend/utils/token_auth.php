<?php

function getBearerToken() {
    $header = $_SERVER["HTTP_AUTHORIZATION"] ?? "";
    $redirectHeader = $_SERVER["REDIRECT_HTTP_AUTHORIZATION"] ?? "";

    if ($header === "" && $redirectHeader !== "") {
        $header = $redirectHeader;
    }

    if ($header === "" && function_exists("getallheaders")) {
        $headers = getallheaders();

        foreach ($headers as $key => $value) {
            if (strtolower($key) === "authorization") {
                $header = $value;
                break;
            }
        }
    }

    if (preg_match('/Bearer\s+(.+)/', $header, $matches)) {
        return trim($matches[1]);
    }

    return "";
}

function createAuthToken($db, $userId) {
    $token = bin2hex(random_bytes(32));
    $tokenHash = hash("sha256", $token);
    $expiresAt = date("Y-m-d H:i:s", time() + 7 * 24 * 60 * 60);

    $deleteStmt = $db->prepare("DELETE FROM auth_tokens WHERE user_id = ? OR expires_at < NOW()");
    $deleteStmt->bind_param("i", $userId);
    $deleteStmt->execute();

    $stmt = $db->prepare("
        INSERT INTO auth_tokens (user_id, token_hash, expires_at)
        VALUES (?, ?, ?)
    ");

    $stmt->bind_param("iss", $userId, $tokenHash, $expiresAt);
    $stmt->execute();

    return [
        "token" => $token,
        "expires_at" => $expiresAt
    ];
}

function requireAuth($db) {
    $token = getBearerToken();

    if ($token === "") {
        http_response_code(401);
        echo json_encode([
            "status" => "error",
            "message" => "Nu esti autentificat."
        ]);
        exit;
    }

    $tokenHash = hash("sha256", $token);

    $stmt = $db->prepare("
        SELECT u.id, u.full_name, u.email, u.role
        FROM auth_tokens t
        INNER JOIN users u ON u.id = t.user_id
        WHERE t.token_hash = ? AND t.expires_at > NOW()
        LIMIT 1
    ");

    $stmt->bind_param("s", $tokenHash);
    $stmt->execute();

    $user = $stmt->get_result()->fetch_assoc();

    if (!$user) {
        http_response_code(401);
        echo json_encode([
            "status" => "error",
            "message" => "Token invalid sau expirat."
        ]);
        exit;
    }

    return [
        "id" => (int)$user["id"],
        "name" => $user["full_name"],
        "email" => $user["email"],
        "role" => $user["role"]
    ];
}

function deleteCurrentAuthToken($db) {
    $token = getBearerToken();

    if ($token === "") {
        return true;
    }

    $tokenHash = hash("sha256", $token);

    $stmt = $db->prepare("DELETE FROM auth_tokens WHERE token_hash = ?");
    $stmt->bind_param("s", $tokenHash);

    return $stmt->execute();
}

function getJsonInput() {
    $input = json_decode(file_get_contents("php://input"), true);

    if (!is_array($input)) {
        return [];
    }

    return $input;
}