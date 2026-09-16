#include "ledlight.h"
#include "pwm.h"
#include "esp_log.h"

static const char *TAG = "LedLight";

// 当前亮度缓存 (0~100)
static int Current_Brightness = 0;

// 初始化状态标记
static bool Is_Initialized = false;

esp_err_t LedLight_Init(void)
{
    if (Is_Initialized)
    {
        ESP_LOGW(TAG, "LED模块已初始化");
        return ESP_OK;
    }

    // 调用BSP层PWM初始化
    esp_err_t ret = Pwm_Init_Channel(
        LED_PWM_CHANNEL,
        LED_GPIO_PIN,
        LED_PWM_TIMER,
        LED_PWM_FREQ_HZ,
        LEDC_TIMER_10_BIT
    );

    if (ret == ESP_OK)
    {
        Is_Initialized = true;
        Current_Brightness = 0;  // 初始状态: 关闭
        Pwm_Set_Duty(LED_PWM_CHANNEL, 0);  // 确保初始为关闭
        ESP_LOGI(TAG, "LED模块初始化成功: GPIO%d, PWM通道%d", 
                 LED_GPIO_PIN, LED_PWM_CHANNEL);
    }
    else
    {
        ESP_LOGE(TAG, "LED模块初始化失败");
    }

    return ret;
}

esp_err_t LedLight_Set_Brightness(int brightness)
{
    if (!Is_Initialized)
    {
        ESP_LOGE(TAG, "LED模块未初始化");
        return ESP_ERR_INVALID_STATE;
    }

    // 限制范围在 0~100
    if (brightness < 0) brightness = 0;
    if (brightness > 100) brightness = 100;

    // 将百分比转换为PWM占空比 (0~1023)
    uint32_t duty = (uint32_t)(brightness * LED_DUTY_MAX / 100);

    // 调用BSP层设置占空比
    esp_err_t ret = Pwm_Set_Duty(LED_PWM_CHANNEL, duty);
    
    if (ret == ESP_OK)
    {
        Current_Brightness = brightness;
        ESP_LOGD(TAG, "LED亮度设置为: %d%% (duty=%d)", brightness, duty);
    }
    else
    {
        ESP_LOGE(TAG, "设置LED亮度失败");
    }

    return ret;
}

int LedLight_Get_Brightness(void)
{
    if (!Is_Initialized)
    {
        ESP_LOGW(TAG, "LED模块未初始化");
        return 0;
    }

    return Current_Brightness;
}

esp_err_t LedLight_Turn_On(void)
{
    return LedLight_Set_Brightness(100);  // 最大亮度
}

esp_err_t LedLight_Turn_Off(void)
{
    return LedLight_Set_Brightness(0);   // 关闭
}

esp_err_t LedLight_Fade_To(int targetBrightness, int fadeTimeMs)
{
    if (!Is_Initialized)
    {
        ESP_LOGE(TAG, "LED模块未初始化");
        return ESP_ERR_INVALID_STATE;
    }

    // 限制目标亮度范围
    if (targetBrightness < 0) targetBrightness = 0;
    if (targetBrightness > 100) targetBrightness = 100;

    // 计算目标占空比
    uint32_t targetDuty = (uint32_t)(targetBrightness * LED_DUTY_MAX / 100);

    // 调用BSP层渐变功能
    esp_err_t ret = Pwm_Fade_Duty(LED_PWM_CHANNEL, targetDuty, 0, 1, fadeTimeMs);
    
    if (ret == ESP_OK)
    {
        Current_Brightness = targetBrightness;
        ESP_LOGI(TAG, "LED渐变到: %d%% (%dms)", targetBrightness, fadeTimeMs);
    }
    else
    {
        ESP_LOGE(TAG, "LED渐变失败");
    }

    return ret;
}

esp_err_t LedLight_Deinit(void)
{
    if (!Is_Initialized)
    {
        ESP_LOGW(TAG, "LED模块未初始化");
        return ESP_OK;
    }

    // 先关闭LED
    LedLight_Turn_Off();

    // 调用BSP层释放PWM资源
    esp_err_t ret = Pwm_Deinit_Channel(LED_PWM_CHANNEL);
    
    if (ret == ESP_OK)
    {
        Is_Initialized = false;
        Current_Brightness = 0;
        ESP_LOGI(TAG, "LED模块已反初始化");
    }
    else
    {
        ESP_LOGE(TAG, "LED模块反初始化失败");
    }

    return ret;
}