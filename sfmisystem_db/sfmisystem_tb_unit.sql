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
-- Table structure for table `tb_unit`
--

DROP TABLE IF EXISTS `tb_unit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_unit` (
  `un_id` int NOT NULL AUTO_INCREMENT,
  `un_name` varchar(250) DEFAULT NULL,
  `sc_id` int DEFAULT NULL,
  `u_status` int DEFAULT '1' COMMENT '0 = delete | 1 = active',
  `up_by` int DEFAULT '0',
  `create_date` date DEFAULT NULL,
  `update_date` date DEFAULT NULL,
  PRIMARY KEY (`un_id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_unit`
--

LOCK TABLES `tb_unit` WRITE;
/*!40000 ALTER TABLE `tb_unit` DISABLE KEYS */;
INSERT INTO `tb_unit` VALUES (1,'กล่อง',1,0,31,'2022-04-27','2022-04-27'),(2,'ซอง',1,1,31,'2022-04-27','2022-04-27'),(3,'ก้อน',1,1,31,'2022-04-27','2022-04-27'),(4,'ชิ้น',1,1,31,'2022-04-27','2022-04-27'),(5,'อัน',1,1,31,'2022-04-27','2022-04-27'),(6,'เล่ม',1,1,31,'2022-04-27','2022-04-27'),(7,NULL,NULL,1,NULL,'2022-04-27','2022-04-27'),(8,'12',1,0,31,'2022-04-27','2022-04-27'),(9,'45',1,0,31,'2022-04-27','2022-04-27'),(10,'กล่อง',1,1,31,'2022-04-27','2022-05-11'),(11,'หน่วย',1,1,31,'2022-04-27','2022-05-11'),(12,'เครื่อง',1,1,31,'2022-05-04','2022-05-04'),(13,'แท่ง',1,1,88,'2022-06-17','2022-09-06'),(14,'รีม',2,0,101,'2022-10-06','2022-10-06'),(15,'โหล',2,0,101,'2022-10-06','2022-10-06'),(16,'แพ็ค',2,0,101,'2022-10-06','2022-10-06'),(17,'วง',2,0,101,'2022-10-06','2022-10-06'),(18,'ด้าม',2,1,101,'2022-10-06','2022-10-06'),(19,'หลัง',11,1,107,'2022-10-10','2022-10-10'),(20,'ต้น',2,1,102,'2022-11-15','2022-11-15'),(21,'ลูก',12,1,123,'2023-03-13','2023-03-13');
/*!40000 ALTER TABLE `tb_unit` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-04-03  7:18:33
