#include "pwm.h"
#include "esp_log.h"
#include <string.h>

static const char *TAG = "PWM";

// 定时器使用状态标记 (防止重复初始化)
static bool Timer_In_Use[4] = {false, false, false, false};

// 通道到定时器的映射关系
static Pwm_Timer_t Channel_Timer_Map[8] = {
    PWM_TIMER_0, PWM_TIMER_0, PWM_TIMER_0, PWM_TIMER_0,
    PWM_TIMER_1, PWM_TIMER_1, PWM_TIMER_1, PWM_TIMER_1,
};

// 通道GPIO映射
static int Channel_Gpio_Map[8] = {-1, -1, -1, -1, -1, -1, -1, -1};

// 通道初始化状态
static bool Channel_Init_Flag[8] = {false, false, false, false, false, false, false, false};

/**
 * @brief 配置LEDC定时器 (内部辅助函数)
 */
static esp_err_t Pwm_Configure_Timer(Pwm_Timer_t timer, uint32_t freqHz, ledc_timer_bit_t dutyResolution)
{
    ledc_timer_config_t timer_conf = {
        .speed_mode       = PWM_HS_MODE,
        .timer_num        = timer,
        .duty_resolution  = dutyResolution,
        .freq_hz          = freqHz,
        .clk_cfg          = LEDC_AUTO_CLK,
    };
    
    return ledc_timer_config(&timer_conf);
}

esp_err_t Pwm_Init_Channel(Pwm_Channel_t channel, int gpioPin, Pwm_Timer_t timer, uint32_t freqHz, ledc_timer_bit_t dutyResolution)
{
    if (channel > PWM_CH_7 || gpioPin < 0)
    {
        ESP_LOGE(TAG, "无效的参数: channel=%d, gpio=%d", channel, gpioPin);
        return ESP_ERR_INVALID_ARG;
    }

    if (Channel_Init_Flag[channel])
    {
        ESP_LOGW(TAG, "通道 %d 已初始化，先反初始化", channel);
        Pwm_Deinit_Channel(channel);
    }

    // 如果定时器未配置，则配置它
    if (!Timer_In_Use[timer])
    {
        esp_err_t ret = Pwm_Configure_Timer(timer, freqHz, dutyResolution);
        if (ret != ESP_OK)
        {
            ESP_LOGE(TAG, "定时器 %d 配置失败", timer);
            return ret;
        }
        Timer_In_Use[timer] = true;
        ESP_LOGI(TAG, "定时器 %d 已配置: %dHz, %d位分辨率", timer, freqHz, dutyResolution);
    }

    // 配置LED通道
    ledc_channel_config_t ch_conf = {
        .speed_mode     = PWM_HS_MODE,
        .channel        = channel,
        .timer_sel      = timer,
        .intr_type      = LEDC_INTR_DISABLE,
        .gpio_num       = gpioPin,
        .duty           = 0,         // 初始占空比为0
        .hpoint         = 0,
    };

    esp_err_t ret = ledc_channel_config(&ch_conf);
    if (ret == ESP_OK)
    {
        Channel_Timer_Map[channel] = timer;
        Channel_Gpio_Map[channel] = gpioPin;
        Channel_Init_Flag[channel] = true;
        ESP_LOGI(TAG, "PWM通道 %d 初始化成功: GPIO%d, Timer%d, %dHz", 
                 channel, gpioPin, timer, freqHz);
    }
    else
    {
        ESP_LOGE(TAG, "PWM通道 %d 配置失败", channel);
    }

    return ret;
}

esp_err_t Pwm_Set_Duty(Pwm_Channel_t channel, uint32_t duty)
{
    if (!Channel_Init_Flag[channel])
    {
        ESP_LOGE(TAG, "通道 %d 未初始化", channel);
        return ESP_ERR_INVALID_STATE;
    }

    // 根据当前定时器配置获取最大占空比值
    uint32_t maxDuty = (1 << PWM_TIMER_RES) - 1;  // 默认10位: 1023
    
    if (duty > maxDuty)
    {
        ESP_LOGW(TAG, "占空比 %d 超过最大值 %d，已限制", duty, maxDuty);
        duty = maxDuty;
    }

    return ledc_set_duty(PWM_HS_MODE, channel, duty);
}

