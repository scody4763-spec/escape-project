#ifndef __MQTT_H__
#define __MQTT_H__

#include "esp_err.h"
#include <stdbool.h>

#define MQTT_BROKER_HOST        	"42.193.218.29"
#define MQTT_BROKER_PORT        	1883
#define MQTT_PUBLISH_TOPIC      	"ceiling_light/data"
#define MQTT_PUBLISH_INTERVAL_MS 	10000
#define MQTT_USERNAME            	"ceiling_light"
#define MQTT_PASSWORD            	"ceiling_light"

void     Mqtt_Init(void);
bool     Mqtt_Is_Connected(void);
esp_err_t Mqtt_Publish(const char *topic, const char *data, int len);

#endif