#include "SensorFusion.h"
#include "RTOS_Communicate.h"
#include "aht2x.h"
#include "ens160.h"
#include "MLX90640.h"
#include "mqtt.h"
#include "buzzer.h"
#include "esp_log.h"
#include "esp_mac.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/semphr.h"
#include <string.h>
#include <math.h>
#include <stdio.h>
#include <sys/time.h>

static const char *TAG = "SensorFusion";

#define MQTT_TOPIC_FIRE_ALERT   "ceiling_light/data"

/* ============================================================
 *  滑动窗口大小
 * ============================================================ */
#define WINDOW_SIZE          5
#define HOT_SPOT_THRESHOLD   60.0f

/* ============================================================
 *  报警确认帧数
 * ============================================================ */
#define CONFIRM_WATCH    3
#define CONFIRM_WARNING  3
#define CONFIRM_ALARM    2
#define RECOVER_FRAMES   5

/* ============================================================
 *  模糊逻辑隶属度函数参数 (梯形: a, b, c, d)
 * ============================================================ */

/* 温度风险 ΔT (°C) */
#define DT_LOW_A      0.0f
#define DT_LOW_B      0.0f
#define DT_LOW_C     10.0f
#define DT_LOW_D     20.0f

#define DT_MED_A     10.0f
#define DT_MED_B     20.0f
#define DT_MED_C     35.0f
#define DT_MED_D     50.0f

#define DT_HIGH_A    35.0f
#define DT_HIGH_B    50.0f
#define DT_HIGH_C   100.0f
#define DT_HIGH_D   100.0f

/* 气体风险 TVOC (ppb) */
#define TVOC_LOW_A      0.0f
#define TVOC_LOW_B      0.0f
#define TVOC_LOW_C    150.0f
#define TVOC_LOW_D    300.0f

#define TVOC_MED_A    150.0f
#define TVOC_MED_B    300.0f
#define TVOC_MED_C    700.0f
#define TVOC_MED_D   1200.0f

#define TVOC_HIGH_A   700.0f
#define TVOC_HIGH_B  1200.0f
#define TVOC_HIGH_C  5000.0f
#define TVOC_HIGH_D  5000.0f

/* 湿度变化率 RH_rate (%/帧) */
#define RHR_DOWN_A    -10.0f
#define RHR_DOWN_B    -10.0f
#define RHR_DOWN_C     -1.0f
#define RHR_DOWN_D     -0.2f

#define RHR_STABLE_A   -0.5f
#define RHR_STABLE_B   -0.1f
#define RHR_STABLE_C    0.1f
#define RHR_STABLE_D    0.5f

#define RHR_UP_A        0.2f
#define RHR_UP_B        1.0f
#define RHR_UP_C       10.0f
#define RHR_UP_D       10.0f

/* 温度上升速率 T_rise_rate (°C/帧) */
#define TRR_SLOW_A     -10.0f
#define TRR_SLOW_B      -0.1f
#define TRR_SLOW_C       0.1f
#define TRR_SLOW_D       0.3f

#define TRR_MOD_A        0.1f
#define TRR_MOD_B        0.3f
#define TRR_MOD_C        0.8f
#define TRR_MOD_D        1.5f

#define TRR_FAST_A       0.8f
#define TRR_FAST_B       1.5f
#define TRR_FAST_C      10.0f
#define TRR_FAST_D      10.0f

/* 输出模糊集中心值 */
#define OUT_SAFE_CENTER    10.0f
#define OUT_WATCH_CENTER   32.5f
#define OUT_WARN_CENTER    60.0f
#define OUT_ALARM_CENTER   87.5f

static Fusion_Result_t          g_result;
static Fusion_Sensor_Snapshot_t g_snapshot;
static Fusion_Alarm_Callback_t g_alarm_callback = NULL;
static SemaphoreHandle_t       g_mutex = NULL;

/* ESP32 MAC地址缓存 */
static char g_mac_address_str[24] = {0};  /* "ESP32_XX:XX:XX:XX:XX:XX" */
static bool g_mac_initialized = false;

/* 滑动窗口 */
static float g_delta_t_buf[WINDOW_SIZE];
static float g_rh_buf[WINDOW_SIZE];
static int   g_buf_index = 0;
static int   g_buf_count = 0;

/* 报警确认计数器 */
static int   g_confirm_watch   = 0;
static int   g_confirm_warning = 0;
static int   g_confirm_alarm   = 0;
static int   g_recover_safe    = 0;
static Fusion_Level_t g_current_level = FUSION_LEVEL_SAFE;

/* ============================================================
 *  内部函数声明
 * ============================================================ */
static float trapezoid_mf(float x, float a, float b, float c, float d);
static void fuzzy_temp_risk(float delta_t, float t_rise_rate, float *low, float *med, float *high);
static void fuzzy_gas_risk(float tvoc, float *low, float *med, float *high);
static void fuzzy_rh_rate(float rh_rate, float *down, float *stable, float *up);
static float output_mf_safe(float x);
static float output_mf_watch(float x);
static float output_mf_warning(float x);
static float output_mf_alarm(float x);
static float centroid_defuzz(float mu_safe, float mu_watch, float mu_warning, float mu_alarm);
static Fusion_BPA_t fuzzy_inference(float delta_t, float tvoc, float rh_rate, float t_rise_rate);
static Fusion_BPA_t ds_combine(const Fusion_BPA_t *m1, const Fusion_BPA_t *m2);
static float linear_regression_slope(const float *buf, int count);
static Fusion_Level_t decide_level(float m_fire, float m_no_fire, float m_theta);
static Fusion_Level_t confirm_level(Fusion_Level_t new_level);
static void read_all_sensors(Fusion_Sensor_Snapshot_t *snap, float *t_rise_rate, float *rh_rate);
static void run_fusion(Fusion_Sensor_Snapshot_t *snap);
static void init_mac_address(void);

