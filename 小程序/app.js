// app.js
App({
  globalData: {
    openid: ''
  },
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 获取登录 code（用于后续扩展）
    wx.login({
      success: res => {
        console.log('wx.login code:', res.code);
      }
    })
  },

})