const API = 'api/datos.php';

function mostrarSeccion(id) {
    document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activa'));
    document.getElementById(id).classList.add('activa');
}

async function api(params) {
    const form = new FormData();
    for (const [k, v] of Object.entries(params)) form.append(k, v ?? '');
    const res = await fetch(API, { method: 'POST', body: form });
    const text = await res.text();
    try { return JSON.parse(text); }
    catch (e) { console.error('Respuesta no-JSON del servidor:', text); return { error: true, mensaje: 'Error interno del servidor. Revise la consola.' }; }
}
async function apiGet(accion, extra = {}) {
    const qs = new URLSearchParams({ accion, ...extra });
    const res = await fetch(`${API}?${qs}`);
    const text = await res.text();
    try { return JSON.parse(text); }
    catch (e) { console.error('Respuesta no-JSON:', text); return []; }
}

function estadoBadge(estado) {
    const e = (estado || '').toUpperCase();
    if (['ACTIVO', 'ADENTRO', 'ENTREGADO', 'EN PROCESO', 'RESUELTO', 'PAGADO', 'OCUPADO'].includes(e))
        return `<span class="estado-activo">${estado}</span>`;
    if (['PENDIENTE', 'AFUERA', 'PROGRAMADO', 'EN MANTENIMIENTO', 'EN VACACIONES'].includes(e))
        return `<span class="estado-pendiente">${estado}</span>`;
    if (e === 'LIBRE') return `<span class="estado-libre">${estado}</span>`;
    if (e === 'RESERVADO') return `<span class="estado-reservado">${estado}</span>`;
    return `<span class="estado-inactivo">${estado}</span>`;
}

function llenarSelect(sel, items, val, txt) {
    if (!sel || !Array.isArray(items)) return;
    sel.innerHTML = '<option value="">-- Seleccione --</option>';
    items.forEach(i => {
        const o = document.createElement('option');
        o.value = i[val]; o.textContent = i[txt];
        sel.appendChild(o);
    });
}

// IDs de estados por entidad
const ESTADOS_POR_SECCION = {
    guardias:   [1, 2, 11],        // Activo, Inactivo, En vacaciones
    residentes: [1, 2],            // Activo, Inactivo
    residencias:[8, 10, 7, 9, 2],  // Ocupado, Libre, En mantenimiento, Reservado, Inactivo
    visitantes: [4, 5, 2],         // Adentro, Afuera, Inactivo
    paquetes:   [16, 3, 2],        // Entregado, Pendiente, Inactivo
    facturas:   [1, 2, 3],         // Activo, Inactivo, Pendiente
    servicios:  [1, 2],            // Activo, Inactivo
    eventos:    [12, 13, 2, 14],   // Programado, En proceso, Inactivo, Resuelto
    vehiculos:  [4, 5, 6, 2],      // Adentro, Afuera, Vetado, Inactivo
    espacios:   [9, 10, 7, 8, 2],  // Reservado, Libre, En mantenimiento, Ocupado, Inactivo
};

function filtrarEstados(todos, ids) {
    return ids.map(id => todos.find(e => Number(e.ID_ESTADO) === id)).filter(Boolean);
}

function mostrarMensaje(contenedor, texto, esError = false) {
    const cls = esError ? '.mensaje-error' : '.mensaje-exito';
    const el = contenedor.querySelector(cls);
    const ot = contenedor.querySelector(esError ? '.mensaje-exito' : '.mensaje-error');
    if (ot) ot.style.display = 'none';
    if (!el) return;
    el.textContent = texto; el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

function activarModoEdicion(form, titulo, btnTexto = 'Actualizar') {
    const h3 = form.closest('.bloque-formulario')?.querySelector('h3');
    if (h3) h3.textContent = titulo;
    form.querySelector('button[type="submit"]').textContent = btnTexto;
    let btn = form.querySelector('.btn-cancelar-edicion');
    if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'btn-limpiar btn-cancelar-edicion';
        btn.textContent = '✕ Cancelar edicion';
        form.appendChild(btn);
    }
    btn.style.display = 'block';
    btn.onclick = () => cancelarEdicion(form);
    form.closest('.bloque-formulario').scrollIntoView({ behavior: 'smooth' });
}

function cancelarEdicion(form) {
    form.reset();
    delete form.dataset.editId;
    delete form.dataset.tipoEvento;
    delete form.dataset.tipoEspacio;
    // Restaurar campos que pudieran haberse bloqueado (ej: cédula en modo edición)
    form.querySelectorAll('input[readonly]').forEach(i => {
        i.removeAttribute('readonly');
        i.style.opacity = '';
        i.style.cursor  = '';
    });
    form.querySelector('button[type="submit"]').textContent = 'Guardar';
    const h3 = form.closest('.bloque-formulario')?.querySelector('h3');
    if (h3) h3.textContent = h3.dataset.original ?? 'Agregar';
    const btn = form.querySelector('.btn-cancelar-edicion');
    if (btn) btn.style.display = 'none';
}

