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

// 2. CONFIGURAMOS LA CAJA FUERTE (NUEVO)
app.use(session({
    secret: 'mi_secreto_super_seguro_123', // Llave secreta para encriptar cookies
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // false porque estamos en localhost (sin https)
        maxAge: 1000 * 60 * 60 * 2 // Expira en 2 horas
    }
}));

// Archivos estáticos (CSS, JS, Imágenes)
app.use(express.static(path.join(__dirname, '../public')));

// Exportamos la aplicación
module.exports = app;