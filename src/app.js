// src/app.js
const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { doubleCsrf } = require('csrf-csrf');

// Inicializamos Express
const app = express();

// --- CONFIGURACIONES ---
app.set('port', process.env.PORT || 3000);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- SEGURIDAD DE CABECERAS ---
// CSP alineada con los recursos externos actuales (Tailwind CDN e Iconify se
// eliminan en la Fase 3, momento en el que esta política podrá endurecerse).
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com', 'https://code.iconify.design'],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            connectSrc: ["'self'", 'https://api.iconify.design'],
            imgSrc: ["'self'", 'data:'],
            objectSrc: ["'none'"],
            frameAncestors: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// OBLIGATORIO PARA PRODUCCIÓN (Render/cPanel): Confiar en el proxy para cookies seguras
app.set('trust proxy', 1);

// --- PARSERS ---
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// --- SESIONES ---
app.use(session({
    secret: process.env.SESSION_SECRET,
    name: 'oi.sid',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // true detrás de proxy HTTPS
        httpOnly: true,
        sameSite: 'lax', // mitiga CSRF en navegación cruzada
        maxAge: 1000 * 60 * 60 * 2 // Expira en 2 horas
    }
}));

// --- PROTECCIÓN CSRF (double-submit cookie, ligada a la sesión) ---
const { doubleCsrfProtection, generateCsrfToken, invalidCsrfTokenError } = doubleCsrf({
    getSecret: () => process.env.SESSION_SECRET,
    getSessionIdentifier: (req) => req.sessionID,
    cookieName: 'oi_csrf',
    cookieOptions: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true // el cliente nunca lee esta cookie: envía el token vía header
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS']
});

// Entrega de tokens CSRF para el cliente (apiFetch los solicita aquí).
app.get('/csrf-token', (req, res) => {
    // Con saveUninitialized:false, una sesión vacía no emite cookie y el
    // sessionID cambiaría en cada petición (el token quedaría firmado con un
    // identificador efímero). Marcamos la sesión para persistirla.
    req.session.csrfIssuedAt = Date.now();
    const token = generateCsrfToken(req, res);
    res.json({ token });
});

// Aplicamos la protección a TODOS los métodos mutadores (POST/PUT/PATCH/DELETE).
app.use(doubleCsrfProtection);

// Archivos estáticos (CSS, JS, Imágenes)
app.use(express.static(path.join(__dirname, '../public')));

// --- MANEJADOR DE ERRORES ---
// Captura errores de CSRF y fallos no controlados sin filtrar detalles internos.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err === invalidCsrfTokenError) {
        return res.status(403).json({ success: false, message: 'Token de seguridad inválido o expirado. Recarga la página.' });
    }
    console.error('[ERROR NO CONTROLADO]', err);
    if (req.accepts('html') && !req.path.startsWith('/api')) {
        return res.status(500).send('Error interno del servidor');
    }
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
});

// Exportamos la aplicación
module.exports = app;
