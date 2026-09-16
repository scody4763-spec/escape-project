#include "ble_beacon.h"
#include <string.h>
#include "esp_log.h"
#include "esp_mac.h"
#include "nvs_flash.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "nimble/nimble_port.h"
#include "nimble/nimble_port_freertos.h"
#include "host/ble_hs.h"
#include "host/ble_gap.h"

static const char *TAG = "BLE_BEACON";

static BleBeacon_Cfg_t BleBeacon_Config;
static uint8_t BleBeacon_AdvData[BLE_BEACON_ADV_DATA_LEN];
static bool BleBeacon_IsInit = false;
static bool BleBeacon_IsRunning = false;

static void Ble_Beacon_On_Sync(void);
static void Ble_Beacon_On_Reset(int reason);
static int  Ble_Beacon_Gap_Event(struct ble_gap_event *event, void *arg);
static esp_err_t Ble_Beacon_Read_Nvs(int16_t *major, int16_t *minor);
static void Ble_Beacon_Generate_Uuid_From_Mac(uint8_t *uuid_buf, size_t uuid_len);

static void Ble_Beacon_Host_Task(void *param)
{
    (void)param;
    nimble_port_run();
}

esp_err_t Ble_Beacon_Init(const BleBeacon_Cfg_t *cfg)
{
    esp_err_t ret = ESP_OK;

    if (cfg == NULL)
    {
        ESP_LOGE(TAG, "配置参数为空");
        return ESP_ERR_INVALID_ARG;
    }

    memcpy(&BleBeacon_Config, cfg, sizeof(BleBeacon_Cfg_t));

    ret = nimble_port_init();
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "NimBLE 主机初始化失败 (ret=%d)", ret);
        return ret;
    }

    ble_hs_cfg.sync_cb = Ble_Beacon_On_Sync;
    ble_hs_cfg.reset_cb = Ble_Beacon_On_Reset;

    nimble_port_freertos_init(Ble_Beacon_Host_Task);

    BleBeacon_IsInit = true;
    ESP_LOGI(TAG, "BLE Beacon 初始化完成");
    return ESP_OK;
}

static void Ble_Beacon_Generate_Uuid_From_Mac(uint8_t *uuid_buf, size_t uuid_len)
{
    if (uuid_buf == NULL || uuid_len < BLE_BEACON_UUID_LEN)
    {
        return;
    }

    uint8_t mac_buf[6] = {0};
    esp_err_t ret = esp_read_mac(mac_buf, ESP_MAC_WIFI_STA);
    if (ret != ESP_OK)
    {
        ret = esp_efuse_mac_get_default(mac_buf);
        if (ret != ESP_OK)
        {
            memset(uuid_buf, 0, uuid_len);
            return;
        }
    }

    memset(uuid_buf, 0, uuid_len);

    uuid_buf[0]  = 0xE0;
    uuid_buf[1]  = 0xC5;
    uuid_buf[2]  = 0xE6;
    uuid_buf[3]  = mac_buf[0];
    uuid_buf[4]  = mac_buf[1];
    uuid_buf[5]  = mac_buf[2];
    uuid_buf[6]  = mac_buf[3];
    uuid_buf[7]  = mac_buf[4];
    uuid_buf[8]  = mac_buf[5];
    uuid_buf[9]  = 0x12;
    uuid_buf[10] = 0x34;
    uuid_buf[11] = 0x56;
    uuid_buf[12] = 0x78;
    uuid_buf[13] = 0x9A;
    uuid_buf[14] = 0xBC;
    uuid_buf[15] = 0xDE;
}

esp_err_t Ble_Beacon_Start(void)
{
    if (!BleBeacon_IsInit)
    {
        ESP_LOGE(TAG, "BLE Beacon 未初始化, 请先调用 Ble_Beacon_Init()");
        return ESP_ERR_INVALID_STATE;
    }
    return ESP_OK;
}

esp_err_t Ble_Beacon_Stop(void)
{
    int ret;

    if (!BleBeacon_IsInit)
    {
        return ESP_ERR_INVALID_STATE;
    }

    ret = ble_gap_adv_stop();
    if (ret != 0)
    {
        ESP_LOGE(TAG, "停止广播失败 (ret=%d)", ret);
        return ESP_FAIL;
    }

    BleBeacon_IsRunning = false;
    ESP_LOGI(TAG, "BLE Beacon 广播已停止");
    return ESP_OK;
}

