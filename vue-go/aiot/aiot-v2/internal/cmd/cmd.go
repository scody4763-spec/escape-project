package cmd

import (
	"context"

	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/net/ghttp"
	"github.com/gogf/gf/v2/os/gcmd"
	influxdb2 "github.com/influxdata/influxdb-client-go/v2"

	adminCtrl "aiot/internal/controller/admin"
	boardCtrl "aiot/internal/controller/board"
	ceilingLightCtrl "aiot/internal/controller/ceiling_light"
	deviceCtrl "aiot/internal/controller/device"
	deviceAlertCtrl "aiot/internal/controller/device_alert"
	escapeCtrl "aiot/internal/controller/escape"
	notificationCtrl "aiot/internal/controller/notification"
	reportCtrl "aiot/internal/controller/report"
	sensorCtrl "aiot/internal/controller/sensor"
	signboardCtrl "aiot/internal/controller/signboard"
	wsCtrl "aiot/internal/controller/ws"
	"aiot/internal/global"
	mqttLogic "aiot/internal/logic/mqtt"
	"aiot/internal/middleware"
)

var (
	Main = gcmd.Command{
		Name:  "main",
		Usage: "main",
		Brief: "start http server",
		Func: func(ctx context.Context, parser *gcmd.Parser) (err error) {
			// 初始化全局 InfluxDB v2 客户端
			if err = initInfluxDB(ctx); err != nil {
				g.Log().Warningf(ctx, "InfluxDB init warning: %v", err)
			}

			// 启动 MQTT 消费者
			if err = mqttLogic.Start(ctx); err != nil {
				g.Log().Warningf(ctx, "MQTT start warning: %v", err)
			}

			// 启动设备状态轮询
			//device_status.StartPoller(ctx)

			s := g.Server()

			// 公开路由（无需 JWT 认证）
			s.Group("/", func(group *ghttp.RouterGroup) {
				group.Middleware(ghttp.MiddlewareHandlerResponse)
				group.Bind(adminCtrl.NewPublicV1(), escapeCtrl.NewV1())
			})

			// 受保护路由（需要 JWT 认证）
			s.Group("/", func(group *ghttp.RouterGroup) {
				group.Middleware(ghttp.MiddlewareHandlerResponse)
				group.Middleware(middleware.Auth)
				group.Bind(
					adminCtrl.NewV1(),
					boardCtrl.NewV1(),
					ceilingLightCtrl.NewV1(),
					deviceCtrl.NewV1(),
					sensorCtrl.NewV1(),
					signboardCtrl.NewV1(),
					deviceAlertCtrl.NewV1(),
					notificationCtrl.NewV1(),
					reportCtrl.NewV1(),
				)
			})

			// WebSocket 端点（无响应中间件，JWT 在内部处理）
			s.BindHandler("GET:/api/ws/device-data", wsCtrl.HandleWs)

			s.Run()
			return nil
		},
	}
)

// initInfluxDB 初始化全局 InfluxDB v2 客户端。
func initInfluxDB(ctx context.Context) error {
	url := g.Cfg().MustGet(ctx, "influxdb.url").String()
	token := g.Cfg().MustGet(ctx, "influxdb.token").String()
	org := g.Cfg().MustGet(ctx, "influxdb.org").String()
	bucket := g.Cfg().MustGet(ctx, "influxdb.bucket").String()

	// 使用 token 认证创建 v2 客户端
	client := influxdb2.NewClient(url, token)

	// 保存 org 和 bucket 供写入/查询使用
	global.InfluxDB = client
	global.InfluxDBOrg = org
	global.InfluxDBBucket = bucket

	g.Log().Infof(ctx, "InfluxDB v2 客户端初始化完成，url=%s, org=%s, bucket=%s", url, org, bucket)
	return nil
}
