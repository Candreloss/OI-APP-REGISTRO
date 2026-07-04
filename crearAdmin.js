// Archivo temporal: crearAdmin.js
require('dotenv').config(); // 👈 ¡Línea vital para cargar credenciales!
const bcrypt = require('bcryptjs');
const dbConnection = require('./src/config/database');
const connection = dbConnection();

const generarAdmin = async () => {
    const salt = await bcrypt.genSalt(10);
    // Cambia 'tu_contrasena_aqui' por la que definiste
    const hash = await bcrypt.hash('cdpm03092005', salt); 
    
    const query = 'INSERT INTO admin (nombreUsuario, contrasena) VALUES (?, ?)';
    connection.query(query, ['carlosdavidparadasmendoza@gmail.com', hash], (err, result) => {
        if(err) console.log('Error al crear:', err);
        else console.log('¡Administrador creado con éxito en la base de datos!');
        process.exit();
    });
};

generarAdmin();