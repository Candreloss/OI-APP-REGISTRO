// src/utils/validators.js
// Schemas de validación (Zod) para todos los flujos del sistema.
const { z } = require('zod');

const cedulaRegex = /^\d{6,9}$/;
const docGenericoRegex = /^[a-zA-Z0-9]{6,20}$/;
const telefonoRegex = /^\+\d{1,4}\s\d{6,15}$/;

// Acepta formatos habituales ("04141234567", "+58 414-123-4567", "+57 301 ...")
// y devuelve SIEMPRE el formato canónico "+<codpais> <numero>" para almacenar.
// Sin un prefijo conocido no hay forma fiable de separar código de país y
// número, por lo que se mantiene una lista de los códigos usados por la app.
const PREFIJOS_PAIS = ['+580', '+58', '+57', '+56', '+55', '+54', '+52', '+51',
    '+593', '+591', '+598', '+595', '+507', '+34', '+39', '+44', '+33', '+49',
    '+351', '+31', '+1'];

const telefonoSchema = z.string().trim()
    .transform((tel) => {
        const esInternacional = tel.startsWith('+');
        let v = tel.replace(/[\s\-().]/g, '').replace(/^\+/, '');
        if (!esInternacional) v = '58' + v.replace(/^0+/, ''); // local: asumimos Venezuela
        const prefijo = PREFIJOS_PAIS
            .slice()
            .sort((a, b) => b.length - a.length)
            .find((p) => v.startsWith(p.slice(1)));
        if (!prefijo) return v;
        return `+${prefijo.slice(1)} ${v.slice(prefijo.length - 1)}`;
    })
    .refine((v) => telefonoRegex.test(v), 'Teléfono inválido. Ejemplo: +58 4141234567');

const docSchema = z.string().trim()
    .min(6, 'Documento demasiado corto').max(20, 'Documento demasiado largo');

const nombreSchema = z.string().trim()
    .min(2, 'Mínimo 2 caracteres').max(60)
    .regex(/^[a-zA-ZÁÉÍÓÚÜÑáéíóúüñ' ]+$/, 'Solo se permiten letras y espacios');

const emailSchema = z.string().trim().toLowerCase().email('Correo inválido').max(120);

const fechanacSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .refine((f) => {
        const d = new Date(f + 'T00:00:00');
        if (isNaN(d.getTime())) return false;
        const hoy = new Date();
        const edad = (hoy - d) / (1000 * 60 * 60 * 24 * 365.25);
        return edad >= 12 && edad <= 100;
    }, 'La fecha de nacimiento no es válida');

// ---------- OTP ----------
const otpSolicitudSchema = z.object({
    cedula: z.string().trim().min(6).max(20),
    email: emailSchema
});

const otpValidacionSchema = z.object({
    email: emailSchema,
    codigo: z.string().trim().regex(/^\d{6}$/, 'El código debe tener 6 dígitos')
});

// ---------- Registro individual ----------
const registroParticipanteSchema = z.object({
    tipodoc: z.enum(['Ced', 'Pas', 'Otr']),
    doc: z.string().trim().min(1),
    nombre: nombreSchema,
    apellido: nombreSchema,
    codpais: z.string().regex(/^\+\d{1,4}$/, 'Código de país inválido'),
    telefono: z.string().trim().regex(/^\d{6,15}$/, 'Teléfono inválido'),
    email: emailSchema,
    pais: z.string().trim().min(2).max(2),
    ciudad: z.string().trim().min(2).max(80),
    capacitacion: z.coerce.number().int().positive(),
    fechanac: fechanacSchema
}).superRefine((data, ctx) => {
    const valido = data.tipodoc === 'Ced' ? cedulaRegex.test(data.doc) : docGenericoRegex.test(data.doc);
    if (!valido) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['doc'],
            message: data.tipodoc === 'Ced'
                ? 'Para Cédula, el documento debe tener entre 6 y 9 números.'
                : 'Documento inválido para Pasaporte/Otro.'
        });
    }
});

// ---------- Inscripción rápida ----------
const inscripcionRapidaSchema = z.object({
    cedula: docSchema,
    capacitacion: z.coerce.number().int().positive()
});

