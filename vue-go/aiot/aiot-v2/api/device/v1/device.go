package v1

import "github.com/gogf/gf/v2/frame/g"

type DeviceListReq struct {
	g.Meta     `path:"/device/list" method:"get" tags:"Device" summary:"List devices"`
	BoardId    int    `json:"boardId" in:"query" d:"0"`
	MacAddress string `json:"macAddress" in:"query"`
}

type DeviceListRes struct {
	List interface{} `json:"list"`
}

type DeviceDetailsReq struct {
	g.Meta     `path:"/device/details" method:"get" tags:"Device" summary:"Get device details"`
	MacAddress string `json:"macAddress" in:"query" v:"required"`
}

type DeviceDetailsRes struct {
	Info interface{} `json:"info"`
}

type DeviceTemperatureReq struct {
	g.Meta     `path:"/device/temperature" method:"get" tags:"Device" summary:"Get temperature data"`
	MacAddress string `json:"macAddress" in:"query" v:"required"`
	BeginTime  string `json:"beginTime" in:"query"`
	EndTime    string `json:"endTime" in:"query"`
}

type DeviceTemperatureRes struct {
	Data interface{} `json:"data"`
}

type DeviceHumidityReq struct {
	g.Meta     `path:"/device/humidity" method:"get" tags:"Device" summary:"Get humidity data"`
	MacAddress string `json:"macAddress" in:"query" v:"required"`
	BeginTime  string `json:"beginTime" in:"query"`
	EndTime    string `json:"endTime" in:"query"`
}

type DeviceHumidityRes struct {
	Data interface{} `json:"data"`
}

type DeviceTVOCReq struct {
	g.Meta     `path:"/device/tvoc" method:"get" tags:"Device" summary:"Get TVOC data"`
	MacAddress string `json:"macAddress" in:"query" v:"required"`
	BeginTime  string `json:"beginTime" in:"query"`
	EndTime    string `json:"endTime" in:"query"`
}

type DeviceTVOCRes struct {
	Data interface{} `json:"data"`
}

type DeviceEco2Req struct {
	g.Meta     `path:"/device/eco2" method:"get" tags:"Device" summary:"Get ECO2 data"`
	MacAddress string `json:"macAddress" in:"query" v:"required"`
	BeginTime  string `json:"beginTime" in:"query"`
	EndTime    string `json:"endTime" in:"query"`
}

type DeviceEco2Res struct {
	Data interface{} `json:"data"`
}

type DeviceWarningReportReq struct {
	g.Meta     `path:"/device/warningReport" method:"get" tags:"Device" summary:"Get device warning report"`
	MacAddress string `json:"macAddress" in:"query"`
	BeginTime  string `json:"beginTime" in:"query"`
	EndTime    string `json:"endTime" in:"query"`
}

type DeviceWarningReportRes struct {
	Data interface{} `json:"data"`
}

type DeviceWarningReportListReq struct {
	g.Meta `path:"/device/warningReportList" method:"get" tags:"Device" summary:"Get device warning report list"`
}

type DeviceWarningReportListRes struct {
	Data interface{} `json:"data"`
}
