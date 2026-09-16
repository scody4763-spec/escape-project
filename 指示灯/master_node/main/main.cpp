/**
 * 应急指示灯 - IDF 版本
 * 基于今晚调试好的 main.c，使用 i2s_lcd_dma + led_matrix_gfx + eiceg_bitmaps 驱动
 */

#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/timers.h"
#include "esp_system.h"
#include "esp_log.h"
#include "nvs_flash.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_netif.h"
#include "driver/gpio.h"
#include "driver/i2c.h"
#include "driver/uart.h"
#include "cJSON.h"

#include "i2s_lcd_dma.h"
#include "eiceg_bitmaps.h"
#include "led_matrix_gfx.h"
#include "bsp.h"
#include "dht20.h"
#include "ens160.h"
#include "lte_mqtt.h"
#include "mesh.h"
#include "ble_beacon.h"
#include "nvs_flash.h"
#include "esp_log.h"

#define I2C_PORT I2C_NUM_0
#define I2C_SDA  23
#define I2C_SCL  22

static const char *TAG = "main";

/* Display colors (RGB565) */
static uint16_t myColor_left  = 0x07E0; /* green */
static uint16_t myColor_mid   = 0x07E0;
static uint16_t myColor_right = 0x07E0;

static int mqtt_cnt = 0;

/* 本地火灾判定阈值（温度 °C / TVOC ppb） */
#define FIRE_TEMP_HIGH   60.0f
#define FIRE_TVOC_HIGH   2000
#define FIRE_TEMP_LOW    55.0f
#define FIRE_TVOC_LOW    1500

static bool g_local_fire_alarm = false;

/* ===== Direction mapping (10 directions, matches Arduino + IDF扩展) ===== */
#define DIR_RUP    7
#define DIR_LUP    8
#define DIR_RDOWN  9
#define DIR_LDOWN  10
/* DIR_ICON=5, DIR_STYLE=6 already in bsp.h */

static void set_direction_from_name(const char *name, display_channel_t *ch)
{
    ch->enabled = 1;
    if (strcmp(name, "Left") == 0)       { ch->dynamic_static = 1; ch->direction = DIR_LEFT; }
    else if (strcmp(name, "left") == 0)  { ch->dynamic_static = 0; ch->direction = DIR_LEFT; }
    else if (strcmp(name, "Right") == 0) { ch->dynamic_static = 1; ch->direction = DIR_RIGHT; }
    else if (strcmp(name, "right") == 0) { ch->dynamic_static = 0; ch->direction = DIR_RIGHT; }
    else if (strcmp(name, "Down") == 0)  { ch->dynamic_static = 1; ch->direction = DIR_DOWN; }
    else if (strcmp(name, "down") == 0)  { ch->dynamic_static = 0; ch->direction = DIR_DOWN; }
    else if (strcmp(name, "Up") == 0)    { ch->dynamic_static = 1; ch->direction = DIR_UP; }
    else if (strcmp(name, "up") == 0)    { ch->dynamic_static = 0; ch->direction = DIR_UP; }
    else if (strcmp(name, "RUp") == 0)   { ch->dynamic_static = 1; ch->direction = DIR_RUP; }
    else if (strcmp(name, "rup") == 0)   { ch->dynamic_static = 0; ch->direction = DIR_RUP; }
    else if (strcmp(name, "LUp") == 0)   { ch->dynamic_static = 1; ch->direction = DIR_LUP; }
    else if (strcmp(name, "lup") == 0)   { ch->dynamic_static = 0; ch->direction = DIR_LUP; }
    else if (strcmp(name, "RDown") == 0) { ch->dynamic_static = 1; ch->direction = DIR_RDOWN; }
    else if (strcmp(name, "rdown") == 0) { ch->dynamic_static = 0; ch->direction = DIR_RDOWN; }
    else if (strcmp(name, "LDown") == 0) { ch->dynamic_static = 1; ch->direction = DIR_LDOWN; }
    else if (strcmp(name, "ldown") == 0) { ch->dynamic_static = 0; ch->direction = DIR_LDOWN; }
    else if (strcmp(name, "motifs") == 0){ ch->dynamic_static = 0; ch->direction = DIR_ICON; }
    else if (strcmp(name, "style") == 0) { ch->dynamic_static = 0; ch->direction = DIR_STYLE; }
}