async function cargarResumen() {
    try {
        const r = await apiGet('resumen');
        const tarjetas = document.querySelectorAll('#inicio .tarjeta-resumen h3');
        [r.guardias, r.residentes, r.residencias, r.paquetes, r.eventos, r.facturas]
            .forEach((v, i) => { if (tarjetas[i]) tarjetas[i].textContent = v ?? '--'; });

        const eventos = await apiGet('ultimos_eventos');
        const tb = document.querySelector('#inicio table tbody');
        if (!tb) return;
        tb.innerHTML = eventos.map(ev =>
            `<tr><td>${ev.DESCR_EVENTO}</td><td>${ev.TIPO_EVENTO}</td>
             <td>${ev.FECHA_EVENTO}</td><td>${estadoBadge(ev.NOMBRE_ESTADO)}</td></tr>`
        ).join('') || '<tr><td colspan="4">Sin eventos</td></tr>';
    } catch (e) { console.error('resumen:', e); }
}

async function cargarGuardias() {
    try {
        const data = await apiGet('listar_guardias');
        const tb = document.querySelector('#guardias .bloque-tabla table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(g => `
            <tr>
                <td>${g.NOMBRE}</td>
                <td>${g.APELLIDO_PATERNO} ${g.APELLIDO_MATERNO}</td>
                <td>${g.TELEFONO ?? '--'}</td>
                <td>${g.CORREO ?? '--'}</td>
                <td>${g.USUARIO ?? '<em style="color:#aaa">sin usuario</em>'}</td>
                <td>${estadoBadge(g.NOMBRE_ESTADO)}</td>
                <td><span class="badge-stat" title="Turnos trabajados">${g.TOTAL_TURNOS ?? 0} turnos</span></td>
                <td><span class="badge-stat" title="Reportes generados">${g.TOTAL_REPORTES ?? 0} reportes</span></td>
                <td class="acciones-celda">
                    <button class="btn-acc btn-editar" onclick="editarGuardia(${g.ID_PERSONA},'${(g.NOMBRE || '').replace(/'/g, "\\'")}','${(g.APELLIDO_PATERNO || '').replace(/'/g, "\\'")}','${(g.APELLIDO_MATERNO || '').replace(/'/g, "\\'")}','${g.TELEFONO ?? ''}','${g.CORREO ?? ''}','${g.USUARIO ?? ''}',${g.ID_ESTADO ?? 1})">✎ Editar</button>
                    <button class="btn-acc btn-vetar" onclick="eliminarPersona(${g.ID_PERSONA},'guardias')">✕ Baja</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="9">Sin registros</td></tr>';
        refiltrar('#guardias');
    } catch (e) { console.error('guardias:', e); }
}

function editarGuardia(id, nombre, pat, mat, tel, correo, usuario, idEstado) {
    const form = document.querySelector('#guardias .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select');
    inputs[0].value = id;          // mostrar cédula del guardia
    inputs[0].readOnly = true;     // no editable al actualizar
    inputs[0].style.opacity = '0.65';
    inputs[0].style.cursor = 'not-allowed';
    inputs[1].value = nombre;
    inputs[2].value = pat;
    inputs[3].value = mat;
    inputs[4].value = tel;
    inputs[5].value = correo;
    inputs[6].value = usuario;
    inputs[7].value = '';
    if (inputs[8]) inputs[8].value = idEstado;
    form.dataset.editId = id;
    activarModoEdicion(form, '✎ Editar Guardia');
}

async function guardarGuardia(e) {
    e.preventDefault();
    const form = document.querySelector('#guardias .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select');
    const editId = form.dataset.editId;

    const data = {
        accion: editId ? 'actualizar_guardia' : 'insertar_guardia',
        id: editId ?? '',
        cedula: inputs[0].value.trim(),
        nombre: inputs[1].value.trim(),
        apellido_paterno: inputs[2].value.trim(),
        apellido_materno: inputs[3].value.trim(),
        telefono: inputs[4].value.trim(),
        correo: inputs[5].value.trim(),
        usuario: inputs[6].value.trim(),
        contrasena: inputs[7].value.trim(),
        id_estado: inputs[8]?.value ?? 1,
    };

    if (!data.nombre) { mostrarMensaje(form.closest('.bloque-formulario'), 'El nombre es requerido.', true); return; }
    if (!data.usuario) { mostrarMensaje(form.closest('.bloque-formulario'), 'El usuario es requerido.', true); return; }
    if (!editId && !data.contrasena) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'La contrasena es requerida al crear un guardia.', true);
        return;
    }

    if (!editId && data.cedula) {
        const check = await apiGet('verificar_cedula', { cedula: data.cedula });
        if (!check.disponible) {
            mostrarMensaje(form.closest('.bloque-formulario'), `La cédula '${data.cedula}' ya está registrada.`, true);
            return;
        }
    }

    const r = await api(data);
    if (r.error) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true);
    } else {
        mostrarMensaje(form.closest('.bloque-formulario'), editId ? 'Guardia actualizado.' : 'Guardia registrado.');
        cancelarEdicion(form);
        cargarGuardias(); cargarResumen();
    }
}

