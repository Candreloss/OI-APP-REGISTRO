# Organización Inteligente - Plataforma de Registro Educativo

Sistema integral de gestión académica: inscripción de participantes con control
de cupos en tiempo real, flujo de pagos con revisión administrativa y portal B2B
para inscripción masiva de empleados por parte de empresas. Arquitectura MVC
(Node.js + Express + MySQL).

## Características

- **Portal público:** registro individual con verificación de identidad por OTP,
  multi-inscripción a capacitaciones, reporte de pagos con comprobante.
- **Portal empresas (B2B):** acceso OTP para contactos corporativos, registro de
  lotes (hasta 200 empleados por envío) y reporte de pagos consolidados.
- **Panel admin:** gestión de ofertas/cupos/bloqueos, conciliación o rechazo de
  pagos individuales y de lotes, edición de participantes, alta de empresas.
- **Notificaciones:** correos transaccionales vía **Resend** (único motor de correo).

## Seguridad

| Control | Implementación |
|---|---|
| CSRF | Double-submit cookie (`csrf-csrf`) ligado al sessionID en todos los mutadores |
| Validación de entrada | Schemas **Zod** server-side en todos los flujos; normalización de teléfonos |
| Fuerza bruta | `express-rate-limit`: OTP (5/15min), validación OTP (10/15min), login admin (10/15min) |
| Anti-enumeración | Respuestas genéricas antes de validar el código; bifurcación nuevo/existente solo post-OTP |
| Fijación de sesión | `session.regenerate()` tras validar OTP |
| IDOR | Guardias de sesión: cada participante/empresa solo accede a SUS datos |
| Sesiones | Store persistente en MySQL (`express-mysql-session`) + cookies httpOnly/sameSite |
| Cabeceras | Helmet + CSP estricta (sin CDNs de JS; Tailwind compilado localmente) |
| Integridad BD | Transacciones atómicas + `SELECT ... FOR UPDATE` contra sobreventa de cupos |

## Requisitos

- Node.js 18+ (probado en 22)
- MySQL 8 (local o gestionado, p. ej. Aiven)

## Puesta en marcha

```bash
npm install
cp .env.example .env      # completar credenciales
npm run build:css         # compila Tailwind -> public/css/tailwind.css
npm start                 # http://localhost:3000
```

### Variables de entorno (.env)

Ver `.env.example`. Claves:

| Variable | Descripción |
|---|---|
| `PORT`, `NODE_ENV` | Puerto y entorno (`production` activa cookies secure + logs JSON) |
| `DB_HOST/USER/PASS/NAME/PORT` | Conexión MySQL (app + sesiones) |
| `DB_SSL` / `DB_SSL_CA` | TLS hacia la BD (Aiven: `DB_SSL=true`) |
| `SESSION_SECRET` | Semilla de firmas de sesión (obligatoria, aleatoria) |
| `RESEND_API_KEY`, `MAIL_FROM`, `ADMIN_EMAIL` | Envío de correo y buzón de notificaciones |

## Scripts

| Comando | Acción |
|---|---|
| `npm start` | Arranca el servidor |
| `npm test` | Suite de humo/seguridad (`node --test`, no escribe datos) |
| `npm run build:css` | Recompila Tailwind tras editar vistas |
| `node scripts/dump-schema.js` | Regenera `sql/schema.sql` desde la BD real |

## Estructura

```
src/
  app.js               # Express: seguridad, sesiones, CSRF, rutas, errores
  config/database.js   # Pool mysql2 (+TLS opcional)
  controllers/         # publicoController / adminController
  models/              # publicoModel / adminModel (SQL + transacciones)
  routes/              # publico.js / admin.js
  middlewares/         # auth (sesiones), rateLimiters, upload (multer)
  utils/               # mailer (Resend), validators (Zod), dbUtils (txns), logger (pino)
  views/               # EJS: principal/, admin/
public/                # css compilado, js cliente, imágenes
sql/schema.sql         # esquema versionado de la BD
test/app.test.js       # suite supertest
```

## Despliegue

- **Render:** `npm start`; definir todas las variables del `.env` en el dashboard.
  Las sesiones viven en MySQL: los reinicios del servicio no cierran sesiones.
- **cPanel (Setup Node.js App):** subir repo sin `node_modules`, instalar deps,
  ejecutar `npm run build:css` una vez y arrancar con `npm start`.

## Notas

- El historial Git fue purgado de secretos históricos; las credenciales rotadas
  viven únicamente en el `.env` de cada entorno.
- `sql/schema.sql` es referencia documental generada de la base real; no incluye datos.
