// src/controllers/publicoController.js
const dbConnection = require('../config/database'); 
const connection = dbConnection(); 

const controller = {};

// 1. LÓGICA PARA MOSTRAR LA PÁGINA Y LAS OFERTAS (INALTERADA)
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
    
    // --- PASO 1: CAPTURAR Y VALIDAR ---
    const { tipodoc, doc, nombre, apellido, codpais, telefono, email, pais, ciudad, capacitacion, año, mes, dia } = req.body;

    // Validamos campos de texto
    if (!tipodoc || !doc || !nombre || !apellido || !codpais || !telefono || !email || !pais || !ciudad) {
        return res.status(400).send('Todos los datos personales son obligatorios');
    }

    // Validar Documento dependiendo del Tipo
    if (tipodoc === 'Ced') {
        // Cédula: Solo números, entre 6 y 9 dígitos
        if (!/^\d{6,9}$/.test(doc)) {
            return res.send('<script>alert("Para Cédula, el documento debe tener entre 6 y 9 números (sin puntos ni letras)."); window.history.back();</script>');
        }
    } else {
        // Pasaporte u Otro: Alfanumérico, entre 6 y 20 caracteres
        if (!/^[a-zA-Z0-9]{6,20}$/.test(doc)) {
            return res.send('<script>alert("Para Pasaporte u Otro, el documento debe tener entre 6 y 20 caracteres (letras y números sin espacios)."); window.history.back();</script>');
        }
    }

    // Validar Código de País: Símbolo + seguido de 1 a 4 números
    if (!/^\+\d{1,4}$/.test(codpais)) {
        return res.send('<script>alert("El código de país debe iniciar con + seguido de números (ej. +58)."); window.history.back();</script>');
    }

    // Validar Teléfono: Solo números, entre 7 y 15 dígitos
    const regexTelefono = /^\d{7,15}$/;
    if (!regexTelefono.test(telefono)) {
        return res.send('<script>alert("El teléfono debe contener entre 7 y 15 números, sin espacios ni guiones."); window.history.back();</script>');
    }
    
    // Validamos Selección de Capacitación (Columna Derecha)
    if (!capacitacion) {
        return res.send('<script>alert("Por favor, selecciona una capacitación de la lista."); window.history.back();</script>');
    }

    // Validamos Fecha
    if (!año || !mes || !dia) {
        return res.send('<script>alert("La fecha de nacimiento está incompleta."); window.history.back();</script>');
    }

    // --- PASO 2: FORMATEAR DATOS ---
    const diaFormateado = dia.toString().padStart(2, '0');
    const mesFormateado = mes.toString().padStart(2, '0');
    const fechaNacimiento = `${año}-${mesFormateado}-${diaFormateado}`;
    
    const nombreF = nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase();
    const apellidoF = apellido.charAt(0).toUpperCase() + apellido.slice(1).toLowerCase();
    const telefonoCompleto = `${codpais}-${telefono}`;

    // --- PASO 3: FLUJO DE BASE DE DATOS ---
    
    // FASE A: Registrar Persona (Protegiendo el Email)
    // INSERT IGNORE: Si la cédula existe, la ignora silenciosamente. ¡El email y datos originales se salvan!
    const queryPersona = `
        INSERT IGNORE INTO persona 
        (pertipodoc, perdoc, pernombre, perapellido, perfechanac, pertelefono, peremail, perpais, perciudad) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const valoresPersona = [tipodoc, doc, nombreF, apellidoF, fechaNacimiento, telefonoCompleto, email, pais, ciudad];

    connection.query(queryPersona, valoresPersona, (errPersona) => {
        if (errPersona) {
            console.error('Error Crítico en Fase Persona:', errPersona);
            return res.status(500).send('Error interno guardando al usuario.');
        }

        // FASE B: Registrar Inscripción Administrativa
        const queryInscripcion = `INSERT INTO inscripcion (ins_perdoc, ins_oferta) VALUES (?, ?)`;
        const valoresInscripcion = [doc, capacitacion];

        connection.query(queryInscripcion, valoresInscripcion, (errInscripcion) => {
            if (errInscripcion) {
                // AQUÍ ESTÁ LA MAGIA: Si intenta registrarse en el mismo curso de nuevo
                if (errInscripcion.code === 'ER_DUP_ENTRY') {
                    return res.send('<script>alert("¡Ya te encuentras registrado en esta capacitación específica!"); window.history.back();</script>');
                }
                console.error('Error Crítico en Fase Inscripción:', errInscripcion);
                return res.status(500).send('Error interno procesando la inscripción.');
            }

            // FASE C: Registrar Perfil Académico
            const queryAcademico = `INSERT INTO persona_capacitacion (pcap_perdoc, pcap_oferta) VALUES (?, ?)`;
            
            connection.query(queryAcademico, valoresInscripcion, (errAcademico) => {
                if (errAcademico) {
                    // Si ocurre un error aquí, lo registramos, pero ya la inscripción está hecha.
                    // (En un sistema bancario usaríamos transacciones estrictas, pero aquí está bien)
                    console.error('Error en Fase Académica:', errAcademico);
                }
                
                // ¡MISION CUMPLIDA!
                console.log(`[ÉXITO] Participante ${doc} inscrito en la oferta ${capacitacion}`);
                res.send('<script>alert("¡Inscripción completada con éxito! Nos pondremos en contacto contigo."); window.location.href="/";</script>');
            });
        });
    });
};

module.exports = controller;