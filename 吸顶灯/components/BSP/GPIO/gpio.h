#ifndef __GPIO_H_
#define __GPIO_H_

#include "esp_err.h"
#include "driver/gpio.h"

// --- GPIO方向枚举 ---
typedef enum {
    GPIO_DIR_IN     = GPIO_MODE_INPUT,
    GPIO_DIR_OUT    = GPIO_MODE_OUTPUT,
    GPIO_DIR_IN_OUT = GPIO_MODE_INPUT_OUTPUT,
} Gpio_Dir_t;

// --- GPIO中断触发类型 ---
typedef enum {
    GPIO_INTR_NONE      = GPIO_INTR_DISABLE,
    GPIO_INTR_EDGE_POS  = GPIO_INTR_POSEDGE,
    GPIO_INTR_EDGE_NEG  = GPIO_INTR_NEGEDGE,
    GPIO_INTR_EDGE_ANY  = GPIO_INTR_ANYEDGE,
    GPIO_INTR_LVL_LOW   = GPIO_INTR_LOW_LEVEL,
    GPIO_INTR_LVL_HIGH  = GPIO_INTR_HIGH_LEVEL,
} Gpio_Intr_t;

// --- GPIO上下拉配置 ---
typedef enum {
    GPIO_PULL_NONE    = 0,
    GPIO_PULL_UP      = 1,
    GPIO_PULL_DOWN    = 2,
    GPIO_PULL_UP_DOWN = 3,
} Gpio_Pull_t;

// --- GPIO输出电平 ---
#define GPIO_LEVEL_LOW   0
#define GPIO_LEVEL_HIGH  1

/**
 * @brief 初始化GPIO为输出模式
 *
 * @param pin           GPIO引脚号
 * @param initialLevel  初始输出电平 (GPIO_LEVEL_LOW / GPIO_LEVEL_HIGH)
 * @return esp_err_t    ESP_OK表示成功
 */
esp_err_t Gpio_Init_Output(gpio_num_t pin, uint32_t initialLevel);

/**
 * @brief 初始化GPIO为输入模式
 *
 * @param pin    GPIO引脚号
 * @param pull   上下拉配置 (GPIO_PULL_NONE / GPIO_PULL_UP / GPIO_PULL_DOWN / GPIO_PULL_UP_DOWN)
 * @return esp_err_t    ESP_OK表示成功
 */
esp_err_t Gpio_Init_Input(gpio_num_t pin, Gpio_Pull_t pull);

/**
 * @brief 初始化GPIO为带中断的输入模式
 *
 * 调用前需先通过 Gpio_Install_Isr() 安装全局中断服务。
 *
 * @param pin       GPIO引脚号
 * @param intrType  中断触发类型
 * @param pull      上下拉配置
 * @return esp_err_t    ESP_OK表示成功
 */
esp_err_t Gpio_Init_Interrupt(gpio_num_t pin, Gpio_Intr_t intrType, Gpio_Pull_t pull);

/**
 * @brief 设置GPIO输出电平
 *
 * @param pin    GPIO引脚号
 * @param level  输出电平 (GPIO_LEVEL_LOW / GPIO_LEVEL_HIGH)
 * @return esp_err_t
 */
esp_err_t Gpio_Set_Level(gpio_num_t pin, uint32_t level);

/**
 * @brief 读取GPIO输入电平
 *
 * @param pin    GPIO引脚号
 * @return int   当前电平 (0=低, 1=高), 未初始化时返回-1
 */
int Gpio_Get_Level(gpio_num_t pin);

/**
 * @brief 翻转GPIO输出电平
 *
 * @param pin    GPIO引脚号
 * @return esp_err_t
 */
esp_err_t Gpio_Toggle(gpio_num_t pin);

/**
 * @brief 安装全局GPIO中断服务 (全系统仅需调用一次)
 *
 * @return esp_err_t    ESP_OK表示成功
 */
esp_err_t Gpio_Install_Isr(void);

/**
 * @brief 为指定引脚注册中断回调函数
 *
 * 调用前需安装全局ISR服务并初始化引脚为中断模式。
 *
 * @param pin          GPIO引脚号
 * @param isrHandler   中断回调函数指针
 * @param args         传递给回调函数的参数
 * @return esp_err_t    ESP_OK表示成功
 */
esp_err_t Gpio_Isr_Add(gpio_num_t pin, gpio_isr_t isrHandler, void *args);

/**
 * @brief 移除指定引脚的中断回调
 *
 * @param pin    GPIO引脚号
 * @return esp_err_t
 */
esp_err_t Gpio_Isr_Remove(gpio_num_t pin);

/**
 * @brief 反初始化GPIO引脚 (复位为默认状态)
 *
 * @param pin    GPIO引脚号
 * @return esp_err_t
 */
esp_err_t Gpio_Deinit(gpio_num_t pin);

#endif