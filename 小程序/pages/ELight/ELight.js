const app = getApp()
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
  data: {
    client: null,
    subTopic: "indicator_light/data",
    pubTopic: "indicator_light/command",
    MAC: 'ESP32_D8:BC:38:78:24:B8',
    reconnectTimer: null,
    connectAttempts: 0,
    // HTTP 中继服务器配置（真机调试时使用）
    relayHost: '192.168.31.211',
    relayPort: 3000,
    pollTimer: null,
    firePollTimer: null,
    // 逃生模式
    escapeMode: false,
    manualEscape: false,
    escapeDirection: '',
    directionArrow: '↑',
    exitName: '--',
    distance: '--',
    estimatedTime: '--',
    // BLE 蓝牙定位
    bleBeacons: [],
    isScanning: false,
    scanTimer: null,
    scanTimeoutId: null,
    currentLocation: '--',
    // 火灾检测时间戳（用于10秒自动解除）
    lastFireTime: 0
  },

  // ===== MQTT 连接 =====
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

  scheduleReconnect() {
    if (this.data.connectAttempts >= 5) return;
    const delay = Math.min(3000 * Math.pow(2, this.data.connectAttempts - 1), 30000);
    console.log('MQTT 将在 ' + delay + 'ms 后重连');
    this.data.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  },

  disconnect() {
    if (this.data.client) {
      this.data.client.end();
      this.data.client = null;
    }
  },

  // ===== MQTT 消息处理（火灾检测） =====
  handleMessage(topic, payload) {
    console.log("topic:" + topic);
    console.log("payload:" + payload);

    try {
      let a = JSON.parse(payload);
      let anyFire = false;

      // 支持单设备(对象)和多设备Mesh(数组)两种格式
      if (Array.isArray(a)) {
        // Mesh 组网模式：遍历所有设备
        for (let item of a) {
          if (typeof item === 'object' && item !== null) {
            let mac = Object.keys(item)[0];
            let deviceData = item[mac] || {};
            // 任意设备触发火灾，都标记为火灾（支持 buzzer、ESP32_fires_flag、flame 三种字段）
            if (deviceData.buzzer === 2 || deviceData.ESP32_fires_flag === true || deviceData.flame === 'True') {
              anyFire = true;
            }
          }
        }
      } else {
        // 单设备模式
        let d = a[this.data.MAC] || {};
        anyFire = d.buzzer === 2 || d.ESP32_fires_flag === true || d.flame === 'True';
      }

      if (anyFire) {
        // 更新火灾检测时间戳
        this.setData({ lastFireTime: Date.now() });
        this.manualEscape = false;
        if (!this.data.escapeMode) {
          this.setData({ escapeMode: true });
          this.startLocation();
          wx.vibrateLong();
          wx.vibrateLong();
          wx.showModal({
            title: '⚠️ 火灾警报',
            content: '检测到火灾！正在启动逃生导航，请跟随指示前往安全出口',
            showCancel: false,
            confirmText: '我知道了'
          });
        }
      } else {
        // 10秒内没有新火灾信号才解除火灾模式
        if (this.data.escapeMode && !this.manualEscape) {
          if (Date.now() - this.data.lastFireTime > 10000) {
            this.setData({ escapeMode: false });
            if (this.data.scanTimer) {
              clearTimeout(this.data.scanTimer);
            }
            wx.stopBluetoothDevicesDiscovery({});
            wx.showToast({ title: '火警已解除', icon: 'none' });
          }
        }
      }
    } catch (e) {
      console.log('parse error', e);
    }
  },

  // ===== 逃生导航功能 =====
  startEscape() {
    this.manualEscape = true;
    this.setData({ escapeMode: true });
    this.startLocation();
    wx.vibrateLong();
  },

  stopEscape() {
    this.manualEscape = false;
    this.setData({ escapeMode: false });
    // 清除所有定时器
    if (this.data.scanTimer) {
      clearTimeout(this.data.scanTimer);
    }
    if (this.data.scanTimeoutId) {
      clearTimeout(this.data.scanTimeoutId);
    }
    this.setData({ scanTimer: null, scanTimeoutId: null });
    // 停止扫描并关闭蓝牙适配器
    wx.stopBluetoothDevicesDiscovery({
      success: () => {
        console.log('已停止蓝牙扫描');
        wx.closeBluetoothAdapter({
          success: () => console.log('已关闭蓝牙适配器'),
          fail: (err) => console.log('关闭蓝牙适配器失败', err)
        });
      },
      fail: (err) => {
        console.log('停止蓝牙扫描失败', err);
        wx.closeBluetoothAdapter({});
      }
    });
  },

  // ===== BLE 蓝牙定位 =====
  startLocation() {
    this.startBLEScan();
  },

  startBLEScan() {
    const that = this;

    // 先关闭旧的蓝牙适配器，确保可以重新打开
    wx.closeBluetoothAdapter({
      success: () => console.log('已关闭旧蓝牙适配器'),
      fail: () => {},
      complete: () => {
        setTimeout(() => {
          wx.openBluetoothAdapter({
            success: () => {
              console.log('蓝牙已开启');
              that.setData({ bleBeacons: [], isScanning: true });
              wx.startBluetoothDevicesDiscovery({
                allowDuplicatesKey: false,
                interval: 5000,
                success: () => {
                  console.log('开始扫描 BLE 设备');
                  wx.onBluetoothDeviceFound(that.onDeviceFound);
                },
                fail: (err) => {
                  console.error('启动扫描失败', err);
                  that.setData({ isScanning: false });
                  that.reportAndGetDirection([{ major: 3, minor: 1, rssi: -60 }]);
                }
              });
            },
            fail: (err) => {
              console.error('开启蓝牙失败', err);
              that.setData({ isScanning: false });
              // 首次提示，之后不再提示
              if (!wx.getStorageSync('bluetooth_prompted')) {
                wx.showModal({
                  title: '提示',
                  content: '逃生导航需要使用蓝牙功能，请在手机设置中开启蓝牙，并允许微信使用蓝牙权限',
                  showCancel: false,
                  success: () => {
                    wx.setStorageSync('bluetooth_prompted', true);
                  }
                });
              }
              that.reportAndGetDirection([{ major: 3, minor: 1, rssi: -60 }]);
            }
          });
        }, 300);
      }
    });
  },

  onDeviceFound(res) {
    const devices = res.devices;
    for (const device of devices) {
      if (!device.advertisData) continue;
      const beacon = this.parseiBeacon(device.advertisData, device.RSSI);
      if (!beacon) continue;

      const existing = this.data.bleBeacons.findIndex(b => b.deviceId === device.deviceId);
      const beaconData = {
        deviceId: device.deviceId,
        major: beacon.major,
        minor: beacon.minor,
        rssi: beacon.rssi,
        timestamp: Date.now()
      };
      if (existing >= 0) {
        const list = [...this.data.bleBeacons];
        list[existing] = beaconData;
        this.setData({ bleBeacons: list });
      } else {
        this.setData({ bleBeacons: [...this.data.bleBeacons, beaconData] });
      }
    }

    if (this.data.scanTimer) clearTimeout(this.data.scanTimer);
    const timer = setTimeout(() => {
      const now = Date.now();
      const validBeacons = this.data.bleBeacons
        .filter(b => now - b.timestamp < 10000)
        .map(b => ({ major: b.major, minor: b.minor, rssi: b.rssi }));
      if (validBeacons.length > 0) {
        this.reportAndGetDirection(validBeacons);
      }
    }, 1500);
    this.setData({ scanTimer: timer });
  },

  parseiBeacon(advertisData, rssi) {
    const data = new Uint8Array(advertisData);
    for (let i = 0; i < data.length - 24; i++) {
      if (data[i] === 0x4C && data[i + 1] === 0x00 &&
          data[i + 2] === 0x02 && data[i + 3] === 0x15) {
        const major = (data[i + 20] << 8) | data[i + 21];
        const minor = (data[i + 22] << 8) | data[i + 23];
        return { major, minor, rssi };
      }
    }
    return null;
  },

  reportAndGetDirection(beacons) {
    wx.request({
      url: `http://42.193.218.29:8080/api/location`,
      method: 'POST',
      data: {
        openid: app.globalData.openid || 'test_openid_001',
        beacons: beacons
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

  publishEscapeDirection(dir) {
    let Msg = '{"' + this.data.MAC + '":{"display_left":"' + dir + '","display_mid":"' + dir + '","display_right":"' + dir + '","buzzer":2}}';
    this.publish(Msg);
  },

  publish(msg) {
    if (this.data.client) {
      this.data.client.publish(this.data.pubTopic, msg);
    }
  },

  call119() {
    wx.makePhoneCall({
      phoneNumber: '119'
    });
  },

  playVoiceGuide() {
    wx.showToast({
      title: '请跟随箭头方向逃生',
      icon: 'none'
    });
  },

  // ===== 生命周期 =====
  onReady: function () {
    this.connect();
  },

  onShow: function () {
    // 检查是否从首页跳转过来时携带火灾标志
    // 如果需要自动跳转，由首页的 handleMessage 处理
  },

  onHide: function () {
    // 页面隐藏时不断开，保持后台接收
  },

  onLoad: function (options) {
    // 如果从首页跳转过来携带 fire=true，自动进入逃生模式
    if (options && options.fire === 'true') {
      console.log('收到火灾指令，自动进入逃生模式');
      this.manualEscape = false;
      this.setData({ escapeMode: true, lastFireTime: Date.now() });
      this.startLocation();
    }
    // 如果配置了中继服务器，启动 HTTP 轮询
    if (this.data.relayHost) {
      this.startHttpPolling();
    }
},

  // ===== HTTP 中继轮询（用于接收火灾消息） =====
  startHttpPolling() {
    if (!this.data.relayHost) return;
    const relayUrl = `http://${this.data.relayHost}:${this.data.relayPort}/api/data`;
    const fireUrl = `http://${this.data.relayHost}:${this.data.relayPort}/api/fire-alert`;
    console.log('ELight 开始 HTTP 轮询');

    // 轮询 MQTT 数据（用于环境数据更新）
    const pollData = () => {
      wx.request({
        url: relayUrl,
        method: 'GET',
        success: (res) => {
          if (res.data && res.data.data) {
            const data = res.data.data;
            Object.keys(data).forEach(topic => {
              if (topic === this.data.subTopic) {
                this.handleMessage(topic, data[topic].payload);
              }
            });
          }
        },
        fail: (err) => {
          console.log('ELight HTTP 轮询失败', err);
        },
        complete: () => {
          this.data.pollTimer = setTimeout(pollData, 3000);
        }
      });
    };

    // 轮询火灾警报状态
    const pollFire = () => {
      wx.request({
        url: fireUrl,
        method: 'GET',
        success: (res) => {
          if (res.data && res.data.fireAlert) {
            const alert = res.data.fireAlert;
            console.log('ELight 收到火灾警报:', alert);
            // 模拟 MQTT 消息调用 handleMessage
            const mockPayload = JSON.stringify({
              [this.data.MAC]: {
                buzzer: alert.buzzer || 2,
                ESP32_fires_flag: alert.fire || false,
                temp: alert.temp || 28.5,
                hum: alert.hum || 45,
                TVOC: alert.TVOC || 0.8
              }
            });
            this.handleMessage(this.data.subTopic, mockPayload);
          }
        },
        fail: (err) => {
          console.log('ELight 火灾警报轮询失败', err);
        },
        complete: () => {
          this.data.firePollTimer = setTimeout(pollFire, 2000);
        }
      });
    };

    // 启动轮询
    this.data.pollTimer = setTimeout(pollData, 100);
    this.data.firePollTimer = setTimeout(pollFire, 500);
  },

  stopHttpPolling() {
    if (this.data.pollTimer) {
      clearTimeout(this.data.pollTimer);
      this.data.pollTimer = null;
    }
    if (this.data.firePollTimer) {
      clearTimeout(this.data.firePollTimer);
      this.data.firePollTimer = null;
    }
  }
})


