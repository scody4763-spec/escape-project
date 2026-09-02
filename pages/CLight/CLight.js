const App = getApp();
import * as echarts from '../../ec-canvas/echarts.min'; //引入echarts.js
import mqtt from "../../utils/mqtt.min.js"
var barec1 = null
var barec2 = null
var barec3 = null
var barec4 = null
var barec5 = null
var barec6 = null
var barec7 = null

Page({
  onShareAppMessage: function (res) {
    return {
      title: 'ECharts 可以在微信小程序中使用啦！',
      path: '/pages/index/index',
      success: function () {},
      fail: function () {}
    }
  },
  data: { // mark: data
    ec1: {
      onInit: function (canvas, width, height) {
        const getPixelRatio = () => {
          let pixelRatio = 0
          wx.getSystemInfo({
            success: function (res) {
              pixelRatio = res.pixelRatio
            },
            fail: function () {
              pixelRatio = 0
            }
          })
          return pixelRatio
        }
        var dpr = getPixelRatio();
        barec1 = echarts.init(canvas, null, {
          width: width,
          height: height,
          devicePixelRatio: dpr,
        })
        canvas.setChart(barec1);
        return barec1;
      }
    },
    ec2: {
      onInit: function (canvas, width, height) {
        const getPixelRatio = () => {
          let pixelRatio = 0
          wx.getSystemInfo({
            success: function (res) {
              pixelRatio = res.pixelRatio
            },
            fail: function () {
              pixelRatio = 0
            }
          })
          return pixelRatio
        }
        var dpr = getPixelRatio();
        barec2 = echarts.init(canvas, null, {
          width: width,
          height: height,
          devicePixelRatio: dpr,
        });
        canvas.setChart(barec2);
        return barec2;
      }
    },
    ec3: {
      onInit: function (canvas, width, height) {
        const getPixelRatio = () => {
          let pixelRatio = 0
          wx.getSystemInfo({
            success: function (res) {
              pixelRatio = res.pixelRatio
            },
            fail: function () {
              pixelRatio = 0
            }
          })
          return pixelRatio
        }
        var dpr = getPixelRatio();
        barec3 = echarts.init(canvas, null, {
          width: width,
          height: height,
          devicePixelRatio: dpr,
        });
        canvas.setChart(barec3);
        return barec3;
      }
    },
    ec4: {
      onInit: function (canvas, width, height) {
        const getPixelRatio = () => {
          let pixelRatio = 0
          wx.getSystemInfo({
            success: function (res) {
              pixelRatio = res.pixelRatio
            },
            fail: function () {
              pixelRatio = 0
            }
          })
          return pixelRatio
        }
        var dpr = getPixelRatio();
        barec4 = echarts.init(canvas, null, {
          width: width,
          height: height,
          devicePixelRatio: dpr,
        });
        canvas.setChart(barec4);
        return barec4;
      }
    },
    ec5: {
      onInit: function (canvas, width, height) {
        const getPixelRatio = () => {
          let pixelRatio = 0
          wx.getSystemInfo({
            success: function (res) {
              pixelRatio = res.pixelRatio
            },
            fail: function () {
              pixelRatio = 0
            }
          })
          return pixelRatio
        }
        var dpr = getPixelRatio();
        barec5 = echarts.init(canvas, null, {
          width: width,
          height: height,
          devicePixelRatio: dpr,
        });

        canvas.setChart(barec5);
        return barec5;
      }
    },
    ec6: {
      onInit: function (canvas, width, height) {
        const getPixelRatio = () => {
          let pixelRatio = 0
          wx.getSystemInfo({
            success: function (res) {
              pixelRatio = res.pixelRatio
            },
            fail: function () {
              pixelRatio = 0
            }
          })
          return pixelRatio
        }
        var dpr = getPixelRatio();
        barec6 = echarts.init(canvas, null, {
          width: width,
          height: height,
          devicePixelRatio: dpr,
        });
        canvas.setChart(barec6);
        return barec6;
      }
    },
    ec7: {
      onInit: function (canvas, width, height) {
        const getPixelRatio = () => {
          let pixelRatio = 0
          wx.getSystemInfo({
            success: function (res) {
              pixelRatio = res.pixelRatio
            },
            fail: function () {
              pixelRatio = 0
            }
          })
          return pixelRatio
        }
        var dpr = getPixelRatio();
        barec7 = echarts.init(canvas, null, {
          width: width,
          height: height,
          devicePixelRatio: dpr,
        });
        canvas.setChart(barec7);
        return barec7;
      }
    },
    now: {
      TEMPER: '26',
      co2: '430',
      PM10: '64',
      PM2_5: '52',
      TVOC: '17',
      HUD: '54.9',
      CH2O: '2',

      TEMPERcolor: 'dian3',
      co2color: 'dian3',
      PM10color: 'dian1',
      PM2_5color: 'dian1',
      TVOCcolor: 'dian3',
      co2color: 'dian3',
      HUDcolor: 'dian3',
      cCH2Ocolor: 'dian1',

    },
    timer: '',

    client: null,
    host: "www.guideylz.cn",
    subTopic: "ESP32/40:91:51:84:94:C0/status",
    pubTopic: "ESP32/40:91:51:84:94:C0/public", //应急灯
    pubMsg: '',
    mqttOptions: {
      clientId: new Date().getTime(),
      username: "xcx_clight",
      password: "xcx_clight",
      reconnectPeriod: 0, // 1000毫秒，设置为 0 禁用自动重连，两次重新连接之间的间隔时间
      connectTimeout: 30 * 1000, // 30秒，连接超时时间
      qos: 1,
    },
    // MAC: 'ESP32_40:91:51:84:94:C0', //应急灯
    // MAC: 'ESP32_58:BF:25:39:A6:DC',
    // MAC: 'ESP32_58:BF:25:39:A7:04',
    MAC: 'ESP32_EC:62:60:FD:B5:7C',
  },

  onShareAppMessage: function () {},
  bindViewTab: function () {
    wx.navigateBack({ //返回上一页面或多级页面
      delta: 1
    })
  },

  onLoad: function (options) {

    var _this = this;
    timer: setInterval(function () {
      _this.getData()
    }, 10000);


  },

  // onReady() {
  //   setTimeout(this.getData, 200);
  //   wx.showLoading({
  //     title: '加载中...',
  //   });

  // },

  //getData方法里发送ajax
  getData() {
    const _this = this
    wx.cloud.init();
    wx.cloud.callFunction({
      name: 'mysql', //云函数名称
      data: {
        sb: 0,
      },
      success: function (res) {
        console.log(res);
        // var GroupID = [];
        var Group_TEMPER = [];
        var Group_HUD = [];
        var Group_co2 = [];
        var Group_CH2O = [];
        var Group_TVOC = [];
        var Group_PM2_5 = [];
        var Group_PM10 = [];
        // var Group_DC = [];
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

        //温度
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

        barec1.setOption({
          rederer: 'canvas',
          pixelRatio: '3',
          title: {
            text: "temperature",
            show: 'true',
            subtext: '{a' +
              (
                (Temp_time[0])[1] >= 32 ? 5 :
                (Temp_time[0])[1] >= 26 ? 4 :
                (Temp_time[0])[1] >= 20 ? 3 :
                (Temp_time[0])[1] > 0 ? 2 : 1
              ) +
              '|' + (Temp_time[0])[1] + '\t} {b|°C}',
            subtextStyle: {
              rich: {
                a1: {
                  fontSize: 28,
                  color: '#c1c1c1',
                  lineHeight: 6
                },
                a2: {
                  fontSize: 28,
                  color: '#245e9f',
                  lineHeight: 6
                },
                a3: {
                  fontSize: 28,
                  color: '#72be57',
                  lineHeight: 6
                },
                a4: {
                  fontSize: 28,
                  color: '#edac49',
                  lineHeight: 6
                },
                a5: {
                  fontSize: 28,
                  color: '#ea4012',
                  lineHeight: 6
                },
                b: {
                  fontSize: 15,
                  height: 40
                },

              }
            },
          },
          grid: {
            top: 60,
            left: 10,
            right: 10,
            bottom: '20',
          },
          xAxis: {
            data: '',
            type: 'time',
            nameTextStyle: {
              overflow: "break"
            },
            axisLine: {
              show: false
            },
            axisTick: {
              show: false,
              interval: 0
            },
            axisLabel: {
              interval: 5,
            }
          },
          yAxis: {
            type: 'value',
            show: 'false',
            axisLine: 'false',
            splitLine: {
              show: false
            },
            min: (value) => {
              let a = value.min - 10
              return a
            },
            max: (value) => {
              let a = value.max + 7
              return a
            },
            scale: true, //自适应
          },
          series: [{
            data: Temp_time,
            type: 'bar',
            barWidth: '5',
            itemStyle: {
              fontStyle: {},
              normal: {
                label: {
                  show: false, //开启显示
                  position: 'top', //在上方显示
                  textStyle: { //数值样式
                    color: 'black',
                    fontSize: 6
                  }
                },
                borderRadius: [20],
                color: function (params) {
                  //console.log(params);
                  if (params.data[1] == 0) {
                    return "#c1c1c1"; //灰
                  } else if (params.data[1] != 0 && params.data[1] < 20) {
                    return "#245e9f"; //蓝
                  } else if (params.data[1] > 20 && params.data[1] < 26) {
                    return "#72be57"; //绿
                  } else if (params.data[1] > 26 && params.data[1] < 32) {
                    return "#edac49"; //橙
                  } else if (params.data[1] > 32) {
                    return "#ea4012"; //红
                  }
                  return "#c1c1c1"; //非正常数据捕捉
                },

              },

            },
            disabled: true,
          }],
          dataZoom: [{
            type: 'inside',
            // minSpan: 600*1000*3, //30min        10min 60*10*1000
            // minSpan: 600*1000, //10min      
            minValueSpan: 600,
            maxValueSpan: 600 * 10,
            show: true,
            start: 70,
            end: 100,
          }, ],
        });

        barec1.on('click', params => {
          let demo123 = barec1.getOption()
          let tp;
          if (params.data[1] == 0) {
            tp = 1; //灰
          } else if (params.data[1] != 0 && params.data[1] < 20) {
            tp = 2; //蓝
          } else if (params.data[1] > 20 && params.data[1] < 26) {
            tp = 3; //绿
          } else if (params.data[1] > 26 && params.data[1] < 30) {
            tp = 4; //橙
          } else if (params.data[1] > 30) {
            tp = 5; //红
          }
          demo123.title[0].subtext = '{a' + tp + '|' + params.data[1] + '\t} {b|°C}'
          barec1.setOption(demo123);
        })

        //湿度
        barec2.setOption({
          title: {
            text: "humidity",
            show: 'true',
            subtext: '{a' +
              (
                (HUD_time[0])[1] >= 60 ? 4 :
                (HUD_time[0])[1] >= 40 ? 3 :
                (HUD_time[0])[1] >= 0 ? 2 : 1
              ) +
              '|' + (HUD_time[0])[1] + '\t} {b|%}',
            subtextStyle: {
              rich: {
                a1: {
                  fontSize: 28,
                  color: '#c1c1c1',
                  lineHeight: 6
                },
                a2: {
                  fontSize: 28,
                  color: '#edac49',
                  lineHeight: 6
                },
                a3: {
                  fontSize: 28,
                  color: '#72be57',
                  lineHeight: 6
                },
                a4: {
                  fontSize: 28,
                  color: '#245e9f',
                  lineHeight: 6
                },

                b: {
                  fontSize: 15,
                  height: 40
                },

              }
            },
          },
          grid: {
            top: 60,
            left: 10,
            right: 10,
            bottom: '10%',
          },
          xAxis: {
            data: '',
            type: 'time',
            nameTextStyle: {
              overflow: "break"
            },
            axisLine: {
              show: false
            },
            axisTick: {
              show: false,
              interval: 0
            },
          },
          yAxis: {
            type: 'value',
            show: 'false',
            axisLine: 'false',
            splitLine: {
              show: false
            },
            min: (value) => {
              let a = value.min - 10
              return a
            },
            max: (value) => {
              let a = value.max + 5
              return a
            },
            scale: true, //自适应
          },
          series: [{
            data: HUD_time,
            type: 'bar',
            barWidth: '5',
            itemStyle: {
              fontStyle: {},
              normal: {
                label: {
                  show: false, //开启显示
                  position: 'top', //在上方显示
                  textStyle: { //数值样式
                    color: 'black',
                    fontSize: 6
                  }
                },
                borderRadius: [20],
                color: function (params) {
                  //console.log(params);
                  if (params.data[1] == 0) {
                    return "#c1c1c1"; //灰
                  } else if (params.data[1] != 0 && params.data[1] <= 40) {
                    return "#edac49"; //蓝
                  } else if (params.data[1] > 40 && params.data[1] <= 60) {
                    return "#72be57"; //绿
                  } else if (params.data[1] > 60) {
                    return "#245e9f"; //橙
                  }
                  return "#c1c1c1"; //非正常数据捕捉
                },

              },

            },
            disabled: true,
          }],
          dataZoom: [{
            type: 'inside',
            // minSpan: 600*1000*3, //30min        10min 60*10*1000
            // minSpan: 600*1000, //10min      
            minSpan: 600,
            maxSpan: 600 * 10,
            show: true,
            start: 70,
            end: 100,
          }, ],

        })
        barec2.on('click', params => {
          let demo123 = barec2.getOption()
          let tp;
          if (params.data[1] == 0) {
            tp = 1; //灰
          } else if (params.data[1] != 0 && params.data[1] <= 40) {
            tp = 2; //蓝
          } else if (params.data[1] > 40 && params.data[1] <= 60) {
            tp = 3; //绿
          } else if (params.data[1] > 60) {
            tp = 4; //橙
          }
          demo123.title[0].subtext = '{a' + tp + '|' + params.data[1] + '\t} {b|%}'
          barec2.setOption(demo123);
        })
        //甲醛
        barec3.setOption({
          title: {
            text: "CH2O",
            show: 'true',
            subtext: '{a' +
              (
                (CH2O_time[0])[1] >= 0.1 ? 3 :
                (CH2O_time[0])[1] > 0 ? 2 : 1
              ) +
              '|' + (CH2O_time[0])[1] + '\t} {b|mg/m³}',
            subtextStyle: {
              rich: {
                a1: {
                  fontSize: 28,
                  color: '#c1c1c1',
                  lineHeight: 6
                },
                a2: {
                  fontSize: 28,
                  color: '#72be57',
                  lineHeight: 6
                },
                a3: {
                  fontSize: 28,
                  color: '#ea4012',
                  lineHeight: 6
                },
                b: {
                  fontSize: 15,
                  height: 40
                },

              }
            },
          },
          grid: {
            top: 60,
            left: 10,
            right: 10,
            bottom: '10%',
          },
          xAxis: {
            data: '',
            type: 'time',
            nameTextStyle: {
              overflow: "break"
            },
            axisLine: {
              show: false
            },
            axisTick: {
              show: false,
              interval: 0
            },
          },
          yAxis: {
            type: 'value',
            show: 'false',
            axisLine: 'false',
            splitLine: {
              show: false
            },
            min: (value) => {
              let a = 0
              return a
            },
            max: (value) => {
              let a = value.max + value.max * 0.3
              return a
            },
            scale: true, //自适应
          },
          series: [{
            data: CH2O_time,
            type: 'bar',
            barWidth: '5',
            itemStyle: {
              fontStyle: {},
              normal: {
                label: {
                  show: false, //开启显示
                  position: 'top', //在上方显示
                  textStyle: { //数值样式
                    color: 'black',
                    fontSize: 6
                  }
                },
                borderRadius: [20],
                color: function (params) {
                  //console.log(params);
                  if (params.data[1] == 0) {
                    return "#c1c1c1"; //灰
                  } else if (params.data[1] > 0 && params.data[1] < 0.1) {
                    return "#72be57"; //绿
                  } else if (params.data[1] > 0.1) {
                    return "#ea4012"; //红
                  }
                  return "#c1c1c1"; //非正常数据捕捉
                },

              },

            },
            disabled: true,
          }],
          dataZoom: [{
            type: 'inside',
            // minSpan: 600*1000*3, //30min        10min 60*10*1000
            // minSpan: 600*1000, //10min      
            minSpan: 600,
            maxSpan: 600 * 10,
            show: true,
            start: 70,
            end: 100,
          }, ],

        })
        barec3.on('click', params => {
          let demo123 = barec3.getOption()
          let tp;
          if (params.data[1] == 0) {
            tp = 1; //灰
          } else if (params.data[1] != 0 && params.data[1] < 20) {
            tp = 2; //蓝
          } else if (params.data[1] > 20 && params.data[1] < 26) {
            tp = 3; //绿
          } else if (params.data[1] > 26 && params.data[1] < 30) {
            tp = 4; //橙
          } else if (params.data[1] > 30) {
            tp = 5; //红
          }
          demo123.title[0].subtext = '{a' + tp + '|' + params.data[1] + '\t} {b|mg/m³}'
          barec3.setOption(demo123);
        })
        //co2
        barec4.setOption({
          title: {
            text: "CO2",
            show: 'true',
            subtext: '{a' +
              (
                (CO2_time[0])[1] >= 400 ? 3 :
                (CO2_time[0])[1] > 0 ? 2 : 1
              ) +
              '|' + (CO2_time[0])[1] + '\t} {b|ppm}',
            subtextStyle: {
              rich: {
                a1: {
                  fontSize: 28,
                  color: '#c1c1c1',
                  lineHeight: 6
                },
                a2: {
                  fontSize: 28,
                  color: '#245e9f',
                  lineHeight: 6
                },
                a3: {
                  fontSize: 28,
                  color: '#ea4012',
                  lineHeight: 6
                },

                b: {
                  fontSize: 15,
                  height: 40
                },

              }
            },
          },
          grid: {
            top: 60,
            left: 10,
            right: 10,
            bottom: '10%',
          },
          xAxis: {
            data: '',
            type: 'time',
            nameTextStyle: {
              overflow: "break"
            },
            axisLine: {
              show: false
            },
            axisTick: {
              show: false,
              interval: 0
            },
          },
          yAxis: {
            type: 'value',
            show: 'false',
            axisLine: 'false',
            splitLine: {
              show: false
            },
            min: (value) => {
              let a = 0
              return a
            },
            max: (value) => {
              let a = value.max + 150
              return a
            },
            scale: true, //自适应
          },
          series: [{
            data: CO2_time,
            type: 'bar',
            barWidth: '5',
            itemStyle: {
              fontStyle: {},
              normal: {
                label: {
                  show: false, //开启显示
                  position: 'top', //在上方显示
                  textStyle: { //数值样式
                    color: 'black',
                    fontSize: 6
                  }
                },
                borderRadius: [20],
                color: function (params) {
                  //console.log(params);
                  if (params.data[1] == 0) {
                    return "#c1c1c1"; //灰
                  } else if (params.data[1] != 0 && params.data[1] < 20) {
                    return "#245e9f"; //蓝
                  } else if (params.data[1] > 20 && params.data[1] < 26) {
                    return "#72be57"; //绿
                  } else if (params.data[1] > 26 && params.data[1] < 30) {
                    return "#edac49"; //橙
                  } else if (params.data[1] > 30) {
                    return "#ea4012"; //红
                  }
                  return "#c1c1c1"; //非正常数据捕捉
                },

              },

            },
            disabled: true,
          }],
          dataZoom: [{
            type: 'inside',
            // minSpan: 600*1000*3, //30min        10min 60*10*1000
            // minSpan: 600*1000, //10min      
            minSpan: 600,
            maxSpan: 600 * 10,
            show: true,
            start: 70,
            end: 100,
          }, ],

        })
        barec4.on('click', params => {
          let demo123 = barec4.getOption()
          let tp;
          if (params.data[1] == 0) {
            tp = 1; //灰
          } else if (params.data[1] > 0 && params.data[1] < 400) {
            tp = 3; //绿
          } else if (params.data[1] > 400) {
            tp = 5; //红
          }
          demo123.title[0].subtext = '{a' + tp + '|' + params.data[1] + '\t} {b|ppm}'
          barec4.setOption(demo123);
        })

        //TVOC
        barec5.setOption({
          title: {
            text: "TVOC",
            show: 'true',
            subtext: '{a' +
              (
                (TVOC_time[0])[1] >= 30 ? 5 :
                (TVOC_time[0])[1] >= 26 ? 4 :
                (TVOC_time[0])[1] >= 20 ? 3 :
                (TVOC_time[0])[1] > 0 ? 2 : 1
              ) +
              '|' + (TVOC_time[0])[1] + '\t} {b|ug/m³}',
            subtextStyle: {
              rich: {
                a1: {
                  fontSize: 28,
                  color: '#c1c1c1',
                  lineHeight: 6
                },
                a2: {
                  fontSize: 28,
                  color: '#245e9f',
                  lineHeight: 6
                },
                a3: {
                  fontSize: 28,
                  color: '#ea4012',
                  lineHeight: 6
                },
                a4: {
                  fontSize: 28,
                  color: '#edac49',
                  lineHeight: 6
                },
                a5: {
                  fontSize: 28,
                  color: '#ea4012',
                  lineHeight: 6
                },
                b: {
                  fontSize: 15,
                  height: 40
                },

              }
            },
          },
          grid: {
            top: 60,
            left: 10,
            right: 10,
            bottom: '10%',
          },
          xAxis: {
            data: '',
            type: 'time',
            nameTextStyle: {
              overflow: "break"
            },
            axisLine: {
              show: false
            },
            axisTick: {
              show: false,
              interval: 0
            },
          },
          yAxis: {
            type: 'value',
            show: 'false',
            axisLine: 'false',
            splitLine: {
              show: false
            },
            min: (value) => {
              let a = value.min - value.min * 0.5
              return a
            },
            max: (value) => {
              let a = value.max + 150
              return a
            },
            scale: true, //自适应
          },
          series: [{
            data: TVOC_time,
            type: 'bar',
            barWidth: '5',
            itemStyle: {
              fontStyle: {},
              normal: {
                label: {
                  show: false, //开启显示
                  position: 'top', //在上方显示
                  textStyle: { //数值样式
                    color: 'black',
                    fontSize: 6
                  }
                },
                borderRadius: [20],
                color: function (params) {
                  //console.log(params);
                  if (params.data[1] == 0) {
                    return "#c1c1c1"; //灰
                  } else if (params.data[1] != 0 && params.data[1] < 20) {
                    return "#245e9f"; //蓝
                  } else if (params.data[1] > 20 && params.data[1] < 26) {
                    return "#72be57"; //绿
                  } else if (params.data[1] > 26 && params.data[1] < 30) {
                    return "#edac49"; //橙
                  } else if (params.data[1] > 30) {
                    return "#ea4012"; //红
                  }
                  return "#c1c1c1"; //非正常数据捕捉
                },

              },

            },
            disabled: true,
          }],
          dataZoom: [{
            type: 'inside',
            // minSpan: 600*1000*3, //30min        10min 60*10*1000
            // minSpan: 600*1000, //10min      
            minSpan: 600,
            maxSpan: 600 * 10,
            show: true,
            start: 70,
            end: 100,
          }, ],

        })
        barec5.on('click', params => {
          let demo123 = barec5.getOption()
          let tp;
          if (params.data[1] == 0) {
            tp = 1; //灰
          } else if (params.data[1] != 0 && params.data[1] < 20) {
            tp = 2; //蓝
          } else if (params.data[1] > 20 && params.data[1] < 26) {
            tp = 3; //绿
          } else if (params.data[1] > 26 && params.data[1] < 30) {
            tp = 4; //橙
          } else if (params.data[1] >= 30) {
            tp = 5; //红
          }
          demo123.title[0].subtext = '{a' + tp + '|' + params.data[1] + '\t} {b|ug/m³}'
          barec5.setOption(demo123);
        })

        //pm25
        barec6.setOption({
          title: {
            text: "PM2_5",
            show: 'true',
            subtext: '{a' +
              (
                (PM25_time[0])[1] >= 115 ? 5 :
                (PM25_time[0])[1] >= 75 ? 4 :
                (PM25_time[0])[1] >= 35 ? 3 :
                (PM25_time[0])[1] > 0 ? 2 : 1
              ) +
              '|' + (PM25_time[0])[1] + '\t} {b|μg/m³ }',
            subtextStyle: {
              rich: {
                a1: {
                  fontSize: 28,
                  color: '#c1c1c1',
                  lineHeight: 6
                },
                a2: {
                  fontSize: 28,
                  color: '#245e9f',
                  lineHeight: 6
                },
                a3: {
                  fontSize: 28,
                  color: '#72be57',
                  lineHeight: 6
                },
                a4: {
                  fontSize: 28,
                  color: '#edac49',
                  lineHeight: 6
                },
                a5: {
                  fontSize: 28,
                  color: '#ea4012',
                  lineHeight: 6
                },
                b: {
                  fontSize: 15,
                  height: 40
                },

              }
            },
          },
          grid: {
            top: 60,
            left: 10,
            right: 10,
            bottom: '10%',
          },
          xAxis: {
            data: '',
            type: 'time',
            nameTextStyle: {
              overflow: "break"
            },
            axisLine: {
              show: false
            },
            axisTick: {
              show: false,
              interval: 0
            },
          },
          yAxis: {
            type: 'value',
            show: 'false',
            axisLine: 'false',
            splitLine: {
              show: false
            },
            min: (value) => {
              let a = 0
              return a
            },
            max: (value) => {
              let a = value.max + 20
              return a
            },
            scale: true, //自适应
          },
          series: [{
            data: PM25_time,
            type: 'bar',
            barWidth: '5',
            itemStyle: {
              fontStyle: {},
              normal: {
                label: {
                  show: false, //开启显示
                  position: 'top', //在上方显示
                  textStyle: { //数值样式
                    color: 'black',
                    fontSize: 6
                  }
                },
                borderRadius: [20],
                color: function (params) {
                  //console.log(params);
                  if (params.data[1] == 0) {
                    return "#c1c1c1"; //灰
                  } else if (params.data[1] != 0 && params.data[1] < 35) {
                    return "#245e9f"; //蓝
                  } else if (params.data[1] > 35 && params.data[1] < 75) {
                    return "#72be57"; //绿
                  } else if (params.data[1] > 75 && params.data[1] < 115) {
                    return "#edac49"; //橙
                  } else if (params.data[1] > 115) {
                    return "#ea4012"; //红
                  }
                  return "#c1c1c1"; //非正常数据捕捉
                },

              },

            },
            disabled: true,
          }],
          dataZoom: [{
            type: 'inside',
            // minSpan: 600*1000*3, //30min        10min 60*10*1000
            // minSpan: 600*1000, //10min      
            minSpan: 600,
            maxSpan: 600 * 10,
            show: true,
            start: 70,
            end: 100,
          }, ],

        })
        barec6.on('click', params => {
          let demo123 = barec6.getOption()
          let tp;
          if (params.data[1] == 0) {
            tp = 1; //灰
          } else if (params.data[1] != 0 && params.data[1] < 35) {
            tp = 3; //蓝
          } else if (params.data[1] > 35 && params.data[1] < 75) {
            tp = 3; //绿
          } else if (params.data[1] > 75 && params.data[1] < 115) {
            tp = 4; //橙
          } else if (params.data[1] > 115) {
            tp = 5; //红
          }
          demo123.title[0].subtext = '{a' + tp + '|' + params.data[1] + '\t} {b|μg/m³ }'
          barec6.setOption(demo123);
        })

        //pm10
        barec7.setOption({
          title: {
            text: "PM10",
            show: 'true',
            subtext: '{a' +
              (
                (PM10_time[0])[1] >= 0.15 ? 3 :
                (PM10_time[0])[1] > 0 ? 2 : 1
              ) +
              '|' + (PM10_time[0])[1] + '\t} {b|ug/m³ }',
            subtextStyle: {
              rich: {
                a1: {
                  fontSize: 28,
                  color: '#c1c1c1',
                  lineHeight: 6
                },
                a2: {
                  fontSize: 28,
                  color: '#245e9f',
                  lineHeight: 6
                },
                a3: {
                  fontSize: 28,
                  color: '#ea4012',
                  lineHeight: 6
                },
                b: {
                  fontSize: 15,
                  height: 40
                },

              }
            },
          },
          grid: {
            top: 60,
            left: 10,
            right: 10,
            bottom: '10%',
          },
          xAxis: {
            data: '',
            type: 'time',
            nameTextStyle: {
              overflow: "break"
            },
            axisLine: {
              show: false
            },
            axisTick: {
              show: false,
              interval: 0
            },
          },
          yAxis: {
            type: 'value',
            show: 'false',
            axisLine: 'false',
            splitLine: {
              show: false
            },
            min: (value) => {
              let a = value.min - 10
              return a
            },
            max: (value) => {
              let a = value.max + 15
              return a
            },
            scale: true, //自适应
          },
          series: [{
            data: PM10_time,
            type: 'bar',
            barWidth: '5',
            itemStyle: {
              fontStyle: {},
              normal: {
                label: {
                  show: false, //开启显示
                  position: 'top', //在上方显示
                  textStyle: { //数值样式
                    color: 'black',
                    fontSize: 6
                  }
                },
                borderRadius: [20],
                color: function (params) {
                  //console.log(params);
                  if (params.data[1] == 0) {
                    return "#c1c1c1"; //灰
                  } else if (params.data[1] != 0 && params.data[1] < 20) {
                    return "#245e9f"; //蓝
                  } else if (params.data[1] > 20 && params.data[1] < 26) {
                    return "#72be57"; //绿
                  } else if (params.data[1] > 26 && params.data[1] < 30) {
                    return "#edac49"; //橙
                  } else if (params.data[1] > 30) {
                    return "#ea4012"; //红
                  }
                  return "#c1c1c1"; //非正常数据捕捉
                },

              },

            },
            disabled: true,
          }],
          dataZoom: [{
            type: 'inside',
            // minSpan: 600*1000*3, //30min        10min 60*10*1000
            // minSpan: 600*1000, //10min      
            minSpan: 600,
            maxSpan: 600 * 10,
            show: true,
            start: 70,
            end: 100,
          }, ],

        })
        barec7.on('click', params => {
          let demo123 = barec7.getOption()
          let tp;
          if (params.data[1] == 0) {
            tp = 1; //灰
          } else if (params.data[1] != 0 && params.data[1] < 20) {
            tp = 2; //蓝
          } else if (params.data[1] > 20 && params.data[1] < 26) {
            tp = 3; //绿
          } else if (params.data[1] > 26 && params.data[1] < 30) {
            tp = 4; //橙
          } else if (params.data[1] > 30) {
            tp = 5; //红
          }
          demo123.title[0].subtext = '{a' + tp + '|' + params.data[1] + '\t} {b|ug/m³}'
          barec7.setOption(demo123);
        })

        wx.hideLoading();
      },
      fail: function (res) {},
      complete: function (res) {},
    })
  },


  light(e) {
    var status = e.detail.value
    console.log(this.data.client);
    try {

      this.data.client = mqtt.connect(`wxs://${this.data.host}:8084/mqtt`, {
        ...this.data.mqttOptions,
      });
      this.data.client.on("connect", () => {
        console.log("连接成功")

        if (this.data.client) {
          // this.data.client.publish(this.data.pubTopic, this.data.pubMsg)
          // 做判断
          let Msg
          if (status == true) {
            Msg = '{"' + this.data.MAC + '":{"XDD":"101"}}'
            console.log("开灯")
            //向后台发送请求
          } else {
            Msg = '{"' + this.data.MAC + '":{"XDD":"1"}}'
            console.log("关灯")
          }
          this.data.client.publish(this.data.pubTopic, Msg)
          console.log("发布成功：" + Msg);

        } else {
          console.log("未连接");
        }

      }, );
    } catch (error) {
      console.log("mqtt.connect error", error);
    }
    // this.data.client.end();
    // this.data.client = null;
    // console.log('已断开');
    return

  },

  slider4change(e) {
    var status = e.detail.value
    try {
      this.data.client = mqtt.connect(`wxs://${this.data.host}:8084/mqtt`, {
        ...this.data.mqttOptions,
      });
      this.data.client.on("connect", () => {
        console.log("连接成功")
      });
      if (this.data.client) {
        let Msg
        Msg = '{"' + this.data.MAC + '":{"XDD":"' + status + '"}}'
        this.data.client.publish(this.data.pubTopic, Msg)
        console.log("发布成功：" + Msg);
      } else {
        console.log("未连接");
      }
      // this.data.client.end();
      // this.data.client = null;
      // console.log('已断开');
      return
    } catch (error) {
      console.log("mqtt.connect error", error);
    }


  },

});