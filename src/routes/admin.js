// src/routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const verificarSesion = require('../middlewares/auth');

// 1. APLICAMOS EL GUARDIA A TODAS LAS RUTAS DE ESTE ARCHIVO
router.use(verificarSesion);

// --- DASHBOARD ---
router.get('/panel', adminController.mostrarPanel);

// --- OFERTAS ---
router.get('/panel/nueva-oferta', adminController.mostrarNuevaOferta);
router.post('/panel/nueva-oferta', adminController.procesarNuevaOferta);
router.get('/panel/ofertas', adminController.mostrarOfertas);
router.get('/panel/ofertas/toggle/:id', adminController.toggleEstatusOferta);
router.get('/panel/ofertas/editar/:id', adminController.mostrarEditarOferta);
router.post('/panel/ofertas/editar/:id', adminController.procesarEditarOferta);
router.get('/panel/ofertas/toggle-cupos/:id', adminController.toggleBloqueoCupos);

// --- PARTICIPANTES Y PAGOS ---
router.get('/panel/participantes', adminController.mostrarParticipantes);
router.post('/panel/pagos/aprobar/:id', adminController.aprobarPago);
router.post('/panel/pagos/rechazar/:id', adminController.rechazarPago);
router.post('/panel/participantes/editar', adminController.editarParticipante);
router.post('/panel/participantes/eliminar/:id', adminController.eliminarInscripcion);

// --- EMPRESAS / B2B ---
router.get('/panel/empresas', adminController.mostrarEmpresas);
router.post('/panel/empresas/nueva', adminController.registrarContactoEmpresa);
router.post('/panel/empresas/aprobar-lote', adminController.aprobarLoteB2B);

module.exports = router;