// src/app.js
const express = require('express');
const path = require('path');
// 1. IMPORTAMOS LA LIBRERÍA DE SESIONES
const session = require('express-session'); 

// Inicializamos Express
const app = express();

// --- CONFIGURACIONES ---
app.set('port', process.env.PORT || 3000);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- MIDDLEWARES ---
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// OBLIGATORIO PARA PRODUCCIÓN EN CPANEL: Confiar en el proxy para cookies seguras
app.set('trust proxy', 1);

// 2. CONFIGURAMOS LA CAJA FUERTE (NUEVO)
app.use(session({
    secret: process.env.SESSION_SECRET, // Llamamos al secreto desde el .env
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // true en cPanel, false en localhost
        maxAge: 1000 * 60 * 60 * 2 // Expira en 2 horas
    }
}));

// Archivos estáticos (CSS, JS, Imágenes)
app.use(express.static(path.join(__dirname, '../public')));

// Exportamos la aplicación
module.exports = app;