if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface ArticleDetail_Params {
    articleTitle?: string;
    articleContent?: string;
}
import router from "@ohos:router";
class ArticleDetail extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__articleTitle = new ObservedPropertySimplePU('', this, "articleTitle");
        this.__articleContent = new ObservedPropertySimplePU('', this, "articleContent");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: ArticleDetail_Params) {
        if (params.articleTitle !== undefined) {
            this.articleTitle = params.articleTitle;
        }
        if (params.articleContent !== undefined) {
            this.articleContent = params.articleContent;
        }
    }
    updateStateVars(params: ArticleDetail_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__articleTitle.purgeDependencyOnElmtId(rmElmtId);
        this.__articleContent.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__articleTitle.aboutToBeDeleted();
        this.__articleContent.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __articleTitle: ObservedPropertySimplePU<string>;
    get articleTitle() {
        return this.__articleTitle.get();
    }
    set articleTitle(newValue: string) {
        this.__articleTitle.set(newValue);
    }
    private __articleContent: ObservedPropertySimplePU<string>;
    get articleContent() {
        return this.__articleContent.get();
    }
    set articleContent(newValue: string) {
        this.__articleContent.set(newValue);
    }
    aboutToAppear() {
        const params = router.getParams() as Record<string, Object>;
        if (params) {
            this.articleTitle = params['title'] as string;
            this.articleContent = params['content'] as string;
        }
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.height('100%');
            Column.backgroundColor('#FFF8E1');
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 顶部导航
            Row.create();
            // 顶部导航
            Row.width('100%');
            // 顶部导航
            Row.padding({ left: 8, right: 8, top: 12, bottom: 12 });
            // 顶部导航
            Row.backgroundColor('#FFF3E0');
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithChild();
            Button.type(ButtonType.Normal);
            Button.backgroundColor(Color.Transparent);
            Button.onClick(() => {
                router.back();
            });
        }, Button);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('← 返回');
            Text.fontSize(16);
        }, Text);
        Text.pop();
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('文章详情');
            Text.fontSize(18);
            Text.fontWeight(FontWeight.Bold);
            Text.layoutWeight(1);
            Text.textAlign(TextAlign.Center);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Blank.create();
            Blank.width(60);
        }, Blank);
        Blank.pop();
        // 顶部导航
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 文章内容
            Scroll.create();
            // 文章内容
            Scroll.layoutWeight(1);
        }, Scroll);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.padding({ left: 20, right: 20 });
            Column.alignItems(HorizontalAlign.Start);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 文章标题
            Text.create(this.articleTitle);
            // 文章标题
            Text.fontSize(22);
            // 文章标题
            Text.fontWeight(FontWeight.Bold);
            // 文章标题
            Text.lineHeight(32);
            // 文章标题
            Text.width('100%');
            // 文章标题
            Text.margin({ top: 20, bottom: 16 });
        }, Text);
        // 文章标题
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 海报图片
            Image.create({ "id": 16777263, "type": 20000, params: [], "bundleName": "com.escape.guide", "moduleName": "entry" });
            // 海报图片
            Image.width('100%');
            // 海报图片
            Image.height(180);
            // 海报图片
            Image.objectFit(ImageFit.Contain);
            // 海报图片
            Image.borderRadius(12);
            // 海报图片
            Image.margin({ bottom: 20 });
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 文章正文（分段渲染）
            ForEach.create();
            const forEachItemGenFunction = _item => {
                const paragraph = _item;
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    If.create();
                    if (paragraph.startsWith('# ')) {
                        this.ifElseBranchUpdateFunction(0, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                // 一级标题
                                Text.create(paragraph.slice(2));
                                // 一级标题
                                Text.fontSize(20);
                                // 一级标题
                                Text.fontWeight(FontWeight.Bold);
                                // 一级标题
                                Text.lineHeight(28);
                                // 一级标题
                                Text.width('100%');
                                // 一级标题
                                Text.margin({ top: 16, bottom: 8 });
                            }, Text);
                            // 一级标题
                            Text.pop();
                        });
                    }
                    else if (paragraph.startsWith('## ')) {
                        this.ifElseBranchUpdateFunction(1, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                // 二级标题
                                Text.create(paragraph.slice(3));
                                // 二级标题
                                Text.fontSize(18);
                                // 二级标题
                                Text.fontWeight(FontWeight.Bold);
                                // 二级标题
                                Text.lineHeight(26);
                                // 二级标题
                                Text.width('100%');
                                // 二级标题
                                Text.margin({ top: 14, bottom: 6 });
                            }, Text);
                            // 二级标题
                            Text.pop();
                        });
                    }
                    else if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                        this.ifElseBranchUpdateFunction(2, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                // 粗体强调行
                                Text.create(paragraph.slice(2, -2));
                                // 粗体强调行
                                Text.fontSize(16);
                                // 粗体强调行
                                Text.fontWeight(FontWeight.Bold);
                                // 粗体强调行
                                Text.fontColor('#D32F2F');
                                // 粗体强调行
                                Text.width('100%');
                                // 粗体强调行
                                Text.margin({ top: 8, bottom: 4 });
                            }, Text);
                            // 粗体强调行
                            Text.pop();
                        });
                    }
                    else if (paragraph.startsWith('- ')) {
                        this.ifElseBranchUpdateFunction(3, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                // 列表项
                                Text.create(paragraph);
                                // 列表项
                                Text.fontSize(15);
                                // 列表项
                                Text.lineHeight(24);
                                // 列表项
                                Text.width('100%');
                                // 列表项
                                Text.margin({ top: 4, bottom: 4 });
                                // 列表项
                                Text.padding({ left: 8 });
                            }, Text);
                            // 列表项
                            Text.pop();
                        });
                    }
                    else {
                        this.ifElseBranchUpdateFunction(4, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                // 普通段落 - 解析加粗文本
                                Text.create(paragraph);
                                // 普通段落 - 解析加粗文本
                                Text.fontSize(16);
                                // 普通段落 - 解析加粗文本
                                Text.lineHeight(28);
                                // 普通段落 - 解析加粗文本
                                Text.width('100%');
                                // 普通段落 - 解析加粗文本
                                Text.margin({ top: 6, bottom: 6 });
                            }, Text);
                            // 普通段落 - 解析加粗文本
                            Text.pop();
                        });
                    }
                }, If);
                If.pop();
            };
            this.forEachUpdateFunction(elmtId, this.articleContent.split('\n\n'), forEachItemGenFunction);
        }, ForEach);
        // 文章正文（分段渲染）
        ForEach.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 底部留白
            Blank.create();
            // 底部留白
            Blank.height(40);
        }, Blank);
        // 底部留白
        Blank.pop();
        Column.pop();
        // 文章内容
        Scroll.pop();
        Column.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "ArticleDetail";
    }
}
registerNamedRoute(() => new ArticleDetail(undefined, {}), "", { bundleName: "com.escape.guide", moduleName: "entry", pagePath: "pages/ArticleDetail", pageFullPath: "entry/src/main/ets/pages/ArticleDetail", integratedHsp: "false", moduleType: "followWithHap" });
