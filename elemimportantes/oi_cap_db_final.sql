-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 27-02-2026 a las 20:24:40
-- Versión del servidor: 8.0.41
-- Versión de PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `oi_cap_db_final`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `capacitacion`
--

CREATE TABLE `capacitacion` (
  `capcodigo` int NOT NULL,
  `capnombre` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `capmodcodigo` int NOT NULL,
  `capcatcodigo` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `capacitacion`
--

INSERT INTO `capacitacion` (`capcodigo`, `capnombre`, `capmodcodigo`, `capcatcodigo`) VALUES
(1, 'Gerencia para ingenieros y profesiones afines', 1, 3),
(2, 'Finanzas empresariales', 2, 3),
(3, 'PowerBI ', 1, 1),
(4, 'PowerBI nivel basico-intermedio-avanzado', 1, 1),
(5, 'Finanzas', 1, 1),
(6, 'Indicadores de gestion como herramienta estrategica', 2, 1),
(7, 'Social media con inteligencia artificial', 1, 6),
(8, 'Analisis de costos para la toma de decisiones gerenciales', 1, 2),
(9, 'Gerencia de negocios', 2, 3),
(10, 'Inteligencia artificial para principiantes', 2, 2),
(11, 'Excel intermedio ', 2, 1),
(12, 'Redes sociales impulsadas con IA', 1, 8),
(13, 'Redes sociales impulsadas con inteligencia artificial nivel básico', 2, 4),
(14, 'Oratoria comunícate con confianza', 2, 2),
(15, 'Campañas publicitarias impulsadas por IA', 2, 2),
(16, 'Marketing para gerentes y dueños de negocios impulsado con inteligencia artificial', 2, 4),
(17, 'Estructura de costos', 2, 2);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `capacitacion_oferta`
--

CREATE TABLE `capacitacion_oferta` (
  `capofcodigo` int NOT NULL,
  `capofcapcodigo` int NOT NULL,
  `capoffecha_inicio` date NOT NULL,
  `capoffecha_fin` date NOT NULL,
  `capofcupos` int NOT NULL,
  `capofestatus` tinyint NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `capacitacion_oferta`
--

INSERT INTO `capacitacion_oferta` (`capofcodigo`, `capofcapcodigo`, `capoffecha_inicio`, `capoffecha_fin`, `capofcupos`, `capofestatus`) VALUES
(1, 1, '2026-02-19', '2026-03-19', 15, 1),
(3, 2, '2026-02-20', '2026-03-19', 20, 1),
(7, 3, '2026-03-23', '2026-03-23', 10, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categoria`
--

CREATE TABLE `categoria` (
  `catcodigo` int NOT NULL,
  `catnombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `categoria`
--

INSERT INTO `categoria` (`catcodigo`, `catnombre`) VALUES
(1, 'CURSO'),
(2, 'TALLER'),
(3, 'DIPLOMADO'),
(4, 'CURSO TALLER'),
(5, 'JORNADA'),
(6, 'PROGRAMA INTENSIVO'),
(7, 'CAMPAMENTO INTENSIVO'),
(8, 'CURSO INTENSIVO');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `inscripcion`
--

CREATE TABLE `inscripcion` (
  `inscodigo` int NOT NULL,
  `ins_perdoc` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ins_oferta` int NOT NULL,
  `ins_fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ins_comprobante` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ins_estado` enum('pendiente','conciliado','rechazado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `inscripcion`
--

INSERT INTO `inscripcion` (`inscodigo`, `ins_perdoc`, `ins_oferta`, `ins_fecha`, `ins_comprobante`, `ins_estado`) VALUES
(1, '10849147', 1, '2026-02-19 15:51:44', NULL, 'pendiente'),
(2, '11598676', 1, '2026-02-19 15:54:22', NULL, 'pendiente'),
(3, '30405396', 1, '2026-02-20 20:50:25', NULL, 'pendiente'),
(7, '31025923', 1, '2026-02-20 22:59:54', NULL, 'pendiente'),
(10, '31025923', 3, '2026-02-20 23:00:22', NULL, 'pendiente'),
(11, 'asdadsa', 3, '2026-02-20 23:13:11', NULL, 'pendiente'),
(12, '31025997', 1, '2026-02-23 21:30:51', NULL, 'pendiente'),
(14, '31025998', 1, '2026-02-23 21:42:44', NULL, 'pendiente');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `modalidad`
--

CREATE TABLE `modalidad` (
  `modcodigo` int NOT NULL,
  `modnombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `modalidad`
--

INSERT INTO `modalidad` (`modcodigo`, `modnombre`) VALUES
(1, 'VIRTUAL'),
(2, 'PRESENCIAL'),
(3, 'SEMIPRESENCIAL');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `persona`
--

CREATE TABLE `persona` (
  `pertipodoc` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `perdoc` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `pernombre` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `perapellido` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `perfechanac` date NOT NULL,
  `pertelefono` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `peremail` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `perpais` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `perciudad` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `persona`
--

INSERT INTO `persona` (`pertipodoc`, `perdoc`, `pernombre`, `perapellido`, `perfechanac`, `pertelefono`, `peremail`, `perpais`, `perciudad`) VALUES
('Ced', '10849147', 'Lisbeth', 'Mendoza', '1973-03-31', '+58-4165523011', 'lisbethmapa@hotmail.com', 'VE', 'Barquisimeto'),
('Ced', '11598676', 'Karlobell', 'Paradas', '1973-09-21', '+58-4262759222', 'kparadas@gmail.com', 'VE', 'Barquisimeto'),
('Ced', '30405396', 'Andrea', 'Paradas', '2004-04-30', '+58-4125536625', 'andrea@gmail.com', 'VE', 'Barquisimeto'),
('Ced', '31025923', 'Carlos', 'Paradas', '2005-09-03', '+58-4125536625', 'carlosdavidparadasmendoza@gmail.com', 'VE', 'Barquisimeto'),
('Ced', '31025997', 'Carlos', 'Paradas', '2005-09-03', '+58-4125536625', 'carlosdavidparadasmendoza@gmail.com', 'VE', 'Barquisimeto'),
('Ced', '31025998', 'Carlos', 'Paradas', '2005-09-03', '+58-4125536625', 'carlosdavidparadasmendoza@gmail.com', 'VE', 'Barquisimeto'),
('Ced', 'asdadsa', 'Carlos', 'Paradas', '1900-01-01', '+58-4125536625', 'carlosdavidparadasmendoza@gmail.com', 'VE', 'asads');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `persona_capacitacion`
--

CREATE TABLE `persona_capacitacion` (
  `pcap_perdoc` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `pcap_oferta` int NOT NULL,
  `pcap_nota_final` decimal(4,2) DEFAULT NULL,
  `pcap_estatus_acad` enum('cursando','aprobado','reprobado','retirado') COLLATE utf8mb4_unicode_ci DEFAULT 'cursando',
  `pcap_certificado_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `persona_capacitacion`
--

INSERT INTO `persona_capacitacion` (`pcap_perdoc`, `pcap_oferta`, `pcap_nota_final`, `pcap_estatus_acad`, `pcap_certificado_url`) VALUES
('10849147', 1, NULL, 'cursando', NULL),
('11598676', 1, NULL, 'cursando', NULL),
('30405396', 1, NULL, 'cursando', NULL),
('31025923', 1, NULL, 'cursando', NULL),
('31025923', 3, NULL, 'cursando', NULL),
('31025997', 1, NULL, 'cursando', NULL),
('31025998', 1, NULL, 'cursando', NULL),
('asdadsa', 3, NULL, 'cursando', NULL);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `capacitacion`
--
ALTER TABLE `capacitacion`
  ADD PRIMARY KEY (`capcodigo`),
  ADD KEY `fk_capacitacion_categoria` (`capcatcodigo`),
  ADD KEY `fk_capacitacion_modalidad` (`capmodcodigo`);

--
-- Indices de la tabla `capacitacion_oferta`
--
ALTER TABLE `capacitacion_oferta`
  ADD PRIMARY KEY (`capofcodigo`),
  ADD KEY `fk_oferta_capacitacion` (`capofcapcodigo`);

--
-- Indices de la tabla `categoria`
--
ALTER TABLE `categoria`
  ADD PRIMARY KEY (`catcodigo`);

--
-- Indices de la tabla `inscripcion`
--
ALTER TABLE `inscripcion`
  ADD PRIMARY KEY (`inscodigo`),
  ADD UNIQUE KEY `unq_persona_oferta_pago` (`ins_perdoc`,`ins_oferta`),
  ADD KEY `fk_ins_oferta` (`ins_oferta`);

--
-- Indices de la tabla `modalidad`
--
ALTER TABLE `modalidad`
  ADD PRIMARY KEY (`modcodigo`);

--
-- Indices de la tabla `persona`
--
ALTER TABLE `persona`
  ADD PRIMARY KEY (`perdoc`);

--
-- Indices de la tabla `persona_capacitacion`
--
ALTER TABLE `persona_capacitacion`
  ADD PRIMARY KEY (`pcap_perdoc`,`pcap_oferta`),
  ADD KEY `fk_pcap_oferta` (`pcap_oferta`),
  ADD KEY `pcap_perdoc` (`pcap_perdoc`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `capacitacion_oferta`
--
ALTER TABLE `capacitacion_oferta`
  MODIFY `capofcodigo` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `inscripcion`
--
ALTER TABLE `inscripcion`
  MODIFY `inscodigo` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `capacitacion`
--
ALTER TABLE `capacitacion`
  ADD CONSTRAINT `fk_capacitacion_categoria` FOREIGN KEY (`capcatcodigo`) REFERENCES `categoria` (`catcodigo`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_capacitacion_modalidad` FOREIGN KEY (`capmodcodigo`) REFERENCES `modalidad` (`modcodigo`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `capacitacion_oferta`
--
ALTER TABLE `capacitacion_oferta`
  ADD CONSTRAINT `fk_oferta_capacitacion` FOREIGN KEY (`capofcapcodigo`) REFERENCES `capacitacion` (`capcodigo`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `inscripcion`
--
ALTER TABLE `inscripcion`
  ADD CONSTRAINT `fk_ins_oferta` FOREIGN KEY (`ins_oferta`) REFERENCES `capacitacion_oferta` (`capofcodigo`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ins_persona` FOREIGN KEY (`ins_perdoc`) REFERENCES `persona` (`perdoc`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `persona_capacitacion`
--
ALTER TABLE `persona_capacitacion`
  ADD CONSTRAINT `fk_pcap_oferta` FOREIGN KEY (`pcap_oferta`) REFERENCES `capacitacion_oferta` (`capofcodigo`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pcap_persona` FOREIGN KEY (`pcap_perdoc`) REFERENCES `persona` (`perdoc`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pcap_persona_documento` FOREIGN KEY (`pcap_perdoc`) REFERENCES `persona` (`perdoc`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
