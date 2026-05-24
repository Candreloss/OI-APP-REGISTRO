// src/controllers/publicoController.js
const dbConnection = require('../config/database'); 
const connection = dbConnection(); 

// --- NUEVO: Importamos el motor de correos ---
const transporter = require('../utils/mailer');

const controller = {};

// 1. Mostrar la página y las ofertas
controller.mostrarPrincipal = (req, res) => {
    const query = `
        SELECT co.capofcodigo, c.capnombre 
        FROM capacitacion_oferta co 
        JOIN capacitacion c ON co.capofcapcodigo = c.capcodigo 
        WHERE co.capofestatus = 1
    `;

    connection.query(query, (err, resultados) => {
        if (err) {
            console.error('Error al cargar ofertas:', err);
            return res.render('principal/principal', { title: 'Página Principal', ofertas: [] });
        }
        res.render('principal/principal', { title: 'Página Principal', ofertas: resultados });
    });
};

// 2. LÓGICA MAESTRA DE REGISTRO
controller.registrarParticipante = (req, res) => {
    const { tipodoc, doc, nombre, apellido, codpais, telefono, email, pais, ciudad, capacitacion, año, mes, dia } = req.body;

    // --- PASO 1: VALIDACIONES BÁSICAS ---
    if (!tipodoc || !doc || !nombre || !apellido || !codpais || !telefono || !email || !pais || !ciudad || !capacitacion) {
        return res.status(400).send('<script>alert("Todos los datos son obligatorios."); window.history.back();</script>');
    }

    if (tipodoc === 'Ced' && !/^\d{6,9}$/.test(doc)) {
        return res.send('<script>alert("Para Cédula, el documento debe tener entre 6 y 9 números."); window.history.back();</script>');
    } else if (tipodoc !== 'Ced' && !/^[a-zA-Z0-9]{6,20}$/.test(doc)) {
        return res.send('<script>alert("Documento inválido para Pasaporte/Otro."); window.history.back();</script>');
    }

    if (!/^\+\d{1,4}$/.test(codpais)) return res.send('<script>alert("Código de país inválido."); window.history.back();</script>');
    if (!/^\d{7,15}$/.test(telefono)) return res.send('<script>alert("Teléfono inválido."); window.history.back();</script>');

    // --- PASO 2: BLINDAJE DE FECHAS (ANTI 31 DE FEBRERO) ---
    if (!año || !mes || !dia) {
        return res.send('<script>alert("La fecha de nacimiento está incompleta."); window.history.back();</script>');
    }

    const numAño = parseInt(año, 10);
    const numMes = parseInt(mes, 10);
    const numDia = parseInt(dia, 10);

    if (numMes < 1 || numMes > 12 || numDia < 1 || numDia > 31 || numAño < 1900 || numAño > new Date().getFullYear()) {
        return res.send('<script>alert("La fecha de nacimiento ingresada no es válida."); window.history.back();</script>');
    }

    const mesesCon30Dias = [4, 6, 9, 11];
    if (mesesCon30Dias.includes(numMes) && numDia > 30) {
        return res.send('<script>alert("El mes seleccionado solo tiene 30 días."); window.history.back();</script>');
    }

    if (numMes === 2) {
        const esBisiesto = (numAño % 4 === 0 && (numAño % 100 !== 0 || numAño % 400 === 0));
        if (esBisiesto && numDia > 29) {
            return res.send('<script>alert("Febrero solo tiene 29 días en años bisiestos."); window.history.back();</script>');
        } else if (!esBisiesto && numDia > 28) {
            return res.send('<script>alert("Febrero solo tiene 28 días en años no bisiestos."); window.history.back();</script>');
        }
    }

    // --- PASO 3: FORMATEAR DATOS ---
    const diaFormateado = dia.toString().padStart(2, '0');
    const mesFormateado = mes.toString().padStart(2, '0');
    const fechaNacimiento = `${año}-${mesFormateado}-${diaFormateado}`;
    
    const nombreF = nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase();
    const apellidoF = apellido.charAt(0).toUpperCase() + apellido.slice(1).toLowerCase();
    const telefonoCompleto = `${codpais}-${telefono}`;

    // --- PASO 4: FLUJO DE BASE DE DATOS ---
    const queryPersona = `
        INSERT IGNORE INTO persona 
        (pertipodoc, perdoc, pernombre, perapellido, perfechanac, pertelefono, peremail, perpais, perciudad) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    connection.query(queryPersona, [tipodoc, doc, nombreF, apellidoF, fechaNacimiento, telefonoCompleto, email, pais, ciudad], (errPersona) => {
        if (errPersona) return res.status(500).send('<script>alert("Error interno guardando al usuario."); window.history.back();</script>');

        const queryInscripcion = `INSERT INTO inscripcion (ins_perdoc, ins_oferta) VALUES (?, ?)`;
        
        connection.query(queryInscripcion, [doc, capacitacion], (errInscripcion) => {
            if (errInscripcion) {
                if (errInscripcion.code === 'ER_DUP_ENTRY') {
                    return res.send('<script>alert("¡Ya te encuentras registrado en esta capacitación!"); window.history.back();</script>');
                }
                return res.status(500).send('<script>alert("Error interno procesando la inscripción."); window.history.back();</script>');
            }

            const queryAcademico = `INSERT INTO persona_capacitacion (pcap_perdoc, pcap_oferta) VALUES (?, ?)`;
            connection.query(queryAcademico, [doc, capacitacion], (errAcademico) => {
                if (errAcademico) console.error('Error en Fase Académica:', errAcademico);
                
                // AUDITORÍA DE ÉXITO
                const ipParticipante = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
                const timestamp = new Date().toLocaleString('es-VE'); // Hora local aproximada
                console.log(`[AUDITORÍA] [${timestamp}] - NUEVO REGISTRO | Doc: ${doc} | Oferta: ${capacitacion} | IP: ${ipParticipante}`);
                
                res.send('<script>alert("¡Inscripción completada con éxito! Nos pondremos en contacto contigo."); window.location.href="/";</script>');
            });
        });
    });
};

// --- NUEVA FUNCIÓN: Solicitar Código OTP ---
controller.solicitarOTP = (req, res) => {
    const { cedula, email } = req.body;

    if (!cedula || !email) {
        return res.status(400).json({ success: false, message: 'Cédula y correo son obligatorios' });
    }

    // 1. Generamos un código aleatorio de 6 dígitos
    const codigoOTP = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 2. Calculamos la fecha de expiración (Ej: 15 minutos en el futuro)
    const expiraEn = new Date(Date.now() + 15 * 60000); 

    // 3. LIMPIEZA: Borramos tokens anteriores de este correo (Tu pregunta de la Fase 1)
    connection.query('DELETE FROM token_otp WHERE email = ?', [email], (errDelete) => {
        if (errDelete) console.error('Error limpiando tokens viejos:', errDelete);

        // 4. Insertamos el nuevo token en la BD
        const queryInsert = 'INSERT INTO token_otp (email, codigo, expira_en) VALUES (?, ?, ?)';
        connection.query(queryInsert, [email, codigoOTP, expiraEn], async (errInsert) => {
            if (errInsert) {
                console.error('Error insertando OTP:', errInsert);
                return res.status(500).json({ success: false, message: 'Error al generar el código' });
            }

            // 5. Enviamos el correo
            try {
                await transporter.sendMail({
                    from: '"Organización Inteligente" <tu_correo_de_prueba@gmail.com>', // Cambia esto
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

                // 6. Verificamos si el usuario ya existe para avisarle al frontend
                connection.query('SELECT pernombre, perapellido FROM persona WHERE perdoc = ?', [cedula], (errPersona, resultados) => {
                    const esNuevo = resultados.length === 0;
                    const nombreUsuario = esNuevo ? null : `${resultados[0].pernombre} ${resultados[0].perapellido}`;

                    res.json({ 
                        success: true, 
                        message: 'Código enviado con éxito',
                        esNuevo: esNuevo,
                        nombre: nombreUsuario
                    });
                });

            } catch (errorMail) {
                console.error('Error enviando correo OTP:', errorMail);
                res.status(500).json({ success: false, message: 'Error al enviar el correo' });
            }
        });
    });
};

// --- NUEVA FUNCIÓN: Validar Código OTP ---
controller.validarOTP = (req, res) => {
    const { email, codigo } = req.body;

    if (!email || !codigo) {
        return res.status(400).json({ success: false, message: 'Correo y código son obligatorios' });
    }

    const query = 'SELECT id_otp, expira_en, usado FROM token_otp WHERE email = ? AND codigo = ? ORDER BY id_otp DESC LIMIT 1';
    
    connection.query(query, [email, codigo], (err, resultados) => {
        if (err) return res.status(500).json({ success: false, message: 'Error en el servidor' });

        if (resultados.length === 0) {
            return res.json({ success: false, message: 'Código incorrecto' });
        }

        const token = resultados[0];

        if (token.usado === 1) {
            return res.json({ success: false, message: 'Este código ya fue utilizado' });
        }

        if (new Date() > new Date(token.expira_en)) {
            return res.json({ success: false, message: 'El código ha expirado. Solicita uno nuevo.' });
        }

        // Si todo está bien, marcamos el código como usado
        connection.query('UPDATE token_otp SET usado = 1 WHERE id_otp = ?', [token.id_otp], () => {
            res.json({ success: true, message: 'Código validado correctamente' });
        });
    });
};

module.exports = controller;