/* ============================================================
 *  初始化ESP32 MAC地址 (多种方式获取硬件唯一标识)
 *
 *  ESP32 MAC地址类型说明:
 *  - ESP_MAC_WIFI_STA      : WiFi Station接口MAC (推荐用于设备标识)
 *  - ESP_MAC_WIFI_SOFTAP   : WiFi SoftAP接口MAC
 *  - ESP_MAC_BT            : 蓝牙接口MAC
 *  - ESP_MAC_ETH           : 以太网接口MAC (部分型号支持)
 *
 *  注意: WiFi STA和SoftAP的MAC地址通常相差1位(LSB+1/LSB-1)
 * ============================================================ */
static void init_mac_address(void)
{
    if (g_mac_initialized)
    {
        return;
    }

    uint8_t mac_buf[6] = {0};
    const char *mac_source = "未知";

    /* ========== 开始获取MAC地址 ========== */
    ESP_LOGI(TAG, "========================================");
    ESP_LOGI(TAG, "🔍 正在获取硬件MAC地址...");
    ESP_LOGI(TAG, "========================================");

    /* 方式1: 尝试获取WiFi Station接口MAC (最常用) */
    esp_err_t ret = esp_read_mac(mac_buf, ESP_MAC_WIFI_STA);
    mac_source = "WiFi Station接口";
    ESP_LOGI(TAG, "[尝试1/3] 读取WiFi Station MAC...");

    if (ret != ESP_OK)
    {
        ESP_LOGW(TAG, "  ❌ WiFi Station MAC获取失败 (错误码: 0x%x)", ret);

#if CONFIG_ESP32_WIFI_SOFTAP_SUPPORT
        /* 方式2: 如果STA失败,尝试SoftAP */
        ret = esp_read_mac(mac_buf, ESP_MAC_WIFI_SOFTAP);
        mac_source = "WiFi SoftAP接口";
        ESP_LOGI(TAG, "[尝试2/3] 读取WiFi SoftAP MAC...");

        if (ret != ESP_OK)
        {
            ESP_LOGW(TAG, "  ❌ WiFi SoftAP MAC获取失败 (错误码: 0x%x)", ret);
        }
#endif

#ifdef CONFIG_IDF_TARGET_ESP32
        if (ret != ESP_OK)
        {
            /* 方式3: 从eFuse读取基础MAC地址 (ESP32原始硬件MAC) */
            ret = esp_efuse_mac_get_default(mac_buf);
            mac_source = "eFuse基础MAC (硬件出厂)";
            ESP_LOGI(TAG, "[尝试3/3] 从eFuse读取基础MAC...");

            if (ret != ESP_OK)
            {
                ESP_LOGW(TAG, "  ❌ eFuse MAC获取失败 (错误码: 0x%x)", ret);
            }
        }
#endif
    }

    /* ========== 处理获取结果 ========== */
    if (ret == ESP_OK && (mac_buf[0] | mac_buf[1] | mac_buf[2] | mac_buf[3] | mac_buf[4] | mac_buf[5]) != 0)
    {
        snprintf(g_mac_address_str, sizeof(g_mac_address_str),
                 "ESP32_%02X:%02X:%02X:%02X:%02X:%02X",
                 mac_buf[0], mac_buf[1], mac_buf[2],
                 mac_buf[3], mac_buf[4], mac_buf[5]);
        g_mac_initialized = true;

        /* ========== 详细打印结果 ========== */
        ESP_LOGI(TAG, "========================================");
        ESP_LOGI(TAG, "✅ 硬件MAC地址获取成功!");
        ESP_LOGI(TAG, "========================================");
        ESP_LOGI(TAG, "📌 数据来源: %s", mac_source);
        ESP_LOGI(TAG, "🎯 完整格式: %s", g_mac_address_str);
        ESP_LOGI(TAG, "┌─────────────────────────────────────┐");
        ESP_LOGI(TAG, "│ 字节0 (OUI第1字节): %02X              │", mac_buf[0]);
        ESP_LOGI(TAG, "│ 字节1 (OUI第2字节): %02X              │", mac_buf[1]);
        ESP_LOGI(TAG, "│ 字节2 (OUI第3字节): %02X              │", mac_buf[2]);
        ESP_LOGI(TAG, "│ 字节3 (NIC第1字节): %02X              │", mac_buf[3]);
        ESP_LOGI(TAG, "│ 字节4 (NIC第2字节): %02X              │", mac_buf[4]);
        ESP_LOGI(TAG, "│ 字节5 (NIC第3字节): %02X              │", mac_buf[5]);
        ESP_LOGI(TAG, "└─────────────────────────────────────┘");
        ESP_LOGI(TAG, "📊 十六进制: %02X:%02X:%02X:%02X:%02X:%02X",
                 mac_buf[0], mac_buf[1], mac_buf[2],
                 mac_buf[3], mac_buf[4], mac_buf[5]);

        /* 解析厂商OUI (Organizationally Unique Identifier) */
        ESP_LOGI(TAG, "🏭 厂商OUI: %02X:%02X:%02X (%s)",
                 mac_buf[0], mac_buf[1], mac_buf[2],
                 (mac_buf[0] == 0xD8 && mac_buf[1] == 0xBC && mac_buf[2] == 0x38) ? "Espressif" : "其他厂商");

        ESP_LOGI(TAG, "💡 说明:");
        ESP_LOGI(TAG, "   - 此MAC将作为设备的唯一标识符");
        ESP_LOGI(TAG, "   - 用于MQTT JSON数据的Key字段");
        ESP_LOGI(TAG, "   - 格式: {\"%s\":{...数据...}}", g_mac_address_str);
        ESP_LOGI(TAG, "========================================\n");
    }
    else
    {
        ESP_LOGE(TAG, "========================================");
        ESP_LOGE(TAG, "❌ 获取硬件MAC地址失败!");
        ESP_LOGE(TAG, "========================================");
        ESP_LOGE(TAG, "⚠️  所有获取方式均失败");
        ESP_LOGE(TAG, "   最终错误码: 0x%x", ret);
        strncpy(g_mac_address_str, "ESP32_00:00:00:00:00:00", sizeof(g_mac_address_str) - 1);
        g_mac_initialized = false;
        ESP_LOGW(TAG, "🔄 使用默认MAC地址: %s", g_mac_address_str);
        ESP_LOGW(TAG, "💡 提示: 请检查WiFi驱动是否正常初始化");
        ESP_LOGI(TAG, "========================================\n");
    }
}

