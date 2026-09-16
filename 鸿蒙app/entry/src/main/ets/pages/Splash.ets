/**
 * 启动页（Splash）
 * - 显示应用 Logo 和名称
 * - 权限说明
 * - 初始化 MQTT、BLE 等核心服务
 */
import { MqttService } from '../services/MqttService';
import { BleService } from '../services/BleService';
import { PreferencesUtil } from '../util/PreferencesUtil';
import { PREF_KEYS, DEFAULT_VALUES } from '../util/Constants';
import { setLanguage, t } from '../i18n/I18n';
import { ThemeMode, LangSetting } from '../models/Types';
import { router } from '@kit.ArkUI';

@Entry
@Component
struct Splash {
  @State initStatus: string = '';
  @State progress: number = 0;
  @State isReady: boolean = false;

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
      } else {
        console.warn('[Splash] Bluetooth not available');
      }
      this.progress = 70;

      // 4. 连接 MQTT
      this.initStatus = t('splash_mqtt_connecting');
      this.progress = 85;
      const mqttService = MqttService.getInstance();
      mqttService.connect();
      console.log('[Splash] MQTT connect triggered');
    } catch (err) {
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

  build() {
    Column() {
      // Logo 区域
      Column() {
        Image($r('app.media.fire_escape_poster'))
          .width(160)
          .height(160)
          .objectFit(ImageFit.Contain)
          .margin({ bottom: 16 })

        Text(t('splash_title'))
          .fontSize(28)
          .fontWeight(FontWeight.Bold)
          .fontColor('#D32F2F')

        Text(t('splash_subtitle'))
          .fontSize(14)
          .fontColor('#666666')
          .margin({ top: 8 })
      }
      .layoutWeight(1)
      .justifyContent(FlexAlign.Center)

      // 加载状态
      Column() {
        LoadingProgress()
          .width(48)
          .height(48)
          .color('#D32F2F')
          .margin({ bottom: 16 })

        Text(this.initStatus)
          .fontSize(14)
          .fontColor('#999999')

        // 进度条
        Progress({ value: this.progress, total: 100, type: ProgressType.Linear })
          .width('60%')
          .height(4)
          .color('#D32F2F')
          .backgroundColor('#E0E0E0')
          .margin({ top: 12 })
      }
      .height(140)

      // 权限说明
      Text(t('splash_permission_note'))
        .fontSize(12)
        .fontColor('#999999')
        .textAlign(TextAlign.Center)
        .padding({ left: 32, right: 32, bottom: 32 })
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#FAFAFA')
  }
}
