#include "buzzer.h"
#include "pwm.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char *TAG = "Buzzer";

// --- 内部状态变量 ---
static int      Buzzer_Current_Volume   = 0;        // 当前音量 (0~100)
static uint32_t Buzzer_Current_Freq     = 2500;     // 当前频率 (Hz)
static bool     Buzzer_Is_Initialized   = false;    // 初始化状态
static bool     Buzzer_Is_Active_Flag   = false;    // 是否正在响

// --- 报警参数配置结构 ---
typedef struct {
    uint32_t freqOn;       // 发声频率 (Hz)
    int      volumeOn;     // 发声音量 (%)
    int      durationOn;   // 发声时长 (ms)
    int      durationOff;  // 静音间隔 (ms)
    int      repeatCount;  // 重复次数, 0=持续
} Buzzer_Alarm_Config_t;

// --- 预定义报警配置 ---
static const Buzzer_Alarm_Config_t Alarm_Configs[] = {
    [BUZZER_ALARM_FIRE] = {
        .freqOn      = 3000,
        .volumeOn    = BUZZER_VOLUME_MAX,
        .durationOn  = 200,
        .durationOff = 150,
        .repeatCount = 0  // 持续报警直到手动停止
    },
    [BUZZER_ALARM_WARNING] = {
        .freqOn      = 2000,
        .volumeOn    = BUZZER_VOLUME_HIGH,
        .durationOn  = 300,
        .durationOff = 300,
        .repeatCount = 5
    },
    [BUZZER_ALARM_SUCCESS] = {
        .freqOn      = 2500,
        .volumeOn    = BUZZER_VOLUME_MEDIUM,
        .durationOn  = 150,
        .durationOff = 100,
        .repeatCount = 2
    },
    [BUZZER_ALARM_ERROR] = {
        .freqOn      = 800,
        .volumeOn    = BUZZER_VOLUME_HIGH,
        .durationOn  = 500,
        .durationOff = 200,
        .repeatCount = 3
    }
};

esp_err_t Buzzer_Init(void)
{
    if (Buzzer_Is_Initialized)
    {
        ESP_LOGW(TAG, "蜂鸣器模块已初始化");
        return ESP_OK;
    }

    // 调用BSP层初始化PWM通道
    esp_err_t ret = Pwm_Init_Channel(
        BUZZER_PWM_CHANNEL,
        BUZZER_GPIO_PIN,
        BUZZER_PWM_TIMER,
        BUZZER_FREQ_DEFAULT,
        LEDC_TIMER_10_BIT
    );

    if (ret == ESP_OK)
    {
        Buzzer_Is_Initialized = true;
        Buzzer_Current_Volume = 0;
        Buzzer_Current_Freq = BUZZER_FREQ_DEFAULT;
        Buzzer_Is_Active_Flag = false;

        // 初始状态: 关闭输出
        Pwm_Set_Duty(BUZZER_PWM_CHANNEL, 0);

        ESP_LOGI(TAG, "蜂鸣器模块初始化成功: GPIO%d, 默认频率%dHz",
                 BUZZER_GPIO_PIN, BUZZER_FREQ_DEFAULT);
    }
    else
    {
        ESP_LOGE(TAG, "蜂鸣器模块初始化失败");
    }

    return ret;
}

esp_err_t Buzzer_Deinit(void)
{
    if (!Buzzer_Is_Initialized)
    {
        ESP_LOGW(TAG, "蜂鸣器模块未初始化");
        return ESP_OK;
    }

    // 先停止发声
    Buzzer_Turn_Off();

    // 调用BSP层释放资源
    esp_err_t ret = Pwm_Deinit_Channel(BUZZER_PWM_CHANNEL);

    if (ret == ESP_OK)
    {
        Buzzer_Is_Initialized = false;
        Buzzer_Current_Volume = 0;
        Buzzer_Current_Freq = 0;
        Buzzer_Is_Active_Flag = false;

        ESP_LOGI(TAG, "蜂鸣器模块已反初始化");
    }
    else
    {
        ESP_LOGE(TAG, "蜂鸣器模块反初始化失败");
    }

    return ret;
}

esp_err_t Buzzer_Turn_On(void)
{
    if (!Buzzer_Is_Initialized)
    {
        ESP_LOGE(TAG, "蜂鸣器模块未初始化");
        return ESP_ERR_INVALID_STATE;
    }

    // 计算占空比: 高电平驱动, 占空比=音量百分比
    uint32_t duty = (uint32_t)(Buzzer_Current_Volume * BUZZER_DUTY_MAX / 100);

    esp_err_t ret = Pwm_Set_Duty(BUZZER_PWM_CHANNEL, duty);

    if (ret == ESP_OK)
    {
        Buzzer_Is_Active_Flag = true;
        ESP_LOGD(TAG, "蜂鸣器开启: 音量=%d%%, 频率=%dHz",
                 Buzzer_Current_Volume, Buzzer_Current_Freq);
    }
    else
    {
        ESP_LOGE(TAG, "蜂鸣器开启失败");
    }

    return ret;
}

