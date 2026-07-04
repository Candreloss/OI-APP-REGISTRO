// src/models/PublicoModel.js
const connection = require('../config/database');

const PublicoModel = {};

// NUEVO: Validador Maestro de Cupos
PublicoModel.verificarDisponibilidad = (ofertaId, cantidadRequerida = 1) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT co.capofcupos, co.cupos_bloqueados,
                   (SELECT COUNT(*) FROM inscripcion WHERE ins_oferta = co.capofcodigo) as inscritos
            FROM capacitacion_oferta co 
            WHERE co.capofcodigo = ?
        `;
        connection.query(query, [ofertaId], (err, resultados) => {
            if (err) return reject({ tipo: 'validacion', message: 'Error verificando cupos en la base de datos.' });
            if (resultados.length === 0) return reject({ tipo: 'validacion', message: 'La capacitación no existe.' });
            
            const oferta = resultados[0];
            if (oferta.cupos_bloqueados === 1) return reject({ tipo: 'validacion', message: 'Las inscripciones para esta capacitación están pausadas temporalmente.' });
            
            const restantes = oferta.capofcupos - oferta.inscritos;
            if (restantes < cantidadRequerida) {
                // Math.max(0, restantes) asegura que si el número es negativo, muestre 0.
                return reject({ tipo: 'validacion', message: `Cupos insuficientes. Solo quedan ${Math.max(0, restantes)} cupos disponibles.` });
            }
            
            resolve(restantes);
        });
    });
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
PublicoModel.registrarUsuarioEInscripcion = (datosPersona, capacitacion) => {
    return new Promise((resolve, reject) => {
        PublicoModel.verificarDisponibilidad(capacitacion,1).then(() => {

            const queryPersona = `
            INSERT IGNORE INTO persona 
            (pertipodoc, perdoc, pernombre, perapellido, perfechanac, pertelefono, peremail, perpais, perciudad) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        connection.query(queryPersona, datosPersona, (errPersona) => {
            if (errPersona) return reject({ tipo: 'persona', error: errPersona });

            const cedula = datosPersona[1];
            const queryInscripcion = `INSERT INTO inscripcion (ins_perdoc, ins_oferta) VALUES (?, ?)`;
            
            connection.query(queryInscripcion, [cedula, capacitacion], (errInscripcion) => {
                if (errInscripcion) return reject({ tipo: 'inscripcion', error: errInscripcion });

                const queryAcademico = `INSERT INTO persona_capacitacion (pcap_perdoc, pcap_oferta) VALUES (?, ?)`;
                connection.query(queryAcademico, [cedula, capacitacion], (errAcademico) => {
                    if (errAcademico) console.error('Error en Fase Académica:', errAcademico);
                    resolve(true);
                });
            });
        });

        }).catch(reject);
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
PublicoModel.registrarPagoYActualizar = (datosPago, curso_pagado) => {
    return new Promise((resolve, reject) => {
        const queryInsert = `
            INSERT INTO pago_reportado 
            (pago_inscodigo, titular_nombre, titular_apellido, titular_telefono, banco_origen, referencia) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        connection.query(queryInsert, datosPago, (errInsert) => {
            if (errInsert) return reject(errInsert);

            const queryUpdate = `UPDATE inscripcion SET ins_estado = 'en_revision' WHERE inscodigo = ?`;
            connection.query(queryUpdate, [curso_pagado], (errUpdate) => {
                if (errUpdate) reject(errUpdate);
                else resolve(true);
            });
        });
    });
};

// 10. Multi-inscripción: Obtener capacitaciones que el usuario AÚN NO TIENE
PublicoModel.obtenerOfertasDisponibles = (cedula) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT co.capofcodigo, c.capnombre, co.cupos_bloqueados,
                   (co.capofcupos - (SELECT COUNT(*) FROM inscripcion WHERE ins_oferta = co.capofcodigo)) as cupos_restantes
            FROM capacitacion_oferta co 
            JOIN capacitacion c ON co.capofcapcodigo = c.capcodigo 
            WHERE co.capofestatus = 1
        `;
        connection.query(query, [cedula], (err, resultados) => {
            if (err) reject(err);
            else resolve(resultados);
        });
    });
};

