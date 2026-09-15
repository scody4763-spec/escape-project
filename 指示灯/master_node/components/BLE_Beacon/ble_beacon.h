#ifndef BLE_BEACON_H
#define BLE_BEACON_H

#include <stdint.h>
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

#define BLE_BEACON_UUID_LEN         16
#define BLE_BEACON_ADV_DATA_LEN     30
#define BLE_BEACON_ADV_INTERVAL_MS  300

typedef struct {
    uint8_t uuid[BLE_BEACON_UUID_LEN];
    int8_t  tx_power;
} BleBeacon_Cfg_t;

esp_err_t Ble_Beacon_Init(const BleBeacon_Cfg_t *cfg);
esp_err_t Ble_Beacon_Start(void);
esp_err_t Ble_Beacon_Stop(void);
esp_err_t Ble_Beacon_Write_Nvs(int16_t major, int16_t minor);

#ifdef __cplusplus
}
#endif

#endif /* BLE_BEACON_H */