esp_err_t Ble_Beacon_Write_Nvs(int16_t major, int16_t minor)
{
    nvs_handle_t nvsHandle;
    esp_err_t ret;

    ret = nvs_open("storage", NVS_READWRITE, &nvsHandle);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "NVS 打开失败 (ret=%d)", ret);
        return ret;
    }

    ret = nvs_set_i16(nvsHandle, "Major", major);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "NVS 写入 Major 失败 (ret=%d)", ret);
        nvs_close(nvsHandle);
        return ret;
    }

    ret = nvs_set_i16(nvsHandle, "Minor", minor);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "NVS 写入 Minor 失败 (ret=%d)", ret);
        nvs_close(nvsHandle);
        return ret;
    }

    ret = nvs_commit(nvsHandle);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "NVS 提交失败 (ret=%d)", ret);
    }

    nvs_close(nvsHandle);
    ESP_LOGI(TAG, "NVS 写入成功 [Major=%d, Minor=%d]", major, minor);
    return ret;
}

static void Ble_Beacon_On_Sync(void)
{
    int16_t major = 0;
    int16_t minor = 0;
    uint8_t ownAddrType;
    int rc;

    Ble_Beacon_Read_Nvs(&major, &minor);

    uint8_t mac_based_uuid[BLE_BEACON_UUID_LEN];
    Ble_Beacon_Generate_Uuid_From_Mac(mac_based_uuid, sizeof(mac_based_uuid));

    BleBeacon_AdvData[0] = 0x02;
    BleBeacon_AdvData[1] = 0x01;
    BleBeacon_AdvData[2] = 0x06;

    BleBeacon_AdvData[3] = 0x1A;
    BleBeacon_AdvData[4] = 0xFF;
    BleBeacon_AdvData[5] = 0x4C;
    BleBeacon_AdvData[6] = 0x00;
    BleBeacon_AdvData[7] = 0x02;
    BleBeacon_AdvData[8] = 0x15;

    memcpy(&BleBeacon_AdvData[9], mac_based_uuid, BLE_BEACON_UUID_LEN);

    BleBeacon_AdvData[25] = (uint8_t)((major >> 8) & 0xFF);
    BleBeacon_AdvData[26] = (uint8_t)(major & 0xFF);

    BleBeacon_AdvData[27] = (uint8_t)((minor >> 8) & 0xFF);
    BleBeacon_AdvData[28] = (uint8_t)(minor & 0xFF);

    BleBeacon_AdvData[29] = (uint8_t)BleBeacon_Config.tx_power;

    rc = ble_gap_adv_set_data(BleBeacon_AdvData, sizeof(BleBeacon_AdvData));
    if (rc != 0)
    {
        return;
    }

    rc = ble_hs_id_infer_auto(0, &ownAddrType);
    if (rc != 0)
    {
        return;
    }

    struct ble_gap_adv_params advParams = {
        .conn_mode = BLE_GAP_CONN_MODE_NON,
        .disc_mode = BLE_GAP_DISC_MODE_GEN,
        .itvl_min  = (BLE_BEACON_ADV_INTERVAL_MS * 1000) / 625,
        .itvl_max  = (BLE_BEACON_ADV_INTERVAL_MS * 1000) / 625,
    };

    rc = ble_gap_adv_start(ownAddrType, NULL, BLE_HS_FOREVER,
                           &advParams, Ble_Beacon_Gap_Event, NULL);
    if (rc != 0)
    {
        return;
    }

    BleBeacon_IsRunning = true;
    ESP_LOGI(TAG, "iBeacon广播成功 [Major=%dF, Minor=Node%d, Interval=%dms]", major, minor, BLE_BEACON_ADV_INTERVAL_MS);
}

static void Ble_Beacon_On_Reset(int reason)
{
    ESP_LOGW(TAG, "NimBLE 主机重置 (reason=%d), 将重新同步", reason);
    BleBeacon_IsRunning = false;
}

static int Ble_Beacon_Gap_Event(struct ble_gap_event *event, void *arg)
{
    (void)event;
    (void)arg;
    return 0;
}

static esp_err_t Ble_Beacon_Read_Nvs(int16_t *major, int16_t *minor)
{
    nvs_handle_t nvsHandle;
    esp_err_t ret;

    ret = nvs_open("storage", NVS_READONLY, &nvsHandle);
    if (ret != ESP_OK)
    {
        return ret;
    }

    ret = nvs_get_i16(nvsHandle, "Major", major);
    if (ret != ESP_OK)
    {
        nvs_close(nvsHandle);
        return ret;
    }

    ret = nvs_get_i16(nvsHandle, "Minor", minor);
    nvs_close(nvsHandle);
    return ret;
}