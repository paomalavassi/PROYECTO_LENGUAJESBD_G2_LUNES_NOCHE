<?php

// ─── Define aquí todos tus usuarios ───────────────────────
$usuarios = [
    'admin_aralias' => ['user' => 'admin_aralias', 'pass' => 'Lenguajes_12345678'],
    'SEGURIDAD' => ['user' => 'SEGURIDAD', 'pass' => 'Lenguajes_12345678'],
    'ADMINISTRADOR' => ['user' => 'ADMINISTRADOR', 'pass' => 'Lenguajes_12345678'],
    'AUDITOR' => ['user' => 'AUDITOR', 'pass' => 'Lenguajes_12345678'],
];

// ─── Cambia aquí qué usuario está activo ──────────────────
define('USUARIO_ACTIVO', 'admin_aralias');
// ──────────────────────────────────────────────────────────

define('DB_TNS', 'lenguajesbd_high');
define('DB_USERNAME', $usuarios[USUARIO_ACTIVO]['user']);
define('DB_PASSWORD', $usuarios[USUARIO_ACTIVO]['pass']);

function getConnection() {
    $conn = oci_connect(DB_USERNAME, DB_PASSWORD, DB_TNS, 'UTF8');

    if (!$conn) {
        $error = oci_error();
        http_response_code(500);
        die(json_encode([
            'error'   => true,
            'mensaje' => 'Error de conexión: ' . $error['message']
        ]));
    }

    return $conn;
}