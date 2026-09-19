// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// Board is the golang structure for table board.
type Board struct {
	Id         int         `json:"id"         orm:"id"          description:""`          //
	Name       string      `json:"name"       orm:"name"        description:""`          //
	Status     int         `json:"status"     orm:"status"      description:"0-禁用 1-启用"` // 0-禁用 1-启用
	CreateTime *gtime.Time `json:"createTime" orm:"create_time" description:""`          //
	UpdateTime *gtime.Time `json:"updateTime" orm:"update_time" description:""`          //
}
