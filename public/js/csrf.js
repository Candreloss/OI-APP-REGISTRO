// public/js/csrf.js
// Wrapper de fetch con token CSRF automático para todas las mutaciones.
(function () {
  let _token = null;

  async function asegurarToken(forzar) {
    if (_token && !forzar) return _token;
    const resp = await fetch('/csrf-token', { credentials: 'same-origin' });
    if (!resp.ok) throw new Error('No se pudo iniciar la sesión de seguridad.');
    const data = await resp.json();
    _token = data.token;
    return _token;
  }

  // Expuesta para que las vistas puedan forzar refresh tras regenerar sesión.
  window.refreshCsrfToken = function () { return asegurarToken(true); };

  window.apiFetch = async function (url, opciones) {
    opciones = opciones || {};
    opciones.credentials = 'same-origin';
    opciones.method = opciones.method || 'GET';

    if (opciones.method !== 'GET') {
      const token = await asegurarToken(false);
      opciones.headers = Object.assign({}, opciones.headers, { 'x-csrf-token': token });
    }

    let respuesta = await fetch(url, opciones);

    // Si el token quedó obsoleto (p. ej. la sesión se regeneró), pedimos
    // uno nuevo y reintentamos una sola vez.
    if (respuesta.status === 403 && opciones.method !== 'GET') {
      const clon = respuesta.clone();
      try {
        const cuerpo = await clon.json();
        if (cuerpo && /csrf|seguridad/i.test(cuerpo.message || '')) {
          const tokenNuevo = await asegurarToken(true);
          opciones.headers = Object.assign({}, opciones.headers, { 'x-csrf-token': tokenNuevo });
          respuesta = await fetch(url, opciones);
        }
      } catch (e) { /* no era JSON: dejamos pasar la respuesta original */ }
    }

    return respuesta;
  };
})();
