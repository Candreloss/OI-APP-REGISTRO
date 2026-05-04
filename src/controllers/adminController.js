// src/controllers/adminController.js
const dbConnection = require('../config/database');
const connection = dbConnection();
const bcrypt = require('bcryptjs');

const adminController = {};

// Mostrar la vista de login
adminController.mostrarLogin = (req, res) => {
    res.render('admin/adminlogin', { title: 'Admin Login' });
};

// Procesar los datos del formulario
adminController.procesarLogin = (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.send('<script>alert("Por favor ingresa usuario y contraseña"); window.history.back();</script>');
    }

    // 1. Buscamos si el usuario existe en la base de datos
    const query = 'SELECT * FROM admin WHERE nombreUsuario = ?';
    connection.query(query, [username], async (err, resultados) => {
        if (err) {
            console.error('Error en login:', err);
            return res.status(500).send('Error interno del servidor');
        }

        // Si no hay resultados, el usuario no existe
        if (resultados.length === 0) {
            return res.send('<script>alert("Usuario no encontrado o credenciales inválidas"); window.history.back();</script>');
        }

        // 2. Extraemos el usuario encontrado
        const admin = resultados[0];

        // 3. LA MAGIA: Comparamos la contraseña en texto plano con el Hash de la BD
        const contrasenaValida = await bcrypt.compare(password, admin.contrasena);

        if (contrasenaValida) {
            // --- NUEVO: CREAMOS LA SESIÓN ---
            req.session.admin = {
                id: admin.id_admin,
                username: admin.nombreUsuario
            };
            
            console.log(`[LOGIN] Admin ${username} ha iniciado sesión.`);
            // Redirigimos a su panel de control privado
            res.redirect('/panel'); 
        } else {
            // Contraseña incorrecta
            res.send('<script>alert("Usuario no encontrado o credenciales inválidas"); window.history.back();</script>');
        }
    });
}; // <--- ¡AQUÍ ES DONDE DEBE CERRAR procesarLogin!

// Mostrar el panel de control (Dashboard)
// Mostrar el panel de control (Dashboard)
adminController.mostrarPanel = (req, res) => {
    // 1. Consulta maestra para obtener las métricas de las tarjetas superiores
    const queryStats = `
        SELECT
            (SELECT COUNT(*) FROM capacitacion_oferta WHERE capofestatus = 1) AS totalOfertas,
            (SELECT COUNT(*) FROM inscripcion WHERE ins_estado = 'pendiente') AS totalPendientes,
            (SELECT COUNT(*) FROM inscripcion WHERE ins_estado = 'conciliado') AS totalConciliados
    `;

    // 2. Consulta para traer la lista de ofertas activas para mostrarlas tipo "tarjeta"
    const queryOfertas = `
        SELECT co.capofcodigo, c.capnombre, co.capofcupos 
        FROM capacitacion_oferta co 
        JOIN capacitacion c ON co.capofcapcodigo = c.capcodigo 
        WHERE co.capofestatus = 1
    `;

    connection.query(queryStats, (errStats, statsResult) => {
        if (errStats) {
            console.error('Error cargando métricas:', errStats);
            return res.status(500).send('Error interno');
        }

        connection.query(queryOfertas, (errOfertas, ofertasResult) => {
            if (errOfertas) {
                console.error('Error cargando ofertas:', errOfertas);
                return res.status(500).send('Error interno');
            }

            // 3. Enviamos TODA la información a la vista
            res.render('admin/adminpanel', { 
                title: 'Panel de Control - OI',
                admin: req.session.admin,
                stats: statsResult[0], // Las métricas (totales)
                ofertas: ofertasResult // La lista de capacitaciones
            });
        });
    });
};

// Mostrar el formulario para crear una nueva oferta
adminController.mostrarNuevaOferta = (req, res) => {
    // Buscamos el catálogo de capacitaciones para llenar el <select>
    const query = 'SELECT capcodigo, capnombre FROM capacitacion ORDER BY capnombre ASC';
    
    connection.query(query, (err, resultados) => {
        if (err) {
            console.error('Error al cargar catálogo de capacitaciones:', err);
            return res.status(500).send('Error interno del servidor');
        }

        // Renderizamos la vista del formulario y le enviamos la lista
        res.render('admin/nuevaOferta', {
            title: 'Nueva Oferta - OI',
            admin: req.session.admin,
            capacitacionesBase: resultados
        });
    });
};

// Procesar el formulario y guardar la nueva oferta en la BD
adminController.procesarNuevaOferta = (req, res) => {
    // 1. Atrapamos los datos que vienen del formulario
    const { capofcapcodigo, fecha_inicio, fecha_fin, cupos } = req.body;

    // 2. Validación básica para asegurarnos de que no nos envíen datos vacíos
    if (!capofcapcodigo || !fecha_inicio || !fecha_fin || !cupos) {
        return res.send('<script>alert("Todos los campos son obligatorios."); window.history.back();</script>');
    }

    // 3. Validación lógica: La fecha de inicio no puede ser después de la fecha de fin
    if (new Date(fecha_inicio) > new Date(fecha_fin)) {
        return res.send('<script>alert("Error: La fecha de inicio no puede ser posterior a la fecha de fin."); window.history.back();</script>');
    }

    // 4. Inserción segura en la base de datos (Inyección SQL prevenida con '?')
    const query = `
        INSERT INTO capacitacion_oferta 
        (capofcapcodigo, capoffecha_inicio, capoffecha_fin, capofcupos, capofestatus) 
        VALUES (?, ?, ?, ?, 1)
    `;

    // Pasamos los valores en el mismo orden que los signos de interrogación
    connection.query(query, [capofcapcodigo, fecha_inicio, fecha_fin, cupos], (err, result) => {
        if (err) {
            console.error('Error al guardar la nueva oferta:', err);
            return res.status(500).send('Error interno del servidor');
        }

        // 5. ¡Éxito! Mostramos mensaje y devolvemos al admin a su panel principal
        console.log(`[ADMIN] Nueva oferta creada para la capacitación ID: ${capofcapcodigo}`);
        res.send('<script>alert("¡Oferta publicada con éxito!"); window.location.href="/panel";</script>');
    });
};

