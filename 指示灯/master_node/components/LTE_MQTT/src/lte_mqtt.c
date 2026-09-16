#include "lte_mqtt.h"
#include "driver/uart.h"
#include "driver/gpio.h"
#include "bsp.h"
#include "esp_log.h"
#include "string.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char *TAG = "LTE_MQTT";

#define UART_BUF_SIZE   (1024)
#define UART_TX_PIN     32
#define UART_RX_PIN     35

static int g_uart_port = -1;

static const char *MQTT_SERVER = "42.193.218.29";
static char g_topic_string[128] = { 0 };
static char g_theme_re[128] = { 0 };

static esp_err_t send_at_cmd(const char *cmd, const char *expected, int timeout_ms)
{
    uart_write_bytes(g_uart_port, cmd, strlen(cmd));
    uart_write_bytes(g_uart_port, "\r\n", 2);

    int elapsed = 0;
    char resp[256] = { 0 };
    int pos = 0;
    while (elapsed < timeout_ms) {
        uint8_t buf[64];
        int len = uart_read_bytes(g_uart_port, buf, sizeof(buf) - 1, pdMS_TO_TICKS(50));
        if (len > 0) {
            buf[len] = 0;
            for (int i = 0; i < len && pos < (int)sizeof(resp) - 1; i++) {
                if (buf[i] >= 32 || buf[i] == '\n' || buf[i] == '\r') {
                    resp[pos++] = buf[i];
                }
            }
            resp[pos] = 0;
            if (strstr(resp, expected)) {
                ESP_LOGI(TAG, "CMD OK: %s -> %s", cmd, resp);
                return ESP_OK;
            }
            if (strstr(resp, "ERROR")) {
                ESP_LOGW(TAG, "CMD ERR: %s -> %s", cmd, resp);
                return ESP_FAIL;
            }
        }
        elapsed += 50;
    }
    ESP_LOGW(TAG, "CMD TIMEOUT: %s -> %s", cmd, resp);
    return ESP_ERR_TIMEOUT;
}

static esp_err_t enter_instruction_mode(void)
{
    for (int attempt = 0; attempt < 5; attempt++) {
        uart_write_bytes(g_uart_port, "+++", 3);
        vTaskDelay(pdMS_TO_TICKS(50));
        uart_write_bytes(g_uart_port, "a", 1);
        vTaskDelay(pdMS_TO_TICKS(50));
        char buf[64] = { 0 };
        int len = uart_read_bytes(g_uart_port, (uint8_t *)buf, sizeof(buf) - 1, pdMS_TO_TICKS(200));
        if (len > 0) {
            buf[len] = 0;
            if (strstr(buf, "ok") || strstr(buf, "+CME ERROR:58")) {
                ESP_LOGI(TAG, "Entered instruction mode");
                return ESP_OK;
            }
        }
    }
    return ESP_FAIL;
}

static esp_err_t enter_dialog_mode(void)
{
    return send_at_cmd("AT+ENTM", "OK", 2000);
}

static esp_err_t set_mqtt_params(void)
{
    ESP_ERROR_CHECK(send_at_cmd("AT+WKMOD=MQTT,NOR", "OK", 2000));
    vTaskDelay(pdMS_TO_TICKS(100));

    char cmd[256];
    snprintf(cmd, sizeof(cmd), "AT+MQTTSVR=%s,1883", MQTT_SERVER);
    ESP_ERROR_CHECK(send_at_cmd(cmd, "OK", 2000));

    snprintf(cmd, sizeof(cmd), "AT+MQTTCID=ESP32_%s", g_mac_str);
    ESP_ERROR_CHECK(send_at_cmd(cmd, "OK", 2000));

    ESP_ERROR_CHECK(send_at_cmd("AT+MQTTUSER=indicator_light", "OK", 2000));
    ESP_ERROR_CHECK(send_at_cmd("AT+MQTTPSW=indicator_light", "OK", 2000));
    ESP_ERROR_CHECK(send_at_cmd("AT+HEARTEN=OFF", "OK", 2000));
    ESP_ERROR_CHECK(send_at_cmd("AT+MQTTWILL=0", "OK", 2000));

    snprintf(cmd, sizeof(cmd), "AT+MQTTSUBTP=1,1,%s,0", g_theme_re);
    ESP_ERROR_CHECK(send_at_cmd(cmd, "OK", 2000));

    snprintf(cmd, sizeof(cmd), "AT+MQTTPUBTP=1,1,%s,0,0", g_topic_string);
    ESP_ERROR_CHECK(send_at_cmd(cmd, "OK", 2000));

    ESP_ERROR_CHECK(send_at_cmd("AT+SSLEN=OFF", "OK", 2000));
    return ESP_OK;
}

