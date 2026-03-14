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

    if (['ACTIVO','ADENTRO','ENTREGADO','EN PROCESO','RESUELTO','PAGADO',
         'OCUPADO','LIBRE','RESERVADO'].includes(e))
        return `<span class="estado-activo">${estado}</span>`;

    if (['PENDIENTE','AFUERA','PROGRAMADO','EN MANTENIMIENTO','EN VACACIONES'].includes(e))
        return `<span class="estado-pendiente">${estado}</span>`;

    return `<span class="estado-inactivo">${estado}</span>`;
}

function llenarSelect(selectEl, items, valField, textField) {
    selectEl.innerHTML = '<option value="">-- Seleccione --</option>';
    items.forEach(i => {
        const opt = document.createElement('option');
        opt.value       = i[valField];
        opt.textContent = i[textField];
        selectEl.appendChild(opt);
    });
}

function mostrarMensaje(contenedor, texto, esError = false) {
    const el = contenedor.querySelector(esError ? '.mensaje-error' : '.mensaje-exito');
    const otro = contenedor.querySelector(esError ? '.mensaje-exito' : '.mensaje-error');
    if (otro) otro.style.display = 'none';
    if (!el) return;
    el.textContent = texto;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

async function cargarResumen() {
    try {
        const r = await apiGet('resumen');
        const tarjetas = document.querySelectorAll('#inicio .tarjeta-resumen h3');
        const vals = [r.guardias, r.residentes, r.residencias, r.paquetes, r.eventos, r.facturas];
        tarjetas.forEach((t, i) => { t.textContent = vals[i] ?? '--'; });

        const eventos = await apiGet('ultimos_eventos');
        const tb = document.querySelector('#inicio table tbody');
        if (!tb) return;
        tb.innerHTML = eventos.map(ev =>
            `<tr>
                <td>${ev.DESCR_EVENTO}</td>
                <td>${ev.TIPO_EVENTO}</td>
                <td>${ev.FECHA_EVENTO}</td>
                <td>${estadoBadge(ev.NOMBRE_ESTADO)}</td>
            </tr>`
        ).join('') || '<tr><td colspan="4">Sin eventos recientes</td></tr>';
    } catch (e) { console.error('Error resumen:', e); }
}

async function cargarGuardias() {
    try {
        const data = await apiGet('listar_guardias');
        const tb   = document.querySelector('#guardias .bloque-tabla table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(g =>
            `<tr>
                <td>${g.NOMBRE}</td>
                <td>${g.APELLIDO_PATERNO} ${g.APELLIDO_MATERNO}</td>
                <td>${g.TELEFONO ?? '--'}</td>
                <td>${g.CORREO ?? '--'}</td>
                <td>${estadoBadge(g.NOMBRE_ESTADO)}</td>
                <td>
                    <button class="btn-eliminar" onclick="eliminarPersona(${g.ID_PERSONA},'guardias')">Dar de baja</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="6">Sin registros</td></tr>';
    } catch (e) { console.error('Error guardias:', e); }
}

async function guardarGuardia(e) {
    e.preventDefault();
    const form = document.querySelector('#guardias .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select');
    const data = {
        accion:            'insertar_guardia',
        nombre:            inputs[0].value.trim(),
        apellido_paterno:  inputs[1].value.trim(),
        apellido_materno:  inputs[2].value.trim(),
        telefono:          inputs[3].value.trim(),
        correo:            inputs[4].value.trim(),
        id_estado:         inputs[5].value,
    };
    if (!data.nombre) { mostrarMensaje(form.closest('.bloque-formulario'), 'El nombre es requerido.', true); return; }
    const r = await api(data);
    if (r.error) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true);
    } else {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Guardia registrado correctamente.');
        form.reset();
        cargarGuardias();
        cargarResumen();
    }
}

async function eliminarPersona(id, seccion) {
    if (!confirm('¿Dar de baja este registro? El cambio es lógico (cambia estado a Inactivo).')) return;
    const r = await api({ accion: 'eliminar_persona', id });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    if (seccion === 'guardias')   { cargarGuardias();   cargarResumen(); }
    if (seccion === 'residentes') { cargarResidentes(); cargarResumen(); }
}

async function cargarResidentes() {
    try {
        const data = await apiGet('listar_residentes');
        const tb   = document.querySelector('#residentes .bloque-tabla table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(r =>
            `<tr>
                <td>${r.NOMBRE}</td>
                <td>${r.APELLIDO_PATERNO} ${r.APELLIDO_MATERNO}</td>
                <td>${r.TELEFONO ?? '--'}</td>
                <td>${r.CORREO ?? '--'}</td>
                <td>${r.ID_RESIDENCIA ?? '--'}</td>
                <td>${estadoBadge(r.NOMBRE_ESTADO)}</td>
                <td>
                    <button class="btn-eliminar" onclick="eliminarPersona(${r.ID_PERSONA},'residentes')">Dar de baja</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="7">Sin registros</td></tr>';
    } catch (e) { console.error('Error residentes:', e); }
}

async function cargarSelectResidencias(selectId) {
    const data = await apiGet('listar_residencias');
    const sel  = document.getElementById(selectId);
    if (!sel) return;
    llenarSelect(sel, data, 'ID_RESIDENCIA', 'ID_RESIDENCIA');
    data.forEach((r, i) => {
        if (sel.options[i + 1])
            sel.options[i + 1].textContent = `Res. ${r.ID_RESIDENCIA} — ₡${Number(r.MONTO_ALQUILER).toLocaleString()}`;
    });
}

async function guardarResidente(e) {
    e.preventDefault();
    const form = document.querySelector('#residentes .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select');
    const data = {
        accion:           'insertar_residente',
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
        mostrarMensaje(form.closest('.bloque-formulario'), 'Residente registrado correctamente.');
        form.reset();
        cargarResidentes();
        cargarResumen();
    }
}

async function cargarResidencias() {
    try {
        const data = await apiGet('listar_residencias');
        const tb   = document.querySelector('#residencias .bloque-tabla table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(r =>
            `<tr>
                <td>${r.ID_RESIDENCIA}</td>
                <td>₡${Number(r.MONTO_ALQUILER).toLocaleString()}</td>
                <td>₡${Number(r.MONTO_MANTENIMIENTO).toLocaleString()}</td>
                <td>${r.TIPO_PAGO ?? '--'}</td>
                <td>${estadoBadge(r.NOMBRE_ESTADO)}</td>
                <td>
                    <button class="btn-eliminar" onclick="eliminarResidencia(${r.ID_RESIDENCIA})">Dar de baja</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="6">Sin registros</td></tr>';
    } catch (e) { console.error('Error residencias:', e); }
}

async function eliminarResidencia(id) {
    if (!confirm('¿Dar de baja esta residencia?')) return;
    const r = await api({ accion: 'eliminar_residencia', id });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarResidencias(); cargarResumen();
}

async function guardarResidencia(e) {
    e.preventDefault();
    const form = document.querySelector('#residencias .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select');
    const data = {
        accion:              'insertar_residencia',
        monto_alquiler:      inputs[0].value,
        monto_mantenimiento: inputs[1].value,
        id_tipo_pago:        inputs[2].value,
        id_estado:           inputs[3].value,
    };
    const r = await api(data);
    if (r.error) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true);
    } else {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Residencia creada correctamente.');
        form.reset();
        cargarResidencias(); cargarResumen();
        cargarSelectResidencias('sel-residencia-residente');
    }
}

async function cargarVisitantes() {
    try {
        const data = await apiGet('listar_visitas');
        const tb   = document.querySelector('#visitantes table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(v =>
            `<tr>
                <td>${v.VISITANTE}</td>
                <td>${v.ROL ?? '--'}</td>
                <td>${v.ID_RESIDENCIA ?? '--'}</td>
                <td>${v.FECHA_INGRESO}</td>
                <td>${v.FECHA_SALIDA ?? '--'}</td>
                <td>${estadoBadge(v.NOMBRE_ESTADO)}</td>
                <td>
                    <button class="btn-eliminar" onclick="eliminarVisita(${v.ID_VISITA})">Dar de baja</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="7">Sin registros</td></tr>';
    } catch (e) { console.error('Error visitantes:', e); }
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
        const tb   = document.querySelector('#paquetes table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(p =>
            `<tr>
                <td>${p.PERSONA}</td>
                <td>${p.ID_RESIDENCIA ?? '--'}</td>
                <td>${p.FECHA_INGRESO}</td>
                <td>${p.FECHA_SALIDA ?? '--'}</td>
                <td>${estadoBadge(p.NOMBRE_ESTADO)}</td>
                <td>
                    <button class="btn-eliminar" onclick="eliminarPaquete(${p.ID_PAQUETE})">Dar de baja</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="6">Sin registros</td></tr>';
    } catch (e) { console.error('Error paquetes:', e); }
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
        const tb   = document.querySelector('#facturas .bloque-tabla table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(f =>
            `<tr>
                <td>${f.FECHA_FACTURA}</td>
                <td>${f.DESCR_FACTURA}</td>
                <td>${f.RESIDENTE}</td>
                <td>${f.TIPO_PAGO}</td>
                <td>${f.FORMA_PAGO}</td>
                <td>${estadoBadge(f.NOMBRE_ESTADO)}</td>
                <td>
                    <button class="btn-eliminar" onclick="eliminarFactura(${f.ID_FACTURA})">Anular</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="7">Sin registros</td></tr>';
    } catch (e) { console.error('Error facturas:', e); }
}

async function eliminarFactura(id) {
    if (!confirm('¿Anular esta factura? El cambio es lógico.')) return;
    const r = await api({ accion: 'eliminar_factura', id });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarFacturas(); cargarResumen();
}

async function guardarFactura(e) {
    e.preventDefault();
    const form = document.querySelector('#facturas .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select, textarea');
    const data = {
        accion:        'insertar_factura',
        fecha_factura: inputs[0].value,
        descr_factura: inputs[1].value.trim(),
        id_persona:    inputs[2].value,
        id_tipo_pago:  inputs[3].value,
        id_forma_pago: inputs[4].value,
        id_estado:     inputs[5].value,
    };
    if (!data.descr_factura) { mostrarMensaje(form.closest('.bloque-formulario'), 'La descripción es requerida.', true); return; }
    if (!data.id_persona)    { mostrarMensaje(form.closest('.bloque-formulario'), 'Debe seleccionar el residente.', true); return; }
    const r = await api(data);
    if (r.error) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true);
    } else {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Factura guardada correctamente.');
        form.reset();
        cargarFacturas(); cargarResumen();
    }
}

async function cargarServicios() {
    try {
        const data = await apiGet('listar_servicios');
        const tb   = document.querySelector('#servicios .bloque-tabla table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(s =>
            `<tr>
                <td>${s.DESCR_SERVICIO}</td>
                <td>${s.TIPO_SERVICIO}</td>
                <td>${s.FECHA_SALIDA ?? '--'}</td>
                <td>${s.PERSONAS ?? '--'}</td>
                <td>${estadoBadge(s.NOMBRE_ESTADO)}</td>
                <td>
                    <button class="btn-eliminar" onclick="eliminarServicio(${s.ID_SERVICIO})">Dar de baja</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="6">Sin registros</td></tr>';
    } catch (e) { console.error('Error servicios:', e); }
}

async function eliminarServicio(id) {
    if (!confirm('¿Dar de baja este servicio?')) return;
    const r = await api({ accion: 'eliminar_servicio', id });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarServicios();
}

async function guardarServicio(e) {
    e.preventDefault();
    const form = document.querySelector('#servicios .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select, textarea');
    const data = {
        accion:              'insertar_servicio',
        descr_servicio:      inputs[0].value.trim(),
        id_tipo_servicio:    inputs[1].value,
        id_persona_servicio: inputs[2].value,
        fecha_salida:        inputs[3].value,
        id_estado:           inputs[4].value,
        id_tipo_evento:      1,
    };
    if (!data.descr_servicio) { mostrarMensaje(form.closest('.bloque-formulario'), 'La descripción es requerida.', true); return; }
    const r = await api(data);
    if (r.error) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true);
    } else {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Servicio registrado.');
        form.reset();
        cargarServicios();
    }
}

async function cargarEventos() {
    try {
        const data = await apiGet('listar_eventos');
        const tb   = document.querySelector('#eventos .bloque-tabla table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(ev =>
            `<tr>
                <td>${ev.DESCR_EVENTO}</td>
                <td>${ev.TIPO_EVENTO}</td>
                <td>${ev.FECHA_EVENTO}</td>
                <td>${estadoBadge(ev.NOMBRE_ESTADO)}</td>
                <td>
                    <button class="btn-eliminar" onclick="eliminarEvento(${ev.ID_EVENTO})">Dar de baja</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="5">Sin registros</td></tr>';
    } catch (e) { console.error('Error eventos:', e); }
}

async function eliminarEvento(id) {
    if (!confirm('¿Dar de baja este evento?')) return;
    const r = await api({ accion: 'eliminar_evento', id });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarEventos(); cargarResumen();
}

async function guardarEvento(e) {
    e.preventDefault();
    const form = document.querySelector('#eventos .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select, textarea');
    const data = {
        accion:           'insertar_evento',
        descr_evento:     inputs[0].value.trim(),
        id_tipo_evento:   inputs[1].value,
        fecha_evento:     inputs[2].value,
        id_estado:        inputs[3].value,
        id_tipo_espacio:  1,
    };
    if (!data.descr_evento) { mostrarMensaje(form.closest('.bloque-formulario'), 'La descripción es requerida.', true); return; }
    if (!data.id_tipo_evento) { mostrarMensaje(form.closest('.bloque-formulario'), 'Debe seleccionar el tipo de evento.', true); return; }
    const r = await api(data);
    if (r.error) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true);
    } else {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Evento registrado.');
        form.reset();
        cargarEventos(); cargarResumen();
    }
}

