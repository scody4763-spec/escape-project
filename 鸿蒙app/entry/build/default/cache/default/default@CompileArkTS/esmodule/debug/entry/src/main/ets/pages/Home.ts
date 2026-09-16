if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface Home_Params {
    articles?: KnowArticle[];
    isLoading?: boolean;
    activeAlarm?: boolean;
}
import { ApiService } from "@normalized:N&&&entry/src/main/ets/services/ApiService&";
import { MqttService } from "@normalized:N&&&entry/src/main/ets/services/MqttService&";
import { t } from "@normalized:N&&&entry/src/main/ets/i18n/I18n&";
import type { KnowArticle } from '../models/Types';
import router from "@ohos:router";
class Home extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__articles = new ObservedPropertyObjectPU([], this, "articles");
        this.__isLoading = new ObservedPropertySimplePU(true, this, "isLoading");
        this.__activeAlarm = new ObservedPropertySimplePU(false, this, "activeAlarm");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: Home_Params) {
        if (params.articles !== undefined) {
            this.articles = params.articles;
        }
        if (params.isLoading !== undefined) {
            this.isLoading = params.isLoading;
        }
        if (params.activeAlarm !== undefined) {
            this.activeAlarm = params.activeAlarm;
        }
    }
    updateStateVars(params: Home_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__articles.purgeDependencyOnElmtId(rmElmtId);
        this.__isLoading.purgeDependencyOnElmtId(rmElmtId);
        this.__activeAlarm.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__articles.aboutToBeDeleted();
        this.__isLoading.aboutToBeDeleted();
        this.__activeAlarm.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __articles: ObservedPropertyObjectPU<KnowArticle[]>;
    get articles() {
        return this.__articles.get();
    }
    set articles(newValue: KnowArticle[]) {
        this.__articles.set(newValue);
    }
    private __isLoading: ObservedPropertySimplePU<boolean>;
    get isLoading() {
        return this.__isLoading.get();
    }
    set isLoading(newValue: boolean) {
        this.__isLoading.set(newValue);
    }
    private __activeAlarm: ObservedPropertySimplePU<boolean>;
    get activeAlarm() {
        return this.__activeAlarm.get();
    }
    set activeAlarm(newValue: boolean) {
        this.__activeAlarm.set(newValue);
    }
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
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.height('100%');
            Column.backgroundColor('#F5F5F5');
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 顶部栏
            Row.create();
            // 顶部栏
            Row.width('100%');
            // 顶部栏
            Row.padding({ left: 16, right: 16, top: 12, bottom: 8 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(t('home_title'));
            Text.fontSize(22);
            Text.fontWeight(FontWeight.Bold);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Blank.create();
        }, Blank);
        Blank.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 设置按钮
            Button.createWithChild();
            // 设置按钮
            Button.width(44);
            // 设置按钮
            Button.height(44);
            // 设置按钮
            Button.backgroundColor('#00000000');
            // 设置按钮
            Button.onClick(() => this.navigateToSettings());
        }, Button);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('⚙️');
            Text.fontSize(24);
        }, Text);
        Text.pop();
        // 设置按钮
        Button.pop();
        // 顶部栏
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            // 火警横幅
            if (this.activeAlarm) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create();
                        Row.width('100%');
                        Row.padding(16);
                        Row.backgroundColor('#D32F2F');
                        Row.onClick(() => this.navigateToNavigation());
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('🚨 ' + t('nav_fire_alarm'));
                        Text.fontSize(16);
                        Text.fontColor('#FFFFFF');
                        Text.fontWeight(FontWeight.Bold);
                    }, Text);
                    Text.pop();
                    Row.pop();
                });
            }
            // 内容区（可滚动）
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 内容区（可滚动）
            Scroll.create();
            // 内容区（可滚动）
            Scroll.layoutWeight(1);
        }, Scroll);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.padding({ bottom: 16 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 逃生指南卡片
            Column.create();
            // 逃生指南卡片
            Column.width('100%');
            // 逃生指南卡片
            Column.padding(16);
            // 逃生指南卡片
            Column.backgroundColor('#FFFFFF');
            // 逃生指南卡片
            Column.borderRadius(12);
            // 逃生指南卡片
            Column.shadow({ radius: 3, color: '#1A000000', offsetY: 2 });
            // 逃生指南卡片
            Column.margin({ left: 16, right: 16, top: 8, bottom: 8 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777263, "type": 20000, params: [], "bundleName": "com.escape.guide", "moduleName": "entry" });
            Image.width(80);
            Image.height(80);
            Image.objectFit(ImageFit.Contain);
            Image.borderRadius(8);
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.alignItems(HorizontalAlign.Start);
            Column.layoutWeight(1);
            Column.margin({ left: 12 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('🔥 火灾逃生指南');
            Text.fontSize(18);
            Text.fontWeight(FontWeight.Bold);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('查看逃生要点和教学视频');
            Text.fontSize(13);
            Text.fontColor('#666666');
            Text.margin({ top: 4 });
        }, Text);
        Text.pop();
        Column.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('▶ 观看教学视频');
            Button.width('100%');
            Button.height(40);
            Button.backgroundColor('#D32F2F');
            Button.fontColor(Color.White);
            Button.borderRadius(20);
            Button.margin({ top: 12 });
            Button.onClick(() => {
                router.pushUrl({ url: 'pages/VideoPlayer' });
            });
        }, Button);
        Button.pop();
        // 逃生指南卡片
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 文章列表标题
            Text.create('📖 逃生知识文章');
            // 文章列表标题
            Text.fontSize(16);
            // 文章列表标题
            Text.fontWeight(FontWeight.Bold);
            // 文章列表标题
            Text.width('100%');
            // 文章列表标题
            Text.padding({ left: 16, right: 16, top: 12, bottom: 4 });
        }, Text);
        // 文章列表标题
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.isLoading) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.width('100%');
                        Column.height(120);
                        Column.justifyContent(FlexAlign.Center);
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        LoadingProgress.create();
                        LoadingProgress.width(48);
                        LoadingProgress.height(48);
                        LoadingProgress.color('#D32F2F');
                    }, LoadingProgress);
                    Column.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        ForEach.create();
                        const forEachItemGenFunction = _item => {
                            const article = _item;
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Column.create();
                                Column.width('100%');
                                Column.padding(16);
                                Column.backgroundColor('#FFFFFF');
                                Column.borderRadius(8);
                                Column.shadow({ radius: 2, color: '#1A000000', offsetY: 1 });
                                Column.margin({ left: 16, right: 16, top: 6, bottom: 6 });
                                Column.onClick(() => this.openArticle(article));
                            }, Column);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create(article.title);
                                Text.fontSize(17);
                                Text.fontWeight(FontWeight.Medium);
                                Text.width('100%');
                            }, Text);
                            Text.pop();
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create(article.summary);
                                Text.fontSize(14);
                                Text.fontColor('#666666');
                                Text.margin({ top: 6 });
                                Text.width('100%');
                                Text.maxLines(2);
                                Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                            }, Text);
                            Text.pop();
                            Column.pop();
                        };
                        this.forEachUpdateFunction(elmtId, this.articles, forEachItemGenFunction);
                    }, ForEach);
                    ForEach.pop();
                });
            }
        }, If);
        If.pop();
        Column.pop();
        // 内容区（可滚动）
        Scroll.pop();
        Column.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "Home";
    }
}
registerNamedRoute(() => new Home(undefined, {}), "", { bundleName: "com.escape.guide", moduleName: "entry", pagePath: "pages/Home", pageFullPath: "entry/src/main/ets/pages/Home", integratedHsp: "false", moduleType: "followWithHap" });