/* ============================================================
 *  梯形隶属度函数
 * ============================================================ */
static float trapezoid_mf(float x, float a, float b, float c, float d)
{
    if (x <= a || x >= d) return 0.0f;
    if (x >= b && x <= c) return 1.0f;
    if (x > a && x < b) return (x - a) / (b - a);
    return (d - x) / (d - c);
}

/* ============================================================
 *  模糊逻辑: 温度风险隶属度
 * ============================================================ */
static void fuzzy_temp_risk(float delta_t, float t_rise_rate, float *low, float *med, float *high)
{
    *low  = trapezoid_mf(delta_t, DT_LOW_A, DT_LOW_B, DT_LOW_C, DT_LOW_D);
    *med  = trapezoid_mf(delta_t, DT_MED_A, DT_MED_B, DT_MED_C, DT_MED_D);
    *high = trapezoid_mf(delta_t, DT_HIGH_A, DT_HIGH_B, DT_HIGH_C, DT_HIGH_D);

    float trr_fast = trapezoid_mf(t_rise_rate, TRR_FAST_A, TRR_FAST_B, TRR_FAST_C, TRR_FAST_D);
    if (trr_fast > 0.0f) {
        float boost = trr_fast * 0.3f;
        *high = (*high + boost > 1.0f) ? 1.0f : (*high + boost);
        *low  = (*low - boost < 0.0f) ? 0.0f : (*low - boost);
    }
}

/* ============================================================
 *  模糊逻辑: 气体风险隶属度
 * ============================================================ */
static void fuzzy_gas_risk(float tvoc, float *low, float *med, float *high)
{
    *low  = trapezoid_mf(tvoc, TVOC_LOW_A, TVOC_LOW_B, TVOC_LOW_C, TVOC_LOW_D);
    *med  = trapezoid_mf(tvoc, TVOC_MED_A, TVOC_MED_B, TVOC_MED_C, TVOC_MED_D);
    *high = trapezoid_mf(tvoc, TVOC_HIGH_A, TVOC_HIGH_B, TVOC_HIGH_C, TVOC_HIGH_D);
}

/* ============================================================
 *  模糊逻辑: 湿度变化率隶属度
 * ============================================================ */
static void fuzzy_rh_rate(float rh_rate, float *down, float *stable, float *up)
{
    *down   = trapezoid_mf(rh_rate, RHR_DOWN_A, RHR_DOWN_B, RHR_DOWN_C, RHR_DOWN_D);
    *stable = trapezoid_mf(rh_rate, RHR_STABLE_A, RHR_STABLE_B, RHR_STABLE_C, RHR_STABLE_D);
    *up     = trapezoid_mf(rh_rate, RHR_UP_A, RHR_UP_B, RHR_UP_C, RHR_UP_D);
}

/* ============================================================
 *  输出隶属度函数
 * ============================================================ */
static float output_mf_safe(float x)
{
    return trapezoid_mf(x, 0.0f, 0.0f, OUT_SAFE_CENTER, OUT_WATCH_CENTER);
}

static float output_mf_watch(float x)
{
    return trapezoid_mf(x, OUT_SAFE_CENTER, OUT_WATCH_CENTER, OUT_WATCH_CENTER, OUT_WARN_CENTER);
}

static float output_mf_warning(float x)
{
    return trapezoid_mf(x, OUT_WATCH_CENTER, OUT_WARN_CENTER, OUT_WARN_CENTER, OUT_ALARM_CENTER);
}

static float output_mf_alarm(float x)
{
    return trapezoid_mf(x, OUT_WARN_CENTER, OUT_ALARM_CENTER, 100.0f, 100.0f);
}

/* ============================================================
 *  重心法去模糊化
 * ============================================================ */
static float centroid_defuzz(float mu_safe, float mu_watch, float mu_warning, float mu_alarm)
{
    float numerator = 0.0f, denominator = 0.0f;
    int steps = 200;
    float step_size = 100.0f / (float)steps;

    for (int i = 0; i <= steps; i++) {
        float x = (float)i * step_size;
        float mu_s = output_mf_safe(x);
        float mu_w = output_mf_watch(x);
        float mu_wn = output_mf_warning(x);
        float mu_a = output_mf_alarm(x);

        float mu_agg = mu_safe * mu_s;
        if (mu_watch * mu_w > mu_agg) mu_agg = mu_watch * mu_w;
        if (mu_warning * mu_wn > mu_agg) mu_agg = mu_warning * mu_wn;
        if (mu_alarm * mu_a > mu_agg) mu_agg = mu_alarm * mu_a;

        numerator += x * mu_agg;
        denominator += mu_agg;
    }
    if (denominator < 0.001f) return 0.0f;
    return numerator / denominator;
}

