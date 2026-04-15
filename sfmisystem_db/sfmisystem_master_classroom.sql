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
-- Table structure for table `master_classroom`
--

DROP TABLE IF EXISTS `master_classroom`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `master_classroom` (
  `class_id` int NOT NULL AUTO_INCREMENT,
  `class_lev` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`class_id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `master_classroom`
--

LOCK TABLES `master_classroom` WRITE;
/*!40000 ALTER TABLE `master_classroom` DISABLE KEYS */;
INSERT INTO `master_classroom` VALUES (1,'อนุบาล 1'),(2,'อนบาล 2'),(3,'อนบาล 3'),(4,'ประถมศึกษาปี่ที่ 1'),(5,'ประถมศึกษาปี่ที่ 2'),(6,'ประถมศึกษาปี่ที่ 3'),(7,'ประถมศึกษาปี่ที่ 4'),(8,'ประถมศึกษาปีที่ 5'),(9,'ประถมศึกษาปี่ที่ 6'),(10,'มัธยมศึกษาปีที่ 1'),(11,'มัธยมศึกษาปีที่ 2'),(12,'มัธยมศึกษาปีที่ 3'),(13,'มัธยมศึกษาปีที่ 4'),(14,'มัธยมศึกษาปีที่ 5'),(15,'มัธยมศึกษาปีที่ 6'),(16,'ป.ว.ช. 1'),(17,'ป.ว.ช. 2'),(18,'ป.ว.ช. 3');
/*!40000 ALTER TABLE `master_classroom` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-04-03  7:18:44
