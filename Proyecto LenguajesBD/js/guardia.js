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
    const e = (estado || '').toUpperCase();
    if (['ACTIVO','ADENTRO','ENTREGADO','EN PROCESO','RESUELTO','PAGADO','OCUPADO'].includes(e))
        return `<span class="estado-activo">${estado}</span>`;
    if (['PENDIENTE','AFUERA','PROGRAMADO','EN MANTENIMIENTO','EN VACACIONES'].includes(e))
        return `<span class="estado-pendiente">${estado}</span>`;
    if (e === 'LIBRE')     return `<span class="estado-libre">${estado}</span>`;
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

// Guardias NO pueden poner Inactivo (ID 2)
// IDs por sección — sin ID 2 para guardia
const ESTADOS_GUARDIA_SECCION = {
    visitantes: [4, 5],         // Adentro, Afuera
    paquetes:   [16, 3],        // Entregado, Pendiente
    vehiculos:  [4, 5, 6],      // Adentro, Afuera, Vetado
    eventos:    [12, 13, 14],   // Programado, En proceso, Resuelto
    espacios:   [9, 10, 7, 8],  // Reservado, Libre, En mantenimiento, Ocupado
};

function filtrarEstados(todos, ids) {
    return ids.map(id => todos.find(e => Number(e.ID_ESTADO) === id)).filter(Boolean);
}

