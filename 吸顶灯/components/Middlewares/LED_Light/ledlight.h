#ifndef __LEDLIGHT_H_
#define __LEDLIGHT_H_

#include "esp_err.h"

// --- LED硬件配置 ---
#define LED_GPIO_PIN        33          // LED连接的GPIO引脚
#define LED_PWM_CHANNEL     PWM_CH_2    // 使用的PWM通道
#define LED_PWM_TIMER       PWM_TIMER_2 // 使用的定时器
#define LED_PWM_FREQ_HZ     5000        // PWM频率 (5kHz, 避免频闪)
#define LED_DUTY_MAX        1023        // 最大占空比 (10位分辨率)

/**
 * @brief 初始化LED模块 (配置PWM)
 * @return esp_err_t ESP_OK表示成功
 */
esp_err_t LedLight_Init(void);

/**
 * @brief 设置LED亮度
 * @param brightness 亮度值 (0~100, 0=关闭, 100=最亮)
 * @return esp_err_t
 */
esp_err_t LedLight_Set_Brightness(int brightness);

/**
 * @brief 获取当前亮度
 * @return int 当前亮度值 (0~100)
 */
int LedLight_Get_Brightness(void);

/**
 * @brief 打开LED (最大亮度)
 * @return esp_err_t
 */
esp_err_t LedLight_Turn_On(void);

/**
 * @brief 关闭LED
 * @return esp_err_t
 */
esp_err_t LedLight_Turn_Off(void);

/**
 * @brief LED渐变效果 (呼吸灯)
 * @param targetBrightness 目标亮度 (0~100)
 * @param fadeTimeMs 渐变时间 (毫秒)
 * @return esp_err_t
 */
esp_err_t LedLight_Fade_To(int targetBrightness, int fadeTimeMs);

/**
 * @brief 反初始化LED模块 (释放PWM资源)
 * @return esp_err_t
 */
esp_err_t LedLight_Deinit(void);

#endif