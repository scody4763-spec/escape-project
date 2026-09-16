if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface VideoPlayer_Params {
    isPlaying?: boolean;
}
import router from "@ohos:router";
class VideoPlayer extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__isPlaying = new ObservedPropertySimplePU(true, this, "isPlaying");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: VideoPlayer_Params) {
        if (params.isPlaying !== undefined) {
            this.isPlaying = params.isPlaying;
        }
    }
    updateStateVars(params: VideoPlayer_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__isPlaying.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__isPlaying.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __isPlaying: ObservedPropertySimplePU<boolean>;
    get isPlaying() {
        return this.__isPlaying.get();
    }
    set isPlaying(newValue: boolean) {
        this.__isPlaying.set(newValue);
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.height('100%');
            Column.backgroundColor('#FFF8E1');
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 顶部导航栏
            Row.create();
            // 顶部导航栏
            Row.width('100%');
            // 顶部导航栏
            Row.padding({ left: 8, right: 8, top: 12, bottom: 12 });
            // 顶部导航栏
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
            Text.create('← ' + '返回');
            Text.fontSize(16);
        }, Text);
        Text.pop();
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('逃生教学视频');
            Text.fontSize(20);
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
        // 顶部导航栏
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 视频播放器
            Video.create({
                src: { "id": 0, "type": 30000, params: ['fire_escape_video.mp4'], "bundleName": "com.escape.guide", "moduleName": "entry" },
                previewUri: { "id": 16777263, "type": 20000, params: [], "bundleName": "com.escape.guide", "moduleName": "entry" }
            });
            // 视频播放器
            Video.width('100%');
            // 视频播放器
            Video.height(300);
            // 视频播放器
            Video.controls(true);
            // 视频播放器
            Video.autoPlay(true);
            // 视频播放器
            Video.objectFit(ImageFit.Contain);
            // 视频播放器
            Video.onFinish(() => {
                this.isPlaying = false;
            });
        }, Video);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 下方说明
            Column.create();
            // 下方说明
            Column.padding({ left: 24, right: 24 });
            // 下方说明
            Column.alignItems(HorizontalAlign.Start);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('🔥 火灾逃生要点');
            Text.fontSize(18);
            Text.fontWeight(FontWeight.Bold);
            Text.width('100%');
            Text.margin({ top: 24, bottom: 12 });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('• 保持冷静，迅速判断逃生路线');
            Text.fontSize(15);
            Text.width('100%');
            Text.margin({ bottom: 6 });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('• 用湿毛巾捂住口鼻，弯腰低姿前进');
            Text.fontSize(15);
            Text.width('100%');
            Text.margin({ bottom: 6 });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('• 不乘坐电梯，走安全通道');
            Text.fontSize(15);
            Text.width('100%');
            Text.margin({ bottom: 6 });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('• 按照疏散指示标志方向逃生');
            Text.fontSize(15);
            Text.width('100%');
            Text.margin({ bottom: 6 });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('• 无法逃生时在窗口发出求救信号');
            Text.fontSize(15);
            Text.width('100%');
            Text.margin({ bottom: 6 });
        }, Text);
        Text.pop();
        // 下方说明
        Column.pop();
        Column.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "VideoPlayer";
    }
}
registerNamedRoute(() => new VideoPlayer(undefined, {}), "", { bundleName: "com.escape.guide", moduleName: "entry", pagePath: "pages/VideoPlayer", pageFullPath: "entry/src/main/ets/pages/VideoPlayer", integratedHsp: "false", moduleType: "followWithHap" });
