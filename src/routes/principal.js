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

  // Redirigir admin con "/principal" a la raíz
  app.get('/principal', (req, res) => {
    res.redirect('/');
  });

  // Manejo del formulario de registro
  app.post('/registro', (req, res) => {
    // Capturamos los datos del formulario
    const { tipodoc, doc, nombre, apellido, codpais, telefono, email, pais, ciudad, capacitacion } = req.body;
    // Validaciones básicas
    if (!tipodoc || !doc || !nombre || !apellido || !codpais || !telefono || !email || !pais || !ciudad || !capacitacion) {
      return res.status(400).send('Todos los campos son obligatorios');
    }
    
    // Validación del código de país
    if (!/^\+\d{1,4}$/.test(codpais)) {
      return res.status(400).send('El código de país debe iniciar con + y tener de 1 a 4 dígitos');
    }
    
    // Validación del número de teléfono
    if (!/^\d{7,15}$/.test(telefono)) {
      return res.status(400).send('El número de teléfono debe tener entre 7 y 15 dígitos');
    }
    
    // Cersiorarse que la entrada documento sea solo numerica, hasta 20 caracteres
    if (!/^\d{1,20}$/.test(doc)) {
      return res.status(400).send('El documento debe ser numérico y tener máximo 20 caracteres');
    }
    
    // Concatenar código de país y número para guardar
    const telefonoCompleto = `${codpais}-${telefono}`;

    // Convertir nombre y apellido en minusculas con la primera letra en mayuscula
    const nombreFormateado = nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase();
    const apellidoFormateado = apellido.charAt(0).toUpperCase() + apellido.slice(1).toLowerCase();
    
    // Convertir ciudad en minusculas
    const ciudadminuscula = ciudad.toLowerCase();

    // Convertir tipodoc en mayusculas
    const tipodocMayuscula = tipodoc.toUpperCase();

    // Mostrar los datos en la consola para verificación
    console.log(`Registrando usuario: ${tipodocMayuscula}, ${doc}, ${nombreFormateado}, ${apellidoFormateado}, ${telefonoCompleto}, ${email}, ${pais}, ${ciudadminuscula}, ${capacitacion}`);
    
    // Enviar los datos al servidor de base de datos
    const query1 = 'INSERT INTO registro2 (pertipodoc, perdoc, pernombre, perapellido, pertelefono, peremail, perpais, perciudad) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [tipodocMayuscula, doc, nombreFormateado, apellidoFormateado, telefonoCompleto, email, pais, ciudadminuscula];
    connection.query(query1, values, (error, results) => {
      if (error) {
        console.error('Error al registrar el usuario:', error);
        res.status(500).send('Error al registrar el usuario');
      // Si la PK esta repetida, no se registra y se muestra un mensaje de error
      } else if (results.affectedRows === 0) {
        console.log('El documento ya existe');
        res.status(400).send('El documento ya existe');
      } else {
        console.log('Usuario registrado exitosamente');
        res.redirect('/');
      }
    });
    
  });
  
  
  /*
  app.post('/registro', (req, res) => {
    const { cedula, nombre, apellido, telefono, email, pais, ciudad, capacitacion } = req.body;
    console.log(`Cedula: ${cedula}`);
    console.log(`Nombre: ${nombre}`);
    console.log(`Apellido: ${apellido}`);
    console.log(`Telefono: ${telefono}`);
    console.log(`Email: ${email}`);
    console.log(`Pais: ${pais}`);
    console.log(`Ciudad: ${ciudad}`);
    console.log(`Capacitacion: ${capacitacion}`);
    res.redirect('/');
  });
  */
  

};

