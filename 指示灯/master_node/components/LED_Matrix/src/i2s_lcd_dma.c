#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/semphr.h"
#include "esp_log.h"
#include "esp_heap_caps.h"
#include "driver/gpio.h"
#include "driver/i2s.h"
#include "driver/periph_ctrl.h"
#include "soc/i2s_reg.h"
#include "soc/i2s_struct.h"
#include "soc/gpio_sig_map.h"
#include "soc/io_mux_reg.h"
#include "hal/gpio_ll.h"
#include "rom/gpio.h"
#include "rom/lldesc.h"
#include "i2s_lcd_dma.h"

static const char *TAG = "i2s_lcd_dma";

#define I2S_NUM             I2S_NUM_0
#define DMA_MAX_DESC        32

#define BIT_R1      (1 << 0)
#define BIT_G1      (1 << 1)
#define BIT_B1      (1 << 2)
#define BIT_R2      (1 << 3)
#define BIT_G2      (1 << 4)
#define BIT_B2      (1 << 5)
#define BIT_LAT     (1 << 6)
#define BIT_OE      (1 << 7)
#define BIT_A       (1 << 8)
#define BIT_B       (1 << 9)
#define BIT_C       (1 << 10)
#define BIT_D       (1 << 11)
#define BIT_E       (1 << 12)

#define BITMASK_RGB   (BIT_R1 | BIT_G1 | BIT_B1 | BIT_R2 | BIT_G2 | BIT_B2)
#define BITMASK_ADDR  (BIT_A | BIT_B | BIT_C | BIT_D | BIT_E)
#define BITMASK_CTRL  (BIT_LAT | BIT_OE)

#define ROW_PAIR_COUNT  32
#define PIXELS_PER_ROW  96
#define BLANK_PIXELS    4

typedef struct {
    uint16_t *buffer_a;
    uint16_t *buffer_b;
    uint16_t *active_buffer;
    uint16_t *draw_buffer;
    lldesc_t  dma_desc[DMA_MAX_DESC];
    SemaphoreHandle_t swap_sem;
    bool      initialized;
    bool      refreshing;
    i2s_lcd_config_t config;
} i2s_lcd_drv_t;

static i2s_lcd_drv_t g_drv = {0};

static void iomux_set_signal(int gpio, int signal)
{
    if (gpio < 0) return;
    PIN_FUNC_SELECT(GPIO_PIN_MUX_REG[gpio], PIN_FUNC_GPIO);
    gpio_set_direction(gpio, GPIO_MODE_DEF_OUTPUT);
    gpio_matrix_out(gpio, signal, false, false);
    gpio_set_drive_capability((gpio_num_t)gpio, (gpio_drive_cap_t)3);
}

/*
 * FM6126A register initialization via GPIO bit-banging.
 * Must be called BEFORE I2S peripheral takes over the GPIO pins.
 * Matches Arduino HUB75 library's fm6124init().
 */
