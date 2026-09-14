// pages/about/about.js
Page({

  data: {
    appInfo: {
      name: '云优径智慧逃生',
      version: 'V1.0.0',
      description: '基于 BLE 蓝牙定位的智能消防逃生系统'
    },
    features: [
      { icon: '/pages/images/user/running.png', title: '实时定位', desc: '通过 BLE 蓝牙信标实时定位当前位置' },
      { icon: '/pages/images/user/8_8人工智能.png', title: '智能逃生', desc: '自动计算最近安全出口，规划最优逃生路线' },
      { icon: '/pages/images/user/网络.png', title: '环境监测', desc: '实时监测温度、湿度、TVOC 等环境数据' },
      { icon: '/pages/images/user/whatsapp.png', title: 'MQTT 物联网', desc: '基于 MQTT 协议实现设备互联互通' }
    ],
    techStack: [
      { label: '定位技术', value: 'BLE 蓝牙 4.0/5.0 信标定位' },
      { label: '通信协议', value: 'MQTT over WebSocket' },
      { label: '开发框架', value: '微信小程序原生框架' },
      { label: '硬件支持', value: 'ESP32 系列物联网设备' }
    ]
  },

  onLoad(options) {

  },

  onReady() {

  },

  onShow() {

  },

  onHide() {

  },

  onUnload() {

  },

  onPullDownRefresh() {

  },

  onReachBottom() {

  },

  onShareAppMessage() {
    return {
      title: '云优径智慧逃生 - BLE蓝牙定位逃生系统',
      path: '/pages/index/index'
    }
  }
})