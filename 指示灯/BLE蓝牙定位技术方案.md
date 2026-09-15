# BLE 蓝牙定位技术方案（小程序端 + 固件端）

> 版本：v1.0  
> 日期：2026-09-04  
> 状态：实施中  

---

## 一、系统架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                         用户手机（微信小程序）                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ ① 扫描周围 BLE 信标（iBeacon）                               │   │
│  │ ② 解析出每个节点的 UUID / Major / Minor / RSSI               │   │
│  │ ③ 用户点击「定位」→ 上报扫描结果给后端                        │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              ▲ HTTP/WebSocket
                              │
┌─────────────────────────────────────────────────────────────────────┐
│                        服务器 (42.193.218.29)                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ ④ 接收小程序上报的 beacon 列表                                │   │
│  │ ⑤ 查映射表：Major→楼层、Minor→节点编号、MAC→坐标             │   │
│  │ ⑥ 定位算法：加权质心 / 最近节点 / 三角定位                    │   │
│  │ ⑦ 返回定位结果：楼层 + 坐标 + 节点                            │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────────────┐
│                    ESP32 应急灯 Mesh 组网                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │ master_node  │    │ child_node  │    │ child_node  │             │
│  │ BLE Beacon   │    │ BLE Beacon  │    │ BLE Beacon  │             │
│  │ 广播 Major/  │    │ 广播 Major/  │    │ 广播 Major/  │             │
│  │ Minor/RSSI   │    │ Minor/RSSI  │    │ Minor/RSSI  │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
```

## 二、固件端（ESP32）— 广播配置

### 2.1 iBeacon 报文格式

每台 ESP32 节点持续广播 30 字节 iBeacon 帧：

| 字节偏移 | 长度 | 内容 | 固定值 | 说明 |
|---------|------|------|--------|------|
| 0 | 1 | AD Length | `0x02` | 后面 AD 数据长度 |
| 1 | 1 | AD Type | `0x01` | 标志类型 |
| 2 | 1 | BLE Flags | `0x06` | LE General Discoverable + BR/EDR Not Supported |
| 3 | 1 | AD Length | `0x1A` | 后面 26 字节长度 |
| 4 | 1 | AD Type | `0xFF` | 厂商自定义数据 |
| 5 | 1 | Company ID Low | `0x4C` | Apple 公司 ID 低字节 |
| 6 | 1 | Company ID High | `0x00` | Apple 公司 ID 高字节 |
| 7 | 1 | iBeacon Type | `0x02` | iBeacon 类型 |
| 8 | 1 | iBeacon Length | `0x15` | 后续 21 字节长度 |
| 9-24 | 16 | **UUID** | 项目统一 | 项目唯一标识，全楼宇相同 |
| 25-26 | 2 | **Major** | 动态 | **楼层号**（1F=1, 2F=2...） |
| 27-28 | 2 | **Minor** | 动态 | **节点编号**（1, 2, 3...） |
| 29 | 1 | **TX Power** | `0xC5` | 1 米处参考 RSSI（-59 dBm） |

### 2.2 固件配置参数

| 参数 | 值 | 说明 |
|------|------|------|
| BLE 协议栈 | **NimBLE** | 比 Bluedroid 更省内存 |
| 经典蓝牙 | 关闭 | 释放内存 |
| 广播间隔 | **500ms** | 默认值，可调（200ms~1s） |
| 广播模式 | 不可连接、不可扫描 | 只广播，不配对 |
| TX Power | **-59 dBm (0xC5)** | 1 米参考信号强度 |
| UUID | `E0C5E6D8-1234-5678-ABCD-123456789ABC` | 项目统一固定值（占位，后续可替换） |
| Major 来源 | **NVS 分区** | 首次烧录写入，后续读取 |
| Minor 来源 | **NVS 分区** | 每台硬件手动配置 |

### 2.3 组件文件结构

```
master_node/components/BLE_Beacon/
├── CMakeLists.txt       # 组件注册，依赖 bt + nvs_flash
├── ble_beacon.h         # 对外接口声明
└── ble_beacon.c         # 核心实现（NimBLE 初始化 + iBeacon 帧构建 + NVS 读写）
```

### 2.4 核心代码逻辑（ble_beacon.c 流程）

```
ble_beacon_init():
  ① esp_bt_controller_mem_release(ESP_BT_MODE_BT_CLASSIC)
     → 释放经典蓝牙内存，BLE 只用一小部分内存
  ② esp_bt_controller_init(&bt_cfg)
     → 初始化 BLE 控制器
  ③ esp_bt_controller_enable(ESP_BT_MODE_BLE)
     → 使能 BLE 控制器
  ④ nimble_port_init()
     → 初始化 NimBLE Host 协议栈
  ⑤ 从 NVS 命名空间 "beacon" 中读取：
     - "beacon_major" → int16_t major
     - "beacon_minor" → int16_t minor
     → 若 NVS 中不存在，则写入默认值并读取
  ⑥ 构建 30 字节 iBeacon 广播帧（见 2.1 节格式）
  ⑦ esp_ble_gap_config_adv_data() 配置广播数据

