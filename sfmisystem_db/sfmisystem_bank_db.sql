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
-- Table structure for table `bank_db`
--

DROP TABLE IF EXISTS `bank_db`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bank_db` (
  `b_id` int NOT NULL AUTO_INCREMENT,
  `b_name_l` varchar(255) DEFAULT NULL,
  `b_name_s` varchar(45) DEFAULT NULL,
  `b_img` text,
  PRIMARY KEY (`b_id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bank_db`
--

LOCK TABLES `bank_db` WRITE;
/*!40000 ALTER TABLE `bank_db` DISABLE KEYS */;
INSERT INTO `bank_db` VALUES (1,'ธนาคารกรุงเทพ','BBL',NULL),(2,'ธนาคารกรุงไทย','KTB',NULL),(3,'ธนาคารกรุงศรีอยุธยา','BAY',NULL),(4,'ธนาคารกสิกรไทย','KBANK',NULL),(5,'ธนาคารเกียรตินาคิน','KKP',NULL),(6,'ธนาคารซีไอเอ็มบี','CIMB',NULL),(7,'ธนาคารทหารไทย ','TMB',NULL),(8,'ธนาคารทิสโก้','TISCO',NULL),(9,'ธนาคารไทยพาณิชย์','SCB',NULL),(10,'ธนาคารยูโอบี','UOB',NULL),(11,'ธนาคารแลนด์ แอนด์ เฮ้าส์','LH BANK',NULL),(12,'ธนาคารสแตนดาร์ดชาร์เตอร์ด','SCBT',NULL),(13,'ธนาคารไอซีบีซี','ICBC',NULL),(14,'ธนาคารนครหลวงไทย','SCIB',NULL),(15,'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร ธ.ก.ส.','BAAC',NULL),(16,'ธนาคารออมสิน','GSB',NULL),(17,'ธนาคารอาคารสงเคราะห์','GHB',NULL),(18,'ธนาคารธนชาต','TBANK',NULL);
/*!40000 ALTER TABLE `bank_db` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-04-03  7:16:43
