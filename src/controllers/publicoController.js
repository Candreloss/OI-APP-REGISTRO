// src/controllers/publicoController.js
const crypto = require('crypto'); // NUEVO: Módulo de seguridad nativo
const transporter = require('../utils/mailer');

// IMPORTAMOS NUESTRO NUEVO MODELO PÚBLICO
const PublicoModel = require('../models/PublicoModel');

const controller = {};

// 1. Mostrar la página y las ofertas
controller.mostrarPrincipal = async (req, res) => {
    try {
        const ofertas = await PublicoModel.obtenerOfertasActivas();
        res.render('principal/principal', { title: 'Página Principal', ofertas });
    } catch (error) {
        console.error('Error al cargar ofertas:', error);
        res.render('principal/principal', { title: 'Página Principal', ofertas: [] });
    }
};

// 2. LÓGICA MAESTRA DE REGISTRO (Modernizada con JSON)
controller.registrarParticipante = async (req, res) => {
    const { tipodoc, doc, nombre, apellido, codpais, telefono, email, pais, ciudad, capacitacion, fechanac } = req.body;

    if (!tipodoc || !doc || !nombre || !apellido || !codpais || !telefono || !email || !pais || !ciudad || !capacitacion || !fechanac) {
        return res.status(400).json({ success: false, message: 'Todos los datos son obligatorios.' });
    }

    if (tipodoc === 'Ced' && !/^\d{6,9}$/.test(doc)) {
        return res.status(400).json({ success: false, message: 'Para Cédula, el documento debe tener entre 6 y 9 números.' });
    } else if (tipodoc !== 'Ced' && !/^[a-zA-Z0-9]{6,20}$/.test(doc)) {
        return res.status(400).json({ success: false, message: 'Documento inválido para Pasaporte/Otro.' });
    }

    if (!/^\+\d{1,4}$/.test(codpais)) return res.status(400).json({ success: false, message: 'Código de país inválido.' });
    if (!/^\d{7,15}$/.test(telefono)) return res.status(400).json({ success: false, message: 'Teléfono inválido.' });

    const nombreF = nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase();
    const apellidoF = apellido.charAt(0).toUpperCase() + apellido.slice(1).toLowerCase();
    const telefonoCompleto = `${codpais} ${telefono}`;
    const datosPersona = [tipodoc, doc, nombreF, apellidoF, fechanac, telefonoCompleto, email, pais, ciudad];

    try {
        await PublicoModel.registrarUsuarioEInscripcion(datosPersona, capacitacion);
        const ipParticipante = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        console.log(`[AUDITORÍA] [${new Date().toLocaleString('es-VE')}] - NUEVO REGISTRO | Doc: ${doc} | Oferta: ${capacitacion} | IP: ${ipParticipante}`);
        
        res.json({ success: true, message: '¡Inscripción completada con éxito! Nos pondremos en contacto contigo.' });
    } catch (errorObj) {
        if (errorObj.tipo === 'validacion') {
            return res.status(400).json({ success: false, message: errorObj.message });
        }
        if (errorObj.tipo === 'inscripcion' && errorObj.error && errorObj.error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: '¡Ya te encuentras registrado en esta capacitación!' });
        }
        console.error("Error en registro:", errorObj);
        res.status(500).json({ success: false, message: 'Error interno procesando la inscripción.' });
    }
};

