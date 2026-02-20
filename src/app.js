// Archivo: src/app.js
const express = require('express');
const path = require('path');

// Inicializamos Express
const app = express();

// --- CONFIGURACIONES ---
app.set('port', process.env.PORT || 3000);

// Motor de vistas (EJS)
// Como este archivo está en 'src/', la carpeta 'views' está aquí mismo al lado
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- MIDDLEWARES ---
// Usamos express nativo para entender los formularios (reemplazo de body-parser)
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Archivos estáticos (CSS, JS, Imágenes)
// Subimos un nivel (..) para salir de 'src' y buscar la carpeta 'public'
app.use(express.static(path.join(__dirname, '../public')));

// Exportamos la aplicación configurada
module.exports = app;