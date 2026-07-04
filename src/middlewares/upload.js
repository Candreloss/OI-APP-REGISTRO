// src/middlewares/upload.js
const multer = require('multer');

// 1. Configuramos el almacenamiento estricto en memoria RAM
const storage = multer.memoryStorage();

// 2. Filtro de seguridad: Solo permitimos imágenes
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Formato no válido. Solo se permiten imágenes (JPG, JPEG, PNG).'), false);
    }
};

// 3. Empaquetamos la configuración con un límite de seguridad de 5MB
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 Megabytes máximo por archivo
    },
    fileFilter: fileFilter
});

module.exports = upload;