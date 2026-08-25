// src/middlewares/rateLimiters.js
// Límites de tasa anti-abuso (fuerza bruta, mail-bombing, DoS ligero).
const rateLimit = require('express-rate-limit');

// API pública en general: generoso pero acotado.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'Demasiadas solicitudes. Intenta más tarde.' }
});

// Solicitud de OTP: estricto, es la puerta al envío de correos.
const otpSolicitudLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'Has solicitado demasiados códigos. Espera 15 minutos.' }
});

// Validación de OTP: bloquea la fuerza bruta del código de 6 dígitos.
const otpValidacionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'Demasiados intentos fallidos. Espera 15 minutos y solicita un código nuevo.' }
});

// Login administrativo.
const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'Demasiados intentos de inicio de sesión. Espera 15 minutos.' }
});

// Endpoint de tokens CSRF: evita que un atacante llene la tabla sessions.
const csrfLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'Demasiadas solicitudes de token. Espera un minuto.' }
});

module.exports = { apiLimiter, otpSolicitudLimiter, otpValidacionLimiter, adminLoginLimiter, csrfLimiter };
