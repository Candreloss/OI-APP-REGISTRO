-- ============================================================
-- Esquema de BD - Organización Inteligente
-- Generado desde la base real (solo lectura) para versionar.
-- Regenerar: node scripts/dump-schema.js
-- ============================================================

-- Tabla: admin
CREATE TABLE IF NOT EXISTS `admin` (
  `id_admin` int NOT NULL AUTO_INCREMENT,
  `nombreUsuario` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contrasena` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_admin`),
  UNIQUE KEY `unq_nombre_usuario` (`nombreUsuario`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: capacitacion
CREATE TABLE IF NOT EXISTS `capacitacion` (
  `capcodigo` int NOT NULL,
  `capnombre` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `capmodcodigo` int NOT NULL,
  `capcatcodigo` int NOT NULL,
  PRIMARY KEY (`capcodigo`),
  KEY `fk_capacitacion_categoria` (`capcatcodigo`),
  KEY `fk_capacitacion_modalidad` (`capmodcodigo`),
  CONSTRAINT `fk_capacitacion_categoria` FOREIGN KEY (`capcatcodigo`) REFERENCES `categoria` (`catcodigo`) ON UPDATE CASCADE,
  CONSTRAINT `fk_capacitacion_modalidad` FOREIGN KEY (`capmodcodigo`) REFERENCES `modalidad` (`modcodigo`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: capacitacion_oferta
CREATE TABLE IF NOT EXISTS `capacitacion_oferta` (
  `capofcodigo` int NOT NULL AUTO_INCREMENT,
  `capofcapcodigo` int NOT NULL,
  `capoffecha_inicio` date NOT NULL,
  `capoffecha_fin` date NOT NULL,
  `capofcupos` int NOT NULL,
  `cupos_bloqueados` tinyint(1) NOT NULL DEFAULT '0',
  `capofestatus` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`capofcodigo`),
  KEY `fk_oferta_capacitacion` (`capofcapcodigo`),
  CONSTRAINT `fk_oferta_capacitacion` FOREIGN KEY (`capofcapcodigo`) REFERENCES `capacitacion` (`capcodigo`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: categoria
CREATE TABLE IF NOT EXISTS `categoria` (
  `catcodigo` int NOT NULL,
  `catnombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`catcodigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: contacto_empresa
CREATE TABLE IF NOT EXISTS `contacto_empresa` (
  `id_contacto` int NOT NULL AUTO_INCREMENT,
  `empresa_nombre` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emp_tipodoc` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL,
  `emp_doc` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `emp_nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `emp_apellido` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `emp_email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `emp_telefono` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_contacto`),
  UNIQUE KEY `emp_doc` (`emp_doc`),
  UNIQUE KEY `emp_email` (`emp_email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: inscripcion
CREATE TABLE IF NOT EXISTS `inscripcion` (
  `inscodigo` int NOT NULL AUTO_INCREMENT,
  `ins_perdoc` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ins_oferta` int NOT NULL,
  `ins_fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ins_comprobante` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ins_estado` enum('pendiente','en_revision','conciliado','rechazado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `ins_empresa_id` int DEFAULT NULL,
  PRIMARY KEY (`inscodigo`),
  UNIQUE KEY `unq_persona_oferta_pago` (`ins_perdoc`,`ins_oferta`),
  KEY `fk_ins_oferta` (`ins_oferta`),
  KEY `fk_ins_empresa` (`ins_empresa_id`),
  CONSTRAINT `fk_ins_empresa` FOREIGN KEY (`ins_empresa_id`) REFERENCES `contacto_empresa` (`id_contacto`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_ins_oferta` FOREIGN KEY (`ins_oferta`) REFERENCES `capacitacion_oferta` (`capofcodigo`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ins_persona` FOREIGN KEY (`ins_perdoc`) REFERENCES `persona` (`perdoc`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: modalidad
CREATE TABLE IF NOT EXISTS `modalidad` (
  `modcodigo` int NOT NULL,
  `modnombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`modcodigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: pago_reportado
CREATE TABLE IF NOT EXISTS `pago_reportado` (
  `id_pago` int NOT NULL AUTO_INCREMENT,
  `pago_inscodigo` int DEFAULT NULL,
  `pago_empresa_id` int DEFAULT NULL,
  `titular_nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `titular_apellido` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `titular_telefono` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `banco_origen` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referencia` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_reporte` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_pago`),
  KEY `fk_pago_inscripcion` (`pago_inscodigo`),
  KEY `fk_pago_empresa` (`pago_empresa_id`),
  CONSTRAINT `fk_pago_empresa` FOREIGN KEY (`pago_empresa_id`) REFERENCES `contacto_empresa` (`id_contacto`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pago_inscripcion` FOREIGN KEY (`pago_inscodigo`) REFERENCES `inscripcion` (`inscodigo`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: persona
CREATE TABLE IF NOT EXISTS `persona` (
  `pertipodoc` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `perdoc` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `pernombre` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `perapellido` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `perfechanac` date NOT NULL,
  `pertelefono` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `peremail` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `perpais` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `perciudad` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`perdoc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: persona_capacitacion
CREATE TABLE IF NOT EXISTS `persona_capacitacion` (
  `pcap_perdoc` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `pcap_oferta` int NOT NULL,
  `pcap_nota_final` decimal(4,2) DEFAULT NULL,
  `pcap_estatus_acad` enum('cursando','aprobado','reprobado','retirado') COLLATE utf8mb4_unicode_ci DEFAULT 'cursando',
  `pcap_certificado_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`pcap_perdoc`,`pcap_oferta`),
  KEY `fk_pcap_oferta` (`pcap_oferta`),
  KEY `pcap_perdoc` (`pcap_perdoc`),
  CONSTRAINT `fk_pcap_oferta` FOREIGN KEY (`pcap_oferta`) REFERENCES `capacitacion_oferta` (`capofcodigo`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pcap_persona` FOREIGN KEY (`pcap_perdoc`) REFERENCES `persona` (`perdoc`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pcap_persona_documento` FOREIGN KEY (`pcap_perdoc`) REFERENCES `persona` (`perdoc`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: token_otp
CREATE TABLE IF NOT EXISTS `token_otp` (
  `id_otp` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo` varchar(6) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expira_en` datetime NOT NULL,
  `usado` tinyint(1) NOT NULL DEFAULT '0',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_otp`)
) ENGINE=InnoDB AUTO_INCREMENT=78 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

