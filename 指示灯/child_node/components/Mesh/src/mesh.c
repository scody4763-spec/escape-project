#include "mesh.h"
#include "esp_now.h"
#include "esp_wifi.h"
#include "esp_log.h"
#include "esp_mac.h"
#include "string.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"
#include "nvs_flash.h"

static const char *TAG = "MESH";

#define MESH_CHANNEL   1
#define ESPNOW_MAXDELAY 100

const char *FLAME_MESH_START = "{\"ESP32_fires\": 1 }";
const char *FLAME_MESH_STOP  = "{\"ESP32_fires\": 0 }";

static mesh_recv_cb_t g_mesh_cb = NULL;
static QueueHandle_t s_recv_queue = NULL;

typedef struct {
    uint8_t mac_addr[6];
    uint8_t data[MESH_DATA_LEN];
    int data_len;
} espnow_recv_packet_t;

static void espnow_recv_cb(const esp_now_recv_info_t *recv_info, const uint8_t *data, int len)
{
    if (s_recv_queue == NULL) return;
    espnow_recv_packet_t pkt;
    memcpy(pkt.mac_addr, recv_info->src_addr, 6);
    int copy_len = (len < MESH_DATA_LEN) ? len : MESH_DATA_LEN - 1;
    memcpy(pkt.data, data, copy_len);
    pkt.data[copy_len] = 0;
    pkt.data_len = copy_len;
    xQueueSend(s_recv_queue, &pkt, pdMS_TO_TICKS(10));
}

static const uint8_t broadcast_mac[6] = { 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF };

static void mesh_task(void *pvParam)
{
    espnow_recv_packet_t pkt;
    while (1) {
        if (xQueueReceive(s_recv_queue, &pkt, pdMS_TO_TICKS(50)) == pdTRUE) {
            uint32_t node_id = 0;
            for (int i = 0; i < 6; i++) {
                node_id = (node_id << 8) | pkt.mac_addr[i];
            }

            if (g_mesh_cb) {
                g_mesh_cb(node_id, (const char *)pkt.data);
            }
        }
    }
}

esp_err_t mesh_init(void)
{
    /* 初始化 Wi-Fi，使用 Station 模式 */
    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_start());

    /* 初始化 ESP-NOW */
    ESP_ERROR_CHECK(esp_now_init());
    ESP_ERROR_CHECK(esp_now_register_recv_cb(espnow_recv_cb));
    ESP_ERROR_CHECK(esp_now_set_pmk((uint8_t *)"linyuting1234567"));

    /* 添加广播对端 */
    esp_now_peer_info_t peer = { 0 };
    memcpy(peer.peer_addr, broadcast_mac, 6);
    peer.channel = MESH_CHANNEL;
    peer.ifidx = ESP_IF_WIFI_STA;
    peer.encrypt = false;
    ESP_ERROR_CHECK(esp_now_add_peer(&peer));

    /* 创建接收队列 */
    s_recv_queue = xQueueCreate(10, sizeof(espnow_recv_packet_t));

    /* 创建 Mesh 处理任务 */
    xTaskCreatePinnedToCore(mesh_task, "mesh_task", 4096, NULL, 1, NULL, tskNO_AFFINITY);

    ESP_LOGI(TAG, "ESP-NOW mesh initialized");
    return ESP_OK;
}

esp_err_t mesh_send_broadcast(const char *data)
{
    if (!data) return ESP_ERR_INVALID_ARG;
    esp_err_t ret = esp_now_send(broadcast_mac, (const uint8_t *)data, strlen(data));
    if (ret != ESP_OK) {
        ESP_LOGW(TAG, "Broadcast failed: %d", ret);
    }
    return ret;
}

esp_err_t mesh_set_recv_callback(mesh_recv_cb_t cb)
{
    g_mesh_cb = cb;
    return ESP_OK;
}

/* 模拟主节点指令注入（用于单机测试） */
esp_err_t mesh_inject_data(const char *data)
{
    if (!data) return ESP_ERR_INVALID_ARG;
    if (g_mesh_cb) {
        g_mesh_cb(0x12345678, data);
    }
    return ESP_OK;
}

void mesh_update(void)
{
    /* 无需处理，接收逻辑由 mesh_task 完成 */
}
