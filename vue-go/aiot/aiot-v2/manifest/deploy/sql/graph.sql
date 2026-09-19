-- ============================================
-- Building Graph Node Table: rooms, corridors, exits, stairs, etc.
-- ============================================
CREATE TABLE IF NOT EXISTS `graph_node` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `floor_id`   INT UNSIGNED NOT NULL COMMENT 'Floor (1=1F, 2=2F...)',
  `node_key`   VARCHAR(64)  NOT NULL COMMENT 'Unique node key (e.g. f1-lobby, stair-east)',
  `name`       VARCHAR(128) NOT NULL COMMENT 'Node display name',
  `node_type`  ENUM('room','corridor','exit','stair','elevator') NOT NULL,
  `x`          DECIMAL(8,2) NOT NULL COMMENT 'X coordinate (meters)',
  `y`          DECIMAL(8,2) NOT NULL DEFAULT 0 COMMENT 'Y coordinate / height (meters)',
  `z`          DECIMAL(8,2) NOT NULL COMMENT 'Z coordinate (meters)',
  `capacity`   INT UNSIGNED DEFAULT NULL COMMENT 'Max capacity',
  `is_exit`    TINYINT(1)   NOT NULL DEFAULT 0,
  `status`     TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '1=passable 0=closed',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_node_key` (`node_key`),
  KEY `idx_floor` (`floor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Building Graph - Node';

-- ============================================
-- Building Graph Edge Table: connections between nodes
-- ============================================
CREATE TABLE IF NOT EXISTS `graph_edge` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `from_node_key` VARCHAR(64) NOT NULL COMMENT 'Source node key',
  `to_node_key`   VARCHAR(64) NOT NULL COMMENT 'Target node key',
  `distance`      DECIMAL(8,2) NOT NULL COMMENT 'Physical distance (meters)',
  `base_weight`   DECIMAL(8,2) NOT NULL DEFAULT 1.0 COMMENT 'Base weight (1.0=normal)',
  `width`         DECIMAL(5,2) DEFAULT NULL COMMENT 'Corridor width (meters)',
  `bidirectional` TINYINT(1)  NOT NULL DEFAULT 1 COMMENT 'Bidirectional',
  `status`        TINYINT(1)  NOT NULL DEFAULT 1 COMMENT '1=passable 0=closed',
  `created_at`    DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_edge` (`from_node_key`, `to_node_key`),
  KEY `idx_from` (`from_node_key`),
  KEY `idx_to` (`to_node_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Building Graph - Edge';

-- ============================================
-- Sensor-Node Binding Table
-- ============================================
CREATE TABLE IF NOT EXISTS `sensor_node_binding` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sensor_id`  INT UNSIGNED NOT NULL,
  `node_key`   VARCHAR(64)  NOT NULL COMMENT 'Bound node key',
  `influence_radius` DECIMAL(5,2) DEFAULT 5.0 COMMENT 'Influence radius (meters)',
  PRIMARY KEY (`id`),
  KEY `idx_sensor` (`sensor_id`),
  KEY `idx_node` (`node_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Sensor-Node Binding';

