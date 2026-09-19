package v1

import "github.com/gogf/gf/v2/frame/g"

type ReportOverviewReq struct {
	g.Meta     `path:"/api/reports/overview" method:"get" tags:"Report" summary:"Overview statistics"`
	MacAddress string `json:"macAddress" in:"query"`
	Hours      int    `json:"hours"      in:"query" d:"24"`
}
type ReportOverviewRes struct {
	Data interface{} `json:"data"`
}

type ReportTrendReq struct {
	g.Meta     `path:"/api/reports/trend" method:"get" tags:"Report" summary:"Trend data"`
	MacAddress string `json:"macAddress" in:"query"`
	Hours      int    `json:"hours"      in:"query" d:"24"`
	Field      string `json:"field"      in:"query" d:"temp"`
}
type ReportTrendRes struct {
	Data interface{} `json:"data"`
}

type ReportAlarmStatsReq struct {
	g.Meta `path:"/api/reports/alarm-stats" method:"get" tags:"Report" summary:"Alarm statistics"`
	Days   int `json:"days" in:"query" d:"7"`
}
type ReportAlarmStatsRes struct {
	Data interface{} `json:"data"`
}

type ReportExportReq struct {
	g.Meta     `path:"/api/reports/export" method:"get" tags:"Report" summary:"Export CSV"`
	MacAddress string `json:"macAddress" in:"query"`
	Hours      int    `json:"hours"      in:"query" d:"24"`
}
type ReportExportRes struct{}
