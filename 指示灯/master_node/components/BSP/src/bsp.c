#include "bsp.h"
#include "esp_log.h"
#include "esp_mac.h"

static const char *TAG = "BSP";

display_channel_t g_display_left   = { .direction = DIR_LEFT,  .dynamic_static = 0, .enabled = 1, .color = 0x07E0 };
display_channel_t g_display_mid    = { .direction = DIR_ICON,  .dynamic_static = 0, .enabled = 1, .color = 0x07E0 };
display_channel_t g_display_right  = { .direction = DIR_RIGHT, .dynamic_static = 1, .enabled = 1, .color = 0x07E0 };
sensor_data_t     g_sensor         = { 0 };
int g_electricity_raw = 0;
bool g_electricity_current_enabled = true;
bool g_electricity_flag = true;
uint8_t g_buzzer_flag = BUZZER_OFF;
bool g_esp32_fires_flag = 0;
bool g_esp32_electricity_flag = 0;
bool g_electricity_present = false;
int g_scanning = 0;
uint8_t g_silky_left = 0;
uint8_t g_silky_mid = 0;
uint8_t g_silky_right = 0;
char g_mac_str[18] = { 0 };

void bsp_init(void)
{
    /* Configure PWM pin (LEDC) */
    ledc_timer_config_t ledc_timer = {
        .duty_resolution = LEDC_TIMER_10_BIT,
        .freq_hz = 5000,
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .timer_num = LEDC_TIMER_0,
        .clk_cfg = LEDC_AUTO_CLK
    };
    ESP_ERROR_CHECK(ledc_timer_config(&ledc_timer));

    ledc_channel_config_t ledc_ch = {
        .channel = LEDC_CHANNEL_0,
        .duty = 0,
        .gpio_num = PIN_PWM,
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .hpoint = 0,
        .timer_sel = LEDC_TIMER_0
    };
    ESP_ERROR_CHECK(ledc_channel_config(&ledc_ch));

    /* Configure buzzer pin */
    gpio_config_t io_conf = {
        .pin_bit_mask = (1ULL << PIN_BUZZER),
        .mode = GPIO_MODE_OUTPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE
    };
    gpio_config(&io_conf);
    gpio_set_level(PIN_BUZZER, 0);

    /* Configure ADC for power monitoring */
    adc1_config_width(ADC_WIDTH_BIT_12);
    adc1_config_channel_atten(ADC1_CHANNEL_0, ADC_ATTEN_DB_11);

    /* Read MAC address */
    uint8_t mac[6];
    esp_read_mac(mac, ESP_MAC_WIFI_STA);
    sprintf(g_mac_str, "%02X:%02X:%02X:%02X:%02X:%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);

    ESP_LOGI(TAG, "BSP initialized. MAC: %s", g_mac_str);
}

void bsp_buzzer_on(void)
{
    gpio_set_level(PIN_BUZZER, 1);
}

void bsp_buzzer_off(void)
{
    gpio_set_level(PIN_BUZZER, 0);
}

void bsp_buzzer_start_alarms(void)
{
    g_buzzer_flag = BUZZER_ON;
}

void bsp_buzzer_stop_alarms(void)
{
    g_buzzer_flag = BUZZER_OFF;
    gpio_set_level(PIN_BUZZER, 0);
}

void bsp_pwm_set(uint16_t duty)
{
    if (duty > 1023) duty = 1023;
    ESP_ERROR_CHECK(ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, duty));
    ESP_ERROR_CHECK(ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0));
}

void bsp_start_alarms(void)
{
    g_esp32_fires_flag = 1;
    bsp_buzzer_start_alarms();
    g_display_left.dynamic_static = 1;
    g_display_mid.dynamic_static = 1;
    g_display_right.dynamic_static = 1;
    bsp_pwm_set(500);
}

void bsp_stop_alarms(void)
{
    g_esp32_fires_flag = 0;
    bsp_buzzer_stop_alarms();
    if (g_display_left.dynamic_static == 1)  g_silky_left = 1;
    if (g_display_mid.dynamic_static == 1)   g_silky_mid = 1;
    if (g_display_right.dynamic_static == 1) g_silky_right = 1;
    g_display_left.dynamic_static = 0;
    g_display_mid.dynamic_static = 0;
    g_display_right.dynamic_static = 0;
    bsp_pwm_set(0);
}

void bsp_electricity_start_alarms(void)
{
    g_esp32_electricity_flag = 1;
    bsp_buzzer_start_alarms();
    g_display_left.dynamic_static = 1;
    g_display_mid.dynamic_static = 1;
    g_display_right.dynamic_static = 1;
    bsp_pwm_set(250);
}

void bsp_electricity_stop_alarms(void)
{
    g_esp32_electricity_flag = 0;
    bsp_buzzer_stop_alarms();
    if (g_display_left.dynamic_static == 1)  g_silky_left = 1;
    if (g_display_mid.dynamic_static == 1)   g_silky_mid = 1;
    if (g_display_right.dynamic_static == 1) g_silky_right = 1;
    g_display_left.dynamic_static = 0;
    g_display_mid.dynamic_static = 0;
    g_display_right.dynamic_static = 0;
    bsp_pwm_set(0);
}

bool bsp_check_power(void)
{
    int sum = 0;
    for (int i = 0; i < 8; i++) {
        sum += adc1_get_raw(ADC1_CHANNEL_0);
    }
    g_electricity_raw = sum / 8;
    g_electricity_present = (sum / 8) > 300;
    return g_electricity_present;
}

