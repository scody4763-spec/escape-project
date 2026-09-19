-- 修复吸顶灯设备记录缺失问题
-- 执行时间: 2026-08-02
-- 问题: ESP32数据上报但前端不显示，因为数据库中缺少设备记录

-- 1. 先查看现有记录
SELECT device_id, mac_address, address FROM ceiling_lights;

-- 2. 插入或更新设备记录
INSERT INTO ceiling_lights (device_id, mac_address, address, floor_id, zone, status, created_at, updated_at)
VALUES (
    'ceiling_01',
    'D8:BC:38:78:24:C0',
    '电梯前面的走廊',
    '1F',
    'A区',
    'online',
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE 
    address = '电梯前面的走廊',
    updated_at = NOW();

-- 3. 验证插入结果
SELECT * FROM ceiling_lights WHERE device_id = 'ceiling_01';