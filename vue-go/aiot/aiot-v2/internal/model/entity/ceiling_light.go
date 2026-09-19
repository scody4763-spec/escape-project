package entity

import (
	"github.com/gogf/gf/v2/os/gtime"
)

type CeilingLight struct {
	Id         int64       `json:"id"          orm:"id"           description:"主键ID"`
	DeviceId   string      `json:"deviceId"    orm:"device_id"    description:"设备唯一标识"`
	MacAddress string      `json:"macAddress"  orm:"mac_address"  description:"MAC地址"`
	FloorId    int         `json:"floorId"     orm:"floor_id"     description:"楼层ID"`
	Zone       string      `json:"zone"        orm:"zone"         description:"区域（A/B/C等）"`
	Address    string      `json:"address"     orm:"address"      description:"位置地址"`
	Status     int         `json:"status"      orm:"status"       description:"状态 0-禁用 1-启用"`
	OnlineStatus int       `json:"onlineStatus"orm:"-"            description:"在线状态 0-离线 1-在线"`
	CreateTime *gtime.Time `json:"createTime"  orm:"create_time"  description:"创建时间"`
	UpdateTime *gtime.Time `json:"updateTime"  orm:"update_time"  description:"更新时间"`
}