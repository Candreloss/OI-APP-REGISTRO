// src/controllers/adminController.js
const dbConnection = require('../config/database');
const connection = dbConnection();
const bcrypt = require('bcryptjs');

const adminController = {};

adminController.mostrarLogin = (req, res) => res.render('admin/adminlogin', { title: 'Admin Login' });

adminController.procesarLogin = (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.send('<script>alert("Por favor ingresa usuario y contraseña"); window.history.back();</script>');

    connection.query('SELECT * FROM admin WHERE nombreUsuario = ?', [username], async (err, resultados) => {
        if (err) return res.status(500).send('Error interno');
        if (resultados.length === 0) return res.send('<script>alert("Credenciales inválidas"); window.history.back();</script>');

        const admin = resultados[0];
        const contrasenaValida = await bcrypt.compare(password, admin.contrasena);

        if (contrasenaValida) {
            req.session.admin = { id: admin.id_admin, username: admin.nombreUsuario };
            const timestamp = new Date().toLocaleString('es-VE');
            console.log(`[AUDITORÍA] [${timestamp}] - LOGIN EXITOSO | Admin: ${username}`);
            res.redirect('/panel'); 
        } else {
            res.send('<script>alert("Credenciales inválidas"); window.history.back();</script>');
        }
    });
};

adminController.mostrarPanel = (req, res) => {
    const queryStats = `SELECT
        (SELECT COUNT(*) FROM capacitacion_oferta WHERE capofestatus = 1) AS totalOfertas,
        (SELECT COUNT(*) FROM inscripcion WHERE ins_estado = 'pendiente') AS totalPendientes,
        (SELECT COUNT(*) FROM inscripcion WHERE ins_estado = 'conciliado') AS totalConciliados`;
    const queryOfertas = `SELECT co.capofcodigo, c.capnombre, co.capofcupos FROM capacitacion_oferta co JOIN capacitacion c ON co.capofcapcodigo = c.capcodigo WHERE co.capofestatus = 1`;

    connection.query(queryStats, (errStats, statsResult) => {
        if (errStats) return res.status(500).send('Error interno');
        connection.query(queryOfertas, (errOfertas, ofertasResult) => {
            if (errOfertas) return res.status(500).send('Error interno');
            res.render('admin/adminpanel', { title: 'Panel de Control - OI', admin: req.session.admin, stats: statsResult[0], ofertas: ofertasResult });
        });
    });
};

adminController.mostrarNuevaOferta = (req, res) => {
    connection.query('SELECT capcodigo, capnombre FROM capacitacion ORDER BY capnombre ASC', (err, resultados) => {
        if (err) return res.status(500).send('Error interno');
        res.render('admin/nuevaOferta', { title: 'Nueva Oferta - OI', admin: req.session.admin, capacitacionesBase: resultados });
    });
};

adminController.procesarNuevaOferta = (req, res) => {
    const { capofcapcodigo, fecha_inicio, fecha_fin, cupos } = req.body;
    if (!capofcapcodigo || !fecha_inicio || !fecha_fin || !cupos) return res.send('<script>alert("Todos los campos son obligatorios."); window.history.back();</script>');
    if (new Date(fecha_inicio) > new Date(fecha_fin)) return res.send('<script>alert("Error: Fecha de inicio posterior a fin."); window.history.back();</script>');

    const query = `INSERT INTO capacitacion_oferta (capofcapcodigo, capoffecha_inicio, capoffecha_fin, capofcupos, capofestatus) VALUES (?, ?, ?, ?, 1)`;
    connection.query(query, [capofcapcodigo, fecha_inicio, fecha_fin, cupos], (err, result) => {
        if (err) return res.status(500).send('Error interno');
        
        const timestamp = new Date().toLocaleString('es-VE');
        console.log(`[AUDITORÍA] [${timestamp}] - CREACIÓN DE OFERTA | Admin: ${req.session.admin.username} | CapID: ${capofcapcodigo}`);
        res.send('<script>alert("¡Oferta publicada con éxito!"); window.location.href="/panel";</script>');
    });
};

