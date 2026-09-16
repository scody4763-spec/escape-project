#include "ens160.h"
#include "driver/i2c.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char *TAG = "ENS160";
static int g_i2c_port = -1;

static esp_err_t ens160_write_reg(uint8_t reg, uint8_t *data, size_t len)
{
    i2c_cmd_handle_t cmd = i2c_cmd_link_create();
    i2c_master_start(cmd);
    i2c_master_write_byte(cmd, (ENS160_ADDR << 1) | I2C_MASTER_WRITE, 1);
    i2c_master_write_byte(cmd, reg, 1);
    if (data && len) i2c_master_write(cmd, data, len, 1);
    i2c_master_stop(cmd);
    esp_err_t ret = i2c_master_cmd_begin(g_i2c_port, cmd, pdMS_TO_TICKS(100));
    i2c_cmd_link_delete(cmd);
    return ret;
}

/* ENS160 requires STOP between write(reg) and read(data) - like Arduino Wire library */
static esp_err_t ens160_read_reg(uint8_t reg, uint8_t *buf, size_t len)
{
    i2c_cmd_handle_t cmd = i2c_cmd_link_create();
    i2c_master_start(cmd);
    i2c_master_write_byte(cmd, (ENS160_ADDR << 1) | I2C_MASTER_WRITE, 1);
    i2c_master_write_byte(cmd, reg, 1);
    i2c_master_stop(cmd);
    esp_err_t ret = i2c_master_cmd_begin(g_i2c_port, cmd, pdMS_TO_TICKS(100));
    i2c_cmd_link_delete(cmd);
    if (ret != ESP_OK) return ret;

    vTaskDelay(pdMS_TO_TICKS(2));
    cmd = i2c_cmd_link_create();
    i2c_master_start(cmd);
    i2c_master_write_byte(cmd, (ENS160_ADDR << 1) | I2C_MASTER_READ, 1);
    if (len > 1) i2c_master_read(cmd, buf, len - 1, I2C_MASTER_ACK);
    i2c_master_read_byte(cmd, &buf[len - 1], I2C_MASTER_LAST_NACK);
    i2c_master_stop(cmd);
    ret = i2c_master_cmd_begin(g_i2c_port, cmd, pdMS_TO_TICKS(100));
    i2c_cmd_link_delete(cmd);
    return ret;
}

esp_err_t ens160_init(int i2c_port)
{
    g_i2c_port = i2c_port;
    uint8_t buf[2] = { 0 };
    esp_err_t ret = ens160_read_reg(0x00, buf, 2);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to read PART_ID");
        return ret;
    }
    uint16_t part_id = ((uint16_t)buf[1] << 8) | buf[0];
    if (part_id != ENS160_PART_ID) {
        ESP_LOGE(TAG, "Invalid PART_ID: 0x%04X", part_id);
        return ESP_ERR_INVALID_VERSION;
    }
    ESP_LOGI(TAG, "ENS160 found, PART_ID=0x%04X", part_id);
    return ESP_OK;
}

esp_err_t ens160_set_pwr_mode(int i2c_port, uint8_t mode)
{
    g_i2c_port = i2c_port;
    return ens160_write_reg(0x10, &mode, 1);
}

esp_err_t ens160_set_temp_hum(int i2c_port, float temp, float hum)
{
    g_i2c_port = i2c_port;
    int16_t temp_raw = (int16_t)(temp * 64.0f);
    int16_t hum_raw  = (int16_t)(hum * 512.0f);
    uint8_t data[2];
    data[0] = temp_raw & 0xFF;
    data[1] = (temp_raw >> 8) & 0xFF;
    esp_err_t ret = ens160_write_reg(0x13, data, 2);
    if (ret != ESP_OK) return ret;
    data[0] = hum_raw & 0xFF;
    data[1] = (hum_raw >> 8) & 0xFF;
    return ens160_write_reg(0x15, data, 2);
}

uint8_t ens160_get_status(int i2c_port)
{
    g_i2c_port = i2c_port;
    uint8_t status = 0xFF;
    uint8_t buf[1] = { 0 };
    if (ens160_read_reg(0x20, buf, 1) == ESP_OK) {
        /* bits 2-3 = validityFlag: 0=Normal, 1=Warm-Up, 2=Initial Start-Up, 3=Invalid */
        status = (buf[0] >> 2) & 0x03;
    }
    return status;
}

uint8_t ens160_get_aqi(int i2c_port)
{
    g_i2c_port = i2c_port;
    uint8_t buf[1] = { 0 };
    if (ens160_read_reg(0x21, buf, 1) == ESP_OK) return buf[0];
    return 0;
}

uint16_t ens160_get_tvoc(int i2c_port)
{
    g_i2c_port = i2c_port;
    uint8_t buf[2] = { 0 };
    if (ens160_read_reg(0x22, buf, 2) == ESP_OK)
        return ((uint16_t)buf[1] << 8) | buf[0];
    return 0;
}

uint16_t ens160_get_eco2(int i2c_port)
{
    g_i2c_port = i2c_port;
    uint8_t buf[2] = { 0 };
    if (ens160_read_reg(0x24, buf, 2) == ESP_OK)
        return ((uint16_t)buf[1] << 8) | buf[0];
    return 0;
}