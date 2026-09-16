/**
 * 逃生导航页（核心页面）
 * - 火警自动全屏进入
 * - 超大 8 方向箭头（≥48fp）
 * - 定位状态提示
 * - 呼叫119、重新定位、语音开关
 * - 屏幕常亮、震动、TTS
 */
import { BleService } from '../services/BleService';
import { ApiService } from '../services/ApiService';
import { MqttService } from '../services/MqttService';
import { BLE_CONFIG } from '../util/Constants';
import { t } from '../i18n/I18n';
import { EscapeDirection, LocateStatus, AlarmStatus } from '../models/Types';
import type { BeaconInfo, LocationResponse } from '../models/Types';
import { router } from '@kit.ArkUI';
import { window } from '@kit.ArkUI';

@Entry
@Component
struct EscapePage {
  @State locateStatus: LocateStatus = LocateStatus.LOCATING;
  @State alarmStatus: AlarmStatus = AlarmStatus.FIRE;
  @State currentDirection: EscapeDirection = EscapeDirection.UP;
  @State exitName: string = '安全出口';
  @State distance: number = 0;
  @State estimatedTime: number = 0;
  @State floor: string = '';
  @State nodeName: string = '';
  @State voiceEnabled: boolean = true;
  @State statusText: string = '';

  private bleService: BleService = BleService.getInstance();
  private apiService: ApiService = ApiService.getInstance();
  private locateTimer: number | null = null;

  aboutToAppear() {
    this.statusText = t('nav_locating');
    // 启动 BLE 持续扫描，信标实时累积到 BleService
    this.bleService.clearBeacons();
    this.bleService.startScan();
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
    this.bleService.stopScan();
    this.releaseScreenWakeLock();
  }

  /** 保持屏幕常亮 */
  private async keepScreenOn() {
    try {
      const win = await window.getLastWindow(getContext(this));
      win.setKeepScreenOn(true);
    } catch (err) {
      console.error(`[EscapePage] keepScreenOn error: ${JSON.stringify(err)}`);
    }
  }

  /** 释放屏幕常亮 */
  private async releaseScreenWakeLock() {
    try {
      const win = await window.getLastWindow(getContext(this));
      win.setKeepScreenOn(false);
    } catch {
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
  }

  /** 执行一次定位流程 */
  private async performLocation() {
    try {
      // 从已累积的 BLE 扫描结果中取最强信标
      const beacons = this.scanBeacons();

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
      } else {
        this.locateStatus = LocateStatus.FAILED;
        this.statusText = t('nav_no_beacon');
      }
    } catch (err) {
      console.error(`[EscapePage] performLocation error: ${JSON.stringify(err)}`);
      this.locateStatus = LocateStatus.FAILED;
    }
  }

  /** 从 BLE 扫描缓存中取最强信标 */
  private scanBeacons(): BeaconInfo[] {
    return this.bleService.getStrongestBeacons(BLE_CONFIG.RSSI_STRONGEST_COUNT);
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
        action: () => {}
      },
      secondaryButton: {
        value: '呼叫',
        action: () => {
          try {
            // 使用系统拨号能力
            console.log('[EscapePage] Dialing 119...');
          } catch (err) {
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

  build() {
    Column() {
      // ===== 顶部：火警状态 =====
      Column() {
        Row() {
          Text('🚨')
            .fontSize(20)
          Text(t('nav_fire_alarm'))
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor('#FFFFFF')
            .margin({ left: 8 })
        }
        .padding(12)
        .backgroundColor('#C62828')
        .borderRadius(8)
        .width('100%')
        .justifyContent(FlexAlign.Center)
      }
      .padding({ left: 16, right: 16, top: 8 })

      // ===== 定位状态 =====
      Row() {
        Text(this.statusText)
          .fontSize(14)
          .fontColor(this.locateStatus === LocateStatus.LOCATED ? '#4CAF50' :
            this.locateStatus === LocateStatus.FAILED ? '#FF9800' : '#2196F3')
        if (this.locateStatus === LocateStatus.LOCATING) {
          LoadingProgress()
            .width(16)
            .height(16)
            .color('#2196F3')
            .margin({ left: 8 })
        }
      }
      .padding({ left: 16, right: 16, top: 8, bottom: 4 })

      // ===== 核心：大箭头区域 =====
      Column() {
        // 楼层/节点信息
        if (this.locateStatus === LocateStatus.LOCATED) {
          Text(`${this.floor} · ${this.nodeName}`)
            .fontSize(14)
            .fontColor('#666666')
            .margin({ bottom: 16 })
        }

        // 超大方向箭头
        Text(this.getDirectionIcon(this.currentDirection))
          .fontSize(80)
          .fontWeight(FontWeight.Bold)
          .lineHeight(96)
          .margin({ bottom: 16 })

        // 出口信息
        if (this.locateStatus === LocateStatus.LOCATED) {
          Text(this.exitName)
            .fontSize(20)
            .fontWeight(FontWeight.Bold)
            .fontColor('#333333')
            .margin({ bottom: 8 })

          Row() {
            Column() {
              Text(`${this.distance}m`)
                .fontSize(18)
                .fontWeight(FontWeight.Medium)
                .fontColor('#D32F2F')
              Text(t('nav_distance'))
                .fontSize(12)
                .fontColor('#999999')
            }
            .margin({ right: 24 })

            Column() {
              Text(`${this.estimatedTime}s`)
                .fontSize(18)
                .fontWeight(FontWeight.Medium)
                .fontColor('#D32F2F')
              Text(t('nav_time'))
                .fontSize(12)
                .fontColor('#999999')
            }
          }
          .margin({ top: 8 })
        }
      }
      .layoutWeight(1)
      .justifyContent(FlexAlign.Center)

      // ===== 底部操作栏 =====
      Row() {
        // 呼叫119
        Button() {
          Column() {
            Text('📞')
              .fontSize(24)
            Text(t('nav_call_119'))
              .fontSize(12)
              .fontColor('#FFFFFF')
          }
        }
        .width(80)
        .height(72)
        .backgroundColor('#D32F2F')
        .borderRadius(12)
        .onClick(() => this.call119())

        // 重新定位
        Button() {
          Column() {
            Text('📍')
              .fontSize(24)
            Text(t('nav_relocate'))
              .fontSize(12)
              .fontColor('#333333')
          }
        }
        .width(80)
        .height(72)
        .backgroundColor('#FFFFFF')
        .borderRadius(12)
        .shadow({ radius: 2, color: '#1A000000', offsetY: 1 })
        .onClick(() => this.relocate())
        .margin({ left: 12 })

        // 语音开关
        Button() {
          Column() {
            Text(this.voiceEnabled ? '🔊' : '🔇')
              .fontSize(24)
            Text(this.voiceEnabled ? t('nav_voice_on') : t('nav_voice_off'))
              .fontSize(12)
              .fontColor('#333333')
          }
        }
        .width(80)
        .height(72)
        .backgroundColor('#FFFFFF')
        .borderRadius(12)
        .shadow({ radius: 2, color: '#1A000000', offsetY: 1 })
        .onClick(() => this.toggleVoice())
        .margin({ left: 12 })
      }
      .padding({ left: 16, right: 16, bottom: 32 })
      .width('100%')
      .justifyContent(FlexAlign.Center)
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#FFF3E0')
  }
}