ble_beacon_start():
  ⑧ 配置广播参数（不可连接、不可发现、500ms 间隔）
  ⑨ ble_gap_adv_start() 启动广播

ble_beacon_stop():
  ⑩ ble_gap_adv_stop() 停止广播
```

### 2.5 主程序接入（main.cpp 修改点）

```cpp
// 文件顶部新增
#include "ble_beacon.h"

// app_main() 末尾，所有任务创建之后，添加：
beacon_cfg_t beacon_cfg = {
    .tx_power = -59       // 参考 RSSI@1m
};
ble_beacon_init(&beacon_cfg);
ble_beacon_start();
```

> ⚠️ 保持原有 WiFi / MQTT / LED 初始化顺序不变，beacon 最后启动。

### 2.6 首次烧录 NVS 写入流程

| 步骤 | 操作 | 说明 |
|------|------|------|
| 1 | 在 `ble_beacon.c` 中设置 `DEFAULT_MAJOR` 和 `DEFAULT_MINOR` | 如 `#define DEFAULT_MAJOR 1`（1F） |
| 2 | 烧录固件到硬件 | 程序首次运行 |
| 3 | `ble_beacon_init()` 检测 NVS 无数据 | 自动写入默认值 |
| 4 | 注释掉或删除自动写入代码 | 后续只从 NVS 读取 |
| 5 | 后续烧录/重启 | 直接读取 NVS，无需再配置 |

> 每台硬件第一次烧录时需设置对应的楼层和节点编号。

### 2.7 CMakeLists.txt 配置

```cmake
# components/BLE_Beacon/CMakeLists.txt
idf_component_register(
    SRCS "ble_beacon.c"
    INCLUDE_DIRS "."
    REQUIRES bt nvs_flash
)
```

```cmake
# main/CMakeLists.txt 修改：REQUIRES 中追加 BLE_Beacon
idf_component_register(
    SRCS "main.cpp"
    INCLUDE_DIRS "."
    REQUIRES
        driver esp_wifi esp_netif esp_event nvs_flash json
        BSP DHT20 ENS160 LTE_MQTT Mesh LED_Matrix
        BLE_Beacon          # ← 新增
)
```

## 三、小程序端 — BLE 扫描

### 3.1 微信小程序 BLE API

小程序使用以下 API 扫描 BLE 信标：

