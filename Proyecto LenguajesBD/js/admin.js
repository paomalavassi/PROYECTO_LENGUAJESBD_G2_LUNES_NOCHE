const API = 'api/datos.php';

function mostrarSeccion(id) {
    document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activa'));
    document.getElementById(id).classList.add('activa');
}

async function api(params) {
    const form = new FormData();
    for (const [k, v] of Object.entries(params)) form.append(k, v ?? '');
    const res  = await fetch(API, { method: 'POST', body: form });
    return res.json();
}
async function apiGet(accion, extra = {}) {
    const qs = new URLSearchParams({ accion, ...extra });
    const res = await fetch(`${API}?${qs}`);
    return res.json();
}

function estadoBadge(estado) {
    const e = (estado || '').toUpperCase();
    if (['ACTIVO','ADENTRO','ENTREGADO','EN PROCESO','RESUELTO','PAGADO','OCUPADO'].includes(e))
        return `<span class="estado-activo">${estado}</span>`;
    if (['PENDIENTE','AFUERA','PROGRAMADO','EN MANTENIMIENTO','EN VACACIONES'].includes(e))
        return `<span class="estado-pendiente">${estado}</span>`;
    if (e === 'LIBRE')
        return `<span class="estado-libre">${estado}</span>`;
    if (e === 'RESERVADO')
        return `<span class="estado-reservado">${estado}</span>`;
    return `<span class="estado-inactivo">${estado}</span>`;
}

function llenarSelect(sel, items, val, txt) {
    sel.innerHTML = '<option value="">-- Seleccione --</option>';
    items.forEach(i => {
        const o = document.createElement('option');
        o.value = i[val]; o.textContent = i[txt];
        sel.appendChild(o);
    });
}

function mostrarMensaje(contenedor, texto, esError = false) {
    const cls = esError ? '.mensaje-error' : '.mensaje-exito';
    const el  = contenedor.querySelector(cls);
    const ot  = contenedor.querySelector(esError ? '.mensaje-exito' : '.mensaje-error');
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
        btn.textContent = '✕ Cancelar edición';
        form.appendChild(btn);
    }
    btn.style.display = 'block';
    btn.onclick = () => cancelarEdicion(form);
    form.closest('.bloque-formulario').scrollIntoView({ behavior: 'smooth' });
}

function cancelarEdicion(form) {
    form.reset();
    delete form.dataset.editId;
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
        const tb   = document.querySelector('#guardias .bloque-tabla table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(g => `
            <tr>
                <td>${g.NOMBRE}</td>
                <td>${g.APELLIDO_PATERNO} ${g.APELLIDO_MATERNO}</td>
                <td>${g.TELEFONO ?? '--'}</td>
                <td>${g.CORREO ?? '--'}</td>
                <td>${estadoBadge(g.NOMBRE_ESTADO)}</td>
                <td class="acciones-celda">
                    <button class="btn-acc btn-editar" onclick="editarGuardia(${g.ID_PERSONA},'${(g.NOMBRE||'').replace(/'/g,"\\'")}','${(g.APELLIDO_PATERNO||'').replace(/'/g,"\\'")}','${(g.APELLIDO_MATERNO||'').replace(/'/g,"\\'")}','${g.TELEFONO??''}','${g.CORREO??''}',${g.ID_ESTADO??1})">✎ Editar</button>
                    <button class="btn-acc btn-vetar" onclick="eliminarPersona(${g.ID_PERSONA},'guardias')">✕ Baja</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="6">Sin registros</td></tr>';
    } catch (e) { console.error('guardias:', e); }
}

function editarGuardia(id, nombre, pat, mat, tel, correo, idEstado) {
    const form   = document.querySelector('#guardias .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select');
    inputs[0].value = nombre; inputs[1].value = pat; inputs[2].value = mat;
    inputs[3].value = tel;   inputs[4].value = correo;
    if (inputs[5]) inputs[5].value = idEstado;
    form.dataset.editId = id;
    activarModoEdicion(form, '✎ Editar Guardia');
}

