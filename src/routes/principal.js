// src/routes/principal.js
const express = require('express');
const router = express.Router();

const publicoController = require('../controllers/publicoController');
const adminController = require('../controllers/adminController');

// 1. IMPORTAMOS EL GUARDIA DE SEGURIDAD
const verificarSesion = require('../middlewares/auth');

// --- RUTAS PÚBLICAS ---
router.get('/', publicoController.mostrarPrincipal);
router.post('/registro', publicoController.registrarParticipante);

// --- RUTAS DE REDIRECCIÓN Y ADMIN ---
router.get('/principal', (req, res) => {
    res.redirect('/');
});

// El botón de la página principal te redirige aquí
router.post('/login', (req, res) => {
    res.redirect('/admin');
});

// Mostramos la página de login (Usando el controlador)
router.get('/admin', adminController.mostrarLogin);

// Procesamos el intento de login
router.post('/login-admin', adminController.procesarLogin);


// --- RUTAS PRIVADAS (PROTEGIDAS) ---

// Usamos el middleware 'verificarSesion' y luego el controlador 'mostrarPanel'
router.get('/panel', verificarSesion, adminController.mostrarPanel);

// Ruta para destruir la pulsera (Cerrar sesión)
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin'); 
    });
});
// NUEVA RUTA: Mostrar formulario de nueva oferta
router.get('/panel/nueva-oferta', verificarSesion, adminController.mostrarNuevaOferta);

// NUEVA RUTA: Mostrar formulario de nueva oferta (Esta ya la tenías)
router.get('/panel/nueva-oferta', verificarSesion, adminController.mostrarNuevaOferta);

// NUEVA RUTA: Recibir los datos y procesarlos (¡Agrega esta línea!)
router.post('/panel/nueva-oferta', verificarSesion, adminController.procesarNuevaOferta);

// NUEVA RUTA: Módulo dedicado de Ofertas
router.get('/panel/ofertas', verificarSesion, adminController.mostrarOfertas);

// NUEVA RUTA: Botón de Activar/Desactivar (Usamos un parámetro dinámico :id)
router.get('/panel/ofertas/toggle/:id', verificarSesion, adminController.toggleEstatusOferta);

// NUEVAS RUTAS: Editar oferta
router.get('/panel/ofertas/editar/:id', verificarSesion, adminController.mostrarEditarOferta);
router.post('/panel/ofertas/editar/:id', verificarSesion, adminController.procesarEditarOferta);

module.exports = router;