static void fm6126a_init(const i2s_lcd_config_t *config)
{
    ESP_LOGI(TAG, "FM6126A: Initializing shift driver registers...");

    /* REG1: brightness, REG2: enable output */
    bool REG1[16] = {0,0,0,0,0, 1,1,1,1,1,1, 0,0,0,0,0};
    bool REG2[16] = {0,0,0,0,0, 0,0,0,0,1,0, 0,0,0,0,0};

    int pins[] = {config->pin_r1, config->pin_r2, config->pin_g1,
                  config->pin_g2, config->pin_b1, config->pin_b2,
                  config->pin_clk, config->pin_lat, config->pin_oe};
    int num_pins = sizeof(pins) / sizeof(pins[0]);

    /* Configure all pins as GPIO output, LOW */
    for (int i = 0; i < num_pins; i++) {
        PIN_FUNC_SELECT(GPIO_PIN_MUX_REG[pins[i]], PIN_FUNC_GPIO);
        gpio_set_direction(pins[i], GPIO_MODE_OUTPUT);
        gpio_set_level(pins[i], 0);
    }

    /* Disable display (OE high) */
    gpio_set_level(config->pin_oe, 1);

    /* Send REG1 data (brightness) */
    for (int l = 0; l < PIXELS_PER_ROW; l++) {
        bool val = REG1[l % 16];
        gpio_set_level(config->pin_r1, val);
        gpio_set_level(config->pin_r2, val);
        gpio_set_level(config->pin_g1, val);
        gpio_set_level(config->pin_g2, val);
        gpio_set_level(config->pin_b1, val);
        gpio_set_level(config->pin_b2, val);

        if (l > PIXELS_PER_ROW - 12) {
            gpio_set_level(config->pin_lat, 1);
        }
        gpio_set_level(config->pin_clk, 1);
        gpio_set_level(config->pin_clk, 0);
    }
    gpio_set_level(config->pin_lat, 0);

    /* Send REG2 data (enable output) */
    for (int l = 0; l < PIXELS_PER_ROW; l++) {
        bool val = REG2[l % 16];
        gpio_set_level(config->pin_r1, val);
        gpio_set_level(config->pin_r2, val);
        gpio_set_level(config->pin_g1, val);
        gpio_set_level(config->pin_g2, val);
        gpio_set_level(config->pin_b1, val);
        gpio_set_level(config->pin_b2, val);

        if (l > PIXELS_PER_ROW - 13) {
            gpio_set_level(config->pin_lat, 1);
        }
        gpio_set_level(config->pin_clk, 1);
        gpio_set_level(config->pin_clk, 0);
    }
    gpio_set_level(config->pin_lat, 0);

    /* Clear shift registers */
    gpio_set_level(config->pin_r1, 0);
    gpio_set_level(config->pin_r2, 0);
    gpio_set_level(config->pin_g1, 0);
    gpio_set_level(config->pin_g2, 0);
    gpio_set_level(config->pin_b1, 0);
    gpio_set_level(config->pin_b2, 0);
    for (int l = 0; l < PIXELS_PER_ROW; l++) {
        gpio_set_level(config->pin_clk, 1);
        gpio_set_level(config->pin_clk, 0);
    }

    /* Latch and enable display */
    gpio_set_level(config->pin_lat, 1);
    gpio_set_level(config->pin_clk, 1);
    gpio_set_level(config->pin_clk, 0);
    gpio_set_level(config->pin_lat, 0);
    gpio_set_level(config->pin_oe, 0);
    gpio_set_level(config->pin_clk, 1);
    gpio_set_level(config->pin_clk, 0);

    ESP_LOGI(TAG, "FM6126A: Registers initialized");
}

static void build_row_bitplane(uint16_t *row_data, int row_addr,
                                const uint16_t *fb_top, const uint16_t *fb_bot)
{
    uint16_t addr_bits = 0;
    if (row_addr & 0x01) addr_bits |= BIT_A;
    if (row_addr & 0x02) addr_bits |= BIT_B;
    if (row_addr & 0x04) addr_bits |= BIT_C;
    if (row_addr & 0x08) addr_bits |= BIT_D;
    if (row_addr & 0x10) addr_bits |= BIT_E;

    uint16_t base = addr_bits | BIT_OE;

    for (int x = 0; x < PIXELS_PER_ROW; x++) {
        uint16_t word = base;

        /* Compensate for I2S Tx FIFO mode1 byte reordering (matches Arduino HUB75 lib) */
        int x_read = (x & 1) ? (x - 1) : (x + 1);
        if (x_read >= PIXELS_PER_ROW) x_read = x;

        uint16_t top_color = fb_top[x_read];
        uint16_t bot_color = fb_bot[x_read];

        if (top_color & 0xF800) word |= BIT_R1;
        if (top_color & 0x07E0) word |= BIT_G1;
        if (top_color & 0x001F) word |= BIT_B1;

        if (bot_color & 0xF800) word |= BIT_R2;
        if (bot_color & 0x07E0) word |= BIT_G2;
        if (bot_color & 0x001F) word |= BIT_B2;

        if (x >= BLANK_PIXELS && x < (PIXELS_PER_ROW - BLANK_PIXELS)) {
            word &= ~BIT_OE;
        }

        row_data[x] = word;
    }

    row_data[PIXELS_PER_ROW - 2] |= BIT_LAT;
    row_data[PIXELS_PER_ROW - 1] |= BIT_LAT;
}

