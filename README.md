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

1. Clona este repositorio en tu máquina local:
   ```bash
   git clone [https://github.com/TuUsuario/OI-APP-REGISTRO.git](https://github.com/TuUsuario/OI-APP-REGISTRO.git)
   cd OI-APP-REGISTRO

## Instala todas las dependencias necesarias:

```bash
npm install
