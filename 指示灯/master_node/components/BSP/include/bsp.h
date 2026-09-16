#pragma once

#include <stdint.h>
#include <stdbool.h>
#include "driver/gpio.h"
#include "driver/ledc.h"
#include "driver/adc.h"

#ifdef __cplusplus
extern "C" {
#endif

#define PIN_PWM             33
#define PIN_BUZZER          16
#define PIN_ELECTRICITY     36

#define MQTT_SEND_INTERVAL  10

#define DIR_LEFT     1
#define DIR_RIGHT    2
#define DIR_DOWN     3
#define DIR_UP       4
#define DIR_ICON     5
#define DIR_STYLE    6

#define BUZZER_OFF   1
#define BUZZER_ON    2

typedef struct {
    uint8_t  status;
    uint8_t  aqi;
    uint16_t tvoc;
    uint16_t eco2;
    float    temperature;
    float    humidity;
} sensor_data_t;

typedef struct {
    uint8_t direction;
    uint8_t dynamic_static;
    uint8_t enabled;
    uint32_t color;
} display_channel_t;

extern display_channel_t g_display_left;
extern display_channel_t g_display_mid;
extern display_channel_t g_display_right;
extern sensor_data_t     g_sensor;
extern int g_electricity_raw;
extern bool g_electricity_current_enabled;
extern bool g_electricity_flag;
extern uint8_t g_buzzer_flag;
extern bool g_esp32_fires_flag;
extern bool g_esp32_electricity_flag;
extern bool g_electricity_present;
extern int g_scanning;
extern uint8_t g_silky_left;
extern uint8_t g_silky_mid;
extern uint8_t g_silky_right;
extern char g_mac_str[18];

void bsp_init(void);
void bsp_buzzer_on(void);
void bsp_buzzer_off(void);
void bsp_buzzer_start_alarms(void);
void bsp_buzzer_stop_alarms(void);
void bsp_pwm_set(uint16_t duty);
void bsp_start_alarms(void);
void bsp_stop_alarms(void);
void bsp_electricity_start_alarms(void);
void bsp_electricity_stop_alarms(void);
bool bsp_check_power(void);

#ifdef __cplusplus
}
#endif
