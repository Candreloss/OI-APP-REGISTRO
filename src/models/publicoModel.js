// src/models/PublicoModel.js
const connection = require('../config/database');
const { q, enTransaccion } = require('../utils/dbUtils');
const logger = require('../utils/logger');

const PublicoModel = {};

// Error de negocio: los controladores lo mapean a HTTP 400.
const errorValidacion = (message) => ({ tipo: 'validacion', message });

/**
 * Disponibilidad de cupos DENTRO de una transacción.
 * FOR UPDATE bloquea la fila de la oferta hasta el COMMIT/ROLLBACK: dos
 * inscripciones concurrentes ya no pueden aprobarse sobre los mismos cupos
 * (elimina la condición de carrera verificar-then-insertar).
 */
const disponibilidadBloqueada = async (conn, ofertaId, cantidadRequerida) => {
    const rows = await q(conn, `
        SELECT co.capofcupos, co.cupos_bloqueados,
               (SELECT COUNT(*) FROM inscripcion WHERE ins_oferta = co.capofcodigo) as inscritos
        FROM capacitacion_oferta co 
        WHERE co.capofcodigo = ?
        FOR UPDATE
    `, [ofertaId]);

    if (rows.length === 0) throw errorValidacion('La capacitación no existe.');
    const oferta = rows[0];
    if (oferta.cupos_bloqueados === 1) throw errorValidacion('Las inscripciones para esta capacitación están pausadas temporalmente.');

    const restantes = oferta.capofcupos - oferta.inscritos;
    if (restantes < cantidadRequerida) {
        throw errorValidacion(`Cupos insuficientes. Solo quedan ${Math.max(0, restantes)} cupos disponibles.`);
    }
    return restantes;
};

// 1. Mostrar ofertas en la página principal
PublicoModel.obtenerOfertasActivas = () => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT co.capofcodigo, c.capnombre, co.cupos_bloqueados,
                   (co.capofcupos - (SELECT COUNT(*) FROM inscripcion WHERE ins_oferta = co.capofcodigo)) as cupos_restantes
            FROM capacitacion_oferta co 
            JOIN capacitacion c ON co.capofcapcodigo = c.capcodigo 
            WHERE co.capofestatus = 1
        `;
        connection.query(query, (err, resultados) => {
            if (err) reject(err);
            else resolve(resultados);
        });
    });
};

// 2. Registro Completo de Usuario e Inscripción
// Transacción atómica: bloqueo de cupos + persona + inscripción (+ académico tolerante).
PublicoModel.registrarUsuarioEInscripcion = (datosPersona, capacitacion) => {
    return enTransaccion(async (conn) => {
        await disponibilidadBloqueada(conn, capacitacion, 1);

        await q(conn, `
            INSERT IGNORE INTO persona 
            (pertipodoc, perdoc, pernombre, perapellido, perfechanac, pertelefono, peremail, perpais, perciudad) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, datosPersona);

        const cedula = datosPersona[1];
        try {
            await q(conn, 'INSERT INTO inscripcion (ins_perdoc, ins_oferta) VALUES (?, ?)', [cedula, capacitacion]);
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') throw errorValidacion('¡Ya te encuentras registrado en esta capacitación!');
            throw err;
        }

        try {
            await q(conn, 'INSERT INTO persona_capacitacion (pcap_perdoc, pcap_oferta) VALUES (?, ?)', [cedula, capacitacion]);
        } catch (errAcademico) {
            // El registro académico es secundario: no revierte la inscripción.
            logger.error('Error en Fase Académica:', errAcademico);
        }
        return true;
    });
};

// 3. Sistema OTP: Limpiar tokens viejos
PublicoModel.limpiarTokensAntiguos = (email) => {
    return new Promise((resolve) => {
        connection.query('DELETE FROM token_otp WHERE email = ?', [email], () => resolve(true));
    });
};

// 4. Sistema OTP: Guardar nuevo token
PublicoModel.guardarTokenOTP = (email, codigo, expiraEn) => {
    return new Promise((resolve, reject) => {
        connection.query('INSERT INTO token_otp (email, codigo, expira_en) VALUES (?, ?, ?)', [email, codigo, expiraEn], (err) => {
            if (err) reject(err);
            else resolve(true);
        });
    });
};

