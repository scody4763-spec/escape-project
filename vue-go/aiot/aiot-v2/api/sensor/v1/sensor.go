package v1

import "github.com/gogf/gf/v2/frame/g"

type ListSensorReq struct {
	g.Meta `path:"/api/sensors" method:"get" tags:"Sensor" summary:"List sensors"`
}
type ListSensorRes struct {
	List interface{} `json:"list"`
}

type GetSensorReq struct {
	g.Meta `path:"/api/sensors/{id}" method:"get" tags:"Sensor" summary:"Get sensor"`
	Id     int64 `json:"id" in:"path" v:"required"`
}
type GetSensorRes struct {
	Info interface{} `json:"info"`
}

type CreateSensorReq struct {
	g.Meta     `path:"/api/sensors" method:"post" tags:"Sensor" summary:"Create sensor"`
	MacAddress string `json:"macAddress" v:"required"`
	Address    string `json:"address"`
	BoardId    int    `json:"boardId"`
	Img        string `json:"img"`
	Status     int    `json:"status" d:"1"`
}
type CreateSensorRes struct {
	Id int64 `json:"id"`
}

type UpdateSensorReq struct {
	g.Meta     `path:"/api/sensors/{id}" method:"put" tags:"Sensor" summary:"Update sensor"`
	Id         int64  `json:"id"         in:"path" v:"required"`
	MacAddress string `json:"macAddress"`
	Address    string `json:"address"`
	BoardId    int    `json:"boardId"`
	Img        string `json:"img"`
	Status     *int   `json:"status"`
}
type UpdateSensorRes struct{}

type DeleteSensorReq struct {
	g.Meta `path:"/api/sensors/{id}" method:"delete" tags:"Sensor" summary:"Delete sensor"`
	Id     int64 `json:"id" in:"path" v:"required"`
}
type DeleteSensorRes struct{}

type GetSensorStatusReq struct {
	g.Meta `path:"/api/sensors/status" method:"get" tags:"Sensor" summary:"Get sensor online status"`
}
type GetSensorStatusRes struct {
	Status map[string]int `json:"status"`
}
