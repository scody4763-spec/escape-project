// 记得加上const
import mqtt from "../../utils/mqtt.min.js"

function randomString(len) {
  len = len || 32;
  var $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
  var maxPos = $chars.length;
  var pwd = 'xcx_ljc_';
  for (let i = 0; i < len; i++) {
    pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return pwd;
}


Page({
  /**
   * 页面的初始数据
   */
  data: {
    client: null,
    host: "www.guideylz.cn",
    subTopic: "ESP32/D8:BC:38:78:24:B8/status",  // 订阅
    pubTopic: "ESP32/D8:BC:38:78:24:B8/public", //应急灯 发布
    pubMsg: '{"ESP32_D8:BC:38:78:24:5C":{"display":"right"}}',
    receivedMsg: "",
    mqttOptions: {
      clientId: randomString(30),
      username: "xcx_eclight",
      password: "xcx_eclight",
      reconnectPeriod: 1000, // 1000毫秒，设置为 0 禁用自动重连，两次重新连接之间的间隔时间
      connectTimeout: 30 * 1000, // 30秒，连接超时时间
      qos: 1,
    },
    titleimg: "./img/双向.png",
    MAC: 'ESP32_D8:BC:38:78:24:B8', //应急灯 mac
    // MAC: 'ESP32_58:BF:25:39:A6:DC',
    // MAC: 'ESP32_58:BF:25:39:A7:04',
    now: {
      temper: '26.2',
      adc: '49',
      hud: '43'
    },
    dTaicss: ''
  },

  setValue(key, value) {
    this.setData({
      [key]: value,
    });
  },

  connect() {
    // MQTT-WebSocket 统一使用 /path 作为连接路径，连接时需指明，但在 EMQX Cloud 部署上使用的路径为 /mqtt
    // 因此不要忘了带上这个 /mqtt !!!
    // 微信小程序中需要将 wss 协议写为 wxs，且由于微信小程序出于安全限制，不支持 ws 协议
    try {
      this.data.client = mqtt.connect(`wxs://${this.data.host}:8084/mqtt`, {
        ...this.data.mqttOptions,
      });

      this.data.client.on("connect", () => {
        console.log("连接成功"),

          //收到消息
          this.data.client.on("message", (topic, payload) => {
            const currMsg = this.data.receivedMsg ? `<br/>${payload}` : payload;
            this.setValue("receivedMsg", this.data.receivedMsg.concat(currMsg));
            console.log("topic:" + topic);
            console.log("payload:" + payload);
            let a = JSON.parse(payload)
            console.log(a[this.data.MAC])
            switch (a[this.data.MAC].display) {
              case 'left':
                this.setValue('titleimg', "./img/向左.png")
                break;
              case 'Left':
                this.setValue('titleimg', "./img/向左.png")
                break;
              case 'right':
                this.setValue('titleimg', "./img/向右.png")
                break;
              case 'Right':
                this.setValue('titleimg', "./img/向右.png")
                break;
              case 'Center':
                this.setValue('titleimg', "./img/双向.png")
                break;
              case 'center':
                this.setValue('titleimg', "./img/双向.png")
                break;
              case 'up':
                this.setValue('titleimg', "./img/向上.png")
                break;
              case 'Up':
                this.setValue('titleimg', "./img/向上.png")
                break;
              case 'down':
                this.setValue('titleimg', "./img/向下.png")
                break;
              case 'Down':
                this.setValue('titleimg', "./img/向下.png")
                break;
              default:
                break;
            }
            this.setData({
              now: {
                temper: a['ESP32_40:91:51:84:94:C0'].temp,
                adc: a['ESP32_40:91:51:84:94:C0'].adc,
                hud: a['ESP32_40:91:51:84:94:C0'].hum,
              }
            });
            console.log(a);
            console.log(a[this.data.MAC]);
          });

        this.data.client.on("error", (error) => {
          console.log("onError", error);
        });

        this.data.client.on("reconnect", () => {
          console.log("重新连接...");
        });

        this.data.client.on("offline", () => {
          console.log("已脱机");
        });
        // 更多 MQTT.js 相关 API 请参阅 https://github.com/mqttjs/MQTT.js#api
      });
    } catch (error) {

      console.log("mqtt.connect error", error);
    }
  },

  //订阅
  subscribe() {
    if (this.data.client) {
      this.data.client.subscribe(this.data.subTopic)
      wx.showModal({
        content: `成功订阅主题：${this.data.subTopic}`,
        showCancel: false,
      })
      return
    }
    wx.showToast({
      title: '请先点击连接',
      icon: 'error',
    })
  },

  //断开连接
  disconnect() {
    this.data.client.end()
    this.data.client = null
    console.log("已断开连接");
  },

  //发布
  publish(Msg) {

    if (this.data.client) {
      // this.data.client.publish(this.data.pubTopic, this.data.pubMsg)
      console.log("发送信息")
      this.data.client.publish(this.data.pubTopic, Msg)
      console.log("发布成功：" + Msg);
      return
    } else {
      console.log("未连接");
    }


    // wx.showToast({
    //   title: '请先点击连接',
    //   icon: 'error',
    // })
  },

  //改变led开关
  changeled(e) {
    console.log(e.detail.value);
    if (e.detail.value) {
      let Msg = '{"' + this.data.MAC + '":{"led":"1024"}}'
      this.publish(Msg)
    } else {
      let Msg = '{"' + this.data.MAC + '":{"led":"1"}}'
      this.publish(Msg)
    }

  },

  changeledSwitch(e){
     let count = parseInt((e.detail.value)*10.24)
    let Msg = '{"' + this.data.MAC + '":{"led":"'+count+'"}}'
      this.publish(Msg)
  },


  //静态左
  changeleft() {
    let Msg = `{"${this.data.MAC}":{"display_left":"left","display_right":"left"}}`
    this.publish(Msg)
    this.setData({
      titleimg: "./img/向左.png",
      dTaicss: ""
    })
  },

  //静态右
  changeright() {
    let Msg = `{"${this.data.MAC}":{"display_left":"right","display_right":"right"}}`
    this.publish(Msg)
    this.setData({
      titleimg: "./img/向右.png",
      dTaicss: ""
    })
  },

  //静态双向
  changecenter() {
    let Msg = `{"${this.data.MAC}":{"display_left":"left","display_right":"right"}}`
    this.publish(Msg)
    this.setData({
      titleimg: "./img/双向.png",
      dTaicss: ""
    })
  },

  //静态上
  changeup() {
    let Msg = `{"${this.data.MAC}":{"display_left":"up","display_right":"up"}}`
    this.publish(Msg)
    this.setData({
      titleimg: "./img/向上.png",
      dTaicss: ""
    })
  },

  //静态下
  changedown() {
    let Msg = `{"${this.data.MAC}":{"display_left":"down","display_right":"down"}}`
    this.publish(Msg)
    this.setData({
      titleimg: "./img/向下.png",
      dTaicss: ""
    })
  },

  //动态左
  changeLeft() {
    let Msg = `{"${this.data.MAC}":{"display_left":"Left","display_right":"Left"}}`
    this.publish(Msg)
    this.setData({
      titleimg: "./img/向左.png",
      dTaicss: 'CPimage1'
    })
  },
  //动态右
  changeRight() {
    let Msg = `{"${this.data.MAC}":{"display_left":"Right","display_right":"Right"}}`
    this.publish(Msg)
    this.setData({
      titleimg: "./img/向右.png",
      dTaicss: 'CPimage1'
    })
  },

  //动态双向
  changeCenter() {
    let Msg = `{"${this.data.MAC}":{"display_left":"Left","display_right":"Right"}}`
    this.publish(Msg)
    this.setData({
      titleimg: "./img/双向.png",
      dTaicss: 'CPimage1'
    })
  },
  //动态向上
  changeUp() {
    let Msg = `{"${this.data.MAC}":{"display_left":"Up","display_right":"Up"}}`
    this.publish(Msg)
    this.setData({
      titleimg: "./img/向上.png",
      dTaicss: 'CPimage1'
    })
  },
  //动态向下
  changeDown() {
    let Msg = `{"${this.data.MAC}":{"display_left":"Down","display_right":"Down"}}`
    this.publish(Msg)
    this.setData({
      titleimg: "./img/向下.png",
      dTaicss: 'CPimage1'
    })
  },

  sliderChange(e) {
    let Msg = '{"' + this.data.MAC + '":{"brightness":"' + e.detail.value + '"}}'
    this.publish(Msg)
  },


  onLoad: function (options) {

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    this.connect()
    this.subscribe()
  
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    this.disconnect()
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  },
})