// 5. Sistema OTP: Verificar si la persona ya es un usuario registrado
PublicoModel.verificarUsuarioExistente = (cedula) => {
    return new Promise((resolve, reject) => {
        connection.query('SELECT pernombre, perapellido FROM persona WHERE perdoc = ?', [cedula], (err, resultados) => {
            if (err) reject(err);
            else resolve(resultados);
        });
    });
};

// 6. Sistema OTP: Buscar Token para validarlo
PublicoModel.buscarTokenOTP = (email, codigo) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT id_otp, expira_en, usado FROM token_otp WHERE email = ? AND codigo = ? ORDER BY id_otp DESC LIMIT 1';
        connection.query(query, [email, codigo], (err, resultados) => {
            if (err) reject(err);
            else resolve(resultados);
        });
    });
};

// 7. Sistema OTP: Quemar (marcar como usado) el token
PublicoModel.marcarTokenUsado = (id_otp) => {
    return new Promise((resolve, reject) => {
        connection.query('UPDATE token_otp SET usado = 1 WHERE id_otp = ?', [id_otp], (err) => {
            if (err) reject(err);
            else resolve(true);
        });
    });
};

// 8. Buscar Cursos Pendientes de Pago
PublicoModel.obtenerCursosPendientes = (cedula) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT i.inscodigo, c.capnombre 
            FROM inscripcion i
            JOIN capacitacion_oferta co ON i.ins_oferta = co.capofcodigo
            JOIN capacitacion c ON co.capofcapcodigo = c.capcodigo
            WHERE i.ins_perdoc = ? AND i.ins_estado = 'pendiente'
        `;
        connection.query(query, [cedula], (err, resultados) => {
            if (err) reject(err);
            else resolve(resultados);
        });
    });
};

// 9. Reportar el Pago y Cambiar Estado a En Revisión
// Transacción: el UPDATE es condicional al estado previo, así dos reportes
// simultáneos no pueden colar el segundo (affectedRows === 0).
PublicoModel.registrarPagoYActualizar = (datosPago, curso_pagado) => {
    return enTransaccion(async (conn) => {
        await q(conn, `
            INSERT INTO pago_reportado 
            (pago_inscodigo, titular_nombre, titular_apellido, titular_telefono, banco_origen, referencia) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, datosPago);

        const resultado = await q(conn, `
            UPDATE inscripcion SET ins_estado = 'en_revision' 
            WHERE inscodigo = ? AND ins_estado IN ('pendiente', 'rechazado')
        `, [curso_pagado]);

        if (resultado.affectedRows === 0) {
            throw errorValidacion('Esta inscripción ya tiene un pago en revisión o conciliado.');
        }
        return true;
    });
};

