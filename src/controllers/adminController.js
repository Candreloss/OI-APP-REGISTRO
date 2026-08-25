// src/controllers/adminController.js
const bcrypt = require('bcryptjs');
const transporter = require('../utils/mailer');

// IMPORTAMOS NUESTRO NUEVO MODELO
const AdminModel = require('../models/adminModel');
const {
    validar,
    adminLoginSchema,
    ofertaSchema,
    editarParticipanteSchema,
    contactoEmpresaSchema
} = require('../utils/validators');

const adminController = {};

// --- VISTA DE LOGIN ---
adminController.mostrarLogin = (req, res) => res.render('admin/adminlogin', { title: 'Admin Login' });

// --- PROCESAR LOGIN ---
adminController.procesarLogin = async (req, res) => {
    const resultado = validar(adminLoginSchema, req.body);
    if (!resultado.ok) {
        return res.status(400).json({ success: false, message: 'Usuario o contraseña inválidos.' });
    }
    const { username, password } = resultado.datos;

    try {
        const resultados = await AdminModel.buscarPorUsuario(username);

        if (resultados.length === 0) {
            // Mensaje idéntico para usuario inexistente y contraseña errónea.
            return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
        }

        const admin = resultados[0];
        const contrasenaValida = await bcrypt.compare(password, admin.contrasena);

        if (contrasenaValida) {
            // Regeneración de sesión contra fixation.
            await new Promise((resolve, reject) => {
                req.session.regenerate((err) => (err ? reject(err) : resolve()));
            });
            req.session.admin = { id: admin.id_admin, username: admin.nombreUsuario };
            console.log(`[AUDITORÍA] [${new Date().toLocaleString('es-VE')}] - LOGIN EXITOSO | Admin: ${username}`);
            return res.json({ success: true, redirectUrl: '/panel' });
        }

        res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    } catch (error) {
        console.error("Error en el login:", error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

// --- MOSTRAR PANEL DASHBOARD (Refactorizado con Modelo) ---
adminController.mostrarPanel = async (req, res) => {
    try {
        // Ejecutamos ambas consultas en paralelo para que cargue más rápido
        const [stats, ofertas] = await Promise.all([
            AdminModel.obtenerEstadisticas(),
            AdminModel.obtenerOfertasActivas()
        ]);
        
        res.render('admin/adminpanel', { 
            title: 'Panel de Control - OI', 
            admin: req.session.admin, 
            stats, 
            ofertas 
        });
    } catch (error) {
        console.error("Error cargando el dashboard:", error);
        res.status(500).send('Error interno');
    }
};

// --- MOSTRAR PARTICIPANTES Y PAGOS (Refactorizado con Modelo) ---
adminController.mostrarParticipantes = async (req, res) => {
    try {
        const inscripciones = await AdminModel.obtenerParticipantes();
        res.render('admin/participantes', { 
            title: 'Participantes y Pagos', 
            admin: req.session.admin, 
            inscripciones 
        });
    } catch (error) {
        console.error('Error cargando participantes:', error);
        res.render('admin/participantes', { title: 'Participantes y Pagos', admin: req.session.admin, inscripciones: [] });
    }
};

// =======================================================================
// OTRAS FUNCIONES (REFACTORIZADAS AL MODELO MVC PURO)
// =======================================================================

adminController.mostrarNuevaOferta = async (req, res) => {
    try {
        const resultados = await AdminModel.obtenerCapacitacionesBase();
        res.render('admin/nuevaOferta', { title: 'Nueva Oferta - OI', admin: req.session.admin, capacitacionesBase: resultados });
    } catch (error) { res.status(500).send('Error interno'); }
};

adminController.procesarNuevaOferta = async (req, res) => {
    const resultado = validar(ofertaSchema, req.body);
    if (!resultado.ok) {
        return res.status(400).json({ success: false, message: resultado.mensaje });
    }
    const { capofcapcodigo, fecha_inicio, fecha_fin, cupos } = resultado.datos;

    try {
        await AdminModel.crearOferta(capofcapcodigo, fecha_inicio, fecha_fin, cupos);
        console.log(`[AUDITORÍA] [${new Date().toLocaleString('es-VE')}] - CREACIÓN DE OFERTA | Admin: ${req.session.admin.username} | CapID: ${capofcapcodigo}`);

        res.json({ success: true, message: '¡Oferta publicada con éxito!' });
    } catch (error) {
        console.error("Error creando oferta:", error);
        res.status(500).json({ success: false, message: 'Error interno guardando la oferta.' });
    }
};

adminController.mostrarOfertas = async (req, res) => {
    try {
        const resultados = await AdminModel.obtenerTodasLasOfertas();
        res.render('admin/ofertas', { title: 'Gestión de Ofertas - OI', admin: req.session.admin, ofertas: resultados });
    } catch (error) { res.status(500).send('Error interno'); }
};

adminController.toggleEstatusOferta = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.redirect('/panel');

    try {
        const oferta = await AdminModel.obtenerOfertaPorId(id);
        if (!oferta) return res.status(500).send('Error al buscar la oferta');
        
        const nuevoEstatus = oferta.capofestatus === 1 ? 0 : 1;
        await AdminModel.actualizarEstatusOferta(id, nuevoEstatus);
        
        const accion = nuevoEstatus === 0 ? 'DESACTIVÓ 🔴' : 'ACTIVÓ 🟢';
        console.log(`[AUDITORÍA] [${new Date().toLocaleString('es-VE')}] - ESTATUS MODIFICADO | Admin: ${req.session.admin.username} | ${accion} Oferta ID: ${id}`);
        
        const urlAnterior = req.get('Referer');
        if (urlAnterior && urlAnterior.includes('/panel/ofertas')) res.redirect('/panel/ofertas'); 
        else res.redirect('/panel'); 
    } catch (error) { res.status(500).send('Error al actualizar'); }
};

adminController.mostrarEditarOferta = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.redirect('/panel/ofertas');

    try {
        const ofertaResult = await AdminModel.obtenerOfertaPorId(id);
        if (!ofertaResult) return res.status(500).send('Error interno');
        
        const capResult = await AdminModel.obtenerCapacitacionesBase();
        res.render('admin/editarOferta', { title: 'Editar Oferta - OI', admin: req.session.admin, oferta: ofertaResult, capacitacionesBase: capResult });
    } catch (error) { res.status(500).send('Error interno'); }
};

adminController.procesarEditarOferta = async (req, res) => {
    const id = parseInt(req.params.id, 10);

    const resultado = validar(ofertaSchema, req.body);
    if (isNaN(id) || !resultado.ok) {
        return res.status(400).json({ success: false, message: resultado.ok ? 'ID inválido.' : resultado.mensaje });
    }
    const { capofcapcodigo, fecha_inicio, fecha_fin, cupos } = resultado.datos;

    try {
        await AdminModel.actualizarOferta(id, capofcapcodigo, fecha_inicio, fecha_fin, cupos);
        console.log(`[AUDITORÍA] [${new Date().toLocaleString('es-VE')}] - OFERTA EDITADA  | Admin: ${req.session.admin.username} | Oferta ID: ${id}`);

        res.json({ success: true, message: '¡Oferta actualizada con éxito!' });
    } catch (error) {
        console.error("Error editando oferta:", error);
        res.status(500).json({ success: false, message: 'Error interno actualizando la oferta.' });
    }
};
adminController.aprobarPago = async (req, res) => {
    const inscodigo = req.params.id;
    try {
        // Condicional: solo desde 'en_revision' (un doble clic no reprocesa).
        await AdminModel.actualizarEstadoInscripcion(inscodigo, 'conciliado', ['en_revision']);
        const datos = await AdminModel.obtenerDatosInscripcionCorreo(inscodigo);
        if (datos) {
            // Correo best-effort: la BD ya quedó confirmada, un fallo de envío
            // no debe presentarse como fallo de la operación.
            transporter.sendMail({
                to: datos.peremail,
                subject: '✅ ¡Pago Verificado! - Organización Inteligente',
                html: `<h3>¡Hola, ${datos.pernombre}!</h3>
                        <p>Nos complace informarte que hemos verificado tu pago exitosamente.</p>
                        <p>Tu inscripción en <b>${datos.capnombre}</b> está 100% confirmada.</p>
                        <p>Pronto recibirás más detalles sobre el inicio de clases.</p>`
            }).catch(err => console.error('Error enviando correo de aprobación:', err.message));
        }
        res.json({ success: true, message: 'Pago conciliado.' });
    } catch (err) {
        if (err.tipo === 'validacion') return res.status(400).json({ success: false, message: err.message });
        res.status(500).json({ success: false, message: 'Error al actualizar base de datos' });
    }
};

adminController.rechazarPago = async (req, res) => {
    const inscodigo = req.params.id;
    try {
        // Atómico: borra el reporte y devuelve a 'pendiente' en una transacción.
        await AdminModel.rechazarPagoIndividual(inscodigo);

        const datos = await AdminModel.obtenerDatosInscripcionCorreo(inscodigo);
        if (datos) {
            transporter.sendMail({
                to: datos.peremail,
                subject: '❌ Problema con tu pago - Organización Inteligente',
                html: `<h3>¡Hola, ${datos.pernombre}!</h3>
                        <p>Hemos revisado tu reporte de pago para <b>${datos.capnombre}</b> pero no pudimos verificar la transferencia en nuestras cuentas.</p>
                        <p>Tu inscripción sigue reservada, pero ha vuelto a estado <b>Pendiente</b>.</p>
                        <p>Por favor, ingresa nuevamente al sistema y reporta los datos correctos del pago.</p>`
            }).catch(err => console.error('Error enviando correo de rechazo:', err.message));
        }
        res.json({ success: true, message: 'Reporte eliminado.' });
    } catch (err) {
        if (err.tipo === 'validacion') return res.status(400).json({ success: false, message: err.message });
        res.status(500).json({ success: false, message: 'Error procesando el rechazo' });
    }
};

adminController.editarParticipante = async (req, res) => {
    const resultado = validar(editarParticipanteSchema, req.body);
    if (!resultado.ok) return res.status(400).json({ success: false, message: resultado.mensaje });
    const { doc, nombre, apellido, telefono } = resultado.datos;

    try {
        await AdminModel.actualizarPerfilParticipante(doc, nombre, apellido, telefono || '');
        res.json({ success: true, message: 'Datos actualizados correctamente.' });
    } catch (error) {
        console.error('Error editando participante:', error);
        res.status(500).json({ success: false, message: 'Error interno en la base de datos.' });
    }
};

adminController.eliminarInscripcion = async (req, res) => {
    const inscodigo = req.params.id;
    try {
        await AdminModel.eliminarInscripcionCompleta(inscodigo);
        console.log(`[AUDITORÍA] [${new Date().toLocaleString('es-VE')}] - PARTICIPANTE ELIMINADO | Admin: ${req.session.admin.username} | Inscripción: ${inscodigo}`);
        res.json({ success: true, message: 'La inscripción del participante ha sido eliminada exitosamente.' });
    } catch (error) {
        console.error("Error al eliminar participante:", error);
        res.status(500).json({ success: false, message: 'Error interno al intentar eliminar al participante.' });
    }
};

// --- MÓDULO EMPRESAS (B2B) ---
adminController.mostrarEmpresas = async (req, res) => {
    try {
        const contactos = await AdminModel.obtenerContactosEmpresa();
        const lotes = await AdminModel.obtenerLotesPendientes(); // <- NUEVO
        
        res.render('admin/empresas', { 
            title: 'Gestión de Empresas - OI', 
            admin: req.session.admin, 
            contactos,
            lotes // <- NUEVO: Pasamos los lotes a la vista
        });
    } catch (error) {
        console.error('Error cargando empresas:', error);
        res.status(500).send('Error interno cargando el módulo de empresas');
    }
};

// NUEVA FUNCIÓN: Conciliación Masiva
adminController.aprobarLoteB2B = async (req, res) => {
    const { empresa_id, oferta_id } = req.body;
    if (!empresa_id || !oferta_id) return res.status(400).json({ success: false, message: 'Faltan datos del lote' });

    try {
        // 1. Obtenemos a quiénes vamos a notificar (solo los en_revision que
        // el UPDATE de abajo va a conciliar).
        const empleados = await AdminModel.obtenerCorreosLote(empresa_id, oferta_id);

        // 2. Aprobamos a todos en la base de datos de un solo golpe
        await AdminModel.aprobarLote(empresa_id, oferta_id);

        // 3. Correos best-effort: se disparan sin bloquear la respuesta y un
        // fallo de envío jamás revierte la conciliación ya confirmada.
        if (empleados && empleados.length > 0) {
            Promise.allSettled(empleados.map(emp =>
                transporter.sendMail({
                    to: emp.peremail,
                    subject: '✅ ¡Inscripción Corporativa Confirmada! - OI',
                    html: `<h3>¡Hola, ${emp.pernombre}!</h3>
                           <p>Tu empresa ha gestionado y conciliado un pago o abono en tu nombre exitosamente.</p>
                           <p>Tu cupo en <b>${emp.capnombre}</b> está 100% confirmado.</p>
                           <p>¡Bienvenido/a a esta nueva capacitación!</p>`
                })
            )).then(resultados => {
                const fallos = resultados.filter(r => r.status === 'rejected').length;
                if (fallos > 0) console.error(`Correos de lote fallidos: ${fallos}/${resultados.length}`);
            });
        }

        // --- NOTIFICACIÓN DE APROBACIÓN A LA EMPRESA B2B ---
        // Buscamos el correo y nombre de la empresa usando la función que creamos antes
        const infoEmpresa = await AdminModel.obtenerInfoEmpresa(empresa_id);
        
        if (infoEmpresa && infoEmpresa.emp_email) {
            transporter.sendMail({
                to: infoEmpresa.emp_email,
                subject: '✅ ¡Pago o Abono Corporativo Aprobado con Éxito!',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <h2 style="color: #10b981;">Pago Aprobado y Conciliado</h2>
                        <p>Hola, representante de <b>${infoEmpresa.empresa_nombre}</b>.</p>
                        <p>Nos complace informarte que el pago de tu lote de capacitaciones (Lote #${oferta_id}) ha sido <b>aprobado exitosamente</b> por nuestro equipo administrativo.</p>
                        <p>Todos los empleados incluidos en este lote ya tienen sus cupos asegurados y han pasado a estado "Conciliado". Adicionalmente, cada uno de ellos ha recibido un correo de bienvenida individual con las instrucciones de acceso al curso.</p>
                        <p>Gracias por confiar en Organización Inteligente para la capacitación de tu equipo.</p>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                        <p style="font-size: 12px; color: #64748b;">Atentamente,<br>El equipo de Organización Inteligente.</p>
                    </div>
                `
            }).catch(err => console.error('Error enviando correo a empresa:', err.message));
        }
        // ----------------------------------------------------------
        
        console.log(`[AUDITORÍA] - LOTE APROBADO | Admin: ${req.session.admin.username} | Empresa ID: ${empresa_id} | Total: ${empleados.length}`);
        
        
        res.json({ success: true, message: `¡Lote de ${empleados.length} participantes conciliado exitosamente!` });
    } catch (error) {
        console.error('Error aprobando lote B2B:', error);
        res.status(500).json({ success: false, message: 'Error interno al conciliar el lote.' });
    }
};

// Rechazar Pago de Lote Corporativo
adminController.rechazarPagoLote = async (req, res) => {
    const { empresa_id, oferta_id } = req.body;
    
    if (!empresa_id || !oferta_id) {
        return res.status(400).json({ success: false, message: 'Datos incompletos para procesar el rechazo.' });
    }

    try {
        // 1. Ejecutamos el rechazo y limpieza en la base de datos
        await AdminModel.rechazarPagoLote(empresa_id, oferta_id);
        
        // 2. Buscamos el correo de la empresa
        const infoEmpresa = await AdminModel.obtenerInfoEmpresa(empresa_id);
        
        // 3. Correo best-effort (no bloquea la respuesta)
        if (infoEmpresa && infoEmpresa.emp_email) {
            transporter.sendMail({
                to: infoEmpresa.emp_email,
                subject: '⚠️ Importante: Problema con tu pago corporativo',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <h2 style="color: #ef4444;">Pago Rechazado</h2>
                        <p>Hola, representante de <b>${infoEmpresa.empresa_nombre}</b>.</p>
                        <p>Te informamos que nuestro equipo administrativo ha detectado un inconveniente con el comprobante de pago que subiste para tu lote de capacitaciones (Lote #${oferta_id}).</p>
                        <p>El comprobante ha sido rechazado. Esto suele ocurrir si la imagen es ilegible, el número de referencia no coincide, o el monto es incorrecto.</p>
                        <p><b>¿Qué debes hacer ahora?</b></p>
                        <p>Tus empleados siguen guardados en el sistema. Por favor, ingresa nuevamente al Portal B2B de Empresas, haz clic en "Reportar Pago" y vuelve a subir el comprobante correcto.</p>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                        <p style="font-size: 12px; color: #64748b;">Atentamente,<br>El equipo de Organización Inteligente.</p>
                    </div>
                `
            }).catch(err => console.error('Error enviando correo de rechazo a empresa:', err.message));
        }

        console.log(`[AUDITORÍA] [${new Date().toLocaleString('es-VE')}] - PAGO B2B RECHAZADO | Admin: ${req.session.admin.username} | Empresa ID: ${empresa_id}`);
        
        res.json({ success: true, message: 'El pago del lote ha sido rechazado y se ha notificado a la empresa por correo electrónico.' });
    } catch (error) {
        console.error("Error rechazando lote B2B:", error);
        res.status(500).json({ success: false, message: 'Error interno al rechazar el lote corporativo.' });
    }
};

adminController.registrarContactoEmpresa = async (req, res) => {
    const resultado = validar(contactoEmpresaSchema, req.body);
    if (!resultado.ok) {
        return res.status(400).json({ success: false, message: resultado.mensaje });
    }
    const d = resultado.datos;

    try {
        const datos = [d.empresa_nombre, d.emp_tipodoc, d.emp_doc, d.emp_nombre, d.emp_apellido, d.emp_email, d.emp_telefono];
        await AdminModel.registrarContactoEmpresa(datos);
        console.log(`[AUDITORÍA] [${new Date().toLocaleString('es-VE')}] - NUEVA EMPRESA B2B | Admin: ${req.session.admin.username} | Empresa: ${d.empresa_nombre}`);
        res.json({ success: true, message: 'Contacto corporativo registrado con éxito.', redirectUrl: '/panel/empresas' });
    } catch (error) {
        console.error('Error registrando empresa:', error);
        const duplicado = error.code === 'ER_DUP_ENTRY';
        res.status(duplicado ? 400 : 500).json({
            success: false,
            message: duplicado
                ? 'El correo o documento de contacto ya están registrados.'
                : 'Error interno al registrar la empresa.'
        });
    }
};

adminController.toggleBloqueoCupos = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).send('ID inválido');
    try {
        const oferta = await AdminModel.obtenerOfertaPorId(id);
        if (!oferta) return res.status(404).send('Oferta no encontrada');
        const nuevoBloqueo = oferta.cupos_bloqueados === 1 ? 0 : 1;
        await AdminModel.toggleBloqueoCupos(id, nuevoBloqueo);
        res.redirect('/panel/ofertas');
    } catch (error) {
        console.error('Error en bloqueo de cupos:', error);
        res.status(500).send('Error interno');
    }
};



module.exports = adminController;