// 3. Solicitar Código OTP
controller.solicitarOTP = async (req, res) => {
    const { cedula, email } = req.body;
    if (!cedula || !email) return res.status(400).json({ success: false, message: 'Cédula y correo son obligatorios' });

    const codigoOTP = crypto.randomInt(100000, 999999).toString();
    const expiraEn = new Date(Date.now() + 15 * 60000); 

    try {
        // Ejecutamos la limpieza y guardado en la base de datos de forma limpia
        await PublicoModel.limpiarTokensAntiguos(email);
        await PublicoModel.guardarTokenOTP(email, codigoOTP, expiraEn);

        await transporter.sendMail({
            from: '"Organización Inteligente" <' + process.env.EMAIL_USER + '>',
            to: email,
            subject: 'Tu código de acceso - Organización Inteligente',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                    <h2 style="color: #455a9f;">Código de Verificación</h2>
                    <p>Usa el siguiente código para continuar con tu proceso:</p>
                    <h1 style="font-size: 36px; color: #ff5500; letter-spacing: 5px;">${codigoOTP}</h1>
                    <p style="color: #64748b; font-size: 12px;">Este código expirará en 15 minutos.</p>
                </div>
            `
        });

        // Verificamos si es un usuario nuevo para bifurcar el frontend
        const resultados = await PublicoModel.verificarUsuarioExistente(cedula);
        const esNuevo = resultados.length === 0;
        const nombreUsuario = esNuevo ? null : `${resultados[0].pernombre} ${resultados[0].perapellido}`;

        res.json({ success: true, message: 'Código enviado con éxito', esNuevo, nombre: nombreUsuario });

    } catch (error) {
        console.error('Error enviando correo OTP:', error);
        res.status(500).json({ success: false, message: 'Error al enviar el correo o generar token' });
    }
};

// 4. Validar Código OTP
controller.validarOTP = async (req, res) => {
    const { email, codigo } = req.body;
    if (!email || !codigo) return res.status(400).json({ success: false, message: 'Correo y código son obligatorios' });

    try {
        const resultados = await PublicoModel.buscarTokenOTP(email, codigo);
        if (resultados.length === 0) return res.json({ success: false, message: 'Código incorrecto' });

        const token = resultados[0];
        if (token.usado === 1) return res.json({ success: false, message: 'Este código ya fue utilizado' });
        if (new Date() > new Date(token.expira_en)) return res.json({ success: false, message: 'El código ha expirado. Solicita uno nuevo.' });

        await PublicoModel.marcarTokenUsado(token.id_otp);
        req.session.usuarioValidado = email;
        res.json({ success: true, message: 'Código validado correctamente' });

    } catch (error) {
        console.error("Error validando OTP:", error);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
};

// 5. Obtener cursos pendientes del usuario
controller.obtenerCursosPendientes = async (req, res) => {
    try {
        const resultados = await PublicoModel.obtenerCursosPendientes(req.params.cedula);
        res.json(resultados);
    } catch (error) {
        console.error('Error buscando cursos pendientes:', error);
        res.status(500).json([]);
    }
};

// 6. Procesar reporte de pago (Modernizado con JSON)
controller.reportarPago = async (req, res) => {
    const { curso_pagado, titular_nombre, titular_apellido, banco_origen, referencia, titular_telefono } = req.body;
    const comprobante = req.file;

    if (!curso_pagado || !titular_nombre || !referencia || !comprobante) {
        return res.status(400).json({ success: false, message: 'Faltan datos obligatorios o no adjuntaste el capture.' });
    }

    const datosPago = [curso_pagado, titular_nombre, titular_apellido, titular_telefono, banco_origen, referencia];

    try {
        await PublicoModel.registrarPagoYActualizar(datosPago, curso_pagado);

        await transporter.sendMail({
            from: '"Sistema de Pagos OI" <' + process.env.EMAIL_USER + '>',
            to: process.env.ADMIN_EMAIL,
            subject: `💰 Nuevo Pago Reportado: ${titular_nombre} ${titular_apellido} - Ref: ${referencia}`,
            html: `
                <h3>Detalles del Nuevo Pago Reportado</h3>
                <ul>
                    <li><b>Inscripción N°:</b> ${curso_pagado}</li>
                    <li><b>Titular:</b> ${titular_nombre} ${titular_apellido}</li>
                    <li><b>Teléfono:</b> ${titular_telefono}</li>
                    <li><b>Banco:</b> ${banco_origen}</li>
                    <li><b>Referencia:</b> ${referencia}</li>
                </ul>
                <p>El comprobante ha sido adjuntado.</p>
            `,
            attachments: [{ filename: `comprobante_${referencia}.jpg`, content: comprobante.buffer }]
        });

        res.json({ success: true, message: '¡Pago y capture reportados con éxito! El administrador lo revisará pronto.' });
    } catch (error) {
        console.error('Error registrando pago:', error);
        res.status(500).json({ success: false, message: 'Tu pago se guardó, pero hubo un error con la imagen. Contáctanos.' });
    }
};

// 7. Obtener ofertas en las que NO está inscrito
controller.obtenerOfertasDisponibles = async (req, res) => {
    try {
        const resultados = await PublicoModel.obtenerOfertasDisponibles(req.params.cedula);
        res.json(resultados);
    } catch (error) {
        console.error('Error buscando ofertas disponibles:', error);
        res.status(500).json([]);
    }
};

// 8. Inscripción Rápida (Usuarios Existentes)
controller.inscripcionRapida = async (req, res) => {
    const { cedula, capacitacion } = req.body;
    if (!cedula || !capacitacion) return res.status(400).json({ success: false, message: 'Faltan datos para la inscripción.' });

    try {
        await PublicoModel.inscripcionRapida(cedula, capacitacion);
        res.json({ success: true, message: '¡Inscripción completada con éxito! Ya puedes reportar tu pago.' });
    } catch (errorObj) {
        // CORREGIDO: Usamos res.json en lugar de res.send(<script>)
        if (errorObj.tipo === 'validacion') {
            return res.status(400).json({ success: false, message: errorObj.message });
        }

        if (errorObj.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Ya estás inscrito en esta capacitación.' });
        }
        console.error('Error en inscripción rápida:', errorObj);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

// --- MÓDULO B2B (EMPRESAS) ---

// Mostrar la vista de acceso corporativo
controller.mostrarAccesoEmpresas = (req, res) => {
    res.render('principal/empresas_login', { title: 'Acceso Corporativo - OI' });
};

// Solicitar OTP Exclusivo para Empresas
controller.solicitarOTPEmpresa = async (req, res) => {
    const { cedula, email } = req.body;
    if (!cedula || !email) return res.status(400).json({ success: false, message: 'Cédula y correo son obligatorios' });

    try {
        // 1. Verificamos que sea un contacto autorizado
        const resultados = await PublicoModel.verificarContactoEmpresa(cedula, email);
        if (resultados.length === 0) {
            return res.json({ success: false, message: 'Acceso denegado: No estás registrado como contacto corporativo.' });
        }

        // 2. Generamos el OTP
        const codigoOTP = crypto.randomInt(100000, 999999).toString();
        const expiraEn = new Date(Date.now() + 15 * 60000); 

        // 3. Guardamos el Token (Reutilizando la lógica que ya tenías)
        await PublicoModel.limpiarTokensAntiguos(email);
        await PublicoModel.guardarTokenOTP(email, codigoOTP, expiraEn);

        // 4. Enviamos el correo
        await transporter.sendMail({
            from: '"Organización Inteligente Corporativo" <' + process.env.EMAIL_USER + '>',
            to: email,
            subject: 'Tu código de acceso Corporativo - OI',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                    <h2 style="color: #455a9f;">Acceso B2B Empresas</h2>
                    <p>Usa el siguiente código para ingresar al portal de multi-inscripciones:</p>
                    <h1 style="font-size: 36px; color: #10b981; letter-spacing: 5px;">${codigoOTP}</h1>
                    <p style="color: #64748b; font-size: 12px;">Este código expirará en 15 minutos.</p>
                </div>
            `
        });

        res.json({ success: true, message: 'Código corporativo enviado con éxito.' });
    } catch (error) {
        console.error('Error en OTP Empresa:', error);
        res.status(500).json({ success: false, message: 'Error interno al generar código.' });
    }
};

