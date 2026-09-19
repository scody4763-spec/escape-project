-- ============================================
-- BLE 定位迁移：graph_node 表添加 major/minor 字段
-- 执行后重启后端服务即可生效
-- ============================================

ALTER TABLE `graph_node`
  ADD COLUMN `major` INT DEFAULT NULL COMMENT 'BLE Major (楼层号)',
  ADD COLUMN `minor` INT DEFAULT NULL COMMENT 'BLE Minor (节点编号)',
  ADD INDEX `idx_major_minor` (`major`, `minor`);

-- ============================================
-- 填入 Major/Minor 映射数据
-- 规则：Major = floor_id, Minor = 该楼层内序号
-- ⚠️ 修改这里的值，使每个 ESP32 硬件的 NVS 写入值与数据库一致
--    ESP32 固件 Write_Nvs_Defaults() 中写入的值必须与此对应
-- ============================================

-- 1F (Major=1)
UPDATE `graph_node` SET `major`=1, `minor`=1  WHERE `node_key`='f1-lobby';
UPDATE `graph_node` SET `major`=1, `minor`=2  WHERE `node_key`='f1-shop-a';
UPDATE `graph_node` SET `major`=1, `minor`=3  WHERE `node_key`='f1-shop-b';
UPDATE `graph_node` SET `major`=1, `minor`=4  WHERE `node_key`='f1-shop-c';
UPDATE `graph_node` SET `major`=1, `minor`=5  WHERE `node_key`='f1-shop-d';
UPDATE `graph_node` SET `major`=1, `minor`=6  WHERE `node_key`='f1-cor-w';
UPDATE `graph_node` SET `major`=1, `minor`=7  WHERE `node_key`='f1-cor-e';
UPDATE `graph_node` SET `major`=1, `minor`=8  WHERE `node_key`='f1-cor-n';
UPDATE `graph_node` SET `major`=1, `minor`=9  WHERE `node_key`='f1-cor-s';
UPDATE `graph_node` SET `major`=1, `minor`=10 WHERE `node_key`='f1-exit-east';
UPDATE `graph_node` SET `major`=1, `minor`=11 WHERE `node_key`='f1-exit-west';
UPDATE `graph_node` SET `major`=1, `minor`=12 WHERE `node_key`='f1-exit-south';
UPDATE `graph_node` SET `major`=1, `minor`=13 WHERE `node_key`='f1-exit-north';
UPDATE `graph_node` SET `major`=1, `minor`=14 WHERE `node_key`='f1-stair-east';
UPDATE `graph_node` SET `major`=1, `minor`=15 WHERE `node_key`='f1-stair-west';
UPDATE `graph_node` SET `major`=1, `minor`=16 WHERE `node_key`='f1-stair-north';
UPDATE `graph_node` SET `major`=1, `minor`=17 WHERE `node_key`='f1-stair-south';
UPDATE `graph_node` SET `major`=1, `minor`=18 WHERE `node_key`='f1-elevator';

-- 2F (Major=2)
UPDATE `graph_node` SET `major`=2, `minor`=1  WHERE `node_key`='f2-office-a';
UPDATE `graph_node` SET `major`=2, `minor`=2  WHERE `node_key`='f2-office-b';
UPDATE `graph_node` SET `major`=2, `minor`=3  WHERE `node_key`='f2-meeting';
UPDATE `graph_node` SET `major`=2, `minor`=4  WHERE `node_key`='f2-cor-main';
UPDATE `graph_node` SET `major`=2, `minor`=5  WHERE `node_key`='f2-cor-w';
UPDATE `graph_node` SET `major`=2, `minor`=6  WHERE `node_key`='f2-cor-e';
UPDATE `graph_node` SET `major`=2, `minor`=7  WHERE `node_key`='f2-stair-east';
UPDATE `graph_node` SET `major`=2, `minor`=8  WHERE `node_key`='f2-stair-west';
UPDATE `graph_node` SET `major`=2, `minor`=9  WHERE `node_key`='f2-stair-north';
UPDATE `graph_node` SET `major`=2, `minor`=10 WHERE `node_key`='f2-stair-south';
UPDATE `graph_node` SET `major`=2, `minor`=11 WHERE `node_key`='f2-elevator';

