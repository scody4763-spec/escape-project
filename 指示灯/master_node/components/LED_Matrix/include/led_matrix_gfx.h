#ifndef LED_MATRIX_GFX_H
#define LED_MATRIX_GFX_H

#include <stdint.h>
#include <stdbool.h>
#include "esp_err.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"

#ifdef __cplusplus
extern "C" {
#endif

#define COLOR_BLACK    0x0000
#define COLOR_RED      0xF800
#define COLOR_GREEN    0x07E0
#define COLOR_BLUE     0x001F
#define COLOR_WHITE    0xFFFF
#define COLOR_YELLOW   0xFFE0
#define COLOR_CYAN     0x07FF
#define COLOR_MAGENTA  0xF81F

esp_err_t led_matrix_init(void);
void led_matrix_deinit(void);
void led_matrix_set_pixel(int16_t x, int16_t y, uint16_t color);
void led_matrix_fill_screen(uint16_t color);
void led_matrix_draw_bitmap(int16_t x, int16_t y, const uint8_t *bitmap,
                             int16_t w, int16_t h, uint16_t color, uint16_t bg_color);
void led_matrix_show(void);
void led_matrix_clear(void);
uint16_t led_matrix_color(uint8_t r, uint8_t g, uint8_t b);
uint16_t *led_matrix_get_framebuffer(void);
SemaphoreHandle_t led_matrix_get_mutex(void);

#ifdef __cplusplus
}
#endif

#endif