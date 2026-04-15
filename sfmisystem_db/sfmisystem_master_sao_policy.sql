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
-- Table structure for table `master_sao_policy`
--

DROP TABLE IF EXISTS `master_sao_policy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `master_sao_policy` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sao_policy` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb4 NOT NULL,
  `detail` mediumtext CHARACTER SET utf8mb3 COLLATE utf8mb4,
  `up_by` int DEFAULT NULL,
  `del` int DEFAULT '0',
  `create_date` datetime DEFAULT NULL,
  `update_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `master_sao_policy`
--

LOCK TABLES `master_sao_policy` WRITE;
/*!40000 ALTER TABLE `master_sao_policy` DISABLE KEYS */;
INSERT INTO `master_sao_policy` VALUES (1,'1.ด้านความปลอดภัย','สร้างความตระหนักในการเสริมสร้างความปลอดภัยในสถานศึกษา พัฒนาความรู้และทักษะในการคุ้มครอง ป้องกัน ด้านความปลอดภัยของตนเองและผู้รับบริการ เป็นแบบอย่างในการเสริมสร้างความปลอดภัยในวิชาชีพของตนและการแสดงออกที่ถูกต้องทั้งในระดับสถานศึกษาและชุมชน สร้างกลไกและมาตรการรักษาความปลอดภัยในสถานศึกษาตามหลัก ธรรมาภิบาล พัฒนาระบบ รูปแบบแนวทาง การป้องกันและแก้ปัญหาให้กับผู้เรียนปลอดภัยจากการถูกคุกคามทุกรูปแบบได้อย่างทันท่วงที พัฒนาภาคีเครือข่ายให้มีประสิทธิภาพในการเสริมสร้างความปลอดภัยในทุกระดับ',1,0,'2022-04-29 03:14:24','2022-04-29 03:14:24'),(2,'2.ด้านโอกาส','พัฒนาระบบและช่องทางในการเลือกศึกษาต่อเพื่อการมีงานทำและอาชีพตามความต้องการและความถนัดของตนเอง พัฒนาแหล่งเรียนรู้ให้มีความหลากหลาย ครอบคลุมทั่วถึง ครบทุกพื้นที่ เกิดการเรียนรู้เชิงรุก มีการพัฒนาอาชีพ การมีงานทำและสร้างรายได้ ประสบความสำเร็จในชีวิตอย่างภาคภูมิใจ',93,0,'2022-04-29 03:14:24','2022-07-16 05:17:27'),(3,'3.ด้านคุณภาพ','ใช้ระบบสารสนเทศที่ทันสมัยเพื่อประกอบการตัดสินใจในการก าหนดทิศทางนโยบายและการขับเคลื่อนในการจัดการศึกษา ได้อย่างทันท่วงทีและมีประสิทธิภาพ มี นวัตกรรมในการบริหารจัดการตามบริบทของพื้นที่ตอบสนองความต้องการของท้องถิ่นและชุมชน มีกลไกในการบริหารจัดการ การติดตาม ควบคุมกำกับ อย่างเป็นระบบและมีประสิทธิภาพ',1,0,'2022-04-29 03:14:24','2022-04-29 03:14:24'),(4,'4.ด้านประสิทธิภาพ','บริหารจัดการโดยใช้เขตพื้นที่เป็นฐาน และใช้นวัตกรรมในการขับเคลื่อนกระจายอำนาจจากส่วนกลางสู่ภูมิภาค ทั้งในระดับคลัส เตอร์ เขตพื้นที่สหวิทยาเขต เครือข่าย และสถานศึกษา บริหารจัดการโดยการมีส่วนร่วมของทุกภาคส่วนและภาคีเครือข่ายในการจัดการศึกษาทุกระดับ ร่วมรับผิดชอบต่อผลของการจัดการศึกษาในทุกระดับและสามารถสะท้อนข้อมูลสู่การพัฒนาอย่างยั่งยืน สร้างกลไกในการติดตาม ตรวจสอบ ประเมินการจัดการศึกษา และเชื่อมโยงฐานข้อมูล เพื่อการพัฒนาได้อย่างมีประสิทธิภาพ',1,0,'2022-04-29 03:14:24','2022-04-29 04:12:29'),(5,'ด้านนโยบายเร่งด่วน',' 1.1 สร้างศรัทธาให้กับประชาชน องค์กรภาครัฐและเอกชน ต่อองค์การบริหารส่วนตำบล โดยการทำให้เห็นถึงความจริงใจ จริงจัง ที่จะแก้ปัญหาต่าง ๆ ในตำบลด้วยความโปร่งใส\n\n    1.2 สร้างความมีส่วนร่วม ในการบริหารจัดการ และการดำเนินกิจการต่าง ๆ ขององค์การบริหารส่วนตำบล โดยยึดแนวทางในระบอบประชาธิปไตย ',1,1,'2022-04-29 04:13:15','2022-04-29 04:13:15');
/*!40000 ALTER TABLE `master_sao_policy` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-04-03  7:17:17