async function eliminarPersona(id, seccion) {
    if (!confirm('¿Dar de baja este registro?')) return;
    const r = await api({ accion: 'eliminar_persona', id });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    if (seccion === 'guardias') { cargarGuardias(); cargarResumen(); }
    if (seccion === 'residentes') { cargarResidentes(); cargarResumen(); }
}

async function cargarResidentes() {
    try {
        const data = await apiGet('listar_residentes');
        const tb = document.querySelector('#residentes .bloque-tabla table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(r => `
            <tr>
                <td>${r.NOMBRE}</td>
                <td>${r.APELLIDO_PATERNO} ${r.APELLIDO_MATERNO}</td>
                <td>${r.TELEFONO ?? '--'}</td>
                <td>${r.CORREO ?? '--'}</td>
                <td>${r.ID_RESIDENCIA ?? '--'}</td>
                <td>${estadoBadge(r.NOMBRE_ESTADO)}</td>
                <td><span class="badge-stat" title="Total facturas">${r.TOTAL_FACTURAS ?? 0} fact.</span></td>
                <td><span class="badge-stat badge-stat-alerta" title="Facturas activas/pendientes">${r.FACTURAS_ACTIVAS ?? 0} activas</span></td>
                <td><span class="badge-stat" title="Vehículos registrados">${r.TOTAL_VEHICULOS ?? 0} veh.</span></td>
                <td><span class="badge-stat" title="Visitas recibidas">${r.TOTAL_VISITAS ?? 0} visitas</span></td>
                <td class="acciones-celda">
                    <button class="btn-acc btn-editar" onclick="editarResidente(${r.ID_PERSONA},'${(r.NOMBRE || '').replace(/'/g, "\\'")}','${(r.APELLIDO_PATERNO || '').replace(/'/g, "\\'")}','${(r.APELLIDO_MATERNO || '').replace(/'/g, "\\'")}','${r.TELEFONO ?? ''}','${r.CORREO ?? ''}',${r.ID_RESIDENCIA ?? 0},${r.ID_ESTADO ?? 1})">✎ Editar</button>
                    <button class="btn-acc btn-vetar"  onclick="eliminarPersona(${r.ID_PERSONA},'residentes')">✕ Baja</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="11">Sin registros</td></tr>';
        refiltrar('#residentes');
    } catch (e) { console.error('residentes:', e); }
}


function editarResidente(id, nombre, pat, mat, tel, correo, idResidencia, idEstado) {
    const form = document.querySelector('#residentes .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select');
    inputs[0].value = id;          // mostrar cédula del residente
    inputs[0].readOnly = true;     // no editable al actualizar
    inputs[0].style.opacity = '0.65';
    inputs[0].style.cursor = 'not-allowed';
    inputs[1].value = nombre; inputs[2].value = pat; inputs[3].value = mat;
    inputs[4].value = tel; inputs[5].value = correo;
    if (inputs[6]) inputs[6].value = idResidencia;
    if (inputs[7]) inputs[7].value = idEstado;
    form.dataset.editId = id;
    activarModoEdicion(form, '✎ Editar Residente');
}

async function guardarResidente(e) {
    e.preventDefault();
    const form = document.querySelector('#residentes .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select');
    const editId = form.dataset.editId;
    const data = {
        accion: editId ? 'actualizar_residente' : 'insertar_residente',
        id: editId ?? '',
        cedula: inputs[0].value.trim(),
        nombre: inputs[1].value.trim(),
        apellido_paterno: inputs[2].value.trim(),
        apellido_materno: inputs[3].value.trim(),
        telefono: inputs[4].value.trim(),
        correo: inputs[5].value.trim(),
        id_residencia: inputs[6]?.value ?? '',
        id_estado: inputs[7]?.value ?? 1,
    };
    if (!data.nombre) { mostrarMensaje(form.closest('.bloque-formulario'), 'El nombre es requerido.', true); return; }

    if (!editId && data.cedula) {
        const check = await apiGet('verificar_cedula', { cedula: data.cedula });
        if (!check.disponible) {
            mostrarMensaje(form.closest('.bloque-formulario'), `La cédula '${data.cedula}' ya está registrada.`, true);
            return;
        }
    }

    const r = await api(data);
    if (r.error) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true);
    } else {
        mostrarMensaje(form.closest('.bloque-formulario'), editId ? 'Residente actualizado.' : 'Residente registrado.');
        cancelarEdicion(form);
        cargarResidentes(); cargarResumen();
    }
}

async function cargarSelectResidencias(selectId) {
    const data = await apiGet('listar_residencias');
    const sel = document.getElementById(selectId);
    if (!sel) return;
    llenarSelect(sel, data, 'ID_RESIDENCIA', 'ID_RESIDENCIA');
    data.forEach((r, i) => {
        if (sel.options[i + 1])
            sel.options[i + 1].textContent = `Res. ${r.ID_RESIDENCIA} — ₡${Number(r.MONTO_ALQUILER).toLocaleString()}`;
    });
}

