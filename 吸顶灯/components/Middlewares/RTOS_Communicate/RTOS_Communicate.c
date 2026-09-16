#include "RTOS_Communicate.h"
#include "esp_log.h"
#include <string.h>
#include "freertos/semphr.h"

static const char *TAG = "Comm";

/* ============================================================
 *  模块内部静态变量
 * ============================================================ */

/* 互斥锁 (保护共享数据区) */
static SemaphoreHandle_t Comm_Mutex = NULL;

/* 事件组 (通知数据就绪) */
static EventGroupHandle_t Comm_Event_Group = NULL;

/* 共享数据区 */
static Comm_AHT2x_Data_t    Comm_Shared_AHT;
static Comm_ENS160_Data_t   Comm_Shared_ENS;
static Comm_MLX90640_Data_t Comm_Shared_MLX;

/* 数据有效性标志 */
static bool Comm_AHT_Valid = false;
static bool Comm_ENS_Valid = false;
static bool Comm_MLX_Valid = false;


/* ============================================================
 *  公开 API 实现
 * ============================================================ */

esp_err_t Comm_Init(void)
{
    if (Comm_Mutex != NULL)
    {
        ESP_LOGW(TAG, "通信模块已初始化, 跳过重复初始化");
        return ESP_OK;
    }

    Comm_Mutex = xSemaphoreCreateMutex();
    if (Comm_Mutex == NULL)
    {
        ESP_LOGE(TAG, "创建互斥锁失败");
        return ESP_ERR_NO_MEM;
    }

    Comm_Event_Group = xEventGroupCreate();
    if (Comm_Event_Group == NULL)
    {
        ESP_LOGE(TAG, "创建事件组失败");
        vSemaphoreDelete(Comm_Mutex);
        Comm_Mutex = NULL;
        return ESP_ERR_NO_MEM;
    }

    memset(&Comm_Shared_AHT, 0, sizeof(Comm_Shared_AHT));
    memset(&Comm_Shared_ENS, 0, sizeof(Comm_Shared_ENS));
    memset(&Comm_Shared_MLX, 0, sizeof(Comm_Shared_MLX));
    Comm_AHT_Valid = false;
    Comm_ENS_Valid = false;
    Comm_MLX_Valid = false;

    ESP_LOGI(TAG, "RTOS 通信模块初始化完成");
    return ESP_OK;
}

/* ============================================================
 *  AHT2x 数据读写
 * ============================================================ */

esp_err_t Comm_Put_AHT2x_Data(const Comm_AHT2x_Data_t *data)
{
    if (data == NULL) return ESP_ERR_INVALID_ARG;
    if (Comm_Mutex == NULL) return ESP_ERR_INVALID_STATE;

    if (xSemaphoreTake(Comm_Mutex, pdMS_TO_TICKS(100)) != pdTRUE)
    {
        ESP_LOGE(TAG, "获取互斥锁超时 (Put AHT2x)");
        return ESP_ERR_TIMEOUT;
    }

    memcpy(&Comm_Shared_AHT, data, sizeof(Comm_AHT2x_Data_t));
    Comm_AHT_Valid = true;

    xSemaphoreGive(Comm_Mutex);

    xEventGroupSetBits(Comm_Event_Group, COMM_EVENT_AHT2X_READY);
    return ESP_OK;
}

esp_err_t Comm_Get_AHT2x_Data(Comm_AHT2x_Data_t *data)
{
    if (data == NULL) return ESP_ERR_INVALID_ARG;
    if (Comm_Mutex == NULL) return ESP_ERR_INVALID_STATE;

    if (xSemaphoreTake(Comm_Mutex, pdMS_TO_TICKS(100)) != pdTRUE)
    {
        ESP_LOGE(TAG, "获取互斥锁超时 (Get AHT2x)");
        return ESP_ERR_TIMEOUT;
    }

    if (!Comm_AHT_Valid)
    {
        xSemaphoreGive(Comm_Mutex);
        return ESP_ERR_NOT_FOUND;
    }

    memcpy(data, &Comm_Shared_AHT, sizeof(Comm_AHT2x_Data_t));

    xSemaphoreGive(Comm_Mutex);
    return ESP_OK;
}

/* ============================================================
 *  ENS160 数据读写
 * ============================================================ */

esp_err_t Comm_Put_ENS160_Data(const Comm_ENS160_Data_t *data)
{
    if (data == NULL) return ESP_ERR_INVALID_ARG;
    if (Comm_Mutex == NULL) return ESP_ERR_INVALID_STATE;

    if (xSemaphoreTake(Comm_Mutex, pdMS_TO_TICKS(100)) != pdTRUE)
    {
        ESP_LOGE(TAG, "获取互斥锁超时 (Put ENS160)");
        return ESP_ERR_TIMEOUT;
    }

    memcpy(&Comm_Shared_ENS, data, sizeof(Comm_ENS160_Data_t));
    Comm_ENS_Valid = true;

    xSemaphoreGive(Comm_Mutex);

    xEventGroupSetBits(Comm_Event_Group, COMM_EVENT_ENS160_READY);
    return ESP_OK;
}