async function cargarVehiculos() {
    try {
        const data = await apiGet('listar_vehiculos');
        const tb   = document.querySelector('#vehiculos table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(v =>
            `<tr>
                <td>${v.PLACA}</td>
                <td>${v.DESCRIPCION}</td>
                <td>${v.RESIDENTE}</td>
                <td>${estadoBadge(v.NOMBRE_ESTADO)}</td>
                <td>
                    <button class="btn-eliminar" onclick="eliminarVehiculo('${v.PLACA}')">Dar de baja</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="5">Sin registros</td></tr>';
    } catch (e) { console.error('Error vehículos:', e); }
}

async function eliminarVehiculo(placa) {
    if (!confirm(`¿Dar de baja el vehículo ${placa}?`)) return;
    const r = await api({ accion: 'eliminar_vehiculo', placa });
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

        const selEstGuardia = document.querySelector('#guardias .bloque-formulario select');
        if (selEstGuardia) llenarSelect(selEstGuardia, estados, 'ID_ESTADO', 'NOMBRE_ESTADO');

        const selResRes = document.querySelector('#residentes .bloque-formulario select:nth-of-type(1)');
        if (selResRes) {
            selResRes.id = 'sel-residencia-residente';
            llenarSelect(selResRes, residencias, 'ID_RESIDENCIA', 'ID_RESIDENCIA');
            residencias.forEach((r, i) => {
                if (selResRes.options[i + 1])
                    selResRes.options[i + 1].textContent = `Res. ${r.ID_RESIDENCIA} — ₡${Number(r.MONTO_ALQUILER).toLocaleString()}`;
            });
        }
        const selEstRes = document.querySelector('#residentes .bloque-formulario select:nth-of-type(2)');
        if (selEstRes) llenarSelect(selEstRes, estados, 'ID_ESTADO', 'NOMBRE_ESTADO');

        const selTipoPagoRes = document.querySelector('#residencias .bloque-formulario select:nth-of-type(1)');
        if (selTipoPagoRes) llenarSelect(selTipoPagoRes, tiposPago, 'ID_TIPO_PAGO', 'TIPO');
        const selEstResi = document.querySelector('#residencias .bloque-formulario select:nth-of-type(2)');
        if (selEstResi) llenarSelect(selEstResi, estados, 'ID_ESTADO', 'NOMBRE_ESTADO');

        const facturaSels = document.querySelectorAll('#facturas .bloque-formulario select');
        if (facturaSels[0]) llenarSelect(facturaSels[0], personas,   'ID_PERSONA',    'NOMBRE_COMPLETO');
        if (facturaSels[1]) llenarSelect(facturaSels[1], tiposPago,  'ID_TIPO_PAGO',  'TIPO');
        if (facturaSels[2]) llenarSelect(facturaSels[2], formasPago, 'ID_FORMA_PAGO', 'FORMA');
        if (facturaSels[3]) llenarSelect(facturaSels[3], estados,    'ID_ESTADO',     'NOMBRE_ESTADO');

        const servSels = document.querySelectorAll('#servicios .bloque-formulario select');
        if (servSels[0]) llenarSelect(servSels[0], tiposServicio, 'ID_TIPO_SERVICIO', 'TIPO_SERVICIO');
        if (servSels[1]) llenarSelect(servSels[1], trabajadores,  'ID_PERSONA',       'NOMBRE_COMPLETO');
        if (servSels[2]) llenarSelect(servSels[2], estados,       'ID_ESTADO',        'NOMBRE_ESTADO');

        const evSels = document.querySelectorAll('#eventos .bloque-formulario select');
        if (evSels[0]) llenarSelect(evSels[0], tiposEvento, 'ID_TIPO_EVENTO', 'TIPO_EVENTO');
        if (evSels[1]) llenarSelect(evSels[1], estados,     'ID_ESTADO',      'NOMBRE_ESTADO');

    } catch (e) { console.error('Error cargando selects:', e); }
}

function inyectarMensajes() {
    document.querySelectorAll('.bloque-formulario form').forEach(form => {
        if (!form.querySelector('.mensaje-error')) {
            const err = document.createElement('p');
            err.className = 'mensaje-error';
            form.appendChild(err);
        }
        if (!form.querySelector('.mensaje-exito')) {
            const ok = document.createElement('p');
            ok.className = 'mensaje-exito';
            form.appendChild(ok);
        }
    });
}

function asignarFormularios() {
    const btnGuardia   = document.querySelector('#guardias   .bloque-formulario form button[type="submit"]');
    const btnResidente = document.querySelector('#residentes .bloque-formulario form button[type="submit"]');
    const btnResidencia= document.querySelector('#residencias .bloque-formulario form button[type="submit"]');
    const btnFactura   = document.querySelector('#facturas   .bloque-formulario form button[type="submit"]');
    const btnServicio  = document.querySelector('#servicios  .bloque-formulario form button[type="submit"]');
    const btnEvento    = document.querySelector('#eventos    .bloque-formulario form button[type="submit"]');

    if (btnGuardia)    btnGuardia.closest('form').addEventListener('submit',   guardarGuardia);
    if (btnResidente)  btnResidente.closest('form').addEventListener('submit', guardarResidente);
    if (btnResidencia) btnResidencia.closest('form').addEventListener('submit',guardarResidencia);
    if (btnFactura)    btnFactura.closest('form').addEventListener('submit',   guardarFactura);
    if (btnServicio)   btnServicio.closest('form').addEventListener('submit',  guardarServicio);
    if (btnEvento)     btnEvento.closest('form').addEventListener('submit',    guardarEvento);

    document.querySelectorAll('.btn-limpiar').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('form').reset());
    });
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