adminController.mostrarOfertas = (req, res) => {
    const query = `SELECT co.capofcodigo, c.capnombre, co.capoffecha_inicio, co.capoffecha_fin, co.capofcupos, co.capofestatus FROM capacitacion_oferta co JOIN capacitacion c ON co.capofcapcodigo = c.capcodigo ORDER BY co.capofcodigo DESC`;
    connection.query(query, (err, resultados) => {
        if (err) return res.status(500).send('Error interno');
        res.render('admin/ofertas', { title: 'Gestión de Ofertas - OI', admin: req.session.admin, ofertas: resultados });
    });
};

adminController.toggleEstatusOferta = (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.redirect('/panel');

    connection.query('SELECT capofestatus FROM capacitacion_oferta WHERE capofcodigo = ?', [id], (err, rows) => {
        if (err || rows.length === 0) return res.status(500).send('Error al buscar la oferta');
        const nuevoEstatus = rows[0].capofestatus === 1 ? 0 : 1;
        
        connection.query('UPDATE capacitacion_oferta SET capofestatus = ? WHERE capofcodigo = ?', [nuevoEstatus, id], (err) => {
            if (err) return res.status(500).send('Error al actualizar');
            
            const timestamp = new Date().toLocaleString('es-VE');
            const accion = nuevoEstatus === 0 ? 'DESACTIVÓ 🔴' : 'ACTIVÓ 🟢';
            console.log(`[AUDITORÍA] [${timestamp}] - ESTATUS MODIFICADO | Admin: ${req.session.admin.username} | ${accion} Oferta ID: ${id}`);
            
            const urlAnterior = req.get('Referer');
            if (urlAnterior && urlAnterior.includes('/panel/ofertas')) res.redirect('/panel/ofertas'); 
            else res.redirect('/panel'); 
        });
    });
};

adminController.mostrarEditarOferta = (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.redirect('/panel/ofertas');

    connection.query('SELECT * FROM capacitacion_oferta WHERE capofcodigo = ?', [id], (err, ofertaResult) => {
        if (err || ofertaResult.length === 0) return res.status(500).send('Error interno');
        connection.query('SELECT capcodigo, capnombre FROM capacitacion ORDER BY capnombre ASC', (errCap, capResult) => {
            if (errCap) return res.status(500).send('Error interno');
            res.render('admin/editarOferta', { title: 'Editar Oferta - OI', admin: req.session.admin, oferta: ofertaResult[0], capacitacionesBase: capResult });
        });
    });
};

adminController.procesarEditarOferta = (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { capofcapcodigo, fecha_inicio, fecha_fin, cupos } = req.body;

    if (isNaN(id) || !capofcapcodigo || !fecha_inicio || !fecha_fin || !cupos) return res.send('<script>alert("Datos inválidos."); window.history.back();</script>');
    if (new Date(fecha_inicio) > new Date(fecha_fin)) return res.send('<script>alert("Error: Fecha de inicio posterior a fin."); window.history.back();</script>');

    connection.query('UPDATE capacitacion_oferta SET capofcapcodigo = ?, capoffecha_inicio = ?, capoffecha_fin = ?, capofcupos = ? WHERE capofcodigo = ?', [capofcapcodigo, fecha_inicio, fecha_fin, cupos, id], (err) => {
        if (err) return res.status(500).send('Error al actualizar');
        
        const timestamp = new Date().toLocaleString('es-VE');
        console.log(`[AUDITORÍA] [${timestamp}] - OFERTA EDITADA  | Admin: ${req.session.admin.username} | Oferta ID: ${id}`);
        res.send('<script>alert("¡Oferta actualizada con éxito!"); window.location.href="/panel/ofertas";</script>');
    });
};

module.exports = adminController;