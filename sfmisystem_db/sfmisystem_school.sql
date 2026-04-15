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
-- Table structure for table `school`
--

DROP TABLE IF EXISTS `school`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `school` (
  `sc_id` int NOT NULL AUTO_INCREMENT,
  `smis` int DEFAULT NULL,
  `sc_code` int DEFAULT NULL,
  `sc_name` varchar(100) NOT NULL,
  `areacode` varchar(10) DEFAULT NULL,
  `type` int DEFAULT NULL,
  `geo` int DEFAULT NULL,
  `spt` varchar(50) DEFAULT NULL,
  `add1` varchar(50) DEFAULT NULL,
  `add2` varchar(50) DEFAULT NULL,
  `tumbol` varchar(50) DEFAULT NULL,
  `p_code` int DEFAULT NULL,
  `tel` varchar(13) DEFAULT NULL,
  `section` int DEFAULT NULL,
  `insp_zone` int DEFAULT NULL,
  `low_class` varchar(10) DEFAULT NULL,
  `top_clsass` varchar(50) DEFAULT NULL,
  `lat` varchar(20) DEFAULT NULL,
  `lng` varchar(20) DEFAULT NULL,
  `up_by` int DEFAULT NULL,
  `up_date` datetime DEFAULT NULL,
  `del` int DEFAULT '0',
  `email` varchar(255) DEFAULT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `header` varchar(255) DEFAULT NULL,
  `sub_district` int DEFAULT '0',
  `aumphur` int DEFAULT '0',
  `province` int DEFAULT '0',
  `cre_date` datetime DEFAULT NULL,
  PRIMARY KEY (`sc_id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `school`
--

LOCK TABLES `school` WRITE;
/*!40000 ALTER TABLE `school` DISABLE KEYS */;
INSERT INTO `school` VALUES (1,NULL,NULL,'บ้านเทอดไทย',NULL,NULL,NULL,'สพป.เชียงราย เขต 3',NULL,NULL,NULL,NULL,'053730264',NULL,NULL,NULL,NULL,'20.2414973','99.6622397',1,'2022-03-30 10:20:06',1,'school@gmail.com',NULL,'นายเกรียงศักดิ์  ฝึกฝน',571501,5715,57,NULL),(2,NULL,NULL,'บ้านพญาไพร',NULL,NULL,NULL,'สพป.เชียงราย เขต 3',NULL,NULL,NULL,NULL,'053-160046',NULL,NULL,NULL,NULL,'20.321703','99.6192521',1,'2022-12-12 18:22:43',1,'school@gmail.com',NULL,'นายสุขสันต์ สอนนวล',571501,5715,57,NULL),(3,NULL,NULL,'บ้านแม่หม้อ',NULL,NULL,NULL,'สพป.เชียงราย เขต 3',NULL,NULL,NULL,NULL,'0-5202-9317',NULL,NULL,NULL,NULL,'20.3276201','99.6340573',1,'2022-03-30 10:19:00',1,'school@gmail.com',NULL,'นายพิชชากร อานุ',571501,5715,57,NULL),(4,NULL,NULL,'พญาไพรไตรมิตร',NULL,NULL,NULL,'สพป.เชียงราย เขต 3',NULL,NULL,NULL,NULL,'053160037',NULL,NULL,NULL,NULL,'20.3285509399','99.6142172813',1,'2022-09-09 06:21:06',1,'school@gmail.com',NULL,'นายบัญญัติ  ยานะ',571501,5715,57,NULL),(5,NULL,NULL,'บ้านจะตี',NULL,NULL,NULL,'สพป.เชียงราย เขต 3',NULL,NULL,NULL,NULL,'053160043',NULL,NULL,NULL,NULL,'20.29221833','99.70768333',1,'2022-09-09 06:20:52',1,'school@gmail.com',NULL,'นายพงศธร  ทรายปัญญโญ',571501,5715,57,NULL),(6,NULL,NULL,'สามัคคีพัฒนา',NULL,NULL,NULL,'สพป.เชียงราย เขต 3',NULL,NULL,NULL,NULL,'052-029312',NULL,NULL,NULL,NULL,'20.3386226','99.5211662',1,'2023-03-13 13:53:17',1,'school@gmail.com',NULL,'นายยงควิโรจน์  เศษวงค์',571501,5715,57,NULL),(7,NULL,NULL,'บ้านปางมะหัน',NULL,NULL,NULL,'สพป.เชียงราย เขต 3',NULL,NULL,NULL,NULL,'-',NULL,NULL,NULL,NULL,'20.32607333','99.545825',1,'2022-03-30 10:14:29',1,'school@gmail.com',NULL,'นายดนัยวัฒน์ มณี',571501,5715,57,NULL),(8,NULL,NULL,'บ้านห้วยอื้น',NULL,NULL,NULL,'สพป.เชียงราย เขต 3',NULL,NULL,NULL,NULL,'-',NULL,NULL,NULL,NULL,'20.2682416','99.6497236',1,'2022-03-30 10:11:25',1,'school@gmail.com',NULL,'นางสาวสุดารัตน์  ปัญญาศิริวงค์',571501,5715,57,NULL),(9,NULL,NULL,'บ้านผาจี',NULL,NULL,NULL,'สพป.เชียงราย เขต 3',NULL,NULL,NULL,NULL,'087-1939121',NULL,NULL,NULL,NULL,'20.3002004','99.6597316',1,'2022-03-30 10:10:20',1,'school@gmail.com',NULL,'นายชำนาญ บอแฉ่',571501,5715,57,NULL),(10,NULL,NULL,'ตำรวจตะเวนชายแดนบำรุงที่ 87',NULL,NULL,NULL,'สพป.เชียงราย เขต 3',NULL,NULL,NULL,NULL,'053730264',NULL,NULL,NULL,NULL,'20.072581010332','99.472819795046',1,'2022-09-09 06:21:35',1,'school@gmail.com',NULL,'นางสาวดาราวรรณ สะบานงา',571501,5715,57,NULL),(11,NULL,NULL,'ทดสอบ banana',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'043-514-3368',NULL,NULL,NULL,NULL,NULL,NULL,1,'2022-10-07 10:42:25',1,'scool_test@gmail.com','assets/img/profile/school/school_logo07102022_63.jpeg','นายทดสอบ เทสระบบ',400101,4001,40,'2022-10-07 10:42:25'),(12,NULL,NULL,'บ้านทดสอบ',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'0812345678',NULL,NULL,NULL,NULL,NULL,NULL,1,'2023-03-10 10:38:04',1,'demobanana@gmail.com',NULL,'นายสมพงษ์ มาทดลอง',440101,4401,44,'2023-03-10 10:38:04'),(13,NULL,NULL,'บ้านทดสอบ',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'0812345678',NULL,NULL,NULL,NULL,NULL,NULL,1,'2023-03-10 11:16:54',1,'testadmin2@gmail.com',NULL,'นายทดสอบ มาทดลอง',440101,4401,44,'2023-03-10 11:16:54'),(14,NULL,NULL,'บ้านห้วยไร่สามัคคี',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'0531161235',NULL,NULL,NULL,NULL,NULL,NULL,1,'2023-03-13 13:58:45',1,'sooksun_s@hotmail.com',NULL,'นายศุภโชค ปิยะสันติ์',571504,5715,57,'2023-03-13 13:58:45'),(15,NULL,NULL,'บ้านพญาไพร (ทดสอบ)',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'091-6289660',NULL,NULL,NULL,NULL,NULL,NULL,1,'2023-03-14 09:48:42',0,'payapraischool@gmail.com',NULL,'นายสุขสันต์ สอนนวล',571501,5715,57,'2023-03-14 09:48:42'),(16,NULL,NULL,'บ้านปางมะหัน (ทดสอบ)',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'095-736-3659',NULL,NULL,NULL,NULL,NULL,NULL,1,'2023-03-14 09:51:51',0,'pangmahan.school@gmail.com',NULL,'ดนัยวัฒน์ มณี',571501,5715,57,'2023-03-14 09:51:51'),(17,NULL,NULL,'สามัคคีพัฒนา (ทดสอบ)',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'0649698744',NULL,NULL,NULL,NULL,NULL,NULL,1,'2023-03-14 09:54:50',0,'samakkhipat@gmail.com',NULL,'ดร.ยงควิโรจน์ เศษวงค์',571501,5715,57,'2023-03-14 09:54:50'),(18,NULL,NULL,'บ้านผาเดื่อ (ทดสอบ)',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'053 918 092',NULL,NULL,NULL,NULL,NULL,NULL,1,'2023-03-14 09:56:52',0,'phaduaschool@gmail.com',NULL,'นางกุลธิดา อดิลักษณ์ศิริ',571501,5715,57,'2023-03-14 09:56:52'),(19,NULL,NULL,'บ้านห้วยไร่สามัคคี (ทดสอบ)',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'053 632 019',NULL,NULL,NULL,NULL,NULL,NULL,1,'2023-03-14 10:00:06',0,'huayrai@hrkschool.ac.th',NULL,'นายศุภโชค ปิยะสันติ์',571501,5715,57,'2023-03-14 10:00:06'),(20,NULL,NULL,'ทดสอบวิทยาลัย',NULL,NULL,NULL,'21',NULL,NULL,NULL,NULL,'043-516-3365',NULL,NULL,NULL,NULL,'16.437361714358','102.82818706956',1,'2023-03-14 10:27:03',0,'my-demo.school@gmail.com',NULL,'นายทดสอบ ดำเนินการ',400101,4001,40,'2023-03-14 10:26:27');
/*!40000 ALTER TABLE `school` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-04-03  7:16:36
