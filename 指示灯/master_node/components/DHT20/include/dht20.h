#pragma once

#include <stdint.h>
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

#define DHT20_ADDR          0x38
#define DHT20_CMD_TRIGGER   0xAC
#define DHT20_CMD_STATUS    0x71
#define DHT20_CMD_INIT      0xBE
#define DHT20_CMD_RESET     0xBA

esp_err_t dht20_init(int i2c_port);
esp_err_t dht20_read_data(int i2c_port, float *temperature, float *humidity);

#ifdef __cplusplus
}
#endif
