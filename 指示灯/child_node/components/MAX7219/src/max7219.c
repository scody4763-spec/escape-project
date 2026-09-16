#include "max7219.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"

static const char *TAG = "MAX7219";

/* 7-segment font (a=bit0, b=bit1, ..., g=bit6, dp=bit7) */
static const uint8_t font[] = {
    0x3F, /* 0 */  0x06, /* 1 */  0x5B, /* 2 */  0x4F, /* 3 */
    0x66, /* 4 */  0x6D, /* 5 */  0x7D, /* 6 */  0x07, /* 7 */
    0x7F, /* 8 */  0x6F, /* 9 */  0x77, /* A */  0x7C, /* b */
    0x39, /* C */  0x5E, /* d */  0x79, /* E */  0x71, /* F */
    0x3D, /* G */  0x76, /* H */  0x30, /* I */  0x1E, /* J */
    0x75, /* K */  0x38, /* L */  0x15, /* M */  0x54, /* n */
    0x5C, /* o */  0x73, /* P */  0x67, /* q */  0x50, /* r */
    0x6D, /* S */  0x78, /* t */  0x3E, /* U */  0x1C, /* v */
    0x2A, /* W */  0x76, /* H */  0x49, /* X */  0x6E, /* Y */
    0x5B, /* Z */  0x40, /* - */  0x80, /* . (dot) */
};

/* Pulse CS to load data into the MAX7219 */
static void max7219_load(void)
{
    gpio_set_level((gpio_num_t)MAX7219_PIN_CS, 1);
    gpio_set_level((gpio_num_t)MAX7219_PIN_CS, 0);
}

/* Send 16 bits (address + data) to the MAX7219 chain */
static void max7219_tx16(uint16_t word)
{
    for (int i = 15; i >= 0; i--) {
        gpio_set_level((gpio_num_t)MAX7219_PIN_CLK, 0);
        gpio_set_level((gpio_num_t)MAX7219_PIN_DIN, (word >> i) & 1);
        gpio_set_level((gpio_num_t)MAX7219_PIN_CLK, 1);
    }
}

void max7219_init(void)
{
    /* Configure GPIOs as outputs */
    gpio_config_t io_conf = {
        .pin_bit_mask = (1ULL<<MAX7219_PIN_DIN) | (1ULL<<MAX7219_PIN_CLK) | (1ULL<<MAX7219_PIN_CS),
        .mode = GPIO_MODE_OUTPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE
    };
    gpio_config(&io_conf);

    /* Start with CS high */
    gpio_set_level((gpio_num_t)MAX7219_PIN_CS, 1);
    gpio_set_level((gpio_num_t)MAX7219_PIN_CLK, 0);
    vTaskDelay(pdMS_TO_TICKS(10));

    /* Initialize all 5 MAX7219 chips */
    for (int chip = 0; chip < MAX7219_CHIP_COUNT; chip++) {
        /* For daisy chain: send to all chips, but configure one at a time
         * Sending to chip N: send NOOP to chips 0..N-1, then config to chip N, then NOOP to rest */
        /* Simpler approach: configure all at once by sending to all chips */
        max7219_send_all(MAX7219_REG_SHUTDOWN, 0x01);    /* Normal operation */
        max7219_send_all(MAX7219_REG_TEST, 0x00);         /* No test */
        max7219_send_all(MAX7219_REG_DECODE, 0x00);       /* No decode (direct segment control) */
        max7219_send_all(MAX7219_REG_SCANLIMIT, 0x07);    /* All digits 0-7 */
        max7219_send_all(MAX7219_REG_INTENSITY, 0x08);    /* Medium brightness */
    }
    max7219_clear();
    ESP_LOGI(TAG, "MAX7219 x%d initialized (DIN=%d, CLK=%d, CS=%d)", 
             MAX7219_CHIP_COUNT, MAX7219_PIN_DIN, MAX7219_PIN_CLK, MAX7219_PIN_CS);
}

void max7219_send(uint8_t chip, uint8_t reg, uint8_t data)
{
    /* For daisy-chained chips, we need to send data to the correct chip
     * Send NOOP to chips AFTER the target (closer to DIN),
     * then the data to target chip,
     * then NOOP to chips BEFORE the target */

    /* For simplicity, we send to all chips. The last chip in the chain
     * receives the data first, so we send data to the last chips first */

    for (int i = MAX7219_CHIP_COUNT - 1; i >= 0; i--) {
        if (i == chip) {
            max7219_tx16((reg << 8) | data);
        } else {
            max7219_tx16((MAX7219_REG_NOOP << 8) | 0x00);
        }
    }
    max7219_load();
}

void max7219_send_all(uint8_t reg, uint8_t data)
{
    for (int i = 0; i < MAX7219_CHIP_COUNT; i++) {
        max7219_tx16((reg << 8) | data);
    }
    max7219_load();
}

void max7219_set_intensity(uint8_t intensity)
{
    if (intensity > 15) intensity = 15;
    max7219_send_all(MAX7219_REG_INTENSITY, intensity);
}

void max7219_clear(void)
{
    for (int chip = 0; chip < MAX7219_CHIP_COUNT; chip++) {
        for (int digit = 0; digit < 8; digit++) {
            max7219_send(chip, MAX7219_REG_DIGIT0 + digit, 0x00);
        }
    }
}

void max7219_display_char(uint8_t chip, uint8_t digit, char c, bool dot)
{
    uint8_t seg = 0x00;
    if (c >= '0' && c <= '9') {
        seg = font[c - '0'];
    } else if (c >= 'A' && c <= 'Z') {
        seg = font[c - 'A' + 10];
    } else if (c >= 'a' && c <= 'z') {
        seg = font[c - 'a' + 10];
    } else if (c == '-') {
        seg = 0x40;
    } else if (c == ' ') {
        seg = 0x00;
    }
    if (dot) seg |= 0x80;
    max7219_send(chip, MAX7219_REG_DIGIT0 + digit, seg);
}

void max7219_display_number(uint8_t chip, int32_t number, uint8_t decimals, bool leading_zeros)
{
    bool negative = (number < 0);
    if (negative) number = -number;

    /* Convert to digits */
    char digits[8];
    int len = 0;

    if (number == 0) {
        digits[len++] = '0';
    } else {
        while (number > 0 && len < 8) {
            digits[len++] = '0' + (number % 10);
            number /= 10;
        }
    }

    /* Apply decimal point position */
    if (decimals > 0 && decimals <= len) {
        /* Dot after the (decimals)th digit from right */
    }

    /* Display from rightmost digit */
    for (int i = 0; i < 8; i++) {
        if (i < len) {
            char c = digits[len - 1 - i];  /* Most significant digit first */
            bool dot_en = (decimals > 0 && i == decimals - 1);
            max7219_display_char(chip, 7 - i, c, dot_en);
        } else if (i == len && negative) {
            max7219_display_char(chip, 7 - i, '-', false);
        } else if (leading_zeros) {
            max7219_display_char(chip, 7 - i, '0', false);
        } else {
            max7219_display_char(chip, 7 - i, ' ', false);
        }
    }
}

void max7219_set_segments(uint8_t chip, uint8_t digit, uint8_t segments)
{
    if (digit > 7) return;
    max7219_send(chip, MAX7219_REG_DIGIT0 + digit, segments);
}
