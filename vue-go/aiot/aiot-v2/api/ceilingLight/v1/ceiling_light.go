package v1

import (
	"reflect"

	"github.com/gogf/gf/v2/frame/g"
)

// CeilingLightListReq 吸顶灯列表请求
type CeilingLightListReq struct {
	g.Meta     `path:"/api/ceiling_lights" method:"get" tags:"CeilingLight" summary:"获取吸顶灯列表"`
	DeviceId   string `json:"deviceId" in:"query" description:"设备ID"`
	MacAddress string `json:"macAddress" in:"query" description:"MAC地址"`
	Search     string `json:"search" in:"query" description:"搜索关键词"`
	Page       int    `json:"page" in:"query" d:"1" description:"页码"`
	Size       int    `json:"size" in:"query" d:"10" description:"每页数量"`
}

// CeilingLightListRes 吸顶灯列表响应
type CeilingLightListRes struct {
	List  interface{} `json:"list" description:"吸顶灯列表"`
	Total int64       `json:"total" description:"总数"`
}

// CeilingLightGetReq 获取单个吸顶灯详情请求
type CeilingLightGetReq struct {
	g.Meta `path:"/api/ceiling_lights/{id}" method:"get" tags:"CeilingLight" summary:"获取吸顶灯详情"`
	Id     uint `json:"id" in:"path" description:"吸顶灯ID"`
}

// CeilingLightGetRes 吸顶灯详情响应
type CeilingLightGetRes struct {
	*CeilingLightItem
}

// CeilingLightItem 吸顶灯信息项
type CeilingLightItem struct {
	Id         uint   `json:"id"`
	DeviceId   string `json:"deviceId"`
	MacAddress string `json:"macAddress"`
	Address    string `json:"address"`
	FloorId    string `json:"floorId"`
	Zone       string `json:"zone"`
	Status     string `json:"status"`
	CreatedAt  string `json:"createdAt"`
	UpdatedAt  string `json:"updatedAt"`
}

// CeilingLightCreateReq 创建吸顶灯请求
type CeilingLightCreateReq struct {
	g.Meta     `path:"/api/ceiling_lights" method:"post" tags:"CeilingLight" summary:"创建吸顶灯"`
	DeviceId   string `json:"deviceId" v:"required#请填写设备ID" description:"设备ID（唯一）"`
	MacAddress string `json:"macAddress" v:"required#请填写MAC地址" description:"MAC地址"`
	Address    string `json:"address" d:"" description:"安装位置"`
	FloorId    string `json:"floorId" d:"1F" description:"楼层ID"`
	Zone       string `json:"zone" d:"A区" description:"区域"`
	Status     string `json:"status" d:"online" description:"状态: online/offline"`
}

// CeilingLightCreateRes 创建吸顶灯响应
type CeilingLightCreateRes struct {
	Id uint `json:"id" description:"新建的吸顶灯ID"`
}

// CeilingLightUpdateReq 更新吸顶灯请求
type CeilingLightUpdateReq struct {
	g.Meta     `path:"/api/ceiling_lights/{id}" method:"put" tags:"CeilingLight" summary:"更新吸顶灯"`
	Id         uint   `json:"id" in:"path" v:"required#缺少ID参数" description:"吸顶灯ID"`
	DeviceId   string `json:"deviceId" description:"设备ID"`
	MacAddress string `json:"macAddress" description:"MAC地址"`
	Address    string `json:"address" description:"安装位置"`
	FloorId    string `json:"floorId" description:"楼层ID"`
	Zone       string `json:"zone" description:"区域"`
	Status     string `json:"status" description:"状态"`
}

// CeilingLightUpdateRes 更新吸顶灯响应
type CeilingLightUpdateRes struct{}

// CeilingLightDeleteReq 删除吸顶灯请求
type CeilingLightDeleteReq struct {
	g.Meta `path:"/api/ceiling_lights/{id}" method:"delete" tags:"CeilingLight" summary:"删除吸顶灯"`
	Id     uint `json:"id" in:"path" v:"required#缺少ID参数" description:"吸顶灯ID"`
}

// CeilingLightDeleteRes 删除吸顶灯响应
type CeilingLightDeleteRes struct{}

// CeilingLightStatusReq 获取吸顶灯状态请求
type CeilingLightStatusReq struct {
	g.Meta `path:"/api/ceiling_lights/status" method:"get" tags:"CeilingLight" summary:"获取所有吸顶灯在线状态"`
}

// CeilingLightStatusRes 吸顶灯状态响应
type CeilingLightStatusRes struct {
	Total   int                      `json:"total" description:"总数"`
	Online  int                      `json:"online" description:"在线数量"`
	Offline int                      `json:"offline" description="离线数量"`
	Devices []CeilingLightStatusItem `json:"devices" description:"设备状态列表"`
}

// CeilingLightStatusItem 单个设备状态
type CeilingLightStatusItem struct {
	DeviceId   string `json:"deviceId"`
	MacAddress string `json:"macAddress"`
	Status     string `json:"status"`
	LastSeen   string `json:"lastSeen"`
}

func init() {
	// 注册反射类型，确保GoFrame能识别这些结构体
	_ = reflect.TypeOf(CeilingLightListReq{})
	_ = reflect.TypeOf(CeilingLightListRes{})
	_ = reflect.TypeOf(CeilingLightGetReq{})
	_ = reflect.TypeOf(CeilingLightGetRes{})
	_ = reflect.TypeOf(CeilingLightItem{})
	_ = reflect.TypeOf(CeilingLightCreateReq{})
	_ = reflect.TypeOf(CeilingLightCreateRes{})
	_ = reflect.TypeOf(CeilingLightUpdateReq{})
	_ = reflect.TypeOf(CeilingLightUpdateRes{})
	_ = reflect.TypeOf(CeilingLightDeleteReq{})
	_ = reflect.TypeOf(CeilingLightDeleteRes{})
	_ = reflect.TypeOf(CeilingLightStatusReq{})
	_ = reflect.TypeOf(CeilingLightStatusRes{})
	_ = reflect.TypeOf(CeilingLightStatusItem{})
}
