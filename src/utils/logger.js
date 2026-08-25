// src/utils/logger.js
// Logger único de la app. En producción emite JSON estructurado (ideal para
// los logs de Render); en desarrollo formatea legible con pino-pretty.
// Nivel configurable vía LOG_LEVEL (default: info).
const pino = require('pino');

const esProduccion = process.env.NODE_ENV === 'production';

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    ...(esProduccion
        ? {}
        : {
            transport: {
                target: 'pino-pretty',
                options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' }
            }
        })
});

module.exports = logger;
