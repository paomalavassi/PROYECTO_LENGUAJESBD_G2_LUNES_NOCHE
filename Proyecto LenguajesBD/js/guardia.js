const API = 'api/datos.php';

function mostrarSeccion(id) {
    document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activa'));
    document.getElementById(id).classList.add('activa');
}

async function api(params) {
    const form = new FormData();
    for (const [k, v] of Object.entries(params)) form.append(k, v ?? '');
    const res = await fetch(API, { method: 'POST', body: form });
    return res.json();
}

async function apiGet(accion, extra = {}) {
    const qs  = new URLSearchParams({ accion, ...extra });
    const res = await fetch(`${API}?${qs}`);
    return res.json();
}

function estadoBadge(estado) {
    const e = (estado || '').toLowerCase();
    if (e.includes('activ') || e.includes('dentro') || e.includes('entregad'))
        return `<span class="estado-activo">${estado}</span>`;
    if (e.includes('pend'))
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
    const el   = contenedor.querySelector(esError ? '.mensaje-error' : '.mensaje-exito');
    const otro = contenedor.querySelector(esError ? '.mensaje-exito' : '.mensaje-error');
    if (otro) otro.style.display = 'none';
    if (!el) return;
    el.textContent = texto;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
}

async function cargarResumenGuardia() {
    try {
        const r = await apiGet('resumen');
        const tarjetas = document.querySelectorAll('#inicio .tarjeta-resumen h3');
        const vals = [r.guardias, r.paquetes, r.eventos, 0];
        tarjetas.forEach((t, i) => { t.textContent = vals[i] ?? '--'; });

        const visitas = await apiGet('ultimas_visitas');
        const tb = document.querySelector('#inicio table tbody');
        tb.innerHTML = visitas.map(v =>
            `<tr>
                <td>${v.VISITANTE}</td>
                <td>${v.ID_RESIDENCIA ?? '--'}</td>
                <td>${v.FECHA_INGRESO}</td>
                <td>${estadoBadge(v.NOMBRE_ESTADO)}</td>
            </tr>`
        ).join('') || '<tr><td colspan="4">Sin visitas recientes</td></tr>';
    } catch (e) { console.error('Error resumen guardia:', e); }
}

async function cargarTurnos() {
    const tb = document.querySelector('#turnos table tbody');
    if (tb) tb.innerHTML = '<tr><td colspan="4">Sin turnos asignados</td></tr>';
}

async function cargarVisitantes() {
    try {
        const data = await apiGet('listar_visitas');
        const tb   = document.querySelector('#visitantes .bloque-tabla table tbody');
        tb.innerHTML = data.map(v =>
            `<tr>
                <td>${v.VISITANTE}</td>
                <td>${v.ID_RESIDENCIA}</td>
                <td>${v.FECHA_INGRESO}</td>
                <td>${v.FECHA_SALIDA ?? '--'}</td>
                <td>${estadoBadge(v.NOMBRE_ESTADO)}</td>
                <td>
                    <button class="btn-eliminar" onclick="eliminarVisita(${v.ID_VISITA})">Registrar salida</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="6">Sin visitantes</td></tr>';
    } catch (e) { console.error('Error visitantes:', e); }
}

async function eliminarVisita(id) {
    if (!confirm('¿Registrar salida de este visitante?')) return;
    const r = await api({ accion: 'eliminar_visita', id });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarVisitantes(); cargarResumenGuardia();
}

async function guardarVisita(e) {
    e.preventDefault();
    const form = document.querySelector('#visitantes .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select, textarea');
    const data = {
        accion:           'insertar_visita',
        nombre_visitante: inputs[0].value.trim(),
        id_residencia:    inputs[1].value,
        id_rol:           inputs[2].value,
        fecha_ingreso:    inputs[3].value,
        fecha_salida:     inputs[4].value,
        id_estado:        inputs[5].value,
        id_persona:       0,
    };
    if (!data.nombre_visitante) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'El nombre del visitante es requerido.', true);
        return;
    }
    const r = await api(data);
    if (r.error) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true);
    } else {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Visita registrada correctamente.');
        form.reset();
        cargarVisitantes(); cargarResumenGuardia();
    }
}

async function cargarPaquetes() {
    try {
        const data = await apiGet('listar_paquetes');
        const tb   = document.querySelector('#paquetes .bloque-tabla table tbody');
        tb.innerHTML = data.map(p =>
            `<tr>
                <td>${p.PERSONA}</td>
                <td>${p.ID_RESIDENCIA}</td>
                <td>${p.FECHA_INGRESO}</td>
                <td>${p.FECHA_SALIDA ?? 'Pendiente'}</td>
                <td>${estadoBadge(p.NOMBRE_ESTADO)}</td>
                <td>
                    <button class="btn-eliminar" onclick="eliminarPaquete(${p.ID_PAQUETE})">Marcar entregado</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="6">Sin paquetes</td></tr>';
    } catch (e) { console.error('Error paquetes:', e); }
}

async function eliminarPaquete(id) {
    if (!confirm('¿Marcar este paquete como entregado?')) return;
    const r = await api({ accion: 'eliminar_paquete', id });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarPaquetes(); cargarResumenGuardia();
}

async function guardarPaquete(e) {
    e.preventDefault();
    const form = document.querySelector('#paquetes .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select, textarea');
    const data = {
        accion:        'insertar_paquete',
        id_persona:    0,
        id_residencia: inputs[1].value,
        fecha_ingreso: inputs[2].value,
        fecha_salida:  inputs[3].value,
        id_estado:     inputs[4].value,
    };
    const r = await api(data);
    if (r.error) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true);
    } else {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Paquete registrado.');
        form.reset();
        cargarPaquetes(); cargarResumenGuardia();
    }
}

