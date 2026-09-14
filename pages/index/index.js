// index.js
// 获取应用实例
const app = getApp()
const createMqttClient = require('../../utils/wxmqtt')

function randomString(len) {
  len = len || 32;
  var $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
  var maxPos = $chars.length;
  var pwd = 'xcx_index_';
  for (let i = 0; i < len; i++) {
    pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return pwd;
}

Page({
  data: {
    client: null,
    subTopic: "indicator_light/data",
    subTopics: ["indicator_light/data", "ceiling_light/data"],
    MAC: 'ESP32_D8:BC:38:78:24:B8',
    dataReceived: false,
    mqttTimer: null,
    reconnectTimer: null,
    connectAttempts: 0,
    fireNavigated: false,  // 防止重复跳转逃生页面
    // HTTP 中继服务器配置（真机调试时使用）
    relayHost: '192.168.31.211',  // 你的电脑IP，运行中继服务器后会自动显示
    relayPort: 3000,
    pollTimer: null,
    Group: {
      GroupName: '应急指示灯',
      icon: "./img/xdd0.png",
      now: {
        TEMPER: '',
        co2: '',
        PM10: '',
        PM2_5: '',
        TVOC: '',
        HUD: '',
        CH2O: '',

        TEMPERcolor: '',
        co2color: '',
        PM10color: '',
        PM2_5color: '',
        TVOCcolor: '',
        co2color: '',
        HUDcolor: '',
        cCH2Ocolor: '',

      },
    },
    now: {
      TEMPER: '--',
      HUD: '--',
      TVOC: '--',
      AQI: '--',
      ECO2: '--',
      STATUS: '正常',
      TEMPERcolor: 'dian4',
      HUDcolor: 'dian2',
      TVOCcolor: 'dian3'
    },
    menber: [{
        data: '设备1',
        dc: '99'
      },
      {
        data: '设备2',
        dc: '90'
      },

    ]
  },
  // 事件处理函数
  bindViewTap() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  gotoPage: function (options) {

    wx.navigateTo({
      url: '../ECLight/ECLight', //要跳转到的页面路径
    })
  },

  gotoEscape: function (options) {
    wx.navigateTo({
      url: '../ELight/ELight', //要跳转到的逃生页面路径
    })
  },
  onLoad() {
    var _this = this;

    // 连接 MQTT 接收实时数据（模拟器用）
    this.connectMQTT();

    // 如果配置了中继服务器，立即启动 HTTP 轮询（真机用），不用等 WebSocket 重连
    if (this.data.relayHost) {
      this.startHttpPolling();
    }

    // 5秒后如果没收到任何数据，显示模拟数据
    this.data.mqttTimer = setTimeout(() => {
      if (!this.data.dataReceived) {
        console.log('MQTT数据未收到，显示模拟数据');
        this.setData({
          now: {
            TEMPER: '26.2',
            HUD: '43.0',
            TVOC: '0.32',
            AQI: '--',
            ECO2: '--',
            STATUS: '正常',
            TEMPERcolor: 'dian3',
            HUDcolor: 'dian3',
            TVOCcolor: 'dian3'
          }
        });
      }
    }, 5000);
  },

  // ===== MQTT 连接接收实时数据 =====
  connectMQTT() {
    try {
      // 清除旧的重连定时器
      if (this.data.reconnectTimer) {
        clearTimeout(this.data.reconnectTimer);
        this.data.reconnectTimer = null;
      }
      // 断开旧连接
      if (this.data.client) {
        this.data.client.end();
        this.data.client = null;
      }

      this.data.connectAttempts++;
      const attempt = this.data.connectAttempts;
      console.log('首页 MQTT 连接尝试 #' + attempt);

      this.data.client = createMqttClient({
        url: 'wss://42.193.218.29:8084/mqtt',
        username: 'indicator_light',
        password: 'indicator_light',
        clientId: randomString(30),
        onConnect: () => {
          console.log('首页 MQTT 连接成功 (# 尝试' + attempt + ')');
          this.data.connectAttempts = 0;
          // 同时订阅两个 topic
          this.data.client.subscribe(this.data.subTopics[0]);
          this.data.client.subscribe(this.data.subTopics[1]);
        },
        onMessage: (topic, payload) => this.handleMessage(topic, payload),
        onError: (error) => {
          console.log('首页 MQTT onError', error);
          // 连接失败后尝试重连
          this.scheduleReconnect();
        },
        onClose: () => {
          console.log('首页 MQTT 已断开');
          // 断开后如果还没收到数据，尝试重连
          if (!this.data.dataReceived) {
            this.scheduleReconnect();
          }
        }
      });
      this.data.client.connect();
    } catch (error) {
      console.log('首页 MQTT connect error', error);
      this.scheduleReconnect();
    }
  },

  scheduleReconnect() {
    // 如果已经收到过数据，不重连
    if (this.data.dataReceived) return;
    // 最多重连 5 次
    if (this.data.connectAttempts >= 5) {
      console.log('首页 MQTT 已达最大重连次数');
      return;
    }
    // 延迟重连（指数退避：3秒、6秒、12秒...）
    const delay = Math.min(3000 * Math.pow(2, this.data.connectAttempts - 1), 30000);
    console.log('首页 MQTT 将在 ' + delay + 'ms 后重连');
    this.data.reconnectTimer = setTimeout(() => {
      this.connectMQTT();
    }, delay);
  },

  // ===== HTTP 中继轮询（真机调试时使用） =====
  startHttpPolling() {
    if (!this.data.relayHost) return;
    const url = `http://${this.data.relayHost}:${this.data.relayPort}/api/data`;
    console.log('开始 HTTP 轮询: ' + url);

    const poll = () => {
      wx.request({
        url: url,
        method: 'GET',
        success: (res) => {
          if (res.data && res.data.data) {
            const data = res.data.data;
            // 遍历所有 topic 的数据
            Object.keys(data).forEach(topic => {
              this.handleMessage(topic, data[topic].payload);
            });
          }
        },
        fail: (err) => {
          console.log('HTTP 轮询失败', err);
        },
        complete: () => {
          // 无论成功还是失败，3 秒后继续轮询
          this.data.pollTimer = setTimeout(poll, 3000);
        }
      });
    };

    // 启动轮询
    this.data.pollTimer = setTimeout(poll, 100);
  },

  stopHttpPolling() {
    if (this.data.pollTimer) {
      clearTimeout(this.data.pollTimer);
      this.data.pollTimer = null;
    }
  },

  handleMessage(topic, payload) {
    console.log("首页 topic:" + topic);
    console.log("首页 payload:" + payload);
    try {
      let a = JSON.parse(payload);
      let d = {};

      // 单设备模式
      if (!Array.isArray(a)) {
        d = a[this.data.MAC] || {};
        // ceiling_light/data 可能用不同的 MAC，取第一个设备
        if (topic === 'ceiling_light/data' && Object.keys(d).length === 0) {
          let firstKey = Object.keys(a)[0];
          if (firstKey) d = a[firstKey];
        }
      } else {
        // Mesh 组网模式
        for (let item of a) {
          if (typeof item === 'object' && item !== null) {
            let mac = Object.keys(item)[0];
            if (mac === this.data.MAC) {
              d = item[mac] || {};
            }
          }
        }
        // ceiling_light/data Mesh 模式取第一个设备
        if (topic === 'ceiling_light/data' && Object.keys(d).length === 0) {
          if (a[0] && typeof a[0] === 'object') {
            let firstKey = Object.keys(a[0])[0];
            if (firstKey) d = a[0][firstKey];
          }
        }
      }

      // ceiling_light/data 更新设备状态
      if (topic === 'ceiling_light/data') {
        console.log('吸顶灯数据:', d);
        let ceilingStatus = (d.buzzer === 2 || d.ESP32_fires_flag === true || d.flame === 'True') ? '报警中' : '正常';
        this.setData({
          now: {
            ...this.data.now,
            STATUS: ceilingStatus
          }
        });
        return;
      }

           // === 火灾检测 ===
           let isFire = d.buzzer === 2 || d.ESP32_fires_flag === true || d.flame === 'True';
           if (isFire && !this.data.fireNavigated) {
             console.log('🔥 检测到火灾，跳转到逃生页面');
             this.setData({ fireNavigated: true });
             wx.vibrateLong();
             wx.showModal({
               title: '⚠️ 火灾警报',
               content: '检测到火灾！即将跳转到逃生导航页面',
               showCancel: false,
               confirmText: '立即逃生'
             });
             wx.navigateTo({ url: '/pages/ELight/ELight?fire=true' });
             // 30秒后允许再次跳转
             setTimeout(() => {
               this.setData({ fireNavigated: false });
             }, 30000);
             return;
           }
     
      // indicator_light/data 更新环境传感器数据
      if (d.temp != null || d.TVOC != null || d.hum != null) {
        this.data.dataReceived = true;
        if (this.data.mqttTimer) {
          clearTimeout(this.data.mqttTimer);
          this.data.mqttTimer = null;
        }
        let temp = d.temp != null ? d.temp : '--';
        let hud = d.hum != null ? d.hum : '--';
        let tvoc = d.TVOC != null ? d.TVOC : '--';
        let aqi = d.AQI != null ? d.AQI : '--';
        let eco2 = d.ECO2 != null ? d.ECO2 : '--';
        let status = (d.buzzer === 2 || d.ESP32_fires_flag === true) ? '报警中' : '正常';

        let tempColor = temp > 30 ? 'dian5' : temp > 26 ? 'dian4' : temp > 20 ? 'dian3' : 'dian2';
        let hudColor = hud > 60 ? 'dian5' : hud > 40 ? 'dian3' : 'dian2';
        let tvocColor = tvoc > 30 ? 'dian5' : tvoc > 26 ? 'dian4' : tvoc > 20 ? 'dian3' : 'dian2';

        this.setData({
          now: {
            ...this.data.now,
            TEMPER: temp,
            HUD: hud,
            TVOC: tvoc,
            AQI: aqi,
            ECO2: eco2,
            STATUS: status,
            TEMPERcolor: tempColor,
            HUDcolor: hudColor,
            TVOCcolor: tvocColor
          }
        });
      }
    } catch (e) {
      console.log('首页 parse error', e);
    }
  },

  onUnload: function () {
    if (this.data.mqttTimer) {
      clearTimeout(this.data.mqttTimer);
    }
    if (this.data.reconnectTimer) {
      clearTimeout(this.data.reconnectTimer);
    }
    if (this.data.client) {
      this.data.client.end();
    }
    this.stopHttpPolling();
  },

  onShow() {
    // 页面显示时的其他逻辑（如有需要可在此添加）
  },
  getUserInfo(e) {

    console.log(e)
  },

  onRefresh: function () {
    //导航条加载动画
    wx.showNavigationBarLoading()
    //loading 提示框
    wx.showLoading({
      title: 'Loading...',
    })
    console.log("下拉刷新啦");
    setTimeout(function () {
      wx.hideLoading();
      wx.hideNavigationBarLoading();
      //停止下拉刷新
      wx.stopPullDownRefresh();
    }, 1000)
  },
  onPullDownRefresh: function () {
    this.onRefresh();
    var _this = this;
    // 刷新时重新连接 MQTT 获取最新实时数据
    _this.connectMQTT();
  },
})

