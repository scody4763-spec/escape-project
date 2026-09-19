package entity

type SensorNodeBinding struct {
	Id              int     `json:"id"              orm:"id"`
	SensorId        int     `json:"sensorId"        orm:"sensor_id"`
	NodeKey         string  `json:"nodeKey"         orm:"node_key"`
	InfluenceRadius float64 `json:"influenceRadius" orm:"influence_radius"`
}
