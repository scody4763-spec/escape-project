// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package do

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// DeviceAlert is the golang structure of table device_alert for DAO operations like Where/Data.
type DeviceAlert struct {
	g.Meta     `orm:"table:device_alert, do:true"`
	Id         any         //
	DeviceType any         // 设备类型：1-sensor 2-signboard
	DeviceId   any         // 对应设备的 id
	MacAddress any         // 设备 MAC 地址
	AlertType  any         // 异常类型：1-离线 2-火焰报警 3-电流异常 4-其他
	AlertDesc  any         // 异常描述
	Status     any         // 处理状态：0-未处理 1-已处理 2-已忽略
	ResolvedAt *gtime.Time // 处理时间
	CreateTime *gtime.Time // 异常发生时间
	UpdateTime *gtime.Time //
}