-- 3F (Major=3) — 你的 ESP32 固件 Write_Nvs_Defaults 写的是 Major=3, Minor=1
UPDATE `graph_node` SET `major`=3, `minor`=1  WHERE `node_key`='f3-hall';
UPDATE `graph_node` SET `major`=3, `minor`=2  WHERE `node_key`='f3-server';
UPDATE `graph_node` SET `major`=3, `minor`=3  WHERE `node_key`='f3-lounge';
UPDATE `graph_node` SET `major`=3, `minor`=4  WHERE `node_key`='f3-cor-main';
UPDATE `graph_node` SET `major`=3, `minor`=5  WHERE `node_key`='f3-stair-east';
UPDATE `graph_node` SET `major`=3, `minor`=6  WHERE `node_key`='f3-stair-west';
UPDATE `graph_node` SET `major`=3, `minor`=7  WHERE `node_key`='f3-stair-north';
UPDATE `graph_node` SET `major`=3, `minor`=8  WHERE `node_key`='f3-stair-south';
UPDATE `graph_node` SET `major`=3, `minor`=9  WHERE `node_key`='f3-elevator';

-- 4F (Major=4)
UPDATE `graph_node` SET `major`=4, `minor`=1  WHERE `node_key`='f4-office-a';
UPDATE `graph_node` SET `major`=4, `minor`=2  WHERE `node_key`='f4-office-b';
UPDATE `graph_node` SET `major`=4, `minor`=3  WHERE `node_key`='f4-training';
UPDATE `graph_node` SET `major`=4, `minor`=4  WHERE `node_key`='f4-cor-main';
UPDATE `graph_node` SET `major`=4, `minor`=5  WHERE `node_key`='f4-cor-w';
UPDATE `graph_node` SET `major`=4, `minor`=6  WHERE `node_key`='f4-cor-e';
UPDATE `graph_node` SET `major`=4, `minor`=7  WHERE `node_key`='f4-stair-east';
UPDATE `graph_node` SET `major`=4, `minor`=8  WHERE `node_key`='f4-stair-west';
UPDATE `graph_node` SET `major`=4, `minor`=9  WHERE `node_key`='f4-stair-north';
UPDATE `graph_node` SET `major`=4, `minor`=10 WHERE `node_key`='f4-stair-south';
UPDATE `graph_node` SET `major`=4, `minor`=11 WHERE `node_key`='f4-elevator';

-- 5F (Major=5)
UPDATE `graph_node` SET `major`=5, `minor`=1  WHERE `node_key`='f5-lab';
UPDATE `graph_node` SET `major`=5, `minor`=2  WHERE `node_key`='f5-library';
UPDATE `graph_node` SET `major`=5, `minor`=3  WHERE `node_key`='f5-meeting-b';
UPDATE `graph_node` SET `major`=5, `minor`=4  WHERE `node_key`='f5-cor-main';
UPDATE `graph_node` SET `major`=5, `minor`=5  WHERE `node_key`='f5-cor-w';
UPDATE `graph_node` SET `major`=5, `minor`=6  WHERE `node_key`='f5-cor-e';
UPDATE `graph_node` SET `major`=5, `minor`=7  WHERE `node_key`='f5-stair-east';
UPDATE `graph_node` SET `major`=5, `minor`=8  WHERE `node_key`='f5-stair-west';
UPDATE `graph_node` SET `major`=5, `minor`=9  WHERE `node_key`='f5-stair-north';
UPDATE `graph_node` SET `major`=5, `minor`=10 WHERE `node_key`='f5-stair-south';
UPDATE `graph_node` SET `major`=5, `minor`=11 WHERE `node_key`='f5-elevator';

-- 6F (Major=6)
UPDATE `graph_node` SET `major`=6, `minor`=1  WHERE `node_key`='f6-server';
UPDATE `graph_node` SET `major`=6, `minor`=2  WHERE `node_key`='f6-lounge';
UPDATE `graph_node` SET `major`=6, `minor`=3  WHERE `node_key`='f6-hall';
UPDATE `graph_node` SET `major`=6, `minor`=4  WHERE `node_key`='f6-cor-main';
UPDATE `graph_node` SET `major`=6, `minor`=5  WHERE `node_key`='f6-cor-w';
UPDATE `graph_node` SET `major`=6, `minor`=6  WHERE `node_key`='f6-cor-e';
UPDATE `graph_node` SET `major`=6, `minor`=7  WHERE `node_key`='f6-stair-east';
UPDATE `graph_node` SET `major`=6, `minor`=8  WHERE `node_key`='f6-stair-west';
UPDATE `graph_node` SET `major`=6, `minor`=9  WHERE `node_key`='f6-stair-north';
UPDATE `graph_node` SET `major`=6, `minor`=10 WHERE `node_key`='f6-stair-south';
UPDATE `graph_node` SET `major`=6, `minor`=11 WHERE `node_key`='f6-elevator';