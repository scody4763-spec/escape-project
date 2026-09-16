/**
 * 视频播放页
 * - 播放逃生教学视频
 */
import { router } from '@kit.ArkUI';

@Entry
@Component
struct VideoPlayer {
  @State isPlaying: boolean = true;

  build() {
    Column() {
      // 顶部导航栏
      Row() {
        Button() {
          Text('← ' + '返回')
            .fontSize(16)
        }
        .type(ButtonType.Normal)
        .backgroundColor(Color.Transparent)
        .onClick(() => {
          router.back();
        })

        Text('逃生教学视频')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .layoutWeight(1)
          .textAlign(TextAlign.Center)

        Blank().width(60)
      }
      .width('100%')
      .padding({ left: 8, right: 8, top: 12, bottom: 12 })
      .backgroundColor('#FFF3E0')

      // 视频播放器
      Video({
        src: $rawfile('fire_escape_video.mp4'),
        previewUri: $r('app.media.fire_escape_poster')
      })
      .width('100%')
      .height(300)
      .controls(true)
      .autoPlay(true)
      .objectFit(ImageFit.Contain)
      .onFinish(() => {
        this.isPlaying = false;
      })

      // 下方说明
      Column() {
        Text('🔥 火灾逃生要点')
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .width('100%')
          .margin({ top: 24, bottom: 12 })

        Text('• 保持冷静，迅速判断逃生路线')
          .fontSize(15)
          .width('100%')
          .margin({ bottom: 6 })
        Text('• 用湿毛巾捂住口鼻，弯腰低姿前进')
          .fontSize(15)
          .width('100%')
          .margin({ bottom: 6 })
        Text('• 不乘坐电梯，走安全通道')
          .fontSize(15)
          .width('100%')
          .margin({ bottom: 6 })
        Text('• 按照疏散指示标志方向逃生')
          .fontSize(15)
          .width('100%')
          .margin({ bottom: 6 })
        Text('• 无法逃生时在窗口发出求救信号')
          .fontSize(15)
          .width('100%')
          .margin({ bottom: 6 })
      }
      .padding({ left: 24, right: 24 })
      .alignItems(HorizontalAlign.Start)

    }
    .width('100%')
    .height('100%')
    .backgroundColor('#FFF8E1')
  }
}