-- ============================================
-- Algorithm Configuration Table
-- ============================================
CREATE TABLE IF NOT EXISTS `algorithm_config` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `algorithm`   ENUM('aco','pso','sa','ga') NOT NULL,
  `name`        VARCHAR(64) NOT NULL COMMENT 'Config name',
  `params_json` JSON NOT NULL COMMENT 'Algorithm parameters JSON',
  `is_default`  TINYINT(1) NOT NULL DEFAULT 0,
  `created_at`  DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_algo_name` (`algorithm`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Algorithm Configuration';

-- ============================================
-- Seed Data: Building Floor Graph
-- ============================================

-- 1F nodes
INSERT INTO `graph_node` (`floor_id`,`node_key`,`name`,`node_type`,`x`,`y`,`z`,`is_exit`) VALUES
(1, 'f1-lobby',      '1F Lobby',       'room',     0,    0,    0,   0),
(1, 'f1-shop-a',     '1F Shop A',      'room',    -8,    0,   -5,   0),
(1, 'f1-shop-b',     '1F Shop B',      'room',    -8,    0,    2,   0),
(1, 'f1-shop-c',     '1F Shop C',      'room',     5,    0,   -5,   0),
(1, 'f1-shop-d',     '1F Shop D',      'room',     5,    0,    2,   0),
(1, 'f1-cor-w',      '1F West Corridor',   'corridor', -8,    0,    0,   0),
(1, 'f1-cor-e',      '1F East Corridor',   'corridor',  8,    0,    0,   0),
(1, 'f1-cor-n',      '1F North Corridor',  'corridor',  0,    0,    7,   0),
(1, 'f1-cor-s',      '1F South Corridor',  'corridor',  0,    0,   -7,   0),
(1, 'f1-exit-east',  '1F East Exit',       'exit',     10,    0,    0,   1),
(1, 'f1-exit-west',  '1F West Exit',       'exit',    -10,    0,    0,   1),
(1, 'f1-exit-south', '1F South Exit',      'exit',      0,    0,  -9,    1),
(1, 'f1-exit-north', '1F North Exit',      'exit',      0,    0,   9,    1),
(1, 'f1-stair-east', 'East Stair-1F',      'stair',     9,    0,    6,   0),
(1, 'f1-stair-west', 'West Stair-1F',      'stair',    -9,    0,    6,   0),
(1, 'f1-stair-north','North Stair-1F',     'stair',     0,    0,    8,   0),
(1, 'f1-stair-south','South Stair-1F',     'stair',     0,    0,   -8,   0),
(1, 'f1-elevator',   'Elevator-1F',        'elevator',  0,    0,    6,   0);

-- 2F nodes
INSERT INTO `graph_node` (`floor_id`,`node_key`,`name`,`node_type`,`x`,`y`,`z`,`is_exit`) VALUES
(2, 'f2-office-a',   '2F Office A',    'room',    -7,   4.5,  -4,   0),
(2, 'f2-office-b',   '2F Office B',    'room',     7,   4.5,  -4,   0),
(2, 'f2-meeting',    '2F Meeting Room','room',     0,   4.5,  -4,   0),
(2, 'f2-cor-main',   '2F Main Corridor','corridor',  0,   4.5,   0,   0),
(2, 'f2-cor-w',      '2F West Corridor','corridor', -8,   4.5,   0,   0),
(2, 'f2-cor-e',      '2F East Corridor','corridor',  8,   4.5,   0,   0),
(2, 'f2-stair-east', 'East Stair-2F',  'stair',     9,   4.5,   6,   0),
(2, 'f2-stair-west', 'West Stair-2F',  'stair',    -9,   4.5,   6,   0),
(2, 'f2-stair-north','North Stair-2F', 'stair',     0,   4.5,   8,   0),
(2, 'f2-stair-south','South Stair-2F', 'stair',     0,   4.5,  -8,   0),
(2, 'f2-elevator',   'Elevator-2F',    'elevator',  0,   4.5,   6,   0);

-- 3F nodes
INSERT INTO `graph_node` (`floor_id`,`node_key`,`name`,`node_type`,`x`,`y`,`z`,`is_exit`) VALUES
(3, 'f3-hall',        '3F Exhibition Hall','room',     0,    9,   -3,   0),
(3, 'f3-server',      '3F Server Room',    'room',    -7,    9,    0,   0),
(3, 'f3-lounge',      '3F Lounge',         'room',     7,    9,    0,   0),
(3, 'f3-cor-main',    '3F Main Corridor',  'corridor',  0,    9,    0,   0),
(3, 'f3-stair-east',  'East Stair-3F',     'stair',     9,    9,    6,   0),
(3, 'f3-stair-west',  'West Stair-3F',     'stair',    -9,    9,    6,   0),
(3, 'f3-stair-north', 'North Stair-3F',    'stair',     0,    9,    8,   0),
(3, 'f3-stair-south', 'South Stair-3F',    'stair',     0,    9,   -8,   0),
(3, 'f3-elevator',    'Elevator-3F',       'elevator',  0,    9,    6,   0);

-- 4F nodes (Office Floor)
INSERT INTO `graph_node` (`floor_id`,`node_key`,`name`,`node_type`,`x`,`y`,`z`,`is_exit`) VALUES
(4, 'f4-office-a',   '4F Office A',     'room',    -7,  13.5,  -4,   0),
(4, 'f4-office-b',   '4F Office B',     'room',     7,  13.5,  -4,   0),
(4, 'f4-training',   '4F Training Room','room',     0,  13.5,  -4,   0),
(4, 'f4-cor-main',   '4F Main Corridor','corridor',  0,  13.5,   0,   0),
(4, 'f4-cor-w',      '4F West Corridor','corridor', -8,  13.5,   0,   0),
(4, 'f4-cor-e',      '4F East Corridor','corridor',  8,  13.5,   0,   0),
(4, 'f4-stair-east', 'East Stair-4F',   'stair',     9,  13.5,   6,   0),
(4, 'f4-stair-west', 'West Stair-4F',   'stair',    -9,  13.5,   6,   0),
(4, 'f4-stair-north','North Stair-4F',  'stair',     0,  13.5,   8,   0),
(4, 'f4-stair-south','South Stair-4F',  'stair',     0,  13.5,  -8,   0),
(4, 'f4-elevator',   'Elevator-4F',     'elevator',  0,  13.5,   6,   0);

-- 5F nodes (Mixed Use Floor)
INSERT INTO `graph_node` (`floor_id`,`node_key`,`name`,`node_type`,`x`,`y`,`z`,`is_exit`) VALUES
(5, 'f5-lab',        '5F Lab',            'room',    -7,   18,   -4,   0),
(5, 'f5-library',    '5F Library',        'room',     7,   18,   -4,   0),
(5, 'f5-meeting-b',  '5F Meeting Room B', 'room',     0,   18,   -4,   0),
(5, 'f5-cor-main',   '5F Main Corridor',  'corridor',  0,   18,    0,   0),
(5, 'f5-cor-w',      '5F West Corridor',  'corridor', -8,   18,    0,   0),
(5, 'f5-cor-e',      '5F East Corridor',  'corridor',  8,   18,    0,   0),
(5, 'f5-stair-east', 'East Stair-5F',     'stair',     9,   18,    6,   0),
(5, 'f5-stair-west', 'West Stair-5F',     'stair',    -9,   18,    6,   0),
(5, 'f5-stair-north','North Stair-5F',    'stair',     0,   18,    8,   0),
(5, 'f5-stair-south','South Stair-5F',    'stair',     0,   18,   -8,   0),
(5, 'f5-elevator',   'Elevator-5F',       'elevator',  0,   18,    6,   0);

-- 6F nodes (Top Floor)
INSERT INTO `graph_node` (`floor_id`,`node_key`,`name`,`node_type`,`x`,`y`,`z`,`is_exit`) VALUES
(6, 'f6-server',     '6F Server Room',    'room',    -7,  22.5,  -4,   0),
(6, 'f6-lounge',     '6F Lounge',         'room',     7,  22.5,  -4,   0),
(6, 'f6-hall',       '6F Hall',           'room',     0,  22.5,  -3,   0),
(6, 'f6-cor-main',   '6F Main Corridor',  'corridor',  0,  22.5,   0,   0),
(6, 'f6-cor-w',      '6F West Corridor',  'corridor', -8,  22.5,   0,   0),
(6, 'f6-cor-e',      '6F East Corridor',  'corridor',  8,  22.5,   0,   0),
(6, 'f6-stair-east', 'East Stair-6F',     'stair',     9,  22.5,   6,   0),
(6, 'f6-stair-west', 'West Stair-6F',     'stair',    -9,  22.5,   6,   0),
(6, 'f6-stair-north','North Stair-6F',    'stair',     0,  22.5,   8,   0),
(6, 'f6-stair-south','South Stair-6F',    'stair',     0,  22.5,  -8,   0),
(6, 'f6-elevator',   'Elevator-6F',       'elevator',  0,  22.5,   6,   0);

-- 1F edges (corridor connections)
INSERT INTO `graph_edge` (`from_node_key`,`to_node_key`,`distance`,`base_weight`,`width`,`bidirectional`) VALUES
('f1-lobby',      'f1-cor-w',      8.0,  1.0, 3.0, 1),
('f1-lobby',      'f1-cor-e',      8.0,  1.0, 3.0, 1),
('f1-lobby',      'f1-cor-n',      7.0,  1.0, 2.5, 1),
('f1-lobby',      'f1-cor-s',      7.0,  1.0, 2.5, 1),
('f1-cor-w',      'f1-shop-a',     5.0,  1.0, 2.0, 1),
('f1-cor-w',      'f1-shop-b',     2.0,  1.0, 2.0, 1),
('f1-cor-w',      'f1-exit-west',  2.0,  1.0, 3.0, 1),
('f1-cor-e',      'f1-shop-c',     5.0,  1.0, 2.0, 1),
('f1-cor-e',      'f1-shop-d',     2.0,  1.0, 2.0, 1),
('f1-cor-e',      'f1-exit-east',  2.0,  1.0, 3.0, 1),
('f1-cor-s',      'f1-exit-south', 2.0,  1.0, 3.0, 1),
('f1-cor-n',      'f1-exit-north', 2.0,  1.0, 3.0, 1),
('f1-cor-n',      'f1-stair-east', 9.1,  1.0, 2.0, 1),
('f1-cor-n',      'f1-stair-west', 9.1,  1.0, 2.0, 1),
('f1-cor-n',      'f1-stair-north', 2.0,  1.0, 2.0, 1),
('f1-cor-s',      'f1-stair-south', 2.0,  1.0, 2.0, 1),
('f1-cor-n',      'f1-elevator',   1.0,  1.0, 2.0, 1),
('f1-cor-e',      'f1-stair-east', 6.1,  1.0, 2.0, 1),
('f1-cor-w',      'f1-stair-west', 6.1,  1.0, 2.0, 1);

-- 2F edges
INSERT INTO `graph_edge` (`from_node_key`,`to_node_key`,`distance`,`base_weight`,`width`,`bidirectional`) VALUES
('f2-cor-main',   'f2-cor-w',      8.0,  1.0, 3.0, 1),
('f2-cor-main',   'f2-cor-e',      8.0,  1.0, 3.0, 1),
('f2-cor-main',   'f2-meeting',    4.0,  1.0, 2.0, 1),
('f2-cor-w',      'f2-office-a',   4.1,  1.0, 2.0, 1),
('f2-cor-e',      'f2-office-b',   4.1,  1.0, 2.0, 1),
('f2-cor-e',      'f2-stair-east', 6.1,  1.0, 2.0, 1),
('f2-cor-w',      'f2-stair-west', 6.1,  1.0, 2.0, 1),
('f2-cor-main',   'f2-stair-north', 8.0,  1.0, 2.0, 1),
('f2-cor-main',   'f2-stair-south', 8.0,  1.0, 2.0, 1),
('f2-cor-main',   'f2-elevator',   6.0,  1.0, 2.0, 1);

-- 3F edges
INSERT INTO `graph_edge` (`from_node_key`,`to_node_key`,`distance`,`base_weight`,`width`,`bidirectional`) VALUES
('f3-cor-main',   'f3-hall',       3.0,  1.0, 2.5, 1),
('f3-cor-main',   'f3-server',     7.0,  1.0, 2.0, 1),
('f3-cor-main',   'f3-lounge',     7.0,  1.0, 2.0, 1),
('f3-cor-main',   'f3-stair-east', 9.5,  1.0, 2.0, 1),
('f3-cor-main',   'f3-stair-west', 9.5,  1.0, 2.0, 1),
('f3-cor-main',   'f3-stair-north', 8.0,  1.0, 2.0, 1),
('f3-cor-main',   'f3-stair-south', 8.0,  1.0, 2.0, 1),
('f3-cor-main',   'f3-elevator',   6.0,  1.0, 2.0, 1),
('f3-lounge',     'f3-stair-east', 6.3,  1.0, 2.0, 1),
('f3-server',     'f3-stair-west', 6.3,  1.0, 2.0, 1);

-- 4F edges
INSERT INTO `graph_edge` (`from_node_key`,`to_node_key`,`distance`,`base_weight`,`width`,`bidirectional`) VALUES
('f4-cor-main',   'f4-cor-w',      8.0,  1.0, 3.0, 1),
('f4-cor-main',   'f4-cor-e',      8.0,  1.0, 3.0, 1),
('f4-cor-main',   'f4-training',   4.0,  1.0, 2.0, 1),
('f4-cor-w',      'f4-office-a',   4.1,  1.0, 2.0, 1),
('f4-cor-e',      'f4-office-b',   4.1,  1.0, 2.0, 1),
('f4-cor-e',      'f4-stair-east', 6.1,  1.0, 2.0, 1),
('f4-cor-w',      'f4-stair-west', 6.1,  1.0, 2.0, 1),
('f4-cor-main',   'f4-stair-north', 8.0,  1.0, 2.0, 1),
('f4-cor-main',   'f4-stair-south', 8.0,  1.0, 2.0, 1),
('f4-cor-main',   'f4-elevator',   6.0,  1.0, 2.0, 1);

-- 5F edges
INSERT INTO `graph_edge` (`from_node_key`,`to_node_key`,`distance`,`base_weight`,`width`,`bidirectional`) VALUES
('f5-cor-main',   'f5-cor-w',      8.0,  1.0, 3.0, 1),
('f5-cor-main',   'f5-cor-e',      8.0,  1.0, 3.0, 1),
('f5-cor-main',   'f5-meeting-b',  4.0,  1.0, 2.0, 1),
('f5-cor-w',      'f5-lab',        4.1,  1.0, 2.0, 1),
('f5-cor-e',      'f5-library',    4.1,  1.0, 2.0, 1),
('f5-cor-e',      'f5-stair-east', 6.1,  1.0, 2.0, 1),
('f5-cor-w',      'f5-stair-west', 6.1,  1.0, 2.0, 1),
('f5-cor-main',   'f5-stair-north', 8.0,  1.0, 2.0, 1),
('f5-cor-main',   'f5-stair-south', 8.0,  1.0, 2.0, 1),
('f5-cor-main',   'f5-elevator',   6.0,  1.0, 2.0, 1);

-- 6F edges
INSERT INTO `graph_edge` (`from_node_key`,`to_node_key`,`distance`,`base_weight`,`width`,`bidirectional`) VALUES
('f6-cor-main',   'f6-cor-w',      8.0,  1.0, 3.0, 1),
('f6-cor-main',   'f6-cor-e',      8.0,  1.0, 3.0, 1),
('f6-cor-main',   'f6-hall',       3.0,  1.0, 2.5, 1),
('f6-cor-w',      'f6-server',     7.0,  1.0, 2.0, 1),
('f6-cor-e',      'f6-lounge',     7.0,  1.0, 2.0, 1),
('f6-cor-e',      'f6-stair-east', 6.1,  1.0, 2.0, 1),
('f6-cor-w',      'f6-stair-west', 6.1,  1.0, 2.0, 1),
('f6-cor-main',   'f6-stair-north', 8.0,  1.0, 2.0, 1),
('f6-cor-main',   'f6-stair-south', 8.0,  1.0, 2.0, 1),
('f6-cor-main',   'f6-elevator',   6.0,  1.0, 2.0, 1);

-- Cross-floor stair connections
INSERT INTO `graph_edge` (`from_node_key`,`to_node_key`,`distance`,`base_weight`,`width`,`bidirectional`) VALUES
('f1-stair-east', 'f2-stair-east', 5.0,  1.2, 1.5, 1),
('f1-stair-west', 'f2-stair-west', 5.0,  1.2, 1.5, 1),
('f1-stair-north','f2-stair-north', 5.0,  1.2, 1.5, 1),
('f1-stair-south','f2-stair-south', 5.0,  1.2, 1.5, 1),
('f1-elevator',   'f2-elevator',   3.0,  1.0, 2.0, 1),
('f2-stair-east', 'f3-stair-east', 5.0,  1.2, 1.5, 1),
('f2-stair-west', 'f3-stair-west', 5.0,  1.2, 1.5, 1),
('f2-stair-north','f3-stair-north', 5.0,  1.2, 1.5, 1),
('f2-stair-south','f3-stair-south', 5.0,  1.2, 1.5, 1),
('f2-elevator',   'f3-elevator',   3.0,  1.0, 2.0, 1),
('f3-stair-east', 'f4-stair-east', 5.0,  1.2, 1.5, 1),
('f3-stair-west', 'f4-stair-west', 5.0,  1.2, 1.5, 1),
('f3-elevator',   'f4-elevator',   3.0,  1.0, 2.0, 1),
('f3-stair-north','f4-stair-north', 5.0,  1.2, 1.5, 1),
('f3-stair-south','f4-stair-south', 5.0,  1.2, 1.5, 1),
('f4-stair-east', 'f5-stair-east', 5.0,  1.2, 1.5, 1),
('f4-stair-west', 'f5-stair-west', 5.0,  1.2, 1.5, 1),
('f4-elevator',   'f5-elevator',   3.0,  1.0, 2.0, 1),
('f4-stair-north','f5-stair-north', 5.0,  1.2, 1.5, 1),
('f4-stair-south','f5-stair-south', 5.0,  1.2, 1.5, 1),
('f5-stair-east', 'f6-stair-east', 5.0,  1.2, 1.5, 1),
('f5-stair-west', 'f6-stair-west', 5.0,  1.2, 1.5, 1),
('f5-elevator',   'f6-elevator',   3.0,  1.0, 2.0, 1),
('f5-stair-north','f6-stair-north', 5.0,  1.2, 1.5, 1),
('f5-stair-south','f6-stair-south', 5.0,  1.2, 1.5, 1);

-- Diagonal paths from central room/hall to stairs (X/Z horizontal model)
INSERT INTO `graph_edge` (`from_node_key`,`to_node_key`,`distance`,`base_weight`,`width`,`bidirectional`) VALUES
('f1-lobby',      'f1-stair-east',  10.82, 1.0, 2.0, 1),
('f1-lobby',      'f1-stair-west',  10.82, 1.0, 2.0, 1),
('f1-lobby',      'f1-stair-north', 8.00,  1.0, 2.0, 1),
('f1-lobby',      'f1-stair-south', 8.00,  1.0, 2.0, 1),
('f2-meeting',    'f2-stair-east',  13.45, 1.0, 2.0, 1),
('f2-meeting',    'f2-stair-west',  13.45, 1.0, 2.0, 1),
('f2-meeting',    'f2-stair-north', 12.00, 1.0, 2.0, 1),
('f2-meeting',    'f2-stair-south', 4.00,  1.0, 2.0, 1),
('f3-hall',       'f3-stair-east',  12.73, 1.0, 2.0, 1),
('f3-hall',       'f3-stair-west',  12.73, 1.0, 2.0, 1),
('f3-hall',       'f3-stair-north', 11.00, 1.0, 2.0, 1),
('f3-hall',       'f3-stair-south', 5.00,  1.0, 2.0, 1),
('f4-training',   'f4-stair-east',  13.45, 1.0, 2.0, 1),
('f4-training',   'f4-stair-west',  13.45, 1.0, 2.0, 1),
('f4-training',   'f4-stair-north', 12.00, 1.0, 2.0, 1),
('f4-training',   'f4-stair-south', 4.00,  1.0, 2.0, 1),
('f5-meeting-b',  'f5-stair-east',  13.45, 1.0, 2.0, 1),
('f5-meeting-b',  'f5-stair-west',  13.45, 1.0, 2.0, 1),
('f5-meeting-b',  'f5-stair-north', 12.00, 1.0, 2.0, 1),
('f5-meeting-b',  'f5-stair-south', 4.00,  1.0, 2.0, 1),
('f6-hall',       'f6-stair-east',  12.73, 1.0, 2.0, 1),
('f6-hall',       'f6-stair-west',  12.73, 1.0, 2.0, 1),
('f6-hall',       'f6-stair-north', 11.00, 1.0, 2.0, 1),
('f6-hall',       'f6-stair-south', 5.00,  1.0, 2.0, 1);

-- Up-diagonal paths: north stair to east/west stair
INSERT INTO `graph_edge` (`from_node_key`,`to_node_key`,`distance`,`base_weight`,`width`,`bidirectional`) VALUES
('f1-stair-north','f1-stair-east', 9.22, 1.0, 2.0, 1),
('f1-stair-north','f1-stair-west', 9.22, 1.0, 2.0, 1),
('f2-stair-north','f2-stair-east', 9.22, 1.0, 2.0, 1),
('f2-stair-north','f2-stair-west', 9.22, 1.0, 2.0, 1),
('f3-stair-north','f3-stair-east', 9.22, 1.0, 2.0, 1),
('f3-stair-north','f3-stair-west', 9.22, 1.0, 2.0, 1),
('f4-stair-north','f4-stair-east', 9.22, 1.0, 2.0, 1),
('f4-stair-north','f4-stair-west', 9.22, 1.0, 2.0, 1),
('f5-stair-north','f5-stair-east', 9.22, 1.0, 2.0, 1),
('f5-stair-north','f5-stair-west', 9.22, 1.0, 2.0, 1),
('f6-stair-north','f6-stair-east', 9.22, 1.0, 2.0, 1),
('f6-stair-north','f6-stair-west', 9.22, 1.0, 2.0, 1);

-- Sensor-node binding seed data
INSERT INTO `sensor_node_binding` (`sensor_id`,`node_key`,`influence_radius`) VALUES
(1, 'f1-lobby', 5.0),
(2, 'f2-cor-main', 5.0);

-- Algorithm default parameters
INSERT INTO `algorithm_config` (`algorithm`,`name`,`params_json`,`is_default`) VALUES
('aco', 'default', '{"ant_count":30,"alpha":1.0,"beta":3.0,"rho":0.3,"Q":100,"max_iterations":200,"danger_weight":10.0}', 1);
