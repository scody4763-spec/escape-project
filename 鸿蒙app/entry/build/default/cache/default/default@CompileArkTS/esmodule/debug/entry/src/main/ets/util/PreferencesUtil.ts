import preferences from "@ohos:data.preferences";
import { PREF_NAME } from "@normalized:N&&&entry/src/main/ets/util/Constants&";
/**
 * 本地偏好存储工具
 */
export class PreferencesUtil {
    private static instance: PreferencesUtil;
    private pref: preferences.Preferences | null = null;
    private constructor() {
    }
    static getInstance(): PreferencesUtil {
        if (!PreferencesUtil.instance) {
            PreferencesUtil.instance = new PreferencesUtil();
        }
        return PreferencesUtil.instance;
    }
    /** 初始化存储 */
    async init(context: Context): Promise<void> {
        try {
            this.pref = await preferences.getPreferences(context, PREF_NAME);
        }
        catch (err) {
            console.error(`PreferencesUtil init error: ${JSON.stringify(err)}`);
        }
    }
    /** 读取字符串 */
    async getString(key: string, defaultValue: string): Promise<string> {
        try {
            if (!this.pref)
                return defaultValue;
            return (await this.pref.get(key, defaultValue)) as string;
        }
        catch {
            return defaultValue;
        }
    }
    /** 写入字符串 */
    async putString(key: string, value: string): Promise<void> {
        try {
            if (!this.pref)
                return;
            await this.pref.put(key, value);
            await this.pref.flush();
        }
        catch (err) {
            console.error(`PreferencesUtil putString error: ${JSON.stringify(err)}`);
        }
    }
    /** 读取布尔值 */
    async getBoolean(key: string, defaultValue: boolean): Promise<boolean> {
        try {
            if (!this.pref)
                return defaultValue;
            return (await this.pref.get(key, defaultValue)) as boolean;
        }
        catch {
            return defaultValue;
        }
    }
    /** 写入布尔值 */
    async putBoolean(key: string, value: boolean): Promise<void> {
        try {
            if (!this.pref)
                return;
            await this.pref.put(key, value);
            await this.pref.flush();
        }
        catch (err) {
            console.error(`PreferencesUtil putBoolean error: ${JSON.stringify(err)}`);
        }
    }
}