async function cargarResidencias() {
    try {
        const data = await apiGet('listar_residencias');
        const tb = document.querySelector('#residencias .bloque-tabla table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(r => `
            <tr>
                <td>${r.ID_RESIDENCIA}</td>
                <td>₡${Number(r.MONTO_ALQUILER).toLocaleString()}</td>
                <td>₡${Number(r.MONTO_MANTENIMIENTO).toLocaleString()}</td>
                <td>${r.TIPO_PAGO ?? '--'}</td>
                <td>${estadoBadge(r.NOMBRE_ESTADO)}</td>
                <td><span class="badge-stat" title="Residentes asociados">${r.TOTAL_RESIDENTES ?? 0} res.</span></td>
                <td><span class="badge-stat" title="Paquetes pendientes">${r.TOTAL_PAQUETES ?? 0} paq.</span></td>
                <td class="acciones-celda">
                    <button class="btn-acc btn-editar" onclick="editarResidencia(${r.ID_RESIDENCIA},${r.MONTO_ALQUILER},${r.MONTO_MANTENIMIENTO},${r.ID_TIPO_PAGO ?? 1},${r.ID_ESTADO ?? 1})">✎ Editar</button>
                    <button class="btn-acc btn-vetar"  onclick="eliminarResidencia(${r.ID_RESIDENCIA})">✕ Baja</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="8">Sin registros</td></tr>';
        refiltrar('#residencias');
    } catch (e) { console.error('residencias:', e); }
}

function editarResidencia(id, montoAlq, montoMant, idTipoPago, idEstado) {
    const form = document.querySelector('#residencias .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select');
    inputs[0].value = montoAlq;
    inputs[1].value = montoMant;
    if (inputs[2]) inputs[2].value = idTipoPago;
    if (inputs[3]) inputs[3].value = idEstado;
    form.dataset.editId = id;
    activarModoEdicion(form, '✎ Editar Residencia');
}

async function eliminarResidencia(id) {
    const check = await apiGet('verificar_residentes_residencia', { id_residencia: id });
    if (!check.puede_eliminar) {
        alert(
            `No se puede dar de baja la Residencia ${id}.\n` +
            `Tiene ${check.total_residentes} residente(s) asociado(s).\n` +
            `Reasigne o elimine los residentes primero.`
        );
        return;
    }
    if (!confirm('¿Dar de baja esta residencia?')) return;
    const r = await api({ accion: 'eliminar_residencia', id });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarResidencias(); cargarResumen();
}

async function guardarResidencia(e) {
    e.preventDefault();
    const form = document.querySelector('#residencias .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select');
    const editId = form.dataset.editId;

    if (!inputs[0].value) { mostrarMensaje(form.closest('.bloque-formulario'), 'Ingrese el monto de alquiler.', true); return; }

    const data = {
        accion: editId ? 'actualizar_residencia' : 'insertar_residencia',
        id: editId ?? '',
        monto_alquiler: inputs[0].value,
        monto_mantenimiento: inputs[1].value,
        id_tipo_pago: inputs[2]?.value ?? 1,
        id_estado: inputs[3]?.value ?? 1,
    };

    const r = await api(data);
    if (r.error) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true);
    } else {
        mostrarMensaje(form.closest('.bloque-formulario'), editId ? 'Residencia actualizada.' : 'Residencia creada.');
        cancelarEdicion(form);
        cargarResidencias(); cargarResumen();
        cargarSelectResidencias('sel-residencia-residente');
    }
}

