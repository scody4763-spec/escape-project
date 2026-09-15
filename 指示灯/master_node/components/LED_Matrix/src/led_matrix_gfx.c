#include <string.h>
#include "esp_heap_caps.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "led_matrix_gfx.h"
#include "i2s_lcd_dma.h"

/* Double buffering: g_active_fb for DMA reads, g_draw_fb for drawing */
static uint16_t *g_active_fb = NULL;
static uint16_t *g_draw_fb = NULL;
static SemaphoreHandle_t g_fb_mutex = NULL;

esp_err_t led_matrix_init(void)
{
    if (g_active_fb) return ESP_OK;

    g_active_fb = (uint16_t *)heap_caps_malloc(
        FRAME_BUFFER_SIZE * sizeof(uint16_t), MALLOC_CAP_DMA | MALLOC_CAP_8BIT);
    g_draw_fb = (uint16_t *)heap_caps_malloc(
        FRAME_BUFFER_SIZE * sizeof(uint16_t), MALLOC_CAP_DMA | MALLOC_CAP_8BIT);
    if (!g_active_fb || !g_draw_fb) {
        if (g_active_fb) free(g_active_fb);
        if (g_draw_fb) free(g_draw_fb);
        return ESP_ERR_NO_MEM;
    }

    memset(g_active_fb, 0, FRAME_BUFFER_SIZE * sizeof(uint16_t));
    memset(g_draw_fb, 0, FRAME_BUFFER_SIZE * sizeof(uint16_t));

    g_fb_mutex = xSemaphoreCreateMutex();
    if (!g_fb_mutex) {
        free(g_active_fb);
        free(g_draw_fb);
        g_active_fb = NULL;
        g_draw_fb = NULL;
        return ESP_ERR_NO_MEM;
    }

    return ESP_OK;
}

void led_matrix_deinit(void)
{
    if (g_fb_mutex) {
        vSemaphoreDelete(g_fb_mutex);
        g_fb_mutex = NULL;
    }
    if (g_active_fb) {
        free(g_active_fb);
        g_active_fb = NULL;
    }
    if (g_draw_fb) {
        free(g_draw_fb);
        g_draw_fb = NULL;
    }
}

void led_matrix_set_pixel(int16_t x, int16_t y, uint16_t color)
{
    if (!g_draw_fb) return;
    if (x < 0 || x >= TOTAL_WIDTH || y < 0 || y >= TOTAL_HEIGHT) return;

    g_draw_fb[y * TOTAL_WIDTH + x] = color;
}

void led_matrix_fill_screen(uint16_t color)
{
    if (!g_draw_fb) return;

    for (int i = 0; i < FRAME_BUFFER_SIZE; i++) {
        g_draw_fb[i] = color;
    }
}

void led_matrix_draw_bitmap(int16_t x, int16_t y, const uint8_t *bitmap,
                             int16_t w, int16_t h, uint16_t color, uint16_t bg_color)
{
    if (!g_draw_fb || !bitmap) return;

    for (int16_t row = 0; row < h; row++) {
        for (int16_t col = 0; col < w; col++) {
            int16_t px = x + col;
            int16_t py = y + row;
            if (px < 0 || px >= TOTAL_WIDTH || py < 0 || py >= TOTAL_HEIGHT) continue;

            uint8_t byte_val = bitmap[row * (w / 8) + (col / 8)];
            uint8_t bit_val = (byte_val >> (7 - (col % 8))) & 0x01;

            g_draw_fb[py * TOTAL_WIDTH + px] = bit_val ? color : bg_color;
        }
    }
}

void led_matrix_show(void)
{
    if (!g_draw_fb || !g_active_fb) return;

    /* Swap draw and active buffers */
    if (xSemaphoreTake(g_fb_mutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        uint16_t *tmp = g_active_fb;
        g_active_fb = g_draw_fb;
        g_draw_fb = tmp;

        /* Update DMA from the new active buffer */
        i2s_lcd_update_from_framebuffer(g_active_fb);

        xSemaphoreGive(g_fb_mutex);
    }
}

void led_matrix_clear(void)
{
    led_matrix_fill_screen(COLOR_BLACK);
}

uint16_t led_matrix_color(uint8_t r, uint8_t g, uint8_t b)
{
    return ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
}

uint16_t *led_matrix_get_framebuffer(void)
{
    return g_draw_fb;
}

SemaphoreHandle_t led_matrix_get_mutex(void)
{
    return g_fb_mutex;
}
