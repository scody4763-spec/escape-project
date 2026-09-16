#ifndef __SENSOR_FUSION_H__
#define __SENSOR_FUSION_H__

#include <stdint.h>
#include <stdbool.h>
#include "esp_err.h"
#include "esp_log.h"
#include "i2c_bus.h"

/* ============================================================
 *  报警等级枚举
 * ============================================================ */
typedef enum {
    FUSION_LEVEL_SAFE    = 0,   /* 安全 - 无火灾证据           */
    FUSION_LEVEL_WATCH   = 1,   /* 关注 - 需留意               */
    FUSION_LEVEL_WARNING = 2,   /* 预警 - 可能火灾，建议确认   */
    FUSION_LEVEL_ALARM   = 3    /* 报警 - 确认火灾，立即响应   */
} Fusion_Level_t;

/* ============================================================
 *  状态字符串
 * ============================================================ */
#define FUSION_STATUS_SAFE     "normal"
#define FUSION_STATUS_WATCH    "normal"
#define FUSION_STATUS_WARNING  "warning"
#define FUSION_STATUS_ALARM    "emergency"

/* ============================================================
 *  D-S 证据理论 BPA 结构体
 * ============================================================ */
typedef struct {
    float fire;       /* m(Fire)    - 火灾证据    */
    float no_fire;    /* m(NoFire)  - 无火灾证据  */
    float uncertain;  /* m(Θ)       - 不确定性    */
} Fusion_BPA_t;

/* ============================================================
 *  完整传感器数据快照 (用于上报)
 * ============================================================ */
typedef struct {
    /* ---- MLX90640 热成像 ---- */
    float t_max;           /* 最高温度 (°C)          */
    float t_min;           /* 最低温度 (°C)          */
    float t_avg;           /* 平均温度 (°C)          */
    float t_ambient;       /* 环境温度 Ta (°C)       */
    float t_delta;         /* 温差 T_max - Ta (°C)   */
    float t_rise_rate;     /* 温度上升速率 (°C/帧)   */
    int   hot_spot_cnt;    /* 高温像素数量 (>60°C)   */

    /* ---- ENS160 气体 ---- */
    float tvoc;            /* TVOC 浓度 (ppb)        */
    float eco2;            /* eCO₂ 浓度 (ppm)        */
    int   aqi;             /* 空气质量指数 (0~5)     */

    /* ---- AHT2x 温湿度 ---- */
    float temperature;     /* 环境温度 (°C)          */
    float humidity;        /* 相对湿度 (%)           */
    float humidity_rate;   /* 湿度变化率 (%/帧)      */

    /* ---- 融合结果 ---- */
    Fusion_Level_t level;  /* 报警等级               */
    float probability;     /* 火灾概率 (0.0~1.0)     */
    Fusion_BPA_t   bpa;    /* 最终 BPA              */
    float conflict;        /* 冲突系数 K             */

    /* ---- 新增字段 (用于标准JSON格式) ---- */
    float  electricity;              /* 电流值 (A)           */
    bool   electricity_Current;      /* 是否有电流通过       */
    bool   ESP32_fires_flag;         /* 火焰检测标志         */
    bool   ESP32_electricity_flag;   /* 电流异常标志         */
    int    buzzer;                   /* 蜂鸣器状态 (0/1)     */
} Fusion_Sensor_Snapshot_t;

/* ============================================================
 *  兼容旧版结果结构体 (保留用于回调)
 * ============================================================ */
typedef struct {
    Fusion_Level_t level;
    Fusion_BPA_t   bpa;
    float          probability;
    float          conflict;
    float          t_max;
    float          delta_t;
    float          t_rise_rate;
    float          tvoc;
    float          rh;
    float          rh_rate;
    int            hot_spot_cnt;
    uint32_t       timestamp;
} Fusion_Result_t;

/* ============================================================
 *  回调函数类型定义
 * ============================================================ */
typedef void (*Fusion_Alarm_Callback_t)(const Fusion_Result_t *result);

/* ============================================================
 *  公开 API 函数声明
 * ============================================================ */

esp_err_t SensorFusion_Init(i2c_master_bus_handle_t busHandle);
void SensorFusion_Register_Alarm_Callback(Fusion_Alarm_Callback_t callback);

/**
 * @brief 获取完整传感器数据快照 (含融合结果)
 */
esp_err_t SensorFusion_Get_Snapshot(Fusion_Sensor_Snapshot_t *snapshot);

/**
 * @deprecated 保留用于回调
 */
esp_err_t SensorFusion_Get_Result(Fusion_Result_t *result);
Fusion_Level_t SensorFusion_Get_Level(void);
float SensorFusion_Get_Probability(void);


/**
 * @brief 传感器融合任务, 用于实时融合传感器数据
*/
void SensorFusion_Task(void *pvParameters);

/**
 * @brief 获取ESP32硬件MAC地址字符串 (格式: "ESP32_XX:XX:XX:XX:XX:XX")
 * @return MAC地址字符串指针, 失败返回 "ESP32_00:00:00:00:00:00"
 *
 * 使用场景:
 * - MQTT JSON数据中的设备唯一标识
 * - 日志记录设备信息
 * - HTTP请求头中的设备标识
 *
 * 注意:
 * - 首次调用时会自动初始化并读取硬件MAC
 * - 后续调用直接返回缓存的字符串, 无性能开销
 * - MAC地址来源优先级: WiFi STA > WiFi SoftAP > eFuse基础MAC
 */
const char* SensorFusion_Get_Mac_Address(void);

/**
 * @brief 打印详细的MAC地址信息到串口 (调试用)
 *
 * 此函数会输出以下信息:
 * - MAC地址完整格式
 * - 数据来源 (WiFi STA / eFuse等)
 * - 6个字节的十六进制值
 * - 厂商OUI识别结果
 * - 使用说明提示
 *
 * 适用场景:
 * - 系统启动时验证MAC是否正确读取
 * - 调试设备标识问题
 * - 查看当前设备的唯一ID
 *
 * 注意: 可在任意时刻调用, 不影响系统运行
 */
void SensorFusion_Print_Mac_Info(void);

#endif