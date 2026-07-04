// src/models/AdminModel.js
const connection = require('../config/database');

const AdminModel = {};

// 1. Buscar Administrador para el Login
AdminModel.buscarPorUsuario = (username) => {
    return new Promise((resolve, reject) => {
        connection.query('SELECT * FROM admin WHERE nombreUsuario = ?', [username], (err, resultados) => {
            if (err) reject(err);
            else resolve(resultados);
        });
    });
};

// 2. Obtener Estadísticas del Dashboard
AdminModel.obtenerEstadisticas = () => {
    return new Promise((resolve, reject) => {
        const queryStats = `SELECT
            (SELECT COUNT(*) FROM capacitacion_oferta WHERE capofestatus = 1) AS totalOfertas,
            (SELECT COUNT(*) FROM inscripcion WHERE ins_estado = 'pendiente') AS totalPendientes,
            (SELECT COUNT(*) FROM inscripcion WHERE ins_estado = 'conciliado') AS totalConciliados`;
        
        connection.query(queryStats, (err, statsResult) => {
            if (err) reject(err);
            else resolve(statsResult[0]);
        });
    });
};

// 3. Obtener Ofertas Activas (Para el Dashboard)
AdminModel.obtenerOfertasActivas = () => {
    return new Promise((resolve, reject) => {
        const query = `SELECT co.capofcodigo, c.capnombre, co.capofcupos 
                       FROM capacitacion_oferta co 
                       JOIN capacitacion c ON co.capofcapcodigo = c.capcodigo 
                       WHERE co.capofestatus = 1`;
        connection.query(query, (err, resultados) => {
            if (err) reject(err);
            else resolve(resultados);
        });
    });
};

// 4. Obtener Todas las Ofertas (Para la vista de Gestión)
AdminModel.obtenerTodasLasOfertas = () => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT co.capofcodigo, c.capnombre, co.capoffecha_inicio, co.capoffecha_fin, 
                   co.capofcupos, co.capofestatus, co.cupos_bloqueados,
                   (SELECT COUNT(*) FROM inscripcion WHERE ins_oferta = co.capofcodigo) as inscritos
            FROM capacitacion_oferta co 
            JOIN capacitacion c ON co.capofcapcodigo = c.capcodigo 
            ORDER BY co.capofcodigo DESC
        `;
        connection.query(query, (err, resultados) => {
            if (err) reject(err);
            else resolve(resultados);
        });
    });
};

// 5. Obtener Lista de Participantes y Pagos
AdminModel.obtenerParticipantes = () => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                i.inscodigo, i.ins_estado, DATE_FORMAT(i.ins_fecha, '%d/%m/%Y') as fecha_formateada,
                p.perdoc, p.pernombre, p.perapellido, p.pertelefono, p.peremail, p.perpais, p.perciudad,
                c.capnombre,
                pr.titular_nombre, pr.titular_apellido, pr.banco_origen, pr.referencia, pr.titular_telefono as tlf_pago,
                DATE_FORMAT(pr.fecha_reporte, '%d/%m/%Y %h:%i %p') as fecha_pago,
                ce.empresa_nombre
            FROM inscripcion i
            JOIN persona p ON i.ins_perdoc = p.perdoc
            JOIN capacitacion_oferta co ON i.ins_oferta = co.capofcodigo
            JOIN capacitacion c ON co.capofcapcodigo = c.capcodigo
            LEFT JOIN pago_reportado pr ON i.inscodigo = pr.pago_inscodigo
            LEFT JOIN contacto_empresa ce ON i.ins_empresa_id = ce.id_contacto
            ORDER BY i.ins_fecha DESC
        `;
        connection.query(query, (err, resultados) => {
            if (err) reject(err);
            else resolve(resultados);
        });
    });
};

