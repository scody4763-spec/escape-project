-- ============================================
-- 逃生系统数据库表
-- 用于微信小程序火灾报警 + GPS逃生导航
-- ============================================

-- 1. 用户订阅表：用户扫码后订阅设备火灾通知
CREATE TABLE IF NOT EXISTS `user_subscription` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `openid` VARCHAR(64) NOT NULL COMMENT '微信OpenID',
  `device_id` VARCHAR(64) NOT NULL COMMENT '设备ID（如ESP32_D8:BC:38:78:21:98）',
  `device_location` VARCHAR(128) COMMENT '设备位置描述（如：1F大厅）',
  `subscribe_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `status` TINYINT DEFAULT 1 COMMENT '1=订阅中 0=已取消',
  UNIQUE KEY `uk_openid_device` (`openid`, `device_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户火灾通知订阅表';

-- 2. 火灾报警记录表
CREATE TABLE IF NOT EXISTS `fire_alarm` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `device_id` VARCHAR(64) NOT NULL COMMENT '报警设备ID',
  `device_location` VARCHAR(128) COMMENT '设备位置',
  `alarm_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '报警时间',
  `danger_level` VARCHAR(20) COMMENT '危险等级（低/中/高/极高）',
  `temperature` FLOAT COMMENT '报警时温度',
  `notify_count` INT DEFAULT 0 COMMENT '通知人数',
  `status` TINYINT DEFAULT 1 COMMENT '1=报警中 2=已解除',
  INDEX `idx_device` (`device_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='火灾报警记录表';

-- 3. 微信推送日志表
CREATE TABLE IF NOT EXISTS `push_log` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `alarm_id` INT COMMENT '报警记录ID',
  `openid` VARCHAR(64),
  `push_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `push_status` TINYINT COMMENT '1=成功 0=失败',
  `error_msg` VARCHAR(256) COMMENT '失败原因',
  INDEX `idx_alarm` (`alarm_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='微信推送日志表';

-- 4. GPS节点映射表：每个指示灯节点的GPS坐标
CREATE TABLE IF NOT EXISTS `gps_node_mapping` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `node_id` VARCHAR(32) NOT NULL COMMENT '图节点ID（对应graph_node.node_key）',
  `mac_address` VARCHAR(32) NOT NULL COMMENT '指示灯MAC地址',
  `floor` INT NOT NULL COMMENT '楼层',
  `latitude` DOUBLE NOT NULL COMMENT '纬度',
  `longitude` DOUBLE NOT NULL COMMENT '经度',
  `description` VARCHAR(128) COMMENT '位置描述（如：1F大厅/走廊转角）',
  `is_exit` TINYINT DEFAULT 0 COMMENT '1=安全出口',
  UNIQUE KEY `uk_node` (`node_id`),
  UNIQUE KEY `uk_mac` (`mac_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='GPS节点坐标映射表';

-- 5. 用户实时位置表
CREATE TABLE IF NOT EXISTS `user_location` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `openid` VARCHAR(64) NOT NULL,
  `latitude` DOUBLE NOT NULL,
  `longitude` DOUBLE NOT NULL,
  `floor` INT COMMENT '匹配楼层',
  `node_id` VARCHAR(32) COMMENT '匹配节点',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_openid` (`openid`),
  INDEX `idx_update` (`update_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户实时位置表';

-- 6. 逃生路径记录表
CREATE TABLE IF NOT EXISTS `escape_path` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `openid` VARCHAR(64) NOT NULL,
  `start_node` VARCHAR(32) NOT NULL COMMENT '起点节点',
  `exit_node` VARCHAR(32) NOT NULL COMMENT '出口节点',
  `fire_node` VARCHAR(32) COMMENT '火灾点节点',
  `path_nodes` TEXT COMMENT '路径节点JSON数组',
  `direction` VARCHAR(10) COMMENT '当前逃生方向',
  `distance` FLOAT COMMENT '距离（米）',
  `estimated_time` INT COMMENT '预计时间（秒）',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_openid` (`openid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='逃生路径记录表';
