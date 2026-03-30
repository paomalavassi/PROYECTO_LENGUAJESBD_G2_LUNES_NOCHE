<?php

//DANIEL Laptop
//putenv("TNS_ADMIN=D:\\PROYECTO_LENGUAJESBD_G2_LUNES_NOCHE\\Proyecto LenguajesBD\\Wallet_LenguajesBD");

//DANIEL PC
putenv("TNS_ADMIN=D:\\Proyectos y trabajos de la U\\Lenguajes de BD\\PROYECTO_LENGUAJESBD_G2_LUNES_NOCHE\\Proyecto LenguajesBD\\Wallet_LenguajesBD");

//PAOLA
//putenv("TNS_ADMIN=C:\\Users\\paopo\\OneDrive\\Escritorio\\LENGUAJES BASES DE DATOS\\PROYECTO_LENGUAJESBD_G2_LUNES_NOCHE\\Proyecto LenguajesBD\\Wallet_LenguajesBD");

//FABRICIO
//putenv("TNS_ADMIN=C:\\---\\---\\PROYECTO_LENGUAJESBD_G2_LUNES_NOCHE\\Proyecto LenguajesBD\\Wallet_LenguajesBD");

//FABIAN
//putenv("TNS_ADMIN=C:\\---\\---\\PROYECTO_LENGUAJESBD_G2_LUNES_NOCHE\\Proyecto LenguajesBD\\Wallet_LenguajesBD");


$usuarios = [
    'admin_aralias' => ['user' => 'admin_aralias', 'pass' => 'Lenguajes_12345678'],
    'SEGURIDAD'     => ['user' => 'SEGURIDAD',     'pass' => 'Lenguajes_12345678'],
    'ADMINISTRADOR' => ['user' => 'ADMINISTRADOR', 'pass' => 'Lenguajes_12345678'],
    'AUDITOR'       => ['user' => 'AUDITOR',       'pass' => 'Lenguajes_12345678'],
];

define('USUARIO_ACTIVO', 'admin_aralias');
define('DB_USERNAME', $usuarios[USUARIO_ACTIVO]['user']);
define('DB_PASSWORD', $usuarios[USUARIO_ACTIVO]['pass']);
define('DB_TNS_NAME', 'lenguajesbd_high');
define('PKG',         'admin_aralias.FIDE_CONDOMINIO_PKG');

function getConnection() {
    $conn = oci_connect(DB_USERNAME, DB_PASSWORD, DB_TNS_NAME, 'UTF8');
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