#include "MLX90640.h"
#include "i2c_bus.h"
#include "RTOS_Communicate.h"
#include "esp_log.h"
#include <math.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char* TAG = "MLX90640";

/* ---------- 静态全局变量（不占栈） ---------- */
static i2c_master_dev_handle_t dev = NULL;

// 校准参数
static struct {
    int16_t  kVdd;
    int16_t  vdd25;
    float    KvPTAT;
    float    KtPTAT;
    uint16_t vPTAT25;
    uint16_t alphaPTAT;
    int16_t  gainEE;
    float    tgc;
    float    cpKv;
    float    cpKta;
    uint8_t  resolutionEE;
    uint8_t  calibrationModeEE;
    float    KsTa;
    float    ksTo[4];
    int16_t  ct[4];
    float    alpha[768];
    int16_t  offset[768];
    float    kta[768];
    float    kv[768];
    float    cpAlpha[2];
    int16_t  cpOffset[2];
    float    ilChessC[3];
    float    resolutionCorr;
} calib;

// 帧缓存（完整 834 个 word）
static uint16_t frame_sp0[834];
static uint16_t frame_sp1[834];
static bool     has_sp0 = false;
static bool     has_sp1 = false;

// 输出帧
static MLX90640_Frame_t result_frame = { .valid = false };

// 温度计算临时缓冲区（静态）
static float temp0[768];
static float temp1[768];

// 临时缓冲区（避免栈上分配大数组导致栈溢出）
static uint16_t ee_buffer[MLX90640_EEPROM_WORD_COUNT];
static uint16_t frame_buffer[834];

/* ---------- 对 I2C模块 底层封装 ---------- */
static esp_err_t read_reg16(uint16_t reg, uint16_t *data) {
    return I2c_Read_Reg16(dev, reg, data);
}

static esp_err_t write_reg16(uint16_t reg, uint16_t data) {
    return I2c_Write_Reg16(dev, reg, data);
}

// 读取多字节并交换字节序（小端→大端）
static esp_err_t read_bytes16_swap(uint16_t reg, uint8_t *buf, size_t len) {
    esp_err_t ret = I2c_Read_Bytes16(dev, reg, buf, len);
    if (ret != ESP_OK) return ret;
    // 假设 I2c_Read_Bytes16 返回的是小端（低字节在前）
    // 交换每个 16-bit 字
    uint16_t *p = (uint16_t*)buf;
    size_t count = len / 2;
    for (size_t i = 0; i < count; i++) {
        p[i] = __builtin_bswap16(p[i]);  // GCC 内置字节交换
    }
    return ESP_OK;
}

/* ---------- 工具函数 ---------- */
static inline int16_t twos_comp(uint16_t val, int bits) {
    if (val & (1 << (bits - 1))) return (int16_t)(val | (0xFFFF << bits));
    return (int16_t)val;
}

/* ---------- 官方校准参数提取（完全移植） ---------- */
static void ExtractVDDParameters(uint16_t *ee) {
    int16_t kVdd = (ee[51] & 0xFF00) >> 8;
    if (kVdd > 127) kVdd -= 256;
    calib.kVdd = kVdd * 32;

    int16_t vdd25 = ee[51] & 0x00FF;
    vdd25 = ((vdd25 - 256) << 5) - 8192;
    calib.vdd25 = vdd25;
}

static void ExtractPTATParameters(uint16_t *ee) {
    float KvPTAT = (ee[50] & 0xFC00) >> 10;
    if (KvPTAT > 31) KvPTAT -= 64;
    calib.KvPTAT = KvPTAT / 4096.0f;

    float KtPTAT = ee[50] & 0x03FF;
    if (KtPTAT > 511) KtPTAT -= 1024;
    calib.KtPTAT = KtPTAT / 8.0f;

    calib.vPTAT25 = ee[49];
    calib.alphaPTAT = ((ee[16] & 0xF000) >> 14) + 8;
}

static void ExtractGainParameters(uint16_t *ee) {
    int16_t gain = ee[48];
    if (gain > 32767) gain -= 65536;
    calib.gainEE = gain;
}

