// ===== DATOS DE EJEMPLO (luego se reemplazan con llamadas PHP) =====

let guardias = [
    { id: 1, nombre: "Juan", ap_paterno: "Hernández", ap_materno: "Soto", telefono: "8800-1111", correo: "juan@aralias.com", estado: "Activo" },
    { id: 2, nombre: "María", ap_paterno: "Castro", ap_materno: "Rojas", telefono: "8800-2222", correo: "maria@aralias.com", estado: "Activo" }
];

let residentes = [
    { id: 1, nombre: "Carlos", ap_paterno: "Mora", ap_materno: "Pérez", telefono: "8888-1111", correo: "carlos@correo.com", residencia: 1, estado: "Activo" },
    { id: 2, nombre: "Lucía", ap_paterno: "Vega", ap_materno: "Solano", telefono: "8888-2222", correo: "lucia@correo.com", residencia: 2, estado: "Activo" },
    { id: 3, nombre: "Roberto", ap_paterno: "Arce", ap_materno: "Blanco", telefono: "8888-3333", correo: "roberto@correo.com", residencia: 3, estado: "Activo" }
];

let residencias = [
    { id: 1, monto_alquiler: 350000, monto_mantenimiento: 25000, tipo_pago: "Mensual", estado: "Activo" },
    { id: 2, monto_alquiler: 280000, monto_mantenimiento: 25000, tipo_pago: "Mensual", estado: "Activo" },
    { id: 3, monto_alquiler: 400000, monto_mantenimiento: 25000, tipo_pago: "Mensual", estado: "Activo" }
];

let visitantes = [
    { id: 1, nombre: "Ana Torres", rol: "Visitante", residencia: 1, fecha_ingreso: "2026-03-05 08:30", fecha_salida: "2026-03-05 10:00", estado: "Salió" },
    { id: 2, nombre: "Delivery Express", rol: "Proveedor", residencia: 2, fecha_ingreso: "2026-03-05 09:00", fecha_salida: "", estado: "Dentro" }
];

let paquetes = [
    { id: 1, descripcion: "Caja Amazon", residencia: 1, fecha_ingreso: "2026-03-04", fecha_salida: "", estado: "Pendiente" },
    { id: 2, descripcion: "Paquete Correos CR", residencia: 3, fecha_ingreso: "2026-03-05", fecha_salida: "2026-03-05", estado: "Entregado" }
];

let facturas = [
    { id: 1, fecha: "2026-03-01", descripcion: "Cuota mensual Marzo", residente: 1, tipo_pago: "Alquiler", forma_pago: "Transferencia", estado: "Pagado" },
    { id: 2, fecha: "2026-03-01", descripcion: "Cuota mensual Marzo", residente: 2, tipo_pago: "Alquiler", forma_pago: "Efectivo", estado: "Pendiente" },
    { id: 3, fecha: "2026-03-01", descripcion: "Mantenimiento Marzo", residente: 3, tipo_pago: "Mantenimiento", forma_pago: "Transferencia", estado: "Pendiente" }
];

let servicios = [
    { id: 1, descripcion: "Revisión sistema eléctrico", tipo: "Electricidad", fecha_salida: "2026-03-10", estado: "Activo" },
    { id: 2, descripcion: "Corte de jardines", tipo: "Jardinería", fecha_salida: "2026-03-07", estado: "Finalizado" }
];

let eventos = [
    { id: 1, descripcion: "Visita de fumigación programada", tipo: "Mantenimiento", fecha: "2026-03-05", estado: "Resuelto" },
    { id: 2, descripcion: "Persona sospechosa en el portón norte", tipo: "Incidente", fecha: "2026-03-05", estado: "Activo" }
];

let vehiculos = [
    { id: 1, placa: "ABC-123", descripcion: "Toyota Corolla gris", residente: 1, estado: "Activo" },
    { id: 2, placa: "XYZ-456", descripcion: "Hyundai Tucson blanco", residente: 2, estado: "Activo" }
];

// ===== NAVEGACION =====

function mostrarSeccion(id) {
    let secciones = document.querySelectorAll(".seccion");
    for (let i = 0; i < secciones.length; i++) {
        secciones[i].classList.remove("activa");
    }
    document.getElementById(id).classList.add("activa");
}

