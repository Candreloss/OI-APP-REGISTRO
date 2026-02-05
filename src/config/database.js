const mysql = require('mysql');
module.exports = () => {
    return mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '12345678',
        database: 'oi_modulo_db'
    });
}