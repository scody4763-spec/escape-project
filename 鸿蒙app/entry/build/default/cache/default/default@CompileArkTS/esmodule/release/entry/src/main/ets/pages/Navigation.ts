if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface EscapePage_Params {
    locateStatus?: LocateStatus;
    alarmStatus?: AlarmStatus;
    currentDirection?: EscapeDirection;
    exitName?: string;
    distance?: number;
    estimatedTime?: number;
    floor?: string;
    nodeName?: string;
    voiceEnabled?: boolean;
    statusText?: string;
    bleService?: BleService;
    apiService?: ApiService;
    locateTimer?: number | null;
}
import { BleService } from "@normalized:N&&&entry/src/main/ets/services/BleService&";
import { ApiService } from "@normalized:N&&&entry/src/main/ets/services/ApiService&";
import { MqttService } from "@normalized:N&&&entry/src/main/ets/services/MqttService&";
import { t } from "@normalized:N&&&entry/src/main/ets/i18n/I18n&";
import { EscapeDirection, LocateStatus, AlarmStatus } from "@normalized:N&&&entry/src/main/ets/models/Types&";
import type { BeaconInfo, LocationResponse } from "@normalized:N&&&entry/src/main/ets/models/Types&";
import window from "@ohos:window";
class EscapePage extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__locateStatus = new ObservedPropertySimplePU(LocateStatus.LOCATING, this, "locateStatus");
        this.__alarmStatus = new ObservedPropertySimplePU(AlarmStatus.FIRE, this, "alarmStatus");
        this.__currentDirection = new ObservedPropertySimplePU(EscapeDirection.UP, this, "currentDirection");
        this.__exitName = new ObservedPropertySimplePU('安全出口', this, "exitName");
        this.__distance = new ObservedPropertySimplePU(0, this, "distance");
        this.__estimatedTime = new ObservedPropertySimplePU(0, this, "estimatedTime");
        this.__floor = new ObservedPropertySimplePU('', this, "floor");
        this.__nodeName = new ObservedPropertySimplePU('', this, "nodeName");
        this.__voiceEnabled = new ObservedPropertySimplePU(true, this, "voiceEnabled");
        this.__statusText = new ObservedPropertySimplePU('', this, "statusText");
        this.bleService = BleService.getInstance();
        this.apiService = ApiService.getInstance();
        this.locateTimer = null;
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: EscapePage_Params) {
        if (params.locateStatus !== undefined) {
            this.locateStatus = params.locateStatus;
        }
        if (params.alarmStatus !== undefined) {
            this.alarmStatus = params.alarmStatus;
        }
        if (params.currentDirection !== undefined) {
            this.currentDirection = params.currentDirection;
        }
        if (params.exitName !== undefined) {
            this.exitName = params.exitName;
        }
        if (params.distance !== undefined) {
            this.distance = params.distance;
        }
        if (params.estimatedTime !== undefined) {
            this.estimatedTime = params.estimatedTime;
        }
        if (params.floor !== undefined) {
            this.floor = params.floor;
        }
        if (params.nodeName !== undefined) {
            this.nodeName = params.nodeName;
        }
        if (params.voiceEnabled !== undefined) {
            this.voiceEnabled = params.voiceEnabled;
        }
        if (params.statusText !== undefined) {
            this.statusText = params.statusText;
        }
        if (params.bleService !== undefined) {
            this.bleService = params.bleService;
        }
        if (params.apiService !== undefined) {
            this.apiService = params.apiService;
        }
        if (params.locateTimer !== undefined) {
            this.locateTimer = params.locateTimer;
        }
    }
    updateStateVars(params: EscapePage_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__locateStatus.purgeDependencyOnElmtId(rmElmtId);
        this.__alarmStatus.purgeDependencyOnElmtId(rmElmtId);
        this.__currentDirection.purgeDependencyOnElmtId(rmElmtId);
        this.__exitName.purgeDependencyOnElmtId(rmElmtId);
        this.__distance.purgeDependencyOnElmtId(rmElmtId);
        this.__estimatedTime.purgeDependencyOnElmtId(rmElmtId);
        this.__floor.purgeDependencyOnElmtId(rmElmtId);
        this.__nodeName.purgeDependencyOnElmtId(rmElmtId);
        this.__voiceEnabled.purgeDependencyOnElmtId(rmElmtId);
        this.__statusText.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__locateStatus.aboutToBeDeleted();
        this.__alarmStatus.aboutToBeDeleted();
        this.__currentDirection.aboutToBeDeleted();
        this.__exitName.aboutToBeDeleted();
        this.__distance.aboutToBeDeleted();
        this.__estimatedTime.aboutToBeDeleted();
        this.__floor.aboutToBeDeleted();
        this.__nodeName.aboutToBeDeleted();
        this.__voiceEnabled.aboutToBeDeleted();
        this.__statusText.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __locateStatus: ObservedPropertySimplePU<LocateStatus>;
    get locateStatus() {
        return this.__locateStatus.get();
    }
    set locateStatus(newValue: LocateStatus) {
        this.__locateStatus.set(newValue);
    }
    private __alarmStatus: ObservedPropertySimplePU<AlarmStatus>;
    get alarmStatus() {
        return this.__alarmStatus.get();
    }
    set alarmStatus(newValue: AlarmStatus) {
        this.__alarmStatus.set(newValue);
    }
    private __currentDirection: ObservedPropertySimplePU<EscapeDirection>;
    get currentDirection() {
        return this.__currentDirection.get();
    }
    set currentDirection(newValue: EscapeDirection) {
        this.__currentDirection.set(newValue);
    }
    private __exitName: ObservedPropertySimplePU<string>;
    get exitName() {
        return this.__exitName.get();
    }
    set exitName(newValue: string) {
        this.__exitName.set(newValue);
    }
    private __distance: ObservedPropertySimplePU<number>;
    get distance() {
        return this.__distance.get();
    }
    set distance(newValue: number) {
        this.__distance.set(newValue);
    }
    private __estimatedTime: ObservedPropertySimplePU<number>;
    get estimatedTime() {
        return this.__estimatedTime.get();
    }
    set estimatedTime(newValue: number) {
        this.__estimatedTime.set(newValue);
    }
    private __floor: ObservedPropertySimplePU<string>;
    get floor() {
        return this.__floor.get();
    }
    set floor(newValue: string) {
        this.__floor.set(newValue);
    }
    private __nodeName: ObservedPropertySimplePU<string>;
    get nodeName() {
        return this.__nodeName.get();
    }
    set nodeName(newValue: string) {
        this.__nodeName.set(newValue);
    }
    private __voiceEnabled: ObservedPropertySimplePU<boolean>;
    get voiceEnabled() {
        return this.__voiceEnabled.get();
    }
    set voiceEnabled(newValue: boolean) {
        this.__voiceEnabled.set(newValue);
    }
    private __statusText: ObservedPropertySimplePU<string>;
    get statusText() {
        return this.__statusText.get();
    }
    set statusText(newValue: string) {
        this.__statusText.set(newValue);
    }
    private bleService: BleService;
    private apiService: ApiService;
    private locateTimer: number | null;
    aboutToAppear() {
        this.statusText = t('nav_locating');
        this.startLocating();
        this.keepScreenOn();
        // 监听火警解除
        MqttService.getInstance().setCallbacks({
            onClear: () => {
                this.alarmStatus = AlarmStatus.CLEARED;
                this.statusText = t('nav_alarm_cleared');
            }
        });
    }
    aboutToDisappear() {
        this.stopLocating();
        this.releaseScreenWakeLock();
    }
    /** 保持屏幕常亮 */
    private async keepScreenOn() {
        try {
            const win = await window.getLastWindow(getContext(this));
            win.setKeepScreenOn(true);
        }
        catch (err) {
            console.error(`[EscapePage] keepScreenOn error: ${JSON.stringify(err)}`);
        }
    }
    /** 释放屏幕常亮 */
    private async releaseScreenWakeLock() {
        try {
            const win = await window.getLastWindow(getContext(this));
            win.setKeepScreenOn(false);
        }
        catch {
            // ignore
        }
    }
    /** 开始定位循环 */
    private startLocating() {
        this.locateTimer = setInterval(() => {
            this.performLocation();
        }, 3000);
        this.performLocation();
    }
    /** 停止定位 */
    private stopLocating() {
        if (this.locateTimer) {
            clearInterval(this.locateTimer);
            this.locateTimer = null;
        }
        this.bleService.stopScan();
    }
    /** 执行一次定位流程 */
    private async performLocation() {
        try {
            // 扫描 BLE 信标
            const beacons = await this.scanBeacons();
            if (beacons.length === 0) {
                this.locateStatus = LocateStatus.FAILED;
                this.statusText = t('nav_no_beacon');
                return;
            }
            // 上报云端获取定位
            const location = await this.apiService.reportLocation(beacons);
            if (location) {
                this.locateStatus = LocateStatus.LOCATED;
                this.currentDirection = location.direction;
                this.exitName = location.exitName;
                this.distance = location.distance;
                this.estimatedTime = location.estimatedTime;
                this.floor = location.floor;
                this.nodeName = location.nodeId;
                this.statusText = `${t('nav_located')} · ${location.floor} · ${location.nodeId}`;
            }
            else {
                this.locateStatus = LocateStatus.FAILED;
                this.statusText = t('nav_no_beacon');
            }
        }
        catch (err) {
            console.error(`[EscapePage] performLocation error: ${JSON.stringify(err)}`);
            this.locateStatus = LocateStatus.FAILED;
        }
    }
    /** 模拟 BLE 信标扫描 */
    private async scanBeacons(): Promise<BeaconInfo[]> {
        // 开发阶段返回模拟数据
        return [
            { nodeId: 'ESP32-01', floor: '2F', rssi: -65 },
            { nodeId: 'ESP32-02', floor: '2F', rssi: -72 },
            { nodeId: 'ESP32-03', floor: '2F', rssi: -80 }
        ];
    }
    /** 获取方向箭头图标 */
    getDirectionIcon(dir: EscapeDirection): string {
        switch (dir) {
            case EscapeDirection.UP:
                return '⬆️';
            case EscapeDirection.DOWN:
                return '⬇️';
            case EscapeDirection.LEFT:
                return '⬅️';
            case EscapeDirection.RIGHT:
                return '➡️';
            case EscapeDirection.LEFT_UP:
                return '↖️';
            case EscapeDirection.RIGHT_UP:
                return '↗️';
            case EscapeDirection.LEFT_DOWN:
                return '↙️';
            case EscapeDirection.RIGHT_DOWN:
                return '↘️';
            default:
                return '⬆️';
        }
    }
    /** 呼叫119 */
    call119() {
        AlertDialog.show({
            title: t('nav_call_119'),
            message: '是否拨打火警电话 119？',
            primaryButton: {
                value: '取消',
                action: () => { }
            },
            secondaryButton: {
                value: '呼叫',
                action: () => {
                    try {
                        // 使用系统拨号能力
                        console.log('[EscapePage] Dialing 119...');
                    }
                    catch (err) {
                        console.error(`[EscapePage] Call 119 error: ${JSON.stringify(err)}`);
                    }
                }
            }
        });
    }
    /** 重新定位 */
    relocate() {
        this.locateStatus = LocateStatus.LOCATING;
        this.statusText = t('nav_locating');
        this.performLocation();
    }
    /** 切换语音 */
    toggleVoice() {
        this.voiceEnabled = !this.voiceEnabled;
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.height('100%');
            Column.backgroundColor('#FFF3E0');
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // ===== 顶部：火警状态 =====
            Column.create();
            // ===== 顶部：火警状态 =====
            Column.padding({ left: 16, right: 16, top: 8 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.padding(12);
            Row.backgroundColor('#C62828');
            Row.borderRadius(8);
            Row.width('100%');
            Row.justifyContent(FlexAlign.Center);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('🚨');
            Text.fontSize(20);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(t('nav_fire_alarm'));
            Text.fontSize(16);
            Text.fontWeight(FontWeight.Bold);
            Text.fontColor('#FFFFFF');
            Text.margin({ left: 8 });
        }, Text);
        Text.pop();
        Row.pop();
        // ===== 顶部：火警状态 =====
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // ===== 定位状态 =====
            Row.create();
            // ===== 定位状态 =====
            Row.padding({ left: 16, right: 16, top: 8, bottom: 4 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.statusText);
            Text.fontSize(14);
            Text.fontColor(this.locateStatus === LocateStatus.LOCATED ? '#4CAF50' :
                this.locateStatus === LocateStatus.FAILED ? '#FF9800' : '#2196F3');
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.locateStatus === LocateStatus.LOCATING) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        LoadingProgress.create();
                        LoadingProgress.width(16);
                        LoadingProgress.height(16);
                        LoadingProgress.color('#2196F3');
                        LoadingProgress.margin({ left: 8 });
                    }, LoadingProgress);
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
        // ===== 定位状态 =====
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // ===== 核心：大箭头区域 =====
            Column.create();
            // ===== 核心：大箭头区域 =====
            Column.layoutWeight(1);
            // ===== 核心：大箭头区域 =====
            Column.justifyContent(FlexAlign.Center);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            // 楼层/节点信息
            if (this.locateStatus === LocateStatus.LOCATED) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(`${this.floor} · ${this.nodeName}`);
                        Text.fontSize(14);
                        Text.fontColor('#666666');
                        Text.margin({ bottom: 16 });
                    }, Text);
                    Text.pop();
                });
            }
            // 超大方向箭头
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 超大方向箭头
            Text.create(this.getDirectionIcon(this.currentDirection));
            // 超大方向箭头
            Text.fontSize(80);
            // 超大方向箭头
            Text.fontWeight(FontWeight.Bold);
            // 超大方向箭头
            Text.lineHeight(96);
            // 超大方向箭头
            Text.margin({ bottom: 16 });
        }, Text);
        // 超大方向箭头
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            // 出口信息
            if (this.locateStatus === LocateStatus.LOCATED) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(this.exitName);
                        Text.fontSize(20);
                        Text.fontWeight(FontWeight.Bold);
                        Text.fontColor('#333333');
                        Text.margin({ bottom: 8 });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create();
                        Row.margin({ top: 8 });
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.margin({ right: 24 });
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(`${this.distance}m`);
                        Text.fontSize(18);
                        Text.fontWeight(FontWeight.Medium);
                        Text.fontColor('#D32F2F');
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(t('nav_distance'));
                        Text.fontSize(12);
                        Text.fontColor('#999999');
                    }, Text);
                    Text.pop();
                    Column.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(`${this.estimatedTime}s`);
                        Text.fontSize(18);
                        Text.fontWeight(FontWeight.Medium);
                        Text.fontColor('#D32F2F');
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(t('nav_time'));
                        Text.fontSize(12);
                        Text.fontColor('#999999');
                    }, Text);
                    Text.pop();
                    Column.pop();
                    Row.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
        // ===== 核心：大箭头区域 =====
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // ===== 底部操作栏 =====
            Row.create();
            // ===== 底部操作栏 =====
            Row.padding({ left: 16, right: 16, bottom: 32 });
            // ===== 底部操作栏 =====
            Row.width('100%');
            // ===== 底部操作栏 =====
            Row.justifyContent(FlexAlign.Center);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 呼叫119
            Button.createWithChild();
            // 呼叫119
            Button.width(80);
            // 呼叫119
            Button.height(72);
            // 呼叫119
            Button.backgroundColor('#D32F2F');
            // 呼叫119
            Button.borderRadius(12);
            // 呼叫119
            Button.onClick(() => this.call119());
        }, Button);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('📞');
            Text.fontSize(24);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(t('nav_call_119'));
            Text.fontSize(12);
            Text.fontColor('#FFFFFF');
        }, Text);
        Text.pop();
        Column.pop();
        // 呼叫119
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 重新定位
            Button.createWithChild();
            // 重新定位
            Button.width(80);
            // 重新定位
            Button.height(72);
            // 重新定位
            Button.backgroundColor('#FFFFFF');
            // 重新定位
            Button.borderRadius(12);
            // 重新定位
            Button.shadow({ radius: 2, color: '#1A000000', offsetY: 1 });
            // 重新定位
            Button.onClick(() => this.relocate());
            // 重新定位
            Button.margin({ left: 12 });
        }, Button);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('📍');
            Text.fontSize(24);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(t('nav_relocate'));
            Text.fontSize(12);
            Text.fontColor('#333333');
        }, Text);
        Text.pop();
        Column.pop();
        // 重新定位
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 语音开关
            Button.createWithChild();
            // 语音开关
            Button.width(80);
            // 语音开关
            Button.height(72);
            // 语音开关
            Button.backgroundColor('#FFFFFF');
            // 语音开关
            Button.borderRadius(12);
            // 语音开关
            Button.shadow({ radius: 2, color: '#1A000000', offsetY: 1 });
            // 语音开关
            Button.onClick(() => this.toggleVoice());
            // 语音开关
            Button.margin({ left: 12 });
        }, Button);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.voiceEnabled ? '🔊' : '🔇');
            Text.fontSize(24);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.voiceEnabled ? t('nav_voice_on') : t('nav_voice_off'));
            Text.fontSize(12);
            Text.fontColor('#333333');
        }, Text);
        Text.pop();
        Column.pop();
        // 语音开关
        Button.pop();
        // ===== 底部操作栏 =====
        Row.pop();
        Column.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "EscapePage";
    }
}
registerNamedRoute(() => new EscapePage(undefined, {}), "", { bundleName: "com.escape.guide", moduleName: "entry", pagePath: "pages/Navigation", pageFullPath: "entry/src/main/ets/pages/Navigation", integratedHsp: "false", moduleType: "followWithHap" });
