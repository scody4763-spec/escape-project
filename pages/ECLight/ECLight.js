// 记得加上const
const createMqttClient = require('../../utils/wxmqtt')

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
    host: "42.193.218.29",
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
    try {
      this.data.client = createMqttClient({
        url: 'wss://42.193.218.29:8084/mqtt',
        username: 'xcx_eclight',
        password: 'xcx_eclight',
        clientId: randomString(30),
        onConnect: () => {
          console.log('ECLight 连接成功');
          this.data.client.subscribe(this.data.subTopic);
        },
        onMessage: (topic, payload) => {
          console.log("topic:" + topic);
          console.log("payload:" + payload);
          try {
            let a = JSON.parse(payload);
            if (a[this.data.MAC] && a[this.data.MAC].display) {
              switch (a[this.data.MAC].display) {
                case 'left': case 'Left':
                  this.setValue('titleimg', "./img/向左.png"); break;
                case 'right': case 'Right':
                  this.setValue('titleimg', "./img/向右.png"); break;
                case 'center': case 'Center':
                  this.setValue('titleimg', "./img/双向.png"); break;
                case 'up': case 'Up':
                  this.setValue('titleimg', "./img/向上.png"); break;
                case 'down': case 'Down':
                  this.setValue('titleimg', "./img/向下.png"); break;
              }
            }
            if (a['ESP32_40:91:51:84:94:C0']) {
              this.setData({
                now: {
                  temper: a['ESP32_40:91:51:84:94:C0'].temp,
                  adc: a['ESP32_40:91:51:84:94:C0'].adc,
                  hud: a['ESP32_40:91:51:84:94:C0'].hum,
                }
              });
            }
          } catch (e) {
            console.log('parse error', e);
          }
        },
        onError: (error) => {
          console.log('ECLight onError', error);
        },
        onClose: () => {
          console.log('ECLight 已断开');
        }
      });
      this.data.client.connect();
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
    if (this.data.client) {
      this.data.client.end();
      this.data.client = null;
    }
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


  // ===== 静态方向 =====

  //静态左
  changeleft() {
    let Msg = `{"${this.data.MAC}":{"display_left":"left","display_mid":"left","display_right":"left"}}`
    this.publish(Msg)
    this.setData({
      titleimg: "./img/向左.png",
      dTaicss: ""
    })
  },

  //静态右
  changeright() {
    let Msg = `{"${this.data.MAC}":{"display_left":"right","display_mid":"right","display_right":"right"}}`
    this.publish(Msg)
    this.setData({
      titleimg: "./img/向右.png",
      dTaicss: ""
    })
  },

  //静态双向
  changecenter() {
    let Msg = `{"${this.data.MAC}":{"display_left":"left","display_mid":"motifs","display_right":"right"}}`
    this.publish(Msg)
    this.setData({
      titleimg: "./img/双向.png",
      dTaicss: ""
    })
  },

  //静态上
  changeup() {
    let Msg = `{"${this.data.MAC}":{"display_left":"up","display_mid":"up","display_right":"up"}}`
    this.publish(Msg)
    this.setData({
      titleimg: "./img/向上.png",
      dTaicss: ""
    })
  },

  //静态下
  changedown() {
    let Msg = `{"${this.data.MAC}":{"display_left":"down","display_mid":"down","display_right":"down"}}`
    this.publish(Msg)
    this.setData({
      titleimg: "./img/向下.png",
      dTaicss: ""
    })
  },

  // ===== 动态方向 =====

  //动态左
  changeLeft() {
    let Msg = `{"${this.data.MAC}":{"display_left":"Left","display_mid":"Left","display_right":"Left"}}`
    this.publish(Msg)
    this.setData({
      titleimg: "./img/向左.png",
      dTaicss: 'CPimage1'
    })
  },
  //动态右
  changeRight() {
    let Msg = `{"${this.data.MAC}":{"display_left":"Right","display_mid":"Right","display_right":"Right"}}`
    this.publish(Msg)
    this.setData({
      titleimg: "./img/向右.png",
      dTaicss: 'CPimage1'
    })
  },

  //动态双向
  changeCenter() {
    let Msg = `{"${this.data.MAC}":{"display_left":"Left","display_mid":"motifs","display_right":"Right"}}`
    this.publish(Msg)
    this.setData({
      titleimg: "./img/双向.png",
      dTaicss: 'CPimage1'
    })
  },
  //动态向上
  changeUp() {
    let Msg = `{"${this.data.MAC}":{"display_left":"Up","display_mid":"Up","display_right":"Up"}}`
    this.publish(Msg)
    this.setData({
      titleimg: "./img/向上.png",
      dTaicss: 'CPimage1'
    })
  },
  //动态向下
  changeDown() {
    let Msg = `{"${this.data.MAC}":{"display_left":"Down","display_mid":"Down","display_right":"Down"}}`
    this.publish(Msg)
    this.setData({
      titleimg: "./img/向下.png",
      dTaicss: 'CPimage1'
    })
  },

  // ===== 动态斜方向 =====

  //动态左上
  changeLUp() {
    let Msg = `{"${this.data.MAC}":{"display_left":"LUp","display_mid":"LUp","display_right":"LUp"}}`
    this.publish(Msg)
    this.setData({
      titleimg: "./img/动态左上-开.png",
      dTaicss: 'CPimage1'
    })
  },
  //动态右上
  changeRUp() {
    let Msg = `{"${this.data.MAC}":{"display_left":"RUp","display_mid":"RUp","display_right":"RUp"}}`
    this.publish(Msg)
    this.setData({
      titleimg: "./img/动态右上-开.png",
      dTaicss: 'CPimage1'
    })
  },
  //动态左下
  changeLDown() {
    let Msg = `{"${this.data.MAC}":{"display_left":"LDown","display_mid":"LDown","display_right":"LDown"}}`
    this.publish(Msg)
    this.setData({
      titleimg: "./img/动态左下-开.png",
      dTaicss: 'CPimage1'
    })
  },
  //动态右下
  changeRDown() {
    let Msg = `{"${this.data.MAC}":{"display_left":"RDown","display_mid":"RDown","display_right":"RDown"}}`
    this.publish(Msg)
    this.setData({
      titleimg: "./img/动态右下-开.png",
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