function mostrarMensaje(contenedor, texto, esError = false) {
    const cls  = esError ? '.mensaje-error' : '.mensaje-exito';
    const otro = esError ? '.mensaje-exito' : '.mensaje-error';
    const el   = contenedor.querySelector(cls);
    const ot   = contenedor.querySelector(otro);
    if (ot) ot.style.display = 'none';
    if (!el) return;
    el.textContent = texto;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

function cambiarTabVehiculos(tab) {
    document.querySelectorAll('.tabs-seccion .tab-btn').forEach((b, i) => {
        b.classList.toggle('activo', (i === 0 && tab === 'residentes') || (i === 1 && tab === 'visitas'));
    });
    document.getElementById('tab-veh-residentes').classList.toggle('activo', tab === 'residentes');
    document.getElementById('tab-veh-visitas').classList.toggle('activo',    tab === 'visitas');
}

async function cargarResumenGuardia() {
    try {
        const r = await apiGet('resumen');
        const tarjetas = document.querySelectorAll('#inicio .tarjeta-resumen h3');
        [r.guardias, r.paquetes, r.eventos, 0].forEach((v, i) => {
            if (tarjetas[i]) tarjetas[i].textContent = v ?? '--';
        });
        const visitas = await apiGet('ultimas_visitas');
        const tb = document.querySelector('#inicio table tbody');
        if (!tb) return;
        tb.innerHTML = visitas.map(v =>
            `<tr><td>${v.VISITANTE}</td><td>${v.ID_RESIDENCIA ?? '--'}</td>
             <td>${v.FECHA_INGRESO}</td><td>${estadoBadge(v.NOMBRE_ESTADO)}</td></tr>`
        ).join('') || '<tr><td colspan="4">Sin visitas recientes</td></tr>';
    } catch (e) { console.error('resumen:', e); }
}

async function cargarTurnos() {
    try {
        const data = await apiGet('listar_turnos');
        const tb   = document.querySelector('#turnos table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(t =>
            `<tr><td>${t.GUARDIA}</td><td>${t.FECHA_TURNO ?? t.FECHA}</td>
             <td>${t.HORARIO}</td><td>${estadoBadge(t.NOMBRE_ESTADO)}</td></tr>`
        ).join('') || '<tr><td colspan="4">Sin turnos</td></tr>';
        refiltrar('#turnos');
    } catch (e) { console.error('turnos:', e); }
}

async function cargarVisitantes() {
    try {
        const data = await apiGet('listar_visitas');
        const tb   = document.querySelector('#visitantes .bloque-tabla table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(v => `
            <tr>
                <td>${v.VISITANTE}</td>
                <td>${v.ID_RESIDENCIA ?? '--'}</td>
                <td>${v.FECHA_INGRESO}</td>
                <td>${v.FECHA_SALIDA ?? '--'}</td>
                <td>${estadoBadge(v.NOMBRE_ESTADO)}</td>
                <td class="acciones-celda">
                    <button class="btn-acc btn-adentro" onclick="cambiarEstadoVisita(${v.ID_VISITA},4)" title="Registrar ingreso">↓ Adentro</button>
                    <button class="btn-acc btn-salida"  onclick="cambiarEstadoVisita(${v.ID_VISITA},5)" title="Registrar salida">↑ Salida</button>
                    <button class="btn-acc btn-vetar"   onclick="cambiarEstadoVisita(${v.ID_VISITA},6)" title="Vetar visitante">✕ Vetar</button>
                    <button class="btn-acc btn-editar"  onclick="editarVisita(${v.ID_VISITA},'${(v.VISITANTE||'').replace(/'/g,"\\'")}',${v.ID_RESIDENCIA??0},${v.ROL_ID??0},'${v.FECHA_INGRESO??''}','${v.FECHA_SALIDA??''}',${v.ID_ESTADO??4})">✎ Editar</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="6">Sin visitantes</td></tr>';
        refiltrar('#visitantes');
    } catch (e) { console.error('visitantes:', e); }
}

async function cambiarEstadoVisita(id, estado) {
    const etiquetas = { 4:'Adentro', 5:'Salida', 6:'Vetar' };
    if (!confirm(`¿${etiquetas[estado]} esta visita?`)) return;
    const r = await api({ accion:'actualizar_estado_visita', id, estado });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarVisitantes(); cargarResumenGuardia();
}

function editarVisita(id, visitante, idResidencia, idRol, fechaIngreso, fechaSalida, idEstado) {
    const form = document.getElementById('form-visitante');
    if (!form) return;
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs[0].value = visitante;
    if (inputs[1]) inputs[1].value = idResidencia;
    if (inputs[2]) inputs[2].value = idRol;
    if (inputs[3]) inputs[3].value = fechaIngreso;
    if (inputs[4]) inputs[4].value = fechaSalida;
    if (inputs[5]) inputs[5].value = idEstado;
    form.dataset.editId = id;
    const titulo = form.closest('.bloque-formulario').querySelector('h3');
    if (titulo) titulo.textContent = '✎ Editar Visitante';
    mostrarCancelarEdicion(form);
    form.querySelector('button[type="submit"]').textContent = 'Actualizar';
    form.closest('.bloque-formulario').scrollIntoView({ behavior: 'smooth' });
}

async function guardarVisita(e) {
    e.preventDefault();
    const form   = document.getElementById('form-visitante');
    const inputs = form.querySelectorAll('input, select, textarea');
    const editId = form.dataset.editId;

    if (editId) {
        const idEstado = parseInt(inputs[5]?.value ?? 0);
        if (!idEstado) { mostrarMensaje(form.closest('.bloque-formulario'), 'Seleccione un estado.', true); return; }
        if (![4,5,6].includes(idEstado)) {
            mostrarMensaje(form.closest('.bloque-formulario'), 'Solo puede usar estados: Adentro, Salida o Vetado.', true);
            return;
        }
        const r = await api({ accion:'actualizar_estado_visita', id:editId, estado:idEstado });
        if (r.error) { mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true); return; }
        mostrarMensaje(form.closest('.bloque-formulario'), 'Estado actualizado.');
        cancelarEdicionVisita();
        cargarVisitantes();
        return;
    }

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

    if (!data.nombre_visitante) { mostrarMensaje(form.closest('.bloque-formulario'), 'El nombre es requerido.', true); return; }
    if (!data.id_residencia)    { mostrarMensaje(form.closest('.bloque-formulario'), 'Seleccione una residencia.', true); return; }
    if (data.id_estado == '2')  { mostrarMensaje(form.closest('.bloque-formulario'), 'No puede poner estado Inactivo.', true); return; }

    const r = await api(data);
    if (r.error) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true);
    } else {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Visita registrada.');
        form.reset(); delete form.dataset.editId;
        resetFormTitulo(form, 'Registrar Visitante');
        cargarVisitantes(); cargarResumenGuardia();
    }
}

function cancelarEdicionVisita() {
    const form = document.getElementById('form-visitante');
    if (!form) return;
    form.reset(); delete form.dataset.editId;
    resetFormTitulo(form, 'Registrar Visitante');
    ocultarCancelarEdicion(form);
    form.querySelector('button[type="submit"]').textContent = 'Guardar';
}

