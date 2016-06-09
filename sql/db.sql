CREATE DATABASE 'dev';

USE 'dev';

CREATE TABLE `country_m` (
  `country_recid` varchar(36) NOT NULL COMMENT 'uuid - unique identifier',
  `country_name` varchar(50) NOT NULL,
  `voltage_level` int(3) NOT NULL,
  `reg_domain` int(10) DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `created_on` datetime DEFAULT NULL,
  `modified_on` datetime DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`country_recid`),
  UNIQUE KEY `country_name` (`country_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8

INSERT INTO `country_m` VALUES ('79cc1e76-caaf-11e5-a3dc-04019c67b301','Europe',230,48,'Country details of Europe',1,'2016-02-03 14:51:11','2016-02-03 14:51:11','Seed Data'),('79cc23da-caaf-11e5-a3dc-04019c67b301','Spain',220,49,'Country details of Spain',1,'2016-02-03 14:51:11','2016-02-03 14:51:11','Seed Data'),('79cc25f9-caaf-11e5-a3dc-04019c67b301','France',220,50,'Country details of France',1,'2016-02-03 14:51:11','2016-02-03 14:51:11','Seed Data'),('79cc266e-caaf-11e5-a3dc-04019c67b301','Japan',100,64,'Country details of Japan',1,'2016-02-03 14:51:11','2016-02-03 14:51:11','Seed Data'),('79cc26c0-caaf-11e5-a3dc-04019c67b301','China',220,80,'Country details of China',1,'2016-02-03 14:51:11','2016-02-03 14:51:11','Seed Data'),('cd2276db-668b-11e4-945d-000c29609978','United States',120,16,'Country details of United States',1,'2014-11-07 00:00:00','2014-11-07 00:00:00','Seed Data'),('cd227f0c-668b-11e4-945d-000c29609978','Canada',120,50,'Country details of Canada',1,'2014-11-07 00:00:00','2014-11-07 00:00:00','Seed Data');