esp_err_t Buzzer_Turn_Off(void)
{
    if (!Buzzer_Is_Initialized)
    {
        return ESP_OK;
    }

    esp_err_t ret = Pwm_Set_Duty(BUZZER_PWM_CHANNEL, 0);

    if (ret == ESP_OK)
    {
        Buzzer_Is_Active_Flag = false;
        ESP_LOGD(TAG, "蜂鸣器关闭");
    }

    return ret;
}

esp_err_t Buzzer_Set_Volume(int volume)
{
    // 参数范围校验
    if (volume < 0) volume = 0;
    if (volume > 100) volume = 100;

    Buzzer_Current_Volume = volume;

    // 如果当前正在发声, 实时更新音量
    if (Buzzer_Is_Active_Flag)
    {
        uint32_t duty = (uint32_t)(volume * BUZZER_DUTY_MAX / 100);
        return Pwm_Set_Duty(BUZZER_PWM_CHANNEL, duty);
    }

    return ESP_OK;
}

int Buzzer_Get_Volume(void)
{
    return Buzzer_Current_Volume;
}

esp_err_t Buzzer_Set_Frequency(uint32_t frequencyHz)
{
    // 频率范围校验 (人耳可听范围+安全裕度)
    if (frequencyHz < 100) frequencyHz = 100;
    if (frequencyHz > 20000) frequencyHz = 20000;

    // 调用BSP层更新频率
    esp_err_t ret = Pwm_Set_Frequency(BUZZER_PWM_TIMER, frequencyHz);

    if (ret == ESP_OK)
    {
        Buzzer_Current_Freq = frequencyHz;
        ESP_LOGD(TAG, "频率更新为: %dHz", frequencyHz);
    }
    else
    {
        ESP_LOGE(TAG, "频率设置失败");
    }

    return ret;
}

uint32_t Buzzer_Get_Frequency(void)
{
    return Buzzer_Current_Freq;
}

esp_err_t Buzzer_Config(int volume, uint32_t frequencyHz)
{
    esp_err_t ret1 = Buzzer_Set_Volume(volume);
    esp_err_t ret2 = Buzzer_Set_Frequency(frequencyHz);

    return (ret1 == ESP_OK) ? ret2 : ret1;
}

esp_err_t Buzzer_Play_Alarm(Buzzer_Alarm_Type_t alarmType, int durationMs)
{
    if (!Buzzer_Is_Initialized)
    {
        ESP_LOGE(TAG, "蜂鸣器模块未初始化");
        return ESP_ERR_INVALID_STATE;
    }

    // 检查报警类型有效性
    if (alarmType < 0 || alarmType >= sizeof(Alarm_Configs) / sizeof(Alarm_Configs[0]))
    {
        ESP_LOGE(TAG, "无效的报警类型: %d", alarmType);
        return ESP_ERR_INVALID_ARG;
    }

    const Buzzer_Alarm_Config_t *config = &Alarm_Configs[alarmType];

    ESP_LOGI(TAG, "播放报警音效: 类型=%d, 持续时间=%dms", alarmType, durationMs);

    // 配置报警参数
    Buzzer_Config(config->volumeOn, config->freqOn);

    int totalDuration = 0;
    int repeatIdx = 0;
    bool shouldContinue = true;

    while (shouldContinue)
    {
        // 发声阶段
        Buzzer_Turn_On();
        vTaskDelay(pdMS_TO_TICKS(config->durationOn));
        totalDuration += config->durationOn;

        // 检查是否超时或到达重复次数
        if (durationMs > 0 && totalDuration >= durationMs)
        {
            shouldContinue = false;
        }

        // 静音阶段
        if (shouldContinue && config->durationOff > 0)
        {
            Buzzer_Turn_Off();
            vTaskDelay(pdMS_TO_TICKS(config->durationOff));
            totalDuration += config->durationOff;

            if (durationMs > 0 && totalDuration >= durationMs)
            {
                shouldContinue = false;
            }
        }

        // 更新重复计数
        if (config->repeatCount > 0)
        {
            repeatIdx++;
            if (repeatIdx >= config->repeatCount)
            {
                shouldContinue = false;
            }
        }

        // 如果指定了持续时间且已超时, 停止循环
        if (durationMs > 0 && totalDuration >= durationMs)
        {
            shouldContinue = false;
        }
    }

    // 结束后关闭
    Buzzer_Turn_Off();

    ESP_LOGI(TAG, "报警音效播放结束");

    return ESP_OK;
}

esp_err_t Buzzer_Stop_All(void)
{
    return Buzzer_Turn_Off();
}

bool Buzzer_Is_Active(void)
{
    return Buzzer_Is_Active_Flag;
}