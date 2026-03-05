// ===== DATOS DE EJEMPLO (luego se reemplazan con llamadas PHP) =====

let residencias = [
    { id: 1, monto_alquiler: 350000, monto_mantenimiento: 25000, tipo_pago: "Mensual", estado: "Activo" },
    { id: 2, monto_alquiler: 280000, monto_mantenimiento: 25000, tipo_pago: "Mensual", estado: "Activo" },
    { id: 3, monto_alquiler: 400000, monto_mantenimiento: 25000, tipo_pago: "Mensual", estado: "Activo" }
];

let residentes = [
    { id: 1, nombre: "Carlos", ap_paterno: "Mora", ap_materno: "Pérez", telefono: "8888-1111", residencia: 1, estado: "Activo" },
    { id: 2, nombre: "Lucía", ap_paterno: "Vega", ap_materno: "Solano", telefono: "8888-2222", residencia: 2, estado: "Activo" },
    { id: 3, nombre: "Roberto", ap_paterno: "Arce", ap_materno: "Blanco", telefono: "8888-3333", residencia: 3, estado: "Activo" }
];

let visitantes = [
    { id: 1, nombre: "Ana Torres", residencia: 1, rol: "Visitante", fecha_ingreso: "2026-03-05 08:30", fecha_salida: "2026-03-05 10:00", estado: "Salió" },
    { id: 2, nombre: "Delivery Express", residencia: 2, rol: "Proveedor", fecha_ingreso: "2026-03-05 09:00", fecha_salida: "", estado: "Dentro" }
];

let paquetes = [
    { id: 1, descripcion: "Caja Amazon", residencia: 1, fecha_ingreso: "2026-03-04", fecha_salida: "", estado: "Pendiente" },
    { id: 2, descripcion: "Paquete Correos CR", residencia: 3, fecha_ingreso: "2026-03-05", fecha_salida: "2026-03-05", estado: "Entregado" }
];

let vehiculos = [
    { id: 1, placa: "ABC-123", descripcion: "Toyota Corolla gris", residente: 1, estado: "Activo" },
    { id: 2, placa: "XYZ-456", descripcion: "Hyundai Tucson blanco", residente: 2, estado: "Activo" }
];

let eventos = [
    { id: 1, descripcion: "Visita de fumigación programada", tipo: "Mantenimiento", fecha: "2026-03-05", estado: "Resuelto" },
    { id: 2, descripcion: "Persona sospechosa en el portón norte", tipo: "Incidente", fecha: "2026-03-05", estado: "Activo" }
];

let turnos = [
    { fecha: "2026-03-05", horario: "06:00 - 14:00", turno: "Diurno", estado: "Activo" },
    { fecha: "2026-03-06", horario: "14:00 - 22:00", turno: "Vespertino", estado: "Pendiente" },
    { fecha: "2026-03-07", horario: "22:00 - 06:00", turno: "Nocturno", estado: "Pendiente" }
];

// ===== NAVEGACION =====

function mostrarSeccion(id) {
    let secciones = document.querySelectorAll(".seccion");
    for (let i = 0; i < secciones.length; i++) {
        secciones[i].classList.remove("activa");
    }
    document.getElementById(id).classList.add("activa");

    let links = document.querySelectorAll(".nav-link");
    for (let i = 0; i < links.length; i++) {
        links[i].classList.remove("activo");
    }
}

// ===== CARGAR SELECTS DE RESIDENCIAS =====

function cargarSelectsResidencias() {
    let selects = ["residenciaVisitante", "residenciaPaquete"];
    for (let s = 0; s < selects.length; s++) {
        let select = document.getElementById(selects[s]);
        select.innerHTML = "<option value=''>-- Seleccione --</option>";
        for (let i = 0; i < residencias.length; i++) {
            select.innerHTML += "<option value='" + residencias[i].id + "'>Residencia #" + residencias[i].id + "</option>";
        }
    }
}

