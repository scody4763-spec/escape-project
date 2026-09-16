#include "aht2x.h"
#include "i2c_bus.h"
#include "RTOS_Communicate.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char *TAG = "AHT2x";

static i2c_master_dev_handle_t AHT2x_Dev_Handle = NULL;


/* ============================================================
 *  内部静态函数 (模块内使用, 前缀 aht2x_)
 * ============================================================ */

static esp_err_t aht2x_write_command(uint8_t cmd, uint8_t param1, uint8_t param2)
{
    uint8_t data_buf[2] = {param1, param2};
    return I2c_Write_Bytes(AHT2x_Dev_Handle, cmd, data_buf, 2);
}

static esp_err_t aht2x_read_status_byte(uint8_t *status_byte)
{
    return I2c_Read_Reg(AHT2x_Dev_Handle, AHT2X_CMD_READ_STATUS, status_byte);
}

static esp_err_t aht2x_read_data_bytes(uint8_t *buffer, size_t count)
{
    return I2c_Read_Bytes(AHT2x_Dev_Handle, AHT2X_CMD_READ_STATUS, buffer, count);
}


/* ============================================================
 *  公开 API 函数 (外部使用, 前缀 AHT2x_)
 * ============================================================ */

esp_err_t AHT2x_Init(i2c_master_bus_handle_t busHandle)
{
    ESP_LOGI(TAG, "正在初始化 AHT2x...");

    /* 加入I2C总线 */
    esp_err_t ret = I2c_Add_Device(busHandle, AHT2X_ADDR, AHT2X_I2C_FREQ, &AHT2x_Dev_Handle);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "AHT2x 加入 I2C 总线失败!");
        return ret;
    }

    /* 等待上电稳定 */
    vTaskDelay(pdMS_TO_TICKS(AHT2X_POWERON_DELAY_MS));

    /* 发送初始化命令 */
    ret = aht2x_write_command(AHT2X_CMD_INIT, AHT2X_INIT_PARAM1, AHT2X_INIT_PARAM2);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "AHT2x 初始化命令发送失败!");
        return ret;
    }

    /* 等待初始化完成 */
    vTaskDelay(pdMS_TO_TICKS(AHT2X_RESET_DELAY_MS));

    /* 验证校准状态 */
    AHT2x_Status_t status;
    ret = AHT2x_Read_Status(&status);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "AHT2x 读取状态失败!");
        return ret;
    }

    if (status != AHT2X_STATUS_NORMAL)
    {
        ESP_LOGW(TAG, "AHT2x 校准未完成，请检查传感器!");
    }
    else
    {
        ESP_LOGI(TAG, "AHT2x 校准状态正常");
    }

    ESP_LOGI(TAG, "AHT2x 初始化完成");
    return ESP_OK;
}

esp_err_t AHT2x_Soft_Reset(void)
{
    ESP_LOGI(TAG, "正在软复位 AHT2x...");

    esp_err_t ret = aht2x_write_command(AHT2X_CMD_SOFT_RESET, AHT2X_RESET_PARAM1, AHT2X_RESET_PARAM2);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "AHT2x 软复位失败!");
        return ret;
    }

    /* 等待复位完成 */
    vTaskDelay(pdMS_TO_TICKS(AHT2X_RESET_DELAY_MS));

    /* 重新初始化传感器 */
    ret = aht2x_write_command(AHT2X_CMD_INIT, AHT2X_INIT_PARAM1, AHT2X_INIT_PARAM2);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "AHT2x 复位后重新初始化失败!");
        return ret;
    }

    vTaskDelay(pdMS_TO_TICKS(AHT2X_RESET_DELAY_MS));

    ESP_LOGI(TAG, "AHT2x 软复位完成");
    return ESP_OK;
}

