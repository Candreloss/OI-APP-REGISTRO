-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 05-02-2026 a las 22:13:55
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
-- Base de datos: `oi_modulo_db`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `registro2`
--

CREATE TABLE `registro2` (
  `cedula` int NOT NULL,
  `nombre` varchar(30) NOT NULL,
  `apellido` varchar(30) NOT NULL,
  `telefono` bigint NOT NULL,
  `email` varchar(255) NOT NULL,
  `pais` varchar(30) NOT NULL,
  `ciudad` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `registro2`
--

INSERT INTO `registro2` (`cedula`, `nombre`, `apellido`, `telefono`, `email`, `pais`, `ciudad`) VALUES
(11598676, 'Karlobell', 'Paradas', 4262759222, 'kparadas@gmail.com', 'OT', 'Barquisimeto'),
(31025923, 'Carlos', 'Paradas', 4125536625, 'carlosdavidparadasmendoza@gmail.com', 'venezuela', 'barquisimeto');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `registro2`
--
ALTER TABLE `registro2`
  ADD PRIMARY KEY (`cedula`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