static void ExtractTgcParameters(uint16_t *ee) {
    float tgc = ee[60] & 0x00FF;
    if (tgc > 127) tgc -= 256;
    calib.tgc = tgc / 32.0f;
}

static void ExtractResolutionParameters(uint16_t *ee) {
    calib.resolutionEE = (ee[56] & 0x3000) >> 12;
}

static void ExtractKsTaParameters(uint16_t *ee) {
    float KsTa = (ee[60] & 0xFF00) >> 8;
    if (KsTa > 127) KsTa -= 256;
    calib.KsTa = KsTa / 8192.0f;
}

static void ExtractKsToParameters(uint16_t *ee) {
    int step = ((ee[63] & 0x3000) >> 12) * 10;
    calib.ct[0] = -40;
    calib.ct[1] = 0;
    calib.ct[2] = (ee[63] & 0x00F0) >> 4;
    calib.ct[3] = (ee[63] & 0x0F00) >> 8;
    calib.ct[2] *= step;
    calib.ct[3] = calib.ct[2] + calib.ct[3] * step;

    int scale = (ee[63] & 0x000F) + 8;
    scale = 1 << scale;

    calib.ksTo[0] = ee[61] & 0x00FF;
    calib.ksTo[1] = (ee[61] & 0xFF00) >> 8;
    calib.ksTo[2] = ee[62] & 0x00FF;
    calib.ksTo[3] = (ee[62] & 0xFF00) >> 8;
    for (int i = 0; i < 4; i++) {
        if (calib.ksTo[i] > 127) calib.ksTo[i] -= 256;
        calib.ksTo[i] /= scale;
    }
}

static void ExtractAlphaParameters(uint16_t *ee) {
    int accRow[24], accColumn[32];
    int alphaRef;
    uint8_t alphaScale, accRowScale, accColumnScale, accRemScale;

    accRemScale = ee[32] & 0x000F;
    accColumnScale = (ee[32] & 0x00F0) >> 4;
    accRowScale = (ee[32] & 0x0F00) >> 8;
    alphaScale = ((ee[32] & 0xF000) >> 12) + 30;
    alphaRef = ee[33];

    for (int i = 0; i < 6; i++) {
        int p = i * 4;
        accRow[p + 0] = (ee[34 + i] & 0x000F);
        accRow[p + 1] = (ee[34 + i] & 0x00F0) >> 4;
        accRow[p + 2] = (ee[34 + i] & 0x0F00) >> 8;
        accRow[p + 3] = (ee[34 + i] & 0xF000) >> 12;
    }
    for (int i = 0; i < 24; i++) if (accRow[i] > 7) accRow[i] -= 16;

    for (int i = 0; i < 8; i++) {
        int p = i * 4;
        accColumn[p + 0] = (ee[40 + i] & 0x000F);
        accColumn[p + 1] = (ee[40 + i] & 0x00F0) >> 4;
        accColumn[p + 2] = (ee[40 + i] & 0x0F00) >> 8;
        accColumn[p + 3] = (ee[40 + i] & 0xF000) >> 12;
    }
    for (int i = 0; i < 32; i++) if (accColumn[i] > 7) accColumn[i] -= 16;

    for (int i = 0; i < 24; i++) {
        for (int j = 0; j < 32; j++) {
            int p = i * 32 + j;
            int alpha = (ee[64 + p] & 0x03F0) >> 4;
            if (alpha > 31) alpha -= 64;
            alpha = alpha * (1 << accRemScale);
            calib.alpha[p] = (alphaRef + (accRow[i] << accRowScale) + (accColumn[j] << accColumnScale) + alpha);
            calib.alpha[p] /= pow(2, alphaScale);
        }
    }
}

