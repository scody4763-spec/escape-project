#include "mqtt.h"
#include "esp_log.h"
#include "mqtt_client.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include <string.h>

static const char *TAG = "MQTT";

static esp_mqtt_client_handle_t Mqtt_Client   = NULL;
static bool                     Mqtt_Connected = false;


void Mqtt_Subscribe(const char *topic)
{
    esp_mqtt_client_subscribe(Mqtt_Client, topic, 1);
}

static void Mqtt_Event_Handler(void *arg, esp_event_base_t base,
                                int32_t event_id, void *event_data)
{
    esp_mqtt_event_handle_t event = (esp_mqtt_event_handle_t)event_data;

    switch (event_id)
    {
        case MQTT_EVENT_CONNECTED:
            ESP_LOGI(TAG, "MQTT connected to broker");
            Mqtt_Connected = true;
			// 订阅主题
			Mqtt_Subscribe(MQTT_PUBLISH_TOPIC);

            break;

        case MQTT_EVENT_DISCONNECTED:
            ESP_LOGW(TAG, "MQTT disconnected, retrying in 5s...");
            Mqtt_Connected = false;
            vTaskDelay(pdMS_TO_TICKS(5000));
            esp_mqtt_client_reconnect(Mqtt_Client);
            break;

        case MQTT_EVENT_PUBLISHED:
            ESP_LOGD(TAG, "Publish ack, msg_id=%d", event->msg_id);
            break;

        case MQTT_EVENT_DATA:
            ESP_LOGI(TAG, "Received topic: %.*s, data: %.*s",
                     event->topic_len, event->topic,
                     event->data_len, event->data);
            break;

        case MQTT_EVENT_ERROR:
            ESP_LOGE(TAG, "MQTT error");
            break;

        default:
            break;
    }
}

void Mqtt_Init(void)
{
    ESP_LOGI(TAG, "Initializing MQTT client, broker: %s:%d",
             MQTT_BROKER_HOST, MQTT_BROKER_PORT);

	esp_mqtt_client_config_t mqtt_cfg = {
		.broker.address.hostname  = MQTT_BROKER_HOST,
		.broker.address.port      = MQTT_BROKER_PORT,
		.broker.address.transport = MQTT_TRANSPORT_OVER_TCP,
		.credentials.username     = MQTT_USERNAME,
		.credentials.authentication.password = MQTT_PASSWORD,
	};


    Mqtt_Client = esp_mqtt_client_init(&mqtt_cfg);
    if (Mqtt_Client == NULL)
    {
        ESP_LOGE(TAG, "Failed to init MQTT client");
        return;
    }

    ESP_ERROR_CHECK(esp_mqtt_client_register_event(Mqtt_Client, ESP_EVENT_ANY_ID,
                                                    Mqtt_Event_Handler, NULL));
    ESP_ERROR_CHECK(esp_mqtt_client_start(Mqtt_Client));
}

bool Mqtt_Is_Connected(void)
{
    return Mqtt_Connected;
}

esp_err_t Mqtt_Publish(const char *topic, const char *data, int len)
{
    if (Mqtt_Client == NULL)
    {
        ESP_LOGE(TAG, "MQTT client not initialized");
        return ESP_FAIL;
    }
    if (len == 0)
    {
        len = strlen(data);
    }

    int msg_id = esp_mqtt_client_publish(Mqtt_Client, topic, data, len, 1, 0);
    if (msg_id < 0)
    {
        ESP_LOGE(TAG, "Publish failed, topic: %s", topic);
        return ESP_FAIL;
    }
    ESP_LOGI(TAG, "Published to [%s], msg_id=%d", topic, msg_id);
    return ESP_OK;
}