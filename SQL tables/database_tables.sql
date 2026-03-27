

--
-- Table structure for table `infantparent`
--

DROP TABLE IF EXISTS `infantparent`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `infantparent` (
  `infantparent_id` int NOT NULL AUTO_INCREMENT,
  `infantparent_infant_id` int NOT NULL,
  `infantparent_parent_id` int NOT NULL,
  PRIMARY KEY (`infantparent_id`),
  KEY `infantparent_infant_id` (`infantparent_infant_id`),
  KEY `infantparent_parent_id` (`infantparent_parent_id`),
  CONSTRAINT `infantparent_ibfk_1` FOREIGN KEY (`infantparent_infant_id`) REFERENCES `infants` (`infant_id`),
  CONSTRAINT `infantparent_ibfk_2` FOREIGN KEY (`infantparent_parent_id`) REFERENCES `parents` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `infantrecording`
--

DROP TABLE IF EXISTS `infantrecording`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `infantrecording` (
  `infantrecording_id` int NOT NULL AUTO_INCREMENT,
  `infantrecording_infant_id` int NOT NULL,
  `infantrecording_recording_id` int NOT NULL,
  PRIMARY KEY (`infantrecording_id`),
  KEY `infantrecording_infant_id` (`infantrecording_infant_id`),
  KEY `infantrecording_recording_id` (`infantrecording_recording_id`),
  CONSTRAINT `infantrecording_ibfk_1` FOREIGN KEY (`infantrecording_infant_id`) REFERENCES `infants` (`infant_id`),
  CONSTRAINT `infantrecording_ibfk_2` FOREIGN KEY (`infantrecording_recording_id`) REFERENCES `recordings` (`recording_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `infants`
--

DROP TABLE IF EXISTS `infants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `infants` (
  `infant_id` int NOT NULL,
  `infant_first_name` varchar(255) DEFAULT NULL,
  `infant_last_name` varchar(255) DEFAULT NULL,
  `room_number` int NOT NULL,
  `parent_id` int DEFAULT NULL,
  PRIMARY KEY (`infant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `login`
--

DROP TABLE IF EXISTS `login`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login` (
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `parent_id` int DEFAULT NULL,
  PRIMARY KEY (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `nurse_login`
--

DROP TABLE IF EXISTS `nurse_login`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nurse_login` (
  `nurse_username` varchar(255) NOT NULL,
  `nurse_password` varchar(255) NOT NULL,
  `nurse_id` int NOT NULL,
  PRIMARY KEY (`nurse_username`),
  KEY `nurse_id` (`nurse_id`),
  CONSTRAINT `nurse_login_ibfk_1` FOREIGN KEY (`nurse_id`) REFERENCES `nurses` (`nurse_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `nurses`
--

DROP TABLE IF EXISTS `nurses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nurses` (
  `nurse_id` int NOT NULL AUTO_INCREMENT,
  `nurse_first_name` varchar(255) DEFAULT NULL,
  `nurse_last_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`nurse_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parent_login`
--

DROP TABLE IF EXISTS `parent_login`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parent_login` (
  `parent_username` varchar(255) NOT NULL,
  `parent_password` varchar(255) NOT NULL,
  `parent_code` int NOT NULL,
  PRIMARY KEY (`parent_username`),
  KEY `parent_code` (`parent_code`),
  CONSTRAINT `parent_login_ibfk_1` FOREIGN KEY (`parent_code`) REFERENCES `parents` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parentrecording`
--

DROP TABLE IF EXISTS `parentrecording`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parentrecording` (
  `parentrecording_id` int NOT NULL AUTO_INCREMENT,
  `parentrecording_parent_id` int NOT NULL,
  `parentrecording_recording_id` int NOT NULL,
  PRIMARY KEY (`parentrecording_id`),
  KEY `parentrecording_recording_id` (`parentrecording_recording_id`),
  KEY `parentrecording_parent_id` (`parentrecording_parent_id`),
  CONSTRAINT `parentrecording_ibfk_1` FOREIGN KEY (`parentrecording_parent_id`) REFERENCES `parents` (`parent_id`),
  CONSTRAINT `parentrecording_ibfk_2` FOREIGN KEY (`parentrecording_recording_id`) REFERENCES `recordings` (`recording_id`),
  CONSTRAINT `parentrecording_ibfk_3` FOREIGN KEY (`parentrecording_parent_id`) REFERENCES `parents` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parents`
--

DROP TABLE IF EXISTS `parents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parents` (
  `parent_id` int NOT NULL,
  `parent_first_name` varchar(255) DEFAULT NULL,
  `parent_last_name` varchar(255) DEFAULT NULL,
  `parent_username` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `recording_schedule`
--

DROP TABLE IF EXISTS `recording_schedule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recording_schedule` (
  `schedule_id` int NOT NULL AUTO_INCREMENT,
  `recording_id` int NOT NULL,
  `scheduled_time` datetime NOT NULL,
  `infant_id` int DEFAULT NULL,
  PRIMARY KEY (`schedule_id`)
) ENGINE=InnoDB AUTO_INCREMENT=269 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `recordings`
--

DROP TABLE IF EXISTS `recordings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recordings` (
  `recording_id` int NOT NULL AUTO_INCREMENT,
  `recording_name` varchar(255) DEFAULT NULL,
  `recording_date` datetime DEFAULT NULL,
  `recording_length` time DEFAULT NULL,
  `recording` longblob,
  `requested_name` mediumtext,
  `requested_message` mediumtext,
  `is_played` int DEFAULT '0',
  `date_played` datetime DEFAULT NULL,
  `requested_time` datetime DEFAULT NULL,
  `recording_type` char(3) DEFAULT 'new',
  `infant_id` int DEFAULT NULL,
  PRIMARY KEY (`recording_id`)
) ENGINE=InnoDB AUTO_INCREMENT=126 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `signup`
--

DROP TABLE IF EXISTS `signup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `signup` (
  `parent_code` int NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  PRIMARY KEY (`parent_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
