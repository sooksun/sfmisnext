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
-- Table structure for table `pln_real_budget`
--

DROP TABLE IF EXISTS `pln_real_budget`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pln_real_budget` (
  `prb_id` int NOT NULL AUTO_INCREMENT,
  `sc_id` int NOT NULL,
  `acad_year` int NOT NULL,
  `auto_numbers` int NOT NULL,
  `bg_type_id` int NOT NULL,
  `receivetype` int NOT NULL,
  `recieve_acadyear` int NOT NULL,
  `detail` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `amount` float(10,2) NOT NULL,
  `up_by` int DEFAULT NULL,
  `del` int DEFAULT '0',
  `create_date` datetime DEFAULT NULL,
  `update_date` datetime DEFAULT NULL,
  PRIMARY KEY (`prb_id`)
) ENGINE=MyISAM AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pln_real_budget`
--

LOCK TABLES `pln_real_budget` WRITE;
/*!40000 ALTER TABLE `pln_real_budget` DISABLE KEYS */;
INSERT INTO `pln_real_budget` VALUES (1,1,14,0,2,0,14,'demo',15000.00,31,1,'2022-07-22 10:01:29','2022-07-22 10:01:29'),(2,1,14,0,4,0,14,'ยอดยกมา 2564',3000.00,90,1,'2022-08-07 03:02:36','2022-08-07 03:02:36'),(3,1,14,0,1,0,14,'เงินปีก่อน',500.00,31,1,'2022-08-08 02:31:18','2022-08-08 02:31:18'),(4,1,14,0,2,0,15,'ยอดยกมาปี 64',12000.00,90,1,'2022-08-11 07:42:58','2022-08-11 07:42:58'),(5,1,14,0,2,0,15,'งบประมาณยกมาจากปี 2564/1',15000.00,90,0,'2022-08-14 11:48:00','2022-08-15 02:46:53'),(6,1,14,0,2,0,14,'งบประมาณยกมาจากปี 2564/2',3000.00,90,1,'2022-08-14 11:50:27','2022-08-15 02:46:47'),(7,1,14,0,6,0,15,'รับเงินปีเก่า',5000.00,90,0,'2022-09-12 12:14:33','2022-09-12 12:14:33'),(8,11,21,0,2,0,21,'เงินสมทบคงค้างจากปี 2564',250000.00,108,0,'2022-10-10 10:55:54','2022-10-10 10:55:54'),(9,11,21,0,1,0,21,'เงินอาหารกลางวันปี 2564 ตกค้าง',300000.00,108,0,'2022-10-10 15:57:48','2022-10-10 15:57:48'),(10,2,21,0,2,0,21,'ยอดยกมาปีเก่า 2564/2',100000.00,97,0,'2022-10-05 15:57:48','2022-10-05 15:57:48'),(11,11,21,0,1,0,21,'demo',0.00,108,1,'2022-11-01 17:06:23','2022-11-01 17:06:23'),(12,11,21,0,5,0,21,'wdw',0.00,108,1,'2022-11-01 17:09:16','2022-11-01 17:09:16'),(13,11,21,0,2,0,21,'demo',0.00,108,1,'2022-11-01 17:10:00','2022-11-01 17:10:00'),(14,11,21,0,4,0,20,'awdaawd',0.00,108,1,'2022-11-01 17:11:12','2022-11-01 17:11:12'),(15,11,21,0,4,0,21,'awdawd',0.00,108,1,'2022-11-01 17:12:35','2022-11-01 17:12:35'),(16,12,1,0,2,0,1,'รับเงินเหลือจ่าย',25000.00,121,0,'2023-03-10 16:35:24','2023-03-10 16:35:24'),(17,20,1,0,2,0,1,'เหลือจ่ายปีก่อน 2565',75000.00,133,0,'2023-03-14 15:44:22','2023-03-14 15:44:22'),(18,20,1,0,7,0,1,'จากปี 2565',25000.00,133,0,'2023-03-14 15:45:01','2023-03-14 15:45:01'),(19,20,1,0,7,0,1,'รับเงินเหลือจ่ายจากปี 2565 ครั้งที่ 2',250.00,134,0,'2023-03-17 15:49:41','2023-03-17 15:49:41'),(20,20,1,0,2,0,1,'เงินเหลือจ่ายปีเก่า 20/03/2566',500.00,134,0,'2023-03-20 12:02:06','2023-03-20 12:02:06');
/*!40000 ALTER TABLE `pln_real_budget` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-04-03  7:18:56