// Obtener API de Ofertas Activas para el menú desplegable corporativo
controller.apiOfertasActivas = async (req, res) => {
    try {
        const ofertas = await PublicoModel.obtenerOfertasActivas();
        res.json(ofertas);
    } catch (error) {
        res.status(500).json([]);
    }
};

// Recibir y procesar el Lote Matriz
controller.registrarLoteEmpresa = async (req, res) => {
    const { cedula_empresa, email_empresa, capacitacion, empleados } = req.body;
    
    if (req.session.usuarioValidado !== email_empresa) {
    return res.status(401).json({ success: false, message: 'Acceso no autorizado o sesión expirada. Vuelve a validar tu OTP.' });
    }
    
    if (!empleados || empleados.length === 0) {
        return res.status(400).json({ success: false, message: 'La matriz está vacía.' });
    }

    try {
        // Validamos la identidad de la empresa nuevamente por seguridad
        const empresas = await PublicoModel.verificarContactoEmpresa(cedula_empresa, email_empresa);
        if (empresas.length === 0) return res.status(403).json({ success: false, message: 'Sesión corporativa inválida.' });
        
        const empresaId = empresas[0].id_contacto;

        // Mandamos el paquete a la transacción
        await PublicoModel.registrarLoteTransaccion(empresaId, capacitacion, empleados);
        
        res.json({ success: true, message: `¡Lote de ${empleados.length} participantes registrado con éxito!` });
    } catch (errorObj) {
        // CORREGIDO: Usamos res.json en lugar de res.send(<script>)
        if (errorObj.tipo === 'validacion') {
            return res.status(400).json({ success: false, message: errorObj.message });
        }
        
        console.error('Error procesando lote B2B:', errorObj);
        if (errorObj.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ success: false, message: 'Operación cancelada: Uno o más empleados del lote ya están inscritos en esa capacitación.' });
        } else {
            res.status(500).json({ success: false, message: 'Error interno de base de datos procesando el lote.' });
        }
    }
};