// ===== HELPERS =====

function nombreResidente(id) {
    let r = residentes.find(function (r) { return r.id == id; });
    return r ? r.nombre + " " + r.ap_paterno : "--";
}

function cargarSelectResidentes(selectId) {
    let select = document.getElementById(selectId);
    select.innerHTML = "<option value=''>-- Seleccione --</option>";
    for (let i = 0; i < residentes.length; i++) {
        select.innerHTML += "<option value='" + residentes[i].id + "'>" + residentes[i].nombre + " " + residentes[i].ap_paterno + "</option>";
    }
}

function cargarSelectResidencias(selectId) {
    let select = document.getElementById(selectId);
    select.innerHTML = "<option value=''>-- Seleccione --</option>";
    for (let i = 0; i < residencias.length; i++) {
        select.innerHTML += "<option value='" + residencias[i].id + "'>Residencia #" + residencias[i].id + "</option>";
    }
}

function mostrarExito(idSpan, mensaje) {
    let span = document.getElementById(idSpan);
    span.innerText = mensaje;
    span.style.display = "block";
    setTimeout(function () { span.style.display = "none"; }, 3000);
}

function mostrarError(idSpan, mensaje) {
    let span = document.getElementById(idSpan);
    span.innerText = mensaje;
    span.style.display = "block";
}

function ocultarError(idSpan) {
    document.getElementById(idSpan).style.display = "none";
}

// ===== INICIO =====

function actualizarInicio() {
    document.getElementById("totalGuardias").innerText = guardias.filter(function (g) { return g.estado == "Activo"; }).length;
    document.getElementById("totalResidentes").innerText = residentes.length;
    document.getElementById("totalResidencias").innerText = residencias.length;
    document.getElementById("totalPaquetes").innerText = paquetes.filter(function (p) { return p.estado == "Pendiente"; }).length;
    document.getElementById("totalEventos").innerText = eventos.filter(function (e) { return e.estado == "Activo"; }).length;
    document.getElementById("totalFacturas").innerText = facturas.filter(function (f) { return f.estado == "Pendiente"; }).length;

    let tbody = document.getElementById("tablaUltimosEventos");
    tbody.innerHTML = "";
    for (let i = 0; i < eventos.length; i++) {
        let e = eventos[i];
        let claseEstado = e.estado == "Activo" ? "estado-pendiente" : "estado-activo";
        tbody.innerHTML += "<tr><td>" + e.descripcion + "</td><td>" + e.tipo + "</td><td>" + e.fecha + "</td><td class='" + claseEstado + "'>" + e.estado + "</td></tr>";
    }
}

// ===== GUARDIAS =====

function actualizarTablaGuardias() {
    let tbody = document.getElementById("tablaGuardias");
    tbody.innerHTML = "";
    for (let i = 0; i < guardias.length; i++) {
        let g = guardias[i];
        let claseEstado = g.estado == "Activo" ? "estado-activo" : "estado-inactivo";
        tbody.innerHTML += "<tr><td>" + g.nombre + "</td><td>" + g.ap_paterno + " " + g.ap_materno + "</td><td>" + g.telefono + "</td><td>" + g.correo + "</td><td class='" + claseEstado + "'>" + g.estado + "</td><td><button class='btn-editar' onclick='editarGuardia(" + i + ")'>Editar</button> <button class='btn-eliminar' onclick='eliminarGuardia(" + i + ")'>Eliminar</button></td></tr>";
    }
}

function editarGuardia(index) {
    let g = guardias[index];
    document.getElementById("idGuardia").value = index;
    document.getElementById("nombreGuardia").value = g.nombre;
    document.getElementById("apPaternoGuardia").value = g.ap_paterno;
    document.getElementById("apMaternoGuardia").value = g.ap_materno;
    document.getElementById("telefonoGuardia").value = g.telefono;
    document.getElementById("correoGuardia").value = g.correo;
    document.getElementById("estadoGuardia").value = g.estado;
    document.getElementById("tituloFormGuardia").innerText = "Editar Guardia";
}

function eliminarGuardia(index) {
    if (confirm("¿Está seguro de que desea eliminar este guardia?")) {
        guardias.splice(index, 1);
        actualizarTablaGuardias();
        actualizarInicio();
    }
}