function cargarSelectResidentes() {
    let select = document.getElementById("residenteVehiculo");
    select.innerHTML = "<option value=''>-- Seleccione --</option>";
    for (let i = 0; i < residentes.length; i++) {
        select.innerHTML += "<option value='" + residentes[i].id + "'>" + residentes[i].nombre + " " + residentes[i].ap_paterno + "</option>";
    }
}

// ===== INICIO =====

function actualizarInicio() {
    document.getElementById("totalVisitantes").innerText = visitantes.length;
    document.getElementById("totalPaquetes").innerText = paquetes.filter(function (p) { return p.estado == "Pendiente"; }).length;
    document.getElementById("totalEventos").innerText = eventos.length;
    document.getElementById("totalVehiculos").innerText = vehiculos.length;

    let tbody = document.getElementById("tablaUltimasVisitas");
    tbody.innerHTML = "";
    for (let i = 0; i < visitantes.length; i++) {
        let v = visitantes[i];
        let resNombre = "Residencia #" + v.residencia;
        let claseEstado = v.estado == "Dentro" ? "estado-activo" : "estado-inactivo";
        tbody.innerHTML += "<tr><td>" + v.nombre + "</td><td>" + resNombre + "</td><td>" + v.fecha_ingreso + "</td><td class='" + claseEstado + "'>" + v.estado + "</td></tr>";
    }
}

// ===== TURNOS =====

function actualizarTurnos() {
    let tbody = document.getElementById("tablaTurnos");
    tbody.innerHTML = "";
    for (let i = 0; i < turnos.length; i++) {
        let t = turnos[i];
        let claseEstado = t.estado == "Activo" ? "estado-activo" : "estado-pendiente";
        tbody.innerHTML += "<tr><td>" + t.fecha + "</td><td>" + t.horario + "</td><td>" + t.turno + "</td><td class='" + claseEstado + "'>" + t.estado + "</td></tr>";
    }
}

// ===== VISITANTES =====

function actualizarTablaVisitantes() {
    let tbody = document.getElementById("tablaVisitantes");
    tbody.innerHTML = "";
    for (let i = 0; i < visitantes.length; i++) {
        let v = visitantes[i];
        let claseEstado = v.estado == "Dentro" ? "estado-activo" : "estado-inactivo";
        tbody.innerHTML += "<tr><td>" + v.nombre + "</td><td>Residencia #" + v.residencia + "</td><td>" + v.fecha_ingreso + "</td><td>" + (v.fecha_salida || "--") + "</td><td class='" + claseEstado + "'>" + v.estado + "</td><td><button class='btn-editar' onclick='editarVisitante(" + i + ")'>Editar</button></td></tr>";
    }
}

function editarVisitante(index) {
    let v = visitantes[index];
    document.getElementById("idVisitante").value = index;
    document.getElementById("nombreVisitante").value = v.nombre;
    document.getElementById("residenciaVisitante").value = v.residencia;
    document.getElementById("rolVisitante").value = v.rol;
    document.getElementById("fechaIngresoVisitante").value = v.fecha_ingreso;
    document.getElementById("fechaSalidaVisitante").value = v.fecha_salida;
    document.getElementById("estadoVisitante").value = v.estado;
    document.getElementById("tituloFormVisitante").innerText = "Editar Visitante";
}

function limpiarFormVisitante() {
    document.getElementById("idVisitante").value = "-1";
    document.getElementById("nombreVisitante").value = "";
    document.getElementById("residenciaVisitante").value = "";
    document.getElementById("rolVisitante").value = "Visitante";
    document.getElementById("fechaIngresoVisitante").value = "";
    document.getElementById("fechaSalidaVisitante").value = "";
    document.getElementById("estadoVisitante").value = "Dentro";
    document.getElementById("tituloFormVisitante").innerText = "Registrar Visitante";
    document.getElementById("errorVisitante").style.display = "none";
    document.getElementById("exitoVisitante").style.display = "none";
}

