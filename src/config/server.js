const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();

// settings

app.set("port", process.env.PORT || 3000);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../app/views'));

// static files (añade esta línea para servir /src/public)
app.use(express.static(path.join(__dirname, '../public')));

// middlewares

app.use(bodyParser.urlencoded({ extended: false }));
module.exports = app;