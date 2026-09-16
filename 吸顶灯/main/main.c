#include <stdio.h>
#include <string.h>
#include <sys/time.h>
#include "esp_log.h"
#include "nvs_flash.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "i2c_bus.h"
#include "RTOS_Communicate.h"
#include "ens160.h"
#include "aht2x.h"
#include "MLX90640.h"
#include "SensorFusion.h"
#include "wifi.h"
#include "mqtt.h"
#include "ble_beacon.h"


static char TAG[] = "main";
static i2c_master_bus_handle_t busHandle = NULL;

static void Write_Nvs_Defaults(void)
{
	nvs_handle_t nvsHandle;
	esp_err_t ret = nvs_open("storage", NVS_READWRITE, &nvsHandle);
	if (ret != ESP_OK)
	{
		ESP_LOGE(TAG, "NVS 打开失败, 无法写入默认配置");
		return;
	}

	nvs_set_str(nvsHandle, "wifi_name", "败家之眼");
	nvs_set_str(nvsHandle, "wifi_ssid", "Tgs200410");
	nvs_set_i16(nvsHandle, "Major", 3);
	nvs_set_i16(nvsHandle, "Minor", 4);
	nvs_commit(nvsHandle);
	nvs_close(nvsHandle);
	ESP_LOGI(TAG, "NVS 默认配置已写入 [wifi_name/wifi_ssid, Major=3, Minor=4]");
}


void app_main(void)
{
	esp_err_t nvsRet = nvs_flash_init();
	if (nvsRet == ESP_ERR_NVS_NO_FREE_PAGES || nvsRet == ESP_ERR_NVS_NEW_VERSION_FOUND)
	{
		ESP_ERROR_CHECK(nvs_flash_erase());
		nvsRet = nvs_flash_init();
	}
	ESP_ERROR_CHECK(nvsRet);

	/* 首次烧录时写入默认配置到 NVS, 烧录后注释掉下面这行 */
	// Write_Nvs_Defaults();

	esp_err_t initRet = I2c_Init_Bus(I2C_PORT, I2C_SDA_GPIO, I2C_SCL_GPIO, I2C_FREQ, &busHandle);
	if (initRet != ESP_OK)
	{
		ESP_LOGE(TAG, "I2C 总线初始化失败!");
		return;
	}

	Wifi_Init();
	ESP_LOGI(TAG, "等待 WiFi 连接...");
	while (!Wifi_Is_Connected())
	{
		vTaskDelay(pdMS_TO_TICKS(500));
	}
	ESP_LOGI(TAG, "WiFi 已连接");

	Mqtt_Init();
	ESP_LOGI(TAG, "等待 MQTT 连接...");
	while (!Mqtt_Is_Connected())
	{
		vTaskDelay(pdMS_TO_TICKS(500));
	}
	ESP_LOGI(TAG, "MQTT 已连接");

	/* 初始化 RTOS 通信模块 (数据中枢) */
	ESP_ERROR_CHECK(Comm_Init());

	/* 初始化传感器融合模块 (状态变量/互斥锁) */
	ESP_ERROR_CHECK(SensorFusion_Init(busHandle));

	/* 打印设备MAC地址信息 (用于确认硬件标识) */
	SensorFusion_Print_Mac_Info();

	/* 创建传感器任务, 优先级: MLX90640(5) > ENS160(4) > AHT2x(3) */
	BaseType_t retMlx = xTaskCreatePinnedToCore(MLX90640_Task, "MLX90640_Task", 8192, busHandle, 5, NULL, 0);
	if (retMlx != pdPASS)
	{
		ESP_LOGE(TAG, "❌ MLX90640任务创建失败! (返回值=%d, 堆栈可能不足)", retMlx);
	}
	else
	{
		ESP_LOGI(TAG, "✅ MLX90640任务创建成功");
	}

	BaseType_t retEns = xTaskCreatePinnedToCore(ENS160_Task, "ENS160_Task", 4096, busHandle, 4, NULL, 0);
	if (retEns != pdPASS)
	{
		ESP_LOGE(TAG, "❌ ENS160任务创建失败! (返回值=%d)", retEns);
	}

	BaseType_t retAht = xTaskCreatePinnedToCore(AHT2x_Task, "AHT2x_Task", 4096, busHandle, 3, NULL, 0);
	if (retAht != pdPASS)
	{
		ESP_LOGE(TAG, "❌ AHT2x任务创建失败! (返回值=%d)", retAht);
	}

	/* 创建传感器融合任务 (优先级 2, 低于传感器任务, 确保数据新鲜) */
	xTaskCreatePinnedToCore(SensorFusion_Task, "SensorFusion", 10240, busHandle, 2, NULL, 0);

	/* BLE Beacon 初始化 (纯广播, 不连接) */
	{
		static const BleBeacon_Cfg_t beaconCfg = {
			.uuid = {0},  // UUID 将在运行时基于 MAC 地址自动生成
			.tx_power = (int8_t)0xC5
		};
		esp_err_t bleRet = Ble_Beacon_Init(&beaconCfg);
		if (bleRet != ESP_OK)
		{
			ESP_LOGW(TAG, "BLE Beacon 初始化失败, 继续运行");
		}
	}

	while (1)
	{
		vTaskDelay(pdMS_TO_TICKS(1000));
	}
}