document.getElementById("formVisitante").addEventListener("submit", function (event) {
    event.preventDefault();
    let nombre = document.getElementById("nombreVisitante").value;
    let residencia = document.getElementById("residenciaVisitante").value;
    let error = document.getElementById("errorVisitante");
    let exito = document.getElementById("exitoVisitante");

    if (nombre == "" || residencia == "") {
        error.innerText = "Por favor complete los campos obligatorios.";
        error.style.display = "block";
        return;
    }
    error.style.display = "none";

    let nuevo = {
        id: visitantes.length + 1,
        nombre: nombre,
        residencia: Number(residencia),
        rol: document.getElementById("rolVisitante").value,
        fecha_ingreso: document.getElementById("fechaIngresoVisitante").value,
        fecha_salida: document.getElementById("fechaSalidaVisitante").value,
        estado: document.getElementById("estadoVisitante").value
    };

    let idEdit = document.getElementById("idVisitante").value;
    if (idEdit != "-1") {
        visitantes[Number(idEdit)] = nuevo;
        exito.innerText = "Visitante actualizado correctamente.";
    } else {
        visitantes.push(nuevo);
        exito.innerText = "Visitante registrado correctamente.";
    }
    exito.style.display = "block";
    setTimeout(function () { exito.style.display = "none"; }, 3000);
    actualizarTablaVisitantes();
    actualizarInicio();
    limpiarFormVisitante();
});

// ===== PAQUETES =====

function actualizarTablaPaquetes() {
    let tbody = document.getElementById("tablaPaquetes");
    tbody.innerHTML = "";
    for (let i = 0; i < paquetes.length; i++) {
        let p = paquetes[i];
        let claseEstado = p.estado == "Pendiente" ? "estado-pendiente" : "estado-activo";
        tbody.innerHTML += "<tr><td>" + p.descripcion + "</td><td>Residencia #" + p.residencia + "</td><td>" + p.fecha_ingreso + "</td><td>" + (p.fecha_salida || "--") + "</td><td class='" + claseEstado + "'>" + p.estado + "</td><td><button class='btn-editar' onclick='editarPaquete(" + i + ")'>Editar</button></td></tr>";
    }
}

function editarPaquete(index) {
    let p = paquetes[index];
    document.getElementById("idPaquete").value = index;
    document.getElementById("descPaquete").value = p.descripcion;
    document.getElementById("residenciaPaquete").value = p.residencia;
    document.getElementById("fechaIngresoPaquete").value = p.fecha_ingreso;
    document.getElementById("fechaSalidaPaquete").value = p.fecha_salida;
    document.getElementById("estadoPaquete").value = p.estado;
    document.getElementById("tituloFormPaquete").innerText = "Editar Paquete";
}

function limpiarFormPaquete() {
    document.getElementById("idPaquete").value = "-1";
    document.getElementById("descPaquete").value = "";
    document.getElementById("residenciaPaquete").value = "";
    document.getElementById("fechaIngresoPaquete").value = "";
    document.getElementById("fechaSalidaPaquete").value = "";
    document.getElementById("estadoPaquete").value = "Pendiente";
    document.getElementById("tituloFormPaquete").innerText = "Registrar Paquete";
    document.getElementById("errorPaquete").style.display = "none";
    document.getElementById("exitoPaquete").style.display = "none";
}

