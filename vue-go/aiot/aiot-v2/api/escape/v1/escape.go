package v1

import "github.com/gogf/gf/v2/frame/g"

type CalculateEscapeReq struct {
	g.Meta    `path:"/api/escape/calculate" method:"post" tags:"Escape" summary:"Calculate escape path"`
	Algorithm string                 `json:"algorithm" v:"required" d:"aco"`
	StartNode string                 `json:"startNode" v:"required"`
	FloorId   int                    `json:"floorId"   v:"required"`
	FireMode  bool                   `json:"fireMode"  d:"true"`
	FirePoints []string              `json:"firePoints"`
	Density    map[string]float64    `json:"density"`
	Safety     map[string]float64    `json:"safety"`
	Compare    bool                  `json:"compare"`
	Params    map[string]interface{} `json:"params"`
}
type CalculateEscapeRes struct {
	Algorithm     string `json:"algorithm"`
	Paths         any    `json:"paths"`
	ComputeTimeMs int    `json:"computeTimeMs"`
	Results       any    `json:"results,omitempty"`
	Convergence   []float64 `json:"convergence,omitempty"`
	ConvergenceCost    []float64 `json:"convergence_cost,omitempty"`
	ConvergenceSafety  []float64 `json:"convergence_safety,omitempty"`
	ConvergenceIterationCost   int `json:"convergence_iteration_cost,omitempty"`
	ConvergenceIterationSafety int `json:"convergence_iteration_safety,omitempty"`
}

type GetGraphNodesReq struct {
	g.Meta  `path:"/api/graph/nodes" method:"get" tags:"Graph" summary:"Get graph nodes"`
	FloorId int `json:"floorId" in:"query" d:"0"`
}
type GetGraphNodesRes struct {
	List any `json:"list"`
}

type GetGraphEdgesReq struct {
	g.Meta `path:"/api/graph/edges" method:"get" tags:"Graph" summary:"Get graph edges"`
}
type GetGraphEdgesRes struct {
	List any `json:"list"`
}

type ReportLocationReq struct {
	g.Meta  `path:"/api/location" method:"post" tags:"Escape" summary:"Report BLE scan result for positioning"`
	OpenID  string       `json:"openid" v:"required"`
	Beacons []BeaconInfo `json:"beacons" v:"required#beacons 不能为空"`
}

type BeaconInfo struct {
	Major int `json:"major"`
	Minor int `json:"minor"`
	RSSI  int `json:"rssi"`
}

type ReportLocationRes struct {
	Success       bool    `json:"success"`
	Floor         int     `json:"floor"`
	NodeID        string  `json:"node_id"`
	Direction     string  `json:"direction"`
	ExitName      string  `json:"exit_name"`
	Distance      float64 `json:"distance"`
	EstimatedTime int     `json:"estimated_time"`
}

type SubscribeDeviceReq struct {
	g.Meta   `path:"/api/subscribe" method:"post" tags:"Escape" summary:"Subscribe device fire notifications"`
	OpenID   string `json:"openid" v:"required"`
	DeviceID string `json:"device_id" v:"required"`
	Location string `json:"location"`
}

type SubscribeDeviceRes struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

type CheckDirectionReq struct {
	g.Meta `path:"/api/escape/direction" method:"get" tags:"Escape" summary:"Check direction between two nodes"`
	From   string `json:"from" in:"query" v:"required"`
	To     string `json:"to" in:"query" v:"required"`
}

type CheckDirectionRes struct {
	From      string `json:"from"`
	To        string `json:"to"`
	Direction string `json:"direction"`
}
