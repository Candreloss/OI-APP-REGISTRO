// Archivo: index.js (En la raíz del proyecto)

// 1. Cargar variables de entorno
require('dotenv').config();

// 2. Importamos la app
const app = require('./src/app'); 

// 3. Importamos las nuevas rutas limpias
app.use('/', require('./src/routes/publico'));
app.use('/', require('./src/routes/admin'));

// 4. Iniciamos el servidor
const port = app.get('port');
app.listen(port, () => {
    console.log(`
    ================================================
    🚀 SERVIDOR CORRIENDO EN PUERTO: ${port}
    🌍 ENTORNO: ${process.env.NODE_ENV || 'development'}
    ================================================
    `);
});