static void ExtractOffsetParameters(uint16_t *ee) {
    int occRow[24], occColumn[32];
    int16_t offsetRef;
    uint8_t occRowScale, occColumnScale, occRemScale;

    occRemScale = ee[16] & 0x000F;
    occColumnScale = (ee[16] & 0x00F0) >> 4;
    occRowScale = (ee[16] & 0x0F00) >> 8;
    offsetRef = ee[17];
    if (offsetRef > 32767) offsetRef -= 65536;

    for (int i = 0; i < 6; i++) {
        int p = i * 4;
        occRow[p + 0] = (ee[18 + i] & 0x000F);
        occRow[p + 1] = (ee[18 + i] & 0x00F0) >> 4;
        occRow[p + 2] = (ee[18 + i] & 0x0F00) >> 8;
        occRow[p + 3] = (ee[18 + i] & 0xF000) >> 12;
    }
    for (int i = 0; i < 24; i++) if (occRow[i] > 7) occRow[i] -= 16;

    for (int i = 0; i < 8; i++) {
        int p = i * 4;
        occColumn[p + 0] = (ee[24 + i] & 0x000F);
        occColumn[p + 1] = (ee[24 + i] & 0x00F0) >> 4;
        occColumn[p + 2] = (ee[24 + i] & 0x0F00) >> 8;
        occColumn[p + 3] = (ee[24 + i] & 0xF000) >> 12;
    }
    for (int i = 0; i < 32; i++) if (occColumn[i] > 7) occColumn[i] -= 16;

    for (int i = 0; i < 24; i++) {
        for (int j = 0; j < 32; j++) {
            int p = i * 32 + j;
            int offset = (ee[64 + p] & 0xFC00) >> 10;
            if (offset > 31) offset -= 64;
            offset = offset * (1 << occRemScale);
            calib.offset[p] = offsetRef + (occRow[i] << occRowScale) + (occColumn[j] << occColumnScale) + offset;
        }
    }
}

static void ExtractKtaPixelParameters(uint16_t *ee) {
    int8_t KtaRC[4];
    KtaRC[0] = (ee[54] & 0xFF00) >> 8; if (KtaRC[0] > 127) KtaRC[0] -= 256;
    KtaRC[2] = (ee[54] & 0x00FF);       if (KtaRC[2] > 127) KtaRC[2] -= 256;
    KtaRC[1] = (ee[55] & 0xFF00) >> 8; if (KtaRC[1] > 127) KtaRC[1] -= 256;
    KtaRC[3] = (ee[55] & 0x00FF);       if (KtaRC[3] > 127) KtaRC[3] -= 256;

    uint8_t ktaScale1 = ((ee[56] & 0x00F0) >> 4) + 8;
    uint8_t ktaScale2 = ee[56] & 0x000F;

    for (int i = 0; i < 24; i++) {
        for (int j = 0; j < 32; j++) {
            int p = i * 32 + j;
            int split = 2 * (i - (i / 2) * 2) + (j % 2);
            int kta = (ee[64 + p] & 0x000E) >> 1;
            if (kta > 3) kta -= 8;
            kta = kta * (1 << ktaScale2);
            calib.kta[p] = (KtaRC[split] + kta) / pow(2, ktaScale1);
        }
    }
}

static void ExtractKvPixelParameters(uint16_t *ee) {
    int8_t KvT[4];
    KvT[0] = (ee[52] & 0xF000) >> 12; if (KvT[0] > 7) KvT[0] -= 16;
    KvT[2] = (ee[52] & 0x0F00) >> 8;  if (KvT[2] > 7) KvT[2] -= 16;
    KvT[1] = (ee[52] & 0x00F0) >> 4;  if (KvT[1] > 7) KvT[1] -= 16;
    KvT[3] = (ee[52] & 0x000F);        if (KvT[3] > 7) KvT[3] -= 16;

    uint8_t kvScale = (ee[56] & 0x0F00) >> 8;

    for (int i = 0; i < 24; i++) {
        for (int j = 0; j < 32; j++) {
            int p = i * 32 + j;
            int split = 2 * (i - (i / 2) * 2) + (j % 2);
            calib.kv[p] = KvT[split] / pow(2, kvScale);
        }
    }
}