/* ============================================================
 *  模糊推理 → BPA
 * ============================================================ */
static Fusion_BPA_t fuzzy_inference(float delta_t, float tvoc, float rh_rate, float t_rise_rate)
{
    float t_low, t_med, t_high;
    float g_low, g_med, g_high;
    float h_down, h_stable, h_up;

    fuzzy_temp_risk(delta_t, t_rise_rate, &t_low, &t_med, &t_high);
    fuzzy_gas_risk(tvoc, &g_low, &g_med, &g_high);
    fuzzy_rh_rate(rh_rate, &h_down, &h_stable, &h_up);

    float mu_safe = 0.0f, mu_watch = 0.0f, mu_warning = 0.0f, mu_alarm = 0.0f;
    float strength;

    /* 规则 1: (L, L, *) → 安全 */
    strength = fminf(t_low, g_low);
    if (strength > mu_safe) mu_safe = strength;

    /* 规则 2: (L, M, D/S) → 关注 */
    strength = fminf(t_low, fminf(g_med, fmaxf(h_down, h_stable)));
    if (strength > mu_watch) mu_watch = strength;

    /* 规则 3: (L, M, U) → 关注 */
    strength = fminf(t_low, fminf(g_med, h_up));
    if (strength > mu_watch) mu_watch = strength;

    /* 规则 4: (L, H, D) → 关注 */
    strength = fminf(t_low, fminf(g_high, h_down));
    if (strength > mu_watch) mu_watch = strength;

    /* 规则 5: (L, H, S/U) → 预警 */
    strength = fminf(t_low, fminf(g_high, fmaxf(h_stable, h_up)));
    if (strength > mu_warning) mu_warning = strength;

    /* 规则 6: (M, L, D) → 关注 */
    strength = fminf(t_med, fminf(g_low, h_down));
    if (strength > mu_watch) mu_watch = strength;

    /* 规则 7: (M, L, S/U) → 关注 */
    strength = fminf(t_med, fminf(g_low, fmaxf(h_stable, h_up)));
    if (strength > mu_watch) mu_watch = strength;

    /* 规则 8: (M, M, *) → 预警 */
    strength = fminf(t_med, g_med);
    if (strength > mu_warning) mu_warning = strength;

    /* 规则 9: (M, H, D/S) → 预警 */
    strength = fminf(t_med, fminf(g_high, fmaxf(h_down, h_stable)));
    if (strength > mu_warning) mu_warning = strength;

    /* 规则 10: (M, H, U) → 报警 */
    strength = fminf(t_med, fminf(g_high, h_up));
    if (strength > mu_alarm) mu_alarm = strength;

    /* 规则 11: (H, L, D) → 预警 */
    strength = fminf(t_high, fminf(g_low, h_down));
    if (strength > mu_warning) mu_warning = strength;

    /* 规则 12: (H, L, S/U) → 预警 */
    strength = fminf(t_high, fminf(g_low, fmaxf(h_stable, h_up)));
    if (strength > mu_warning) mu_warning = strength;

    /* 规则 13: (H, M, D) → 预警 */
    strength = fminf(t_high, fminf(g_med, h_down));
    if (strength > mu_warning) mu_warning = strength;

    /* 规则 14: (H, M, S/U) → 报警 */
    strength = fminf(t_high, fminf(g_med, fmaxf(h_stable, h_up)));
    if (strength > mu_alarm) mu_alarm = strength;

    /* 规则 15: (H, H, *) → 报警 */
    strength = fminf(t_high, g_high);
    if (strength > mu_alarm) mu_alarm = strength;

    float probability = centroid_defuzz(mu_safe, mu_watch, mu_warning, mu_alarm);

    Fusion_BPA_t bpa;
    bpa.fire = probability / 100.0f;
    bpa.no_fire = (100.0f - probability) / 100.0f;
    bpa.uncertain = 1.0f - bpa.fire - bpa.no_fire;
    if (bpa.uncertain < 0) bpa.uncertain = 0;

    return bpa;
}

/* ============================================================
 *  D-S 证据理论组合
 * ============================================================ */
static Fusion_BPA_t ds_combine(const Fusion_BPA_t *m1, const Fusion_BPA_t *m2)
{
    Fusion_BPA_t result;
    float K = m1->fire * m2->no_fire + m1->no_fire * m2->fire;

    if (K >= 0.999f) {
        result.fire = 0.0f;
        result.no_fire = 0.0f;
        result.uncertain = 1.0f;
        return result;
    }

    float denom = 1.0f - K;
    result.fire = (m1->fire * m2->fire + m1->fire * m2->uncertain + m1->uncertain * m2->fire) / denom;
    result.no_fire = (m1->no_fire * m2->no_fire + m1->no_fire * m2->uncertain + m1->uncertain * m2->no_fire) / denom;
    result.uncertain = (m1->uncertain * m2->uncertain) / denom;

    return result;
}

/* ============================================================
 *  线性回归斜率
 * ============================================================ */
