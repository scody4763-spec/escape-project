#include "dht20.h"
#include "driver/i2c.h"
#include "esp_log.h"
#include "bsp.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char *TAG = "DHT20";

static esp_err_t dht20_write_cmd(int i2c_port, uint8_t cmd, uint8_t *data, size_t len)
{
    i2c_cmd_handle_t cmd_handle = i2c_cmd_link_create();
    i2c_master_start(cmd_handle);
    i2c_master_write_byte(cmd_handle, (DHT20_ADDR << 1) | I2C_MASTER_WRITE, 1);
    i2c_master_write_byte(cmd_handle, cmd, 1);
    if (data && len) {
        i2c_master_write(cmd_handle, data, len, 1);
    }
    i2c_master_stop(cmd_handle);
    esp_err_t ret = i2c_master_cmd_begin(i2c_port, cmd_handle, pdMS_TO_TICKS(100));
    i2c_cmd_link_delete(cmd_handle);
    return ret;
}

static esp_err_t dht20_read_bytes(int i2c_port, uint8_t *buf, size_t len)
{
    i2c_cmd_handle_t cmd_handle = i2c_cmd_link_create();
    i2c_master_start(cmd_handle);
    i2c_master_write_byte(cmd_handle, (DHT20_ADDR << 1) | I2C_MASTER_READ, 1);
    i2c_master_read(cmd_handle, buf, len, I2C_MASTER_LAST_NACK);
    i2c_master_stop(cmd_handle);
    esp_err_t ret = i2c_master_cmd_begin(i2c_port, cmd_handle, pdMS_TO_TICKS(100));
    i2c_cmd_link_delete(cmd_handle);
    return ret;
}

esp_err_t dht20_init(int i2c_port)
{
    uint8_t status = 0;
    esp_err_t ret = dht20_read_bytes(i2c_port, &status, 1);
    if (ret != ESP_OK) return ret;

    /* If calibration is not done, trigger init */
    if (!(status & 0x08)) {
        uint8_t data[3] = { 0x08, 0x00, 0x00 };
        ret = dht20_write_cmd(i2c_port, DHT20_CMD_INIT, data, 3);
        if (ret != ESP_OK) return ret;
        vTaskDelay(pdMS_TO_TICKS(10));
    }

    ESP_LOGI(TAG, "DHT20 initialized");
    return ESP_OK;
}

esp_err_t dht20_read_data(int i2c_port, float *temperature, float *humidity)
{
    uint8_t buf[7] = { 0 };
    esp_err_t ret;

    /* Trigger measurement */
    uint8_t trig_data[2] = { 0x33, 0x00 };
    ret = dht20_write_cmd(i2c_port, DHT20_CMD_TRIGGER, trig_data, 2);
    if (ret != ESP_OK) { ESP_LOGE(TAG, "trigger failed: %s", esp_err_to_name(ret)); return ret; }

    vTaskDelay(pdMS_TO_TICKS(80));

    /* Poll status until measurement is ready (max 1 second) */
    for (int i = 0; i < 20; i++) {
        ret = dht20_read_bytes(i2c_port, buf, 1);
        if (ret != ESP_OK) { ESP_LOGE(TAG, "status read failed: %s", esp_err_to_name(ret)); return ret; }
        if (!(buf[0] & 0x80)) break;
        ESP_LOGD(TAG, "status busy: 0x%02X", buf[0]);
        vTaskDelay(pdMS_TO_TICKS(50));
        if (i == 19) {
            ESP_LOGW(TAG, "Sensor busy timeout");
            return ESP_ERR_TIMEOUT;
        }
    }

    /* Read data directly (7 bytes: status, humidity 20-bit, temp 20-bit, checksum) */
    ret = dht20_read_bytes(i2c_port, buf, 7);
    if (ret != ESP_OK) { ESP_LOGE(TAG, "data read failed: %s", esp_err_to_name(ret)); return ret; }

    ESP_LOGI(TAG, "raw: %02X %02X %02X %02X %02X %02X %02X",
        buf[0], buf[1], buf[2], buf[3], buf[4], buf[5], buf[6]);

    uint32_t raw_hum = ((uint32_t)buf[1] << 12) | ((uint32_t)buf[2] << 4) | ((uint32_t)(buf[3] & 0xF0) >> 4);
    uint32_t raw_temp = ((uint32_t)(buf[3] & 0x0F) << 16) | ((uint32_t)buf[4] << 8) | buf[5];

    *humidity = (float)raw_hum * 100.0f / 1048576.0f;
    *temperature = (float)raw_temp * 200.0f / 1048576.0f - 50.0f;

    if (*temperature < -40 || *temperature > 85) *temperature = g_sensor.temperature;
    if (*humidity < 0 || *humidity > 100) *humidity = g_sensor.humidity;

    return ESP_OK;
}