/* ===== Display functions (from tonight's main.c, adapted) ===== */
static void show_panel(int x_offset, display_channel_t *ch,
                       uint16_t color, const uint8_t *dynamic, const uint8_t *static_bmp)
{
    if (!ch->enabled) return;

    const uint8_t *bitmap;
    if (ch->dynamic_static || (ch == &g_display_left ? g_silky_left :
        ch == &g_display_mid ? g_silky_mid : g_silky_right)) {
        bitmap = dynamic;
    } else {
        bitmap = static_bmp;
    }

    led_matrix_draw_bitmap(x_offset, 0, bitmap, BITMAP_WIDTH, BITMAP_HEIGHT, color, COLOR_BLACK);
}

static void show_left(void)
{
    const uint8_t *dynamic, *static_bmp;
    switch (g_display_left.direction) {
        case DIR_LEFT:   dynamic = dynamic_left_buf;  static_bmp = static_left;  break;
        case DIR_RIGHT:  dynamic = dynamic_right_buf; static_bmp = static_right; break;
        case DIR_DOWN:   dynamic = dynamic_down_buf;  static_bmp = static_down;  break;
        case DIR_UP:     dynamic = dynamic_up_buf;    static_bmp = static_up;    break;
        case DIR_RUP:    dynamic = dynamic_rup_buf;   static_bmp = static_rup;   break;
        case DIR_LUP:    dynamic = dynamic_lup_buf;   static_bmp = static_lup;   break;
        case DIR_RDOWN:  dynamic = dynamic_rdown_buf; static_bmp = static_rdown; break;
        case DIR_LDOWN:  dynamic = dynamic_ldown_buf; static_bmp = static_ldown; break;
        case DIR_ICON:   dynamic = dynamic_left_buf;  static_bmp = static_motifs;break;
        case DIR_STYLE:  dynamic = dynamic_left_buf;  static_bmp = static_style; break;
        default: return;
    }
    show_panel(0, &g_display_left, myColor_left, dynamic, static_bmp);
}

static void show_mid(void)
{
    const uint8_t *dynamic, *static_bmp;
    switch (g_display_mid.direction) {
        case DIR_LEFT:   dynamic = dynamic_left_buf;  static_bmp = static_left;  break;
        case DIR_RIGHT:  dynamic = dynamic_right_buf; static_bmp = static_right; break;
        case DIR_DOWN:   dynamic = dynamic_down_buf;  static_bmp = static_down;  break;
        case DIR_UP:     dynamic = dynamic_up_buf;    static_bmp = static_up;    break;
        case DIR_RUP:    dynamic = dynamic_rup_buf;   static_bmp = static_rup;   break;
        case DIR_LUP:    dynamic = dynamic_lup_buf;   static_bmp = static_lup;   break;
        case DIR_RDOWN:  dynamic = dynamic_rdown_buf; static_bmp = static_rdown; break;
        case DIR_LDOWN:  dynamic = dynamic_ldown_buf; static_bmp = static_ldown; break;
        case DIR_ICON:   dynamic = dynamic_left_buf;  static_bmp = static_motifs;break;
        case DIR_STYLE:  dynamic = dynamic_left_buf;  static_bmp = static_style; break;
        default: return;
    }
    show_panel(32, &g_display_mid, myColor_mid, dynamic, static_bmp);
}

