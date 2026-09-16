#ifndef __AHT2X_H_
#define __AHT2X_H_

#include <stdbool.h>
#include "i2c_bus.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"


/* ============================================================
 *  AHT2x 命令宏定义
 * ============================================================ */
#define AHT2X_CMD_INIT          0xBE    /* 初始化命令       */
#define AHT2X_CMD_TRIGGER       0xAC    /* 触发测量命令     */
#define AHT2X_CMD_SOFT_RESET    0xBA    /* 软复位命令       */
#define AHT2X_CMD_READ_STATUS   0x71    /* 读状态字命令     */

/* ============================================================
 *  AHT2x 命令参数宏定义
 * ============================================================ */
#define AHT2X_TRIGGER_PARAM1    0x33    /* 触发测量参数1    */
#define AHT2X_TRIGGER_PARAM2    0x00    /* 触发测量参数2    */
#define AHT2X_INIT_PARAM1       0x08    /* 初始化参数1      */
#define AHT2X_INIT_PARAM2       0x00    /* 初始化参数2      */
#define AHT2X_RESET_PARAM1      0x00    /* 软复位参数1      */
#define AHT2X_RESET_PARAM2      0x00    /* 软复位参数2      */

/* ============================================================
 *  AHT2x 状态字位掩码宏定义
 * ============================================================ */
#define AHT2X_STATUS_BUSY_BIT       (1 << 7)   /* 忙标志 (Bit[7])     */
#define AHT2X_STATUS_CALIBRATED_BIT (1 << 3)   /* 校准使能 (Bit[3])   */

/* ============================================================
 *  AHT2x 设备信息宏定义
 * ============================================================ */
#define AHT2X_ADDR              0x38        /* AHT2x I2C 地址        */
#define AHT2X_I2C_FREQ          400000      /* AHT2x I2C 频率 400kHz */
#define AHT2X_MEASURE_DELAY_MS  75          /* 测量等待时间 (ms)     */
#define AHT2X_POWERON_DELAY_MS  40          /* 上电稳定时间 (ms)     */
#define AHT2X_RESET_DELAY_MS    20          /* 软复位等待时间 (ms)   */

/* ============================================================
 *  AHT2x 数据转换常量宏定义
 * ============================================================ */
#define AHT2X_DATA_RESOLUTION   1048576.0f  /* 2^20 = 1048576       */
#define AHT2X_TEMP_OFFSET       -50.0f       /* 温度偏移 (℃)         */
#define AHT2X_TEMP_SCALE        200.0f       /* 温度缩放因子          */
#define AHT2X_HUMI_SCALE        100.0f       /* 湿度缩放因子 (%)      */

/* ============================================================
 *  AHT2x 数据结构体定义
 * ============================================================ */

/* 温湿度数据 */
typedef struct {
    float temperature;      /* 温度 (℃)  */
    float humidity;         /* 湿度 (%RH) */
} AHT2x_Data_t;

/* 设备状态枚举 */
typedef enum {
    AHT2X_STATUS_NORMAL = 0,          /* 正常 (空闲且已校准) */
    AHT2X_STATUS_BUSY  = 1,           /* 传感器忙            */
    AHT2X_STATUS_NOT_CALIBRATED = 2   /* 未校准              */
} AHT2x_Status_t;


/* ============================================================
 *  AHT2x 公开 API 函数声明
 * ============================================================ */

/* 初始化 AHT2x (加入I2C总线 + 发送初始化命令 + 验证校准状态) */
esp_err_t AHT2x_Init(i2c_master_bus_handle_t busHandle);

/* 软复位 AHT2x */
esp_err_t AHT2x_Soft_Reset(void);

/* 读取设备状态 (忙标志 + 校准标志) */
esp_err_t AHT2x_Read_Status(AHT2x_Status_t *status);

/* 触发测量并读取温湿度数据 (温度℃, 湿度%RH) */
esp_err_t AHT2x_Read_Data(AHT2x_Data_t *data);

void AHT2x_Task(void *pvParameters);

#endif