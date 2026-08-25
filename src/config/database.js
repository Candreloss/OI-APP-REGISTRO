const mysql = require('mysql2');

// TLS opcional hacia la BD (Aiven / producción).
// - DB_SSL=true: activa TLS sin verificar certificado del servidor.
// - DB_SSL_CA=<cert en una linea con \n escapados>: TLS con verificacion completa.
const construirSsl = () => {
    if (process.env.DB_SSL_CA) {
        return { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n'), rejectUnauthorized: true };
    }
    if (process.env.DB_SSL === 'true') {
        return { rejectUnauthorized: false };
    }
    return undefined;
};

// Creamos el Pool UNA SOLA VEZ
const pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    ssl: construirSsl()
});

// Exportamos LA INSTANCIA (sin función flecha)
module.exports = pool;
