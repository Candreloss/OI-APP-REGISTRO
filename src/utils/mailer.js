// src/utils/mailer.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verificamos la conexión al arrancar el servidor
transporter.verify().then(() => {
    console.log('================================================');
    console.log('[MAILER] 📧 Conexión con Gmail establecida con éxito');
    console.log('================================================');
}).catch(err => {
    console.error('[MAILER] ❌ Error de conexión:', err);
});

module.exports = transporter;