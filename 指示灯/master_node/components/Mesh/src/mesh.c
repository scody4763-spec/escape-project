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
static uint32_t g_node_ids[MESH_MAX_NODES] = { 0 };
static char g_node_data[MESH_MAX_NODES][MESH_DATA_LEN] = { 0 };
static int g_node_count = 0;
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

            /* Store node data */
            bool found = false;
            for (int i = 0; i < g_node_count; i++) {
                if (g_node_ids[i] == node_id) {
                    strncpy(g_node_data[i], (const char *)pkt.data, MESH_DATA_LEN - 1);
                    found = true;
                    break;
                }
            }
            if (!found && g_node_count < MESH_MAX_NODES) {
                g_node_ids[g_node_count] = node_id;
                strncpy(g_node_data[g_node_count], (const char *)pkt.data, MESH_DATA_LEN - 1);
                g_node_count++;
            }
            ESP_LOGI(TAG, "Mesh recv from 0x%08lX, nodes=%d", (unsigned long)node_id, g_node_count);
        }
    }
}

esp_err_t mesh_init(void)
{
    /* Initialize Wi-Fi in station mode */
    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_start());

    /* Initialize ESP-NOW */
    ESP_ERROR_CHECK(esp_now_init());
    ESP_ERROR_CHECK(esp_now_register_recv_cb(espnow_recv_cb));
    ESP_ERROR_CHECK(esp_now_set_pmk((uint8_t *)"linyuting1234567"));

    /* Add broadcast peer */
    esp_now_peer_info_t peer = { 0 };
    memcpy(peer.peer_addr, broadcast_mac, 6);
    peer.channel = MESH_CHANNEL;
    peer.ifidx = ESP_IF_WIFI_STA;
    peer.encrypt = false;
    ESP_ERROR_CHECK(esp_now_add_peer(&peer));

    /* Create receive queue */
    s_recv_queue = xQueueCreate(10, sizeof(espnow_recv_packet_t));

    /* Create mesh processing task */
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

/* Simulate a child node data injection (for single-device testing) */
esp_err_t mesh_inject_data(const char *data)
{
    if (!data) return ESP_ERR_INVALID_ARG;

    /* Simulated child node ID (fixed fake MAC) */
    uint32_t node_id = 0x12345678;

    if (g_mesh_cb) {
        g_mesh_cb(node_id, data);
    }

    /* Store simulated node data (same logic as mesh_task) */
    bool found = false;
    for (int i = 0; i < g_node_count; i++) {
        if (g_node_ids[i] == node_id) {
            strncpy(g_node_data[i], data, MESH_DATA_LEN - 1);
            found = true;
            break;
        }
    }
    if (!found && g_node_count < MESH_MAX_NODES) {
        g_node_ids[g_node_count] = node_id;
        strncpy(g_node_data[g_node_count], data, MESH_DATA_LEN - 1);
        g_node_count++;
    }
    ESP_LOGI(TAG, "Sim node injected, total nodes=%d", g_node_count);
    return ESP_OK;
}

void mesh_update(void)
{
    /* Nothing to do - handled by mesh task */
}

int mesh_get_node_count(void)
{
    return g_node_count;
}

uint32_t mesh_get_node_id(int index)
{
    if (index < 0 || index >= g_node_count) return 0;
    return g_node_ids[index];
}

const char *mesh_get_node_data(int index)
{
    if (index < 0 || index >= g_node_count) return NULL;
    return g_node_data[index];
}

void mesh_clear_node_data(void)
{
    memset(g_node_ids, 0, sizeof(g_node_ids));
    memset(g_node_data, 0, sizeof(g_node_data));
    g_node_count = 0;
}