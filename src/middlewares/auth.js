// src/middlewares/auth.js

// Guardia del panel administrativo: exige sesión de admin activa.
const verificarSesion = (req, res, next) => {
    if (req.session && req.session.admin) {
        return next();
    }
    // Las peticiones AJAX del panel reciben JSON; las navegaciones, redirect.
    if (req.path.startsWith('/panel/') && !req.accepts('html')) {
        return res.status(401).json({ success: false, message: 'Sesión expirada. Inicia sesión nuevamente.' });
    }
    res.redirect('/admin');
};

// Guardia del participante público: exige identidad validada por OTP
// y que la cédula consultada coincida con la de la sesión (anti-IDOR).
const requireParticipante = (req, res, next) => {
    const identidad = req.session && req.session.identidad;
    if (!identidad || identidad.tipo !== 'participante') {
        return res.status(401).json({ success: false, message: 'Acceso no autorizado. Valida tu identidad con tu cédula y correo.' });
    }

    const cedulaPedida = req.params.cedula || (req.body && req.body.cedula);
    if (cedulaPedida && String(cedulaPedida) !== String(identidad.cedula)) {
        return res.status(403).json({ success: false, message: 'No puedes consultar datos de otro participante.' });
    }

    return next();
};

module.exports = { verificarSesion, requireParticipante };