static float linear_regression_slope(const float *buf, int count)
{
    if (count < 2) return 0.0f;
    float sum_x = 0.0f, sum_y = 0.0f, sum_xy = 0.0f, sum_x2 = 0.0f;
    for (int i = 0; i < count; i++) {
        float x = (float)i;
        sum_x += x;
        sum_y += buf[i];
        sum_xy += x * buf[i];
        sum_x2 += x * x;
    }
    float n = (float)count;
    float denom = n * sum_x2 - sum_x * sum_x;
    if (fabsf(denom) < 0.0001f) return 0.0f;
    return (n * sum_xy - sum_x * sum_y) / denom;
}

/* ============================================================
 *  决策判据
 * ============================================================ */
static Fusion_Level_t decide_level(float m_fire, float m_no_fire, float m_theta)
{
    if (m_fire >= 0.75f && m_theta <= 0.25f) return FUSION_LEVEL_ALARM;
    if (m_fire >= 0.55f && m_theta <= 0.35f) return FUSION_LEVEL_WARNING;
    if (m_fire >= 0.35f && m_no_fire < 0.50f) return FUSION_LEVEL_WATCH;
    return FUSION_LEVEL_SAFE;
}

/* ============================================================
 *  报警确认状态机
 * ============================================================ */
static Fusion_Level_t confirm_level(Fusion_Level_t new_level)
{
    if (new_level == FUSION_LEVEL_SAFE) {
        g_recover_safe++;
        g_confirm_watch = 0;
        g_confirm_warning = 0;
        g_confirm_alarm = 0;
        if (g_current_level != FUSION_LEVEL_SAFE && g_recover_safe >= RECOVER_FRAMES) {
            g_current_level = FUSION_LEVEL_SAFE;
            g_recover_safe = 0;

            Buzzer_Turn_Off();
            ESP_LOGI(TAG, "火灾已解除, 蜂鸣器已关闭");
        }
        return g_current_level;
    }

    g_recover_safe = 0;

    switch (new_level) {
    case FUSION_LEVEL_ALARM:
        g_confirm_alarm++;
        g_confirm_warning = 0;
        g_confirm_watch = 0;
        if (g_confirm_alarm >= CONFIRM_ALARM) {
            if (g_current_level < FUSION_LEVEL_ALARM) {
                g_current_level = FUSION_LEVEL_ALARM;

                esp_err_t buzzer_ret = Buzzer_Play_Alarm(BUZZER_ALARM_FIRE, 0);
                if (buzzer_ret == ESP_OK)
                {
                    ESP_LOGI(TAG, "🚨 检测到火灾! 蜂鸣器已启动火灾报警音");
                }
                else
                {
                    ESP_LOGE(TAG, "❌ 蜂鸣器启动失败: 0x%x", buzzer_ret);
                }
            }
        }
        break;
    case FUSION_LEVEL_WARNING:
        g_confirm_alarm = 0;
        g_confirm_warning++;
        g_confirm_watch = 0;
        if (g_confirm_warning >= CONFIRM_WARNING) {
            if (g_current_level < FUSION_LEVEL_WARNING) {
                g_current_level = FUSION_LEVEL_WARNING;

                esp_err_t buzzer_ret = Buzzer_Play_Alarm(BUZZER_ALARM_WARNING, 0);
                if (buzzer_ret == ESP_OK)
                {
                    ESP_LOGI(TAG, "⚠️  检测到火灾预警! 蜂鸣器已启动预警提示音");
                }
                else
                {
                    ESP_LOGE(TAG, "❌ 蜂鸣器启动失败: 0x%x", buzzer_ret);
                }
            }
        }
        break;
    case FUSION_LEVEL_WATCH:
        g_confirm_alarm = 0;
        g_confirm_warning = 0;
        g_confirm_watch++;
        if (g_confirm_watch >= CONFIRM_WATCH) {
            if (g_current_level < FUSION_LEVEL_WATCH) {
                g_current_level = FUSION_LEVEL_WATCH;
            }
        }
        break;
    default:
        break;
    }

    return g_current_level;
}

/* ============================================================
 *  获取状态字符串
 * ============================================================ */
static const char* get_status_string(Fusion_Level_t level)
{
    switch (level) {
        case FUSION_LEVEL_SAFE:    return "normal";
        case FUSION_LEVEL_WATCH:   return "normal";
        case FUSION_LEVEL_WARNING: return "warning";
        case FUSION_LEVEL_ALARM:   return "emergency";
        default:                   return "unknown";
    }
}

/* ============================================================
 *  获取等级名称
 * ============================================================ */
static const char* get_level_name(Fusion_Level_t level)
{
    switch (level) {
        case FUSION_LEVEL_SAFE:    return "safe";
        case FUSION_LEVEL_WATCH:   return "watch";
        case FUSION_LEVEL_WARNING: return "warning";
        case FUSION_LEVEL_ALARM:   return "alarm";
        default:                   return "unknown";
    }
}

/* ============================================================
 *  构建 MQTT JSON 上报数据 (标准格式 - MAC地址为Key)
 * ============================================================ */
