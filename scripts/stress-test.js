#!/usr/bin/env node
// scripts/stress-test.js
// Ejecutar: node -r dotenv/config scripts/stress-test.js
// Levanta un servidor interno (sin tocar el .env de producción) y ejecuta
// autocannon contra los endpoints más críticos.
require('dotenv').config();
const http = require('http');
const autocannon = require('autocannon');

const PORT = 0; // OS asigna puerto libre
const DURATION = 10; // segundos por ronda
const CONNECTIONS = 50;
const PIPELINING = 10;

// Overrides seguros para no afectar config real
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

async function main() {
    const app = require('../src/app');
    const server = http.createServer(app);

    await new Promise((resolve) => server.listen(PORT, '0.0.0.0', resolve));
    const addr = server.address();
    const base = `http://127.0.0.1:${addr.port}`;
    console.log(`\n🚀 Servidor de prueba escuchando en ${base}\n`);

    const endpoints = [
        { name: 'GET  /               (vista pública)',      url: `${base}/` },
        { name: 'GET  /admin          (login admin)',        url: `${base}/admin` },
        { name: 'GET  /css/tailwind   (estático compilado)', url: `${base}/css/tailwind.css` },
        { name: 'GET  /csrf-token     (crea sesión)',        url: `${base}/csrf-token` },
    ];

    for (const ep of endpoints) {
        console.log(`\n--- ${ep.name} (${DURATION}s, ${CONNECTIONS} conn) ---`);
        const result = await autocannon({
            url: ep.url,
            duration: DURATION,
            connections: CONNECTIONS,
            pipelining: PIPELINING,
            headers: { 'accept': 'text/html,application/json' }
        });

        console.log(`  Requests:  ${result.requests.total} total, ${result.requests.average}/s avg`);
        console.log(`  Throughput: ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/s avg`);
        console.log(`  Latency:   p50=${result.latency.average}ms | p99=${result.latency.p99}ms | max=${result.latency.max}ms`);
        console.log(`  Errors:    ${result.errors || 0} total`);
    }

    server.close(() => {
        console.log('\n✅ Stress test finalizado. Servidor cerrado.\n');
        process.exit(0);
    });
}

main().catch((err) => {
    console.error('❌ Error fatal:', err.message || err);
    process.exit(1);
});