esp_err_t lte_mqtt_init(int uart_port)
{
    g_uart_port = uart_port;

    /* Configure UART */
    uart_config_t uart_config = {
        .baud_rate = 115200,
        .data_bits = UART_DATA_8_BITS,
        .parity = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
        .source_clk = UART_SCLK_DEFAULT
    };
    ESP_ERROR_CHECK(uart_param_config(g_uart_port, &uart_config));
    ESP_ERROR_CHECK(uart_set_pin(g_uart_port, UART_TX_PIN, UART_RX_PIN, UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE));
    ESP_ERROR_CHECK(uart_driver_install(g_uart_port, UART_BUF_SIZE * 2, 0, 0, NULL, 0));

    /* Setup topics */
    snprintf(g_topic_string, sizeof(g_topic_string), "indicator_light/data");
    snprintf(g_theme_re, sizeof(g_theme_re), "indicator_light/command");

    /* Initialize module */
    vTaskDelay(pdMS_TO_TICKS(3000));
    if (enter_instruction_mode() != ESP_OK) {
        ESP_LOGE(TAG, "Failed to enter instruction mode");
        vTaskDelay(pdMS_TO_TICKS(5000));
        if (enter_instruction_mode() == ESP_OK) {
            ESP_LOGI(TAG, "Instruction mode OK on retry");
            set_mqtt_params();
            goto after_init;
        }
        return ESP_FAIL;
    }
    set_mqtt_params();
after_init:
    /* Restart module and wait for boot (like Arduino Setting_reopen) */
    ESP_ERROR_CHECK(send_at_cmd("AT+S", "OK", 5000));
    vTaskDelay(pdMS_TO_TICKS(1000));
    
    /* Wait for boot message "WH-LTE-7S0" (Arduino-style) */
    ESP_LOGI(TAG, "Waiting for module to boot...");
    char boot_buf[64];
    int boot_retries = 0;
    while (boot_retries < 30) {
        uart_write_bytes(g_uart_port, "AT+S\r\n", 6);
        vTaskDelay(pdMS_TO_TICKS(500));
        int len = uart_read_bytes(g_uart_port, (uint8_t *)boot_buf, sizeof(boot_buf) - 1, pdMS_TO_TICKS(200));
        if (len > 0) {
            boot_buf[len] = 0;
            if (strstr(boot_buf, "WH-LTE-7S0")) {
                ESP_LOGI(TAG, "Module booted: %s", boot_buf);
                break;
            }
        }
        boot_retries++;
    }
    if (boot_retries >= 30) {
        ESP_LOGW(TAG, "Module boot wait timeout");
    }
    vTaskDelay(pdMS_TO_TICKS(500));

    enter_instruction_mode();
    enter_dialog_mode();

    ESP_LOGI(TAG, "LTE-MQTT initialized. Topic: %s", g_topic_string);
    return ESP_OK;
}

esp_err_t lte_mqtt_send_data(const char *json_data)
{
    if (!json_data) return ESP_ERR_INVALID_ARG;
    /* In dialog/transparent mode: send raw data */
    uart_write_bytes(g_uart_port, json_data, strlen(json_data));
    uart_write_bytes(g_uart_port, "\r\n", 2);
    ESP_LOGD(TAG, "Sent: %s", json_data);
    return ESP_OK;
}

esp_err_t lte_mqtt_receive_line(char *buf, size_t max_len, int timeout_ms)
{
    int pos = 0;
    int elapsed = 0;
    while (elapsed < timeout_ms && pos < (int)max_len - 1) {
        uint8_t ch;
        int len = uart_read_bytes(g_uart_port, &ch, 1, pdMS_TO_TICKS(10));
        if (len == 1) {
            if (ch == '\n') {
                buf[pos] = 0;
                return ESP_OK;
            }
            if (ch >= 32) {
                buf[pos++] = ch;
            }
        } else {
            elapsed += 10;
        }
    }
    buf[pos] = 0;
    return (pos > 0) ? ESP_OK : ESP_ERR_TIMEOUT;
}

int lte_mqtt_data_available(void)
{
    size_t available;
    uart_get_buffered_data_len(g_uart_port, &available);
    return (int)available;
}



