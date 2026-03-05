function mostrarSeccion(id) {
    let secciones = document.querySelectorAll(".seccion");
    for (let i = 0; i < secciones.length; i++) {
        secciones[i].classList.remove("activa");
    }
    document.getElementById(id).classList.add("activa");
}