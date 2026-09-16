if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface Settings_Params {
    themeMode?: ThemeMode;
    language?: LangSetting;
}
import { PreferencesUtil } from "@normalized:N&&&entry/src/main/ets/util/PreferencesUtil&";
import { PREF_KEYS, DEFAULT_VALUES } from "@normalized:N&&&entry/src/main/ets/util/Constants&";
import { setLanguage, t } from "@normalized:N&&&entry/src/main/ets/i18n/I18n&";
import { ThemeMode, LangSetting } from "@normalized:N&&&entry/src/main/ets/models/Types&";
import router from "@ohos:router";
class Settings extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__themeMode = new ObservedPropertySimplePU(ThemeMode.DAY, this, "themeMode");
        this.__language = new ObservedPropertySimplePU(LangSetting.ZH, this, "language");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: Settings_Params) {
        if (params.themeMode !== undefined) {
            this.themeMode = params.themeMode;
        }
        if (params.language !== undefined) {
            this.language = params.language;
        }
    }
    updateStateVars(params: Settings_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__themeMode.purgeDependencyOnElmtId(rmElmtId);
        this.__language.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__themeMode.aboutToBeDeleted();
        this.__language.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __themeMode: ObservedPropertySimplePU<ThemeMode>;
    get themeMode() {
        return this.__themeMode.get();
    }
    set themeMode(newValue: ThemeMode) {
        this.__themeMode.set(newValue);
    }
    private __language: ObservedPropertySimplePU<LangSetting>;
    get language() {
        return this.__language.get();
    }
    set language(newValue: LangSetting) {
        this.__language.set(newValue);
    }
    aboutToAppear() {
        this.loadSettings();
    }
    async loadSettings() {
        const pref = PreferencesUtil.getInstance();
        const theme = await pref.getString(PREF_KEYS.THEME_MODE, DEFAULT_VALUES.THEME_MODE);
        const lang = await pref.getString(PREF_KEYS.LANGUAGE, DEFAULT_VALUES.LANGUAGE);
        this.themeMode = theme as ThemeMode;
        this.language = lang as LangSetting;
    }
    async toggleTheme() {
        const newMode = this.themeMode === ThemeMode.DAY ? ThemeMode.NIGHT : ThemeMode.DAY;
        this.themeMode = newMode;
        const pref = PreferencesUtil.getInstance();
        await pref.putString(PREF_KEYS.THEME_MODE, newMode);
        console.log(`[Settings] Theme changed to: ${newMode}`);
    }
    async toggleLanguage() {
        const newLang = this.language === LangSetting.ZH ? LangSetting.EN : LangSetting.ZH;
        this.language = newLang;
        setLanguage(newLang);
        const pref = PreferencesUtil.getInstance();
        await pref.putString(PREF_KEYS.LANGUAGE, newLang);
        // 刷新 UI
        this.loadSettings();
    }
    showAbout() {
        AlertDialog.show({
            title: t('settings_about'),
            message: t('about_text'),
            autoCancel: true,
            alignment: DialogAlignment.Center,
            primaryButton: {
                value: '关闭',
                action: () => { }
            }
        });
    }
    goBack() {
        router.back();
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.height('100%');
            Column.backgroundColor('#F5F5F5');
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 顶部栏
            Row.create();
            // 顶部栏
            Row.width('100%');
            // 顶部栏
            Row.padding({ left: 8, right: 16, top: 12, bottom: 8 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithChild();
            Button.width(44);
            Button.height(44);
            Button.backgroundColor('#00000000');
            Button.onClick(() => this.goBack());
        }, Button);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('←');
            Text.fontSize(24);
            Text.fontColor('#333333');
        }, Text);
        Text.pop();
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(t('settings_title'));
            Text.fontSize(22);
            Text.fontWeight(FontWeight.Bold);
            Text.margin({ left: 8 });
        }, Text);
        Text.pop();
        // 顶部栏
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 设置项列表
            Column.create();
            // 设置项列表
            Column.width('100%');
            // 设置项列表
            Column.padding(16);
            // 设置项列表
            Column.layoutWeight(1);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 日夜模式
            Row.create();
            // 日夜模式
            Row.width('100%');
            // 日夜模式
            Row.padding(16);
            // 日夜模式
            Row.backgroundColor('#FFFFFF');
            // 日夜模式
            Row.borderRadius(8);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(t('settings_day_mode'));
            Text.fontSize(16);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(t('settings_night_mode'));
            Text.fontSize(12);
            Text.fontColor('#999999');
            Text.margin({ top: 2 });
        }, Text);
        Text.pop();
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Blank.create();
        }, Blank);
        Blank.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Toggle.create({ type: ToggleType.Switch, isOn: this.themeMode === ThemeMode.NIGHT });
            Toggle.onChange(() => this.toggleTheme());
        }, Toggle);
        Toggle.pop();
        // 日夜模式
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 语言切换
            Row.create();
            // 语言切换
            Row.width('100%');
            // 语言切换
            Row.padding(16);
            // 语言切换
            Row.backgroundColor('#FFFFFF');
            // 语言切换
            Row.borderRadius(8);
            // 语言切换
            Row.margin({ top: 1 });
            // 语言切换
            Row.onClick(() => this.toggleLanguage());
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(t('settings_language'));
            Text.fontSize(16);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Blank.create();
        }, Blank);
        Blank.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.language === LangSetting.ZH ? '中文' : 'English');
            Text.fontSize(16);
            Text.fontColor('#D32F2F');
        }, Text);
        Text.pop();
        // 语言切换
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 关于
            Row.create();
            // 关于
            Row.width('100%');
            // 关于
            Row.padding(16);
            // 关于
            Row.backgroundColor('#FFFFFF');
            // 关于
            Row.borderRadius(8);
            // 关于
            Row.margin({ top: 1 });
            // 关于
            Row.onClick(() => this.showAbout());
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(t('settings_about'));
            Text.fontSize(16);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Blank.create();
        }, Blank);
        Blank.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('→');
            Text.fontSize(18);
            Text.fontColor('#CCCCCC');
        }, Text);
        Text.pop();
        // 关于
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 版本
            Row.create();
            // 版本
            Row.width('100%');
            // 版本
            Row.padding(16);
            // 版本
            Row.backgroundColor('#FFFFFF');
            // 版本
            Row.borderRadius(8);
            // 版本
            Row.margin({ top: 1 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(t('settings_version'));
            Text.fontSize(16);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Blank.create();
        }, Blank);
        Blank.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('1.0.1');
            Text.fontSize(16);
            Text.fontColor('#999999');
        }, Text);
        Text.pop();
        // 版本
        Row.pop();
        // 设置项列表
        Column.pop();
        Column.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "Settings";
    }
}
registerNamedRoute(() => new Settings(undefined, {}), "", { bundleName: "com.escape.guide", moduleName: "entry", pagePath: "pages/Settings", pageFullPath: "entry/src/main/ets/pages/Settings", integratedHsp: "false", moduleType: "followWithHap" });
