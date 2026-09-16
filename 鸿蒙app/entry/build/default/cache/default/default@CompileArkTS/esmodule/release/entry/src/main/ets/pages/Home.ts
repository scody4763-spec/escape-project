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
        const articles = await api.getArticles();
        this.articles = articles;
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
            url: 'pages/Home',
            params: { articleId: article.id }
        });
        // 在详情弹窗中展示
        this.showArticleDetail(article);
    }
    showArticleDetail(article: KnowArticle) {
        AlertDialog.show({
            title: article.title,
            message: article.content,
            autoCancel: true,
            alignment: DialogAlignment.Center,
            primaryButton: {
                value: '关闭',
                action: () => { }
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
            // 文章列表
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            // 文章列表
            if (this.isLoading) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.layoutWeight(1);
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
                        List.create();
                        List.layoutWeight(1);
                    }, List);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        ForEach.create();
                        const forEachItemGenFunction = _item => {
                            const article = _item;
                            {
                                const itemCreation = (elmtId, isInitialRender) => {
                                    ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                                    ListItem.create(deepRenderFunction, true);
                                    if (!isInitialRender) {
                                        ListItem.pop();
                                    }
                                    ViewStackProcessor.StopGetAccessRecording();
                                };
                                const itemCreation2 = (elmtId, isInitialRender) => {
                                    ListItem.create(deepRenderFunction, true);
                                    ListItem.padding({ left: 16, right: 16, top: 6, bottom: 6 });
                                    ListItem.onClick(() => this.openArticle(article));
                                };
                                const deepRenderFunction = (elmtId, isInitialRender) => {
                                    itemCreation(elmtId, isInitialRender);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Column.create();
                                        Column.width('100%');
                                        Column.padding(16);
                                        Column.backgroundColor('#FFFFFF');
                                        Column.borderRadius(8);
                                        Column.shadow({ radius: 2, color: '#1A000000', offsetY: 1 });
                                    }, Column);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(article.title);
                                        Text.fontSize(18);
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
                                    ListItem.pop();
                                };
                                this.observeComponentCreation2(itemCreation2, ListItem);
                                ListItem.pop();
                            }
                        };
                        this.forEachUpdateFunction(elmtId, this.articles, forEachItemGenFunction);
                    }, ForEach);
                    ForEach.pop();
                    List.pop();
                });
            }
        }, If);
        If.pop();
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
