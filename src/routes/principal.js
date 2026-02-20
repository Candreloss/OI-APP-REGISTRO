// src/routes/principal.js
const express = require('express');
const router = express.Router();

// Importamos el controlador que acabamos de crear
const publicoController = require('../controllers/publicoController');

// --- RUTAS PÚBLICAS ---

// GET: Mostrar formulario
router.get('/', publicoController.mostrarPrincipal);

// POST: Procesar el registro (Aquí conectamos con la lógica nueva)
router.post('/registro', publicoController.registrarParticipante);

// --- RUTAS DE REDIRECCIÓN Y ADMIN ---
// (Estas podrían ir en otro archivo 'adminRoutes.js' en el futuro, pero por ahora están bien aquí)

router.get('/principal', (req, res) => {
    res.redirect('/');
});

router.post('/login', (req, res) => {
    console.log('--> Redirigiendo al panel admin');
    res.redirect('/admin');
});

router.get('/admin', (req, res) => {
    res.render('admin/adminpanel', { title: 'Panel Administrativo' });
});

// Exportamos el router (NO una función)
module.exports = router;