async function cargarPaquetes() {
    try {
        const data = await apiGet('listar_paquetes');
        const tb   = document.querySelector('#paquetes .bloque-tabla table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(p => `
            <tr>
                <td>${p.PERSONA}</td>
                <td>${p.ID_RESIDENCIA ?? '--'}</td>
                <td>${p.FECHA_INGRESO}</td>
                <td>${p.FECHA_SALIDA ?? 'Pendiente'}</td>
                <td>${estadoBadge(p.NOMBRE_ESTADO)}</td>
                <td class="acciones-celda">
                    <button class="btn-acc btn-adentro" onclick="marcarEntregado(${p.ID_PAQUETE})">✔ Entregado</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="6">Sin paquetes</td></tr>';
        refiltrar('#paquetes');
    } catch (e) { console.error('paquetes:', e); }
}

async function marcarEntregado(id) {
    if (!confirm('¿Registrar la entrega del paquete ahora?')) return;
    const r = await api({ accion: 'marcar_paquete_entregado', id });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarPaquetes(); cargarResumenGuardia();
}

async function guardarPaquete(e) {
    e.preventDefault();
    const form   = document.getElementById('form-paquete');
    const inputs = form.querySelectorAll('input, select, textarea');
    const data = {
        accion:        'insertar_paquete',
        id_persona:    inputs[0].value,
        id_residencia: inputs[1].value,
        fecha_ingreso: inputs[2].value,
        fecha_salida:  inputs[3].value,
        id_estado:     inputs[4].value,
    };
    if (!data.id_persona)    { mostrarMensaje(form.closest('.bloque-formulario'), 'Seleccione la persona.', true); return; }
    if (!data.id_residencia) { mostrarMensaje(form.closest('.bloque-formulario'), 'Seleccione la residencia.', true); return; }
    if (data.id_estado == '2') { mostrarMensaje(form.closest('.bloque-formulario'), 'No puede poner estado Inactivo.', true); return; }
    const r = await api(data);
    if (r.error) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true);
    } else {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Paquete registrado.');
        form.reset(); cargarPaquetes(); cargarResumenGuardia();
    }
}