async function cargarVisitantes() {
    try {
        const data = await apiGet('listar_visitas');
        const tb = document.querySelector('#visitantes table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(v => `
            <tr>
                <td>${v.VISITANTE}</td><td>${v.ROL ?? '--'}</td>
                <td>${v.ID_RESIDENCIA ?? '--'}</td><td>${v.FECHA_INGRESO}</td>
                <td>${v.FECHA_SALIDA ?? '--'}</td><td>${estadoBadge(v.NOMBRE_ESTADO)}</td>
                <td><button class="btn-acc btn-vetar" onclick="eliminarVisita(${v.ID_VISITA})">✕ Baja</button></td>
            </tr>`
        ).join('') || '<tr><td colspan="7">Sin registros</td></tr>';
        refiltrar('#visitantes');
    } catch (e) { console.error('visitantes admin:', e); }
}

async function eliminarVisita(id) {
    if (!confirm('¿Dar de baja esta visita?')) return;
    const r = await api({ accion: 'eliminar_visita', id });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarVisitantes();
}

async function cargarPaquetes() {
    try {
        const data = await apiGet('listar_paquetes');
        const tb = document.querySelector('#paquetes table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(p => `
            <tr>
                <td>${p.PERSONA}</td><td>${p.ID_RESIDENCIA ?? '--'}</td>
                <td>${p.FECHA_INGRESO}</td><td>${p.FECHA_SALIDA ?? '--'}</td>
                <td>${estadoBadge(p.NOMBRE_ESTADO)}</td>
                <td><button class="btn-acc btn-vetar" onclick="eliminarPaquete(${p.ID_PAQUETE})">✕ Baja</button></td>
            </tr>`
        ).join('') || '<tr><td colspan="6">Sin registros</td></tr>';
        refiltrar('#paquetes');
    } catch (e) { console.error('paquetes admin:', e); }
}

async function eliminarPaquete(id) {
    if (!confirm('¿Dar de baja este paquete?')) return;
    const r = await api({ accion: 'eliminar_paquete', id });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarPaquetes(); cargarResumen();
}

async function cargarFacturas() {
    try {
        const data = await apiGet('listar_facturas');
        const tb = document.querySelector('#facturas .bloque-tabla table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(f => `
            <tr>
                <td>${f.FECHA_FACTURA}</td><td>${f.DESCR_FACTURA}</td>
                <td>${f.PERSONA}</td><td>${f.TIPO_PAGO}</td>
                <td>${f.FORMA_PAGO}</td><td>${estadoBadge(f.NOMBRE_ESTADO)}</td>
                <td><button class="btn-acc btn-vetar" onclick="eliminarFactura(${f.ID_FACTURA})">✕ Anular</button></td>
            </tr>`
        ).join('') || '<tr><td colspan="7">Sin registros</td></tr>';
        refiltrar('#facturas');
    } catch (e) { console.error('facturas:', e); }
}

async function eliminarFactura(id) {
    if (!confirm('¿Anular esta factura?')) return;
    const r = await api({ accion: 'eliminar_factura', id });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarFacturas(); cargarResumen(); cargarStatsFacturas();
}

async function guardarFactura(e) {
    e.preventDefault();
    const form = document.querySelector('#facturas .bloque-formulario form');
    const inputs = form.querySelectorAll('input');
    const sels = form.querySelectorAll('select');
    const data = {
        accion: 'insertar_factura',
        fecha_factura: inputs[0].value,
        descr_factura: inputs[1].value.trim(),
        id_persona: sels[0]?.value ?? '',
        id_tipo_pago: sels[1]?.value ?? '',
        id_forma_pago: sels[2]?.value ?? '',
        id_estado: sels[3]?.value ?? 1,
    };
    if (!data.descr_factura) { mostrarMensaje(form.closest('.bloque-formulario'), 'Descripcion requerida.', true); return; }
    if (!data.id_persona) { mostrarMensaje(form.closest('.bloque-formulario'), 'Seleccione la persona.', true); return; }
    const r = await api(data);
    if (r.error) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true);
    } else {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Factura guardada.');
        form.reset(); cargarFacturas(); cargarResumen(); cargarStatsFacturas();
    }
}

async function cargarServicios() {
    try {
        const data = await apiGet('listar_servicios');
        const tb = document.querySelector('#servicios .bloque-tabla table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(s => `
            <tr>
                <td>${s.DESCR_SERVICIO}</td><td>${s.TIPO_SERVICIO}</td>
                <td>${s.FECHA_SALIDA ?? '--'}</td><td>${s.PERSONAS ?? '--'}</td>
                <td>${estadoBadge(s.NOMBRE_ESTADO)}</td>
                <td class="acciones-celda">
                    <button class="btn-acc btn-editar" onclick="editarServicio(${s.ID_SERVICIO},'${(s.DESCR_SERVICIO || '').replace(/'/g, "\\'")}',${s.ID_TIPO_SERVICIO ?? 1},'${s.FECHA_SALIDA ?? ''}',${s.ID_TIPO_EVENTO ?? 1},${s.ID_ESTADO ?? 1})">✎ Editar</button>
                    <button class="btn-acc btn-vetar"  onclick="eliminarServicio(${s.ID_SERVICIO})">✕ Baja</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="6">Sin registros</td></tr>';
        refiltrar('#servicios');
    } catch (e) { console.error('servicios:', e); }
}

function editarServicio(id, descr, idTipoServicio, fechaSalida, idTipoEvento, idEstado) {
    const form = document.querySelector('#servicios .bloque-formulario form');
    const inputs = form.querySelectorAll('input');
    const sels = form.querySelectorAll('select');
    const ta = form.querySelector('textarea');
    if (ta) ta.value = descr;
    if (inputs[0]) inputs[0].value = fechaSalida;
    if (sels[0]) sels[0].value = idTipoServicio;
    if (sels[2]) sels[2].value = idEstado;
    form.dataset.editId = id;
    form.dataset.tipoEvento = idTipoEvento;
    activarModoEdicion(form, '✎ Editar Servicio');
}

async function eliminarServicio(id) {
    if (!confirm('¿Dar de baja este servicio?')) return;
    const r = await api({ accion: 'eliminar_servicio', id });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarServicios(); cargarStatsServicios();
}

