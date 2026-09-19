// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package do

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// NotificationLog is the golang structure of table notification_log for DAO operations like Where/Data.
type NotificationLog struct {
	g.Meta     `orm:"table:notification_log, do:true"`
	Id         any         //
	AlertId    any         // 关联的 device_alert.id
	Location   any         // 火灾发生地点
	EventDesc  any         // 事件描述，如：检测到火焰，温度异常
	FromEmail  any         // 发件方邮箱
	ToEmail    any         // 收件方邮箱
	SendStatus any         // 发送状态：1-发送成功 2-发送失败
	FailReason any         // 失败原因
	SendTime   *gtime.Time // 实际发送时间
	CreateTime *gtime.Time //
	UpdateTime *gtime.Time //
}
