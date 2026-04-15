-- MySQL dump 10.13  Distrib 8.0.32, for Win64 (x86_64)
--
-- Host: localhost    Database: sfmisystem
-- ------------------------------------------------------
-- Server version	8.0.32-0ubuntu0.22.04.2

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `offer_check`
--

DROP TABLE IF EXISTS `offer_check`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `offer_check` (
  `of_id` int NOT NULL AUTO_INCREMENT,
  `of_no` varchar(45) DEFAULT NULL,
  `rw_id` int DEFAULT '0' COMMENT 'ใบขอเบิก',
  `p_id` int DEFAULT '0' COMMENT 'ร้านค้า',
  `of_date` date DEFAULT NULL,
  `certificate_payment` int DEFAULT '1',
  `user_generate` int DEFAULT '0',
  `sc_id` int DEFAULT '0',
  `sy_id` int DEFAULT '0',
  `year` varchar(45) DEFAULT NULL,
  `status` int DEFAULT '101',
  `del` int DEFAULT '0',
  `up_by` int DEFAULT '0',
  `create_date` datetime DEFAULT NULL,
  `update_date` datetime DEFAULT NULL,
  PRIMARY KEY (`of_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `offer_check`
--

LOCK TABLES `offer_check` WRITE;
/*!40000 ALTER TABLE `offer_check` DISABLE KEYS */;
INSERT INTO `offer_check` VALUES (1,'110001',1,4,'2022-07-21',1,93,1,14,'2565',102,0,31,'2022-07-22 07:29:28','2022-07-22 07:29:28'),(2,'SC-3321',2,4,'2022-07-24',2,85,1,14,'2565',102,0,90,'2022-07-25 09:18:28','2022-07-29 06:53:46'),(3,'553',3,2,'2022-07-25',1,82,1,14,'2565',102,0,90,'2022-07-25 09:24:08','2022-07-26 03:32:22'),(4,'14403',5,3,'2022-07-25',1,92,1,14,'2565',102,0,31,'2022-07-26 09:57:43','2022-07-26 09:57:43'),(5,'110223',7,3,'2022-07-28',1,90,1,14,'2565',102,0,31,'2022-07-29 09:36:09','2022-07-29 09:36:09');
/*!40000 ALTER TABLE `offer_check` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-04-03  7:19:07