document.getElementById("formPaquete").addEventListener("submit", function (event) {
    event.preventDefault();
    let desc = document.getElementById("descPaquete").value;
    let residencia = document.getElementById("residenciaPaquete").value;
    let error = document.getElementById("errorPaquete");
    let exito = document.getElementById("exitoPaquete");

    if (desc == "" || residencia == "") {
        error.innerText = "Por favor complete los campos obligatorios.";
        error.style.display = "block";
        return;
    }
    error.style.display = "none";

    let nuevo = {
        id: paquetes.length + 1,
        descripcion: desc,
        residencia: Number(residencia),
        fecha_ingreso: document.getElementById("fechaIngresoPaquete").value,
        fecha_salida: document.getElementById("fechaSalidaPaquete").value,
        estado: document.getElementById("estadoPaquete").value
    };

    let idEdit = document.getElementById("idPaquete").value;
    if (idEdit != "-1") {
        paquetes[Number(idEdit)] = nuevo;
        exito.innerText = "Paquete actualizado correctamente.";
    } else {
        paquetes.push(nuevo);
        exito.innerText = "Paquete registrado correctamente.";
    }
    exito.style.display = "block";
    setTimeout(function () { exito.style.display = "none"; }, 3000);
    actualizarTablaPaquetes();
    actualizarInicio();
    limpiarFormPaquete();
});

// ===== VEHICULOS =====

function actualizarTablaVehiculos() {
    let tbody = document.getElementById("tablaVehiculos");
    tbody.innerHTML = "";
    for (let i = 0; i < vehiculos.length; i++) {
        let v = vehiculos[i];
        let residente = residentes.find(function (r) { return r.id == v.residente; });
        let nombreResidente = residente ? residente.nombre + " " + residente.ap_paterno : "--";
        let claseEstado = v.estado == "Activo" ? "estado-activo" : "estado-inactivo";
        tbody.innerHTML += "<tr><td>" + v.placa + "</td><td>" + v.descripcion + "</td><td>" + nombreResidente + "</td><td class='" + claseEstado + "'>" + v.estado + "</td><td><button class='btn-editar' onclick='editarVehiculo(" + i + ")'>Editar</button></td></tr>";
    }
}

function editarVehiculo(index) {
    let v = vehiculos[index];
    document.getElementById("idVehiculo").value = index;
    document.getElementById("placaVehiculo").value = v.placa;
    document.getElementById("descVehiculo").value = v.descripcion;
    document.getElementById("residenteVehiculo").value = v.residente;
    document.getElementById("estadoVehiculo").value = v.estado;
    document.getElementById("tituloFormVehiculo").innerText = "Editar Vehículo";
}

function limpiarFormVehiculo() {
    document.getElementById("idVehiculo").value = "-1";
    document.getElementById("placaVehiculo").value = "";
    document.getElementById("descVehiculo").value = "";
    document.getElementById("residenteVehiculo").value = "";
    document.getElementById("estadoVehiculo").value = "Activo";
    document.getElementById("tituloFormVehiculo").innerText = "Registrar Vehículo";
    document.getElementById("errorVehiculo").style.display = "none";
    document.getElementById("exitoVehiculo").style.display = "none";
}

document.getElementById("formVehiculo").addEventListener("submit", function (event) {
    event.preventDefault();
    let placa = document.getElementById("placaVehiculo").value;
    let residente = document.getElementById("residenteVehiculo").value;
    let error = document.getElementById("errorVehiculo");
    let exito = document.getElementById("exitoVehiculo");

    if (placa == "" || residente == "") {
        error.innerText = "Por favor complete los campos obligatorios.";
        error.style.display = "block";
        return;
    }
    error.style.display = "none";

    let nuevo = {
        id: vehiculos.length + 1,
        placa: placa,
        descripcion: document.getElementById("descVehiculo").value,
        residente: Number(residente),
        estado: document.getElementById("estadoVehiculo").value
    };

    let idEdit = document.getElementById("idVehiculo").value;
    if (idEdit != "-1") {
        vehiculos[Number(idEdit)] = nuevo;
        exito.innerText = "Vehículo actualizado correctamente.";
    } else {
        vehiculos.push(nuevo);
        exito.innerText = "Vehículo registrado correctamente.";
    }
    exito.style.display = "block";
    setTimeout(function () { exito.style.display = "none"; }, 3000);
    actualizarTablaVehiculos();
    limpiarFormVehiculo();
});