function limpiarFormGuardia() {
    document.getElementById("idGuardia").value = "-1";
    document.getElementById("nombreGuardia").value = "";
    document.getElementById("apPaternoGuardia").value = "";
    document.getElementById("apMaternoGuardia").value = "";
    document.getElementById("telefonoGuardia").value = "";
    document.getElementById("correoGuardia").value = "";
    document.getElementById("estadoGuardia").value = "Activo";
    document.getElementById("tituloFormGuardia").innerText = "Agregar Guardia";
    ocultarError("errorGuardia");
}

document.getElementById("formGuardia").addEventListener("submit", function (event) {
    event.preventDefault();
    let nombre = document.getElementById("nombreGuardia").value;
    let apPaterno = document.getElementById("apPaternoGuardia").value;
    if (nombre == "" || apPaterno == "") {
        mostrarError("errorGuardia", "Nombre y apellido paterno son obligatorios.");
        return;
    }
    ocultarError("errorGuardia");
    let nuevo = {
        id: guardias.length + 1,
        nombre: nombre,
        ap_paterno: apPaterno,
        ap_materno: document.getElementById("apMaternoGuardia").value,
        telefono: document.getElementById("telefonoGuardia").value,
        correo: document.getElementById("correoGuardia").value,
        estado: document.getElementById("estadoGuardia").value
    };
    let idEdit = document.getElementById("idGuardia").value;
    if (idEdit != "-1") {
        guardias[Number(idEdit)] = nuevo;
        mostrarExito("exitoGuardia", "Guardia actualizado correctamente.");
    } else {
        guardias.push(nuevo);
        mostrarExito("exitoGuardia", "Guardia agregado correctamente.");
    }
    actualizarTablaGuardias();
    actualizarInicio();
    limpiarFormGuardia();
});

// ===== RESIDENTES =====

function actualizarTablaResidentes() {
    let tbody = document.getElementById("tablaResidentes");
    tbody.innerHTML = "";
    for (let i = 0; i < residentes.length; i++) {
        let r = residentes[i];
        let claseEstado = r.estado == "Activo" ? "estado-activo" : "estado-inactivo";
        tbody.innerHTML += "<tr><td>" + r.nombre + "</td><td>" + r.ap_paterno + " " + r.ap_materno + "</td><td>" + r.telefono + "</td><td>Residencia #" + r.residencia + "</td><td class='" + claseEstado + "'>" + r.estado + "</td><td><button class='btn-editar' onclick='editarResidente(" + i + ")'>Editar</button> <button class='btn-eliminar' onclick='eliminarResidente(" + i + ")'>Eliminar</button></td></tr>";
    }
}

function editarResidente(index) {
    let r = residentes[index];
    document.getElementById("idResidente").value = index;
    document.getElementById("nombreResidente").value = r.nombre;
    document.getElementById("apPaternoResidente").value = r.ap_paterno;
    document.getElementById("apMaternoResidente").value = r.ap_materno;
    document.getElementById("telefonoResidente").value = r.telefono;
    document.getElementById("correoResidente").value = r.correo;
    document.getElementById("residenciaResidente").value = r.residencia;
    document.getElementById("estadoResidente").value = r.estado;
    document.getElementById("tituloFormResidente").innerText = "Editar Residente";
}

function eliminarResidente(index) {
    if (confirm("¿Está seguro de que desea eliminar este residente?")) {
        residentes.splice(index, 1);
        actualizarTablaResidentes();
        actualizarInicio();
    }
}

function limpiarFormResidente() {
    document.getElementById("idResidente").value = "-1";
    document.getElementById("nombreResidente").value = "";
    document.getElementById("apPaternoResidente").value = "";
    document.getElementById("apMaternoResidente").value = "";
    document.getElementById("telefonoResidente").value = "";
    document.getElementById("correoResidente").value = "";
    document.getElementById("residenciaResidente").value = "";
    document.getElementById("estadoResidente").value = "Activo";
    document.getElementById("tituloFormResidente").innerText = "Agregar Residente";
    ocultarError("errorResidente");
}

