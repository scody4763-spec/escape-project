// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// Signboard is the golang structure for table signboard.
type Signboard struct {
	Id                int64       `json:"id"                orm:"id"                 description:""`                                                                        //
	MacAddress        string      `json:"macAddress"        orm:"mac_address"        description:""`                                                                        //
	DisplayLeft       int         `json:"displayLeft"       orm:"display_left"       description:"0-motifs 1-Left 2-Right 3- Down 4-Up 5-left 6-right 7-down 8-up 9-style"` // 0-motifs 1-Left 2-Right 3- Down 4-Up 5-left 6-right 7-down 8-up 9-style
	DisplayMid        int         `json:"displayMid"        orm:"display_mid"        description:"0-motifs 1-Left 2-Right 3- Down 4-Up 5-left 6-right 7-down 8-up 9-style"` // 0-motifs 1-Left 2-Right 3- Down 4-Up 5-left 6-right 7-down 8-up 9-style
	DisplayRight      int         `json:"displayRight"      orm:"display_right"      description:"0-motifs 1-Left 2-Right 3- Down 4-Up 5-left 6-right 7-down 8-up 9-style"` // 0-motifs 1-Left 2-Right 3- Down 4-Up 5-left 6-right 7-down 8-up 9-style
	RgbLeft           string      `json:"rgbLeft"           orm:"rgb_left"           description:""`                                                                        //
	RgbMid            string      `json:"rgbMid"            orm:"rgb_mid"            description:""`                                                                        //
	RgbRight          string      `json:"rgbRight"          orm:"rgb_right"          description:""`                                                                        //
	Led               int         `json:"led"               orm:"led"                description:"亮度 1-1024"`                                                               // 亮度 1-1024
	Buzzer            int         `json:"buzzer"            orm:"buzzer"             description:"蜂鸣器 1-关 2-开"`                                                             // 蜂鸣器 1-关 2-开
	Flame             int         `json:"flame"             orm:"flame"              description:"火焰检测？ 1-True触发警报 2-False停止"`                                              // 火焰检测？ 1-True触发警报 2-False停止
	ElectricitySwitch int         `json:"electricitySwitch" orm:"electricity_switch" description:"电流检测开关 1-ON 2-OFF"`                                                       // 电流检测开关 1-ON 2-OFF
	Address           string      `json:"address"           orm:"address"            description:""`                                                                        //
	Remark            string      `json:"remark"            orm:"remark"             description:""`                                                                        //
	CreateTime        *gtime.Time `json:"createTime"        orm:"create_time"        description:""`                                                                        //
	UpdateTime        *gtime.Time `json:"updateTime"        orm:"update_time"        description:""`                                                                        //
}
