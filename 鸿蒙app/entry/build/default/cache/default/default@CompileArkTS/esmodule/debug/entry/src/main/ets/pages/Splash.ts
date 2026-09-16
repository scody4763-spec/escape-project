if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface Splash_Params {
    initStatus?: string;
    progress?: number;
    isReady?: boolean;
}
import { MqttService } from "@normalized:N&&&entry/src/main/ets/services/MqttService&";
import { BleService } from "@normalized:N&&&entry/src/main/ets/services/BleService&";
import { PreferencesUtil } from "@normalized:N&&&entry/src/main/ets/util/PreferencesUtil&";
import { PREF_KEYS, DEFAULT_VALUES } from "@normalized:N&&&entry/src/main/ets/util/Constants&";
import { setLanguage, t } from "@normalized:N&&&entry/src/main/ets/i18n/I18n&";
import type { LangSetting } from '../models/Types';
import router from "@ohos:router";
class Splash extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__initStatus = new ObservedPropertySimplePU('', this, "initStatus");
        this.__progress = new ObservedPropertySimplePU(0, this, "progress");
        this.__isReady = new ObservedPropertySimplePU(false, this, "isReady");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: Splash_Params) {
        if (params.initStatus !== undefined) {
            this.initStatus = params.initStatus;
        }
        if (params.progress !== undefined) {
            this.progress = params.progress;
        }
        if (params.isReady !== undefined) {
            this.isReady = params.isReady;
        }
    }
    updateStateVars(params: Splash_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__initStatus.purgeDependencyOnElmtId(rmElmtId);
        this.__progress.purgeDependencyOnElmtId(rmElmtId);
        this.__isReady.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__initStatus.aboutToBeDeleted();
        this.__progress.aboutToBeDeleted();
        this.__isReady.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __initStatus: ObservedPropertySimplePU<string>;
    get initStatus() {
        return this.__initStatus.get();
    }
    set initStatus(newValue: string) {
        this.__initStatus.set(newValue);
    }
    private __progress: ObservedPropertySimplePU<number>;
    get progress() {
        return this.__progress.get();
    }
    set progress(newValue: number) {
        this.__progress.set(newValue);
    }
    private __isReady: ObservedPropertySimplePU<boolean>;
    get isReady() {
        return this.__isReady.get();
    }
    set isReady(newValue: boolean) {
        this.__isReady.set(newValue);
    }
    aboutToAppear() {
        this.initApp();
    }
    async initApp() {
        try {
            // 1. 初始化本地存储
            this.initStatus = t('splash_init');
            this.progress = 10;
            const context = getContext(this);
            const prefUtil = PreferencesUtil.getInstance();
            await prefUtil.init(context);
            this.progress = 25;
            // 2. 读取保存的设置
            const lang = await prefUtil.getString(PREF_KEYS.LANGUAGE, DEFAULT_VALUES.LANGUAGE);
            setLanguage(lang as LangSetting);
            const theme = await prefUtil.getString(PREF_KEYS.THEME_MODE, DEFAULT_VALUES.THEME_MODE);
            this.progress = 40;
            // 3. 连接蓝牙
            this.initStatus = t('splash_ble_scanning');
            this.progress = 55;
            const bleService = BleService.getInstance();
            const bleAvailable = await bleService.isBluetoothAvailable();
            if (bleAvailable) {
                console.log('[Splash] Bluetooth available');
            }
            else {
                console.warn('[Splash] Bluetooth not available');
            }
            this.progress = 70;
            // 4. 连接 MQTT
            this.initStatus = t('splash_mqtt_connecting');
            this.progress = 85;
            const mqttService = MqttService.getInstance();
            mqttService.connect();
            console.log('[Splash] MQTT connect triggered');
        }
        catch (err) {
            console.error(`[Splash] init error: ${JSON.stringify(err)}`);
        }
        this.progress = 100;
        this.initStatus = t('splash_ready');
        this.isReady = true;
        // 延迟跳转到首页
        setTimeout(() => {
            this.navigateToHome();
        }, 1000);
    }
    navigateToHome() {
        router.replaceUrl({ url: 'pages/Home' });
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.height('100%');
            Column.backgroundColor('#FAFAFA');
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // Logo 区域
            Column.create();
            // Logo 区域
            Column.layoutWeight(1);
            // Logo 区域
            Column.justifyContent(FlexAlign.Center);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777263, "type": 20000, params: [], "bundleName": "com.escape.guide", "moduleName": "entry" });
            Image.width(160);
            Image.height(160);
            Image.objectFit(ImageFit.Contain);
            Image.margin({ bottom: 16 });
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(t('splash_title'));
            Text.fontSize(28);
            Text.fontWeight(FontWeight.Bold);
            Text.fontColor('#D32F2F');
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(t('splash_subtitle'));
            Text.fontSize(14);
            Text.fontColor('#666666');
            Text.margin({ top: 8 });
        }, Text);
        Text.pop();
        // Logo 区域
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 加载状态
            Column.create();
            // 加载状态
            Column.height(140);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            LoadingProgress.create();
            LoadingProgress.width(48);
            LoadingProgress.height(48);
            LoadingProgress.color('#D32F2F');
            LoadingProgress.margin({ bottom: 16 });
        }, LoadingProgress);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.initStatus);
            Text.fontSize(14);
            Text.fontColor('#999999');
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 进度条
            Progress.create({ value: this.progress, total: 100, type: ProgressType.Linear });
            // 进度条
            Progress.width('60%');
            // 进度条
            Progress.height(4);
            // 进度条
            Progress.color('#D32F2F');
            // 进度条
            Progress.backgroundColor('#E0E0E0');
            // 进度条
            Progress.margin({ top: 12 });
        }, Progress);
        // 加载状态
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 权限说明
            Text.create(t('splash_permission_note'));
            // 权限说明
            Text.fontSize(12);
            // 权限说明
            Text.fontColor('#999999');
            // 权限说明
            Text.textAlign(TextAlign.Center);
            // 权限说明
            Text.padding({ left: 32, right: 32, bottom: 32 });
        }, Text);
        // 权限说明
        Text.pop();
        Column.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "Splash";
    }
}
registerNamedRoute(() => new Splash(undefined, {}), "", { bundleName: "com.escape.guide", moduleName: "entry", pagePath: "pages/Splash", pageFullPath: "entry/src/main/ets/pages/Splash", integratedHsp: "false", moduleType: "followWithHap" });
