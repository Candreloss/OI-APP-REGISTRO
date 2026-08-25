// src/controllers/publicoController.js
const crypto = require('crypto');
const transporter = require('../utils/mailer');
const PublicoModel = require('../models/publicoModel');
const {
    validar,
    otpSolicitudSchema,
    otpValidacionSchema,
    registroParticipanteSchema,
    inscripcionRapidaSchema,
    reportarPagoSchema,
    loteEmpresaSchema,
    loteConsultaSchema,
    lotesPendientesSchema
} = require('../utils/validators');

// Mensaje genérico anti-enumeración: idéntico exista o no la identidad.
const MENSAJE_OTP_GENERICO = 'Si tus datos son correctos, recibirás un código en tu correo en los próximos minutos.';

const generarCodigoOTP = () => crypto.randomInt(100000, 999999).toString();
const plantillaOTP = (titulo, color, instruccion, codigo) => `
    <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2 style="color: #455a9f;">${titulo}</h2>
        <p>${instruccion}</p>
        <h1 style="font-size: 36px; color: ${color}; letter-spacing: 5px;">${codigo}</h1>
        <p style="color: #64748b; font-size: 12px;">Este código expirará en 15 minutos.</p>
    </div>
`;

const controller = {};

// ============================================================
// IDENTIDAD Y OTP
// ============================================================

// Guardia interna: exige identidad ya validada por OTP.
const exigirIdentidad = (req, res, tipoEsperado) => {
    const identidad = req.session && req.session.identidad;
    if (!identidad || identidad.tipo !== tipoEsperado) return null;
    return identidad;
};

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