// 6. Buscar un pago para los correos
AdminModel.obtenerDatosInscripcionCorreo = (inscodigo) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT p.peremail, p.pernombre, c.capnombre 
            FROM inscripcion i
            JOIN persona p ON i.ins_perdoc = p.perdoc
            JOIN capacitacion_oferta co ON i.ins_oferta = co.capofcodigo
            JOIN capacitacion c ON co.capofcapcodigo = c.capcodigo
            WHERE i.inscodigo = ?
        `;
        connection.query(query, [inscodigo], (err, resultados) => {
            if (err) reject(err);
            else resolve(resultados[0]);
        });
    });
};

// 7. Obtener todos los contactos de empresas registrados
AdminModel.obtenerContactosEmpresa = () => {
    return new Promise((resolve, reject) => {
        connection.query('SELECT * FROM contacto_empresa ORDER BY creado_en DESC', (err, resultados) => {
            if (err) reject(err);
            else resolve(resultados);
        });
    });
};

// 8. Registrar un nuevo contacto de empresa
AdminModel.registrarContactoEmpresa = (datos) => {
    return new Promise((resolve, reject) => {
        // Añadimos empresa_nombre al principio
        const query = `INSERT INTO contacto_empresa (empresa_nombre, emp_tipodoc, emp_doc, emp_nombre, emp_apellido, emp_email, emp_telefono) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        connection.query(query, datos, (err) => {
            if (err) reject(err);
            else resolve(true);
        });
    });
};