// 10. Multi-inscripción: Obtener capacitaciones que el usuario AÚN NO TIENE
// FIX: antes ignoraba la cédula y ofrecía capacitaciones ya cursadas.
PublicoModel.obtenerOfertasDisponibles = (cedula) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT co.capofcodigo, c.capnombre, co.cupos_bloqueados,
                   (co.capofcupos - (SELECT COUNT(*) FROM inscripcion WHERE ins_oferta = co.capofcodigo)) as cupos_restantes
            FROM capacitacion_oferta co 
            JOIN capacitacion c ON co.capofcapcodigo = c.capcodigo 
            WHERE co.capofestatus = 1
              AND NOT EXISTS (
                  SELECT 1 FROM inscripcion i2 
                  WHERE i2.ins_oferta = co.capofcodigo AND i2.ins_perdoc = ?
              )
        `;
        connection.query(query, [cedula], (err, resultados) => {
            if (err) reject(err);
            else resolve(resultados);
        });
    });
};

// 11. Multi-inscripción: Inscripción rápida de usuario existente
PublicoModel.inscripcionRapida = (cedula, capacitacion) => {
    return enTransaccion(async (conn) => {
        await disponibilidadBloqueada(conn, capacitacion, 1);

        try {
            await q(conn, 'INSERT INTO inscripcion (ins_perdoc, ins_oferta) VALUES (?, ?)', [cedula, capacitacion]);
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') throw errorValidacion('Ya estás inscrito en esta capacitación.');
            throw err;
        }

        try {
            await q(conn, 'INSERT INTO persona_capacitacion (pcap_perdoc, pcap_oferta) VALUES (?, ?)', [cedula, capacitacion]);
        } catch (errAcademico) {
            logger.error('Error en Fase Académica rápida:', errAcademico);
        }
        return true;
    });
};

// 12. Verificar si es un Contacto de Empresa Autorizado
PublicoModel.verificarContactoEmpresa = (cedula, email) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM contacto_empresa WHERE emp_doc = ? AND emp_email = ?';
        connection.query(query, [cedula, email], (err, resultados) => {
            if (err) reject(err);
            else resolve(resultados);
        });
    });
};

// 12b. Identidad previa al OTP: ¿(cedula,email) corresponde a un participante o a un contacto de empresa?
// Devuelve { tipo: 'participante' | 'empresa' } o null si el par no existe (anti-enumeración).
PublicoModel.verificarIdentidadParaOTP = (cedula, email) => {
    return new Promise((resolve, reject) => {
        const qPersona = 'SELECT perdoc FROM persona WHERE perdoc = ? AND peremail = ? LIMIT 1';
        connection.query(qPersona, [cedula, email], (errP, rowsP) => {
            if (errP) return reject(errP);
            if (rowsP.length > 0) return resolve({ tipo: 'participante' });

            const qEmpresa = 'SELECT id_contacto FROM contacto_empresa WHERE emp_doc = ? AND emp_email = ? LIMIT 1';
            connection.query(qEmpresa, [cedula, email], (errE, rowsE) => {
                if (errE) return reject(errE);
                if (rowsE.length > 0) return resolve({ tipo: 'empresa' });
                // No existe en ninguna tabla → usuario nuevo, lo tratamos como participante
                // para permitirle completar el registro tras validar OTP.
                resolve({ tipo: 'participante' });
            });
        });
    });
};

// 12c. Verificar que una inscripción pertenece a una cédula (anti-IDOR en reporte de pagos)
PublicoModel.obtenerInscripcionDeUsuario = (inscodigo, cedula) => {
    return new Promise((resolve, reject) => {
        connection.query(
            'SELECT inscodigo, ins_estado FROM inscripcion WHERE inscodigo = ? AND ins_perdoc = ?',
            [inscodigo, cedula],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows[0] || null);
            }
        );
    });
};

// 13. Procesar lote masivo de inscripciones B2B
// FIX: el conteo de ya-inscritos y la validación de cupos ahora ocurren
// DENTRO de la transacción y con bloqueo FOR UPDATE (antes eran externos:
// dos empresas concurrentes podían agotar los mismos cupos).
PublicoModel.registrarLoteTransaccion = (empresaId, ofertaId, empleados) => {
    return enTransaccion(async (conn) => {
        const docs = empleados.map(e => e.doc);
        if (docs.length === 0) return true;

        // Conteo de ya-inscritos con el mismo candado que usará la matemática de cupos.
        const filasCount = await q(conn,
            'SELECT COUNT(*) as ya_inscritos FROM inscripcion WHERE ins_oferta = ? AND ins_perdoc IN (?)',
            [ofertaId, docs]
        );
        const nuevosRequeridos = empleados.length - filasCount[0].ya_inscritos;
        if (nuevosRequeridos > 0) await disponibilidadBloqueada(conn, ofertaId, nuevosRequeridos);

        for (const emp of empleados) {
            const queryPersona = `
                INSERT INTO persona (pertipodoc, perdoc, pernombre, perapellido, perfechanac, pertelefono, peremail, perpais, perciudad) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                pernombre=VALUES(pernombre), perapellido=VALUES(perapellido), pertelefono=VALUES(pertelefono), 
                peremail=VALUES(peremail), perpais=VALUES(perpais), perciudad=VALUES(perciudad), perfechanac=VALUES(perfechanac)
            `;
            const datosPersona = [emp.tipodoc, emp.doc, emp.nombre, emp.apellido, emp.fechanac, emp.telefono, emp.email, emp.pais, emp.ciudad];
            await q(conn, queryPersona, datosPersona);

            const rowsCheck = await q(conn, 'SELECT inscodigo FROM inscripcion WHERE ins_perdoc = ? AND ins_oferta = ?', [emp.doc, ofertaId]);
            if (rowsCheck.length > 0) continue; // ya inscrito por un envío anterior: no duplicar

            await q(conn, 'INSERT INTO inscripcion (ins_perdoc, ins_oferta, ins_empresa_id) VALUES (?, ?, ?)', [emp.doc, ofertaId, empresaId]);
            // En lote B2B el registro académico SÍ es parte de la atomicidad.
            await q(conn, 'INSERT INTO persona_capacitacion (pcap_perdoc, pcap_oferta) VALUES (?, ?)', [emp.doc, ofertaId]);
        }
        return true;
    });
};

// 14. Obtener participantes ya registrados por una empresa en una capacitación
PublicoModel.obtenerLoteExistente = (empresaId, ofertaId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT p.* FROM persona p 
            JOIN inscripcion i ON p.perdoc = i.ins_perdoc 
            WHERE i.ins_empresa_id = ? AND i.ins_oferta = ?
        `;
        connection.query(query, [empresaId, ofertaId], (err, resultados) => {
            if (err) reject(err);
            else resolve(resultados);
        });
    });
};