static void build_mqtt_json(char *buffer, size_t buflen, const Fusion_Sensor_Snapshot_t *snap)
{
    if (!g_mac_initialized)
    {
        init_mac_address();
    }

	snprintf(buffer, buflen,
	"{\"%s\":{"
		"\"temp\":%.1f,"
		"\"hum\":%.1f,"
		"\"TVOC\":%.0f,"
		"\"ECO2\":%.0f,"
		"\"AQI\":%d,"
		"\"t_ambient\":%.2f,"
		"\"t_max\":%.2f,"
		"\"t_min\":%.2f,"
		"\"t_avg\":%.2f,"
		"\"electricity\":%.1f,"
		"\"electricity_Current\":%s,"
		"\"ESP32_fires_flag\":%s,"
		"\"ESP32_electricity_flag\":%s,"
		"\"buzzer\":%d"
	"}}",
	g_mac_address_str,
	snap->temperature,
	snap->humidity,
	snap->tvoc,
	snap->eco2,
	snap->aqi,
	snap->t_ambient,      /* ← 新增 */
	snap->t_max,          /* ← 新增 */
	snap->t_min,          /* ← 新增 */
	snap->t_avg,          /* ← 新增 */
	snap->electricity,
	snap->electricity_Current ? "true" : "false",
	snap->ESP32_fires_flag ? "true" : "false",
	snap->ESP32_electricity_flag ? "true" : "false",
	snap->buzzer
);
}

/* ============================================================
 *  从通信模块读取所有传感器数据并填充快照
 * ============================================================ */
static void read_all_sensors(Fusion_Sensor_Snapshot_t *snap, float *t_rise_rate, float *rh_rate)
{
    memset(snap, 0, sizeof(Fusion_Sensor_Snapshot_t));

    Comm_All_Data_t allData;
    esp_err_t commRet = Comm_Get_All_Data(&allData);

    /* ---- 初始化新增字段为默认值 ---- */
    snap->electricity            = 0.0f;
    snap->electricity_Current    = false;
    snap->ESP32_fires_flag       = false;
    snap->ESP32_electricity_flag = false;
    snap->buzzer                 = 0;

    /* ---- 1. MLX90640 热成像数据 ---- */
    if (commRet == ESP_OK && allData.mlx.valid)
    {
        snap->t_max        = allData.mlx.t_max;
        snap->t_min        = allData.mlx.t_min;
        snap->t_avg        = allData.mlx.t_avg;
        snap->t_ambient    = allData.mlx.t_ambient;
        snap->t_delta      = allData.mlx.t_max - allData.mlx.t_ambient;
        snap->hot_spot_cnt = allData.mlx.hot_spot_cnt;
    }

    /* ---- 2. ENS160 气体数据 ---- */
    if (commRet == ESP_OK && allData.ens.valid)
    {
        snap->tvoc = (float)allData.ens.tvoc;
        snap->eco2 = (float)allData.ens.eco2;
        snap->aqi  = (int)allData.ens.aqi;
    }

    /* ---- 3. AHT2x 温湿度数据 ---- */
    if (commRet == ESP_OK && allData.aht.valid)
    {
        snap->temperature = allData.aht.temperature;
        snap->humidity    = allData.aht.humidity;
    }

    /* ---- 4. 更新滑动窗口 ---- */
    g_delta_t_buf[g_buf_index] = snap->t_delta;
    g_rh_buf[g_buf_index] = snap->humidity;
    g_buf_index = (g_buf_index + 1) % WINDOW_SIZE;
    if (g_buf_count < WINDOW_SIZE) {
        g_buf_count++;
    }

    /* ---- 5. 计算变化率 ---- */
    if (g_buf_count >= 2) {
        *t_rise_rate = linear_regression_slope(g_delta_t_buf, g_buf_count);
        *rh_rate = linear_regression_slope(g_rh_buf, g_buf_count);
    } else {
        *t_rise_rate = 0.0f;
        *rh_rate = 0.0f;
    }

    snap->t_rise_rate = *t_rise_rate;
    snap->humidity_rate = *rh_rate;
}

/* ============================================================
 *  执行融合计算
 * ============================================================ */
static void run_fusion(Fusion_Sensor_Snapshot_t *snap)
{
    float t_rise_rate, rh_rate;
    read_all_sensors(snap, &t_rise_rate, &rh_rate);

    /* ---- 如果热成像无效，直接返回安全状态 ---- */
    if (snap->t_max <= 0.0f) {
        snap->level = FUSION_LEVEL_SAFE;
        snap->probability = 0.0f;
        snap->bpa.fire = 0.0f;
        snap->bpa.no_fire = 0.0f;
        snap->bpa.uncertain = 1.0f;
        return;
    }

    /* ---- 温度单独证据 ---- */
    float t_low, t_med, t_high;
    fuzzy_temp_risk(snap->t_delta, t_rise_rate, &t_low, &t_med, &t_high);
    float temp_prob = centroid_defuzz(t_low, t_med, t_high, 0.0f);
    Fusion_BPA_t bpa_t;
    bpa_t.fire = temp_prob / 100.0f;
    bpa_t.no_fire = (100.0f - temp_prob) / 100.0f;
    bpa_t.uncertain = 1.0f - bpa_t.fire - bpa_t.no_fire;
    if (bpa_t.uncertain < 0) bpa_t.uncertain = 0;

    /* ---- 气体单独证据 ---- */
    float g_low, g_med, g_high;
    fuzzy_gas_risk(snap->tvoc, &g_low, &g_med, &g_high);
    float gas_prob = centroid_defuzz(g_low, g_med, g_high, 0.0f);
    Fusion_BPA_t bpa_g;
    bpa_g.fire = gas_prob / 100.0f;
    bpa_g.no_fire = (100.0f - gas_prob) / 100.0f;
    bpa_g.uncertain = 1.0f - bpa_g.fire - bpa_g.no_fire;
    if (bpa_g.uncertain < 0) bpa_g.uncertain = 0;

    /* ---- 湿度单独证据 ---- */
    float h_down, h_stable, h_up;
    fuzzy_rh_rate(rh_rate, &h_down, &h_stable, &h_up);
    float humi_prob = fmaxf(h_down, h_up) * 50.0f;
    if (humi_prob > 100.0f) humi_prob = 100.0f;
    Fusion_BPA_t bpa_h;
    bpa_h.fire = humi_prob / 100.0f;
    bpa_h.no_fire = (100.0f - humi_prob) / 100.0f;
    bpa_h.uncertain = 1.0f - bpa_h.fire - bpa_h.no_fire;
    if (bpa_h.uncertain < 0) bpa_h.uncertain = 0;

    /* ---- D-S 组合 ---- */
    Fusion_BPA_t bpa_tg = ds_combine(&bpa_t, &bpa_g);
    Fusion_BPA_t bpa_final = ds_combine(&bpa_tg, &bpa_h);

    float K2 = bpa_tg.fire * bpa_h.no_fire + bpa_tg.no_fire * bpa_h.fire;

    /* ---- 决策 ---- */
    Fusion_Level_t raw_level = decide_level(bpa_final.fire, bpa_final.no_fire, bpa_final.uncertain);
    Fusion_Level_t confirmed_level = confirm_level(raw_level);

    /* ---- 填充快照 ---- */
    snap->level = confirmed_level;
    snap->probability = bpa_final.fire;
    snap->bpa = bpa_final;
    snap->conflict = K2;

    /* ---- 设置新增字段 ---- */
    snap->ESP32_fires_flag = (confirmed_level >= FUSION_LEVEL_WARNING);
    snap->buzzer = Buzzer_Is_Active() ? 1 : 0;
}

