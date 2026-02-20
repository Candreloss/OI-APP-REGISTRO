// src/controllers/publicoController.js
const dbConnection = require('../config/database'); 
const connection = dbConnection(); 

const controller = {};

// 1. LÓGICA PARA MOSTRAR LA PÁGINA Y LAS OFERTAS
controller.mostrarPrincipal = (req, res) => {
    // Traemos las ofertas activas junto con el nombre real de la capacitación
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
        
        res.render('principal/principal', { 
            title: 'Página Principal',
            ofertas: resultados
        });
    });
};

// 2. LÓGICA MAESTRA DE REGISTRO
controller.registrarParticipante = (req, res) => {
    
    // --- PASO 1: CAPTURAR Y VALIDAR ---
    const { tipodoc, doc, nombre, apellido, codpais, telefono, email, pais, ciudad, capacitacion, año, mes, dia } = req.body;

    if (!tipodoc || !doc || !nombre || !apellido || !codpais || !telefono || !email || !pais || !ciudad) {
        return res.status(400).send('Todos los datos personales son obligatorios');
    }

    // Validación crucial: ¿Seleccionó una capacitación en la columna derecha?
    if (!capacitacion) {
        return res.send('<script>alert("Por favor, selecciona una capacitación de la lista."); window.history.back();</script>');
    }

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

    // --- PASO 3: TRANSACCIÓN EN CASCADA ---
    
    // FASE A: Registrar o Actualizar Persona (Upsert)
    // Si la persona ya existe, actualizamos sus datos de contacto por si cambiaron.
    const queryPersona = `
        INSERT INTO persona 
        (pertipodoc, perdoc, pernombre, perapellido, perfechanac, pertelefono, peremail, perpais, perciudad) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        pertelefono = VALUES(pertelefono), 
        peremail = VALUES(peremail), 
        perciudad = VALUES(perciudad)
    `;
    const valoresPersona = [tipodoc, doc, nombreF, apellidoF, fechaNacimiento, telefonoCompleto, email, pais, ciudad];

    connection.query(queryPersona, valoresPersona, (errPersona) => {
        if (errPersona) {
            console.error('Error al guardar/actualizar persona:', errPersona);
            return res.status(500).send('Error interno del servidor en el registro de usuario.');
        }

        // FASE B: Registrar en la tabla Inscripcion (Administrativo)
        const queryInscripcion = `INSERT INTO inscripcion (ins_perdoc, ins_oferta) VALUES (?, ?)`;
        const valoresInscripcion = [doc, capacitacion];

        connection.query(queryInscripcion, valoresInscripcion, (errInscripcion) => {
            if (errInscripcion) {
                // Validación: Si ya está inscrito en ESTA capacitación específica
                if (errInscripcion.code === 'ER_DUP_ENTRY') {
                    return res.send('<script>alert("¡Ya te encuentras registrado en esta capacitación específica!"); window.history.back();</script>');
                }
                console.error('Error al guardar inscripción:', errInscripcion);
                return res.status(500).send('Error interno al procesar la inscripción.');
            }

            // FASE C: Registrar en la tabla Persona_Capacitacion (Académico)
            const queryAcademico = `INSERT INTO persona_capacitacion (pcap_perdoc, pcap_oferta) VALUES (?, ?)`;
            
            connection.query(queryAcademico, valoresInscripcion, (errAcademico) => {
                if (errAcademico) {
                    console.error('Error al crear el perfil académico:', errAcademico);
                    // No detenemos el proceso aquí porque el pago/inscripción ya se registró
                }
                
                // ¡TODO SALIÓ PERFECTO!
                console.log(`[ÉXITO] Usuario ${doc} inscrito en la oferta ${capacitacion}`);
                // Mostramos un mensaje de éxito y recargamos la página limpia
                res.send('<script>alert("¡Inscripción completada con éxito! Nos pondremos en contacto contigo pronto."); window.location.href="/";</script>');
            });
        });
    });
};

module.exports = controller;