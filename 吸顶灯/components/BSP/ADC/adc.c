#include "adc.h"
#include "esp_log.h"
#include "esp_adc/adc_cali.h"
#include "esp_adc/adc_cali_scheme.h"

static const char *TAG = "ADC";

// ADC oneshot单元句柄
static adc_oneshot_unit_handle_t Adc_Handle = NULL;

// ADC校准句柄
static adc_cali_handle_t Adc_Cali_Handle = NULL;

// 初始化状态标记
static bool Adc_Init_Flag = false;

/**
 * @brief 配置ADC校准 (内部辅助函数)
 *
 * ESP32仅支持线性拟合(Line Fitting)校准方案,
 * 优先使用eFuse中烧录的校准值, 若eFuse未烧录则使用默认参考电压。
 */
static esp_err_t Adc_Configure_Calibration(void)
{
    adc_cali_line_fitting_config_t caliConfig = {
        .unit_id      = ADC_UNIT,
        .atten        = ADC_ATTEN,
        .bitwidth     = ADC_BITWIDTH,
        .default_vref = ADC_REF_VOLTAGE_MV,
    };

    esp_err_t ret = adc_cali_create_scheme_line_fitting(&caliConfig, &Adc_Cali_Handle);
    if (ret == ESP_OK)
    {
        ESP_LOGI(TAG, "ADC校准方案: 线性拟合");
    }
    else
    {
        ESP_LOGW(TAG, "ADC校准方案创建失败 (eFuse可能未烧录), 将使用原始值线性估算");
    }

    return ret;
}

esp_err_t Adc_Init(void)
{
    if (Adc_Init_Flag)
    {
        ESP_LOGW(TAG, "ADC已初始化, 跳过重复初始化");
        return ESP_OK;
    }

    // 配置ADC oneshot单元
    adc_oneshot_unit_init_cfg_t unitConfig = {
        .unit_id = ADC_UNIT,
        .clk_src = ADC_DIGI_CLK_SRC_DEFAULT,
        .ulp_mode = ADC_ULP_MODE_DISABLE,
    };

    esp_err_t ret = adc_oneshot_new_unit(&unitConfig, &Adc_Handle);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "ADC单元初始化失败: %s", esp_err_to_name(ret));
        return ret;
    }

    // 配置ADC通道
    adc_oneshot_chan_cfg_t chanConfig = {
        .atten    = ADC_ATTEN,
        .bitwidth = ADC_BITWIDTH,
    };

    ret = adc_oneshot_config_channel(Adc_Handle, ADC_CHANNEL, &chanConfig);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "ADC通道配置失败: %s", esp_err_to_name(ret));
        adc_oneshot_del_unit(Adc_Handle);
        Adc_Handle = NULL;
        return ret;
    }

    // 配置校准方案
    Adc_Configure_Calibration();

    Adc_Init_Flag = true;
    ESP_LOGI(TAG, "ADC初始化成功: ADC1_CH%d (GPIO36/SENSOR_VP), %d位, 衰减%d dB",
             ADC_CHANNEL, ADC_BITWIDTH, ADC_ATTEN);

    return ESP_OK;
}

esp_err_t Adc_Read_Raw(int *rawValue)
{
    if (!Adc_Init_Flag)
    {
        ESP_LOGE(TAG, "ADC未初始化, 请先调用 Adc_Init()");
        return ESP_ERR_INVALID_STATE;
    }

    if (rawValue == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    int adcRaw = 0;
    esp_err_t ret = adc_oneshot_read(Adc_Handle, ADC_CHANNEL, &adcRaw);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "ADC读取失败: %s", esp_err_to_name(ret));
        return ret;
    }

    *rawValue = adcRaw;
    return ESP_OK;
}

esp_err_t Adc_Read_Pin_Voltage(int *voltageMv)
{
    if (!Adc_Init_Flag)
    {
        ESP_LOGE(TAG, "ADC未初始化, 请先调用 Adc_Init()");
        return ESP_ERR_INVALID_STATE;
    }

    if (voltageMv == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    int adcRaw = 0;
    esp_err_t ret = Adc_Read_Raw(&adcRaw);
    if (ret != ESP_OK)
    {
        return ret;
    }

    int voltage = 0;
    if (Adc_Cali_Handle != NULL)
    {
        ret = adc_cali_raw_to_voltage(Adc_Cali_Handle, adcRaw, &voltage);
        if (ret != ESP_OK)
        {
            ESP_LOGW(TAG, "校准转换失败, 使用线性估算");
            voltage = (adcRaw * ADC_REF_VOLTAGE_MV) / ((1 << ADC_BITWIDTH) - 1);
        }
    }
    else
    {
        voltage = (adcRaw * ADC_REF_VOLTAGE_MV) / ((1 << ADC_BITWIDTH) - 1);
    }

    *voltageMv = voltage;
    return ESP_OK;
}

esp_err_t Adc_Read_Vbus_Voltage(int *voltageMv)
{
    if (!Adc_Init_Flag)
    {
        ESP_LOGE(TAG, "ADC未初始化, 请先调用 Adc_Init()");
        return ESP_ERR_INVALID_STATE;
    }

    if (voltageMv == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    int pinVoltage = 0;
    esp_err_t ret = Adc_Read_Pin_Voltage(&pinVoltage);
    if (ret != ESP_OK)
    {
        return ret;
    }

    *voltageMv = (int)(pinVoltage * ADC_DIVIDER_RATIO);
    return ESP_OK;
}

esp_err_t Adc_Deinit(void)
{
    if (!Adc_Init_Flag)
    {
        ESP_LOGW(TAG, "ADC未初始化或已反初始化");
        return ESP_OK;
    }

    // 释放校准资源
    if (Adc_Cali_Handle != NULL)
    {
        adc_cali_delete_scheme_line_fitting(Adc_Cali_Handle);
        Adc_Cali_Handle = NULL;
        ESP_LOGI(TAG, "ADC校准资源已释放");
    }

    // 释放ADC单元资源
    if (Adc_Handle != NULL)
    {
        esp_err_t ret = adc_oneshot_del_unit(Adc_Handle);
        if (ret != ESP_OK)
        {
            ESP_LOGE(TAG, "ADC单元释放失败: %s", esp_err_to_name(ret));
            return ret;
        }
        Adc_Handle = NULL;
    }

    Adc_Init_Flag = false;
    ESP_LOGI(TAG, "ADC已反初始化");

    return ESP_OK;
}