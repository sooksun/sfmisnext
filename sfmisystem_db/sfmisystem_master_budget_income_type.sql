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
-- Table structure for table `master_budget_income_type`
--

DROP TABLE IF EXISTS `master_budget_income_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `master_budget_income_type` (
  `bg_type_id` int NOT NULL AUTO_INCREMENT,
  `budget_type` varchar(250) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `budget_type_calc` int DEFAULT '0' COMMENT '0 = ไม่คำนวน\n1 = คำนวน',
  `budget_borrow_type` varchar(250) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT '2' COMMENT '- ยืมได้ 1\n- ยืมไม่ได้  2 defult\n- รายได้แผ่นดิน 3',
  `spacial_type` int DEFAULT '0',
  `up_by` int NOT NULL,
  `del` int DEFAULT '0',
  `create_date` datetime DEFAULT NULL,
  `update_date` datetime DEFAULT NULL,
  PRIMARY KEY (`bg_type_id`)
) ENGINE=MyISAM AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `master_budget_income_type`
--

LOCK TABLES `master_budget_income_type` WRITE;
/*!40000 ALTER TABLE `master_budget_income_type` DISABLE KEYS */;
INSERT INTO `master_budget_income_type` VALUES (1,'อาหารกลางวัน',1,'1',1,0,0,'2022-01-01 00:00:00','2022-07-22 00:00:00'),(2,'อุดหนุนรายหัว',1,'1',1,0,0,'2022-01-01 00:00:00','2022-07-22 00:00:00'),(3,'นักเรียนประจำพักนอน',1,'2',1,0,0,'2022-01-01 00:00:00','2022-01-01 00:00:00'),(4,'เรียนฟรี 15 ปี -อุปกรณ์',1,'2',1,0,0,'2022-01-01 00:00:00','2022-01-01 00:00:00'),(5,'เรียนฟรี 15 ปี -หนังสือ',1,'2',1,0,0,'2022-01-01 00:00:00','2022-01-01 00:00:00'),(6,'เรียนฟรี 15 ปี -เครื่องแบบ',1,'2',1,0,0,'2022-01-01 00:00:00','2022-01-01 00:00:00'),(7,'เรียนฟรี 15 ปี -กิจกรรมพัฒนาผู้เรียน',1,'2',1,0,0,'2022-01-01 00:00:00','2022-01-01 00:00:00'),(8,'ปัจจัย  พฐ นร ยากจน ประถมศึกษา',1,'2',1,0,0,'2022-01-01 00:00:00','2022-01-01 00:00:00'),(9,'ปัจจัย  พฐ นร ยากจน มัธยมศึกษา',1,'2',1,0,0,'2022-01-01 00:00:00','2022-01-01 00:00:00'),(10,'เงินรายได้สถานศึกษา',0,'2',1,0,0,'2022-01-01 00:00:00','2022-01-01 00:00:00'),(11,'เงินบำรุงการศึกษา',1,'2',1,0,0,'2022-01-01 00:00:00','2022-01-01 00:00:00'),(12,'เงินอุดหนุนนักเรียนยากจนพิเศษ (กสศ)',1,'2',1,0,0,'2022-01-01 00:00:00','2022-01-01 00:00:00'),(13,'กองทุนหมุนเวียนส่งเสริมผลผลิต',1,'2',1,0,0,'2022-01-01 00:00:00','2022-01-01 00:00:00'),(14,'เงินประกันสัญญา',0,'2',1,0,0,'2022-01-01 00:00:00','2022-01-01 00:00:00'),(15,'เงินรายได้แผ่นดิน',0,'3',1,0,0,'2022-01-01 00:00:00','2022-07-22 00:00:00'),(16,'พาหนะนักเรียนเรียนรวม',1,'2',1,0,0,'2022-01-01 00:00:00','2022-01-01 00:00:00'),(17,'นักเรียนพิการเรียนร่วม',1,'2',1,0,0,'2022-01-01 00:00:00','2022-01-01 00:00:00'),(18,'หักภาษี ณ ที่จ่าย',0,'2',1,0,0,'2022-01-01 00:00:00','2022-01-01 00:00:00');
/*!40000 ALTER TABLE `master_budget_income_type` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-04-03  7:18:25
