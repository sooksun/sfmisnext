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
-- Table structure for table `activity`
--

DROP TABLE IF EXISTS `activity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity` (
  `activity_id` int NOT NULL AUTO_INCREMENT,
  `activity_code` varchar(45) DEFAULT NULL,
  `activity_name` varchar(255) DEFAULT NULL,
  `budget` float DEFAULT NULL,
  `date_end` date DEFAULT NULL,
  `date_start` date DEFAULT NULL,
  `project_id` int DEFAULT NULL,
  `responsible` int DEFAULT NULL,
  `status` int DEFAULT NULL,
  `success` int DEFAULT NULL,
  `up_by` int DEFAULT NULL,
  `del` int DEFAULT '0',
  PRIMARY KEY (`activity_id`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activity`
--

LOCK TABLES `activity` WRITE;
/*!40000 ALTER TABLE `activity` DISABLE KEYS */;
INSERT INTO `activity` VALUES (1,'001','ทดสอบกิจกรรม',200,'2022-05-31','2022-05-14',1,82,1,20,82,0),(2,'002','ทดสอบกิจกรรมที่ 2',4500,'2022-06-29','2022-05-12',1,82,0,10,88,0),(3,'001','จิตอาสา',150,'2022-06-22','2022-06-21',4,88,0,5,88,1),(4,'023','จิตอาสา',150,'2022-06-22','2022-06-21',2,88,0,5,88,1),(5,'003','จิตอาสา',150,'2022-06-22','2022-06-21',1,82,0,5,88,0),(6,'ก.140','จัดซื้ออุปกรณ์วันครู',2000,'2022-08-23','2022-08-22',7,82,0,80,83,0),(7,'ก.141','เบิกอุปกรณ์การเรียน',3500,'2022-08-23','2022-08-22',8,90,0,99,83,0),(8,' ก.141','เบิกอุปกรณ์การเรียน',2000,'2022-08-25','2022-08-22',9,93,1,99,93,1),(9,'ก.140','จัดซื้ออุปกรณ์วันครู',3000,'2022-08-24','2022-08-22',10,31,1,80,93,0),(10,'azxsd','ประชุมเจ้าหน้าที่',0,'2022-08-30','2022-08-29',11,93,0,20,93,0),(11,'azxsd','จัดซื้อวัสดุโครงการ',0,'2022-09-09','2022-08-31',11,93,0,40,93,0),(12,'azxsd','ดำเนินการตามแผน',0,'2022-09-30','2022-09-09',11,93,0,40,93,0),(13,'1','ประชุม',3000,'2022-10-12','2022-10-10',18,96,0,50,96,0),(14,'2','ดำเนินการ',0,'2022-10-21','2022-10-20',18,96,0,50,96,0),(15,'2334','เรียนดี',0,'2022-10-10','2022-10-07',14,93,0,30,93,0),(16,'camp-1','เข้าค่าย-กินนอน',NULL,'2022-10-12','2022-10-10',20,104,NULL,30,104,0),(17,'insom01-1','insom01-วางแผน',NULL,'2022-12-30','2022-11-15',26,104,NULL,25,104,0),(18,'insom01-2','insom01-เสนอขออนุมัติ',NULL,'2022-12-30','2022-11-15',26,104,NULL,25,104,0),(19,'insom01-3','insom01-ดำเนินการ',NULL,'2022-12-30','2022-11-15',26,104,NULL,50,104,0),(20,'insom01-4','insom01-รายงานผล',NULL,'2022-12-30','2022-11-15',26,104,NULL,20,104,0),(21,'insom01-1','วางแผน',NULL,'2022-11-25','2022-11-15',27,96,NULL,25,96,0),(22,'insom01-2','เสนอขออนุมัติ',NULL,'2022-11-25','2022-11-15',27,96,NULL,25,96,0),(23,'insom01-3','ดำเนินการ',NULL,'2022-12-30','2022-11-15',27,96,NULL,50,96,0),(24,'insom01-4','รายงานผล',NULL,'2022-12-30','2022-12-26',27,96,NULL,20,96,0),(25,'insom02-1','ซื้อวัสดุ',NULL,'2022-11-22','2022-11-15',28,96,NULL,60,96,0),(26,'insom02-2','ซื้อวัสดุ2',NULL,'2022-11-29','2022-11-22',28,96,NULL,40,96,0),(27,'11','1111',NULL,'2022-11-17','2022-11-17',22,100,NULL,25,95,0),(28,'m-270-1','กิจกรรมวันคริสต์มาสเดย์ ช่วงเช้า',NULL,'2022-11-19','2022-11-18',30,104,NULL,50,104,0),(29,'m-270-1','กิจกรรมวันคริสต์มาสเดย์ ช่วงเที่ยง',NULL,'2022-11-19','2022-11-18',30,104,NULL,20,104,0),(30,'m-270-1','กิจกรรมวันคริสต์มาสเดย์ ช่วงบ่าย',NULL,'2022-11-19','2022-11-18',30,104,NULL,20,104,0),(31,'m-270-1','กิจกรรมวันคริสต์มาสเดย์ ช่วงแลง',0,'2022-11-19','2022-11-18',30,104,NULL,5,104,1),(32,'m-270-1','กิจกรรมวันคริสต์มาสเดย์ ช่วงแลง',NULL,'2022-11-19','2022-11-18',30,104,NULL,10,104,0),(33,'01','ประชุมความสำเร็จครู',NULL,'2023-03-17','2023-03-14',36,131,NULL,10,131,0),(34,'02','อบรมครู',NULL,'2023-03-16','2023-03-15',36,132,NULL,80,131,0),(35,'03','ประเมินโครงการ',NULL,'2023-03-17','2023-03-17',36,134,NULL,10,131,0);
/*!40000 ALTER TABLE `activity` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-04-03  7:17:59
