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
-- Table structure for table `master_obec_policy`
--

DROP TABLE IF EXISTS `master_obec_policy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `master_obec_policy` (
  `id` int NOT NULL AUTO_INCREMENT,
  `obec_policy` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `detail` text CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci,
  `up_by` int DEFAULT NULL,
  `del` int DEFAULT '0',
  `create_date` datetime DEFAULT NULL,
  `update_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `master_obec_policy`
--

LOCK TABLES `master_obec_policy` WRITE;
/*!40000 ALTER TABLE `master_obec_policy` DISABLE KEYS */;
INSERT INTO `master_obec_policy` VALUES (1,'1.ด้านความปลอดภัย','สร้างความตระหนักในการเสริมสร้างความปลอดภัยในสถานศึกษา พัฒนาความรู้และทักษะในการคุ้มครอง ป้องกัน ด้านความปลอดภัยของตนเองและผู้รับบริการ เป็นแบบอย่างในการเสริมสร้างความปลอดภัยในวิชาชีพของตนและการแสดงออกที่ถูกต้องทั้งในระดับสถานศึกษาและชุมชน สร้างกลไกและมาตรการรักษาความปลอดภัยในสถานศึกษาตามหลัก ธรรมาภิบาล พัฒนาระบบ รูปแบบแนวทาง การป้องกันและแก้ปัญหาให้กับผู้เรียนปลอดภัยจากการถูกคุกคามทุกรูปแบบได้อย่างทันท่วงที พัฒนาภาคีเครือข่ายให้มีประสิทธิภาพในการเสริมสร้างความปลอดภัยในทุกระดับ',1,0,'2022-04-29 05:02:18','2022-04-29 05:02:18'),(2,'2.ด้านโอกาส','พัฒนาระบบและช่องทางในการเลือกศึกษาต่อเพื่อการมีงานทำและอาชีพตามความต้องการและความถนัดของตนเอง พัฒนาแหล่งเรียนรู้ให้มีความหลากหลาย ครอบคลุมทั่วถึง ครบทุกพื้นที่ เกิดการเรียนรู้เชิงรุก มีการพัฒนาอาชีพ การมีงานทำและสร้างรายได้ ประสบความสำเร็จในชีวิตอย่างภาคภูมิใจ',1,0,'2022-04-29 05:02:18','2022-04-29 05:02:18'),(3,'3.ด้านคุณภาพ','ใช้ระบบสารสนเทศที่ทันสมัยเพื่อประกอบการตัดสินใจในการก าหนดทิศทางนโยบายและการขับเคลื่อนในการจัดการศึกษา ได้อย่างทันท่วงทีและมีประสิทธิภาพ มี นวัตกรรมในการบริหารจัดการตามบริบทของพื้นที่ตอบสนองความต้องการของท้องถิ่นและชุมชน มีกลไกในการบริหารจัดการ การติดตาม ควบคุมกำกับ อย่างเป็นระบบและมีประสิทธิภาพ นะจ๊ะ',1,0,'2022-04-29 05:02:18','2022-04-29 05:02:18'),(4,'4.ด้านประสิทธิภาพ','บริหารจัดการโดยใช้เขตพื้นที่เป็นฐาน และใช้นวัตกรรมในการขับเคลื่อนกระจายอำนาจจากส่วนกลางสู่ภูมิภาค ทั้งในระดับคลัส เตอร์ เขตพื้นที่สหวิทยาเขต เครือข่าย และสถานศึกษา บริหารจัดการโดยการมีส่วนร่วมของทุกภาคส่วนและภาคีเครือข่ายในการจัดการศึกษาทุกระดับ ร่วมรับผิดชอบต่อผลของการจัดการศึกษาในทุกระดับและสามารถสะท้อนข้อมูลสู่การพัฒนาอย่างยั่งยืน สร้างกลไกในการติดตาม ตรวจสอบ ประเมินการจัดการศึกษา และเชื่อมโยงฐานข้อมูล เพื่อการพัฒนาได้อย่างมีประสิทธิภาพ',1,0,'2022-04-29 05:02:18','2022-04-29 05:27:48'),(5,'texst','demo',1,1,'2022-04-29 05:23:49','2022-04-29 05:23:49');
/*!40000 ALTER TABLE `master_obec_policy` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-04-03  7:18:03
