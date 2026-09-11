-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 11, 2026 at 08:38 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.1.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `wa_blast`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` int(11) NOT NULL,
  `user` varchar(191) NOT NULL,
  `action` varchar(191) NOT NULL,
  `module` varchar(191) NOT NULL,
  `date` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `activity_logs`
--

INSERT INTO `activity_logs` (`id`, `user`, `action`, `module`, `date`) VALUES
(77, 'John Prakoso', 'created campaign \"Promo August\"', 'Campaign', '2026-08-31 08:10:00.000'),
(78, 'Dita Prameswari', 'imported 1,500 contacts', 'Contact', '2026-08-31 07:50:00.000'),
(79, 'Sarah Wijayanti', 'edited template \"Payment Reminder\"', 'Template', '2026-08-31 07:20:00.000'),
(80, 'Ryan Nugroho', 'paused campaign \"Bandung Fashion Week\"', 'Campaign', '2026-08-30 16:00:00.000'),
(81, 'System', 'campaign \"Promo August\" completed', 'Campaign', '2026-08-31 07:00:00.000'),
(82, 'Sarah Wijayanti', 'invited agus@blast.io to join the team', 'Team', '2026-08-30 10:30:00.000'),
(83, 'John Prakoso', 'updated WhatsApp account \"Support 01\"', 'WhatsApp', '2026-08-30 09:15:00.000'),
(84, 'John Prakoso', 'changed application theme settings', 'Settings', '2026-08-29 11:00:00.000'),
(85, 'system', 'created login', 'Login', '2026-09-10 06:52:11.819'),
(86, 'system', 'created login', 'Login', '2026-09-10 06:52:19.778'),
(87, 'system', 'created login', 'Login', '2026-09-10 06:52:39.677'),
(88, 'system', 'created login', 'Login', '2026-09-10 07:01:28.671'),
(89, 'system', 'created login', 'Login', '2026-09-11 06:34:42.206');

-- --------------------------------------------------------

--
-- Table structure for table `campaigns`
--

CREATE TABLE `campaigns` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `status` enum('DRAFT','SCHEDULED','RUNNING','PAUSED','COMPLETED','CANCELLED','FAILED') NOT NULL DEFAULT 'DRAFT',
  `whatsappAccountId` varchar(191) NOT NULL,
  `templateId` int(11) DEFAULT NULL,
  `templateContentSnapshot` varchar(191) NOT NULL,
  `scheduledAt` datetime(3) DEFAULT NULL,
  `startedAt` datetime(3) DEFAULT NULL,
  `pausedAt` datetime(3) DEFAULT NULL,
  `completedAt` datetime(3) DEFAULT NULL,
  `cancelledAt` datetime(3) DEFAULT NULL,
  `recipientsCount` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `mediaMimetype` varchar(191) DEFAULT NULL,
  `mediaName` varchar(191) DEFAULT NULL,
  `mediaPath` varchar(191) DEFAULT NULL,
  `mediaSize` int(11) DEFAULT NULL,
  `mediaType` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `campaigns`
--

INSERT INTO `campaigns` (`id`, `name`, `description`, `status`, `whatsappAccountId`, `templateId`, `templateContentSnapshot`, `scheduledAt`, `startedAt`, `pausedAt`, `completedAt`, `cancelledAt`, `recipientsCount`, `createdAt`, `updatedAt`, `mediaMimetype`, `mediaName`, `mediaPath`, `mediaSize`, `mediaType`) VALUES
(13, 'asd', 'asd', 'COMPLETED', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', 2, 'Halooo {{name}} coba bot', '2026-09-08 06:23:00.000', '2026-09-08 06:43:06.448', NULL, '2026-09-08 06:44:19.461', NULL, 8, '2026-09-08 06:21:25.482', '2026-09-08 06:44:19.463', NULL, NULL, NULL, NULL, NULL),
(14, 'asd (copy)', 'asd', 'COMPLETED', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', 2, 'Halooo {{name}} coba bot 2', '2026-09-08 06:27:00.000', '2026-09-08 06:43:06.586', NULL, '2026-09-08 06:44:14.857', NULL, 8, '2026-09-08 06:24:25.105', '2026-09-08 06:44:14.859', NULL, NULL, NULL, NULL, NULL),
(15, 'asd (copy)', 'asd', 'COMPLETED', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', 2, 'Bismillah amann {{name}}', '2026-09-08 06:49:00.000', '2026-09-08 06:49:09.714', NULL, '2026-09-08 06:49:42.446', NULL, 8, '2026-09-08 06:46:41.119', '2026-09-08 06:49:42.447', NULL, NULL, NULL, NULL, NULL),
(17, 'halooo', 'asd', 'COMPLETED', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', 1, '⚡ Yuk, Bayar Listrik Tepat Waktu! ⚡\n\nHalo {{name}}. Jangan sampai kenyamanan di rumah terganggu karena lupa bayar listrik. 😊\n\n💡 Bayar tagihan listrik sebelum tanggal 20 setiap bulan agar terh', '2026-09-08 09:57:00.000', '2026-09-08 09:57:12.812', NULL, '2026-09-08 09:57:12.831', NULL, 8, '2026-09-08 09:50:14.685', '2026-09-08 09:57:12.834', NULL, NULL, NULL, NULL, NULL),
(18, 'halooo (copy)', 'asd', 'COMPLETED', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', 1, '⚡ Yuk, Bayar Listrik Tepat Waktu! ⚡\n\nHalo {{name}}. Jangan sampai kenyamanan di rumah terganggu karena lupa bayar listrik. 😊\n\n💡 Bayar tagihan listrik sebelum tanggal 20 setiap bulan agar terh', '2026-09-08 10:11:00.000', '2026-09-08 10:11:17.389', NULL, '2026-09-08 10:12:23.952', NULL, 8, '2026-09-08 10:02:49.904', '2026-09-08 10:12:23.955', NULL, NULL, NULL, NULL, NULL),
(21, 'coba baru', 'asd asf asfasf', 'COMPLETED', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', 2, 'Halooo {{name}}...', NULL, '2026-09-09 02:14:24.396', NULL, '2026-09-09 02:15:00.686', NULL, 8, '2026-09-09 02:14:24.328', '2026-09-09 02:15:00.689', NULL, NULL, NULL, NULL, NULL),
(22, 'coba baru (copy)', 'asd asf asfasf', 'COMPLETED', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', 2, 'Selamat pagi {{name}}', '2026-09-09 02:50:00.000', '2026-09-09 02:50:08.273', NULL, '2026-09-09 02:50:39.537', NULL, 8, '2026-09-09 02:47:48.028', '2026-09-09 02:50:39.541', NULL, NULL, NULL, NULL, NULL),
(23, 'coba baru (copy) (copy)', 'asd asf asfasf', 'COMPLETED', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', 2, 'Selamat siang {{name}}. Jangan lupa makan siang.', NULL, '2026-09-09 05:34:33.227', NULL, '2026-09-09 05:34:59.788', NULL, 8, '2026-09-09 05:31:36.704', '2026-09-09 05:34:59.790', 'image/jpeg', 'images.jpg', 'storage/campaign-media/b435c372-2a92-4b92-9dc0-108f28d08b59.jpg', 21747, 'image'),
(24, 'coba baru (copy) (copy) (copy)', 'asd asf asfasf', 'COMPLETED', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', 2, 'Selamat siang {{name}}. Jangan lupa makan siang.', NULL, '2026-09-09 06:17:36.449', NULL, '2026-09-09 06:18:09.570', NULL, 8, '2026-09-09 06:16:55.322', '2026-09-09 06:18:09.572', 'image/jpeg', 'images.jpg', 'storage/campaign-media/b435c372-2a92-4b92-9dc0-108f28d08b59.jpg', 21747, 'image'),
(25, 'coba baru (copy)', 'asd asf asfasf', 'COMPLETED', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', 2, 'Halooo {{name}}...', NULL, '2026-09-09 07:33:24.272', NULL, '2026-09-09 07:33:28.561', NULL, 8, '2026-09-09 06:58:10.901', '2026-09-09 07:33:28.563', NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `campaign_contacts`
--

CREATE TABLE `campaign_contacts` (
  `id` int(11) NOT NULL,
  `targetsId` int(11) NOT NULL,
  `contactId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `campaign_groups`
--

