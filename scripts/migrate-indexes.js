#!/usr/bin/env node
// scripts/migrate-indexes.js
// Idempotente: crea índices solo si no existen aún.
// Ejecutar: node -r dotenv/config scripts/migrate-indexes.js
require('dotenv').config();
const { pool } = require('../config/database');

const INDICES = [
    {
        tabla: 'inscripcion',
        nombre: 'idx_ins_empresa_estado',
        columnas: '(ins_empresa_id, ins_estado)',
        razon: 'Lote pendientes: WHERE empresa_id + estado; panel filtros'
    },
    {
        tabla: 'inscripcion',
        nombre: 'idx_ins_estado',
        columnas: '(ins_estado)',
        razon: 'Filtros panel participantes: WHERE ins_estado = ...'
    },
    {
        tabla: 'token_otp',
        nombre: 'idx_otp_email_used',
        columnas: '(email, usado, expira_en)',
        razon: 'Validación OTP: WHERE email=? AND usado=0 AND expira_en>NOW()'
    },
    {
        tabla: 'pago_reportado',
        nombre: 'idx_pago_empresa',
        columnas: '(pago_empresa_id)',
        razon: 'Consulta lote existente: JOIN por empresa_id (FK KEY insuficiente para cubrir)'
    }
];

async function existeIndice(tabla, nombre) {
    const [rows] = await pool.query(
        `SELECT 1 FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME  = ?
           AND INDEX_NAME  = ?
         LIMIT 1`,
        [tabla, nombre]
    );
    return rows.length > 0;
}

async function migrar() {
    console.log('--- migrate-indexes: verificando índices ---');
    let creados = 0;
    for (const idx of INDICES) {
        const ya = await existeIndice(idx.tabla, idx.nombre);
        if (ya) {
            console.log(`  ✓ ${idx.nombre} ya existe → skip`);
            continue;
        }
        const sql = `CREATE INDEX ${idx.nombre} ON \`${idx.tabla}\` ${idx.columnas}`;
        console.log(`  + Creando ${idx.nombre} ...`);
        await pool.query(sql);
        console.log(`    ✓ OK — ${idx.razon}`);
        creados++;
    }
    console.log(`\nFin. Creados: ${creados}/${INDICES.length}`);
    await pool.end();
}

migrar().catch(err => {
    console.error('Error fatal:', err.message);
    process.exit(1);
});
