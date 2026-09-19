// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// NotificationLog is the golang structure for table notification_log.
type NotificationLog struct {
	Id         int64       `json:"id"         orm:"id"          description:""`                    //
	AlertId    int64       `json:"alertId"    orm:"alert_id"    description:"关联的 device_alert.id"` // 关联的 device_alert.id
	Location   string      `json:"location"   orm:"location"    description:"火灾发生地点"`              // 火灾发生地点
	EventDesc  string      `json:"eventDesc"  orm:"event_desc"  description:"事件描述，如：检测到火焰，温度异常"`   // 事件描述，如：检测到火焰，温度异常
	FromEmail  string      `json:"fromEmail"  orm:"from_email"  description:"发件方邮箱"`               // 发件方邮箱
	ToEmail    string      `json:"toEmail"    orm:"to_email"    description:"收件方邮箱"`               // 收件方邮箱
	SendStatus int         `json:"sendStatus" orm:"send_status" description:"发送状态：1-发送成功 2-发送失败"`  // 发送状态：1-发送成功 2-发送失败
	FailReason string      `json:"failReason" orm:"fail_reason" description:"失败原因"`                // 失败原因
	SendTime   *gtime.Time `json:"sendTime"   orm:"send_time"   description:"实际发送时间"`              // 实际发送时间
	CreateTime *gtime.Time `json:"createTime" orm:"create_time" description:""`                    //
	UpdateTime *gtime.Time `json:"updateTime" orm:"update_time" description:""`                    //
}
