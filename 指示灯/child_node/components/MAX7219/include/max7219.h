#pragma once
#include <stdint.h>
#include <stdbool.h>
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

/* Pin configuration for MAX7219 (Feather ESP32 SPI defaults) */
#define MAX7219_PIN_DIN    13   /* MOSI (Feather alternative) */
#define MAX7219_PIN_CLK    14    /* SCK */
#define MAX7219_PIN_CS     33   /* SS   */

/* Number of MAX7219 chips (5 on this PCB) */
#define MAX7219_CHIP_COUNT  5

/* MAX7219 Register Addresses */
#define MAX7219_REG_NOOP        0x00
#define MAX7219_REG_DIGIT0      0x01
#define MAX7219_REG_DIGIT1      0x02
#define MAX7219_REG_DIGIT2      0x03
#define MAX7219_REG_DIGIT3      0x04
#define MAX7219_REG_DIGIT4      0x05
#define MAX7219_REG_DIGIT5      0x06
#define MAX7219_REG_DIGIT6      0x07
#define MAX7219_REG_DIGIT7      0x08
#define MAX7219_REG_DECODE      0x09
#define MAX7219_REG_INTENSITY   0x0A
#define MAX7219_REG_SCANLIMIT   0x0B
#define MAX7219_REG_SHUTDOWN    0x0C
#define MAX7219_REG_TEST        0x0F

/* Decode mode: 0 = no decode (segment control), 0xFF = all digits BCD decode */
#define MAX7219_DECODE_NONE     0x00
#define MAX7219_DECODE_ALL      0xFF

/* Initialize MAX7219 chips */
void max7219_init(void);

/* Send data to a specific chip (0 = first, 4 = last) */
void max7219_send(uint8_t chip, uint8_t reg, uint8_t data);

/* Send to ALL chips simultaneously */
void max7219_send_all(uint8_t reg, uint8_t data);

/* Set brightness (0-15) */
void max7219_set_intensity(uint8_t intensity);

/* Clear all displays */
void max7219_clear(void);

/* Display a decimal number on a specific chip */
void max7219_display_number(uint8_t chip, int32_t number, uint8_t decimals, bool leading_zeros);

/* Display custom segments on a specific digit of a chip */
void max7219_set_segments(uint8_t chip, uint8_t digit, uint8_t segments);

/* Display a character on a given digit */
void max7219_display_char(uint8_t chip, uint8_t digit, char c, bool dot);

#ifdef __cplusplus
}
#endif




