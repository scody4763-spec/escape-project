/**
 * 首页（逃生知识）
 * - 展示逃生知识文章列表
 * - 点击进入文章详情
 * - 底部导航进入设置页
 */
import { ApiService } from '../services/ApiService';
import { MqttService } from '../services/MqttService';
import { PreferencesUtil } from '../util/PreferencesUtil';
import { PREF_KEYS, DEFAULT_VALUES } from '../util/Constants';
import { setLanguage, t } from '../i18n/I18n';
import type { KnowArticle } from '../models/Types';
import { ThemeMode, LangSetting, AlarmStatus } from '../models/Types';
import { router } from '@kit.ArkUI';

@Entry
@Component
struct Home {
  @State articles: KnowArticle[] = [];
  @State isLoading: boolean = true;
  @State activeAlarm: boolean = false;

  aboutToAppear() {
    this.loadArticles();
    this.checkAlarmStatus();
  }

  async loadArticles() {
    this.isLoading = true;
    const api = ApiService.getInstance();
    this.articles = await api.getArticles();
    this.isLoading = false;
  }

  async checkAlarmStatus() {
    // 监听 MQTT 报警消息
    MqttService.getInstance().setCallbacks({
      onAlarm: () => {
        this.activeAlarm = true;
      },
      onClear: () => {
        this.activeAlarm = false;
      }
    });
  }

  navigateToSettings() {
    router.pushUrl({ url: 'pages/Settings' });
  }

  navigateToNavigation() {
    router.replaceUrl({ url: 'pages/Navigation' });
  }

  openArticle(article: KnowArticle) {
    router.pushUrl({
      url: 'pages/ArticleDetail',
      params: {
        title: article.title,
        content: article.content
      }
    });
  }

  build() {
    Column() {
      // 顶部栏
      Row() {
        Text(t('home_title'))
          .fontSize(22)
          .fontWeight(FontWeight.Bold)

        Blank()

        // 设置按钮
        Button() {
          Text('⚙️')
            .fontSize(24)
        }
        .width(44)
        .height(44)
        .backgroundColor('#00000000')
        .onClick(() => this.navigateToSettings())
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 12, bottom: 8 })

      // 火警横幅
      if (this.activeAlarm) {
        Row() {
          Text('🚨 ' + t('nav_fire_alarm'))
            .fontSize(16)
            .fontColor('#FFFFFF')
            .fontWeight(FontWeight.Bold)
        }
        .width('100%')
        .padding(16)
        .backgroundColor('#D32F2F')
        .onClick(() => this.navigateToNavigation())
      }

      // 内容区（可滚动）
      Scroll() {
        Column() {
          // 逃生指南卡片
          Column() {
            Row() {
              Image($r('app.media.fire_escape_poster'))
                .width(80)
                .height(80)
                .objectFit(ImageFit.Contain)
                .borderRadius(8)

              Column() {
                Text('🔥 火灾逃生指南')
                  .fontSize(18)
                  .fontWeight(FontWeight.Bold)

                Text('查看逃生要点和教学视频')
                  .fontSize(13)
                  .fontColor('#666666')
                  .margin({ top: 4 })
              }
              .alignItems(HorizontalAlign.Start)
              .layoutWeight(1)
              .margin({ left: 12 })
            }
            .width('100%')

            Button('▶ 观看教学视频')
              .width('100%')
              .height(40)
              .backgroundColor('#D32F2F')
              .fontColor(Color.White)
              .borderRadius(20)
              .margin({ top: 12 })
              .onClick(() => {
                router.pushUrl({ url: 'pages/VideoPlayer' });
              })
          }
          .width('100%')
          .padding(16)
          .backgroundColor('#FFFFFF')
          .borderRadius(12)
          .shadow({ radius: 3, color: '#1A000000', offsetY: 2 })
          .margin({ left: 16, right: 16, top: 8, bottom: 8 })

          // 文章列表标题
          Text('📖 逃生知识文章')
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .width('100%')
            .padding({ left: 16, right: 16, top: 12, bottom: 4 })

          if (this.isLoading) {
            Column() {
              LoadingProgress()
                .width(48)
                .height(48)
                .color('#D32F2F')
            }
            .width('100%')
            .height(120)
            .justifyContent(FlexAlign.Center)
          } else {
            ForEach(this.articles, (article: KnowArticle) => {
              Column() {
                Text(article.title)
                  .fontSize(17)
                  .fontWeight(FontWeight.Medium)
                  .width('100%')

                Text(article.summary)
                  .fontSize(14)
                  .fontColor('#666666')
                  .margin({ top: 6 })
                  .width('100%')
                  .maxLines(2)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
              }
              .width('100%')
              .padding(16)
              .backgroundColor('#FFFFFF')
              .borderRadius(8)
              .shadow({ radius: 2, color: '#1A000000', offsetY: 1 })
              .margin({ left: 16, right: 16, top: 6, bottom: 6 })
              .onClick(() => this.openArticle(article))
            })
          }
        }
        .width('100%')
        .padding({ bottom: 16 })
      }
      .layoutWeight(1)
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F5F5F5')
  }
}
