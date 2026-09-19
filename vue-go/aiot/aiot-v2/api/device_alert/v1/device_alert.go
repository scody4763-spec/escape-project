package v1

import "github.com/gogf/gf/v2/frame/g"

type ListDeviceAlertReq struct {
	g.Meta    `path:"/api/device-alerts" method:"get" tags:"DeviceAlert" summary:"List device alerts"`
	Status    int `json:"status"    in:"query" d:"-1"`
	AlertType int `json:"alertType" in:"query"`
}
type ListDeviceAlertRes struct {
	List interface{} `json:"list"`
}

type UpdateDeviceAlertReq struct {
	g.Meta `path:"/api/device-alerts/{id}" method:"put" tags:"DeviceAlert" summary:"Update device alert status"`
	Id     int64 `json:"id"     in:"path" v:"required"`
	Status int   `json:"status" v:"required|in:1,2"`
}
type UpdateDeviceAlertRes struct{}
