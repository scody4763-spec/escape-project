#pragma once

#include <stdint.h>
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

#define MESH_DATA_LEN       512
#define MESH_SEND_INTERVAL  2

typedef void (*mesh_recv_cb_t)(uint32_t from, const char *msg);

esp_err_t mesh_init(void);
esp_err_t mesh_send_broadcast(const char *data);
esp_err_t mesh_set_recv_callback(mesh_recv_cb_t cb);
esp_err_t mesh_inject_data(const char *data);
void mesh_update(void);

/* Mesh 外部消息常量 */
extern const char *FLAME_MESH_START;
extern const char *FLAME_MESH_STOP;

#ifdef __cplusplus
}
#endif
