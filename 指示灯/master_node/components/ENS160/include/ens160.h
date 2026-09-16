#pragma once

#include <stdint.h>
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

#define ENS160_ADDR          0x53
#define ENS160_PART_ID       0x0160

#define ENS160_OPMODE_SLEEP      0x00
#define ENS160_OPMODE_IDLE       0x01
#define ENS160_OPMODE_STANDARD   0x02

esp_err_t ens160_init(int i2c_port);
esp_err_t ens160_set_pwr_mode(int i2c_port, uint8_t mode);
esp_err_t ens160_set_temp_hum(int i2c_port, float temp, float hum);
uint8_t  ens160_get_status(int i2c_port);
uint8_t  ens160_get_aqi(int i2c_port);
uint16_t ens160_get_tvoc(int i2c_port);
uint16_t ens160_get_eco2(int i2c_port);

#ifdef __cplusplus
}
#endif