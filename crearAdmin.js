// Archivo utilitario: crearAdmin.js
// Uso: node crearAdmin.js <usuario> <contrasena>
// Las credenciales NUNCA se escriben en este archivo.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./src/config/database');

const generarAdmin = async () => {
    const [usuario, contrasena] = process.argv.slice(2);

    if (!usuario || !contrasena) {
        console.error('Uso: node crearAdmin.js <usuario> <contrasena>');
        process.exit(1);
    }
    if (contrasena.length < 10) {
        console.error('La contrasena debe tener al menos 10 caracteres.');
        process.exit(1);
    }

    try {
        const hash = await bcrypt.hash(contrasena, 10);
        const query = 'INSERT INTO admin (nombreUsuario, contrasena) VALUES (?, ?)';
        await pool.promise().query(query, [usuario, hash]);
        console.log('Administrador creado con exito en la base de datos.');
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            console.error('Ese nombre de usuario ya existe en la tabla admin.');
        } else {
            console.error('Error al crear el administrador:', err.message);
        }
        process.exitCode = 1;
    } finally {
        pool.end();
    }
};

generarAdmin();
