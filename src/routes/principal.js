const dbConfig = require('../config/database');
const connection = dbConfig();
module.exports = function(app) {
  // Primera pantalla y lo que se envia con render
  app.get('/', (req, res) => {
    res.render('principal/principal', { title: 'pagina principal' });
  });

  // Cambio de ruta para el adminpanel
  app.post('/login', (req, res) => {
    console.log('Redirigiendo al panel de administración');
    res.redirect('/admin');
  });

  // Definimos la ruta para el panel de administración
  app.get('/admin', (req, res) => {
    res.render('admin/adminpanel', { title: 'Admin Panel' });
  });

  app.post('/registro', (req, res) => {
    const { cedula, nombre, apellido, telefono, email, pais, ciudad } = req.body;
    const query = 'INSERT INTO registro2 (cedula, nombre, apellido, telefono, email, pais, ciudad) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const values = [cedula, nombre, apellido, telefono, email, pais, ciudad];
    connection.query(query, values, (error, results) => {
      if (error) {
        console.error('Error al registrar el usuario:', error);
        res.status(500).send('Error al registrar el usuario');
      } else {
        console.log('Usuario registrado exitosamente');
        res.redirect('/');
      }
    });
  });
  
  /*
  app.post('/registro', (req, res) => {
    const { cedula, nombre, apellido, telefono, email, pais, ciudad } = req.body;
    console.log(`Cedula: ${cedula}`);
    console.log(`Nombre: ${nombre}`);
    console.log(`Apellido: ${apellido}`);
    console.log(`Telefono: ${telefono}`);
    console.log(`Email: ${email}`);
    console.log(`Pais: ${pais}`);
    console.log(`Ciudad: ${ciudad}`);
    res.redirect('/');
  });
  */

};

