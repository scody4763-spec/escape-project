/**
 * 国际化工具
 */
import { LangSetting } from '../models/Types';

/** 国际化语言包接口 */
export interface LocaleBundle {
  app_name: string;
  home_title: string;
  nav_title: string;
  nav_locating: string;
  nav_located: string;
  nav_no_beacon: string;
  nav_call_119: string;
  nav_relocate: string;
  nav_voice_on: string;
  nav_voice_off: string;
  nav_exit: string;
  nav_distance: string;
  nav_time: string;
  nav_fire_alarm: string;
  nav_alarm_cleared: string;
  settings_title: string;
  settings_day_mode: string;
  settings_night_mode: string;
  settings_language: string;
  settings_about: string;
  settings_version: string;
  about_text: string;
  splash_init: string;
  splash_ble_scanning: string;
  splash_mqtt_connecting: string;
  splash_ready: string;
  splash_title: string;
  splash_subtitle: string;
  splash_permission_note: string;
}

/** 简体中文语言包 */
const zh: LocaleBundle = {
  app_name: '鸿蒙逃生导航',
  home_title: '逃生知识',
  nav_title: '逃生导航',
  nav_locating: '蓝牙定位中…',
  nav_located: '已定位',
  nav_no_beacon: '未扫描到信标，请靠近最近应急灯',
  nav_call_119: '呼叫119',
  nav_relocate: '重新定位',
  nav_voice_on: '关闭语音',
  nav_voice_off: '开启语音',
  nav_exit: '出口',
  nav_distance: '距离',
  nav_time: '预计时间',
  nav_fire_alarm: '🔥 火警！请立即逃生',
  nav_alarm_cleared: '火警已解除',
  settings_title: '设置',
  settings_day_mode: '日间模式',
  settings_night_mode: '夜间模式',
  settings_language: '语言',
  settings_about: '关于',
  settings_version: '版本',
  about_text: '鸿蒙逃生导航 v1.0.1\n基于智能建筑消防逃生 AIoT 系统\n提供室内蓝牙定位逃生指引',
  splash_init: '正在初始化…',
  splash_ble_scanning: '正在初始化蓝牙…',
  splash_mqtt_connecting: '正在连接服务器…',
  splash_ready: '准备就绪',
  splash_title: '鸿蒙逃生导航',
  splash_subtitle: '基于智能建筑消防逃生 AIoT 系统',
  splash_permission_note: '本应用需要蓝牙和位置权限以提供逃生导航服务'
};

/** 英文语言包 */
const en: LocaleBundle = {
  app_name: 'Escape Guide',
  home_title: 'Escape Knowledge',
  nav_title: 'Escape Navigation',
  nav_locating: 'BLE locating…',
  nav_located: 'Located',
  nav_no_beacon: 'No beacon found, please approach nearest emergency light',
  nav_call_119: 'Call 119',
  nav_relocate: 'Relocate',
  nav_voice_on: 'Voice Off',
  nav_voice_off: 'Voice On',
  nav_exit: 'Exit',
  nav_distance: 'Distance',
  nav_time: 'Est. Time',
  nav_fire_alarm: '🔥 FIRE! Evacuate immediately',
  nav_alarm_cleared: 'Alarm cleared',
  settings_title: 'Settings',
  settings_day_mode: 'Day Mode',
  settings_night_mode: 'Night Mode',
  settings_language: 'Language',
  settings_about: 'About',
  settings_version: 'Version',
  about_text: 'Escape Guide v1.0.1\nBased on Smart Building Fire Escape AIoT System\nIndoor BLE positioning escape guidance',
  splash_init: 'Initializing…',
  splash_ble_scanning: 'Initializing Bluetooth…',
  splash_mqtt_connecting: 'Connecting to server…',
  splash_ready: 'Ready',
  splash_title: 'Escape Guide',
  splash_subtitle: 'Based on Smart Building Fire Escape AIoT System',
  splash_permission_note: 'This app requires Bluetooth and location permissions for escape navigation'
};

let currentLang: LangSetting = LangSetting.ZH;

/** 设置当前语言 */
export function setLanguage(lang: LangSetting): void {
  currentLang = lang;
}

/** 获取当前语言 */
export function getLanguage(): LangSetting {
  return currentLang;
}

/** 根据 key 从 bundle 取值（避免下标访问） */
function getFromBundle(bundle: LocaleBundle, key: keyof LocaleBundle): string {
  if (key === 'app_name') {
    return bundle.app_name;
  } else if (key === 'home_title') {
    return bundle.home_title;
  } else if (key === 'nav_title') {
    return bundle.nav_title;
  } else if (key === 'nav_locating') {
    return bundle.nav_locating;
  } else if (key === 'nav_located') {
    return bundle.nav_located;
  } else if (key === 'nav_no_beacon') {
    return bundle.nav_no_beacon;
  } else if (key === 'nav_call_119') {
    return bundle.nav_call_119;
  } else if (key === 'nav_relocate') {
    return bundle.nav_relocate;
  } else if (key === 'nav_voice_on') {
    return bundle.nav_voice_on;
  } else if (key === 'nav_voice_off') {
    return bundle.nav_voice_off;
  } else if (key === 'nav_exit') {
    return bundle.nav_exit;
  } else if (key === 'nav_distance') {
    return bundle.nav_distance;
  } else if (key === 'nav_time') {
    return bundle.nav_time;
  } else if (key === 'nav_fire_alarm') {
    return bundle.nav_fire_alarm;
  } else if (key === 'nav_alarm_cleared') {
    return bundle.nav_alarm_cleared;
  } else if (key === 'settings_title') {
    return bundle.settings_title;
  } else if (key === 'settings_day_mode') {
    return bundle.settings_day_mode;
  } else if (key === 'settings_night_mode') {
    return bundle.settings_night_mode;
  } else if (key === 'settings_language') {
    return bundle.settings_language;
  } else if (key === 'settings_about') {
    return bundle.settings_about;
  } else if (key === 'settings_version') {
    return bundle.settings_version;
  } else if (key === 'about_text') {
    return bundle.about_text;
  } else if (key === 'splash_init') {
    return bundle.splash_init;
  } else if (key === 'splash_ble_scanning') {
    return bundle.splash_ble_scanning;
  } else if (key === 'splash_mqtt_connecting') {
    return bundle.splash_mqtt_connecting;
  } else if (key === 'splash_ready') {
    return bundle.splash_ready;
  } else if (key === 'splash_title') {
    return bundle.splash_title;
  } else if (key === 'splash_subtitle') {
    return bundle.splash_subtitle;
  } else if (key === 'splash_permission_note') {
    return bundle.splash_permission_note;
  }
  return key as string;
}

/** 获取翻译文本 */
export function t(key: keyof LocaleBundle): string {
  if (currentLang === LangSetting.ZH) {
    return getFromBundle(zh, key);
  }
  return getFromBundle(en, key);
}
