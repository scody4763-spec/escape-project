#include "gpio.h"
#include "esp_log.h"

static const char *TAG = "GPIO";

// 引脚初始化状态追踪 (位掩码, 支持GPIO 0~39)
static uint64_t Gpio_Init_Mask = 0ULL;

// 引脚方向追踪
static Gpio_Dir_t Gpio_Dir_Track[40] = {0};

// 全局ISR安装标记
static bool Gpio_Isr_Installed = false;

// 引脚有效性检查
static inline bool Gpio_Is_Valid_Pin(gpio_num_t pin)
{
    return (pin >= GPIO_NUM_0 && pin < GPIO_NUM_MAX);
}

// 标记引脚已初始化
static inline void Gpio_Mark_Initialized(gpio_num_t pin, Gpio_Dir_t dir)
{
    Gpio_Init_Mask |= (1ULL << pin);
    Gpio_Dir_Track[pin] = dir;
}

// 标记引脚已反初始化
static inline void Gpio_Mark_Deinitialized(gpio_num_t pin)
{
    Gpio_Init_Mask &= ~(1ULL << pin);
    Gpio_Dir_Track[pin] = 0;
}

// 检查引脚是否已初始化
static inline bool Gpio_Is_Initialized(gpio_num_t pin)
{
    return (Gpio_Init_Mask & (1ULL << pin)) != 0;
}

// 将内部Pull枚举转换为ESP-IDF的上下拉参数
static inline void Gpio_Convert_Pull(Gpio_Pull_t pull, uint32_t *pullUp, uint32_t *pullDown)
{
    *pullUp   = ((pull == GPIO_PULL_UP) || (pull == GPIO_PULL_UP_DOWN)) ? 1 : 0;
    *pullDown = ((pull == GPIO_PULL_DOWN) || (pull == GPIO_PULL_UP_DOWN)) ? 1 : 0;
}

esp_err_t Gpio_Init_Output(gpio_num_t pin, uint32_t initialLevel)
{
    if (!Gpio_Is_Valid_Pin(pin))
    {
        ESP_LOGE(TAG, "无效的引脚号: %d", pin);
        return ESP_ERR_INVALID_ARG;
    }

    if (Gpio_Is_Initialized(pin))
    {
        ESP_LOGW(TAG, "GPIO %d 已初始化, 先反初始化", pin);
        Gpio_Deinit(pin);
    }

    gpio_config_t ioConf = {
        .pin_bit_mask = (1ULL << pin),
        .mode         = GPIO_MODE_OUTPUT,
        .pull_up_en   = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type    = GPIO_INTR_DISABLE,
    };

    esp_err_t ret = gpio_config(&ioConf);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "GPIO %d 输出模式配置失败", pin);
        return ret;
    }

    ret = gpio_set_level(pin, initialLevel);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "GPIO %d 设置初始电平失败", pin);
        return ret;
    }

    Gpio_Mark_Initialized(pin, GPIO_DIR_OUT);
    ESP_LOGI(TAG, "GPIO %d 初始化为输出模式, 初始电平=%d", pin, initialLevel);

    return ESP_OK;
}

esp_err_t Gpio_Init_Input(gpio_num_t pin, Gpio_Pull_t pull)
{
    if (!Gpio_Is_Valid_Pin(pin))
    {
        ESP_LOGE(TAG, "无效的引脚号: %d", pin);
        return ESP_ERR_INVALID_ARG;
    }

    if (Gpio_Is_Initialized(pin))
    {
        ESP_LOGW(TAG, "GPIO %d 已初始化, 先反初始化", pin);
        Gpio_Deinit(pin);
    }

    uint32_t pullUp = 0;
    uint32_t pullDown = 0;
    Gpio_Convert_Pull(pull, &pullUp, &pullDown);

    gpio_config_t ioConf = {
        .pin_bit_mask = (1ULL << pin),
        .mode         = GPIO_MODE_INPUT,
        .pull_up_en   = pullUp,
        .pull_down_en = pullDown,
        .intr_type    = GPIO_INTR_DISABLE,
    };

    esp_err_t ret = gpio_config(&ioConf);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "GPIO %d 输入模式配置失败", pin);
        return ret;
    }

    Gpio_Mark_Initialized(pin, GPIO_DIR_IN);
    ESP_LOGI(TAG, "GPIO %d 初始化为输入模式 (pull=%d)", pin, pull);

    return ESP_OK;
}

esp_err_t Gpio_Init_Interrupt(gpio_num_t pin, Gpio_Intr_t intrType, Gpio_Pull_t pull)
{
    if (!Gpio_Is_Valid_Pin(pin))
    {
        ESP_LOGE(TAG, "无效的引脚号: %d", pin);
        return ESP_ERR_INVALID_ARG;
    }

    if (intrType == GPIO_INTR_NONE)
    {
        ESP_LOGW(TAG, "中断类型为NONE, 自动降级为普通输入模式");
        return Gpio_Init_Input(pin, pull);
    }

    if (Gpio_Is_Initialized(pin))
    {
        ESP_LOGW(TAG, "GPIO %d 已初始化, 先反初始化", pin);
        Gpio_Deinit(pin);
    }

    uint32_t pullUp = 0;
    uint32_t pullDown = 0;
    Gpio_Convert_Pull(pull, &pullUp, &pullDown);

    gpio_config_t ioConf = {
        .pin_bit_mask = (1ULL << pin),
        .mode         = GPIO_MODE_INPUT,
        .pull_up_en   = pullUp,
        .pull_down_en = pullDown,
        .intr_type    = intrType,
    };

    esp_err_t ret = gpio_config(&ioConf);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "GPIO %d 中断模式配置失败", pin);
        return ret;
    }

    Gpio_Mark_Initialized(pin, GPIO_DIR_IN);
    ESP_LOGI(TAG, "GPIO %d 初始化为中断输入模式 (触发=%d, pull=%d)",
             pin, intrType, pull);

    return ESP_OK;
}