async function guardarServicio(e) {
    e.preventDefault();
    const form = document.querySelector('#servicios .bloque-formulario form');
    const inputs = form.querySelectorAll('input');
    const sels = form.querySelectorAll('select');
    const editId = form.dataset.editId;
    const descrVal = form.querySelector('textarea')?.value.trim() ?? '';
    const data = {
        accion: editId ? 'actualizar_servicio' : 'insertar_servicio',
        id: editId ?? '',
        descr_servicio: descrVal,
        id_tipo_servicio: sels[0]?.value ?? 1,
        id_persona_servicio: sels[1]?.value ?? '',
        fecha_salida: inputs[0]?.value ?? '',
        id_estado: sels[2]?.value ?? 1,
        id_tipo_evento: form.dataset.tipoEvento ?? 1,
    };
    if (!data.descr_servicio) { mostrarMensaje(form.closest('.bloque-formulario'), 'Descripcion requerida.', true); return; }
    const r = await api(data);
    if (r.error) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true);
    } else {
        mostrarMensaje(form.closest('.bloque-formulario'), editId ? 'Servicio actualizado.' : 'Servicio registrado.');
        cancelarEdicion(form);
        cargarServicios(); cargarStatsServicios();
    }
}

async function cargarEventos() {
    try {
        const data = await apiGet('listar_eventos');
        const tb = document.querySelector('#eventos .bloque-tabla table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(ev => `
            <tr>
                <td>${ev.DESCR_EVENTO}</td><td>${ev.TIPO_EVENTO}</td>
                <td>${ev.FECHA_EVENTO}</td><td>${estadoBadge(ev.NOMBRE_ESTADO)}</td>
                <td class="acciones-celda">
                    <button class="btn-acc btn-editar" onclick="editarEvento(${ev.ID_EVENTO},'${(ev.DESCR_EVENTO || '').replace(/'/g, "\\'")}',${ev.ID_TIPO_EVENTO ?? 1},'${ev.FECHA_EVENTO ?? ''}',${ev.ID_TIPO_ESPACIO ?? 1},${ev.ID_ESTADO ?? 1})">✎ Editar</button>
                    <button class="btn-acc btn-vetar"  onclick="eliminarEvento(${ev.ID_EVENTO})">✕ Baja</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="5">Sin registros</td></tr>';
        refiltrar('#eventos');
    } catch (e) { console.error('eventos:', e); }
}

function editarEvento(id, descr, idTipoEvento, fechaEvento, idTipoEspacio, idEstado) {
    const form = document.querySelector('#eventos .bloque-formulario form');
    const inputs = form.querySelectorAll('input');
    const sels = form.querySelectorAll('select');
    const ta = form.querySelector('textarea');
    if (ta) ta.value = descr;
    if (inputs[0]) inputs[0].value = fechaEvento;
    if (sels[0]) sels[0].value = idTipoEvento;
    if (sels[1]) sels[1].value = idEstado;
    form.dataset.editId = id;
    form.dataset.tipoEspacio = idTipoEspacio;
    activarModoEdicion(form, '✎ Editar Evento');
}

async function eliminarEvento(id) {
    if (!confirm('¿Dar de baja este evento?')) return;
    const r = await api({ accion: 'eliminar_evento', id });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarEventos(); cargarResumen(); cargarStatsEventos();
}

async function guardarEvento(e) {
    e.preventDefault();
    const form = document.querySelector('#eventos .bloque-formulario form');
    const inputs = form.querySelectorAll('input');
    const sels = form.querySelectorAll('select');
    const editId = form.dataset.editId;
    const descrEvento = form.querySelector('textarea')?.value.trim() ?? '';
    const data = {
        accion: editId ? 'actualizar_evento' : 'insertar_evento',
        id: editId ?? '',
        descr_evento: descrEvento,
        id_tipo_evento: sels[0]?.value ?? 1,
        fecha_evento: inputs[0]?.value ?? '',
        id_estado: sels[1]?.value ?? 1,
        id_tipo_espacio: form.dataset.tipoEspacio ?? 1,
    };
    if (!data.descr_evento) { mostrarMensaje(form.closest('.bloque-formulario'), 'Descripcion requerida.', true); return; }
    if (!data.id_tipo_evento) { mostrarMensaje(form.closest('.bloque-formulario'), 'Seleccione el tipo.', true); return; }
    const r = await api(data);
    if (r.error) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true);
    } else {
        mostrarMensaje(form.closest('.bloque-formulario'), editId ? 'Evento actualizado.' : 'Evento registrado.');
        cancelarEdicion(form);
        cargarEventos(); cargarResumen(); cargarStatsEventos();
    }
}

