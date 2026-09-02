const app = getApp()
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
    host: "api.gdustaiot.cn",
    mqttHost: "mqtt.gdustaiot.cn",
    subTopic: "indicator_light/data",
    pubTopic: "indicator_light/command",
    pubMsg: '{"ESP32_D8:BC:38:78:21:98":{"display_left":"Right","display_mid":"Right","display_right":"Right"}}',
    receivedMsg: "",
    mqttOptions: {
      clientId: randomString(30),
      username: "indicator_light",
      password: "indicator_light",
      reconnectPeriod: 1000, // 1000毫秒，设置为 0 禁用自动重连，两次重新连接之间的间隔时间
      connectTimeout: 30 * 1000, // 30秒，连接超时时间
      qos: 1
    },
    titleimg: "./img/双向.png",
    // MAC:'ESP32_40:91:51:84:94:C0', //应急灯
    // MAC: 'ESP32_58:BF:25:39:A6:DC',
    MAC: 'ESP32_D8:BC:38:78:21:98',
    // 空气质量等级：1=优 2=良 3=轻度污染 4=中度污染 5=重度污染
    now: {
      temper: '--',
      adc: '--',
      hud: '--',
      AQI: '--',
      TVOC: '--',
      ECO2: '--',
      HUD: '--',
      probability: '--',
      hotPixels: '--'
    },
    dTaicss: '',
    // 逃生模式
    escapeMode: false,
    manualEscape: false,
    escapeDirection: '',
    directionArrow: '↑',
    exitName: '--',
    distance: '--',
    estimatedTime: '--',
    latitude: 0,
    longitude: 0,
    currentLocation: '--'
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
        username: 'indicator_light',
        password: 'indicator_light',
        clientId: randomString(30),
        onConnect: () => {
          wx.showToast({ title: '连接成功' });
          console.log('连接成功');
          this.data.client.subscribe(this.data.subTopic);
        },
        onMessage: (topic, payload) => this.handleMessage(topic, payload),
        onError: (error) => console.log('onError', error),
        onClose: () => console.log('已断开连接')
      });
      this.data.client.connect();
    } catch (error) {
      console.log('mqtt.connect error', error);
    }
  },

  connectCeiling() {
    try {
      this.ceilingClient = createMqttClient({
        url: 'wss://42.193.218.29:8084/mqtt',
        username: 'ceiling_light',
        password: 'ceiling_light',
        clientId: randomString(30),
        onConnect: () => {
          console.log('吸顶灯连接成功');
          this.ceilingClient.subscribe('ceiling_light/data');
        },
        onMessage: (topic, payload) => this.handleCeilingMessage(topic, payload),
        onError: (error) => console.log('ceiling onError', error),
        onClose: () => console.log('吸顶灯已断开')
      });
      this.ceilingClient.connect();
    } catch (error) {
      console.log('ceiling mqtt.connect error', error);
    }
  },

  handleMessage(topic, payload) {
    const currMsg = this.data.receivedMsg ? `<br/>${payload}` : payload;
    this.setValue("receivedMsg", this.data.receivedMsg.concat(currMsg));
    console.log("topic:" + topic);
    console.log("payload:" + payload);

    let a = JSON.parse(payload);
    let d = a[this.data.MAC] || {};
    let dir = d.display_left || d.display_mid || d.display || '';
    const dirMap = {
      'left': './img/向左.png',
      'Left': './img/向左.png',
      'right': './img/向右.png',
      'Right': './img/向右.png',
      'center': './img/双向.png',
      'Center': './img/双向.png',
      'up': './img/向上.png',
      'Up': './img/向上.png',
      'down': './img/向下.png',
      'Down': './img/向下.png',
      'motifs': './img/双向.png',
      'style': './img/双向.png'
    };
    if (dirMap[dir]) {
      this.setValue('titleimg', dirMap[dir]);
    }

    this.setData({
      now: {
        ...this.data.now,
        temper: d.temp != null ? d.temp : this.data.now.temper,
        hud: d.hum != null ? d.hum : this.data.now.hud,
        AQI: d.AQI != null ? d.AQI : this.data.now.AQI,
        TVOC: d.TVOC != null ? d.TVOC : this.data.now.TVOC,
        ECO2: d.ECO2 != null ? d.ECO2 : this.data.now.ECO2,
        HUD: d.buzzer === 2 ? '报警中' : '正常'
      }
    });

    if (d.buzzer === 2 || d.ESP32_fires_flag === true) {
      this.manualEscape = false;
      if (!this.data.escapeMode) {
        this.setData({ escapeMode: true });
        this.startLocation();
        wx.vibrateLong();
      }
    } else {
      if (this.data.escapeMode && !this.manualEscape) {
        this.setData({ escapeMode: false });
        if (wx.stopLocationUpdate) wx.stopLocationUpdate();
      }
    }
  },

  handleCeilingMessage(topic, payload) {
    try {
      console.log("ceiling topic:" + topic);
      console.log("ceiling payload:" + payload);
      let a = JSON.parse(payload);
      let key = Object.keys(a)[0];
      let d = a[key] || {};
      this.setData({
        now: {
          ...this.data.now,
          probability: this.formatProbability(d),
          temper: d.temp != null ? d.temp : (d.temperature != null ? d.temperature : this.data.now.temper),
          hud: d.hum != null ? d.hum : (d.humidity != null ? d.humidity : this.data.now.hud),
          AQI: d.AQI != null ? d.AQI : (d.aqi != null ? d.aqi : this.data.now.AQI),
          TVOC: d.TVOC != null ? d.TVOC : (d.tvoc != null ? d.tvoc : this.data.now.TVOC),
          ECO2: d.ECO2 != null ? d.ECO2 : (d.eco2 != null ? d.eco2 : this.data.now.ECO2),
          hotPixels: d.hot_spot_cnt != null ? d.hot_spot_cnt : (d.hotSpotCnt != null ? d.hotSpotCnt : (d.hot_spot_count != null ? d.hot_spot_count : (d.high_temp_pixels != null ? d.high_temp_pixels : this.data.now.hotPixels)))
        }
      });
    } catch (e) {
      console.log("ceiling parse error", e);
    }
  },

  formatProbability(d) {
    let p = d.probability != null ? d.probability : (d.fire_probability != null ? d.fire_probability : d.fire_prob);
    if (p != null) {
      let num = Number(p);
      if (!isNaN(num)) {
        if (num <= 1) return Math.round(num * 100) + '%';
        return Math.round(num) + '%';
      }
    }
    if (d.ESP32_fires_flag === true) return '100%';
    let tvoc = Number(d.TVOC != null ? d.TVOC : d.tvoc || 0);
    let temp = Number(d.temp != null ? d.temp : d.temperature || 0);
    if (tvoc > 200 || temp > 60) return '80%';
    if (tvoc > 100 || temp > 40) return '50%';
    return '10%';
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
      this.data.client.end()
      this.data.client = null
    }
    if (this.ceilingClient) {
      this.ceilingClient.end()
      this.ceilingClient = null
    }
    console.log("已断开连接");
  },