```javascript
// 1. 初始化蓝牙模块
wx.openBluetoothAdapter({
  success: () => {
    console.log('蓝牙已开启');
    startScan();
  },
  fail: (err) => {
    console.error('开启蓝牙失败', err);
    // 提示用户开启蓝牙和位置权限
  }
});

// 2. 开始扫描 BLE 设备
function startScan() {
  wx.startBluetoothDevicesDiscovery({
    allowDuplicatesKey: false,  // 不重复上报相同设备
    interval: 5000,             // 扫描间隔 5 秒
    success: () => {
      console.log('开始扫描');
      // 监听发现新设备
      wx.onBluetoothDeviceFound(handleDeviceFound);
    }
  });
}

// 3. 处理发现的设备
function handleDeviceFound(res) {
  const devices = res.devices;
  for (const device of devices) {
    // 解析广播数据，过滤 iBeacon
    const beacon = parseIBeacon(device.advertisData);
    if (beacon) {
      // 收集到本地列表
      beaconList.push({
        nodeId: `ESP32_${device.deviceId}`,
        uuid: beacon.uuid,
        major: beacon.major,
        minor: beacon.minor,
        rssi: device.RSSI,
        timestamp: Date.now()
      });
    }
  }
}
```

### 3.2 iBeacon 数据解析（小程序端）

```javascript
/**
 * 解析 iBeacon 广播数据
 * @param {ArrayBuffer} advertisData - 广播数据（二进制）
 * @returns {Object|null} { uuid, major, minor, txPower }
 */
function parseIBeacon(advertisData) {
  if (!advertisData) return null;
  
  const data = new Uint8Array(advertisData);
  
  // iBeacon 特征：30 字节，Apple 公司 ID 0x004C
  if (data.length < 30) return null;
  if (data[4] !== 0x4C || data[5] !== 0x00) return null;  // Apple Company ID
  if (data[6] !== 0x02 || data[7] !== 0x15) return null;   // iBeacon Type + Length
  
  // 提取 UUID (16 字节) → 格式化为标准 UUID 字符串
  const uuid = Array.from(data.slice(8, 24))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const formattedUUID =
    `${uuid.slice(0,8)}-${uuid.slice(8,12)}-${uuid.slice(12,16)}-${uuid.slice(16,20)}-${uuid.slice(20)}`;
  
  // 提取 Major (2 字节，大端序)
  const major = (data[24] << 8) | data[25];
  
  // 提取 Minor (2 字节，大端序)
  const minor = (data[26] << 8) | data[27];
  
  // 提取 TX Power (1 字节，有符号，-59 ~ +9 dBm)
  const txPower = data[28] - 256;
  
  return {
    uuid: formattedUUID,
    major: major,
    minor: minor,
    txPower: txPower
  };
}
```

### 3.3 定位上报接口

用户点击「定位」按钮后，小程序将扫描结果上报后端：

```javascript
// 上报扫描结果
function reportLocation() {
  // 过滤掉过期数据（超过 10 秒的不要）
  const now = Date.now();
  const validBeacons = beaconList.filter(b => now - b.timestamp < 10000);
  
  wx.request({
    url: 'https://api.xxx.com/api/ble-location',
    method: 'POST',
    data: {
      openid: getApp().globalData.openid,
      beacons: validBeacons.map(b => ({
        major: b.major,
        minor: b.minor,
        rssi: b.rssi
      }))
    },
    success: (res) => {
      if (res.data.success) {
        showLocationResult(res.data);
      }
    }
  });
}
```

**请求格式：**
```json
POST /api/ble-location
{
  "openid": "oXXXXX",
  "beacons": [
    { "major": 1, "minor": 1, "rssi": -65 },
    { "major": 1, "minor": 2, "rssi": -72 },
    { "major": 2, "minor": 1, "rssi": -80 }
  ]
}
```

**响应格式：**
```json
{
  "success": true,
  "floor": 1,
  "node_id": "node_1f_01",
  "x": 15.3,
  "y": 22.1,
  "distance": 3.5
}
```

### 3.4 小程序 app.json 权限配置

```json
{
  "permission": {
    "scope.userLocation": {
      "desc": "蓝牙扫描需要位置权限"
    }
  },
  "requiredBackgroundModes": ["bluetooth"],
  "plugins": {}
}
```

> 注意：iOS 需要额外在 `infoPlist` 中声明 `NSBluetoothAlwaysUsageDescription`。

## 四、后端定位算法

