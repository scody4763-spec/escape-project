/*
 Navicat Premium Data Transfer

 Source Server         : MySQL80
 Source Server Type    : MySQL
 Source Server Version : 80032
 Source Host           : localhost:3306
 Source Schema         : aiot

 Target Server Type    : MySQL
 Target Server Version : 80032
 File Encoding         : 65001

 Date: 16/03/2026 18:27:39
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for admin
-- ----------------------------
DROP TABLE IF EXISTS `admin`;
CREATE TABLE `admin`  (
  `id` bigint(0) NOT NULL AUTO_INCREMENT,
  `user_account` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `phone` char(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `delete_state` tinyint(0) NOT NULL DEFAULT 0 COMMENT '0-正常 1-注销',
  `identity` tinyint(0) NOT NULL DEFAULT 1 COMMENT '1-管理员 2-超级管理员',
  `avatar_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_user_account`(`user_account`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of admin
-- ----------------------------
INSERT INTO `admin` VALUES (1, 'admin', '$2a$10$4nWSwTZflUKOYhnw4XIej.dtGTkzeOAEBvFCs89OPkK4nrB47WhUm', '系统管理员', '00000000000', 'admin@aiot.local', 0, 2, '');
INSERT INTO `admin` VALUES (2, 'manager', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '普通管理员', '00000000001', 'manager@aiot.local', 0, 1, '');

-- ----------------------------
-- Table structure for board
-- ----------------------------
DROP TABLE IF EXISTS `board`;
CREATE TABLE `board`  (
  `id` int(0) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `status` tinyint(0) NOT NULL DEFAULT 1 COMMENT '0-禁用 1-启用',
  `create_time` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `update_time` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of board
-- ----------------------------
INSERT INTO `board` VALUES (1, '主控板-A1', 1, '2026-03-16 11:37:18', '2026-03-16 11:37:18');
INSERT INTO `board` VALUES (2, '主控板-A2', 1, '2026-03-16 11:37:18', '2026-03-16 11:37:18');
INSERT INTO `board` VALUES (3, '主控板-B1', 1, '2026-03-16 11:37:18', '2026-03-16 11:37:18');

-- ----------------------------
-- Table structure for device_alert
-- ----------------------------
DROP TABLE IF EXISTS `device_alert`;
CREATE TABLE `device_alert`  (
  `id` bigint(0) NOT NULL AUTO_INCREMENT,
  `device_type` tinyint(0) NOT NULL DEFAULT 1 COMMENT '设备类型：1-sensor 2-signboard',
  `device_id` bigint(0) NOT NULL DEFAULT 0 COMMENT '对应设备的 id',
  `mac_address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '' COMMENT '设备 MAC 地址',
  `alert_type` tinyint(0) NOT NULL DEFAULT 1 COMMENT '异常类型：1-离线 2-火焰报警 3-电流异常 4-其他',
  `alert_desc` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '' COMMENT '异常描述',
  `status` tinyint(0) NOT NULL DEFAULT 0 COMMENT '处理状态：0-未处理 1-已处理 2-已忽略',
  `resolved_at` datetime(0) NULL DEFAULT NULL COMMENT '处理时间',
  `create_time` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) COMMENT '异常发生时间',
  `update_time` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_device`(`device_type`, `device_id`) USING BTREE,
  INDEX `idx_mac_address`(`mac_address`) USING BTREE,
  INDEX `idx_create_time`(`create_time`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '设备异常状态记录表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of device_alert
-- ----------------------------

-- ----------------------------
-- Table structure for notification_log
-- ----------------------------
DROP TABLE IF EXISTS `notification_log`;
CREATE TABLE `notification_log`  (
  `id` bigint(0) NOT NULL AUTO_INCREMENT,
  `alert_id` bigint(0) NOT NULL COMMENT '关联的 device_alert.id',
  `location` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '' COMMENT '火灾发生地点',
  `event_desc` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '' COMMENT '事件描述，如：检测到火焰，温度异常',
  `from_email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '' COMMENT '发件方邮箱',
  `to_email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '' COMMENT '收件方邮箱',
  `send_status` tinyint(0) NOT NULL  COMMENT '发送状态：1-发送成功 2-发送失败',
  `fail_reason` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '' COMMENT '失败原因',
  `send_time` datetime(0) NULL DEFAULT NULL COMMENT '实际发送时间',
  `create_time` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `update_time` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_alert_id`(`alert_id`) USING BTREE,
  INDEX `idx_to_email`(`to_email`) USING BTREE,
  INDEX `idx_send_time`(`send_time`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '火灾邮件通知记录表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of notification_log
-- ----------------------------

-- ----------------------------
-- Table structure for sensor
-- ----------------------------
DROP TABLE IF EXISTS `sensor`;
CREATE TABLE `sensor`  (
  `id` bigint(0) NOT NULL AUTO_INCREMENT,
  `mac_address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `board_id` int(0) NOT NULL DEFAULT 0,
  `img` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `status` tinyint(0) NOT NULL DEFAULT 1 COMMENT '0-禁用 1-启用',
  `create_time` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `update_time` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_mac_address`(`mac_address`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of sensor
-- ----------------------------
INSERT INTO `sensor` VALUES (1, 'ESP32_D8:BC:38:78:21:98', '温湿度传感器-1F-走廊', 1, '', 1, '2026-03-16 11:38:03', '2026-03-16 11:38:03');
INSERT INTO `sensor` VALUES (2, 'ESP32_D8:BC:38:78:24:B8', '温湿度传感器-2F-走廊', 2, '', 1, '2026-03-16 11:38:03', '2026-03-16 11:38:03');

-- ----------------------------
-- Table structure for signboard
-- ----------------------------
DROP TABLE IF EXISTS `signboard`;
CREATE TABLE `signboard`  (
  `id` bigint(0) NOT NULL AUTO_INCREMENT,
  `mac_address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `display_left` int(0) NOT NULL DEFAULT 10 COMMENT '1-Left 2-Right 3- Down 4-Up 5-left 6-right 7-down 8-up 9-style 10-motifs',
  `display_mid` int(0) NOT NULL DEFAULT 10 COMMENT '1-Left 2-Right 3- Down 4-Up 5-left 6-right 7-down 8-up 9-style 10-motifs',
  `display_right` int(0) NOT NULL DEFAULT 10 COMMENT '1-Left 2-Right 3- Down 4-Up 5-left 6-right 7-down 8-up 9-style 10-motifs',
  `rgb_left` json NOT NULL,
  `rgb_mid` json NOT NULL,
  `rgb_right` json NOT NULL,
  `led` int(0) NOT NULL DEFAULT 512 COMMENT '亮度 1-1024',
  `buzzer` int(0) NOT NULL DEFAULT 1 COMMENT '蜂鸣器 1-关 2-开',
  `flame` int(0) NOT NULL DEFAULT 1 COMMENT '火焰检测？ 1-True触发警报 2-False停止',
  `electricity_switch` int(0) NOT NULL DEFAULT 1 COMMENT '电流检测开关 1-ON 2-OFF',
  `address` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `create_time` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `update_time` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_mac_address`(`mac_address`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of signboard
-- ----------------------------
INSERT INTO `signboard` VALUES (1, 'AA:BB:CC:DD:EE:11', 1, 10, 6, '[255, 0, 0]', '[0, 255, 0]', '[0, 0, 255]', 512, 1, 2, 1, '1F-东侧走廊', '测试设备1', '2026-03-16 11:38:03', '2026-03-16 11:38:03');
INSERT INTO `signboard` VALUES (2, 'AA:BB:CC:DD:EE:12', 1, 2, 4, '[255, 0, 0]', '[0, 255, 0]', '[0, 0, 255]', 800, 2, 1, 1, '1F-西侧走廊', '测试设备2，蜂鸣器开，开启火焰报警', '2026-03-16 11:38:03', '2026-03-16 11:38:03');
INSERT INTO `signboard` VALUES (3, 'AA:BB:CC:DD:EE:13', 9, 9, 9, '[255, 255, 0]', '[0, 255, 255]', '[128, 0, 128]', 300, 1, 2, 2, '2F-东侧走廊', '测试设备3，电流检测关闭', '2026-03-16 11:38:03', '2026-03-16 11:38:03');
INSERT INTO `signboard` VALUES (4, 'AA:BB:CC:DD:EE:14', 5, 3, 8, '[255, 0, 0]', '[0, 255, 0]', '[0, 0, 255]', 700, 2, 2, 1, '2F-西侧走廊', '测试设备4', '2026-03-16 11:38:03', '2026-03-16 11:38:03');
INSERT INTO `signboard` VALUES (5, 'AA:BB:CC:DD:EE:15', 10, 10, 10, '[128, 128, 128]', '[128, 128, 128]', '[128, 128, 128]', 200, 1, 2, 1, '3F-主通道', '测试设备5，低亮度', '2026-03-16 11:38:03', '2026-03-16 11:38:03');

-- ----------------------------
-- Table structure for ceiling_lights
-- ----------------------------
DROP TABLE IF EXISTS `ceiling_lights`;
CREATE TABLE `ceiling_lights` (
  `id` bigint(0) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `device_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '' COMMENT '设备唯一标识',
  `mac_address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '' COMMENT 'MAC地址',
  `floor_id` int(0) NOT NULL DEFAULT 1 COMMENT '楼层ID',
  `zone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '' COMMENT '区域（A/B/C等）',
  `address` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '' COMMENT '位置地址',
  `status` tinyint(0) NOT NULL DEFAULT 1 COMMENT '状态 0-禁用 1-启用',
  `create_time` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) COMMENT '创建时间',
  `update_time` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0) COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_device_id`(`device_id`) USING BTREE,
  INDEX `idx_mac_address`(`mac_address`) USING BTREE,
  INDEX `idx_floor_id`(`floor_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '吸顶灯设备表' ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;