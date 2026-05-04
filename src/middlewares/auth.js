// src/middlewares/auth.js

const verificarSesion = (req, res, next) => {
    // Si la sesión existe y tiene un admin guardado, le damos permiso de pasar
    if (req.session && req.session.admin) {
        return next(); // "Pase usted, administrador"
    } else {
        // Si no hay sesión, lo devolvemos al login sin decir nada
        res.redirect('/admin');
    }
};

module.exports = verificarSesion;