async function cargarVehiculosResidentes() {
    try {
        const data = await apiGet('listar_vehiculos_residentes');
        const tb   = document.querySelector('#tabla-veh-residentes tbody');
        if (!tb) return;
        tb.innerHTML = data.map(v => `
            <tr>
                <td>${v.PLACA}</td>
                <td>${v.DESCRIPCION}</td>
                <td>${v.RESIDENTE}</td>
                <td>${estadoBadge(v.NOMBRE_ESTADO)}</td>
                <td class="acciones-celda">
                    <button class="btn-acc btn-adentro" onclick="cambiarEstadoVehiculo('${v.PLACA}',4)">↓ Adentro</button>
                    <button class="btn-acc btn-salida"  onclick="cambiarEstadoVehiculo('${v.PLACA}',5)">↑ Afuera</button>
                    <button class="btn-acc btn-vetar"   onclick="cambiarEstadoVehiculo('${v.PLACA}',6)">✕ Vetar</button>
                    <button class="btn-acc btn-editar"  onclick="editarVehiculoResidente('${v.PLACA}','${(v.DESCRIPCION||'').replace(/'/g,"\\'")}',${v.ID_PERSONA??0},${v.ID_ESTADO??1})">✎ Editar</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="5">Sin vehículos de residentes</td></tr>';
        refiltrar('#vehiculos');
    } catch (e) { console.error('vehículos residentes:', e); }
}

async function cambiarEstadoVehiculo(placa, estado) {
    const etiquetas = { 4:'Adentro', 5:'Afuera', 6:'Vetar' };
    if (!confirm(`¿Registrar ${etiquetas[estado]} para el vehículo ${placa}?`)) return;
    const r = await api({ accion:'actualizar_estado_vehiculo', placa, estado });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarVehiculosResidentes(); cargarVehiculosVisitas();
}

function editarVehiculoResidente(placa, descripcion, idPersona, idEstado) {
    const form = document.getElementById('form-vehiculo-residente');
    if (!form) return;
    const inputs = form.querySelectorAll('input, select');
    inputs[0].value = placa;
    inputs[0].readOnly = true;
    if (inputs[1]) inputs[1].value = descripcion;
    const selPer = document.getElementById('sel-veh-res-persona');
    if (selPer) selPer.value = idPersona;
    const selEst = document.getElementById('sel-veh-res-estado');
    if (selEst) selEst.value = idEstado;
    form.dataset.editPlaca = placa;
    resetFormTitulo(form, '✎ Editar Vehículo de Residente');
    mostrarCancelarEdicion(form);
    form.querySelector('button[type="submit"]').textContent = 'Actualizar';
    form.closest('.bloque-formulario').scrollIntoView({ behavior:'smooth' });
}

async function guardarVehiculoResidente(e) {
    e.preventDefault();
    const form  = document.getElementById('form-vehiculo-residente');
    const inputs = form.querySelectorAll('input, select');
    const placa  = form.dataset.editPlaca || inputs[0].value.trim().toUpperCase();
    const idEstado = document.getElementById('sel-veh-res-estado')?.value;

    if (String(idEstado) === '2') {
        mostrarMensaje(form.closest('.bloque-formulario'), 'No puede poner estado Inactivo.', true); return;
    }

    if (form.dataset.editPlaca) {
        if (!['4','5','6'].includes(String(idEstado))) {
            mostrarMensaje(form.closest('.bloque-formulario'), 'Guardias solo pueden poner: Adentro, Afuera o Vetado.', true); return;
        }
        const r = await api({ accion:'actualizar_estado_vehiculo', placa, estado: idEstado });
        if (r.error) { mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true); return; }
        mostrarMensaje(form.closest('.bloque-formulario'), 'Estado actualizado.');
        form.reset(); inputs[0].readOnly = false;
        delete form.dataset.editPlaca;
        resetFormTitulo(form, 'Registrar Vehículo de Residente');
        ocultarCancelarEdicion(form);
        form.querySelector('button[type="submit"]').textContent = 'Guardar';
        cargarVehiculosResidentes();
        return;
    }

    if (!placa) { mostrarMensaje(form.closest('.bloque-formulario'), 'La placa es requerida.', true); return; }

    const data = {
        accion:          'insertar_vehiculo',
        placa,
        descripcion:     inputs[1].value.trim(),
        id_persona:      document.getElementById('sel-veh-res-persona')?.value ?? '',
        id_estado:       idEstado,
        id_tipo_espacio: 1,
    };

    const r = await api(data);
    if (r.error) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true);
    } else {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Vehículo registrado.');
        form.reset(); inputs[0].readOnly = false;
        delete form.dataset.editPlaca;
        resetFormTitulo(form, 'Registrar Vehículo de Residente');
        ocultarCancelarEdicion(form);
        form.querySelector('button[type="submit"]').textContent = 'Guardar';
        cargarVehiculosResidentes();
    }
}

async function cargarVehiculosVisitas() {
    try {
        const data = await apiGet('listar_vehiculos_visitas');
        const tb   = document.querySelector('#tabla-veh-visitas tbody');
        if (!tb) return;
        tb.innerHTML = data.map(v => `
            <tr>
                <td>${v.PLACA}</td>
                <td>${v.DESCRIPCION}</td>
                <td>${v.VISITANTE}</td>
                <td>${estadoBadge(v.NOMBRE_ESTADO)}</td>
                <td class="acciones-celda">
                    <button class="btn-acc btn-adentro" onclick="cambiarEstadoVehiculo('${v.PLACA}',4)">↓ Adentro</button>
                    <button class="btn-acc btn-salida"  onclick="cambiarEstadoVehiculo('${v.PLACA}',5)">↑ Afuera</button>
                    <button class="btn-acc btn-vetar"   onclick="cambiarEstadoVehiculo('${v.PLACA}',6)">✕ Vetar</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="5">Sin vehículos de visitas</td></tr>';
        refiltrar('#vehiculos');
    } catch (e) { console.error('vehículos visitas:', e); }
}

async function guardarVehiculoVisita(e) {
    e.preventDefault();
    const form   = document.getElementById('form-vehiculo-visita');
    const inputs = form.querySelectorAll('input');
    const placa  = inputs[0].value.trim().toUpperCase();
    const desc   = inputs[1].value.trim();
    const idPersona = document.getElementById('sel-veh-vis-persona')?.value;
    const idEstado  = document.getElementById('sel-veh-vis-estado')?.value;

    if (!placa)     { mostrarMensaje(form.closest('.bloque-formulario'), 'La placa es requerida.', true); return; }
    if (!idPersona) { mostrarMensaje(form.closest('.bloque-formulario'), 'Seleccione el visitante.', true); return; }

    const r = await api({
        accion: 'insertar_vehiculo',
        placa,
        descripcion:     desc,
        id_persona:      idPersona,
        id_estado:       idEstado,
        id_tipo_espacio: 1,
    });
    if (r.error) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true);
    } else {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Vehículo de visita registrado.');
        form.reset();
        cargarVehiculosVisitas();
    }
}

