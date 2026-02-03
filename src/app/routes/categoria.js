
// LOGICA DE LA APLICACION


const { jsPDF } = require("jspdf");
const dbConnection = require("../../config/dbConnection");

module.exports = app => {

    console.log("Cargando rutas: categoria.js");

    const connection = dbConnection();

    // Página inicial
    app.get('/', (req, res) => {
        console.log("GET / -> render categorias (vacío)");
        // indicar que no se encontró nada aún
        res.render("categorias/categorias", { registro: [], mensaje: null, tipoMensaje: null, codigoBuscado: null, encontrado: false });
    });

    // Buscar por codigo (desde el form name="codigo")
    app.post('/busqueda', (req, res) => {
        const codigo_input = (req.body.codigo || "").trim();
        console.log("POST /busqueda codigo:", codigo_input);

        // la entrada no puede estar vacía
        if (!codigo_input) {
            return res.render("categorias/categorias", { registro: [], mensaje: "Ingrese un código para buscar", tipoMensaje: "danger", codigoBuscado: null, encontrado: false });
        }
        // Busqueda en la base de datos
        connection.query('SELECT * FROM principal WHERE codigo = ?', [codigo_input], (err, result) => {
            // Si no encuentra o hay error
            if (err) {
                console.error("Error en la consulta:", err);
                return res.status(500).send("Error en la base de datos");
            }
            // Si encuentra resultados
            console.log("Resultados encontrados:", result.length);
            
            // Si no hay resultado o es 0 (vacio)
            if (!result || result.length === 0) {
                // no encontrado -> dejar bloqueado validación y mostrar mensaje
                return res.render("categorias/categorias", { registro: [], mensaje: `No existe registro con código ${codigo_input}`, tipoMensaje: "danger", codigoBuscado: codigo_input, encontrado: false });
            }
            // Encontrado -> habilitar validación (cuadro de input y botón)
            res.render("categorias/categorias", { registro: result, mensaje: null, tipoMensaje: null, codigoBuscado: codigo_input, encontrado: true });
        });
    });

    // Validar/activar entrada por código
    app.post("/validacion", (req, res) => {
        const { codval } = req.body;
        console.log("POST /validacion codigo:", codval);
        if (!codval) {
            return res.render("categorias/categorias", { registro: [], mensaje: "Debe enviar un código", tipoMensaje: "danger", codigoBuscado: null, encontrado: false });
        }

        // Actualiza verificado=1 y guarda la fecha y hora completas en la columna 'tiempo'
        connection.query(
            "UPDATE principal SET verificado = 1, tiempo = NOW() WHERE codigo = ?",
            [codval],
            (err, result) => {
                if (err) {
                    console.error("Error al actualizar:", err);
                    return res.status(500).send("Error al actualizar");
                }
                // Si no se afectaron filas, el código no existe
                if (result.affectedRows === 0) {
                    console.log("Código no encontrado:", codval);
                    return res.render("categorias/categorias", { registro: [], mensaje: "Código no encontrado", tipoMensaje: "danger", codigoBuscado: codval, encontrado: false });
                }

                // Obtener el registro actualizado para mostrar en la vista
                connection.query('SELECT * FROM principal WHERE codigo = ?', [codval], (err2, rows) => {
                    if (err2) {
                        console.error("Error al consultar registro actualizado:", err2);
                        return res.status(500).send("Error en la base de datos");
                    }
                    console.log("Registro actualizado correctamente:", codval);
                    // después de validar, limpiamos el campo (bloqueado nuevamente)
                    res.render("categorias/categorias", { registro: rows || [], mensaje: "Entrada validada correctamente", tipoMensaje: "success", codigoBuscado: null, encontrado: false });
                });
            }
        );
    });

}
