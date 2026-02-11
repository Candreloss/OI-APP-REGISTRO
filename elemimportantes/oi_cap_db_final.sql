-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 09-02-2026 a las 17:53:52
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
(1, 'CURSOS'),
(2, 'TALLERES'),
(3, 'DIPLOMADOS');

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
(2, 'PRESENCIAL');

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
  MODIFY `capofcodigo` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `inscripcion`
--
ALTER TABLE `inscripcion`
  MODIFY `inscodigo` int NOT NULL AUTO_INCREMENT;

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
  ADD CONSTRAINT `fk_pcap_persona` FOREIGN KEY (`pcap_perdoc`) REFERENCES `persona` (`perdoc`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