async function cargarEventos() {
    try {
        const data = await apiGet('listar_eventos');
        const tb   = document.querySelector('#eventos .bloque-tabla table tbody');
        if (!tb) return;

        // Buscar IDs de estados por nombre desde los estados cargados globalmente
        const idPorNombre = (nombre) => {
            const e = _estadosGuardia.find(s => (s.NOMBRE_ESTADO || '').toUpperCase() === nombre.toUpperCase());
            return e ? e.ID_ESTADO : null;
        };
        const idProg  = idPorNombre('Programado')  ?? idPorNombre('PROGRAMADO');
        const idProc  = idPorNombre('En Proceso')  ?? idPorNombre('EN PROCESO');
        const idRes   = idPorNombre('Resuelto')     ?? idPorNombre('RESUELTO');
        const idFinal = idPorNombre('Finalizado')   ?? idPorNombre('FINALIZADO');

        const btnProg  = idProg  ? `<button class="btn-acc btn-prog"     onclick="cambiarEstadoEvento(${'{ev.ID_EVENTO}'},${idProg})"  title="Programado">📋 Prog.</button>` : '';
        const btnProc  = idProc  ? `<button class="btn-acc btn-proceso"  onclick="cambiarEstadoEvento(${'{ev.ID_EVENTO}'},${idProc})"  title="En Proceso">⚙ Proceso</button>` : '';
        const btnRes   = idRes   ? `<button class="btn-acc btn-resuelto" onclick="cambiarEstadoEvento(${'{ev.ID_EVENTO}'},${idRes})"   title="Resuelto">✓ Resuelto</button>` : '';
        const btnFinal = idFinal ? `<button class="btn-acc btn-final"    onclick="cambiarEstadoEvento(${'{ev.ID_EVENTO}'},${idFinal})" title="Finalizado">⬛ Final</button>` : '';

        tb.innerHTML = data.map(ev => `
            <tr>
                <td>${ev.DESCR_EVENTO}</td>
                <td>${ev.TIPO_EVENTO}</td>
                <td>${ev.FECHA_EVENTO}</td>
                <td>${estadoBadge(ev.NOMBRE_ESTADO)}</td>
                <td class="acciones-celda">
                    ${idProg  ? `<button class="btn-acc btn-prog"     onclick="cambiarEstadoEvento(${ev.ID_EVENTO},${idProg})"  title="Programado">📋 Prog.</button>` : ''}
                    ${idProc  ? `<button class="btn-acc btn-proceso"  onclick="cambiarEstadoEvento(${ev.ID_EVENTO},${idProc})"  title="En Proceso">⚙ Proceso</button>` : ''}
                    ${idRes   ? `<button class="btn-acc btn-resuelto" onclick="cambiarEstadoEvento(${ev.ID_EVENTO},${idRes})"   title="Resuelto">✓ Resuelto</button>` : ''}
                    ${idFinal ? `<button class="btn-acc btn-final"    onclick="cambiarEstadoEvento(${ev.ID_EVENTO},${idFinal})" title="Finalizado">⬛ Final</button>` : ''}
                    <button class="btn-acc btn-editar" onclick="editarEvento(${ev.ID_EVENTO},'${(ev.DESCR_EVENTO||'').replace(/'/g,"\\'")}',${ev.ID_TIPO_EVENTO??1},'${ev.FECHA_EVENTO??''}',${ev.ID_ESTADO??1})">✎ Editar</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="5">Sin eventos</td></tr>';
        refiltrar('#eventos');
    } catch (e) { console.error('eventos:', e); }
}

async function cambiarEstadoEvento(id, estado) {
    const est = _estadosGuardia.find(s => String(s.ID_ESTADO) === String(estado));
    const nombre = est ? est.NOMBRE_ESTADO : estado;
    if (!confirm(`¿Cambiar estado a "${nombre}"?`)) return;
    const r = await api({ accion:'actualizar_estado_evento', id, estado });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarEventos();
}

function editarEvento(id, descr, idTipoEvento, fechaEvento, idEstado) {
    const form   = document.getElementById('form-evento');
    if (!form) return;
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs[0].value = descr;
    if (inputs[1]) inputs[1].value = idTipoEvento;
    if (inputs[2]) inputs[2].value = fechaEvento;
    if (inputs[3]) inputs[3].value = idEstado;
    form.dataset.editId = id;
    resetFormTitulo(form, '✎ Editar Evento');
    mostrarCancelarEdicion(form);
    form.querySelector('button[type="submit"]').textContent = 'Actualizar';
    form.closest('.bloque-formulario').scrollIntoView({ behavior:'smooth' });
}

async function guardarEvento(e) {
    e.preventDefault();
    const form   = document.getElementById('form-evento');
    const inputs = form.querySelectorAll('input, select, textarea');
    const editId = form.dataset.editId;

    if (editId) {
        const estado = parseInt(inputs[3]?.value ?? 0);
        if (!estado) { mostrarMensaje(form.closest('.bloque-formulario'), 'Seleccione un estado.', true); return; }
        const estadosValidos = filtrarEstados(_estadosGuardia, ESTADOS_GUARDIA_SECCION.eventos).map(s => s.ID_ESTADO);
        if (estadosValidos.length > 0 && !estadosValidos.includes(estado)) {
            mostrarMensaje(form.closest('.bloque-formulario'), 'Estado no válido para eventos.', true); return;
        }
        const r = await api({ accion:'actualizar_estado_evento', id:editId, estado });
        if (r.error) { mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true); return; }
        mostrarMensaje(form.closest('.bloque-formulario'), 'Estado actualizado.');
        cancelarEdicionEvento();
        cargarEventos();
        return;
    }

    const data = {
        accion:          'insertar_evento',
        descr_evento:    inputs[0].value.trim(),
        id_tipo_evento:  inputs[1].value,
        fecha_evento:    inputs[2].value,
        id_estado:       inputs[3].value,
        id_tipo_espacio: 1,
    };
    if (!data.descr_evento)   { mostrarMensaje(form.closest('.bloque-formulario'), 'La descripción es requerida.', true); return; }
    if (!data.id_tipo_evento) { mostrarMensaje(form.closest('.bloque-formulario'), 'Seleccione el tipo de evento.', true); return; }

    const r = await api(data);
    if (r.error) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true);
    } else {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Evento registrado.');
        form.reset(); delete form.dataset.editId;
        resetFormTitulo(form, 'Registrar Evento');
        ocultarCancelarEdicion(form);
        form.querySelector('button[type="submit"]').textContent = 'Guardar';
        cargarEventos();
    }
}

function cancelarEdicionEvento() {
    const form = document.getElementById('form-evento');
    if (!form) return;
    form.reset(); delete form.dataset.editId;
    resetFormTitulo(form, 'Registrar Evento');
    ocultarCancelarEdicion(form);
    form.querySelector('button[type="submit"]').textContent = 'Guardar';
}

async function cargarResidentes() {
    try {
        const data = await apiGet('listar_residentes');
        const tb   = document.querySelector('#residentes table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(r => `
            <tr>
                <td>${r.NOMBRE}</td><td>${r.APELLIDO_PATERNO}</td>
                <td>${r.APELLIDO_MATERNO}</td><td>${r.TELEFONO ?? '--'}</td>
                <td>${r.ID_RESIDENCIA ?? '--'}</td><td>${estadoBadge(r.NOMBRE_ESTADO)}</td>
            </tr>`
        ).join('') || '<tr><td colspan="6">Sin residentes</td></tr>';
        refiltrar('#residentes');
    } catch (e) { console.error('residentes:', e); }
}

async function cargarResidencias() {
    try {
        const data = await apiGet('listar_residencias');
        const tb   = document.querySelector('#residencias table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(r => `
            <tr>
                <td>${r.ID_RESIDENCIA}</td>
                <td>₡${Number(r.MONTO_ALQUILER).toLocaleString()}</td>
                <td>₡${Number(r.MONTO_MANTENIMIENTO).toLocaleString()}</td>
                <td>${r.TIPO_PAGO ?? '--'}</td>
                <td>${estadoBadge(r.NOMBRE_ESTADO)}</td>
            </tr>`
        ).join('') || '<tr><td colspan="5">Sin residencias</td></tr>';
        refiltrar('#residencias');
    } catch (e) { console.error('residencias:', e); }
}

async function cargarEspacios() {
    try {
        const data = await apiGet('listar_espacios');
        const tb   = document.querySelector('#espacios .bloque-tabla table tbody');
        if (!tb) return;
        tb.innerHTML = data.map(esp => `
            <tr>
                <td>${esp.ID_TIPO_ESPACIO}</td>
                <td>${esp.NOMBRE_ESPACIO}</td>
                <td>${esp.DESCR_ESPACIO ?? '--'}</td>
                <td>${estadoBadge(esp.NOMBRE_ESTADO)}</td>
                <td class="acciones-celda">
                    <button class="btn-acc btn-editar" onclick="editarEspacio(${esp.ID_TIPO_ESPACIO},'${(esp.NOMBRE_ESPACIO||'').replace(/'/g,"\\'")}','${(esp.DESCR_ESPACIO||'').replace(/'/g,"\\'")}',${esp.ID_ESTADO??1})">✎ Editar</button>
                    <button class="btn-acc btn-vetar"  onclick="eliminarEspacio(${esp.ID_TIPO_ESPACIO})">✕ Eliminar</button>
                </td>
            </tr>`
        ).join('') || '<tr><td colspan="5">Sin espacios</td></tr>';
        refiltrar('#espacios');
    } catch (e) { console.error('espacios:', e); }
}

function editarEspacio(id, nombre, descr, idEstado) {
    const form = document.getElementById('form-espacio');
    if (!form) return;
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs[0].value = nombre;
    if (inputs[1]) inputs[1].value = descr;
    if (inputs[2]) inputs[2].value = idEstado;
    form.dataset.editId = id;
    resetFormTitulo(form, '✎ Editar Espacio');
    mostrarCancelarEdicion(form);
    form.querySelector('button[type="submit"]').textContent = 'Actualizar';
    form.closest('.bloque-formulario').scrollIntoView({ behavior:'smooth' });
}

async function eliminarEspacio(id) {
    if (!confirm('¿Eliminar este espacio?')) return;
    const r = await api({ accion:'eliminar_espacio', id });
    if (r.error) { alert('Error: ' + r.mensaje); return; }
    cargarEspacios();
}

async function guardarEspacio(e) {
    e.preventDefault();
    const form   = document.getElementById('form-espacio');
    const inputs = form.querySelectorAll('input, select, textarea');
    const editId = form.dataset.editId;
    const data   = {
        accion:         editId ? 'actualizar_espacio' : 'insertar_espacio',
        id:             editId ?? '',
        nombre_espacio: inputs[0].value.trim(),
        descr_espacio:  inputs[1]?.value.trim() ?? '',
        id_estado:      inputs[2]?.value ?? 1,
    };
    if (!data.nombre_espacio) { mostrarMensaje(form.closest('.bloque-formulario'), 'El nombre es requerido.', true); return; }
    const r = await api(data);
    if (r.error) {
        mostrarMensaje(form.closest('.bloque-formulario'), 'Error: ' + r.mensaje, true);
    } else {
        mostrarMensaje(form.closest('.bloque-formulario'), editId ? 'Espacio actualizado.' : 'Espacio registrado.');
        form.reset(); delete form.dataset.editId;
        resetFormTitulo(form, 'Registrar Espacio');
        ocultarCancelarEdicion(form);
        form.querySelector('button[type="submit"]').textContent = 'Guardar';
        cargarEspacios();
    }
}

function resetFormTitulo(form, titulo) {
    const h3 = form.closest('.bloque-formulario')?.querySelector('h3');
    if (h3) h3.textContent = titulo;
}

function mostrarCancelarEdicion(form) {
    let btn = form.querySelector('.btn-cancelar-edicion');
    if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-limpiar btn-cancelar-edicion';
        btn.textContent = '✕ Cancelar edición';
        btn.addEventListener('click', () => {
            form.reset();
            delete form.dataset.editId;
            delete form.dataset.editPlaca;
            const sec = form.closest('.seccion');
            const h3  = form.closest('.bloque-formulario')?.querySelector('h3');
            if (h3 && sec) {
                const map = {
                    visitantes: 'Registrar Visitante',
                    paquetes:   'Registrar Paquete',
                    eventos:    'Registrar Evento',
                    espacios:   'Registrar Espacio',
                };
                h3.textContent = map[sec.id] ?? 'Registrar';
            }
            if (form.id === 'form-vehiculo-residente') resetFormTitulo(form, 'Registrar Vehículo de Residente');
            if (form.id === 'form-vehiculo-visita')    resetFormTitulo(form, 'Registrar Vehículo de Visitante');
            const firstInput = form.querySelector('input[type="text"]');
            if (firstInput) firstInput.readOnly = false;
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.textContent = 'Guardar';
            ocultarCancelarEdicion(form);
        });
        form.appendChild(btn);
    }
    btn.style.display = 'block';
}

function ocultarCancelarEdicion(form) {
    const btn = form.querySelector('.btn-cancelar-edicion');
    if (btn) btn.style.display = 'none';
}

// Estados cargados globalmente para lookup por nombre
let _estadosGuardia = [];

async function cargarSelectsGuardia() {
    const safe = async (accion) => { try { const d = await apiGet(accion); return Array.isArray(d) ? d : []; } catch { return []; } };

    const [residencias, roles, estados, tiposEvento, personas] = await Promise.all([
        safe('listar_residencias'),
        safe('listar_roles'),
        safe('listar_estados_guardia'),
        safe('listar_tipos_evento'),
        safe('listar_personas'),
    ]);

    _estadosGuardia = estados;

    try {
        const visRes = document.querySelector('#visitantes .bloque-formulario select:nth-of-type(1)');
        if (visRes) {
            llenarSelect(visRes, residencias, 'ID_RESIDENCIA', 'ID_RESIDENCIA');
            residencias.forEach((r, i) => { if (visRes.options[i+1]) visRes.options[i+1].textContent = `Res. ${r.ID_RESIDENCIA} — ₡${Number(r.MONTO_ALQUILER).toLocaleString()}`; });
        }
        llenarSelect(document.querySelector('#visitantes .bloque-formulario select:nth-of-type(2)'), roles, 'ID_ROL', 'ROL');
        llenarSelect(document.querySelector('#visitantes .bloque-formulario select:nth-of-type(3)'), filtrarEstados(estados, ESTADOS_GUARDIA_SECCION.visitantes), 'ID_ESTADO', 'NOMBRE_ESTADO');
    } catch (e) { console.error('selects visitantes:', e); }

    try {
        llenarSelect(document.querySelector('#paquetes .bloque-formulario select:nth-of-type(1)'), personas, 'ID_PERSONA', 'NOMBRE_COMPLETO');
        const paqRes = document.querySelector('#paquetes .bloque-formulario select:nth-of-type(2)');
        if (paqRes) {
            llenarSelect(paqRes, residencias, 'ID_RESIDENCIA', 'ID_RESIDENCIA');
            residencias.forEach((r, i) => { if (paqRes.options[i+1]) paqRes.options[i+1].textContent = `Res. ${r.ID_RESIDENCIA}`; });
        }
        llenarSelect(document.querySelector('#paquetes .bloque-formulario select:nth-of-type(3)'), filtrarEstados(estados, ESTADOS_GUARDIA_SECCION.paquetes), 'ID_ESTADO', 'NOMBRE_ESTADO');
    } catch (e) { console.error('selects paquetes:', e); }

    try {
        llenarSelect(document.getElementById('sel-veh-res-persona'), personas, 'ID_PERSONA', 'NOMBRE_COMPLETO');
        llenarSelect(document.getElementById('sel-veh-res-estado'), filtrarEstados(estados, ESTADOS_GUARDIA_SECCION.vehiculos), 'ID_ESTADO', 'NOMBRE_ESTADO');
        llenarSelect(document.getElementById('sel-veh-vis-persona'), personas, 'ID_PERSONA', 'NOMBRE_COMPLETO');
        llenarSelect(document.getElementById('sel-veh-vis-estado'), filtrarEstados(estados, ESTADOS_GUARDIA_SECCION.vehiculos), 'ID_ESTADO', 'NOMBRE_ESTADO');
    } catch (e) { console.error('selects vehiculos:', e); }

    try {
        llenarSelect(document.querySelector('#eventos .bloque-formulario select:nth-of-type(1)'), tiposEvento, 'ID_TIPO_EVENTO', 'TIPO_EVENTO');
        llenarSelect(document.querySelector('#eventos .bloque-formulario select:nth-of-type(2)'), filtrarEstados(estados, ESTADOS_GUARDIA_SECCION.eventos), 'ID_ESTADO', 'NOMBRE_ESTADO');
    } catch (e) { console.error('selects eventos:', e); }

    try {
        llenarSelect(document.querySelector('#espacios .bloque-formulario select'), filtrarEstados(estados, ESTADOS_GUARDIA_SECCION.espacios), 'ID_ESTADO', 'NOMBRE_ESTADO');
    } catch (e) { console.error('selects espacios:', e); }
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
}

function asignarFormularios() {
    const mapa = {
        'form-visitante':          guardarVisita,
        'form-paquete':            guardarPaquete,
        'form-vehiculo-residente': guardarVehiculoResidente,
        'form-vehiculo-visita':    guardarVehiculoVisita,
        'form-evento':             guardarEvento,
        'form-espacio':            guardarEspacio,
    };
    for (const [id, fn] of Object.entries(mapa)) {
        const form = document.getElementById(id);
        if (form) form.addEventListener('submit', fn);
    }
    document.querySelectorAll('.btn-limpiar:not(.btn-cancelar-edicion)').forEach(btn =>
        btn.addEventListener('click', () => btn.closest('form')?.reset())
    );
}

function iniciarAutoRefresh() {
    setInterval(() => {
        cargarResumenGuardia();
        cargarVisitantes();
        cargarPaquetes();
        cargarVehiculosResidentes();
        cargarVehiculosVisitas();
        cargarEventos();
    }, 20000);
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
        cargarVehiculosResidentes(),
        cargarVehiculosVisitas(),
        cargarEventos(),
        cargarResidentes(),
        cargarResidencias(),
        cargarEspacios(),
    ]);
    iniciarAutoRefresh();
});

function aplicarFiltro(input) {
    const q = input.value.trim().toLowerCase();
    const bloque  = input.closest('.bloque-tabla');
    const section = input.closest('.seccion');
    const targetId = input.dataset.tabla;
    const table = targetId
        ? document.getElementById(targetId)
        : bloque
            ? bloque.querySelector('table')
            : section?.querySelector('table');
    if (!table) return;
    table.querySelectorAll('tbody tr').forEach(tr => {
        tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
}

function refiltrar(seccionId) {
    const inputs = document.querySelectorAll(`${seccionId} .buscador-tabla`);
    inputs.forEach(input => { if (input.value.trim()) aplicarFiltro(input); });
}

document.addEventListener('input', e => {
    if (e.target.matches('.buscador-tabla')) aplicarFiltro(e.target);
});
