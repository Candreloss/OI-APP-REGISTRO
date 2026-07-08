const mysql = require('mysql');

// Creamos el Pool UNA SOLA VEZ
const pool = mysql.createPool({
    connectionLimit: 10, 
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
});

// Exportamos LA INSTANCIA (sin función flecha)
module.exports = pool;