/* ============================================================
 *  公开 API 实现
 * ============================================================ */

esp_err_t SensorFusion_Init(i2c_master_bus_handle_t busHandle)
{
    ESP_LOGI(TAG, "初始化传感器融合模块...");

    /* 初始化ESP32 MAC地址 */
    init_mac_address();

    /* 传感器初始化由各自的 RTOS 任务负责, 融合模块只需等待数据就绪 */

    memset(&g_result, 0, sizeof(g_result));
    memset(&g_snapshot, 0, sizeof(g_snapshot));
    g_result.level = FUSION_LEVEL_SAFE;
    g_snapshot.level = FUSION_LEVEL_SAFE;

    memset(g_delta_t_buf, 0, sizeof(g_delta_t_buf));
    memset(g_rh_buf, 0, sizeof(g_rh_buf));
    g_buf_index = 0;
    g_buf_count = 0;

    g_confirm_watch = 0;
    g_confirm_warning = 0;
    g_confirm_alarm = 0;
    g_recover_safe = 0;
    g_current_level = FUSION_LEVEL_SAFE;
    g_alarm_callback = NULL;

    if (g_mutex == NULL) {
        g_mutex = xSemaphoreCreateMutex();
        if (g_mutex == NULL) {
            ESP_LOGE(TAG, "创建互斥锁失败");
            return ESP_ERR_NO_MEM;
        }
    }

    ESP_LOGI(TAG, "传感器融合模块初始化完成");
    return ESP_OK;
}

void SensorFusion_Register_Alarm_Callback(Fusion_Alarm_Callback_t callback)
{
    g_alarm_callback = callback;
}