// 9. Obtener lotes B2B pendientes de aprobación
AdminModel.obtenerLotesPendientes = () => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                ce.id_contacto, ce.empresa_nombre, ce.emp_email,
                co.capofcodigo, c.capnombre,
                COUNT(i.inscodigo) as total_empleados
            FROM inscripcion i
            JOIN contacto_empresa ce ON i.ins_empresa_id = ce.id_contacto
            JOIN capacitacion_oferta co ON i.ins_oferta = co.capofcodigo
            JOIN capacitacion c ON co.capofcapcodigo = c.capcodigo
            WHERE i.ins_estado != 'conciliado'
            GROUP BY ce.id_contacto, co.capofcodigo, ce.empresa_nombre, ce.emp_email, c.capnombre
        `;
        connection.query(query, (err, resultados) => {
            if (err) reject(err);
            else resolve(resultados);
        });
    });
};

// 10. Aprobar un lote completo (Bulk Update)
AdminModel.aprobarLote = (empresaId, ofertaId) => {
    return new Promise((resolve, reject) => {
        const query = `UPDATE inscripcion SET ins_estado = 'conciliado' WHERE ins_empresa_id = ? AND ins_oferta = ?`;
        connection.query(query, [empresaId, ofertaId], (err) => {
            if (err) reject(err);
            else resolve(true);
        });
    });
};

// 11. Obtener los correos de un lote específico para notificar
AdminModel.obtenerCorreosLote = (empresaId, ofertaId) => {
     return new Promise((resolve, reject) => {
         const query = `
            SELECT p.peremail, p.pernombre, c.capnombre
            FROM inscripcion i
            JOIN persona p ON i.ins_perdoc = p.perdoc
            JOIN capacitacion_oferta co ON i.ins_oferta = co.capofcodigo
            JOIN capacitacion c ON co.capofcapcodigo = c.capcodigo
            WHERE i.ins_empresa_id = ? AND i.ins_oferta = ?
         `;
         connection.query(query, [empresaId, ofertaId], (err, resultados) => {
             if (err) reject(err);
             else resolve(resultados);
         });
     });
}

// ==========================================================
// NUEVAS FUNCIONES MIGRADAS DESDE EL CONTROLADOR
// ==========================================================

// 12. Obtener lista base de capacitaciones (para selects)
AdminModel.obtenerCapacitacionesBase = () => {
    return new Promise((resolve, reject) => {
        connection.query('SELECT capcodigo, capnombre FROM capacitacion ORDER BY capnombre ASC', (err, resultados) => {
            if (err) reject(err); else resolve(resultados);
        });
    });
};

// 13. Crear nueva oferta
AdminModel.crearOferta = (capofcapcodigo, fecha_inicio, fecha_fin, cupos) => {
    return new Promise((resolve, reject) => {
        const query = `INSERT INTO capacitacion_oferta (capofcapcodigo, capoffecha_inicio, capoffecha_fin, capofcupos, capofestatus) VALUES (?, ?, ?, ?, 1)`;
        connection.query(query, [capofcapcodigo, fecha_inicio, fecha_fin, cupos], (err) => {
            if (err) reject(err); else resolve(true);
        });
    });
};

// 14. Obtener oferta por ID (para editar)
AdminModel.obtenerOfertaPorId = (id) => {
    return new Promise((resolve, reject) => {
        connection.query('SELECT * FROM capacitacion_oferta WHERE capofcodigo = ?', [id], (err, resultados) => {
            if (err) reject(err); else resolve(resultados[0]);
        });
    });
};

// 15. Actualizar estatus de oferta (Activar/Desactivar)
AdminModel.actualizarEstatusOferta = (id, nuevoEstatus) => {
    return new Promise((resolve, reject) => {
        connection.query('UPDATE capacitacion_oferta SET capofestatus = ? WHERE capofcodigo = ?', [nuevoEstatus, id], (err) => {
            if (err) reject(err); else resolve(true);
        });
    });
};

// 16. Actualizar datos de oferta existente
AdminModel.actualizarOferta = (id, capofcapcodigo, fecha_inicio, fecha_fin, cupos) => {
    return new Promise((resolve, reject) => {
        const query = 'UPDATE capacitacion_oferta SET capofcapcodigo = ?, capoffecha_inicio = ?, capoffecha_fin = ?, capofcupos = ? WHERE capofcodigo = ?';
        connection.query(query, [capofcapcodigo, fecha_inicio, fecha_fin, cupos, id], (err) => {
            if (err) reject(err); else resolve(true);
        });
    });
};

// 17. Cambiar estado de inscripción (Aprobar/Rechazar pago)
AdminModel.actualizarEstadoInscripcion = (inscodigo, estado) => {
    return new Promise((resolve, reject) => {
        connection.query("UPDATE inscripcion SET ins_estado = ? WHERE inscodigo = ?", [estado, inscodigo], (err) => {
            if (err) reject(err); else resolve(true);
        });
    });
};

// 18. Eliminar reporte de pago
AdminModel.eliminarReportePago = (inscodigo) => {
    return new Promise((resolve, reject) => {
        connection.query("DELETE FROM pago_reportado WHERE pago_inscodigo = ?", [inscodigo], (err) => {
            if (err) reject(err); else resolve(true);
        });
    });
};

// 19. Editar perfil de participante individual
AdminModel.actualizarPerfilParticipante = (doc, nombre, apellido, telefono) => {
    return new Promise((resolve, reject) => {
        const query = `UPDATE persona SET pernombre = ?, perapellido = ?, pertelefono = ? WHERE perdoc = ?`;
        connection.query(query, [nombre, apellido, telefono, doc], (err) => {
            if (err) reject(err); else resolve(true);
        });
    });
};

// 20. Bloquear o desbloquear inscripciones manualmente
AdminModel.toggleBloqueoCupos = (id, nuevoBloqueo) => {
    return new Promise((resolve, reject) => {
        connection.query('UPDATE capacitacion_oferta SET cupos_bloqueados = ? WHERE capofcodigo = ?', [nuevoBloqueo, id], (err) => {
            if (err) reject(err); else resolve(true);
        });
    });
};

// 21. Eliminar una inscripción y sus rastros (Pagos y Registro académico)
AdminModel.eliminarInscripcionCompleta = (inscodigo) => {
    return new Promise((resolve, reject) => {
        // A. Primero buscamos a qué persona y a qué oferta pertenece esta inscripción
        connection.query('SELECT ins_perdoc, ins_oferta FROM inscripcion WHERE inscodigo = ?', [inscodigo], (err, rows) => {
            if (err || rows.length === 0) return reject(err || new Error('Inscripción no encontrada'));
            
            const { ins_perdoc, ins_oferta } = rows[0];

            // B. Eliminamos su reporte de pago (si existe)
            connection.query('DELETE FROM pago_reportado WHERE pago_inscodigo = ?', [inscodigo], (err1) => {
                if (err1) return reject(err1);
                
                // C. Eliminamos su registro académico
                connection.query('DELETE FROM persona_capacitacion WHERE pcap_perdoc = ? AND pcap_oferta = ?', [ins_perdoc, ins_oferta], (err2) => {
                    if (err2) return reject(err2);

                    // D. Finalmente, eliminamos la inscripción
                    connection.query('DELETE FROM inscripcion WHERE inscodigo = ?', [inscodigo], (err3) => {
                        if (err3) return reject(err3);
                        resolve(true);
                    });
                });
            });
        });
    });
};

module.exports = AdminModel;