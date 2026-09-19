// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// Sensor is the golang structure for table sensor.
type Sensor struct {
	Id         int64       `json:"id"         orm:"id"          description:""`          //
	MacAddress string      `json:"macAddress" orm:"mac_address" description:""`          //
	Address    string      `json:"address"    orm:"address"     description:""`          //
	BoardId    int         `json:"boardId"    orm:"board_id"    description:""`          //
	Img        string      `json:"img"        orm:"img"         description:""`          //
	Status     int         `json:"status"     orm:"status"      description:"0-禁用 1-启用"` // 0-禁用 1-启用
	CreateTime *gtime.Time `json:"createTime" orm:"create_time" description:""`          //
	UpdateTime *gtime.Time `json:"updateTime" orm:"update_time" description:""`          //
}
