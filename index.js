// Archivo: index.js (En la raíz del proyecto)

// 1. Importamos la app desde su NUEVA ubicación
const app = require('./src/app'); 

// 2. Importamos las rutas (Usando app.use es más limpio)
app.use('/', require('./src/routes/principal'));

// 3. Iniciamos el servidor
const port = app.get('port');
app.listen(port, () => {
    console.log(`
    ================================================
    SERVIDOR CORRIENDO EN PUERTO: ${port}
    Configuración cargada desde: src/app.js
    ================================================
    `);
});