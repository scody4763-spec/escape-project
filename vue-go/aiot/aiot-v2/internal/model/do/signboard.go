// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package do

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// Signboard is the golang structure of table signboard for DAO operations like Where/Data.
type Signboard struct {
	g.Meta            `orm:"table:signboard, do:true"`
	Id                any         //
	MacAddress        any         //
	DisplayLeft       any         // 0-motifs 1-Left 2-Right 3- Down 4-Up 5-left 6-right 7-down 8-up 9-style
	DisplayMid        any         // 0-motifs 1-Left 2-Right 3- Down 4-Up 5-left 6-right 7-down 8-up 9-style
	DisplayRight      any         // 0-motifs 1-Left 2-Right 3- Down 4-Up 5-left 6-right 7-down 8-up 9-style
	RgbLeft           any         //
	RgbMid            any         //
	RgbRight          any         //
	Led               any         // 亮度 1-1024
	Buzzer            any         // 蜂鸣器 1-关 2-开
	Flame             any         // 火焰检测？ 1-True触发警报 2-False停止
	ElectricitySwitch any         // 电流检测开关 1-ON 2-OFF
	Address           any         //
	Remark            any         //
	CreateTime        *gtime.Time //
	UpdateTime        *gtime.Time //
}