### 4.1 数据库映射表

在现有 `gps_node_mapping` 表中增加 BLE 字段：

```sql
-- 在现有表基础上增加 BLE 定位字段
ALTER TABLE `gps_node_mapping` ADD COLUMN `major` INT COMMENT 'BLE Major (楼层)';
ALTER TABLE `gps_node_mapping` ADD COLUMN `minor` INT COMMENT 'BLE Minor (节点编号)';
ALTER TABLE `gps_node_mapping` ADD INDEX `idx_major_minor` (`major`, `minor`);
```

完整映射表示例：

| node_id | mac_address | floor | major | minor | x | y | description |
|---------|------------|-------|-------|-------|---|---|-------------|
| node_1f_01 | ESP32_D8:BC:38:78:21:98 | 1 | 1 | 1 | 10 | 20 | 1F 大厅 |
| node_1f_02 | ESP32_D8:BC:38:78:21:A5 | 1 | 1 | 2 | 30 | 20 | 1F 走廊东 |
| node_2f_01 | ESP32_D8:BC:38:78:22:10 | 2 | 2 | 1 | 10 | 20 | 2F 走廊西 |
| node_2f_02 | ESP32_D8:BC:38:78:22:7B | 2 | 2 | 2 | 30 | 20 | 2F 走廊东 |

### 4.2 API 接口设计

| 方法 | 路径 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| POST | `/api/ble-location` | 上报 BLE 扫描结果 | `{ openid, beacons[] }` | `{ floor, x, y, node_id }` |
| GET | `/api/ble-nodes` | 获取所有节点映射 | — | 节点列表 |
| POST | `/api/ble-node` | 新增/更新节点 | `{ major, minor, x, y, floor }` | 成功/失败 |

### 4.3 定位算法（加权质心）

```go
// 定位请求结构体
type LocationRequest struct {
    OpenID  string       `json:"openid"`
    Beacons []BeaconInfo `json:"beacons"`
}

type BeaconInfo struct {
    Major int `json:"major"`
    Minor int `json:"minor"`
    RSSI  int `json:"rssi"`  // 信号强度（负数，越大越强）
}

// 定位响应
type LocationResponse struct {
    Success  bool    `json:"success"`
    Floor    int     `json:"floor"`
    NodeID   string  `json:"node_id"`
    X        float64 `json:"x"`
    Y        float64 `json:"y"`
    Distance float64 `json:"distance"`  // 到最近节点的估算距离（米）
}

// 加权质心定位算法
func CalculateLocation(beacons []BeaconInfo) *LocationResponse {
    if len(beacons) == 0 {
        return nil
    }
    
    // 查询数据库，获取每个 beacon 的坐标
    type NodeInfo struct {
        Major int
        Minor int
        X, Y  float64
        Floor int
        RSSI  int
    }
    
    var nodes []NodeInfo
    for _, b := range beacons {
        node := queryNodeByMajorMinor(b.Major, b.Minor)
        if node != nil {
            nodes = append(nodes, NodeInfo{
                Major: b.Major,
                Minor: b.Minor,
                X:     node.X,
                Y:     node.Y,
                Floor: node.Floor,
                RSSI:  b.RSSI,
            })
        }
    }
    
    if len(nodes) == 0 {
        return nil
    }
    
    // 加权质心计算
    // 权重 = (RSSI - minRSSI) 线性映射，信号越强权重越大
    const minRSSI = -100
    var totalWeight, sumX, sumY float64
    
    for _, node := range nodes {
        weight := float64(node.RSSI - minRSSI)
        if weight < 0 {
            weight = 0
        }
        totalWeight += weight
        sumX += node.X * weight
        sumY += node.Y * weight
    }
    
    // 取楼层：多数节点所在的楼层
    floorCount := make(map[int]int)
    for _, node := range nodes {
        floorCount[node.Floor]++
    }
    floor := 1
    maxCount := 0
    for f, c := range floorCount {
        if c > maxCount {
            maxCount = c
            floor = f
        }
    }
    
    return &LocationResponse{
        Success: true,
        Floor:   floor,
        NodeID:  fmt.Sprintf("node_%df_%02d", floor, nodes[0].Minor),
        X:       sumX / totalWeight,
        Y:       sumY / totalWeight,
    }
}
```

