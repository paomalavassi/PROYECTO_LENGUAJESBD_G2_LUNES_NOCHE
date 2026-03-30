<?php

ini_set('display_errors', 0);
error_reporting(0);
ob_start();

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/bd.php';

$accion = $_REQUEST['accion'] ?? '';
$conn   = getConnection();

function nextId(string $tabla, string $col, $conn): int {
    $sql  = "SELECT NVL(MAX($col), 0) + 1 AS NXT FROM $tabla";
    $stmt = oci_parse($conn, $sql);
    oci_execute($stmt);
    $row  = oci_fetch_assoc($stmt);
    return (int)($row['NXT'] ?? 1);
}

function execProc($conn, string $sql, array $binds): array {
    $stmt = oci_parse($conn, $sql);
    if (!$stmt) {
        $e = oci_error($conn);
        return ['error' => true, 'mensaje' => $e['message']];
    }
    foreach ($binds as $name => &$val) {
        oci_bind_by_name($stmt, $name, $val);
    }
    unset($val);
    $ok = oci_execute($stmt, OCI_COMMIT_ON_SUCCESS);
    if (!$ok) {
        $e = oci_error($stmt);
        return ['error' => true, 'mensaje' => $e['message']];
    }
    oci_free_statement($stmt);
    return ['ok' => true];
}

function fetchAll($conn, string $sql, array $binds = []): array {
    $stmt = oci_parse($conn, $sql);
    if (!$stmt) return [];
    foreach ($binds as $name => &$val) {
        oci_bind_by_name($stmt, $name, $val);
    }
    unset($val);
    $ok = oci_execute($stmt);
    if (!$ok) return [];
    $rows = [];
    while ($row = oci_fetch_assoc($stmt)) {
        $rows[] = array_map(fn($v) => $v, $row);
    }
    oci_free_statement($stmt);
    return $rows;
}

function jsonOut($data): void {
    ob_clean();
    jsonOut($data, JSON_UNESCAPED_UNICODE);
}

function execUpdate($conn, string $sql, array $binds): array {
    $stmt = oci_parse($conn, $sql);
    if (!$stmt) { $e = oci_error($conn); return ['error'=>true,'mensaje'=>$e['message']]; }
    foreach ($binds as $k => &$v) oci_bind_by_name($stmt, $k, $v);
    unset($v);
    $ok = oci_execute($stmt, OCI_COMMIT_ON_SUCCESS);
    $result = $ok ? ['ok'=>true] : ['error'=>true,'mensaje'=>oci_error($stmt)['message']];
    oci_free_statement($stmt);
    return $result;
}

$pkg = PKG;

