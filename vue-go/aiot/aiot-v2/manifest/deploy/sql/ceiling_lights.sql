-- 吸顶灯设备表
-- 执行此SQL创建ceiling_lights表

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