static void ExtractCPParameters(uint16_t *ee) {
    uint8_t alphaScale = ((ee[32] & 0xF000) >> 12) + 27;

    calib.cpOffset[0] = ee[58] & 0x03FF;
    if (calib.cpOffset[0] > 511) calib.cpOffset[0] -= 1024;

    calib.cpOffset[1] = (ee[58] & 0xFC00) >> 10;
    if (calib.cpOffset[1] > 31) calib.cpOffset[1] -= 64;
    calib.cpOffset[1] += calib.cpOffset[0];

    calib.cpAlpha[0] = ee[57] & 0x03FF;
    if (calib.cpAlpha[0] > 511) calib.cpAlpha[0] -= 1024;
    calib.cpAlpha[0] /= pow(2, alphaScale);

    calib.cpAlpha[1] = (ee[57] & 0xFC00) >> 10;
    if (calib.cpAlpha[1] > 31) calib.cpAlpha[1] -= 64;
    calib.cpAlpha[1] = (1 + calib.cpAlpha[1] / 128.0f) * calib.cpAlpha[0];

    float cpKta = ee[59] & 0x00FF;
    if (cpKta > 127) cpKta -= 256;
    uint8_t ktaScale1 = ((ee[56] & 0x00F0) >> 4) + 8;
    calib.cpKta = cpKta / pow(2, ktaScale1);

    float cpKv = (ee[59] & 0xFF00) >> 8;
    if (cpKv > 127) cpKv -= 256;
    uint8_t kvScale = (ee[56] & 0x0F00) >> 8;
    calib.cpKv = cpKv / pow(2, kvScale);
}

static void ExtractCILCParameters(uint16_t *ee) {
    calib.calibrationModeEE = ((ee[10] & 0x0800) >> 4) ^ 0x80;

    calib.ilChessC[0] = ee[53] & 0x003F;
    if (calib.ilChessC[0] > 31) calib.ilChessC[0] -= 64;
    calib.ilChessC[0] /= 16.0f;

    calib.ilChessC[1] = (ee[53] & 0x07C0) >> 6;
    if (calib.ilChessC[1] > 15) calib.ilChessC[1] -= 32;
    calib.ilChessC[1] /= 2.0f;

    calib.ilChessC[2] = (ee[53] & 0xF800) >> 11;
    if (calib.ilChessC[2] > 15) calib.ilChessC[2] -= 32;
    calib.ilChessC[2] /= 8.0f;
}

static esp_err_t extract_all_parameters(uint16_t *ee) {
    if (ee[10] & 0x0040) {
        ESP_LOGE(TAG, "EEPROM 无效标志");
        return ESP_FAIL;
    }
    ExtractVDDParameters(ee);
    ExtractPTATParameters(ee);
    ExtractGainParameters(ee);
    ExtractTgcParameters(ee);
    ExtractResolutionParameters(ee);
    ExtractKsTaParameters(ee);
    ExtractKsToParameters(ee);
    ExtractAlphaParameters(ee);
    ExtractOffsetParameters(ee);
    ExtractKtaPixelParameters(ee);
    ExtractKvPixelParameters(ee);
    ExtractCPParameters(ee);
    ExtractCILCParameters(ee);
    return ESP_OK;
}

