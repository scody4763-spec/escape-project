/**
 * EntryAbility - 应用入口 Ability
 * - 生命周期管理
 * - MQTT 火警监听（全局）
 * - 火警时自动跳转逃生页
 * - 屏幕常亮管理
 * - 通知/震动/TTS 管理
 */
import { AbilityConstant, UIAbility, Want } from '@kit.AbilityKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { abilityAccessCtrl, Permissions } from '@kit.AbilityKit';
import { window } from '@kit.ArkUI';
import { router } from '@kit.ArkUI';
import { MqttService } from '../services/MqttService';
import { BleService } from '../services/BleService';
import { PreferencesUtil } from '../util/PreferencesUtil';
import { setLanguage, getLanguage, t } from '../i18n/I18n';
import { PREF_KEYS, DEFAULT_VALUES } from '../util/Constants';
import { LangSetting } from '../models/Types';

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

    // 申请蓝牙权限（BLE 扫描需要 ACCESS_BLUETOOTH）
    this.requestBluetoothPermission().finally(() => {
      // 设置加载窗口
      windowStage.loadContent('pages/Splash', (err: BusinessError) => {
        if (err.code !== 0) {
          console.error(`[EntryAbility] loadContent error: ${JSON.stringify(err)}`);
          return;
        }
        console.log('[EntryAbility] Splash page loaded');
      });
    });
  }

  /** 申请蓝牙扫描权限 */
  private async requestBluetoothPermission(): Promise<void> {
    try {
      const atManager = abilityAccessCtrl.createAtManager();
      const permissions: Permissions[] = ['ohos.permission.ACCESS_BLUETOOTH'];
      const result = await atManager.requestPermissionsFromUser(this.context, permissions);
      console.info(`[EntryAbility] ACCESS_BLUETOOTH grant result: ${JSON.stringify(result.authResults)}`);
    } catch (err) {
      console.error(`[EntryAbility] requestBluetoothPermission error: ${JSON.stringify(err)}`);
    }
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