controller.obtenerLoteExistente = async (req, res) => {
    const { cedula_empresa, email_empresa, capacitacion } = req.body;
    
    if (req.session.usuarioValidado !== email_empresa) {
    return res.status(401).json({ success: false, message: 'Acceso no autorizado o sesión expirada. Vuelve a validar tu OTP.' });
    }
    
    try {
        const empresas = await PublicoModel.verificarContactoEmpresa(cedula_empresa, email_empresa);
        if (empresas.length === 0) return res.json([]);
        const empleados = await PublicoModel.obtenerLoteExistente(empresas[0].id_contacto, capacitacion);
        res.json(empleados);
    } catch (error) {
        res.json([]);
    }
};

controller.obtenerLotesPendientesEmpresa = async (req, res) => {
    const { cedula, email } = req.body;
    
    // CORREGIDO: Comparamos contra 'email' que es lo que extrajimos de req.body
    if (req.session.usuarioValidado !== email) {
        return res.status(401).json({ success: false, message: 'Acceso no autorizado o sesión expirada. Vuelve a validar tu OTP.' });
    }
    
    try {
        const empresas = await PublicoModel.verificarContactoEmpresa(cedula, email);
        if (empresas.length === 0) return res.status(403).json([]);
        
        const lotes = await PublicoModel.obtenerLotesEmpresaPendientes(empresas[0].id_contacto);
        res.json(lotes);
    } catch (error) {
        res.status(500).json([]);
    }
};

// Procesar Pago Corporativo (Lote completo)
controller.reportarPagoB2B = async (req, res) => {
    const { cedula_empresa, email_empresa, curso_pagado, titular_nombre, titular_apellido, banco_origen, referencia, titular_telefono } = req.body;
    const comprobante = req.file;

    if (req.session.usuarioValidado !== email_empresa) {
        return res.status(401).json({ success: false, message: 'Sesión corporativa expirada.' });
    }

    if (!curso_pagado || !titular_nombre || !titular_apellido || !referencia || !comprobante) {
        return res.status(400).json({ success: false, message: 'Faltan datos obligatorios o el capture.' });
    }

    try {
        const empresas = await PublicoModel.verificarContactoEmpresa(cedula_empresa, email_empresa);
        if (empresas.length === 0) return res.status(403).json({ success: false, message: 'Empresa no autorizada.' });
        const empresaId = empresas[0].id_contacto;

        // Buscamos a los empleados del lote
        const pendientes = await PublicoModel.obtenerInscripcionesPendientesPorLote(empresaId, curso_pagado);
        if (pendientes.length === 0) {
            return res.status(400).json({ success: false, message: 'No hay empleados pendientes de pago en este lote.' });
        }

        const datosPagoBase = [titular_nombre, titular_apellido, titular_telefono, banco_origen, referencia];
        await PublicoModel.registrarPagoB2B(pendientes, datosPagoBase, empresaId);

        await transporter.sendMail({
            from: '"Sistema B2B" <' + process.env.EMAIL_USER + '>',
            to: process.env.ADMIN_EMAIL,
            subject: `🏢 Pago o Abono Corporativo Reportado: Lote #${curso_pagado} (${pendientes.length} empleados)`,
            html: `
                <h3>Nuevo Pago o Abono de Lote Corporativo</h3>
                <ul>
                    <li><b>Empresa:</b> ${email_empresa}</li>
                    <li><b>Cantidad de Empleados contemplados:</b> ${pendientes.length}</li>
                    <li><b>Titular:</b> ${titular_nombre} ${titular_apellido}</li>
                    <li><b>Referencia:</b> ${referencia}</li>
                </ul>
            `,
            attachments: [{ filename: `comprobante_b2b_${referencia}.jpg`, content: comprobante.buffer }]
        });

        res.json({ success: true, message: `¡Pago reportado para los ${pendientes.length} empleados con éxito!` });
    } catch (error) {
        console.error('Error en pago B2B:', error);
        res.status(500).json({ success: false, message: 'Error interno guardando el pago corporativo.' });
    }
};

module.exports = controller;