// Mostrar el Módulo Completo de Ofertas (Historial)
adminController.mostrarOfertas = (req, res) => {
    // Traemos TODAS las ofertas (Activas e Inactivas) ordenadas por la más reciente
    const query = `
        SELECT co.capofcodigo, c.capnombre, co.capoffecha_inicio, co.capoffecha_fin, co.capofcupos, co.capofestatus
        FROM capacitacion_oferta co
        JOIN capacitacion c ON co.capofcapcodigo = c.capcodigo
        ORDER BY co.capofcodigo DESC
    `;

    connection.query(query, (err, resultados) => {
        if (err) {
            console.error('Error cargando módulo de ofertas:', err);
            return res.status(500).send('Error interno del servidor');
        }

        res.render('admin/ofertas', {
            title: 'Gestión de Ofertas - OI',
            admin: req.session.admin,
            ofertas: resultados
        });
    });
};

// Activar o Desactivar una oferta (Borrado Lógico)
// Activar o Desactivar una oferta (Borrado Lógico)
adminController.toggleEstatusOferta = (req, res) => {
    // 1. BLINDAJE 1: Forzamos a que el ID sea estrictamente un número.
    // Si el navegador intenta hacer una "petición fantasma" enviando basura, lo filtramos.
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
        return res.redirect('/panel');
    }

    // 2. Buscamos el estatus actual
    connection.query('SELECT capofestatus FROM capacitacion_oferta WHERE capofcodigo = ?', [id], (err, rows) => {
        if (err || rows.length === 0) {
            console.error("No se encontró el ID o hubo un error:", err);
            return res.status(500).send('Error al buscar la oferta');
        }
        
        // 3. Invertimos el estatus (Si es 1 pasa a 0, si es 0 pasa a 1)
        const nuevoEstatus = rows[0].capofestatus === 1 ? 0 : 1;
        
        // 4. Actualizamos la base de datos
        connection.query('UPDATE capacitacion_oferta SET capofestatus = ? WHERE capofcodigo = ?', [nuevoEstatus, id], (err) => {
            if (err) return res.status(500).send('Error al actualizar estatus');
            
            // --- NUEVO: MENSAJE POR CONSOLA DE AUDITORÍA ---
            if (nuevoEstatus === 0) {
                console.log(`[SISTEMA] 🔴 Oferta ID: ${id} fue DESACTIVADA exitosamente por el administrador.`);
            } else {
                console.log(`[SISTEMA] 🟢 Oferta ID: ${id} fue ACTIVADA exitosamente por el administrador.`);
            }
            
            // 5. Redirección inteligente.
            const urlAnterior = req.get('Referer');
            
            if (urlAnterior && urlAnterior.includes('/panel/ofertas')) {
                res.redirect('/panel/ofertas'); 
            } else {
                res.redirect('/panel'); 
            }
        });
    });
};

// 1. Mostrar el formulario de edición pre-llenado
adminController.mostrarEditarOferta = (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.redirect('/panel/ofertas');

    // Buscamos los datos actuales de la oferta
    const queryOferta = 'SELECT * FROM capacitacion_oferta WHERE capofcodigo = ?';
    // Buscamos el catálogo completo para el <select>
    const queryCapacitaciones = 'SELECT capcodigo, capnombre FROM capacitacion ORDER BY capnombre ASC';

    connection.query(queryOferta, [id], (err, ofertaResult) => {
        if (err || ofertaResult.length === 0) {
            return res.status(500).send('Error al buscar la oferta a editar');
        }

        connection.query(queryCapacitaciones, (errCap, capResult) => {
            if (errCap) return res.status(500).send('Error al cargar catálogo');

            res.render('admin/editarOferta', {
                title: 'Editar Oferta - OI',
                admin: req.session.admin,
                oferta: ofertaResult[0], // Los datos que ya estaban
                capacitacionesBase: capResult
            });
        });
    });
};

// 2. Procesar y guardar los cambios
adminController.procesarEditarOferta = (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { capofcapcodigo, fecha_inicio, fecha_fin, cupos } = req.body;

    if (isNaN(id) || !capofcapcodigo || !fecha_inicio || !fecha_fin || !cupos) {
        return res.send('<script>alert("Datos inválidos o incompletos."); window.history.back();</script>');
    }

    if (new Date(fecha_inicio) > new Date(fecha_fin)) {
        return res.send('<script>alert("Error: La fecha de inicio no puede ser posterior a la fecha de fin."); window.history.back();</script>');
    }

    const query = `
        UPDATE capacitacion_oferta 
        SET capofcapcodigo = ?, capoffecha_inicio = ?, capoffecha_fin = ?, capofcupos = ?
        WHERE capofcodigo = ?
    `;

    connection.query(query, [capofcapcodigo, fecha_inicio, fecha_fin, cupos, id], (err) => {
        if (err) return res.status(500).send('Error al actualizar la oferta');
        
        console.log(`[SISTEMA] ✏️ Oferta ID: ${id} fue EDITADA exitosamente.`);
        res.send('<script>alert("¡Oferta actualizada con éxito!"); window.location.href="/panel/ofertas";</script>');
    });
};

module.exports = adminController;