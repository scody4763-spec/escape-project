#ifndef I2S_LCD_DMA_H
#define I2S_LCD_DMA_H

#include <stdint.h>
#include <stdbool.h>
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

#define PANEL_RES_X  32
#define PANEL_RES_Y  64
#define PANEL_CHAIN  3

#define TOTAL_WIDTH  (PANEL_RES_X * PANEL_CHAIN)
#define TOTAL_HEIGHT  PANEL_RES_Y

#define FRAME_BUFFER_SIZE  (TOTAL_WIDTH * TOTAL_HEIGHT)

typedef struct {
    uint16_t mx_width;
    uint16_t mx_height;
    uint8_t  chain_length;
    int8_t   pin_r1;
    int8_t   pin_g1;
    int8_t   pin_b1;
    int8_t   pin_r2;
    int8_t   pin_g2;
    int8_t   pin_b2;
    int8_t   pin_a;
    int8_t   pin_b;
    int8_t   pin_c;
    int8_t   pin_d;
    int8_t   pin_e;
    int8_t   pin_lat;
    int8_t   pin_oe;
    int8_t   pin_clk;
    uint8_t  brightness;
    bool     clk_phase;
    uint32_t clk_speed_hz;
} i2s_lcd_config_t;

typedef struct {
    uint32_t clk_speed_hz;
    uint32_t latch_blanking;
    uint8_t  row_pattern;
} i2s_lcd_status_t;

esp_err_t i2s_lcd_init(const i2s_lcd_config_t *config);
esp_err_t i2s_lcd_deinit(void);
esp_err_t i2s_lcd_set_brightness(uint8_t brightness);
esp_err_t i2s_lcd_clear_screen(void);
esp_err_t i2s_lcd_draw_pixel(int16_t x, int16_t y, uint8_t r, uint8_t g, uint8_t b);
esp_err_t i2s_lcd_draw_bitmap(int16_t x, int16_t y, const uint8_t *bitmap,
                               int16_t w, int16_t h, uint8_t r, uint8_t g, uint8_t b);
esp_err_t i2s_lcd_start_refresh(void);
esp_err_t i2s_lcd_stop_refresh(void);
esp_err_t i2s_lcd_get_status(i2s_lcd_status_t *status);
esp_err_t i2s_lcd_update_from_framebuffer(const uint16_t *framebuffer);
esp_err_t i2s_lcd_swap_framebuffer(void);
uint16_t *i2s_lcd_get_framebuffer(void);

#ifdef __cplusplus
}
#endif

#endif