document.getElementById("formResidente").addEventListener("submit", function (event) {
    event.preventDefault();
    let nombre = document.getElementById("nombreResidente").value;
    let apPaterno = document.getElementById("apPaternoResidente").value;
    let residencia = document.getElementById("residenciaResidente").value;
    if (nombre == "" || apPaterno == "" || residencia == "") {
        mostrarError("errorResidente", "Nombre, apellido y residencia son obligatorios.");
        return;
    }
    ocultarError("errorResidente");
    let nuevo = {
        id: residentes.length + 1,
        nombre: nombre,
        ap_paterno: apPaterno,
        ap_materno: document.getElementById("apMaternoResidente").value,
        telefono: document.getElementById("telefonoResidente").value,
        correo: document.getElementById("correoResidente").value,
        residencia: Number(residencia),
        estado: document.getElementById("estadoResidente").value
    };
    let idEdit = document.getElementById("idResidente").value;
    if (idEdit != "-1") {
        residentes[Number(idEdit)] = nuevo;
        mostrarExito("exitoResidente", "Residente actualizado correctamente.");
    } else {
        residentes.push(nuevo);
        mostrarExito("exitoResidente", "Residente agregado correctamente.");
    }
    actualizarTablaResidentes();
    actualizarInicio();
    limpiarFormResidente();
});

// ===== RESIDENCIAS =====

function actualizarTablaResidencias() {
    let tbody = document.getElementById("tablaResidencias");
    tbody.innerHTML = "";
    for (let i = 0; i < residencias.length; i++) {
        let r = residencias[i];
        let claseEstado = r.estado == "Activo" ? "estado-activo" : "estado-inactivo";
        tbody.innerHTML += "<tr><td>#" + r.id + "</td><td>₡" + r.monto_alquiler.toLocaleString() + "</td><td>₡" + r.monto_mantenimiento.toLocaleString() + "</td><td>" + r.tipo_pago + "</td><td class='" + claseEstado + "'>" + r.estado + "</td><td><button class='btn-editar' onclick='editarResidencia(" + i + ")'>Editar</button> <button class='btn-eliminar' onclick='eliminarResidencia(" + i + ")'>Eliminar</button></td></tr>";
    }
}

function editarResidencia(index) {
    let r = residencias[index];
    document.getElementById("idResidencia").value = index;
    document.getElementById("montoAlquiler").value = r.monto_alquiler;
    document.getElementById("montoMantenimiento").value = r.monto_mantenimiento;
    document.getElementById("tipoPago").value = r.tipo_pago;
    document.getElementById("estadoResidencia").value = r.estado;
    document.getElementById("tituloFormResidencia").innerText = "Editar Residencia";
}

function eliminarResidencia(index) {
    if (confirm("¿Está seguro de que desea eliminar esta residencia?")) {
        residencias.splice(index, 1);
        actualizarTablaResidencias();
        actualizarInicio();
    }
}

function limpiarFormResidencia() {
    document.getElementById("idResidencia").value = "-1";
    document.getElementById("montoAlquiler").value = "";
    document.getElementById("montoMantenimiento").value = "";
    document.getElementById("tipoPago").value = "Mensual";
    document.getElementById("estadoResidencia").value = "Activo";
    document.getElementById("tituloFormResidencia").innerText = "Agregar Residencia";
    ocultarError("errorResidencia");
}

document.getElementById("formResidencia").addEventListener("submit", function (event) {
    event.preventDefault();
    let monto = document.getElementById("montoAlquiler").value;
    if (monto == "") {
        mostrarError("errorResidencia", "El monto de alquiler es obligatorio.");
        return;
    }
    ocultarError("errorResidencia");
    let nuevo = {
        id: residencias.length + 1,
        monto_alquiler: Number(monto),
        monto_mantenimiento: Number(document.getElementById("montoMantenimiento").value) || 0,
        tipo_pago: document.getElementById("tipoPago").value,
        estado: document.getElementById("estadoResidencia").value
    };
    let idEdit = document.getElementById("idResidencia").value;
    if (idEdit != "-1") {
        residencias[Number(idEdit)] = nuevo;
        mostrarExito("exitoResidencia", "Residencia actualizada correctamente.");
    } else {
        residencias.push(nuevo);
        mostrarExito("exitoResidencia", "Residencia agregada correctamente.");
    }
    actualizarTablaResidencias();
    actualizarInicio();
    limpiarFormResidencia();
});

