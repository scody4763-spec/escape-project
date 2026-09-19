package entity

type GraphNode struct {
	Id       int     `json:"id"       orm:"id"`
	FloorId  int     `json:"floorId"  orm:"floor_id"`
	NodeKey  string  `json:"nodeKey"  orm:"node_key"`
	Name     string  `json:"name"     orm:"name"`
	NodeType string  `json:"nodeType" orm:"node_type"`
	X        float64 `json:"x"        orm:"x"`
	Y        float64 `json:"y"        orm:"y"`
	Z        float64 `json:"z"        orm:"z"`
	Major    *int    `json:"major"    orm:"major"`    // BLE Major (楼层号)
	Minor    *int    `json:"minor"    orm:"minor"`    // BLE Minor (节点编号)
	Capacity *int    `json:"capacity" orm:"capacity"`
	IsExit   int     `json:"isExit"   orm:"is_exit"`
	Status   int     `json:"status"   orm:"status"`
}