// 2. LÓGICA MAESTRA DE REGISTRO
controller.registrarParticipante = async (req, res) => {
    const resultado = validar(registroParticipanteSchema, req.body);
    if (!resultado.ok) {
        return res.status(400).json({ success: false, message: resultado.mensaje });
    }
    const d = resultado.datos;

    const nombreF = d.nombre.charAt(0).toUpperCase() + d.nombre.slice(1).toLowerCase();
    const apellidoF = d.apellido.charAt(0).toUpperCase() + d.apellido.slice(1).toLowerCase();
    const telefonoCompleto = `${d.codpais} ${d.telefono}`;
    const datosPersona = [d.tipodoc, d.doc, nombreF, apellidoF, d.fechanac, telefonoCompleto, d.email, d.pais, d.ciudad];

    try {
        await PublicoModel.registrarUsuarioEInscripcion(datosPersona, d.capacitacion);
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

// 3. Solicitar Código OTP (público/participantes)
controller.solicitarOTP = async (req, res) => {
    const resultado = validar(otpSolicitudSchema, req.body);
    if (!resultado.ok) {
        // Respuesta genérica también para inputs inválidos: no filtramos nada.
        return res.json({ success: true, message: MENSAJE_OTP_GENERICO });
    }
    const { cedula, email } = resultado.datos;

    try {
        const identidad = await PublicoModel.verificarIdentidadParaOTP(cedula, email);

        // Solo participantes usan este flujo; empresas tienen su portal propio.
        if (!identidad || identidad.tipo !== 'participante') {
            return res.json({ success: true, message: MENSAJE_OTP_GENERICO });
        }

        const codigoOTP = generarCodigoOTP();
        const expiraEn = new Date(Date.now() + 15 * 60000);

        await PublicoModel.limpiarTokensAntiguos(email);
        await PublicoModel.guardarTokenOTP(email, codigoOTP, expiraEn);
        req.session.otpPendiente = { cedula, email, tipo: 'participante' };

        await transporter.sendMail({
            to: email,
            subject: 'Tu código de acceso - Organización Inteligente',
            html: plantillaOTP('Código de Verificación', '#ff5500', 'Usa el siguiente código para continuar con tu proceso:', codigoOTP)
        });

        res.json({ success: true, message: MENSAJE_OTP_GENERICO });
    } catch (error) {
        console.error('Error enviando correo OTP:', error);
        res.status(500).json({ success: false, message: 'Error al procesar la solicitud. Intenta de nuevo.' });
    }
};

// 4. Validar Código OTP (común para participantes y empresas)
controller.validarOTP = async (req, res) => {
    const resultado = validar(otpValidacionSchema, req.body);
    if (!resultado.ok) {
        return res.status(400).json({ success: false, message: resultado.mensaje });
    }
    const { email, codigo } = resultado.datos;

    try {
        const resultados = await PublicoModel.buscarTokenOTP(email, codigo);
        if (resultados.length === 0) return res.json({ success: false, message: 'Código incorrecto' });

        const token = resultados[0];
        if (token.usado === 1) return res.json({ success: false, message: 'Este código ya fue utilizado' });
        if (new Date() > new Date(token.expira_en)) {
            return res.json({ success: false, message: 'El código ha expirado. Solicita uno nuevo.' });
        }

        const pendiente = req.session.otpPendiente;
        if (!pendiente || pendiente.email !== email || pendiente.cedula == null) {
            return res.status(401).json({ success: false, message: 'Solicitud inválida. Pide un código nuevamente.' });
        }

        await PublicoModel.marcarTokenUsado(token.id_otp);

        // Datos para bifurcar el frontend (post-autenticación: ya no filtra nada)
        let esNuevo = true;
        let nombreUsuario = null;
        if (pendiente.tipo === 'participante') {
            const filas = await PublicoModel.verificarUsuarioExistente(pendiente.cedula);
            esNuevo = filas.length === 0;
            nombreUsuario = esNuevo ? null : `${filas[0].pernombre} ${filas[0].perapellido}`.trim();
        }

        // Regeneración de sesión contra fixation: se preserva solo la identidad nueva.
        await new Promise((resolve, reject) => {
            req.session.regenerate((err) => (err ? reject(err) : resolve()));
        });
        req.session.identidad = { cedula: pendiente.cedula, email: pendiente.email, tipo: pendiente.tipo };

        res.json({ success: true, message: 'Código validado correctamente', esNuevo, nombre: nombreUsuario });
    } catch (error) {
        console.error("Error validando OTP:", error);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
};

// ============================================================
// PANEL DEL PARTICIPANTE (protegido contra IDOR)
// ============================================================

// 5. Cursos pendientes del participante autenticado
controller.obtenerCursosPendientes = async (req, res) => {
    const identidad = exigirIdentidad(req, res, 'participante');
    if (!identidad) return res.status(401).json({ success: false, message: 'Acceso no autorizado. Valida tu identidad.' });
    if (String(req.params.cedula) !== String(identidad.cedula)) {
        return res.status(403).json({ success: false, message: 'No puedes consultar datos de otro participante.' });
    }

    try {
        const resultados = await PublicoModel.obtenerCursosPendientes(identidad.cedula);
        res.json(resultados);
    } catch (error) {
        console.error('Error buscando cursos pendientes:', error);
        res.status(500).json([]);
    }
};

// 6. Reporte de pago individual (con verificación de propiedad)
controller.reportarPago = async (req, res) => {
    const identidad = exigirIdentidad(req, res, 'participante');
    if (!identidad) return res.status(401).json({ success: false, message: 'Acceso no autorizado. Valida tu identidad.' });

    const resultado = validar(reportarPagoSchema, req.body);
    if (!resultado.ok) return res.status(400).json({ success: false, message: resultado.mensaje });
    const d = resultado.datos;

    const comprobante = req.file;
    if (!comprobante) return res.status(400).json({ success: false, message: 'Debes adjuntar el capture de la transferencia.' });

    try {
        // ANTI-IDOR: la inscripción debe pertenecer al participante de la sesión.
        const inscripcion = await PublicoModel.obtenerInscripcionDeUsuario(d.curso_pagado, identidad.cedula);
        if (!inscripcion) {
            return res.status(403).json({ success: false, message: 'Esa inscripción no existe o no te pertenece.' });
        }
        if (!['pendiente', 'rechazado'].includes(inscripcion.ins_estado)) {
            return res.status(400).json({ success: false, message: 'Esta inscripción ya tiene un pago en revisión o conciliado.' });
        }

        const datosPago = [d.curso_pagado, d.titular_nombre, d.titular_apellido, d.titular_telefono, d.banco_origen, d.referencia];
        await PublicoModel.registrarPagoYActualizar(datosPago, d.curso_pagado);

        // Correo best-effort: la BD ya confirmó el reporte.
        transporter.sendMail({
            to: process.env.ADMIN_EMAIL,
            subject: `💰 Nuevo Pago Reportado: ${d.titular_nombre} ${d.titular_apellido} - Ref: ${d.referencia}`,
            html: `
                <h3>Detalles del Nuevo Pago Reportado</h3>
                <ul>
                    <li><b>Inscripción N°:</b> ${d.curso_pagado}</li>
                    <li><b>Titular:</b> ${d.titular_nombre} ${d.titular_apellido}</li>
                    <li><b>Teléfono:</b> ${d.titular_telefono}</li>
                    <li><b>Banco:</b> ${d.banco_origen}</li>
                    <li><b>Referencia:</b> ${d.referencia}</li>
                </ul>
                <p>El comprobante ha sido adjuntado.</p>
            `,
            attachments: [{ filename: `comprobante_${d.referencia}.jpg`, content: comprobante.buffer }]
        }).catch(err => console.error('Error enviando correo de pago:', err.message));

        res.json({ success: true, message: '¡Pago y capture reportados con éxito! El administrador lo revisará pronto.' });
    } catch (error) {
        if (error.tipo === 'validacion') {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error('Error registrando pago:', error);
        res.status(500).json({ success: false, message: 'Hubo un problema procesando tu reporte. Si persiste, contáctanos.' });
    }
};

// 7. Ofertas en las que NO está inscrito (protegido)
controller.obtenerOfertasDisponibles = async (req, res) => {
    const identidad = exigirIdentidad(req, res, 'participante');
    if (!identidad) return res.status(401).json({ success: false, message: 'Acceso no autorizado. Valida tu identidad.' });
    if (String(req.params.cedula) !== String(identidad.cedula)) {
        return res.status(403).json({ success: false, message: 'No puedes consultar datos de otro participante.' });
    }

    try {
        const resultados = await PublicoModel.obtenerOfertasDisponibles(identidad.cedula);
        res.json(resultados);
    } catch (error) {
        console.error('Error buscando ofertas disponibles:', error);
        res.status(500).json([]);
    }
};

// 8. Inscripción Rápida (solo el propio participante autenticado)
controller.inscripcionRapida = async (req, res) => {
    const identidad = exigirIdentidad(req, res, 'participante');
    if (!identidad) return res.status(401).json({ success: false, message: 'Acceso no autorizado. Valida tu identidad.' });

    const resultado = validar(inscripcionRapidaSchema, req.body);
    if (!resultado.ok) return res.status(400).json({ success: false, message: resultado.mensaje });
    const { capacitacion } = resultado.datos;

    if (String(resultado.datos.cedula) !== String(identidad.cedula)) {
        return res.status(403).json({ success: false, message: 'No puedes inscribir a otra persona.' });
    }

    try {
        await PublicoModel.inscripcionRapida(identidad.cedula, capacitacion);
        res.json({ success: true, message: '¡Inscripción completada con éxito! Ya puedes reportar tu pago.' });
    } catch (errorObj) {
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

// ============================================================
// MÓDULO B2B (EMPRESAS)
// ============================================================

// Mostrar la vista de acceso corporativo
controller.mostrarAccesoEmpresas = (req, res) => {
    res.render('principal/empresas_login', { title: 'Acceso Corporativo - OI' });
};

// Solicitar OTP exclusivo para contactos de empresa
controller.solicitarOTPEmpresa = async (req, res) => {
    const resultado = validar(otpSolicitudSchema, req.body);
    if (!resultado.ok) {
        return res.json({ success: true, message: MENSAJE_OTP_GENERICO });
    }
    const { cedula, email } = resultado.datos;

    try {
        const identidad = await PublicoModel.verificarIdentidadParaOTP(cedula, email);

        // Solo contactos corporativos reciben código aquí (anti-sondeo).
        if (!identidad || identidad.tipo !== 'empresa') {
            return res.json({ success: true, message: MENSAJE_OTP_GENERICO });
        }

        const codigoOTP = generarCodigoOTP();
        const expiraEn = new Date(Date.now() + 15 * 60000);

        await PublicoModel.limpiarTokensAntiguos(email);
        await PublicoModel.guardarTokenOTP(email, codigoOTP, expiraEn);
        req.session.otpPendiente = { cedula, email, tipo: 'empresa' };

        await transporter.sendMail({
            to: email,
            subject: 'Tu código de acceso Corporativo - OI',
            html: plantillaOTP('Acceso B2B Empresas', '#10b981', 'Usa el siguiente código para ingresar al portal de multi-inscripciones:', codigoOTP)
        });

        res.json({ success: true, message: MENSAJE_OTP_GENERICO });
    } catch (error) {
        console.error('Error en OTP Empresa:', error);
        res.status(500).json({ success: false, message: 'Error interno al generar código.' });
    }
};

// API pública de ofertas activas (info pública)
controller.apiOfertasActivas = async (req, res) => {
    try {
        const ofertas = await PublicoModel.obtenerOfertasActivas();
        res.json(ofertas);
    } catch (error) {
        console.error('Error cargando ofertas API:', error);
        res.status(500).json([]);
    }
};

// Recibir y procesar el Lote Matriz
controller.registrarLoteEmpresa = async (req, res) => {
    const identidad = exigirIdentidad(req, res, 'empresa');

    const resultado = validar(loteEmpresaSchema, req.body);
    if (!resultado.ok) return res.status(400).json({ success: false, message: resultado.mensaje });
    const { cedula_empresa, email_empresa, capacitacion, empleados } = resultado.datos;

    if (!identidad
        || String(identidad.cedula) !== String(cedula_empresa)
        || identidad.email !== email_empresa) {
        return res.status(401).json({ success: false, message: 'Acceso no autorizado o sesión expirada. Vuelve a validar tu OTP.' });
    }

    try {
        const empresas = await PublicoModel.verificarContactoEmpresa(cedula_empresa, email_empresa);
        if (empresas.length === 0) return res.status(403).json({ success: false, message: 'Sesión corporativa inválida.' });

        const empresaId = empresas[0].id_contacto;
        await PublicoModel.registrarLoteTransaccion(empresaId, capacitacion, empleados);

        res.json({ success: true, message: `¡Lote de ${empleados.length} participantes registrado con éxito!` });
    } catch (errorObj) {
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
    const identidad = exigirIdentidad(req, res, 'empresa');

    const resultado = validar(loteConsultaSchema, req.body);
    if (!resultado.ok) return res.status(400).json([]);
    const { cedula_empresa, email_empresa, capacitacion } = resultado.datos;

    if (!identidad
        || String(identidad.cedula) !== String(cedula_empresa)
        || identidad.email !== email_empresa) {
        return res.status(401).json([]);
    }

    try {
        const empresas = await PublicoModel.verificarContactoEmpresa(cedula_empresa, email_empresa);
        if (empresas.length === 0) return res.json([]);
        const empleados = await PublicoModel.obtenerLoteExistente(empresas[0].id_contacto, capacitacion);
        res.json(empleados);
    } catch (error) {
        console.error('Error consultando lote existente:', error);
        res.status(500).json([]);
    }
};

controller.obtenerLotesPendientesEmpresa = async (req, res) => {
    const identidad = exigirIdentidad(req, res, 'empresa');

    const resultado = validar(lotesPendientesSchema, req.body);
    if (!resultado.ok) return res.status(400).json([]);
    const { cedula, email } = resultado.datos;

    if (!identidad || String(identidad.cedula) !== String(cedula) || identidad.email !== email) {
        return res.status(401).json([]);
    }

    try {
        const empresas = await PublicoModel.verificarContactoEmpresa(cedula, email);
        if (empresas.length === 0) return res.status(403).json([]);
        const lotes = await PublicoModel.obtenerLotesEmpresaPendientes(empresas[0].id_contacto);
        res.json(lotes);
    } catch (error) {
        console.error('Error consultando lotes pendientes:', error);
        res.status(500).json([]);
    }
};

// Procesar Pago Corporativo (Lote completo)
controller.reportarPagoB2B = async (req, res) => {
    const identidad = exigirIdentidad(req, res, 'empresa');

    const resultado = validar(reportarPagoSchema, req.body);
    if (!resultado.ok) return res.status(400).json({ success: false, message: resultado.mensaje });
    const d = resultado.datos;

    const comprobante = req.file;
    if (!comprobante) return res.status(400).json({ success: false, message: 'Debes adjuntar el capture de la transferencia.' });

    // La identidad de la empresa sale de la sesión; el body ya no decide quién paga.
    if (!identidad) {
        return res.status(401).json({ success: false, message: 'Sesión corporativa expirada.' });
    }

    try {
        const empresas = await PublicoModel.verificarContactoEmpresa(identidad.cedula, identidad.email);
        if (empresas.length === 0) return res.status(403).json({ success: false, message: 'Empresa no autorizada.' });
        const empresaId = empresas[0].id_contacto;

        const pendientes = await PublicoModel.obtenerInscripcionesPendientesPorLote(empresaId, d.curso_pagado);
        if (pendientes.length === 0) {
            return res.status(400).json({ success: false, message: 'No hay empleados pendientes de pago en este lote.' });
        }

        const datosPagoBase = [d.titular_nombre, d.titular_apellido, d.titular_telefono, d.banco_origen, d.referencia];
        await PublicoModel.registrarPagoB2B(pendientes, datosPagoBase, empresaId);

        // Correo best-effort: la BD ya confirmó el reporte.
        transporter.sendMail({
            to: process.env.ADMIN_EMAIL,
            subject: `🏢 Pago o Abono Corporativo Reportado: Lote #${d.curso_pagado} (${pendientes.length} empleados)`,
            html: `
                <h3>Nuevo Pago o Abono de Lote Corporativo</h3>
                <ul>
                    <li><b>Empresa:</b> ${identidad.email}</li>
                    <li><b>Cantidad de Empleados contemplados:</b> ${pendientes.length}</li>
                    <li><b>Titular:</b> ${d.titular_nombre} ${d.titular_apellido}</li>
                    <li><b>Referencia:</b> ${d.referencia}</li>
                </ul>
            `,
            attachments: [{ filename: `comprobante_b2b_${d.referencia}.jpg`, content: comprobante.buffer }]
        }).catch(err => console.error('Error enviando correo B2B:', err.message));

        res.json({ success: true, message: `¡Pago reportado para los ${pendientes.length} empleados con éxito!` });
    } catch (error) {
        console.error('Error en pago B2B:', error);
        res.status(500).json({ success: false, message: 'Error interno guardando el pago corporativo.' });
    }
};

module.exports = controller;
