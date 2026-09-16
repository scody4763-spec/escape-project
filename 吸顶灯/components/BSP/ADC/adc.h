#ifndef __ADC_H__
#define __ADC_H__

#include "esp_err.h"
#include "esp_adc/adc_oneshot.h"
#include "hal/adc_types.h"

// --- ADC硬件配置宏 ---
#define ADC_UNIT                   ADC_UNIT_1           // ADC1 (GPIO36属于ADC1)
#define ADC_CHANNEL                ADC_CHANNEL_0        // SENSOR_VP = GPIO36 = ADC1_CH0
#define ADC_ATTEN                  ADC_ATTEN_DB_12      // 衰减12dB, 量程约0~3.1V
#define ADC_BITWIDTH               ADC_BITWIDTH_12      // 12位分辨率, 0~4095
#define ADC_REF_VOLTAGE_MV         3100                 // 参考电压 (mV), 对应ADC_ATTEN_DB_12

// --- 分压电路参数 ---
// VBUS ---[R1=30K]--- ADC_PIN ---[R2=7.5K]--- GND
// V_ADC = VBUS * R2/(R1+R2) = VBUS * 1/5
// VBUS  = V_ADC * 5
#define ADC_DIVIDER_R1_KOHM        30                   // 上拉电阻 (kΩ), 接VBUS
#define ADC_DIVIDER_R2_KOHM        7.5f                 // 下拉电阻 (kΩ), 接GND
#define ADC_DIVIDER_RATIO          ((ADC_DIVIDER_R1_KOHM + ADC_DIVIDER_R2_KOHM) / ADC_DIVIDER_R2_KOHM)  // 分压比 = 5

/**
 * @brief 初始化ADC模块 (ADC1, 通道0, GPIO36/SENSOR_VP)
 *
 * @return esp_err_t    ESP_OK表示成功
 */
esp_err_t Adc_Init(void);

/**
 * @brief 读取ADC原始值 (12位: 0~4095)
 *
 * @param rawValue      输出参数, 原始ADC值
 * @return esp_err_t    ESP_OK表示成功
 */
esp_err_t Adc_Read_Raw(int *rawValue);

/**
 * @brief 读取ADC引脚电压值 (单位: mV)
 *
 * 返回ADC引脚(SENSOR_VP)处的实际电压, 即分压电路中间点的电压。
 * 使用ADC校准功能将原始值转换为电压值。
 *
 * @param voltageMv     输出参数, ADC引脚电压 (mV)
 * @return esp_err_t    ESP_OK表示成功
 */
esp_err_t Adc_Read_Pin_Voltage(int *voltageMv);

/**
 * @brief 读取VBUS总线电压值 (单位: mV)
 *
 * 根据分压电路参数计算VBUS实际电压:
 *   VBUS = V_ADC_PIN × (R1+R2)/R2 = V_ADC_PIN × 5
 * 内部先调用 Adc_Read_Pin_Voltage() 获取引脚电压, 再乘以分压比。
 *
 * @param voltageMv     输出参数, VBUS电压 (mV)
 * @return esp_err_t    ESP_OK表示成功
 */
esp_err_t Adc_Read_Vbus_Voltage(int *voltageMv);

/**
 * @brief 反初始化ADC模块 (释放资源)
 *
 * @return esp_err_t    ESP_OK表示成功
 */
esp_err_t Adc_Deinit(void);

#endif