// ===== VISITANTES (VER + EDITAR ESTADO) =====

function actualizarTablaVisitantes() {
    let tbody = document.getElementById("tablaVisitantes");
    tbody.innerHTML = "";
    for (let i = 0; i < visitantes.length; i++) {
        let v = visitantes[i];
        let claseEstado = v.estado == "Dentro" ? "estado-activo" : "estado-inactivo";
        tbody.innerHTML += "<tr><td>" + v.nombre + "</td><td>" + v.rol + "</td><td>Residencia #" + v.residencia + "</td><td>" + v.fecha_ingreso + "</td><td>" + (v.fecha_salida || "--") + "</td><td class='" + claseEstado + "'>" + v.estado + "</td><td><button class='btn-editar' onclick='cambiarEstadoVisitante(" + i + ")'>Cambiar estado</button></td></tr>";
    }
}

function cambiarEstadoVisitante(index) {
    let v = visitantes[index];
    v.estado = v.estado == "Dentro" ? "Salió" : "Dentro";
    actualizarTablaVisitantes();
}

// ===== PAQUETES (VER + EDITAR ESTADO) =====

function actualizarTablaPaquetes() {
    let tbody = document.getElementById("tablaPaquetes");
    tbody.innerHTML = "";
    for (let i = 0; i < paquetes.length; i++) {
        let p = paquetes[i];
        let claseEstado = p.estado == "Pendiente" ? "estado-pendiente" : "estado-activo";
        tbody.innerHTML += "<tr><td>" + p.descripcion + "</td><td>Residencia #" + p.residencia + "</td><td>" + p.fecha_ingreso + "</td><td>" + (p.fecha_salida || "--") + "</td><td class='" + claseEstado + "'>" + p.estado + "</td><td><button class='btn-editar' onclick='cambiarEstadoPaquete(" + i + ")'>Marcar entregado</button></td></tr>";
    }
}

function cambiarEstadoPaquete(index) {
    paquetes[index].estado = "Entregado";
    actualizarTablaPaquetes();
    actualizarInicio();
}

// ===== FACTURAS =====

function actualizarTablaFacturas() {
    cargarSelectResidentes("residenteFactura");
    let tbody = document.getElementById("tablaFacturas");
    tbody.innerHTML = "";
    for (let i = 0; i < facturas.length; i++) {
        let f = facturas[i];
        let claseEstado = f.estado == "Pagado" ? "estado-activo" : f.estado == "Pendiente" ? "estado-pendiente" : "estado-inactivo";
        tbody.innerHTML += "<tr><td>" + f.fecha + "</td><td>" + f.descripcion + "</td><td>" + nombreResidente(f.residente) + "</td><td>" + f.tipo_pago + "</td><td>" + f.forma_pago + "</td><td class='" + claseEstado + "'>" + f.estado + "</td><td><button class='btn-editar' onclick='editarFactura(" + i + ")'>Editar</button> <button class='btn-eliminar' onclick='eliminarFactura(" + i + ")'>Eliminar</button></td></tr>";
    }
}

function editarFactura(index) {
    let f = facturas[index];
    document.getElementById("idFactura").value = index;
    document.getElementById("fechaFactura").value = f.fecha;
    document.getElementById("descFactura").value = f.descripcion;
    document.getElementById("residenteFactura").value = f.residente;
    document.getElementById("tipoPagoFactura").value = f.tipo_pago;
    document.getElementById("formaPagoFactura").value = f.forma_pago;
    document.getElementById("estadoFactura").value = f.estado;
    document.getElementById("tituloFormFactura").innerText = "Editar Factura";
}

function eliminarFactura(index) {
    if (confirm("¿Está seguro de que desea eliminar esta factura?")) {
        facturas.splice(index, 1);
        actualizarTablaFacturas();
        actualizarInicio();
    }
}

function limpiarFormFactura() {
    document.getElementById("idFactura").value = "-1";
    document.getElementById("fechaFactura").value = "";
    document.getElementById("descFactura").value = "";
    document.getElementById("residenteFactura").value = "";
    document.getElementById("tipoPagoFactura").value = "Alquiler";
    document.getElementById("formaPagoFactura").value = "Efectivo";
    document.getElementById("estadoFactura").value = "Pendiente";
    document.getElementById("tituloFormFactura").innerText = "Agregar Factura";
    ocultarError("errorFactura");
}