static void rebuild_all_bitplanes(uint16_t *buf, const uint16_t *framebuffer)
{
    for (int row = 0; row < ROW_PAIR_COUNT; row++) {
        uint16_t *row_data = &buf[row * PIXELS_PER_ROW];
        const uint16_t *fb_top = &framebuffer[row * PIXELS_PER_ROW];
        const uint16_t *fb_bot = &framebuffer[(row + ROW_PAIR_COUNT) * PIXELS_PER_ROW];
        build_row_bitplane(row_data, row, fb_top, fb_bot);
    }
}

esp_err_t i2s_lcd_init(const i2s_lcd_config_t *config)
{
    if (g_drv.initialized) {
        return ESP_ERR_INVALID_STATE;
    }

    memcpy(&g_drv.config, config, sizeof(i2s_lcd_config_t));
    g_drv.config.mx_width = TOTAL_WIDTH;
    g_drv.config.mx_height = TOTAL_HEIGHT;

    size_t buf_size = ROW_PAIR_COUNT * PIXELS_PER_ROW * sizeof(uint16_t);
    g_drv.buffer_a = (uint16_t *)heap_caps_malloc(buf_size, MALLOC_CAP_DMA);
    g_drv.buffer_b = (uint16_t *)heap_caps_malloc(buf_size, MALLOC_CAP_DMA);

    if (!g_drv.buffer_a || !g_drv.buffer_b) {
        ESP_LOGE(TAG, "Failed to allocate DMA buffers");
        if (g_drv.buffer_a) free(g_drv.buffer_a);
        if (g_drv.buffer_b) free(g_drv.buffer_b);
        return ESP_ERR_NO_MEM;
    }

    memset(g_drv.buffer_a, 0, buf_size);
    memset(g_drv.buffer_b, 0, buf_size);

    g_drv.active_buffer = g_drv.buffer_a;
    g_drv.draw_buffer = g_drv.buffer_b;

    g_drv.swap_sem = xSemaphoreCreateBinary();
    if (!g_drv.swap_sem) {
        free(g_drv.buffer_a);
        free(g_drv.buffer_b);
        return ESP_ERR_NO_MEM;
    }
    xSemaphoreGive(g_drv.swap_sem);

    /* Initialize FM6126A shift driver registers via GPIO bit-bang (BEFORE I2S takes over pins) */
    fm6126a_init(config);

    /* Reset and enable I2S0 peripheral (matches Arduino library) */
    periph_module_reset(PERIPH_I2S0_MODULE);
    periph_module_enable(PERIPH_I2S0_MODULE);

    gpio_num_t clk_pin = (gpio_num_t)config->pin_clk;
    PIN_FUNC_SELECT(GPIO_PIN_MUX_REG[clk_pin], PIN_FUNC_GPIO);
    gpio_set_direction(clk_pin, GPIO_MODE_DEF_OUTPUT);
    gpio_matrix_out(clk_pin, I2S0O_WS_OUT_IDX, false, false);
    gpio_set_drive_capability(clk_pin, (gpio_drive_cap_t)3);

    iomux_set_signal(config->pin_r1,  I2S0O_DATA_OUT8_IDX);
    iomux_set_signal(config->pin_g1,  I2S0O_DATA_OUT9_IDX);
    iomux_set_signal(config->pin_b1,  I2S0O_DATA_OUT10_IDX);
    iomux_set_signal(config->pin_r2,  I2S0O_DATA_OUT11_IDX);
    iomux_set_signal(config->pin_g2,  I2S0O_DATA_OUT12_IDX);
    iomux_set_signal(config->pin_b2,  I2S0O_DATA_OUT13_IDX);
    iomux_set_signal(config->pin_lat, I2S0O_DATA_OUT14_IDX);
    iomux_set_signal(config->pin_oe,  I2S0O_DATA_OUT15_IDX);
    iomux_set_signal(config->pin_a,   I2S0O_DATA_OUT16_IDX);
    iomux_set_signal(config->pin_b,   I2S0O_DATA_OUT17_IDX);
    iomux_set_signal(config->pin_c,   I2S0O_DATA_OUT18_IDX);
    iomux_set_signal(config->pin_d,   I2S0O_DATA_OUT19_IDX);
    iomux_set_signal(config->pin_e,   I2S0O_DATA_OUT20_IDX);

    I2S0.conf.val = 0;
    I2S0.conf.tx_reset = 1;
    I2S0.conf.tx_reset = 0;
    I2S0.conf.tx_fifo_reset = 1;
    I2S0.conf.tx_fifo_reset = 0;

    I2S0.conf2.lcd_en = 1;
    I2S0.conf2.lcd_tx_wrx2_en = 0;
    I2S0.conf2.lcd_tx_sdx2_en = 0;
    I2S0.conf2.camera_en = 0;

    I2S0.conf.tx_slave_mod = 0;
    I2S0.conf.tx_mono = 0;
    I2S0.conf.tx_short_sync = 0;

    I2S0.fifo_conf.tx_fifo_mod = 1;
    I2S0.fifo_conf.rx_fifo_mod_force_en = 1;
    I2S0.fifo_conf.tx_fifo_mod_force_en = 1;
    I2S0.fifo_conf.tx_data_num = 32;
    I2S0.fifo_conf.dscr_en = 1;

    I2S0.sample_rate_conf.tx_bck_div_num = 2;
    I2S0.sample_rate_conf.tx_bits_mod = 16;

    I2S0.clkm_conf.clka_en = 0;
    I2S0.clkm_conf.clk_en = 1;

    uint32_t clk_speed = config->clk_speed_hz;
    if (clk_speed == 0) clk_speed = 10000000;
    int div_num = 80000000 / clk_speed;
    if (div_num < 2) div_num = 2;
    if (div_num > 255) div_num = 255;
    I2S0.clkm_conf.clkm_div_num = div_num;

    I2S0.lc_conf.val = 0;
    I2S0.lc_conf.out_rst = 1;
    I2S0.lc_conf.out_rst = 0;
    I2S0.lc_conf.ahbm_rst = 1;
    I2S0.lc_conf.ahbm_rst = 0;
    I2S0.lc_conf.outdscr_burst_en = 1;
    I2S0.lc_conf.out_data_burst_en = 1;

    I2S0.conf1.tx_pcm_conf = 0;
    I2S0.conf1.tx_pcm_bypass = 0;
    I2S0.conf1.tx_stop_en = 0;

    I2S0.conf_chan.tx_chan_mod = 1;
    I2S0.conf_chan.rx_chan_mod = 1;

    I2S0.timing.val = 0;

    for (int i = 0; i < DMA_MAX_DESC; i++) {
        g_drv.dma_desc[i].eof = 0;
        g_drv.dma_desc[i].sosf = 0;
        g_drv.dma_desc[i].owner = 1;
        g_drv.dma_desc[i].qe.stqe_next = &g_drv.dma_desc[(i + 1) % DMA_MAX_DESC];
        g_drv.dma_desc[i].offset = 0;
        g_drv.dma_desc[i].size = PIXELS_PER_ROW * sizeof(uint16_t);
        g_drv.dma_desc[i].length = PIXELS_PER_ROW * sizeof(uint16_t);
        g_drv.dma_desc[i].buf = (uint8_t *)&g_drv.active_buffer[i * PIXELS_PER_ROW];
    }
    g_drv.dma_desc[DMA_MAX_DESC - 1].qe.stqe_next = &g_drv.dma_desc[0];

    g_drv.initialized = true;
    ESP_LOGI(TAG, "I2S LCD DMA initialized: %dx%d, clk_div=%d",
             TOTAL_WIDTH, TOTAL_HEIGHT, div_num);

    return ESP_OK;
}