/* ---------- 温度计算 ---------- */
static void calculate_frame(uint16_t *frameData, float *result, float *ta_out, float *vdd_out) {
    int resolutionRAM = (frameData[832] & 0x0C00) >> 10;
    float resCorr = pow(2, calib.resolutionEE) / pow(2, resolutionRAM);
    float vdd = (int16_t)frameData[810];
    if (vdd > 32767) vdd -= 65536;
    vdd = (resCorr * vdd - calib.vdd25) / calib.kVdd + 3.3f;
    *vdd_out = vdd;

    float ptat = (int16_t)frameData[800]; if (ptat > 32767) ptat -= 65536;
    float vbe  = (int16_t)frameData[768]; if (vbe  > 32767) vbe  -= 65536;
    float vptat_art = (ptat / (ptat * calib.alphaPTAT + vbe)) * pow(2, 18);
    float ta = (vptat_art / (1 + calib.KvPTAT * (vdd - 3.3f)) - calib.vPTAT25) / calib.KtPTAT + 25.0f;
    *ta_out = ta;

    float gain = (int16_t)frameData[778];
    if (gain > 32767) gain -= 65536;
    gain = calib.gainEE / gain;

    float cpData[2];
    for (int i = 0; i < 2; i++) {
        uint16_t addr = (i == 0) ? 776 : 808;
        cpData[i] = (int16_t)frameData[addr];
        if (cpData[i] > 32767) cpData[i] -= 65536;
        cpData[i] *= gain;
    }
    cpData[0] -= calib.cpOffset[0] * (1 + calib.cpKta * (ta - 25)) * (1 + calib.cpKv * (vdd - 3.3));
    if (((frameData[832] & 0x1000) >> 5) == calib.calibrationModeEE) {
        cpData[1] -= calib.cpOffset[1] * (1 + calib.cpKta * (ta - 25)) * (1 + calib.cpKv * (vdd - 3.3));
    } else {
        cpData[1] -= (calib.cpOffset[1] + calib.ilChessC[0]) * (1 + calib.cpKta * (ta - 25)) * (1 + calib.cpKv * (vdd - 3.3));
    }

    float ta4 = pow(ta + 273.15f, 4);
    float tr = ta - 8.0f;
    float tr4 = pow(tr + 273.15f, 4);
    float taTr = tr4 - (tr4 - ta4);

    float alphaCorrR[4];
    alphaCorrR[0] = 1 / (1 + calib.ksTo[0] * 40);
    alphaCorrR[1] = 1;
    alphaCorrR[2] = 1 + calib.ksTo[2] * calib.ct[2];
    alphaCorrR[3] = alphaCorrR[2] * (1 + calib.ksTo[3] * (calib.ct[3] - calib.ct[2]));

    uint8_t mode = (frameData[832] & 0x1000) >> 5;

    for (int pix = 0; pix < 768; pix++) {
        int row = pix / 32;
        int col = pix % 32;

        int ilPattern = row % 2;
        int chessPattern = ilPattern ^ (col % 2);
        int conversionPattern = (((col - 2) / 4) - ((col - 1) / 4) + ((col + 1) / 4) - (col / 4)) * (1 - 2 * ilPattern);
        int pattern = (mode == 0) ? ilPattern : chessPattern;

        if (pattern != (int)frameData[833]) {
            result[pix] = 0.0f;
            continue;
        }

        float irData = (int16_t)frameData[pix];
        if (irData > 32767) irData -= 65536;
        irData *= gain;

        irData -= calib.offset[pix] * (1 + calib.kta[pix] * (ta - 25)) * (1 + calib.kv[pix] * (vdd - 3.3));
        if (mode != calib.calibrationModeEE) {
            irData += calib.ilChessC[2] * (2 * ilPattern - 1) - calib.ilChessC[1] * conversionPattern;
        }

        irData -= calib.tgc * ((1 - pattern) * cpData[0] + pattern * cpData[1]);

        float alphaComp = (calib.alpha[pix] - calib.tgc * ((1 - pattern) * calib.cpAlpha[0] + pattern * calib.cpAlpha[1]))
                         * (1 + calib.KsTa * (ta - 25));

        float Sx = pow(alphaComp, 3) * (irData + alphaComp * taTr);
        Sx = sqrt(sqrt(Sx)) * calib.ksTo[1];

        float To = sqrt(sqrt(irData / (alphaComp * (1 - calib.ksTo[1] * 273.15f) + Sx) + taTr)) - 273.15f;

        int range;
        if (To < calib.ct[1])       range = 0;
        else if (To < calib.ct[2])  range = 1;
        else if (To < calib.ct[3])  range = 2;
        else                        range = 3;

        if (range != 1) {
            float ksto = calib.ksTo[range];
            alphaComp *= alphaCorrR[range];
            Sx = ksto * pow(alphaComp * alphaComp * alphaComp * irData + alphaComp * alphaComp * alphaComp * alphaComp * taTr, 0.25f);
            To = sqrt(sqrt(irData / (alphaComp * (1 + ksto * 273.15f)) + Sx)) - 273.15f;
        }

        result[pix] = To;
    }
}

