#pragma once

#include <stdint.h>
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

esp_err_t lte_mqtt_init(int uart_port);
esp_err_t lte_mqtt_send_data(const char *json_data);
esp_err_t lte_mqtt_receive_line(char *buf, size_t max_len, int timeout_ms);
int lte_mqtt_data_available(void);

#ifdef __cplusplus
}
#endif
