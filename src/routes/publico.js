// src/routes/publico.js
const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');

const publicoController = require('../controllers/publicoController');
const adminController = require('../controllers/adminController');

// --- RUTAS DE LA API (Formularios y OTP) ---
router.post('/api/solicitar-otp', publicoController.solicitarOTP);
router.post('/api/validar-otp', publicoController.validarOTP);
router.get('/api/cursos-pendientes/:cedula', publicoController.obtenerCursosPendientes);
router.post('/registro', publicoController.registrarParticipante);

// AQUÍ DEJAMOS ÚNICAMENTE LA RUTA CON MULTER:
router.post('/api/reportar-pago', upload.single('comprobante'), publicoController.reportarPago);

router.get('/api/ofertas-disponibles/:cedula', publicoController.obtenerOfertasDisponibles);
router.post('/api/inscripcion-rapida', publicoController.inscripcionRapida);

router.post('/api/empresa/solicitar-otp', publicoController.solicitarOTPEmpresa);
router.get('/api/empresa/ofertas', publicoController.apiOfertasActivas);
router.post('/api/empresa/registrar-lote', publicoController.registrarLoteEmpresa);

router.post('/api/empresa/lote-existente', publicoController.obtenerLoteExistente);

router.post('/api/empresa/lotes-pendientes', publicoController.obtenerLotesPendientesEmpresa);

router.post('/api/empresa/reportar-pago', upload.single('comprobante'), publicoController.reportarPagoB2B);

// --- RUTAS DE VISTAS PÚBLICAS ---
router.get('/', publicoController.mostrarPrincipal);
router.get('/principal', (req, res) => res.redirect('/'));

router.get('/empresas', publicoController.mostrarAccesoEmpresas);

// --- RUTAS DE LOGIN ADMINISTRATIVO ---
router.post('/login', (req, res) => res.redirect('/admin'));
router.get('/admin', adminController.mostrarLogin);
router.post('/login-admin', adminController.procesarLogin);

// --- RUTA PARA CERRAR SESIÓN ---
router.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/admin')); 
});

module.exports = router;