static void show_right(void)
{
    const uint8_t *dynamic, *static_bmp;
    switch (g_display_right.direction) {
        case DIR_LEFT:   dynamic = dynamic_left_buf;  static_bmp = static_left;  break;
        case DIR_RIGHT:  dynamic = dynamic_right_buf; static_bmp = static_right; break;
        case DIR_DOWN:   dynamic = dynamic_down_buf;  static_bmp = static_down;  break;
        case DIR_UP:     dynamic = dynamic_up_buf;    static_bmp = static_up;    break;
        case DIR_RUP:    dynamic = dynamic_rup_buf;   static_bmp = static_rup;   break;
        case DIR_LUP:    dynamic = dynamic_lup_buf;   static_bmp = static_lup;   break;
        case DIR_RDOWN:  dynamic = dynamic_rdown_buf; static_bmp = static_rdown; break;
        case DIR_LDOWN:  dynamic = dynamic_ldown_buf; static_bmp = static_ldown; break;
        case DIR_ICON:   dynamic = dynamic_left_buf;  static_bmp = static_motifs;break;
        case DIR_STYLE:  dynamic = dynamic_left_buf;  static_bmp = static_style; break;
        default: return;
    }
    show_panel(64, &g_display_right, myColor_right, dynamic, static_bmp);
}

static void show_all(void)
{
    led_matrix_clear();
    show_left();
    show_mid();
    show_right();
    led_matrix_show();
}

/* ===== Animation task (tonight's fixed logic) ===== */
static void animation_task(void *pvParameters)
{
    while (1) {
        /* Match Arduino: (states | scanning != 1) - always animate unless scanning==1 */
        int state_flag = g_display_left.dynamic_static | g_display_mid.dynamic_static |
                         g_display_right.dynamic_static;
        if ((state_flag | (g_scanning != 1))) {
            if (g_scanning >= 32) {
                g_scanning = 0;
                g_silky_left = 0;
                g_silky_right = 0;
                g_silky_mid = 0;
            }
            shift_pixels_left(dynamic_left_buf);
            shift_pixels_right(dynamic_right_buf);
            shift_pixels_down(dynamic_ldown_buf);
            shift_pixels_down(dynamic_rdown_buf);
            shift_pixels_up(dynamic_lup_buf);
            shift_pixels_up(dynamic_rup_buf);
            g_scanning++;
        }

        show_all();

        /* Check electricity */
        bool power_ok = bsp_check_power();
        if (g_electricity_current_enabled) {
            if (g_electricity_flag != power_ok) {
                g_electricity_flag = power_ok;
                if (power_ok) {
                    bsp_electricity_stop_alarms();
                } else {
                    bsp_electricity_start_alarms();
                }
            }
        } else {
            g_electricity_flag = true;
        }

        vTaskDelay(pdMS_TO_TICKS(100));
    }
}