//发布
  publish(Msg) {
    
      if (this.data.client) {
        // this.data.client.publish(this.data.pubTopic, this.data.pubMsg)
        this.data.client.publish(this.data.pubTopic, Msg)
        console.log("发布成功：" + Msg);
        return
      } else{
        console.log("未连接");
      }
        
    
    // wx.showToast({
    //   title: '请先点击连接',
    //   icon: 'error',
    // })
  },

  //静态左
  changeleft() {
    let Msg = '{"' + this.data.MAC + '":{"display_left":"left","display_mid":"left","display_right":"left"}}'
    this.publish(Msg)
    this.setData({
      titleimg: "./img/向左.png",
      dTaicss: ""
    })
  },

  //静态右
  changeright() {
    let Msg = '{"' + this.data.MAC + '":{"display_left":"right","display_mid":"right","display_right":"right"}}'
    this.publish(Msg)
    this.setData({
      titleimg: "./img/向右.png",
      dTaicss: ""
    })
  },

  //静态双向
  changecenter() {
    let Msg = '{"' + this.data.MAC + '":{"display_left":"motifs","display_mid":"motifs","display_right":"motifs"}}'
    this.publish(Msg)
    this.setData({
      titleimg: "./img/双向.png",
      dTaicss: ""
    })
  },

  //静态上
  changeup() {
    let Msg = '{"' + this.data.MAC + '":{"display_left":"up","display_mid":"up","display_right":"up"}}'
    this.publish(Msg)
    this.setData({
      titleimg: "./img/向上.png",
      dTaicss: ""
    })
  },

  //静态下
  changedown() {
    let Msg = '{"' + this.data.MAC + '":{"display_left":"down","display_mid":"down","display_right":"down"}}'
    this.publish(Msg)
    this.setData({
      titleimg: "./img/向下.png",
      dTaicss: ""
    })
  },

  //动态左
  changeLeft() {
    let Msg = '{"' + this.data.MAC + '":{"display_left":"Left","display_mid":"Left","display_right":"Left"}}'
    this.publish(Msg)
    this.setData({
      titleimg: "./img/向左.png",
      dTaicss: 'CPimage1'
    })
  },
  //动态右
  changeRight() {
    let Msg = '{"' + this.data.MAC + '":{"display_left":"Right","display_mid":"Right","display_right":"Right"}}'
    this.publish(Msg)
    this.setData({
      titleimg: "./img/向右.png",
      dTaicss: 'CPimage1'
    })
  },

  //动态双向
  changeCenter() {
    let Msg = '{"' + this.data.MAC + '":{"display_left":"motifs","display_mid":"motifs","display_right":"motifs"}}'
    this.publish(Msg)
    this.setData({
      titleimg: "./img/双向.png",
      dTaicss: 'CPimage1'
    })
  },
  //动态向上
  changeUp() {
    let Msg = '{"' + this.data.MAC + '":{"display_left":"Up","display_mid":"Up","display_right":"Up"}}'
    this.publish(Msg)
    this.setData({
      titleimg: "./img/向上.png",
      dTaicss: 'CPimage1'
    })
  },
  //动态向下
  changeDown() {
    let Msg = '{"' + this.data.MAC + '":{"display_left":"Down","display_mid":"Down","display_right":"Down"}}'
    this.publish(Msg)
    this.setData({
      titleimg: "./img/向下.png",
      dTaicss: 'CPimage1'
    })
  },

  //动态左上
  changeLUp() {
    let Msg = '{"' + this.data.MAC + '":{"display_left":"LUp","display_mid":"LUp","display_right":"LUp"}}'
    this.publish(Msg)
    this.setData({
      titleimg: "./img/动态左上-开.png",
      dTaicss: 'CPimage1'
    })
  },

  //动态右上
  changeRUp() {
    let Msg = '{"' + this.data.MAC + '":{"display_left":"RUp","display_mid":"RUp","display_right":"RUp"}}'
    this.publish(Msg)
    this.setData({
      titleimg: "./img/动态右上-开.png",
      dTaicss: 'CPimage1'
    })
  },

  //动态左下
  changeLDown() {
    let Msg = '{"' + this.data.MAC + '":{"display_left":"LDown","display_mid":"LDown","display_right":"LDown"}}'
    this.publish(Msg)
    this.setData({
      titleimg: "./img/动态左下-开.png",
      dTaicss: 'CPimage1'
    })
  },

  //动态右下
  changeRDown() {
    let Msg = '{"' + this.data.MAC + '":{"display_left":"RDown","display_mid":"RDown","display_right":"RDown"}}'
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

  // ===== 逃生导航功能 =====
  // 开始逃生模式
  startEscape() {
    this.manualEscape = true;
    this.setData({ escapeMode: true });
    this.startLocation();
    wx.vibrateLong();
  },

  // 停止逃生模式
  stopEscape() {
    this.manualEscape = false;
    this.setData({ escapeMode: false });
    if (wx.stopLocationUpdate) wx.stopLocationUpdate();
  },

  // 开始GPS定位
  startLocation() {
    wx.startLocationUpdate({
      success: () => {
        wx.onLocationChange((res) => {
          this.setData({
            latitude: res.latitude,
            longitude: res.longitude,
            currentLocation: res.latitude.toFixed(5) + ', ' + res.longitude.toFixed(5)
          });
          this.reportAndGetDirection(res.latitude, res.longitude);
        });
      },
      fail: () => {
        wx.getLocation({
          type: 'gcj02',
          success: (res) => {
            this.setData({
              latitude: res.latitude,
              longitude: res.longitude,
              currentLocation: res.latitude.toFixed(5) + ', ' + res.longitude.toFixed(5)
            });
            this.reportAndGetDirection(res.latitude, res.longitude);
          },
          fail: () => {
            // 模拟定位：默认使用 6F 大厅节点
            this.setData({ currentLocation: '0.00000, 22.50000' });
            this.reportAndGetDirection(0, 22.5);
          }
        });
      }
    });
  },

  // 上报位置并获取逃生方向
  reportAndGetDirection(lat, lng) {
    wx.request({
      url: `http://42.193.218.29:8080/api/location`,
      method: 'POST',
      data: {
        openid: app.globalData.openid || 'test_openid_001',
        latitude: lat,
        longitude: lng
      },
      success: (res) => {
        const body = res.data || {};
        const data = body.data || {};
        console.log("location response", body);
        if (body.code === 0 && data.success) {
          const arrowMap = {
            'left': '←', 'Left': '←',
            'right': '→', 'Right': '→',
            'up': '↑', 'Up': '↑',
            'down': '↓', 'Down': '↓',
            'LUp': '↖', 'lup': '↖',
            'RUp': '↗', 'rup': '↗',
            'LDown': '↙', 'ldown': '↙',
            'RDown': '↘', 'rdown': '↘'
          };
          this.setData({
            escapeDirection: data.direction,
            directionArrow: arrowMap[data.direction] || '↑',
            exitName: data.exit_name || '--',
            distance: data.distance != null ? data.distance : '--',
            estimatedTime: data.estimated_time != null ? data.estimated_time : '--',
            currentLocation: (data.floor != null ? data.floor + 'F · ' : '') + (data.node_id || '未知位置')
          });
          // 自动下发方向到指示灯
          if (data.direction) this.publishEscapeDirection(data.direction);
        } else {
          this.setData({ currentLocation: body.message || '定位失败' });
        }
      },
      fail: (err) => {
        console.log("location request fail", err);
        this.setData({ currentLocation: '定位请求失败' });
      }
    });
  },

  // 下发逃生方向到指示灯
  publishEscapeDirection(dir) {
    let Msg = '{"' + this.data.MAC + '":{"display_left":"' + dir + '","display_mid":"' + dir + '","display_right":"' + dir + '","buzzer":2}}';
    this.publish(Msg);
  },

  // 拨打119
  call119() {
    wx.makePhoneCall({
      phoneNumber: '119'
    });
  },

  // 语音指引
  playVoiceGuide() {
    wx.showToast({
      title: '请跟随箭头方向逃生',
      icon: 'none'
    });
  },


  onLoad: function (options) {

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    this.connect()
    this.connectCeiling()
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