document.getElementById("formFactura").addEventListener("submit", function (event) {
    event.preventDefault();
    let fecha = document.getElementById("fechaFactura").value;
    let desc = document.getElementById("descFactura").value;
    let residente = document.getElementById("residenteFactura").value;
    if (fecha == "" || desc == "" || residente == "") {
        mostrarError("errorFactura", "Fecha, descripción y residente son obligatorios.");
        return;
    }
    ocultarError("errorFactura");
    let nuevo = {
        id: facturas.length + 1,
        fecha: fecha,
        descripcion: desc,
        residente: Number(residente),
        tipo_pago: document.getElementById("tipoPagoFactura").value,
        forma_pago: document.getElementById("formaPagoFactura").value,
        estado: document.getElementById("estadoFactura").value
    };
    let idEdit = document.getElementById("idFactura").value;
    if (idEdit != "-1") {
        facturas[Number(idEdit)] = nuevo;
        mostrarExito("exitoFactura", "Factura actualizada correctamente.");
    } else {
        facturas.push(nuevo);
        mostrarExito("exitoFactura", "Factura agregada correctamente.");
    }
    actualizarTablaFacturas();
    actualizarInicio();
    limpiarFormFactura();
});

// ===== SERVICIOS =====

function actualizarTablaServicios() {
    let tbody = document.getElementById("tablaServicios");
    tbody.innerHTML = "";
    for (let i = 0; i < servicios.length; i++) {
        let s = servicios[i];
        let claseEstado = s.estado == "Activo" ? "estado-activo" : s.estado == "Finalizado" ? "estado-inactivo" : "estado-pendiente";
        tbody.innerHTML += "<tr><td>" + s.descripcion + "</td><td>" + s.tipo + "</td><td>" + (s.fecha_salida || "--") + "</td><td class='" + claseEstado + "'>" + s.estado + "</td><td><button class='btn-editar' onclick='editarServicio(" + i + ")'>Editar</button> <button class='btn-eliminar' onclick='eliminarServicio(" + i + ")'>Eliminar</button></td></tr>";
    }
}

function editarServicio(index) {
    let s = servicios[index];
    document.getElementById("idServicio").value = index;
    document.getElementById("descServicio").value = s.descripcion;
    document.getElementById("tipoServicio").value = s.tipo;
    document.getElementById("fechaSalidaServicio").value = s.fecha_salida;
    document.getElementById("estadoServicio").value = s.estado;
    document.getElementById("tituloFormServicio").innerText = "Editar Servicio";
}

function eliminarServicio(index) {
    if (confirm("¿Está seguro de que desea eliminar este servicio?")) {
        servicios.splice(index, 1);
        actualizarTablaServicios();
    }
}

function limpiarFormServicio() {
    document.getElementById("idServicio").value = "-1";
    document.getElementById("descServicio").value = "";
    document.getElementById("tipoServicio").value = "Plomería";
    document.getElementById("fechaSalidaServicio").value = "";
    document.getElementById("estadoServicio").value = "Activo";
    document.getElementById("tituloFormServicio").innerText = "Agregar Servicio";
    ocultarError("errorServicio");
}

document.getElementById("formServicio").addEventListener("submit", function (event) {
    event.preventDefault();
    let desc = document.getElementById("descServicio").value;
    if (desc == "") {
        mostrarError("errorServicio", "La descripción es obligatoria.");
        return;
    }
    ocultarError("errorServicio");
    let nuevo = {
        id: servicios.length + 1,
        descripcion: desc,
        tipo: document.getElementById("tipoServicio").value,
        fecha_salida: document.getElementById("fechaSalidaServicio").value,
        estado: document.getElementById("estadoServicio").value
    };
    let idEdit = document.getElementById("idServicio").value;
    if (idEdit != "-1") {
        servicios[Number(idEdit)] = nuevo;
        mostrarExito("exitoServicio", "Servicio actualizado correctamente.");
    } else {
        servicios.push(nuevo);
        mostrarExito("exitoServicio", "Servicio agregado correctamente.");
    }
    actualizarTablaServicios();
    limpiarFormServicio();
});

