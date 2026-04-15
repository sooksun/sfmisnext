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
-- Table structure for table `bankaccount`
--

DROP TABLE IF EXISTS `bankaccount`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bankaccount` (
  `ba_id` int NOT NULL AUTO_INCREMENT,
  `b_id` int NOT NULL,
  `ba_name` varchar(255) NOT NULL,
  `ba_no` varchar(20) NOT NULL,
  `sc_id` int NOT NULL,
  `up_by` int DEFAULT NULL,
  `del` int DEFAULT '0',
  `create_date` datetime DEFAULT NULL,
  `update_date` datetime DEFAULT NULL,
  PRIMARY KEY (`ba_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bankaccount`
--

LOCK TABLES `bankaccount` WRITE;
/*!40000 ALTER TABLE `bankaccount` DISABLE KEYS */;
INSERT INTO `bankaccount` VALUES (1,9,'ตะวัน ภูผาม่าน','7596-52-6698-213',1,31,0,'2020-12-07 12:44:03','2022-07-22 04:15:42'),(2,4,'Channuwat Chiawchan','043-598-66-9987',1,31,0,'2020-12-07 12:44:03','2022-07-22 04:15:30'),(3,3,'สมเกียรติ สอนนวล','5-552-3654-20',1,31,0,'2020-12-07 12:44:53','2022-05-17 07:24:14'),(4,2,'Japan Japan','10-5524-5-774',1,31,0,'2022-05-17 06:01:32','2022-07-22 04:15:23'),(5,1,'เงินอาหารกลาวัน','11-2222-3333-4',1,31,0,'2022-05-25 03:15:17','2022-07-22 04:15:54'),(6,2,'เงินรับเข้า','043-5578-6',11,109,0,'2022-10-10 16:12:56','2022-10-10 17:33:24'),(7,1,'เงินสำรองจ่าย','28-66547-8854',11,109,0,'2022-10-10 16:13:16','2022-10-10 16:13:16'),(8,2,'เงินอุดหนุนอื่น โรงเรียนบ้านพญาไพร','5356982236',2,97,0,'2022-10-21 22:11:07','2022-10-21 22:11:07'),(9,2,'โรงเรียนบ้านทดสอบ','1440001203',12,121,0,'2023-03-10 16:29:13','2023-03-10 16:29:13'),(10,4,'นางสมหมาย ใจดี','55-06654-472',20,133,0,'2023-03-14 15:36:02','2023-03-14 15:36:02'),(11,2,'นายวินัย ดวงจิต','123-555-669',20,133,0,'2023-03-14 15:36:31','2023-03-14 15:36:31');
/*!40000 ALTER TABLE `bankaccount` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-04-03  7:17:40