switch ($accion) {

    case 'login':
        $usuario = trim($_POST['usuario'] ?? '');
        $clave   = trim($_POST['clave']   ?? '');
        $rol     = trim($_POST['rol']     ?? '');

        if (!$usuario || !$clave) {
            jsonOut(['error' => true, 'mensaje' => 'Ingrese usuario y contraseña.']);
            break;
        }

        $rows = fetchAll($conn,
            "SELECT ID_PERSONA, NOMBRE, APELLIDO_PATERNO, ROL
             FROM   FIDE_CREDENCIALES_LOGIN_V
             WHERE  USUARIO    = :usr
               AND  CONTRASENA = :pwd",
            [':usr' => $usuario, ':pwd' => $clave]
        );

        if (empty($rows)) {
            jsonOut(['error' => true, 'mensaje' => 'Usuario o contraseña incorrectos.']);
            break;
        }

        $persona   = $rows[0];
        $rolNombre = strtoupper($persona['ROL']);

        if ($rol === 'guardia' && strpos($rolNombre, 'GUARD') === false) {
            jsonOut(['error' => true, 'mensaje' => 'Este usuario no tiene acceso como Guardia.']);
            break;
        }
        if ($rol === 'admin' && strpos($rolNombre, 'ADMIN') === false) {
            jsonOut(['error' => true, 'mensaje' => 'Este usuario no tiene acceso como Administrador.']);
            break;
        }

        jsonOut([
            'ok'         => true,
            'id_persona' => $persona['ID_PERSONA'],
            'nombre'     => $persona['NOMBRE'] . ' ' . $persona['APELLIDO_PATERNO'],
            'rol'        => $persona['ROL'],
        ]);
        break;

    case 'listar_guardias':
        $rows = fetchAll($conn,
            "SELECT p.ID_PERSONA, p.NOMBRE, p.APELLIDO_PATERNO, p.APELLIDO_MATERNO,
                    p.USUARIO,
                    (SELECT TELEFONO FROM FIDE_TELEFONOS_TB WHERE ID_PERSONA = p.ID_PERSONA AND ROWNUM=1) AS TELEFONO,
                    (SELECT CORREO   FROM FIDE_CORREOS_TB   WHERE ID_PERSONA = p.ID_PERSONA AND ROWNUM=1) AS CORREO,
                    e.ID_ESTADO, e.NOMBRE_ESTADO
             FROM   FIDE_LISTAR_GUARDIAS_V p
             LEFT JOIN FIDE_ESTADOS_TB e ON e.ID_ESTADO = p.ID_ESTADO"
        );
        jsonOut($rows);
        break;

    case 'listar_residentes':
        $rows = fetchAll($conn,
            "SELECT p.ID_PERSONA, p.NOMBRE, p.APELLIDO_PATERNO, p.APELLIDO_MATERNO,
                    (SELECT TELEFONO     FROM FIDE_TELEFONOS_TB WHERE ID_PERSONA = p.ID_PERSONA AND ROWNUM=1) AS TELEFONO,
                    (SELECT CORREO       FROM FIDE_CORREOS_TB   WHERE ID_PERSONA = p.ID_PERSONA AND ROWNUM=1) AS CORREO,
                    p.ID_RESIDENCIA, p.ID_ESTADO, p.NOMBRE_ESTADO
             FROM   FIDE_LISTAR_RESIDENTES_V p"
        );
        jsonOut($rows);
        break;

    case 'listar_personas':
        $rows = fetchAll($conn,
            "SELECT ID_PERSONA, NOMBRE_COMPLETO, ID_ROL
             FROM   FIDE_LISTAR_PERSONAS_V"
        );
        jsonOut($rows);
        break;

    case 'listar_trabajadores':
        $rows = fetchAll($conn,
            "SELECT ID_PERSONA, NOMBRE_COMPLETO
             FROM   FIDE_LISTAR_TRABAJADORES_V"
        );
        jsonOut($rows);
        break;

    case 'listar_residencias':
        $rows = fetchAll($conn,
            "SELECT ID_RESIDENCIA, MONTO_ALQUILER, MONTO_MANTENIMIENTO,
                    TIPO_PAGO, ID_TIPO_PAGO, ID_ESTADO, NOMBRE_ESTADO
             FROM   FIDE_LISTAR_RESIDENCIAS_VM
             ORDER  BY ID_RESIDENCIA"
        );
        jsonOut($rows);
        break;

    case 'listar_visitas':
        $rows = fetchAll($conn,
            "SELECT ID_VISITA, VISITANTE, ID_PERSONA, ROL_ID, ROL,
                    ID_RESIDENCIA, FECHA_INGRESO, FECHA_SALIDA,
                    ID_ESTADO, NOMBRE_ESTADO
             FROM   FIDE_LISTAR_VISITAS_V"
        );
        jsonOut($rows);
        break;

    case 'listar_paquetes':
        $rows = fetchAll($conn,
            "SELECT ID_PAQUETE, PERSONA, ID_PERSONA, ID_RESIDENCIA,
                    FECHA_INGRESO, FECHA_SALIDA, ID_ESTADO, NOMBRE_ESTADO
             FROM   FIDE_LISTAR_PAQUETES_V"
        );
        jsonOut($rows);
        break;

    case 'listar_facturas':
        $rows = fetchAll($conn,
            "SELECT ID_FACTURA, FECHA_FACTURA, DESCR_FACTURA,
                    PERSONA, TIPO_PAGO, FORMA_PAGO, NOMBRE_ESTADO
             FROM   FIDE_LISTAR_FACTURAS_V"
        );
        jsonOut($rows);
        break;

    case 'listar_servicios':
        $rows = fetchAll($conn,
            "SELECT ID_SERVICIO, DESCR_SERVICIO, FECHA_SALIDA,
                    ID_TIPO_SERVICIO, TIPO_SERVICIO, ID_TIPO_EVENTO,
                    ID_ESTADO, NOMBRE_ESTADO, PERSONAS
             FROM   FIDE_LISTAR_SERVICIOS_V"
        );
        jsonOut($rows);
        break;

    case 'listar_eventos':
        $rows = fetchAll($conn,
            "SELECT ID_EVENTO, DESCR_EVENTO, FECHA_EVENTO,
                    ID_TIPO_EVENTO, TIPO_EVENTO, ID_TIPO_ESPACIO,
                    ID_ESTADO, NOMBRE_ESTADO
             FROM   FIDE_LISTAR_EVENTOS_V"
        );
        jsonOut($rows);
        break;

    case 'listar_vehiculos':
        $rows = fetchAll($conn,
            "SELECT PLACA, DESCRIPCION, RESIDENTE,
                    ID_PERSONA, ID_TIPO_ESPACIO, ID_ESTADO, NOMBRE_ESTADO
             FROM   FIDE_LISTAR_VEHICULOS_V"
        );
        jsonOut($rows);
        break;

    case 'listar_vehiculos_residentes':
        $rows = fetchAll($conn,
            "SELECT v.PLACA, v.DESCRIPCION, v.RESIDENTE,
                    v.ID_PERSONA, v.ID_TIPO_ESPACIO, v.ID_ESTADO, v.NOMBRE_ESTADO
             FROM   FIDE_LISTAR_VEHICULOS_V v
             JOIN   FIDE_PERSONAS_TB p ON p.ID_PERSONA = v.ID_PERSONA
             JOIN   FIDE_ROLES_TB    r ON r.ID_ROL     = p.ID_ROL
             WHERE  UPPER(r.ROL) LIKE '%RESID%'"
        );
        jsonOut($rows);
        break;

    case 'listar_vehiculos_visitas':
        $rows = fetchAll($conn,
            "SELECT v.PLACA, v.DESCRIPCION,
                    p.NOMBRE || ' ' || p.APELLIDO_PATERNO AS VISITANTE,
                    v.ID_PERSONA, v.ID_TIPO_ESPACIO, v.ID_ESTADO, v.NOMBRE_ESTADO
             FROM   FIDE_LISTAR_VEHICULOS_V v
             JOIN   FIDE_PERSONAS_TB p ON p.ID_PERSONA = v.ID_PERSONA
             JOIN   FIDE_ROLES_TB    r ON r.ID_ROL     = p.ID_ROL
             WHERE  UPPER(r.ROL) LIKE '%VISIT%'"
        );
        jsonOut($rows);
        break;

    case 'listar_espacios':
        $rows = fetchAll($conn,
            "SELECT ID_TIPO_ESPACIO, NOMBRE_ESPACIO, DESCR_ESPACIO,
                    ID_ESTADO, NOMBRE_ESTADO
             FROM   FIDE_LISTAR_ESPACIOS_V"
        );
        jsonOut($rows);
        break;

    case 'insertar_espacio':
        $nombre   = $_POST['nombre_espacio'] ?? '';
        $descr    = $_POST['descr_espacio']  ?? '';
        $idEstado = (int)($_POST['id_estado'] ?? 1);
        $id = nextId('FIDE_TIPOS_ESPACIOS_TB', 'ID_TIPO_ESPACIO', $conn);
        $r  = execProc($conn,
            "BEGIN $pkg.FIDE_TIPOS_ESPACIOS_INSERTAR_SP(:p1,:p2,:p3,:p4); END;",
            [':p1'=>$id,':p2'=>$nombre,':p3'=>$descr,':p4'=>$idEstado]
        );
        jsonOut(($r['error'] ?? false) ? $r : ['ok'=>true,'id'=>$id]);
        break;

    case 'actualizar_espacio':
        $id       = (int)($_POST['id']           ?? 0);
        $nombre   = $_POST['nombre_espacio']      ?? '';
        $descr    = $_POST['descr_espacio']       ?? '';
        $idEstado = (int)($_POST['id_estado']     ?? 1);
        $r = execProc($conn,
            "BEGIN $pkg.FIDE_TIPOS_ESPACIOS_ACTUALIZAR_SP(:p1,:p2,:p3,:p4); END;",
            [':p1'=>$id,':p2'=>$nombre,':p3'=>$descr,':p4'=>$idEstado]
        );
        jsonOut($r);
        break;

    case 'eliminar_espacio':
        $id = (int)($_REQUEST['id'] ?? 0);
        $r  = execProc($conn, "BEGIN $pkg.FIDE_TIPOS_ESPACIOS_ELIMINAR_SP(:p1); END;", [':p1'=>$id]);
        jsonOut($r);
        break;

    case 'actualizar_estado_visita':
        $id          = (int)($_REQUEST['id']     ?? 0);
        $nuevoEstado = (int)($_REQUEST['estado'] ?? 0);
        if (!in_array($nuevoEstado, [4, 5, 6])) {
            jsonOut(['error'=>true,'mensaje'=>'Estado no permitido para guardia.']);
            break;
        }
  
        if ($nuevoEstado === 4) {
            $sql = "UPDATE FIDE_VISITAS_TB SET ID_ESTADO=:est, FECHA_SALIDA=NULL WHERE ID_VISITA=:id";
        } elseif ($nuevoEstado === 5) {
            $sql = "UPDATE FIDE_VISITAS_TB SET ID_ESTADO=:est, FECHA_SALIDA=SYSDATE WHERE ID_VISITA=:id";
        } else {
            $sql = "UPDATE FIDE_VISITAS_TB SET ID_ESTADO=:est WHERE ID_VISITA=:id";
        }
        jsonOut(execUpdate($conn, $sql, [':est'=>$nuevoEstado,':id'=>$id]));
        break;

    case 'actualizar_estado_vehiculo':
        $placa       = strtoupper(trim($_REQUEST['placa']  ?? ''));
        $nuevoEstado = (int)($_REQUEST['estado'] ?? 0);
        if (!in_array($nuevoEstado, [4, 5, 6])) {
            jsonOut(['error'=>true,'mensaje'=>'Estado no permitido para guardia.']);
            break;
        }
        jsonOut(execUpdate($conn,
            "UPDATE FIDE_VEHICULOS_TB SET ID_ESTADO=:est WHERE PLACA=:placa",
            [':est'=>$nuevoEstado,':placa'=>$placa]
        ));
        break;

    case 'actualizar_estado_evento':
        $id          = (int)($_REQUEST['id']     ?? 0);
        $nuevoEstado = (int)($_REQUEST['estado'] ?? 0);
        if (!in_array($nuevoEstado, [12, 13, 14, 17])) {
            jsonOut(['error'=>true,'mensaje'=>'Estado no permitido para guardia.']);
            break;
        }
        jsonOut(execUpdate($conn,
            "UPDATE FIDE_EVENTOS_TB SET ID_ESTADO=:est WHERE ID_EVENTO=:id",
            [':est'=>$nuevoEstado,':id'=>$id]
        ));
        break;

    case 'marcar_paquete_entregado':
        $id = (int)($_REQUEST['id'] ?? 0);
        jsonOut(execUpdate($conn,
            "UPDATE FIDE_PAQUETES_TB SET ID_ESTADO=16, FECHA_SALIDA=SYSDATE WHERE ID_PAQUETE=:id",
            [':id'=>$id]
        ));
        break;

    case 'listar_turnos':
        $idPersona = (int)($_REQUEST['id_persona'] ?? 0);
        if ($idPersona)
            $rows = fetchAll($conn,
                "SELECT GUARDIA, FECHA_TURNO AS FECHA, HORARIO, NOMBRE_ESTADO
                 FROM   FIDE_LISTAR_TURNOS_V
                 WHERE  ID_GUARDIA = :pid",
                [':pid' => $idPersona]
            );
        else
            $rows = fetchAll($conn,
                "SELECT GUARDIA, FECHA_TURNO AS FECHA, HORARIO, NOMBRE_ESTADO
                 FROM   FIDE_LISTAR_TURNOS_V"
            );
        jsonOut($rows);
        break;

    case 'listar_roles':
        jsonOut(fetchAll($conn, "SELECT ID_ROL, ROL FROM FIDE_LISTAR_ROLES_V"));
        break;

    case 'listar_tipos_pago':
        jsonOut(fetchAll($conn, "SELECT ID_TIPO_PAGO, TIPO FROM FIDE_LISTAR_TIPOS_PAGO_V"));
        break;

    case 'listar_formas_pago':
        jsonOut(fetchAll($conn, "SELECT ID_FORMA_PAGO, FORMA FROM FIDE_LISTAR_FORMAS_PAGO_V"));
        break;

    case 'listar_tipos_servicio':
        jsonOut(fetchAll($conn, "SELECT ID_TIPO_SERVICIO, TIPO_SERVICIO FROM FIDE_LISTAR_TIPOS_SERVICIO_V"));
        break;

    case 'listar_tipos_evento':
        jsonOut(fetchAll($conn, "SELECT ID_TIPO_EVENTO, TIPO_EVENTO FROM FIDE_LISTAR_TIPOS_EVENTO_V"));
        break;

    case 'listar_estados':
        jsonOut(fetchAll($conn, "SELECT ID_ESTADO, NOMBRE_ESTADO FROM FIDE_LISTAR_ESTADOS_V"));
        break;

    case 'listar_estados_guardia':
        jsonOut(fetchAll($conn, "SELECT ID_ESTADO, NOMBRE_ESTADO FROM FIDE_LISTAR_ESTADOS_GUARDIA_V"));
        break;

    case 'resumen':
        $row = fetchAll($conn, "SELECT * FROM FIDE_RESUMEN_GENERAL_V");
        jsonOut([
            'guardias'    => $row[0]['GUARDIAS']           ?? 0,
            'residentes'  => $row[0]['RESIDENTES']         ?? 0,
            'residencias' => $row[0]['RESIDENCIAS']        ?? 0,
            'paquetes'    => $row[0]['PAQUETES_PENDIENTES'] ?? 0,
            'eventos'     => $row[0]['EVENTOS']            ?? 0,
            'facturas'    => $row[0]['FACTURAS']           ?? 0,
        ]);
        break;

    case 'ultimos_eventos':
        $rows = fetchAll($conn,
            "SELECT DESCR_EVENTO, TIPO_EVENTO, FECHA_EVENTO, NOMBRE_ESTADO
             FROM   FIDE_ULTIMOS_EVENTOS_V"
        );
        jsonOut($rows);
        break;

    case 'ultimas_visitas':
        $rows = fetchAll($conn,
            "SELECT VISITANTE, ID_RESIDENCIA, FECHA_INGRESO, NOMBRE_ESTADO
             FROM   FIDE_ULTIMAS_VISITAS_V"
        );
        jsonOut($rows);
        break;

    case 'insertar_guardia':
        $nombre     = $_POST['nombre']           ?? '';
        $pat        = $_POST['apellido_paterno'] ?? '';
        $mat        = $_POST['apellido_materno'] ?? '';
        $tel        = $_POST['telefono']         ?? '';
        $correo     = $_POST['correo']           ?? '';
        $usuario    = trim($_POST['usuario']     ?? '');
        $contrasena = trim($_POST['contrasena']  ?? '');
        $idEstado   = (int)($_POST['id_estado']  ?? 1);

        if (!$usuario || !$contrasena) {
            jsonOut(['error'=>true,'mensaje'=>'El usuario y la contraseña son requeridos.']);
            break;
        }

        $existe = fetchAll($conn, "SELECT 1 FROM FIDE_USUARIOS_PERSONAS_V WHERE USUARIO = :u", [':u'=>$usuario]);
        if (!empty($existe)) {
            jsonOut(['error'=>true,'mensaje'=>"El usuario '$usuario' ya está en uso."]);
            break;
        }

        $rolRow = fetchAll($conn, "SELECT ID_ROL FROM FIDE_ROLES_TB WHERE UPPER(ROL) LIKE '%GUARD%' AND ROWNUM=1");
        if (empty($rolRow)) { jsonOut(['error'=>true,'mensaje'=>'No existe rol guardia.']); break; }
        $idRol      = (int)$rolRow[0]['ID_ROL'];
        $idPersona  = nextId('FIDE_PERSONAS_TB',  'ID_PERSONA',  $conn);
        $idTelefono = nextId('FIDE_TELEFONOS_TB', 'ID_TELEFONO', $conn);
        $idCorreo   = nextId('FIDE_CORREOS_TB',   'ID_CORREO',   $conn);
        $hoy        = date('Y-m-d');

        $r1 = execProc($conn,
            "BEGIN $pkg.FIDE_PERSONAS_INSERTAR_SP(:p1,:p2,:p3,:p4,TO_DATE(:p5,'YYYY-MM-DD'),:p6,:p7); END;",
            [':p1'=>$idPersona,':p2'=>$nombre,':p3'=>$pat,':p4'=>$mat,':p5'=>$hoy,':p6'=>$idRol,':p7'=>$idEstado]
        );
        if ($r1['error'] ?? false) { jsonOut($r1); break; }

        execUpdate($conn,
            "UPDATE FIDE_PERSONAS_TB SET USUARIO = :u, CONTRASENA = :c WHERE ID_PERSONA = :id",
            [':u'=>$usuario, ':c'=>$contrasena, ':id'=>$idPersona]
        );

        if ($tel)    execProc($conn, "BEGIN $pkg.FIDE_TELEFONOS_INSERTAR_SP(:p1,:p2,:p3,:p4); END;", [':p1'=>$idTelefono,':p2'=>$idPersona,':p3'=>$tel,':p4'=>1]);
        if ($correo) execProc($conn, "BEGIN $pkg.FIDE_CORREOS_INSERTAR_SP(:p1,:p2,:p3,:p4); END;",   [':p1'=>$idCorreo,':p2'=>$idPersona,':p3'=>$correo,':p4'=>1]);

        jsonOut(['ok'=>true,'id'=>$idPersona]);
        break;

    case 'insertar_residente':
        $nombre       = $_POST['nombre']           ?? '';
        $pat          = $_POST['apellido_paterno'] ?? '';
        $mat          = $_POST['apellido_materno'] ?? '';
        $tel          = $_POST['telefono']         ?? '';
        $correo       = $_POST['correo']           ?? '';
        $idResidencia = (int)($_POST['id_residencia'] ?? 0);
        $idEstado     = (int)($_POST['id_estado']     ?? 1);

        $rolRow = fetchAll($conn, "SELECT ID_ROL FROM FIDE_ROLES_TB WHERE UPPER(ROL) LIKE '%RESID%' AND ROWNUM=1");
        if (empty($rolRow)) { jsonOut(['error'=>true,'mensaje'=>'No existe rol residente.']); break; }
        $idRol      = (int)$rolRow[0]['ID_ROL'];
        $idPersona  = nextId('FIDE_PERSONAS_TB',  'ID_PERSONA',  $conn);
        $idTelefono = nextId('FIDE_TELEFONOS_TB', 'ID_TELEFONO', $conn);
        $idCorreo   = nextId('FIDE_CORREOS_TB',   'ID_CORREO',   $conn);
        $hoy        = date('Y-m-d');

        $r1 = execProc($conn,
            "BEGIN $pkg.FIDE_PERSONAS_INSERTAR_SP(:p1,:p2,:p3,:p4,TO_DATE(:p5,'YYYY-MM-DD'),:p6,:p7); END;",
            [':p1'=>$idPersona,':p2'=>$nombre,':p3'=>$pat,':p4'=>$mat,':p5'=>$hoy,':p6'=>$idRol,':p7'=>$idEstado]
        );
        if ($r1['error'] ?? false) { jsonOut($r1); break; }

        if ($tel)          execProc($conn, "BEGIN $pkg.FIDE_TELEFONOS_INSERTAR_SP(:p1,:p2,:p3,:p4); END;", [':p1'=>$idTelefono,':p2'=>$idPersona,':p3'=>$tel,':p4'=>1]);
        if ($correo)       execProc($conn, "BEGIN $pkg.FIDE_CORREOS_INSERTAR_SP(:p1,:p2,:p3,:p4); END;",   [':p1'=>$idCorreo,':p2'=>$idPersona,':p3'=>$correo,':p4'=>1]);
        if ($idResidencia) execProc($conn, "BEGIN $pkg.FIDE_RESIDENTES_INSERTAR_SP(:p1,:p2,:p3); END;",    [':p1'=>$idPersona,':p2'=>$idResidencia,':p3'=>$idEstado]);

        jsonOut(['ok'=>true,'id'=>$idPersona]);
        break;

    case 'insertar_residencia':
        $montoAlq  = (float)($_POST['monto_alquiler']      ?? 0);
        $montoMant = (float)($_POST['monto_mantenimiento'] ?? 0);
        $idTipoPago= (int)  ($_POST['id_tipo_pago']        ?? 1);
        $idEstado  = (int)  ($_POST['id_estado']           ?? 1);
        $id = nextId('FIDE_RESIDENCIAS_TB','ID_RESIDENCIA',$conn);
        $r  = execProc($conn, "BEGIN $pkg.FIDE_RESIDENCIAS_INSERTAR_SP(:p1,:p2,:p3,:p4,:p5); END;",
            [':p1'=>$id,':p2'=>$montoAlq,':p3'=>$montoMant,':p4'=>$idTipoPago,':p5'=>$idEstado]);
        jsonOut(($r['error'] ?? false) ? $r : ['ok'=>true,'id'=>$id]);
        break;

    case 'insertar_visita':
        $idPersona    = (int)($_POST['id_persona']    ?? 0);
        $fechaIngreso = $_POST['fecha_ingreso'] ?? '';
        $fechaSalida  = $_POST['fecha_salida']  ?? '';
        $idResidencia = (int)($_POST['id_residencia'] ?? 0);
        $idRol        = (int)($_POST['id_rol']        ?? 4);
        $idEstado     = (int)($_POST['id_estado']     ?? 4);
        if (!$fechaIngreso) $fechaIngreso = date('Y-m-d H:i');

        if (!$idPersona) {
            $nombreV  = trim($_POST['nombre_visitante'] ?? 'Visitante');
            $partes   = explode(' ', $nombreV, 2);
            $idPersona= nextId('FIDE_PERSONAS_TB','ID_PERSONA',$conn);
            $rolV     = fetchAll($conn, "SELECT ID_ROL FROM FIDE_ROLES_TB WHERE UPPER(ROL) LIKE '%VISIT%' AND ROWNUM=1");
            $rolVId   = $rolV[0]['ID_ROL'] ?? $idRol;
            execProc($conn,
                "BEGIN $pkg.FIDE_PERSONAS_INSERTAR_SP(:p1,:p2,:p3,:p4,TO_DATE(:p5,'YYYY-MM-DD'),:p6,:p7); END;",
                [':p1'=>$idPersona,':p2'=>($partes[0]??$nombreV),':p3'=>($partes[1]??''),':p4'=>'',
                 ':p5'=>date('Y-m-d'),':p6'=>$rolVId,':p7'=>$idEstado]
            );
        }
        $id = nextId('FIDE_VISITAS_TB','ID_VISITA',$conn);
        if ($fechaSalida) {
            $sql   = "BEGIN $pkg.FIDE_VISITAS_INSERTAR_SP(:p1,:p2,TO_DATE(:p3,'YYYY-MM-DD HH24:MI'),TO_DATE(:p4,'YYYY-MM-DD HH24:MI'),:p5,:p6,:p7); END;";
            $binds = [':p1'=>$id,':p2'=>$idPersona,':p3'=>$fechaIngreso,':p4'=>$fechaSalida,':p5'=>$idResidencia,':p6'=>$idRol,':p7'=>$idEstado];
        } else {
            $sql   = "BEGIN $pkg.FIDE_VISITAS_INSERTAR_SP(:p1,:p2,TO_DATE(:p3,'YYYY-MM-DD HH24:MI'),NULL,:p5,:p6,:p7); END;";
            $binds = [':p1'=>$id,':p2'=>$idPersona,':p3'=>$fechaIngreso,':p5'=>$idResidencia,':p6'=>$idRol,':p7'=>$idEstado];
        }
        $r = execProc($conn, $sql, $binds);
        jsonOut(($r['error'] ?? false) ? $r : ['ok'=>true,'id'=>$id]);
        break;

    case 'insertar_paquete':
        $idPersona    = (int)($_POST['id_persona']    ?? 0);
        $idResidencia = (int)($_POST['id_residencia'] ?? 0);
        $fechaIngreso = $_POST['fecha_ingreso'] ?? date('Y-m-d');
        $fechaSalida  = $_POST['fecha_salida']  ?? '';
        $idEstado     = (int)($_POST['id_estado'] ?? 3);
        if (!$fechaIngreso) $fechaIngreso = date('Y-m-d');
        $id = nextId('FIDE_PAQUETES_TB','ID_PAQUETE',$conn);
        if ($fechaSalida) {
            $sql   = "BEGIN $pkg.FIDE_PAQUETES_INSERTAR_SP(:p1,:p2,:p3,TO_DATE(:p4,'YYYY-MM-DD'),TO_DATE(:p5,'YYYY-MM-DD'),:p6); END;";
            $binds = [':p1'=>$id,':p2'=>$idPersona,':p3'=>$idResidencia,':p4'=>$fechaIngreso,':p5'=>$fechaSalida,':p6'=>$idEstado];
        } else {
            $sql   = "BEGIN $pkg.FIDE_PAQUETES_INSERTAR_SP(:p1,:p2,:p3,TO_DATE(:p4,'YYYY-MM-DD'),NULL,:p6); END;";
            $binds = [':p1'=>$id,':p2'=>$idPersona,':p3'=>$idResidencia,':p4'=>$fechaIngreso,':p6'=>$idEstado];
        }
        $r = execProc($conn, $sql, $binds);
        jsonOut(($r['error'] ?? false) ? $r : ['ok'=>true,'id'=>$id]);
        break;

    case 'insertar_factura':
        $fechaFactura = $_POST['fecha_factura'] ?? date('Y-m-d');
        $descr        = $_POST['descr_factura'] ?? '';
        $idTipoPago   = (int)($_POST['id_tipo_pago']  ?? 1);
        $idFormaPago  = (int)($_POST['id_forma_pago'] ?? 1);
        $idPersona    = (int)($_POST['id_persona']    ?? 0);
        $idEstado     = (int)($_POST['id_estado']     ?? 1);
        if (!$fechaFactura) $fechaFactura = date('Y-m-d');
        $id = nextId('FIDE_FACTURAS_TB','ID_FACTURA',$conn);
        $r  = execProc($conn,
            "BEGIN $pkg.FIDE_FACTURAS_INSERTAR_SP(:p1,TO_DATE(:p2,'YYYY-MM-DD'),:p3,:p4,:p5,:p6,:p7); END;",
            [':p1'=>$id,':p2'=>$fechaFactura,':p3'=>$descr,':p4'=>$idTipoPago,':p5'=>$idFormaPago,':p6'=>$idPersona,':p7'=>$idEstado]
        );
        jsonOut(($r['error'] ?? false) ? $r : ['ok'=>true,'id'=>$id]);
        break;

    case 'insertar_servicio':
        $descr             = $_POST['descr_servicio']        ?? '';
        $fechaSalida       = $_POST['fecha_salida']          ?? '';
        $idTipoServicio    = (int)($_POST['id_tipo_servicio']    ?? 1);
        $idTipoEvento      = (int)($_POST['id_tipo_evento']      ?? 1);
        $idEstado          = (int)($_POST['id_estado']           ?? 1);
        $idPersonaServicio = (int)($_POST['id_persona_servicio'] ?? 0);
        $id = nextId('FIDE_SERVICIOS_TB','ID_SERVICIO',$conn);
        if ($fechaSalida) {
            $sql   = "BEGIN $pkg.FIDE_SERVICIOS_INSERTAR_SP(:p1,:p2,TO_DATE(:p3,'YYYY-MM-DD'),:p4,:p5,:p6); END;";
            $binds = [':p1'=>$id,':p2'=>$descr,':p3'=>$fechaSalida,':p4'=>$idTipoServicio,':p5'=>$idTipoEvento,':p6'=>$idEstado];
        } else {
            $sql   = "BEGIN $pkg.FIDE_SERVICIOS_INSERTAR_SP(:p1,:p2,NULL,:p4,:p5,:p6); END;";
            $binds = [':p1'=>$id,':p2'=>$descr,':p4'=>$idTipoServicio,':p5'=>$idTipoEvento,':p6'=>$idEstado];
        }
        $r = execProc($conn, $sql, $binds);
        if ($r['error'] ?? false) { jsonOut($r); break; }
        if ($idPersonaServicio)
            execProc($conn,"BEGIN $pkg.FIDE_PERSONAS_SERVICIOS_INSERTAR_SP(:p1,:p2,:p3); END;",[':p1'=>$id,':p2'=>$idPersonaServicio,':p3'=>$idEstado]);
        jsonOut(['ok'=>true,'id'=>$id]);
        break;

    case 'insertar_evento':
        $descr         = $_POST['descr_evento']   ?? '';
        $fechaEvento   = $_POST['fecha_evento']   ?? date('Y-m-d');
        $idTipoEvento  = (int)($_POST['id_tipo_evento']  ?? 1);
        $idTipoEspacio = (int)($_POST['id_tipo_espacio'] ?? 1);
        $idEstado      = (int)($_POST['id_estado']       ?? 1);
        if (!$fechaEvento) $fechaEvento = date('Y-m-d');
        $id = nextId('FIDE_EVENTOS_TB','ID_EVENTO',$conn);
        $r  = execProc($conn,
            "BEGIN $pkg.FIDE_EVENTOS_INSERTAR_SP(:p1,:p2,TO_DATE(:p3,'YYYY-MM-DD'),:p4,:p5,:p6); END;",
            [':p1'=>$id,':p2'=>$descr,':p3'=>$fechaEvento,':p4'=>$idTipoEvento,':p5'=>$idTipoEspacio,':p6'=>$idEstado]
        );
        jsonOut(($r['error'] ?? false) ? $r : ['ok'=>true,'id'=>$id]);
        break;

    case 'insertar_vehiculo':
        $placa         = strtoupper(trim($_POST['placa']          ?? ''));
        $descripcion   = $_POST['descripcion']      ?? '';
        $idTipoEspacio = (int)($_POST['id_tipo_espacio'] ?? 1);
        $idPersona     = (int)($_POST['id_persona']      ?? 0);
        $idEstado      = (int)($_POST['id_estado']       ?? 1);
        $r = execProc($conn,
            "BEGIN $pkg.FIDE_VEHICULOS_INSERTAR_SP(:p1,:p2,:p3,:p4,:p5); END;",
            [':p1'=>$placa,':p2'=>$descripcion,':p3'=>$idTipoEspacio,':p4'=>$idPersona,':p5'=>$idEstado]
        );
        jsonOut(($r['error'] ?? false) ? $r : ['ok'=>true]);
        break;

    case 'actualizar_guardia':
        $id         = (int)($_POST['id']              ?? 0);
        $nombre     = $_POST['nombre']                ?? '';
        $pat        = $_POST['apellido_paterno']      ?? '';
        $mat        = $_POST['apellido_materno']      ?? '';
        $tel        = $_POST['telefono']              ?? '';
        $correo     = $_POST['correo']                ?? '';
        $usuario    = trim($_POST['usuario']          ?? '');
        $contrasena = trim($_POST['contrasena']       ?? '');
        $idEstado   = (int)($_POST['id_estado']       ?? 1);

        if (!$usuario) {
            jsonOut(['error'=>true,'mensaje'=>'El usuario no puede estar vacío.']);
            break;
        }

        $existe = fetchAll($conn,
            "SELECT 1 FROM FIDE_USUARIOS_PERSONAS_V WHERE USUARIO = :u AND ID_PERSONA != :id",
            [':u'=>$usuario, ':id'=>$id]
        );
        if (!empty($existe)) {
            jsonOut(['error'=>true,'mensaje'=>"El usuario '$usuario' ya está en uso por otra persona."]);
            break;
        }

        $cur = fetchAll($conn,
            "SELECT ID_ROL, TO_CHAR(FECHA_REGISTRO,'YYYY-MM-DD') AS FR FROM FIDE_PERSONAS_TB WHERE ID_PERSONA=:pid",
            [':pid'=>$id]);
        if (empty($cur)) { jsonOut(['error'=>true,'mensaje'=>'Persona no encontrada.']); break; }

        $r = execProc($conn,
            "BEGIN $pkg.FIDE_PERSONAS_ACTUALIZAR_SP(:p1,:p2,:p3,:p4,TO_DATE(:p5,'YYYY-MM-DD'),:p6,:p7); END;",
            [':p1'=>$id,':p2'=>$nombre,':p3'=>$pat,':p4'=>$mat,
             ':p5'=>$cur[0]['FR'],':p6'=>$cur[0]['ID_ROL'],':p7'=>$idEstado]
        );
        if ($r['error'] ?? false) { jsonOut($r); break; }

        if ($contrasena) {
            execUpdate($conn,
                "UPDATE FIDE_PERSONAS_TB SET USUARIO = :u, CONTRASENA = :c WHERE ID_PERSONA = :id",
                [':u'=>$usuario, ':c'=>$contrasena, ':id'=>$id]
            );
        } else {
            execUpdate($conn,
                "UPDATE FIDE_PERSONAS_TB SET USUARIO = :u WHERE ID_PERSONA = :id",
                [':u'=>$usuario, ':id'=>$id]
            );
        }

        if ($tel) {
            $tRow = fetchAll($conn,"SELECT ID_TELEFONO FROM FIDE_TELEFONOS_TB WHERE ID_PERSONA=:pid AND ROWNUM=1",[':pid'=>$id]);
            if ($tRow) execProc($conn,"BEGIN $pkg.FIDE_TELEFONOS_ACTUALIZAR_SP(:p1,:p2,:p3,:p4); END;",[':p1'=>$tRow[0]['ID_TELEFONO'],':p2'=>$id,':p3'=>$tel,':p4'=>1]);
            else { $nId=nextId('FIDE_TELEFONOS_TB','ID_TELEFONO',$conn); execProc($conn,"BEGIN $pkg.FIDE_TELEFONOS_INSERTAR_SP(:p1,:p2,:p3,:p4); END;",[':p1'=>$nId,':p2'=>$id,':p3'=>$tel,':p4'=>1]); }
        }
        if ($correo) {
            $cRow = fetchAll($conn,"SELECT ID_CORREO FROM FIDE_CORREOS_TB WHERE ID_PERSONA=:pid AND ROWNUM=1",[':pid'=>$id]);
            if ($cRow) execProc($conn,"BEGIN $pkg.FIDE_CORREOS_ACTUALIZAR_SP(:p1,:p2,:p3,:p4); END;",[':p1'=>$cRow[0]['ID_CORREO'],':p2'=>$id,':p3'=>$correo,':p4'=>1]);
            else { $nId=nextId('FIDE_CORREOS_TB','ID_CORREO',$conn); execProc($conn,"BEGIN $pkg.FIDE_CORREOS_INSERTAR_SP(:p1,:p2,:p3,:p4); END;",[':p1'=>$nId,':p2'=>$id,':p3'=>$correo,':p4'=>1]); }
        }
        jsonOut(['ok'=>true]);
        break;

    case 'actualizar_residente':
        $id           = (int)($_POST['id']              ?? 0);
        $nombre       = $_POST['nombre']                ?? '';
        $pat          = $_POST['apellido_paterno']      ?? '';
        $mat          = $_POST['apellido_materno']      ?? '';
        $tel          = $_POST['telefono']              ?? '';
        $correo       = $_POST['correo']                ?? '';
        $idResidencia = (int)($_POST['id_residencia']   ?? 0);
        $idEstado     = (int)($_POST['id_estado']       ?? 1);

        $cur = fetchAll($conn,
            "SELECT ID_ROL, TO_CHAR(FECHA_REGISTRO,'YYYY-MM-DD') AS FR FROM FIDE_PERSONAS_TB WHERE ID_PERSONA=:pid",
            [':pid'=>$id]);
        if (empty($cur)) { jsonOut(['error'=>true,'mensaje'=>'Persona no encontrada.']); break; }

        $r = execProc($conn,
            "BEGIN $pkg.FIDE_PERSONAS_ACTUALIZAR_SP(:p1,:p2,:p3,:p4,TO_DATE(:p5,'YYYY-MM-DD'),:p6,:p7); END;",
            [':p1'=>$id,':p2'=>$nombre,':p3'=>$pat,':p4'=>$mat,
             ':p5'=>$cur[0]['FR'],':p6'=>$cur[0]['ID_ROL'],':p7'=>$idEstado]
        );
        if ($r['error'] ?? false) { jsonOut($r); break; }

        if ($tel) {
            $tRow = fetchAll($conn,"SELECT ID_TELEFONO FROM FIDE_TELEFONOS_TB WHERE ID_PERSONA=:pid AND ROWNUM=1",[':pid'=>$id]);
            if ($tRow) execProc($conn,"BEGIN $pkg.FIDE_TELEFONOS_ACTUALIZAR_SP(:p1,:p2,:p3,:p4); END;",[':p1'=>$tRow[0]['ID_TELEFONO'],':p2'=>$id,':p3'=>$tel,':p4'=>1]);
            else { $nId=nextId('FIDE_TELEFONOS_TB','ID_TELEFONO',$conn); execProc($conn,"BEGIN $pkg.FIDE_TELEFONOS_INSERTAR_SP(:p1,:p2,:p3,:p4); END;",[':p1'=>$nId,':p2'=>$id,':p3'=>$tel,':p4'=>1]); }
        }
        if ($correo) {
            $cRow = fetchAll($conn,"SELECT ID_CORREO FROM FIDE_CORREOS_TB WHERE ID_PERSONA=:pid AND ROWNUM=1",[':pid'=>$id]);
            if ($cRow) execProc($conn,"BEGIN $pkg.FIDE_CORREOS_ACTUALIZAR_SP(:p1,:p2,:p3,:p4); END;",[':p1'=>$cRow[0]['ID_CORREO'],':p2'=>$id,':p3'=>$correo,':p4'=>1]);
            else { $nId=nextId('FIDE_CORREOS_TB','ID_CORREO',$conn); execProc($conn,"BEGIN $pkg.FIDE_CORREOS_INSERTAR_SP(:p1,:p2,:p3,:p4); END;",[':p1'=>$nId,':p2'=>$id,':p3'=>$correo,':p4'=>1]); }
        }
        if ($idResidencia)
            execProc($conn,"BEGIN $pkg.FIDE_RESIDENTES_ACTUALIZAR_SP(:p1,:p2,:p3); END;",[':p1'=>$id,':p2'=>$idResidencia,':p3'=>$idEstado]);

        jsonOut(['ok'=>true]);
        break;

    case 'actualizar_residencia':
        $id         = (int)($_POST['id']                  ?? 0);
        $montoAlq   = (float)($_POST['monto_alquiler']    ?? 0);
        $montoMant  = (float)($_POST['monto_mantenimiento'] ?? 0);
        $idTipoPago = (int)($_POST['id_tipo_pago']        ?? 1);
        $idEstado   = (int)($_POST['id_estado']           ?? 1);
        $r = execProc($conn,
            "BEGIN $pkg.FIDE_RESIDENCIAS_ACTUALIZAR_SP(:p1,:p2,:p3,:p4,:p5); END;",
            [':p1'=>$id,':p2'=>$montoAlq,':p3'=>$montoMant,':p4'=>$idTipoPago,':p5'=>$idEstado]
        );
        jsonOut($r);
        break;

    case 'actualizar_servicio':
        $id             = (int)($_POST['id']                 ?? 0);
        $descr          = $_POST['descr_servicio']           ?? '';
        $fechaSalida    = $_POST['fecha_salida']             ?? '';
        $idTipoServicio = (int)($_POST['id_tipo_servicio']   ?? 1);
        $idTipoEvento   = (int)($_POST['id_tipo_evento']     ?? 1);
        $idEstado       = (int)($_POST['id_estado']          ?? 1);
        if ($fechaSalida) {
            $sql   = "BEGIN $pkg.FIDE_SERVICIOS_ACTUALIZAR_SP(:p1,:p2,TO_DATE(:p3,'YYYY-MM-DD'),:p4,:p5,:p6); END;";
            $binds = [':p1'=>$id,':p2'=>$descr,':p3'=>$fechaSalida,':p4'=>$idTipoServicio,':p5'=>$idTipoEvento,':p6'=>$idEstado];
        } else {
            $sql   = "BEGIN $pkg.FIDE_SERVICIOS_ACTUALIZAR_SP(:p1,:p2,NULL,:p4,:p5,:p6); END;";
            $binds = [':p1'=>$id,':p2'=>$descr,':p4'=>$idTipoServicio,':p5'=>$idTipoEvento,':p6'=>$idEstado];
        }
        jsonOut(execProc($conn, $sql, $binds));
        break;

    case 'actualizar_evento':
        $id            = (int)($_POST['id']               ?? 0);
        $descr         = $_POST['descr_evento']           ?? '';
        $fechaEvento   = $_POST['fecha_evento']           ?? date('Y-m-d');
        $idTipoEvento  = (int)($_POST['id_tipo_evento']   ?? 1);
        $idTipoEspacio = (int)($_POST['id_tipo_espacio']  ?? 1);
        $idEstado      = (int)($_POST['id_estado']        ?? 1);
        $r = execProc($conn,
            "BEGIN $pkg.FIDE_EVENTOS_ACTUALIZAR_SP(:p1,:p2,TO_DATE(:p3,'YYYY-MM-DD'),:p4,:p5,:p6); END;",
            [':p1'=>$id,':p2'=>$descr,':p3'=>$fechaEvento,':p4'=>$idTipoEvento,':p5'=>$idTipoEspacio,':p6'=>$idEstado]
        );
        jsonOut($r);
        break;

    case 'eliminar_guardia':
    case 'eliminar_residente':
    case 'eliminar_persona':
        $id = (int)($_REQUEST['id'] ?? 0);
        jsonOut(execProc($conn,"BEGIN $pkg.FIDE_PERSONAS_ELIMINAR_SP(:p1); END;",[':p1'=>$id]));
        break;

    case 'eliminar_residencia':
        $id = (int)($_REQUEST['id'] ?? 0);
        jsonOut(execProc($conn,"BEGIN $pkg.FIDE_RESIDENCIAS_ELIMINAR_SP(:p1); END;",[':p1'=>$id]));
        break;

    case 'eliminar_visita':
        $id = (int)($_REQUEST['id'] ?? 0);
        jsonOut(execProc($conn,"BEGIN $pkg.FIDE_VISITAS_ELIMINAR_SP(:p1); END;",[':p1'=>$id]));
        break;

    case 'eliminar_paquete':
        $id = (int)($_REQUEST['id'] ?? 0);
        jsonOut(execProc($conn,"BEGIN $pkg.FIDE_PAQUETES_ELIMINAR_SP(:p1); END;",[':p1'=>$id]));
        break;

    case 'eliminar_factura':
        $id = (int)($_REQUEST['id'] ?? 0);
        jsonOut(execProc($conn,"BEGIN $pkg.FIDE_FACTURAS_ELIMINAR_SP(:p1); END;",[':p1'=>$id]));
        break;

    case 'eliminar_servicio':
        $id = (int)($_REQUEST['id'] ?? 0);
        jsonOut(execProc($conn,"BEGIN $pkg.FIDE_SERVICIOS_ELIMINAR_SP(:p1); END;",[':p1'=>$id]));
        break;

    case 'eliminar_evento':
        $id = (int)($_REQUEST['id'] ?? 0);
        jsonOut(execProc($conn,"BEGIN $pkg.FIDE_EVENTOS_ELIMINAR_SP(:p1); END;",[':p1'=>$id]));
        break;

    case 'eliminar_vehiculo':
        $placa = strtoupper(trim($_REQUEST['placa'] ?? ''));
        jsonOut(execProc($conn,"BEGIN $pkg.FIDE_VEHICULOS_ELIMINAR_SP(:p1); END;",[':p1'=>$placa]));
        break;

    default:
        http_response_code(400);
        jsonOut(['error'=>true,'mensaje'=>"Acción '$accion' no reconocida."]);
        break;
}

oci_close($conn);
