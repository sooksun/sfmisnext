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
-- Table structure for table `tb_expenses`
--

DROP TABLE IF EXISTS `tb_expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_expenses` (
  `ex_id` int NOT NULL AUTO_INCREMENT,
  `sc_id` int NOT NULL,
  `ex_year_in` int DEFAULT NULL,
  `bg_type_id` int DEFAULT NULL,
  `ex_type_budget` int DEFAULT NULL COMMENT '0 = ยอดยกมาจากปีงบประมาณก่อน | 1 = รับจากปีงบประมาณปัจจุบัน',
  `p_id` int DEFAULT NULL,
  `ex_year_out` int DEFAULT NULL,
  `ex_remark` text,
  `ex_money` float DEFAULT '0',
  `ex_status` int DEFAULT '0' COMMENT '0 = รออนุมัติ',
  `up_by` int DEFAULT NULL,
  `create_date` datetime DEFAULT NULL,
  `update_date` datetime DEFAULT NULL,
  PRIMARY KEY (`ex_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_expenses`
--

LOCK TABLES `tb_expenses` WRITE;
/*!40000 ALTER TABLE `tb_expenses` DISABLE KEYS */;
INSERT INTO `tb_expenses` VALUES (1,1,14,3,0,NULL,15,'รับมาจากงบประมาณปี 2564',250000,0,90,'2022-07-25 05:22:43','2022-07-25 05:22:43'),(2,1,14,11,0,NULL,15,'ยอดยกมาจากปีก่อน',500,0,90,'2022-07-26 09:18:22','2022-07-26 09:18:22'),(3,1,14,11,0,NULL,15,'รับเงิน',20000,0,31,'2022-07-26 10:04:07','2022-07-26 10:04:07'),(4,2,14,2,0,NULL,14,'เงินเหลือจ่าย ปีเก่า',150000,0,98,'2022-10-06 15:05:02','2022-10-06 15:05:02'),(5,2,14,7,0,NULL,14,'เงินปีเก่าเหลือจ่าย',100000,0,98,'2022-10-06 15:05:28','2022-10-06 15:05:28'),(6,2,21,2,0,NULL,14,'รายหัวเกก่า',200000,0,98,'2022-10-06 15:11:23','2022-10-06 15:11:23'),(7,2,21,7,0,NULL,14,'กิจกรรมเก่า',100000,0,98,'2022-10-06 15:11:54','2022-10-06 15:11:54');
/*!40000 ALTER TABLE `tb_expenses` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-04-03  7:17:32
