#ifndef __MLX90640_H__
#define __MLX90640_H__

#include <stdint.h>
#include <stdbool.h>
#include "esp_err.h"
#include "i2c_bus.h"

/* ========== 设备地址 & I2C 频率 ========== */
#define MLX90640_ADDR            0x33
#define MLX90640_I2C_FREQ        400000

/* ========== 寄存器地址 ========== */
#define MLX90640_REG_STATUS      0x8000
#define MLX90640_REG_CTRL1       0x800D

/* ========== 像素尺寸 ========== */
#define MLX90640_COLS            32
#define MLX90640_ROWS            24
#define MLX90640_PIXEL_TOTAL     768

// 控制寄存器1 (0x800D)
#define MLX90640_CTRL1_INIT_VALUE         0x0006U   // 默认初始值
#define MLX90640_CTRL1_SOFT_RESET_BIT     (1 << 15) // 软复位位

// 状态寄存器 (0x8000)
#define MLX90640_STATUS_NEW_DATA_BIT      (1 << 3)  // 新数据就绪
#define MLX90640_STATUS_SUBPAGE_MASK      0x0007U   // 子页号掩码
#define MLX90640_STATUS_CLEAR_NEW_DATA    0x0030U   // 清除标志并启动下一帧

// 其他常用位域（可扩展）
#define MLX90640_CTRL1_CHESS_MODE_BIT     (1 << 12) // Chess模式
#define MLX90640_CTRL1_SUBPAGE_ENABLE_BIT (1 << 0)  // 子页模式使能
#define MLX90640_CTRL1_REFRESH_MASK       0x0380U   // 刷新率位域
#define MLX90640_CTRL1_REFRESH_SHIFT      7
#define MLX90640_CTRL1_RESOLUTION_MASK    0x0C00U   // 分辨率位域
#define MLX90640_CTRL1_RESOLUTION_SHIFT   10


// EEPROM 地址和大小常量
#define MLX90640_EEPROM_BASE_ADDR         0x2400U	// EEPROM 基地址（起始地址）

#define MLX90640_EEPROM_WORD_COUNT        832U		// EEPROM 总字数（单位：16-bit 字）

#define MLX90640_EEPROM_BYTE_COUNT        (MLX90640_EEPROM_WORD_COUNT * 2)	// EEPROM 总字节数（= 字数 × 2）

/* ========== 帧数据结构（返回给用户） ========== */
typedef struct {
    float temperature[MLX90640_PIXEL_TOTAL];   // 所有像素温度 (°C)
    float ta;                                  // 环境温度 (°C)
    float vdd;                                 // 供电电压 (V)
    float max_temp;
    float min_temp;
    float center_temp;                         // 中心 8×8 区域平均温度
    bool  valid;
} MLX90640_Frame_t;

/* ========== API 函数 ========== */

/**
 * @brief 初始化 MLX90640（加入 I2C 总线 + 读取校准 + 配置寄存器）
 * @param busHandle  I2C 总线句柄（由 I2c_Init_Bus 创建）
 * @return ESP_OK 成功
 */
esp_err_t MLX90640_Init(i2c_master_bus_handle_t busHandle);

/**
 * @brief 检查新数据是否就绪
 * @return true 表示有新子页数据可读
 */
bool MLX90640_Is_New_Data_Ready(void);

/**
 * @brief 读取当前子页数据（内部会自动累积两个子页）
 * @return ESP_OK 表示成功读取一个子页
 */
esp_err_t MLX90640_Read_Subpage(void);

/**
 * @brief 获取完整帧（两个子页合并后的温度图像）
 * @return 指向有效帧的指针，若未就绪则返回 NULL
 */
const MLX90640_Frame_t* MLX90640_Get_Frame(void);

/**
 * @brief 软复位传感器
 */
esp_err_t MLX90640_Soft_Reset(void);

/**
 * @brief 设置刷新率（0~7 对应 0.5Hz ~ 64Hz）
 */
esp_err_t MLX90640_Set_Refresh_Rate(uint8_t rate);

/**
 * @brief 设置 ADC 分辨率（0~3 对应 16~19 bit）
 */
esp_err_t MLX90640_Set_Resolution(uint8_t resolution);


/* MLX90640 任务函数 */
void MLX90640_Task(void *pvParameters);

#endif