esp_err_t AHT2x_Read_Status(AHT2x_Status_t *status)
{
    if (status == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    uint8_t raw_status = 0;
    esp_err_t ret = aht2x_read_status_byte(&raw_status);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "读取状态字失败!");
        return ret;
    }

    if (raw_status & AHT2X_STATUS_BUSY_BIT)
    {
        *status = AHT2X_STATUS_BUSY;
    }
    else if (!(raw_status & AHT2X_STATUS_CALIBRATED_BIT))
    {
        *status = AHT2X_STATUS_NOT_CALIBRATED;
    }
    else
    {
        *status = AHT2X_STATUS_NORMAL;
    }

    return ESP_OK;
}

esp_err_t AHT2x_Read_Data(AHT2x_Data_t *data)
{
    if (data == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    /* 触发测量 */
    esp_err_t ret = aht2x_write_command(AHT2X_CMD_TRIGGER, AHT2X_TRIGGER_PARAM1, AHT2X_TRIGGER_PARAM2);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "触发测量失败!");
        return ret;
    }

    /* 等待测量完成 (≥75ms) */
    vTaskDelay(pdMS_TO_TICKS(AHT2X_MEASURE_DELAY_MS));

    /* 读取6字节数据 (状态字 + 湿度3字节 + 温度3字节) */
    uint8_t data_buf[6] = {0};
    ret = aht2x_read_data_bytes(data_buf, 6);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "读取温湿度数据失败!");
        return ret;
    }

    /* 检查忙标志 Bit[7] */
    if (data_buf[0] & AHT2X_STATUS_BUSY_BIT)
    {
        ESP_LOGE(TAG, "传感器忙, 数据无效!");
        return ESP_ERR_INVALID_STATE;
    }

    /* 拼接20位湿度原始值 S_RH */
    uint32_t s_rh = ((uint32_t)data_buf[1] << 12)
                  | ((uint32_t)data_buf[2] << 4)
                  | (data_buf[3] >> 4);

    /* 拼接20位温度原始值 S_T */
    uint32_t s_t = ((uint32_t)(data_buf[3] & 0x0F) << 16)
                 | ((uint32_t)data_buf[4] << 8)
                 | data_buf[5];

    /* 转换为物理值 */
    data->humidity    = ((float)s_rh / AHT2X_DATA_RESOLUTION) * AHT2X_HUMI_SCALE;
    data->temperature = ((float)s_t / AHT2X_DATA_RESOLUTION) * AHT2X_TEMP_SCALE + AHT2X_TEMP_OFFSET;

    return ESP_OK;
}


/**
 * @brief AHT2x 任务函数, 用于读取温湿度数据
 * 
 * @param pvParameters 任务参数
 */
void AHT2x_Task(void *pvParameters)
{
	esp_err_t ret;
	i2c_master_bus_handle_t busHandle = (i2c_master_bus_handle_t)pvParameters;
	AHT2x_Data_t aht2xData;
	ESP_LOGI(TAG, "--- 初始化 AHT2x ---");
	ret = AHT2x_Init(busHandle);
	if (ret != ESP_OK)
	{
		ESP_LOGE(TAG, "AHT2x 初始化失败! err=0x%X", ret);
		vTaskDelete(NULL);
		return;
	}

	while(1)
	{
		ret = AHT2x_Read_Data(&aht2xData);
		if (ret != ESP_OK)
		{
			ESP_LOGE(TAG, "AHT2x 读取数据失败! err=0x%X", ret);
			vTaskDelay(pdMS_TO_TICKS(1000));
			continue;
		}
		ESP_LOGI(TAG, "AHT2x DATA:  Temperature=%.2f°C, Humidity=%.2f%%RH",
				aht2xData.temperature, aht2xData.humidity);

		/*
		 * 发布温湿度数据到 RTOS_Communicate 共享模块:
		 *   - ENS160_Task 读取 → 用于气体传感器校准
		 *   - SensorFusion_Task 读取 → 用于火灾融合判断
		 */
		Comm_AHT2x_Data_t commData;
		commData.temperature = aht2xData.temperature;
		commData.humidity    = aht2xData.humidity;
		commData.valid       = true;
		Comm_Put_AHT2x_Data(&commData);

		vTaskDelay(pdMS_TO_TICKS(2000));
	}

	vTaskDelete(NULL);
}