uint32_t Pwm_Get_Duty(Pwm_Channel_t channel)
{
    if (!Channel_Init_Flag[channel])
    {
        ESP_LOGE(TAG, "通道 %d 未初始化", channel);
        return 0;
    }

    return ledc_get_duty(PWM_HS_MODE, channel);
}

esp_err_t Pwm_Set_Frequency(Pwm_Timer_t timer, uint32_t freqHz)
{
    if (!Timer_In_Use[timer])
    {
        ESP_LOGE(TAG, "定时器 %d 未初始化", timer);
        return ESP_ERR_INVALID_STATE;
    }

    // 直接更新定时器频率 (LEDC硬件会自动同步)
    esp_err_t ret = ledc_set_freq(PWM_HS_MODE, timer, freqHz);

    if (ret == ESP_OK)
    {
        ESP_LOGI(TAG, "定时器 %d 频率更新为 %dHz", timer, freqHz);
    }
    else
    {
        ESP_LOGE(TAG, "定时器 %d 频率更新失败", timer);
    }

    return ret;
}

esp_err_t Pwm_Fade_Duty(Pwm_Channel_t channel, uint32_t targetDuty, int scale, int cycleNum, int dutyDuration)
{
    if (!Channel_Init_Flag[channel])
    {
        ESP_LOGE(TAG, "通道 %d 未初始化", channel);
        return ESP_ERR_INVALID_STATE;
    }

    // 安装渐变功能 (只需安装一次)
    static bool fadeInstalled = false;
    if (!fadeInstalled)
    {
        esp_err_t ret = ledc_fade_func_install(0);
        if (ret != ESP_OK)
        {
            ESP_LOGE(TAG, "渐变功能安装失败");
            return ret;
        }
        fadeInstalled = true;
    }

    // 配置渐变参数
    return ledc_set_fade_with_time(PWM_HS_MODE, channel, targetDuty, dutyDuration);
}

esp_err_t Pwm_Stop(Pwm_Channel_t channel)
{
    if (!Channel_Init_Flag[channel])
    {
        ESP_LOGW(TAG, "通道 %d 未初始化或已停止", channel);
        return ESP_OK;
    }

    return Pwm_Set_Duty(channel, 0);
}

esp_err_t Pwm_Deinit_Channel(Pwm_Channel_t channel)
{
    if (!Channel_Init_Flag[channel])
    {
        ESP_LOGW(TAG, "通道 %d 未初始化", channel);
        return ESP_OK;
    }

    esp_err_t ret = ledc_stop(PWM_HS_MODE, channel, 0);
    if (ret == ESP_OK)
    {
        Channel_Init_Flag[channel] = false;
        Channel_Gpio_Map[channel] = -1;
        
        // 检查是否还有其他通道在使用该定时器
        Pwm_Timer_t usedTimer = Channel_Timer_Map[channel];
        bool timerStillInUse = false;
        for (int idx = 0; idx < 8; idx++)
        {
            if (idx != channel && Channel_Init_Flag[idx] && Channel_Timer_Map[idx] == usedTimer)
            {
                timerStillInUse = true;
                break;
            }
        }
        
        // 如果没有其他通道使用该定时器，则释放定时器资源
        if (!timerStillInUse)
        {
            Timer_In_Use[usedTimer] = false;
            ESP_LOGI(TAG, "定时器 %d 已释放", usedTimer);
        }
        
        ESP_LOGI(TAG, "PWM通道 %d 已反初始化", channel);
    }
    else
    {
        ESP_LOGE(TAG, "PWM通道 %d 反初始化失败", channel);
    }

    return ret;
}