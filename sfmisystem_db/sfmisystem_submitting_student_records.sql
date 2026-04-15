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
-- Table structure for table `submitting_student_records`
--

DROP TABLE IF EXISTS `submitting_student_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `submitting_student_records` (
  `ssr_id` int NOT NULL AUTO_INCREMENT,
  `status` int DEFAULT '0' COMMENT '0 = กำลังดำเนินการ , 100 = ส่งเรื่องปิดแก้ไข',
  `sy_id` int DEFAULT '0',
  `year` int DEFAULT '0',
  `sc_id` int DEFAULT '0',
  `up_by` int DEFAULT '0',
  `del` int DEFAULT '0',
  `create_date` datetime DEFAULT NULL,
  `update_date` datetime DEFAULT NULL,
  PRIMARY KEY (`ssr_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `submitting_student_records`
--

LOCK TABLES `submitting_student_records` WRITE;
/*!40000 ALTER TABLE `submitting_student_records` DISABLE KEYS */;
INSERT INTO `submitting_student_records` VALUES (1,100,1,0,12,118,0,'2023-03-10 15:00:14','2023-03-10 15:16:28'),(2,100,2,0,12,118,0,'2023-03-10 15:17:23','2023-03-10 15:18:20'),(3,0,21,0,11,105,0,'2023-03-13 09:39:05','2023-03-13 09:39:05'),(4,0,21,0,2,96,0,'2023-03-14 14:53:39','2023-03-14 14:53:39'),(5,0,1,0,2,96,0,'2023-03-14 15:35:06','2023-03-14 15:35:06'),(6,100,1,0,20,131,0,'2023-03-14 15:45:57','2023-03-14 15:47:35');
/*!40000 ALTER TABLE `submitting_student_records` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-04-03  7:17:55