### 4.4 定位策略对比

| 策略 | 算法 | 精度 | 优点 | 缺点 | 适用场景 |
|------|------|------|------|------|---------|
| **最近节点** | 取 RSSI 最强的节点 | 3~5m | 实现简单，计算快 | 精度低 | 快速定位、楼层判断 |
| **加权质心** | 多节点 RSSI 加权平均 | 2~3m | 精度较好，稳定 | 节点少时偏差大 | 常规定位，推荐方案 |
| **三角定位** | 三边测量（RSSI→距离→交会） | 1~2m | 精度高 | 需校准环境衰减因子 | 精度要求高的场景 |

### 4.5 RSSI 距离换算公式

```
d = 10 ^ ((TXPower - RSSI) / (10 * n))

其中：
  d       = 距离（米）
  TXPower = 1 米处参考 RSSI（固件设为 -59 dBm）
  RSSI    = 手机实际测量到的信号强度
  n       = 环境衰减因子（经验值）
           - 开阔空间：2.0
           - 室内走廊：2.5~3.0
           - 金属/混凝土环境：3.5~4.0
```

> 建议 n 取 3.0 作为初始值，后续根据实际测试校准。

## 五、端到端定位流程

```
┌─────────────────────────────────────────────────────────────────────┐
│ 用户进入小程序 → 点击「定位」                                       │
│                                                                     │
│  ① 小程序调用 wx.openBluetoothAdapter() 开启蓝牙                    │
│  ② 小程序调用 wx.startBluetoothDevicesDiscovery() 开始扫描          │
│  ③ 监听 wx.onBluetoothDeviceFound() 收集附近节点                    │
│  ④ 扫描持续 3~5 秒，收集到足够多的节点信号                         │
│                                                                     │
│  ⑤ 用户点击「定位」按钮                                            │
│     ↓                                                               │
│  ⑥ 小程序解析 iBeacon 数据，提取 UUID / Major / Minor / RSSI       │
│     ↓                                                               │
│  ⑦ 上报后端：POST /api/ble-location                                │
│     { beacons: [{ major, minor, rssi }] }                          │
│     ↓                                                               │
│  ⑧ 后端查映射表：(major, minor) → (floor, x, y)                   │
│     ↓                                                               │
│  ⑨ 后端执行加权质心定位算法                                        │
│     ↓                                                               │
│  ⑩ 返回结果：{ floor: 2, x: 25.3, y: 18.7, node_id: "node_2f_01" }│
│     ↓                                                               │
│  ⑪ 小程序显示：您当前在 2F 走廊西侧                                 │
│                                                                     │
│  （若同时有火灾报警，自动触发逃生路径计算）                          │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.1 与火灾逃生联动流程

```
┌─ 正常模式 ──────────────────────────────────────────────────────┐
│ 用户点击定位 → 显示当前位置（楼层 + 区域）                        │
│ 无火灾 → 定位结束                                                │
└──────────────────────────────────────────────────────────────────┘