/* ---------- 公开 API ---------- */
esp_err_t MLX90640_Init(i2c_master_bus_handle_t busHandle) {
    ESP_LOGI(TAG, "Initializing MLX90640...");

    esp_err_t ret = I2c_Add_Device(busHandle, MLX90640_ADDR, MLX90640_I2C_FREQ, &dev);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "I2C device add failed");
        return ret;
    }
    vTaskDelay(pdMS_TO_TICKS(50));

    ret = write_reg16(MLX90640_REG_CTRL1, MLX90640_CTRL1_INIT_VALUE);
    if (ret != ESP_OK) ESP_LOGW(TAG, "Soft reset write failed");
    vTaskDelay(pdMS_TO_TICKS(200));

    ret = read_bytes16_swap(MLX90640_EEPROM_BASE_ADDR, (uint8_t*)ee_buffer, MLX90640_EEPROM_BYTE_COUNT);
	if (ret != ESP_OK) {
		ESP_LOGE(TAG, "EEPROM read failed");
		return ret;
	}

    ret = extract_all_parameters(ee_buffer);
    if (ret != ESP_OK) return ret;

    uint16_t ctrl1;
    read_reg16(MLX90640_REG_CTRL1, &ctrl1);
    ESP_LOGI(TAG, "Original CTRL1: 0x%04X", ctrl1);

    uint16_t ctrl1_new = ctrl1;
    ctrl1_new |=  0x1000;
    ctrl1_new |=  0x0001;
    ctrl1_new &= ~0x0010;
    ctrl1_new &= ~0x0380;
    ctrl1_new |=  (0x03 << 7);
    ctrl1_new &= ~0x0C00;
    ctrl1_new |=  (0x02 << 10);

    ret = write_reg16(MLX90640_REG_CTRL1, ctrl1_new);
    if (ret != ESP_OK) return ret;
    vTaskDelay(pdMS_TO_TICKS(50));
    read_reg16(MLX90640_REG_CTRL1, &ctrl1);
    ESP_LOGI(TAG, "Configured CTRL1: 0x%04X", ctrl1);

    has_sp0 = has_sp1 = false;
    result_frame.valid = false;

    ESP_LOGI(TAG, "MLX90640 init OK");
    ESP_LOGI(TAG, "  Gain: %d, PTAT25: %d", calib.gainEE, calib.vPTAT25);
    ESP_LOGI(TAG, "  Vdd25: %.3f V, Kv_Vdd: %.4f", 3.3f + (0 - calib.vdd25)/calib.kVdd, (float)calib.kVdd/8192);
    ESP_LOGI(TAG, "  CT3: %.1f, CT4: %.1f", (float)calib.ct[2], (float)calib.ct[3]);
    return ESP_OK;
}

bool MLX90640_Is_New_Data_Ready(void) {
    uint16_t status;
    if (read_reg16(MLX90640_REG_STATUS, &status) != ESP_OK) return false;
    return (status & MLX90640_STATUS_NEW_DATA_BIT) != 0;
}

esp_err_t MLX90640_Read_Subpage(void) {
    uint16_t status;
    esp_err_t ret = read_reg16(MLX90640_REG_STATUS, &status);
    if (ret != ESP_OK) return ret;
    if (!(status & 0x0008)) return ESP_ERR_NOT_FOUND;

    uint8_t subpage = status & MLX90640_STATUS_SUBPAGE_MASK;

    ret = read_bytes16_swap(0x0400, (uint8_t*)frame_buffer, 832 * 2);
    if (ret != ESP_OK) return ret;

    read_reg16(MLX90640_REG_CTRL1, &frame_buffer[832]);
    frame_buffer[833] = subpage;

    if (subpage == 0) {
        memcpy(frame_sp0, frame_buffer, sizeof(frame_buffer));
        has_sp0 = true;
    } else {
        memcpy(frame_sp1, frame_buffer, sizeof(frame_buffer));
        has_sp1 = true;
    }

    write_reg16(MLX90640_REG_STATUS, MLX90640_STATUS_CLEAR_NEW_DATA);
    ESP_LOGD(TAG, "Read subpage %d, sp0=%d sp1=%d", subpage, has_sp0, has_sp1);
    return ESP_OK;
}

