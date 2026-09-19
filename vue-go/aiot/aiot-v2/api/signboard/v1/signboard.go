package v1

import "github.com/gogf/gf/v2/frame/g"

type ListSignboardReq struct {
	g.Meta `path:"/api/signboards" method:"get" tags:"Signboard" summary:"List signboards"`
}
type ListSignboardRes struct {
	List any `json:"list"`
}

type GetSignboardReq struct {
	g.Meta `path:"/api/signboards/{id}" method:"get" tags:"Signboard" summary:"Get signboard"`
	Id     int64 `json:"id" in:"path" v:"required"`
}
type GetSignboardRes struct {
	Info any `json:"info"`
}

type CreateSignboardReq struct {
	g.Meta            `path:"/api/signboards" method:"post" tags:"Signboard" summary:"Create signboard"`
	MacAddress        string `json:"macAddress"        v:"required"`
	DisplayLeft       int    `json:"displayLeft"`
	DisplayMid        int    `json:"displayMid"`
	DisplayRight      int    `json:"displayRight"`
	RgbLeft           string `json:"rgbLeft"`
	RgbMid            string `json:"rgbMid"`
	RgbRight          string `json:"rgbRight"`
	Led               int    `json:"led"`
	Buzzer            int    `json:"buzzer"`
	Flame             int    `json:"flame"`
	ElectricitySwitch int    `json:"electricitySwitch"`
	Address           string `json:"address"`
	Remark            string `json:"remark"`
}
type CreateSignboardRes struct {
	Id int64 `json:"id"`
}

type UpdateSignboardReq struct {
	g.Meta            `path:"/api/signboards/{id}" method:"put" tags:"Signboard" summary:"Update signboard"`
	Id                int64   `json:"id"                in:"path" v:"required"`
	MacAddress        *string `json:"macAddress"`
	DisplayLeft       *int    `json:"displayLeft"`
	DisplayMid        *int    `json:"displayMid"`
	DisplayRight      *int    `json:"displayRight"`
	RgbLeft           *string `json:"rgbLeft"`
	RgbMid            *string `json:"rgbMid"`
	RgbRight          *string `json:"rgbRight"`
	Led               *int    `json:"led"`
	Buzzer            *int    `json:"buzzer"`
	Flame             *int    `json:"flame"`
	ElectricitySwitch *int    `json:"electricitySwitch"`
	Address           *string `json:"address"`
	Remark            *string `json:"remark"`
}
type UpdateSignboardRes struct{}

type DeleteSignboardReq struct {
	g.Meta `path:"/api/signboards/{id}" method:"delete" tags:"Signboard" summary:"Delete signboard"`
	Id     int64 `json:"id" in:"path" v:"required"`
}
type DeleteSignboardRes struct{}

type GetSignboardStatusReq struct {
	g.Meta `path:"/api/signboards/status" method:"get" tags:"Signboard" summary:"Get signboard online status"`
}
type GetSignboardStatusRes struct {
	Status map[string]int `json:"status"`
}
