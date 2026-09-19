// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package do

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// Board is the golang structure of table board for DAO operations like Where/Data.
type Board struct {
	g.Meta     `orm:"table:board, do:true"`
	Id         any         //
	Name       any         //
	Status     any         // 0-禁用 1-启用
	CreateTime *gtime.Time //
	UpdateTime *gtime.Time //
}
