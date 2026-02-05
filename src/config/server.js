const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();


// Servir archivos estáticos (CSS, JS, imágenes) ANTES de cualquier otra cosa
app.use(express.static(path.join(__dirname, '..', '..','public')));

// Configurar EJS como motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.set("port", process.env.PORT || 3000);

app.use(bodyParser.urlencoded({ extended: false }));

module.exports = app;