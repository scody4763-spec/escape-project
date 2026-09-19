# 后端合并与部署说明

## 当前功能

- 管理员 JWT 认证
- MQTT 传感器、指示灯和吸顶灯数据接收
- MySQL、Redis、InfluxDB 数据存储
- WebSocket 实时推送
- 告警、邮件通知和通知日志
- 指示灯和吸顶灯管理
- `/api/location` BLE 定位
- `/api/escape/calculate` 逃生路径计算
- Greedy、ACO、IACO 算法调用和方向 MQTT 下发

## 目录结构

```text
api
controller
logic
dao
model
manifest
```

吸顶灯控制器当前位于：

```text
internal/controller/ceiling_light/
internal/handler/ceiling_light/
```

旧 `controller/ceilingLight` 包已不再使用。

## 构建

```bash
cd vue-go/aiot/aiot-v2
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o aiot-server .
```

Dockerfile 会复制预编译的 `aiot-server`，源码修改后必须重新构建二进制。

## 部署

```bash
cd ~/escape-project
docker compose build aiot-backend
docker compose up -d aiot-backend
```

## 数据库

基础初始化：

- `manifest/deploy/sql/aiot.sql`
- `manifest/deploy/sql/graph.sql`

BLE 定位迁移：

```text
manifest/deploy/sql/ble_major_minor_migration.sql
```

该迁移为 `graph_node` 增加 `major/minor` 字段和联合索引。