┌─ 火灾模式 ──────────────────────────────────────────────────────┐
│ ① 服务器收到 ESP32 火灾报警（MQTT fires_flag=true）             │
│ ② 服务器查询所有订阅用户                                        │
│ ③ 对每个用户：                                                  │
│    a. 获取用户 BLE 定位结果（楼层 + 坐标）                       │
│    b. 根据火灾点计算逃生路径（蚁群算法）                         │
│    c. 返回逃生方向给小程序显示                                   │
│    d. 通过 MQTT 下发方向指令给对应 ESP32 节点                    │
│ ④ 小程序显示：红色警报 + 逃生方向箭头 + 距离出口                │
└──────────────────────────────────────────────────────────────────┘
```

## 六、关键技术要点

### 6.1 小程序 BLE 注意事项

| 注意点 | 详细说明 |
|--------|---------|
| **蓝牙权限** | 需在 `app.json` 中声明蓝牙权限，iOS 需额外在 `infoPlist` 中声明 `NSBluetoothAlwaysUsageDescription` |
| **位置权限** | Android 6.0+ 扫描 BLE 需要位置权限（`ACCESS_FINE_LOCATION`），Android 12+ 需要 `BLUETOOTH_SCAN` 权限 |
| **扫描时机** | 小程序进入前台时才能扫描，后台会暂停。建议用户点击"定位"按钮时才触发扫描 |
| **扫描耗电** | 连续扫描会增加耗电，建议扫描 3~5 秒后自动停止，或让用户手动触发 |
| **设备去重** | `wx.onBluetoothDeviceFound` 会重复上报同一设备，需根据 `deviceId` 去重，只保留最新 RSSI |
| **RSSI 波动** | 单次 RSSI 不稳定（±5dBm 波动），建议同一设备采 3~5 次取平均值 |
| **兼容性** | 不同手机蓝牙芯片灵敏度不同，同一位置 RSSI 可能差 10dBm，云端需做归一化 |
| **iOS 限制** | iOS 无法直接获取广播数据中的原始字节，需使用 `wx.onBLECharacteristicValueChange` 方式 |
| **Android 限制** | 部分 Android 手机需要关闭 `allowDuplicatesKey` 才能收到广播 |

### 6.2 定位精度影响因素

| 因素 | 影响程度 | 说明 | 缓解措施 |
|------|---------|------|---------|
| **多径效应** | 高 | 信号在墙壁、地面反射导致 RSSI 波动 | 多次采样取平均，设备部署时避开大面积金属 |
| **人体遮挡** | 中 | 人体主要成分是水，吸收 2.4GHz 信号 | 部署在天花板/墙面高处，避开人流密集区 |
| **WiFi 干扰** | 低 | 2.4GHz 同频段干扰 | 广播间隔 ≥200ms，使用 WiFi 的 5GHz 频段 |
| **节点密度** | 高 | 节点越少，手机能扫到的信号越少 | 建议每 5~8m 部署一个，确保任意位置至少扫到 2 个 |
| **手机差异** | 中 | 不同品牌手机蓝牙灵敏度不同 | 云端对不同手机型号做归一化校准 |
| **环境变化** | 低 | 家具移动、人员密度变化 | 定期校准，或使用自适应算法 |

### 6.3 节点部署建议

```
┌─────────────────────────────────────────────────┐
│                    平面图                        │
│                                                  │
│   [节点1]──────5m──────[节点2]──────5m──────[出口]│
│     │                    │                    │   │
│     │                    │                    │   │
│    3m                   3m                   3m  │
│     │                    │                    │   │
│     ▼                    ▼                    ▼   │
│   [节点3]──────5m──────[节点4]──────5m──────[出口]│
│                                                  │
│   ● 节点间隔：5~8m                               │
│   ● 安装高度：2.5~3m（天花板/墙面）               │
│   ● 避开金属物体和墙角                          │
│   ● 每个节点确保手机在任意位置能扫到至少 2 个     │
└─────────────────────────────────────────────────┘
```

### 6.4 开发与调试建议

| 场景 | 建议工具 | 说明 |
|------|---------|------|
| **固件调试** | ESP-IDF Monitor + `esp_log` | 通过串口查看 BLE 初始化日志 |
| **广播验证** | nRF Connect (手机 App) | 扫描查看 ESP32 是否在广播 iBeacon |
| **RSSI 采集** | nRF Connect 或自定义小程序 | 记录不同距离下的 RSSI 值，用于校准 |
| **小程序调试** | 微信开发者工具 + 真机调试 | 模拟器不支持 BLE，必须真机调试 |
| **后端调试** | Postman / curl | 模拟小程序上报数据，测试定位算法 |

## 七、与现有 GPS 定位的关系

### 7.1 对比

| 对比项 | GPS 定位 | BLE 定位 |
|--------|---------|---------|
| **室内可用** | ❌ 信号弱/不可用 | ✅ 精准 |
| **室外可用** | ✅ 精准 | ✅ 可用 |
| **精度** | 5~10m | 2~5m（加权质心） |
| **需要硬件** | 手机自带 GPS | ESP32 节点 + 手机蓝牙 |
| **成本** | 免费 | 需部署 ESP32 节点 |
| **楼层识别** | ❌ 无法区分楼层 | ✅ 通过 Major 精确识别 |
| **部署难度** | 无需部署 | 需逐台配置 Major/Minor |
| **维护成本** | 无 | 节点故障需更换 |

### 7.2 融合定位策略

小程序同时开启 GPS 和 BLE 扫描，根据场景自动切换：

```javascript
// 定位策略切换
function getLocation() {
  Promise.all([
    getGPSLocation(),
    getBLELocation()
  ]).then(([gps, ble]) => {
    if (ble && ble.beacons.length >= 2) {
      // 室内：BLE 定位优先（能判断楼层）
      return reportBLELocation(ble.beacons);
    } else {
      // 室外或无 BLE 信号：GPS 定位
      return reportGPSLocation(gps);
    }
  });
}
```

### 7.3 数据库兼容

> BLE 定位复用了现有 `gps_node_mapping` 表，只新增了 `major` 和 `minor` 字段。
> 后端接口 `/api/ble-location` 与现有 GPS 接口 `/api/location` 独立，互不干扰。

## 八、附录

### 8.1 相关文档

| 文档 | 位置 | 说明 |
|------|------|------|
| 蓝牙开发文档.md | `master_node/蓝牙开发文档.md` | 固件侧 BLE Beacon 开发规范 |
| 微信小程序GPS逃生系统实施方案.md | `New_version_of_emergency/微信小程序GPS逃生系统实施方案.md` | 小程序 GPS 逃生系统方案 |
| ESP-IDF NimBLE 文档 | ESP-IDF 官方文档 | NimBLE 协议栈 API 参考 |
| 微信小程序蓝牙 API | 微信官方文档 | `wx.openBluetoothAdapter` 等 API 说明 |

### 8.2 关键参数汇总

| 参数 | 固件端值 | 小程序端用途 | 后端用途 |
|------|---------|-------------|---------|
| UUID | `E0C5E6D8-1234-5678-ABCD-123456789ABC` | 过滤非本项目设备 | 校验 |
| Major | 1~255（NVS 读取） | 上报 | 确定楼层 |
| Minor | 1~255（NVS 读取） | 上报 | 确定节点编号 |
| TX Power | -59 dBm (0xC5) | 距离估算 | 定位算法输入 |
| RSSI | 不处理 | 扫描获取 | 定位算法输入 |
| 广播间隔 | 500ms | 扫描 3~5s | 不涉及 |

### 8.3 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 手机扫不到任何 ESP32 广播 | 固件未启动 / BLE 未初始化 | 检查串口日志，确认 `ble_beacon_init()` 是否成功 |
| 扫到了但 Major/Minor 是 0 | NVS 读取失败 | 检查 NVS 分区是否已写入数据 |
| RSSI 波动很大 | 多径效应 / 人体遮挡 | 多次采样取平均，或更换部署位置 |
| 小程序无法开启蓝牙 | 权限未声明 | 检查 `app.json` 权限配置 |
| Android 扫不到设备 | 位置权限未开启 | 请求 `ACCESS_FINE_LOCATION` 权限 |
| iOS 解析不到 iBeacon 数据 | `advertisData` 被系统截断 | 使用 `wx.onBLECharacteristicValueChange` 读取 |

### 8.4 版本历史

| 版本 | 日期 | 修改内容 |
|------|------|---------|
| v1.0 | 2026-09-04 | 初稿：固件 + 小程序 + 后端完整方案 |

