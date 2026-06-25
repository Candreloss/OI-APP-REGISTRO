// src/controllers/adminController.js
const dbConnection = require('../config/database');
const connection = dbConnection();
const bcrypt = require('bcryptjs');
const transporter = require('../utils/mailer');

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

// --- MOSTRAR MÓDULO DE PARTICIPANTES Y PAGOS ---
adminController.mostrarParticipantes = (req, res) => {
    // Traemos todo: Inscripción, Persona, Curso y Pago (si existe)
    const query = `
        SELECT 
            i.inscodigo, i.ins_estado, DATE_FORMAT(i.ins_fecha, '%d/%m/%Y') as fecha_formateada,
            p.perdoc, p.pernombre, p.perapellido, p.pertelefono, p.peremail, p.perpais, p.perciudad,
            c.capnombre,
            pr.titular_nombre, pr.titular_apellido, pr.banco_origen, pr.referencia, pr.titular_telefono as tlf_pago
        FROM inscripcion i
        JOIN persona p ON i.ins_perdoc = p.perdoc
        JOIN capacitacion_oferta co ON i.ins_oferta = co.capofcodigo
        JOIN capacitacion c ON co.capofcapcodigo = c.capcodigo
        LEFT JOIN pago_reportado pr ON i.inscodigo = pr.pago_inscodigo
        ORDER BY i.ins_fecha DESC
    `;

    connection.query(query, (err, resultados) => {
        if (err) {
            console.error('Error cargando participantes:', err);
            return res.render('admin/participantes', { 
                title: 'Participantes y Pagos', 
                admin: req.session.admin, 
                inscripciones: [] 
            });
        }
        
        // Enviamos los resultados reales a la vista
        res.render('admin/participantes', { 
            title: 'Participantes y Pagos', 
            admin: req.session.admin, 
            inscripciones: resultados 
        });
    });
};

// --- APROBAR Y CONCILIAR PAGO ---
adminController.aprobarPago = (req, res) => {
    const inscodigo = req.params.id;

    // 1. Actualizamos el estado a conciliado
    connection.query("UPDATE inscripcion SET ins_estado = 'conciliado' WHERE inscodigo = ?", [inscodigo], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Error al actualizar base de datos' });

        // 2. Buscamos los datos del usuario para el correo
        const queryEmail = `
            SELECT p.peremail, p.pernombre, c.capnombre 
            FROM inscripcion i
            JOIN persona p ON i.ins_perdoc = p.perdoc
            JOIN capacitacion_oferta co ON i.ins_oferta = co.capofcodigo
            JOIN capacitacion c ON co.capofcapcodigo = c.capcodigo
            WHERE i.inscodigo = ?
        `;
        
        connection.query(queryEmail, [inscodigo], async (err2, resultados) => {
            if (!err2 && resultados.length > 0) {
                const { peremail, pernombre, capnombre } = resultados[0];
                try {
                    await transporter.sendMail({
                        from: '"Organización Inteligente" <1001.31025923.ucla@gmail.com>', // Cambia esto si es necesario
                        to: peremail,
                        subject: '✅ ¡Pago Verificado! - Organización Inteligente',
                        html: `<h3>¡Hola, ${pernombre}!</h3>
                               <p>Nos complace informarte que hemos verificado tu pago exitosamente.</p>
                               <p>Tu inscripción en <b>${capnombre}</b> está 100% confirmada.</p>
                               <p>Pronto recibirás más detalles sobre el inicio de clases.</p>`
                    });
                } catch (e) { console.error("Error enviando correo de aprobación:", e); }
            }
            res.json({ success: true, message: 'Pago conciliado y correo enviado.' });
        });
    });
};

// --- RECHAZAR PAGO (Eliminar reporte) ---
adminController.rechazarPago = (req, res) => {
    const inscodigo = req.params.id;

    // 1. Borramos el pago de la tabla pago_reportado
    connection.query("DELETE FROM pago_reportado WHERE pago_inscodigo = ?", [inscodigo], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Error al borrar el reporte' });

        // 2. Devolvemos la inscripción a estado 'pendiente'
        connection.query("UPDATE inscripcion SET ins_estado = 'pendiente' WHERE inscodigo = ?", [inscodigo], (err2) => {
            if (err2) return res.status(500).json({ success: false, message: 'Error al actualizar estado' });

            // 3. Buscamos datos para avisarle por correo
            const queryEmail = `
                SELECT p.peremail, p.pernombre, c.capnombre 
                FROM inscripcion i
                JOIN persona p ON i.ins_perdoc = p.perdoc
                JOIN capacitacion_oferta co ON i.ins_oferta = co.capofcodigo
                JOIN capacitacion c ON co.capofcapcodigo = c.capcodigo
                WHERE i.inscodigo = ?
            `;
            
            connection.query(queryEmail, [inscodigo], async (err3, resultados) => {
                if (!err3 && resultados.length > 0) {
                    const { peremail, pernombre, capnombre } = resultados[0];
                    try {
                        await transporter.sendMail({
                            from: '"Organización Inteligente" <1001.31025923.ucla@gmail.com>',
                            to: peremail,
                            subject: '❌ Problema con tu pago - Organización Inteligente',
                            html: `<h3>¡Hola, ${pernombre}!</h3>
                                   <p>Hemos revisado tu reporte de pago para <b>${capnombre}</b> pero no pudimos verificar la transferencia en nuestras cuentas.</p>
                                   <p>Tu inscripción sigue reservada, pero ha vuelto a estado <b>Pendiente</b>.</p>
                                   <p>Por favor, ingresa nuevamente al sistema y reporta los datos correctos del pago.</p>`
                        });
                    } catch (e) { console.error("Error enviando correo de rechazo:", e); }
                }
                res.json({ success: true, message: 'Reporte eliminado y correo enviado.' });
            });
        });
    });
};

// --- EDITAR DATOS DEL PARTICIPANTE ---
adminController.editarParticipante = (req, res) => {
    const { doc, nombre, apellido, telefono } = req.body;

    // Validación básica
    if (!doc || !nombre || !apellido) {
        return res.status(400).json({ success: false, message: 'El nombre y apellido son obligatorios.' });
    }

    // Actualizamos los datos no sensibles en la tabla persona
    const queryUpdate = `UPDATE persona SET pernombre = ?, perapellido = ?, pertelefono = ? WHERE perdoc = ?`;
    
    connection.query(queryUpdate, [nombre, apellido, telefono, doc], (err) => {
        if (err) {
            console.error('Error al actualizar participante:', err);
            return res.status(500).json({ success: false, message: 'Error interno en la base de datos.' });
        }
        res.json({ success: true, message: 'Datos actualizados correctamente.' });
    });
};

module.exports = adminController;