// ---------- Reporte de pago individual ----------
const reportarPagoSchema = z.object({
    curso_pagado: z.coerce.number().int().positive(),
    titular_nombre: nombreSchema,
    titular_apellido: nombreSchema,
    banco_origen: z.string().trim().min(2).max(60),
    referencia: z.string().trim().regex(/^[a-zA-Z0-9-]{4,30}$/, 'Referencia inválida'),
    titular_telefono: telefonoSchema
});

// ---------- Lote B2B ----------
const empleadoLoteSchema = z.object({
    tipodoc: z.enum(['Ced', 'Pas', 'Otr']),
    doc: z.string().trim().min(1),
    nombre: nombreSchema,
    apellido: nombreSchema,
    telefono: telefonoSchema,
    email: emailSchema,
    fechanac: fechanacSchema,
    pais: z.string().trim().min(2).max(2),
    ciudad: z.string().trim().min(2).max(80)
}).superRefine((data, ctx) => {
    const valido = data.tipodoc === 'Ced' ? cedulaRegex.test(data.doc) : docGenericoRegex.test(data.doc);
    if (!valido) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['doc'],
            message: `Documento inválido para el empleado ${data.doc}.`
        });
    }
});

const MAX_EMPLEADOS_LOTE = 200;

const loteEmpresaSchema = z.object({
    cedula_empresa: docSchema,
    email_empresa: emailSchema,
    capacitacion: z.coerce.number().int().positive(),
    empleados: z.array(empleadoLoteSchema).min(1, 'El lote está vacío.').max(MAX_EMPLEADOS_LOTE,
        `El lote excede el máximo de ${MAX_EMPLEADOS_LOTE} empleados por envío.`)
});

const loteConsultaSchema = z.object({
    cedula_empresa: docSchema,
    email_empresa: emailSchema,
    capacitacion: z.coerce.number().int().positive()
});

const lotesPendientesSchema = z.object({
    cedula: docSchema,
    email: emailSchema
});

// ---------- Admin ----------
const adminLoginSchema = z.object({
    username: z.string().trim().min(4).max(80),
    password: z.string().min(8, 'Contraseña demasiado corta').max(72)
});

const ofertaSchema = z.object({
    capofcapcodigo: z.coerce.number().int().positive(),
    fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    cupos: z.coerce.number().int().min(1).max(500)
}).refine((d) => new Date(d.fecha_inicio) <= new Date(d.fecha_fin), {
    message: 'La fecha de inicio no puede ser posterior a la de fin.',
    path: ['fecha_inicio']
});

const editarParticipanteSchema = z.object({
    doc: docSchema,
    nombre: nombreSchema,
    apellido: nombreSchema,
    telefono: z.string().trim().max(25).optional().or(z.literal(''))
});

const contactoEmpresaSchema = z.object({
    empresa_nombre: z.string().trim().min(2).max(100),
    emp_tipodoc: z.enum(['Ced', 'Pas']),
    emp_doc: z.string().trim().min(5).max(20),
    emp_nombre: nombreSchema,
    emp_apellido: nombreSchema,
    emp_email: emailSchema,
    emp_telefono: z.string().trim().min(7).max(25)
});

/**
 * Ejecuta un schema y responde automáticamente con 400 si falla.
 * Devuelve { ok, datos } donde datos ya viene parseado/normalizado.
 */
const validar = (schema, payload) => {
    const resultado = schema.safeParse(payload);
    if (!resultado.success) {
        const primerError = resultado.error.issues[0];
        return { ok: false, mensaje: primerError.message };
    }
    return { ok: true, datos: resultado.data };
};

module.exports = {
    validar,
    MAX_EMPLEADOS_LOTE,
    otpSolicitudSchema,
    otpValidacionSchema,
    registroParticipanteSchema,
    inscripcionRapidaSchema,
    reportarPagoSchema,
    loteEmpresaSchema,
    loteConsultaSchema,
    lotesPendientesSchema,
    adminLoginSchema,
    ofertaSchema,
    editarParticipanteSchema,
    contactoEmpresaSchema
};
