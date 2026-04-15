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
-- Table structure for table `master_quick_win`
--

DROP TABLE IF EXISTS `master_quick_win`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `master_quick_win` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quick_win` text CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `up_by` int DEFAULT NULL,
  `del` int DEFAULT '0',
  `create_date` datetime DEFAULT NULL,
  `update_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `master_quick_win`
--

LOCK TABLES `master_quick_win` WRITE;
/*!40000 ALTER TABLE `master_quick_win` DISABLE KEYS */;
INSERT INTO `master_quick_win` VALUES (1,'วาระที่ 1 เรื่องความปลอดภัยของผู้เรียน โดยจัดให้มีรูปแบบ วิธีการ หรือกระบวนการในการดูแลช่วยเหลือนักเรียน เพื่อให้ผู้เรียนเกิดการเรียนรู้อย่างมีคุณภาพ มีความสุข และได้รับการปกป้องคุ้มครองความปลอดภัยทั้งด้านร่างกายและจิตใจ รวมถึงการสร้างทักษะให้ผู้เรียนมีความสามารถในการดูแลตนเองจากภัยอันตรายต่าง ๆ ท่ามกลางสภาพแวดล้อมทางสังคม',1,0,'2022-04-29 07:18:51','2022-05-03 08:16:43'),(2,'วาระที่ 2 หลักสูตรฐานสมรรถนะ มุ่งเน้นการจัดการเรียนรู้ที่หลากหลายโดยยึดความสามารถของผู้เรียนเป็นหลัก และพัฒนาผู้เรียนให้เกิดสมรรถนะที่ต้องการ',1,0,'2022-04-29 07:18:51','2022-04-29 07:18:51'),(3,'วาระที่ 3 Big Data พัฒนาการจัดเก็บข้อมูลอย่างเป็นระบบและไม่ซ้ำซ้อน เพื่อให้ได้ข้อมูลภาพรวมการศึกษาของประเทศที่มีความครบถ้วน สมบูรณ์ ถูกต้องเป็นปัจจุบัน และสามารถนำมาใช้ประโยชน์ได้อย่างแท้จริง',1,0,'2022-04-29 07:18:51','2022-04-29 07:18:51'),(4,'วาระที่ 4 ขับเคลื่อนศูนย์ความเป็นเลิศทางการอาชีวศึกษา (Excellent Center) สนับสนุนการดำเนินงานของศูนย์ความเป็นเลิศทางการอาชีวศึกษา (Excellent Center) ตามความเลิศของแต่ละสถานศึกษาและตามบริบทของพื้นที่ สอดคล้องกับความต้องการของประปัจจุบันและอนาคต ตลอดจนมีการจัดการเรียนการสอนด้วยเครื่องมือที่ทันสมัย สอดคล้องกับเทคโนโลยีปัจจุบัน',1,0,'2022-04-29 07:18:51','2022-04-29 07:18:51'),(5,'วาระที่ 5 พัฒนาทักษะทางอาชีพ ส่งเสริมการจัดการศึกษาที่เน้นพัฒนาทักษะอาชีพของผู้เรียน เพื่อพัฒนาคุณภาพชีวิต สร้างอาชีพและรายได้ที่เหมาะสม และเพิ่มขีดความสามารถในการแข่งขันของประเทศ',1,0,'2022-04-29 07:18:51','2022-04-29 07:18:51'),(6,'วาระที่ 6 การศึกษาตลอดชีวิต การจัดเรียนรู้ตลอดชีวิตสำหรับประชาชนทุกช่วงวัยให้มีคุณภาพและมาตรฐาน ประซาชนในแต่ละช่วงวัยได้รับการศึกษาตามความต้องการอย่างมีมาตรฐาน เหมาะสมและเต็มตามศักยภาพตั้งแต่วัยเด็กจนถึงวัยชรา และพัฒนาหลักสูตรที่เหมาะสมเพื่อเตรียมความพร้อมในการเข้าสู่สังคมผู้สูงวัย',1,0,'2022-04-29 07:18:51','2022-05-03 08:16:05'),(7,'วาระที่ 7 การจัดการศึกษาสำหรับผู้ที่มีความต้องการจำเป็นพิเศษ ส่งเสริมการจัดการศึกษาให้ผู้ที่มีความต้องการจำเป็นพิเศษได้รับการพัฒนาอย่างเต็มศักยภาพสามารถดำรงชีวิตในสังคมอย่างมีเกียรติ ศักดิ์ศรีเท่าเทียมกับผู้อื่นในสังคม สามารถช่วยเหลือตนเองและมีส่วนร่วมในการพัฒนาประเทศ',1,0,'2022-04-29 07:18:51','2022-05-03 08:16:11'),(8,'demo asas',1,1,'2022-04-29 07:30:42','2022-04-29 07:30:48');
/*!40000 ALTER TABLE `master_quick_win` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-04-03  7:15:57
