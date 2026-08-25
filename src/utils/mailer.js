// src/utils/mailer.js
// Motor único de correo: RESEND API.
const { Resend } = require('resend');

if (!process.env.RESEND_API_KEY) {
    console.error('[MAILER] ❌ Falta RESEND_API_KEY en las variables de entorno.');
}

const resend = new Resend(process.env.RESEND_API_KEY);

// Remitente centralizado. Configurable vía MAIL_FROM en el .env.
const REMITENTE = process.env.MAIL_FROM || 'Organización Inteligente <notificaciones@organizacioninteligente.com>';

const transporter = {
    sendMail: async (opciones) => {
        try {
            const { data, error } = await resend.emails.send({
                from: opciones.from || REMITENTE,
                to: opciones.to,
                subject: opciones.subject,
                html: opciones.html,
                attachments: opciones.attachments ? opciones.attachments.map(att => ({
                    filename: att.filename,
                    content: att.content
                })) : []
            });

            if (error) {
                console.error('[MAILER] ❌ Error devuelto por Resend:', error);
                throw error;
            }

            console.log(`[MAILER] ✅ Correo enviado a ${opciones.to} | ID: ${data.id}`);
            return data;

        } catch (error) {
            console.error('[MAILER] ❌ Error general en envío:', error);
            throw error;
        }
    }
};

module.exports = transporter;
