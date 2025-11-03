-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Nov 02, 2025 at 01:50 PM
-- Server version: 10.6.22-MariaDB-cll-lve
-- PHP Version: 7.4.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `aelectri_wdv`
--

--
-- VIEW `v_end_info`
-- Data: None
--


-- --------------------------------------------------------

--
-- Structure for view `v_end_info`
--

CREATE ALGORITHM=UNDEFINED DEFINER=`aelectri_wdv_api`@`localhost` SQL SECURITY DEFINER VIEW `v_end_info`  AS SELECT coalesce(concat_ws(' ',`a`.`first_name`,`a`.`last_name`),`ra`.`archer_name`) AS `archer_name`, `ev`.`name` AS `event_name`, `ev`.`entry_code` AS `event_code`, `r`.`round_type` AS `round_type`, `r`.`division` AS `division`, `r`.`date` AS `round_date`, `ra`.`bale_number` AS `bale_number`, `ra`.`target_assignment` AS `target`, `ee`.`end_number` AS `end_number`, `ee`.`a1` AS `a1`, `ee`.`a2` AS `a2`, `ee`.`a3` AS `a3`, `ee`.`end_total` AS `end_total`, `ee`.`running_total` AS `running_total`, `ee`.`tens` AS `tens`, `ee`.`xs` AS `xs`, `r`.`id` AS `round_id`, `ev`.`id` AS `event_id`, `ra`.`id` AS `round_archer_id`, `a`.`id` AS `archer_id`, `ee`.`device_ts` AS `device_ts`, `ee`.`server_ts` AS `server_ts` FROM ((((`end_events` `ee` join `round_archers` `ra` on(`ra`.`id` = `ee`.`round_archer_id`)) join `rounds` `r` on(`r`.`id` = `ee`.`round_id`)) left join `events` `ev` on(`ev`.`id` = `r`.`event_id`)) left join `archers` `a` on(`a`.`id` = `ra`.`archer_id`)) ;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
