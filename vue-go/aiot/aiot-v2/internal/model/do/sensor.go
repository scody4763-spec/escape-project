// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package do

import (
	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/os/gtime"
)

// Sensor is the golang structure of table sensor for DAO operations like Where/Data.
type Sensor struct {
	g.Meta     `orm:"table:sensor, do:true"`
	Id         any         //
	MacAddress any         //
	Address    any         //
	BoardId    any         //
	Img        any         //
	Status     any         // 0-禁用 1-启用
	CreateTime *gtime.Time //
	UpdateTime *gtime.Time //
}