esp_err_t i2s_lcd_deinit(void)
{
    if (!g_drv.initialized) return ESP_ERR_INVALID_STATE;

    i2s_lcd_stop_refresh();

    I2S0.conf.tx_reset = 1;
    I2S0.conf.tx_reset = 0;

    if (g_drv.buffer_a) free(g_drv.buffer_a);
    if (g_drv.buffer_b) free(g_drv.buffer_b);
    if (g_drv.swap_sem) vSemaphoreDelete(g_drv.swap_sem);

    memset(&g_drv, 0, sizeof(g_drv));
    return ESP_OK;
}

esp_err_t i2s_lcd_set_brightness(uint8_t brightness)
{
    if (!g_drv.initialized) return ESP_ERR_INVALID_STATE;
    g_drv.config.brightness = brightness;
    return ESP_OK;
}

esp_err_t i2s_lcd_clear_screen(void)
{
    if (!g_drv.initialized) return ESP_ERR_INVALID_STATE;

    if (xSemaphoreTake(g_drv.swap_sem, pdMS_TO_TICKS(100)) == pdTRUE) {
        size_t buf_size = ROW_PAIR_COUNT * PIXELS_PER_ROW * sizeof(uint16_t);
        memset(g_drv.draw_buffer, 0, buf_size);

        uint16_t *tmp = g_drv.active_buffer;
        g_drv.active_buffer = g_drv.draw_buffer;
        g_drv.draw_buffer = tmp;

        for (int i = 0; i < DMA_MAX_DESC; i++) {
            g_drv.dma_desc[i].buf = (uint8_t *)&g_drv.active_buffer[i * PIXELS_PER_ROW];
        }

        xSemaphoreGive(g_drv.swap_sem);
    }

    return ESP_OK;
}