// 11. Multi-inscripción: Inscripción rápida de usuario existente
PublicoModel.inscripcionRapida = (cedula, capacitacion) => {
    return new Promise((resolve, reject) => {
        PublicoModel.verificarDisponibilidad(capacitacion,1).then(() => {
            const queryInscripcion = `INSERT INTO inscripcion (ins_perdoc, ins_oferta) VALUES (?, ?)`;
        connection.query(queryInscripcion, [cedula, capacitacion], (err) => {
            if (err) return reject(err);

            const queryAcademico = `INSERT INTO persona_capacitacion (pcap_perdoc, pcap_oferta) VALUES (?, ?)`;
            connection.query(queryAcademico, [cedula, capacitacion], (errAcademico) => {
                if (errAcademico) console.error('Error en Fase Académica rápida:', errAcademico);
                resolve(true);
            });
        });
        }).catch(reject);
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

// 13. Procesar lote masivo de inscripciones B2B con Transacciones y Pool
PublicoModel.registrarLoteTransaccion = (empresaId, ofertaId, empleados) => {
    return new Promise((resolve, reject) => {
        
        PublicoModel.verificarDisponibilidad(ofertaId, empleados.length).then(() => {

            // 1. Pedimos una conexión prestada al Pool
        connection.getConnection((errPool, conn) => {
            if (errPool) return reject(errPool);

            // 2. Iniciamos la transacción en esta conexión específica
            conn.beginTransaction(errTrans => {
                if (errTrans) {
                    conn.release(); // Liberamos la conexión si falla el inicio
                    return reject(errTrans);
                }

                // Función recursiva para procesar a cada empleado uno por uno
                // Dentro de registrarLoteTransaccion, reemplaza la lógica de "procesarEmpleado" por esta:

                const procesarEmpleado = (index) => {
                    if (index >= empleados.length) {
                        return conn.commit(errCommit => {
                            if (errCommit) return conn.rollback(() => { conn.release(); reject(errCommit); });
                            conn.release(); resolve(true);
                        });
                    }

                    const emp = empleados[index];
                    
                    // UPSERT: Si no existe lo crea, si existe (misma cédula) le actualiza los datos.
                    const queryPersona = `
                        INSERT INTO persona (pertipodoc, perdoc, pernombre, perapellido, perfechanac, pertelefono, peremail, perpais, perciudad) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE 
                        pernombre=VALUES(pernombre), perapellido=VALUES(perapellido), pertelefono=VALUES(pertelefono), 
                        peremail=VALUES(peremail), perpais=VALUES(perpais), perciudad=VALUES(perciudad), perfechanac=VALUES(perfechanac)
                    `;
                    const datosPersona = [emp.tipodoc, emp.doc, emp.nombre, emp.apellido, emp.fechanac, emp.telefono, emp.email, emp.pais, emp.ciudad];

                    conn.query(queryPersona, datosPersona, (errPersona) => {
                        if (errPersona) return conn.rollback(() => { conn.release(); reject(errPersona); });

                        // VERIFICACIÓN INTELIGENTE: ¿Ya estaba inscrito?
                        const checkQuery = `SELECT inscodigo FROM inscripcion WHERE ins_perdoc = ? AND ins_oferta = ?`;
                        conn.query(checkQuery, [emp.doc, ofertaId], (errCheck, rowsCheck) => {
                            if (errCheck) return conn.rollback(() => { conn.release(); reject(errCheck); });

                            // Si ya estaba inscrito, ignoramos la inscripción y saltamos al siguiente empleado
                            if (rowsCheck.length > 0) {
                                return procesarEmpleado(index + 1);
                            }

                            // Si es nuevo, lo inscribimos
                            const queryInscripcion = `INSERT INTO inscripcion (ins_perdoc, ins_oferta, ins_empresa_id) VALUES (?, ?, ?)`;
                            conn.query(queryInscripcion, [emp.doc, ofertaId, empresaId], (errInsc) => {
                                if (errInsc) return conn.rollback(() => { conn.release(); reject(errInsc); });

                                const queryAcademico = `INSERT INTO persona_capacitacion (pcap_perdoc, pcap_oferta) VALUES (?, ?)`;
                                conn.query(queryAcademico, [emp.doc, ofertaId], (errAcad) => {
                                    if (errAcad) return conn.rollback(() => { conn.release(); reject(errAcad); });
                                    procesarEmpleado(index + 1); 
                                });
                            });
                        });
                    });
                };

                // Arrancamos con el primer empleado (índice 0)
                procesarEmpleado(0);
            });
        });

        }).catch(reject);

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

module.exports = PublicoModel;