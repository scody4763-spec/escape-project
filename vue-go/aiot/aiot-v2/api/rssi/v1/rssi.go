package v1

import "github.com/gogf/gf/v2/frame/g"

// RSSIRequest 手机上传的RSSI数据
type ProcessReq struct {
	g.Meta `path:"/api/rssi" method:"post" tags:"RSSI" summary:"接收手机RSSI数据"`
	RSSI   map[string]int `json:"rssi" v:"required#RSSI数据不能为空"` // { "BSSID": RSSI值 }
}

// RSSIResponse 定位结果响应
type ProcessRes struct {
	Success   bool     `json:"success"`
	Message   string   `json:"message"`
	DeviceMac string   `json:"deviceMac,omitempty"`
	NodeKey   string   `json:"nodeKey,omitempty"`
	FloorId   int      `json:"floorId,omitempty"`
	X         float64  `json:"x,omitempty"`
	Y         float64  `json:"y,omitempty"`
	ExitNode  string   `json:"exitNode,omitempty"`
	ExitName  string   `json:"exitName,omitempty"`
	Direction string   `json:"direction,omitempty"`
	PathNodes []string `json:"pathNodes,omitempty"`
}
