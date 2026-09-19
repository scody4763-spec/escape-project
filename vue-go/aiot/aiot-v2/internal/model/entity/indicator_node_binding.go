package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

// IndicatorNodeBinding is the golang structure for table indicator_node_binding.
type IndicatorNodeBinding struct {
	Id         int64       `json:"id"         orm:"id"          description:""`
	MacAddress string      `json:"macAddress" orm:"mac_address" description:"指示灯MAC地址"`
	NodeKey    string      `json:"nodeKey"    orm:"node_key"    description:"绑定的图节点key"`
	FloorId    int         `json:"floorId"    orm:"floor_id"    description:"所在楼层"`
	X          float64     `json:"x"          orm:"x"           description:"X坐标"`
	Y          float64     `json:"y"          orm:"y"           description:"Y坐标"`
	Z          float64     `json:"z"          orm:"z"           description:"Z坐标"`
	Status     int         `json:"status"     orm:"status"      description:"0-禁用 1-启用"`
	CreateTime *gtime.Time `json:"createTime" orm:"create_time" description:""`
	UpdateTime *gtime.Time `json:"updateTime" orm:"update_time" description:""`
}
