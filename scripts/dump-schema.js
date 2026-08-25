// scripts/dump-schema.js
// Exporta el esquema real de la BD a sql/schema.sql (solo lectura).
// Uso: node scripts/dump-schema.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const connection = require('../src/config/database');

(async () => {
    try {
        const [tablas] = await connection.promise().query('SHOW TABLES');
        let salida = '-- ============================================================\n'
            + '-- Esquema de BD - Organización Inteligente\n'
            + '-- Generado desde la base real (solo lectura) para versionar.\n'
            + '-- Regenerar: node scripts/dump-schema.js\n'
            + '-- ============================================================\n\n';

        for (const fila of tablas) {
            const tabla = Object.values(fila)[0];
            const [[{ 'Create Table': ddl }]] = await connection.promise().query('SHOW CREATE TABLE ??', [tabla]);
            salida += '-- Tabla: ' + tabla + '\n' + ddl.replace(/CREATE TABLE/, 'CREATE TABLE IF NOT EXISTS') + ';\n\n';
        }

        fs.writeFileSync(path.join(__dirname, '..', 'sql', 'schema.sql'), salida);
        console.log('Esquema exportado:', tablas.map(f => Object.values(f)[0]).join(', '));
    } catch (e) {
        console.error('ERR', e.message);
        process.exitCode = 1;
    } finally {
        connection.end();
    }
})();
