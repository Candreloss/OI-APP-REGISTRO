// src/utils/dbUtils.js
// Utilidades de transacción sobre el pool de mysql2 (API de callbacks).
// Toda operación multi-paso DEBE pasar por aquí: commit/rollback/release
// quedan garantizados aunque `fn` lance o la conexión falle.

// Promisifica conn.query(sql, params).
const q = (conn, sql, params = []) =>
    new Promise((resolve, reject) =>
        conn.query(sql, params, (err, resultado) => (err ? reject(err) : resolve(resultado)))
    );

// Obtiene una conexión del pool.
const tomarConexion = () =>
    new Promise((resolve, reject) =>
        require('../config/database').getConnection((err, conn) => (err ? reject(err) : resolve(conn)))
    );

// Promisifica beginTransaction / commit / rollback.
const iniciar = (conn) => new Promise((res, rej) => conn.beginTransaction((e) => (e ? rej(e) : res())));
const confirmar = (conn) => new Promise((res, rej) => conn.commit((e) => (e ? rej(e) : res())));
const revertir = (conn) => new Promise((res) => conn.rollback(() => res()));

/**
 * Ejecuta fn(conn) dentro de una transacción.
 * - Éxito: COMMIT y devuelve lo que retorne fn.
 * - Error: ROLLBACK y relanza el error original.
 * En ambos casos la conexión se libera de vuelta al pool.
 */
const enTransaccion = async (fn) => {
    const conn = await tomarConexion();
    try {
        await iniciar(conn);
        const resultado = await fn(conn);
        await confirmar(conn);
        return resultado;
    } catch (error) {
        await revertir(conn).catch(() => {});
        throw error;
    } finally {
        conn.release();
    }
};

module.exports = { q, enTransaccion };
