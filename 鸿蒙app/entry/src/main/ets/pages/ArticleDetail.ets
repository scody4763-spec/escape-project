/**
 * 文章详情页
 * - 展示逃生知识文章全文
 * - 支持图文混排
 */
import { router } from '@kit.ArkUI';

@Entry
@Component
struct ArticleDetail {
  @State articleTitle: string = '';
  @State articleContent: string = '';

  aboutToAppear() {
    const params = router.getParams() as Record<string, Object>;
    if (params) {
      this.articleTitle = params['title'] as string;
      this.articleContent = params['content'] as string;
    }
  }

  build() {
    Column() {
      // 顶部导航
      Row() {
        Button() {
          Text('← 返回')
            .fontSize(16)
        }
        .type(ButtonType.Normal)
        .backgroundColor(Color.Transparent)
        .onClick(() => {
          router.back();
        })

        Text('文章详情')
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .layoutWeight(1)
          .textAlign(TextAlign.Center)

        Blank().width(60)
      }
      .width('100%')
      .padding({ left: 8, right: 8, top: 12, bottom: 12 })
      .backgroundColor('#FFF3E0')

      // 文章内容
      Scroll() {
        Column() {
          // 文章标题
          Text(this.articleTitle)
            .fontSize(22)
            .fontWeight(FontWeight.Bold)
            .lineHeight(32)
            .width('100%')
            .margin({ top: 20, bottom: 16 })

          // 海报图片
          Image($r('app.media.fire_escape_poster'))
            .width('100%')
            .height(180)
            .objectFit(ImageFit.Contain)
            .borderRadius(12)
            .margin({ bottom: 20 })

          // 文章正文（分段渲染）
          ForEach(this.articleContent.split('\n\n'), (paragraph: string) => {
            if (paragraph.startsWith('# ')) {
              // 一级标题
              Text(paragraph.slice(2))
                .fontSize(20)
                .fontWeight(FontWeight.Bold)
                .lineHeight(28)
                .width('100%')
                .margin({ top: 16, bottom: 8 })
            } else if (paragraph.startsWith('## ')) {
              // 二级标题
              Text(paragraph.slice(3))
                .fontSize(18)
                .fontWeight(FontWeight.Bold)
                .lineHeight(26)
                .width('100%')
                .margin({ top: 14, bottom: 6 })
            } else if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
              // 粗体强调行
              Text(paragraph.slice(2, -2))
                .fontSize(16)
                .fontWeight(FontWeight.Bold)
                .fontColor('#D32F2F')
                .width('100%')
                .margin({ top: 8, bottom: 4 })
            } else if (paragraph.startsWith('- ')) {
              // 列表项
              Text(paragraph)
                .fontSize(15)
                .lineHeight(24)
                .width('100%')
                .margin({ top: 4, bottom: 4 })
                .padding({ left: 8 })
            } else {
              // 普通段落 - 解析加粗文本
              Text(paragraph)
                .fontSize(16)
                .lineHeight(28)
                .width('100%')
                .margin({ top: 6, bottom: 6 })
            }
          })

          // 底部留白
          Blank().height(40)
        }
        .width('100%')
        .padding({ left: 20, right: 20 })
        .alignItems(HorizontalAlign.Start)
      }
      .layoutWeight(1)
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#FFF8E1')
  }
}
