// Archivo temporal: crearAdmin.js
const bcrypt = require('bcryptjs');
const dbConnection = require('./src/config/database');
const connection = dbConnection();

const generarAdmin = async () => {
    const salt = await bcrypt.genSalt(10);
    // Cambia 'admin123' por la contraseña que desees
    const hash = await bcrypt.hash('calo', salt);
    
    const query = 'INSERT INTO admin (nombreUsuario, contrasena) VALUES (?, ?)';
    connection.query(query, ['candreloss', hash], (err, result) => {
        if(err) console.log('Error al crear:', err);
        else console.log('¡Administrador creado con éxito en la base de datos!');
        process.exit();
    });
};

generarAdmin();