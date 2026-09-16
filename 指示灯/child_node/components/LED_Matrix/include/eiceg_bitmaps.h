#ifndef EICEG_BITMAPS_H
#define EICEG_BITMAPS_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

#define BITMAP_WIDTH   32
#define BITMAP_HEIGHT  32

/* Static bitmaps */
extern const uint8_t static_left[128];
extern const uint8_t static_right[128];
extern const uint8_t static_down[128];
extern const uint8_t static_up[128];
extern const uint8_t static_rup[128];
extern const uint8_t static_lup[128];
extern const uint8_t static_rdown[128];
extern const uint8_t static_ldown[128];
extern const uint8_t static_mid[128];
extern const uint8_t static_motifs[128];
extern const uint8_t static_style[128];

/* Dynamic bitmaps */
extern const uint8_t dynamic_left[128];
extern const uint8_t dynamic_right[128];
extern const uint8_t dynamic_down[128];
extern const uint8_t dynamic_up[128];
extern const uint8_t dynamic_rup[128];
extern const uint8_t dynamic_lup[128];
extern const uint8_t dynamic_rdown[128];
extern const uint8_t dynamic_ldown[128];
extern const uint8_t dynamic_mid[128];

/* Dynamic buffers (mutable) */
extern uint8_t dynamic_left_buf[128];
extern uint8_t dynamic_right_buf[128];
extern uint8_t dynamic_down_buf[128];
extern uint8_t dynamic_up_buf[128];
extern uint8_t dynamic_rup_buf[128];
extern uint8_t dynamic_lup_buf[128];
extern uint8_t dynamic_rdown_buf[128];
extern uint8_t dynamic_ldown_buf[128];
extern uint8_t dynamic_mid_buf[128];

/* Pixel shift functions */
void shift_pixels_left(uint8_t *bitmap);
void shift_pixels_right(uint8_t *bitmap);
void shift_pixels_up(uint8_t *bitmap);
void shift_pixels_down(uint8_t *bitmap);

/* Initialize bitmaps and I2S */
void init_eiceg(void);

#ifdef __cplusplus
}
#endif

#endif /* EICEG_BITMAPS_H */
