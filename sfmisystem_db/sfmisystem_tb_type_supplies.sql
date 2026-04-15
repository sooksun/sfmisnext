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
-- Table structure for table `tb_type_supplies`
--

DROP TABLE IF EXISTS `tb_type_supplies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_type_supplies` (
  `ts_id` int NOT NULL AUTO_INCREMENT,
  `ts_name` varchar(250) NOT NULL,
  `sc_id` int DEFAULT NULL,
  `del` int DEFAULT '0' COMMENT '0 = active | 1 = delete',
  `up_by` int DEFAULT NULL,
  `create_date` datetime DEFAULT NULL,
  `update_date` datetime DEFAULT NULL,
  PRIMARY KEY (`ts_id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_type_supplies`
--

LOCK TABLES `tb_type_supplies` WRITE;
/*!40000 ALTER TABLE `tb_type_supplies` DISABLE KEYS */;
INSERT INTO `tb_type_supplies` VALUES (1,'วัสดุสำนักงาน5',1,1,31,'2022-04-27 07:09:56','2022-04-27 09:37:55'),(2,'วัสดุไฟฟ้าและวิทยุ',1,0,88,'2022-04-27 07:28:13','2022-06-07 03:01:01'),(3,'วัสดุสำนักงาน',1,0,88,'2022-04-27 07:28:34','2022-06-07 03:00:52'),(4,'วัสดุงานบ้านงานครัว',1,0,88,'2022-06-07 03:01:09','2022-06-07 03:01:09'),(5,'วัสดุก่อสร้าง',1,0,88,'2022-06-07 03:01:15','2022-06-07 03:01:15'),(6,'วัสดุยานพาหนะและขนส่ง',1,0,88,'2022-06-07 03:01:20','2022-06-07 03:01:20'),(7,'วัสดุเชื้อเพลิงและหล่อลื่น',1,0,88,'2022-06-07 03:01:27','2022-06-07 03:01:27'),(8,'วัสดุวิทยาศาสตร์หรือการแพทย์',1,0,88,'2022-06-07 03:01:27','2022-06-07 03:01:38'),(9,'วัสดุโฆษณาและเผยแพร่',1,0,88,'2022-06-07 03:01:45','2022-06-07 03:01:45'),(10,'วัสดุการเกษตร',1,0,88,'2022-06-07 03:01:51','2022-06-07 03:01:51'),(11,'วัสดุเครื่องแต่งกาย',1,0,88,'2022-06-07 03:01:56','2022-06-07 03:01:56'),(12,'วัสดุกีฬา',1,0,88,'2022-06-07 03:02:00','2022-06-07 03:02:00'),(13,'วัสดุคอมพิวเตอร์',1,0,88,'2022-06-07 03:02:05','2022-06-07 03:02:05'),(14,'วัสดุสนาม',1,0,88,'2022-06-07 03:02:11','2022-06-07 03:02:11'),(15,'วัสดุการศึกษา',1,0,88,'2022-06-07 03:02:16','2022-06-07 03:02:16'),(16,'วัสดุสำรวจ',1,0,88,'2022-06-07 03:02:20','2022-06-07 03:02:20'),(17,'วัสดุอื่น ๆ',1,0,88,'2022-06-07 03:02:26','2022-06-07 03:02:26'),(18,'วัสดุสำนักงาน',2,0,101,'2022-10-06 13:56:55','2022-10-06 14:06:09'),(19,'วัสดุไฟฟ้าและวิทยุ',2,0,101,'2022-10-06 17:15:52','2022-10-06 17:15:52'),(20,'วัสดุงานบ้านงานครัว',2,0,101,'2022-10-06 17:16:21','2022-10-06 17:16:21'),(21,'วัสดุก่อสร้าง',2,0,101,'2022-10-06 17:16:41','2022-10-06 17:16:41'),(22,'วัสดุยานพาหนะและขนส่ง',2,0,101,'2022-10-06 17:17:14','2022-10-06 17:17:14'),(23,'วัสดุเชื้อเพลิงและหล่อลื่น',2,0,101,'2022-10-06 17:17:39','2022-10-06 17:17:39'),(24,'วัสดุวิทยาศาสตร์หรือการแพทย์',2,0,101,'2022-10-06 17:18:19','2022-10-06 17:18:19'),(25,'วัสดุการเกษตร',2,0,101,'2022-10-06 17:18:32','2022-10-06 17:18:32'),(26,'วัสดุโฆษณาและเผยแพร่',2,0,101,'2022-10-06 17:18:56','2022-10-06 17:18:56'),(27,'วัสดุเครื่องแต่งกาย',2,0,101,'2022-10-06 17:19:14','2022-10-06 17:19:14'),(28,'วัสดุกีฬา',2,0,101,'2022-10-06 17:19:54','2022-10-06 17:19:54'),(29,'วัสดุคอมพิวเตอร์',2,0,101,'2022-10-06 17:20:45','2022-10-06 17:20:45'),(30,'วัสดุนอกห้อง',11,0,92,'2022-10-07 15:17:27','2022-10-07 15:17:51');
/*!40000 ALTER TABLE `tb_type_supplies` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-04-03  7:16:54
