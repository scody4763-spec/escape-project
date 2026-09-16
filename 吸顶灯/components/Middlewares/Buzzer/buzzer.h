#ifndef __BUZZER_H_
#define __BUZZER_H_

#include "esp_err.h"
#include <stdbool.h>

// --- 蜂鸣器硬件配置 ---
#define BUZZER_GPIO_PIN      25          // 蜂鸣器GPIO引脚
#define BUZZER_PWM_CHANNEL   PWM_CH_1    // PWM通道 (避免与LED冲突)
#define BUZZER_PWM_TIMER     PWM_TIMER_1 // PWM定时器
#define BUZZER_FREQ_DEFAULT  2500        // 默认频率 (Hz)
#define BUZZER_DUTY_MAX      1023        // 最大占空比 (10位)

// --- 音量等级定义 ---
typedef enum {
    BUZZER_VOLUME_OFF    = 0,   // 静音
    BUZZER_VOLUME_LOW    = 25,  // 低音量
    BUZZER_VOLUME_MEDIUM = 50,  // 中等音量
    BUZZER_VOLUME_HIGH   = 75,  // 高音量
    BUZZER_VOLUME_MAX    = 100, // 最大音量
} Buzzer_Volume_t;

// --- 蜂鸣器工作模式 ---
typedef enum {
    BUZZER_MODE_CONTINUOUS,    // 持续发声
    BUZZER_MODE_INTERMITTENT,  // 间歇发声
    BUZZER_MODE_CUSTOM         // 自定义模式
} Buzzer_Mode_t;

// --- 报警类型定义 ---
typedef enum {
    BUZZER_ALARM_FIRE,         // 火灾报警
    BUZZER_ALARM_WARNING,      // 预警提示
    BUZZER_ALARM_SUCCESS,      // 成功提示
    BUZZER_ALARM_ERROR,        // 错误提示
} Buzzer_Alarm_Type_t;

/**
 * @brief 初始化蜂鸣器模块
 * @return esp_err_t ESP_OK表示成功
 */
esp_err_t Buzzer_Init(void);

/**
 * @brief 反初始化蜂鸣器模块
 * @return esp_err_t
 */
esp_err_t Buzzer_Deinit(void);

/**
 * @brief 打开蜂鸣器 (使用当前设置的音量和频率)
 * @return esp_err_t
 */
esp_err_t Buzzer_Turn_On(void);

/**
 * @brief 关闭蜂鸣器
 * @return esp_err_t
 */
esp_err_t Buzzer_Turn_Off(void);

/**
 * @brief 设置音量
 * @param volume 音量等级 (0~100)
 * @return esp_err_t
 */
esp_err_t Buzzer_Set_Volume(int volume);

/**
 * @brief 获取当前音量
 * @return int 当前音量值 (0~100)
 */
int Buzzer_Get_Volume(void);

/**
 * @brief 设置蜂鸣器频率 (改变音调)
 * @param frequencyHz 频率值 (Hz), 建议: 500~8000
 * @return esp_err_t
 */
esp_err_t Buzzer_Set_Frequency(uint32_t frequencyHz);

/**
 * @brief 获取当前频率
 * @return uint32_t 当前频率值 (Hz)
 */
uint32_t Buzzer_Get_Frequency(void);

/**
 * @brief 快速配置音量和频率
 * @param volume 音量 (0~100)
 * @param frequencyHz 频率 (Hz)
 * @return esp_err_t
 */
esp_err_t Buzzer_Config(int volume, uint32_t frequencyHz);

/**
 * @brief 播放内置报警音效
 * @param alarmType 报警类型
 * @param durationMs 持续时间 (ms), 0表示持续播放直到手动停止
 * @return esp_err_t
 */
esp_err_t Buzzer_Play_Alarm(Buzzer_Alarm_Type_t alarmType, int durationMs);

/**
 * @brief 停止所有声音输出
 * @return esp_err_t
 */
esp_err_t Buzzer_Stop_All(void);

/**
 * @brief 检查蜂鸣器是否正在响
 * @return bool true=正在响, false=静音
 */
bool Buzzer_Is_Active(void);

#endif