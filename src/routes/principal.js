// src/routes/principal.js
const express = require('express');
const router = express.Router();

const publicoController = require('../controllers/publicoController');
const adminController = require('../controllers/adminController');

// --- NUEVAS RUTAS DE IDENTIDAD (OTP) ---
router.post('/api/solicitar-otp', publicoController.solicitarOTP);
router.post('/api/validar-otp', publicoController.validarOTP);

// 1. IMPORTAMOS EL GUARDIA DE SEGURIDAD
const verificarSesion = require('../middlewares/auth');



// IMPORTAMOS EL MOTOR DE CORREOS
const transporter = require('../utils/mailer');

// --- RUTA TEMPORAL DE PRUEBA ---
router.get('/test-correo', async (req, res) => {
    try {
        await transporter.sendMail({
            from: '"Organización Inteligente" <1001.31025923.ucla@gmail.com>', // <-- El correo que envía
            to: 'carlosdavidparadasmendoza@gmail.com', // <-- Pon TU correo personal para recibir la prueba
            subject: 'Prueba del Sistema de Correos 🚀',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
                    <h2 style="color: #455a9f;">¡Conexión Exitosa!</h2>
                    <p>Si estás leyendo esto, el Motor de Comunicación de <b>Organización Inteligente</b> funciona a la perfección.</p>
                    <p style="font-size: 24px; font-weight: bold; color: #ff5500;">000000</p>
                    <p style="color: #64748b; font-size: 12px;">Esto es una prueba de arquitectura.</p>
                </div>
            `
        });
        res.send('<h1>¡Magia enviada! Revisa tu bandeja de entrada.</h1>');
    } catch (error) {
        console.error('Error enviando correo de prueba:', error);
        res.status(500).send('Falló el envío del correo. Revisa la terminal de VS Code.');
    }
});



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