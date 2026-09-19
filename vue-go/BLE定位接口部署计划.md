# BLE 定位接口实现与部署记录

> 更新：2026-09-15  
> 状态：已实现并部署，待现场 RSSI 标定

## 一、最终实现

实际接口没有采用早期计划中的 `/api/ble-location`，最终复用逃生模块的定位入口：

```text
POST /api/location
```

请求：

```json
{
  "openid": "用户 OpenID",
  "beacons": [
    {
      "major": 3,
      "minor": 1,
      "rssi": -58
    }
  ]
}
```

响应：

```json
{
  "success": true,
  "floor": 3,
  "node_id": "f3-hall",
  "direction": "",
  "exit_name": "",
  "distance": 2.4,
  "estimated_time": 0
}
```

## 二、实际代码位置

| 模块 | 文件 |
|------|------|
| API 结构 | `aiot/aiot-v2/api/escape/v1/escape.go` |
| 控制器 | `aiot/aiot-v2/internal/controller/escape/escape.go` |
| 定位和逃生逻辑 | `aiot/aiot-v2/internal/logic/escape/escape.go` |
| 节点查询 | `aiot/aiot-v2/internal/dao/graph_node.go` |
| 节点实体 | `aiot/aiot-v2/internal/model/entity/graph_node.go` |
| SQL 迁移 | `aiot/aiot-v2/manifest/deploy/sql/ble_major_minor_migration.sql` |

## 三、定位流程

1. 小程序上报多个信标的 `major`、`minor` 和 `rssi`。
2. 后端通过 `major + minor` 查询 `graph_node`。
3. 过滤数据库中不存在的信标。
4. 以 `RSSI + 100` 作为权重，计算节点的 X/Z 加权质心。
5. 选择匹配节点最多的楼层。
6. 选择距质心最近的节点作为当前定位节点。
7. 无火灾时直接返回定位结果。
8. 有火灾时调用 IACO 逃生算法，返回出口、方向和预计时间。
9. 火灾联动时向指示灯下发方向指令。

## 四、数据库方案

没有新建 `ble_node_mapping` 表，最终选择直接扩展已有的 `graph_node`：

```sql
ALTER TABLE graph_node
  ADD COLUMN major INT DEFAULT NULL,
  ADD COLUMN minor INT DEFAULT NULL,
  ADD INDEX idx_major_minor (major, minor);
```

映射规则：

- `major`：楼层号
- `minor`：楼层内节点序号

该方案使 BLE 定位和逃生算法共用同一套节点坐标，避免重复维护映射表。

服务器现状：

- `graph_node` 已存在 `major/minor` 字段和联合索引。
- 71 条节点记录均已填充映射。
- 迁移已在服务器 MySQL 中执行。

## 五、部署记录

2026-09-15 已完成：

1. 上传当前后端源码和 Linux `aiot-server`。
2. 重建并重启 `aiot-backend` 容器。
3. 验证容器内二进制与本地构建哈希一致。
4. 验证空信标请求返回：

```text
{"code":51,"message":"beacons 不能为空","data":null}
```

说明线上服务已经加载新 BLE 校验逻辑。

## 六、后续校准

1. 在真实现场部署信标，记录不同距离下的 RSSI。
2. 根据实测结果调整权重公式、楼层判定和最小 RSSI 阈值。
3. 使用真实设备验证多信标重叠区、楼梯口和出口附近的定位效果。
4. 火灾联动测试会向指示灯发布 MQTT 方向指令，非演练环境不要触发。

## 七、实施结果

| 项目 | 状态 |
|------|------|
| `/api/location` JSON 接口 | 已完成 |
| `major/minor` 数据库映射 | 已完成 |
| 加权质心定位 | 已完成 |
| 火灾模式 IACO 联动 | 已完成 |
| 方向结果返回 | 已完成 |
| 指示灯 MQTT 下发 | 已完成 |
| 生产服务器部署 | 已完成 |
| 现场 RSSI 校准 | 待执行 |
