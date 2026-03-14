<?php
putenv("TNS_ADMIN=D:\\Proyectos y trabajos de la U\\Lenguajes de BD\\PROYECTO_LENGUAJESBD_G2_LUNES_NOCHE\\Proyecto LenguajesBD\\Wallet_LenguajesBD");

require 'config/bd.php';

$conn = getConnection();

$sql  = "SELECT * FROM FIDE_ESTADOS_TB";
$stmt = oci_parse($conn, $sql);
oci_execute($stmt);

while ($row = oci_fetch_assoc($stmt)) {
    echo $row['ID_ESTADO'] . " - " . $row['NOMBRE_ESTADO'] . "\n";
}

oci_free_statement($stmt);
oci_close($conn);

/*

PARA EJECUTAR ESTE SCRIPT:

php test_select.php

*/