/* ===== Mesh receive callback ===== */
static void mesh_recv_cb(uint32_t from, const char *payload)
{
    ESP_LOGI(TAG, "Mesh received: %s", payload);

    /* Check for fire alarm commands */
    if (strstr(payload, "\"ESP32_fires\": 1")) {
        bsp_buzzer_start_alarms();
        g_display_left.dynamic_static = 1;
        g_display_mid.dynamic_static = 1;
        g_display_right.dynamic_static = 1;
        bsp_pwm_set(500);
        return;
    }
    if (strstr(payload, "\"ESP32_fires\": 0")) {
        bsp_buzzer_stop_alarms();
        if (g_display_left.dynamic_static == 1) g_silky_left = 1;
        if (g_display_mid.dynamic_static == 1) g_silky_mid = 1;
        if (g_display_right.dynamic_static == 1) g_silky_right = 1;
        g_display_left.dynamic_static = 0;
        g_display_mid.dynamic_static = 0;
        g_display_right.dynamic_static = 0;
        bsp_pwm_set(0);
        return;
    }

    /* Parse JSON command */
    cJSON *root = cJSON_Parse(payload);
    if (!root) return;

    /* Find device-specific config */
    char key[64];
    snprintf(key, sizeof(key), "ESP32_%s", g_mac_str);

    cJSON *dev = cJSON_GetObjectItem(root, key);
    if (!dev) {
        cJSON_Delete(root);
        return;
    }

    /* Parse display directions */
    cJSON *display_left = cJSON_GetObjectItem(dev, "display_left");
    cJSON *display_mid = cJSON_GetObjectItem(dev, "display_mid");
    cJSON *display_right = cJSON_GetObjectItem(dev, "display_right");

    if (cJSON_IsString(display_left)) {
        uint8_t dl = g_display_left.dynamic_static;
        set_direction_from_name(display_left->valuestring, &g_display_left);
        if (dl != g_display_left.dynamic_static && g_display_left.dynamic_static == 0) {
            g_silky_left = 1;
        }
    }
    if (cJSON_IsString(display_mid)) {
        uint8_t dm = g_display_mid.dynamic_static;
        set_direction_from_name(display_mid->valuestring, &g_display_mid);
        if (dm != g_display_mid.dynamic_static && g_display_mid.dynamic_static == 0) {
            g_silky_mid = 1;
        }
    }
    if (cJSON_IsString(display_right)) {
        uint8_t dr = g_display_right.dynamic_static;
        set_direction_from_name(display_right->valuestring, &g_display_right);
        if (dr != g_display_right.dynamic_static && g_display_right.dynamic_static == 0) {
            g_silky_right = 1;
        }
    }

    /* Parse RGB colors */
    auto parse_rgb = [&](const char *rgb_key, uint16_t *color) {
        cJSON *arr = cJSON_GetObjectItem(dev, rgb_key);
        if (cJSON_IsArray(arr) && cJSON_GetArraySize(arr) >= 3) {
            int r = cJSON_GetArrayItem(arr, 0)->valueint;
            int g = cJSON_GetArrayItem(arr, 1)->valueint;
            int b = cJSON_GetArrayItem(arr, 2)->valueint;
            *color = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
        }
    };
    parse_rgb("RGB_left", &myColor_left);
    parse_rgb("RGB_mid", &myColor_mid);
    parse_rgb("RGB_right", &myColor_right);

    /* Parse LED brightness */
    cJSON *led = cJSON_GetObjectItem(dev, "led");
    if (cJSON_IsNumber(led) && led->valueint >= 1 && led->valueint <= 1024) {
        bsp_pwm_set(led->valueint - 1);
    }

    /* Parse buzzer */
    cJSON *buzzer = cJSON_GetObjectItem(dev, "buzzer");
    if (cJSON_IsNumber(buzzer)) {
        if (buzzer->valueint == 1) bsp_buzzer_stop_alarms();
        else if (buzzer->valueint == 2) bsp_buzzer_start_alarms();
    }

    /* Parse fire alarm */
    cJSON *flame = cJSON_GetObjectItem(dev, "flame");
    if (cJSON_IsString(flame)) {
        if (strcmp(flame->valuestring, "True") == 0) {
            bsp_start_alarms();
            mesh_send_broadcast(FLAME_MESH_START);
        } else if (strcmp(flame->valuestring, "False") == 0) {
            bsp_stop_alarms();
            mesh_send_broadcast(FLAME_MESH_STOP);
        }
    }

    /* Parse electricity switch */
    cJSON *elec = cJSON_GetObjectItem(dev, "electricity_switch");
    if (cJSON_IsString(elec)) {
        if (strcmp(elec->valuestring, "ON") == 0) g_electricity_current_enabled = true;
        else if (strcmp(elec->valuestring, "OFF") == 0) g_electricity_current_enabled = false;
    }

    cJSON_Delete(root);
}

