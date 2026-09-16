#ifndef __PWM_H__
#define __PWM_H__

#include "esp_err.h"
#include "driver/ledc.h"

// --- PWM配置宏 ---
#define PWM_TIMER_RES          LEDC_TIMER_10_BIT     // 定时器分辨率 (10位: 0~1023)
#define PWM_FREQ_HZ            5000                   // 默认PWM频率 5kHz

// --- LEDC通道配置 ---
// ESP32有16个通道 (0~15), 高速通道(0~7) + 低速通道(8~15)
typedef enum {
    PWM_CH_0 = LEDC_CHANNEL_0,
    PWM_CH_1 = LEDC_CHANNEL_1,
    PWM_CH_2 = LEDC_CHANNEL_2,
    PWM_CH_3 = LEDC_CHANNEL_3,
    PWM_CH_4 = LEDC_CHANNEL_4,
    PWM_CH_5 = LEDC_CHANNEL_5,
    PWM_CH_6 = LEDC_CHANNEL_6,
    PWM_CH_7 = LEDC_CHANNEL_7,
} Pwm_Channel_t;

// --- LEDC定时器配置 ---
typedef enum {
    PWM_TIMER_0 = LEDC_TIMER_0,
    PWM_TIMER_1 = LEDC_TIMER_1,
    PWM_TIMER_2 = LEDC_TIMER_2,
    PWM_TIMER_3 = LEDC_TIMER_3,
} Pwm_Timer_t;

// --- PWM速度模式 ---
typedef enum {
    PWM_HS_MODE = LEDC_HIGH_SPEED_MODE,   // 高速模式 (80MHz时钟源)
    PWM_LS_MODE = LEDC_LOW_SPEED_MODE,    // 低速模式 (可选时钟源)
} Pwm_SpeedMode_t;

/**
 * @brief 初始化PWM通道
 * 
 * @param channel       PWM通道号 (PWM_CH_0 ~ PWM_CH_7)
 * @param gpioPin       GPIO引脚号
 * @param timer         使用的定时器 (PWM_TIMER_0 ~ PWM_TIMER_3)
 * @param freqHz        PWM频率 (Hz), 建议范围: 1000~20000
 * @param dutyResolution 分辨率位数 (推荐10位: 0~1023)
 * @return esp_err_t    ESP_OK表示成功
 */
esp_err_t Pwm_Init_Channel(Pwm_Channel_t channel, int gpioPin, Pwm_Timer_t timer, uint32_t freqHz, ledc_timer_bit_t dutyResolution);

/**
 * @brief 设置PWM占空比
 * 
 * @param channel       PWM通道号
 * @param duty          占空比值 (根据分辨率决定范围, 10位时: 0~1023)
 * @return esp_err_t    
 */
esp_err_t Pwm_Set_Duty(Pwm_Channel_t channel, uint32_t duty);

/**
 * @brief 获取当前占空比
 * 
 * @param channel       PWM通道号
 * @return uint32_t     当前占空比值
 */
uint32_t Pwm_Get_Duty(Pwm_Channel_t channel);

/**
 * @brief 设置PWM频率 (需要重新配置定时器)
 * 
 * @param timer         使用的定时器
 * @param freqHz        新的频率值 (Hz)
 * @return esp_err_t    
 */
esp_err_t Pwm_Set_Frequency(Pwm_Timer_t timer, uint32_t freqHz);

/**
 * @brief 渐变调整占空比 (用于平滑过渡)
 * 
 * @param channel       PWM通道号
 * @param targetDuty    目标占空比
 * @param scale         渐变步长
 * @param cycleNum      循环次数
 * @param dutyDuration  每步持续时间(ms)
 * @return esp_err_t    
 */
esp_err_t Pwm_Fade_Duty(Pwm_Channel_t channel, uint32_t targetDuty, int scale, int cycleNum, int dutyDuration);

/**
 * @brief 停止PWM输出 (设置占空比为0)
 * 
 * @param channel       PWM通道号
 * @return esp_err_t    
 */
esp_err_t Pwm_Stop(Pwm_Channel_t channel);

/**
 * @brief 反初始化PWM通道 (释放资源)
 * 
 * @param channel       PWM通道号
 * @return esp_err_t    
 */
esp_err_t Pwm_Deinit_Channel(Pwm_Channel_t channel);

#endif