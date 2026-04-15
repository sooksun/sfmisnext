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
-- Table structure for table `master_sc_policy`
--

DROP TABLE IF EXISTS `master_sc_policy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `master_sc_policy` (
  `scp_id` int NOT NULL AUTO_INCREMENT,
  `sc_id` int NOT NULL DEFAULT '0',
  `sc_policy` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `del` int DEFAULT '0',
  `up_by` int DEFAULT NULL,
  `create_date` datetime DEFAULT NULL,
  `update_date` datetime DEFAULT NULL,
  PRIMARY KEY (`scp_id`)
) ENGINE=MyISAM AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `master_sc_policy`
--

LOCK TABLES `master_sc_policy` WRITE;
/*!40000 ALTER TABLE `master_sc_policy` DISABLE KEYS */;
INSERT INTO `master_sc_policy` VALUES (1,1,'1.รู้รักษ์ภาษาไทย',0,82,'2022-05-10 10:42:41','2022-05-10 10:42:41'),(2,1,'2.รู้ใช้ภาษาจีน',0,82,'2022-05-10 10:42:41','2022-05-10 10:42:41'),(3,1,'3.ร่วมอนุรักษ์วัฒนธรรมท้องถิ่น',0,82,'2022-05-10 10:42:41','2022-05-10 10:42:41'),(4,1,'4.สอนทำกินอย่างพอเพียง',0,82,'2022-05-10 10:42:41','2022-05-10 10:42:41'),(5,1,'5.สอนคู่เคียงใช้สื่อ ICT',0,82,'2022-05-10 10:42:41','2022-05-10 10:42:41'),(6,1,'รู้รักภาษาถิ่น 55',1,82,'2022-05-10 10:42:41','2022-05-10 00:00:00'),(7,1,'6.ยึดปรัชญาเศรษฐกิจพอเพียง',0,82,'2022-05-25 03:37:15','2022-08-29 00:00:00'),(8,2,'ประชุมดี ประชุมเด่น เน้นประชุม',0,83,'2022-06-16 01:36:18','2022-06-16 01:36:18'),(9,11,'การเรียนดี กีฬาเด่น',0,104,'2022-10-10 14:33:54','2022-10-10 14:33:54'),(10,11,'โรงเรียนสีขาว ห่างไกลยาเสพติด',0,104,'2022-10-10 14:34:17','2022-10-10 14:34:17'),(11,2,'ทำงานทำงาน',0,94,'2022-10-28 13:13:48','2022-10-28 13:13:48'),(12,2,'สอนด้วยเทคนิค Active learning',0,94,'2022-10-28 13:14:11','2022-10-28 13:14:11'),(13,2,'เรียนดี กีฬาเด่น',0,95,'2022-10-28 13:21:34','2022-10-28 00:00:00'),(14,12,'1. พัฒนาหลักสูตรสถานศึกษาให้มีความเหมาะสม สอดคล้องกับนโยบายการศึกษาระดับชาติ ระดับเขตพื้นที่การศึกษา บริบทของโรงเรียน ความต้องการของผู้เรียน และสนองความต้องการชุมชนภายใต้การมีส่วนร่วมของทุกฝ่าย',0,118,'2023-03-10 12:42:40','2023-03-10 00:00:00'),(15,12,'2. พัฒนาผู้เรียนให้มีทักษะในการแสวงหาความรู้ด้วนตนเอง รักการอ่าน การเขียน เพื่อให้มีความสามารถในการใช้ภาษาไทย ภาษาอังกฤษ และภาษาจีน ในการสื่อสาร ตามวัย และโครงการเรียนรู้ในแต่ละภาษา',0,118,'2023-03-10 12:43:07','2023-03-10 12:43:07'),(16,12,'3. พัฒนาผู้เรียนให้มีทักษะในการแสวงหาความรู้ด้วยตนเอง การรักการอ่าน และให้มีความสามารถในการใช้ภาษาไทย ภาษาอังกฤษ และภาษาจีนในการสื่อสาร',0,118,'2023-03-10 12:43:14','2023-03-10 12:43:14'),(17,12,'4. เร่งรัดให้มีการสร้างเครื่องมือ และพัฒนาระบบการวัดและประเมินผล เพื่อพัฒนาผลสัมฤทธิ์ผู้เรียนสูงกว่าเกณฑ์มาตรฐานระดับชาติ และเป้าหมายของโรงเรียน คือผลการเรียนทุกกลุ่มสาระการเรียนรู้ไม่ต่ำกว่าร้อยละ 80 และผู้เรียนสามารถสอบแข่งขันเข้าเรียนต่อระดับชั้นมัธยมศ',0,118,'2023-03-10 12:43:21','2023-03-10 12:43:21'),(18,20,'เรียนดี มีวินัย',0,130,'2023-03-14 15:31:44','2023-03-14 15:31:44'),(19,20,'ส่งเสริม การเรียนรู้',0,130,'2023-03-14 15:32:06','2023-03-14 15:32:06');
/*!40000 ALTER TABLE `master_sc_policy` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-04-03  7:18:22