async function guardarGuardia(e) {
    e.preventDefault();
    const form   = document.querySelector('#guardias .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select');
    const editId = form.dataset.editId;
    const data   = {
        accion:           editId ? 'actualizar_guardia' : 'insertar_guardia',
        id:               editId ?? '',
        nombre:           inputs[0].value.trim(),
        apellido_paterno: inputs[1].value.trim(),
        apellido_materno: inputs[2].value.trim(),
        telefono:         inputs[3].value.trim(),
        correo:           inputs[4].value.trim(),
        id_estado:        inputs[5].value,
    };
    if (!data.nombre) { mostrarMensaje(form.closest('.bloque-formulario'), 'El nombre es requerido.', true); return; }
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
    const r = await api({ accion:'eliminar_persona', id });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    if (seccion === 'guardias')   { cargarGuardias();   cargarResumen(); }
    if (seccion === 'residentes') { cargarResidentes(); cargarResumen(); }
}

async function cargarResidentes() {
    try {
        const data = await apiGet('listar_residentes');
        const tb   = document.querySelector('#residentes .bloque-tabla table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(r => `
            <tr>
                <td>${r.NOMBRE}</td>
                <td>${r.APELLIDO_PATERNO} ${r.APELLIDO_MATERNO}</td>
                <td>${r.TELEFONO ?? '--'}</td>
                <td>${r.CORREO ?? '--'}</td>
                <td>${r.ID_RESIDENCIA ?? '--'}</td>
                <td>${estadoBadge(r.NOMBRE_ESTADO)}</td>
                <td class="acciones-celda">
                    <button class="btn-acc btn-editar" onclick="editarResidente(${r.ID_PERSONA},'${(r.NOMBRE||'').replace(/'/g,"\\'")}','${(r.APELLIDO_PATERNO||'').replace(/'/g,"\\'")}','${(r.APELLIDO_MATERNO||'').replace(/'/g,"\\'")}','${r.TELEFONO??''}','${r.CORREO??''}',${r.ID_RESIDENCIA??0},${r.ID_ESTADO??1})">✎ Editar</button>
                    <button class="btn-acc btn-vetar"  onclick="eliminarPersona(${r.ID_PERSONA},'residentes')">✕ Baja</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="8">Sin registros</td></tr>';
    } catch (e) { console.error('residentes:', e); }
}

function editarResidente(id, nombre, pat, mat, tel, correo, idResidencia, idEstado) {
    const form   = document.querySelector('#residentes .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select');
    inputs[0].value = nombre; inputs[1].value = pat; inputs[2].value = mat;
    inputs[3].value = tel;   inputs[4].value = correo;
    if (inputs[5]) inputs[5].value = idResidencia;
    if (inputs[6]) inputs[6].value = idEstado;
    form.dataset.editId = id;
    activarModoEdicion(form, '✎ Editar Residente');
}

async function guardarResidente(e) {
    e.preventDefault();
    const form   = document.querySelector('#residentes .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select');
    const editId = form.dataset.editId;
    const data   = {
        accion:           editId ? 'actualizar_residente' : 'insertar_residente',
        id:               editId ?? '',
        nombre:           inputs[0].value.trim(),
        apellido_paterno: inputs[1].value.trim(),
        apellido_materno: inputs[2].value.trim(),
        telefono:         inputs[3].value.trim(),
        correo:           inputs[4].value.trim(),
        id_residencia:    inputs[5].value,
        id_estado:        inputs[6].value,
    };
    if (!data.nombre) { mostrarMensaje(form.closest('.bloque-formulario'), 'El nombre es requerido.', true); return; }
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
    const sel  = document.getElementById(selectId);
    if (!sel) return;
    llenarSelect(sel, data, 'ID_RESIDENCIA', 'ID_RESIDENCIA');
    data.forEach((r, i) => {
        if (sel.options[i+1])
            sel.options[i+1].textContent = `Res. ${r.ID_RESIDENCIA} — ₡${Number(r.MONTO_ALQUILER).toLocaleString()}`;
    });
}

async function cargarResidencias() {
    try {
        const data = await apiGet('listar_residencias');
        const tb   = document.querySelector('#residencias .bloque-tabla table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(r => `
            <tr>
                <td>${r.ID_RESIDENCIA}</td>
                <td>₡${Number(r.MONTO_ALQUILER).toLocaleString()}</td>
                <td>₡${Number(r.MONTO_MANTENIMIENTO).toLocaleString()}</td>
                <td>${r.TIPO_PAGO ?? '--'}</td>
                <td>${estadoBadge(r.NOMBRE_ESTADO)}</td>
                <td class="acciones-celda">
                    <button class="btn-acc btn-editar" onclick="editarResidencia(${r.ID_RESIDENCIA},${r.MONTO_ALQUILER},${r.MONTO_MANTENIMIENTO},${r.ID_TIPO_PAGO??1},${r.ID_ESTADO??1})">✎ Editar</button>
                    <button class="btn-acc btn-vetar"  onclick="eliminarResidencia(${r.ID_RESIDENCIA})">✕ Baja</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="6">Sin registros</td></tr>';
    } catch (e) { console.error('residencias:', e); }
}

function editarResidencia(id, montoAlq, montoMant, idTipoPago, idEstado) {
    const form   = document.querySelector('#residencias .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select');
    inputs[0].value = montoAlq; inputs[1].value = montoMant;
    if (inputs[2]) inputs[2].value = idTipoPago;
    if (inputs[3]) inputs[3].value = idEstado;
    form.dataset.editId = id;
    activarModoEdicion(form, '✎ Editar Residencia');
}

async function eliminarResidencia(id) {
    if (!confirm('¿Dar de baja esta residencia?')) return;
    const r = await api({ accion:'eliminar_residencia', id });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarResidencias(); cargarResumen();
}

async function guardarResidencia(e) {
    e.preventDefault();
    const form   = document.querySelector('#residencias .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select');
    const editId = form.dataset.editId;
    const data   = {
        accion:              editId ? 'actualizar_residencia' : 'insertar_residencia',
        id:                  editId ?? '',
        monto_alquiler:      inputs[0].value,
        monto_mantenimiento: inputs[1].value,
        id_tipo_pago:        inputs[2].value,
        id_estado:           inputs[3].value,
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
        const tb   = document.querySelector('#visitantes table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(v => `
            <tr>
                <td>${v.VISITANTE}</td><td>${v.ROL ?? '--'}</td>
                <td>${v.ID_RESIDENCIA ?? '--'}</td><td>${v.FECHA_INGRESO}</td>
                <td>${v.FECHA_SALIDA ?? '--'}</td><td>${estadoBadge(v.NOMBRE_ESTADO)}</td>
                <td><button class="btn-acc btn-vetar" onclick="eliminarVisita(${v.ID_VISITA})">✕ Baja</button></td>
            </tr>`
        ).join('') || '<tr><td colspan="7">Sin registros</td></tr>';
    } catch (e) { console.error('visitantes admin:', e); }
}

async function eliminarVisita(id) {
    if (!confirm('¿Dar de baja esta visita?')) return;
    const r = await api({ accion:'eliminar_visita', id });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarVisitantes();
}

async function cargarPaquetes() {
    try {
        const data = await apiGet('listar_paquetes');
        const tb   = document.querySelector('#paquetes table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(p => `
            <tr>
                <td>${p.PERSONA}</td><td>${p.ID_RESIDENCIA ?? '--'}</td>
                <td>${p.FECHA_INGRESO}</td><td>${p.FECHA_SALIDA ?? '--'}</td>
                <td>${estadoBadge(p.NOMBRE_ESTADO)}</td>
                <td><button class="btn-acc btn-vetar" onclick="eliminarPaquete(${p.ID_PAQUETE})">✕ Baja</button></td>
            </tr>`
        ).join('') || '<tr><td colspan="6">Sin registros</td></tr>';
    } catch (e) { console.error('paquetes admin:', e); }
}

async function eliminarPaquete(id) {
    if (!confirm('¿Dar de baja este paquete?')) return;
    const r = await api({ accion:'eliminar_paquete', id });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarPaquetes(); cargarResumen();
}

async function cargarFacturas() {
    try {
        const data = await apiGet('listar_facturas');
        const tb   = document.querySelector('#facturas .bloque-tabla table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(f => `
            <tr>
                <td>${f.FECHA_FACTURA}</td><td>${f.DESCR_FACTURA}</td>
                <td>${f.PERSONA}</td><td>${f.TIPO_PAGO}</td>
                <td>${f.FORMA_PAGO}</td><td>${estadoBadge(f.NOMBRE_ESTADO)}</td>
                <td><button class="btn-acc btn-vetar" onclick="eliminarFactura(${f.ID_FACTURA})">✕ Anular</button></td>
            </tr>`
        ).join('') || '<tr><td colspan="7">Sin registros</td></tr>';
    } catch (e) { console.error('facturas:', e); }
}

async function eliminarFactura(id) {
    if (!confirm('¿Anular esta factura?')) return;
    const r = await api({ accion:'eliminar_factura', id });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarFacturas(); cargarResumen();
}

async function guardarFactura(e) {
    e.preventDefault();
    const form   = document.querySelector('#facturas .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select, textarea');
    const data   = {
        accion:        'insertar_factura',
        fecha_factura: inputs[0].value,
        descr_factura: inputs[1].value.trim(),
        id_persona:    inputs[2].value,
        id_tipo_pago:  inputs[3].value,
        id_forma_pago: inputs[4].value,
        id_estado:     inputs[5].value,
    };
    if (!data.descr_factura) { mostrarMensaje(form.closest('.bloque-formulario'), 'Descripción requerida.', true); return; }
    if (!data.id_persona)    { mostrarMensaje(form.closest('.bloque-formulario'), 'Seleccione la persona.', true); return; }
    const r = await api(data);
    if (r.error) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true);
    } else {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Factura guardada.');
        form.reset(); cargarFacturas(); cargarResumen();
    }
}

async function cargarServicios() {
    try {
        const data = await apiGet('listar_servicios');
        const tb   = document.querySelector('#servicios .bloque-tabla table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(s => `
            <tr>
                <td>${s.DESCR_SERVICIO}</td><td>${s.TIPO_SERVICIO}</td>
                <td>${s.FECHA_SALIDA ?? '--'}</td><td>${s.PERSONAS ?? '--'}</td>
                <td>${estadoBadge(s.NOMBRE_ESTADO)}</td>
                <td class="acciones-celda">
                    <button class="btn-acc btn-editar" onclick="editarServicio(${s.ID_SERVICIO},'${(s.DESCR_SERVICIO||'').replace(/'/g,"\\'")}',${s.ID_TIPO_SERVICIO??1},'${s.FECHA_SALIDA??''}',${s.ID_TIPO_EVENTO??1},${s.ID_ESTADO??1})">✎ Editar</button>
                    <button class="btn-acc btn-vetar"  onclick="eliminarServicio(${s.ID_SERVICIO})">✕ Baja</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="6">Sin registros</td></tr>';
    } catch (e) { console.error('servicios:', e); }
}

function editarServicio(id, descr, idTipoServicio, fechaSalida, idTipoEvento, idEstado) {
    const form   = document.querySelector('#servicios .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs[0].value = descr;
    if (inputs[1]) inputs[1].value = idTipoServicio;
    if (inputs[3]) inputs[3].value = fechaSalida;
    if (inputs[4]) inputs[4].value = idEstado;
    form.dataset.editId      = id;
    form.dataset.tipoEvento  = idTipoEvento;
    activarModoEdicion(form, '✎ Editar Servicio');
}

async function eliminarServicio(id) {
    if (!confirm('¿Dar de baja este servicio?')) return;
    const r = await api({ accion:'eliminar_servicio', id });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarServicios();
}

async function guardarServicio(e) {
    e.preventDefault();
    const form   = document.querySelector('#servicios .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select, textarea');
    const editId = form.dataset.editId;
    const data   = {
        accion:              editId ? 'actualizar_servicio' : 'insertar_servicio',
        id:                  editId ?? '',
        descr_servicio:      inputs[0].value.trim(),
        id_tipo_servicio:    inputs[1].value,
        id_persona_servicio: inputs[2].value,
        fecha_salida:        inputs[3].value,
        id_estado:           inputs[4].value,
        id_tipo_evento:      form.dataset.tipoEvento ?? 1,
    };
    if (!data.descr_servicio) { mostrarMensaje(form.closest('.bloque-formulario'), 'Descripción requerida.', true); return; }
    const r = await api(data);
    if (r.error) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true);
    } else {
        mostrarMensaje(form.closest('.bloque-formulario'), editId ? 'Servicio actualizado.' : 'Servicio registrado.');
        cancelarEdicion(form); delete form.dataset.tipoEvento;
        cargarServicios();
    }
}

async function cargarEventos() {
    try {
        const data = await apiGet('listar_eventos');
        const tb   = document.querySelector('#eventos .bloque-tabla table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(ev => `
            <tr>
                <td>${ev.DESCR_EVENTO}</td><td>${ev.TIPO_EVENTO}</td>
                <td>${ev.FECHA_EVENTO}</td><td>${estadoBadge(ev.NOMBRE_ESTADO)}</td>
                <td class="acciones-celda">
                    <button class="btn-acc btn-editar" onclick="editarEvento(${ev.ID_EVENTO},'${(ev.DESCR_EVENTO||'').replace(/'/g,"\\'")}',${ev.ID_TIPO_EVENTO??1},'${ev.FECHA_EVENTO??''}',${ev.ID_TIPO_ESPACIO??1},${ev.ID_ESTADO??1})">✎ Editar</button>
                    <button class="btn-acc btn-vetar"  onclick="eliminarEvento(${ev.ID_EVENTO})">✕ Baja</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="5">Sin registros</td></tr>';
    } catch (e) { console.error('eventos:', e); }
}

function editarEvento(id, descr, idTipoEvento, fechaEvento, idTipoEspacio, idEstado) {
    const form   = document.querySelector('#eventos .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs[0].value = descr;
    if (inputs[1]) inputs[1].value = idTipoEvento;
    if (inputs[2]) inputs[2].value = fechaEvento;
    if (inputs[3]) inputs[3].value = idEstado;
    form.dataset.editId       = id;
    form.dataset.tipoEspacio  = idTipoEspacio;
    activarModoEdicion(form, '✎ Editar Evento');
}

async function eliminarEvento(id) {
    if (!confirm('¿Dar de baja este evento?')) return;
    const r = await api({ accion:'eliminar_evento', id });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarEventos(); cargarResumen();
}

async function guardarEvento(e) {
    e.preventDefault();
    const form   = document.querySelector('#eventos .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select, textarea');
    const editId = form.dataset.editId;
    const data   = {
        accion:           editId ? 'actualizar_evento' : 'insertar_evento',
        id:               editId ?? '',
        descr_evento:     inputs[0].value.trim(),
        id_tipo_evento:   inputs[1].value,
        fecha_evento:     inputs[2].value,
        id_estado:        inputs[3].value,
        id_tipo_espacio:  form.dataset.tipoEspacio ?? 1,
    };
    if (!data.descr_evento)   { mostrarMensaje(form.closest('.bloque-formulario'), 'Descripción requerida.', true); return; }
    if (!data.id_tipo_evento) { mostrarMensaje(form.closest('.bloque-formulario'), 'Seleccione el tipo.', true); return; }
    const r = await api(data);
    if (r.error) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true);
    } else {
        mostrarMensaje(form.closest('.bloque-formulario'), editId ? 'Evento actualizado.' : 'Evento registrado.');
        cancelarEdicion(form); delete form.dataset.tipoEspacio;
        cargarEventos(); cargarResumen();
    }
}

