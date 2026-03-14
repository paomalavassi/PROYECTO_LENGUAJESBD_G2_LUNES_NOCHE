<?php

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

    case 'listar_guardias':
        $rows = fetchAll($conn,
            "SELECT p.ID_PERSONA, p.NOMBRE, p.APELLIDO_PATERNO, p.APELLIDO_MATERNO,
                    (SELECT TELEFONO FROM FIDE_TELEFONOS_TB WHERE ID_PERSONA = p.ID_PERSONA AND ROWNUM=1) AS TELEFONO,
                    (SELECT CORREO   FROM FIDE_CORREOS_TB   WHERE ID_PERSONA = p.ID_PERSONA AND ROWNUM=1) AS CORREO,
                    e.ID_ESTADO, e.NOMBRE_ESTADO
             FROM   FIDE_PERSONAS_TB p
             LEFT JOIN FIDE_ESTADOS_TB e ON e.ID_ESTADO = p.ID_ESTADO
             WHERE  p.ID_ROL = (SELECT ID_ROL FROM FIDE_ROLES_TB WHERE UPPER(ROL) LIKE '%GUARD%' AND ROWNUM=1)
             ORDER  BY p.ID_PERSONA"
        );
        echo json_encode($rows);
        break;

    case 'listar_residentes':
        $rows = fetchAll($conn,
            "SELECT p.ID_PERSONA, p.NOMBRE, p.APELLIDO_PATERNO, p.APELLIDO_MATERNO,
                    (SELECT TELEFONO     FROM FIDE_TELEFONOS_TB  WHERE ID_PERSONA    = p.ID_PERSONA    AND ROWNUM=1) AS TELEFONO,
                    (SELECT CORREO       FROM FIDE_CORREOS_TB    WHERE ID_PERSONA    = p.ID_PERSONA    AND ROWNUM=1) AS CORREO,
                    (SELECT ID_RESIDENCIA FROM FIDE_RESIDENTES_TB WHERE ID_PERSONA   = p.ID_PERSONA    AND ROWNUM=1) AS ID_RESIDENCIA,
                    e.ID_ESTADO, e.NOMBRE_ESTADO
             FROM   FIDE_PERSONAS_TB p
             LEFT JOIN FIDE_ESTADOS_TB e ON e.ID_ESTADO = p.ID_ESTADO
             WHERE  p.ID_ROL = (SELECT ID_ROL FROM FIDE_ROLES_TB WHERE UPPER(ROL) LIKE '%RESID%' AND ROWNUM=1)
             ORDER  BY p.ID_PERSONA"
        );
        echo json_encode($rows);
        break;

    case 'listar_personas':
        $rows = fetchAll($conn,
            "SELECT ID_PERSONA,
                    NOMBRE || ' ' || APELLIDO_PATERNO || ' ' || APELLIDO_MATERNO AS NOMBRE_COMPLETO,
                    ID_ROL
             FROM   FIDE_PERSONAS_TB
             WHERE  ID_ESTADO = 1
             ORDER  BY NOMBRE"
        );
        echo json_encode($rows);
        break;

    case 'listar_trabajadores':
        $rows = fetchAll($conn,
            "SELECT ID_PERSONA,
                    NOMBRE || ' ' || APELLIDO_PATERNO || ' ' || APELLIDO_MATERNO AS NOMBRE_COMPLETO
             FROM   FIDE_PERSONAS_TB
             WHERE  ID_ROL IN (SELECT ID_ROL FROM FIDE_ROLES_TB
                               WHERE UPPER(ROL) IN ('TRABAJADOR','TECNICO','JARDINERO'))
               AND  ID_ESTADO = 1
             ORDER  BY NOMBRE"
        );
        echo json_encode($rows);
        break;

    case 'listar_residencias':
        $rows = fetchAll($conn,
            "SELECT res.ID_RESIDENCIA, res.MONTO_ALQUILER, res.MONTO_MANTENIMIENTO,
                    tp.TIPO AS TIPO_PAGO, tp.ID_TIPO_PAGO,
                    e.ID_ESTADO, e.NOMBRE_ESTADO
             FROM   FIDE_RESIDENCIAS_TB   res
             LEFT JOIN FIDE_TIPOS_PAGO_TB tp ON tp.ID_TIPO_PAGO = res.ID_TIPO_PAGO
             LEFT JOIN FIDE_ESTADOS_TB     e ON e.ID_ESTADO     = res.ID_ESTADO
             ORDER  BY res.ID_RESIDENCIA"
        );
        echo json_encode($rows);
        break;

    case 'listar_visitas':
        $rows = fetchAll($conn,
            "SELECT v.ID_VISITA,
                    p.NOMBRE || ' ' || p.APELLIDO_PATERNO AS VISITANTE,
                    v.ID_PERSONA, v.ID_ROL AS ROL_ID, rol.ROL,
                    v.ID_RESIDENCIA,
                    TO_CHAR(v.FECHA_INGRESO,'YYYY-MM-DD HH24:MI') AS FECHA_INGRESO,
                    TO_CHAR(v.FECHA_SALIDA, 'YYYY-MM-DD HH24:MI') AS FECHA_SALIDA,
                    e.ID_ESTADO, e.NOMBRE_ESTADO
             FROM   FIDE_VISITAS_TB        v
             LEFT JOIN FIDE_PERSONAS_TB    p   ON p.ID_PERSONA = v.ID_PERSONA
             LEFT JOIN FIDE_ROLES_TB       rol ON rol.ID_ROL   = v.ID_ROL
             LEFT JOIN FIDE_ESTADOS_TB     e   ON e.ID_ESTADO  = v.ID_ESTADO
             ORDER  BY v.ID_VISITA DESC"
        );
        echo json_encode($rows);
        break;

    case 'listar_paquetes':
        $rows = fetchAll($conn,
            "SELECT pk.ID_PAQUETE,
                    p.NOMBRE || ' ' || p.APELLIDO_PATERNO AS PERSONA,
                    pk.ID_PERSONA, pk.ID_RESIDENCIA,
                    TO_CHAR(pk.FECHA_INGRESO,'YYYY-MM-DD HH24:MI') AS FECHA_INGRESO,
                    TO_CHAR(pk.FECHA_SALIDA, 'YYYY-MM-DD HH24:MI') AS FECHA_SALIDA,
                    e.ID_ESTADO, e.NOMBRE_ESTADO
             FROM   FIDE_PAQUETES_TB      pk
             LEFT JOIN FIDE_PERSONAS_TB   p  ON p.ID_PERSONA = pk.ID_PERSONA
             LEFT JOIN FIDE_ESTADOS_TB    e  ON e.ID_ESTADO  = pk.ID_ESTADO
             ORDER  BY pk.ID_PAQUETE DESC"
        );
        echo json_encode($rows);
        break;

    case 'listar_facturas':
        $rows = fetchAll($conn,
            "SELECT f.ID_FACTURA,
                    TO_CHAR(f.FECHA_FACTURA,'YYYY-MM-DD') AS FECHA_FACTURA,
                    f.DESCR_FACTURA,
                    p.NOMBRE || ' ' || p.APELLIDO_PATERNO AS PERSONA,
                    tp.TIPO  AS TIPO_PAGO,
                    fp.FORMA AS FORMA_PAGO,
                    e.NOMBRE_ESTADO
             FROM   FIDE_FACTURAS_TB        f
             LEFT JOIN FIDE_PERSONAS_TB     p  ON p.ID_PERSONA    = f.ID_PERSONA
             LEFT JOIN FIDE_TIPOS_PAGO_TB   tp ON tp.ID_TIPO_PAGO = f.ID_TIPO_PAGO
             LEFT JOIN FIDE_FORMAS_PAGOS_TB fp ON fp.ID_FORMA_PAGO= f.ID_FORMA_PAGO
             LEFT JOIN FIDE_ESTADOS_TB      e  ON e.ID_ESTADO     = f.ID_ESTADO
             ORDER  BY f.ID_FACTURA DESC"
        );
        echo json_encode($rows);
        break;

    case 'listar_servicios':
        $rows = fetchAll($conn,
            "SELECT s.ID_SERVICIO, s.DESCR_SERVICIO,
                    TO_CHAR(s.FECHA_SALIDA,'YYYY-MM-DD') AS FECHA_SALIDA,
                    ts.ID_TIPO_SERVICIO, ts.TIPO_SERVICIO,
                    s.ID_TIPO_EVENTO,
                    e.ID_ESTADO, e.NOMBRE_ESTADO,
                    (SELECT LISTAGG(p.NOMBRE || ' ' || p.APELLIDO_PATERNO, ', ')
                            WITHIN GROUP (ORDER BY p.NOMBRE)
                     FROM FIDE_PERSONAS_SERVICIOS_TB ps
                     JOIN FIDE_PERSONAS_TB p ON p.ID_PERSONA = ps.ID_PERSONA
                     WHERE ps.ID_SERVICIO = s.ID_SERVICIO) AS PERSONAS
             FROM   FIDE_SERVICIOS_TB        s
             LEFT JOIN FIDE_TIPOS_SERVICIOS_TB ts ON ts.ID_TIPO_SERVICIO = s.ID_TIPO_SERVICIO
             LEFT JOIN FIDE_ESTADOS_TB         e  ON e.ID_ESTADO         = s.ID_ESTADO
             ORDER  BY s.ID_SERVICIO DESC"
        );
        echo json_encode($rows);
        break;

    case 'listar_eventos':
        $rows = fetchAll($conn,
            "SELECT ev.ID_EVENTO, ev.DESCR_EVENTO,
                    TO_CHAR(ev.FECHA_EVENTO,'YYYY-MM-DD') AS FECHA_EVENTO,
                    te.ID_TIPO_EVENTO, te.TIPO_EVENTO,
                    ev.ID_TIPO_ESPACIO,
                    e.ID_ESTADO, e.NOMBRE_ESTADO
             FROM   FIDE_EVENTOS_TB         ev
             LEFT JOIN FIDE_TIPOS_EVENTOS_TB te ON te.ID_TIPO_EVENTO = ev.ID_TIPO_EVENTO
             LEFT JOIN FIDE_ESTADOS_TB        e ON e.ID_ESTADO       = ev.ID_ESTADO
             ORDER  BY ev.ID_EVENTO DESC"
        );
        echo json_encode($rows);
        break;

    case 'listar_vehiculos':
        $rows = fetchAll($conn,
            "SELECT v.PLACA, v.DESCRIPCION,
                    p.NOMBRE || ' ' || p.APELLIDO_PATERNO AS RESIDENTE,
                    v.ID_PERSONA, v.ID_TIPO_ESPACIO,
                    e.ID_ESTADO, e.NOMBRE_ESTADO
             FROM   FIDE_VEHICULOS_TB      v
             LEFT JOIN FIDE_PERSONAS_TB    p ON p.ID_PERSONA = v.ID_PERSONA
             LEFT JOIN FIDE_ESTADOS_TB     e ON e.ID_ESTADO  = v.ID_ESTADO
             ORDER  BY v.PLACA"
        );
        echo json_encode($rows);
        break;

    case 'listar_espacios':
        $rows = fetchAll($conn,
            "SELECT te.ID_TIPO_ESPACIO, te.NOMBRE_ESPACIO, te.DESCR_ESPACIO,
                    e.ID_ESTADO, e.NOMBRE_ESTADO
             FROM   FIDE_TIPOS_ESPACIOS_TB te
             LEFT JOIN FIDE_ESTADOS_TB     e ON e.ID_ESTADO = te.ID_ESTADO
             ORDER  BY te.ID_TIPO_ESPACIO"
        );
        echo json_encode($rows);
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
        echo json_encode(($r['error'] ?? false) ? $r : ['ok'=>true,'id'=>$id]);
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
        echo json_encode($r);
        break;

    case 'eliminar_espacio':
        $id = (int)($_REQUEST['id'] ?? 0);
        $r  = execProc($conn, "BEGIN $pkg.FIDE_TIPOS_ESPACIOS_ELIMINAR_SP(:p1); END;", [':p1'=>$id]);
        echo json_encode($r);
        break;

    case 'actualizar_estado_visita':
        $id          = (int)($_REQUEST['id']     ?? 0);
        $nuevoEstado = (int)($_REQUEST['estado'] ?? 0);
        if (!in_array($nuevoEstado, [4, 5, 6])) {
            echo json_encode(['error'=>true,'mensaje'=>'Estado no permitido para guardia.']);
            break;
        }
        $sql = ($nuevoEstado === 5)
            ? "UPDATE FIDE_VISITAS_TB SET ID_ESTADO=:est, FECHA_SALIDA=SYSDATE WHERE ID_VISITA=:id"
            : "UPDATE FIDE_VISITAS_TB SET ID_ESTADO=:est                         WHERE ID_VISITA=:id";
        echo json_encode(execUpdate($conn, $sql, [':est'=>$nuevoEstado,':id'=>$id]));
        break;

    case 'actualizar_estado_vehiculo':
        $placa       = strtoupper(trim($_REQUEST['placa']  ?? ''));
        $nuevoEstado = (int)($_REQUEST['estado'] ?? 0);
        if (!in_array($nuevoEstado, [4, 5, 6])) {
            echo json_encode(['error'=>true,'mensaje'=>'Estado no permitido para guardia.']);
            break;
        }
        echo json_encode(execUpdate($conn,
            "UPDATE FIDE_VEHICULOS_TB SET ID_ESTADO=:est WHERE PLACA=:placa",
            [':est'=>$nuevoEstado,':placa'=>$placa]
        ));
        break;

    case 'actualizar_estado_evento':
        $id          = (int)($_REQUEST['id']     ?? 0);
        $nuevoEstado = (int)($_REQUEST['estado'] ?? 0);
        if (!in_array($nuevoEstado, [12, 13, 14, 17])) {
            echo json_encode(['error'=>true,'mensaje'=>'Estado no permitido para guardia.']);
            break;
        }
        echo json_encode(execUpdate($conn,
            "UPDATE FIDE_EVENTOS_TB SET ID_ESTADO=:est WHERE ID_EVENTO=:id",
            [':est'=>$nuevoEstado,':id'=>$id]
        ));
        break;

    case 'marcar_paquete_entregado':
        $id = (int)($_REQUEST['id'] ?? 0);
        echo json_encode(execUpdate($conn,
            "UPDATE FIDE_PAQUETES_TB SET ID_ESTADO=16, FECHA_SALIDA=SYSDATE WHERE ID_PAQUETE=:id",
            [':id'=>$id]
        ));
        break;

    case 'listar_turnos':
        $idPersona = (int)($_REQUEST['id_persona'] ?? 0);
        $base = "SELECT p.NOMBRE || ' ' || p.APELLIDO_PATERNO AS GUARDIA,
                        TO_CHAR(f.FECHAS_TURNO,'YYYY-MM-DD') AS FECHA,
                        h.HORARIO_TURNO, e.NOMBRE_ESTADO
                 FROM   FIDE_TURNOS_TB t
                 JOIN   FIDE_PERSONAS_TB        p ON p.ID_PERSONA = t.ID_PERSONA
                 JOIN   FIDE_FECHAS_TURNOS_TB   f ON f.ID_FECHAS  = t.ID_FECHAS
                 JOIN   FIDE_HORARIOS_TURNOS_TB h ON h.ID_HORARIO = t.ID_HORARIO
                 LEFT JOIN FIDE_ESTADOS_TB      e ON e.ID_ESTADO  = t.ID_ESTADO
                 WHERE  p.ID_ROL=(SELECT ID_ROL FROM FIDE_ROLES_TB WHERE UPPER(ROL) LIKE '%GUARD%' AND ROWNUM=1)";
        if ($idPersona)
            $rows = fetchAll($conn, $base . " AND t.ID_PERSONA=:pid ORDER BY f.FECHAS_TURNO DESC, h.ID_HORARIO", [':pid'=>$idPersona]);
        else
            $rows = fetchAll($conn, $base . " ORDER BY f.FECHAS_TURNO DESC, h.ID_HORARIO");
        echo json_encode($rows);
        break;

    case 'listar_roles':
        echo json_encode(fetchAll($conn, "SELECT ID_ROL, ROL FROM FIDE_ROLES_TB WHERE ID_ESTADO=1 ORDER BY ROL"));
        break;

    case 'listar_tipos_pago':
        echo json_encode(fetchAll($conn, "SELECT ID_TIPO_PAGO, TIPO FROM FIDE_TIPOS_PAGO_TB WHERE ID_ESTADO=1 ORDER BY TIPO"));
        break;

    case 'listar_formas_pago':
        echo json_encode(fetchAll($conn, "SELECT ID_FORMA_PAGO, FORMA FROM FIDE_FORMAS_PAGOS_TB WHERE ID_ESTADO=1 ORDER BY FORMA"));
        break;

    case 'listar_tipos_servicio':
        echo json_encode(fetchAll($conn, "SELECT ID_TIPO_SERVICIO, TIPO_SERVICIO FROM FIDE_TIPOS_SERVICIOS_TB WHERE ID_ESTADO=1 ORDER BY TIPO_SERVICIO"));
        break;

    case 'listar_tipos_evento':
        echo json_encode(fetchAll($conn, "SELECT ID_TIPO_EVENTO, TIPO_EVENTO FROM FIDE_TIPOS_EVENTOS_TB WHERE ID_ESTADO=1 ORDER BY TIPO_EVENTO"));
        break;

    case 'listar_estados':
        echo json_encode(fetchAll($conn, "SELECT ID_ESTADO, NOMBRE_ESTADO FROM FIDE_ESTADOS_TB ORDER BY ID_ESTADO"));
        break;

    case 'listar_estados_guardia':
        echo json_encode(fetchAll($conn, "SELECT ID_ESTADO, NOMBRE_ESTADO FROM FIDE_ESTADOS_TB WHERE ID_ESTADO != 2 ORDER BY ID_ESTADO"));
        break;

    case 'resumen':
        $g  = fetchAll($conn, "SELECT COUNT(*) N FROM FIDE_PERSONAS_TB p JOIN FIDE_ROLES_TB r ON r.ID_ROL=p.ID_ROL WHERE UPPER(r.ROL) LIKE '%GUARD%' AND p.ID_ESTADO=1");
        $re = fetchAll($conn, "SELECT COUNT(*) N FROM FIDE_RESIDENTES_TB WHERE ID_ESTADO=1");
        $rs = fetchAll($conn, "SELECT COUNT(*) N FROM FIDE_RESIDENCIAS_TB WHERE ID_ESTADO IN (1,8,9,10)");
        $pk = fetchAll($conn, "SELECT COUNT(*) N FROM FIDE_PAQUETES_TB   WHERE ID_ESTADO=3");
        $ev = fetchAll($conn, "SELECT COUNT(*) N FROM FIDE_EVENTOS_TB    WHERE ID_ESTADO IN (1,12,13)");
        $fa = fetchAll($conn, "SELECT COUNT(*) N FROM FIDE_FACTURAS_TB   WHERE ID_ESTADO IN (1,3)");
        echo json_encode([
            'guardias'   => $g[0]['N']  ?? 0,
            'residentes' => $re[0]['N'] ?? 0,
            'residencias'=> $rs[0]['N'] ?? 0,
            'paquetes'   => $pk[0]['N'] ?? 0,
            'eventos'    => $ev[0]['N'] ?? 0,
            'facturas'   => $fa[0]['N'] ?? 0,
        ]);
        break;

    case 'ultimos_eventos':
        $rows = fetchAll($conn,
            "SELECT * FROM (
                SELECT ev.DESCR_EVENTO, te.TIPO_EVENTO,
                       TO_CHAR(ev.FECHA_EVENTO,'DD/MM/YYYY') AS FECHA_EVENTO,
                       e.NOMBRE_ESTADO
                FROM   FIDE_EVENTOS_TB ev
                LEFT JOIN FIDE_TIPOS_EVENTOS_TB te ON te.ID_TIPO_EVENTO = ev.ID_TIPO_EVENTO
                LEFT JOIN FIDE_ESTADOS_TB        e ON e.ID_ESTADO       = ev.ID_ESTADO
                ORDER  BY ev.FECHA_EVENTO DESC
             ) WHERE ROWNUM <= 10"
        );
        echo json_encode($rows);
        break;

    case 'ultimas_visitas':
        $rows = fetchAll($conn,
            "SELECT * FROM (
                SELECT p.NOMBRE || ' ' || p.APELLIDO_PATERNO AS VISITANTE,
                       v.ID_RESIDENCIA,
                       TO_CHAR(v.FECHA_INGRESO,'DD/MM/YYYY HH24:MI') AS FECHA_INGRESO,
                       e.NOMBRE_ESTADO
                FROM   FIDE_VISITAS_TB v
                LEFT JOIN FIDE_PERSONAS_TB p ON p.ID_PERSONA = v.ID_PERSONA
                LEFT JOIN FIDE_ESTADOS_TB  e ON e.ID_ESTADO  = v.ID_ESTADO
                ORDER  BY v.FECHA_INGRESO DESC
             ) WHERE ROWNUM <= 10"
        );
        echo json_encode($rows);
        break;

    case 'insertar_guardia':
        $nombre   = $_POST['nombre']           ?? '';
        $pat      = $_POST['apellido_paterno'] ?? '';
        $mat      = $_POST['apellido_materno'] ?? '';
        $tel      = $_POST['telefono']         ?? '';
        $correo   = $_POST['correo']           ?? '';
        $idEstado = (int)($_POST['id_estado']  ?? 1);

        $rolRow = fetchAll($conn, "SELECT ID_ROL FROM FIDE_ROLES_TB WHERE UPPER(ROL) LIKE '%GUARD%' AND ROWNUM=1");
        if (empty($rolRow)) { echo json_encode(['error'=>true,'mensaje'=>'No existe rol guardia.']); break; }
        $idRol      = (int)$rolRow[0]['ID_ROL'];
        $idPersona  = nextId('FIDE_PERSONAS_TB',  'ID_PERSONA',  $conn);
        $idTelefono = nextId('FIDE_TELEFONOS_TB', 'ID_TELEFONO', $conn);
        $idCorreo   = nextId('FIDE_CORREOS_TB',   'ID_CORREO',   $conn);
        $hoy        = date('Y-m-d');

        $r1 = execProc($conn,
            "BEGIN $pkg.FIDE_PERSONAS_INSERTAR_SP(:p1,:p2,:p3,:p4,TO_DATE(:p5,'YYYY-MM-DD'),:p6,:p7); END;",
            [':p1'=>$idPersona,':p2'=>$nombre,':p3'=>$pat,':p4'=>$mat,':p5'=>$hoy,':p6'=>$idRol,':p7'=>$idEstado]
        );
        if ($r1['error'] ?? false) { echo json_encode($r1); break; }

        if ($tel)    execProc($conn, "BEGIN $pkg.FIDE_TELEFONOS_INSERTAR_SP(:p1,:p2,:p3,:p4); END;", [':p1'=>$idTelefono,':p2'=>$idPersona,':p3'=>$tel,':p4'=>1]);
        if ($correo) execProc($conn, "BEGIN $pkg.FIDE_CORREOS_INSERTAR_SP(:p1,:p2,:p3,:p4); END;",   [':p1'=>$idCorreo,':p2'=>$idPersona,':p3'=>$correo,':p4'=>1]);

        echo json_encode(['ok'=>true,'id'=>$idPersona]);
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
        if (empty($rolRow)) { echo json_encode(['error'=>true,'mensaje'=>'No existe rol residente.']); break; }
        $idRol      = (int)$rolRow[0]['ID_ROL'];
        $idPersona  = nextId('FIDE_PERSONAS_TB',  'ID_PERSONA',  $conn);
        $idTelefono = nextId('FIDE_TELEFONOS_TB', 'ID_TELEFONO', $conn);
        $idCorreo   = nextId('FIDE_CORREOS_TB',   'ID_CORREO',   $conn);
        $hoy        = date('Y-m-d');

        $r1 = execProc($conn,
            "BEGIN $pkg.FIDE_PERSONAS_INSERTAR_SP(:p1,:p2,:p3,:p4,TO_DATE(:p5,'YYYY-MM-DD'),:p6,:p7); END;",
            [':p1'=>$idPersona,':p2'=>$nombre,':p3'=>$pat,':p4'=>$mat,':p5'=>$hoy,':p6'=>$idRol,':p7'=>$idEstado]
        );
        if ($r1['error'] ?? false) { echo json_encode($r1); break; }

        if ($tel)         execProc($conn, "BEGIN $pkg.FIDE_TELEFONOS_INSERTAR_SP(:p1,:p2,:p3,:p4); END;", [':p1'=>$idTelefono,':p2'=>$idPersona,':p3'=>$tel,':p4'=>1]);
        if ($correo)      execProc($conn, "BEGIN $pkg.FIDE_CORREOS_INSERTAR_SP(:p1,:p2,:p3,:p4); END;",   [':p1'=>$idCorreo,':p2'=>$idPersona,':p3'=>$correo,':p4'=>1]);
        if ($idResidencia) execProc($conn, "BEGIN $pkg.FIDE_RESIDENTES_INSERTAR_SP(:p1,:p2,:p3); END;",   [':p1'=>$idPersona,':p2'=>$idResidencia,':p3'=>$idEstado]);

        echo json_encode(['ok'=>true,'id'=>$idPersona]);
        break;

    case 'insertar_residencia':
        $montoAlq  = (float)($_POST['monto_alquiler']      ?? 0);
        $montoMant = (float)($_POST['monto_mantenimiento'] ?? 0);
        $idTipoPago= (int)  ($_POST['id_tipo_pago']        ?? 1);
        $idEstado  = (int)  ($_POST['id_estado']           ?? 1);
        $id = nextId('FIDE_RESIDENCIAS_TB','ID_RESIDENCIA',$conn);
        $r  = execProc($conn, "BEGIN $pkg.FIDE_RESIDENCIAS_INSERTAR_SP(:p1,:p2,:p3,:p4,:p5); END;",
            [':p1'=>$id,':p2'=>$montoAlq,':p3'=>$montoMant,':p4'=>$idTipoPago,':p5'=>$idEstado]);
        echo json_encode(($r['error'] ?? false) ? $r : ['ok'=>true,'id'=>$id]);
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
        echo json_encode(($r['error'] ?? false) ? $r : ['ok'=>true,'id'=>$id]);
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
        echo json_encode(($r['error'] ?? false) ? $r : ['ok'=>true,'id'=>$id]);
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
        echo json_encode(($r['error'] ?? false) ? $r : ['ok'=>true,'id'=>$id]);
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
        if ($r['error'] ?? false) { echo json_encode($r); break; }
        if ($idPersonaServicio)
            execProc($conn,"BEGIN $pkg.FIDE_PERSONAS_SERVICIOS_INSERTAR_SP(:p1,:p2,:p3); END;",[':p1'=>$id,':p2'=>$idPersonaServicio,':p3'=>$idEstado]);
        echo json_encode(['ok'=>true,'id'=>$id]);
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
        echo json_encode(($r['error'] ?? false) ? $r : ['ok'=>true,'id'=>$id]);
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
        echo json_encode(($r['error'] ?? false) ? $r : ['ok'=>true]);
        break;

    case 'actualizar_guardia':
        $id       = (int)($_POST['id']              ?? 0);
        $nombre   = $_POST['nombre']                ?? '';
        $pat      = $_POST['apellido_paterno']      ?? '';
        $mat      = $_POST['apellido_materno']      ?? '';
        $tel      = $_POST['telefono']              ?? '';
        $correo   = $_POST['correo']                ?? '';
        $idEstado = (int)($_POST['id_estado']       ?? 1);

        $cur = fetchAll($conn,
            "SELECT ID_ROL, TO_CHAR(FECHA_REGISTRO,'YYYY-MM-DD') AS FR FROM FIDE_PERSONAS_TB WHERE ID_PERSONA=:pid",
            [':pid'=>$id]);
        if (empty($cur)) { echo json_encode(['error'=>true,'mensaje'=>'Persona no encontrada.']); break; }

        $r = execProc($conn,
            "BEGIN $pkg.FIDE_PERSONAS_ACTUALIZAR_SP(:p1,:p2,:p3,:p4,TO_DATE(:p5,'YYYY-MM-DD'),:p6,:p7); END;",
            [':p1'=>$id,':p2'=>$nombre,':p3'=>$pat,':p4'=>$mat,
             ':p5'=>$cur[0]['FR'],':p6'=>$cur[0]['ID_ROL'],':p7'=>$idEstado]
        );
        if ($r['error'] ?? false) { echo json_encode($r); break; }

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
        echo json_encode(['ok'=>true]);
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
        if (empty($cur)) { echo json_encode(['error'=>true,'mensaje'=>'Persona no encontrada.']); break; }

        $r = execProc($conn,
            "BEGIN $pkg.FIDE_PERSONAS_ACTUALIZAR_SP(:p1,:p2,:p3,:p4,TO_DATE(:p5,'YYYY-MM-DD'),:p6,:p7); END;",
            [':p1'=>$id,':p2'=>$nombre,':p3'=>$pat,':p4'=>$mat,
             ':p5'=>$cur[0]['FR'],':p6'=>$cur[0]['ID_ROL'],':p7'=>$idEstado]
        );
        if ($r['error'] ?? false) { echo json_encode($r); break; }

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

        echo json_encode(['ok'=>true]);
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
        echo json_encode($r);
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
        echo json_encode(execProc($conn, $sql, $binds));
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
        echo json_encode($r);
        break;

    case 'eliminar_guardia':
    case 'eliminar_residente':
    case 'eliminar_persona':
        $id = (int)($_REQUEST['id'] ?? 0);
        echo json_encode(execProc($conn,"BEGIN $pkg.FIDE_PERSONAS_ELIMINAR_SP(:p1); END;",[':p1'=>$id]));
        break;

    case 'eliminar_residencia':
        $id = (int)($_REQUEST['id'] ?? 0);
        echo json_encode(execProc($conn,"BEGIN $pkg.FIDE_RESIDENCIAS_ELIMINAR_SP(:p1); END;",[':p1'=>$id]));
        break;

    case 'eliminar_visita':
        $id = (int)($_REQUEST['id'] ?? 0);
        echo json_encode(execProc($conn,"BEGIN $pkg.FIDE_VISITAS_ELIMINAR_SP(:p1); END;",[':p1'=>$id]));
        break;

    case 'eliminar_paquete':
        $id = (int)($_REQUEST['id'] ?? 0);
        echo json_encode(execProc($conn,"BEGIN $pkg.FIDE_PAQUETES_ELIMINAR_SP(:p1); END;",[':p1'=>$id]));
        break;

    case 'eliminar_factura':
        $id = (int)($_REQUEST['id'] ?? 0);
        echo json_encode(execProc($conn,"BEGIN $pkg.FIDE_FACTURAS_ELIMINAR_SP(:p1); END;",[':p1'=>$id]));
        break;

    case 'eliminar_servicio':
        $id = (int)($_REQUEST['id'] ?? 0);
        echo json_encode(execProc($conn,"BEGIN $pkg.FIDE_SERVICIOS_ELIMINAR_SP(:p1); END;",[':p1'=>$id]));
        break;

    case 'eliminar_evento':
        $id = (int)($_REQUEST['id'] ?? 0);
        echo json_encode(execProc($conn,"BEGIN $pkg.FIDE_EVENTOS_ELIMINAR_SP(:p1); END;",[':p1'=>$id]));
        break;

    case 'eliminar_vehiculo':
        $placa = strtoupper(trim($_REQUEST['placa'] ?? ''));
        echo json_encode(execProc($conn,"BEGIN $pkg.FIDE_VEHICULOS_ELIMINAR_SP(:p1); END;",[':p1'=>$placa]));
        break;

    default:
        http_response_code(400);
        echo json_encode(['error'=>true,'mensaje'=>"Acción '$accion' no reconocida."]);
        break;
}

oci_close($conn);