esp_err_t Comm_Get_ENS160_Data(Comm_ENS160_Data_t *data)
{
    if (data == NULL) return ESP_ERR_INVALID_ARG;
    if (Comm_Mutex == NULL) return ESP_ERR_INVALID_STATE;

    if (xSemaphoreTake(Comm_Mutex, pdMS_TO_TICKS(100)) != pdTRUE)
    {
        ESP_LOGE(TAG, "获取互斥锁超时 (Get ENS160)");
        return ESP_ERR_TIMEOUT;
    }

    if (!Comm_ENS_Valid)
    {
        xSemaphoreGive(Comm_Mutex);
        return ESP_ERR_NOT_FOUND;
    }

    memcpy(data, &Comm_Shared_ENS, sizeof(Comm_ENS160_Data_t));

    xSemaphoreGive(Comm_Mutex);
    return ESP_OK;
}

/* ============================================================
 *  MLX90640 数据读写
 * ============================================================ */

esp_err_t Comm_Put_MLX90640_Data(const Comm_MLX90640_Data_t *data)
{
    if (data == NULL) return ESP_ERR_INVALID_ARG;
    if (Comm_Mutex == NULL) return ESP_ERR_INVALID_STATE;

    if (xSemaphoreTake(Comm_Mutex, pdMS_TO_TICKS(100)) != pdTRUE)
    {
        ESP_LOGE(TAG, "获取互斥锁超时 (Put MLX90640)");
        return ESP_ERR_TIMEOUT;
    }

    memcpy(&Comm_Shared_MLX, data, sizeof(Comm_MLX90640_Data_t));
    Comm_MLX_Valid = true;

    xSemaphoreGive(Comm_Mutex);

    xEventGroupSetBits(Comm_Event_Group, COMM_EVENT_MLX90640_READY);
    return ESP_OK;
}

esp_err_t Comm_Get_MLX90640_Data(Comm_MLX90640_Data_t *data)
{
    if (data == NULL) return ESP_ERR_INVALID_ARG;
    if (Comm_Mutex == NULL) return ESP_ERR_INVALID_STATE;

    if (xSemaphoreTake(Comm_Mutex, pdMS_TO_TICKS(100)) != pdTRUE)
    {
        ESP_LOGE(TAG, "获取互斥锁超时 (Get MLX90640)");
        return ESP_ERR_TIMEOUT;
    }

    if (!Comm_MLX_Valid)
    {
        xSemaphoreGive(Comm_Mutex);
        return ESP_ERR_NOT_FOUND;
    }

    memcpy(data, &Comm_Shared_MLX, sizeof(Comm_MLX90640_Data_t));

    xSemaphoreGive(Comm_Mutex);
    return ESP_OK;
}

/* ============================================================
 *  一次性获取所有数据 (原子操作)
 * ============================================================ */

esp_err_t Comm_Get_All_Data(Comm_All_Data_t *all)
{
    if (all == NULL) return ESP_ERR_INVALID_ARG;
    if (Comm_Mutex == NULL) return ESP_ERR_INVALID_STATE;

    if (xSemaphoreTake(Comm_Mutex, pdMS_TO_TICKS(200)) != pdTRUE)
    {
        ESP_LOGE(TAG, "获取互斥锁超时 (Get All)");
        return ESP_ERR_TIMEOUT;
    }

    memcpy(&all->aht, &Comm_Shared_AHT, sizeof(Comm_AHT2x_Data_t));
    memcpy(&all->ens, &Comm_Shared_ENS, sizeof(Comm_ENS160_Data_t));
    memcpy(&all->mlx, &Comm_Shared_MLX, sizeof(Comm_MLX90640_Data_t));
    all->timestamp = xTaskGetTickCount() * portTICK_PERIOD_MS;

    xSemaphoreGive(Comm_Mutex);
    return ESP_OK;
}

/* ============================================================
 *  事件等待
 * ============================================================ */

EventBits_t Comm_Wait_Events(EventBits_t event_bits, uint32_t timeout_ms)
{
    if (Comm_Event_Group == NULL) return 0;

    TickType_t ticks = (timeout_ms == 0) ? portMAX_DELAY : pdMS_TO_TICKS(timeout_ms);
    return xEventGroupWaitBits(Comm_Event_Group, event_bits,
                                pdTRUE,   /* 读取后清除 */
                                pdTRUE,   /* 等待所有位 */
                                ticks);
}

EventGroupHandle_t Comm_Get_Event_Group(void)
{
    return Comm_Event_Group;
}