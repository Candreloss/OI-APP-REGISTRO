// src/utils/mailer.js


//------------------------------
//CONFIGURACION CON NODEMAILER
//------------------------------
/*const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // false para el puerto 587 (TLS) y true para el puerto 465 (SSL)
    requireTLS: true,   // <-- Obliga a encriptar la conexión
    pool: true,   // NUEVO: Activa el pool de conexiones (mantiene la conexión viva)
    connectionTimeout: 15000, // NUEVO: Espera hasta 15 segundos para conectar
    socketTimeout: 20000,     // NUEVO: Si la red se guinda, corta a los 20 segundos
    maxConnections: 5,
    family: 4,        // NUEVO: Permite hasta 5 envíos simultáneos
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
*/


//------------------------------
//CONFIGURACION CON RESEND
//------------------------------
// src/utils/mailer.js
const { Resend } = require('resend');

// Inicializamos Resend con la clave de entorno
const resend = new Resend(process.env.RESEND_API_KEY);

// Creamos un objeto "transporter" falso para no tener que reescribir los controladores
const transporter = {
    sendMail: async (opciones) => {
        try {
            const data = await resend.emails.send({
                // ATENCIÓN: En la capa gratuita sin dominio verificado, 
                // Resend OBLIGA a que el remitente sea este correo exacto:
                from: 'onboarding@resend.dev', 
                
                to: opciones.to,
                subject: opciones.subject,
                html: opciones.html,
                
                // Mapeamos los adjuntos (attachments) si los hay (como en el pago B2B)
                attachments: opciones.attachments ? opciones.attachments.map(att => ({
                    filename: att.filename,
                    content: att.content // Resend acepta el Buffer directamente, igual que Nodemailer
                })) : []
            });

            console.log('[MAILER] ✅ Correo enviado vía Resend:', data.id);
            return data;
        } catch (error) {
            console.error('[MAILER] ❌ Error con Resend:', error);
            throw error;
        }
    }
};

console.log('================================================');
console.log('[MAILER] 🚀 Motor de correos cambiado a RESEND API');
console.log('================================================');

module.exports = transporter;