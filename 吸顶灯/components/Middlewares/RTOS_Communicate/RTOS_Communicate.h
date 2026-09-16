#ifndef __RTOS_COMMUNICATE_H__
#define __RTOS_COMMUNICATE_H__

#include <stdint.h>
#include <stdbool.h>
#include "esp_err.h"
#include "freertos/FreeRTOS.h"
#include "freertos/event_groups.h"

/* ============================================================
 *  事件组位定义 (用于通知数据就绪)
 * ============================================================ */
#define COMM_EVENT_AHT2X_READY     (1 << 0)   /* AHT2x 温湿度数据就绪  */
#define COMM_EVENT_ENS160_READY    (1 << 1)   /* ENS160 气体数据就绪   */
#define COMM_EVENT_MLX90640_READY  (1 << 2)   /* MLX90640 热成像就绪   */
#define COMM_EVENT_ALL_READY       (COMM_EVENT_AHT2X_READY | \
                                    COMM_EVENT_ENS160_READY | \
                                    COMM_EVENT_MLX90640_READY)

/* ============================================================
 *  传感器数据结构体 (模块间通信用)
 * ============================================================ */

/* AHT2x 温湿度数据 */
typedef struct {
    float temperature;      /* 温度 (°C)  */
    float humidity;         /* 湿度 (%RH) */
    bool  valid;            /* 数据有效性 */
} Comm_AHT2x_Data_t;

/* ENS160 气体数据 */
typedef struct {
    uint8_t  aqi;           /* 空气质量指数 (1~5) */
    uint16_t tvoc;          /* TVOC 浓度 (ppb)    */
    uint16_t eco2;          /* eCO2 浓度 (ppm)    */
    bool     valid;         /* 数据有效性         */
} Comm_ENS160_Data_t;

/* MLX90640 热成像摘要数据 */
typedef struct {
    float t_max;            /* 最高温度 (°C)     */
    float t_min;            /* 最低温度 (°C)     */
    float t_avg;            /* 平均温度 (°C)     */
    float t_ambient;        /* 环境温度 Ta (°C)  */
    float t_center;         /* 中心区域温度 (°C) */
    int   hot_spot_cnt;     /* 高温像素数 (>60°C) */
    bool  valid;            /* 数据有效性         */
} Comm_MLX90640_Data_t;

/* 完整传感器数据包 (用于 SensorFusion 一次性获取) */
typedef struct {
    Comm_AHT2x_Data_t    aht;
    Comm_ENS160_Data_t   ens;
    Comm_MLX90640_Data_t mlx;
    uint32_t             timestamp;  /* 数据包时间戳 (ms) */
} Comm_All_Data_t;


/* ============================================================
 *  RTOS_Communicate 公开 API 函数声明
 * ============================================================ */

/**
 * @brief 初始化通信模块 (创建互斥锁与事件组)
 * @return ESP_OK 成功
 */
esp_err_t Comm_Init(void);

/**
 * @brief 写入 AHT2x 温湿度数据 (由 AHT2x_Task 调用)
 * @param data  指向 AHT2x 数据结构的指针
 * @return ESP_OK 成功
 */
esp_err_t Comm_Put_AHT2x_Data(const Comm_AHT2x_Data_t *data);

/**
 * @brief 读取 AHT2x 温湿度数据 (由 ENS160/MLX90640/SensorFusion 调用)
 * @param data  输出参数, 指向接收数据的缓冲区
 * @return ESP_OK 成功, ESP_ERR_NOT_FOUND 数据尚未就绪
 */
esp_err_t Comm_Get_AHT2x_Data(Comm_AHT2x_Data_t *data);

/**
 * @brief 写入 ENS160 气体数据 (由 ENS160_Task 调用)
 * @param data  指向 ENS160 数据结构的指针
 * @return ESP_OK 成功
 */
esp_err_t Comm_Put_ENS160_Data(const Comm_ENS160_Data_t *data);

/**
 * @brief 读取 ENS160 气体数据 (由 SensorFusion 调用)
 * @param data  输出参数, 指向接收数据的缓冲区
 * @return ESP_OK 成功
 */
esp_err_t Comm_Get_ENS160_Data(Comm_ENS160_Data_t *data);

/**
 * @brief 写入 MLX90640 热成像摘要数据 (由 MLX90640_Task 调用)
 * @param data  指向 MLX90640 数据结构的指针
 * @return ESP_OK 成功
 */
esp_err_t Comm_Put_MLX90640_Data(const Comm_MLX90640_Data_t *data);

/**
 * @brief 读取 MLX90640 热成像摘要数据 (由 SensorFusion 调用)
 * @param data  输出参数, 指向接收数据的缓冲区
 * @return ESP_OK 成功
 */
esp_err_t Comm_Get_MLX90640_Data(Comm_MLX90640_Data_t *data);

/**
 * @brief 一次性获取所有传感器数据 (原子操作, 由 SensorFusion 调用)
 * @param all  输出参数, 指向接收完整数据包的缓冲区
 * @return ESP_OK 成功
 */
esp_err_t Comm_Get_All_Data(Comm_All_Data_t *all);

/**
 * @brief 等待指定传感器数据就绪事件
 * @param event_bits  等待的事件位 (COMM_EVENT_xxx 组合)
 * @param timeout_ms  超时时间 (ms), 0 表示永久等待
 * @return 实际触发的事件位, 超时返回 0
 */
EventBits_t Comm_Wait_Events(EventBits_t event_bits, uint32_t timeout_ms);

/**
 * @brief 获取事件组句柄 (用于 xEventGroupWaitBits 等高级操作)
 * @return 事件组句柄, 未初始化返回 NULL
 */
EventGroupHandle_t Comm_Get_Event_Group(void);

#endif