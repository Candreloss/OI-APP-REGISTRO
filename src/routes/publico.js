// src/routes/publico.js
const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const logger = require('../utils/logger');

const publicoController = require('../controllers/publicoController');
const adminController = require('../controllers/adminController');
const { apiLimiter, otpSolicitudLimiter, otpValidacionLimiter, adminLoginLimiter } = require('../middlewares/rateLimiters');

// Helper: captura errores de Multer y devuelve JSON claro al cliente.
function multerConManejoErrores(fieldName) {
    return (req, res, next) => {
        upload.single(fieldName)(req, res, (err) => {
            if (!err) return next();
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ success: false, message: 'El comprobante supera el tamaño máximo de 5 MB.' });
            }
            if (err.message && err.message.includes('Formato')) {
                return res.status(400).json({ success: false, message: err.message });
            }
            logger.error({ err }, 'Error inesperado subiendo archivo');
            res.status(400).json({ success: false, message: 'No se pudo procesar el archivo adjunto.' });
        });
    };
}

// --- RUTAS DE LA API (Formularios y OTP) ---
router.use('/api', apiLimiter);

router.post('/api/solicitar-otp', otpSolicitudLimiter, publicoController.solicitarOTP);
router.post('/api/validar-otp', otpValidacionLimiter, publicoController.validarOTP);
router.get('/api/cursos-pendientes/:cedula', publicoController.obtenerCursosPendientes);
router.post('/registro', publicoController.registrarParticipante);

router.post('/api/reportar-pago', multerConManejoErrores('comprobante'), publicoController.reportarPago);

router.get('/api/ofertas-disponibles/:cedula', publicoController.obtenerOfertasDisponibles);
router.post('/api/inscripcion-rapida', publicoController.inscripcionRapida);

router.post('/api/empresa/solicitar-otp', otpSolicitudLimiter, publicoController.solicitarOTPEmpresa);
router.get('/api/empresa/ofertas', publicoController.apiOfertasActivas);
router.post('/api/empresa/registrar-lote', publicoController.registrarLoteEmpresa);

router.post('/api/empresa/lote-existente', publicoController.obtenerLoteExistente);

router.post('/api/empresa/lotes-pendientes', publicoController.obtenerLotesPendientesEmpresa);

router.post('/api/empresa/reportar-pago', multerConManejoErrores('comprobante'), publicoController.reportarPagoB2B);

// --- RUTAS DE VISTAS PÚBLICAS ---
router.get('/', publicoController.mostrarPrincipal);
router.get('/principal', (req, res) => res.redirect('/'));

router.get('/empresas', publicoController.mostrarAccesoEmpresas);

// --- RUTAS DE LOGIN ADMINISTRATIVO ---
router.get('/admin', adminController.mostrarLogin);
router.post('/login-admin', adminLoginLimiter, adminController.procesarLogin);

// --- RUTA PARA CERRAR SESIÓN ---
// Mutación por POST (un prefetch/crawl sobre un enlace GET ya no desloguea).
router.post('/logout', (req, res) => {
    req.session.destroy(() => res.json({ success: true, redirectUrl: '/admin' }));
});

module.exports = router;