async function cargarVehiculos() {
    try {
        const data = await apiGet('listar_vehiculos');
        const tb   = document.querySelector('#vehiculos table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(v => `
            <tr>
                <td>${v.PLACA}</td><td>${v.DESCRIPCION}</td>
                <td>${v.RESIDENTE}</td><td>${estadoBadge(v.NOMBRE_ESTADO)}</td>
                <td><button class="btn-acc btn-vetar" onclick="eliminarVehiculo('${v.PLACA}')">✕ Baja</button></td>
            </tr>`
        ).join('') || '<tr><td colspan="5">Sin registros</td></tr>';
    } catch (e) { console.error('vehículos:', e); }
}

async function eliminarVehiculo(placa) {
    if (!confirm(`¿Dar de baja el vehículo ${placa}?`)) return;
    const r = await api({ accion:'eliminar_vehiculo', placa });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarVehiculos();
}

async function cargarSelectsAdmin() {
    try {
        const [tiposPago, formasPago, tiposServicio, tiposEvento, estados, residencias, personas, trabajadores] =
            await Promise.all([
                apiGet('listar_tipos_pago'),
                apiGet('listar_formas_pago'),
                apiGet('listar_tipos_servicio'),
                apiGet('listar_tipos_evento'),
                apiGet('listar_estados'),
                apiGet('listar_residencias'),
                apiGet('listar_personas'),
                apiGet('listar_trabajadores'),
            ]);

        const selEstG = document.querySelector('#guardias .bloque-formulario select');
        if (selEstG) llenarSelect(selEstG, estados, 'ID_ESTADO', 'NOMBRE_ESTADO');

        const selResRes = document.querySelector('#residentes .bloque-formulario select:nth-of-type(1)');
        if (selResRes) {
            selResRes.id = 'sel-residencia-residente';
            llenarSelect(selResRes, residencias, 'ID_RESIDENCIA', 'ID_RESIDENCIA');
            residencias.forEach((r, i) => {
                if (selResRes.options[i+1])
                    selResRes.options[i+1].textContent = `Res. ${r.ID_RESIDENCIA} — ₡${Number(r.MONTO_ALQUILER).toLocaleString()}`;
            });
        }
        const selEstR = document.querySelector('#residentes .bloque-formulario select:nth-of-type(2)');
        if (selEstR) llenarSelect(selEstR, estados, 'ID_ESTADO', 'NOMBRE_ESTADO');

        const selTipoR = document.querySelector('#residencias .bloque-formulario select:nth-of-type(1)');
        if (selTipoR) llenarSelect(selTipoR, tiposPago, 'ID_TIPO_PAGO', 'TIPO');
        const selEstRs = document.querySelector('#residencias .bloque-formulario select:nth-of-type(2)');
        if (selEstRs) llenarSelect(selEstRs, estados, 'ID_ESTADO', 'NOMBRE_ESTADO');

        const fSels = document.querySelectorAll('#facturas .bloque-formulario select');
        if (fSels[0]) llenarSelect(fSels[0], personas,   'ID_PERSONA',    'NOMBRE_COMPLETO');
        if (fSels[1]) llenarSelect(fSels[1], tiposPago,  'ID_TIPO_PAGO',  'TIPO');
        if (fSels[2]) llenarSelect(fSels[2], formasPago, 'ID_FORMA_PAGO', 'FORMA');
        if (fSels[3]) llenarSelect(fSels[3], estados,    'ID_ESTADO',     'NOMBRE_ESTADO');

        const sSels = document.querySelectorAll('#servicios .bloque-formulario select');
        if (sSels[0]) llenarSelect(sSels[0], tiposServicio, 'ID_TIPO_SERVICIO', 'TIPO_SERVICIO');
        if (sSels[1]) llenarSelect(sSels[1], trabajadores,  'ID_PERSONA',       'NOMBRE_COMPLETO');
        if (sSels[2]) llenarSelect(sSels[2], estados,       'ID_ESTADO',        'NOMBRE_ESTADO');

        const eSels = document.querySelectorAll('#eventos .bloque-formulario select');
        if (eSels[0]) llenarSelect(eSels[0], tiposEvento, 'ID_TIPO_EVENTO', 'TIPO_EVENTO');
        if (eSels[1]) llenarSelect(eSels[1], estados,     'ID_ESTADO',      'NOMBRE_ESTADO');

    } catch (e) { console.error('selects admin:', e); }
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

document.addEventListener('DOMContentLoaded', async () => {
    inyectarMensajes();
    asignarFormularios();
    await cargarSelectsAdmin();
    await Promise.all([
        cargarResumen(),
        cargarGuardias(),
        cargarResidentes(),
        cargarResidencias(),
        cargarVisitantes(),
        cargarPaquetes(),
        cargarFacturas(),
        cargarServicios(),
        cargarEventos(),
        cargarVehiculos(),
    ]);
});