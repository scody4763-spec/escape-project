# AIoT-v2 硬件接入指南

## 目录

- [1. 系统架构](#1-系统架构)
- [2. MQTT 连接配置](#2-mqtt-连接配置)
- [3. 传感器数据上报](#3-传感器数据上报)
- [4. 告示牌心跳上报](#4-告示牌心跳上报)
- [5. 告示牌控制下发](#5-告示牌控制下发)
- [6. REST API 接口](#6-rest-api-接口)
- [7. 数据流转流程](#7-数据流转流程)

---

## 1. 系统架构

```
┌──────────────┐    MQTT     ┌──────────────┐    ┌──────────────┐
│  ESP32 传感器 │ ──────────> │  EMQX Broker │ ──>│   AIoT 后端  │
└──────────────┘             └──────────────┘    └──────┬───────┘
                                                        │
┌──────────────┐    MQTT     ┌──────────────┐           │
│  告示牌硬件   │ <────────── │  EMQX Broker │ <─────────┘
└──────────────┘  control    └──────────────┘    publish control
```

**数据流向**：
1. 传感器通过 MQTT 上报环境数据 → 后端接收并写入 InfluxDB
2. 后端检测告警条件 → 自动发送邮件通知
3. 前端通过 WebSocket 实时接收传感器数据
4. 后端通过 MQTT 下发告示牌控制指令

---

## 2. MQTT 连接配置

| 配置项 | 值 |
|--------|-----|
| Broker 地址 | `tcp://3.114.93.84:1883` |
| Client ID | 自定义（不可与后端重复） |
| 用户名 | 空（无认证） |
| 密码 | 空 |
| QoS | 0 |

**配置文件位置**：`manifest/config/config.yaml`

---

## 3. 传感器数据上报

### Topic

```
sensordata
```

### 消息格式

外层 key 为 ESP32 的 MAC 地址，value 为传感器数据对象：

```json
{
  "AA:BB:CC:DD:EE:FF": {
    "AQI": 45.2,
    "TVOC": 120.0,
    "ECO2": 650.0,
    "temp": 26.5,
    "hum": 65.3,
    "electricity_Current": false,
    "electricity": 0.52,
    "ESP32_fires_flag": false,
    "ESP32_electricity_flag": false,
    "buzzer": 0
  }
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `temp` | float | 否 | 温度（℃） |
| `hum` | float | 否 | 湿度（%RH） |
| `AQI` | float | 否 | 空气质量指数 |
| `TVOC` | float | 否 | 总挥发性有机物（ppb） |
| `ECO2` | float | 否 | 二氧化碳浓度（ppm） |
| `electricity` | float | 否 | 电流值（A） |
| `electricity_Current` | bool | 否 | 电流状态 |
| `ESP32_fires_flag` | bool | 否 | 火焰检测标志，`true` 触发告警 |
| `ESP32_electricity_flag` | bool | 否 | 电流异常标志，`true` 触发告警 |
| `buzzer` | int | 否 | 蜂鸣器状态（0=关闭，1=开启） |

### 后端处理逻辑

1. **在线状态**：收到数据后，自动在 Redis 中标记设备在线（TTL=90秒，超时视为离线）
2. **数据存储**：写入 InfluxDB，measurement 为 `sensor_data`，tag 为 `mac_address`
3. **实时推送**：通过 WebSocket 推送到前端
4. **告警检测**：`ESP32_fires_flag=true` 或 `ESP32_electricity_flag=true` 时自动创建告警并发送邮件

---

## 4. 告示牌心跳上报

### Topic

```
signboard/heartbeat
```

### 消息格式

```json
{
  "board_mac": "11:22:33:44:55:66",
  "signboards": ["AA:BB:CC:DD:EE:01", "AA:BB:CC:DD:EE:02"],
  "timestamp": 1718900000
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `board_mac` | string | 开发板 MAC 地址 |
| `signboards` | string[] | 该开发板下所有告示牌的 MAC 地址列表 |
| `timestamp` | int64 | Unix 时间戳 |

### 在线状态

- 开发板定期发送心跳（建议间隔 ≤60秒）
- 后端为每个告示牌 MAC 刷新 Redis 状态（TTL=90秒）
- 超过 90 秒无心跳，告示牌被标记为离线

---

## 5. 告示牌控制下发

### Topic

```
signboard/control
```

### 消息格式

后端通过 REST API 更新告示牌后，自动通过 MQTT 下发控制指令：

```json
{
  "AA:BB:CC:DD:EE:FF": {
    "display_left": "Left",
    "display_mid": "Up",
    "display_right": "Down",
    "RGB_left": "#FF0000",
    "RGB_mid": "#00FF00",
    "RGB_right": "#0000FF",
    "led": 1,
    "buzzer": 0,
    "flame": "False",
    "electricity_switch": "ON"
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `display_left` | string | 左侧显示内容 |
| `display_mid` | string | 中间显示内容 |
| `display_right` | string | 右侧显示内容 |
| `RGB_left` | string | 左侧 RGB 颜色（十六进制） |
| `RGB_mid` | string | 中间 RGB 颜色 |
| `RGB_right` | string | 右侧 RGB 颜色 |
| `led` | int | LED 开关（0=关，1=开） |
| `buzzer` | int | 蜂鸣器开关（0=关，1=开） |
| `flame` | string | 火焰传感器（"True"/"False"） |
| `electricity_switch` | string | 电控开关（"ON"/"OFF"） |

### 显示内容映射

| 编号 | 内容 |
|------|------|
| 1 | Left |
| 2 | Right |
| 3 | Down |
| 4 | Up |
| 5 | left |
| 6 | right |
| 7 | down |
| 8 | up |
| 9 | style |
| 10 | motifs |

---

## 6. REST API 接口

### 6.1 传感器管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/sensors` | 获取所有传感器列表 |
| `GET` | `/api/sensors/{id}` | 获取单个传感器详情 |
| `POST` | `/api/sensors` | 新增传感器 |
| `PUT` | `/api/sensors/{id}` | 更新传感器 |
| `DELETE` | `/api/sensors/{id}` | 删除传感器 |
| `GET` | `/api/sensors/status` | 批量查询传感器在线状态 |

**新增传感器请求体**：

```json
{
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "address": "3楼走廊",
  "boardId": 1,
  "img": "sensor.png",
  "status": 1
}
```

### 6.2 开发板管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/boards` | 获取所有开发板列表 |
| `GET` | `/api/boards/{id}` | 获取单个开发板详情 |
| `POST` | `/api/boards` | 新增开发板 |
| `PUT` | `/api/boards/{id}` | 更新开发板 |
| `DELETE` | `/api/boards/{id}` | 删除开发板 |

### 6.3 告示牌管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/signboards` | 获取所有告示牌列表 |
| `GET` | `/api/signboards/{id}` | 获取单个告示牌详情 |
| `POST` | `/api/signboards` | 新增告示牌 |
| `PUT` | `/api/signboards/{id}` | 更新告示牌（自动下发 MQTT 控制指令） |
| `DELETE` | `/api/signboards/{id}` | 删除告示牌 |
| `GET` | `/api/signboards/status` | 批量查询告示牌在线状态 |

### 6.4 设备告警

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/device-alerts` | 获取告警列表（支持 `status`、`alertType` 筛选） |
| `PUT` | `/api/device-alerts/{id}` | 更新告警状态（1=已处理，2=已忽略） |

**告警类型**：

| 类型值 | 说明 |
|--------|------|
| 1 | 离线告警 |
| 2 | 火焰报警 |
| 3 | 电流异常 |
| 4 | 其他 |

### 6.5 数据报表

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/reports/overview` | 概览统计 |
| `GET` | `/api/reports/trend` | 趋势数据 |
| `GET` | `/api/reports/alarm-stats` | 告警统计 |
| `GET` | `/api/reports/export` | 导出 CSV |

---

## 7. 数据流转流程

### 传感器数据上报流程

```
ESP32 传感器
    │
    │ MQTT Publish (topic: sensordata)
    ▼
EMQX Broker
    │
    │ MQTT Subscribe
    ▼
AIoT 后端
    ├──> Redis: 刷新在线状态 (sensor:status:{mac}, TTL=90s)
    ├──> InfluxDB: 写入 sensor_data measurement
    ├──> WebSocket: 推送到前端实时展示
    └──> 告警检测
         ├── ESP32_fires_flag=true  → 创建火焰告警 + 发送邮件
         └── ESP32_electricity_flag=true → 创建电流告警 + 发送邮件
```

### 告示牌心跳流程

```
告示牌开发板
    │
    │ MQTT Publish (topic: signboard/heartbeat)
    ▼
EMQX Broker
    │
    │ MQTT Subscribe
    ▼
AIoT 后端
    └──> Redis: 刷新在线状态 (signboard:status:{mac}, TTL=90s)
```

### 告示牌控制流程

```
前端页面
    │
    │ REST API: PUT /api/signboards/{id}
    ▼
AIoT 后端
    ├──> MySQL: 更新数据库
    ├──> Redis: 清除缓存
    └──> MQTT Publish (topic: signboard/control)
         │
         ▼
    EMQX Broker
         │
         │ MQTT Subscribe
         ▼
    告示牌硬件执行控制指令
```

---

## 8. 快速开始

### 前置条件

1. 安装并启动 EMQX Broker（默认端口 1883）
2. 安装并启动 InfluxDB v2（默认端口 8086）
3. 安装并启动 Redis（默认端口 6379）
4. 安装并启动 MySQL（默认端口 3306）

### 启动后端

```bash
# 编译
go build -o aiot main.go

# 运行
./aiot
```

### 测试上报

使用任意 MQTT 客户端（如 MQTTX）连接 Broker，向 `sensordata` topic 发布测试数据：

```bash
# MQTTX CLI 示例
mqttx pub -h 3.114.93.84 -t sensordata -m '{"AA:BB:CC:DD:EE:FF":{"temp":26.5,"hum":65.3,"ESP32_fires_flag":false}}'
```

---

## 9. 注意事项

1. **MAC 地址**：传感器和告示牌通过 MAC 地址唯一标识，上报前需先通过 REST API 注册
2. **在线判断**：设备需定期上报数据/心跳，TTL=90秒，超时视为离线
3. **告警触发**：`ESP32_fires_flag` 和 `ESP32_electricity_flag` 为 `true` 时会自动创建告警并发送邮件
4. **告示牌控制**：更新告示牌配置后，后端自动通过 MQTT 下发控制指令，无需手动发送
5. **数据存储**：传感器数据存入 InfluxDB，支持按时间范围查询和导出
