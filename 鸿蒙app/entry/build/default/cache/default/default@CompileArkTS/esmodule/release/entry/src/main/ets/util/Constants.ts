/**
 * 应用常量配置
 */
/** MQTT 服务器配置接口 */
export interface MqttConfig {
    HOST: string;
    PORT: number;
    PATH: string;
    PROTOCOL: string;
    TOPIC_ALARM: string;
    TOPIC_DATA: string;
    TOPIC_COMMAND: string;
    CLIENT_ID_PREFIX: string;
}
/** HTTP API 配置接口 */
export interface ApiConfig {
    BASE_URL: string;
    LOCATION_ENDPOINT: string;
    ARTICLES_ENDPOINT: string;
    TIMEOUT: number;
}
/** BLE 扫描配置接口 */
export interface BleConfig {
    SCAN_INTERVAL_MS: number;
    RSSI_STRONGEST_COUNT: number;
    TARGET_UUID_PREFIX: string;
}
/** 逃生导航配置接口 */
export interface NavConfig {
    KEEP_SCREEN_ON: boolean;
    RESCAN_INTERVAL_MS: number;
    VIBRATE_PATTERN: number[];
    TTS_LANG_ZH: string;
    TTS_LANG_EN: string;
}
/** 偏好存储键接口 */
export interface PrefKeys {
    THEME_MODE: string;
    LANGUAGE: string;
    VOICE_ENABLED: string;
    FIRST_LAUNCH: string;
}
/** 默认值接口 */
export interface DefaultValuesType {
    THEME_MODE: string;
    LANGUAGE: string;
    VOICE_ENABLED: boolean;
}
/** MQTT 服务器配置（wss） */
export const MQTT_CONFIG: MqttConfig = {
    HOST: '42.193.218.29',
    PORT: 8084,
    PATH: '/mqtt',
    PROTOCOL: 'wss',
    TOPIC_ALARM: 'escape/alarm/+',
    TOPIC_DATA: 'escape/data/+',
    TOPIC_COMMAND: 'escape/command/+',
    CLIENT_ID_PREFIX: 'harmony_escape_'
};
/** HTTP API 配置 */
export const API_CONFIG: ApiConfig = {
    BASE_URL: 'http://42.193.218.29:8080',
    LOCATION_ENDPOINT: '/api/location',
    ARTICLES_ENDPOINT: '/api/articles',
    TIMEOUT: 10000
};
/** BLE 扫描配置 */
export const BLE_CONFIG: BleConfig = {
    SCAN_INTERVAL_MS: 3000,
    RSSI_STRONGEST_COUNT: 5,
    TARGET_UUID_PREFIX: 'ESCAPE-'
};
/** 逃生导航配置 */
export const NAV_CONFIG: NavConfig = {
    KEEP_SCREEN_ON: true,
    RESCAN_INTERVAL_MS: 3000,
    VIBRATE_PATTERN: [200, 100, 200],
    TTS_LANG_ZH: 'zh-CN',
    TTS_LANG_EN: 'en-US'
};
/** 偏好存储键名 */
export const PREF_NAME: string = 'escape_guide_pref';
export const PREF_KEYS: PrefKeys = {
    THEME_MODE: 'theme_mode',
    LANGUAGE: 'language',
    VOICE_ENABLED: 'voice_enabled',
    FIRST_LAUNCH: 'first_launch'
};
export const DEFAULT_VALUES: DefaultValuesType = {
    THEME_MODE: 'day',
    LANGUAGE: 'zh',
    VOICE_ENABLED: true
};