// 15. Buscar Lotes corporativos pendientes de pago (o rechazados)
PublicoModel.obtenerLotesEmpresaPendientes = (empresaId) => {
    return new Promise((resolve, reject) => {
        // ACTUALIZADO: Ahora busca estados 'pendiente' o 'rechazado'
        const query = `
            SELECT DISTINCT co.capofcodigo, c.capnombre 
            FROM inscripcion i
            JOIN capacitacion_oferta co ON i.ins_oferta = co.capofcodigo
            JOIN capacitacion c ON co.capofcapcodigo = c.capcodigo
            WHERE i.ins_empresa_id = ? AND i.ins_estado IN ('pendiente', 'rechazado')
        `;
        connection.query(query, [empresaId], (err, resultados) => {
            if (err) reject(err); else resolve(resultados);
        });
    });
};

// 16. Obtener inscripciones pendientes o rechazadas de un lote corporativo
PublicoModel.obtenerInscripcionesPendientesPorLote = (empresaId, ofertaId) => {
    return new Promise((resolve, reject) => {
        // ACTUALIZADO: Ahora también extrae los códigos de los rechazados para pasar a revisión
        const query = `SELECT inscodigo FROM inscripcion WHERE ins_empresa_id = ? AND ins_oferta = ? AND ins_estado IN ('pendiente', 'rechazado')`;
        
        connection.query(query, [empresaId, ofertaId], (err, rows) => {
            if (err) reject(err); else resolve(rows.map(r => r.inscodigo));
        });
    });
};

// 17. Registrar pago B2B (Múltiples inscripciones a la vez)
PublicoModel.registrarPagoB2B = (inscodigosArray, datosPagoBase, empresaId) => {
    return new Promise((resolve, reject) => {
        connection.getConnection((err, conn) => {
            if(err) return reject(err);
            conn.beginTransaction(errTrans => {
                if(errTrans) { conn.release(); return reject(errTrans); }

                // Creamos una matriz para insertar un pago por CADA empleado del lote
                const valuesPago = inscodigosArray.map(ins => [
                    ins, empresaId, ...datosPagoBase
                ]);

                const qInsert = `INSERT INTO pago_reportado (pago_inscodigo, pago_empresa_id, titular_nombre, titular_apellido, titular_telefono, banco_origen, referencia) VALUES ?`;

                conn.query(qInsert, [valuesPago], (errIns) => {
                    if(errIns) return conn.rollback(() => { conn.release(); reject(errIns); });

                    const qUpdate = `UPDATE inscripcion SET ins_estado = 'en_revision' WHERE inscodigo IN (?)`;
                    conn.query(qUpdate, [inscodigosArray], (errUpd) => {
                        if(errUpd) return conn.rollback(() => { conn.release(); reject(errUpd); });

                        conn.commit(errCom => {
                            if(errCom) return conn.rollback(() => { conn.release(); reject(errCom); });
                            conn.release(); resolve(true);
                        });
                    });
                });
            });
        });
    });
};

module.exports = PublicoModel;