// ===== EVENTOS =====

function actualizarTablaEventos() {
    let tbody = document.getElementById("tablaEventos");
    tbody.innerHTML = "";
    for (let i = 0; i < eventos.length; i++) {
        let e = eventos[i];
        let claseEstado = e.estado == "Activo" ? "estado-pendiente" : "estado-activo";
        tbody.innerHTML += "<tr><td>" + e.descripcion + "</td><td>" + e.tipo + "</td><td>" + e.fecha + "</td><td class='" + claseEstado + "'>" + e.estado + "</td><td><button class='btn-editar' onclick='editarEvento(" + i + ")'>Editar</button> <button class='btn-eliminar' onclick='eliminarEvento(" + i + ")'>Eliminar</button></td></tr>";
    }
}

function editarEvento(index) {
    let e = eventos[index];
    document.getElementById("idEvento").value = index;
    document.getElementById("descEvento").value = e.descripcion;
    document.getElementById("tipoEvento").value = e.tipo;
    document.getElementById("fechaEvento").value = e.fecha;
    document.getElementById("estadoEvento").value = e.estado;
    document.getElementById("tituloFormEvento").innerText = "Editar Evento";
}

function eliminarEvento(index) {
    if (confirm("¿Está seguro de que desea eliminar este evento?")) {
        eventos.splice(index, 1);
        actualizarTablaEventos();
        actualizarInicio();
    }
}

function limpiarFormEvento() {
    document.getElementById("idEvento").value = "-1";
    document.getElementById("descEvento").value = "";
    document.getElementById("tipoEvento").value = "Incidente";
    document.getElementById("fechaEvento").value = "";
    document.getElementById("estadoEvento").value = "Activo";
    document.getElementById("tituloFormEvento").innerText = "Agregar Evento";
    ocultarError("errorEvento");
}

document.getElementById("formEvento").addEventListener("submit", function (event) {
    event.preventDefault();
    let desc = document.getElementById("descEvento").value;
    let fecha = document.getElementById("fechaEvento").value;
    if (desc == "" || fecha == "") {
        mostrarError("errorEvento", "Descripción y fecha son obligatorios.");
        return;
    }
    ocultarError("errorEvento");
    let nuevo = {
        id: eventos.length + 1,
        descripcion: desc,
        tipo: document.getElementById("tipoEvento").value,
        fecha: fecha,
        estado: document.getElementById("estadoEvento").value
    };
    let idEdit = document.getElementById("idEvento").value;
    if (idEdit != "-1") {
        eventos[Number(idEdit)] = nuevo;
        mostrarExito("exitoEvento", "Evento actualizado correctamente.");
    } else {
        eventos.push(nuevo);
        mostrarExito("exitoEvento", "Evento registrado correctamente.");
    }
    actualizarTablaEventos();
    actualizarInicio();
    limpiarFormEvento();
});

// ===== VEHICULOS =====

function actualizarTablaVehiculos() {
    let tbody = document.getElementById("tablaVehiculos");
    tbody.innerHTML = "";
    for (let i = 0; i < vehiculos.length; i++) {
        let v = vehiculos[i];
        let claseEstado = v.estado == "Activo" ? "estado-activo" : "estado-inactivo";
        tbody.innerHTML += "<tr><td>" + v.placa + "</td><td>" + v.descripcion + "</td><td>" + nombreResidente(v.residente) + "</td><td class='" + claseEstado + "'>" + v.estado + "</td><td><button class='btn-editar' onclick='cambiarEstadoVehiculo(" + i + ")'>Cambiar estado</button></td></tr>";
    }
}

function cambiarEstadoVehiculo(index) {
    vehiculos[index].estado = vehiculos[index].estado == "Activo" ? "Inactivo" : "Activo";
    actualizarTablaVehiculos();
}

// ===== INICIALIZAR TODO =====
cargarSelectResidencias("residenciaResidente");
actualizarInicio();
actualizarTablaGuardias();
actualizarTablaResidentes();
actualizarTablaResidencias();
actualizarTablaVisitantes();
actualizarTablaPaquetes();
actualizarTablaFacturas();
actualizarTablaServicios();
actualizarTablaEventos();
actualizarTablaVehiculos();