esp_err_t SensorFusion_Get_Snapshot(Fusion_Sensor_Snapshot_t *snapshot)
{
    if (snapshot == NULL) return ESP_ERR_INVALID_ARG;

    if (xSemaphoreTake(g_mutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        memcpy(snapshot, &g_snapshot, sizeof(Fusion_Sensor_Snapshot_t));
        xSemaphoreGive(g_mutex);
        return ESP_OK;
    }
    return ESP_ERR_NOT_FOUND;
}

esp_err_t SensorFusion_Get_Result(Fusion_Result_t *result)
{
    if (result == NULL) return ESP_ERR_INVALID_ARG;

    if (xSemaphoreTake(g_mutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        memcpy(result, &g_result, sizeof(Fusion_Result_t));
        xSemaphoreGive(g_mutex);
        return ESP_OK;
    }
    return ESP_ERR_NOT_FOUND;
}

Fusion_Level_t SensorFusion_Get_Level(void)
{
    Fusion_Level_t level = FUSION_LEVEL_SAFE;
    if (xSemaphoreTake(g_mutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        level = g_result.level;
        xSemaphoreGive(g_mutex);
    }
    return level;
}

float SensorFusion_Get_Probability(void)
{
    float prob = 0.0f;
    if (xSemaphoreTake(g_mutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        prob = g_result.probability;
        xSemaphoreGive(g_mutex);
    }
    return prob;
}

const char* SensorFusion_Get_Mac_Address(void)
{
    if (!g_mac_initialized)
    {
        init_mac_address();
    }
    return g_mac_address_str;
}

void SensorFusion_Print_Mac_Info(void)
{
    if (!g_mac_initialized)
    {
        ESP_LOGW(TAG, "MAC地址尚未初始化, 正在获取...");
        init_mac_address();
    }

    ESP_LOGI(TAG, "");
    ESP_LOGI(TAG, "╔════════════════════════════════════════════╗");
    ESP_LOGI(TAG, "║       📋 ESP32 设备信息面板                 ║");
    ESP_LOGI(TAG, "╠════════════════════════════════════════════╣");
    ESP_LOGI(TAG, "║ 🆔 设备ID (MAC地址):                       ║");
    ESP_LOGI(TAG, "║    %s", g_mac_address_str);
    if (strlen(g_mac_address_str) < 38)
    {
        ESP_LOGI(TAG, "║%s", "                                            ║" + (38 - strlen(g_mac_address_str)));
    }
    else
    {
        ESP_LOGI(TAG, "║                                            ║");
    }
    ESP_LOGI(TAG, "╠════════════════════════════════════════════╣");
    ESP_LOGI(TAG, "║ 💡 使用说明:                                 ║");
    ESP_LOGI(TAG, "║   • 此ID用于MQTT JSON的Key字段             ║");
    ESP_LOGI(TAG, "║   • 格式: {\"%s\":{数据}}     ║", g_mac_address_str);
    ESP_LOGI(TAG, "║   • 每台设备唯一, 可用于设备区分           ║");
    ESP_LOGI(TAG, "╚════════════════════════════════════════════╝");
    ESP_LOGI(TAG, "");

    /* 再次调用init_mac_address会显示详细信息 (因为已初始化, 只打印一次) */
    if (g_mac_initialized)
    {
        uint8_t mac_buf[6] = {0};
        if (esp_read_mac(mac_buf, ESP_MAC_WIFI_STA) == ESP_OK)
        {
            ESP_LOGI(TAG, "📊 原始字节值: %02X %02X %02X %02X %02X %02X",
                     mac_buf[0], mac_buf[1], mac_buf[2],
                     mac_buf[3], mac_buf[4], mac_buf[5]);
            ESP_LOGI(TAG, "🏭 厂商识别码(OUI): %02X:%02X:%02X → %s",
                     mac_buf[0], mac_buf[1], mac_buf[2],
                     (mac_buf[0] == 0xD8 && mac_buf[1] == 0xBC && mac_buf[2] == 0x38) ? "Espressif Systems (乐鑫)" : "其他厂商");
        }
    }
    ESP_LOGI(TAG, "");
}

void SensorFusion_Task(void *pvParameters)
{
    i2c_master_bus_handle_t busHandle = (i2c_master_bus_handle_t)pvParameters;
    TickType_t last_wake_time = xTaskGetTickCount();

    ESP_LOGI(TAG, "传感器融合任务启动");

    /* 确保模块已初始化 */
    if (SensorFusion_Init(busHandle) != ESP_OK)
    {
        ESP_LOGE(TAG, "融合模块初始化失败!");
        vTaskDelete(NULL);
        return;
    }

    /* 等待所有传感器产生第一帧数据 */
    ESP_LOGI(TAG, "等待传感器数据就绪...");
    EventBits_t readyBits = Comm_Wait_Events(COMM_EVENT_ALL_READY, 10000);
    if (!(readyBits & COMM_EVENT_ALL_READY))
    {
        ESP_LOGW(TAG, "等待传感器数据超时, 继续运行 (已就绪: 0x%02X)", (unsigned int)readyBits);
    }
    else
    {
        ESP_LOGI(TAG, "所有传感器数据已就绪, 开始融合计算");
    }

    while (1)
    {
        /* ---- 1. 从通信模块读取所有传感器数据 ---- */
        Fusion_Sensor_Snapshot_t snap;
        run_fusion(&snap);

        /* ---- 2. 更新全局状态 (线程安全) ---- */
        if (xSemaphoreTake(g_mutex, pdMS_TO_TICKS(100)) == pdTRUE)
        {
            memcpy(&g_snapshot, &snap, sizeof(Fusion_Sensor_Snapshot_t));
            g_result.level       = snap.level;
            g_result.probability = snap.probability;
            g_result.bpa         = snap.bpa;
            g_result.conflict    = snap.conflict;
            g_result.t_max       = snap.t_max;
            g_result.delta_t     = snap.t_delta;
            g_result.t_rise_rate = snap.t_rise_rate;
            g_result.tvoc        = snap.tvoc;
            g_result.rh          = snap.humidity;
            g_result.rh_rate     = snap.humidity_rate;
            g_result.hot_spot_cnt = snap.hot_spot_cnt;
            g_result.timestamp   = xTaskGetTickCount() * portTICK_PERIOD_MS;
            xSemaphoreGive(g_mutex);
        }

        /* ---- 3. 触发报警回调 (如有) ---- */
        if (g_alarm_callback != NULL)
        {
            g_alarm_callback(&g_result);
        }

        /* ---- 4. MQTT 上报 JSON 数据 ---- */
        if (Mqtt_Is_Connected())
        {
            char json_buf[1024];
            build_mqtt_json(json_buf, sizeof(json_buf), &snap);
            esp_err_t pub_ret = Mqtt_Publish(MQTT_TOPIC_FIRE_ALERT, json_buf, strlen(json_buf));
            if (pub_ret == ESP_OK)
            {
                static int pub_count = 0;
                if (pub_count < 10)
                {
                    ESP_LOGI(TAG, "MQTT 上报成功 (#%d): level=%s, prob=%.2f",
                             pub_count, get_level_name(snap.level), snap.probability);
                    pub_count++;
                }
            }
            else
            {
                ESP_LOGE(TAG, "MQTT 上报失败: %d", pub_ret);
            }
        }
        else
        {
            static int mqtt_warn_cnt = 0;
            if (mqtt_warn_cnt < 5)
            {
                ESP_LOGW(TAG, "MQTT 未连接, 跳过上报");
                mqtt_warn_cnt++;
            }
        }

        /* ---- 5. 本地日志 (调试级别) ---- */
        ESP_LOGD(TAG, "融合: level=%s, Tmax=%.1f, TVOC=%.0f, RH=%.1f, prob=%.3f",
                 get_level_name(snap.level), snap.t_max, snap.tvoc, snap.humidity, snap.probability);

        /* ---- 6. 等待下一个周期 (2秒) ---- */
        vTaskDelayUntil(&last_wake_time, pdMS_TO_TICKS(2000));
    }
}