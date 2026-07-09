// src/utils/mailer.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true para el puerto 465 (SSL)
    pool: true,   // NUEVO: Activa el pool de conexiones (mantiene la conexión viva)
    connectionTimeout: 15000, // NUEVO: Espera hasta 15 segundos para conectar
    socketTimeout: 20000,     // NUEVO: Si la red se guinda, corta a los 20 segundos
    maxConnections: 5,        // NUEVO: Permite hasta 5 envíos simultáneos
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verificamos la conexión al arrancar el servidor
transporter.verify().then(() => {
    console.log('================================================');
    console.log('[MAILER] 📧 Conexión segura con Gmail establecida (Pool Activado)');
    console.log('================================================');
}).catch(err => {
    console.error('[MAILER] ❌ Error de conexión:', err);
});

module.exports = transporter;