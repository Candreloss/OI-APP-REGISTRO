-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 07-02-2026 a las 18:08:31
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
-- Base de datos: `oi_cap_db`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `capacitacion`
--

CREATE TABLE `capacitacion` (
  `capcodigo` int NOT NULL,
  `capnombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `capmodcodigo` int NOT NULL,
  `capcatcodigo` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `capacitacion`
--

INSERT INTO `capacitacion` (`capcodigo`, `capnombre`, `capmodcodigo`, `capcatcodigo`) VALUES
(1, 'DIPLOMADO DE GERENCIA', 1, 3),
(2, 'TALLER BLOCKCHAIN', 2, 2);

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
(1, 1, '2026-01-01', '2026-02-02', 10, 1),
(2, 2, '2026-02-02', '2026-03-03', 15, 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categoria`
--

CREATE TABLE `categoria` (
  `catcodigo` int NOT NULL,
  `catnombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `categoria`
--

INSERT INTO `categoria` (`catcodigo`, `catnombre`) VALUES
(1, 'CURSOS'),
(2, 'TALLERES'),
(3, 'DIPLOMADOS'),
(4, 'PRUEBA');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ciudad`
--

CREATE TABLE `ciudad` (
  `ciucodigo` int NOT NULL,
  `ciunombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ciupaicodigo` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `modalidad`
--

CREATE TABLE `modalidad` (
  `modcodigo` int NOT NULL,
  `modnombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL
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
-- Estructura de tabla para la tabla `pais`
--

CREATE TABLE `pais` (
  `paicodigo` int NOT NULL,
  `painombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `persona`
--

CREATE TABLE `persona` (
  `percedula` char(8) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pernombres` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `perapellidos` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `perfechanac` date NOT NULL,
  `pertelefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `percorreo` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `perciucodigo` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `persona_capacitacion`
--

CREATE TABLE `persona_capacitacion` (
  `percappercedula` char(8) COLLATE utf8mb4_unicode_ci NOT NULL,
  `percapofcodigo` int NOT NULL,
  `percapfecha_insc` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `percapnota` decimal(3,1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `preinscripcion`
--

CREATE TABLE `preinscripcion` (
  `preinscodigo` int NOT NULL,
  `prepercedula` char(8) COLLATE utf8mb4_unicode_ci NOT NULL,
  `precapofcodigo` int NOT NULL,
  `preinsfecha` date NOT NULL,
  `preinsestado` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `capacitacion`
--
ALTER TABLE `capacitacion`
  ADD PRIMARY KEY (`capcodigo`),
  ADD KEY `idx_capacitacion_mod` (`capmodcodigo`),
  ADD KEY `idx_capacitacion_cat` (`capcatcodigo`);

--
-- Indices de la tabla `capacitacion_oferta`
--
ALTER TABLE `capacitacion_oferta`
  ADD PRIMARY KEY (`capofcodigo`),
  ADD KEY `idx_oferta_capacitacion` (`capofcapcodigo`);

--
-- Indices de la tabla `categoria`
--
ALTER TABLE `categoria`
  ADD PRIMARY KEY (`catcodigo`);

--
-- Indices de la tabla `ciudad`
--
ALTER TABLE `ciudad`
  ADD PRIMARY KEY (`ciucodigo`),
  ADD KEY `idx_ciudad_paicodigo` (`ciupaicodigo`);

--
-- Indices de la tabla `modalidad`
--
ALTER TABLE `modalidad`
  ADD PRIMARY KEY (`modcodigo`);

--
-- Indices de la tabla `pais`
--
ALTER TABLE `pais`
  ADD PRIMARY KEY (`paicodigo`);

--
-- Indices de la tabla `persona`
--
ALTER TABLE `persona`
  ADD PRIMARY KEY (`percedula`),
  ADD KEY `idx_persona_ciudad` (`perciucodigo`);

--
-- Indices de la tabla `persona_capacitacion`
--
ALTER TABLE `persona_capacitacion`
  ADD PRIMARY KEY (`percappercedula`,`percapofcodigo`),
  ADD KEY `idx_pcap_persona` (`percappercedula`),
  ADD KEY `idx_pcap_oferta` (`percapofcodigo`);

--
-- Indices de la tabla `preinscripcion`
--
ALTER TABLE `preinscripcion`
  ADD PRIMARY KEY (`preinscodigo`),
  ADD UNIQUE KEY `unq_preins_per_of` (`prepercedula`,`precapofcodigo`),
  ADD KEY `idx_preins_persona` (`prepercedula`),
  ADD KEY `idx_preins_oferta` (`precapofcodigo`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `capacitacion_oferta`
--
ALTER TABLE `capacitacion_oferta`
  MODIFY `capofcodigo` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `ciudad`
--
ALTER TABLE `ciudad`
  MODIFY `ciucodigo` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `preinscripcion`
--
ALTER TABLE `preinscripcion`
  MODIFY `preinscodigo` int NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `capacitacion`
--
ALTER TABLE `capacitacion`
  ADD CONSTRAINT `fk_capacitacion_categoria` FOREIGN KEY (`capcatcodigo`) REFERENCES `categoria` (`catcodigo`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_capacitacion_modalidad` FOREIGN KEY (`capmodcodigo`) REFERENCES `modalidad` (`modcodigo`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `capacitacion_oferta`
--
ALTER TABLE `capacitacion_oferta`
  ADD CONSTRAINT `fk_oferta_capacitacion` FOREIGN KEY (`capofcapcodigo`) REFERENCES `capacitacion` (`capcodigo`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `ciudad`
--
ALTER TABLE `ciudad`
  ADD CONSTRAINT `fk_ciudad_pais` FOREIGN KEY (`ciupaicodigo`) REFERENCES `pais` (`paicodigo`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `persona`
--
ALTER TABLE `persona`
  ADD CONSTRAINT `fk_persona_ciudad` FOREIGN KEY (`perciucodigo`) REFERENCES `ciudad` (`ciucodigo`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `persona_capacitacion`
--
ALTER TABLE `persona_capacitacion`
  ADD CONSTRAINT `fk_pcap_oferta` FOREIGN KEY (`percapofcodigo`) REFERENCES `capacitacion_oferta` (`capofcodigo`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pcap_persona` FOREIGN KEY (`percappercedula`) REFERENCES `persona` (`percedula`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `preinscripcion`
--
ALTER TABLE `preinscripcion`
  ADD CONSTRAINT `fk_preins_oferta` FOREIGN KEY (`precapofcodigo`) REFERENCES `capacitacion_oferta` (`capofcodigo`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_preins_persona` FOREIGN KEY (`prepercedula`) REFERENCES `persona` (`percedula`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
