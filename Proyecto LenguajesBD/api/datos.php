<?php

set_time_limit(120);
ini_set('display_errors', 0);
error_reporting(0);

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/bd.php';

$accion = $_REQUEST['accion'] ?? '';
$conn   = getConnection();

function currVal(string $seq, $conn): int
{
    $rows = fetchAll($conn, "SELECT $seq.CURRVAL AS ID FROM DUAL");
    return (int)($rows[0]['ID'] ?? 0);
}

function execProc($conn, string $sql, array $binds): array
{
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

function fetchAll($conn, string $sql, array $binds = []): array
{
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

function jsonOut($data): void
{
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
}

function execUpdate($conn, string $sql, array $binds): array
{
    $stmt = oci_parse($conn, $sql);
    if (!$stmt) {
        $e = oci_error($conn);
        return ['error' => true, 'mensaje' => $e['message']];
    }
    foreach ($binds as $k => &$v) oci_bind_by_name($stmt, $k, $v);
    unset($v);
    $ok = oci_execute($stmt, OCI_COMMIT_ON_SUCCESS);
    $result = $ok ? ['ok' => true] : ['error' => true, 'mensaje' => oci_error($stmt)['message']];
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

        $rows = fetchAll(
            $conn,
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
        $rows = fetchAll(
            $conn,
            "SELECT p.ID_PERSONA, p.NOMBRE, p.APELLIDO_PATERNO, p.APELLIDO_MATERNO,
                    p.USUARIO,
                    (SELECT TELEFONO FROM FIDE_TELEFONOS_PERSONA_V WHERE ID_PERSONA = p.ID_PERSONA AND ROWNUM=1) AS TELEFONO,
                    (SELECT CORREO   FROM FIDE_CORREOS_PERSONA_V   WHERE ID_PERSONA = p.ID_PERSONA AND ROWNUM=1) AS CORREO,
                    e.ID_ESTADO, e.NOMBRE_ESTADO,
                    $pkg.FIDE_TOTAL_TURNOS_GUARDIA_FN(p.ID_PERSONA)    AS TOTAL_TURNOS,
                    $pkg.FIDE_TOTAL_REPORTES_PERSONA_FN(p.ID_PERSONA)  AS TOTAL_REPORTES
             FROM   FIDE_LISTAR_GUARDIAS_V p
             LEFT JOIN FIDE_ESTADOS_TB e ON e.ID_ESTADO = p.ID_ESTADO"
        );
        jsonOut($rows);
        break;

    case 'listar_residentes':
        $rows = fetchAll(
            $conn,
            "SELECT p.ID_PERSONA, p.NOMBRE, p.APELLIDO_PATERNO, p.APELLIDO_MATERNO,
                    (SELECT TELEFONO FROM FIDE_TELEFONOS_PERSONA_V WHERE ID_PERSONA = p.ID_PERSONA AND ROWNUM=1) AS TELEFONO,
                    (SELECT CORREO   FROM FIDE_CORREOS_PERSONA_V   WHERE ID_PERSONA = p.ID_PERSONA AND ROWNUM=1) AS CORREO,
                    p.ID_RESIDENCIA, p.ID_ESTADO, p.NOMBRE_ESTADO,
                    $pkg.FIDE_TOTAL_FACTURAS_PERSONA_FN(p.ID_PERSONA)     AS TOTAL_FACTURAS,
                    $pkg.FIDE_MONTO_FACTURADO_PERSONA_FN(p.ID_PERSONA)    AS FACTURAS_ACTIVAS,
                    $pkg.FIDE_TOTAL_VEHICULOS_PERSONA_FN(p.ID_PERSONA)    AS TOTAL_VEHICULOS,
                    $pkg.FIDE_TOTAL_VISITAS_RESIDENCIA_FN(p.ID_RESIDENCIA) AS TOTAL_VISITAS
             FROM   FIDE_LISTAR_RESIDENTES_V p"
        );
        jsonOut($rows);
        break;

    case 'listar_personas':
        $rows = fetchAll(
            $conn,
            "SELECT ID_PERSONA,
                    NOMBRE || ' ' || APELLIDO_PATERNO || ' ' || APELLIDO_MATERNO AS NOMBRE_COMPLETO
             FROM   FIDE_PERSONAS_DETALLE_V
             ORDER  BY NOMBRE, APELLIDO_PATERNO"
        );
        jsonOut($rows);
        break;

    case 'listar_trabajadores':
        $rows = fetchAll(
            $conn,
            "SELECT ID_PERSONA, NOMBRE_COMPLETO
             FROM   FIDE_LISTAR_TRABAJADORES_V"
        );
        jsonOut($rows);
        break;

    case 'listar_residencias':
        $rows = fetchAll(
            $conn,
            "SELECT ID_RESIDENCIA, MONTO_ALQUILER, MONTO_MANTENIMIENTO,
                    TIPO_PAGO, ID_TIPO_PAGO, ID_ESTADO, NOMBRE_ESTADO,
                    $pkg.FIDE_TOTAL_RESIDENTES_RESIDENCIA_FN(ID_RESIDENCIA) AS TOTAL_RESIDENTES,
                    $pkg.FIDE_TOTAL_PAQUETES_RESIDENCIA_FN(ID_RESIDENCIA)   AS TOTAL_PAQUETES
             FROM   FIDE_LISTAR_RESIDENCIAS_VM
             ORDER  BY ID_RESIDENCIA"
        );
        jsonOut($rows);
        break;

    case 'listar_visitas':
        $rows = fetchAll(
            $conn,
            "SELECT ID_VISITA, VISITANTE, ID_PERSONA, ROL_ID, ROL,
                    ID_RESIDENCIA, FECHA_INGRESO, FECHA_SALIDA,
                    ID_ESTADO, NOMBRE_ESTADO
             FROM   FIDE_LISTAR_VISITAS_V"
        );
        jsonOut($rows);
        break;

    case 'listar_paquetes':
        $rows = fetchAll(
            $conn,
            "SELECT ID_PAQUETE, PERSONA, ID_PERSONA, ID_RESIDENCIA,
                    FECHA_INGRESO, FECHA_SALIDA, ID_ESTADO, NOMBRE_ESTADO
             FROM   FIDE_LISTAR_PAQUETES_V"
        );
        jsonOut($rows);
        break;

    case 'listar_facturas':
        $rows = fetchAll(
            $conn,
            "SELECT ID_FACTURA, FECHA_FACTURA, DESCR_FACTURA,
                    PERSONA, TIPO_PAGO, FORMA_PAGO, NOMBRE_ESTADO
             FROM   FIDE_LISTAR_FACTURAS_V"
        );
        jsonOut($rows);
        break;

    case 'listar_servicios':
        $rows = fetchAll(
            $conn,
            "SELECT ID_SERVICIO, DESCR_SERVICIO, FECHA_SALIDA,
                    ID_TIPO_SERVICIO, TIPO_SERVICIO, ID_TIPO_EVENTO,
                    ID_ESTADO, NOMBRE_ESTADO, PERSONAS
             FROM   FIDE_LISTAR_SERVICIOS_V"
        );
        jsonOut($rows);
        break;

    case 'listar_eventos':
        $rows = fetchAll(
            $conn,
            "SELECT ID_EVENTO, DESCR_EVENTO, FECHA_EVENTO,
                    ID_TIPO_EVENTO, TIPO_EVENTO, ID_TIPO_ESPACIO,
                    ID_ESTADO, NOMBRE_ESTADO
             FROM   FIDE_LISTAR_EVENTOS_V"
        );
        jsonOut($rows);
        break;

    case 'listar_vehiculos':
        $rows = fetchAll(
            $conn,
            "SELECT PLACA, DESCRIPCION, RESIDENTE,
                    ID_PERSONA, ID_TIPO_ESPACIO, ID_ESTADO, NOMBRE_ESTADO
             FROM   FIDE_LISTAR_VEHICULOS_V"
        );
        jsonOut($rows);
        break;

    case 'listar_vehiculos_residentes':
        $rows = fetchAll(
            $conn,
            "SELECT v.PLACA, v.DESCRIPCION, v.RESIDENTE,
                    v.ID_PERSONA, v.ID_TIPO_ESPACIO, v.ID_ESTADO, v.NOMBRE_ESTADO
             FROM   FIDE_LISTAR_VEHICULOS_V v
             JOIN   FIDE_PERSONAS_DETALLE_V p ON p.ID_PERSONA = v.ID_PERSONA
             JOIN   FIDE_LISTAR_ROLES_V    r ON r.ID_ROL     = p.ID_ROL
             WHERE  UPPER(r.ROL) LIKE '%RESID%'"
        );
        jsonOut($rows);
        break;

    case 'listar_vehiculos_visitas':
        $rows = fetchAll(
            $conn,
            "SELECT v.PLACA, v.DESCRIPCION,
                    p.NOMBRE || ' ' || p.APELLIDO_PATERNO AS VISITANTE,
                    v.ID_PERSONA, v.ID_TIPO_ESPACIO, v.ID_ESTADO, v.NOMBRE_ESTADO
             FROM   FIDE_LISTAR_VEHICULOS_V v
             JOIN   FIDE_PERSONAS_DETALLE_V p ON p.ID_PERSONA = v.ID_PERSONA
             JOIN   FIDE_LISTAR_ROLES_V    r ON r.ID_ROL     = p.ID_ROL
             WHERE  UPPER(r.ROL) LIKE '%VISIT%'"
        );
        jsonOut($rows);
        break;

    case 'listar_espacios':
        $rows = fetchAll(
            $conn,
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
        $r  = execProc(
            $conn,
            "BEGIN $pkg.FIDE_TIPOS_ESPACIOS_INSERTAR_SP(:p1,:p2,:p3); END;",
            [':p1' => $nombre, ':p2' => $descr, ':p3' => $idEstado]
        );
        $id = currVal('FIDE_TIPOS_ESPACIOS_SEQ', $conn);
        jsonOut(($r['error'] ?? false) ? $r : ['ok' => true, 'id' => $id]);
        break;

    case 'actualizar_espacio':
        $id       = (int)($_POST['id']           ?? 0);
        $nombre   = $_POST['nombre_espacio']      ?? '';
        $descr    = $_POST['descr_espacio']       ?? '';
        $idEstado = (int)($_POST['id_estado']     ?? 1);
        $r = execProc(
            $conn,
            "BEGIN $pkg.FIDE_TIPOS_ESPACIOS_ACTUALIZAR_SP(:p1,:p2,:p3,:p4); END;",
            [':p1' => $id, ':p2' => $nombre, ':p3' => $descr, ':p4' => $idEstado]
        );
        jsonOut($r);
        break;

    case 'eliminar_espacio':
        $id = (int)($_REQUEST['id'] ?? 0);
        $r  = execProc($conn, "BEGIN $pkg.FIDE_TIPOS_ESPACIOS_ELIMINAR_SP(:p1); END;", [':p1' => $id]);
        jsonOut($r);
        break;

    case 'actualizar_estado_visita':
        $id  = (int)($_POST['id']     ?? 0);
        $est = (int)($_POST['estado'] ?? 0);

        if (!in_array($est, [4, 5, 6])) {
            jsonOut(['error' => true, 'mensaje' => 'Estado no permitido para visita.']);
            break;
        }

        $cur = fetchAll(
            $conn,
            "SELECT ID_PERSONA, FECHA_INGRESO, FECHA_SALIDA, ID_RESIDENCIA, ROL_ID
         FROM FIDE_LISTAR_VISITAS_V WHERE ID_VISITA = :id",
            [':id' => $id]
        );

        if (empty($cur)) {
            jsonOut(['error' => true, 'mensaje' => 'Visita no encontrada.']);
            break;
        }

        $fechaSalida = match ($est) {
            4       => null,
            5       => date('d/m/Y H:i'), // ← formato DD/MM/YYYY HH24:MI
            default => $cur[0]['FECHA_SALIDA']
        };

        $sqlFecha = $fechaSalida
            ? "TO_DATE(:p4,'DD/MM/YYYY HH24:MI')"
            : "NULL";

        $sql = "BEGIN $pkg.FIDE_VISITAS_ACTUALIZAR_SP(
                :p1, :p2,
                TO_DATE(:p3,'DD/MM/YYYY HH24:MI'),
                $sqlFecha,
                :p5, :p6, :p7
            ); END;";

        $binds = [
            ':p1' => $id,
            ':p2' => $cur[0]['ID_PERSONA'],
            ':p3' => $cur[0]['FECHA_INGRESO'],
            ':p5' => $cur[0]['ID_RESIDENCIA'],
            ':p6' => $cur[0]['ROL_ID'],
            ':p7' => $est,
        ];

        if ($fechaSalida) {
            $binds[':p4'] = $fechaSalida;
        }

        $r = execProc($conn, $sql, $binds);
        jsonOut($r);
        break;

    case 'actualizar_estado_vehiculo':
        $placa = strtoupper(trim($_REQUEST['placa'] ?? ''));
        $est   = (int)($_REQUEST['estado'] ?? 0);
        if (!in_array($est, [4, 5, 6])) {
            jsonOut(['error' => true, 'mensaje' => 'Estado no permitido para vehículo.']);
            break;
        }

        $cur = fetchAll(
            $conn,
            "SELECT DESCRIPCION, ID_TIPO_ESPACIO, ID_PERSONA
         FROM FIDE_LISTAR_VEHICULOS_V WHERE PLACA = :placa",
            [':placa' => $placa]
        );
        if (empty($cur)) {
            jsonOut(['error' => true, 'mensaje' => 'Vehículo no encontrado.']);
            break;
        }
        jsonOut(execProc(
            $conn,
            "BEGIN $pkg.FIDE_VEHICULOS_ACTUALIZAR_SP(:p1,:p2,:p3,:p4,:p5); END;",
            [':p1' => $placa, ':p2' => $cur[0]['DESCRIPCION'], ':p3' => $cur[0]['ID_TIPO_ESPACIO'], ':p4' => $cur[0]['ID_PERSONA'], ':p5' => $est]
        ));
        break;

    case 'actualizar_estado_evento':
        $id  = (int)($_POST['id']     ?? 0);
        $est = (int)($_POST['estado'] ?? 0);

        if (!in_array($est, [12, 13, 14, 17])) {
            jsonOut(['error' => true, 'mensaje' => 'Estado no permitido para evento.']);
            break;
        }

        $cur = fetchAll(
            $conn,
            "SELECT ID_EVENTO, DESCR_EVENTO, FECHA_EVENTO, ID_TIPO_EVENTO, ID_TIPO_ESPACIO
         FROM FIDE_LISTAR_EVENTOS_V WHERE ID_EVENTO = :id",
            [':id' => $id]
        );

        if (empty($cur)) {
            jsonOut(['error' => true, 'mensaje' => 'Evento no encontrado.']);
            break;
        }

        $r = execProc(
            $conn,
            "BEGIN $pkg.FIDE_EVENTOS_ACTUALIZAR_SP(
            :p1, :p2,
            TO_DATE(:p3,'DD/MM/YYYY HH24:MI'),
            :p4, :p5, :p6
        ); END;",
            [
                ':p1' => $cur[0]['ID_EVENTO'],
                ':p2' => $cur[0]['DESCR_EVENTO'],
                ':p3' => $cur[0]['FECHA_EVENTO'],
                ':p4' => $cur[0]['ID_TIPO_EVENTO'],
                ':p5' => $cur[0]['ID_TIPO_ESPACIO'],
                ':p6' => $est,
            ]
        );
        jsonOut($r);
        break;

    case 'marcar_paquete_entregado':
        $id = (int)($_POST['id'] ?? 0);

        $cur = fetchAll(
            $conn,
            "SELECT ID_PERSONA, ID_RESIDENCIA, FECHA_INGRESO
         FROM FIDE_LISTAR_PAQUETES_V WHERE ID_PAQUETE = :id",
            [':id' => $id]
        );

        if (empty($cur)) {
            jsonOut(['error' => true, 'mensaje' => 'Paquete no encontrado.']);
            break;
        }

        $r = execProc(
            $conn,
            "BEGIN $pkg.FIDE_PAQUETES_ACTUALIZAR_SP(
            :p1, :p2, :p3,
            TO_DATE(:p4,'DD/MM/YYYY HH24:MI'),
            TO_DATE(:p5,'DD/MM/YYYY HH24:MI'),
            :p6
        ); END;",
            [
                ':p1' => $id,
                ':p2' => $cur[0]['ID_PERSONA'],
                ':p3' => $cur[0]['ID_RESIDENCIA'],
                ':p4' => $cur[0]['FECHA_INGRESO'],
                ':p5' => date('d/m/Y H:i'), // ← formato DD/MM/YYYY HH24:MI
                ':p6' => 16,
            ]
        );
        jsonOut($r);
        break;

    case 'listar_turnos':
        $idPersona = (int)($_REQUEST['id_persona'] ?? 0);
        if ($idPersona)
            $rows = fetchAll(
                $conn,
                "SELECT GUARDIA, FECHA_TURNO AS FECHA, HORARIO, NOMBRE_ESTADO
                 FROM   FIDE_LISTAR_TURNOS_V
                 WHERE  ID_GUARDIA = :pid",
                [':pid' => $idPersona]
            );
        else
            $rows = fetchAll(
                $conn,
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
        $rows = fetchAll(
            $conn,
            "SELECT DESCR_EVENTO, TIPO_EVENTO, FECHA_EVENTO, NOMBRE_ESTADO
             FROM   FIDE_ULTIMOS_EVENTOS_V"
        );
        jsonOut($rows);
        break;

    case 'ultimas_visitas':
        $rows = fetchAll(
            $conn,
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
            jsonOut(['error' => true, 'mensaje' => 'El usuario y la contraseña son requeridos.']);
            break;
        }

        $existe = fetchAll($conn, "SELECT 1 FROM FIDE_USUARIOS_PERSONAS_V WHERE USUARIO = :u", [':u' => $usuario]);
        if (!empty($existe)) {
            jsonOut(['error' => true, 'mensaje' => "El usuario '$usuario' ya está en uso."]);
            break;
        }

        $rolRow = fetchAll($conn, "SELECT ID_ROL FROM FIDE_LISTAR_ROLES_V WHERE UPPER(ROL) LIKE '%GUARD%' AND ROWNUM=1");
        if (empty($rolRow)) {
            jsonOut(['error' => true, 'mensaje' => 'No existe rol guardia.']);
            break;
        }
        $idRol = (int)$rolRow[0]['ID_ROL'];
        $hoy   = date('Y-m-d');

        $r1 = execProc(
            $conn,
            "BEGIN $pkg.FIDE_PERSONAS_INSERTAR_SP(:p1,:p2,:p3,TO_DATE(:p4,'YYYY-MM-DD'),:p5,:p6); END;",
            [':p1' => $nombre, ':p2' => $pat, ':p3' => $mat, ':p4' => $hoy, ':p5' => $idRol, ':p6' => $idEstado]
        );
        if ($r1['error'] ?? false) {
            jsonOut($r1);
            break;
        }

        $idPersona = currVal('FIDE_PERSONAS_SEQ', $conn);

        execUpdate(
            $conn,
            "UPDATE FIDE_PERSONAS_TB SET USUARIO = :u, CONTRASENA = :c WHERE ID_PERSONA = :id",
            [':u' => $usuario, ':c' => $contrasena, ':id' => $idPersona]
        );

        if ($tel)    execProc($conn, "BEGIN $pkg.FIDE_TELEFONOS_INSERTAR_SP(:p1,:p2,:p3); END;", [':p1' => $idPersona, ':p2' => $tel, ':p3' => 1]);
        if ($correo) execProc($conn, "BEGIN $pkg.FIDE_CORREOS_INSERTAR_SP(:p1,:p2,:p3); END;",   [':p1' => $idPersona, ':p2' => $correo, ':p3' => 1]);

        jsonOut(['ok' => true, 'id' => $idPersona]);
        break;

    case 'insertar_residente':
        $nombre       = $_POST['nombre']           ?? '';
        $pat          = $_POST['apellido_paterno'] ?? '';
        $mat          = $_POST['apellido_materno'] ?? '';
        $tel          = $_POST['telefono']         ?? '';
        $correo       = $_POST['correo']           ?? '';
        $idResidencia = (int)($_POST['id_residencia'] ?? 0);
        $idEstado     = (int)($_POST['id_estado']     ?? 1);

        $rolRow = fetchAll($conn, "SELECT ID_ROL FROM FIDE_LISTAR_ROLES_V WHERE UPPER(ROL) LIKE '%RESID%' AND ROWNUM=1");
        if (empty($rolRow)) {
            jsonOut(['error' => true, 'mensaje' => 'No existe rol residente.']);
            break;
        }
        $idRol = (int)$rolRow[0]['ID_ROL'];
        $hoy   = date('Y-m-d');

        $r1 = execProc(
            $conn,
            "BEGIN $pkg.FIDE_PERSONAS_INSERTAR_SP(:p1,:p2,:p3,TO_DATE(:p4,'YYYY-MM-DD'),:p5,:p6); END;",
            [':p1' => $nombre, ':p2' => $pat, ':p3' => $mat, ':p4' => $hoy, ':p5' => $idRol, ':p6' => $idEstado]
        );
        if ($r1['error'] ?? false) {
            jsonOut($r1);
            break;
        }

        $idPersona = currVal('FIDE_PERSONAS_SEQ', $conn);

        if ($tel)          execProc($conn, "BEGIN $pkg.FIDE_TELEFONOS_INSERTAR_SP(:p1,:p2,:p3); END;", [':p1' => $idPersona, ':p2' => $tel, ':p3' => 1]);
        if ($correo)       execProc($conn, "BEGIN $pkg.FIDE_CORREOS_INSERTAR_SP(:p1,:p2,:p3); END;",   [':p1' => $idPersona, ':p2' => $correo, ':p3' => 1]);
        if ($idResidencia) execProc($conn, "BEGIN $pkg.FIDE_RESIDENTES_INSERTAR_SP(:p1,:p2,:p3); END;", [':p1' => $idPersona, ':p2' => $idResidencia, ':p3' => $idEstado]);

        jsonOut(['ok' => true, 'id' => $idPersona]);
        break;

    case 'insertar_residencia':
        $montoAlq  = (float)($_POST['monto_alquiler']      ?? 0);
        $montoMant = (float)($_POST['monto_mantenimiento'] ?? 0);
        $idTipoPago = (int)  ($_POST['id_tipo_pago']        ?? 1);
        $idEstado  = (int)  ($_POST['id_estado']           ?? 1);
        $r  = execProc(
            $conn,
            "BEGIN $pkg.FIDE_RESIDENCIAS_INSERTAR_SP(:p1,:p2,:p3,:p4); END;",
            [':p1' => $montoAlq, ':p2' => $montoMant, ':p3' => $idTipoPago, ':p4' => $idEstado]
        );
        $id = currVal('FIDE_RESIDENCIAS_SEQ', $conn);
        jsonOut(($r['error'] ?? false) ? $r : ['ok' => true, 'id' => $id]);
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
            $nombreV = trim($_POST['nombre_visitante'] ?? 'Visitante');
            $partes  = explode(' ', $nombreV, 2);
            $rolV    = fetchAll($conn, "SELECT ID_ROL FROM FIDE_LISTAR_ROLES_V WHERE UPPER(ROL) LIKE '%VISIT%' AND ROWNUM=1");
            $rolVId  = $rolV[0]['ID_ROL'] ?? $idRol;
            execProc(
                $conn,
                "BEGIN $pkg.FIDE_PERSONAS_INSERTAR_SP(:p1,:p2,:p3,TO_DATE(:p4,'YYYY-MM-DD'),:p5,:p6); END;",
                [
                    ':p1' => ($partes[0] ?? $nombreV),
                    ':p2' => ($partes[1] ?? ''),
                    ':p3' => '',
                    ':p4' => date('Y-m-d'),
                    ':p5' => $rolVId,
                    ':p6' => $idEstado
                ]
            );
            $idPersona = currVal('FIDE_PERSONAS_SEQ', $conn);
        }
        if ($fechaSalida) {
            $sql   = "BEGIN $pkg.FIDE_VISITAS_INSERTAR_SP(:p1,TO_DATE(:p2,'YYYY-MM-DD HH24:MI'),TO_DATE(:p3,'YYYY-MM-DD HH24:MI'),:p4,:p5,:p6); END;";
            $binds = [':p1' => $idPersona, ':p2' => $fechaIngreso, ':p3' => $fechaSalida, ':p4' => $idResidencia, ':p5' => $idRol, ':p6' => $idEstado];
        } else {
            $sql   = "BEGIN $pkg.FIDE_VISITAS_INSERTAR_SP(:p1,TO_DATE(:p2,'YYYY-MM-DD HH24:MI'),NULL,:p3,:p4,:p5); END;";
            $binds = [':p1' => $idPersona, ':p2' => $fechaIngreso, ':p3' => $idResidencia, ':p4' => $idRol, ':p5' => $idEstado];
        }
        $r  = execProc($conn, $sql, $binds);
        $id = currVal('FIDE_VISITAS_SEQ', $conn);
        jsonOut(($r['error'] ?? false) ? $r : ['ok' => true, 'id' => $id]);
        break;

    case 'insertar_paquete':
        $idPersona    = (int)($_POST['id_persona']    ?? 0);
        $idResidencia = (int)($_POST['id_residencia'] ?? 0);
        $fechaIngreso = $_POST['fecha_ingreso'] ?? date('Y-m-d');
        $fechaSalida  = $_POST['fecha_salida']  ?? '';
        $idEstado     = (int)($_POST['id_estado'] ?? 3);
        if (!$fechaIngreso) $fechaIngreso = date('Y-m-d');
        if ($fechaSalida) {
            $sql   = "BEGIN $pkg.FIDE_PAQUETES_INSERTAR_SP(:p1,:p2,TO_DATE(:p3,'YYYY-MM-DD'),TO_DATE(:p4,'YYYY-MM-DD'),:p5); END;";
            $binds = [':p1' => $idPersona, ':p2' => $idResidencia, ':p3' => $fechaIngreso, ':p4' => $fechaSalida, ':p5' => $idEstado];
        } else {
            $sql   = "BEGIN $pkg.FIDE_PAQUETES_INSERTAR_SP(:p1,:p2,TO_DATE(:p3,'YYYY-MM-DD'),NULL,:p4); END;";
            $binds = [':p1' => $idPersona, ':p2' => $idResidencia, ':p3' => $fechaIngreso, ':p4' => $idEstado];
        }
        $r  = execProc($conn, $sql, $binds);
        $id = currVal('FIDE_PAQUETES_SEQ', $conn);
        jsonOut(($r['error'] ?? false) ? $r : ['ok' => true, 'id' => $id]);
        break;

    case 'insertar_factura':
        $fechaFactura = $_POST['fecha_factura'] ?? date('Y-m-d');
        $descr        = $_POST['descr_factura'] ?? '';
        $idTipoPago   = (int)($_POST['id_tipo_pago']  ?? 1);
        $idFormaPago  = (int)($_POST['id_forma_pago'] ?? 1);
        $idPersona    = (int)($_POST['id_persona']    ?? 0);
        $idEstado     = (int)($_POST['id_estado']     ?? 1);
        if (!$fechaFactura) $fechaFactura = date('Y-m-d');
        $r  = execProc(
            $conn,
            "BEGIN $pkg.FIDE_FACTURAS_INSERTAR_SP(TO_DATE(:p1,'YYYY-MM-DD'),:p2,:p3,:p4,:p5,:p6); END;",
            [':p1' => $fechaFactura, ':p2' => $descr, ':p3' => $idTipoPago, ':p4' => $idFormaPago, ':p5' => $idPersona, ':p6' => $idEstado]
        );
        $id = currVal('FIDE_FACTURAS_SEQ', $conn);
        jsonOut(($r['error'] ?? false) ? $r : ['ok' => true, 'id' => $id]);
        break;

    case 'insertar_servicio':
        $descr             = $_POST['descr_servicio']        ?? '';
        $fechaSalida       = $_POST['fecha_salida']          ?? '';
        $idTipoServicio    = (int)($_POST['id_tipo_servicio']    ?? 1);
        $idTipoEvento      = (int)($_POST['id_tipo_evento']      ?? 1);
        $idEstado          = (int)($_POST['id_estado']           ?? 1);
        $idPersonaServicio = (int)($_POST['id_persona_servicio'] ?? 0);
        if ($fechaSalida) {
            $sql   = "BEGIN $pkg.FIDE_SERVICIOS_INSERTAR_SP(:p1,TO_DATE(:p2,'YYYY-MM-DD'),:p3,:p4,:p5); END;";
            $binds = [':p1' => $descr, ':p2' => $fechaSalida, ':p3' => $idTipoServicio, ':p4' => $idTipoEvento, ':p5' => $idEstado];
        } else {
            $sql   = "BEGIN $pkg.FIDE_SERVICIOS_INSERTAR_SP(:p1,NULL,:p2,:p3,:p4); END;";
            $binds = [':p1' => $descr, ':p2' => $idTipoServicio, ':p3' => $idTipoEvento, ':p4' => $idEstado];
        }
        $r = execProc($conn, $sql, $binds);
        if ($r['error'] ?? false) {
            jsonOut($r);
            break;
        }
        $id = currVal('FIDE_SERVICIOS_SEQ', $conn);
        if ($idPersonaServicio)
            execProc($conn, "BEGIN $pkg.FIDE_PERSONAS_SERVICIOS_INSERTAR_SP(:p1,:p2,:p3); END;", [':p1' => $id, ':p2' => $idPersonaServicio, ':p3' => $idEstado]);
        jsonOut(['ok' => true, 'id' => $id]);
        break;

    case 'insertar_evento':
        $descr         = $_POST['descr_evento']   ?? '';
        $fechaEvento   = $_POST['fecha_evento']   ?? date('Y-m-d');
        $idTipoEvento  = (int)($_POST['id_tipo_evento']  ?? 1);
        $idTipoEspacio = (int)($_POST['id_tipo_espacio'] ?? 1);
        $idEstado      = (int)($_POST['id_estado']       ?? 1);
        if (!$fechaEvento) $fechaEvento = date('Y-m-d');
        $r  = execProc(
            $conn,
            "BEGIN $pkg.FIDE_EVENTOS_INSERTAR_SP(:p1,TO_DATE(:p2,'YYYY-MM-DD'),:p3,:p4,:p5); END;",
            [':p1' => $descr, ':p2' => $fechaEvento, ':p3' => $idTipoEvento, ':p4' => $idTipoEspacio, ':p5' => $idEstado]
        );
        $id = currVal('FIDE_EVENTOS_SEQ', $conn);
        jsonOut(($r['error'] ?? false) ? $r : ['ok' => true, 'id' => $id]);
        break;

    case 'insertar_vehiculo':
        $placa         = strtoupper(trim($_POST['placa']          ?? ''));
        $descripcion   = $_POST['descripcion']      ?? '';
        $idTipoEspacio = (int)($_POST['id_tipo_espacio'] ?? 1);
        $idPersona     = (int)($_POST['id_persona']      ?? 0);
        $idEstado      = (int)($_POST['id_estado']       ?? 1);
        $r = execProc(
            $conn,
            "BEGIN $pkg.FIDE_VEHICULOS_INSERTAR_SP(:p1,:p2,:p3,:p4,:p5); END;",
            [':p1' => $placa, ':p2' => $descripcion, ':p3' => $idTipoEspacio, ':p4' => $idPersona, ':p5' => $idEstado]
        );
        jsonOut(($r['error'] ?? false) ? $r : ['ok' => true]);
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
            jsonOut(['error' => true, 'mensaje' => 'El usuario no puede estar vacío.']);
            break;
        }

        $existe = fetchAll(
            $conn,
            "SELECT 1 FROM FIDE_USUARIOS_PERSONAS_V WHERE USUARIO = :u AND ID_PERSONA != :id",
            [':u' => $usuario, ':id' => $id]
        );
        if (!empty($existe)) {
            jsonOut(['error' => true, 'mensaje' => "El usuario '$usuario' ya está en uso por otra persona."]);
            break;
        }

        $cur = fetchAll(
            $conn,
            "SELECT ID_ROL, TO_CHAR(FECHA_REGISTRO,'YYYY-MM-DD') AS FR FROM FIDE_PERSONAS_DETALLE_V WHERE ID_PERSONA=:pid",
            [':pid' => $id]
        );
        if (empty($cur)) {
            jsonOut(['error' => true, 'mensaje' => 'Persona no encontrada.']);
            break;
        }

        $r = execProc(
            $conn,
            "BEGIN $pkg.FIDE_PERSONAS_ACTUALIZAR_SP(:p1,:p2,:p3,:p4,TO_DATE(:p5,'YYYY-MM-DD'),:p6,:p7); END;",
            [
                ':p1' => $id,
                ':p2' => $nombre,
                ':p3' => $pat,
                ':p4' => $mat,
                ':p5' => $cur[0]['FR'],
                ':p6' => $cur[0]['ID_ROL'],
                ':p7' => $idEstado
            ]
        );
        if ($r['error'] ?? false) {
            jsonOut($r);
            break;
        }

        if ($contrasena) {
            execUpdate(
                $conn,
                "UPDATE FIDE_PERSONAS_TB SET USUARIO = :u, CONTRASENA = :c WHERE ID_PERSONA = :id",
                [':u' => $usuario, ':c' => $contrasena, ':id' => $id]
            );
        } else {
            execUpdate(
                $conn,
                "UPDATE FIDE_PERSONAS_TB SET USUARIO = :u WHERE ID_PERSONA = :id",
                [':u' => $usuario, ':id' => $id]
            );
        }

        if ($tel) {
            $tRow = fetchAll($conn, "SELECT ID_TELEFONO FROM FIDE_TELEFONOS_PERSONA_V WHERE ID_PERSONA=:pid AND ROWNUM=1", [':pid' => $id]);
            if ($tRow) execProc($conn, "BEGIN $pkg.FIDE_TELEFONOS_ACTUALIZAR_SP(:p1,:p2,:p3,:p4); END;", [':p1' => $tRow[0]['ID_TELEFONO'], ':p2' => $id, ':p3' => $tel, ':p4' => 1]);
            else execProc($conn, "BEGIN $pkg.FIDE_TELEFONOS_INSERTAR_SP(:p1,:p2,:p3); END;", [':p1' => $id, ':p2' => $tel, ':p3' => 1]);
        }
        if ($correo) {
            $cRow = fetchAll($conn, "SELECT ID_CORREO FROM FIDE_CORREOS_PERSONA_V WHERE ID_PERSONA=:pid AND ROWNUM=1", [':pid' => $id]);
            if ($cRow) execProc($conn, "BEGIN $pkg.FIDE_CORREOS_ACTUALIZAR_SP(:p1,:p2,:p3,:p4); END;", [':p1' => $cRow[0]['ID_CORREO'], ':p2' => $id, ':p3' => $correo, ':p4' => 1]);
            else execProc($conn, "BEGIN $pkg.FIDE_CORREOS_INSERTAR_SP(:p1,:p2,:p3); END;", [':p1' => $id, ':p2' => $correo, ':p3' => 1]);
        }
        jsonOut(['ok' => true]);
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

        $cur = fetchAll(
            $conn,
            "SELECT ID_ROL, TO_CHAR(FECHA_REGISTRO,'YYYY-MM-DD') AS FR FROM FIDE_PERSONAS_DETALLE_V WHERE ID_PERSONA=:pid",
            [':pid' => $id]
        );
        if (empty($cur)) {
            jsonOut(['error' => true, 'mensaje' => 'Persona no encontrada.']);
            break;
        }

        $r = execProc(
            $conn,
            "BEGIN $pkg.FIDE_PERSONAS_ACTUALIZAR_SP(:p1,:p2,:p3,:p4,TO_DATE(:p5,'YYYY-MM-DD'),:p6,:p7); END;",
            [
                ':p1' => $id,
                ':p2' => $nombre,
                ':p3' => $pat,
                ':p4' => $mat,
                ':p5' => $cur[0]['FR'],
                ':p6' => $cur[0]['ID_ROL'],
                ':p7' => $idEstado
            ]
        );
        if ($r['error'] ?? false) {
            jsonOut($r);
            break;
        }

        if ($tel) {
            $tRow = fetchAll($conn, "SELECT ID_TELEFONO FROM FIDE_TELEFONOS_PERSONA_V WHERE ID_PERSONA=:pid AND ROWNUM=1", [':pid' => $id]);
            if ($tRow) execProc($conn, "BEGIN $pkg.FIDE_TELEFONOS_ACTUALIZAR_SP(:p1,:p2,:p3,:p4); END;", [':p1' => $tRow[0]['ID_TELEFONO'], ':p2' => $id, ':p3' => $tel, ':p4' => 1]);
            else execProc($conn, "BEGIN $pkg.FIDE_TELEFONOS_INSERTAR_SP(:p1,:p2,:p3); END;", [':p1' => $id, ':p2' => $tel, ':p3' => 1]);
        }
        if ($correo) {
            $cRow = fetchAll($conn, "SELECT ID_CORREO FROM FIDE_CORREOS_PERSONA_V WHERE ID_PERSONA=:pid AND ROWNUM=1", [':pid' => $id]);
            if ($cRow) execProc($conn, "BEGIN $pkg.FIDE_CORREOS_ACTUALIZAR_SP(:p1,:p2,:p3,:p4); END;", [':p1' => $cRow[0]['ID_CORREO'], ':p2' => $id, ':p3' => $correo, ':p4' => 1]);
            else execProc($conn, "BEGIN $pkg.FIDE_CORREOS_INSERTAR_SP(:p1,:p2,:p3); END;", [':p1' => $id, ':p2' => $correo, ':p3' => 1]);
        }
        if ($idResidencia)
            execProc($conn, "BEGIN $pkg.FIDE_RESIDENTES_ACTUALIZAR_SP(:p1,:p2,:p3); END;", [':p1' => $id, ':p2' => $idResidencia, ':p3' => $idEstado]);

        jsonOut(['ok' => true]);
        break;

    case 'actualizar_residencia':
        $id         = (int)($_POST['id']                  ?? 0);
        $montoAlq   = (float)($_POST['monto_alquiler']    ?? 0);
        $montoMant  = (float)($_POST['monto_mantenimiento'] ?? 0);
        $idTipoPago = (int)($_POST['id_tipo_pago']        ?? 1);
        $idEstado   = (int)($_POST['id_estado']           ?? 1);
        $r = execProc(
            $conn,
            "BEGIN $pkg.FIDE_RESIDENCIAS_ACTUALIZAR_SP(:p1,:p2,:p3,:p4,:p5); END;",
            [':p1' => $id, ':p2' => $montoAlq, ':p3' => $montoMant, ':p4' => $idTipoPago, ':p5' => $idEstado]
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
            $binds = [':p1' => $id, ':p2' => $descr, ':p3' => $fechaSalida, ':p4' => $idTipoServicio, ':p5' => $idTipoEvento, ':p6' => $idEstado];
        } else {
            $sql   = "BEGIN $pkg.FIDE_SERVICIOS_ACTUALIZAR_SP(:p1,:p2,NULL,:p4,:p5,:p6); END;";
            $binds = [':p1' => $id, ':p2' => $descr, ':p4' => $idTipoServicio, ':p5' => $idTipoEvento, ':p6' => $idEstado];
        }
        jsonOut(execProc($conn, $sql, $binds));
        break;

    case 'actualizar_evento':
        $id            = (int)($_POST['id']               ?? 0);
        $descr         = $_POST['descr_evento']           ?? '';
        $fechaEvento   = $_POST['fecha_evento']           ?? date('d/m/Y H:i');
        $idTipoEvento  = (int)($_POST['id_tipo_evento']   ?? 1);
        $idTipoEspacio = (int)($_POST['id_tipo_espacio']  ?? 1);
        $idEstado      = (int)($_POST['id_estado']        ?? 1);
        $r = execProc(
            $conn,
            "BEGIN $pkg.FIDE_EVENTOS_ACTUALIZAR_SP(:p1,:p2,TO_DATE(:p3,'DD/MM/YYYY HH24:MI'),:p4,:p5,:p6); END;",
            [':p1' => $id, ':p2' => $descr, ':p3' => $fechaEvento, ':p4' => $idTipoEvento, ':p5' => $idTipoEspacio, ':p6' => $idEstado]
        );
        jsonOut($r);
        break;

    case 'eliminar_guardia':
    case 'eliminar_residente':
    case 'eliminar_persona':
        $id = (int)($_REQUEST['id'] ?? 0);
        jsonOut(execProc($conn, "BEGIN $pkg.FIDE_PERSONAS_ELIMINAR_SP(:p1); END;", [':p1' => $id]));
        break;

    case 'eliminar_residencia':
        $id = (int)($_REQUEST['id'] ?? 0);
        jsonOut(execProc($conn, "BEGIN $pkg.FIDE_RESIDENCIAS_ELIMINAR_SP(:p1); END;", [':p1' => $id]));
        break;

    case 'eliminar_visita':
        $id = (int)($_REQUEST['id'] ?? 0);
        jsonOut(execProc($conn, "BEGIN $pkg.FIDE_VISITAS_ELIMINAR_SP(:p1); END;", [':p1' => $id]));
        break;

    case 'eliminar_paquete':
        $id = (int)($_REQUEST['id'] ?? 0);
        jsonOut(execProc($conn, "BEGIN $pkg.FIDE_PAQUETES_ELIMINAR_SP(:p1); END;", [':p1' => $id]));
        break;

    case 'eliminar_factura':
        $id = (int)($_REQUEST['id'] ?? 0);
        jsonOut(execProc($conn, "BEGIN $pkg.FIDE_FACTURAS_ELIMINAR_SP(:p1); END;", [':p1' => $id]));
        break;

    case 'eliminar_servicio':
        $id = (int)($_REQUEST['id'] ?? 0);
        jsonOut(execProc($conn, "BEGIN $pkg.FIDE_SERVICIOS_ELIMINAR_SP(:p1); END;", [':p1' => $id]));
        break;

    case 'eliminar_evento':
        $id = (int)($_REQUEST['id'] ?? 0);
        jsonOut(execProc($conn, "BEGIN $pkg.FIDE_EVENTOS_ELIMINAR_SP(:p1); END;", [':p1' => $id]));
        break;

    case 'eliminar_vehiculo':
        $placa = strtoupper(trim($_REQUEST['placa'] ?? ''));
        jsonOut(execProc($conn, "BEGIN $pkg.FIDE_VEHICULOS_ELIMINAR_SP(:p1); END;", [':p1' => $placa]));
        break;

    case 'stats_persona':
        $id = (int)($_REQUEST['id_persona'] ?? 0);
        if (!$id) {
            jsonOut(['error' => true, 'mensaje' => 'id_persona requerido']);
            break;
        }
        $callFn = function ($func, $param) use ($conn, $pkg) {
            $rows = fetchAll($conn, "SELECT {$pkg}.{$func}(:p) AS TOTAL FROM DUAL", [':p' => $param]);
            return (int)($rows[0]['TOTAL'] ?? 0);
        };
        jsonOut([
            'total_facturas'   => $callFn('FIDE_TOTAL_FACTURAS_PERSONA_FN',   $id),
            'facturas_activas' => $callFn('FIDE_MONTO_FACTURADO_PERSONA_FN',  $id),
            'vehiculos'        => $callFn('FIDE_TOTAL_VEHICULOS_PERSONA_FN',  $id),
            'servicios'        => $callFn('FIDE_TOTAL_SERVICIOS_PERSONA_FN',  $id),
            'consultas'        => $callFn('FIDE_TOTAL_CONSULTAS_PERSONA_FN',  $id),
            'reportes'         => $callFn('FIDE_TOTAL_REPORTES_PERSONA_FN',   $id),
            'turnos'           => $callFn('FIDE_TOTAL_TURNOS_GUARDIA_FN',     $id),
        ]);
        break;

    case 'stats_residencia':
        $id = (int)($_REQUEST['id_residencia'] ?? 0);
        if (!$id) {
            jsonOut(['error' => true, 'mensaje' => 'id_residencia requerido']);
            break;
        }
        $callFn = function ($func, $param) use ($conn, $pkg) {
            $rows = fetchAll($conn, "SELECT {$pkg}.{$func}(:p) AS TOTAL FROM DUAL", [':p' => $param]);
            return (int)($rows[0]['TOTAL'] ?? 0);
        };
        jsonOut([
            'visitas'    => $callFn('FIDE_TOTAL_VISITAS_RESIDENCIA_FN',    $id),
            'paquetes'   => $callFn('FIDE_TOTAL_PAQUETES_RESIDENCIA_FN',   $id),
            'residentes' => $callFn('FIDE_TOTAL_RESIDENTES_RESIDENCIA_FN', $id),
        ]);
        break;

    case 'stats_facturas':
        $callFn = function ($func, $param) use ($conn, $pkg) {
            $rows = fetchAll($conn, "SELECT {$pkg}.{$func}(:p) AS TOTAL FROM DUAL", [':p' => $param]);
            return (int)($rows[0]['TOTAL'] ?? 0);
        };
        $estados    = fetchAll($conn, "SELECT ID_ESTADO,    NOMBRE_ESTADO FROM FIDE_LISTAR_ESTADOS_V");
        $tiposPago  = fetchAll($conn, "SELECT ID_TIPO_PAGO, TIPO          FROM FIDE_LISTAR_TIPOS_PAGO_V");
        $formasPago = fetchAll($conn, "SELECT ID_FORMA_PAGO, FORMA        FROM FIDE_LISTAR_FORMAS_PAGO_V");

        $porEstado = [];
        foreach ($estados as $e) {
            $t = $callFn('FIDE_TOTAL_FACTURAS_ESTADO_FN', $e['ID_ESTADO']);
            if ($t > 0) $porEstado[] = ['nombre' => $e['NOMBRE_ESTADO'], 'total' => $t];
        }
        $porTipoPago = [];
        foreach ($tiposPago as $t) {
            $tot = $callFn('FIDE_TOTAL_FACTURAS_TIPO_PAGO_FN', $t['ID_TIPO_PAGO']);
            if ($tot > 0) $porTipoPago[] = ['nombre' => $t['TIPO'], 'total' => $tot];
        }
        $porFormaPago = [];
        foreach ($formasPago as $f) {
            $tot = $callFn('FIDE_TOTAL_FACTURAS_FORMA_PAGO_FN', $f['ID_FORMA_PAGO']);
            if ($tot > 0) $porFormaPago[] = ['nombre' => $f['FORMA'], 'total' => $tot];
        }
        jsonOut([
            'por_estado'     => $porEstado,
            'por_tipo_pago'  => $porTipoPago,
            'por_forma_pago' => $porFormaPago,
        ]);
        break;

    case 'stats_servicios_tipo':
        $callFn = function ($func, $param) use ($conn, $pkg) {
            $rows = fetchAll($conn, "SELECT {$pkg}.{$func}(:p) AS TOTAL FROM DUAL", [':p' => $param]);
            return (int)($rows[0]['TOTAL'] ?? 0);
        };
        $tipos  = fetchAll($conn, "SELECT ID_TIPO_SERVICIO, TIPO_SERVICIO FROM FIDE_LISTAR_TIPOS_SERVICIO_V");
        $result = [];
        foreach ($tipos as $t) {
            $result[] = [
                'tipo'  => $t['TIPO_SERVICIO'],
                'total' => $callFn('FIDE_TOTAL_SERVICIOS_TIPO_FN', $t['ID_TIPO_SERVICIO']),
            ];
        }
        jsonOut($result);
        break;

    case 'stats_eventos_tipo':
        $callFn = function ($func, $param) use ($conn, $pkg) {
            $rows = fetchAll($conn, "SELECT {$pkg}.{$func}(:p) AS TOTAL FROM DUAL", [':p' => $param]);
            return (int)($rows[0]['TOTAL'] ?? 0);
        };
        $tipos  = fetchAll($conn, "SELECT ID_TIPO_EVENTO, TIPO_EVENTO FROM FIDE_LISTAR_TIPOS_EVENTO_V");
        $result = [];
        foreach ($tipos as $t) {
            $result[] = [
                'tipo'  => $t['TIPO_EVENTO'],
                'total' => $callFn('FIDE_TOTAL_EVENTOS_TIPO_FN', $t['ID_TIPO_EVENTO']),
            ];
        }
        jsonOut($result);
        break;

    case 'verificar_residentes_residencia':
        $id = (int)($_REQUEST['id_residencia'] ?? 0);
        if (!$id) {
            jsonOut(['error' => true, 'mensaje' => 'id_residencia requerido']);
            break;
        }
        $rows  = fetchAll(
            $conn,
            "SELECT $pkg.FIDE_TOTAL_RESIDENTES_RESIDENCIA_FN(:p) AS TOTAL FROM DUAL",
            [':p' => $id]
        );
        $total = (int)($rows[0]['TOTAL'] ?? 0);
        jsonOut([
            'total_residentes' => $total,
            'puede_eliminar'   => ($total === 0),
        ]);
        break;
    default:
        http_response_code(400);
        jsonOut(['error' => true, 'mensaje' => "Acción '$accion' no reconocida."]);
        break;
}

oci_close($conn);
