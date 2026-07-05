#  Organización Inteligente - Plataforma de Registro Educativo

Un sistema integral de gestión académica diseñado para automatizar la inscripción de participantes, control de cupos, pagos y accesos B2B para empresas. Desarrollado bajo la arquitectura MVC (Modelo-Vista-Controlador).

##  Características Principales

* **Portal Público:** Registro fluido de estudiantes, control en tiempo real de cupos disponibles y reporte de pagos individuales con subida de comprobantes.
* **Portal Empresas (B2B):** Acceso seguro mediante OTP (One-Time Password) al correo. Permite a los departamentos de RRHH registrar lotes masivos de empleados de un solo golpe y reportar pagos consolidados.
* **Panel de Administración:** Dashboard protegido por sesiones para crear/editar cursos, aprobar/rechazar pagos masivos e individuales, y gestionar el contacto con las empresas.
* **Notificaciones Automatizadas:** Integración con Nodemailer para enviar correos de bienvenida, rechazo de pagos y validación de seguridad.
* **Integridad de Datos:** Uso de Transacciones SQL (`COMMIT`/`ROLLBACK`) para garantizar que los registros masivos no corrompan la base de datos si ocurre un error a mitad de proceso.

## 🛠️ Tecnologías y Dependencias

* **Backend:** Node.js, Express.js
* **Base de Datos:** MySQL (con pool de conexiones)
* **Frontend:** EJS (Embedded JavaScript templates), Tailwind CSS, Iconify.
* **Seguridad y Utilidades:**
  * `bcryptjs`: Encriptación de contraseñas de administrador.
  * `express-session`: Manejo de sesiones seguras.
  * `multer`: Procesamiento y validación de imágenes de pago en memoria RAM.
  * `nodemailer`: Envío de correos electrónicos transaccionales.
  * `dotenv`: Gestión de variables de entorno.

## ⚙️ Requisitos Previos e Instalación

1. **Clona este repositorio en tu máquina local:**
   ```bash
   git clone [https://github.com/TuUsuario/OI-APP-REGISTRO.git](https://github.com/TuUsuario/OI-APP-REGISTRO.git)
   cd OI-APP-REGISTRO
   ```
## Instala todas las dependencias necesarias:

   ```bash
npm install
   ```

## Importa la base de datos:
**Ejecuta el archivo oi_cap_db_final.sql incluido en el repositorio dentro de tu gestor de MySQL (phpMyAdmin, MySQL Workbench, etc.) para crear las tablas y relaciones necesarias.**

## Configura el entorno:
**Crea un archivo llamado .env en la raíz del proyecto y añade las siguientes variables clave:**

```bash
# Configuración del Servidor
PORT=3000
NODE_ENV=development

# Credenciales de la Base de Datos
DB_HOST=localhost
DB_USER=root
DB_PASS=tu_contraseña_aqui
DB_NAME=oi_cap_db_final

# Credenciales del Servidor de Correos (Ej. Gmail App Password)
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASS=tu_clave_de_aplicacion
ADMIN_EMAIL=correo_receptor_notificaciones@gmail.com

# Seguridad de Sesiones
SESSION_SECRET=un_secreto_muy_seguro_para_cookies
   ```

## 💻 Ejecución del Proyecto
**Para levantar el servidor en entorno de desarrollo, ejecuta:**

   ```
npm start
   ```

**El sistema estara disponible en la url "http://localhost:3000"**


## Flujo de la Base de Datos (Arquitectura de Datos)
**El sistema está diseñado bajo estrictas reglas de integridad relacional (Foreign Keys).**

**Entidades Principales: persona (datos del estudiante) y capacitacion_oferta (curso abierto).**

**Tabla Puente (inscripcion): Cuando un usuario se registra, se une la persona con la oferta en esta tabla. Nace con un estado 'pendiente'.**

**Flujo de Pagos (pago_reportado): Al reportar el pago, el comprobante se vincula al código de inscripción y el estado pasa a 'en_revision'.**

**Conciliación Administrativa: El administrador visualiza los lotes o usuarios individuales en revisión.**

**Si Aprueba: El estado pasa a 'conciliado', se confirma el cupo y se envía correo.**

**Si Rechaza: Se hace un DELETE del comprobante en la tabla de pagos y el estado de la inscripción hace rollback a 'rechazado', permitiendo al usuario volver a intentar sin perder sus datos.**








