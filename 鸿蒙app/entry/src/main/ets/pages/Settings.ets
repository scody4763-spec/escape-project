/**
 * 设置页
 * - 日夜模式切换
 * - 中/英语言切换
 * - 关于、版本信息
 */
import { PreferencesUtil } from '../util/PreferencesUtil';
import { PREF_KEYS, DEFAULT_VALUES } from '../util/Constants';
import { setLanguage, t } from '../i18n/I18n';
import { ThemeMode, LangSetting } from '../models/Types';
import { router } from '@kit.ArkUI';

@Entry
@Component
struct Settings {
  @State themeMode: ThemeMode = ThemeMode.DAY;
  @State language: LangSetting = LangSetting.ZH;

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
        action: () => {}
      }
    });
  }

  goBack() {
    router.back();
  }

  build() {
    Column() {
      // 顶部栏
      Row() {
        Button() {
          Text('←')
            .fontSize(24)
            .fontColor('#333333')
        }
        .width(44)
        .height(44)
        .backgroundColor('#00000000')
        .onClick(() => this.goBack())

        Text(t('settings_title'))
          .fontSize(22)
          .fontWeight(FontWeight.Bold)
          .margin({ left: 8 })
      }
      .width('100%')
      .padding({ left: 8, right: 16, top: 12, bottom: 8 })

      // 设置项列表
      Column() {
        // 日夜模式
        Row() {
          Column() {
            Text(t('settings_day_mode'))
              .fontSize(16)
            Text(t('settings_night_mode'))
              .fontSize(12)
              .fontColor('#999999')
              .margin({ top: 2 })
          }

          Blank()

          Toggle({ type: ToggleType.Switch, isOn: this.themeMode === ThemeMode.NIGHT })
            .onChange(() => this.toggleTheme())
        }
        .width('100%')
        .padding(16)
        .backgroundColor('#FFFFFF')
        .borderRadius(8)

        // 语言切换
        Row() {
          Text(t('settings_language'))
            .fontSize(16)

          Blank()

          Text(this.language === LangSetting.ZH ? '中文' : 'English')
            .fontSize(16)
            .fontColor('#D32F2F')
        }
        .width('100%')
        .padding(16)
        .backgroundColor('#FFFFFF')
        .borderRadius(8)
        .margin({ top: 1 })
        .onClick(() => this.toggleLanguage())

        // 关于
        Row() {
          Text(t('settings_about'))
            .fontSize(16)

          Blank()

          Text('→')
            .fontSize(18)
            .fontColor('#CCCCCC')
        }
        .width('100%')
        .padding(16)
        .backgroundColor('#FFFFFF')
        .borderRadius(8)
        .margin({ top: 1 })
        .onClick(() => this.showAbout())

        // 版本
        Row() {
          Text(t('settings_version'))
            .fontSize(16)

          Blank()

          Text('1.0.1')
            .fontSize(16)
            .fontColor('#999999')
        }
        .width('100%')
        .padding(16)
        .backgroundColor('#FFFFFF')
        .borderRadius(8)
        .margin({ top: 1 })
      }
      .width('100%')
      .padding(16)
      .layoutWeight(1)
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F5F5F5')
  }
}
