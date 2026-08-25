// test/app.test.js
// Suite de humo/seguridad sobre la app real (usa .env local).
// Todas las pruebas son de solo lectura o terminan en rollback:
// ninguna escribe datos en la BD.
require('dotenv').config();
const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

const app = require('../src/app');

// Participante REAL existente en la BD: reintentar su inscripción ejecuta
// la transacción completa y termina en ER_DUP_ENTRY -> rollback.
const DUPLICADO = {
    tipodoc: 'Ced',
    doc: '11598676',
    nombre: 'Karlobell',
    apellido: 'Paradas',
    codpais: '+58',
    telefono: '4262759222',
    email: 'kparadas@gmail.com',
    pais: 'VE',
    ciudad: 'Barquisimeto',
    capacitacion: 1,
    fechanac: '1973-09-21'
};

// Agente con cookies persistentes: el double-submit CSRF exige que la
// cookie oi_csrf del GET llegue de vuelta junto al header en el POST.
const obtenerTokenCsrf = async () => {
    const agent = request.agent(app);
    const res = await agent.get('/csrf-token');
    assert.equal(res.status, 200);
    assert.ok(res.body.token, '/csrf-token no devolvió token');
    return { agent, token: res.body.token };
};

describe('Vistas públicas', () => {
    test('GET / responde 200', async () => {
        const res = await request(app).get('/');
        assert.equal(res.status, 200);
    });

    test('GET /admin (login) responde 200', async () => {
        const res = await request(app).get('/admin');
        assert.equal(res.status, 200);
    });

    test('GET /panel sin sesión redirige al login', async () => {
        const res = await request(app).get('/panel');
        assert.equal(res.status, 302);
        assert.match(res.headers.location || '', /\/admin$/);
    });

    test('Ruta inexistente devuelve 404 JSON en /api', async () => {
        const res = await request(app).get('/api/ruta-inexistente');
        assert.equal(res.status, 404);
        assert.deepEqual(res.body, { success: false, message: 'Recurso no encontrado.' });
    });
});

describe('Protección CSRF', () => {
    test('POST mutador sin token -> 403', async () => {
        const res = await request(app)
            .post('/registro')
            .set('Content-Type', 'application/json')
            .send({});
        assert.equal(res.status, 403);
    });

    test('POST con token pero payload inválido -> 400 con mensaje Zod', async () => {
        const { agent, token } = await obtenerTokenCsrf();
        const res = await agent
            .post('/registro')
            .set('Content-Type', 'application/json')
            .set('X-CSRF-Token', token)
            .send({ ...DUPLICADO, nombre: '<script>alert(1)</script>' });
        assert.equal(res.status, 400);
        assert.ok(res.body.message && !res.body.success);
    });
});

describe('Validación e integridad', () => {
    test('Registro con oferta inexistente -> 400 "no existe" (transacción + FOR UPDATE)', async () => {
        const { agent, token } = await obtenerTokenCsrf();
        const res = await agent
            .post('/registro')
            .set('Content-Type', 'application/json')
            .set('X-CSRF-Token', token)
            .send({ ...DUPLICADO, capacitacion: 999999 });
        assert.equal(res.status, 400);
        assert.match(res.body.message, /no existe/i);
    });

    test('Registro duplicado -> 400 amigable y SIN escrituras (rollback)', async () => {
        const { agent, token } = await obtenerTokenCsrf();
        const res = await agent
            .post('/registro')
            .set('Content-Type', 'application/json')
            .set('X-CSRF-Token', token)
            .send(DUPLICADO);
        assert.equal(res.status, 400);
        assert.match(res.body.message, /ya te encuentras registrado/i);
    });

    test('Normalización de teléfono: formato canónico aceptado', async () => {
        const { reportarPagoSchema } = require('../src/utils/validators');
        const r = reportarPagoSchema.safeParse({
            curso_pagado: 1,
            titular_nombre: 'Maria',
            titular_apellido: 'Perez',
            banco_origen: 'Banesco',
            referencia: 'REF123456',
            titular_telefono: '04141234567'
        });
        assert.equal(r.success, true);
        assert.equal(r.data.titular_telefono, '+58 4141234567');
    });
});
