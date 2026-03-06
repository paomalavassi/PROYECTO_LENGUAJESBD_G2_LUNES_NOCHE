<?php
require 'config/bd.php';

$conn = getConnection();

$sql = "SELECT * FROM FIDE_ESTADOS_TB";
$stmt = oci_parse($conn, $sql);
oci_execute($stmt);

while ($row = oci_fetch_assoc($stmt)) {
    echo $row['ID_ESTADO'] . " - " . $row['NOMBRE_ESTADO'] . "\n";
}

oci_free_statement($stmt);
oci_close($conn);