esp_err_t Gpio_Set_Level(gpio_num_t pin, uint32_t level)
{
    if (!Gpio_Is_Initialized(pin))
    {
        ESP_LOGE(TAG, "GPIO %d 未初始化, 无法设置电平", pin);
        return ESP_ERR_INVALID_STATE;
    }

    if (Gpio_Dir_Track[pin] == GPIO_DIR_IN)
    {
        ESP_LOGE(TAG, "GPIO %d 为输入模式, 无法设置电平", pin);
        return ESP_ERR_INVALID_STATE;
    }

    return gpio_set_level(pin, level);
}

int Gpio_Get_Level(gpio_num_t pin)
{
    if (!Gpio_Is_Initialized(pin))
    {
        ESP_LOGE(TAG, "GPIO %d 未初始化, 读取电平返回-1", pin);
        return -1;
    }

    return gpio_get_level(pin);
}

esp_err_t Gpio_Toggle(gpio_num_t pin)
{
    if (!Gpio_Is_Initialized(pin))
    {
        ESP_LOGE(TAG, "GPIO %d 未初始化, 无法翻转电平", pin);
        return ESP_ERR_INVALID_STATE;
    }

    if (Gpio_Dir_Track[pin] == GPIO_DIR_IN)
    {
        ESP_LOGE(TAG, "GPIO %d 为输入模式, 无法翻转电平", pin);
        return ESP_ERR_INVALID_STATE;
    }

    int currentLevel = gpio_get_level(pin);
    return gpio_set_level(pin, !currentLevel);
}

esp_err_t Gpio_Install_Isr(void)
{
    if (Gpio_Isr_Installed)
    {
        ESP_LOGW(TAG, "全局ISR服务已安装");
        return ESP_OK;
    }

    esp_err_t ret = gpio_install_isr_service(0);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "全局ISR服务安装失败: %s", esp_err_to_name(ret));
        return ret;
    }

    Gpio_Isr_Installed = true;
    ESP_LOGI(TAG, "全局ISR服务安装成功");

    return ESP_OK;
}

esp_err_t Gpio_Isr_Add(gpio_num_t pin, gpio_isr_t isrHandler, void *args)
{
    if (!Gpio_Isr_Installed)
    {
        ESP_LOGE(TAG, "全局ISR服务未安装, 请先调用 Gpio_Install_Isr()");
        return ESP_ERR_INVALID_STATE;
    }

    if (!Gpio_Is_Initialized(pin))
    {
        ESP_LOGE(TAG, "GPIO %d 未初始化, 无法注册中断", pin);
        return ESP_ERR_INVALID_STATE;
    }

    if (isrHandler == NULL)
    {
        ESP_LOGE(TAG, "中断回调函数为空");
        return ESP_ERR_INVALID_ARG;
    }

    esp_err_t ret = gpio_isr_handler_add(pin, isrHandler, args);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "GPIO %d 中断注册失败", pin);
        return ret;
    }

    ESP_LOGI(TAG, "GPIO %d 中断回调注册成功", pin);
    return ESP_OK;
}

esp_err_t Gpio_Isr_Remove(gpio_num_t pin)
{
    if (!Gpio_Is_Initialized(pin))
    {
        ESP_LOGW(TAG, "GPIO %d 未初始化, 无需移除中断", pin);
        return ESP_OK;
    }

    esp_err_t ret = gpio_isr_handler_remove(pin);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "GPIO %d 中断移除失败", pin);
        return ret;
    }

    ESP_LOGI(TAG, "GPIO %d 中断回调已移除", pin);
    return ESP_OK;
}

esp_err_t Gpio_Deinit(gpio_num_t pin)
{
    if (!Gpio_Is_Valid_Pin(pin))
    {
        ESP_LOGE(TAG, "无效的引脚号: %d", pin);
        return ESP_ERR_INVALID_ARG;
    }

    if (!Gpio_Is_Initialized(pin))
    {
        ESP_LOGW(TAG, "GPIO %d 未初始化, 无需反初始化", pin);
        return ESP_OK;
    }

    // 先移除中断回调 (如果存在)
    if (Gpio_Isr_Installed)
    {
        gpio_isr_handler_remove(pin);
    }

    // 复位引脚为默认状态
    esp_err_t ret = gpio_reset_pin(pin);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "GPIO %d 复位失败: %s", pin, esp_err_to_name(ret));
        return ret;
    }

    Gpio_Mark_Deinitialized(pin);
    ESP_LOGI(TAG, "GPIO %d 已反初始化", pin);

    return ESP_OK;
}