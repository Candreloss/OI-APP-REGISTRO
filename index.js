// Archivo: index.js (En la raíz del proyecto)

// 1. Cargar variables de entorno
require('dotenv').config();

// 2. Logger (después de .env: el transporte depende de NODE_ENV)
const logger = require('./src/utils/logger');

// 3. Importamos la app (las rutas ya se montan dentro de src/app.js)
const app = require('./src/app');

// 4. Iniciamos el servidor
const port = app.get('port');
app.listen(port, () => {
    logger.info(`
    ================================================
    🚀 SERVIDOR CORRIENDO EN PUERTO: ${port}
    🌍 ENTORNO: ${process.env.NODE_ENV || 'development'}
    ================================================
    `);
});