const MLX90640_Frame_t* MLX90640_Get_Frame(void) {
    if (!has_sp0 || !has_sp1) {
        result_frame.valid = false;
        return &result_frame;
    }

    float ta0, vdd0, ta1, vdd1;
    calculate_frame(frame_sp0, temp0, &ta0, &vdd0);
    calculate_frame(frame_sp1, temp1, &ta1, &vdd1);

    memcpy(result_frame.temperature, temp0, sizeof(temp0));
    for (int i = 0; i < 768; i++) {
        if (temp1[i] != 0.0f) result_frame.temperature[i] = temp1[i];
    }

    result_frame.ta = (ta0 + ta1) / 2.0f;
    result_frame.vdd = (vdd0 + vdd1) / 2.0f;

    float max = -1000, min = 1000, center_sum = 0;
    int center_cnt = 0;
    for (int i = 0; i < 768; i++) {
        float t = result_frame.temperature[i];
        if (t > max) max = t;
        if (t < min) min = t;
        int row = i / 32, col = i % 32;
        if (row >= 8 && row < 16 && col >= 10 && col < 22) {
            center_sum += t;
            center_cnt++;
        }
    }
    result_frame.max_temp = max;
    result_frame.min_temp = min;
    result_frame.center_temp = center_cnt ? (center_sum / center_cnt) : 0.0f;
    result_frame.valid = true;

    has_sp0 = has_sp1 = false;
    return &result_frame;
}

esp_err_t MLX90640_Soft_Reset(void) {
    uint16_t ctrl1;
    read_reg16(MLX90640_REG_CTRL1, &ctrl1);
    ctrl1 |= MLX90640_CTRL1_SOFT_RESET_BIT;
    esp_err_t ret = write_reg16(MLX90640_REG_CTRL1, ctrl1);
    if (ret == ESP_OK) {
        vTaskDelay(pdMS_TO_TICKS(50));
        has_sp0 = has_sp1 = false;
        result_frame.valid = false;
    }
    return ret;
}

esp_err_t MLX90640_Set_Refresh_Rate(uint8_t rate) {
    if (rate > 7) return ESP_ERR_INVALID_ARG;
    uint16_t ctrl1;
    read_reg16(MLX90640_REG_CTRL1, &ctrl1);
    ctrl1 &= ~0x0380;
    ctrl1 |= (rate & 0x07) << 7;
    return write_reg16(MLX90640_REG_CTRL1, ctrl1);
}

esp_err_t MLX90640_Set_Resolution(uint8_t res) {
    if (res > 3) return ESP_ERR_INVALID_ARG;
    uint16_t ctrl1;
    read_reg16(MLX90640_REG_CTRL1, &ctrl1);
    ctrl1 &= ~0x0C00;
    ctrl1 |= (res & 0x03) << 10;
    return write_reg16(MLX90640_REG_CTRL1, ctrl1);
}

/**
 * @brief MLX90640 任务函数
*/
void MLX90640_Task(void *pvParameters)
{
	i2c_master_bus_handle_t busHandle = (i2c_master_bus_handle_t)pvParameters;

	// 初始化
	esp_err_t ret = MLX90640_Init(busHandle);
    if (ret != ESP_OK) { ESP_LOGE(TAG, "MLX90640 init failed"); vTaskDelete(NULL); return; }

    while (1) {
        if (MLX90640_Is_New_Data_Ready()) {
            if (MLX90640_Read_Subpage() == ESP_OK) {
                const MLX90640_Frame_t* frame = MLX90640_Get_Frame();
                if (frame && frame->valid) {
                    ESP_LOGI(TAG, "Frame: Ta=%.2f°C, Tmax=%.2f°C, Tmin=%.2f°C",
                             frame->ta, frame->max_temp, frame->min_temp);

                    /* 统计高温像素数量 */
                    int hotCnt = 0;
                    for (int i = 0; i < MLX90640_PIXEL_TOTAL; i++) {
                        if (frame->temperature[i] > 60.0f) hotCnt++;
                    }

                    /*
                     * 发布热成像摘要数据到 RTOS_Communicate 共享模块:
                     *   - SensorFusion_Task 读取 → 用于火灾融合判断 + MQTT 上报
                     */
                    Comm_MLX90640_Data_t commData;
                    commData.t_max        = frame->max_temp;
                    commData.t_min        = frame->min_temp;
                    commData.t_avg        = (frame->max_temp + frame->min_temp) / 2.0f;
                    commData.t_ambient    = frame->ta;
                    commData.t_center     = frame->center_temp;
                    commData.hot_spot_cnt = hotCnt;
                    commData.valid        = true;
                    Comm_Put_MLX90640_Data(&commData);
                }
            }
        }
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}