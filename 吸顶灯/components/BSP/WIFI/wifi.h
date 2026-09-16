#ifndef __WIFI_H__
#define __WIFI_H__

#include "esp_err.h"
#include <stdbool.h>

#define WIFI_SSID               "HW666"
#define WIFI_PASSWORD           "ADajLP691TY."
#define WIFI_MAX_RETRY_COUNT    10

void Wifi_Init(void);
bool Wifi_Is_Connected(void);
int  Wifi_Get_Rssi(void);

#endif