#ifndef __ENS160_H_
#define __ENS160_H_

#include <stdbool.h>
#include "i2c_bus.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

/* ============================================================
 *  ENS160 寄存器地址宏定义
 * ============================================================ */
#define ENS160_PART_ID_ADDR         0x00    /* 2 bytes, Read  */
#define ENS160_OPMODE_ADDR          0x10    /* 1 byte,  R/W   */
#define ENS160_CONFIG_ADDR          0x11    /* 1 byte,  R/W   */
#define ENS160_COMMAND_ADDR         0x12    /* 1 byte,  R/W   */
#define ENS160_TEMP_IN_ADDR         0x13    /* 2 bytes, R/W   */
#define ENS160_RH_IN_ADDR           0x15    /* 2 bytes, R/W   */
/* 0x17 - 0x1F Reserved */

#define ENS160_DEVICE_STATUS_ADDR   0x20    /* 1 byte,  Read  */
#define ENS160_DATA_AQI_ADDR        0x21    /* 1 byte,  Read  */
#define ENS160_DATA_TVOC_ADDR       0x22    /* 2 bytes, Read  */
#define ENS160_DATA_ECO2_ADDR       0x24    /* 2 bytes, Read  */
/* 0x26 - 0x2F Reserved */

#define ENS160_DATA_T_ADDR          0x30    /* 2 bytes, Read  */
#define ENS160_DATA_RH_ADDR         0x32    /* 2 bytes, Read  */
/* 0x34 - 0x37 Reserved */

#define ENS160_DATA_MISR_ADDR       0x38    /* 1 byte,  Read  */

#define ENS160_GPR_WRITE_ADDR       0x40    /* 8 bytes, R/W (0x40~0x47) */
#define ENS160_GPR_READ_ADDR        0x48    /* 8 bytes, Read  (0x48~0x4F) */


/* ============================================================
 *  ENS160 OPMODE 寄存器值宏定义
 * ============================================================ */
#define ENS160_OPMODE_DEEP_SLEEP    0x00    /* 深度睡眠模式   */
#define ENS160_OPMODE_IDLE          0x01    /* 空闲模式       */
#define ENS160_OPMODE_STANDARD      0x02    /* 标准气体传感模式 */
#define ENS160_OPMODE_RESET         0xF0    /* 复位           */

/* ============================================================
 *  ENS160 DEVICE_STATUS 位掩码宏定义
 * ============================================================ */
#define ENS160_STATUS_STATAS_BIT    (1 << 7)   /* 操作模式运行中 */
#define ENS160_STATUS_STATER_BIT    (1 << 6)   /* 错误标志       */
#define ENS160_STATUS_VALIDITY_MASK (3 << 2)   /* 数据有效性掩码 */
#define ENS160_STATUS_VALIDITY_NORMAL   (0 << 2)  /* 正常         */
#define ENS160_STATUS_VALIDITY_WARMUP    (1 << 2)  /* 暖机阶段     */
#define ENS160_STATUS_VALIDITY_STARTUP   (2 << 2)  /* 初始启动     */
#define ENS160_STATUS_VALIDITY_INVALID   (3 << 2)  /* 无效         */
#define ENS160_STATUS_NEWDAT_BIT    (1 << 1)   /* 新数据就绪     */
#define ENS160_STATUS_NEWGPR_BIT    (1 << 0)   /* 新GPR数据就绪  */

/* ============================================================
 *  ENS160 设备信息宏定义
 * ============================================================ */
#define ENS160_ADDR 		0x53		/* ENS160 I2C 地址 */
#define ENS160_I2C_FREQ 	400000		/* ENS160 I2C 频率 400kHz */
#define ENS160_EXPECTED_PART_ID 0x0160	/* ENS160 期望的部件ID */

/* ============================================================
 *  ENS160 数据结构体定义
 * ============================================================ */

/* 空气质量数据 */
typedef struct {
	uint8_t  aqi;       /* UBA AQI 指数 (1~5)    */
	uint16_t tvoc;      /* TVOC 浓度 (ppb)        */
	uint16_t eco2;      /* eCO2 浓度 (ppm)        */
} ENS160_Data_t;

/* 数据有效性枚举 */
typedef enum {
	ENS160_VALIDITY_NORMAL  = 0,  /* 正常         */
	ENS160_VALIDITY_WARMUP  = 1,  /* 暖机阶段     */
	ENS160_VALIDITY_STARTUP = 2,  /* 初始启动     */
	ENS160_VALIDITY_INVALID = 3   /* 无效         */
} ENS160_Validity_t;

/* 设备状态 */
typedef struct {
	bool               is_running;   /* STATAS: 运行模式是否运行中 */
	bool               has_error;    /* STATER: 是否存在错误       */
	ENS160_Validity_t  validity;     /* 数据有效性                */
	bool               has_new_data; /* NEWDAT: 是否有新数据就绪   */
	bool               has_new_gpr;  /* NEWGPR: 是否有新GPR数据    */
} ENS160_Status_t;


/* ============================================================
 *  ENS160 公开 API 函数声明
 * ============================================================ */

/* 初始化 ENS160 (加入I2C总线 + 验证PART_ID + 进入标准模式) */
esp_err_t ENS160_Init(i2c_master_bus_handle_t busHandle);

/* 读取部件 ID */
uint16_t ENS160_Read_PartID(void);

/* 设置温湿度补偿 (温度°C, 湿度%) */
esp_err_t ENS160_Set_Env_Comp(float tempCelsius, float rhPercent);

/* 读取设备状态 */
esp_err_t ENS160_Read_Status(ENS160_Status_t *status);

/* 读取 AQI 指数 (1~5) */
esp_err_t ENS160_Read_AQI(uint8_t *aqi);

/* 读取 TVOC 浓度 (ppb) */
esp_err_t ENS160_Read_TVOC(uint16_t *tvoc);

/* 读取 eCO2 浓度 (ppm) */
esp_err_t ENS160_Read_eCO2(uint16_t *eco2);

/* 设置工作模式 (OPMODE) */
esp_err_t ENS160_Set_OpMode(uint8_t mode);

/* 读取所有空气质量数据 (AQI + TVOC + eCO2) */
esp_err_t ENS160_Read_All(ENS160_Data_t *data);

/* ENS160 任务函数, 用于读取空气质量数据 */
void ENS160_Task(void *pvParameters);

#endif