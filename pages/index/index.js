// index.js
// 获取应用实例
const app = getApp()

Page({
  data: {
    Group: {
      GroupName: '实验室的智能应急灯',
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

  gotoPage2: function (options) {
    wx.navigateTo({
      url: '../CLight/CLight', //要跳转到的页面路径
    })
  },
  gotoPage3: function (options) {
    wx.navigateTo({
      url: '../ELight/ELight', //要跳转到的页面路径
    })
  },
  onLoad() {
    var _this = this;

    wx.cloud.init();
    wx.cloud.callFunction({
      name: 'mysql', //云函数名称
      data: {
        sb: 0,
      },
      success: function (res) {
        console.log(res);
        var GroupID = [];
        var Group_TEMPER = [];
        var Group_HUD = [];
        var Group_co2 = [];
        var Group_CH2O = [];
        var Group_TVOC = [];
        var Group_PM2_5 = [];
        var Group_PM10 = [];
        var Group_DC = [];
        var Group_time = [];
        var date = [];
        for (var i = 0; i < res.result.length; ++i) {
          const util = require('../../utils/util.js');
          var date = new Date(res.result[i].time);
          Group_TEMPER[i] = parseFloat(res.result[i].temper).toFixed(2);
          Group_HUD[i] = parseFloat(res.result[i].hud).toFixed(2);
          Group_co2[i] = parseFloat(res.result[i].CO2).toFixed(2);
          Group_CH2O[i] = parseFloat(res.result[i].CH2O).toFixed(3);
          Group_TVOC[i] = parseFloat(res.result[i].TVOC).toFixed(2);
          Group_PM2_5[i] = parseFloat(res.result[i].PM2_5).toFixed(2);
          Group_PM10[i] = parseFloat(res.result[i].PM10).toFixed(2);
          Group_time[i] = date.getTime() - 8 * 3600 * 1000;

          //  console.log(date);
        }
        var Temp_time = [
          [Group_time[0], Group_TEMPER[0]]
        ];
        var HUD_time = [
          [Group_time[0], Group_HUD[0]]
        ];
        var CO2_time = [
          [Group_time[0], Group_co2[0]]
        ];
        var CH2O_time = [
          [Group_time[0], Group_CH2O[0]]
        ];
        var TVOC_time = [
          [Group_time[0], Group_TVOC[0]]
        ];
        var PM25_time = [
          [Group_time[0], Group_PM2_5[0]]
        ];
        var PM10_time = [
          [Group_time[0], Group_PM10[0]]
        ];

        for (var i = 0; i < Group_time.length; ++i) {
          Temp_time.push([Group_time[i], Group_TEMPER[i]]);
          HUD_time.push([Group_time[i], Group_HUD[i]]);
          CO2_time.push([Group_time[i], Group_co2[i]]);
          CH2O_time.push([Group_time[i], Group_CH2O[i]]);
          TVOC_time.push([Group_time[i], Group_TVOC[i]]);
          PM25_time.push([Group_time[i], Group_PM2_5[i]]);
          PM10_time.push([Group_time[i], Group_PM10[i]]);
        }
        _this.setData({
          now: {
            TEMPER: Temp_time[0][1],
            co2: CO2_time[0][1],
            PM10: PM10_time[0][1],
            PM2_5: PM25_time[0][1],
            TVOC: TVOC_time[0][1],
            HUD: HUD_time[0][1],
            CH2O: CH2O_time[0][1],

            co2color: CO2_time[0][1] >= 0.1 ? "dian5" : CO2_time[0][1] > 0.0 ? "dian3" : "dian",

            TEMPERcolor: Temp_time[0][1] > 30 ? "dian5" : Temp_time[0][1] > 26 ? "dian4" : Temp_time[0][1] > 20 ? "dian3" : Temp_time[0][1] > 0 ? "dian2" : "dian1",

            PM10color: PM10_time[0][1] > 0.15 ? "dian5" : PM10_time[0][1] > 0.1 ? "dian4" : PM10_time[0][1] > 0 ? "dian3" : "dian1",

            PM2_5color: PM25_time[0][1] > 115 ? "dian5" : PM25_time[0][1] > 75 ? "dian4" : PM25_time[0][1] > 35 ? "dian3" : PM25_time[0][1] > 0 ? "dian2" : "dian",

            TVOCcolor: TVOC_time[0][1] > 30 ? "dian5" : TVOC_time[0][1] > 26 ? "dian4" : TVOC_time[0][1] > 20 ? "dian3" : TVOC_time[0][1] > 0 ? "dian2" : "dian1",


            HUDcolor: HUD_time[0][1] > 60 ? "dian5" : HUD_time[0][1] > 40 ? "dian3" : HUD_time[0][1] > 0 ? "dian3" : "dian",

            CH2Ocolor: CH2O_time[0][1] > 0.1 ? "dian5" : CH2O_time[0][1] > 0 ? "dian2" : "dian1",

          },
        })

      }
    })
  },
  getUserProfile(e) {


  },
  onShow() {

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
    wx.cloud.init();
    wx.cloud.callFunction({
      name: 'mysql', //云函数名称
      data: {
        sb: 0,
      },
      success: function (res) {
        console.log(res);
        var GroupID = [];
        var Group_TEMPER = [];
        var Group_HUD = [];
        var Group_co2 = [];
        var Group_CH2O = [];
        var Group_TVOC = [];
        var Group_PM2_5 = [];
        var Group_PM10 = [];
        var Group_DC = [];
        var Group_time = [];
        var date = [];
        for (var i = 0; i < res.result.length; ++i) {
          var date = new Date(res.result[i].time);
          Group_TEMPER[i] = parseFloat(res.result[i].temper).toFixed(2);
          Group_HUD[i] = parseFloat(res.result[i].hud).toFixed(2);
          Group_co2[i] = parseFloat(res.result[i].CO2).toFixed(2);
          Group_CH2O[i] = parseFloat(res.result[i].CH2O).toFixed(3);
          Group_TVOC[i] = parseFloat(res.result[i].TVOC).toFixed(2);
          Group_PM2_5[i] = parseFloat(res.result[i].PM2_5).toFixed(2);
          Group_PM10[i] = parseFloat(res.result[i].PM10).toFixed(2);
          Group_time[i] = date.getTime() - 8 * 3600 * 1000;

          //  console.log(date);
        }
        var Temp_time = [
          [Group_time[0], Group_TEMPER[0]]
        ];
        var HUD_time = [
          [Group_time[0], Group_HUD[0]]
        ];
        var CO2_time = [
          [Group_time[0], Group_co2[0]]
        ];
        var CH2O_time = [
          [Group_time[0], Group_CH2O[0]]
        ];
        var TVOC_time = [
          [Group_time[0], Group_TVOC[0]]
        ];
        var PM25_time = [
          [Group_time[0], Group_PM2_5[0]]
        ];
        var PM10_time = [
          [Group_time[0], Group_PM10[0]]
        ];

        for (var i = 0; i < Group_time.length; ++i) {
          Temp_time.push([Group_time[i], Group_TEMPER[i]]);
          HUD_time.push([Group_time[i], Group_HUD[i]]);
          CO2_time.push([Group_time[i], Group_co2[i]]);
          CH2O_time.push([Group_time[i], Group_CH2O[i]]);
          TVOC_time.push([Group_time[i], Group_TVOC[i]]);
          PM25_time.push([Group_time[i], Group_PM2_5[i]]);
          PM10_time.push([Group_time[i], Group_PM10[i]]);
        }
        _this.setData({
          now: {
            TEMPER: Temp_time[0][1],
            co2: CO2_time[0][1],
            PM10: PM10_time[0][1],
            PM2_5: PM25_time[0][1],
            TVOC: TVOC_time[0][1],
            HUD: HUD_time[0][1],
            CH2O: CH2O_time[0][1],

            co2color: CO2_time[0][1] >= 0.1 ? "dian5" : CO2_time[0][1] > 0.0 ? "dian3" : "dian",

            TEMPERcolor: Temp_time[0][1] > 30 ? "dian5" : Temp_time[0][1] > 26 ? "dian4" : Temp_time[0][1] > 20 ? "dian3" : Temp_time[0][1] > 0 ? "dian2" : "dian1",

            PM10color: PM10_time[0][1] > 0.15 ? "dian5" : PM10_time[0][1] > 0.1 ? "dian4" : PM10_time[0][1] > 0 ? "dian3" : "dian1",

            PM2_5color: PM25_time[0][1] > 115 ? "dian5" : PM25_time[0][1] > 75 ? "dian4" : PM25_time[0][1] > 35 ? "dian3" : PM25_time[0][1] > 0 ? "dian2" : "dian",

            TVOCcolor: TVOC_time[0][1] > 30 ? "dian5" : TVOC_time[0][1] > 26 ? "dian4" : TVOC_time[0][1] > 20 ? "dian3" : TVOC_time[0][1] > 0 ? "dian2" : "dian1",


            HUDcolor: HUD_time[0][1] > 60 ? "dian5" : HUD_time[0][1] > 40 ? "dian3" : HUD_time[0][1] > 0 ? "dian3" : "dian",

            CH2Ocolor: CH2O_time[0][1] > 0.1 ? "dian5" : CH2O_time[0][1] > 0 ? "dian2" : "dian1",

          },
        })

      }
    })
  },
})