async function cargarVehiculos() {
    try {
        const data = await apiGet('listar_vehiculos');
        const tb = document.querySelector('#vehiculos table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(v => `
            <tr>
                <td>${v.PLACA}</td><td>${v.DESCRIPCION}</td>
                <td>${v.RESIDENTE}</td><td>${estadoBadge(v.NOMBRE_ESTADO)}</td>
                <td><button class="btn-acc btn-vetar" onclick="eliminarVehiculo('${v.PLACA}')">✕ Baja</button></td>
            </tr>`
        ).join('') || '<tr><td colspan="5">Sin registros</td></tr>';
        refiltrar('#vehiculos');
    } catch (e) { console.error('vehiculos:', e); }
}

async function eliminarVehiculo(placa) {
    if (!confirm(`¿Dar de baja el vehiculo ${placa}?`)) return;
    const r = await api({ accion: 'eliminar_vehiculo', placa });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarVehiculos();
}

async function cargarSelectsAdmin() {
    const safe = async (accion) => { try { const d = await apiGet(accion); return Array.isArray(d) ? d : []; } catch { return []; } };

    const [tiposPago, formasPago, tiposServicio, tiposEvento, estados, residencias, personas, trabajadores] =
        await Promise.all([
            safe('listar_tipos_pago'),
            safe('listar_formas_pago'),
            safe('listar_tipos_servicio'),
            safe('listar_tipos_evento'),
            safe('listar_estados'),
            safe('listar_residencias'),
            safe('listar_personas'),
            safe('listar_trabajadores'),
        ]);

    try {
        const selEstG = document.querySelector('#guardias .bloque-formulario select');
        llenarSelect(selEstG, filtrarEstados(estados, ESTADOS_POR_SECCION.guardias), 'ID_ESTADO', 'NOMBRE_ESTADO');
    } catch (e) { console.error('selects guardias:', e); }

    try {
        const selResRes = document.querySelector('#residentes .bloque-formulario select:nth-of-type(1)');
        if (selResRes) {
            selResRes.id = 'sel-residencia-residente';
            llenarSelect(selResRes, residencias, 'ID_RESIDENCIA', 'ID_RESIDENCIA');
            residencias.forEach((r, i) => {
                if (selResRes.options[i + 1])
                    selResRes.options[i + 1].textContent = `Res. ${r.ID_RESIDENCIA} — ₡${Number(r.MONTO_ALQUILER).toLocaleString()}`;
            });
        }
        const selEstR = document.querySelector('#residentes .bloque-formulario select:nth-of-type(2)');
        llenarSelect(selEstR, filtrarEstados(estados, ESTADOS_POR_SECCION.residentes), 'ID_ESTADO', 'NOMBRE_ESTADO');
    } catch (e) { console.error('selects residentes:', e); }

    try {
        const selTipoR = document.querySelector('#residencias .bloque-formulario select:nth-of-type(1)');
        llenarSelect(selTipoR, tiposPago, 'ID_TIPO_PAGO', 'TIPO');
        const selEstRs = document.querySelector('#residencias .bloque-formulario select:nth-of-type(2)');
        llenarSelect(selEstRs, filtrarEstados(estados, ESTADOS_POR_SECCION.residencias), 'ID_ESTADO', 'NOMBRE_ESTADO');
    } catch (e) { console.error('selects residencias:', e); }

    try {
        const fSels = document.querySelectorAll('#facturas .bloque-formulario select');
        llenarSelect(fSels[0], personas, 'ID_PERSONA', 'NOMBRE_COMPLETO');
        llenarSelect(fSels[1], tiposPago, 'ID_TIPO_PAGO', 'TIPO');
        llenarSelect(fSels[2], formasPago, 'ID_FORMA_PAGO', 'FORMA');
        llenarSelect(fSels[3], filtrarEstados(estados, ESTADOS_POR_SECCION.facturas), 'ID_ESTADO', 'NOMBRE_ESTADO');
    } catch (e) { console.error('selects facturas:', e); }

    try {
        const sSels = document.querySelectorAll('#servicios .bloque-formulario select');
        llenarSelect(sSels[0], tiposServicio, 'ID_TIPO_SERVICIO', 'TIPO_SERVICIO');
        llenarSelect(sSels[1], trabajadores, 'ID_PERSONA', 'NOMBRE_COMPLETO');
        llenarSelect(sSels[2], filtrarEstados(estados, ESTADOS_POR_SECCION.servicios), 'ID_ESTADO', 'NOMBRE_ESTADO');
    } catch (e) { console.error('selects servicios:', e); }

    try {
        const eSels = document.querySelectorAll('#eventos .bloque-formulario select');
        llenarSelect(eSels[0], tiposEvento, 'ID_TIPO_EVENTO', 'TIPO_EVENTO');
        llenarSelect(eSels[1], filtrarEstados(estados, ESTADOS_POR_SECCION.eventos), 'ID_ESTADO', 'NOMBRE_ESTADO');
    } catch (e) { console.error('selects eventos:', e); }
}

function inyectarMensajes() {
    document.querySelectorAll('.bloque-formulario form').forEach(form => {
        if (!form.querySelector('.mensaje-error')) {
            const el = document.createElement('p'); el.className = 'mensaje-error'; form.appendChild(el);
        }
        if (!form.querySelector('.mensaje-exito')) {
            const el = document.createElement('p'); el.className = 'mensaje-exito'; form.appendChild(el);
        }
    });
    document.querySelectorAll('.bloque-formulario h3').forEach(h3 => {
        h3.dataset.original = h3.textContent;
    });
}

function asignarFormularios() {
    const mapa = {
        '#guardias    .bloque-formulario form': guardarGuardia,
        '#residentes  .bloque-formulario form': guardarResidente,
        '#residencias .bloque-formulario form': guardarResidencia,
        '#facturas    .bloque-formulario form': guardarFactura,
        '#servicios   .bloque-formulario form': guardarServicio,
        '#eventos     .bloque-formulario form': guardarEvento,
    };
    for (const [sel, fn] of Object.entries(mapa)) {
        const btn = document.querySelector(`${sel} button[type="submit"]`);
        if (btn) btn.closest('form').addEventListener('submit', fn);
    }
    document.querySelectorAll('.btn-limpiar:not(.btn-cancelar-edicion)').forEach(btn =>
        btn.addEventListener('click', () => { const f = btn.closest('form'); if (f) cancelarEdicion(f); })
    );
}

function iniciarAutoRefresh() {
    setInterval(() => {
        cargarResumen();
        cargarGuardias();
        cargarResidentes();
        cargarResidencias();
        cargarVisitantes();
        cargarPaquetes();
        cargarFacturas();
        cargarServicios();
        cargarEventos();
        cargarVehiculos();
        cargarStatsFacturas();
        cargarStatsServicios();
        cargarStatsEventos();
    }, 20000);
}

async function cargarStatsFacturas() {
    try {
        const stats = await apiGet('stats_facturas');

        const renderItems = (items) =>
            items.length
                ? items.map(i => `
                    <div class="stats-fila">
                        <span class="stats-label">${i.nombre}</span>
                        <span class="stats-valor">${i.total}</span>
                    </div>`).join('')
                : '<p style="color:#aaa;font-size:.85rem">Sin datos</p>';

        const el1 = document.getElementById('stats-por-estado');
        const el2 = document.getElementById('stats-por-tipo-pago');
        const el3 = document.getElementById('stats-por-forma-pago');

        if (el1) el1.innerHTML =
            `<h4 class="stats-titulo">📋 Por Estado</h4>${renderItems(stats.por_estado)}`;
        if (el2) el2.innerHTML =
            `<h4 class="stats-titulo">🗓️ Por Tipo de Pago</h4>${renderItems(stats.por_tipo_pago)}`;
        if (el3) el3.innerHTML =
            `<h4 class="stats-titulo">💳 Por Forma de Pago</h4>${renderItems(stats.por_forma_pago)}`;
    } catch (e) { console.error('stats_facturas:', e); }
}

async function cargarStatsServicios() {
    try {
        const stats = await apiGet('stats_servicios_tipo');
        const el = document.getElementById('stats-servicios-tipo');
        if (!el) return;
        el.innerHTML = stats.length
            ? stats.map(s =>
                `<div class="stats-fila">
                    <span class="stats-label">${s.tipo}</span>
                    <span class="stats-valor">${s.total}</span>
                </div>`).join('')
            : '<p style="color:#aaa;font-size:.85rem">Sin datos</p>';
    } catch (e) { console.error('stats_servicios:', e); }
}

async function cargarStatsEventos() {
    try {
        const stats = await apiGet('stats_eventos_tipo');
        const el = document.getElementById('stats-eventos-tipo');
        if (!el) return;
        el.innerHTML = stats.length
            ? stats.map(s =>
                `<div class="stats-fila">
                    <span class="stats-label">${s.tipo}</span>
                    <span class="stats-valor">${s.total}</span>
                </div>`).join('')
            : '<p style="color:#aaa;font-size:.85rem">Sin datos</p>';
    } catch (e) { console.error('stats_eventos:', e); }
}
document.addEventListener('DOMContentLoaded', async () => {
    inyectarMensajes();
    asignarFormularios();
    await cargarSelectsAdmin();
    await cargarResumen();
    await Promise.all([
        cargarGuardias(),
        cargarResidentes(),
        cargarResidencias(),
    ]);
    await Promise.all([
        cargarVisitantes(),
        cargarPaquetes(),
        cargarFacturas(),
    ]);
    await Promise.all([
        cargarServicios(),
        cargarEventos(),
        cargarVehiculos(),
    ]);
    iniciarAutoRefresh();
});

function aplicarFiltro(input) {
    const q = input.value.trim().toLowerCase();
    const section = input.closest('.seccion');
    const bloque = input.closest('.bloque-tabla');
    const table = bloque
        ? bloque.querySelector('table')
        : section?.querySelector('table');
    if (!table) return;
    table.querySelectorAll('tbody tr').forEach(tr => {
        tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
}

function refiltrar(seccionId) {
    const input = document.querySelector(`${seccionId} .buscador-tabla`);
    if (input && input.value.trim()) aplicarFiltro(input);
}

document.addEventListener('input', e => {
    if (e.target.matches('.buscador-tabla')) aplicarFiltro(e.target);
});