/* ===== LTE MQTT receive callback ===== */
static void lte_recv_cb(const char *payload)
{
    cJSON *d = cJSON_Parse(payload);
    if (!d) {
        ESP_LOGW(TAG, "[LTE_RX] JSON parse FAILED: %s", payload);
        return;
    }
    char id[64];
    snprintf(id, 64, "ESP32_%s", g_mac_str);
    cJSON *o = cJSON_GetObjectItem(d, id);
    if (!o) {
        ESP_LOGW(TAG, "[LTE_RX] no key %s in payload: %s", id, payload);
        cJSON_Delete(d);
        return;
    }

    auto gs = [&](const char *k) -> const char* {
        cJSON *v = cJSON_GetObjectItem(o, k);
        return (v && cJSON_IsString(v)) ? v->valuestring : NULL;
    };

    const char *s;
    if ((s = gs("display_left"))) {
        uint8_t p = g_display_left.dynamic_static;
        set_direction_from_name(s, &g_display_left);
        if (p != g_display_left.dynamic_static && g_display_left.dynamic_static == 0) g_silky_left = 1;
    }
    if ((s = gs("display_mid"))) {
        uint8_t p = g_display_mid.dynamic_static;
        set_direction_from_name(s, &g_display_mid);
        if (p != g_display_mid.dynamic_static && g_display_mid.dynamic_static == 0) g_silky_mid = 1;
    }
    if ((s = gs("display_right"))) {
        uint8_t p = g_display_right.dynamic_static;
        set_direction_from_name(s, &g_display_right);
        if (p != g_display_right.dynamic_static && g_display_right.dynamic_static == 0) g_silky_right = 1;
    }

    if ((s = gs("flame"))) {
        if (strcmp(s, "True") == 0) { bsp_start_alarms(); mesh_send_broadcast(FLAME_MESH_START); }
        else if (strcmp(s, "False") == 0) { bsp_stop_alarms(); mesh_send_broadcast(FLAME_MESH_STOP); }
    }
    if ((s = gs("electricity_switch")))
        g_electricity_current_enabled = (strcmp(s, "ON") == 0);

    cJSON_Delete(d);
}

/* ===== Sensor task ===== */
static void sensor_task(void *p)
{
    int dbg = 0;
    while (1) {
        if (dbg++ % 10 == 0) ESP_LOGI(TAG, "sensor reading...");
          /* ENS160 */
          uint8_t st = ens160_get_status(I2C_PORT);
          if (dbg % 10 == 2) {
              ESP_LOGI(TAG, "ENS160 status=%d", st);
              ESP_LOGI(TAG, "ENS160 raw aqi=%d tvoc=%d eco2=%d",
                  ens160_get_aqi(I2C_PORT), ens160_get_tvoc(I2C_PORT), ens160_get_eco2(I2C_PORT));
          }
        if (st == 0) {
            ens160_set_pwr_mode(I2C_PORT, ENS160_OPMODE_STANDARD);
            int a = ens160_get_aqi(I2C_PORT);    if (a) g_sensor.aqi = a;
            int t = ens160_get_tvoc(I2C_PORT);   if (t) g_sensor.tvoc = t;
            int e = ens160_get_eco2(I2C_PORT);   if (e) g_sensor.eco2 = e;
        } else {
            g_sensor.aqi  = ens160_get_aqi(I2C_PORT);
            g_sensor.tvoc = ens160_get_tvoc(I2C_PORT);
            g_sensor.eco2 = ens160_get_eco2(I2C_PORT);
        }
        /* DHT20 */
        float th, hh;
          if (dht20_read_data(I2C_PORT, &th, &hh) == ESP_OK) {
              g_sensor.temperature = th;
              g_sensor.humidity = hh;
          }

        /* 本地火灾判定：高温或 TVOC 超标自动报警 */
        if (g_sensor.temperature > FIRE_TEMP_HIGH || g_sensor.tvoc > FIRE_TVOC_HIGH) {
            if (!g_local_fire_alarm) {
                g_local_fire_alarm = true;
                ESP_LOGW(TAG, "本地检测到火灾: temp=%.1f tvoc=%d", g_sensor.temperature, g_sensor.tvoc);
                bsp_start_alarms();
                mesh_send_broadcast(FLAME_MESH_START);
            } else {
                bsp_start_alarms();
            }
        } else if (g_local_fire_alarm &&
                   g_sensor.temperature < FIRE_TEMP_LOW &&
                   g_sensor.tvoc < FIRE_TVOC_LOW) {
            g_local_fire_alarm = false;
            ESP_LOGW(TAG, "本地火灾恢复: temp=%.1f tvoc=%d", g_sensor.temperature, g_sensor.tvoc);
            bsp_stop_alarms();
            mesh_send_broadcast(FLAME_MESH_STOP);
        }

          if (dbg % 10 == 2) ESP_LOGI(TAG, "SENSOR aqi=%d tvoc=%d eco2=%d temp=%.1f hum=%.1f",
              g_sensor.aqi, g_sensor.tvoc, g_sensor.eco2, g_sensor.temperature, g_sensor.humidity);
          vTaskDelay(pdMS_TO_TICKS(250));
    }
}