CREATE TABLE `campaign_groups` (
  `id` int(11) NOT NULL,
  `targetsId` int(11) NOT NULL,
  `groupId` int(11) DEFAULT NULL,
  `groupName` varchar(191) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `campaign_groups`
--

INSERT INTO `campaign_groups` (`id`, `targetsId`, `groupId`, `groupName`) VALUES
(9, 14, 1, 'Customers'),
(11, 16, 1, 'Customers'),
(13, 18, 1, 'Customers'),
(19, 24, 1, 'Customers'),
(23, 28, 1, 'Customers'),
(24, 29, 1, 'Customers'),
(26, 31, 1, 'Customers'),
(27, 31, 3, 'Residential'),
(30, 33, 1, 'Customers'),
(36, 39, 1, 'Customers'),
(38, 41, 1, 'Customers');

-- --------------------------------------------------------

--
-- Table structure for table `campaign_recipients`
--

CREATE TABLE `campaign_recipients` (
  `id` int(11) NOT NULL,
  `campaignId` int(11) NOT NULL,
  `contactId` int(11) DEFAULT NULL,
  `phone` varchar(191) NOT NULL,
  `variablesSnapshot` varchar(191) NOT NULL,
  `status` enum('PENDING','QUEUED','SENT','FAILED','SKIPPED') NOT NULL DEFAULT 'PENDING',
  `messageId` varchar(191) DEFAULT NULL,
  `skipReason` varchar(191) DEFAULT NULL,
  `queuedAt` datetime(3) DEFAULT NULL,
  `sentAt` datetime(3) DEFAULT NULL,
  `failedAt` datetime(3) DEFAULT NULL,
  `skippedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `deliveredAt` datetime(3) DEFAULT NULL,
  `readAt` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `campaign_recipients`
--

INSERT INTO `campaign_recipients` (`id`, `campaignId`, `contactId`, `phone`, `variablesSnapshot`, `status`, `messageId`, `skipReason`, `queuedAt`, `sentAt`, `failedAt`, `skippedAt`, `createdAt`, `updatedAt`, `deliveredAt`, `readAt`) VALUES
(62, 13, 11, '62895418240605', '{\"name\":\"Dimas\"}', 'SENT', '97e1cd62-132e-4a37-a602-22255c4d2182', NULL, '2026-09-08 06:43:06.471', '2026-09-08 06:43:08.713', NULL, NULL, '2026-09-08 06:21:25.504', '2026-09-08 06:54:05.923', '2026-09-08 06:43:09.000', '2026-09-08 06:54:05.000'),
(63, 13, 12, '6282230895298', '{\"name\":\"Syafri\"}', 'SENT', 'bde05c3c-1894-4031-bcf9-b4d80272bc45', NULL, '2026-09-08 06:43:06.495', '2026-09-08 06:43:14.262', NULL, NULL, '2026-09-08 06:21:25.504', '2026-09-08 06:43:15.928', '2026-09-08 06:43:15.000', NULL),
(64, 13, 13, '6285732010265', '{\"name\":\"Arifin\"}', 'SENT', 'cb8c38c8-5c36-48ed-89b1-577f67dbc83f', NULL, '2026-09-08 06:43:06.506', '2026-09-08 06:43:18.391', NULL, NULL, '2026-09-08 06:21:25.504', '2026-09-08 06:43:20.876', '2026-09-08 06:43:20.000', NULL),
(65, 13, 14, '6283115772468', '{\"name\":\"Arinal\"}', 'SENT', '6c78fe8e-a2f1-4c90-b27f-de410f0e005e', NULL, '2026-09-08 06:43:06.519', '2026-09-08 06:43:22.670', NULL, NULL, '2026-09-08 06:21:25.504', '2026-09-08 09:23:16.111', '2026-09-08 06:43:24.000', '2026-09-08 09:23:15.000'),
(66, 13, 15, '6285546268982', '{\"name\":\"Ilham\"}', 'SENT', '0ccfaf90-fe2d-4280-80d5-350c35efeaa3', NULL, '2026-09-08 06:43:06.530', '2026-09-08 06:43:26.709', NULL, NULL, '2026-09-08 06:21:25.504', '2026-09-08 06:43:31.701', '2026-09-08 06:43:28.000', NULL),
(67, 13, 16, '6287812068310', '{\"name\":\"Rangga\"}', 'SENT', '6e82daa3-78d3-4ab6-9189-cae161b78549', NULL, '2026-09-08 06:43:06.541', '2026-09-08 06:44:19.454', NULL, NULL, '2026-09-08 06:21:25.504', '2026-09-09 01:46:31.082', '2026-09-08 06:44:19.000', '2026-09-08 10:21:41.000'),
(68, 13, 17, '628993706921', '{\"name\":\"Wira\"}', 'SENT', '9f99f33c-0796-4e33-841a-f15b99c4c5cc', NULL, '2026-09-08 06:43:06.551', '2026-09-08 06:43:33.973', NULL, NULL, '2026-09-08 06:21:25.504', '2026-09-08 06:54:05.828', '2026-09-08 06:43:34.000', '2026-09-08 06:54:05.000'),
(69, 13, 19, '6285784618518', '{\"name\":\"Ula\"}', 'SENT', '8d484ef2-6e2a-4f4c-8202-75316d6970e3', NULL, '2026-09-08 06:43:06.562', '2026-09-08 06:43:38.324', NULL, NULL, '2026-09-08 06:21:25.504', '2026-09-08 06:43:38.326', NULL, NULL),
(78, 14, 11, '62895418240605', '{\"name\":\"Dimas\"}', 'SENT', '1c4bded3-5c12-4702-804b-81564f83d0e2', NULL, '2026-09-08 06:43:06.598', '2026-09-08 06:43:42.994', NULL, NULL, '2026-09-08 06:25:34.323', '2026-09-08 06:54:05.914', '2026-09-08 06:43:43.000', '2026-09-08 06:54:05.000'),
(79, 14, 12, '6282230895298', '{\"name\":\"Syafri\"}', 'SENT', 'a68c8227-b9e6-4af4-9f98-10cd510ec5fc', NULL, '2026-09-08 06:43:06.608', '2026-09-08 06:43:46.240', NULL, NULL, '2026-09-08 06:25:34.323', '2026-09-08 06:43:47.871', '2026-09-08 06:43:46.000', NULL),
(80, 14, 13, '6285732010265', '{\"name\":\"Arifin\"}', 'SENT', '2ccdfd8e-59a4-45de-8dc2-3395b85c1534', NULL, '2026-09-08 06:43:06.617', '2026-09-08 06:43:51.044', NULL, NULL, '2026-09-08 06:25:34.323', '2026-09-08 06:43:51.741', '2026-09-08 06:43:51.000', NULL),
(81, 14, 14, '6283115772468', '{\"name\":\"Arinal\"}', 'SENT', '3f47adba-a635-45f9-bf3a-513def9aced6', NULL, '2026-09-08 06:43:06.626', '2026-09-08 06:43:54.332', NULL, NULL, '2026-09-08 06:25:34.323', '2026-09-08 09:23:16.126', '2026-09-08 06:43:55.000', '2026-09-08 09:23:15.000'),
(82, 14, 15, '6285546268982', '{\"name\":\"Ilham\"}', 'SENT', 'ec65dd4f-360e-450a-b871-4dddcc57f769', NULL, '2026-09-08 06:43:06.635', '2026-09-08 06:43:59.925', NULL, NULL, '2026-09-08 06:25:34.323', '2026-09-08 06:44:00.603', '2026-09-08 06:44:00.000', NULL),
(83, 14, 16, '6287812068310', '{\"name\":\"Rangga\"}', 'SENT', '084b13c6-4ea1-4efc-808b-3d700ade671e', NULL, '2026-09-08 06:43:06.644', '2026-09-08 06:44:05.720', NULL, NULL, '2026-09-08 06:25:34.323', '2026-09-09 01:46:31.097', '2026-09-08 06:44:06.000', '2026-09-08 10:21:41.000'),
(84, 14, 17, '628993706921', '{\"name\":\"Wira\"}', 'SENT', '3d58d4a3-66db-4165-94fe-0d77eb309442', NULL, '2026-09-08 06:43:06.653', '2026-09-08 06:44:10.310', NULL, NULL, '2026-09-08 06:25:34.323', '2026-09-08 06:54:05.818', '2026-09-08 06:44:10.000', '2026-09-08 06:54:05.000'),
(85, 14, 19, '6285784618518', '{\"name\":\"Ula\"}', 'SENT', 'bf2a4c76-48c7-45a1-8006-e2e8c02f75f1', NULL, '2026-09-08 06:43:06.662', '2026-09-08 06:44:14.850', NULL, NULL, '2026-09-08 06:25:34.323', '2026-09-08 06:44:14.851', NULL, NULL),
(94, 15, 11, '62895418240605', '{\"name\":\"Dimas\"}', 'SENT', '50fb5032-a5a7-4dec-b1a7-82bff8954f71', NULL, '2026-09-08 06:49:09.735', '2026-09-08 06:49:11.537', NULL, NULL, '2026-09-08 06:47:28.355', '2026-09-08 06:54:05.903', '2026-09-08 06:49:12.000', '2026-09-08 06:54:05.000'),
(95, 15, 12, '6282230895298', '{\"name\":\"Syafri\"}', 'SENT', 'c200d229-bdf8-4094-b3d2-9c903afd5c2e', NULL, '2026-09-08 06:49:09.749', '2026-09-08 06:49:15.761', NULL, NULL, '2026-09-08 06:47:28.355', '2026-09-08 06:51:21.189', '2026-09-08 06:51:21.000', NULL),
(96, 15, 13, '6285732010265', '{\"name\":\"Arifin\"}', 'SENT', '29908852-c1ef-4327-8d71-ca52efe09f45', NULL, '2026-09-08 06:49:09.761', '2026-09-08 06:49:20.637', NULL, NULL, '2026-09-08 06:47:28.355', '2026-09-08 06:49:21.282', '2026-09-08 06:49:21.000', NULL),
(97, 15, 14, '6283115772468', '{\"name\":\"Arinal\"}', 'SENT', '52e9ab63-7e00-4eaf-93ce-8c83216773c0', NULL, '2026-09-08 06:49:09.770', '2026-09-08 06:49:24.353', NULL, NULL, '2026-09-08 06:47:28.355', '2026-09-08 09:23:16.136', '2026-09-08 06:49:26.000', '2026-09-08 09:23:15.000'),
(98, 15, 15, '6285546268982', '{\"name\":\"Ilham\"}', 'SENT', 'f6faff17-80ff-4a5e-82c2-8c7e3ddf6605', NULL, '2026-09-08 06:49:09.779', '2026-09-08 06:49:28.434', NULL, NULL, '2026-09-08 06:47:28.355', '2026-09-08 06:49:29.028', '2026-09-08 06:49:28.000', NULL),
(99, 15, 16, '6287812068310', '{\"name\":\"Rangga\"}', 'SENT', '9d0541c5-9edd-4af5-a275-eb54a914ac74', NULL, '2026-09-08 06:49:09.788', '2026-09-08 06:49:33.923', NULL, NULL, '2026-09-08 06:47:28.355', '2026-09-09 01:46:31.070', '2026-09-08 06:49:34.000', '2026-09-08 10:21:41.000'),
(100, 15, 17, '628993706921', '{\"name\":\"Wira\"}', 'SENT', '75db0faa-465b-414e-b3f2-99eae65e9d1a', NULL, '2026-09-08 06:49:09.797', '2026-09-08 06:49:37.812', NULL, NULL, '2026-09-08 06:47:28.355', '2026-09-08 06:54:05.805', '2026-09-08 06:49:38.000', '2026-09-08 06:54:05.000'),
(101, 15, 19, '6285784618518', '{\"name\":\"Ula\"}', 'SENT', 'c3a81909-c860-437b-be24-77842cbebb60', NULL, '2026-09-08 06:49:09.806', '2026-09-08 06:49:42.439', NULL, NULL, '2026-09-08 06:47:28.355', '2026-09-08 06:49:42.440', NULL, NULL),
(142, 17, 11, '62895418240605', '{}', 'SKIPPED', NULL, 'MISSING_TEMPLATE_VARIABLE', NULL, NULL, NULL, '2026-09-08 09:57:12.824', '2026-09-08 09:55:54.655', '2026-09-08 09:57:12.825', NULL, NULL),
(143, 17, 12, '6282230895298', '{}', 'SKIPPED', NULL, 'MISSING_TEMPLATE_VARIABLE', NULL, NULL, NULL, '2026-09-08 09:57:12.824', '2026-09-08 09:55:54.655', '2026-09-08 09:57:12.825', NULL, NULL),
(144, 17, 13, '6285732010265', '{}', 'SKIPPED', NULL, 'MISSING_TEMPLATE_VARIABLE', NULL, NULL, NULL, '2026-09-08 09:57:12.824', '2026-09-08 09:55:54.655', '2026-09-08 09:57:12.825', NULL, NULL),
(145, 17, 14, '6283115772468', '{}', 'SKIPPED', NULL, 'MISSING_TEMPLATE_VARIABLE', NULL, NULL, NULL, '2026-09-08 09:57:12.824', '2026-09-08 09:55:54.655', '2026-09-08 09:57:12.825', NULL, NULL),
(146, 17, 15, '6285546268982', '{}', 'SKIPPED', NULL, 'MISSING_TEMPLATE_VARIABLE', NULL, NULL, NULL, '2026-09-08 09:57:12.824', '2026-09-08 09:55:54.655', '2026-09-08 09:57:12.825', NULL, NULL),
(147, 17, 16, '6287812068310', '{}', 'SKIPPED', NULL, 'MISSING_TEMPLATE_VARIABLE', NULL, NULL, NULL, '2026-09-08 09:57:12.824', '2026-09-08 09:55:54.655', '2026-09-08 09:57:12.825', NULL, NULL),
(148, 17, 17, '628993706921', '{}', 'SKIPPED', NULL, 'MISSING_TEMPLATE_VARIABLE', NULL, NULL, NULL, '2026-09-08 09:57:12.824', '2026-09-08 09:55:54.655', '2026-09-08 09:57:12.825', NULL, NULL),
(149, 17, 19, '6285784618518', '{}', 'SKIPPED', NULL, 'MISSING_TEMPLATE_VARIABLE', NULL, NULL, NULL, '2026-09-08 09:57:12.824', '2026-09-08 09:55:54.655', '2026-09-08 09:57:12.825', NULL, NULL),
(174, 18, 11, '62895418240605', '{\"name\":\"Dimas\"}', 'SENT', 'c3273e21-4bb3-4fb1-a1d7-19628ea55df4', NULL, '2026-09-08 10:11:17.410', '2026-09-08 10:11:24.570', NULL, NULL, '2026-09-08 10:09:17.377', '2026-09-09 01:46:31.027', '2026-09-08 10:11:36.000', '2026-09-08 10:15:14.000'),
(175, 18, 12, '6282230895298', '{\"name\":\"Syafri\"}', 'SENT', 'e087261a-5b4d-4b89-a9cf-f43fed1dfc78', NULL, '2026-09-08 10:11:17.427', '2026-09-08 10:11:32.465', NULL, NULL, '2026-09-08 10:09:17.377', '2026-09-08 10:12:43.654', '2026-09-08 10:12:43.000', NULL),
(176, 18, 13, '6285732010265', '{\"name\":\"Arifin\"}', 'SENT', '562193ae-8430-4962-bcc5-75997fc39ff9', NULL, '2026-09-08 10:11:17.437', '2026-09-08 10:11:40.715', NULL, NULL, '2026-09-08 10:09:17.377', '2026-09-08 10:11:42.745', '2026-09-08 10:11:42.000', NULL),
(177, 18, 14, '6283115772468', '{\"name\":\"Arinal\"}', 'SENT', '10d91e9d-1a9b-40d4-b208-20a943beef02', NULL, '2026-09-08 10:11:17.448', '2026-09-08 10:11:48.600', NULL, NULL, '2026-09-08 10:09:17.377', '2026-09-09 01:46:31.047', '2026-09-08 10:11:51.000', '2026-09-08 10:21:24.000'),
(178, 18, 15, '6285546268982', '{\"name\":\"Ilham\"}', 'SENT', 'f9d2c86d-0cb9-40df-b9fa-57eb0dd71de6', NULL, '2026-09-08 10:11:17.457', '2026-09-08 10:11:58.069', NULL, NULL, '2026-09-08 10:09:17.377', '2026-09-08 10:11:58.904', '2026-09-08 10:11:58.000', NULL),
(179, 18, 16, '6287812068310', '{\"name\":\"Rangga\"}', 'SENT', '462f9d44-3182-40b3-93ea-3f8b4d55d019', NULL, '2026-09-08 10:11:17.466', '2026-09-08 10:12:06.887', NULL, NULL, '2026-09-08 10:09:17.377', '2026-09-09 01:46:31.060', '2026-09-08 10:12:07.000', '2026-09-08 10:21:41.000'),
(180, 18, 17, '628993706921', '{\"name\":\"Wira\"}', 'SENT', 'dc09a670-9e20-43fa-918e-6000010873de', NULL, '2026-09-08 10:11:17.475', '2026-09-08 10:12:16.164', NULL, NULL, '2026-09-08 10:09:17.377', '2026-09-09 01:46:31.010', '2026-09-08 10:12:16.000', '2026-09-08 10:15:54.000'),
(181, 18, 19, '6285784618518', '{\"name\":\"Ula\"}', 'SENT', 'd0970448-a735-40a5-ae56-9b412985264a', NULL, '2026-09-08 10:11:17.484', '2026-09-08 10:12:23.944', NULL, NULL, '2026-09-08 10:09:17.377', '2026-09-08 10:12:23.945', NULL, NULL),
(182, 21, 11, '62895418240605', '{\"name\":\"Dimas\"}', 'SENT', '84ce804b-c9b3-474b-99f1-b68ebb53116e', NULL, '2026-09-09 02:14:24.423', '2026-09-09 02:14:26.707', NULL, NULL, '2026-09-09 02:14:24.364', '2026-09-09 07:32:33.269', '2026-09-09 02:14:27.000', '2026-09-09 06:30:46.000'),
(183, 21, 12, '6282230895298', '{\"name\":\"Syafri\"}', 'SENT', 'b7c3dee0-a0f9-45c1-b0fd-9313db173bd4', NULL, '2026-09-09 02:14:24.452', '2026-09-09 02:14:32.025', NULL, NULL, '2026-09-09 02:14:24.364', '2026-09-09 02:15:13.330', '2026-09-09 02:15:13.000', NULL),
(184, 21, 13, '6285732010265', '{\"name\":\"Arifin\"}', 'SENT', 'ed615694-971e-4e96-afdd-8c5a3c29f42e', NULL, '2026-09-09 02:14:24.466', '2026-09-09 02:14:37.538', NULL, NULL, '2026-09-09 02:14:24.364', '2026-09-09 02:14:44.102', '2026-09-09 02:14:44.000', NULL),
(185, 21, 14, '6283115772468', '{\"name\":\"Arinal\"}', 'SENT', '49cd825e-cabc-4499-aeb5-81db8c12ab6d', NULL, '2026-09-09 02:14:24.477', '2026-09-09 02:14:41.254', NULL, NULL, '2026-09-09 02:14:24.364', '2026-09-09 02:14:43.120', '2026-09-09 02:14:43.000', NULL),
(186, 21, 15, '6285546268982', '{\"name\":\"Ilham\"}', 'SENT', 'b0274746-d7b6-4260-9777-5b61e8ff65b5', NULL, '2026-09-09 02:14:24.495', '2026-09-09 02:14:47.267', NULL, NULL, '2026-09-09 02:14:24.364', '2026-09-09 02:14:48.170', '2026-09-09 02:14:48.000', NULL),
(187, 21, 16, '6287812068310', '{\"name\":\"Rangga\"}', 'SENT', '80bb9c33-cd35-4fc9-acee-3c70b1066d15', NULL, '2026-09-09 02:14:24.512', '2026-09-09 02:14:52.911', NULL, NULL, '2026-09-09 02:14:24.364', '2026-09-09 08:35:00.129', '2026-09-09 02:14:53.000', '2026-09-09 08:34:59.000'),
(188, 21, 17, '628993706921', '{\"name\":\"Wira\"}', 'SENT', '2ef4d418-7e7e-4ecd-b180-b8151602c945', NULL, '2026-09-09 02:14:24.536', '2026-09-09 02:14:57.416', NULL, NULL, '2026-09-09 02:14:24.364', '2026-09-09 02:23:53.885', '2026-09-09 02:14:58.000', '2026-09-09 02:23:53.000'),
(189, 21, 19, '6285784618518', '{\"name\":\"Ula\"}', 'SENT', 'b9c06680-7ec3-4643-bf46-aeb42dab7d85', NULL, '2026-09-09 02:14:24.550', '2026-09-09 02:15:00.680', NULL, NULL, '2026-09-09 02:14:24.364', '2026-09-09 02:15:00.681', NULL, NULL),
(198, 22, 11, '62895418240605', '{\"name\":\"Dimas\"}', 'SENT', '394360c7-32ff-43dd-824f-7bacef4ec19c', NULL, '2026-09-09 02:50:08.338', '2026-09-09 02:50:10.179', NULL, NULL, '2026-09-09 02:48:56.919', '2026-09-09 03:35:32.264', '2026-09-09 02:50:10.000', '2026-09-09 03:35:32.000'),
(199, 22, 12, '6282230895298', '{\"name\":\"Syafri\"}', 'SENT', '6672fca9-1ad4-425f-92c6-3cb9b2147310', NULL, '2026-09-09 02:50:08.364', '2026-09-09 02:50:13.658', NULL, NULL, '2026-09-09 02:48:56.919', '2026-09-09 02:50:22.386', '2026-09-09 02:50:22.000', NULL),
(200, 22, 13, '6285732010265', '{\"name\":\"Arifin\"}', 'SENT', '14de81de-7e9a-4ed5-bcac-abbd6ca67d41', NULL, '2026-09-09 02:50:08.378', '2026-09-09 02:50:18.805', NULL, NULL, '2026-09-09 02:48:56.919', '2026-09-09 02:50:20.902', '2026-09-09 02:50:20.000', NULL),
(201, 22, 14, '6283115772468', '{\"name\":\"Arinal\"}', 'SENT', '2e7fc76e-da0d-49bf-9ab6-fb7bb9858ae1', NULL, '2026-09-09 02:50:08.392', '2026-09-09 02:50:22.660', NULL, NULL, '2026-09-09 02:48:56.919', '2026-09-09 02:50:25.977', '2026-09-09 02:50:25.000', NULL),
(202, 22, 15, '6285546268982', '{\"name\":\"Ilham\"}', 'SENT', '65674529-487a-45fc-afa4-8c9cb6f621ee', NULL, '2026-09-09 02:50:08.408', '2026-09-09 02:50:25.998', NULL, NULL, '2026-09-09 02:48:56.919', '2026-09-09 02:50:29.139', '2026-09-09 02:50:29.000', NULL),
(203, 22, 16, '6287812068310', '{\"name\":\"Rangga\"}', 'SENT', '3e9c07b1-63b5-4f86-bb38-d937798ef5d5', NULL, '2026-09-09 02:50:08.423', '2026-09-09 02:50:29.722', NULL, NULL, '2026-09-09 02:48:56.919', '2026-09-09 08:35:00.119', '2026-09-09 02:50:31.000', '2026-09-09 08:34:59.000'),
(204, 22, 17, '628993706921', '{\"name\":\"Wira\"}', 'SENT', 'c03bdb4f-05eb-4704-860d-88d9bbf201a8', NULL, '2026-09-09 02:50:08.435', '2026-09-09 02:50:34.836', NULL, NULL, '2026-09-09 02:48:56.919', '2026-09-09 02:50:43.795', '2026-09-09 02:50:35.000', '2026-09-09 02:50:43.000'),
(205, 22, 19, '6285784618518', '{\"name\":\"Ula\"}', 'SENT', 'e51675ed-20b3-4852-9f6f-0af49bf6c11a', NULL, '2026-09-09 02:50:08.446', '2026-09-09 02:50:39.526', NULL, NULL, '2026-09-09 02:48:56.919', '2026-09-09 02:50:39.528', NULL, NULL),
(214, 23, 11, '62895418240605', '{\"name\":\"Dimas\"}', 'SENT', '8e136f8f-0e8e-44a1-84bb-79658db6fbf5', NULL, '2026-09-09 05:34:33.245', '2026-09-09 05:34:34.797', NULL, NULL, '2026-09-09 05:34:33.202', '2026-09-09 07:32:33.256', '2026-09-09 05:34:35.000', '2026-09-09 06:30:46.000'),
(215, 23, 12, '6282230895298', '{\"name\":\"Syafri\"}', 'SENT', 'ebd46b7f-71e5-4e59-8e93-9929e7e3a30c', NULL, '2026-09-09 05:34:33.262', '2026-09-09 05:34:38.603', NULL, NULL, '2026-09-09 05:34:33.202', '2026-09-09 05:34:39.883', '2026-09-09 05:34:39.000', NULL),
(216, 23, 13, '6285732010265', '{\"name\":\"Arifin\"}', 'SENT', 'c69411ca-ada8-4788-b878-a875026a00a9', NULL, '2026-09-09 05:34:33.578', '2026-09-09 05:34:43.836', NULL, NULL, '2026-09-09 05:34:33.202', '2026-09-09 05:34:44.520', '2026-09-09 05:34:44.000', NULL),
(217, 23, 14, '6283115772468', '{\"name\":\"Arinal\"}', 'SENT', '19225309-956c-4c1a-8e16-e16393a878d1', NULL, '2026-09-09 05:34:33.591', '2026-09-09 05:34:47.404', NULL, NULL, '2026-09-09 05:34:33.202', '2026-09-09 05:34:50.321', '2026-09-09 05:34:50.000', NULL),
(218, 23, 15, '6285546268982', '{\"name\":\"Ilham\"}', 'SENT', '7f6d08a2-7df2-47ef-aecf-84f30f92362a', NULL, '2026-09-09 05:34:33.604', '2026-09-09 05:34:50.859', NULL, NULL, '2026-09-09 05:34:33.202', '2026-09-09 05:34:51.456', '2026-09-09 05:34:51.000', NULL),
(219, 23, 16, '6287812068310', '{\"name\":\"Rangga\"}', 'SENT', 'a68d9949-1516-4b88-9b28-9a1b0d007e52', NULL, '2026-09-09 05:34:33.627', '2026-09-09 05:34:54.396', NULL, NULL, '2026-09-09 05:34:33.202', '2026-09-09 08:35:00.109', '2026-09-09 06:02:46.000', '2026-09-09 08:34:59.000'),
(220, 23, 17, '628993706921', '{\"name\":\"Wira\"}', 'SENT', 'ace6f736-53bc-4fd2-9831-7766f9486d3a', NULL, '2026-09-09 05:34:33.637', '2026-09-09 05:34:57.006', NULL, NULL, '2026-09-09 05:34:33.202', '2026-09-09 06:21:56.575', '2026-09-09 05:34:57.000', '2026-09-09 06:21:56.000'),
(221, 23, 19, '6285784618518', '{\"name\":\"Ula\"}', 'SENT', '12abfcd1-73ff-4871-a51f-465b98952794', NULL, '2026-09-09 05:34:33.646', '2026-09-09 05:34:59.782', NULL, NULL, '2026-09-09 05:34:33.202', '2026-09-09 05:34:59.783', NULL, NULL),
(262, 24, 11, '62895418240605', '{\"name\":\"Dimas\"}', 'SENT', '3a8c806e-2f24-4613-b355-5ffb8df37c74', NULL, '2026-09-09 06:17:36.464', '2026-09-09 06:17:39.052', NULL, NULL, '2026-09-09 06:17:36.434', '2026-09-09 07:32:33.241', '2026-09-09 06:17:39.000', '2026-09-09 06:30:46.000'),
(263, 24, 12, '6282230895298', '{\"name\":\"Syafri\"}', 'SENT', 'c55bdf77-31e5-4318-b248-d1a191f73691', NULL, '2026-09-09 06:17:36.478', '2026-09-09 06:17:44.291', NULL, NULL, '2026-09-09 06:17:36.434', '2026-09-09 06:18:24.994', '2026-09-09 06:18:24.000', NULL),
(264, 24, 13, '6285732010265', '{\"name\":\"Arifin\"}', 'SENT', '3e8511c8-464b-4068-83a5-6fe305e41140', NULL, '2026-09-09 06:17:36.603', '2026-09-09 06:17:48.674', NULL, NULL, '2026-09-09 06:17:36.434', '2026-09-09 06:17:50.601', '2026-09-09 06:17:50.000', NULL),
(265, 24, 14, '6283115772468', '{\"name\":\"Arinal\"}', 'SENT', 'd5644cbb-3163-40e9-8128-0f4637cbc3dd', NULL, '2026-09-09 06:17:36.620', '2026-09-09 06:17:54.126', NULL, NULL, '2026-09-09 06:17:36.434', '2026-09-09 06:17:57.875', '2026-09-09 06:17:57.000', NULL),
(266, 24, 15, '6285546268982', '{\"name\":\"Ilham\"}', 'SENT', '5c12c2ee-bf5b-49b1-ae5f-dd2480af02b3', NULL, '2026-09-09 06:17:36.632', '2026-09-09 06:17:57.711', NULL, NULL, '2026-09-09 06:17:36.434', '2026-09-09 06:18:00.206', '2026-09-09 06:18:00.000', NULL),
(267, 24, 16, '6287812068310', '{\"name\":\"Rangga\"}', 'SENT', '9d5d3601-c467-4d33-82eb-c128fd8acaf1', NULL, '2026-09-09 06:17:36.641', '2026-09-09 06:18:02.306', NULL, NULL, '2026-09-09 06:17:36.434', '2026-09-09 08:35:00.098', '2026-09-09 06:18:03.000', '2026-09-09 08:34:59.000'),
(268, 24, 17, '628993706921', '{\"name\":\"Wira\"}', 'SENT', '455d4ea9-2940-46b3-bd46-a1a2a92669cc', NULL, '2026-09-09 06:17:36.649', '2026-09-09 06:18:07.090', NULL, NULL, '2026-09-09 06:17:36.434', '2026-09-09 06:21:56.565', '2026-09-09 06:18:09.000', '2026-09-09 06:21:56.000'),
(269, 24, 19, '6285784618518', '{\"name\":\"Ula\"}', 'SENT', '94917415-28e2-4311-85f2-c106d83701f1', NULL, '2026-09-09 06:17:36.657', '2026-09-09 06:18:09.564', NULL, NULL, '2026-09-09 06:17:36.434', '2026-09-09 06:18:09.565', NULL, NULL),
(278, 25, 11, '62895418240605', '{\"name\":\"Dimas\"}', 'SENT', 'f924e476-d51f-447b-8fb6-1ca41c75d5db', NULL, '2026-09-09 07:33:24.291', '2026-09-09 07:33:26.178', NULL, NULL, '2026-09-09 07:33:24.248', '2026-09-09 07:38:57.982', '2026-09-09 07:33:26.000', '2026-09-09 07:38:57.000'),
(279, 25, 12, '6282230895298', '{\"name\":\"Syafri\"}', 'FAILED', '26b112d7-9c4c-40da-95eb-3bb2bdddf5da', NULL, '2026-09-09 07:33:24.309', NULL, '2026-09-09 07:33:28.450', NULL, '2026-09-09 07:33:24.248', '2026-09-09 07:33:28.452', NULL, NULL),
(280, 25, 13, '6285732010265', '{\"name\":\"Arifin\"}', 'FAILED', '5bf1c63c-f3d2-4856-81f7-0b1ab2ac45bd', NULL, '2026-09-09 07:33:24.330', NULL, '2026-09-09 07:33:28.467', NULL, '2026-09-09 07:33:24.248', '2026-09-09 07:33:28.469', NULL, NULL),
(281, 25, 14, '6283115772468', '{\"name\":\"Arinal\"}', 'FAILED', 'ea358414-b9c4-4507-be3e-8455e334e08e', NULL, '2026-09-09 07:33:24.348', NULL, '2026-09-09 07:33:28.483', NULL, '2026-09-09 07:33:24.248', '2026-09-09 07:33:28.484', NULL, NULL),
(282, 25, 15, '6285546268982', '{\"name\":\"Ilham\"}', 'FAILED', '407b1746-2c9b-4177-8cda-da233ebaed65', NULL, '2026-09-09 07:33:24.360', NULL, '2026-09-09 07:33:28.499', NULL, '2026-09-09 07:33:24.248', '2026-09-09 07:33:28.500', NULL, NULL),
(283, 25, 16, '6287812068310', '{\"name\":\"Rangga\"}', 'FAILED', '34d37bf9-4fb5-4ca4-aff3-3e457b1dd547', NULL, '2026-09-09 07:33:24.370', NULL, '2026-09-09 07:33:28.517', NULL, '2026-09-09 07:33:24.248', '2026-09-09 07:33:28.519', NULL, NULL),
(284, 25, 17, '628993706921', '{\"name\":\"Wira\"}', 'FAILED', '9e9fb0cc-e6df-462b-b363-2dec8ae88e67', NULL, '2026-09-09 07:33:24.382', NULL, '2026-09-09 07:33:28.540', NULL, '2026-09-09 07:33:24.248', '2026-09-09 07:33:28.541', NULL, NULL),
(285, 25, 19, '6285784618518', '{\"name\":\"Ula\"}', 'SENT', '01b26fe1-3703-49a4-b338-486c452c20e2', NULL, '2026-09-09 07:33:24.393', '2026-09-09 07:52:06.723', '2026-09-09 07:33:28.554', NULL, '2026-09-09 07:33:24.248', '2026-09-09 07:52:06.724', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `campaign_targets`
--

CREATE TABLE `campaign_targets` (
  `id` int(11) NOT NULL,
  `campaignId` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `campaign_targets`
--

INSERT INTO `campaign_targets` (`id`, `campaignId`) VALUES
(14, 13),
(16, 14),
(18, 15),
(24, 17),
(28, 18),
(29, 21),
(31, 22),
(33, 23),
(39, 24),
(41, 25);

-- --------------------------------------------------------

--
-- Table structure for table `contacts`
--

CREATE TABLE `contacts` (
  `id` int(11) NOT NULL,
  `idpel` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `phone` varchar(191) NOT NULL,
  `email` varchar(191) DEFAULT NULL,
  `customer_type` varchar(191) DEFAULT NULL,
  `tariff` varchar(191) DEFAULT NULL,
  `power` int(11) DEFAULT NULL,
  `region` varchar(191) DEFAULT NULL,
  `ulp` varchar(191) DEFAULT NULL,
  `last_contact_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `contacts`
--

INSERT INTO `contacts` (`id`, `idpel`, `name`, `phone`, `email`, `customer_type`, `tariff`, `power`, `region`, `ulp`, `last_contact_at`, `created_at`, `updated_at`) VALUES
(11, '123458100001', 'Dimas', '62895418240605', 'dimas@example.com', 'Residential', 'R1', NULL, 'Surabaya', 'Surabaya Timur', NULL, '2026-09-07 09:49:19.846', '2026-09-07 09:49:19.846'),
(12, '123458100002', 'Syafri', '6282230895298', 'syafri@example.com', 'Residential', 'R1', NULL, 'Jakarta', 'Matraman', NULL, '2026-09-07 09:49:19.866', '2026-09-07 09:49:19.866'),
(13, '123458100003', 'Arifin', '6285732010265', 'arifin@example.com', 'Residential', 'R1', NULL, 'Bandung', 'Bandung Utara', NULL, '2026-09-07 09:49:19.876', '2026-09-07 09:49:19.876'),
(14, '123458100004', 'Arinal', '6283115772468', 'arinal@example.com', 'Residential', 'R1', NULL, 'Surabaya', 'Surabaya Selatan', NULL, '2026-09-07 09:49:19.884', '2026-09-07 09:49:19.884'),
(15, '123458100005', 'Ilham', '6285546268982', 'ilham@example.com', 'Residential', 'R2', NULL, 'Jakarta', 'Gambir', NULL, '2026-09-07 09:49:19.893', '2026-09-07 09:49:19.893'),
(16, '123458100006', 'Rangga', '6287812068310', 'rangga@example.com', 'Residential', 'R1', NULL, 'Bandung', 'Bandung Barat', NULL, '2026-09-07 09:49:19.898', '2026-09-07 09:49:19.898'),
(17, '123458100007', 'Wira', '628993706921', 'wira@example.com', 'Residential', 'R1', NULL, 'Surabaya', 'Surabaya Utara', NULL, '2026-09-07 09:49:19.902', '2026-09-07 09:49:19.902'),
(19, '110099887766', 'Ula', '6285784618518', 'aacha66@gmail.com', 'Residential', 'B2', 4400, 'Surabaya', 'Manyar', NULL, '2026-09-08 04:40:57.453', '2026-09-08 04:40:57.453');

-- --------------------------------------------------------

--
-- Table structure for table `contact_group`
--

CREATE TABLE `contact_group` (
  `id` int(11) NOT NULL,
  `contact_id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `contact_group`
--

INSERT INTO `contact_group` (`id`, `contact_id`, `group_id`, `created_at`, `updated_at`) VALUES
(14, 11, 1, '2026-09-07 09:49:19.864', '2026-09-07 09:49:19.864'),
(15, 11, 6, '2026-09-07 09:49:19.864', '2026-09-07 09:49:19.864'),
(16, 11, 3, '2026-09-07 09:49:19.864', '2026-09-07 09:49:19.864'),
(17, 12, 1, '2026-09-07 09:49:19.875', '2026-09-07 09:49:19.875'),
(18, 12, 2, '2026-09-07 09:49:19.875', '2026-09-07 09:49:19.875'),
(19, 12, 3, '2026-09-07 09:49:19.875', '2026-09-07 09:49:19.875'),
(20, 13, 1, '2026-09-07 09:49:19.882', '2026-09-07 09:49:19.882'),
(21, 13, 7, '2026-09-07 09:49:19.882', '2026-09-07 09:49:19.882'),
(22, 13, 3, '2026-09-07 09:49:19.882', '2026-09-07 09:49:19.882'),
(23, 14, 1, '2026-09-07 09:49:19.891', '2026-09-07 09:49:19.891'),
(24, 14, 6, '2026-09-07 09:49:19.891', '2026-09-07 09:49:19.891'),
(25, 14, 3, '2026-09-07 09:49:19.891', '2026-09-07 09:49:19.891'),
(26, 15, 1, '2026-09-07 09:49:19.896', '2026-09-07 09:49:19.896'),
(27, 15, 2, '2026-09-07 09:49:19.896', '2026-09-07 09:49:19.896'),
(28, 15, 3, '2026-09-07 09:49:19.896', '2026-09-07 09:49:19.896'),
(29, 16, 1, '2026-09-07 09:49:19.901', '2026-09-07 09:49:19.901'),
(30, 16, 7, '2026-09-07 09:49:19.901', '2026-09-07 09:49:19.901'),
(31, 16, 3, '2026-09-07 09:49:19.901', '2026-09-07 09:49:19.901'),
(32, 17, 1, '2026-09-07 09:49:19.913', '2026-09-07 09:49:19.913'),
(33, 17, 6, '2026-09-07 09:49:19.913', '2026-09-07 09:49:19.913'),
(34, 17, 3, '2026-09-07 09:49:19.913', '2026-09-07 09:49:19.913'),
(39, 19, 1, '2026-09-08 04:40:57.466', '2026-09-08 04:40:57.466');

-- --------------------------------------------------------

--
-- Table structure for table `groups`
--

CREATE TABLE `groups` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `color` varchar(191) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `groups`
--

INSERT INTO `groups` (`id`, `name`, `slug`, `description`, `color`, `created_at`, `updated_at`) VALUES
(1, 'Customers', 'customers', NULL, NULL, '2026-09-07 07:06:38.557', '2026-09-07 07:06:38.557'),
(2, 'Jakarta', 'jakarta', NULL, NULL, '2026-09-07 07:06:38.561', '2026-09-07 07:06:38.561'),
(3, 'Residential', 'residential', NULL, NULL, '2026-09-07 07:06:38.566', '2026-09-07 07:06:38.566'),
(6, 'Surabaya', 'surabaya', NULL, NULL, '2026-09-07 09:49:19.857', '2026-09-07 09:49:19.857'),
(7, 'Bandung', 'bandung', NULL, NULL, '2026-09-07 09:49:19.879', '2026-09-07 09:49:19.879');

-- --------------------------------------------------------

--
-- Table structure for table `templates`
--

CREATE TABLE `templates` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `code` varchar(191) NOT NULL,
  `category` varchar(191) NOT NULL,
  `language` varchar(191) NOT NULL,
  `content` varchar(191) NOT NULL,
  `variables` varchar(191) DEFAULT NULL,
  `usage_count` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `templates`
--

INSERT INTO `templates` (`id`, `name`, `code`, `category`, `language`, `content`, `variables`, `usage_count`, `created_at`, `updated_at`) VALUES
(1, 'coba reminder', 'TPL-001', 'Reminder', 'id', '⚡ Yuk, Bayar Listrik Tepat Waktu! ⚡\n\nJangan sampai kenyamanan di rumah terganggu karena lupa bayar listrik. 😊\n\n💡 Bayar tagihan listrik sebelum tanggal 20 setiap bulan agar terhindar dari dend', '[]', 0, '2026-09-07 07:07:33.373', '2026-09-07 07:07:33.373'),
(2, 'coba', 'TPL-002', 'Informational', 'id', 'Halooo {{name}}', '[\"name\"]', 0, '2026-09-08 03:06:18.839', '2026-09-08 03:48:38.464');

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password` varchar(191) NOT NULL,
  `role` varchar(191) NOT NULL DEFAULT 'admin',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `lastLogin` datetime(3) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`id`, `name`, `email`, `password`, `role`, `createdAt`, `updatedAt`, `lastLogin`, `status`) VALUES
(2, 'Admin', 'admin@example.com', '$2b$10$JIj4LoFG6fYrw.1x/t1bIezwWt94TIzl37p0XaRizmKyZey/mR4QG', 'admin', '2026-09-07 06:43:02.318', '2026-09-10 06:51:50.317', NULL, 'Active'),
(3, 'John Prakoso', 'john@blast.io', '$2b$10$qCcTlFLy.5bn.ac7rhTg..5IZHi9rC9F/2Rmh5DMKQLH2Rh2Vtxq6', 'superadmin', '2026-09-08 09:44:58.087', '2026-09-10 06:51:50.325', '2026-08-31 08:00:00.000', 'Active'),
(4, 'Sarah Wijayanti', 'sarah@blast.io', '$2b$10$qCcTlFLy.5bn.ac7rhTg..5IZHi9rC9F/2Rmh5DMKQLH2Rh2Vtxq6', 'admin', '2026-09-08 09:44:58.094', '2026-09-10 06:51:50.331', '2026-08-31 07:45:00.000', 'Active'),
(5, 'Ryan Nugroho', 'ryan@blast.io', '$2b$10$qCcTlFLy.5bn.ac7rhTg..5IZHi9rC9F/2Rmh5DMKQLH2Rh2Vtxq6', 'manager', '2026-09-08 09:44:58.097', '2026-09-10 06:51:50.338', '2026-08-30 16:20:00.000', 'Active'),
(6, 'Dita Prameswari', 'dita@blast.io', '$2b$10$qCcTlFLy.5bn.ac7rhTg..5IZHi9rC9F/2Rmh5DMKQLH2Rh2Vtxq6', 'operator', '2026-09-08 09:44:58.101', '2026-09-10 06:51:50.343', '2026-08-30 12:10:00.000', 'Active'),
(9, 'coba', 'coba@gmail.com', '$2b$10$2ND6Vy4rjLHqzGfqDGXwneVsAeq4hEWtFgcnUhFG3vOmBfzNovwI.', 'operator', '2026-09-09 03:31:02.112', '2026-09-09 03:31:02.112', NULL, 'Active'),
(10, 'Super Admin', 'superadmin@example.com', '$2b$10$JIj4LoFG6fYrw.1x/t1bIezwWt94TIzl37p0XaRizmKyZey/mR4QG', 'superadmin', '2026-09-10 06:51:50.306', '2026-09-10 06:51:50.306', NULL, 'Active'),
(11, 'Agus Salim', 'agus@blast.io', '$2b$10$JIj4LoFG6fYrw.1x/t1bIezwWt94TIzl37p0XaRizmKyZey/mR4QG', 'operator', '2026-09-10 06:51:50.350', '2026-09-10 06:51:50.350', NULL, 'Invited'),
(12, 'Maya Lestari', 'maya@blast.io', '$2b$10$JIj4LoFG6fYrw.1x/t1bIezwWt94TIzl37p0XaRizmKyZey/mR4QG', 'viewer', '2026-09-10 06:51:50.359', '2026-09-10 06:51:50.359', '2026-07-15 09:00:00.000', 'Disabled');

-- --------------------------------------------------------

--
-- Table structure for table `whatsapp_accounts`
--

CREATE TABLE `whatsapp_accounts` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `phone` varchar(191) DEFAULT NULL,
  `status` enum('DISCONNECTED','CONNECTING','CONNECTED','LOGGED_OUT') NOT NULL DEFAULT 'DISCONNECTED',
  `isDefault` tinyint(1) NOT NULL DEFAULT 0,
  `lastConnectedAt` datetime(3) DEFAULT NULL,
  `lastDisconnectedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `whatsapp_accounts`
--

INSERT INTO `whatsapp_accounts` (`id`, `name`, `phone`, `status`, `isDefault`, `lastConnectedAt`, `lastDisconnectedAt`, `createdAt`, `updatedAt`) VALUES
('1967c4b9-7558-4c7a-8a21-8d1a5d254259', 'Socket Smoke', '6285784618518', 'CONNECTED', 0, '2026-09-11 06:26:54.866', '2026-09-10 09:57:30.470', '2026-09-07 09:03:33.371', '2026-09-11 06:26:54.888');

-- --------------------------------------------------------

--
-- Table structure for table `whatsapp_messages`
--

CREATE TABLE `whatsapp_messages` (
  `id` varchar(191) NOT NULL,
  `accountId` varchar(191) NOT NULL,
  `recipient` varchar(191) NOT NULL,
  `content` varchar(191) NOT NULL,
  `status` enum('PENDING','PROCESSING','SENT','FAILED') NOT NULL DEFAULT 'PENDING',
  `attempts` int(11) NOT NULL DEFAULT 0,
  `maxAttempts` int(11) NOT NULL DEFAULT 3,
  `lastError` varchar(191) DEFAULT NULL,
  `scheduledAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `processingStartedAt` datetime(3) DEFAULT NULL,
  `sentAt` datetime(3) DEFAULT NULL,
  `failedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `campaignId` int(11) DEFAULT NULL,
  `deliveredAt` datetime(3) DEFAULT NULL,
  `readAt` datetime(3) DEFAULT NULL,
  `waMessageId` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `whatsapp_messages`
--

INSERT INTO `whatsapp_messages` (`id`, `accountId`, `recipient`, `content`, `status`, `attempts`, `maxAttempts`, `lastError`, `scheduledAt`, `processingStartedAt`, `sentAt`, `failedAt`, `createdAt`, `updatedAt`, `campaignId`, `deliveredAt`, `readAt`, `waMessageId`) VALUES
('01b26fe1-3703-49a4-b338-486c452c20e2', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285784618518', 'Halooo Ula...', 'SENT', 0, 3, NULL, '2026-09-09 07:52:05.065', '2026-09-09 07:52:05.076', '2026-09-09 07:52:06.716', '2026-09-09 07:33:28.549', '2026-09-09 07:33:24.390', '2026-09-09 07:52:06.719', 25, NULL, NULL, '3EB0E8A8E12FA2C0066C92'),
('084b13c6-4ea1-4efc-808b-3d700ade671e', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6287812068310', 'Halooo Rangga coba bot 2', 'SENT', 0, 3, NULL, '2026-09-08 06:43:06.640', '2026-09-08 06:44:03.936', '2026-09-08 06:44:05.709', NULL, '2026-09-08 06:43:06.640', '2026-09-09 01:46:31.090', 14, '2026-09-08 06:44:06.000', '2026-09-08 10:21:41.000', '3EB0233BDA50143C517541'),
('0ccfaf90-fe2d-4280-80d5-350c35efeaa3', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285546268982', 'Halooo Ilham coba bot', 'SENT', 0, 3, NULL, '2026-09-08 06:43:06.526', '2026-09-08 06:43:24.195', '2026-09-08 06:43:26.699', NULL, '2026-09-08 06:43:06.526', '2026-09-08 06:43:31.679', 13, '2026-09-08 06:43:28.000', NULL, '3EB04269CBFB1C5998725E'),
('10d91e9d-1a9b-40d4-b208-20a943beef02', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6283115772468', '⚡ Yuk, Bayar Listrik Tepat Waktu! ⚡\n\nHalo Arinal. Jangan sampai kenyamanan di rumah terganggu karena lupa bayar listrik. 😊\n\n💡 Bayar tagihan listrik sebelum tanggal 20 setiap bulan agar terh', 'SENT', 0, 3, NULL, '2026-09-08 10:11:17.445', '2026-09-08 10:11:42.462', '2026-09-08 10:11:48.592', NULL, '2026-09-08 10:11:17.445', '2026-09-09 01:46:31.037', 18, '2026-09-08 10:11:51.000', '2026-09-08 10:21:24.000', '3EB0C9CB075F1A06AACC6A'),
('12abfcd1-73ff-4871-a51f-465b98952794', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285784618518', 'Selamat siang Ula. Jangan lupa makan siang.', 'SENT', 0, 3, NULL, '2026-09-09 05:34:33.644', '2026-09-09 05:34:59.278', '2026-09-09 05:34:59.776', NULL, '2026-09-09 05:34:33.644', '2026-09-09 05:34:59.777', 23, NULL, NULL, '3EB0E08B771A8CB4456F5D'),
('14de81de-7e9a-4ed5-bcac-abbd6ca67d41', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285732010265', 'Selamat pagi Arifin', 'SENT', 0, 3, NULL, '2026-09-09 02:50:08.375', '2026-09-09 02:50:17.069', '2026-09-09 02:50:18.761', NULL, '2026-09-09 02:50:08.375', '2026-09-09 02:50:20.891', 22, '2026-09-09 02:50:20.000', NULL, '3EB02E6E2DB9FADA8A1351'),
('19225309-956c-4c1a-8e16-e16393a878d1', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6283115772468', 'Selamat siang Arinal. Jangan lupa makan siang.', 'SENT', 0, 3, NULL, '2026-09-09 05:34:33.588', '2026-09-09 05:34:46.118', '2026-09-09 05:34:47.396', NULL, '2026-09-09 05:34:33.588', '2026-09-09 05:34:50.312', 23, '2026-09-09 05:34:50.000', NULL, '3EB0FB9D2E4BD43B54651F'),
('1c4bded3-5c12-4702-804b-81564f83d0e2', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '62895418240605', 'Halooo Dimas coba bot 2', 'SENT', 0, 3, NULL, '2026-09-08 06:43:06.595', '2026-09-08 06:43:41.312', '2026-09-08 06:43:42.983', NULL, '2026-09-08 06:43:06.595', '2026-09-08 06:54:05.909', 14, '2026-09-08 06:43:43.000', '2026-09-08 06:54:05.000', '3EB0FFBC69F1FE70594BBB'),
('26b112d7-9c4c-40da-95eb-3bb2bdddf5da', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6282230895298', 'Halooo Syafri...', 'FAILED', 1, 3, 'Message quota reached. Increase the monthly quota in Settings to send more.', '2026-09-09 07:33:24.303', '2026-09-09 07:33:28.436', NULL, '2026-09-09 07:33:28.444', '2026-09-09 07:33:24.303', '2026-09-09 07:33:28.446', 25, NULL, NULL, NULL),
('29908852-c1ef-4327-8d71-ca52efe09f45', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285732010265', 'Bismillah amann Arifin', 'SENT', 0, 3, NULL, '2026-09-08 06:49:09.758', '2026-09-08 06:49:19.110', '2026-09-08 06:49:20.628', NULL, '2026-09-08 06:49:09.758', '2026-09-08 06:49:21.274', 15, '2026-09-08 06:49:21.000', NULL, '3EB0F2C5FCD19EBBD7D95E'),
('2ccdfd8e-59a4-45de-8dc2-3395b85c1534', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285732010265', 'Halooo Arifin coba bot 2', 'SENT', 0, 3, NULL, '2026-09-08 06:43:06.614', '2026-09-08 06:43:49.302', '2026-09-08 06:43:51.036', NULL, '2026-09-08 06:43:06.614', '2026-09-08 06:43:51.735', 14, '2026-09-08 06:43:51.000', NULL, '3EB0451F5B498CD062671D'),
('2e7fc76e-da0d-49bf-9ab6-fb7bb9858ae1', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6283115772468', 'Selamat pagi Arinal', 'SENT', 0, 3, NULL, '2026-09-09 02:50:08.388', '2026-09-09 02:50:20.827', '2026-09-09 02:50:22.620', NULL, '2026-09-09 02:50:08.388', '2026-09-09 02:50:25.934', 22, '2026-09-09 02:50:25.000', NULL, '3EB0750876B7695073DC0D'),
('2ef4d418-7e7e-4ecd-b180-b8151602c945', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '628993706921', 'Halooo Wira...', 'SENT', 0, 3, NULL, '2026-09-09 02:14:24.533', '2026-09-09 02:14:55.225', '2026-09-09 02:14:57.407', NULL, '2026-09-09 02:14:24.533', '2026-09-09 02:23:53.843', 21, '2026-09-09 02:14:58.000', '2026-09-09 02:23:53.000', '3EB0D690507386E5BEDA9D'),
('34d37bf9-4fb5-4ca4-aff3-3e457b1dd547', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6287812068310', 'Halooo Rangga...', 'FAILED', 1, 3, 'Message quota reached. Increase the monthly quota in Settings to send more.', '2026-09-09 07:33:24.367', '2026-09-09 07:33:28.505', NULL, '2026-09-09 07:33:28.509', '2026-09-09 07:33:24.367', '2026-09-09 07:33:28.512', 25, NULL, NULL, NULL),
('394360c7-32ff-43dd-824f-7bacef4ec19c', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '62895418240605', 'Selamat pagi Dimas', 'SENT', 0, 3, NULL, '2026-09-09 02:50:08.330', '2026-09-09 02:50:08.350', '2026-09-09 02:50:10.159', NULL, '2026-09-09 02:50:08.330', '2026-09-09 03:35:32.254', 22, '2026-09-09 02:50:10.000', '2026-09-09 03:35:32.000', '3EB08E224853A92DB7B92F'),
('3a8c806e-2f24-4613-b355-5ffb8df37c74', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '62895418240605', 'Selamat siang Dimas. Jangan lupa makan siang.', 'SENT', 0, 3, NULL, '2026-09-09 06:17:36.461', '2026-09-09 06:17:36.472', '2026-09-09 06:17:39.043', NULL, '2026-09-09 06:17:36.461', '2026-09-09 07:32:33.230', 24, '2026-09-09 06:17:39.000', '2026-09-09 06:30:46.000', '3EB0C5F95A0E9A3229CE38'),
('3d58d4a3-66db-4165-94fe-0d77eb309442', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '628993706921', 'Halooo Wira coba bot 2', 'SENT', 0, 3, NULL, '2026-09-08 06:43:06.651', '2026-09-08 06:44:09.364', '2026-09-08 06:44:10.301', NULL, '2026-09-08 06:43:06.651', '2026-09-08 06:54:05.812', 14, '2026-09-08 06:44:10.000', '2026-09-08 06:54:05.000', '3EB0A32C065C7704F7B600'),
('3e8511c8-464b-4068-83a5-6fe305e41140', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285732010265', 'Selamat siang Arifin. Jangan lupa makan siang.', 'SENT', 0, 3, NULL, '2026-09-09 06:17:36.600', '2026-09-09 06:17:46.814', '2026-09-09 06:17:48.669', NULL, '2026-09-09 06:17:36.600', '2026-09-09 06:17:50.593', 24, '2026-09-09 06:17:50.000', NULL, '3EB0D3473517B7D86EDD6F'),
('3e9c07b1-63b5-4f86-bb38-d937798ef5d5', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6287812068310', 'Selamat pagi Rangga', 'SENT', 0, 3, NULL, '2026-09-09 02:50:08.419', '2026-09-09 02:50:27.944', '2026-09-09 02:50:29.678', NULL, '2026-09-09 02:50:08.419', '2026-09-09 08:35:00.115', 22, '2026-09-09 02:50:31.000', '2026-09-09 08:34:59.000', '3EB001E97F8E2B68C06A21'),
('3f47adba-a635-45f9-bf3a-513def9aced6', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6283115772468', 'Halooo Arinal coba bot 2', 'SENT', 0, 3, NULL, '2026-09-08 06:43:06.623', '2026-09-08 06:43:52.663', '2026-09-08 06:43:54.323', NULL, '2026-09-08 06:43:06.623', '2026-09-08 09:23:16.120', 14, '2026-09-08 06:43:55.000', '2026-09-08 09:23:15.000', '3EB0E25C6C5E1D7A091448'),
('407b1746-2c9b-4177-8cda-da233ebaed65', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285546268982', 'Halooo Ilham...', 'FAILED', 1, 3, 'Message quota reached. Increase the monthly quota in Settings to send more.', '2026-09-09 07:33:24.356', '2026-09-09 07:33:28.489', NULL, '2026-09-09 07:33:28.493', '2026-09-09 07:33:24.356', '2026-09-09 07:33:28.495', 25, NULL, NULL, NULL),
('455d4ea9-2940-46b3-bd46-a1a2a92669cc', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '628993706921', 'Selamat siang Wira. Jangan lupa makan siang.', 'SENT', 0, 3, NULL, '2026-09-09 06:17:36.647', '2026-09-09 06:18:05.467', '2026-09-09 06:18:07.083', NULL, '2026-09-09 06:17:36.647', '2026-09-09 06:21:56.558', 24, '2026-09-09 06:18:09.000', '2026-09-09 06:21:56.000', '3EB086A844728AD1FA789A'),
('462f9d44-3182-40b3-93ea-3f8b4d55d019', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6287812068310', '⚡ Yuk, Bayar Listrik Tepat Waktu! ⚡\n\nHalo Rangga. Jangan sampai kenyamanan di rumah terganggu karena lupa bayar listrik. 😊\n\n💡 Bayar tagihan listrik sebelum tanggal 20 setiap bulan agar terh', 'SENT', 0, 3, NULL, '2026-09-08 10:11:17.463', '2026-09-08 10:12:00.850', '2026-09-08 10:12:06.880', NULL, '2026-09-08 10:11:17.463', '2026-09-09 01:46:31.052', 18, '2026-09-08 10:12:07.000', '2026-09-08 10:21:41.000', '3EB0570C9BF195B9DFCF46'),
('49cd825e-cabc-4499-aeb5-81db8c12ab6d', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6283115772468', 'Halooo Arinal...', 'SENT', 0, 3, NULL, '2026-09-09 02:14:24.474', '2026-09-09 02:14:39.182', '2026-09-09 02:14:41.242', NULL, '2026-09-09 02:14:24.474', '2026-09-09 02:14:43.079', 21, '2026-09-09 02:14:43.000', NULL, '3EB068DA0A2AE04F78341E'),
('50fb5032-a5a7-4dec-b1a7-82bff8954f71', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '62895418240605', 'Bismillah amann Dimas', 'SENT', 0, 3, NULL, '2026-09-08 06:49:09.730', '2026-09-08 06:49:09.742', '2026-09-08 06:49:11.526', NULL, '2026-09-08 06:49:09.730', '2026-09-08 06:54:05.897', 15, '2026-09-08 06:49:12.000', '2026-09-08 06:54:05.000', '3EB016F7F8A5ACE6011210'),
('52e9ab63-7e00-4eaf-93ce-8c83216773c0', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6283115772468', 'Bismillah amann Arinal', 'SENT', 0, 3, NULL, '2026-09-08 06:49:09.767', '2026-09-08 06:49:22.679', '2026-09-08 06:49:24.344', NULL, '2026-09-08 06:49:09.767', '2026-09-08 09:23:16.131', 15, '2026-09-08 06:49:26.000', '2026-09-08 09:23:15.000', '3EB0CDE6EF23510D9746B7'),
('562193ae-8430-4962-bcc5-75997fc39ff9', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285732010265', '⚡ Yuk, Bayar Listrik Tepat Waktu! ⚡\n\nHalo Arifin. Jangan sampai kenyamanan di rumah terganggu karena lupa bayar listrik. 😊\n\n💡 Bayar tagihan listrik sebelum tanggal 20 setiap bulan agar terh', 'SENT', 0, 3, NULL, '2026-09-08 10:11:17.434', '2026-09-08 10:11:34.610', '2026-09-08 10:11:40.708', NULL, '2026-09-08 10:11:17.434', '2026-09-08 10:11:42.734', 18, '2026-09-08 10:11:42.000', NULL, '3EB089738E8DDB42BB927A'),
('5bf1c63c-f3d2-4856-81f7-0b1ab2ac45bd', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285732010265', 'Halooo Arifin...', 'FAILED', 1, 3, 'Message quota reached. Increase the monthly quota in Settings to send more.', '2026-09-09 07:33:24.325', '2026-09-09 07:33:28.459', NULL, '2026-09-09 07:33:28.463', '2026-09-09 07:33:24.325', '2026-09-09 07:33:28.464', 25, NULL, NULL, NULL),
('5c12c2ee-bf5b-49b1-ae5f-dd2480af02b3', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285546268982', 'Selamat siang Ilham. Jangan lupa makan siang.', 'SENT', 0, 3, NULL, '2026-09-09 06:17:36.629', '2026-09-09 06:17:55.955', '2026-09-09 06:17:57.705', NULL, '2026-09-09 06:17:36.629', '2026-09-09 06:18:00.198', 24, '2026-09-09 06:18:00.000', NULL, '3EB0452172C8F459B39F1E'),
('65674529-487a-45fc-afa4-8c9cb6f621ee', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285546268982', 'Selamat pagi Ilham', 'SENT', 0, 3, NULL, '2026-09-09 02:50:08.401', '2026-09-09 02:50:24.221', '2026-09-09 02:50:25.991', NULL, '2026-09-09 02:50:08.401', '2026-09-09 02:50:29.125', 22, '2026-09-09 02:50:29.000', NULL, '3EB0419A193C665A332642'),
('6672fca9-1ad4-425f-92c6-3cb9b2147310', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6282230895298', 'Selamat pagi Syafri', 'SENT', 0, 3, NULL, '2026-09-09 02:50:08.354', '2026-09-09 02:50:11.944', '2026-09-09 02:50:13.610', NULL, '2026-09-09 02:50:08.354', '2026-09-09 02:50:22.343', 22, '2026-09-09 02:50:22.000', NULL, '3EB05213B15A9A4866CE5A'),
('6c78fe8e-a2f1-4c90-b27f-de410f0e005e', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6283115772468', 'Halooo Arinal coba bot', 'SENT', 0, 3, NULL, '2026-09-08 06:43:06.516', '2026-09-08 06:43:20.017', '2026-09-08 06:43:22.656', NULL, '2026-09-08 06:43:06.516', '2026-09-08 09:23:16.097', 13, '2026-09-08 06:43:24.000', '2026-09-08 09:23:15.000', '3EB0F2882550B9EFDE2932'),
('6e82daa3-78d3-4ab6-9189-cae161b78549', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6287812068310', 'Halooo Rangga coba bot', 'SENT', 0, 3, NULL, '2026-09-08 06:43:34.484', '2026-09-08 06:44:18.513', '2026-09-08 06:44:19.447', NULL, '2026-09-08 06:43:06.539', '2026-09-09 01:46:31.077', 13, '2026-09-08 06:44:19.000', '2026-09-08 10:21:41.000', '3EB0C3780D9CBF91042B56'),
('75db0faa-465b-414e-b3f2-99eae65e9d1a', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '628993706921', 'Bismillah amann Wira', 'SENT', 0, 3, NULL, '2026-09-08 06:49:09.794', '2026-09-08 06:49:36.253', '2026-09-08 06:49:37.806', NULL, '2026-09-08 06:49:09.794', '2026-09-08 06:54:05.797', 15, '2026-09-08 06:49:38.000', '2026-09-08 06:54:05.000', '3EB0AB3234642D58991C0A'),
('7f6d08a2-7df2-47ef-aecf-84f30f92362a', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285546268982', 'Selamat siang Ilham. Jangan lupa makan siang.', 'SENT', 0, 3, NULL, '2026-09-09 05:34:33.601', '2026-09-09 05:34:49.645', '2026-09-09 05:34:50.853', NULL, '2026-09-09 05:34:33.601', '2026-09-09 05:34:51.451', 23, '2026-09-09 05:34:51.000', NULL, '3EB03A6F6136A4BBDEA2CF'),
('80bb9c33-cd35-4fc9-acee-3c70b1066d15', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6287812068310', 'Halooo Rangga...', 'SENT', 0, 3, NULL, '2026-09-09 02:14:24.507', '2026-09-09 02:14:50.949', '2026-09-09 02:14:52.902', NULL, '2026-09-09 02:14:24.507', '2026-09-09 08:35:00.123', 21, '2026-09-09 02:14:53.000', '2026-09-09 08:34:59.000', '3EB04E3D3C4FC09AF910AF'),
('84ce804b-c9b3-474b-99f1-b68ebb53116e', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '62895418240605', 'Halooo Dimas...', 'SENT', 0, 3, NULL, '2026-09-09 02:14:24.419', '2026-09-09 02:14:24.437', '2026-09-09 02:14:26.695', NULL, '2026-09-09 02:14:24.419', '2026-09-09 07:32:33.262', 21, '2026-09-09 02:14:27.000', '2026-09-09 06:30:46.000', '3EB029FAC6D20F0C61B902'),
('8d484ef2-6e2a-4f4c-8202-75316d6970e3', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285784618518', 'Halooo Ula coba bot', 'SENT', 0, 3, NULL, '2026-09-08 06:43:06.559', '2026-09-08 06:43:37.467', '2026-09-08 06:43:38.314', NULL, '2026-09-08 06:43:06.559', '2026-09-08 06:43:38.316', 13, NULL, NULL, '3EB0D7FFC8770C5C53B5C6'),
('8e136f8f-0e8e-44a1-84bb-79658db6fbf5', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '62895418240605', 'Selamat siang Dimas. Jangan lupa makan siang.', 'SENT', 0, 3, NULL, '2026-09-09 05:34:33.243', '2026-09-09 05:34:33.253', '2026-09-09 05:34:34.786', NULL, '2026-09-09 05:34:33.243', '2026-09-09 07:32:33.249', 23, '2026-09-09 05:34:35.000', '2026-09-09 06:30:46.000', '3EB0C16EF3EF55E4A5341B'),
('94917415-28e2-4311-85f2-c106d83701f1', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285784618518', 'Selamat siang Ula. Jangan lupa makan siang.', 'SENT', 0, 3, NULL, '2026-09-09 06:17:36.655', '2026-09-09 06:18:08.858', '2026-09-09 06:18:09.557', NULL, '2026-09-09 06:17:36.655', '2026-09-09 06:18:09.560', 24, NULL, NULL, '3EB06CF9B21FFCB847CE42'),
('97e1cd62-132e-4a37-a602-22255c4d2182', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '62895418240605', 'Halooo Dimas coba bot', 'SENT', 0, 3, NULL, '2026-09-08 06:43:06.469', '2026-09-08 06:43:06.482', '2026-09-08 06:43:08.698', NULL, '2026-09-08 06:43:06.469', '2026-09-08 06:54:05.918', 13, '2026-09-08 06:43:09.000', '2026-09-08 06:54:05.000', '3EB0F52191F5A7CBAE7208'),
('9d0541c5-9edd-4af5-a275-eb54a914ac74', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6287812068310', 'Bismillah amann Rangga', 'SENT', 0, 3, NULL, '2026-09-08 06:49:09.786', '2026-09-08 06:49:32.267', '2026-09-08 06:49:33.916', NULL, '2026-09-08 06:49:09.786', '2026-09-09 01:46:31.064', 15, '2026-09-08 06:49:34.000', '2026-09-08 10:21:41.000', '3EB02EE6E616A99F09F0F5'),
('9d5d3601-c467-4d33-82eb-c128fd8acaf1', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6287812068310', 'Selamat siang Rangga. Jangan lupa makan siang.', 'SENT', 0, 3, NULL, '2026-09-09 06:17:36.639', '2026-09-09 06:18:00.528', '2026-09-09 06:18:02.300', NULL, '2026-09-09 06:17:36.639', '2026-09-09 08:35:00.091', 24, '2026-09-09 06:18:03.000', '2026-09-09 08:34:59.000', '3EB03449E37B45344DA625'),
('9e9fb0cc-e6df-462b-b363-2dec8ae88e67', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '628993706921', 'Halooo Wira...', 'FAILED', 1, 3, 'Message quota reached. Increase the monthly quota in Settings to send more.', '2026-09-09 07:33:24.378', '2026-09-09 07:33:28.525', NULL, '2026-09-09 07:33:28.534', '2026-09-09 07:33:24.378', '2026-09-09 07:33:28.536', 25, NULL, NULL, NULL),
('9f99f33c-0796-4e33-841a-f15b99c4c5cc', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '628993706921', 'Halooo Wira coba bot', 'SENT', 0, 3, NULL, '2026-09-08 06:43:06.548', '2026-09-08 06:43:31.877', '2026-09-08 06:43:33.958', NULL, '2026-09-08 06:43:06.548', '2026-09-08 06:54:05.824', 13, '2026-09-08 06:43:34.000', '2026-09-08 06:54:05.000', '3EB02DB765A30C9F404199'),
('a68c8227-b9e6-4af4-9f98-10cd510ec5fc', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6282230895298', 'Halooo Syafri coba bot 2', 'SENT', 0, 3, NULL, '2026-09-08 06:43:06.604', '2026-09-08 06:43:44.540', '2026-09-08 06:43:46.232', NULL, '2026-09-08 06:43:06.604', '2026-09-08 06:43:47.861', 14, '2026-09-08 06:43:46.000', NULL, '3EB04F1D92C052858459F4'),
('a68d9949-1516-4b88-9b28-9a1b0d007e52', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6287812068310', 'Selamat siang Rangga. Jangan lupa makan siang.', 'SENT', 0, 3, NULL, '2026-09-09 05:34:33.622', '2026-09-09 05:34:53.046', '2026-09-09 05:34:54.383', NULL, '2026-09-09 05:34:33.622', '2026-09-09 08:35:00.103', 23, '2026-09-09 06:02:46.000', '2026-09-09 08:34:59.000', '3EB063DB9623526BC93DF6'),
('ace6f736-53bc-4fd2-9831-7766f9486d3a', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '628993706921', 'Selamat siang Wira. Jangan lupa makan siang.', 'SENT', 0, 3, NULL, '2026-09-09 05:34:33.634', '2026-09-09 05:34:55.905', '2026-09-09 05:34:56.998', NULL, '2026-09-09 05:34:33.634', '2026-09-09 06:21:56.570', 23, '2026-09-09 05:34:57.000', '2026-09-09 06:21:56.000', '3EB0773229DCA4AF610E1A'),
('b0274746-d7b6-4260-9777-5b61e8ff65b5', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285546268982', 'Halooo Ilham...', 'SENT', 0, 3, NULL, '2026-09-09 02:14:24.488', '2026-09-09 02:14:45.214', '2026-09-09 02:14:47.258', NULL, '2026-09-09 02:14:24.488', '2026-09-09 02:14:48.119', 21, '2026-09-09 02:14:48.000', NULL, '3EB01EDC1C68AA95BF1893'),
('b7c3dee0-a0f9-45c1-b0fd-9313db173bd4', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6282230895298', 'Halooo Syafri...', 'SENT', 0, 3, NULL, '2026-09-09 02:14:24.441', '2026-09-09 02:14:30.027', '2026-09-09 02:14:32.014', NULL, '2026-09-09 02:14:24.441', '2026-09-09 02:15:13.289', 21, '2026-09-09 02:15:13.000', NULL, '3EB004268204A88750D042'),
('b9c06680-7ec3-4643-bf46-aeb42dab7d85', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285784618518', 'Halooo Ula...', 'SENT', 0, 3, NULL, '2026-09-09 02:14:24.547', '2026-09-09 02:14:59.741', '2026-09-09 02:15:00.667', NULL, '2026-09-09 02:14:24.547', '2026-09-09 02:15:00.670', 21, NULL, NULL, '3EB04E585F3D25591E49B6'),
('bde05c3c-1894-4031-bcf9-b4d80272bc45', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6282230895298', 'Halooo Syafri coba bot', 'SENT', 0, 3, NULL, '2026-09-08 06:43:06.484', '2026-09-08 06:43:12.161', '2026-09-08 06:43:14.254', NULL, '2026-09-08 06:43:06.484', '2026-09-08 06:43:15.921', 13, '2026-09-08 06:43:15.000', NULL, '3EB07E714EBE9270EC3A21'),
('bf2a4c76-48c7-45a1-8006-e2e8c02f75f1', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285784618518', 'Halooo Ula coba bot 2', 'SENT', 0, 3, NULL, '2026-09-08 06:43:06.660', '2026-09-08 06:44:13.960', '2026-09-08 06:44:14.840', NULL, '2026-09-08 06:43:06.660', '2026-09-08 06:44:14.842', 14, NULL, NULL, '3EB05CEB6660C082B1FCE3'),
('c03bdb4f-05eb-4704-860d-88d9bbf201a8', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '628993706921', 'Selamat pagi Wira', 'SENT', 0, 3, NULL, '2026-09-09 02:50:08.431', '2026-09-09 02:50:33.020', '2026-09-09 02:50:34.793', NULL, '2026-09-09 02:50:08.431', '2026-09-09 02:50:43.750', 22, '2026-09-09 02:50:35.000', '2026-09-09 02:50:43.000', '3EB094271BA8E08B9ED5DF'),
('c200d229-bdf8-4094-b3d2-9c903afd5c2e', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6282230895298', 'Bismillah amann Syafri', 'SENT', 0, 3, NULL, '2026-09-08 06:49:09.743', '2026-09-08 06:49:13.227', '2026-09-08 06:49:15.754', NULL, '2026-09-08 06:49:09.743', '2026-09-08 06:51:21.181', 15, '2026-09-08 06:51:21.000', NULL, '3EB0DE094BA1CD6DA0858A'),
('c3273e21-4bb3-4fb1-a1d7-19628ea55df4', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '62895418240605', '⚡ Yuk, Bayar Listrik Tepat Waktu! ⚡\n\nHalo Dimas. Jangan sampai kenyamanan di rumah terganggu karena lupa bayar listrik. 😊\n\n💡 Bayar tagihan listrik sebelum tanggal 20 setiap bulan agar terh', 'SENT', 0, 3, NULL, '2026-09-08 10:11:17.405', '2026-09-08 10:11:17.418', '2026-09-08 10:11:24.560', NULL, '2026-09-08 10:11:17.405', '2026-09-09 01:46:31.016', 18, '2026-09-08 10:11:36.000', '2026-09-08 10:15:14.000', '3EB0A62459DA0CE13F972A'),
('c3a81909-c860-437b-be24-77842cbebb60', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285784618518', 'Bismillah amann Ula', 'SENT', 0, 3, NULL, '2026-09-08 06:49:09.804', '2026-09-08 06:49:41.587', '2026-09-08 06:49:42.428', NULL, '2026-09-08 06:49:09.804', '2026-09-08 06:49:42.431', 15, NULL, NULL, '3EB063646009064F8F8D6E'),
('c55bdf77-31e5-4318-b248-d1a191f73691', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6282230895298', 'Selamat siang Syafri. Jangan lupa makan siang.', 'SENT', 0, 3, NULL, '2026-09-09 06:17:36.473', '2026-09-09 06:17:42.569', '2026-09-09 06:17:44.284', NULL, '2026-09-09 06:17:36.473', '2026-09-09 06:18:24.988', 24, '2026-09-09 06:18:24.000', NULL, '3EB0D47F2DF846F8239C05'),
('c69411ca-ada8-4788-b878-a875026a00a9', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285732010265', 'Selamat siang Arifin. Jangan lupa makan siang.', 'SENT', 0, 3, NULL, '2026-09-09 05:34:33.574', '2026-09-09 05:34:42.508', '2026-09-09 05:34:43.829', NULL, '2026-09-09 05:34:33.574', '2026-09-09 05:34:44.511', 23, '2026-09-09 05:34:44.000', NULL, '3EB0F4F6378B872BDCEFC3'),
('cb8c38c8-5c36-48ed-89b1-577f67dbc83f', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285732010265', 'Halooo Arifin coba bot', 'SENT', 0, 3, NULL, '2026-09-08 06:43:06.502', '2026-09-08 06:43:15.909', '2026-09-08 06:43:18.379', NULL, '2026-09-08 06:43:06.502', '2026-09-08 06:43:20.869', 13, '2026-09-08 06:43:20.000', NULL, '3EB07ECB97FCEF9854032C'),
('d0970448-a735-40a5-ae56-9b412985264a', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285784618518', '⚡ Yuk, Bayar Listrik Tepat Waktu! ⚡\n\nHalo Ula. Jangan sampai kenyamanan di rumah terganggu karena lupa bayar listrik. 😊\n\n💡 Bayar tagihan listrik sebelum tanggal 20 setiap bulan agar terh', 'SENT', 0, 3, NULL, '2026-09-08 10:11:17.481', '2026-09-08 10:12:18.886', '2026-09-08 10:12:23.938', NULL, '2026-09-08 10:11:17.481', '2026-09-08 10:12:23.940', 18, NULL, NULL, '3EB0D563D22C3BCE8AF9F6'),
('d5644cbb-3163-40e9-8128-0f4637cbc3dd', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6283115772468', 'Selamat siang Arinal. Jangan lupa makan siang.', 'SENT', 0, 3, NULL, '2026-09-09 06:17:36.613', '2026-09-09 06:17:52.220', '2026-09-09 06:17:54.121', NULL, '2026-09-09 06:17:36.613', '2026-09-09 06:17:57.870', 24, '2026-09-09 06:17:57.000', NULL, '3EB0BB1A8ACCB873ED2C05'),
('dc09a670-9e20-43fa-918e-6000010873de', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '628993706921', '⚡ Yuk, Bayar Listrik Tepat Waktu! ⚡\n\nHalo Wira. Jangan sampai kenyamanan di rumah terganggu karena lupa bayar listrik. 😊\n\n💡 Bayar tagihan listrik sebelum tanggal 20 setiap bulan agar terh', 'SENT', 0, 3, NULL, '2026-09-08 10:11:17.472', '2026-09-08 10:12:09.922', '2026-09-08 10:12:16.158', NULL, '2026-09-08 10:11:17.472', '2026-09-09 01:46:30.998', 18, '2026-09-08 10:12:16.000', '2026-09-08 10:15:54.000', '3EB0ED48FCEA32F6F98DB7'),
('e087261a-5b4d-4b89-a9cf-f43fed1dfc78', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6282230895298', '⚡ Yuk, Bayar Listrik Tepat Waktu! ⚡\n\nHalo Syafri. Jangan sampai kenyamanan di rumah terganggu karena lupa bayar listrik. 😊\n\n💡 Bayar tagihan listrik sebelum tanggal 20 setiap bulan agar terh', 'SENT', 0, 3, NULL, '2026-09-08 10:11:17.423', '2026-09-08 10:11:26.252', '2026-09-08 10:11:32.459', NULL, '2026-09-08 10:11:17.423', '2026-09-08 10:12:43.646', 18, '2026-09-08 10:12:43.000', NULL, '3EB0E01F218A9DE4FE8D22'),
('e51675ed-20b3-4852-9f6f-0af49bf6c11a', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285784618518', 'Selamat pagi Ula', 'SENT', 0, 3, NULL, '2026-09-09 02:50:08.443', '2026-09-09 02:50:38.568', '2026-09-09 02:50:39.479', NULL, '2026-09-09 02:50:08.443', '2026-09-09 02:50:39.482', 22, NULL, NULL, '3EB0908755A21E6FA091A7'),
('ea358414-b9c4-4507-be3e-8455e334e08e', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6283115772468', 'Halooo Arinal...', 'FAILED', 1, 3, 'Message quota reached. Increase the monthly quota in Settings to send more.', '2026-09-09 07:33:24.344', '2026-09-09 07:33:28.473', NULL, '2026-09-09 07:33:28.478', '2026-09-09 07:33:24.344', '2026-09-09 07:33:28.479', 25, NULL, NULL, NULL),
('ebd46b7f-71e5-4e59-8e93-9929e7e3a30c', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6282230895298', 'Selamat siang Syafri. Jangan lupa makan siang.', 'SENT', 0, 3, NULL, '2026-09-09 05:34:33.255', '2026-09-09 05:34:37.403', '2026-09-09 05:34:38.596', NULL, '2026-09-09 05:34:33.255', '2026-09-09 05:34:39.875', 23, '2026-09-09 05:34:39.000', NULL, '3EB08AAAD3432A8866F65D'),
('ec65dd4f-360e-450a-b871-4dddcc57f769', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285546268982', 'Halooo Ilham coba bot 2', 'SENT', 0, 3, NULL, '2026-09-08 06:43:06.632', '2026-09-08 06:43:58.295', '2026-09-08 06:43:59.915', NULL, '2026-09-08 06:43:06.632', '2026-09-08 06:44:00.595', 14, '2026-09-08 06:44:00.000', NULL, '3EB02000F6BC5290FACF2C'),
('ed615694-971e-4e96-afdd-8c5a3c29f42e', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285732010265', 'Halooo Arifin...', 'SENT', 0, 3, NULL, '2026-09-09 02:14:24.463', '2026-09-09 02:14:35.260', '2026-09-09 02:14:37.527', NULL, '2026-09-09 02:14:24.463', '2026-09-09 02:14:44.092', 21, '2026-09-09 02:14:44.000', NULL, '3EB0B1C17D303C0CE533F8'),
('f6faff17-80ff-4a5e-82c2-8c7e3ddf6605', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285546268982', 'Bismillah amann Ilham', 'SENT', 0, 3, NULL, '2026-09-08 06:49:09.777', '2026-09-08 06:49:26.915', '2026-09-08 06:49:28.425', NULL, '2026-09-08 06:49:09.777', '2026-09-08 06:49:29.020', 15, '2026-09-08 06:49:28.000', NULL, '3EB08B03896B71F4329A4D'),
('f924e476-d51f-447b-8fb6-1ca41c75d5db', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '62895418240605', 'Halooo Dimas...', 'SENT', 0, 3, NULL, '2026-09-09 07:33:24.287', '2026-09-09 07:33:24.301', '2026-09-09 07:33:26.168', NULL, '2026-09-09 07:33:24.287', '2026-09-09 07:38:57.973', 25, '2026-09-09 07:33:26.000', '2026-09-09 07:38:57.000', '3EB0C6BAA028FAA7045E55'),
('f9d2c86d-0cb9-40df-b9fa-57eb0dd71de6', '1967c4b9-7558-4c7a-8a21-8d1a5d254259', '6285546268982', '⚡ Yuk, Bayar Listrik Tepat Waktu! ⚡\n\nHalo Ilham. Jangan sampai kenyamanan di rumah terganggu karena lupa bayar listrik. 😊\n\n💡 Bayar tagihan listrik sebelum tanggal 20 setiap bulan agar terh', 'SENT', 0, 3, NULL, '2026-09-08 10:11:17.454', '2026-09-08 10:11:51.931', '2026-09-08 10:11:58.062', NULL, '2026-09-08 10:11:17.454', '2026-09-08 10:11:58.898', 18, '2026-09-08 10:11:58.000', NULL, '3EB04F854AB69F36468509');

-- --------------------------------------------------------

--
-- Table structure for table `workspace_settings`
--

CREATE TABLE `workspace_settings` (
  `id` int(11) NOT NULL,
  `companyName` varchar(191) NOT NULL DEFAULT '',
  `timezone` varchar(191) NOT NULL DEFAULT 'Asia/Jakarta',
  `language` varchar(191) NOT NULL DEFAULT 'id',
  `defaultSenderId` varchar(191) DEFAULT NULL,
  `rateLimitPerMin` int(11) NOT NULL DEFAULT 60,
  `retryLimit` int(11) NOT NULL DEFAULT 3,
  `delayBetweenMs` int(11) NOT NULL DEFAULT 500,
  `notifyCampaignCompleted` tinyint(1) NOT NULL DEFAULT 1,
  `notifyCampaignFailed` tinyint(1) NOT NULL DEFAULT 1,
  `notifyConnectionError` tinyint(1) NOT NULL DEFAULT 1,
  `notifyLowQuota` tinyint(1) NOT NULL DEFAULT 1,
  `messageQuota` int(11) NOT NULL DEFAULT 100000,
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `workspace_settings`
--

INSERT INTO `workspace_settings` (`id`, `companyName`, `timezone`, `language`, `defaultSenderId`, `rateLimitPerMin`, `retryLimit`, `delayBetweenMs`, `notifyCampaignCompleted`, `notifyCampaignFailed`, `notifyConnectionError`, `notifyLowQuota`, `messageQuota`, `updatedAt`) VALUES
(1, 'PT Blast Indonesia', 'Asia/Jakarta', 'id', NULL, 45, 3, 600, 1, 0, 1, 1, 1000, '2026-09-09 07:43:49.664');

-- --------------------------------------------------------

--
-- Table structure for table `_prisma_migrations`
--

CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) NOT NULL,
  `checksum` varchar(64) NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) NOT NULL,
  `logs` text DEFAULT NULL,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `applied_steps_count` int(10) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `_prisma_migrations`
--

INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `logs`, `rolled_back_at`, `started_at`, `applied_steps_count`) VALUES
('252e653d-36b8-457d-9502-e6bfdc945f88', '5cd3914b4804f05efa43e8b5f1de907fe4a9f7d6cd220a0d0e82a8274a74e48f', '2026-09-07 10:27:19.093', '20260907102718_campaign_models', NULL, NULL, '2026-09-07 10:27:18.632', 1),
('379476df-88be-40c5-b592-76cec555ea25', 'dd2e63b26eaa8f824fc1f0d76ce052b44363f85a30972eea983b4381d1894f3e', '2026-09-09 04:44:13.924', '20260909044413_add_workspace_settings', NULL, NULL, '2026-09-09 04:44:13.914', 1),
('5b8bb1da-87cf-4e06-a464-772494902969', '339127b91d3034c66582144355fb0f6f9baee9abd644c49c2fa476a08c706c76', '2026-09-07 06:42:42.499', '20260907064242_init', NULL, NULL, '2026-09-07 06:42:42.296', 1),
('7375960c-507a-48a8-a73f-7e245c0e332b', '6ea9ff2eb4342a863c08bbb26e186cdd4f66cc5b23987646fc7a5f0d5eac6190', '2026-09-08 09:23:26.592', '20260908160000_team_and_activity', '', NULL, '2026-09-08 09:23:26.592', 0),
('9c157f18-573d-4d6f-af74-6749f7eb22df', '20ca4bce68751238948bcc80a144ae2ee937cf71168cc820bd426e52ce5d091c', '2026-09-07 09:00:09.146', '20260907090009_whatsapp_messages', NULL, NULL, '2026-09-07 09:00:09.093', 1),
('f2b7756c-417b-46ee-adc4-11c622dfcd8c', '668f2444254fac9b0a587b1aefcefab742abb204dcdb0ebafc661d7deb257780', '2026-09-08 09:39:10.460', '20260908170000_team_from_users', '', NULL, '2026-09-08 09:39:10.460', 0);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `activity_logs_module_idx` (`module`),
  ADD KEY `activity_logs_date_idx` (`date`),
  ADD KEY `activity_logs_user_idx` (`user`);

--
-- Indexes for table `campaigns`
--
ALTER TABLE `campaigns`
  ADD PRIMARY KEY (`id`),
  ADD KEY `campaigns_status_scheduledAt_idx` (`status`,`scheduledAt`),
  ADD KEY `campaigns_whatsappAccountId_idx` (`whatsappAccountId`),
  ADD KEY `campaigns_templateId_idx` (`templateId`);

--
-- Indexes for table `campaign_contacts`
--
ALTER TABLE `campaign_contacts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `campaign_contacts_targetsId_idx` (`targetsId`),
  ADD KEY `campaign_contacts_contactId_fkey` (`contactId`);

--
-- Indexes for table `campaign_groups`
--
ALTER TABLE `campaign_groups`
  ADD PRIMARY KEY (`id`),
  ADD KEY `campaign_groups_targetsId_idx` (`targetsId`),
  ADD KEY `campaign_groups_groupId_fkey` (`groupId`);

--
-- Indexes for table `campaign_recipients`
--
ALTER TABLE `campaign_recipients`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `campaign_recipients_messageId_key` (`messageId`),
  ADD KEY `campaign_recipients_campaignId_status_idx` (`campaignId`,`status`),
  ADD KEY `campaign_recipients_contactId_idx` (`contactId`);

--
-- Indexes for table `campaign_targets`
--
ALTER TABLE `campaign_targets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `campaign_targets_campaignId_key` (`campaignId`);

--
-- Indexes for table `contacts`
--
ALTER TABLE `contacts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `contacts_idpel_key` (`idpel`),
  ADD KEY `contacts_phone_idx` (`phone`),
  ADD KEY `contacts_customer_type_idx` (`customer_type`),
  ADD KEY `contacts_tariff_idx` (`tariff`),
  ADD KEY `contacts_region_idx` (`region`),
  ADD KEY `contacts_ulp_idx` (`ulp`),
  ADD KEY `contacts_created_at_idx` (`created_at`);

--
-- Indexes for table `contact_group`
--
ALTER TABLE `contact_group`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `contact_group_contact_id_group_id_key` (`contact_id`,`group_id`),
  ADD KEY `contact_group_group_id_fkey` (`group_id`);

--
-- Indexes for table `groups`
--
ALTER TABLE `groups`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `groups_name_key` (`name`),
  ADD UNIQUE KEY `groups_slug_key` (`slug`);

--
-- Indexes for table `templates`
--
ALTER TABLE `templates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `templates_code_key` (`code`),
  ADD KEY `templates_category_idx` (`category`),
  ADD KEY `templates_language_idx` (`language`),
  ADD KEY `templates_created_at_idx` (`created_at`),
  ADD KEY `templates_updated_at_idx` (`updated_at`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `User_email_key` (`email`),
  ADD KEY `User_status_idx` (`status`);

--
-- Indexes for table `whatsapp_accounts`
--
ALTER TABLE `whatsapp_accounts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `whatsapp_accounts_status_idx` (`status`),
  ADD KEY `whatsapp_accounts_isDefault_idx` (`isDefault`);

--
-- Indexes for table `whatsapp_messages`
--
ALTER TABLE `whatsapp_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `whatsapp_messages_status_scheduledAt_idx` (`status`,`scheduledAt`),
  ADD KEY `whatsapp_messages_accountId_status_idx` (`accountId`,`status`),
  ADD KEY `whatsapp_messages_status_processingStartedAt_idx` (`status`,`processingStartedAt`),
  ADD KEY `whatsapp_messages_campaignId_idx` (`campaignId`),
  ADD KEY `whatsapp_messages_accountId_waMessageId_idx` (`accountId`,`waMessageId`);

--
-- Indexes for table `workspace_settings`
--
ALTER TABLE `workspace_settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `_prisma_migrations`
--
ALTER TABLE `_prisma_migrations`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=90;

--
-- AUTO_INCREMENT for table `campaigns`
--
ALTER TABLE `campaigns`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `campaign_contacts`
--
ALTER TABLE `campaign_contacts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `campaign_groups`
--
ALTER TABLE `campaign_groups`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT for table `campaign_recipients`
--
ALTER TABLE `campaign_recipients`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=286;

--
-- AUTO_INCREMENT for table `campaign_targets`
--
ALTER TABLE `campaign_targets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT for table `contacts`
--
ALTER TABLE `contacts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `contact_group`
--
ALTER TABLE `contact_group`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT for table `groups`
--
ALTER TABLE `groups`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `templates`
--
ALTER TABLE `templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `workspace_settings`
--
ALTER TABLE `workspace_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `campaigns`
--
ALTER TABLE `campaigns`
  ADD CONSTRAINT `campaigns_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `templates` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `campaigns_whatsappAccountId_fkey` FOREIGN KEY (`whatsappAccountId`) REFERENCES `whatsapp_accounts` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `campaign_contacts`
--
ALTER TABLE `campaign_contacts`
  ADD CONSTRAINT `campaign_contacts_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `contacts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `campaign_contacts_targetsId_fkey` FOREIGN KEY (`targetsId`) REFERENCES `campaign_targets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `campaign_groups`
--
ALTER TABLE `campaign_groups`
  ADD CONSTRAINT `campaign_groups_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `groups` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `campaign_groups_targetsId_fkey` FOREIGN KEY (`targetsId`) REFERENCES `campaign_targets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `campaign_recipients`
--
ALTER TABLE `campaign_recipients`
  ADD CONSTRAINT `campaign_recipients_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `campaign_recipients_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `contacts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `campaign_recipients_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `whatsapp_messages` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `campaign_targets`
--
ALTER TABLE `campaign_targets`
  ADD CONSTRAINT `campaign_targets_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `contact_group`
--
ALTER TABLE `contact_group`
  ADD CONSTRAINT `contact_group_contact_id_fkey` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `contact_group_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `whatsapp_messages`
--
ALTER TABLE `whatsapp_messages`
  ADD CONSTRAINT `whatsapp_messages_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `whatsapp_accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `whatsapp_messages_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