esp_err_t i2s_lcd_draw_pixel(int16_t x, int16_t y, uint8_t r, uint8_t g, uint8_t b)
{
    return ESP_ERR_NOT_SUPPORTED;
}

esp_err_t i2s_lcd_draw_bitmap(int16_t x, int16_t y, const uint8_t *bitmap,
                               int16_t w, int16_t h, uint8_t r, uint8_t g, uint8_t b)
{
    return ESP_ERR_NOT_SUPPORTED;
}

esp_err_t i2s_lcd_start_refresh(void)
{
    if (!g_drv.initialized) return ESP_ERR_INVALID_STATE;
    if (g_drv.refreshing) return ESP_OK;

    I2S0.out_link.stop = 1;
    I2S0.out_link.start = 0;
    I2S0.conf.tx_start = 0;

    I2S0.out_link.addr = (uint32_t)&g_drv.dma_desc[0];
    I2S0.out_link.stop = 0;
    I2S0.out_link.start = 1;
    I2S0.conf.tx_start = 1;

    g_drv.refreshing = true;
    return ESP_OK;
}

esp_err_t i2s_lcd_stop_refresh(void)
{
    if (!g_drv.initialized || !g_drv.refreshing) return ESP_OK;

    I2S0.out_link.stop = 1;
    I2S0.out_link.start = 0;
    I2S0.conf.tx_start = 0;
    g_drv.refreshing = false;
    return ESP_OK;
}

esp_err_t i2s_lcd_get_status(i2s_lcd_status_t *status)
{
    if (!g_drv.initialized || !status) return ESP_ERR_INVALID_ARG;
    status->clk_speed_hz = 80000000 / I2S0.clkm_conf.clkm_div_num;
    status->latch_blanking = BLANK_PIXELS;
    status->row_pattern = 0;
    return ESP_OK;
}

uint16_t *i2s_lcd_get_framebuffer(void)
{
    return g_drv.draw_buffer;
}

esp_err_t i2s_lcd_swap_framebuffer(void)
{
    if (!g_drv.initialized) return ESP_ERR_INVALID_STATE;

    if (xSemaphoreTake(g_drv.swap_sem, pdMS_TO_TICKS(100)) == pdTRUE) {
        uint16_t *tmp = g_drv.active_buffer;
        g_drv.active_buffer = g_drv.draw_buffer;
        g_drv.draw_buffer = tmp;

        for (int i = 0; i < DMA_MAX_DESC; i++) {
            g_drv.dma_desc[i].buf = (uint8_t *)&g_drv.active_buffer[i * PIXELS_PER_ROW];
        }

        xSemaphoreGive(g_drv.swap_sem);
    }

    return ESP_OK;
}

esp_err_t i2s_lcd_update_from_framebuffer(const uint16_t *framebuffer)
{
    if (!g_drv.initialized || !framebuffer) return ESP_ERR_INVALID_ARG;

    if (xSemaphoreTake(g_drv.swap_sem, pdMS_TO_TICKS(100)) == pdTRUE) {
        rebuild_all_bitplanes(g_drv.draw_buffer, framebuffer);

        uint16_t *tmp = g_drv.active_buffer;
        g_drv.active_buffer = g_drv.draw_buffer;
        g_drv.draw_buffer = tmp;

        for (int i = 0; i < DMA_MAX_DESC; i++) {
            g_drv.dma_desc[i].buf = (uint8_t *)&g_drv.active_buffer[i * PIXELS_PER_ROW];
        }

        xSemaphoreGive(g_drv.swap_sem);
    }

    return ESP_OK;
}