// ===== EVENTOS =====

function actualizarTablaEventos() {
    let tbody = document.getElementById("tablaEventos");
    tbody.innerHTML = "";
    for (let i = 0; i < eventos.length; i++) {
        let e = eventos[i];
        let claseEstado = e.estado == "Activo" ? "estado-pendiente" : "estado-activo";
        tbody.innerHTML += "<tr><td>" + e.descripcion + "</td><td>" + e.tipo + "</td><td>" + e.fecha + "</td><td class='" + claseEstado + "'>" + e.estado + "</td><td><button class='btn-editar' onclick='editarEvento(" + i + ")'>Editar</button></td></tr>";
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

function limpiarFormEvento() {
    document.getElementById("idEvento").value = "-1";
    document.getElementById("descEvento").value = "";
    document.getElementById("tipoEvento").value = "Incidente";
    document.getElementById("fechaEvento").value = "";
    document.getElementById("estadoEvento").value = "Activo";
    document.getElementById("tituloFormEvento").innerText = "Registrar Evento";
    document.getElementById("errorEvento").style.display = "none";
    document.getElementById("exitoEvento").style.display = "none";
}

document.getElementById("formEvento").addEventListener("submit", function (event) {
    event.preventDefault();
    let desc = document.getElementById("descEvento").value;
    let fecha = document.getElementById("fechaEvento").value;
    let error = document.getElementById("errorEvento");
    let exito = document.getElementById("exitoEvento");

    if (desc == "" || fecha == "") {
        error.innerText = "Por favor complete los campos obligatorios.";
        error.style.display = "block";
        return;
    }
    error.style.display = "none";

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
        exito.innerText = "Evento actualizado correctamente.";
    } else {
        eventos.push(nuevo);
        exito.innerText = "Evento registrado correctamente.";
    }
    exito.style.display = "block";
    setTimeout(function () { exito.style.display = "none"; }, 3000);
    actualizarTablaEventos();
    actualizarInicio();
    limpiarFormEvento();
});

// ===== RESIDENTES (SOLO VER) =====

function actualizarTablaResidentes() {
    let tbody = document.getElementById("tablaResidentes");
    tbody.innerHTML = "";
    for (let i = 0; i < residentes.length; i++) {
        let r = residentes[i];
        let claseEstado = r.estado == "Activo" ? "estado-activo" : "estado-inactivo";
        tbody.innerHTML += "<tr><td>" + r.nombre + "</td><td>" + r.ap_paterno + "</td><td>" + r.ap_materno + "</td><td>" + r.telefono + "</td><td>Residencia #" + r.residencia + "</td><td class='" + claseEstado + "'>" + r.estado + "</td></tr>";
    }
}

// ===== RESIDENCIAS (SOLO VER) =====

function actualizarTablaResidencias() {
    let tbody = document.getElementById("tablaResidencias");
    tbody.innerHTML = "";
    for (let i = 0; i < residencias.length; i++) {
        let r = residencias[i];
        let claseEstado = r.estado == "Activo" ? "estado-activo" : "estado-inactivo";
        tbody.innerHTML += "<tr><td>#" + r.id + "</td><td>₡" + r.monto_alquiler.toLocaleString() + "</td><td>₡" + r.monto_mantenimiento.toLocaleString() + "</td><td>" + r.tipo_pago + "</td><td class='" + claseEstado + "'>" + r.estado + "</td></tr>";
    }
}

// ===== INICIALIZAR TODO =====
cargarSelectsResidencias();
cargarSelectResidentes();
actualizarInicio();
actualizarTurnos();
actualizarTablaVisitantes();
actualizarTablaPaquetes();
actualizarTablaVehiculos();
actualizarTablaEventos();
actualizarTablaResidentes();
actualizarTablaResidencias();
