// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// DeviceAlert is the golang structure for table device_alert.
type DeviceAlert struct {
	Id         int64       `json:"id"         orm:"id"          description:""`                             //
	DeviceType int         `json:"deviceType" orm:"device_type" description:"设备类型：1-sensor 2-signboard"`    // 设备类型：1-sensor 2-signboard
	DeviceId   int64       `json:"deviceId"   orm:"device_id"   description:"对应设备的 id"`                     // 对应设备的 id
	MacAddress string      `json:"macAddress" orm:"mac_address" description:"设备 MAC 地址"`                    // 设备 MAC 地址
	AlertType  int         `json:"alertType"  orm:"alert_type"  description:"异常类型：1-离线 2-火焰报警 3-电流异常 4-其他"` // 异常类型：1-离线 2-火焰报警 3-电流异常 4-其他
	AlertDesc  string      `json:"alertDesc"  orm:"alert_desc"  description:"异常描述"`                         // 异常描述
	Status     int         `json:"status"     orm:"status"      description:"处理状态：0-未处理 1-已处理 2-已忽略"`       // 处理状态：0-未处理 1-已处理 2-已忽略
	ResolvedAt *gtime.Time `json:"resolvedAt" orm:"resolved_at" description:"处理时间"`                         // 处理时间
	CreateTime *gtime.Time `json:"createTime" orm:"create_time" description:"异常发生时间"`                       // 异常发生时间
	UpdateTime *gtime.Time `json:"updateTime" orm:"update_time" description:""`                             //
}