/* ===== Communication task ===== */
static void comm_task(void *p)
{
    while (1) {
        /* Receive from LTE MQTT */
        if (lte_mqtt_data_available() > 0) {
            char buf[1024];
            if (lte_mqtt_receive_line(buf, sizeof(buf), 100) == ESP_OK && strlen(buf) > 0) {
                ESP_LOGI(TAG, "[LTE_RX] raw: %s", buf);
                lte_recv_cb(buf);
                mesh_send_broadcast(buf);
            } else {
                ESP_LOGW(TAG, "[LTE_RX] data available but read failed/empty");
            }
        }

        /* Send sensor data periodically */
        if (mqtt_cnt >= MQTT_SEND_INTERVAL) {
            mqtt_cnt = 0;
            cJSON *r = cJSON_CreateObject();
            char k[64];
            snprintf(k, 64, "ESP32_%s", g_mac_str);
            cJSON *d = cJSON_CreateObject();
            cJSON_AddNumberToObject(d, "AQI", g_sensor.aqi);
            cJSON_AddNumberToObject(d, "TVOC", g_sensor.tvoc);
            cJSON_AddNumberToObject(d, "ECO2", g_sensor.eco2);
            char temp_str[16], hum_str[16];
            snprintf(temp_str, sizeof(temp_str), "%.2f", g_sensor.temperature);
            snprintf(hum_str, sizeof(hum_str), "%.2f", g_sensor.humidity);
            cJSON_AddRawToObject(d, "temp", temp_str);
            cJSON_AddRawToObject(d, "hum", hum_str);
            cJSON_AddBoolToObject(d, "electricity_Current", g_electricity_current_enabled);
            cJSON_AddNumberToObject(d, "electricity", g_electricity_raw);
            cJSON_AddBoolToObject(d, "ESP32_fires_flag", g_esp32_fires_flag);
            cJSON_AddBoolToObject(d, "ESP32_electricity_flag", g_esp32_electricity_flag);
            cJSON_AddNumberToObject(d, "buzzer", g_buzzer_flag);
            cJSON_AddItemToObject(r, k, d);

            int n = mesh_get_node_count();
            /* Merge child node data into the same object */
            if (n > 0) {
                for (int i = 0; i < n; i++) {
                    cJSON *child = cJSON_Parse(mesh_get_node_data(i));
                    if (child) {
                        cJSON *key = child->child;
                        while (key) {
                            cJSON *item = cJSON_DetachItemFromObject(child, key->string);
                            if (item) cJSON_AddItemToObject(r, key->string, item);
                            key = child->child;
                        }
                        cJSON_Delete(child);
                    }
                }
                mesh_clear_node_data();
            }
            char *js = cJSON_PrintUnformatted(r);
            lte_mqtt_send_data(js);
            free(js);
            cJSON_Delete(r);
        }
        mqtt_cnt++;

        /* Buzzer alarm pattern */
        if (g_buzzer_flag == BUZZER_ON) {
            static int bc = 0;
            bc++;
            if (bc == 1 || bc == 2) bsp_buzzer_on();
            else { bsp_buzzer_off(); bc = 0; }
        }

        mesh_update();
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}



//蓝牙配置函数
static void Write_Nvs_Defaults(void)
{
	nvs_handle_t nvsHandle;
	esp_err_t ret = nvs_open("storage", NVS_READWRITE, &nvsHandle);
	if (ret != ESP_OK)
	{
		ESP_LOGE(TAG, "NVS 打开失败, 无法写入默认配置");
		return;
	}

	nvs_set_str(nvsHandle, "wifi_name", "败家之眼");		// 实验室wifi
	nvs_set_str(nvsHandle, "wifi_ssid", "Tgs200410");
	nvs_set_i16(nvsHandle, "Major", 3);			// 这里改为你需要的
	nvs_set_i16(nvsHandle, "Minor", 1);			// 同上
	nvs_commit(nvsHandle);
	nvs_close(nvsHandle);
	ESP_LOGI(TAG, "NVS 默认配置已写入 [wifi_name/wifi_ssid, Major=3, Minor=1]");
}

/* ===== App main ===== */
extern "C" void app_main(void)
{
    ESP_LOGI(TAG, "Emergency Light System starting...");
    nvs_flash_init();
    bsp_init();

    /* I2C for sensors */
    i2c_config_t ic = {
        .mode = I2C_MODE_MASTER,
        .sda_io_num = I2C_SDA,
        .scl_io_num = I2C_SCL,
        .sda_pullup_en = GPIO_PULLUP_ENABLE,
        .scl_pullup_en = GPIO_PULLUP_ENABLE,
        .master = {.clk_speed = 100000},
        .clk_flags = 0
    };
      i2c_param_config(I2C_PORT, &ic);
      i2c_driver_install(I2C_PORT, I2C_MODE_MASTER, 0, 0, 0);

      /* Init sensors */
      dht20_init(I2C_PORT);
    int er = 0;
    while (ens160_init(I2C_PORT) != ESP_OK && er < 180) {
        if (er % 10 == 0) ESP_LOGW(TAG, "ENS160 retry %d", er);
        vTaskDelay(1000);
        er++;
    }
    if (er < 180) {
        ens160_set_pwr_mode(I2C_PORT, ENS160_OPMODE_STANDARD);
        ens160_set_temp_hum(I2C_PORT, 25, 50);
    }

    /* Init LED Matrix (tonight's driver) */
    ESP_LOGI(TAG, "Initializing LED Matrix...");
    esp_err_t ret = led_matrix_init();
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "Failed to init LED Matrix: %d", ret);
        return;
    }
    init_eiceg();
    ESP_LOGI(TAG, "LED Matrix initialized");

    /* NVS 默认配置 (首次烧录后注释掉此行) */
    Write_Nvs_Defaults();

    /* BLE Beacon 初始化 + 启动广播 (纯广播, 不连接) */
    {
        static const BleBeacon_Cfg_t beaconCfg = {
            .uuid = {0xE0, 0xC5, 0xE6, 0xD8, 0x12, 0x34, 0x56, 0x78,
                     0x9A, 0xBC, 0xDE, 0xF0, 0x12, 0x34, 0x56, 0x78},
            .tx_power = (int8_t)0xC5
        };
        esp_err_t bleRet = Ble_Beacon_Init(&beaconCfg);
        if (bleRet != ESP_OK)
        {
            ESP_LOGW(TAG, "BLE Beacon 初始化失败, 继续运行");
        }
        else
        {
            bleRet = Ble_Beacon_Start();
            if (bleRet != ESP_OK)
            {
                ESP_LOGW(TAG, "BLE Beacon 启动失败, 继续运行");
            }
        }
    }

    /* Init LTE MQTT */
    lte_mqtt_init(UART_NUM_2);

    /* Init network & mesh */
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    mesh_init();
    mesh_set_recv_callback(mesh_recv_cb);

    /* Default display config (matches Arduino) */
    g_display_left  = {DIR_LEFT,  0, 1, 0x07E0};
    g_display_mid   = {DIR_ICON,  0, 1, 0x07E0};
    g_display_right = {DIR_RIGHT, 1, 1, 0x07E0};
    g_electricity_flag = true;

    /* Create tasks */
    xTaskCreatePinnedToCore(sensor_task,   "sensor",   4096, NULL, 1, NULL, 1);
    xTaskCreatePinnedToCore(comm_task,     "comm",     8192, NULL, 1, NULL, 1);
    xTaskCreatePinnedToCore(animation_task,"animation", 4096, NULL, 2, NULL, 0);

    ESP_LOGI(TAG, "System ready.");
}