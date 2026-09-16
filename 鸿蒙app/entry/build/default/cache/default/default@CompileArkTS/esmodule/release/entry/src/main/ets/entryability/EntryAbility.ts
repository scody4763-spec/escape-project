import type AbilityConstant from "@ohos:app.ability.AbilityConstant";
import UIAbility from "@ohos:app.ability.UIAbility";
import type Want from "@ohos:app.ability.Want";
import type window from "@ohos:window";
import { MqttService } from "@normalized:N&&&entry/src/main/ets/services/MqttService&";
import { BleService } from "@normalized:N&&&entry/src/main/ets/services/BleService&";
import { PreferencesUtil } from "@normalized:N&&&entry/src/main/ets/util/PreferencesUtil&";
export default class EntryAbility extends UIAbility {
    private mqttService: MqttService = MqttService.getInstance();
    private bleService: BleService = BleService.getInstance();
    private prefUtil: PreferencesUtil = PreferencesUtil.getInstance();
    private currentWindowClass: window.Window | null = null;
    onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
        console.log('[EntryAbility] onCreate');
        // 初始化在 Splash 页面进行
    }
    onWindowStageCreate(windowStage: window.WindowStage): void {
        console.log('[EntryAbility] onWindowStageCreate');
        // 保存窗口引用
        windowStage.getMainWindow().then((win: window.Window) => {
            this.currentWindowClass = win;
        }).catch((err: Error) => {
            console.error(`[EntryAbility] getMainWindow error: ${JSON.stringify(err)}`);
        });
        // 设置加载窗口
        windowStage.loadContent('pages/Splash', (err: Error) => {
            if (err) {
                console.error(`[EntryAbility] loadContent error: ${JSON.stringify(err)}`);
                return;
            }
            console.log('[EntryAbility] Splash page loaded');
        });
    }
    onForeground(): void {
        console.log('[EntryAbility] onForeground');
        // 恢复 MQTT 连接
        if (!this.mqttService.isConnected()) {
            this.mqttService.connect();
        }
    }
    onBackground(): void {
        console.log('[EntryAbility] onBackground');
    }
    onDestroy(): void {
        console.log('[EntryAbility] onDestroy');
        // 清理资源
        this.mqttService.disconnect();
        this.bleService.stopScan();
    }
}
