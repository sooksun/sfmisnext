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
-- Table structure for table `withholding_certificate`
--

DROP TABLE IF EXISTS `withholding_certificate`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `withholding_certificate` (
  `wc_id` int NOT NULL AUTO_INCREMENT,
  `wc_no` varchar(45) DEFAULT NULL COMMENT 'เล่มใบรับรอง',
  `of_id` int DEFAULT '0' COMMENT 'key ของเช็ค',
  `sc_id` int DEFAULT '0',
  `wc_rank` int DEFAULT NULL,
  `cer_date` date DEFAULT NULL,
  `sy_id` int DEFAULT '0',
  `year` varchar(45) DEFAULT NULL,
  `status` int DEFAULT '100' COMMENT '100 = กำลังทำ | 101 = ออกหนังสือรับรอง',
  `del` int DEFAULT '0',
  `up_by` int DEFAULT '0',
  `create_date` datetime DEFAULT NULL,
  `update_date` datetime DEFAULT NULL,
  PRIMARY KEY (`wc_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `withholding_certificate`
--

LOCK TABLES `withholding_certificate` WRITE;
/*!40000 ALTER TABLE `withholding_certificate` DISABLE KEYS */;
INSERT INTO `withholding_certificate` VALUES (1,'1001',1,1,1,'2022-07-21',14,'2565',101,0,31,'2022-07-22 07:30:25','2022-07-22 07:39:17'),(2,'5564',1,1,33,'2022-07-29',14,'2565',101,0,90,'2022-07-25 09:10:12','2022-07-25 09:10:12'),(3,'557',3,1,23,'2022-07-24',14,'2565',101,0,90,'2022-07-25 09:13:53','2022-07-26 03:33:01'),(4,'122',4,1,5,'2022-07-25',14,'2565',101,0,31,'2022-07-26 09:58:35','2022-07-26 09:58:35');
/*!40000 ALTER TABLE `withholding_certificate` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-04-03  7:18:07
