#include "wifi.h"
#include "esp_log.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_netif.h"
#include "nvs_flash.h"
#include "nvs.h"
#include "freertos/FreeRTOS.h"
#include "freertos/event_groups.h"
#include "freertos/task.h"
#include <string.h>

static const char *TAG = "WIFI";

static EventGroupHandle_t Wifi_Event_Group = NULL;
static int                Wifi_Retry_Count = 0;
static bool               Wifi_Connected   = false;

#define WIFI_CONNECTED_BIT  BIT0

static void Wifi_Event_Handler(void *arg, esp_event_base_t event_base,
                                int32_t event_id, void *event_data)
{
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START)
    {
        esp_wifi_connect();
    }
    else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED)
    {
        if (Wifi_Retry_Count < WIFI_MAX_RETRY_COUNT)
        {
            ESP_LOGW(TAG, "WiFi disconnected, retry %d/%d",
                     Wifi_Retry_Count + 1, WIFI_MAX_RETRY_COUNT);
            vTaskDelay(pdMS_TO_TICKS(2000));
            esp_wifi_connect();
            Wifi_Retry_Count++;
        }
        else
        {
            ESP_LOGE(TAG, "WiFi max retry reached, giving up");
        }
        Wifi_Connected = false;
    }
    else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP)
    {
        ip_event_got_ip_t *event = (ip_event_got_ip_t *)event_data;
        Wifi_Retry_Count = 0;
        Wifi_Connected = true;
        ESP_LOGI(TAG, "WiFi connected, IP: " IPSTR, IP2STR(&event->ip_info.ip));
        if (Wifi_Event_Group)
        {
            xEventGroupSetBits(Wifi_Event_Group, WIFI_CONNECTED_BIT);
        }
    }
}

void Wifi_Init(void)
{
    char wifiSsid[33] = {0};
    char wifiPassword[65] = {0};
    nvs_handle_t nvsHandle;
    esp_err_t nvsRet;

    ESP_LOGI(TAG, "Initializing WiFi...");

    Wifi_Event_Group = xEventGroupCreate();

    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    ESP_ERROR_CHECK(esp_event_handler_instance_register(WIFI_EVENT, ESP_EVENT_ANY_ID,
                                                        &Wifi_Event_Handler, NULL, NULL));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(IP_EVENT, IP_EVENT_STA_GOT_IP,
                                                        &Wifi_Event_Handler, NULL, NULL));

    nvsRet = nvs_open("storage", NVS_READONLY, &nvsHandle);
    if (nvsRet == ESP_OK)
    {
        size_t len = sizeof(wifiSsid);
        nvs_get_str(nvsHandle, "wifi_name", wifiSsid, &len);
        len = sizeof(wifiPassword);
        nvs_get_str(nvsHandle, "wifi_ssid", wifiPassword, &len);
        nvs_close(nvsHandle);
    }

    if (strlen(wifiSsid) == 0)
    {
        strncpy(wifiSsid, WIFI_SSID, sizeof(wifiSsid) - 1);
        ESP_LOGW(TAG, "NVS 无 WiFi 名称, 使用默认值: %s", WIFI_SSID);
    }
    if (strlen(wifiPassword) == 0)
    {
        strncpy(wifiPassword, WIFI_PASSWORD, sizeof(wifiPassword) - 1);
    }

    wifi_config_t wifi_config = {
        .sta = {
            .threshold.authmode = WIFI_AUTH_WPA2_PSK,
        },
    };
    strncpy((char *)wifi_config.sta.ssid, wifiSsid, sizeof(wifi_config.sta.ssid) - 1);
    strncpy((char *)wifi_config.sta.password, wifiPassword, sizeof(wifi_config.sta.password) - 1);

    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());

    ESP_LOGI(TAG, "Connecting to WiFi SSID: %s ...", wifiSsid);

    EventBits_t bits = xEventGroupWaitBits(Wifi_Event_Group,
                                           WIFI_CONNECTED_BIT,
                                           pdFALSE, pdFALSE,
                                           pdMS_TO_TICKS(30000));
    if (bits & WIFI_CONNECTED_BIT)
    {
        ESP_LOGI(TAG, "WiFi connected successfully");
        esp_wifi_set_ps(WIFI_PS_MIN_MODEM);
    }
    else
    {
        ESP_LOGE(TAG, "WiFi connection timeout");
    }
}

bool Wifi_Is_Connected(void)
{
    return Wifi_Connected;
}

int Wifi_Get_Rssi(void)
{
    wifi_ap_record_t ap_info;
    if (esp_wifi_sta_get_ap_info(&ap_info) == ESP_OK)
    {
        return ap_info.rssi;
    }
    return 0;
}