async function cargarVehiculos() {
    try {
        const data = await apiGet('listar_vehiculos');
        const tb   = document.querySelector('#vehiculos .bloque-tabla table tbody');
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
        ).join('') || '<tr><td colspan="5">Sin vehículos</td></tr>';
    } catch (e) { console.error('Error vehículos:', e); }
}

async function eliminarVehiculo(placa) {
    if (!confirm(`¿Dar de baja el vehículo ${placa}?`)) return;
    const r = await api({ accion: 'eliminar_vehiculo', placa });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarVehiculos();
}

async function guardarVehiculo(e) {
    e.preventDefault();
    const form = document.querySelector('#vehiculos .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select');
    const data = {
        accion:          'insertar_vehiculo',
        placa:           inputs[0].value.trim().toUpperCase(),
        descripcion:     inputs[1].value.trim(),
        id_persona:      inputs[2].value,
        id_estado:       inputs[3].value,
        id_tipo_espacio: 1,
    };
    if (!data.placa) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'La placa es requerida.', true);
        return;
    }
    const r = await api(data);
    if (r.error) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true);
    } else {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Vehículo registrado.');
        form.reset();
        cargarVehiculos();
    }
}

async function cargarEventos() {
    try {
        const data = await apiGet('listar_eventos');
        const tb   = document.querySelector('#eventos .bloque-tabla table tbody');
        tb.innerHTML = data.map(ev =>
            `<tr>
                <td>${ev.DESCR_EVENTO}</td>
                <td>${ev.TIPO_EVENTO}</td>
                <td>${ev.FECHA_EVENTO}</td>
                <td>${estadoBadge(ev.NOMBRE_ESTADO)}</td>
                <td>
                    <button class="btn-eliminar" onclick="eliminarEvento(${ev.ID_EVENTO})">Cerrar</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="5">Sin eventos</td></tr>';
    } catch (e) { console.error('Error eventos:', e); }
}

async function eliminarEvento(id) {
    if (!confirm('¿Cerrar este evento/incidente?')) return;
    const r = await api({ accion: 'eliminar_evento', id });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarEventos();
}

async function guardarEvento(e) {
    e.preventDefault();
    const form = document.querySelector('#eventos .bloque-formulario form');
    const inputs = form.querySelectorAll('input, select, textarea');
    const data = {
        accion:          'insertar_evento',
        descr_evento:    inputs[0].value.trim(),
        id_tipo_evento:  inputs[1].value,
        fecha_evento:    inputs[2].value,
        id_estado:       inputs[3].value,
        id_tipo_espacio: 1,
    };
    if (!data.descr_evento) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'La descripción es requerida.', true);
        return;
    }
    const r = await api(data);
    if (r.error) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true);
    } else {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Evento registrado.');
        form.reset();
        cargarEventos();
    }
}

async function cargarResidentes() {
    try {
        const data = await apiGet('listar_residentes');
        const tb   = document.querySelector('#residentes table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(r =>
            `<tr>
                <td>${r.NOMBRE}</td>
                <td>${r.APELLIDO_PATERNO}</td>
                <td>${r.APELLIDO_MATERNO}</td>
                <td>${r.TELEFONO ?? '--'}</td>
                <td>${r.ID_RESIDENCIA ?? '--'}</td>
                <td>${estadoBadge(r.NOMBRE_ESTADO)}</td>
            </tr>`
        ).join('') || '<tr><td colspan="6">Sin residentes</td></tr>';
    } catch (e) { console.error('Error residentes:', e); }
}

async function cargarResidencias() {
    try {
        const data = await apiGet('listar_residencias');
        const tb   = document.querySelector('#residencias table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(r =>
            `<tr>
                <td>${r.ID_RESIDENCIA}</td>
                <td>₡${Number(r.MONTO_ALQUILER).toLocaleString()}</td>
                <td>₡${Number(r.MONTO_MANTENIMIENTO).toLocaleString()}</td>
                <td>${r.TIPO_PAGO ?? '--'}</td>
                <td>${estadoBadge(r.NOMBRE_ESTADO)}</td>
            </tr>`
        ).join('') || '<tr><td colspan="5">Sin residencias</td></tr>';
    } catch (e) { console.error('Error residencias:', e); }
}

async function cargarSelectsGuardia() {
    try {
        const [residencias, roles, estados, tiposEvento, personas] = await Promise.all([
            apiGet('listar_residencias'),
            apiGet('listar_roles'),
            apiGet('listar_estados'),
            apiGet('listar_tipos_evento'),
            apiGet('listar_personas'),
        ]);

        const visSelRes = document.querySelector('#visitantes .bloque-formulario select:nth-of-type(1)');
        if (visSelRes) {
            llenarSelect(visSelRes, residencias, 'ID_RESIDENCIA', 'ID_RESIDENCIA');
            residencias.forEach((r, i) => {
                if (visSelRes.options[i + 1])
                    visSelRes.options[i + 1].textContent = `Res. ${r.ID_RESIDENCIA} — ₡${Number(r.MONTO_ALQUILER).toLocaleString()}`;
            });
        }

        const visSelRol = document.querySelector('#visitantes .bloque-formulario select:nth-of-type(2)');
        if (visSelRol) llenarSelect(visSelRol, roles, 'ID_ROL', 'ROL');

        const visSelEst = document.querySelector('#visitantes .bloque-formulario select:nth-of-type(3)');
        if (visSelEst) llenarSelect(visSelEst, estados, 'ID_ESTADO', 'NOMBRE_ESTADO');

        const paqSelRes = document.querySelector('#paquetes .bloque-formulario select:nth-of-type(1)');
        if (paqSelRes) {
            llenarSelect(paqSelRes, residencias, 'ID_RESIDENCIA', 'ID_RESIDENCIA');
            residencias.forEach((r, i) => {
                if (paqSelRes.options[i + 1])
                    paqSelRes.options[i + 1].textContent = `Res. ${r.ID_RESIDENCIA}`;
            });
        }
        const paqSelEst = document.querySelector('#paquetes .bloque-formulario select:nth-of-type(2)');
        if (paqSelEst) llenarSelect(paqSelEst, estados, 'ID_ESTADO', 'NOMBRE_ESTADO');

        const vehSelPer = document.querySelector('#vehiculos .bloque-formulario select:nth-of-type(1)');
        if (vehSelPer) llenarSelect(vehSelPer, personas, 'ID_PERSONA', 'NOMBRE_COMPLETO');

        const vehSelEst = document.querySelector('#vehiculos .bloque-formulario select:nth-of-type(2)');
        if (vehSelEst) llenarSelect(vehSelEst, estados, 'ID_ESTADO', 'NOMBRE_ESTADO');

        const evSelTipo = document.querySelector('#eventos .bloque-formulario select:nth-of-type(1)');
        if (evSelTipo) llenarSelect(evSelTipo, tiposEvento, 'ID_TIPO_EVENTO', 'TIPO_EVENTO');

        const evSelEst = document.querySelector('#eventos .bloque-formulario select:nth-of-type(2)');
        if (evSelEst) llenarSelect(evSelEst, estados, 'ID_ESTADO', 'NOMBRE_ESTADO');

    } catch (e) { console.error('Error cargando selects guardia:', e); }
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
    const btnVisita   = document.querySelector('#visitantes .bloque-formulario form button[type="submit"]');
    const btnPaquete  = document.querySelector('#paquetes   .bloque-formulario form button[type="submit"]');
    const btnVehiculo = document.querySelector('#vehiculos  .bloque-formulario form button[type="submit"]');
    const btnEvento   = document.querySelector('#eventos    .bloque-formulario form button[type="submit"]');

    if (btnVisita)   btnVisita.closest('form').addEventListener('submit', guardarVisita);
    if (btnPaquete)  btnPaquete.closest('form').addEventListener('submit', guardarPaquete);
    if (btnVehiculo) btnVehiculo.closest('form').addEventListener('submit', guardarVehiculo);
    if (btnEvento)   btnEvento.closest('form').addEventListener('submit', guardarEvento);

    document.querySelectorAll('.btn-limpiar').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('form').reset());
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    inyectarMensajes();
    asignarFormularios();

    await cargarSelectsGuardia();

    await Promise.all([
        cargarResumenGuardia(),
        cargarTurnos(),
        cargarVisitantes(),
        cargarPaquetes(),
        cargarVehiculos(),
        cargarEventos(),
        cargarResidentes(),
        cargarResidencias(),
    ]);
});