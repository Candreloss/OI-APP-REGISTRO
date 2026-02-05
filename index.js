// Instanciamos el objeto app configurada en server.js
const app = require('./src/config/server');

// Definimos la ruta principal para la pagina
require('./src/routes/principal')(app);


const port = app.get('port');
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
